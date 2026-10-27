# Chess Reps

A personal chess training app that runs entirely in the browser.

- **Today**: a daily plan built from your own chess.com games: puzzles, opening work, endgames, games to play and losses to review, with the reason for each task.
- **Build**: your White and Black opening repertoire as a move tree, with Stockfish and the lichess opening explorer beside the board.
- **Gaps**: replies you have not prepared for, from your own games and from what players at your rating play on lichess, plus an engine check of your own moves.
- **Drill**: spaced-repetition drills of your repertoire lines.
- **Games**: import from chess.com and review any game with the engine.
- **Endgames & structures**: the Endgame reps trainer (tablebase-graded endgames, pawn structure quiz, model lines).

Your data stays in your browser (use Download a backup on the Games tab). Nothing about you is stored in this repository.

## Layout

- `index.html` is the built app. `src/` holds the parts it is built from: run `python3 src/site.py` to rebuild.
- `engine/` is [Stockfish.js](https://github.com/nmrugg/stockfish.js) 18 (lite, single-threaded WebAssembly), GPLv3, see `engine/Copying.txt`.
- `vendor/chess.js` is [chess.js](https://github.com/jhlywa/chess.js) 0.10.3, BSD-2-Clause.
