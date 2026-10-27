'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const { Bank, ClassError } = require('./lib/classroom');
const { ClassRooms } = require('./lib/classrooms');

// Recordings that can replace the built-in sounds (public/sounds/<name>.mp3).
const SOUND_NAMES = ['quiz-board', 'quiz-pick', 'quiz-right', 'quiz-wrong', 'quiz-timesup', 'quiz-dailydouble',
  'quiz-think', 'quiz-final', 'quiz-roundbreak', 'quiz-champ', 'join', 'tick'];

function createServer({ classOpts = {} } = {}) {
  const bank = new Bank({ dir: path.join(__dirname, 'class-clues') });
  const classes = new ClassRooms({ bank, gameOpts: classOpts });
  const clients = new Set(); // { send, role: 'teacher'|'student', sid, room }

  const app = express();
  app.disable('x-powered-by');
  app.get('/healthz', (req, res) => res.send('ok'));
  // Students type the bare address, so the home page is the join page.
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'join.html')));
  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
  // Graphs that go with clues ([graph: name] in a clue file).
  app.use('/graphs', express.static(path.join(__dirname, 'class-clues', 'images'), { maxAge: '1h' }));

  app.get('/class/qr.svg', async (req, res) => {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol).split(',')[0];
    const code = String(req.query.code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
    const url = `${proto}://${req.get('host')}/join?code=${code}`;
    res.type('image/svg+xml').set('Cache-Control', 'no-store')
      .send(await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0b1a4a', light: '#ffffff' } }));
  });
  // The end-of-game report. Nothing is kept: it comes from the room in memory.
  app.get('/class/report.csv', (req, res) => {
    const csv = classes.report(req.query.code, String(req.query.key || ''));
    if (csv == null) return res.status(404).send('That game has closed.');
    const day = new Date().toISOString().slice(0, 10);
    res.type('text/csv').set('Content-Disposition', `attachment; filename="class-board-${day}.csv"`).set('Cache-Control', 'no-store').send(csv);
  });
  app.get('/api/class-units', (req, res) => res.json(bank.list()));
  app.get('/api/sounds', (req, res) => {
    let files = [];
    try { files = fs.readdirSync(path.join(__dirname, 'public', 'sounds')); } catch (e) {}
    res.json(SOUND_NAMES.filter(n => files.includes(n + '.mp3')));
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

  // Every connection, WebSocket or the polling fallback, comes through here.
  function onMessage(c, m) {
    if (!m || typeof m !== 'object') return;
    try {
      if (m.t === 'hello' && m.role === 'classTv') return classes.helloTv(c, m);
      if (m.t === 'hello' && m.role === 'student') return classes.helloStudent(c, m);
      if (c.room) return classes.handle(c, m);
    } catch (e) {
      if (e instanceof ClassError) return c.send({ t: 'error', msg: e.message });
      console.error(e);
      c.send({ t: 'error', msg: 'Something went wrong.' });
    }
  }

  function onClose(c) {
    if (!clients.delete(c)) return;
    if (c.room) classes.left(c);
  }

  wss.on('connection', ws => {
    const c = { ws, kind: 'ws', role: null, room: null, alive: true,
      send: msg => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); } };
    clients.add(c);
    ws.on('pong', () => { c.alive = true; });
    ws.on('message', data => { let m; try { m = JSON.parse(data); } catch { return; } onMessage(c, m); });
    ws.on('close', () => onClose(c));
  });

  // Fallback for networks that block WebSockets (some school firewalls do):
  // the browser opens a session, posts messages and long-polls for replies.
  const polls = new Map();
  app.post('/rt/open', (req, res) => {
    const sid = crypto.randomBytes(16).toString('hex');
    const p = { queue: [], waiter: null, last: Date.now() };
    const flush = () => { if (p.waiter && p.queue.length) { const w = p.waiter; p.waiter = null; clearTimeout(w.t); w.res.json(p.queue.splice(0)); } };
    p.c = { kind: 'poll', role: null, room: null, send: msg => { p.queue.push(msg); if (p.queue.length > 500) p.queue.shift(); flush(); } };
    polls.set(sid, p);
    clients.add(p.c);
    res.json({ sid });
  });
  app.get('/rt/poll', (req, res) => {
    const p = polls.get(String(req.query.sid));
    if (!p) return res.status(410).json({ error: 'gone' });
    p.last = Date.now();
    res.set('Cache-Control', 'no-store');
    if (p.queue.length) return res.json(p.queue.splice(0));
    if (p.waiter) { clearTimeout(p.waiter.t); p.waiter.res.json([]); }
    p.waiter = { res, t: setTimeout(() => { if (p.waiter && p.waiter.res === res) { p.waiter = null; res.json([]); } }, 25000) };
  });
  app.post('/rt/send', express.json({ limit: '64kb' }), (req, res) => {
    const p = polls.get(String(req.query.sid));
    if (!p) return res.status(410).json({ error: 'gone' });
    p.last = Date.now();
    onMessage(p.c, req.body);
    res.json({ ok: true });
  });
  app.post('/rt/close', (req, res) => {
    const sid = String(req.query.sid), p = polls.get(sid);
    if (p) { polls.delete(sid); if (p.waiter) { clearTimeout(p.waiter.t); p.waiter.res.status(410).json({ error: 'gone' }); p.waiter = null; } onClose(p.c); }
    res.json({ ok: true });
  });
  const sweep = setInterval(() => {
    const now = Date.now();
    polls.forEach((p, sid) => { if (now - p.last > 45000 && !p.waiter) { polls.delete(sid); onClose(p.c); } });
  }, 10000);
  sweep.unref();

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  // Keep connections open through Render's proxy, and drop dead ones.
  const beat = setInterval(() => {
    clients.forEach(c => {
      if (c.kind !== 'ws') return;
      if (!c.alive) { c.ws.terminate(); return; }
      c.alive = false;
      try { c.ws.ping(); } catch {}
    });
  }, 25000);
  beat.unref();
  server.on('close', () => {
    clearInterval(beat); clearInterval(sweep); classes.stop();
    polls.forEach(p => { if (p.waiter) clearTimeout(p.waiter.t); });
  });

  return { server, classes, bank };
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().server.listen(port, () => console.log(`Class Board on http://localhost:${port}/class`));
}

module.exports = { createServer };
