// ---------- Repertoire app ----------
const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(3)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
/*PIECE*/
const pct = (pts, n) => n ? Math.round(100 * pts / n) + '%' : 'n/a';
const sideName = s => s === 'w' ? 'White' : 'Black';
const lineText = path => path.map((s, i) => (i % 2 === 0 ? (i / 2 + 1) + '.' : '') + s).join(' ') || 'the start';

const S = {
  side: 'w', tab: 'today',
  settings: { mins: 40, cls: 'auto', rush: null }, plans: {}, stats: null,
  rep: { w: new Map(), b: new Map() },
  games: [], username: '', cards: {},
  path: [], game: new Chess(), sel: null, hint: null,
  drill: null, store: 'loading', batch: false, review: null, xgaps: { w: null, b: null }, checks: {},
};
let db = null;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600); }

// ---------- Saving ----------
const LS = { get(k) { try { return JSON.parse(localStorage.getItem('reps:' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('reps:' + k, JSON.stringify(v)); } catch {} } };
const DOCS = { 'rep-w': 'rep/white', 'rep-b': 'rep/black', cards: 'drill/stats', settings: 'settings/main' };
const timers = {};
function save(what) {
  clearTimeout(timers[what]);
  timers[what] = setTimeout(async () => {
    const data = what === 'rep-w' ? { edges: repToEdges(S.rep.w), updated: Date.now() }
      : what === 'rep-b' ? { edges: repToEdges(S.rep.b), updated: Date.now() }
      : what === 'cards' ? { cards: S.cards, updated: Date.now() }
      : { username: S.username, mins: S.settings.mins, cls: S.settings.cls, rush: S.settings.rush, engine: S.settings.engine !== false, lichessToken: S.settings.lichessToken || '' };
    if (db) { try { await db.doc(DOCS[what]).set(data); } catch (e) { toast(e && e.code === 'quota_exceeded' ? 'Storage is full. Remove some imported games.' : 'Could not save that change. Check your connection.'); } }
    else LS.set(DOCS[what], data);
  }, 600);
}
async function saveGames(batch) {
  const id = 'b' + Date.now().toString(36);
  for (let i = 0, j = 0; i < batch.length; i += 350, j++) {
    const data = { list: batch.slice(i, i + 350), added: Date.now() };
    if (db) await db.doc('games/' + id + '-' + j).set(data);
    else { const all = LS.get('games') || {}; all[id + '-' + j] = data; LS.set('games', all); }
  }
}
async function clearGames() {
  try {
    if (db) { const snap = await db.collection('games').limit(1000).get(); for (const d of snap.docs) await db.doc('games/' + d.id).delete(); }
    else LS.set('games', {});
  } catch { return toast('Could not remove the games. Try again.'); }
  S.games = []; refresh(); render(); toast('Imported games removed');
}
async function load() {
  S.xgaps = { w: LS.get('xgaps-w'), b: LS.get('xgaps-b') };
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { db = null; }
  const get = async p => { if (db) { const s = await db.doc(p).get(); return s.exists ? s.data() : null; } return LS.get(p); };
  try {
    const [w, b, cards, set] = await Promise.all([get('rep/white'), get('rep/black'), get('drill/stats'), get('settings/main')]);
    S.rep.w = repFromEdges(w && w.edges); S.rep.b = repFromEdges(b && b.edges);
    S.cards = cards && cards.cards ? JSON.parse(JSON.stringify(cards.cards)) : {};
    S.username = (set && set.username) || '';
    if (set) S.settings = { mins: set.mins || 40, cls: set.cls || 'auto', rush: set.rush || null, engine: set.engine !== false, lichessToken: set.lichessToken || '' };
    S.stats = await get('stats/main');
    const planDocs = db ? (await db.collection('plans').limit(120).get()).docs.map(d => [d.id, d.data()]) : Object.entries(LS.get('plans') || {});
    for (const [id, d] of planDocs) S.plans[id] = JSON.parse(JSON.stringify(d));
    const docs = db ? (await db.collection('games').limit(1000).get()).docs.map(d => d.data()) : Object.values(LS.get('games') || {});
    const seen = new Set(); S.games = [];
    for (const d of docs) for (const g of d.list || []) if (!seen.has(g.id)) { seen.add(g.id); S.games.push(g); }
    S.store = db ? 'cloud' : 'local';
  } catch { S.store = 'error'; }
  refresh(); ensurePlan(); render();
  autoSync();
}

// ---------- Derived state ----------
let D = { idx: new Map(), gaps: { list: [], games: 0, avgBook: 0, early: 0 }, ends: [], lines: [], due: [] };
const lineId = l => hashStr(S.side + ':' + l.join(' '));
const depthTarget = () => tierFor(D.profile && D.profile.elo).depth;
function refresh() {
  const rep = S.rep[S.side];
  D.idx = gameIndex(S.games, S.side);
  D.gaps = analyzeGaps(rep, S.games, S.side, depthTarget());
  D.ends = openEnds(rep, S.side);
  D.lines = allLines(rep);
  const now = Date.now();
  D.due = D.lines.filter(l => { const c = S.cards[lineId(l)]; return !c || c.due <= now; });
  if (D.pKey !== S.games.length) {
    D.pKey = S.games.length; D.profile = computeProfile(S.games);
    D.recentLosses = S.games.filter(g => g.score === 0).sort((a, b) => gameTime(b) - gameTime(a)).slice(0, 5);
  }
  D.gapsBoth = { w: analyzeGaps(S.rep.w, S.games, 'w', depthTarget()), b: analyzeGaps(S.rep.b, S.games, 'b', depthTarget()) };
  D.linesBoth = { w: S.side === 'w' ? D.lines.length : allLines(S.rep.w).length, b: S.side === 'b' ? D.lines.length : allLines(S.rep.b).length };
  D.dueBoth = { w: 0, b: 0 };
  for (const sd of ['w', 'b']) D.dueBoth[sd] = (sd === S.side ? D.lines : allLines(S.rep[sd])).filter(l => { const c = S.cards[hashStr(sd + ':' + l.join(' '))]; return !c || c.due <= now; }).length;
  D.weak = weaknesses(D.profile, D.gapsBoth, D.linesBoth);
  const gc = D.gaps.list.filter(g => g.type !== 'short').length + D.ends.length;
  $('#count-gaps').textContent = gc ? String(gc) : '';
  $('#count-drill').textContent = D.lines.length && D.due.length ? String(D.due.length) : '';
}

// ---------- Board ----------
function pieceEl(p) {
  const d = document.createElement('div');
  d.className = 'piece ' + p.color;
  d.innerHTML = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g>' + PIECE[p.type] + '</g></svg>';
  return d;
}
const boardGame = () => (S.tab === 'drill' && S.drill && !S.drill.done ? S.drill.game : S.tab === 'games' && S.review ? reviewGame() : S.game);
function canMove() {
  if (S.tab === 'drill') { const d = S.drill; return d && !d.done && !d.finished && !d.busy && d.game.turn() === S.side; }
  return S.tab === 'build' || S.tab === 'gaps';
}
function renderBoard() {
  const g = boardGame(); const b = $('#rw-board'); b.replaceChildren();
  const flip = (S.tab === 'games' && S.review ? S.review.g.me : S.side) === 'b'; const hist = g.history({ verbose: true }); const last = hist[hist.length - 1];
  const targets = S.sel ? g.moves({ square: S.sel, verbose: true }) : [];
  const live = canMove();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const file = flip ? 7 - f : f, rank = flip ? r + 1 : 8 - r;
    const sq = 'abcdefgh'[file] + rank; const p = g.get(sq);
    const cls = ['sq', (file + rank) % 2 ? 'light' : 'dark'];
    if (last && last.from === sq) cls.push('from');
    if (last && last.to === sq) cls.push('to');
    if (S.sel === sq) cls.push('sel');
    if (S.hint && (S.hint.from === sq || S.hint.to === sq)) cls.push('hint');
    const t = targets.find(m => m.to === sq); if (t) cls.push('target', 'pickable'); if (t && p) cls.push('occupied');
    if (live && p && p.color === g.turn()) cls.push('pickable');
    const btn = h('button', { class: cls.join(' '), 'aria-label': sq + (p ? ' ' + (p.color === 'w' ? 'white ' : 'black ') + ({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[p.type] : ''), onclick: () => clickSq(sq) });
    if (p) btn.append(pieceEl(p));
    if (r === 7) btn.append(h('span', { class: 'coord' }, 'abcdefgh'[file]));
    if (f === 0) btn.append(h('span', { class: 'coord rank' }, String(rank)));
    b.append(btn);
  }
}
function clickSq(sq) {
  if (!canMove()) return;
  const g = boardGame();
  if (S.sel) {
    const opts = g.moves({ square: S.sel, verbose: true }).filter(m => m.to === sq);
    if (opts.length) { const mv = opts.find(m => !m.promotion || m.promotion === 'q') || opts[0]; S.sel = null; userMove(mv.san); return; }
  }
  const p = g.get(sq);
  S.sel = p && p.color === g.turn() && S.sel !== sq ? sq : null;
  renderBoard();
}
function userMove(san) {
  if (S.tab === 'drill') return drillMove(san);
  if (S.tab === 'gaps') S.tab = 'build';
  const k = posKey(S.game.fen()); const rep = S.rep[S.side];
  if (!rep.has(k)) rep.set(k, []);
  const added = !rep.get(k).includes(san);
  if (added) { rep.get(k).push(san); save('rep-' + S.side); }
  S.game.move(san); S.path.push(san); S.hint = null;
  refresh(); render();
  if (added) toast(san + ' added to your ' + sideName(S.side) + ' repertoire');
}
function goTo(path) { S.game = new Chess(); S.path = []; for (const s of path) { if (!S.game.move(s)) break; S.path.push(s); } S.sel = null; S.hint = null; }
const nav = path => () => { goTo(path); render(); };

// ---------- Build ----------
function renderBuild(panel, bar) {
  const rep = S.rep[S.side]; const k = posKey(S.game.fen()); const list = rep.get(k) || [];
  const mine = S.game.turn() === S.side;
  bar.append(
    h('button', { class: 'btn quiet tiny', onclick: nav([]), 'aria-label': 'Back to the start' }, 'Start'),
    h('button', { class: 'btn quiet tiny', onclick: nav(S.path.slice(0, -1)), disabled: !S.path.length }, 'Back'),
    h('button', { class: 'btn quiet tiny', onclick: () => list.length && nav(S.path.concat(list[0]))(), disabled: !list.length }, 'Forward'),
    h('span', { class: 'grow' }),
    h('span', { class: 'store' }, { cloud: 'Saved to your account', local: 'Saved in this browser', loading: 'Loading…', error: 'Could not load saved data' }[S.store]));

  const line = h('div', { class: 'moveline' });
  if (!S.path.length) line.append(h('span', { class: 'empty' }, 'Starting position. Play a move on the board to add it.'));
  S.path.forEach((s, i) => { if (i % 2 === 0) line.append(h('span', { class: 'no' }, (i / 2 + 1) + '.')); line.append(h('button', { class: i === S.path.length - 1 ? 'cur' : '', onclick: nav(S.path.slice(0, i + 1)) }, s)); });
  panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Current line'), line));

  const idx = D.idx.get(k);
  const ul = h('ul', { class: 'list' });
  for (const s of list) {
    const st = idx && idx.get(s);
    ul.append(h('li', { class: 'item' },
      h('button', { class: 'go', onclick: nav(S.path.concat(s)) }, h('span', { class: 'san' }, s),
        h('span', { class: 'meta' }, st ? `${st.n} of your games · you scored ${pct(st.pts, st.scored)}` : 'Not seen in your games yet')),
      h('button', { class: 'btn quiet tiny danger', 'aria-label': 'Remove ' + s, onclick: () => { rep.set(k, list.filter(x => x !== s)); save('rep-' + S.side); refresh(); render(); toast(s + ' removed, with everything after it'); } }, 'Remove')));
  }
  if (!list.length) ul.append(h('li', { class: 'empty' }, mine ? 'No move prepared here. Play one on the board.' : 'No replies prepared. Your line ends here.'));
  if (!rep.size && S.games.filter(g => g.me === S.side).length >= 5) panel.append(h('section', { class: 'sec' }, h('h3', {}, 'Start from your own games'),
    h('p', { class: 'ask' }, `Your ${sideName(S.side)} repertoire is empty. Build a first draft from what you already play: your most common move in each position, and every reply you have met at least twice, to about move ${depthTarget() / 2}.`),
    h('button', { class: 'btn', onclick: () => seedRep(S.side) }, 'Build it from my games')));
  const afterMoves = () => { if (S.settings.engine !== false || !engineOk()) panel.append(engineSection()); panel.append(explorerSection()); };
  panel.append(h('section', { class: 'sec' },
    h('h3', {}, mine ? 'Your move' : 'Their replies'),
    h('p', { class: 'ask' }, mine ? 'Keep one main move per position. A second one is a sideline, and drills will ask for both.' : 'Add every reply you meet at your level. The list below shows what your opponents actually play here.'),
    ul));
  afterMoves();

  if (idx && idx.size) {
    const rows = [...idx.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
    const top = rows[0][1].n;
    const u2 = h('ul', { class: 'list' });
    for (const [s, e] of rows) {
      const covered = list.includes(s);
      u2.append(h('li', { class: 'item' },
        h('button', { class: 'go', onclick: () => covered ? nav(S.path.concat(s))() : userMove(s), title: covered ? 'Open' : 'Add to repertoire' },
          h('span', { class: 'san' }, s), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(100 * e.n / top)}%` })),
          h('span', { class: 'meta' }, `${e.n}× · you scored ${pct(e.pts, e.scored)}`)),
        h('span', { class: 'tag ' + (covered ? 'ok' : mine ? 'warn' : 'gap') }, covered ? 'in your prep' : mine ? 'off your prep' : 'gap, tap to add')));
    }
    panel.append(h('section', { class: 'sec' }, h('h2', {}, 'In your games from here'), u2));
  }

  const ta = h('textarea', { id: 'rw-bulk', placeholder: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5\nOne line per row, or paste a PGN.' });
  const clearRow = h('div', { class: 'row' });
  clearRow.append(h('button', { class: 'btn quiet tiny danger', onclick: () => {
    clearRow.replaceChildren(h('span', { class: 'note' }, `Delete every move in your ${sideName(S.side)} repertoire?`),
      h('button', { class: 'btn tiny', onclick: () => { S.rep[S.side] = new Map(); save('rep-' + S.side); goTo([]); refresh(); render(); toast(sideName(S.side) + ' repertoire cleared'); } }, 'Delete all'),
      h('button', { class: 'btn quiet tiny', onclick: render }, 'Keep it'));
  } }, `Clear ${sideName(S.side)} repertoire…`));
  panel.append(h('details', { class: 'sec' }, h('summary', {}, 'Paste lines'),
    h('p', { class: 'ask' }, `Each row is played from the start and added to your ${sideName(S.side)} repertoire. Variations in a PGN are skipped, so give each one its own row.`), ta,
    h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => bulkAdd(ta.value) }, 'Add lines')),
    h('div', { style: 'margin-top:14px' }, clearRow)));
}
function bulkAdd(text) {
  const rep = S.rep[S.side]; let added = 0, lines = 0;
  const rows = /\[\w+ "/.test(text) ? splitPgn(text) : text.split(/\n+/);
  for (const row of rows) {
    const { moves } = parseGame(row, 60); if (!moves.length) continue; lines++;
    const c = new Chess();
    for (const s of moves) { const k = posKey(c.fen()); if (!rep.has(k)) rep.set(k, []); if (!rep.get(k).includes(s)) { rep.get(k).push(s); added++; } c.move(s); }
  }
  if (!lines) return toast('No moves found. Write them like 1. e4 e5 2. Nf3');
  save('rep-' + S.side); refresh(); render();
  toast(`Read ${lines} line${lines === 1 ? '' : 's'}, added ${added} new move${added === 1 ? '' : 's'}`);
}

// ---------- Gaps ----------
function renderGaps(panel, bar) {
  const G = D.gaps; const sn = sideName(S.side);
  panel.append(h('section', { class: 'sec' }, h('h3', {}, `Gaps in your ${sn} repertoire`),
    h('p', { class: 'ask' }, S.games.length ? `Checked against your ${G.games} games as ${sn}. The gaps you meet most often come first.` : 'Import your chess.com games on the Games tab to rank gaps by how often you actually face them.')));
  if (G.games) panel.append(h('div', { class: 'stats' },
    h('div', { class: 'stat' }, h('b', {}, String(G.games)), h('span', {}, 'games as ' + sn)),
    h('div', { class: 'stat' }, h('b', {}, (G.avgBook / 2).toFixed(1)), h('span', {}, 'moves in prep, on average')),
    h('div', { class: 'stat' }, h('b', {}, pct(G.early, G.games)), h('span', {}, 'hit a gap before move 8'))));
  // Explorer scan
  const xs = S.xgaps[S.side];
  const xsec = h('section', { class: 'sec' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0' }, 'Common replies you have not covered'),
    h('button', { class: 'btn tiny', disabled: !!S.scanning, onclick: async () => {
      S.scanning = { side: S.side, n: 0 }; render(); const side = S.side;
      try { const r = await scanExplorerGaps(side, n => { S.scanning.n = n; const p = $('#rw-scan'); if (p) p.textContent = `Checked ${n} positions on lichess…`; }); S.xgaps[side] = r; LS.set('xgaps-' + side, r); toast(`Found ${r.length} gap${r.length === 1 ? '' : 's'} at your level`); }
      catch (e) { toast(explorerError(e)); }
      S.scanning = null; refresh(); render(); } }, xs ? 'Scan again' : 'Scan with lichess')));
  xsec.append(h('p', { class: 'ask', id: 'rw-scan' }, S.scanning ? `Checked ${S.scanning.n} positions on lichess…` : `Looks at every position in your ${sn} prep where it is their move, and lists the replies players at your level (${explorerParams().label}) actually choose that you have no answer for.`));
  if (xs && xs.length) {
    const xl = h('div', { class: 'gaps' });
    for (const g of xs.slice(0, 25)) xl.append(h('div', { class: 'gapi t-opp' },
      h('div', {}, h('div', { class: 'after' }, lineText(g.path.concat(g.san))), h('div', { class: 'played' }, `Played ${Math.round(g.share * 100)}% of the time here · ${g.n.toLocaleString()} games`), h('div', { class: 'sub' }, `${sn} scores ${pc(g.score)} after it`)),
      h('div', { class: 'act' }, h('div', { class: 'num' }, Math.max(1, Math.round(g.reach * 100)) + '%', h('small', {}, 'of your games')), h('button', { class: 'btn tiny', onclick: () => { goTo(g.path.concat(g.san)); S.tab = 'build'; render(); } }, 'Fix it'))));
    xsec.append(xl);
  } else if (xs) xsec.append(h('p', { class: 'empty' }, 'No common reply is missing. Your prep covers what players at your level play.'));
  panel.append(xsec);

  // Engine check
  const ck = S.checks[S.side];
  const csec = h('section', { class: 'sec' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0' }, 'Engine check of your moves'),
    engineOk() ? h('button', { class: 'btn tiny', disabled: !!S.batch, onclick: async () => {
      S.batch = true; render(); const side = S.side;
      const r = await checkRepertoire(side, (i, n) => { const p = $('#rw-check'); if (p) p.textContent = `Checking position ${i} of ${n}…`; });
      S.batch = false; if (r) { S.checks[side] = r; toast(r.length ? `${r.length} questionable move${r.length > 1 ? 's' : ''} found` : 'Every move in your prep holds up'); } render(); } }, ck ? 'Check again' : 'Check my moves') : null));
  csec.append(h('p', { class: 'ask', id: 'rw-check' }, engineOk() ? 'Stockfish looks at every move you chose and flags the ones that give away more than half a pawn.' : 'Needs the engine, which runs on the hosted version of Chess Reps.'));
  if (ck && ck.length) {
    const cl = h('div', { class: 'gaps' });
    for (const m of ck) cl.append(h('div', { class: 'gapi ' + (m.loss >= 150 ? 't-opp' : 't-dev') },
      h('div', {}, h('span', { class: 'tag ' + (m.loss >= 150 ? 'gap' : 'warn') }, m.loss >= 150 ? 'Mistake' : 'Dubious'), h('div', { class: 'after' }, lineText(m.path.concat(m.san))), h('div', { class: 'played' }, 'Stockfish prefers ', h('b', {}, m.best), ` · costs about ${(m.loss / 100).toFixed(1)} pawns`)),
      h('div', { class: 'act' }, h('button', { class: 'btn tiny', onclick: () => { goTo(m.path); S.tab = 'build'; render(); } }, 'Review'))));
    csec.append(cl);
  } else if (ck) csec.append(h('p', { class: 'empty' }, 'Every move in your prep holds up.'));
  panel.append(csec);
  panel.append(h('h2', { class: 'subhead' }, 'From your own games'));

  const box = h('div', { class: 'gaps' });
  const TYPE = { opp: ['Uncovered reply', 'gap'], nomove: ['No move prepared', 'gap'], dev: ['You left your prep', 'warn'], short: ['Prep ends early', 'dim'] };
  for (const g of G.list.slice(0, 40)) {
    const [label, tag] = TYPE[g.type];
    const played = [...g.played.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 5);
    const who = g.type === 'dev' || g.type === 'nomove' ? 'You played ' : 'They played ';
    box.append(h('div', { class: 'gapi t-' + g.type },
      h('div', {}, h('div', { class: 'row' }, h('span', { class: 'tag ' + tag }, label)),
        h('div', { class: 'after' }, 'After ' + lineText(g.path)),
        h('div', { class: 'played' }, who, played.map(([s, e], i) => [i ? ', ' : '', h('b', {}, s), ` ${e.n}×`]), g.type === 'dev' ? ['. Your prep says ', h('b', {}, g.expect.join(' or ')), '.'] : ''),
        h('div', { class: 'sub' }, `You scored ${pct(g.points, g.scored)} in these games`)),
      h('div', { class: 'act' }, h('div', { class: 'num' }, String(g.games.length), h('small', {}, g.games.length === 1 ? 'game' : 'games')),
        h('button', { class: 'btn tiny', onclick: () => { goTo(g.type === 'opp' || g.type === 'short' ? g.path.concat(played[0][0]) : g.path); S.tab = 'build'; render(); } }, g.type === 'dev' ? 'Review' : 'Fix it'))));
  }
  for (const e of D.ends.slice(0, 30)) {
    box.append(h('div', { class: 'gapi t-nomove' },
      h('div', {}, h('span', { class: 'tag gap' }, 'Unanswered'), h('div', { class: 'after' }, 'After ' + lineText(e.path)), h('div', { class: 'sub' }, 'You prepared their reply but no move for yourself.')),
      h('div', { class: 'act' }, h('button', { class: 'btn tiny', onclick: () => { goTo(e.path); S.tab = 'build'; render(); } }, 'Answer it'))));
  }
  if (!box.children.length) box.append(h('p', { class: 'empty' }, S.games.length ? 'No gaps. Every game stayed in your prep until it ran out.' : 'No open ends in your prep yet.'));
  panel.append(box);
  bar.append(h('span', { class: 'note' }, 'Fix it opens the position in Build. Play your answer on the board.'));
}

// ---------- Games ----------
const MONTHS = 3;
async function importText(text, user, quiet) {
  const { me, games } = importPgn(text, user);
  if (!games.length) return quiet ? null : toast(me ? `No games found for ${me}. Check the username.` : 'No games found in that text.');
  const have = new Set(S.games.map(g => g.id)); const fresh = games.filter(g => !have.has(g.id));
  if (!S.username && me) { S.username = me; save('settings'); }
  if (fresh.length) { try { await saveGames(fresh); } catch { return toast('Could not save the games. Try a smaller file.'); } }
  S.games.push(...fresh); refresh();
  const rec = S.plans[todayId()]; if (rec && rec.plan.tasks.some(t => t.id === 'import')) ensurePlan(true);
  render();
  if (quiet && !fresh.length) return;
  toast(`Imported ${fresh.length} new game${fresh.length === 1 ? '' : 's'}${games.length > fresh.length ? `, ${games.length - fresh.length} were already here` : ''}`);
}
function renderGames(panel, bar) {
  if (S.review) return renderReview(panel, bar);
  const name = h('input', { type: 'text', id: 'rw-user', value: S.username, placeholder: 'chess.com username', 'aria-label': 'chess.com username', autocomplete: 'off' });
  const links = h('div', { class: 'row' }); const status = h('p', { class: 'note' });
  const drawLinks = () => {
    links.replaceChildren(); const u = name.value.trim().toLowerCase(); if (!u) return;
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      links.append(h('a', { class: 'btn quiet tiny', href: `https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/pgn`, target: '_blank', rel: 'noopener' }, d.toLocaleString('en', { month: 'short', year: 'numeric' })));
    }
  };
  name.addEventListener('input', drawLinks);
  name.addEventListener('change', () => { S.username = name.value.trim(); save('settings'); });
  drawLinks();
  const ta = h('textarea', { id: 'rw-pgn', placeholder: '[Event "Live Chess"]\n[White "you"] …\n\n1. e4 e5 2. Nf3 …' });
  const file = h('input', { type: 'file', id: 'rw-file', accept: '.pgn,.txt', multiple: true });
  file.addEventListener('change', async () => { let t = ''; for (const f of file.files) t += '\n\n' + await f.text(); ta.value = t.trim(); });
  panel.append(h('section', { class: 'sec' },
    h('h3', {}, 'Bring in your chess.com games'),
    h('p', { class: 'ask' }, 'Enter your username and fetch. If chess.com can’t be reached from here, open a month below to download it as a .pgn file, then choose the files.'),
    h('div', { class: 'row' }, name, h('button', { class: 'btn', onclick: async () => { const u = name.value.trim(); if (!u) return toast('Enter your chess.com username first'); S.username = u; save('settings'); status.textContent = 'Asking chess.com for your games…'; let t = null; try { t = await syncChessCom(u, { months: MONTHS }); } catch (e) { status.textContent = e.message === 'nouser' ? `chess.com has no player called ${u}.` : 'This page cannot reach chess.com directly. Use the hosted Chess Reps, or download your months with the links below and choose the files.'; } if (t != null) { status.textContent = ''; await importText(t, u); } } }, `Fetch last ${MONTHS} months`)),
    status, links,
    h('div', { style: 'margin:16px 0 8px' }, file), ta,
    h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn', onclick: () => ta.value.trim() ? importText(ta.value, name.value.trim()) : toast('Choose a .pgn file or paste PGN first') }, 'Import'), h('span', { class: 'note' }, 'Only the first 20 moves of each game are kept.'))));

  const w = S.games.filter(g => g.me === 'w'), b = S.games.filter(g => g.me === 'b');
  const sc = arr => { const s = arr.filter(g => g.score != null); return pct(s.reduce((a, g) => a + g.score, 0), s.length); };
  const sec = h('section', { class: 'sec' }, h('h2', {}, 'Your games'));
  if (!S.games.length) sec.append(h('p', { class: 'empty' }, 'No games yet. Once they are in, Gaps ranks what you face most.'));
  else {
    sec.append(h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, String(w.length)), h('span', {}, 'as White · scored ' + sc(w))),
      h('div', { class: 'stat' }, h('b', {}, String(b.length)), h('span', {}, 'as Black · scored ' + sc(b))),
      h('div', { class: 'stat' }, h('b', {}, String(S.games.length)), h('span', {}, 'in total'))));
    const ul = h('ul', { class: 'list', style: 'margin-top:12px' });
    for (const g of S.games.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 12))
      ul.append(h('li', { class: 'item' }, h('span', { class: 'tag ' + (g.score === 1 ? 'ok' : g.score === 0 ? 'gap' : 'dim') }, g.score === 1 ? 'won' : g.score === 0 ? 'lost' : 'drew'),
        h('span', { class: 'meta', style: 'flex:1' }, `${sideName(g.me)} vs ${g.opp}${g.oppElo ? ' (' + g.oppElo + ')' : ''} · ${g.date} · ${g.moves.split(' ').slice(0, 6).join(' ')}…`),
        engineOk() ? h('button', { class: 'btn quiet tiny', onclick: () => startReview(g) }, 'Review') : null,
        g.url ? h('a', { href: g.url, target: '_blank', rel: 'noopener', class: 'note' }, 'open') : null));
    const rm = h('div', { class: 'row', style: 'margin-top:12px' });
    rm.append(h('button', { class: 'btn quiet tiny danger', onclick: () => rm.replaceChildren(h('span', { class: 'note' }, 'Remove every imported game?'), h('button', { class: 'btn tiny', onclick: clearGames }, 'Remove'), h('button', { class: 'btn quiet tiny', onclick: render }, 'Keep them')) }, 'Remove imported games…'));
    sec.append(ul, rm);
  }
  panel.append(sec);
  const restore = h('input', { type: 'file', id: 'rw-restore', accept: '.json', hidden: true });
  restore.addEventListener('change', () => restore.files[0] && importData(restore.files[0]));
  if (!db) panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Your data'),
    h('p', { class: 'ask' }, 'Everything is saved in this browser. Keep a backup file so you can move to another device or recover after clearing your browser.'),
    h('div', { class: 'row' }, h('button', { class: 'btn quiet', onclick: exportData }, 'Download a backup'), h('button', { class: 'btn quiet', onclick: () => restore.click() }, 'Restore from a backup'), restore)));
  bar.append(h('span', { class: 'note' }, `${S.games.length} games loaded${S.lastSync ? ' · synced with chess.com' : ''}`));
}

// ---------- Drill (same rules as the model-line trainer) ----------
function startDrill(pool) {
  if (!pool.length) return toast('No lines to drill yet. Build some first.');
  const queue = pool.slice().sort((a, b) => ((S.cards[lineId(a)] || {}).due || 0) - ((S.cards[lineId(b)] || {}).due || 0));
  S.drill = { queue, i: 0, done: false, tally: { clean: 0, missed: 0 }, results: [] };
  loadLine();
}
function loadLine() {
  const d = S.drill; const line = d.queue[d.i];
  if (!line) { d.done = true; render(); return; }
  Object.assign(d, { line, ply: 0, game: new Chess(), wrong: 0, mistakes: 0, sheet: [], note: null, busy: false, finished: false });
  S.hint = null; S.sel = null; render(); autoReply();
}
function autoReply() {
  const d = S.drill;
  if (d.ply >= d.line.length) return finishLine();
  if (d.game.turn() === S.side) return;
  d.busy = true;
  setTimeout(() => {
    if (S.drill !== d) return;
    const san = d.line[d.ply]; d.game.move(san); d.sheet.push({ san, ann: null }); d.ply++; d.busy = false;
    if (d.ply >= d.line.length) finishLine(); else render();
  }, 620);
}
function drillMove(san) {
  const d = S.drill; const want = d.line[d.ply];
  if (san === want) {
    d.game.move(san); d.sheet.push({ san, ann: d.wrong ? 'slow' : 'best' }); d.ply++; d.wrong = 0; S.hint = null;
    d.note = null; render(); autoReply(); return;
  }
  const alt = (S.rep[S.side].get(posKey(d.game.fen())) || []).includes(san);
  if (alt) { d.note = { cls: 'miss', text: `${san} is in your prep too, but this line goes the other way. Find the other move.` }; render(); return; }
  d.wrong++; if (d.wrong === 1) d.mistakes++;
  if (d.wrong >= 2) { const m = new Chess(d.game.fen()).move(want); S.hint = m ? { from: m.from, to: m.to } : null; }
  d.note = { cls: 'miss', text: d.wrong >= 2 ? `Still not it. Your prep plays ${want}.` : 'That is legal, but it is not your prep. Think about what you decided here.' };
  render();
}
function showMove() {
  const d = S.drill; const m = new Chess(d.game.fen()).move(d.line[d.ply]); if (!m) return;
  S.hint = { from: m.from, to: m.to }; if (!d.wrong) d.mistakes++; d.wrong = Math.max(d.wrong, 2);
  d.note = { cls: 'miss', text: `Play ${d.line[d.ply]}.` }; render();
}
function finishLine() {
  const d = S.drill; if (d.finished) return; d.finished = true;
  const id = lineId(d.line); S.cards[id] = schedule(S.cards[id], d.mistakes, Date.now()); save('cards');
  d.tally[d.mistakes ? 'missed' : 'clean']++; d.results.push({ label: lineText(d.line), good: !d.mistakes });
  const iv = S.cards[id].iv;
  d.note = d.mistakes ? { cls: 'bad', text: `Line done, with ${d.mistakes} slip${d.mistakes > 1 ? 's' : ''}. It comes back in 10 minutes.` }
    : { cls: 'payoff', text: `Clean. You will see this line again in ${iv < 2 ? '1 day' : Math.round(iv) + ' days'}.` };
  refresh(); render();
}
function renderDrill(panel, bar) {
  const d = S.drill; const sn = sideName(S.side);
  if (!d) {
    const branch = S.path.length ? allLines(S.rep[S.side], S.path) : [];
    panel.append(h('section', { class: 'sec' },
      h('h3', {}, D.due.length ? `${D.due.length} line${D.due.length > 1 ? 's' : ''} due` : (D.lines.length ? 'Nothing due right now' : 'No lines yet')),
      h('p', { class: 'ask' }, `The board plays your opponents’ moves; you play your ${sn} prep from memory. Clean lines come back later each time. A slip brings the line back in 10 minutes.`),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => startDrill(D.due), disabled: !D.due.length }, 'Drill due lines'),
        h('button', { class: 'btn quiet', onclick: () => startDrill(D.lines), disabled: !D.lines.length }, `All ${D.lines.length}`),
        branch.length ? h('button', { class: 'btn quiet', onclick: () => startDrill(branch) }, `Only after ${lineText(S.path)}`) : null)));
    const ul = h('ul', { class: 'list' }); const now = Date.now();
    for (const l of D.lines.slice(0, 40)) {
      const c = S.cards[lineId(l)];
      ul.append(h('li', { class: 'item' },
        h('button', { class: 'go', onclick: () => startDrill([l]) }, h('span', { class: 'meta', style: 'color:var(--bone);font-size:15px' }, lineText(l))),
        h('span', { class: 'tag ' + (!c ? 'dim' : c.due <= now ? 'warn' : 'ok') }, !c ? 'new' : c.due <= now ? 'due' : 'in ' + Math.max(1, Math.round((c.due - now) / 864e5)) + 'd')));
    }
    if (!D.lines.length) ul.append(h('li', { class: 'empty' }, `Your ${sn} repertoire is empty. Add moves in Build.`));
    panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Your lines'), ul));
    bar.append(h('span', { class: 'note' }, 'Go to a position in Build first to drill just that branch.'));
    return;
  }
  if (d.done) {
    const ol = h('ul', { class: 'list' });
    for (const r of d.results) ol.append(h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, r.label), h('span', { class: 'tag ' + (r.good ? 'ok' : 'warn') }, r.good ? 'clean' : 'slipped')));
    panel.append(h('section', { class: 'sec' }, h('h3', {}, `${d.tally.clean} clean, ${d.tally.missed} with slips`), ol,
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => { S.drill = null; render(); } }, 'Back to your lines'))));
    return;
  }
  const mine = d.game.turn() === S.side;
  const sheet = h('ol', { class: 'moves' });
  for (let i = 0; i < d.sheet.length; i += 2) {
    const cell = m => m ? h('span', {}, m.san, m.ann ? h('span', { class: 'ann ' + m.ann }, m.ann === 'best' ? ' ✓' : ' ?!') : '') : h('span');
    sheet.append(h('li', {}, h('span', { class: 'no' }, (i / 2 + 1) + '.'), cell(d.sheet[i]), cell(d.sheet[i + 1])));
  }
  panel.append(h('section', { class: 'sec' },
    h('h2', {}, `Line ${d.i + 1} of ${d.queue.length}`),
    h('p', { class: 'who ' + (mine && !d.finished ? 'mine' : 'theirs') }, d.finished ? 'Line complete.' : mine ? `${sn} to play. Find your prep move.` : 'Your opponent is thinking…'),
    h('p', { class: 'lnote ' + (d.note ? d.note.cls : '') }, d.note ? d.note.text : ''),
    h('div', { class: 'row' },
      d.finished ? h('button', { class: 'btn', onclick: () => { d.i++; loadLine(); } }, d.i + 1 < d.queue.length ? 'Next line' : 'See how you did')
        : h('button', { class: 'btn quiet', onclick: showMove, disabled: !mine }, 'Show the move'),
      h('button', { class: 'btn quiet', onclick: () => { S.drill = null; S.hint = null; render(); } }, 'Leave drill'))));
  panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Score sheet'), d.sheet.length ? sheet : h('p', { class: 'empty' }, 'Moves appear here as you play.')));
}

// ---------- Today: the daily plan ----------
const todayId = () => ymd(new Date());
function egProgress() { try { return JSON.parse(localStorage.getItem('endgame-reps-progress')) || {}; } catch { return {}; } }
function planContext(date) {
  return { date, profile: D.profile, weak: D.weak, gaps: D.gapsBoth, ends: {}, lines: D.linesBoth, due: D.dueBoth, eg: egProgress(),
    xgaps: (S.xgaps.w || []).concat(S.xgaps.b || []).sort((a, b) => b.reach - a.reach),
    settings: Object.assign({}, S.settings, { rush: (S.stats && S.stats.rush) || S.settings.rush }), gamesCount: S.games.length, recentLosses: D.recentLosses || [] };
}
function ensurePlan(force) {
  const id = todayId(); const old = S.plans[id];
  if (old && !force) return;
  const plan = buildPlan(planContext(new Date()));
  for (const t of plan.tasks) if (t.id === 'import' || t.id === 'import-week') t.gamesAt = S.games.length;
  const done = {};
  if (old) for (const t of plan.tasks) if (old.done && old.done[t.id]) done[t.id] = true;
  // What chess.com showed when the day began, so a new Rush best or puzzle high can tick its task.
  const base = old && old.base || statBase();
  S.plans[id] = { plan, done, base, results: old && old.results || {} };
  savePlan(id);
}
const statBase = () => S.stats ? { rush: S.stats.rush || 0, tactics: S.stats.tactics || 0 } : { rush: null, tactics: null };
function savePlan(id) {
  const data = S.plans[id];
  if (db) db.doc('plans/' + id).set(data).catch(() => toast('Could not save your plan. Check your connection.'));
  else { const all = LS.get('plans') || {}; all[id] = data; LS.set('plans', all); }
}
// Some tasks tick themselves once the app can see they are done.
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return +d; };
const gamesToday = () => S.games.filter(g => gameTime(g) >= dayStart()).sort((a, b) => gameTime(a) - gameTime(b));
function autoDone(t, rec) {
  const start = dayStart(); const st = S.stats || {}; const base = rec.base || {};
  if (t.id === 'play') return gamesToday().filter(g => !t.cls || g.cls === t.cls).length >= (t.target || 1);
  if (t.id === 'rush') return (rec.results && rec.results.rush != null) || (base.rush != null && st.rush > base.rush);
  if (t.id === 'puzzles') return base.tactics != null && st.tactics > base.tactics;
  if (t.id === 'drill') return Object.values(S.cards).filter(c => c.last >= +start).length >= (t.target || 1);
  if (t.id.startsWith('seed-')) return D.linesBoth[t.action.side] > 0;
  if (t.id.startsWith('gap-')) { const p = t.action.path; const c = new Chess(); for (const m of p) c.move(m); return (S.rep[t.action.side].get(posKey(c.fen())) || []).length > 0; }
  if (t.id === 'import' || t.id === 'import-week') return S.games.length > (t.gamesAt || 0);
  return false;
}
function isDone(rec, t) { return !!(rec.done && rec.done[t.id]) || (rec.plan.date === todayId() && autoDone(t, rec)); }
function ratio(rec) { const ts = rec.plan.tasks; return ts.length ? ts.filter(t => isDone(rec, t)).length / ts.length : 0; }
function streak() {
  let n = 0; const d = new Date();
  const today = S.plans[todayId()];
  if (today && ratio(today) >= 0.6) n++;
  for (let i = 1; i < 400; i++) { d.setDate(d.getDate() - 1); const r = S.plans[ymd(d)]; if (r && ratio(r) >= 0.6) n++; else break; }
  return n;
}
function runAction(t) {
  const a = t.action;
  if (a.type === 'url') return;
  if (a.side && a.side !== S.side) { S.side = a.side; S.drill = null; goTo([]); refresh(); }
  if (a.type === 'tab') { S.tab = a.tab; render(); }
  else if (a.type === 'review') { const g = S.games.find(x => x.id === a.id); if (g) startReview(g); else { S.tab = 'games'; render(); } }
  else if (a.type === 'gap') { S.tab = 'build'; goTo(a.path); render(); }
  else if (a.type === 'seed') { S.tab = 'build'; goTo([]); seedRep(a.side); }
  else if (a.type === 'endgame' || a.type === 'run') {
    S.tab = 'endgames'; render();
    const sel = a.type === 'endgame' ? '#app .chapter' : '#app .run';
    const btn = [...document.querySelectorAll(sel)].find(b => (b.querySelector('.name') || {}).textContent === (a.title || a.name));
    if (btn && !btn.disabled) { btn.click(); btn.scrollIntoView({ block: 'nearest' }); }
    window.scrollTo({ top: 0 });
  }
}
function seedRep(side) {
  const seeded = seedFromGames(S.games, side, depthTarget());
  const rep = S.rep[side]; let added = 0;
  for (const [k, list] of seeded) { if (!rep.has(k)) rep.set(k, []); for (const s of list) if (!rep.get(k).includes(s)) { rep.get(k).push(s); added++; } }
  save('rep-' + side); refresh(); render();
  toast(added ? `Added ${added} moves from your games to your ${sideName(side)} repertoire` : 'Not enough games yet to build from. Import more first.');
}
const ACTION_LABEL = { review: 'Review with engine', url: 'Open', tab: 'Go', gap: 'Open in Build', seed: 'Build it', endgame: 'Start chapter', run: 'Start' };
const KIND_LABEL = { tactics: 'Tactics', openings: 'Openings', endgames: 'Endgames', play: 'Play', review: 'Review', setup: 'Setup' };

// What chess.com says about a task today: games played, a new Rush best, a puzzle high.
function taskResult(t, rec) {
  const st = S.stats || {}; const base = rec.base || {};
  if (t.id === 'play') {
    const gs = gamesToday(); if (!gs.length) return null;
    const RES = { 1: 'Won', 0: 'Lost', 0.5: 'Drew' };
    return h('ul', { class: 'tres' }, gs.map(g => h('li', { class: g.score === 1 ? 'w' : g.score === 0 ? 'l' : 'd' },
      `${RES[g.score]} as ${sideName(g.me)} vs ${g.opp}${g.oppElo ? ' (' + g.oppElo + ')' : ''} · ${g.cls}${g.myElo ? ' · you ' + g.myElo : ''}${g.opening ? ' · ' + g.opening : ''}`)));
  }
  if (t.id === 'rush') {
    if (base.rush != null && st.rush > base.rush) return h('p', { class: 'tres-line w' }, `New Puzzle Rush best: ${st.rush} (was ${base.rush || 'none'}).`);
    const r = rec.results || {};
    const inp = h('input', { type: 'text', inputmode: 'numeric', value: r.rush != null ? r.rush : '', placeholder: 'score', style: 'width:5em', 'aria-label': 'Your Puzzle Rush score today' });
    inp.addEventListener('change', () => { const v = parseInt(inp.value, 10); rec.results = rec.results || {}; if (v >= 0) rec.results.rush = v; else delete rec.results.rush;
      if (v > (S.settings.rush || 0) && !(st.rush >= v)) { S.settings.rush = v; save('settings'); } savePlan(todayId()); renderToday(); });
    return h('div', { class: 'row tres-line' }, h('span', { class: 'note' }, r.rush != null ? `You scored ${r.rush}.` : 'Scored today:'), inp);
  }
  if (t.id === 'puzzles' && base.tactics != null && st.tactics > base.tactics) return h('p', { class: 'tres-line w' }, `New puzzle-rating high: ${st.tactics}.`);
  return null;
}
const checkable = rec => rec.plan.tasks.some(t => ['play', 'rush', 'puzzles'].includes(t.id) && !isDone(rec, t));
async function checkChessCom(quiet) {
  if (!S.username || S.syncing) return;
  S.syncing = true; if (S.tab === 'today') renderToday();
  const before = S.games.length;
  const rec = S.plans[todayId()]; const fixBase = () => { if (rec && !(rec.base && rec.base.rush != null) && S.stats) { rec.base = statBase(); savePlan(todayId()); } };
  fixBase();
  try { const pgn = await syncChessCom(S.username, { months: before ? 1 : 3 }); fixBase();
    await importText(pgn, S.username, true);
    if (!quiet) toast(S.games.length > before ? `Found ${S.games.length - before} new game${S.games.length - before > 1 ? 's' : ''}` : 'No new games since the last check');
  } catch { if (!quiet) toast('Could not reach chess.com just now'); }
  S.syncing = false; render();
}

function renderToday() {
  const box = $('#rw-today'); box.replaceChildren();
  const rec = S.plans[todayId()];
  if (!rec) { box.append(h('p', { class: 'empty' }, 'Building today’s plan…')); return; }
  const P = rec.plan; const now = new Date();
  const doneN = P.tasks.filter(t => isDone(rec, t)).length;
  const left = h('div', { class: 'plan' });
  left.append(h('p', { class: 'eyebrow' }, now.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })),
    h('h3', { class: 'plantitle' }, P.title),
    h('p', { class: 'ask' }, P.note),
    h('div', { class: 'progress' }, h('span', {}, `${doneN} of ${P.tasks.length} done`), h('span', { class: 'note' }, `about ${P.total} minutes`), h('i', { style: `width:${Math.round(100 * doneN / Math.max(1, P.tasks.length))}%` })));
  if (S.username && location.protocol !== 'file:') left.append(h('div', { class: 'row', style: 'margin:-4px 0 14px' },
    h('button', { class: 'btn quiet tiny', disabled: !!S.syncing, onclick: () => checkChessCom(false) }, S.syncing ? 'Checking chess.com…' : 'Check chess.com for what I did'),
    h('span', { class: 'note' }, 'Games, a new Puzzle Rush best and puzzle highs tick themselves.')));
  const ul = h('ol', { class: 'tasks' });
  P.tasks.forEach(t => {
    const done = isDone(rec, t); const auto = !(rec.done && rec.done[t.id]) && done;
    const asLink = t.action.type === 'url' || (t.action.type === 'review' && (!engineOk() || !S.games.find(g => g.id === t.action.id)) && t.action.url);
    const act = asLink
      ? h('a', { class: 'btn tiny' + (done ? ' quiet' : ''), href: t.action.url, target: '_blank', rel: 'noopener' }, (t.url ? 'Open game' : 'Open on chess.com') + ' ↗')
      : h('button', { class: 'btn tiny' + (done ? ' quiet' : ''), onclick: () => runAction(t) }, ACTION_LABEL[t.action.type] || 'Go');
    ul.append(h('li', { class: 'task' + (done ? ' done' : '') },
      h('button', { class: 'tick', 'aria-pressed': String(done), 'aria-label': (done ? 'Mark not done: ' : 'Mark done: ') + t.title, disabled: auto, title: auto ? 'Ticked automatically' : '',
        onclick: () => { rec.done = rec.done || {}; if (rec.done[t.id]) delete rec.done[t.id]; else rec.done[t.id] = true; savePlan(todayId()); renderToday(); } }, done ? '✓' : ''),
      h('div', { class: 'tbody' },
        h('div', { class: 'thead' }, h('span', { class: 'tkind k-' + t.kind }, KIND_LABEL[t.kind] || ''), h('span', { class: 'tmins' }, t.mins + ' min')),
        h('div', { class: 'ttitle' }, t.title),
        h('p', { class: 'twhy' }, t.why), taskResult(t, rec)),
      h('div', { class: 'tact' }, act)));
  });
  left.append(ul);

  const setRow = (label, opts, cur, fn) => h('div', { class: 'setrow' }, h('span', { class: 'note' }, label), h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { 'aria-pressed': String(cur === v), onclick: () => fn(v) }, l))));
  const changed = () => { save('settings'); ensurePlan(true); render(); };
  left.append(h('section', { class: 'sec setsec' }, h('h2', {}, 'Shape the plan'),
    setRow('Time today', [[20, '20 min'], [40, '40 min'], [60, '1 hour'], [90, '90 min']], S.settings.mins, v => { S.settings.mins = v; changed(); }),
    setRow('Games to play', [['auto', 'Auto'], ['rapid', 'Rapid'], ['blitz', 'Blitz'], ['bullet', 'Bullet']], S.settings.cls, v => { S.settings.cls = v; changed(); }),
    (() => { const ti = h('input', { type: 'text', id: 'rw-lichess', value: S.settings.lichessToken || '', placeholder: 'lip_…', autocomplete: 'off', style: 'width:12em' }); ti.addEventListener('change', () => { S.settings.lichessToken = ti.value.trim(); XCACHE.clear(); save('settings'); }); return h('div', { class: 'setrow' }, h('span', { class: 'note' }, 'Lichess token'), ti, h('a', { class: 'note', href: 'https://lichess.org/account/oauth/token/create?description=Chess+Reps', target: '_blank', rel: 'noopener' }, 'Get one (free, no permissions needed)')); })(),
    h('div', { class: 'row' }, h('button', { class: 'btn quiet tiny', onclick: () => { ensurePlan(true); render(); toast('Plan rebuilt from your latest data'); } }, 'Rebuild today’s plan'),
      h('span', { class: 'note' }, 'Rebuilding keeps what you have ticked.'))));

  // Right: streak, week, what your games say.
  const right = h('div', { class: 'coach' });
  const st = streak(); const themes = weekThemes(D.weak); const wd = weekdayIdx(now);
  const strip = h('div', { class: 'week' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() - wd + i); const r = S.plans[ymd(d)];
    const state = i > wd ? 'future' : r ? (ratio(r) >= 0.6 ? 'hit' : i === wd ? 'part' : ratio(r) > 0 ? 'part' : 'miss') : 'none';
    const th = r ? r.plan.theme : themes[i];
    strip.append(h('div', { class: 'wday s-' + state + (i === wd ? ' now' : '') }, h('b', {}, d.toLocaleDateString('en', { weekday: 'short' })), h('span', {}, (THEME[th] || '').replace(' day', '').replace('Slow chess', 'Slow'))));
  }
  right.append(h('section', { class: 'sec' }, h('div', { class: 'streak' }, h('b', {}, String(st)), h('span', {}, st === 1 ? 'day in a row' : 'days in a row')), h('p', { class: 'note' }, 'A day counts when you finish at least 60% of its plan.'), strip));

  const p = D.profile; const sec = h('section', { class: 'sec' }, h('h2', {}, 'What your games say'));
  if (!p) {
    sec.append(h('p', { class: 'empty' }, `No games yet. Import ${S.username || 'your'} games and this fills in: ratings, how you lose, and what to work on first.`), h('button', { class: 'btn tiny', onclick: () => { S.tab = 'games'; render(); } }, 'Import games'));
  } else {
    const rows = h('div', { class: 'ratings' });
    for (const [k, c] of Object.entries(p.classes).filter(([k]) => k !== 'other').sort((a, b) => b[1].n - a[1].n)) {
      rows.append(h('div', { class: 'rating' + (k === p.main ? ' main' : '') }, h('span', { class: 'note' }, k), h('b', {}, c.last ? String(c.last) : '–'),
        h('span', { class: 'trend ' + (c.trend > 0 ? 'up' : c.trend < 0 ? 'down' : '') }, c.trend ? (c.trend > 0 ? '+' : '−') + Math.abs(c.trend) : '±0'), h('span', { class: 'note' }, `${c.recent} games · scored ${pc(c.score)}`)));
    }
    if (S.stats && S.stats.tactics) rows.append(h('div', { class: 'rating' }, h('span', { class: 'note' }, 'puzzles'), h('b', {}, String(S.stats.tactics)), h('span'), h('span', { class: 'note' }, 'tactics rating')));
    sec.append(rows, h('p', { class: 'note' }, `Based on your last ${p.pool} games. Trend is the change over the last 30 days you played. ${tierFor(p.elo).note}`));
    const wl = h('ul', { class: 'list weak' });
    const NAMES = { time: 'The clock', tactics: 'Tactics', endgames: 'Endgames', openings: 'Openings', tilt: 'Playing on tilt' };
    for (const w of D.weak) wl.append(h('li', { class: 'item' }, h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'wname' }, NAMES[w.key]), h('div', { class: 'meta' }, w.text)), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(100 * w.score)}%` }))));
    if (!D.weak.length) wl.append(h('li', { class: 'empty' }, p.losses.n < 5 ? 'Not enough losses yet to spot a pattern. Import more games.' : 'No single weakness stands out. The plan keeps a balanced week.'));
    sec.append(h('h2', { style: 'margin-top:18px' }, 'Work on, in this order'), wl);
    const ops = p.openings.slice(0, 6);
    if (ops.length) {
      const ol = h('ul', { class: 'list' });
      for (const o of ops) ol.append(h('li', { class: 'item' }, h('span', { class: 'meta', style: 'flex:1;color:var(--bone)' }, `${o.name}`), h('span', { class: 'note' }, `as ${sideName(o.side)} · ${o.n} games`), h('span', { class: 'tag ' + (o.score >= 0.55 ? 'ok' : o.score < 0.45 ? 'gap' : 'dim') }, pc(o.score))));
      sec.append(h('h2', { style: 'margin-top:18px' }, 'Your most played openings'), ol);
    }
  }
  if (!(S.stats && S.stats.rush)) {
    const inp = h('input', { type: 'text', id: 'rw-rush', inputmode: 'numeric', value: S.settings.rush || '', placeholder: 'e.g. 24', style: 'width:6em' });
    inp.addEventListener('change', () => { S.settings.rush = +inp.value || null; save('settings'); });
    sec.append(h('div', { class: 'row', style: 'margin-top:16px' }, h('label', { class: 'note', for: 'rw-rush' }, 'Your Puzzle Rush best'), inp));
  }
  right.append(sec);
  box.append(left, right);
}

// ---------- Shell ----------
const TABS = ['today', 'story', 'build', 'gaps', 'drill', 'games', 'endgames'];
function render() {
  for (const t of TABS) $('#tab-' + t).setAttribute('aria-selected', String(S.tab === t));
  const eg = S.tab === 'endgames';
  $('#rw').hidden = eg; $('#app').hidden = !eg; const flat = S.tab === 'today' || S.tab === 'story';
  $('#sidepick').hidden = eg || flat;
  $('#rw-grid').hidden = flat; $('#rw-today').hidden = S.tab !== 'today'; $('#rw-story').hidden = S.tab !== 'story';
  if (eg) return;
  if (S.tab === 'today') return renderToday();
  if (S.tab === 'story') return renderStory();
  $('#side-w').setAttribute('aria-pressed', String(S.side === 'w')); $('#side-b').setAttribute('aria-pressed', String(S.side === 'b'));
  const panel = $('#rw-panel'), bar = $('#rw-bar'); panel.replaceChildren(); bar.replaceChildren();
  ({ build: renderBuild, gaps: renderGaps, drill: renderDrill, games: renderGames })[S.tab](panel, bar);
  renderBoard();
  liveEval();
}
for (const t of TABS) $('#tab-' + t).addEventListener('click', () => { if (t !== 'games' && S.review && !S.review.running) S.review = null; S.tab = t; S.sel = null; if (t !== 'drill') S.hint = null; render(); });
for (const s of ['w', 'b']) $('#side-' + s).addEventListener('click', () => { if (S.side === s) return; S.side = s; S.drill = null; goTo([]); refresh(); render(); });

if (typeof Chess === 'undefined') $('#rw-panel').append(h('p', { class: 'lnote bad' }, 'The move generator did not load. Reload the page to try again.'));
else { render(); load(); }
