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
  let games = 0, moves = 0, lossSum = 0;
  for (const R of reviews) {
    games++; const ms = reviewMistakes(R);
    for (let i = (R.g.me === 'w' ? 0 : 1); i < R.sans.length; i += 2) if (R.evals[i] != null && R.evals[i + 1] != null) { moves++; const s = R.g.me === 'w' ? 1 : -1; lossSum += Math.max(0, Math.min(500, s * clampE(R.evals[i]) - s * clampE(R.evals[i + 1]))); }
    for (const m of ms) {
      if (m.loss < 120) continue;
      const theirBest = R.best[m.i + 1] || ''; const myBest = m.best || '';
      const k = m.i < 24 ? 'opening' : m.i >= 80 ? 'endgame' : /x|\+/.test(theirBest) ? 'hang' : /x|\+/.test(myBest) ? 'miss' : 'plan';
      kinds[k].n++; kinds[k].cost += m.loss;
      if (!kinds[k].ex || m.loss > kinds[k].ex.loss) kinds[k].ex = { g: R.g, i: m.i, san: m.san, best: m.best, loss: m.loss };
    }
  }
  const list = Object.values(kinds).filter(k => k.n).sort((a, b) => b.cost - a.cost);
  return { games, acpl: moves ? Math.round(lossSum / moves) : null, list };
}
function storedReviews() {
  const out = [];
  for (const g of S.games) { const c = LS.get('review:' + g.id); if (!c || !c.evals) continue;
    const sans = []; const ch = new Chess(); for (const s of fullMoves(g)) { const m = ch.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
    if (c.evals.length === sans.length + 1) out.push({ g, sans, evals: c.evals, best: c.best || [] }); }
  return out;
}
async function deepScan(n, onProgress) {
  const pick = S.games.filter(g => g.full).sort((a, b) => gameTime(b) - gameTime(a)).slice(0, n);
  let k = 0; S.batch = true;
  for (const g of pick) {
    k++; onProgress(k, pick.length);
    if (LS.get('review:' + g.id)) continue;
    const sans = []; const c = new Chess(); for (const s of fullMoves(g)) { const m = c.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
    const evals = [], best = []; const cc = new Chess(); let ok = true;
    for (let i = 0; i <= sans.length; i++) {
      const a = await analyze(cc.fen(), { depth: 10 }); if (a.cancelled) { ok = false; break; }
      evals[i] = cc.game_over() ? (cc.in_checkmate() ? (cc.turn() === 'w' ? -10000 : 10000) : 0) : evalNum(a.lines[0]);
      best[i] = a.best ? pvToSan(cc.fen(), [a.best], 1)[0] : null;
      if (i < sans.length) cc.move(sans[i]);
    }
    if (!ok) break;
    LS.set('review:' + g.id, { evals, best });
  }
  S.batch = false;
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
  const games = S.games; const p = D.profile;
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

  // Hero
  box.append(h('section', { class: 'story-hero' },
    h('p', { class: 'eyebrow' }, `The story of ${who}`),
    h('h3', { class: 'big' }, 'You play like ', h('em', {}, M.first.name)),
    h('p', { class: 'lede' }, `${M.first.tag}. ${M.first.blurb}`),
    h('p', { class: 'ask' }, `A ${M.fit}% match on style, with a touch of ${M.second.name}. Based on how you actually move in your last ${pool.length} games: ${F.raw.checksPer10.toFixed(1)} checks in every 10 moves, your queen out early in ${Math.round(F.raw.earlyQ * 100)}% of games, ${F.raw.wins ? Math.round(100 * F.raw.longWins / F.raw.wins) : 0}% of wins after move 40.`),
    h('div', { class: 'traits' }, FEATURE_NAMES.map((n, i) => h('div', { class: 'trait' }, h('span', { class: 'note' }, n), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(F.vec[i] * 100)}%` })), h('span', { class: 'meter ghost' }, h('i', { style: `width:${Math.round(M.first.v[i] * 100)}%` }))))),
    h('p', { class: 'note' }, `Amber is you, grey is ${M.first.name.split(' ').pop()}.`)));

  // Score
  const sc = h('section', { class: 'story-ch' }, h('p', { class: 'chno' }, 'Chapter one'), h('h3', {}, 'Your Reps Score'),
    h('div', { class: 'scorewrap' }, h('div', { class: 'scorebig' }, String(RS.total), h('small', {}, 'out of 100')),
      h('div', { class: 'scoreparts' }, RS.parts.map(x => h('div', { class: 'spart' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('span', {}, x.key), h('b', {}, String(x.v))), h('span', { class: 'meter wide' }, h('i', { style: `width:${x.v}%` })), h('span', { class: 'note' }, x.why))))),
    h('p', { class: 'ask' }, `Your lowest part is ${RS.parts.slice().sort((a, b) => a.v - b.v)[0].key.toLowerCase()}. That is where your Today plan leans.`));
  box.append(sc);

  // Rating journey
  box.append(h('section', { class: 'story-ch' }, h('p', { class: 'chno' }, 'Chapter two'), h('h3', {}, 'The road so far'),
    h('p', { class: 'lede' }, series.length >= 2 ? `In ${main}, you went from ${first} to ${now}${peak > now ? `, with a peak of ${peak}` : ''}. ${now - first >= 0 ? 'Up' : 'Down'} ${Math.abs(now - first)} points over ${series.length} rated games.` : `Most of your games are ${main}.`),
    sparkline(series),
    h('div', { class: 'facts' },
      h('div', { class: 'fact' }, h('b', {}, String(games.length)), h('span', {}, 'games imported')),
      h('div', { class: 'fact' }, h('b', {}, String(best)), h('span', {}, 'longest winning streak')),
      upset ? h('div', { class: 'fact' }, h('b', {}, '+' + (upset.oppElo - upset.myElo)), h('span', {}, `your biggest upset, beating ${upset.opp} (${upset.oppElo})`)) : null,
      h('div', { class: 'fact' }, h('b', {}, pc(p.overall)), h('span', {}, 'your score recently')))));

  // Openings
  const ops = p.openings; const bySide = s => ops.filter(o => o.side === s && o.n >= 4);
  const weapon = ops.filter(o => o.n >= 5).sort((a, b) => b.score - a.score)[0]; const krypto = ops.filter(o => o.n >= 5).sort((a, b) => a.score - b.score)[0];
  const opList = s => { const ul = h('ul', { class: 'list' }); for (const o of bySide(s).slice(0, 4)) ul.append(h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, o.name), h('span', { class: 'note' }, o.n + ' games'), h('span', { class: 'tag ' + (o.score >= 0.55 ? 'ok' : o.score < 0.45 ? 'gap' : 'dim') }, pc(o.score)))); if (!ul.children.length) ul.append(h('li', { class: 'empty' }, 'Not enough games yet.')); return ul; };
  box.append(h('section', { class: 'story-ch' }, h('p', { class: 'chno' }, 'Chapter three'), h('h3', {}, 'The openings you live by'),
    h('p', { class: 'lede' }, [weapon ? `Your weapon is the ${weapon.name} as ${sideName(weapon.side)}, where you score ${pc(weapon.score)}. ` : '', krypto && krypto !== weapon ? `Your kryptonite is the ${krypto.name} as ${sideName(krypto.side)}: ${pc(krypto.score)}.` : ''].join('')),
    h('div', { class: 'two' }, h('div', {}, h('h2', {}, 'As White'), opList('w')), h('div', {}, h('h2', {}, 'As Black'), opList('b')))));

  // How games end + costliest mistake
  const wins = pool.filter(g => g.score === 1), losses = pool.filter(g => g.score === 0);
  const ends = arr => ['mate', 'resign', 'time', 'abandon'].map(k => [k, arr.filter(g => g.end === k).length]).filter(x => x[1]);
  const LABEL = { mate: 'by checkmate', resign: 'by resignation', time: 'on time', abandon: 'by abandonment' };
  const R = mistakeKinds(storedReviews()); const top = R.list[0];
  const ch4 = h('section', { class: 'story-ch' }, h('p', { class: 'chno' }, 'Chapter four'), h('h3', {}, 'The mistake costing you the most'));
  if (top) {
    ch4.append(h('p', { class: 'lede' }, top.label + '.'), h('p', { class: 'ask' }, `Across ${R.games} engine-checked games, this kind of mistake cost you the most: ${top.n} times, about ${(top.cost / 100 / R.games).toFixed(1)} pawns a game. ${top.tip}`));
    if (top.ex) ch4.append(h('button', { class: 'btn quiet', onclick: () => { startReview(top.ex.g).then(() => {}); setTimeout(() => { if (S.review) { S.review.idx = top.ex.i; render(); } }, 50); } }, `See your worst one: ${Math.floor(top.ex.i / 2) + 1}${top.ex.i % 2 ? '…' : '.'}${top.ex.san} against ${top.ex.g.opp}`));
    const ul = h('ul', { class: 'list', style: 'margin-top:14px' }); for (const k of R.list.slice(1, 4)) ul.append(h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, k.label), h('span', { class: 'note' }, `${k.n}×`))); ch4.append(ul);
    if (R.acpl != null) ch4.append(h('p', { class: 'note' }, `Average loss per move in these games: ${R.acpl} centipawns. Lower is better; strong club players sit around 40.`));
  } else {
    const w0 = D.weak[0];
    ch4.append(h('p', { class: 'lede' }, w0 ? w0.text : 'No clear pattern from results alone.'),
      h('p', { class: 'ask' }, engineOk() ? 'For the real answer, let Stockfish go through your recent games. It finds every mistake and sorts them by kind: loose pieces, missed tactics, opening errors, endgame slips.' : 'The engine scan runs on the hosted version of Chess Reps.'));
  }
  if (engineOk()) {
    const prog = h('span', { class: 'note', id: 'rw-deep' });
    ch4.append(h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn' + (top ? ' quiet' : ''), disabled: !!S.batch, onclick: async () => {
      await deepScan(15, (k, n) => { const e = $('#rw-deep'); if (e) e.textContent = `Engine checking game ${k} of ${n}…`; }); render(); } }, top ? 'Check more games' : 'Scan my last 15 games'), prog));
  }
  ch4.append(h('div', { class: 'two', style: 'margin-top:18px' },
    h('div', {}, h('h2', {}, `How you win (${wins.length})`), h('ul', { class: 'list' }, ends(wins).map(([k, n]) => h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, LABEL[k]), h('span', { class: 'note' }, Math.round(100 * n / Math.max(1, wins.length)) + '%'))))),
    h('div', {}, h('h2', {}, `How you lose (${losses.length})`), h('ul', { class: 'list' }, ends(losses).map(([k, n]) => h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, LABEL[k]), h('span', { class: 'note' }, Math.round(100 * n / Math.max(1, losses.length)) + '%')))))));
  box.append(ch4);

  // When you play
  const wp = whenYouPlay(pool);
  if (wp.length >= 2) {
    const bestT = wp.slice().sort((a, b) => b.score - a.score)[0], worstT = wp.slice().sort((a, b) => a.score - b.score)[0];
    box.append(h('section', { class: 'story-ch' }, h('p', { class: 'chno' }, 'Chapter five'), h('h3', {}, 'When you play your best'),
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
