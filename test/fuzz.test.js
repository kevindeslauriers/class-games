'use strict';
// Plays many random games through the same entry points the server uses:
// joins, drops, rejoins, timers and every teacher and student command, with
// garbage mixed in. A ClassError ("you can't do that now") is fine; any other
// error is a bug that would show "Something went wrong" or stop the server.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { Bank, ClassError } = require('../lib/classroom');
const { ClassRooms } = require('../lib/classrooms');

const bank = new Bank({ dir: path.join(__dirname, '..', 'class-clues') });

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const fullBoards = new Set();

function play(seed, steps) {
  const R = rng(seed * 7919);
  const pick = a => a[Math.floor(R() * a.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const timers = [];
  const rooms = new ClassRooms({ bank, gameOpts: {
    random: R,
    setTimer: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; },
    clearTimer: t => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
  } });
  const log = [];
  const fail = (where, e) => { throw new Error(`seed ${seed}, ${where}: ${e && e.stack}\nlast steps:\n  ${log.slice(-10).join('\n  ')}`); };
  const send = (c, m) => {
    log.push(`${c.role || 'new'} ${JSON.stringify(m)}`);
    try {
      if (m.t === 'hello' && m.role === 'classTv') return rooms.helloTv(c, m);
      if (m.t === 'hello' && m.role === 'student') return rooms.helloStudent(c, m);
      if (c.room) return rooms.handle(c, m);
    } catch (e) { if (!(e instanceof ClassError)) fail(m.t, e); }
  };
  const client = () => ({ role: null, room: null, sid: null, send(m) { if (m.t === 'joined') this.token = m.token; } });
  const tv = client();
  send(tv, { t: 'hello', role: 'classTv' });
  const g = [...rooms.rooms.values()][0].game;
  const studs = [];
  const junk = () => pick([null, undefined, '', 'x', -1, 1e9, NaN, {}, [], '3', 2.5, true, '<b>', 'ten']);
  const names = ['Ann', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivy', 'Jo'];
  const answer = () => {
    const r = g.rec;
    if (!r) return junk();
    if (r.choices && R() < 0.7) return pick(r.choices);
    return R() < 0.5 ? (r.type === 'num' ? String(r.num.value) : r.a) : pick(['nope', '12', '', junk()]);
  };
  try {
    for (let i = 0; i < steps; i++) {
      const roll = R();
      if (roll < 0.08 && studs.length < 10) {
        const c = client(); studs.push(c);
        send(c, { t: 'hello', role: 'student', code: R() < 0.9 ? g.code : 'ZZZZZ', name: R() < 0.9 ? pick(names) : junk(), team: R() < 0.5 ? int(-1, 9) : junk() });
      } else if (roll < 0.12 && studs.length) {
        const c = pick(studs); log.push(`drop ${c.sid}`); rooms.left(c);
      } else if (roll < 0.16 && studs.length) {
        const c = pick(studs); if (c.token) send(c, { t: 'hello', role: 'student', token: c.token });
      } else if (roll < 0.24 && timers.length) {
        const t = timers.shift(); log.push('timer');
        // Timers run outside any request: even a ClassError here is a bug.
        try { t.fn(); } catch (e) { fail('timer', e); }
      } else if (roll < 0.8) {
        // Mostly play the board through (pick, close, next), so games reach the
        // last square of a board, the round break and the final clue.
        // Mostly the sensible next step for the phase, so games play whole
        // boards, the round break and the final; otherwise anything at all.
        const NEXT = { lobby: 'start', board: 'choose', open: 'close', ddWager: 'ddWager', reveal: 'next', roundBreak: 'next', finalWager: 'next', finalClue: 'close', finalReveal: 'next', champ: 'lobby' };
        const u = R();
        const t = u < 0.8 ? NEXT[g.phase]
          : u < 0.98 ? pick(['settings', 'choose', 'close', 'next', 'ddWager', 'pause', 'skip', 'accept', 'move', 'rename', 'kick', 'balance', 'clueList', 'start', 'bogus'])
          : pick(['lobby', 'endRound', 'finish']);
        const m = { t };
        if (t === 'settings') m.settings = pick([{ teams: int(1, 9) }, { rounds: int(0, 3) }, { dd: R() < 0.5 }, { final: R() < 0.5 }, { penalty: R() < 0.5 }, { teamsPick: R() < 0.5 },
          { course: pick(bank.courses).id }, { units: R() < 0.5 ? [] : [pick(bank.course(g.settings.course).units).id] }, junk(), { picks: { [g.settings.course]: { off: [junk()], must: ['x'] } } }]);
        if (t === 'choose') {
          const free = [];
          for (let c = 0; c < 6; c++) for (let r = 0; r < 5; r++) if (!g.taken.has(`${c},${r}`)) free.push([c, r]);
          if (free.length && R() < 0.85) [m.c, m.r] = pick(free);
          else { m.c = R() < 0.9 ? int(0, 5) : junk(); m.r = R() < 0.9 ? int(0, 4) : junk(); }
        }
        if (t === 'ddWager') m.amount = R() < 0.7 ? int(0, 3000) : junk();
        if (t === 'accept') { const gr = g.rec && g.rec.done && g.stats(g.rec).groups; m.key = gr && gr.length && R() < 0.8 ? pick(gr).key : junk(); }
        if (['move', 'rename', 'kick'].includes(t)) { m.id = studs.length && R() < 0.9 ? pick(studs).sid : junk(); m.team = int(-1, 8); m.name = R() < 0.8 ? `${pick(names)}z` : junk(); }
        send(tv, m);
      } else if (studs.length) {
        const t = pick(['answer', 'answer', 'answer', 'choose', 'ddWager', 'finalWager', 'team', 'leave', 'bogus']);
        const m = { t };
        if (t === 'answer') m.a = answer();
        if (t === 'choose') { m.c = int(-1, 6); m.r = int(-1, 5); }
        if (t === 'ddWager' || t === 'finalWager') m.amount = R() < 0.7 ? int(0, 2000) : junk();
        if (t === 'team') m.team = R() < 0.8 ? int(0, 7) : junk();
        send(pick(studs), m);
      }
      // What the server builds after every change.
      try { JSON.stringify(g.teacherView()); } catch (e) { fail('teacherView', e); }
      studs.forEach(c => { if (c.sid != null) { try { g.studentView(c.sid); } catch (e) { fail('studentView', e); } } });
      try { g.report(); } catch (e) { fail('report', e); }
      if (!g.records.every(Boolean)) fail('records', new Error('an empty clue record'));
      if (g.taken.size >= 30) fullBoards.add(seed);
    }
  } finally {
    rooms.stop();
  }
  return g.phase;
}

test('random games never hit an unexpected error', () => {
  for (let seed = 1; seed <= 30; seed++) play(seed, 800);
  assert.ok(fullBoards.size >= 10, `only ${fullBoards.size} games played a whole board`);
});
