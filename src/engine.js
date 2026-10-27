// ---------- Stockfish (WebAssembly, runs in a worker) ----------
const ENGINE_URL = 'engine/stockfish-18-lite-single.js';
const Eng = { w: null, state: 'off', job: null, next: null };
function enginePost(cmd) { if (Eng.w) Eng.w.postMessage(cmd); }
function engineStart() {
  if (Eng.w) return true;
  if (Eng.state === 'failed') return false;
  try { Eng.w = new Worker(ENGINE_URL); } catch { Eng.state = 'failed'; return false; }
  Eng.state = 'loading';
  Eng.w.onmessage = e => engineLine(String(e.data));
  Eng.w.onerror = () => { Eng.state = 'failed'; Eng.w = null; const j = Eng.job || Eng.next; if (j) j.resolve(Object.assign(j, { cancelled: true })); Eng.job = Eng.next = null; paintEngine(); };
  enginePost('uci'); enginePost('isready');
  return true;
}
const engineOk = () => Eng.state !== 'failed';
function engineLine(line) {
  if (line === 'readyok') { Eng.state = 'ready'; enginePump(); return; }
  const j = Eng.job; if (!j) return;
  if (line.startsWith('info') && line.includes(' pv ') && line.includes(' score ')) {
    const t = line.split(' '); const at = k => t[t.indexOf(k) + 1];
    const mpv = +(at('multipv') || 1); const kind = at('score'); const v = +t[t.indexOf('score') + 2];
    const pv = t.slice(t.indexOf('pv') + 1);
    const sign = j.turn === 'w' ? 1 : -1;
    j.lines[mpv - 1] = { depth: +at('depth'), cp: kind === 'cp' ? sign * v : null, mate: kind === 'mate' ? sign * v : null, pv };
    if (j.onUpdate && mpv === 1) j.onUpdate(j);
  } else if (line.startsWith('bestmove')) {
    Eng.job = null; j.best = line.split(' ')[1]; j.resolve(j); enginePump();
  }
}
function enginePump() {
  if (Eng.state !== 'ready' || Eng.job || !Eng.next) return;
  const j = Eng.next; Eng.next = null; Eng.job = j;
  enginePost('setoption name MultiPV value ' + j.multipv);
  enginePost('position fen ' + j.fen);
  enginePost(j.movetime ? 'go movetime ' + j.movetime : 'go depth ' + j.depth);
}
// Resolves with { lines:[{cp|mate (White's view), pv:[uci]}], best } or { cancelled } if a newer request replaced it.
function analyze(fen, { depth = 16, multipv = 1, movetime = 0, onUpdate = null } = {}) {
  if (!engineStart()) return Promise.resolve({ cancelled: true, lines: [] });
  return new Promise(resolve => {
    const j = { fen, depth, multipv, movetime, onUpdate, lines: [], resolve, turn: fen.split(' ')[1] };
    if (Eng.next) Eng.next.resolve(Object.assign(Eng.next, { cancelled: true }));
    Eng.next = j;
    if (Eng.job) enginePost('stop');
    enginePump();
  });
}
// One number for comparisons, from White's view. Mates count as ±10 pawns and up.
const evalNum = l => !l ? 0 : l.mate != null ? (l.mate > 0 ? 1 : -1) * (10000 - Math.abs(l.mate) * 10) : l.cp;
const evalText = l => !l ? '' : l.mate != null ? (l.mate > 0 ? '#' : '#-') + Math.abs(l.mate) : (l.cp > 0 ? '+' : l.cp < 0 ? '−' : '') + (Math.abs(l.cp) / 100).toFixed(2);
function pvToSan(fen, pv, n = 6) {
  const c = new Chess(fen); const out = [];
  for (const u of pv.slice(0, n)) { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (!m) break; out.push(m.san); }
  return out;
}
function pvLine(fen, sans) {
  const parts = fen.split(' '); let no = +parts[5]; let white = parts[1] === 'w'; const out = [];
  sans.forEach((s, i) => { if (white) out.push(no + '.' + s); else out.push((i === 0 ? no + '…' : '') + s); if (!white) no++; white = !white; });
  return out.join(' ');
}

// Live analysis of whatever is on the Build board.
let liveFen = null;
function liveEval() {
  const on = S.settings.engine !== false && (S.tab === 'build' || S.tab === 'gaps') && !S.batch;
  const bar = $('#rw-evalbar'); if (bar) bar.hidden = !on || !engineOk();
  if (!on || !engineOk()) return;
  const fen = S.game.fen(); if (fen === liveFen && Eng.job && Eng.job.fen === fen) return;
  liveFen = fen;
  if (S.game.game_over()) { paintEngine(); return; }
  analyze(fen, { depth: 20, multipv: 3, onUpdate: j => { if (j.fen === S.game.fen()) paintEngine(j); } }).then(j => { if (!j.cancelled && j.fen === S.game.fen()) paintEngine(j); });
}
function paintEngine(j) {
  const box = $('#rw-engine'); const bar = $('#rw-evalbar');
  if (!engineOk()) { if (box) box.replaceChildren(h('h2', {}, 'Engine'), h('p', { class: 'empty' }, 'The engine is not available on this page. It runs on the hosted version of Pawnstorm.')); if (bar) bar.hidden = true; return; }
  if (!j || !j.lines.length) { if (box && Eng.state === 'loading') box.replaceChildren(h('h2', {}, 'Engine'), h('p', { class: 'empty' }, 'Starting Stockfish…')); return; }
  const top = j.lines[0]; const v = Math.max(-1000, Math.min(1000, evalNum(top)));
  if (bar) { bar.querySelector('i').style.width = (50 + 50 * (2 / (1 + Math.exp(-v / 250)) - 1)) + '%'; bar.querySelector('span').textContent = evalText(top); }
  if (!box) return;
  const ul = h('ul', { class: 'list' });
  for (const l of j.lines.filter(Boolean)) {
    const sans = pvToSan(j.fen, l.pv, 7); if (!sans.length) continue;
    ul.append(h('li', { class: 'item' }, h('span', { class: 'evtag' }, evalText(l)),
      h('button', { class: 'go', onclick: () => { if (S.tab === 'build' || S.tab === 'gaps') userMove(sans[0]); }, title: 'Play ' + sans[0] }, h('span', { class: 'meta', style: 'color:var(--bone)' }, pvLine(j.fen, sans)))));
  }
  box.replaceChildren(h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0' }, 'Engine'), h('span', { class: 'note' }, `Stockfish 18 · depth ${top.depth}`)), ul);
}
function engineSection() {
  const sec = h('section', { class: 'sec', id: 'rw-engine' });
  if (S.settings.engine === false) sec.append(h('div', { class: 'row' }, h('h2', { style: 'margin:0' }, 'Engine'), h('button', { class: 'btn quiet tiny', onclick: () => { S.settings.engine = true; save('settings'); render(); } }, 'Turn on')));
  else sec.append(h('h2', {}, 'Engine'), h('p', { class: 'empty' }, engineOk() ? 'Thinking…' : 'The engine is not available on this page.'));
  return sec;
}

// ---------- Lichess opening explorer ----------
const BUCKETS = [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
function explorerParams() {
  const elo = (D.profile && D.profile.elo) || 1200;
  let i = BUCKETS.length - 1; while (i > 0 && BUCKETS[i] > elo) i--;
  const ratings = [BUCKETS[Math.max(0, i - 1)], BUCKETS[i], BUCKETS[Math.min(BUCKETS.length - 1, i + 1)]].filter((v, k, a) => a.indexOf(v) === k);
  const cls = S.settings.cls && S.settings.cls !== 'auto' ? S.settings.cls : (D.profile ? D.profile.main : 'rapid');
  const speeds = cls === 'bullet' ? 'bullet,blitz' : cls === 'blitz' ? 'blitz,rapid' : 'blitz,rapid,classical';
  return { ratings: ratings.join(','), speeds, label: `${ratings[0] || 'under 1000'}–${(BUCKETS[BUCKETS.indexOf(ratings[ratings.length - 1]) + 1] || 2800)} · ${speeds.replace(/,/g, ', ')}` };
}
const XCACHE = new Map(Object.entries(LS.get('explorer') || {}));
let xSaveT = null;
async function explorer(fen) {
  const p = explorerParams(); const key = p.ratings + '|' + p.speeds + '|' + posKey(fen);
  if (XCACHE.has(key)) return XCACHE.get(key);
  const url = `https://explorer.lichess.ovh/lichess?variant=standard&speeds=${p.speeds}&ratings=${p.ratings}&moves=15&topGames=0&recentGames=0&fen=${encodeURIComponent(fen)}`;
  const headers = S.settings.lichessToken ? { Authorization: 'Bearer ' + S.settings.lichessToken } : {};
  let r = await fetch(url, { headers });
  if (r.status === 429) { await new Promise(res => setTimeout(res, 61000)); r = await fetch(url, { headers }); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('auth'), { code: 'auth' });
  if (!r.ok) throw new Error('http ' + r.status);
  const j = await r.json();
  const out = { total: j.white + j.draws + j.black, moves: (j.moves || []).map(m => [m.san, m.white + m.draws + m.black, m.white, m.draws, m.black]) };
  XCACHE.set(key, out);
  clearTimeout(xSaveT); xSaveT = setTimeout(() => { const o = {}; [...XCACHE.entries()].slice(-3000).forEach(([k, v]) => { o[k] = v; }); LS.set('explorer', o); }, 1500);
  return out;
}
function explorerError(e) {
  return e && e.code === 'auth' ? 'Lichess wants a free account token for the explorer. Add one under Shape the plan on the Today tab.' : 'Could not reach the lichess explorer from this page.';
}
function explorerSection() {
  const sec = h('section', { class: 'sec', id: 'rw-explorer' }, h('h2', {}, 'At your level on lichess'), h('p', { class: 'empty' }, 'Loading…'));
  const fen = S.game.fen(); const mine = S.game.turn() === S.side; const list = S.rep[S.side].get(posKey(fen)) || [];
  explorer(fen).then(x => {
    if (S.game.fen() !== fen || !document.body.contains(sec)) return;
    const p = explorerParams();
    const ul = h('ul', { class: 'list' });
    for (const [san, n, w, d, b] of x.moves.slice(0, 8)) {
      const share = x.total ? n / x.total : 0; const covered = list.includes(san);
      const myScore = n ? (S.side === 'w' ? (w + d / 2) / n : (b + d / 2) / n) : 0;
      ul.append(h('li', { class: 'item' },
        h('button', { class: 'go', onclick: () => userMove(san), title: covered ? 'Open' : 'Add to repertoire' },
          h('span', { class: 'san' }, san), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(100 * share)}%` })),
          h('span', { class: 'meta' }, `${Math.round(100 * share)}% · ${n.toLocaleString()} games · ${sideName(S.side)} scores ${Math.round(100 * myScore)}%`)),
        h('span', { class: 'tag ' + (covered ? 'ok' : mine ? 'dim' : share >= 0.05 ? 'gap' : 'dim') }, covered ? 'in your prep' : mine ? '' : share >= 0.05 ? 'gap' : 'rare')));
    }
    if (!x.moves.length) ul.append(h('li', { class: 'empty' }, 'No games from this position at your level.'));
    sec.replaceChildren(h('div', { class: 'row', style: 'justify-content:space-between' }, h('h2', { style: 'margin:0' }, 'At your level on lichess'), h('span', { class: 'note' }, p.label)), ul);
  }).catch(e => { if (document.body.contains(sec)) sec.replaceChildren(h('h2', {}, 'At your level on lichess'), h('p', { class: 'empty' }, explorerError(e))); });
  return sec;
}
// Walk the repertoire; at each of their moves, any common reply you don't cover is a gap.
// `reach` is the share of your games as this colour that get to the gap, if opponents play like the explorer says.
async function scanExplorerGaps(side, onProgress) {
  const rep = S.rep[side]; const gaps = []; const seen = new Set(); let fetched = 0;
  const maxPly = depthTarget(); const minReach = 0.01;
  const queue = [{ fen: START_FEN, path: [], reach: 1 }];
  while (queue.length) {
    const { fen, path, reach } = queue.shift(); const k = posKey(fen);
    if (seen.has(k) || path.length >= maxPly) continue; seen.add(k);
    const c = new Chess(fen); const list = rep.get(k) || [];
    if (c.turn() === side) { for (const s of list) { const cc = new Chess(fen); if (cc.move(s)) queue.push({ fen: cc.fen(), path: path.concat(s), reach }); } continue; }
    if (!list.length && path.length) continue;
    const x = await explorer(fen); fetched++; onProgress && onProgress(fetched, gaps.length);
    for (const [san, n, w, d, b] of x.moves) {
      const share = x.total ? n / x.total : 0; const r = reach * share;
      if (r < minReach || n < 20) continue;
      const cc = new Chess(fen); if (!cc.move(san)) continue;
      if (list.includes(san)) queue.push({ fen: cc.fen(), path: path.concat(san), reach: r });
      else gaps.push({ side, path, san, share, reach: r, n, score: n ? (side === 'w' ? (w + d / 2) / n : (b + d / 2) / n) : null });
    }
  }
  return gaps.sort((a, b) => b.reach - a.reach);
}

// ---------- Engine check of your own moves ----------
const CHECK = LS.get('engcheck') || {};
async function checkRepertoire(side, onProgress) {
  const rep = S.rep[side]; const nodes = []; const seen = new Set();
  const walk = (fen, path) => { const k = posKey(fen); if (seen.has(k) || path.length > 40) return; seen.add(k);
    const list = rep.get(k) || []; const c = new Chess(fen); if (c.turn() === side && list.length) nodes.push({ fen, path, list });
    for (const s of list) { const cc = new Chess(fen); if (cc.move(s)) walk(cc.fen(), path.concat(s)); } };
  walk(START_FEN, []);
  const out = []; let i = 0;
  for (const nd of nodes) {
    i++; onProgress && onProgress(i, nodes.length);
    for (const san of nd.list) {
      const ck = posKey(nd.fen) + '|' + san;
      if (!CHECK[ck]) {
        const best = await analyze(nd.fen, { depth: 14 }); if (best.cancelled) return null;
        const bestSan = pvToSan(nd.fen, [best.best], 1)[0];
        const sgn = side === 'w' ? 1 : -1; const bestV = sgn * evalNum(best.lines[0]);
        let mineV = bestV;
        if (bestSan !== san) { const c = new Chess(nd.fen); c.move(san); const a = await analyze(c.fen(), { depth: 13 }); if (a.cancelled) return null; mineV = sgn * evalNum(a.lines[0]); }
        CHECK[ck] = { loss: Math.max(0, Math.min(1000, bestV) - Math.min(1000, mineV)), best: bestSan, mine: mineV };
        LS.set('engcheck', CHECK);
      }
      const r = CHECK[ck]; if (r.loss >= 60) out.push(Object.assign({ path: nd.path, san }, r));
    }
  }
  return out.sort((a, b) => b.loss - a.loss);
}

// ---------- Game review ----------
function fullMoves(g) { return (g.full || g.moves).split(' ').filter(Boolean); }
async function startReview(g) {
  const sans = []; const c = new Chess();
  for (const s of fullMoves(g)) { const m = c.move(s, { sloppy: true }); if (!m) break; sans.push(m.san); }
  const cached = LS.get('review:' + g.id);
  S.review = { g, sans, idx: 0, evals: cached && cached.evals && cached.evals.length === sans.length + 1 ? cached.evals : [], best: cached ? cached.best || [] : [], running: false };
  S.tab = 'games'; render();
  if (S.review.evals.length < sans.length + 1) runReview(S.review);
}
async function runReview(R) {
  if (!engineStart()) { toast('The engine is not available on this page.'); return; }
  R.running = true; S.batch = true;
  const c = new Chess();
  for (let i = 0; i <= R.sans.length; i++) {
    if (S.review !== R) break;
    if (R.evals[i] == null) {
      const a = await analyze(c.fen(), { depth: 12 }); if (a.cancelled || S.review !== R) break;
      R.evals[i] = c.game_over() ? (c.in_checkmate() ? (c.turn() === 'w' ? -10000 : 10000) : 0) : evalNum(a.lines[0]);
      R.best[i] = a.best ? pvToSan(c.fen(), [a.best], 1)[0] : null;
      if (S.tab === 'games' && S.review === R) renderReviewProgress(R);
    }
    if (i < R.sans.length) c.move(R.sans[i]);
  }
  R.running = false; S.batch = false;
  if (R.evals.length === R.sans.length + 1) LS.set('review:' + R.g.id, { evals: R.evals, best: R.best });
  if (S.review === R && S.tab === 'games') render();
}
const clampE = v => Math.max(-1000, Math.min(1000, v));
function reviewMistakes(R) {
  const out = []; const sgn = R.g.me === 'w' ? 1 : -1;
  for (let i = 0; i < R.sans.length; i++) {
    const mover = i % 2 === 0 ? 'w' : 'b'; if (mover !== R.g.me) continue;
    if (R.evals[i] == null || R.evals[i + 1] == null) continue;
    const before = sgn * clampE(R.evals[i]), after = sgn * clampE(R.evals[i + 1]); const loss = before - after;
    if (loss >= 60 && R.best[i] !== R.sans[i]) out.push({ i, san: R.sans[i], loss, before, after, best: R.best[i], kind: loss >= 250 ? 'Blunder' : loss >= 120 ? 'Mistake' : 'Inaccuracy' });
  }
  return out;
}
function reviewGame() { const c = new Chess(); for (const s of S.review.sans.slice(0, S.review.idx)) c.move(s); return c; }
function renderReviewProgress(R) {
  const p = $('#rw-review-prog'); if (p) p.textContent = R.running ? `Analysing move ${Math.ceil(R.evals.length / 2)} of ${Math.ceil(R.sans.length / 2)}…` : '';
  const g = $('#rw-review-graph'); if (g) g.replaceWith(evalGraph(R));
}
function evalGraph(R) {
  const W = 600, H = 90; const n = Math.max(1, R.sans.length); const sgn = R.g.me === 'w' ? 1 : -1;
  const pts = R.evals.map((v, i) => `${(i / n * W).toFixed(1)},${(H / 2 - (sgn * clampE(v)) / 1000 * (H / 2 - 4)).toFixed(1)}`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'egraph'); svg.id = 'rw-review-graph';
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Evaluation through the game, from your side');
  svg.innerHTML = `<rect x="0" y="0" width="${W}" height="${H / 2}" fill="var(--panel-2)"/><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" fill="var(--panel)"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="var(--rule)"/>`
    + (pts.length > 1 ? `<polyline fill="none" stroke="var(--amber)" stroke-width="2" points="${pts.join(' ')}"/>` : '')
    + `<line x1="${(R.idx / n * W).toFixed(1)}" y1="0" x2="${(R.idx / n * W).toFixed(1)}" y2="${H}" stroke="var(--bone)" stroke-width="1" opacity=".6"/>`;
  svg.addEventListener('click', e => { const r = svg.getBoundingClientRect(); R.idx = Math.max(0, Math.min(R.sans.length, Math.round((e.clientX - r.left) / r.width * n))); S.hint = null; render(); });
  return svg;
}
function renderReview(panel, bar) {
  const R = S.review; const g = R.g; const ms = reviewMistakes(R);
  const res = g.score === 1 ? 'won' : g.score === 0 ? 'lost' : 'drew';
  bar.append(
    h('button', { class: 'btn quiet tiny', onclick: () => { R.idx = 0; S.hint = null; render(); } }, 'Start'),
    h('button', { class: 'btn quiet tiny', onclick: () => { R.idx = Math.max(0, R.idx - 1); S.hint = null; render(); } }, 'Back'),
    h('button', { class: 'btn quiet tiny', onclick: () => { R.idx = Math.min(R.sans.length, R.idx + 1); S.hint = null; render(); } }, 'Forward'),
    h('span', { class: 'grow' }),
    h('span', { class: 'store' }, R.evals[R.idx] != null ? evalText(Math.abs(R.evals[R.idx]) >= 9000 ? { mate: Math.sign(R.evals[R.idx]) * Math.round((10000 - Math.abs(R.evals[R.idx])) / 10) } : { cp: R.evals[R.idx] }) : ''));
  panel.append(h('section', { class: 'sec' },
    h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, `You ${res} against ${g.opp}`), h('button', { class: 'btn quiet tiny', onclick: () => { S.review = null; S.hint = null; render(); } }, 'Back to games')),
    h('p', { class: 'ask' }, `${sideName(g.me)} · ${g.date}${g.oppElo ? ' · ' + g.opp + ' ' + g.oppElo : ''}${g.full ? '' : ' · only the first 20 moves were saved for this game'}`),
    evalGraph(R), h('p', { class: 'note', id: 'rw-review-prog' }, R.running ? 'Analysing…' : '')));
  const turning = ms.find(m => m.before > -150 && m.after <= -200);
  if (turning) panel.append(h('p', { class: 'lnote miss' }, `The game turned on move ${Math.floor(turning.i / 2) + 1}: ${turning.san} took you from ${(turning.before / 100).toFixed(1)} to ${(turning.after / 100).toFixed(1)}. ${turning.best} was the move.`));
  const ul = h('ul', { class: 'list' });
  for (const m of ms) ul.append(h('li', { class: 'item' + (R.idx === m.i ? ' on' : '') },
    h('button', { class: 'go', onclick: () => { R.idx = m.i; const c = reviewGame(); const mv = m.best && c.move(m.best); S.hint = mv ? { from: mv.from, to: mv.to } : null; render(); } },
      h('span', { class: 'tag ' + (m.kind === 'Blunder' ? 'gap' : m.kind === 'Mistake' ? 'warn' : 'dim') }, m.kind),
      h('span', { class: 'meta', style: 'color:var(--bone)' }, `${Math.floor(m.i / 2) + 1}${m.i % 2 ? '…' : '.'}${m.san}`),
      h('span', { class: 'meta' }, `${(m.before / 100).toFixed(1)} → ${(m.after / 100).toFixed(1)} · best was ${m.best}`))));
  if (!ms.length) ul.append(h('li', { class: 'empty' }, R.running ? 'Mistakes appear here as the engine works through the game.' : 'No real mistakes found by the engine at this depth.'));
  panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Your mistakes'), ul,
    h('p', { class: 'note' }, 'Tap one to see the position before your move. The green squares show the better move.')));
  const line = h('div', { class: 'moveline' });
  R.sans.forEach((s, i) => { if (i % 2 === 0) line.append(h('span', { class: 'no' }, (i / 2 + 1) + '.')); line.append(h('button', { class: i === R.idx - 1 ? 'cur' : '', onclick: () => { R.idx = i + 1; S.hint = null; render(); } }, s)); });
  panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Moves'), line));
}

// ---------- chess.com sync (works wherever the page may call chess.com) ----------
async function syncChessCom(user, { months = 3, quiet = false } = {}) {
  const u = encodeURIComponent(user.toLowerCase());
  const arch = await (await fetch(`https://api.chess.com/pub/player/${u}/games/archives`)).json();
  if (!arch.archives) throw new Error('nouser');
  let pgn = '';
  for (const url of arch.archives.slice(-months)) { const j = await (await fetch(url)).json(); for (const g of j.games || []) if (g.pgn && g.rules === 'chess') pgn += g.pgn + '\n\n'; }
  try {
    const st = await (await fetch(`https://api.chess.com/pub/player/${u}/stats`)).json();
    S.stats = { tactics: st.tactics && st.tactics.highest && st.tactics.highest.rating, tacticsLow: st.tactics && st.tactics.lowest && st.tactics.lowest.rating,
      rush: st.puzzle_rush && st.puzzle_rush.best && st.puzzle_rush.best.score,
      ratings: Object.fromEntries(['rapid', 'blitz', 'bullet', 'daily'].map(k => [k, st['chess_' + k] && st['chess_' + k].last && st['chess_' + k].last.rating])), fetched: Date.now() };
    if (db) db.doc('stats/main').set(S.stats).catch(() => {}); else LS.set('stats/main', S.stats);
  } catch {}
  S.lastSync = Date.now(); LS.set('lastSync', S.lastSync);
  return pgn;
}
// ---------- lichess sync: games, ratings, today's puzzles and Puzzle Storm ----------
const liHistory = () => LS.get('li-days') || {};
const liHeaders = () => S.settings.lichessToken ? { Authorization: 'Bearer ' + S.settings.lichessToken } : {};
async function syncLichess(user) {
  const u = encodeURIComponent(user);
  const mine = S.games.filter(g => g.src === 'lichess'); const last = mine.length ? Math.max(...mine.map(gameTime)) : 0;
  // First sync takes your last 200 games, however old; later ones only what is new.
  const inc = last && S.li && S.li.backfilled;
  const r = await fetch(`https://lichess.org/api/games/user/${u}?${inc ? 'since=' + (last + 1000) + '&max=500' : 'max=200'}&opening=true&clocks=false&evals=false`, { headers: Object.assign({ Accept: 'application/x-chess-pgn' }, liHeaders()) });
  if (r.status === 404) throw new Error('nouser');
  if (!r.ok) throw new Error('http');
  const pgn = await r.text();
  const L = S.li = S.li || {}; L.backfilled = true;
  try {
    const j = await (await fetch(`https://lichess.org/api/user/${u}`)).json(); const pf = j.perfs || {};
    L.puzzle = pf.puzzle && pf.puzzle.rating; L.storm = pf.storm && pf.storm.score;
    L.ratings = Object.fromEntries(['bullet', 'blitz', 'rapid', 'classical'].map(k => [k, pf[k] && pf[k].rating]));
  } catch {}
  try {
    const d = await (await fetch(`https://lichess.org/api/storm/dashboard/${u}?days=30`)).json();
    const now = new Date(); const ids = [`${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`, `${now.getUTCFullYear()}/${now.getUTCMonth() + 1}/${now.getUTCDate()}`];
    const day = (d.days || []).find(x => ids.includes(x._id));
    const H = liHistory(); for (const x of d.days || []) { const [y, m, dd] = x._id.split('/'); const k = `${y}-${m.padStart(2, '0')}-${dd.padStart(2, '0')}`; H[k] = Object.assign(H[k] || {}, { storm: x.score, stormRuns: x.runs }); } LS.set('li-days', H);
    L.stormToday = day ? { runs: day.runs, score: day.score, date: todayId() } : null; L.storm = Math.max(L.storm || 0, (d.high && d.high.allTime) || 0) || L.storm;
  } catch {}
  L.puzzleErr = null;
  if (S.settings.lichessToken) {
    try {
      const H = liHistory(); const since = L.puzzlesSynced ? Math.min(dayStart(), L.puzzlesSynced - 864e5) : Date.now() - 30 * 864e5;
      const pr = await fetch(`https://lichess.org/api/puzzle/activity?since=${since}&max=2000`, { headers: liHeaders() });
      if (pr.status === 401 || pr.status === 403) L.puzzleErr = 'scope';
      else if (pr.ok) {
        const all = (await pr.text()).split('\n').filter(Boolean).map(x => { try { const o = JSON.parse(x); return { win: o.win, rating: o.puzzle && o.puzzle.rating, at: o.date, themes: (o.puzzle && o.puzzle.themes) || [] }; } catch { return null; } }).filter(Boolean);
        L.puzzlesToday = { date: todayId(), list: all.filter(x => x.at >= dayStart()) };
        const by = {}; for (const x of all) { const k = ymd(new Date(x.at)); (by[k] = by[k] || []).push(x); }
        for (const [k, xs] of Object.entries(by)) H[k] = Object.assign(H[k] || {}, { puzzles: xs.length, won: xs.filter(x => x.win).length, prating: Math.round(xs.reduce((a, x) => a + (x.rating || 0), 0) / xs.length) });
        LS.set('li-days', H); L.puzzlesSynced = Date.now(); L.tokenOk = true;
        try { const db = await (await fetch('https://lichess.org/api/puzzle/dashboard/30', { headers: liHeaders() })).json();
          L.themes = Object.entries(db.themes || {}).map(([k, v]) => ({ theme: k, nb: v.results.nb, first: v.results.firstWins, perf: v.results.performance })); } catch {}
      }
    } catch {}
  } else L.puzzleErr = 'token';
  L.fetched = Date.now(); LS.set('li', L);
  return pgn;
}
async function autoSync() {
  if (!(S.username || S.settings.lichessUser) || location.protocol === 'file:' || S.syncing) return;
  // Check often while today's plan still has games or puzzles to see; otherwise every few hours.
  const rec = S.plans[todayId()]; const gap = rec && checkable(rec) ? 10 * 60e3 : 3 * 3600e3;
  const last = LS.get('lastSync') || 0; if (Date.now() - last < gap) return;
  return checkChessCom(true);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync(); });

// ---------- Backup ----------
function exportData() {
  const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('reps:') && !k.startsWith('reps:explorer') && !k.startsWith('reps:review:')) out[k] = localStorage.getItem(k); }
  try { out['endgame-reps-progress'] = localStorage.getItem('endgame-reps-progress'); } catch {}
  const blob = new Blob([JSON.stringify({ app: 'pawnstorm', saved: new Date().toISOString(), data: out })], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `pawnstorm-backup-${ymd(new Date())}.json` }); document.body.append(a); a.click(); a.remove();
}
async function importData(file) {
  try {
    const j = JSON.parse(await file.text()); if (j.app !== 'pawnstorm' && j.app !== 'chess-reps') throw 0;
    for (const [k, v] of Object.entries(j.data)) if (v != null) localStorage.setItem(k, v);
    toast('Backup restored. Reloading…'); setTimeout(() => location.reload(), 800);
  } catch { toast('That file is not a Pawnstorm backup.'); }
}
