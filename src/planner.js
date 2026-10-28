// ---------- Coach: profile from your games, and a plan for today (no DOM) ----------
const DAY_MS = 864e5;
const gameTime = g => Date.parse((g.date || '1970-01-01') + 'T' + (g.time || '00:00:00') + 'Z') || 0;
const scoreOf = arr => { const s = arr.filter(g => g.score != null); return s.length ? s.reduce((a, g) => a + g.score, 0) / s.length : null; };
const pc = x => x == null ? 'n/a' : Math.round(100 * x) + '%';

function computeProfile(games) {
  const all = games.slice().sort((a, b) => gameTime(a) - gameTime(b));
  if (!all.length) return null;
  const end = gameTime(all[all.length - 1]);
  const recent = all.filter(g => gameTime(g) > end - 30 * DAY_MS);
  const classes = {};
  for (const g of all) {
    const c = classes[g.cls || 'other'] || (classes[g.cls || 'other'] = { n: 0, recent: 0, games: [], first: null, last: null, peak: 0 });
    c.n++; c.games.push(g);
    if (g.myElo) { c.last = g.myElo; c.peak = Math.max(c.peak, g.myElo); }
  }
  for (const [k, c] of Object.entries(classes)) {
    const r = c.games.filter(g => gameTime(g) > end - 30 * DAY_MS);
    c.recent = r.length; c.score = scoreOf(r.length ? r : c.games);
    const withElo = (r.length ? r : c.games).filter(g => g.myElo);
    c.first = withElo.length ? withElo[0].myElo : null;
    c.trend = c.first && c.last ? c.last - c.first : 0;
    delete c.games;
  }
  const playable = Object.entries(classes).filter(([k]) => k !== 'other' && k !== 'daily');
  const main = (playable.length ? playable : Object.entries(classes)).sort((a, b) => b[1].recent - a[1].recent || b[1].n - a[1].n)[0][0];

  const pool = all;
  const losses = pool.filter(g => g.score === 0);
  const L = {
    n: losses.length,
    time: losses.filter(g => g.end === 'time').length,
    early: losses.filter(g => g.end !== 'time' && g.plies && g.plies <= 50).length,
    long: losses.filter(g => g.plies && g.plies >= 80).length,
    mate: losses.filter(g => g.end === 'mate').length,
  };
  const wonOnTime = pool.filter(g => g.score === 1 && g.end === 'time').length;
  const color = { w: scoreOf(pool.filter(g => g.me === 'w')), b: scoreOf(pool.filter(g => g.me === 'b')),
    nw: pool.filter(g => g.me === 'w').length, nb: pool.filter(g => g.me === 'b').length };

  const op = new Map();
  for (const g of pool) { const k = g.me + '|' + (g.opening || 'Unknown'); if (!op.has(k)) op.set(k, { side: g.me, name: g.opening || 'Unknown', games: [] }); op.get(k).games.push(g); }
  const openings = [...op.values()].map(o => ({ side: o.side, name: o.name, n: o.games.length, score: scoreOf(o.games) })).filter(o => o.n >= 3).sort((a, b) => b.n - a.n);

  // Tilt: how you score in the game right after two losses in a row on the same day.
  let after2 = [], streak = 0, lastDay = '', worstRun = 0, run = 0;
  for (const g of pool) {
    if (g.date !== lastDay) { streak = 0; run = 0; lastDay = g.date; }
    if (streak >= 2) after2.push(g);
    streak = g.score === 0 ? streak + 1 : 0; run = g.score === 0 ? run + 1 : 0; worstRun = Math.max(worstRun, run);
  }
  const days = new Set(pool.map(g => g.date));
  const perDay = pool.length / Math.max(1, days.size);
  const overall = scoreOf(pool);
  const tiltScore = after2.length >= 4 ? scoreOf(after2) : null;

  return { classes, main, elo: classes[main] && classes[main].last, pool: pool.length, recent: recent.length, end, losses: L, wonOnTime,
    color, openings, overall, tilt: { after2: after2.length, score: tiltScore, worstRun, perDay }, activeDays: days.size };
}

// Each weakness gets a 0..1 score and the sentence that justifies it.
function weaknesses(p, gaps, lines = { w: 1, b: 1 }) {
  const out = [];
  if (!p) return out;
  const L = p.losses; const enough = L.n >= 5;
  if (enough && L.time / L.n >= 0.15) out.push({ key: 'time', score: Math.min(1, L.time / L.n * 2.2), text: `${L.time} of your last ${L.n} losses were on time.` });
  if (enough && L.early / L.n >= 0.25) out.push({ key: 'tactics', score: Math.min(1, L.early / L.n * 1.6), text: `${L.early} of your last ${L.n} losses were over before move 25. That is usually a missed tactic or a hung piece.` });
  if (enough && L.long / L.n >= 0.25) out.push({ key: 'endgames', score: Math.min(1, L.long / L.n * 1.5), text: `${L.long} of your last ${L.n} losses went past move 40, where endgame technique decides.` });
  const g = ['w', 'b'].filter(s => lines[s] && gaps[s] && gaps[s].games >= 5).map(s => gaps[s]);
  const earliest = g.length ? Math.max(...g.map(x => x.early / x.games)) : null;
  const cg = p.color.w != null && p.color.b != null && p.color.nw >= 5 && p.color.nb >= 5 ? p.color.w - p.color.b : 0;
  if ((earliest != null && earliest >= 0.4) || Math.abs(cg) >= 0.12) {
    const worse = cg >= 0 ? 'Black' : 'White';
    const parts = [];
    if (earliest != null && earliest >= 0.4) parts.push(`${pc(earliest)} of your games leave your prep before move 8.`);
    if (Math.abs(cg) >= 0.12) parts.push(`You score ${pc(cg >= 0 ? p.color.b : p.color.w)} as ${worse}, against ${pc(cg >= 0 ? p.color.w : p.color.b)} with the other colour.`);
    out.push({ key: 'openings', score: Math.min(1, Math.max(earliest || 0, Math.abs(cg) * 3)), side: cg >= 0 ? 'b' : 'w', text: parts.join(' ') });
  }
  if (p.tilt.score != null && p.overall != null && p.overall - p.tilt.score >= 0.12)
    out.push({ key: 'tilt', score: Math.min(1, (p.overall - p.tilt.score) * 3), text: `Right after two losses in a row you score ${pc(p.tilt.score)}, against ${pc(p.overall)} overall.` });
  return out.sort((a, b) => b.score - a.score);
}

const TIERS = [
  { max: 800, name: 'Beginner', depth: 6, puzzles: 10, note: 'Most games at this level are decided by a loose piece. Before every move, ask what your opponent’s last move attacks.' },
  { max: 1200, name: 'Club starter', depth: 8, puzzles: 10, note: 'Tactics decide most of your games. Keep openings short and sound: about 8 moves you know well beats 15 you half know.' },
  { max: 1600, name: 'Improving club player', depth: 10, puzzles: 10, note: 'Know your main lines to about move 10, know the plan that follows, and convert the basic endgames without thinking.' },
  { max: 2000, name: 'Strong club player', depth: 14, puzzles: 10, note: 'Calculation and technique separate you from the next level: rook endings, prophylaxis, and lines prepared past move 12.' },
  { max: 9999, name: 'Expert', depth: 18, puzzles: 10, note: 'Your preparation should be deep and checked, and your weak spots come from your own losses, not from general advice.' },
];
const tierFor = elo => TIERS.find(t => (elo || 1000) < t.max);
const TC = { bullet: '1|1', blitz: '5|0', rapid: '10|0', slow: '15|10', daily: '1 day' };
const GAME_MIN = { bullet: 4, blitz: 12, rapid: 22, slow: 35, daily: 5 };
const RUNS = ['Pawn structures', 'The minority attack', 'Playing the isolani', 'Breaking the bind', 'Attacking a pawn chain'];
// Cleared chapters come back on a growing interval (2, 4, 8… days), most overdue first.
function egDue(eg, date) {
  const wins = (eg && eg.wins) || {}, seen = (eg && eg.seen) || {}, now = +date;
  return EG_CHAPTERS.filter(([id, , need]) => (wins[id] || 0) >= need)
    .map(([id, title]) => { const r = seen[id] || {}; return { id, title, over: r.last ? (now - r.last) / DAY_MS - (r.iv || 2) : 99, iv: r.iv || 0 }; })
    .filter(x => x.over >= 0).sort((a, b) => b.over - a.over);
}
const EG_CHAPTERS = [["queenmate","The queen mate",2],["rookmate","The rook mate",2],["twobishops","Two bishops",2],["square","The square of the pawn",2],["opposition","The opposition",2],["keysquares","Key squares",2],["pawnwin","Queening the pawn",3],["distant","Distant opposition",2],["holddraw","Holding the draw",3],["triangulation","Triangulation",2],["corresponding","Corresponding squares",2],["seventh","The seventh rank",2],["rookpawn","The rook pawn exception",2],["queenvspawn","Queen against a pawn",2],["rookvspawn","Rook against a pawn",2],["philidor","Philidor: the third rank",3],["lucena","Lucena: building the bridge",3],["rookpawngeneral","Rook and pawn, in general",3],["bishopknight","Bishop and knight",1]];
// Monday first. 'focus' becomes whatever your games say needs the most work.
const WEEK = ['openings', 'tactics', 'endgames', 'openings', 'focus', 'play', 'review'];
const THEME = {
  openings: 'Opening day', tactics: 'Tactics day', endgames: 'Endgame day', play: 'Play day', review: 'Review day', slow: 'Slow chess day',
};
const FOCUS_THEME = { time: 'slow', tilt: 'slow', tactics: 'tactics', endgames: 'endgames', openings: 'openings' };
const weekdayIdx = d => (d.getDay() + 6) % 7;
const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / DAY_MS + 1) / 7); };

function weekThemes(weak) {
  const f = weak[0] ? FOCUS_THEME[weak[0].key] : 'tactics';
  return WEEK.map(t => t === 'focus' ? f : t);
}

const THEMES = { fork: 'fork', hangingPiece: 'hanging piece', mate: 'checkmate', mateIn1: 'mate in 1', mateIn2: 'mate in 2', mateIn3: 'mate in 3', pin: 'pin', skewer: 'skewer', discoveredAttack: 'discovered attack', backRankMate: 'back-rank mate', trappedPiece: 'trapped piece', deflection: 'deflection', attraction: 'attraction', sacrifice: 'sacrifice', defensiveMove: 'defensive move', quietMove: 'quiet move', advancedPawn: 'advanced pawn', promotion: 'promotion', zugzwang: 'zugzwang', intermezzo: 'in-between move', clearance: 'clearance', interference: 'interference', xRayAttack: 'x-ray', capturingDefender: 'capture-the-defender', exposedKing: 'exposed king', kingsideAttack: 'kingside attack', queensideAttack: 'queenside attack', rookEndgame: 'rook endgame', pawnEndgame: 'pawn endgame', bishopEndgame: 'bishop endgame', knightEndgame: 'knight endgame', queenEndgame: 'queen endgame', endgame: 'endgame', opening: 'opening', middlegame: 'middlegame', doubleCheck: 'double check', enPassant: 'en passant', castling: 'castling', underPromotion: 'underpromotion', smotheredMate: 'smothered mate', anastasiaMate: 'Anastasia mate', arabianMate: 'Arabian mate', bodenMate: 'Boden mate', hookMate: 'hook mate', dovetailMate: 'dovetail mate', doubleBishopMate: 'double-bishop mate', killBoxMate: 'kill-box mate', vukovicMate: 'Vuković mate', attackingF2F7: 'f2/f7 attack' };
const themeName = t => THEMES[t] || t.replace(/([A-Z])/g, ' $1').toLowerCase();
// Too broad to practise on their own.
const BROAD_THEMES = new Set(['short', 'long', 'veryLong', 'oneMove', 'crushing', 'advantage', 'equality', 'master', 'masterVsMaster', 'superGM', 'mix', 'middlegame', 'opening', 'endgame', 'mate', 'healthyMix', 'playerGames']);
// Where each task sends you, per site.
const SITE = {
  chesscom: { name: 'chess.com', puzzles: 'https://www.chess.com/puzzles/rated', rush: 'https://www.chess.com/puzzles/rush', play: 'https://www.chess.com/play/online', archive: () => 'https://www.chess.com/games/archive' },
  lichess: { name: 'lichess', puzzles: 'https://lichess.org/training', rush: 'https://lichess.org/storm', play: 'https://lichess.org/', archive: u => `https://lichess.org/@/${encodeURIComponent(u || '')}/all` },
};
// ctx: { date, profile, weak, gaps:{w,b}, ends:{w,b}, lines:{w,b}, due:{w,b}, eg:{wins}, settings:{mins, cls, rush}, recentLosses }
function buildPlan(ctx) {
  const { date, profile: p, weak, settings: st } = ctx; const L = st.site === 'lichess';
  const site = SITE[L ? 'lichess' : 'chesscom'];
  const mins = st.mins || 40;
  const cls = st.cls && st.cls !== 'auto' ? st.cls : (p ? p.main : 'rapid');
  const tier = tierFor(p && p.elo);
  let theme = weekThemes(weak)[weekdayIdx(date)];
  const tasks = []; let used = 0;
  const add = t => { tasks.push(t); used += t.mins; };
  const left = () => mins - used;
  const top = weak[0];
  const why = key => (weak.find(w => w.key === key) || {}).text;
  const slow = theme === 'slow' || (top && (top.key === 'time' || top.key === 'tilt') && theme === 'play');
  const playKey = slow && cls !== 'daily' && cls !== 'bullet' ? 'slow' : cls;
  const playMins = GAME_MIN[playKey] || 12;
  // Games come first: 3 a day when the time allows them and their reviews, 2 on a normal budget, never fewer than 1.
  // Play day adds one; review day keeps a single game so the habit does not lapse.
  const nGames = theme === 'review' ? 1 : Math.max(1, Math.min(theme === 'play' ? 4 : 3, Math.floor(mins * (theme === 'play' ? 0.9 : 0.75) / (GAME_MIN[playKey] || 12))));
  const reserve = nGames * playMins;
  const room = () => left() - reserve;

  if (!ctx.gamesCount) add({ id: 'import', kind: 'setup', title: `Bring in your ${site.name} games`, mins: 3, why: 'The plan is generic until it has your games. Everything after this is tuned to how you actually lose.', action: { type: 'tab', tab: 'games' } });

  // 1. Warm-up: every day.
  const nPuzzles = theme === 'tactics' && mins >= 60 ? 20 : tier.puzzles;
  const focus = L && ctx.focus && ctx.focus[0];
  add({ id: 'puzzles', kind: 'tactics', title: `Solve ${focus ? Math.min(10, nPuzzles) : nPuzzles} rated puzzles`, mins: focus ? Math.min(10, nPuzzles) : nPuzzles, target: focus ? Math.min(10, nPuzzles) : nPuzzles, why: why('tactics') || 'A daily warm-up keeps pattern recognition sharp. Go for accuracy, not speed.', action: { type: 'url', url: site.puzzles } });
  // Yesterday's review picks a theme: the tactic that cost a game, or the puzzles you keep missing.
  const nTheme = room() >= 15 ? 20 : 10;
  if (focus) add({ id: 'theme', kind: 'tactics', title: `Practice ${nTheme} ${themeName(focus.theme)} puzzles`, mins: nTheme === 20 ? 15 : 8, target: nTheme, theme: focus.theme, why: focus.why, action: { type: 'url', url: `https://lichess.org/training/${focus.theme}` } });

  // 2. Openings: due drills, or starting a repertoire.
  for (const side of ['w', 'b']) {
    if (!ctx.lines[side] && ctx.gamesCount >= 10 && (theme === 'openings' || side === 'w') && room() >= 10) {
      add({ id: 'seed-' + side, kind: 'openings', title: `Choose your first ${side === 'w' ? 'White' : 'Black'} moves`, mins: 10, why: 'In Build, look at what you already play, what the engine likes and what players at your level meet, then save the line you want as your standard.', action: { type: 'seed', side } });
    }
  }
  const dueAll = ctx.due.w + ctx.due.b;
  if (dueAll) {
    const k = Math.min(dueAll, mins <= 20 ? 4 : mins <= 40 ? 6 : mins <= 60 ? 10 : 15);
    add({ id: 'drill', kind: 'openings', title: `Drill ${k} opening line${k > 1 ? 's' : ''}`, mins: Math.ceil(k * 1.2), target: k, why: `${dueAll} line${dueAll > 1 ? 's are' : ' is'} due. Lines you recall every few days hold up under the clock.`, action: { type: 'tab', tab: 'drill', side: ctx.due.w >= ctx.due.b ? 'w' : 'b' } });
  }

  // Threat check: a short blunder-check habit from your own positions, every day.
  if (ctx.threats >= 10 && room() >= 5) add({ id: 'threat', kind: 'tactics', title: 'Threat check: 10 positions', mins: 5, target: 10, why: 'Most hung pieces come from not asking what the last move threatens. Ten of your own positions, one question each.', action: { type: 'threats', n: 10 } });

  // Your own mistakes, as puzzles: a short set most days, a bigger one on tactics and review days.
  if (ctx.mp && theme !== 'play' && room() >= 5) {
    const k = Math.min(ctx.mp, theme === 'tactics' || theme === 'review' ? 10 : mins <= 20 ? 3 : 5);
    add({ id: 'mp', kind: 'tactics', title: `Fix ${k} of your own mistakes`, mins: Math.ceil(k * 1.5), target: k, why: 'Positions from your games where you went wrong. Find the move you missed; each one comes back until it sticks.', action: { type: 'mistakes' } });
  }

  // 3. The day's theme.
  const gapList = ['w', 'b'].filter(s => ctx.lines[s]).flatMap(s => (ctx.gaps[s] ? ctx.gaps[s].list : []).filter(g => g.type !== 'short' && g.type !== 'dev').map(g => Object.assign({ side: s }, g)));
  const preferSide = weak.find(w => w.key === 'openings')?.side;
  gapList.sort((a, b) => (b.games.length + (b.side === preferSide ? 2 : 0)) - (a.games.length + (a.side === preferSide ? 2 : 0)));
  const gapTask = (g, i) => ({ id: 'gap-' + i, kind: 'openings', title: g.type === 'opp' ? `Prepare your answer to ${lineText(g.path.concat([...g.played.keys()][0]))}` : `Choose your move after ${lineText(g.path)}`, mins: 8, gapKey: g.key, gapSide: g.side,
    why: `You met this in ${g.games.length} game${g.games.length > 1 ? 's' : ''} as ${g.side === 'w' ? 'White' : 'Black'} and scored ${pc(g.scored ? g.points / g.scored : null)}. Pick one sound reply, add it, then drill it.`,
    action: { type: 'gap', side: g.side, path: g.type === 'opp' ? g.path.concat([...g.played.keys()][0]) : g.path } });

  if (theme === 'openings') {
    const n = room() >= 16 ? 2 : 1;
    gapList.slice(0, n).forEach((g, i) => add(gapTask(g, i)));
    if (!gapList.length && ctx.xgaps && ctx.xgaps.length) ctx.xgaps.slice(0, n).forEach((g, i) => add({ id: 'xgap-' + i, kind: 'openings', title: `Prepare your answer to ${lineText(g.path.concat(g.san))}`, mins: 8,
      why: `Players at your level play ${g.san} here ${Math.round(g.share * 100)}% of the time. You will reach this in about ${Math.max(1, Math.round(g.reach * 100))} of every 100 games as ${g.side === 'w' ? 'White' : 'Black'}.`, action: { type: 'gap', side: g.side, path: g.path.concat(g.san) } }));
    if (!gapList.length && !(ctx.xgaps && ctx.xgaps.length) && room() >= 10) add({ id: 'deepen', kind: 'openings', title: `Extend your main line to move ${tier.depth / 2 + 2}`, mins: 10, why: `At your level, aim to know your main lines to about move ${tier.depth / 2 + 2}. Add the most common replies one move deeper.`, action: { type: 'tab', tab: 'build' } });
    if (room() >= 10) add({ id: 'model', kind: 'openings', title: `Model line: ${RUNS[isoWeek(date) % RUNS.length]}`, mins: 10, why: 'Learn what to do after the opening: the plan behind the structure your lines lead to.', action: { type: 'run', name: RUNS[isoWeek(date) % RUNS.length] } });
  } else if (theme === 'tactics') {
    const best = L ? st.storm : st.rush;
    add({ id: 'rush', kind: 'tactics', title: L ? 'Puzzle Storm, 3 minutes' : 'Puzzle Rush, 5 minutes', mins: L ? 4 : 6, why: best ? `Your best is ${best}. Beat it, and ${L ? 'keep your combo going rather than guessing' : 'stop at three misses rather than guessing'}.` : 'Set a baseline today, then try to beat it every tactics day.', action: { type: 'url', url: site.rush } });
    if (room() >= 15) add({ id: 'calc', kind: 'tactics', title: 'Three hard puzzles, slowly', mins: 15, why: 'Calculate the whole line before you touch a piece: checks, captures and threats for both sides. This builds the habit fast puzzles skip.', target: 3, action: { type: 'url', url: site.puzzles } });
  } else if (theme === 'endgames') {
    const wins = (ctx.eg && ctx.eg.wins) || {};
    const next = EG_CHAPTERS.find(([id, , need]) => (wins[id] || 0) < need) || EG_CHAPTERS[EG_CHAPTERS.length - 1];
    egDue(ctx.eg, date).slice(0, 2).forEach((d, i) => add({ id: 'egrev-' + i, kind: 'endgames', title: `Review: ${d.title}`, mins: 8, egId: d.id, why: d.iv ? `You cleared this ${Math.round(d.iv + d.over)} days ago. Solve it twice more so it stays automatic.` : 'You cleared this chapter. Solve it twice more so the technique stays automatic.', action: { type: 'endgame', title: d.title } }));
    add({ id: 'eg', kind: 'endgames', egId: next[0], title: `Endgame: ${next[1]}`, mins: 15, why: (why('endgames') ? why('endgames') + ' ' : '') + `Next on your ladder. Solve it ${next[2]} times to open the next chapter.`, action: { type: 'endgame', title: next[1] } });
    const learned = Object.keys((ctx.eg && ctx.eg.structs) || {}).length;
    if (room() >= 10) add(learned < 13
      ? { id: 'struct', kind: 'endgames', title: 'Pawn structures: learn the next two', mins: 10, why: `A short lesson on each structure's plans, then a quiz. ${learned ? learned + ' of 13 learned so far.' : 'Thirteen structures in all, from the Carlsbad to the Hedgehog.'}`, action: { type: 'run', name: 'Pawn structures' } }
      : { id: 'struct', kind: 'endgames', title: 'Structures quiz', mins: 8, why: 'Eight mixed questions on the structures you have learned: plans, breaks and the pieces that matter.', action: { type: 'run', name: 'Structures quiz' } });
  } else if (theme === 'slow') {
    const lostOnTime = ctx.recentLosses.find(g => g.end === 'time');
    if (lostOnTime) add({ id: 'clock', kind: 'review', title: `Replay your time loss to ${lostOnTime.opp}`, mins: 10, url: lostOnTime.url,
      why: 'Find the two or three moves where you spent the most time. Were they really the critical moments? That is where the clock went.', action: { type: 'review', id: lostOnTime.id, url: lostOnTime.url } });
  } else if (theme === 'review') {
    const losses = ctx.recentLosses.slice(0, Math.max(1, Math.min(3, Math.floor(room() / 10))));
    losses.forEach((g, i) => add({ id: 'review-' + i, kind: 'review', title: `Review your loss to ${g.opp}`, mins: 10, url: g.url,
      why: `Find the move where the game turned. Was it the opening, a tactic, or the clock? Write one sentence about it. (${g.date}, ${g.plies ? Math.ceil(g.plies / 2) + ' moves' : ''}${g.end === 'time' ? ', lost on time' : ''})`,
      action: { type: 'review', id: g.id, url: g.url } }));
    if (!losses.length) add({ id: 'review-x', kind: 'review', title: 'Review your last game', mins: 10, why: 'Find the move where the game turned, and write one sentence about it.', action: { type: 'url', url: site.archive(st.lichessUser) } });
    add({ id: 'import-week', kind: 'setup', title: 'Import this week’s games', mins: 3, why: 'Next week’s plan and gap report should see this week’s games.', action: { type: 'tab', tab: 'games' } });
    if (left() >= 10) add({ id: 'model', kind: 'openings', title: `Model line: ${RUNS[isoWeek(date) % RUNS.length]}`, mins: 10, why: 'An easier finish to the week: learn the plan behind a structure.', action: { type: 'run', name: RUNS[isoWeek(date) % RUNS.length] } });
  }

  // A learned endgame that is due comes back on other days too, when there is room.
  if (theme !== 'endgames' && theme !== 'play') { const d = egDue(ctx.eg, date)[0]; if (d && room() >= 8) add({ id: 'egrev-0', kind: 'endgames', title: `Review: ${d.title}`, mins: 8, egId: d.id, why: d.iv ? `You cleared this ${Math.round(d.iv + d.over)} days ago. A short review keeps the technique automatic.` : 'You cleared this chapter. A short review keeps the technique automatic.', action: { type: 'endgame', title: d.title } }); }
  // 4. Play, every day.
  {
    const n = nGames;
    const intent = slow ? (top && top.key === 'tilt' ? 'Stop for the day after two losses in a row. ' : '') + 'Keep at least a third of your clock at move 20 and spend it on the critical moments.'
      : theme === 'openings' && tasks.some(t => t.kind === 'openings') ? 'Steer for the lines you worked on today, and check afterwards where you left your prep.'
      : theme === 'tactics' ? 'Before every move: checks, captures, threats, for both sides.'
      : theme === 'endgames' ? 'If it goes long, trade into an endgame you know instead of avoiding one.'
      : 'Afterwards, import the games so the gap report sees them.';
    const label = playKey === 'slow' ? 'rapid' : playKey;
    add({ id: 'play', kind: 'play', title: `Play ${n} ${label} game${n > 1 ? 's' : ''} (${TC[playKey] || ''})`, mins: n * playMins, target: n, cls: label, why: intent + (n > 1 ? ' After each game, spend 3 minutes finding the move where it turned before starting the next.' : ' Afterwards, spend 3 minutes finding the move where it turned.'), action: { type: 'url', url: site.play } });
    // Once a week, on play day, a blitz game: quick decisions and practical play under the clock.
    if (theme === 'play' && playKey !== 'blitz' && playKey !== 'bullet') add({ id: 'blitz', kind: 'play', title: 'Play 1 blitz game (5|0)', mins: 12, target: 1, cls: 'blitz', why: 'Your weekly blitz game. Trust your first instinct when it is sound, and notice where the clock pushed you into a quick mistake.', action: { type: 'url', url: site.play } });
  }

  const focusNote = {
    openings: 'Today is about your openings: fix the line you keep running into, then drill it.',
    tactics: 'Today is about tactics: volume first, then a few puzzles calculated slowly.',
    endgames: 'Today is about endgames: technique you can trust when the game goes long.',
    slow: 'Today is about the clock and your decisions: one slower game, played well.',
    play: 'Today is a play day: more games, with a quick check of every loss.',
    review: 'Today is a review day: learn from this week’s losses and reset for next week.',
  }[theme];
  const reason = top && FOCUS_THEME[top.key] === theme ? ' ' + top.text : '';
  const fromReview = focus ? ` Yesterday’s review picked ${themeName(focus.theme)} as today’s focus: see the 20-puzzle task.` : '';
  return { date: ymd(date), theme, title: THEME[theme], note: focusNote + reason + fromReview, tier: tier.name, tierNote: tier.note, cls, mins, total: used, tasks };
}
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
