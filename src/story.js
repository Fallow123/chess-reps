// ---------- Your chess story ----------
// Style features come straight from the move text: no engine needed.
const LEGENDS = [
  { name: 'Mikhail Tal', tag: 'The Magician from Riga', v: [0.9, 0.45, 0.2, 0.25, 0.45, 0.45, 0.55],
    blurb: 'You go for the king and keep the game messy. Checks, sacrifices and open lines are where you are at home.', lesson: 'Tal calculated more than he gambled. Your attacks land more often when you check what the defence has first.' },
  { name: 'Paul Morphy', tag: 'The pride and sorrow of chess', v: [0.8, 0.3, 0.1, 0.4, 0.85, 0.3, 0.5],
    blurb: 'Fast development, open games, and quick finishes. You like the game decided before move 30.', lesson: 'Morphy won by developing faster than his opponents. Count your developed pieces before you attack.' },
  { name: 'Garry Kasparov', tag: 'The Beast from Baku', v: [0.8, 0.5, 0.4, 0.5, 0.65, 0.3, 0.5],
    blurb: 'Dynamic and ambitious. You take the initiative and keep pressing, with openings you know well.', lesson: 'Kasparov’s edge was preparation. Deeper lines in your repertoire are your fastest way up.' },
  { name: 'Bobby Fischer', tag: 'Best by test', v: [0.6, 0.4, 0.6, 0.6, 0.95, 0.2, 0.5],
    blurb: 'Loyal to your openings and clear in your plans. You win cleanly and rarely settle for draws.', lesson: 'Fischer knew his few openings better than anyone. Narrow and deepen your repertoire rather than widen it.' },
  { name: 'Magnus Carlsen', tag: 'The grinder', v: [0.4, 0.6, 0.9, 0.7, 0.3, 0.2, 0.6],
    blurb: 'You play long games and win late. Small edges in quiet positions are enough for you.', lesson: 'Carlsen’s grind rests on endgame technique. Every endgame chapter you master turns draws into wins.' },
  { name: 'José Raúl Capablanca', tag: 'The human chess machine', v: [0.3, 0.4, 0.8, 0.7, 0.55, 0.2, 0.85],
    blurb: 'You simplify, trade into endings, and let technique decide. Clarity over complications.', lesson: 'Capablanca trusted simple positions. Make sure every trade you make leaves you the better ending.' },
  { name: 'Tigran Petrosian', tag: 'Iron Tigran', v: [0.2, 0.3, 0.6, 0.95, 0.5, 0.1, 0.4],
    blurb: 'Hard to beat. You defend well, avoid risk, and wait for your opponent to overreach.', lesson: 'Petrosian’s defence was built on spotting threats early. Ask what your opponent wants before every move.' },
  { name: 'Anatoly Karpov', tag: 'The boa constrictor', v: [0.3, 0.4, 0.7, 0.8, 0.75, 0.1, 0.5],
    blurb: 'Steady and positional. You squeeze slowly and keep control instead of forcing matters.', lesson: 'Karpov improved his worst piece, move after move. When you have no plan, do that.' },
  { name: 'Hikaru Nakamura', tag: 'Speed king', v: [0.6, 0.95, 0.5, 0.5, 0.4, 0.4, 0.5],
    blurb: 'You play fast and often. Intuition and pace are your weapons, and the clock is part of your game.', lesson: 'Speed builds instinct, but slower games build understanding. One rapid game a day pays off in blitz.' },
];
const FEATURE_NAMES = ['Attack', 'Speed', 'Grind', 'Solidity', 'Loyalty', 'Early queen', 'Trades'];

function storyFeatures(games) {
  let checks = 0, caps = 0, myMoves = 0, earlyQ = 0, gambit = 0, mateWins = 0, wins = 0, longWins = 0, earlyLoss = 0, draws = 0, fast = 0, noCastle = 0, castleN = 0;
  const firstW = {};
  for (const g of games) {
    const toks = (g.full || g.moves).split(' ').filter(Boolean); const par = g.me === 'w' ? 0 : 1;
    let q = false, castled = false;
    for (let i = par; i < toks.length; i += 2) {
      const t = toks[i]; myMoves++;
      if (t.includes('+') || t.includes('#')) checks++;
      if (t.includes('x')) caps++;
      if (t[0] === 'Q' && i < 16) q = true;
      if (t.startsWith('O-O') && i < 24) castled = true;
    }
    if (q) earlyQ++;
    if (toks.length >= 24) { castleN++; if (!castled) noCastle++; }
    if (/gambit/i.test(g.opening || '')) gambit++;
    if (g.me === 'w' && toks[0]) firstW[toks[0]] = (firstW[toks[0]] || 0) + 1;
    if (g.score === 1) { wins++; if (g.end === 'mate') mateWins++; if ((g.plies || toks.length) >= 80) longWins++; }
    if (g.score === 0 && (g.plies || toks.length) <= 50 && g.end !== 'time') earlyLoss++;
    if (g.score === 0.5) draws++;
    if (g.cls === 'bullet' || g.cls === 'blitz') fast++;
  }
  const n = Math.max(1, games.length); const c01 = x => Math.max(0, Math.min(1, x));
  const wN = Object.values(firstW).reduce((a, b) => a + b, 0);
  return {
    vec: [
      c01((checks / Math.max(1, myMoves)) * 6 * 0.5 + (wins ? mateWins / wins : 0) * 0.3 + (gambit / n) * 2 * 0.2),
      c01(fast / n),
      c01(wins ? (longWins / wins) * 1.6 : 0),
      c01(1 - (earlyLoss / n) * 2.2 + (draws / n)),
      c01(wN ? Math.max(...Object.values(firstW)) / wN : 0.5),
      c01((earlyQ / n) * 2),
      c01((caps / Math.max(1, myMoves)) * 3),
    ],
    raw: { checksPer10: 10 * checks / Math.max(1, myMoves), earlyQ: earlyQ / n, gambit: gambit / n, mateWins, wins, longWins, earlyLoss, draws, noCastle: castleN ? noCastle / castleN : 0, topFirst: Object.entries(firstW).sort((a, b) => b[1] - a[1])[0] },
  };
}
function matchLegend(vec) {
  const d = L => Math.sqrt(L.v.reduce((a, x, i) => a + (x - vec[i]) ** 2, 0));
  const ranked = LEGENDS.map(L => ({ L, d: d(L) })).sort((a, b) => a.d - b.d);
  return { first: ranked[0].L, second: ranked[1].L, fit: Math.round(100 * Math.max(0, 1 - ranked[0].d / 1.6)) };
}

// The Reps Score: five parts, each 0..100, each from something you can change.
function repsScore(p, games, gapsBoth, lines) {
  if (!p) return null;
  const L = p.losses; const pool = Math.max(1, p.pool);
  const long = games.filter(g => (g.plies || 0) >= 80); const longScore = scoreOf(long);
  const inPrep = ['w', 'b'].filter(s => lines[s] && gapsBoth[s] && gapsBoth[s].games).map(s => Math.min(1, (gapsBoth[s].avgBook / 2) / (tierFor(p.elo).depth / 2)));
  const parts = [
    { key: 'Openings', v: inPrep.length ? inPrep.reduce((a, b) => a + b, 0) / inPrep.length : 0.2, why: inPrep.length ? 'How deep into your prep your games go, against the target for your rating.' : 'Build a repertoire to raise this.' },
    { key: 'Tactics', v: 1 - Math.min(1, (L.early / pool) * 3), why: 'Fewer losses that are over before move 25.' },
    { key: 'Endgames', v: long.length >= 5 ? longScore : 0.5, why: long.length >= 5 ? `Your score in the ${long.length} games that went past move 40.` : 'Not enough long games yet to judge.' },
    { key: 'Clock', v: L.n ? 1 - Math.min(1, (L.time / L.n) * 2.5) : 0.8, why: 'Fewer losses on time.' },
    { key: 'Composure', v: p.tilt.score != null && p.overall != null ? Math.max(0, Math.min(1, 0.5 + (p.tilt.score - p.overall) * 2.5)) : 0.6, why: 'How you play right after two losses in a row.' },
  ].map(x => Object.assign(x, { v: Math.round(100 * Math.max(0, Math.min(1, x.v))) }));
  return { total: Math.round(parts.reduce((a, x) => a + x.v, 0) / parts.length), parts };
}

// Mistakes from engine-reviewed games, sorted into the kinds that cost you the most.
function mistakeKinds(reviews) {
  const kinds = { hang: { label: 'Leaving something loose', n: 0, cost: 0, ex: null, tip: 'After you decide on a move, look at every capture and check your opponent will have. Most of these were one-move tactics for them.' },
    miss: { label: 'Missing a tactic of your own', n: 0, cost: 0, ex: null, tip: 'Before every move, list your checks and captures first. You had a winning shot and played something quiet.' },
    opening: { label: 'Going wrong in the opening', n: 0, cost: 0, ex: null, tip: 'These come before move 12. Your repertoire and the Gaps tab are where to fix them.' },
    endgame: { label: 'Slipping in the endgame', n: 0, cost: 0, ex: null, tip: 'These come after move 40, with few pieces left. The endgame chapters train exactly this.' },
    plan: { label: 'Drifting without a plan', n: 0, cost: 0, ex: null, tip: 'Quiet mistakes in the middlegame. When unsure, improve your worst piece; the structures quiz helps here.' } };
  let games = 0, moves = 0, lossSum = 0; const breaks = [];
  for (const R of reviews) {
    games++; const ms = reviewMistakes(R);
    for (let i = (R.g.me === 'w' ? 0 : 1); i < R.sans.length; i += 2) if (R.evals[i] != null && R.evals[i + 1] != null) { moves++; const s = R.g.me === 'w' ? 1 : -1; lossSum += Math.max(0, Math.min(500, s * clampE(R.evals[i]) - s * clampE(R.evals[i + 1]))); }
    for (const m of ms) {
      if (m.loss < 120) continue;
      const theirBest = R.best[m.i + 1] || ''; const myBest = m.best || '';
      const k = m.i < 24 ? 'opening' : m.i >= 80 ? 'endgame' : /x|\+/.test(theirBest) ? 'hang' : /x|\+/.test(myBest) ? 'miss' : 'plan';
      kinds[k].n++; kinds[k].cost += m.loss;
      breaks.push({ g: R.g, i: m.i, san: m.san, best: m.best, loss: m.loss, before: m.before, after: m.after, kind: k, sans: R.sans });
      if (!kinds[k].ex || m.loss > kinds[k].ex.loss) kinds[k].ex = { g: R.g, i: m.i, san: m.san, best: m.best, loss: m.loss };
    }
  }
  const list = Object.values(kinds).filter(k => k.n).sort((a, b) => b.cost - a.cost);
  const acpl = moves ? Math.round(lossSum / moves) : null;
  return { games, acpl, accuracy: acpl == null ? null : Math.round(Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * acpl) - 3.1669))), list, breaks: breaks.sort((a, b) => b.loss - a.loss) };
}
// Winning chances from a centipawn score, the curve lichess uses.
const winPct = cp => Math.round(50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1));
const moveLabel = (i, san) => `${Math.floor(i / 2) + 1}${i % 2 ? '…' : '.'} ${san}`;
function miniBoard(fen, flip, hl) {
  const c = new Chess(fen); const b = h('div', { class: 'miniboard', 'aria-label': 'Position before the move' });
  const files = 'abcdefgh';
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rank = flip ? r + 1 : 8 - r, file = flip ? 7 - f : f; const sq = files[file] + rank;
    const d = h('div', { class: 'msq ' + ((rank + file) % 2 ? 'dark' : 'light') + (hl && hl.includes(sq) ? ' hl' : '') });
    const p = c.get(sq); if (p) d.append(pieceEl(p)); b.append(d);
  }
  return b;
}
function storedReviews() {
  const out = [];
  for (const g of S.games) { const c = LS.get('review:' + g.id); if (!c || !c.evals) continue;
    const sans = []; const ch = new Chess(); for (const s of fullMoves(g)) { const m = ch.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
    if (c.evals.length === sans.length + 1) out.push({ g, sans, evals: c.evals, best: c.best || [] }); }
  return out;
}
// Engine-check one game at depth 10 and cache it, as the Games review does.
async function scanGame(g) {
  const hit = LS.get('review:' + g.id); if (hit && hit.evals) return hit;
  const sans = []; const c = new Chess(); for (const s of fullMoves(g)) { const m = c.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
  const evals = [], best = []; const cc = new Chess();
  for (let i = 0; i <= sans.length; i++) {
    const a = await analyze(cc.fen(), { depth: 10 }); if (a.cancelled) return null;
    evals[i] = cc.game_over() ? (cc.in_checkmate() ? (cc.turn() === 'w' ? -10000 : 10000) : 0) : evalNum(a.lines[0]);
    best[i] = a.best ? pvToSan(cc.fen(), [a.best], 1)[0] : null;
    if (i < sans.length) cc.move(sans[i]);
  }
  const out = { evals, best }; LS.set('review:' + g.id, out); return out;
}
async function deepScan(n, onProgress) {
  const pick = myGames().filter(g => g.full).sort((a, b) => gameTime(b) - gameTime(a)).slice(0, n);
  let k = 0; S.batch = true;
  for (const g of pick) { k++; onProgress(k, pick.length); if (!(await scanGame(g))) break; }
  S.batch = false;
}

// ---------- Why a game was lost: the tactic behind the worst move ----------
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
// After `san` is played from `fen`, does the moved piece hit two or more valuable targets?
function forkAfter(fen, san) {
  const c = new Chess(fen); const m = c.move(san, { sloppy: true }); if (!m) return false;
  const f = c.fen().split(' '); f[1] = m.color; f[3] = '-'; const t = new Chess(f.join(' '));
  const hits = t.moves({ square: m.to, verbose: true }).filter(x => x.captured && VAL[x.captured] >= 3);
  return hits.length + (c.in_check() && !hits.some(x => x.captured === 'k') ? 1 : 0) >= 2;
}
function motifOf(R, m) {
  const c = new Chess(); for (const s of R.sans.slice(0, m.i)) c.move(s);
  const pre = c.fen(); c.move(R.sans[m.i]); const post = c.fen();
  const them = R.best[m.i + 1]; const mine = m.best; const no = Math.floor(m.i / 2) + 1;
  const sgn = R.g.me === 'w' ? 1 : -1; const after = R.evals[m.i + 1] != null ? sgn * R.evals[m.i + 1] : 0;
  if (after <= -5000 && them) return { theme: 'mate', text: `On move ${no}, ${m.san} walked into a mating attack starting with ${them}.` };
  if (them && forkAfter(post, them)) return { theme: 'fork', text: `On move ${no}, ${m.san} allowed ${them}, a fork that won material.` };
  if (them && them.includes('x')) { const cc = new Chess(post); const mv = cc.move(them, { sloppy: true }); if (mv && mv.captured && VAL[mv.captured] >= 3) return { theme: 'hangingPiece', text: `On move ${no}, ${m.san} left your ${({ n: 'knight', b: 'bishop', r: 'rook', q: 'queen' })[mv.captured]} loose and ${them} took it.` }; }
  if (mine && forkAfter(pre, mine)) return { theme: 'fork', text: `On move ${no} you had ${mine}, a fork, and played ${m.san} instead.` };
  if (mine && mine.includes('x')) return { theme: 'hangingPiece', text: `On move ${no}, ${mine} won free material; you played ${m.san}.` };
  if (them && them.includes('+')) return { theme: 'exposedKing', text: `On move ${no}, ${m.san} opened your king to ${them}.` };
  if (m.i >= 80) return { theme: 'endgame', text: `On move ${no}, ${m.san} let the endgame slip; ${mine || 'another move'} held it.` };
  return { theme: 'defensiveMove', text: `On move ${no}, ${m.san} missed the threat behind ${them || 'their reply'}. ${mine ? mine + ' was the move.' : ''}` };
}

// ---------- End of day review ----------
async function dailyReview(rec, onProgress) {
  const out = { good: [], bad: [], losses: [], focus: [], at: Date.now() }; const dayName = new Date().toLocaleDateString('en', { weekday: 'long' });
  const today = gamesToday(); const lost = today.filter(g => g.score === 0), won = today.filter(g => g.score === 1);
  const done = rec.plan.tasks.filter(t => isDone(rec, t)).length;
  out.good.push(`You finished ${done} of ${rec.plan.tasks.length} tasks.`);
  if (won.length) out.good.push(`You won ${won.length} game${won.length > 1 ? 's' : ''}: ${won.map(g => 'against ' + g.opp + (g.oppElo ? ` (${g.oppElo})` : '')).join(', ')}.`);
  const score = {}; const bump = (t, w, why) => { if (!t || BROAD_THEMES.has(t) && t !== 'mate' && t !== 'endgame') return; const e = score[t] = score[t] || { theme: t, w: 0, why }; e.w += w; if (!e.why) e.why = why; };
  // Lost games: what went wrong, by engine.
  if (engineOk()) {
    S.batch = true; let k = 0;
    for (const g of lost) {
      k++; onProgress && onProgress(`Engine checking your loss to ${g.opp} (${k} of ${lost.length})…`);
      const sc = await scanGame(g); if (!sc) continue;
      const sans = []; const c = new Chess(); for (const s of fullMoves(g)) { const m = c.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
      if (sc.evals.length !== sans.length + 1) continue;
      const R = { g, sans, evals: sc.evals, best: sc.best }; const ms = reviewMistakes(R).filter(m => m.loss >= 150).sort((a, b) => b.loss - a.loss);
      if (!ms.length) { out.losses.push({ g, text: `No single big mistake against ${g.opp}: the game slipped away bit by bit${g.end === 'time' ? ', and ended on time' : ''}.` }); if (g.end === 'time') out.bad.push(`Lost on time to ${g.opp}.`); continue; }
      const mo = motifOf(R, ms[0]);
      out.losses.push({ g, i: ms[0].i, theme: mo.theme, text: mo.text });
      bump(mo.theme, 3, `You lost to ${g.opp} on ${dayName}: ${mo.text}`);
    }
    S.batch = false;
  } else if (lost.length) out.bad.push(`You lost ${lost.length} game${lost.length > 1 ? 's' : ''}. Open the hosted Pawnstorm to have the engine explain why.`);
  // Puzzles: which themes you missed.
  const pz = liPuzzlesToday();
  if (pz.length) {
    const won = pz.filter(x => x.win).length; (won / pz.length >= 0.75 ? out.good : out.bad).push(`Puzzles: ${won} of ${pz.length} right (${Math.round(100 * won / pz.length)}%).`);
    const miss = {}; for (const x of pz.filter(x => !x.win)) for (const t of x.themes || []) if (!BROAD_THEMES.has(t)) miss[t] = (miss[t] || 0) + 1;
    const top = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) out.bad.push(`Missed puzzle themes: ${top.map(([t, n]) => `${themeName(t)} (${n})`).join(', ')}.`);
    for (const [t, n] of top) if (n >= 2) bump(t, n, `You missed ${n} ${themeName(t)} puzzles on ${dayName}.`);
  }
  const st = liStormToday(); if (st) out.good.push(`Puzzle Storm: ${st.score}${S.li.storm && st.score >= S.li.storm ? ', a new best' : ''}.`);
  // lichess's own dashboard: your weakest theme over 30 days.
  const weak = (S.li.themes || []).filter(x => x.nb >= 8 && !BROAD_THEMES.has(x.theme)).sort((a, b) => a.first / a.nb - b.first / b.nb)[0];
  if (weak) bump(weak.theme, 2, `On lichess you solve ${themeName(weak.theme)} puzzles ${Math.round(100 * weak.first / weak.nb)}% of the time on the first try, your lowest theme this month.`);
  out.focus = Object.values(score).sort((a, b) => b.w - a.w).slice(0, 2).map(x => ({ theme: x.theme, why: x.why }));
  if (out.focus[0]) out.next = `Tomorrow: 20 ${themeName(out.focus[0].theme)} puzzles. ${out.focus[0].why}`;
  return out;
}

function ratingSeries(games, cls) {
  return games.filter(g => g.cls === cls && g.myElo).sort((a, b) => gameTime(a) - gameTime(b)).map(g => [gameTime(g), g.myElo]);
}
function sparkline(series) {
  const W = 600, H = 120, P = 6;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'spark');
  if (series.length < 2) return svg;
  const t0 = series[0][0], t1 = series[series.length - 1][0] || t0 + 1; const ys = series.map(s => s[1]); const lo = Math.min(...ys), hi = Math.max(...ys) || lo + 1;
  const x = t => P + (t - t0) / Math.max(1, t1 - t0) * (W - 2 * P); const y = v => H - P - (v - lo) / Math.max(1, hi - lo) * (H - 2 * P);
  const pts = series.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const pk = series.reduce((a, b) => b[1] > a[1] ? b : a);
  svg.innerHTML = `<polygon fill="var(--amber)" opacity=".12" points="${P},${H - P} ${pts} ${W - P},${H - P}"/><polyline fill="none" stroke="var(--amber)" stroke-width="2" vector-effect="non-scaling-stroke" points="${pts}"/>`
    + `<circle cx="${x(pk[0])}" cy="${y(pk[1])}" r="4" fill="var(--bone)"/><circle cx="${x(series[series.length - 1][0])}" cy="${y(series[series.length - 1][1])}" r="4" fill="var(--amber)"/>`;
  return svg;
}
const HOURS = [['Mornings', 5, 12], ['Afternoons', 12, 17], ['Evenings', 17, 22], ['Late nights', 22, 29]];
function whenYouPlay(games) {
  const rows = HOURS.map(([label, a, b]) => { const gs = games.filter(g => { if (!g.time) return false; let hr = new Date(gameTime(g)).getHours(); if (hr < 5) hr += 24; return hr >= a && hr < b; }); return { label, n: gs.length, score: scoreOf(gs) }; }).filter(r => r.n >= 5);
  return rows;
}

function renderStory() {
  const box = $('#rw-story'); box.replaceChildren();
  const games = myGames(); const p = D.profile;
  if (!p || games.length < 20) {
    box.append(h('section', { class: 'story-hero' }, h('p', { class: 'eyebrow' }, 'Your chess story'), h('h3', { class: 'big' }, 'Every player has a story. Yours needs games.'),
      h('p', { class: 'ask' }, `Import at least 20 games and this page tells it: which legend you play like, your Reps Score, your rating journey, the openings you live by, and the mistake that costs you the most.${games.length ? ` You have ${games.length} so far.` : ''}`),
      h('button', { class: 'btn', onclick: () => { S.tab = 'games'; render(); } }, 'Import games')));
    return;
  }
  const pool = games.slice().sort((a, b) => gameTime(b) - gameTime(a)).slice(0, 300);
  const F = storyFeatures(pool); const M = matchLegend(F.vec); const RS = repsScore(p, pool, D.gapsBoth, D.linesBoth);
  const who = S.username || 'You'; const main = p.main; const series = ratingSeries(games, main);
  const peak = series.length ? Math.max(...series.map(s => s[1])) : null; const now = series.length ? series[series.length - 1][1] : null; const first = series.length ? series[0][1] : null;
  const upset = pool.filter(g => g.score === 1 && g.oppElo && g.myElo).sort((a, b) => (b.oppElo - b.myElo) - (a.oppElo - a.myElo))[0];
  let best = 0, run = 0; for (const g of games.slice().sort((a, b) => gameTime(a) - gameTime(b))) { run = g.score === 1 ? run + 1 : 0; best = Math.max(best, run); }

  const site = mySite() === 'lichess' ? 'lichess' : 'chess.com';
  const R = mistakeKinds(storedReviews().filter(r => pool.includes(r.g)));
  const W = pool.filter(g => g.score === 1).length, Dn = pool.filter(g => g.score === 0.5).length, Ls = pool.filter(g => g.score === 0).length;
  const N = Math.max(1, W + Dn + Ls);
  const CH = ['Chapter one', 'Chapter two', 'Chapter three', 'Chapter four', 'Chapter five', 'Chapter six']; let chi = 0; const chno = () => h('p', { class: 'chno' }, CH[chi++]);
  const scanBtn = (label, cls) => engineOk() ? h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: cls || 'btn', disabled: !!S.batch, onclick: async () => {
    await deepScan(15, (k, n) => { const e = $('#rw-deep'); if (e) e.textContent = `Engine checking game ${k} of ${n}…`; }); render(); } }, label), h('span', { class: 'note', id: 'rw-deep' })) : h('p', { class: 'note' }, 'The engine scan runs on the hosted version of Pawnstorm.');

  // The report card
  box.append(h('section', { class: 'report' },
    h('p', { class: 'eyebrow' }, 'Your chess report'),
    h('h3', { class: 'rname' }, mySite() === 'lichess' ? S.settings.lichessUser : who),
    h('p', { class: 'rsub' }, `${site} · ${main}${now ? ' ' + now : ''}`),
    h('p', { class: 'chip' }, 'You play like ', h('b', {}, M.first.name)),
    h('div', { class: 'rstats' },
      h('div', {}, h('b', {}, String(RS.total)), h('span', {}, 'Reps Score')),
      h('div', {}, h('b', {}, R.accuracy != null ? R.accuracy + '%' : '–'), h('span', {}, R.accuracy != null ? `accuracy · ${R.games} games` : 'accuracy · scan below')),
      h('div', {}, h('b', {}, peak ? String(peak) : '–'), h('span', {}, 'peak ' + main)),
      h('div', {}, h('b', {}, String(pool.length)), h('span', {}, 'games'))),
    h('div', { class: 'wdl', role: 'img', 'aria-label': `${W} won, ${Dn} drawn, ${Ls} lost` }, h('i', { class: 'w', style: `width:${100 * W / N}%` }), h('i', { class: 'd', style: `width:${100 * Dn / N}%` }), h('i', { class: 'l', style: `width:${100 * Ls / N}%` })),
    h('div', { class: 'wdlnums' }, h('span', {}, `${W} won`), h('span', {}, `${Dn} drawn`), h('span', {}, `${Ls} lost`))));

  // What costs you, and where a game broke
  const cards = h('div', { class: 'cards' });
  const cost = h('section', { class: 'card' }, h('div', { class: 'cardhead' }, h('p', { class: 'eyebrow bad' }, 'What costs you games'), R.list.length ? h('b', { class: 'bad' }, '≈ −' + (R.list.reduce((a, k) => a + k.cost, 0) / 100 / R.games).toFixed(1)) : null));
  if (R.list.length) {
    const max = R.list[0].cost;
    cost.append(h('p', { class: 'note' }, `Pawns each kind of mistake throws away per game, from ${R.games} engine-checked games.`));
    for (const k of R.list) cost.append(h('div', { class: 'costrow' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', {}, k.label), h('b', { class: 'bad' }, '−' + (k.cost / 100 / R.games).toFixed(1))), h('span', { class: 'costbar' }, h('i', { style: `width:${Math.max(4, 100 * k.cost / max)}%` }))));
    cost.append(h('p', { class: 'ask', style: 'margin-top:14px' }, R.list[0].tip));
    cost.append(scanBtn('Check more games', 'btn quiet tiny'));
  } else {
    cost.append(h('p', { class: 'ask' }, 'Let Stockfish go through your last 15 games. It finds every mistake and sorts them: pieces left loose, tactics you missed, opening errors, endgame slips. It takes a few minutes and stays in your browser.'), scanBtn('Scan my last 15 games'));
  }
  cards.append(cost);
  if (R.breaks.length) {
    let bi = 0; const brk = h('section', { class: 'card' });
    const draw = () => {
      const b = R.breaks[bi]; const c = new Chess(); for (const m of b.sans.slice(0, b.i)) c.move(m);
      const mv = c.move(b.san); c.undo(); const bm = b.best ? c.move(b.best, { sloppy: true }) : null; if (bm) c.undo();
      const sg = b.g.me === 'w' ? 1 : -1; const before = winPct(b.before), after = winPct(b.after);
      brk.replaceChildren(
        h('div', { class: 'cardhead' }, h('p', { class: 'eyebrow' }, 'Where a game broke'), h('span', { class: 'note' }, `${bi + 1} of ${R.breaks.length}`)),
        h('h3', { class: 'brkmove' }, moveLabel(b.i, b.san)),
        h('p', { class: 'note', style: 'font-style:normal' }, 'Winning chances ', h('b', { class: 'good' }, before + '%'), ' → ', h('b', { class: 'bad' }, after + '%'), bm ? ['. ', h('b', {}, bm.san), ' was the move.'] : '.'),
        h('p', { class: 'note' }, `Against ${b.g.opp}${b.g.oppElo ? ' (' + b.g.oppElo + ')' : ''}, ${b.g.date}.`),
        miniBoard(c.fen(), b.g.me === 'b', [mv && mv.from, mv && mv.to].filter(Boolean)),
        h('div', { class: 'row', style: 'margin-top:12px' },
          h('button', { class: 'btn quiet tiny', disabled: bi === 0, onclick: () => { bi--; draw(); } }, '← Previous'),
          h('button', { class: 'btn quiet tiny', disabled: bi >= R.breaks.length - 1, onclick: () => { bi++; draw(); } }, 'Next →'),
          h('button', { class: 'btn tiny', onclick: () => { startReview(b.g); setTimeout(() => { if (S.review) { S.review.idx = b.i; render(); } }, 50); } }, 'Open the game')));
    };
    draw(); cards.append(brk);
  }
  if (cards.children.length === 1) cards.classList.add('one');
  box.append(cards);

  // Style
  box.append(h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'You play like ', h('em', {}, M.first.name)),
    h('p', { class: 'lede' }, `${M.first.tag}. ${M.first.blurb}`),
    h('p', { class: 'ask' }, `A ${M.fit}% match on style, with a touch of ${M.second.name}. Based on how you actually move in your last ${pool.length} games: ${F.raw.checksPer10.toFixed(1)} checks in every 10 moves, your queen out early in ${Math.round(F.raw.earlyQ * 100)}% of games, ${F.raw.wins ? Math.round(100 * F.raw.longWins / F.raw.wins) : 0}% of wins after move 40.`),
    h('div', { class: 'traits' }, FEATURE_NAMES.map((n, i) => h('div', { class: 'trait' }, h('span', { class: 'note' }, n), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(F.vec[i] * 100)}%` })), h('span', { class: 'meter ghost' }, h('i', { style: `width:${Math.round(M.first.v[i] * 100)}%` }))))),
    h('p', { class: 'note' }, `Amber is you, grey is ${M.first.name.split(' ').pop()}.`)));

  // Score
  box.append(h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'Your Reps Score'),
    h('div', { class: 'scorewrap' }, h('div', { class: 'scorebig' }, String(RS.total), h('small', {}, 'out of 100')),
      h('div', { class: 'scoreparts' }, RS.parts.map(x => h('div', { class: 'spart' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', {}, x.key), h('b', {}, String(x.v))), h('span', { class: 'meter wide' }, h('i', { style: `width:${x.v}%` })), h('span', { class: 'note' }, x.why))))),
    h('p', { class: 'ask' }, `Your lowest part is ${RS.parts.slice().sort((a, b) => a.v - b.v)[0].key.toLowerCase()}. That is where your Today plan leans.`)));

  // Rating journey
  box.append(h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'The road so far'),
    h('p', { class: 'lede' }, series.length >= 2 ? `In ${main}, you went from ${first} to ${now}${peak > now ? `, with a peak of ${peak}` : ''}. ${now - first >= 0 ? 'Up' : 'Down'} ${Math.abs(now - first)} points over ${series.length} rated games.` : `Most of your games are ${main}.`),
    sparkline(series),
    h('div', { class: 'facts' },
      h('div', { class: 'fact' }, h('b', {}, String(best)), h('span', {}, 'longest winning streak')),
      upset ? h('div', { class: 'fact' }, h('b', {}, '+' + (upset.oppElo - upset.myElo)), h('span', {}, `your biggest upset, beating ${upset.opp} (${upset.oppElo})`)) : null,
      h('div', { class: 'fact' }, h('b', {}, pc(p.overall)), h('span', {}, 'your score recently')))));

  // Openings
  const ops = p.openings; const bySide = s => ops.filter(o => o.side === s && o.n >= 4);
  const weapon = ops.filter(o => o.n >= 5).sort((a, b) => b.score - a.score)[0]; const krypto = ops.filter(o => o.n >= 5).sort((a, b) => a.score - b.score)[0];
  const opList = s => { const ul = h('ul', { class: 'list' }); for (const o of bySide(s).slice(0, 4)) ul.append(h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, o.name), h('span', { class: 'note' }, o.n + ' games'), h('span', { class: 'tag ' + (o.score >= 0.55 ? 'ok' : o.score < 0.45 ? 'gap' : 'dim') }, pc(o.score)))); if (!ul.children.length) ul.append(h('li', { class: 'empty' }, 'Not enough games yet.')); return ul; };
  box.append(h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'The openings you live by'),
    h('p', { class: 'lede' }, [weapon ? `Your weapon is the ${weapon.name} as ${sideName(weapon.side)}, where you score ${pc(weapon.score)}. ` : '', krypto && krypto !== weapon ? `Your kryptonite is the ${krypto.name} as ${sideName(krypto.side)}: ${pc(krypto.score)}.` : ''].join('')),
    h('div', { class: 'two' }, h('div', {}, h('h2', {}, 'As White'), opList('w')), h('div', {}, h('h2', {}, 'As Black'), opList('b')))));

  // How games end
  const wins = pool.filter(g => g.score === 1), losses = pool.filter(g => g.score === 0);
  const ends = arr => ['mate', 'resign', 'time', 'abandon'].map(k => [k, arr.filter(g => g.end === k).length]).filter(x => x[1]);
  const LABEL = { mate: 'by checkmate', resign: 'by resignation', time: 'on time', abandon: 'by abandonment' };
  const ch4 = h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'How your games end'), h('div', { class: 'two', style: 'margin-top:8px' },
    h('div', {}, h('h2', {}, `How you win (${wins.length})`), h('ul', { class: 'list' }, ends(wins).map(([k, n]) => h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, LABEL[k]), h('span', { class: 'note' }, Math.round(100 * n / Math.max(1, wins.length)) + '%'))))),
    h('div', {}, h('h2', {}, `How you lose (${losses.length})`), h('ul', { class: 'list' }, ends(losses).map(([k, n]) => h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, LABEL[k]), h('span', { class: 'note' }, Math.round(100 * n / Math.max(1, losses.length)) + '%')))))));
  box.append(ch4);

  // When you play
  const wp = whenYouPlay(pool);
  if (wp.length >= 2) {
    const bestT = wp.slice().sort((a, b) => b.score - a.score)[0], worstT = wp.slice().sort((a, b) => a.score - b.score)[0];
    box.append(h('section', { class: 'story-ch' }, chno(), h('h3', {}, 'When you play your best'),
      h('p', { class: 'lede' }, bestT.score - worstT.score >= 0.08 ? `${bestT.label} are your time: you score ${pc(bestT.score)}, against ${pc(worstT.score)} in ${worstT.label.toLowerCase()}.` : 'The time of day makes little difference to your results.'),
      h('div', { class: 'facts' }, wp.map(r => h('div', { class: 'fact' }, h('b', {}, pc(r.score)), h('span', {}, `${r.label} · ${r.n} games`)))),
      p.tilt.score != null ? h('p', { class: 'ask' }, `After two losses in a row you score ${pc(p.tilt.score)}. ${p.tilt.score < p.overall - 0.08 ? 'That is the moment to stop for the day.' : 'You keep your head well after losses.'}`) : null));
  }

  // Next chapter
  box.append(h('section', { class: 'story-ch last' }, h('p', { class: 'chno' }, 'The next chapter'), h('h3', {}, 'What ' + M.first.name.split(' ').pop() + ' would tell you'),
    h('p', { class: 'lede' }, M.first.lesson),
    h('ol', { class: 'next' }, D.weak.slice(0, 3).map(w => h('li', {}, w.text))),
    h('button', { class: 'btn', onclick: () => { S.tab = 'today'; render(); } }, 'See today’s plan')));
}
