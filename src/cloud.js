// ---------- Phone install + cloud sync ----------
// Sign in with lichess (OAuth with PKCE, no permissions asked) proves who you are; your data is kept in
// Supabase under your lichess id (see supabase/setup.sql). Every saved reps:* key and the endgame progress
// sync, newest change wins per key. The first sign-in on a device merges what is already here with the cloud.
// The lichess API token in Settings never leaves this browser: it is blanked before upload.
const PawnCloud = (() => {
  const CFG = { url: '', key: '' }; // Supabase project URL + publishable (anon) key: both are public.
  const LI = 'https://lichess.org', CLIENT = 'pawnstorm';
  const AUTH = 'ps-auth', META = 'ps-meta', STATE = 'ps-state', OAUTH = 'ps-oauth'; // device-only keys, never synced
  const SETTINGS = 'reps:settings/main';
  const synced = k => k === 'endgame-reps-progress' || (k.startsWith('reps:') && !/^reps:(explorer|lastSync|engcheck)$/.test(k));
  const configured = !!(CFG.url && CFG.key);

  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { rawSet.call(localStorage, k, JSON.stringify(v)); } catch {} };
  let auth = read(AUTH), meta = read(META) || {}, state = read(STATE) || {};
  const st = { busy: false, error: '', last: state.last || 0 };
  const emit = () => window.dispatchEvent(new Event('pawncloud'));

  // Every local change to a synced key is stamped, then pushed a few seconds later.
  let applying = false, pushT = 0;
  const touch = k => { meta[k] = Date.now(); write(META, meta); if (auth) { clearTimeout(pushT); pushT = setTimeout(sync, 3000); } };
  Storage.prototype.setItem = function (k, v) { rawSet.call(this, k, v); if (this === localStorage && !applying && synced(String(k))) touch(String(k)); };
  Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === localStorage && !applying && synced(String(k))) touch(String(k)); };

  // Values on their way out / in. Settings travel without the lichess token; the local token is kept.
  const outVal = k => {
    const v = localStorage.getItem(k);
    if (k !== SETTINGS || v == null) return v;
    try { const o = JSON.parse(v); o.lichessToken = ''; return JSON.stringify(o); } catch { return v; }
  };
  const applyLocal = (k, v) => {
    if (k === SETTINGS && v != null) {
      try { const o = JSON.parse(v), mine = read(SETTINGS); o.lichessToken = (mine && mine.lichessToken) || ''; v = JSON.stringify(o); } catch {}
    }
    applying = true;
    try { if (v == null) rawRemove.call(localStorage, k); else rawSet.call(localStorage, k, v); } catch {} finally { applying = false; }
  };

  // Supabase RPC
  async function rpc(fn, body) {
    const headers = { apikey: CFG.key, 'Content-Type': 'application/json' };
    if (CFG.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + CFG.key; // legacy anon key
    const r = await fetch(`${CFG.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch {}
    if (!r.ok) { const e = new Error((j && j.message) || `Sync failed (${r.status})`); e.auth = /sign in with lichess/i.test(e.message); throw e; }
    return j;
  }

  // Push stamped changes, then pull what other devices changed since last time.
  let running = null, again = false;
  function sync() {
    if (!auth || !configured) return Promise.resolve(false);
    if (running) { again = true; return running; }
    clearTimeout(pushT);
    st.busy = true; emit();
    running = (async () => {
      let changed = false;
      try {
        do {
          again = false;
          await push();
          changed = (await pull()) || changed;
        } while (again);
        st.error = ''; st.last = state.last = Date.now(); write(STATE, state);
      } catch (e) {
        st.error = e.auth ? 'Your lichess sign-in ran out. Sign in again to keep syncing.' : navigator.onLine === false ? 'Offline: changes will sync when you are back online.' : (e.message || 'Sync failed');
        if (e.auth) forget();
      } finally { st.busy = false; running = null; emit(); }
      return changed;
    })();
    return running;
  }
  async function push() {
    const pushed = state.pushed || (state.pushed = {});
    const dirty = Object.keys(meta).filter(k => meta[k] > (pushed[k] || 0));
    let batch = [], size = 0;
    const flush = async () => {
      if (!batch.length) return;
      await rpc('pawnstorm_push', { tok: auth.token, rows: batch });
      for (const r of batch) pushed[r.k] = r.ts;
      write(STATE, state); batch = []; size = 0;
    };
    for (const k of dirty) {
      const v = outVal(k), n = (v || '').length;
      if (batch.length && (batch.length >= 100 || size + n > 3e6)) await flush();
      batch.push({ k, v, ts: meta[k] }); size += n;
    }
    await flush();
  }
  async function pull(since = state.since || 0) {
    const rows = await rpc('pawnstorm_pull', { tok: auth.token, since }) || [];
    let changed = false;
    for (const r of rows) {
      if (r.changed > (meta[r.key] || 0)) { applyLocal(r.key, r.val); meta[r.key] = r.changed; (state.pushed || (state.pushed = {}))[r.key] = r.changed; changed = true; }
      state.since = Math.max(state.since || 0, r.pos);
    }
    write(META, meta); write(STATE, state);
    return changed;
  }

  // First sign-in on this device: keep both sides. Maps are merged two levels deep (the cloud wins a clash),
  // saved opening lines are unioned, everything else takes the cloud copy when there is one.
  const plain = x => x && typeof x === 'object' && !Array.isArray(x);
  const EDGES = /^reps:(rep\/white|rep\/black|draft-w|draft-b)$/;
  function mergeVal(k, cloud, local) {
    const union = (a, b) => { const seen = new Set(a.map(x => JSON.stringify(x))); return a.concat(b.filter(x => !seen.has(JSON.stringify(x)))); };
    if (EDGES.test(k)) {
      if (Array.isArray(cloud) && Array.isArray(local)) return union(cloud, local);
      if (plain(cloud) && plain(local) && Array.isArray(cloud.edges) && Array.isArray(local.edges)) return Object.assign({}, local, cloud, { edges: union(cloud.edges, local.edges) });
    }
    const merge = (a, b, d) => {
      if (a == null) return b;
      if (b == null || !plain(a) || !plain(b) || d <= 0) return a;
      const o = Object.assign({}, b); for (const x of Object.keys(a)) o[x] = x in b ? merge(a[x], b[x], d - 1) : a[x]; return o;
    };
    return merge(cloud, local, 2);
  }
  async function firstMerge() {
    const rows = await rpc('pawnstorm_pull', { tok: auth.token, since: 0 }) || [];
    const cloud = new Map(rows.map(r => [r.key, r]));
    const now = Date.now(); meta = {}; state = { since: 0, pushed: {}, user: auth.user };
    const parse = s => { try { return JSON.parse(s); } catch { return s; } };
    const locals = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (synced(k)) locals.push(k); }
    for (const k of locals) {
      const c = cloud.get(k), lv = localStorage.getItem(k);
      if (!c || c.val == null) { meta[k] = now; continue; }                       // only here: upload it
      if (lv === c.val) { meta[k] = state.pushed[k] = c.changed; continue; }
      const m = mergeVal(k, parse(c.val), parse(lv)), mv = typeof m === 'string' ? m : JSON.stringify(m);
      applyLocal(k, mv);
      if (outVal(k) === c.val) meta[k] = state.pushed[k] = c.changed; else meta[k] = now;
    }
    for (const [k, c] of cloud) if (!locals.includes(k)) { applyLocal(k, c.val); meta[k] = state.pushed[k] = c.changed; }
    for (const r of rows) state.since = Math.max(state.since, r.pos);
    write(META, meta); write(STATE, state);
    await push();
  }

  // ---- lichess sign-in (PKCE) ----
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const back = () => location.origin + location.pathname;
  async function signIn() {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48))), stateId = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    write(OAUTH, { verifier, state: stateId, at: Date.now() });
    const q = new URLSearchParams({ response_type: 'code', client_id: CLIENT, redirect_uri: back(), code_challenge_method: 'S256', code_challenge: challenge, state: stateId });
    location.assign(`${LI}/oauth?${q}`);
  }
  async function finishSignIn(q) {
    const saved = read(OAUTH); rawRemove.call(localStorage, OAUTH);
    history.replaceState(null, '', back() + location.hash);
    if (q.get('error')) throw new Error(q.get('error') === 'access_denied' ? 'Sign-in cancelled.' : 'lichess sign-in failed.');
    if (!saved || saved.state !== q.get('state')) throw new Error('That sign-in link is out of date. Try again.');
    const r = await fetch(`${LI}/api/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code: q.get('code'), code_verifier: saved.verifier, redirect_uri: back(), client_id: CLIENT }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error('lichess did not accept the sign-in. Try again.');
    const token = j.access_token;
    const acct = await fetch(`${LI}/api/account`, { headers: { Authorization: 'Bearer ' + token } }).then(x => x.json()).catch(() => ({}));
    const id = await rpc('pawnstorm_whoami', { tok: token });
    auth = { token, user: acct.username || id, id, expires: j.expires_in ? Date.now() + j.expires_in * 1000 : 0 };
    write(AUTH, auth);
    if (state.user !== id) await firstMerge(); else await sync();
    // A fresh device: link the signed-in lichess account for the daily plan.
    const set = read(SETTINGS) || {};
    if (!set.lichessUser) { set.lichessUser = auth.user; localStorage.setItem(SETTINGS, JSON.stringify(set)); await sync(); }
    st.last = state.last = Date.now(); write(STATE, state);
    return true;
  }
  function forget() { auth = null; rawRemove.call(localStorage, AUTH); state = { since: 0, pushed: {} }; write(STATE, state); meta = {}; write(META, meta); }
  async function signOut() {
    const tok = auth && auth.token; forget(); emit();
    if (!tok) return;
    await Promise.allSettled([rpc('pawnstorm_signout', { tok }), fetch(`${LI}/api/token`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } })]);
  }
  async function deleteCloud() {
    if (!auth) return;
    await rpc('pawnstorm_delete_all', { tok: auth.token });
    await signOut();
  }

  // ---- start: finish a sign-in, or pull before the app draws (at most 3 s) ----
  let note = '';
  const q = new URLSearchParams(location.search);
  let ready;
  if (configured && (q.has('code') || q.has('error')) && localStorage.getItem(OAUTH)) {
    ready = finishSignIn(q).then(() => { note = `Signed in as ${auth.user}. Your data now syncs.`; }, e => { note = e.message; st.error = e.message; emit(); });
  } else if (auth && configured) {
    const first = sync();
    ready = Promise.race([first, new Promise(r => setTimeout(r, 3000))]);
    // A pull that lands after the app has drawn reloads it, unless you have started using the page.
    first.then(changed => { if (changed && booted) refreshFromCloud(); });
  } else ready = Promise.resolve();
  let booted = false, touched = false;
  ready.then(() => { booted = true; if (note && typeof toast === 'function') setTimeout(() => toast(note), 300); });
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { touched = true; }, true));
  function refreshFromCloud() {
    if (!touched) return location.reload();
    if (typeof toast === 'function') toast('Updated from your other device. Reload to see it.');
  }
  document.addEventListener('visibilitychange', () => {
    if (!auth) return;
    if (document.visibilityState === 'hidden') { sync(); return; }
    touched = false;
    if (Date.now() - st.last > 30e3) sync().then(changed => { if (changed) refreshFromCloud(); });
  });
  setInterval(() => { if (auth && document.visibilityState === 'visible') sync().then(changed => { if (changed) refreshFromCloud(); }); }, 5 * 60e3);
  addEventListener('online', () => { if (auth) sync(); });

  // ---- install on this device ----
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; emit(); });
  addEventListener('appinstalled', () => { installEvt = null; emit(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  async function install() { if (!installEvt) return false; installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; emit(); return !!r && r.outcome === 'accepted'; }

  return {
    ready, signIn, signOut, deleteCloud, install, sync: () => sync().then(changed => { if (changed) refreshFromCloud(); return changed; }),
    status: () => ({ configured, user: auth && auth.user, busy: st.busy, error: st.error, last: st.last, canInstall: !!installEvt, installed: standalone() }),
  };
})();
