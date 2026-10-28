
// ---------- Threat check ----------
// Positions from your own games, right after your opponent moved: what do they threaten now?
// Found by passing the move back to them (a "null move") and looking for mate, or material they could win.
function nullMove(fen) { const f = fen.split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'; return f.join(' '); }
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
let TH_CACHE = null;
function threatPositions() {
  const games = myGames().filter(g => g.full);
  const key = games.length + ':' + (games.length ? games[games.length - 1].id : '');
  if (TH_CACHE && TH_CACHE.key === key) return TH_CACHE.list;
  // Scanning games takes a moment, so the result is kept until new games arrive.
  const saved = LS.get('threat-cache'); const byId = new Map(games.map(g => [g.id, g]));
  if (saved && saved.key === key) { const back = x => Object.assign({}, x, { g: byId.get(x.gid) || { opp: '?', date: '' } }); TH_CACHE = { key, list: { yes: saved.yes.map(back), no: saved.no.map(back) } }; return TH_CACHE.list; }
  const yes = [], no = [];
  for (const g of games.slice(-40)) {
    const c = new Chess(); const sans = []; for (const s of fullMoves(g)) { const m = c.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
    const r = new Chess(); let prevCaps = new Set();
    for (let i = 0; i < sans.length; i++) {
      const mover = i % 2 === 0 ? 'w' : 'b';
      if (mover !== g.me) prevCaps = new Set(r.moves({ verbose: true }).map(m => m.from + m.to));
      const mv = r.move(sans[i]);
      // Their move is played; it is your turn. Only middle stretches of the game, never while in check.
      if (mover === g.me || i < 12 || i > 90 || r.in_check() || r.game_over()) continue;
      const fen = r.fen(); const t = threatsIn(fen); const fresh = t.some(x => !prevCaps.has(x.from + x.to));
      const item = { id: g.id + ':' + i, fen, me: g.me, last: { from: mv.from, to: mv.to, san: mv.san }, g, i, threats: t };
      if (fresh) yes.push(item); else if (!t.length) no.push(item);
    }
  }
  TH_CACHE = { key, list: { yes, no } };
  const slim = x => ({ id: x.id, fen: x.fen, me: x.me, last: x.last, gid: x.g.id, i: x.i, threats: x.threats });
  LS.set('threat-cache', { key, yes: yes.map(slim), no: no.slice(-80).map(slim) });
  return TH_CACHE.list;
}
const thLog = () => LS.get('threat-log') || {};
const thDoneToday = () => (thLog()[todayId()] || {}).n || 0;
function startThreats(n) {
  const { yes, no } = threatPositions();
  if (yes.length < 3) return toast('Import more of your games first. Threat check uses positions from them.');
  // A fresh mix each time, about one in four with nothing to fear: spotting "no threat" is the other half of the habit.
  const pick = (arr, k) => arr.slice().sort(() => Math.random() - 0.5).slice(0, k);
  const k = n || 10; const nNo = Math.min(no.length, Math.round(k / 4));
  const queue = pick(yes, k - nNo).concat(pick(no, nNo)).sort(() => Math.random() - 0.5);
  S.th = { queue, i: 0, done: false, right: 0 };
  loadThreat();
}
function loadThreat() {
  const d = S.th; const p = d.queue[d.i];
  if (!p) { d.done = true; render(); return; }
  Object.assign(d, { p, game: new Chess(nullMove(p.fen)), tries: 0, finished: false, note: null });
  S.hint = null; S.sel = null; render();
}
function logThreat(ok) {
  const L = thLog(); const t = L[todayId()] = L[todayId()] || { n: 0, right: 0 }; t.n++; if (ok) t.right++; LS.set('threat-log', L);
}
function threatAnswer(san) {
  const d = S.th; const p = d.p; if (d.finished) return;
  const hit = san && p.threats.find(t => t.san === san);
  const best = p.threats[0];
  const say = t => t.kind === 'mate' ? `${t.san} is mate` : t.kind === 'queen' ? `${t.san} makes a new queen` : `${t.san} wins your ${({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' })[t.piece]}`;
  if (san === null) {
    if (!p.threats.length) { d.finished = true; d.right++; logThreat(true); d.note = { cls: 'payoff', text: 'Right: nothing serious. You are free to play your own plan here.' }; }
    else { d.tries++; S.hint = { from: best.from, to: best.to }; d.finished = true; logThreat(false); d.note = { cls: 'bad', text: `There is a threat: ${say(best)}.` }; }
  } else if (hit) {
    d.finished = true; if (!d.tries) d.right++; logThreat(!d.tries); S.hint = { from: hit.from, to: hit.to };
    d.note = { cls: 'payoff', text: `Yes: ${say(hit)}.${p.threats.length > 1 && hit !== best ? ` Also watch ${best.san}.` : ''}` };
  } else {
    d.tries++;
    if (d.tries >= 2 || !p.threats.length) { d.finished = true; logThreat(false); if (best) S.hint = { from: best.from, to: best.to };
      d.note = { cls: 'bad', text: best ? `The threat was ${say(best)}.` : 'There was no real threat here. Nothing of yours could be won.' }; }
    else d.note = { cls: 'miss', text: `${san} does not win anything. Look at what their last move, ${p.last.san}, attacks.` };
  }
  render();
}
function renderThreats(panel, bar) {
  const d = S.th;
  if (!d) {
    const { yes } = threatPositions(); const L = thLog(); const t = L[todayId()];
    const week = Object.entries(L).filter(([k]) => k >= ymd(new Date(Date.now() - 6 * 864e5))).reduce((a, [, v]) => ({ n: a.n + v.n, right: a.right + v.right }), { n: 0, right: 0 });
    panel.append(h('section', { class: 'sec' },
      h('h3', {}, 'Threat check'),
      h('p', { class: 'ask' }, 'Before every move, ask what your opponent’s last move threatens. Each position is from your own games, right after they moved. Play the move they would make if it were their turn, or say there is nothing serious.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', disabled: yes.length < 3, onclick: () => startThreats(10) }, 'Start 10 positions'),
        h('span', { class: 'note' }, yes.length < 3 ? 'Import some games first.' : t ? `Today: ${t.right} of ${t.n} right.` : `${yes.length} positions from your games.`)),
      week.n ? h('p', { class: 'note', style: 'margin-top:10px' }, `This week: ${week.right} of ${week.n} right (${Math.round(100 * week.right / week.n)}%).`) : null));
    return;
  }
  if (d.done) {
    panel.append(h('section', { class: 'sec' }, h('h3', {}, `${d.right} of ${d.queue.length} right`),
      h('p', { class: 'ask' }, d.right >= d.queue.length * 0.8 ? 'Sharp. Take this habit into your games: one look at their move before you play yours.' : 'The misses are the pieces you would have left hanging in a game. One check of their last move, every move, is the fix.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => startThreats(10) }, 'Another 10'), h('button', { class: 'btn quiet', onclick: () => { S.th = null; S.hint = null; render(); } }, 'Done'))));
    return;
  }
  const p = d.p;
  panel.append(h('section', { class: 'sec' },
    h('h2', {}, `Position ${d.i + 1} of ${d.queue.length}`),
    h('p', { class: 'who theirs' }, `Your opponent just played ${p.last.san}. What do they threaten?`),
    h('p', { class: 'note' }, `Move it for them on the board, or say nothing serious. From your game against ${p.g.opp}, ${p.g.date}.`),
    h('p', { class: 'lnote ' + (d.note ? d.note.cls : '') }, d.note ? d.note.text : ''),
    h('div', { class: 'row' },
      d.finished ? h('button', { class: 'btn', onclick: () => { d.i++; loadThreat(); } }, d.i + 1 < d.queue.length ? 'Next position' : 'See how you did')
        : h('button', { class: 'btn quiet', onclick: () => threatAnswer(null) }, 'Nothing serious'),
      h('button', { class: 'btn quiet', onclick: () => { S.th = null; S.hint = null; render(); } }, 'Leave'))));
}
