import re, sys, os
B = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(B, n)).read()
eg = rd('endgame.html')

def scope(css, pre):
    out, i, n = [], 0, len(css)
    def block(s):
        res = []; j = 0
        while j < len(s):
            k = s.find('{', j)
            if k < 0: res.append(s[j:]); break
            sel = s[j:k]
            # find matching brace
            depth, m = 1, k + 1
            while depth:
                if s[m] == '{': depth += 1
                elif s[m] == '}': depth -= 1
                m += 1
            body = s[k+1:m-1]
            st = sel.strip()
            # keep comments before selector
            lead = sel[:len(sel) - len(sel.lstrip())]
            cm = re.match(r'(\s*(?:/\*.*?\*/\s*)*)(.*)', sel, re.S)
            comments, st = cm.group(1), cm.group(2).strip()
            if st.startswith('@media') or st.startswith('@supports'):
                res.append(comments + st + ' {' + block(body) + '}')
            elif st.startswith('@'):
                res.append(comments + st + ' {' + body + '}')
            else:
                parts = []
                for p in st.split(','):
                    p = p.strip()
                    if p.startswith(pre): parts.append(p)
                    else: parts.append(pre + ' ' + p)
                res.append(comments + ', '.join(parts) + ' {' + body + '}')
            j = m
        return '\n'.join(res)
    return block(css)

# --- endgame app pieces ---
markup = eg[:eg.index('<style>')]
markup = re.sub(r'\s*<header class="top">.*?</header>', '', markup, flags=re.S)
markup = markup.replace('<div id="app">', '<div id="app" hidden>', 1)
egcss = eg[eg.index('<style>') + 7: eg.index('</style>')]
egcss = scope(egcss, '#app')
egjs = eg[eg.index('<script>') + 8: eg.rindex('</script>')]

piece = rd('piece.js').replace('var PIECE', 'const PIECE')
app = rd('app.js').replace('/*PIECE*/', piece.strip())
rwcss = scope(rd('rw.css'), '#rw')

head = '''<title>Pawnstorm</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Layout: one shell, five tabs. The opening tabs put the board left and a notebook panel right; Endgames is the original trainer, untouched. */
:root {
  --walnut: #000000; --panel: #141414; --panel-2: #1E1E1E; --maple: #EDEAE2; --dark-sq: #3E6B4C;
  --bone: #F4F3F0; --dim: #8C8C86; --sage: #56C878; --amber: #FF8A1F; --rust: #E5484D; --rule: #2B2B2B;
  --piece-w: #FFFFFF; --piece-w-edge: #111111; --piece-b: #141414; --piece-b-edge: #F0EDE6;
  --board: min(calc(100vw - 32px), 540px);
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  color-scheme: dark;
}
html, body { background: var(--walnut); }
[hidden] { display: none !important; }
body { color: var(--bone); font-family: var(--serif); font-size: 16px; line-height: 1.5; }
.shell { max-width: 1260px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 48px; }
.shell *, .shell *::before, .shell *::after { box-sizing: border-box; }
.shell-top { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 24px; margin-bottom: 18px; }
.shell-top h1 { font-size: 34px; font-weight: 600; margin: 0 0 5px; letter-spacing: .005em; }
.shell-top .tagline { margin: 0; color: var(--dim); font-size: 16.5px; font-style: italic; }
.shell-top .grow { flex: 1; }
.sidepick { display: flex; gap: 4px; }
.sidepick button { font: inherit; font-size: 15px; padding: 7px 16px; cursor: pointer; background: var(--panel); color: var(--dim); border: 0; border-bottom: 2px solid var(--rule); }
.sidepick button:hover { color: var(--bone); }
.sidepick button[aria-pressed="true"] { background: var(--amber); color: #000; border-bottom-color: var(--amber); }
.shell-tabs { display: flex; flex-wrap: wrap; gap: 2px 22px; border-bottom: 1px solid var(--rule); margin-bottom: 26px; }
.shell-tabs button { font: inherit; font-size: 17px; background: none; border: 0; border-bottom: 2px solid transparent; color: var(--dim); padding: 8px 0; margin-bottom: -1px; cursor: pointer; }
.shell-tabs button:hover { color: var(--bone); }
.shell-tabs button[aria-selected="true"] { color: var(--bone); border-bottom-color: var(--amber); }
.shell-tabs .count { font-size: 13px; color: var(--amber); margin-left: 5px; font-variant-numeric: tabular-nums; }
.shell button:focus-visible, .shell a:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.toast { position: fixed; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); background: var(--panel-2); color: var(--bone); box-shadow: 0 0 0 1px var(--rule); padding: 10px 18px; font-family: var(--serif); font-size: 15px; z-index: 30; max-width: calc(100% - 32px); }
#app { padding: 0 !important; min-height: 0 !important; background: none !important; }
</style>
<style>
''' + rwcss + '''
</style>
<style>
''' + egcss + '''
</style>
<style>
''' + rd('polish.css') + '''
</style>
'''
shell = '''
<div class="shell">
  <header class="shell-top">
    <a class="brand" id="brand-home" href="#" title="Back to Today"><span class="logo" aria-hidden="true"><svg viewBox="0 0 100 100"><g><circle cx="50" cy="36" r="12"/><path d="M40 48 h20 l-3 6 c6 9 9 18 10 27 h-34 c1 -9 4 -18 10 -27 z"/><path d="M22 88 h56 v-7 q0 -4 -5 -5 h-46 q-5 1 -5 5 z"/></g></svg></span><div><h1>Pawnstorm</h1><p class="tagline">One push a day. Built from your own games.</p></div></a>
    <div class="grow"></div>
    <div class="sidepick" id="sidepick" role="group" aria-label="Repertoire side">
      <button id="side-w" aria-pressed="true">White</button><button id="side-b" aria-pressed="false">Black</button>
    </div>
  </header>
  <nav class="shell-tabs" role="tablist">
    <button role="tab" id="tab-today" aria-selected="true">Today</button>
    <button role="tab" id="tab-story" aria-selected="false">Your story</button>
    <button role="tab" id="tab-build" aria-selected="false">Build</button>
    <button role="tab" id="tab-gaps" aria-selected="false">Gaps<span class="count" id="count-gaps"></span></button>
    <button role="tab" id="tab-drill" aria-selected="false">Drill<span class="count" id="count-drill"></span></button>
    <button role="tab" id="tab-games" aria-selected="false">Games</button>
    <button role="tab" id="tab-endgames" aria-selected="false">Endgames &amp; structures</button>
    <button role="tab" id="tab-settings" aria-selected="false">Settings</button>
  </nav>
  <div id="rw">
    <div class="today" id="rw-today"></div>
    <div class="story" id="rw-story" hidden></div>
    <div class="settings" id="rw-settings" hidden></div>
    <div class="grid" id="rw-grid">
      <div class="boardwrap"><div class="board" id="rw-board" aria-label="Board"></div><div class="evalbar" id="rw-evalbar" hidden aria-label="Evaluation"><i></i><span></span></div><div class="boardbar" id="rw-bar"></div></div>
      <div class="panel" id="rw-panel"></div>
    </div>
  </div>
''' + markup + '''
</div>
<div class="toast" id="toast" hidden></div>
<script src="https://cdn.jsdelivr.net/npm/chess.js@0.10.3/chess.js"></script>
<script>
''' + rd('logic.js') + rd('planner.js') + '''
</script>
<script>
''' + app.replace('// ---------- Shell ----------', rd('engine.js') + rd('story.js') + rd('progress.js') + rd('threats.js') + '\n// ---------- Shell ----------') + '''
</script>
<script>''' + egjs + '''</script>
'''
out = sys.argv[1]
open(out, 'w').write(head + shell)
print(len(head + shell))
