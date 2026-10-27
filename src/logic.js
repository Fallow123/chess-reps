// ---------- Repertoire logic (no DOM) ----------
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const posKey = fen => fen.split(' ').slice(0, 4).join(' ');

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'c' + (h >>> 0).toString(36); }

// A repertoire is Map<positionKey, SAN[]>. Keys are positions, so transpositions share prep.
function repFromEdges(edges) { const m = new Map(); for (const [k, s] of edges || []) { if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(s)) m.get(k).push(s); } return m; }
function repToEdges(rep) { const out = []; for (const [k, list] of reachable(rep)) for (const s of list) out.push([k, s]); return out; }
// Positions reachable from the start; anything orphaned by a removal is dropped on save.
function reachable(rep) {
  const seen = new Map(); const stack = [START_FEN];
  while (stack.length) {
    const fen = stack.pop(); const k = posKey(fen);
    if (seen.has(k)) continue;
    const list = rep.get(k); if (!list || !list.length) continue;
    seen.set(k, list);
    for (const s of list) { const c = new Chess(fen); if (c.move(s)) stack.push(c.fen()); }
  }
  return seen;
}

function splitPgn(text) {
  return text.replace(/\r/g, '').split(/\n\s*\n(?=\[)/).map(t => t.trim()).filter(t => /\d\.\s*\S/.test(t));
}
function parseGame(text, maxPly) {
  const hdr = {}; text.replace(/\[(\w+)\s+"([^"]*)"\]/g, (_, k, v) => { hdr[k] = v; });
  let body = text.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  let prev; do { prev = body; body = body.replace(/\([^()]*\)/g, ' '); } while (body !== prev);
  body = body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ');
  const c = new Chess(); const moves = []; const toks = body.split(/\s+/).filter(Boolean);
  for (const t of toks) { if (moves.length >= maxPly) break; const m = c.move(t, { sloppy: true }); if (!m) break; moves.push(m.san); }
  return { hdr, moves, toks };
}
// chess.com buckets by estimated duration: base + 40 x increment.
function timeClass(tc) {
  if (!tc || tc === '-') return 'other';
  if (tc.includes('/')) return 'daily';
  const [b, i] = tc.split('+').map(Number); const est = (b || 0) + 40 * (i || 0);
  return est < 180 ? 'bullet' : est < 600 ? 'blitz' : 'rapid';
}
// How the game ended, from chess.com's Termination header.
function endKind(t) {
  t = (t || '').toLowerCase();
  if (t.includes('on time')) return 'time';
  if (t.includes('checkmate')) return 'mate';
  if (t.includes('resignation')) return 'resign';
  if (t.includes('abandon')) return 'abandon';
  if (t.includes('drawn') || t.includes('stalemate') || t.includes('repetition') || t.includes('agreement') || t.includes('insufficient')) return 'draw';
  return 'other';
}
function openingName(h) {
  let n = h.ECOUrl ? decodeURIComponent(h.ECOUrl.split('/').pop()).replace(/-/g, ' ') : (h.Opening || '');
  n = n.replace(/\s+\d+\..*$/, '').replace(/\s+(with|\d).*$/, '').trim();
  const m = n.match(/^(.*?\b(Defense|Defence|Opening|Game|Gambit|Attack|System|Variation)\b)/);
  return (m ? m[1] : n.split(' ').slice(0, 3).join(' ')) || (h.ECO || 'Unknown');
}
// Raw PGN to compact game records. `me` is the username; blank means the most frequent player.
function importPgn(text, me, maxPly = 40) {
  const raw = splitPgn(text).map(t => Object.assign(parseGame(t, maxPly), { plies: countPlies(t) })).filter(g => g.moves.length);
  if (!me) {
    const freq = {}; for (const g of raw) for (const n of [g.hdr.White, g.hdr.Black]) if (n) freq[n.toLowerCase()] = (freq[n.toLowerCase()] || 0) + 1;
    me = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
  const lo = me.toLowerCase(); const out = [];
  for (const g of raw) {
    const h = g.hdr; const color = (h.White || '').toLowerCase() === lo ? 'w' : (h.Black || '').toLowerCase() === lo ? 'b' : null;
    if (!color) continue;
    const res = h.Result === '1-0' ? 1 : h.Result === '0-1' ? 0 : h.Result === '1/2-1/2' ? 0.5 : null;
    const score = res == null ? null : color === 'w' ? res : 1 - res;
    const id = hashStr((h.Link || '') + (h.UTCDate || h.Date || '') + (h.UTCTime || h.StartTime || '') + h.White + h.Black + g.moves.join(' '));
    out.push({ id, me: color, opp: (color === 'w' ? h.Black : h.White) || '?',
      oppElo: +(color === 'w' ? h.BlackElo : h.WhiteElo) || null, myElo: +(color === 'w' ? h.WhiteElo : h.BlackElo) || null,
      date: (h.UTCDate || h.Date || '').replace(/\./g, '-'), time: h.UTCTime || h.StartTime || '',
      tc: h.TimeControl || '', cls: timeClass(h.TimeControl), end: endKind(h.Termination), plies: g.plies,
      opening: openingName(h), score, url: h.Link || '', moves: g.moves.join(' '), full: g.toks.length > g.moves.length ? g.toks.join(' ') : undefined });
  }
  return { me, games: out };
}
// Cheap ply count without replaying the game.
function countPlies(text) {
  let body = text.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ');
  let prev; do { prev = body; body = body.replace(/\([^()]*\)/g, ' '); } while (body !== prev);
  return body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ').split(/\s+/).filter(Boolean).length;
}

// Position keys before each ply, computed once per game and cached on the record.
function keysOf(g) {
  if (!g._k) {
    const c = new Chess(); const k = []; const sans = g.moves.split(' ').filter(Boolean);
    for (const s of sans) { k.push(posKey(c.fen())); if (!c.move(s)) break; }
    Object.defineProperty(g, '_k', { value: { keys: k, sans: sans.slice(0, k.length) }, enumerable: false });
  }
  return g._k;
}

// Walk each game against the prep and record where it left the book.
// opp = their reply is not covered, nomove = you have no move prepared,
// dev = you played something other than your prep, short = prep ran out early.
function analyzeGaps(rep, games, side, shortPly = 10) {
  const groups = new Map(); let inBook = 0, n = 0, early = 0;
  for (const g of games) {
    if (g.me !== side) continue; n++;
    const { keys, sans } = keysOf(g);
    let ev = null, out = sans.length;
    for (let i = 0; i < sans.length; i++) {
      const k = keys[i]; const list = rep.get(k) || []; const san = sans[i];
      if (list.includes(san)) continue;
      out = i;
      const mine = (i % 2 === 0 ? 'w' : 'b') === side;
      if (mine) ev = { type: list.length ? 'dev' : 'nomove', expect: list };
      else if (list.length || i === 0) ev = { type: 'opp', expect: list };
      else if (i < shortPly) ev = { type: 'short', expect: [] };
      if (ev) Object.assign(ev, { key: k, path: sans.slice(0, i), ply: i, san });
      break;
    }
    inBook += out;
    if (ev && ev.type !== 'short' && ev.ply < 16) early++;
    if (!ev) continue;
    const gk = ev.type + '|' + ev.key;
    if (!groups.has(gk)) groups.set(gk, { type: ev.type, key: ev.key, path: ev.path, ply: ev.ply, expect: ev.expect, played: new Map(), games: [], points: 0, scored: 0 });
    const gr = groups.get(gk);
    const p = gr.played.get(ev.san) || { n: 0, pts: 0, scored: 0 }; p.n++; if (g.score != null) { p.pts += g.score; p.scored++; } gr.played.set(ev.san, p);
    gr.games.push(g); if (g.score != null) { gr.points += g.score; gr.scored++; }
  }
  const list = [...groups.values()].sort((a, b) => b.games.length - a.games.length || a.ply - b.ply);
  return { list, games: n, avgBook: n ? inBook / n : 0, early };
}

// Gaps you can see without games: your prep has their reply but no answer from you.
function openEnds(rep, side) {
  const out = []; const seen = new Set();
  const walk = (fen, path) => {
    const k = posKey(fen); if (seen.has(k) || path.length > 40) return; seen.add(k);
    const list = rep.get(k) || [];
    if (!list.length) { const c0 = new Chess(fen); if (c0.turn() === side && path.length && !c0.game_over()) out.push({ key: k, path }); return; }
    for (const s of list) { const c = new Chess(fen); if (c.move(s)) walk(c.fen(), path.concat(s)); }
  };
  walk(START_FEN, []);
  return out;
}

// Every line from the start (or a prefix) to a leaf, as SAN arrays.
function allLines(rep, prefix = []) {
  const lines = []; const c = new Chess();
  for (const s of prefix) if (!c.move(s)) return lines;
  const walk = (fen, path, seen) => {
    const k = posKey(fen); const list = rep.get(k) || [];
    if (!list.length || seen.has(k) || path.length > 40) { if (path.length) lines.push(path); return; }
    const s2 = new Set(seen); s2.add(k);
    for (const s of list) { const cc = new Chess(fen); if (cc.move(s)) walk(cc.fen(), path.concat(s), s2); }
  };
  walk(c.fen(), prefix.slice(), new Set());
  return lines;
}

// What was actually played from each position in your games as this side.
function gameIndex(games, side, maxPly = 30) {
  const idx = new Map();
  for (const g of games) {
    if (g.me !== side) continue; const { keys, sans } = keysOf(g);
    for (let i = 0; i < Math.min(maxPly, sans.length); i++) {
      const k = keys[i]; if (!idx.has(k)) idx.set(k, new Map());
      const e = idx.get(k).get(sans[i]) || { n: 0, pts: 0, scored: 0 }; e.n++; if (g.score != null) { e.pts += g.score; e.scored++; } idx.get(k).set(sans[i], e);
    }
  }
  return idx;
}

// A starting repertoire from what you already play: your most played move at each of your turns,
// and every reply you have met at least twice, down to `depth` plies.
function seedFromGames(games, side, depth = 12, minN = 2, maxReplies = 4) {
  const rep = new Map();
  const add = (k, s) => { if (!rep.has(k)) rep.set(k, []); if (!rep.get(k).includes(s)) rep.get(k).push(s); };
  const walk = (subset, ply) => {
    if (ply >= depth || subset.length < minN) return;
    if ((ply % 2 === 0 ? 'w' : 'b') !== side && ply + 1 >= depth) return;
    const by = new Map();
    for (const g of subset) { const { keys, sans } = keysOf(g); if (ply < sans.length) { const s = sans[ply]; if (!by.has(s)) by.set(s, { key: keys[ply], games: [] }); by.get(s).games.push(g); } }
    const ranked = [...by.entries()].sort((a, b) => b[1].games.length - a[1].games.length);
    const mine = (ply % 2 === 0 ? 'w' : 'b') === side;
    const pick = mine ? ranked.slice(0, 1) : ranked.filter(([, v]) => v.games.length >= minN).slice(0, maxReplies);
    for (const [s, v] of pick) { if (mine && v.games.length < minN) continue; add(v.key, s); walk(v.games, ply + 1); }
  };
  walk(games.filter(g => g.me === side), 0);
  return rep;
}

// Spaced repetition: a clean line comes back 1, 2.5, 6, 16... days later; a miss in 10 minutes.
function schedule(card, mistakes, now) {
  const DAY = 864e5; const c = Object.assign({ iv: 0, n: 0, miss: 0 }, card);
  if (mistakes === 0) { c.iv = c.iv ? Math.min(c.iv * 2.5, 120) : 1; c.n++; c.due = now + c.iv * DAY; }
  else { c.iv = 0; c.miss++; c.due = now + 10 * 60e3; }
  c.last = now; return c;
}
