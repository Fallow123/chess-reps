
// ---------- Threat check ----------
// Positions from your own games, right after your opponent moved: what is their idea now?
// The engine plays their move twice (a "null move" for you) and compares: if that gains them a lot,
// they are threatening something, and its first move and line are the threat.
function nullMove(fen) { const f = fen.split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'; return f.join(' '); }
// Simple threats with no idea behind them: mate in one, or taking a loose piece.
function threatsIn(fen) {
  let c; try { c = new Chess(nullMove(fen)); } catch { return []; }
  if (!c.fen || c.in_check()) return [];
  const out = [];
  for (const m of c.moves({ verbose: true })) {
    if (m.san.endsWith('#')) { out.push({ san: m.san, from: m.from, to: m.to, kind: 'mate', gain: 100 }); continue; }
    if (!m.captured && !m.promotion) continue;
    const raw = (m.captured ? VAL[m.captured] : 0) + (m.promotion ? 8 : 0);
    if (raw < 2) continue;
    // Can the defender take back on that square? Only worth asking when the trade itself is not already winning.
    let back = true;
    if (raw - VAL[m.piece] < 2 || m.promotion) { c.move(m.san); back = c.moves({ verbose: true }).some(x => x.to === m.to); c.undo(); }
    const gain = back ? raw - VAL[m.piece] : raw;
    if (gain >= 2) out.push({ san: m.san, from: m.from, to: m.to, kind: m.promotion && !m.captured ? 'queen' : 'win', gain, piece: m.captured });
  }
  return out.sort((a, b) => b.gain - a.gain);
}
// Every position in your recent games where your opponent has just moved: the raw material for both drills.
let TH_CACHE = null;
function gamePositions() {
  const games = myGames().filter(g => g.full);
  const key = games.length + ':' + (games.length ? games[games.length - 1].id : '');
  if (TH_CACHE && TH_CACHE.key === key) return TH_CACHE.list;
  const list = [];
  for (const g of games.slice(-40)) {
    const r = new Chess();
    for (const [i, s] of fullMoves(g).entries()) {
      const mv = r.move(s, { sloppy: true }); if (!mv) break;
      const mover = i % 2 === 0 ? 'w' : 'b';
      if (mover === g.me || i < 12 || i > 90 || r.in_check() || r.game_over()) continue;
      list.push({ id: g.id + ':' + i, fen: r.fen(), me: g.me, last: { from: mv.from, to: mv.to, san: mv.san }, g, i });
    }
  }
  TH_CACHE = { key, list }; return list;
}
// Kept for the plan: how many positions there are to work with.
const threatPositions = () => { const n = gamePositions().length; return { yes: { length: n }, n }; };

const winFor = (side, cp) => { const v = side === 'w' ? cp : -cp; return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clampE(v))) - 1); };
// Engine verdicts, kept so a position is only ever checked once.
const thSeen = () => LS.get('threat-seen') || {};
async function screenThreat(p) {
  const seen = thSeen(); if (seen[p.id]) return seen[p.id];
  const a = await analyze(p.fen, { depth: 11 }); if (a.cancelled) return null;
  if (S.th && S.th.checking) return null;
  const nf = nullMove(p.fen); const b = await analyze(nf, { depth: 11 }); if (b.cancelled) return null;
  const e0 = evalNum(a.lines[0]), e1 = evalNum(b.lines[0]);
  const drop = winFor(p.me, e0) - winFor(p.me, e1);
  // Positions that are already decided teach nothing about threats.
  const w0 = winFor(p.me, e0); const decided = w0 > 88 || w0 < 15;
  let v = { t: decided ? 'skip' : drop >= 18 ? 'yes' : drop <= 4 ? 'none' : 'skip', drop: Math.round(drop), e0 };
  if (v.t === 'yes' && b.best) {
    const pv = pvToSan(nf, (b.lines[0] && b.lines[0].pv) || [b.best], 5);
    const easy = threatsIn(p.fen).some(x => x.san === pv[0]);
    const mate = b.lines[0] && b.lines[0].mate != null && (b.lines[0].mate > 0) === (p.me === 'b');
    Object.assign(v, { best: pv[0], pv, easy, mate: mate ? Math.abs(b.lines[0].mate) : 0, e1 });
  }
  seen[p.id] = v; LS.set('threat-seen', seen); return v;
}
// Puts a name to the threat: mate, a fork, a check, or a quiet move that wins something two moves later.
function threatIdea(p, v) {
  const nf = nullMove(p.fen); const c = new Chess(nf); const m = c.move(v.best, { sloppy: true });
  const line = pvLine(nf, v.pv.slice(0, 5));
  if (v.mate) return `${v.best} starts a mate in ${v.mate}: ${line}.`;
  if (m && forkAfter(nf, v.best)) return `${v.best} is a fork: ${line}.`;
  if (m && m.captured) return `${v.best} wins material: ${line}.`;
  if (m && c.in_check()) return `${v.best} comes with check, and the follow-up wins: ${line}.`;
  return `The quiet ${v.best} sets up the win: ${line}.`;
}

const thLog = () => LS.get('threat-log') || {};
const thDoneToday = () => (thLog()[todayId()] || {}).n || 0;
function logThreat(ok) {
  const L = thLog(); const t = L[todayId()] = L[todayId()] || { n: 0, right: 0 }; t.n++; if (ok) t.right++; LS.set('threat-log', L);
}
// Builds the set as it goes: positions already checked come first, new ones are checked in the background.
async function startThreats(n) {
  const all = gamePositions();
  if (all.length < 20) return toast('Import more of your games first. Threat check uses positions from them.');
  if (!engineReady()) return toast('Threat check needs the engine, which runs on the hosted version of Pawnstorm.');
  const k = n || 8; const seen = thSeen();
  const d = S.th = { queue: [], i: 0, done: false, right: 0, want: k, finding: true, loading: true };
  const shuffled = all.slice().sort(() => Math.random() - 0.5);
  // Mostly real ideas, with one or two quiet positions: knowing when nothing is threatened is the other half of the habit.
  const nNone = Math.max(1, Math.round(k / 5)); let none = 0, hard = 0;
  const take = (p, v) => {
    if (v.t === 'none' && none < nNone) { none++; d.queue.push(Object.assign({ v }, p)); }
    else if (v.t === 'yes' && !v.easy && hard < k - nNone) { hard++; d.queue.push(Object.assign({ v }, p)); }
  };
  for (const p of shuffled) if (seen[p.id]) take(p, seen[p.id]);
  d.queue.sort(() => Math.random() - 0.5);
  if (d.queue.length) loadThreat(); else render();
  S.batch = true;
  for (const p of shuffled) {
    if (S.th !== d || d.queue.length >= k) break;
    if (seen[p.id]) continue;
    let v = null; for (let tries = 0; tries < 3 && !v; tries++) { while (d.checking) await new Promise(r => setTimeout(r, 200)); v = await screenThreat(p); }
    if (!v || S.th !== d) continue;
    take(p, v); if (d.loading && d.queue.length) loadThreat(); else if (S.tab === 'drill') render();
  }
  S.batch = false; if (S.th === d) { d.finding = false; if (!d.queue.length) d.done = true; render(); }
}
function loadThreat() {
  const d = S.th; const p = d.queue[d.i];
  if (!p) { if (!d.finding) d.done = true; d.loading = true; render(); return; }
  Object.assign(d, { p, game: new Chess(nullMove(p.fen)), tries: 0, finished: false, note: null, loading: false });
  S.hint = null; S.sel = null; render();
}
async function threatAnswer(san) {
  const d = S.th; const p = d.p; const v = p.v; if (d.finished || d.checking) return;
  const show = () => { const m = v.best && new Chess(nullMove(p.fen)).move(v.best, { sloppy: true }); S.hint = m ? { from: m.from, to: m.to } : null; };
  const done = (ok, note) => { d.finished = true; if (ok && !d.tries) d.right++; logThreat(ok && !d.tries); d.note = note; render(); };
  if (san === null) {
    if (v.t === 'none') return done(true, { cls: 'payoff', text: 'Right: nothing serious. You are free to play your own plan here.' });
    d.tries++; show(); return done(false, { cls: 'bad', text: 'There is a threat. ' + threatIdea(p, v) });
  }
  if (v.t === 'yes' && san === v.best) { show(); return done(true, { cls: 'payoff', text: 'Yes. ' + threatIdea(p, v) }); }
  // Another move can carry the same threat. Ask the engine how much it would gain them.
  let ok = false;
  if (v.t === 'yes') {
    d.checking = true; d.note = { cls: '', text: `Checking ${san}…` }; render();
    const c = new Chess(nullMove(p.fen)); c.move(san, { sloppy: true });
    let a = null; for (let k = 0; k < 3 && !c.in_checkmate() && (!a || a.cancelled); k++) a = await analyze(c.fen(), { depth: 11 });
    d.checking = false; if (S.th !== d) return;
    const e = c.in_checkmate() ? (p.me === 'w' ? -10000 : 10000) : a && !a.cancelled ? evalNum(a.lines[0]) : null;
    ok = e != null && winFor(p.me, v.e0) - winFor(p.me, e) >= Math.max(12, v.drop * 0.7);
  }
  if (ok) { show(); return done(true, { cls: 'payoff', text: `${san} works too. The engine’s main idea: ` + threatIdea(p, v) }); }
  d.tries++;
  if (d.tries >= 2 || v.t !== 'yes') { show(); return done(false, { cls: 'bad', text: v.t === 'yes' ? 'Not quite. ' + threatIdea(p, v) : `${san} doesn’t threaten anything serious. This one was quiet.` }); }
  d.note = { cls: 'miss', text: `${san} isn’t the danger. What did ${p.last.san} change: a new line opened, a piece that lost a defender, a square for a fork?` };
  render();
}
function renderThreats(panel, bar) {
  const d = S.th;
  if (!d) {
    const n = gamePositions().length; const L = thLog(); const t = L[todayId()];
    const week = Object.entries(L).filter(([k]) => k >= ymd(new Date(Date.now() - 6 * 864e5))).reduce((a, [, v]) => ({ n: a.n + v.n, right: a.right + v.right }), { n: 0, right: 0 });
    panel.append(h('section', { class: 'sec' },
      h('h3', {}, 'Threat check'),
      h('p', { class: 'ask' }, 'What is your opponent’s idea? Each position is from your own games, right after they moved. The engine has found a real threat in most of them: a fork, a pin, a mating net, or a quiet move that wins something next move. Play the move they would make if it were their turn again, or say there is nothing serious.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', disabled: n < 20 || !engineReady(), onclick: () => startThreats(8) }, 'Start 8 positions'),
        h('span', { class: 'note' }, !engineReady() ? 'Needs the engine (hosted version).' : n < 20 ? 'Import some games first.' : t ? `Today: ${t.right} of ${t.n} right.` : 'The first set takes a moment while the engine looks.')),
      week.n ? h('p', { class: 'note', style: 'margin-top:10px' }, `This week: ${week.right} of ${week.n} right (${Math.round(100 * week.right / week.n)}%).`) : null));
    return;
  }
  if (d.done) {
    panel.append(h('section', { class: 'sec' }, h('h3', {}, d.queue.length ? `${d.right} of ${d.queue.length} right` : 'No positions found'),
      h('p', { class: 'ask' }, !d.queue.length ? 'The engine found no clear threats in your recent games. Import more games and try again.' : d.right >= d.queue.length * 0.75 ? 'Sharp. In your games, one look at what their move changed before you play yours.' : 'These are the moves that win games against you. Before every move, ask what their last move changed.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => startThreats(8) }, 'Another 8'), h('button', { class: 'btn quiet', onclick: () => { S.th = null; S.hint = null; render(); } }, 'Done'))));
    return;
  }
  if (d.loading) {
    panel.append(h('section', { class: 'sec' }, h('h3', {}, 'Finding positions…'), h('p', { class: 'ask' }, 'The engine is looking through your games for real threats. The first one appears in a few seconds.'),
      h('button', { class: 'btn quiet', onclick: () => { S.th = null; S.batch = false; render(); } }, 'Leave')));
    return;
  }
  const p = d.p;
  panel.append(h('section', { class: 'sec' },
    h('h2', {}, `Position ${d.i + 1} of ${Math.max(d.queue.length, d.finding ? d.want : 0)}`),
    h('p', { class: 'who theirs' }, `Your opponent just played ${p.last.san}. What is their idea?`),
    h('p', { class: 'note' }, `Make their threatening move on the board, or say nothing serious. From your game against ${p.g.opp}, ${p.g.date}.`),
    h('p', { class: 'lnote ' + (d.note ? d.note.cls : '') }, d.note ? d.note.text : ''),
    h('div', { class: 'row' },
      d.finished ? h('button', { class: 'btn', onclick: () => { d.i++; loadThreat(); } }, d.i + 1 < d.queue.length || d.finding ? 'Next position' : 'See how you did')
        : h('button', { class: 'btn quiet', disabled: !!d.checking, onclick: () => threatAnswer(null) }, 'Nothing serious'),
      h('button', { class: 'btn quiet', onclick: () => { S.th = null; S.hint = null; render(); } }, 'Leave'))));
}

// ---------- Loose pieces ----------
// Click every piece that no piece of its own side defends, for both colours, then check.
// Loose pieces drop off: this trains the scan that spots them before the tactic does.
function attackedBy(board, r, f, color) {
  const at = (rr, ff) => rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? board[rr][ff] : undefined;
  for (let rr = 0; rr < 8; rr++) for (let ff = 0; ff < 8; ff++) {
    const p = board[rr][ff]; if (!p || p.color !== color || (rr === r && ff === f)) continue;
    const dr = r - rr, df = f - ff, ar = Math.abs(dr), af = Math.abs(df);
    if (p.type === 'p') { if (dr === (color === 'w' ? -1 : 1) && af === 1) return true; continue; }
    if (p.type === 'n') { if (ar * af === 2) return true; continue; }
    if (p.type === 'k') { if (Math.max(ar, af) === 1) return true; continue; }
    const straight = dr === 0 || df === 0, diag = ar === af;
    if (!((p.type === 'r' && straight) || (p.type === 'b' && diag) || (p.type === 'q' && (straight || diag)))) continue;
    const sr = Math.sign(dr), sf = Math.sign(df); let cr = rr + sr, cf = ff + sf, clear = true;
    while (cr !== r || cf !== f) { if (at(cr, cf)) { clear = false; break; } cr += sr; cf += sf; }
    if (clear) return true;
  }
  return false;
}
function loosePieces(fen) {
  const b = new Chess(fen).board(); const out = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f]; if (!p || p.type === 'k') continue;
    if (!attackedBy(b, r, f, p.color)) out.push('abcdefgh'[f] + (8 - r));
  }
  return out;
}
const lpLog = () => LS.get('loose-log') || {};
const lpDoneToday = () => (lpLog()[todayId()] || {}).n || 0;
function startLoose(n) {
  const all = gamePositions().filter(p => p.i >= 16 && p.i <= 80);
  if (all.length < 20) return toast('Import more of your games first. This drill uses positions from them.');
  const k = n || 10; const pick = all.slice().sort(() => Math.random() - 0.5);
  const queue = []; let empty = 0;
  for (const p of pick) { const L = loosePieces(p.fen); if (!L.length && empty >= 1) continue; if (L.length > 7) continue; if (!L.length) empty++; queue.push(Object.assign({ loose: L }, p)); if (queue.length >= k) break; }
  S.lp = { queue, i: 0, done: false, right: 0 }; loadLoose();
}
function loadLoose() {
  const d = S.lp; const p = d.queue[d.i];
  if (!p) { d.done = true; render(); return; }
  Object.assign(d, { p, game: new Chess(p.fen), sel: new Set(), checked: false, hint: null });
  S.hint = null; S.sel = null; render();
}
function looseClick(sq) {
  const d = S.lp; if (!d || d.done || d.checked) return;
  const pc = d.game.get(sq); if (!pc) return;
  if (pc.type === 'k') { d.hint = 'Kings don’t count. Every other piece does, pawns included.'; render(); return; }
  d.hint = null;
  if (d.sel.has(sq)) d.sel.delete(sq); else d.sel.add(sq);
  renderBoard();
}
function looseCheck() {
  const d = S.lp; d.checked = true; const want = new Set(d.p.loose);
  const ok = want.size === d.sel.size && [...want].every(s => d.sel.has(s));
  if (ok) d.right++;
  const L = lpLog(); const t = L[todayId()] = L[todayId()] || { n: 0, right: 0 }; t.n++; if (ok) t.right++; LS.set('loose-log', L);
  const missed = [...want].filter(s => !d.sel.has(s)), extra = [...d.sel].filter(s => !want.has(s));
  const name = s => { const p = d.game.get(s); return (p.color === 'w' ? 'white ' : 'black ') + ({ n: 'knight', b: 'bishop', r: 'rook', q: 'queen', p: 'pawn', k: 'king' })[p.type] + ' on ' + s; };
  const list = xs => xs.map(name).join(', ');
  d.note = ok ? { cls: 'payoff', text: want.size ? `You got them all: ${list([...want])}.` : 'Right: nothing is loose here. Every piece is defended.' }
    : { cls: 'bad', text: [`Not quite. ${want.size ? `You found ${want.size - missed.length} of ${want.size}.` : 'Nothing was loose here.'}`,
      missed.length ? `You missed the ${list(missed)} (orange outline).` : '',
      extra.length ? `The ${list(extra)} ${extra.length > 1 ? 'are' : 'is'} defended, so ${extra.length > 1 ? 'they don’t' : 'it doesn’t'} count (red outline).` : ''].filter(Boolean).join(' ') };
  render();
}
// For the board: how each square should look in this drill.
function looseMark(sq) {
  const d = S.lp; if (!d || d.done || !d.p) return null;
  if (!d.checked) return d.sel.has(sq) ? 'pick' : null;
  const want = d.p.loose.includes(sq), got = d.sel.has(sq);
  return want && got ? 'pick-ok' : want ? 'pick-miss' : got ? 'pick-bad' : null;
}
function renderLoose(panel, bar) {
  const d = S.lp;
  if (!d) {
    const n = gamePositions().length; const L = lpLog(); const t = L[todayId()];
    panel.append(h('section', { class: 'sec' },
      h('h3', {}, 'Loose pieces'),
      h('p', { class: 'ask' }, 'Click every piece that is not defended by one of its own pieces, for both sides, then press Check. Pawns count too; kings don’t. Loose pieces are where most tactics start, so spotting them at a glance is half of seeing the tactic.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', disabled: n < 20, onclick: () => startLoose(10) }, 'Start 10 positions'),
        h('span', { class: 'note' }, n < 20 ? 'Import some games first.' : t ? `Today: ${t.right} of ${t.n} perfect.` : 'Positions from your own games.'))));
    return;
  }
  if (d.done) {
    panel.append(h('section', { class: 'sec' }, h('h3', {}, `${d.right} of ${d.queue.length} perfect`),
      h('p', { class: 'ask' }, d.right >= d.queue.length * 0.8 ? 'Quick eyes. Do the same scan in your games, for both sides, every few moves.' : 'Pieces you miss here are pieces you lose, or tactics you miss, in your games.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => startLoose(10) }, 'Another 10'), h('button', { class: 'btn quiet', onclick: () => { S.lp = null; render(); } }, 'Done'))));
    return;
  }
  panel.append(h('section', { class: 'sec' },
    h('h2', {}, `Position ${d.i + 1} of ${d.queue.length}`),
    h('p', { class: 'who mine' }, 'Click every undefended piece, pawns included, both colours. Kings don’t count.'),
    h('p', { class: 'note' }, `${d.sel.size} selected. From your game against ${d.p.g.opp}, ${d.p.g.date}.`),
    d.hint && !d.checked ? h('p', { class: 'note', style: 'color:var(--amber)' }, d.hint) : null,
    d.checked ? h('p', { class: 'note' }, 'Green: loose and found. Orange: loose and missed. Red: clicked, but defended.') : null,
    h('p', { class: 'lnote ' + (d.note && d.checked ? d.note.cls : '') }, d.checked && d.note ? d.note.text : ''),
    h('div', { class: 'row' },
      d.checked ? h('button', { class: 'btn', onclick: () => { d.i++; d.note = null; loadLoose(); } }, d.i + 1 < d.queue.length ? 'Next' : 'See how you did')
        : h('button', { class: 'btn', onclick: looseCheck }, 'Check'),
      h('button', { class: 'btn quiet', onclick: () => { S.lp = null; render(); } }, 'Leave'))));
}
