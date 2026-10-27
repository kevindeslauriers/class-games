// Class Board for students: join with the code on the board, then answer
// every clue from here. Built for laptops first; it works on phones too.
const S = { outbox: [], ws: null, token: null, me: null, view: null, status: 'Connecting…', toast: '', drafts: {}, needJoin: false, saved: null };
const params = new URLSearchParams(location.search);
const urlCode = (params.get('code') || '').toUpperCase();
try { S.saved = JSON.parse(localStorage.getItem('class-student') || 'null'); } catch (e) {}
// Rejoin automatically after a refresh, but not on a shared computer hours later.
if (S.saved && Date.now() - S.saved.at < 3 * 60 * 60 * 1000 && (!urlCode || urlCode === S.saved.code)) S.token = S.saved.token;
S.drafts.code = urlCode || '';

/* ---------- connection ---------- */
let retry = 0;
function connect() {
  const ws = openSocket();
  S.ws = ws;
  ws.onopen = () => {
    retry = 0; S.status = '';
    ws.send(JSON.stringify({ t: 'hello', role: 'student', token: S.token }));
    // Anything typed while still connecting (like pressing Join) goes now.
    S.outbox.splice(0).forEach(m => ws.send(m));
    render();
  };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'joined') {
      S.token = m.token; S.me = m.id; S.needJoin = false; S.toast = '';
      S.saved = { token: m.token, code: m.code, name: m.name, at: Date.now() };
      try { localStorage.setItem('class-student', JSON.stringify(S.saved)); } catch (e) {}
    } else if (m.t === 'needJoin') { S.needJoin = true; S.me = null; S.view = null; }
    else if (m.t === 'state') { S.view = m.view; if (S.saved) { S.saved.at = Date.now(); try { localStorage.setItem('class-student', JSON.stringify(S.saved)); } catch (e) {} } }
    else if (m.t === 'error') S.toast = m.msg;
    else if (m.t === 'kicked' || m.t === 'left' || m.t === 'closed') {
      forget();
      S.toast = m.t === 'kicked' ? 'Your teacher took you out of the game. You can join again.' : m.t === 'closed' ? 'That game has ended.' : 'You left the game.';
    }
    render();
  };
  ws.onclose = () => {
    if (S.ws !== ws) return;
    S.status = 'Lost the connection. Reconnecting…'; render();
    setTimeout(connect, Math.min(8000, 500 * 2 ** retry++));
  };
}
function forget() { S.token = null; S.me = null; S.view = null; S.needJoin = true; try { localStorage.removeItem('class-student'); } catch (e) {} }
function send(t, extra = {}) {
  S.toast = '';
  const m = JSON.stringify({ t, ...extra });
  if (S.ws && S.ws.readyState === 1) S.ws.send(m); else S.outbox.push(m);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.ws && S.ws.readyState > 1) { retry = 0; connect(); } });

/* ---------- helpers ---------- */
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'on') Object.entries(v).forEach(([ev, f]) => e.addEventListener(ev, f));
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else e[k] = v;
  }
  kids.flat().forEach(k => { if (k != null && k !== false) e.append(k); });
  return e;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rich = s => esc(s).replace(/\^\(?(-?\d+)\)?/g, '<sup>$1</sup>');
const btn = (text, onclick, cls = 'btn', extra = {}) => h('button', { className: cls, textContent: text, on: { click: onclick }, ...extra });
function field(id, props = {}) {
  const on = { input: e => { S.drafts[id] = e.target.value; }, ...(props.on || {}) };
  return h('input', { className: 'field', id, autocomplete: 'off', spellcheck: false, value: S.drafts[id] || '', ...props, on });
}
const pts = n => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');
const team = t => (S.view && S.view.teams[t]) || { name: '', color: '#888' };
const LETTERS = 'ABCD';

/* ---------- screens ---------- */
// Laptops get two columns: the clue on the left, the standings on the right.
// Phones stack them.
function render() {
  const app = document.getElementById('app');
  const act = document.activeElement, actId = act && app.contains(act) ? act.id : '';
  let selS = null, selE = null; try { selS = act.selectionStart; selE = act.selectionEnd; } catch (e) {}
  app.innerHTML = '';
  const v = S.view;
  const me = v && v.me;
  if (me) document.documentElement.style.setProperty('--team', team(me.team).color);
  app.classList.toggle('joined', !!me);
  if (S.status) app.append(h('p', { className: 'status' }, S.status));
  if (!me) app.append(joinScreen(), h('p', { className: 'toast', role: 'alert' }, S.toast));
  else {
    app.append(topBar(v, me));
    const main = h('main', { className: 'main' }, screen(v, me), h('p', { className: 'toast', role: 'alert' }, S.toast));
    app.append(main, side(v, me));
  }
  if (actId) { const e = document.getElementById(actId); if (e) { e.focus(); try { if (selS != null) e.setSelectionRange(selS, selE); } catch (er) {} } }
  tickTimer();
}

function joinScreen() {
  const go = () => {
    const code = (S.drafts.code || '').trim().toUpperCase(), name = (S.drafts.name || '').trim();
    if (!code) { S.toast = 'Type the code from the board.'; return render(); }
    if (!name) { S.toast = 'Type your first name.'; return render(); }
    send('hello', { role: 'student', code, name });
  };
  const onEnter = { keydown: e => { if (e.key === 'Enter') go(); } };
  const card = h('div', { className: 'card joincard' },
    h('h1', { className: 'logo' }, h('small', {}, 'Class'), 'Board'),
    h('label', { className: 'label', htmlFor: 'code' }, 'Game code (on the board)'),
    field('code', { className: 'field code', maxLength: 6, autocapitalize: 'characters', on: onEnter }),
    h('label', { className: 'label', htmlFor: 'name' }, 'Your first name'),
    field('name', { maxLength: 14, autocomplete: 'given-name', on: onEnter }),
    btn('Join the game', go, 'btn primary big'),
    h('p', { className: 'hint' }, 'Use your real first name, or the name your teacher asked for.'));
  if (S.saved && !S.token) {
    card.append(btn(`Rejoin as ${S.saved.name}`, () => { S.token = S.saved.token; send('hello', { role: 'student', token: S.token }); }, 'btn small'));
  }
  return card;
}

function topBar(v, me) {
  const t = team(me.team);
  return h('header', { className: 'bar' },
    h('span', { className: 'brand' }, 'Class Board'),
    h('span', { className: 'who' }, me.name),
    h('span', { className: 'tm' }, h('span', { className: 'dot' }), t.name),
    h('span', { className: 'mine' }, h('small', {}, 'You'), h('b', {}, pts(me.score))));
}

// The right-hand column: team standings, your stats, the top three.
function side(v, me) {
  const ranked = v.teams.filter(t => t.count).slice().sort((a, b) => b.score - a.score);
  const box = h('aside', { className: 'side' });
  box.append(h('div', { className: 'panel' },
    h('p', { className: 'label' }, 'Teams'),
    h('div', { className: 'scores' }, ranked.map((t, i) =>
      h('div', { className: 't' + (t.t === me.team ? ' me' : '') }, h('span', { className: 'rank' }, String(i + 1)), h('span', { className: 'dot', style: `background:${t.color}` }), h('span', { className: 'n' }, t.name), h('b', { className: t.score < 0 ? 'neg' : '' }, pts(t.score)))))));
  const stats = h('div', { className: 'panel stats' },
    h('div', {}, h('b', {}, pts(me.score)), h('small', {}, 'your points')),
    h('div', {}, h('b', {}, String(me.right)), h('small', {}, 'right')),
    h('div', {}, h('b', {}, v.phase === 'lobby' || !me.score ? '–' : `#${me.rank}`), h('small', {}, 'in the class')));
  box.append(stats);
  if (v.top.length) box.append(h('div', { className: 'panel' }, h('p', { className: 'label' }, 'Top students'),
    h('ol', { className: 'top' }, v.top.map(s => h('li', {}, h('span', {}, s.name), h('b', {}, pts(s.score)))))));
  box.append(h('p', { className: 'mates' }, `${team(me.team).name}: ${me.teammates.join(', ')}`));
  box.append(btn('Leave the game', () => { if (confirm('Leave the game? Your points stay in the report.')) send('leave'); }, 'linkbtn'));
  return box;
}

function screen(v, me) {
  switch (v.phase) {
    case 'lobby': return lobby(v, me);
    case 'board': return board(v, me);
    case 'ddWager': return ddWager(v, me);
    case 'open': case 'finalClue': return answerScreen(v, me);
    case 'reveal': case 'finalReveal': return results(v, me);
    case 'roundBreak': return waiting('End of the first board', 'The second board is worth double. The team that’s furthest behind picks first.', '★');
    case 'finalWager': return finalWager(v, me);
    case 'champ': return champ(v, me);
  }
  return waiting('Waiting…', '', '…');
}

// A big, calm screen for the moments with nothing to do.
function waiting(title, text, icon, color) {
  return h('div', { className: 'card wait' },
    h('div', { className: 'icon', style: color ? `background:${color}` : '' }, icon),
    h('h2', {}, title), text ? h('p', { className: 'hint big' }, text) : null);
}

function lobby(v, me) {
  return h('div', { className: 'card' },
    h('h1', {}, 'You’re in!'),
    h('p', {}, 'Pick your team (your table group), then wait for your teacher to start.'),
    h('div', { className: 'teams' }, v.teams.map(t => {
      const b = btn('', () => send('team', { team: t.t }), 'teambtn' + (t.t === me.team ? ' on' : ''));
      b.style.setProperty('--c', t.color);
      b.append(h('span', { className: 'dot' }), h('span', { className: 'n' }, t.name), h('span', { className: 'cnt' }, String(t.count)));
      return b;
    })));
}

function board(v, me) {
  if (v.pickTeam !== me.team) return waiting(`${team(v.pickTeam).name} are picking`, 'Watch the board. Everyone answers every clue, so get ready!', '?', team(v.pickTeam).color);
  const card = h('div', { className: 'card' }, h('h1', {}, 'Your team picks!'), h('p', { className: 'hint' }, 'Agree with your team, then one of you picks a clue.'));
  const grid = h('div', { className: 'mini' });
  v.board.cats.forEach((cat, c) => {
    grid.append(h('div', { className: 'col' }, h('div', { className: 'h' }, cat),
      v.board.values.map((val, r) => btn(String(val), () => send('choose', { c, r }), 'btn val', { disabled: v.board.taken.includes(`${c},${r}`) }))));
  });
  card.append(grid);
  return card;
}

function wagerBox(id, max, onGo, label) {
  const go = () => {
    const n = Math.round(+(S.drafts[id] || '').replace(/[^\d]/g, ''));
    if (!(n >= 0 && n <= max) || (S.drafts[id] || '') === '') { S.toast = `Wager from 0 to ${pts(max)}.`; return render(); }
    onGo(n);
  };
  return h('div', { className: 'wager' },
    h('label', { className: 'label', htmlFor: id }, label),
    h('div', { className: 'row' }, field(id, { inputMode: 'numeric', placeholder: `0 to ${pts(max)}`, on: { keydown: e => { if (e.key === 'Enter') go(); } } }), btn('Lock it in', go, 'btn primary')));
}

// The graph that goes with a clue, if it has one.
function graph(c, small) {
  if (!c.img) return null;
  return h('img', { className: 'graph' + (small ? ' small' : ''), src: `/graphs/${c.img}.svg`, alt: 'The graph for this clue' });
}

function catLine(c) {
  return h('div', { className: 'cat' }, h('span', {}, c.final ? `Final clue · ${c.cat}` : c.cat), h('b', {}, c.final ? '' : c.dd ? 'Daily Double' : String(c.value)));
}

function ddWager(v, me) {
  const c = v.clue;
  if (c.dd.team !== me.team) return waiting('Daily Double!', `${team(c.dd.team).name} are making a wager on ${c.cat}. You’ll still answer this clue for your own points.`, '×2', team(c.dd.team).color);
  return h('div', { className: 'card' }, h('h1', {}, 'Daily Double!'), catLine(c),
    h('p', {}, 'Your team found it. Agree on a wager, then one of you enters it. Your team wins the wager if at least half of you get it right, and loses it if not.'),
    wagerBox('ddw', c.dd.max, n => send('ddWager', { amount: n }), `Team wager (0 to ${pts(c.dd.max)})`));
}

function answerScreen(v, me) {
  const c = v.clue;
  const card = h('div', { className: 'card' }, catLine(c), h('p', { className: 'q', html: rich(c.q) }), graph(c));
  const mine = me.answer;
  if (c.type === 'mc') {
    card.append(h('div', { className: 'choices' }, c.choices.map((ch, i) => {
      const b = btn('', () => { if (!mine) send('answer', { a: ch }); }, 'choice' + (mine && mine.text === ch ? ' picked' : ''), { disabled: !!mine && mine.text !== ch });
      b.append(h('span', { className: 'k' }, LETTERS[i]), h('span', { html: rich(ch) }));
      return b;
    })));
    if (!mine) card.append(h('p', { className: 'kbd' }, 'Click an answer, or press A, B, C or D. Your first choice is final.'));
  } else if (!mine) {
    const id = 'ans' + c.n + (c.final ? 'f' : '');
    const go = () => { const a = (S.drafts[id] || '').trim(); if (!a) { S.toast = 'Type an answer first.'; return render(); } send('answer', { a }); };
    card.append(h('div', { className: 'row' },
      field(id, { placeholder: c.type === 'num' ? `A number${c.unit ? ' (in ' + c.unit.replace(/\^(\d)/g, '$1') + ')' : ''}` : 'Your answer', inputMode: c.type === 'num' ? 'decimal' : 'text', maxLength: 80,
        on: { keydown: e => { if (e.key === 'Enter') go(); } } }),
      btn('Submit', go, 'btn primary')));
    card.append(h('p', { className: 'kbd' }, c.type === 'num'
      ? 'Fractions (3/8), decimals (0.375) and scientific notation (3e8 or 3 x 10^8) all work. You don’t need the unit.'
      : 'Spelling doesn’t have to be perfect. No need to write “What is…”.'));
    setTimeout(() => { const e = document.getElementById(id); if (e && !(document.activeElement && document.activeElement.closest('.row'))) e.focus(); });
  }
  if (mine && c.type !== 'mc') card.append(h('p', { className: 'locked' }, 'Locked in: ', h('b', {}, mine.text)));
  if (mine) card.append(h('p', { className: 'hint' }, `Locked in. Waiting for the others: ${c.answered} answered${c.waiting ? `, ${c.waiting} to go` : ''}.`));
  card.append(h('div', { className: 'clock' }, h('div', { className: 'timer' }, h('i', { id: 'tfill' })), h('span', { className: 'secs', id: 'tsecs' })));
  return card;
}

function results(v, me) {
  const c = v.clue;
  const a = me.answer;
  const card = h('div', { className: 'card' }, catLine(c));
  if (!a) card.append(h('p', { className: 'result no' }, 'No answer'));
  else if (a.right) card.append(h('p', { className: 'result ok' }, `Right! +${pts(c.value)}`));
  else card.append(h('p', { className: 'result no' }, 'Not quite'));
  card.append(h('p', { className: 'q small', html: rich(c.q) }), graph(c, true));
  card.append(h('p', { className: 'answer', html: `Answer: <b>${rich(c.a)}</b>` }));
  if (a && !a.right && c.type !== 'mc') card.append(h('p', { className: 'hint' }, `You wrote: ${a.text}`));
  if (c.type === 'mc') {
    card.append(h('div', { className: 'choices done' }, c.choices.map((ch, i) => {
      const right = ch === c.a;
      const b = h('div', { className: 'choice' + (right ? ' right' : a && a.text === ch ? ' wrongpick' : '') });
      b.append(h('span', { className: 'k' }, LETTERS[i]), h('span', { html: rich(ch) }));
      return b;
    })));
  }
  const st = c.stats;
  const facts = h('div', { className: 'facts' }, h('div', {}, h('b', {}, `${st.pct}%`), h('small', {}, 'of the class got it')));
  if (v.phase === 'reveal') {
    const tr = st.teams[me.team];
    if (c.dd && c.dd.team !== me.team) facts.append(h('div', {}, h('b', {}, '–'), h('small', {}, `only ${team(c.dd.team).name}’ points were on the line`)));
    else if (tr) facts.append(h('div', {}, h('b', { className: tr.pts < 0 ? 'neg' : 'pos' }, `${tr.pts >= 0 ? '+' : ''}${pts(tr.pts)}`), h('small', {}, `${team(me.team).name}: ${tr.right} of ${tr.n} right`)));
  } else if (v.final && v.final.results) {
    const r = v.final.results[me.team];
    facts.append(h('div', {}, r ? h('b', { className: r.pts < 0 ? 'neg' : 'pos' }, `${r.pts >= 0 ? '+' : ''}${pts(r.pts)}`) : h('b', {}, '…'),
      h('small', {}, r ? `${team(me.team).name}: ${r.right} of ${r.n} right` : 'Watch the board for your team')));
  }
  card.append(facts);
  return card;
}

function finalWager(v, me) {
  const card = h('div', { className: 'card' }, h('h1', {}, 'Final clue'), h('div', { className: 'cat' }, h('span', {}, `Category: ${v.final.category}`)));
  const max = v.final.maxes[me.team];
  if (!max) card.append(h('p', {}, 'Your team has no points to wager, but answer anyway for your own points.'));
  else {
    card.append(h('p', {}, 'Agree on your team’s wager. Your team wins it if at least half of you get the final clue right. Anyone on the team can enter it; the last one entered counts.'));
    if (me.finalWager) card.append(h('p', { className: 'locked' }, `Your team’s wager: ${pts(me.finalWager.amount)} (entered by ${me.finalWager.by})`));
    card.append(wagerBox('fw', max, n => send('finalWager', { amount: n }), `Team wager (0 to ${pts(max)})`));
  }
  return card;
}

function champ(v, me) {
  const ranked = v.teams.filter(t => t.count).slice().sort((a, b) => b.score - a.score);
  const place = ranked.findIndex(t => t.t === me.team) + 1;
  const win = ranked[0];
  return h('div', { className: 'card wait' },
    h('div', { className: 'icon', style: win ? `background:${win.color}` : '' }, '🏆'),
    h('h1', {}, win ? `${win.name} win!` : 'Game over'),
    h('p', { className: 'big' }, `${team(me.team).name} finished ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][place - 1] || '#' + place}.`),
    h('p', { className: 'hint big' }, `You scored ${pts(me.score)} with ${me.right} right answer${me.right === 1 ? '' : 's'}. Thanks for playing!`));
}

/* ---------- the timer ---------- */
function tickTimer() {
  cancelAnimationFrame(S.raf);
  const v = S.view;
  const fill = document.getElementById('tfill'), secs = document.getElementById('tsecs');
  if (!v || !v.timer || !fill) return;
  if (v.timer.paused) { fill.style.transform = `scaleX(${v.timer.remaining / v.timer.total})`; secs.textContent = 'Paused'; return; }
  if (S.timerFor !== v) { S.timerFor = v; S.ends = performance.now() + v.timer.remaining; }
  const step = () => {
    const left = Math.max(0, S.ends - performance.now());
    fill.style.transform = `scaleX(${left / v.timer.total})`;
    const s = Math.ceil(left / 1000);
    secs.textContent = s;
    secs.className = 'secs' + (s <= 5 ? ' low' : '');
    if (left > 0) S.raf = requestAnimationFrame(step);
  };
  step();
}

// A, B, C, D (or 1 to 4) answer a multiple-choice clue.
document.addEventListener('keydown', e => {
  const v = S.view;
  if (!v || !v.me || !v.clue || !['open', 'finalClue'].includes(v.phase) || v.clue.type !== 'mc' || v.me.answer) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  const k = e.key.toUpperCase();
  const i = 'ABCD'.indexOf(k) >= 0 ? 'ABCD'.indexOf(k) : '1234'.indexOf(k);
  if (i >= 0 && v.clue.choices[i] != null) send('answer', { a: v.clue.choices[i] });
});

render();
connect();
