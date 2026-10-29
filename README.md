# Pawnstorm

A personal chess training app that runs entirely in the browser.

- **Today**: a daily plan run on lichess, built from your own games: puzzles, opening work, endgames, games to play and losses to review, with the reason for each task.
- **Build**: your White and Black opening repertoire as a move tree, with Stockfish and the lichess opening explorer beside the board.
- **Gaps**: replies you have not prepared for, from your own games and from what players at your rating play on lichess, plus an engine check of your own moves.
- **Drill**: spaced-repetition drills of your repertoire lines.
- **Games**: import from chess.com and review any game with the engine.
- **Endgames & structures**: the endgame trainer (tablebase-graded endgames, pawn structure quiz, model lines).

Your data stays in your browser (use Download a backup in Settings). Nothing about you is stored in this repository.

## Phone app and sync

- **Install**: Pawnstorm is a Progressive Web App (`manifest.webmanifest`, `icons/`, `sw.js`). On Android, open it in Chrome and choose Install app; it opens full screen from its own icon and works offline.
- **Sync**: Settings → Sign in with lichess. Sign-in uses lichess OAuth (PKCE, no permissions asked). Your saved data is stored in a Supabase project under your lichess id, and each device merges with it. The lichess API token you paste in Settings is never uploaded.
- **Setting up the backend** (once, for whoever hosts the site): run `supabase/setup.sql` in the Supabase SQL Editor, then put the project URL and publishable key in `CFG` at the top of `src/cloud.js` and rebuild. Both values are public; the tables can only be reached through the functions in that script, which check the lichess sign-in.

## Layout

- `index.html` and `sw.js` are built. `src/` holds the parts they are built from: run `python3 src/site.py` to rebuild.
- `engine/` is [Stockfish.js](https://github.com/nmrugg/stockfish.js) 18 (lite, single-threaded WebAssembly), GPLv3, see `engine/Copying.txt`.
- `vendor/chess.js` is [chess.js](https://github.com/jhlywa/chess.js) 0.10.3, BSD-2-Clause.
