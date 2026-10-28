
// ---------- Your mistakes as puzzles ----------
// Every serious mistake the engine found in your games becomes a "find the better move" position,
// on the same spaced schedule as opening lines: clean solves come back later, misses come back soon.
let MP_CACHE = null;
function mistakePuzzles() {
  let n = 0; try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i).startsWith('reps:review:')) n++; } catch {}
  const key = n + ':' + S.games.length;
  if (MP_CACHE && MP_CACHE.key === key) return MP_CACHE.list;
  const list = [];
  for (const R of storedReviews()) for (const m of reviewMistakes(R)) {
    // Skip positions that were already lost, or still clearly won after the slip: nothing to learn there.
    if (!m.serious || !m.best || m.before < -300 || m.after >= 400) continue;
    list.push({ id: R.g.id + ':' + m.i, g: R.g, i: m.i, sans: R.sans, san: m.san, best: m.best, before: m.before, after: m.after, loss: m.loss, drop: m.drop, reply: R.best[m.i + 1] });
  }
  MP_CACHE = { key, list }; return list;
}
const mpCards = () => LS.get('mp-cards') || {};
function mpDue() {
  const cards = mpCards(), now = Date.now();
  const all = mistakePuzzles();
  const due = all.filter(p => cards[p.id] && cards[p.id].due <= now).sort((a, b) => cards[a.id].due - cards[b.id].due);
  const fresh = all.filter(p => !cards[p.id]).sort((a, b) => gameTime(b.g) - gameTime(a.g) || b.drop - a.drop);
  return due.concat(fresh);
}
const mpSolvedToday = () => Object.values(mpCards()).filter(c => c.last >= dayStart()).length;

function startMp(pool) {
  if (!pool.length) return toast('No mistakes to practise yet. Scan some games first.');
  S.mp = { queue: pool.slice(0, 20), i: 0, done: false, tally: { clean: 0, missed: 0 } };
  loadMp();
}
function loadMp() {
  const d = S.mp; const p = d.queue[d.i];
  if (!p) { d.done = true; render(); return; }
  const game = new Chess(); for (const s of p.sans.slice(0, p.i)) game.move(s);
  Object.assign(d, { p, game, wrong: 0, mistakes: 0, finished: false, checking: false, note: null, played: null });
  S.hint = null; S.sel = null; render();
}
async function mpMove(san) {
  const d = S.mp; const p = d.p; const fen = d.game.fen();
  const good = () => { d.game.move(san); d.played = san; finishMp(san === p.best ? null : san); };
  if (san === p.best) return good();
  if (san !== p.san && engineReady()) {
    // Another move can be just as good. Ask the engine before calling it wrong.
    d.checking = true; d.note = { cls: '', text: `Checking ${san}…` }; render();
    const c = new Chess(fen); c.move(san);
    const a = c.game_over() ? null : await analyze(c.fen(), { depth: 12 });
    d.checking = false; if (S.mp !== d) return;
    const sg = p.g.me === 'w' ? 1 : -1;
    const ev = c.in_checkmate() ? 10000 * sg : a && !a.cancelled ? evalNum(a.lines[0]) : null;
    if (ev != null && sg * clampE(ev) >= p.before - 60) return good();
  }
  d.wrong++; if (d.wrong === 1) d.mistakes++;
  if (d.wrong >= 2) { const m = new Chess(fen).move(p.best, { sloppy: true }); S.hint = m ? { from: m.from, to: m.to } : null; }
  d.note = { cls: 'miss', text: san === p.san ? `That is what you played in the game${p.reply ? `, and ${p.reply} punished it` : ''}. Look again.` : d.wrong >= 2 ? 'Still not it. The highlighted piece has the move.' : 'Not quite. Checks, captures and threats first, for both sides.' };
  render();
}
function showMp() {
  const d = S.mp; const m = new Chess(d.game.fen()).move(d.p.best, { sloppy: true }); if (!m) return;
  S.hint = { from: m.from, to: m.to }; if (!d.wrong) d.mistakes++; d.wrong = Math.max(d.wrong, 2);
  d.note = { cls: 'miss', text: `The move was ${d.p.best}. Play it to continue.` }; render();
}
function finishMp(alt) {
  const d = S.mp; if (d.finished) return; d.finished = true; S.hint = null;
  const cards = mpCards(); cards[d.p.id] = schedule(cards[d.p.id], d.mistakes, Date.now()); LS.set('mp-cards', cards);
  d.tally[d.mistakes ? 'missed' : 'clean']++;
  const iv = cards[d.p.id].iv;
  d.note = d.mistakes ? { cls: 'bad', text: `Found it with help. In the game you played ${d.p.san}. This one comes back in 10 minutes.` }
    : { cls: 'payoff', text: `${alt ? alt + ' works too; the engine’s first choice was ' + d.p.best + '.' : 'That’s it.'} In the game you played ${d.p.san}. Next review in ${iv < 2 ? '1 day' : Math.round(iv) + ' days'}.` };
  refresh(); render();
}
function renderMistakes(panel, bar) {
  const d = S.mp;
  if (!d) {
    const all = mistakePuzzles(), due = mpDue(), cards = mpCards();
    const seen = all.filter(p => cards[p.id]).length;
    panel.append(h('section', { class: 'sec' },
      h('h3', {}, all.length ? (due.length ? `${due.length} position${due.length > 1 ? 's' : ''} to solve` : 'Nothing due right now') : 'No mistakes found yet'),
      h('p', { class: 'ask' }, 'Each one is a position from your own games where you went wrong. Find the move you missed. Solve it cleanly and it comes back in a day, then later each time; miss it and it comes back in 10 minutes.'),
      all.length ? h('div', { class: 'row' }, h('button', { class: 'btn', disabled: !due.length, onclick: () => startMp(due) }, due.length > 20 ? 'Solve the next 20' : 'Start'),
        h('span', { class: 'note' }, `${all.length} from ${new Set(all.map(p => p.g.id)).size} engine-checked games · ${seen} practised`)) : null,
      engineReady() ? h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: all.length ? 'btn quiet tiny' : 'btn', disabled: !!S.batch, onclick: async () => {
        await deepScan(15, (k, n) => { const e = $('#rw-mpscan'); if (e) e.textContent = `Engine checking game ${k} of ${n}…`; }); render(); } }, all.length ? 'Check my latest games' : 'Scan my last 15 games'), h('span', { class: 'note', id: 'rw-mpscan' })) : null));
    if (all.length) {
      const ul = h('ul', { class: 'list' }); const now = Date.now();
      for (const p of due.concat(all.filter(x => !due.includes(x))).slice(0, 30)) {
        const c = cards[p.id];
        ul.append(h('li', { class: 'item' },
          h('button', { class: 'go', onclick: () => startMp([p]) }, h('span', { class: 'meta', style: 'color:var(--bone);font-size:15px' }, `${moveLabel(p.i, p.san)} against ${p.g.opp}`), h('span', { class: 'meta' }, p.g.date)),
          h('span', { class: 'tag ' + (!c ? 'dim' : c.due <= now ? 'warn' : 'ok') }, !c ? 'new' : c.due <= now ? 'due' : 'in ' + Math.max(1, Math.round((c.due - now) / 864e5)) + 'd')));
      }
      panel.append(h('section', { class: 'sec' }, h('h2', {}, 'Your positions'), ul));
    }
    return;
  }
  if (d.done) {
    panel.append(h('section', { class: 'sec' }, h('h3', {}, `${d.tally.clean} found cleanly, ${d.tally.missed} with help`),
      h('p', { class: 'ask' }, d.tally.missed ? 'The ones you missed come back in 10 minutes. Try them again before you stop.' : 'Clean set. These come back in a day or more.'),
      h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'btn', onclick: () => { S.mp = null; render(); } }, 'Back to your positions'))));
    return;
  }
  const p = d.p; const sn = sideName(p.g.me);
  panel.append(h('section', { class: 'sec' },
    h('h2', {}, `Position ${d.i + 1} of ${d.queue.length}`),
    h('p', { class: 'who mine' }, d.finished ? 'Solved.' : `${sn} to play. Find the better move.`),
    h('p', { class: 'note' }, `Move ${Math.floor(p.i / 2) + 1} against ${p.g.opp}${p.g.oppElo ? ' (' + p.g.oppElo + ')' : ''}, ${p.g.date}. Your winning chances here: ${winPct(p.before)}%.`),
    h('p', { class: 'lnote ' + (d.note ? d.note.cls : '') }, d.note ? d.note.text : ''),
    h('div', { class: 'row' },
      d.finished ? h('button', { class: 'btn', onclick: () => { d.i++; loadMp(); } }, d.i + 1 < d.queue.length ? 'Next position' : 'See how you did')
        : h('button', { class: 'btn quiet', onclick: showMp, disabled: d.checking }, 'Show the move'),
      d.finished ? h('button', { class: 'btn quiet', onclick: () => { startReview(p.g); setTimeout(() => { if (S.review) { S.review.idx = p.i; render(); } }, 50); } }, 'Open the game') : null,
      h('button', { class: 'btn quiet', onclick: () => { S.mp = null; S.hint = null; render(); } }, 'Leave'))));
}

// ---------- Progress over time ----------
const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return +d; };
// One row per week for the last n weeks: games, score, rating, accuracy, mistakes, puzzles.
function weeklySeries(n) {
  const games = S.games.filter(g => srcOf(g) === mySite());
  const cls = (D.profile && D.profile.main) || 'rapid';
  const rev = new Map(storedReviews().map(R => [R.g.id, R]));
  const H = LS.get('li-days') || {};
  const w0 = weekStart(Date.now()); const rows = [];
  for (let k = n - 1; k >= 0; k--) {
    const a = new Date(w0); a.setDate(a.getDate() - 7 * k); const b = new Date(a); b.setDate(b.getDate() + 7);
    const gs = games.filter(g => gameTime(g) >= +a && gameTime(g) < +b).sort((x, y) => gameTime(x) - gameTime(y));
    const rated = gs.filter(g => g.cls === cls && g.myElo); const rs = gs.map(g => rev.get(g.id)).filter(Boolean);
    const accs = rs.map(gameAccuracy).filter(x => x != null);
    let pz = 0, pw = 0; for (const d = new Date(a); d < b; d.setDate(d.getDate() + 1)) { const x = H[ymd(d)]; if (x && x.puzzles) { pz += x.puzzles; pw += x.won || 0; } }
    rows.push({ start: +a, label: a.toLocaleDateString('en', { month: 'short', day: 'numeric' }), games: gs.length,
      score: gs.length ? gs.reduce((s, g) => s + g.score, 0) / gs.length : null,
      rating: rated.length ? rated[rated.length - 1].myElo : null,
      accuracy: accs.length ? accs.reduce((s, x) => s + x, 0) / accs.length : null, checked: rs.length,
      mistakes: rs.length ? rs.reduce((s, R) => s + reviewMistakes(R).filter(m => m.serious).length, 0) / rs.length : null,
      puzzles: pz || null, puzzleWin: pz ? pw / pz : null });
  }
  return { rows, cls };
}
// A small single-series chart: line for levels (rating, accuracy), bars for counts. Native tooltips per week.
function weekChart(rows, key, fmt, kind) {
  const W = 320, H = 96, P = 8, B = 18; const n = rows.length; const vals = rows.map(r => r[key]);
  const have = vals.filter(v => v != null);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'wchart'); svg.setAttribute('role', 'img');
  if (!have.length) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="wempty">No data yet</text>`; return svg; }
  let lo = kind === 'bar' ? 0 : Math.min(...have), hi = Math.max(...have); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  if (kind !== 'bar') { const pad = (hi - lo) * 0.15; lo -= pad; hi += pad; }
  const step = (W - 2 * P) / n; const x = i => P + step * (i + 0.5); const y = v => H - B - (v - lo) / (hi - lo) * (H - B - P);
  let s = `<line x1="${P}" x2="${W - P}" y1="${H - B}" y2="${H - B}" class="wbase"/>`;
  [0, Math.floor((n - 1) / 2), n - 1].forEach(i => { s += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle" class="wtick">${rows[i].label}</text>`; });
  if (kind === 'bar') {
    const bw = Math.max(4, step - 6);
    rows.forEach((r, i) => { if (r[key] == null) return; const top = y(r[key]); s += `<rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(1, H - B - top)}" rx="3" class="wbar"><title>Week of ${r.label}: ${fmt(r[key])}</title></rect>`; });
  } else {
    const pts = rows.map((r, i) => r[key] == null ? null : [x(i), y(r[key])]).filter(Boolean);
    if (pts.length > 1) s += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="wline"/>`;
    rows.forEach((r, i) => { if (r[key] == null) return; s += `<circle cx="${x(i)}" cy="${y(r[key])}" r="4" class="wdot"><title>Week of ${r.label}: ${fmt(r[key])}</title></circle><circle cx="${x(i)}" cy="${y(r[key])}" r="11" fill="transparent"><title>Week of ${r.label}: ${fmt(r[key])}</title></circle>`; });
  }
  svg.innerHTML = s; return svg;
}
function progressSection() {
  const { rows, cls } = weeklySeries(12);
  const last = key => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] != null) return rows[i][key]; return null; };
  const firstV = key => { const r = rows.find(r => r[key] != null); return r ? r[key] : null; };
  const delta = (key, fmt, better) => { const a = firstV(key), b = last(key); if (a == null || b == null || fmt(a) === fmt(b) || fmt(Math.abs(b - a)).replace(/[^1-9]/g, '') === '') return ''; const up = b > a; return h('span', { class: 'wdelta ' + ((up === (better === 'up')) ? 'good' : 'bad') }, (up ? '▲ ' : '▼ ') + fmt(Math.abs(b - a))); };
  const tile = (title, key, fmt, kind, better, note) => h('div', { class: 'wtile' },
    h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, h('span', { class: 'note' }, title), delta(key, fmt, better)),
    h('b', { class: 'wnow' }, last(key) != null ? fmt(last(key)) : '–'),
    weekChart(rows, key, fmt, kind), note ? h('span', { class: 'note' }, note) : null);
  const checked = rows.reduce((s, r) => s + r.checked, 0);
  return h('div', { class: 'wgrid' },
    tile(`${cls[0].toUpperCase() + cls.slice(1)} rating`, 'rating', v => String(Math.round(v)), 'line', 'up', 'Your rating at the end of each week.'),
    tile('Accuracy', 'accuracy', v => Math.round(v) + '%', 'line', 'up', checked ? `From ${checked} engine-checked games.` : 'Fills in as games are engine-checked.'),
    tile('Mistakes and blunders a game', 'mistakes', v => v.toFixed(1), 'bar', 'down', 'Lower is better.'),
    tile(onLichess() ? 'Puzzles solved' : 'Games played', onLichess() ? 'puzzles' : 'games', v => String(Math.round(v)), 'bar', 'up', onLichess() ? 'From your lichess puzzle activity.' : 'Link lichess to track puzzles too.'));
}

// ---------- The week in one card ----------
function weekReport(endAt) {
  const end = endAt || Date.now(); const a = weekStart(end - 1); const prev = a - 7 * 864e5;
  const inW = (t, s) => t >= s && t < s + 7 * 864e5;
  // Every game you played counts, on either site; the rating line stays on your main site.
  const games = S.games;
  const cur = games.filter(g => inW(gameTime(g), a)), old = games.filter(g => inW(gameTime(g), prev));
  const mine = gs => gs.filter(g => srcOf(g) === mySite());
  const cls = (D.profile && D.profile.main) || 'rapid';
  const elo = (gs, lastOne) => { const r = gs.filter(g => g.cls === cls && g.myElo).sort((x, y) => gameTime(x) - gameTime(y)); return r.length ? r[lastOne ? r.length - 1 : 0].myElo : null; };
  const rev = new Map(storedReviews().map(R => [R.g.id, R]));
  const acc = gs => { const xs = gs.map(g => rev.get(g.id)).filter(Boolean).map(gameAccuracy).filter(x => x != null); return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null; };
  const H = LS.get('li-days') || {}; let pz = 0, pw = 0;
  for (let t = a; t < a + 7 * 864e5; t += 864e5) { const x = H[ymd(new Date(t))]; if (x && x.puzzles) { pz += x.puzzles; pw += x.won || 0; } }
  let days = 0, planned = 0; for (let t = a; t < Math.min(end, a + 7 * 864e5); t += 864e5) { const r = S.plans[ymd(new Date(t))]; if (r && r.plan) { const ok = ratio(r) >= 0.6; if (ok || t + 864e5 <= Date.now()) { planned++; if (ok) days++; } } }
  const mpc = Object.values(mpCards()).filter(c => inW(c.last || 0, a)).length;
  const eg = egProgress().seen || {}; const egn = Object.values(eg).filter(r => inW(r.lastWin || 0, a)).length;
  const W = cur.filter(g => g.score === 1).length, Dn = cur.filter(g => g.score === 0.5).length, L = cur.length - W - Dn;
  const liveR = mySite() === 'lichess' && S.li && S.li.ratings && S.li.ratings[cls];
  const r0 = elo(mine(old).length ? mine(old) : mine(cur), true) || elo(mine(cur), false), r1 = liveR || elo(mine(cur), true);
  const aCur = acc(cur), aOld = acc(old);
  const good = [], work = [];
  if (r0 && r1 && r1 > r0) good.push(`Your ${cls} rating went up ${r1 - r0}, to ${r1}.`); else if (r0 && r1 && r1 < r0) work.push(`Your ${cls} rating dropped ${r0 - r1}, to ${r1}.`);
  if (cur.length) (W >= L ? good : work).push(`You played ${cur.length} game${cur.length > 1 ? 's' : ''}: ${W} won, ${Dn} drawn, ${L} lost.`); else work.push('No games this week.');
  if (aCur != null && aOld != null) Math.round(aCur) === Math.round(aOld) ? good.push(`Accuracy ${Math.round(aCur)}%, the same as the week before.`) : (aCur > aOld ? good : work).push(`Accuracy ${Math.round(aCur)}%, ${aCur > aOld ? 'up' : 'down'} from ${Math.round(aOld)}% the week before.`);
  else if (aCur != null) good.push(`Accuracy ${Math.round(aCur)}% in the games the engine checked.`);
  if (pz) (pw / pz >= 0.6 ? good : work).push(`${pz} puzzles, ${Math.round(100 * pw / pz)}% solved.`);
  if (planned) (days >= Math.ceil(planned * 0.6) ? good : work).push(`You finished the plan on ${days} of ${planned} days.`);
  if (mpc) good.push(`You practised ${mpc} of your own mistakes.`);
  if (egn) good.push(`You solved ${egn} endgame chapter${egn > 1 ? 's' : ''}.`);
  const next = D.weak && D.weak[0] ? D.weak[0].text : null;
  const byDay = [];
  for (let t = a; t < Math.min(end, a + 7 * 864e5); t += 864e5) { const k = ymd(new Date(t)); const gs = cur.filter(g => ymd(new Date(gameTime(g))) === k); const x = H[k] || {};
    byDay.push({ label: new Date(t).toLocaleDateString('en', { weekday: 'short' }), games: gs.length, puzzles: x.puzzles || 0 }); }
  return { from: a, good, work, next, games: cur.length, byDay };
}
function weekCard(title) {
  const R = weekReport();
  return h('section', { class: 'review weekcard' },
    h('h3', {}, title || 'Your week'), h('p', { class: 'note', style: 'margin-top:-4px' }, 'Since ' + new Date(R.from).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }) + '.'),
    R.good.length ? [h('h2', { class: 'good' }, 'Went well'), h('ul', {}, R.good.map(x => h('li', {}, x)))] : null,
    R.work.length ? [h('h2', { class: 'bad' }, 'To work on'), h('ul', {}, R.work.map(x => h('li', {}, x)))] : null,
    h('div', { class: 'wkdays' }, R.byDay.map(d => h('div', { class: 'wkday' + (d.games || d.puzzles ? '' : ' off') }, h('b', {}, d.label), h('span', {}, d.games ? `${d.games} game${d.games > 1 ? 's' : ''}` : 'no games'), h('span', {}, d.puzzles ? `${d.puzzles} puzzles` : 'no puzzles')))),
    R.next ? h('p', { class: 'lede', style: 'margin:6px 0 0' }, 'Next week leans on this: ' + R.next) : null);
}
