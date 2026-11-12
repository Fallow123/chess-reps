/* ---------- The endgame course ----------
   Eight stages from the basic mates to master-level technique. Each lesson is a
   short reading with diagrams, the rules to remember, and practice:
     drill  a ladder chapter: a fresh tablebase position every time
     tb     a fixed position played out against the tablebase (7 men or fewer)
     line   a scripted line with an answer per move (positions too big for the tablebase,
            every move checked with Stockfish when the course was written)
     quiz   a question, with or without a diagram
   Quiz answers are always the first option; the trainer shuffles them.
   Positions marked tb are graded live by the lichess tablebase, so the trainer never
   relies on these notes for the result.                                              */
var EG_COURSE = [
  {
    id: "s1", title: "Foundations", level: 2,
    sub: "The king as a fighting piece, the two mates every player must own, and the square of the pawn.",
    lessons: [
      {
        id: "c-king", title: "The endgame thinks differently", mins: 8,
        text: [
          "When the queens and most pieces leave the board, the values you learned in the middlegame shift. The <b>king</b> stops being a liability and becomes a strong piece: worth roughly three or four pawns in fighting power. It attacks pawns, escorts its own and blocks enemy ones. A king left on g1 while the opponent's walks to the centre is often the whole difference between a win and a loss.",
          "<b>Pawns</b> grow in value because each one is a potential queen. A <b>passed pawn</b> (no enemy pawn in front of it or on a neighbouring file) is the most important thing on the board in most endings. The further advanced, the stronger, and it ties down enemy pieces just by existing.",
          "<b>Activity</b> beats material more often than in any other phase. An active rook on the seventh rank is often worth a pawn. A passive piece that only defends will eventually lose to an opponent who has two targets.",
          "Finally, <b>trades</b> follow simple rules. When you are ahead in material, trade pieces, not pawns: every piece trade makes your extra pawn bigger in proportion, and fewer pawns give the defender more drawing chances. When you are behind, do the opposite: trade pawns, keep pieces, and aim for one of the known drawn endings this course teaches."
        ],
        diagrams: [
          { fen: "8/pp3pk1/6p1/3K4/8/6P1/PP3P2/8", cap: "Equal pawns, but White's king is in the centre and Black's is not. White is winning: the king walks to c7 and eats the queenside pawns before Black's king can help.", hl: ["d5"] }
        ],
        rules: [
          "Bring the king to the centre as soon as the queens are off.",
          "Passed pawns must be pushed, and enemy passed pawns must be blockaded.",
          "Ahead in material: trade pieces, keep pawns. Behind: trade pawns, keep pieces.",
          "An active piece is worth more than a passive extra pawn."
        ],
        practice: [
          { t: "quiz", ask: "You are a clean pawn up in a rook ending. Which trade helps you most?",
            options: ["Trading the rooks", "Trading a pair of pawns", "Neither: keep everything on"],
            why: "With rooks gone you are in a pawn ending a pawn up, which is usually a simple win. Trading pawns does the opposite: every pair that disappears brings the defender closer to a known draw." },
          { t: "quiz", fen: "8/pp3pk1/6p1/3K4/8/6P1/PP3P2/8", ask: "Pawns are equal. Who stands better, and why?",
            options: ["White: the centralised king can attack on either wing", "Black: the kingside pawns are safer", "Nobody: equal pawns means a draw"],
            why: "In the endgame the king is a fighting piece. White's king reaches c7 and b7 in three moves and Black's king, four files away, cannot get back in time. Stockfish rates this as winning for White." },
          { t: "quiz", ask: "You are a pawn down with rooks and two minor pieces each still on the board. What should you aim for?",
            options: ["Trade pawns and keep pieces on", "Trade all the pieces as fast as possible", "Avoid every trade"],
            why: "The fewer pawns remain, the more drawing chances the defender has (one pawn up with no pawns on the other wing is often a draw). Trading pieces only makes the extra pawn count for more." },
          { t: "quiz", ask: "Which of these pawns is a passed pawn?",
            options: ["A white pawn on d5 with no black pawns on the c-, d- or e-files ahead of it", "A white pawn on d5 with a black pawn on e6", "A white pawn on d5 with a black pawn on d6"],
            why: "A pawn is passed when no enemy pawn can block it or capture it on the way to queening: none ahead of it on its own file or on either neighbouring file." }
        ]
      },
      {
        id: "c-queenmate", title: "Mate with the queen", mins: 10,
        text: [
          "King and queen against king is the first ending to own completely. The method is the <b>box</b>: place the queen a knight's move away from the enemy king. That takes away a rectangle of squares and the king can only move inside it. Every time he steps back, follow with the queen, keeping the knight's-move distance, and the box shrinks.",
          "Once he is on the edge, stop. The queen has done her job. Now bring your own king up until it stands two squares in front of his (or diagonally adjacent to the corner square), and mate with the queen on the edge or next to his king, protected by yours.",
          "The one way to throw it away is <b>stalemate</b>. With the enemy king in a corner and your queen a knight's move away, he has no moves at all. If it is his turn and he is not in check, the game is drawn. Whenever his king has only one or two squares, count them before every move."
        ],
        diagrams: [
          { fen: "8/8/8/3k4/8/8/2Q5/4K3", cap: "Qc3 puts the queen a knight's move from the king. Black is boxed into the d- to h-files above the third rank, and each time the king steps back, the queen follows and the box shrinks.", hl: ["c2"] },
          { fen: "k7/8/1Q6/8/8/8/8/6K1", cap: "Black's king has no squares. With Black to move it would be stalemate. With White to move, any king move is stalemate too: the queen must give the king air first.", hl: ["a8", "b6"] }
        ],
        rules: [
          "Keep the queen a knight's move from his king and the box shrinks by itself.",
          "Once he is on the edge, stop with the queen and bring the king.",
          "Before every move near the end, check he still has a legal move.",
          "Mate usually takes under 10 moves from any position."
        ],
        practice: [
          { t: "tb", fen: "k7/8/1Q6/8/8/8/8/6K1 w - - 0 1", goal: "mate",
            prompt: "White to play. One wrong move is stalemate. Give him room, then mate.",
            advice: "Every king move leaves him with no legal moves. Move the queen so he has a square, then bring the king." },
          { t: "drill", ch: "queenmate" },
          { t: "drill", ch: "queenmate" },
          { t: "quiz", fen: "7k/8/6Q1/8/8/8/8/K7", ask: "Black to move. What is the result?",
            options: ["Stalemate: a draw", "White wins after any move", "Black is in check"],
            why: "The queen on g6 covers g7, g8, h7 and the king on h8 has no other square. He is not in check, so it is stalemate. The queen came one step too close." }
        ]
      },
      {
        id: "c-rookmate", title: "Mate with the rook", mins: 12,
        text: [
          "The rook mate takes longer and teaches more. The rook cannot shrink the box on its own: it cuts the enemy king off along a rank or file, and your <b>king</b> must come up to guard the rook and take the squares beside it.",
          "The method: cut him off, bring your king up so it stands in <b>opposition</b> to his (same file or rank, one square between them), then check with the rook. The check pushes him back one line. If the kings are not opposite each other, make a <b>waiting move</b> with the rook along the line it is cutting, so he has to step into opposition himself.",
          "Keep your rook far from his king so he cannot attack it. If he does attack it, swing it to the far side of the board along the same line."
        ],
        diagrams: [
          { fen: "4k3/8/4K3/8/8/8/8/R7", cap: "Kings in opposition on the e-file, rook ready. Ra8 is mate: the king takes d7, e7 and f7, the rook the whole eighth rank.", hl: ["e6", "e8"], arrows: [["a1", "a8"]] },
          { fen: "5k2/8/4K3/8/8/8/8/3R4", cap: "Not in opposition. A waiting rook move like Rd7 would force him to choose; here even quicker, Rg1 takes the g-file and Rg8 mate follows.", hl: ["f8"] }
        ],
        rules: [
          "Cut him off with the rook, bring the king up behind it.",
          "Check only when the kings stand in opposition.",
          "Not in opposition? Spend a waiting move with the rook along its line.",
          "Rook attacked? Move it to the far end of the same line, not closer."
        ],
        practice: [
          { t: "tb", fen: "5k2/8/4K3/8/8/8/8/3R4 w - - 0 1", goal: "mate",
            prompt: "White to play. Mate as fast as you can.",
            advice: "His king is on the edge and yours is close. Take a file away from him so he has nowhere but back into opposition." },
          { t: "drill", ch: "rookmate" },
          { t: "drill", ch: "rookmate" },
          { t: "quiz", fen: "3k4/8/2K5/8/8/8/8/7R", ask: "White to move. What is the quickest win?",
            options: ["Re1: with the e-file gone, Kc8 is forced and Re8 is mate", "Rh8+ at once", "Rh7, a waiting move"],
            why: "His king has only c8, e7 and e8. Re1 takes the e-file, so he must step to c8 into opposition, and Re8 mates. Rh8+ lets him out through e7, and Rh7 works but takes several moves longer." }
        ]
      },
      {
        id: "c-square", title: "The square of the pawn", mins: 8,
        text: [
          "Can the king catch a passed pawn on its own? You never need to count moves. Draw a <b>square</b> from the pawn to its queening square and across: for a pawn on a4, the square runs a4-e4-e8-a8. If the defending king can step inside the square on his move, he catches the pawn. If not, it queens.",
          "Two details. A pawn still on its starting rank can jump two squares, so draw the square from where it would land. And other pieces or your own pawns can block the king's diagonal walk: the square tells you about distance, not about obstacles.",
          "The square is also a counting tool for races: when both sides have runners, compare how many moves each needs and remember that a new queen can check or capture the other."
        ],
        diagrams: [
          { fen: "8/8/8/8/P7/5k2/8/7K", cap: "Black to move. The square of the a4-pawn is a4-e4-e8-a8. Ke4 steps inside and catches the pawn. Any other move is too slow.", hl: ["a4", "e4", "e8", "a8"] }
        ],
        rules: [
          "Square from the pawn to the eighth rank: inside it on your move, you catch it.",
          "A pawn on its first move can jump two: draw the square from where it lands.",
          "The square counts distance only. Check the path is clear."
        ],
        practice: [
          { t: "tb", fen: "8/8/8/8/P7/5k2/8/7K b - - 0 1", goal: "draw",
            prompt: "Black to play. Get into the square and catch the pawn.",
            advice: "Draw the square from a4 to a8 and across. Only one king move puts you inside it." },
          { t: "quiz", fen: "8/8/8/8/P7/8/5k2/7K", ask: "Black to move. Does the king catch the pawn?",
            options: ["No: no move reaches the square a4-e4-e8-a8", "Yes, with Ke3", "Yes, with Kf3"],
            why: "From f2 the king can reach e3 at best, and e3 is outside the square (it starts on the fourth rank). After a5 the square shrinks again and the pawn runs home." },
          { t: "drill", ch: "square" },
          { t: "drill", ch: "square" }
        ]
      }
    ]
  },

  {
    id: "s2", title: "King and pawn", level: 2,
    sub: "Opposition, key squares, winning and holding the basic pawn ending, and the rook-pawn exception.",
    lessons: [
      {
        id: "c-opposition", title: "The opposition", mins: 10,
        text: [
          "When two kings face each other on a file with one square between them, neither can step forward. The side that does <b>not</b> have to move is said to <b>have the opposition</b>: the other king must give way, and that is how a defending king gets pushed aside, or how an attacking one gets stopped.",
          "Opposition is a tool, not a goal in itself. In king and pawn endings it decides whether the attacking king reaches the squares in front of its pawn. For the defender, taking the opposition is usually the only way to hold.",
          "A pawn move can change who has the opposition. A spare pawn tempo is often decisive: if the attacker can push a pawn instead of moving the king, the obligation to move passes to the defender."
        ],
        diagrams: [
          { fen: "4k3/8/4K3/4P3/8/8/8/8", cap: "Kings in opposition. With Black to move, Black must give way and White wins. With White to move, it is a draw: White cannot make progress.", hl: ["e6", "e8"] },
          { fen: "4k3/8/8/4K3/4P3/8/8/8", cap: "Black to move. Ke7! takes the opposition and holds. After Kd7 or Kf7 the white king goes to f6 or d6 and wins.", hl: ["e7"] }
        ],
        rules: [
          "Kings on one line with one square between: the side NOT to move has the opposition.",
          "Defender: take the opposition in front of the pawn.",
          "A spare pawn move hands the obligation to move back to the other side."
        ],
        practice: [
          { t: "tb", fen: "4k3/8/8/4K3/4P3/8/8/8 b - - 0 1", goal: "draw",
            prompt: "Black to play. One move holds the draw. Find it, then keep it.",
            advice: "If the white king reaches d6, e6 or f6, the pawn queens. Face his king so he cannot step forward." },
          { t: "tb", fen: "8/8/8/2k5/8/8/2KP4/8 w - - 0 1", goal: "promote",
            prompt: "White to play. Only one move wins. Win it.",
            advice: "Take the opposition in front of your pawn. Your pawn has a spare tempo later if you need it." },
          { t: "drill", ch: "opposition" },
          { t: "quiz", fen: "4k3/8/4K3/4P3/8/8/8/8", ask: "White to move. What is the result with best play?",
            options: ["A draw: White has to give up the opposition", "White wins with e6", "White wins with Kd6"],
            why: "Every white king move lets Black take the opposition (Kd6 Kd8, Kf6 Kf8), and pushing e6 early ends in stalemate or a lost pawn. Give Black the move instead and White wins." }
        ]
      },
      {
        id: "c-keysquares", title: "Key squares", mins: 10,
        text: [
          "Instead of calculating, look for the <b>key squares</b>: squares where the attacking king guarantees promotion whoever is to move. For a pawn on the second, third or fourth rank, the key squares are the three squares <b>two ranks in front</b> of it. For a pawn on d4 they are c6, d6 and e6.",
          "Once the pawn has crossed into the opponent's half (fifth or sixth rank), the key squares are the three squares in front of it and the three squares two ranks in front. For a pawn on d5: c6, d6, e6 and c7, d7, e7.",
          "So the attacker walks the king toward the key squares and the pawn stays back as a spare tempo; the defender's whole job is to keep the attacking king away from them. The king leads. The pawn follows."
        ],
        diagrams: [
          { fen: "8/8/8/8/3P4/8/8/8", cap: "Pawn on d4: the key squares are c6, d6 and e6.", hl: ["c6", "d6", "e6"] },
          { fen: "8/8/3k4/8/8/3K4/3P4/8", cap: "White to move wins by heading for c4, d4 or e4, the key squares of the d2-pawn. Pushing d4 first only draws.", hl: ["c4", "d4", "e4"] }
        ],
        rules: [
          "Pawn on ranks 2 to 4: key squares are the three squares two ranks ahead.",
          "Pawn on ranks 5 to 6: the three squares in front and the three two ahead.",
          "Get the king to a key square first. Push the pawn later.",
          "Rook pawns are different: see the rook pawn lesson."
        ],
        practice: [
          { t: "tb", fen: "8/8/3k4/8/8/3K4/3P4/8 w - - 0 1", goal: "promote",
            prompt: "White to play. Reach a key square and queen the pawn.",
            advice: "The d2-pawn's key squares are c4, d4 and e4. Your king is one step away from all three." },
          { t: "quiz", ask: "A white pawn stands on d4. Which are its key squares?",
            options: ["c6, d6 and e6", "c5, d5 and e5", "c7, d7 and e7"],
            why: "For a pawn on the second to fourth rank, the key squares are the three squares two ranks ahead of it." },
          { t: "drill", ch: "keysquares" },
          { t: "drill", ch: "keysquares" }
        ]
      },
      {
        id: "c-kpwin", title: "Winning with king and pawn", mins: 10,
        text: [
          "Putting the last two lessons together gives the complete method for winning with king and pawn against king. Walk the king in front of the pawn, take the opposition, and reach a key square. Only then advance the pawn, keeping the king ahead of it.",
          "Two rules save calculation. If your king stands on the <b>sixth rank in front of its pawn</b> (pawn anywhere behind it, not a rook pawn), the position is won whoever is to move. And if your king is two squares in front of the pawn, you also win whoever is to move.",
          "The classic mistake is pushing the pawn too early. A pawn that runs ahead of its king becomes a target, and the defending king sits in front of it for a draw."
        ],
        diagrams: [
          { fen: "4k3/8/3K4/4P3/8/8/8/8", cap: "White to move. Only Ke6 wins: the king steps in front of its pawn with the opposition. Pushing e6 or stepping aside lets Black hold.", hl: ["e6"] }
        ],
        rules: [
          "King in front of the pawn, then the opposition, then push.",
          "King on the sixth in front of its pawn wins (except rook pawns).",
          "Push the pawn only when the king has a key square."
        ],
        practice: [
          { t: "tb", fen: "4k3/8/3K4/4P3/8/8/8/8 w - - 0 1", goal: "promote",
            prompt: "White to play. Only one move wins. Then finish it.",
            advice: "The king belongs in front of the pawn, facing his. Leave the pawn alone for now." },
          { t: "drill", ch: "pawnwin" },
          { t: "drill", ch: "pawnwin" }
        ]
      },
      {
        id: "c-kpdraw", title: "Holding king against king and pawn", mins: 10,
        text: [
          "The defender's recipe is the mirror image. Stand <b>in front of the pawn</b>. When the attacking king comes to the side, step back straight down the file, so that when he moves alongside, you can take the opposition.",
          "If you are pushed back to your first rank, step back to the square directly in front of the pawn, not to the side. When the pawn reaches the seventh with check, the defending king must go to the square in front of it, and the result is stalemate or a lost pawn.",
          "Count: you want to meet his king face to face, so that he has to move aside. Moving your king diagonally away from the pawn is almost always the losing move."
        ],
        diagrams: [
          { fen: "8/4k3/8/4PK2/8/8/8/8", cap: "Black to move. Kf7 takes the opposition and holds. Ke8 or Kd7 lets the white king reach f6 and the pawn goes through.", hl: ["f7"] }
        ],
        rules: [
          "Stay on the pawn's file, in front of it.",
          "Pushed back? Retreat straight back, never diagonally away.",
          "Answer his king's advance with the opposition."
        ],
        practice: [
          { t: "tb", fen: "8/4k3/8/4PK2/8/8/8/8 b - - 0 1", goal: "draw",
            prompt: "Black to play. Find the only move that holds.",
            advice: "If the white king reaches d6, e6 or f6 you lose. Face his king directly." },
          { t: "tb", fen: "8/8/2k5/8/2PK4/8/8/8 b - - 0 1", goal: "draw",
            prompt: "Black to play. Hold the draw.",
            advice: "The c4-pawn's key squares are b6, c6 and d6. Keep his king off them by facing it." },
          { t: "drill", ch: "holddraw" },
          { t: "drill", ch: "holddraw" }
        ]
      },
      {
        id: "c-rookpawn", title: "The rook pawn", mins: 8,
        text: [
          "Pawns on the a- or h-file break the rules. The attacking king has no room on the far side of the pawn, so the usual winning methods fail. If the defending king reaches the <b>corner in front of the pawn</b>, the position is a draw however the attacker's king is placed: the best he can do is stalemate.",
          "Even a king that cannot reach the corner can often draw by <b>shutting the attacker's king in</b> in front of its own pawn: a white king on a8 with a pawn on a7 is stuck if Black's king controls b7 and b8.",
          "Rook pawns also return in later stages: the wrong bishop, the queen against an a-pawn or c-pawn on the seventh, and the knight against a rook pawn."
        ],
        diagrams: [
          { fen: "k7/8/PK6/8/8/8/8/8", cap: "White to move cannot win: a7 is stalemate, and every king move lets Black keep the corner.", hl: ["a8"] },
          { fen: "8/k7/8/1PK5/8/8/8/8", cap: "Not a rook pawn, but the same defence of the corner area. Black to move holds with Kb7, taking the opposition in front of the pawn.", hl: ["b7"] }
        ],
        rules: [
          "Defending king in the corner in front of a rook pawn: draw.",
          "Attacking king trapped in front of its own rook pawn: draw.",
          "Winning with a rook pawn means keeping the defending king off the queening corner."
        ],
        practice: [
          { t: "tb", fen: "8/k7/8/1PK5/8/8/8/8 b - - 0 1", goal: "draw",
            prompt: "Black to play. One move holds. Find it.",
            advice: "Stay in front of the pawn and face his king, so he has to move aside." },
          { t: "quiz", fen: "k7/8/PK6/8/8/8/8/8", ask: "White to move. Can White win?",
            options: ["No: it is a draw whatever White does", "Yes, with a7", "Yes, with Kc7"],
            why: "a7 is stalemate at once. Kc7 lets Black play Ka7 and take the pawn or shuttle in the corner. Rook pawn against a king in the corner is a dead draw." },
          { t: "drill", ch: "rookpawn" },
          { t: "drill", ch: "rookpawn" }
        ]
      },
      {
        id: "c-seventh", title: "The last step: stalemate tricks", mins: 8,
        text: [
          "A pawn one square from queening is not yet a queen. When the defending king is boxed into a corner next to the queening square, promoting to a queen can be <b>stalemate</b>. Before you promote, look at every square his king has.",
          "The tools: promote to a <b>rook</b> when a queen would stalemate, move your king first so that he gets a square, or give up the promotion for a move to keep the win.",
          "Defenders can use the same trap: when you are losing, head for the corner and hope he promotes without looking."
        ],
        diagrams: [],
        rules: [
          "Before promoting, count his legal moves after the new queen lands.",
          "If a queen stalemates, a rook may still win.",
          "Losing? Head for the stalemate corner and make him prove it."
        ],
        practice: [
          { t: "drill", ch: "seventh" },
          { t: "drill", ch: "seventh" },
          { t: "quiz", fen: "7k/5K1P/8/8/8/8/8/8", ask: "White to move. The pawn is on h7, Black's king on h8. What happens?",
            options: ["It is a draw: Black's king is stalemated whatever White does", "Kg6 and h8=Q mate follows", "White wins by underpromoting"],
            why: "Black's king on h8 has no moves at all, so any White move that does not give check is stalemate, and nothing gives check. A rook pawn with the defender in the corner is a draw." }
        ]
      }
    ]
  },

  {
    id: "s3", title: "Pawn endings: technique", level: 3,
    sub: "Distant opposition, triangulation, corresponding squares, outside passers, breakthroughs and pawn races.",
    lessons: [
      {
        id: "c-distant", title: "Distant opposition", mins: 10,
        text: [
          "Opposition works at a distance. Kings on the same file with three or five squares between them are in <b>distant opposition</b>: the side not to move has it, because whatever the other king does, it can be met by stepping straight toward it and keeping an odd number of squares between them.",
          "In practice: count the squares between the kings. If it is odd and it is your move, you are in trouble; step so that the count stays odd after his reply. When the kings are on different files, move to the file of his king, keeping the odd count. This is <b>diagonal</b> and <b>rectangular opposition</b>, and it all reduces to one rule: put the kings on the corners of a rectangle with odd sides."
        ],
        diagrams: [
          { fen: "4k3/8/8/8/4K3/8/8/8", cap: "Three squares between the kings: distant opposition. With Black to move, White keeps it by answering Kd7 with Kd4, Kf7 with Kf4, and so on.", hl: ["e4", "e8"] }
        ],
        rules: [
          "Odd number of squares between kings on a line: the side not to move has the opposition.",
          "Keep the opposition by mirroring his king's moves.",
          "Kings on different files and ranks: a rectangle with odd sides is still opposition."
        ],
        practice: [
          { t: "drill", ch: "distant" },
          { t: "drill", ch: "distant" },
          { t: "quiz", fen: "4k3/8/8/8/4K3/8/8/8", ask: "Black to move plays Kd7. How does White keep the opposition?",
            options: ["Kd4, facing him again on the d-file", "Ke5, stepping closer", "Kd3"],
            why: "After Kd7 Kd4 the kings are again on one file with three squares between them and Black to move. Ke5 gives the opposition away: the gap closes to an even count." }
        ]
      },
      {
        id: "c-triangle", title: "Triangulation", mins: 12,
        text: [
          "Sometimes the position is right but the move is wrong: with the opponent to move you would win, with you to move you cannot. If your king has more room than his, you can <b>lose a tempo</b>. Walk the king around a triangle, three moves to reach a square you could have reached in two, while his king, short of space, can only go back and forth.",
          "Triangulation needs two things: a mutual zugzwang square for the defender, and room for your king to make a three-move loop while his can only make two-move shuffles. It is the technique that turns many 'drawn' king and pawn endings into wins."
        ],
        diagrams: [],
        rules: [
          "Right position, wrong move? Look for a triangle.",
          "Your king needs more room than his.",
          "Walking straight at him does not lose a tempo: the triangle does."
        ],
        practice: [
          { t: "drill", ch: "triangulation" },
          { t: "drill", ch: "triangulation" }
        ]
      },
      {
        id: "c-corresponding", title: "Corresponding squares", mins: 12,
        text: [
          "Triangulation is a special case of a bigger idea. In a position with locked pawns, each square the attacking king can stand on has a <b>corresponding</b> square for the defending king: the one he must be on, with you to move, to hold. Find the squares where the kings are in mutual zugzwang, then work backwards: if his only answer to your king on c4 is d6, his only answer to b4 must be the square next to d6, and so on.",
          "You do not need to calculate long lines. Find one mutual zugzwang, label the squares, and look for a square of yours that has two neighbours he must answer with a single square. That is where he runs out."
        ],
        diagrams: [
          { fen: "8/8/3k4/2p5/2P5/3K4/8/8", cap: "Locked pawns on c4 and c5. Each king tries to win the enemy pawn by reaching b4 or d4 (b5 or d5 for Black). Every square of one king has a matching square for the other: the side that runs out of matching squares loses.", hl: ["d3", "d6"] }
        ],
        rules: [
          "Find one mutual zugzwang, then work backwards.",
          "Each of your squares has one answering square for him.",
          "Win when one of his answering squares has to serve two of yours."
        ],
        practice: [
          { t: "drill", ch: "corresponding" },
          { t: "drill", ch: "corresponding" }
        ]
      },
      {
        id: "c-outside", title: "The outside passed pawn", mins: 10,
        text: [
          "With pawns on both wings, a passed pawn far from the other pawns is a huge asset. It works as a <b>decoy</b>: the enemy king must go and stop it, and while it does, your king eats the pawns it left behind.",
          "The plan is simple and almost always works: push the outside passer as far as it can safely go, let his king take it, and march your own king to the other wing. The further the passer is from the rest of the pawns, the more tempi you gain.",
          "A <b>protected passed pawn</b> is the other big asset: the defending king can never take it, so it ties him down forever while your king is free. And a <b>pawn majority</b> on one wing is a passed pawn waiting to be made: push the pawn with no opposite number first."
        ],
        diagrams: [
          { fen: "8/5p2/3k2p1/7p/P2K3P/6P1/8/8", cap: "White's a-pawn is an outside passer. After a5 the black king must go to the queenside to stop it, and the white king walks to f7 and eats.", arrows: [["a4", "a6"]], hl: ["a4"] }
        ],
        rules: [
          "An outside passer decoys the enemy king: push it, then switch wings.",
          "A protected passer cannot be taken by the king: it ties him down for good.",
          "With a majority, push the candidate (the pawn with no opposite number) first."
        ],
        practice: [
          { t: "quiz", fen: "8/5p2/3k2p1/7p/P2K3P/6P1/8/8", ask: "White to move. What is the winning plan?",
            options: ["Push the a-pawn to drag Black's king away, then take the kingside pawns", "Attack the kingside pawns at once with the king", "Keep the a-pawn back and wait for Black to commit"],
            why: "The a-pawn is far from everything else. Black's king must chase it, and every move it spends on the a-file is a move White's king spends heading for f7 and g6. The decoy works because the black pawns cannot defend themselves." },
          { t: "quiz", ask: "In a pawn ending each side has a passed pawn. White's is protected by another pawn, Black's is not. Who is better?",
            options: ["White: the protected passer cannot be taken, so Black's king is tied to it", "Black: unprotected pawns are more mobile", "Equal: both have one passed pawn"],
            why: "The defending king can never win a protected passed pawn, so it has to stay near it. White's king is free to attack. That freedom usually decides." },
          { t: "quiz", ask: "White has three pawns against two on the queenside, on a2, b2 and c2 against a7 and b7. Which pawn should lead the advance to make a passed pawn?",
            options: ["The c-pawn, the one with no opposite number", "The a-pawn", "The b-pawn"],
            why: "The candidate passed pawn is the one with no enemy pawn facing it: the c-pawn. Advancing it first, with support, leads to an exchange that leaves a passer." }
        ]
      },
      {
        id: "c-breakthrough", title: "The breakthrough", mins: 10,
        text: [
          "Three pawns against three, face to face on the fifth rank, and the kings far away. White to move wins with a sacrifice: <b>b6!</b> After cxb6 comes a6!, and after axb6 comes c6!. One pawn always gets through.",
          "Breakthroughs appear whenever pawns face each other close to promotion and the defending king is far. The key is counting: once a pawn is through, can the defending king catch it? Use the square of the pawn.",
          "As a defender, keep your king near the pawns, or avoid letting enemy pawns reach your fourth rank in a group."
        ],
        diagrams: [
          { fen: "8/ppp3k1/8/PPP5/8/8/8/6K1", cap: "White to move: b6! breaks through. Any other move lets Black's king come back and hold.", arrows: [["b5", "b6"]], hl: ["b5"] }
        ],
        rules: [
          "Three against three on the fifth: the middle pawn sacrifices first.",
          "Count the kings: the breakthrough only works if his king is outside the square.",
          "Defending: keep your king close or stop the pawns reaching the fifth."
        ],
        practice: [
          { t: "line", fen: "8/ppp3k1/8/PPP5/8/8/8/6K1 w - - 0 1", title: "The breakthrough",
            setup: "The kings are far away. Only one move wins.",
            moves: [
              { san: "b6", note: "The middle pawn goes first. If Black ignores it, bxa7 or bxc7 queens." },
              { san: "cxb6" },
              { san: "a6", note: "Now the b7-pawn must take, opening the way for the c-pawn." },
              { san: "bxa6" },
              { san: "c6", note: "The c-pawn is through. Black's king is far outside its square." },
              { san: "Kf6" },
              { san: "c7", note: "Next move it queens. A pawn ahead against two scattered pawns and no king nearby." }
            ],
            payoff: "One pawn always gets through. Black's king needed to be three squares closer." },
          { t: "quiz", fen: "8/ppp3k1/8/PPP5/8/8/8/6K1", ask: "After 1.b6, Black plays axb6. What does White play?",
            options: ["c6!, and the a-pawn goes through after bxc6 a6", "axb6", "cxb6"],
            why: "1.b6 axb6 2.c6! bxc6 3.a6 and the a-pawn queens. Recapturing only trades pawns and the breakthrough is gone." }
        ]
      },
      {
        id: "c-reti", title: "Racing, and Réti's king", mins: 10,
        text: [
          "When both sides have runners, count tempi: who queens first, and does the first queen give check or control the other's queening square? A queen that arrives with check often wins the race outright.",
          "The king can also chase two goals at once. In Réti's famous study, the white king is hopelessly behind Black's h-pawn and far from its own c-pawn. But walking diagonally, <b>Kg7, Kf6, Ke5</b>, it approaches both at the same time: it threatens to catch the h-pawn and to support c6-c7. Black cannot deal with both.",
          "A diagonal king move gains ground in two directions at once. When a race looks hopeless, look for a path that threatens two things."
        ],
        diagrams: [
          { fen: "7K/8/k1P5/7p/8/8/8/8", cap: "Réti, 1921. White to play and draw. Kg7! starts a diagonal walk that chases the h-pawn and supports the c-pawn at the same time.", hl: ["h8"], arrows: [["h8", "e5"]] }
        ],
        rules: [
          "Count tempi before entering a race, and look for queening with check.",
          "A diagonal king walk pursues two goals at once.",
          "The square of the pawn tells you if the chase can succeed."
        ],
        practice: [
          { t: "tb", fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1", goal: "draw", plies: 14,
            prompt: "White to play. It looks lost. Draw it.",
            advice: "The king cannot catch the pawn in a straight line. Walk toward it diagonally so that you are heading for your own pawn too." },
          { t: "quiz", fen: "7K/8/k1P5/7p/8/8/8/8", ask: "Why does Kg7 draw when Kh7 loses?",
            options: ["Kg7 heads for f6 and e5: toward the h-pawn and toward the c-pawn at once", "Kg7 gets inside the square of the h-pawn immediately", "Kh7 walks into a check"],
            why: "1.Kg7 h4 2.Kf6 Kb6 (2...h3 3.Ke7 h2 4.c7 and both sides queen) 3.Ke5! Kxc6 4.Kf4 and the king is inside the square of the h-pawn. The diagonal walk serves both goals; the straight walk serves neither." }
        ]
      }
    ]
  },

  {
    id: "s4", title: "Pieces against pawns", level: 3,
    sub: "Queen against a pawn, the drawing exceptions, rook against pawn, knights and the wrong bishop.",
    lessons: [
      {
        id: "c-qvp", title: "Queen against a pawn", mins: 10,
        text: [
          "A queen beats a pawn on the seventh rank, but only with a method. Use checks and pins to force the defending king <b>in front of its own pawn</b>. While the pawn is blocked by its own king, you have one free move: spend it bringing your king one step closer. Repeat until your king arrives and the pawn falls.",
          "Approach in a staircase: checks from the side and diagonal that end with the queen on the square in front of the pawn or pinning it."
        ],
        diagrams: [
          { fen: "8/8/8/8/8/8/3pk3/6QK", cap: "The pattern: check until the king has to stand on d1 in front of the pawn, then use the free move to bring the king one step closer. Repeat." , hl: ["d1"] }
        ],
        rules: [
          "Force his king in front of its pawn, then use the free move for your king.",
          "Repeat the cycle: check, block, king step.",
          "Pawns on the knight, centre files usually lose. Rook and bishop pawns on the seventh can draw."
        ],
        practice: [
          { t: "drill", ch: "queenvspawn" },
          { t: "drill", ch: "queenvspawn" }
        ]
      },
      {
        id: "c-qvp-draw", title: "The exceptions: rook and bishop pawns", mins: 10,
        text: [
          "The queen's method fails against a <b>rook pawn</b> or a <b>bishop pawn</b> on the seventh rank when the attacking king is far away. The reason is stalemate.",
          "Against an a-pawn, the defending king goes to the corner a1: if the queen takes the move needed to block, Black is stalemated. Against a c-pawn, the king steps into the corner <b>a1</b> instead of protecting the pawn: Qxc2 is stalemate. So the queen never gets a free tempo.",
          "These draws only work if the attacking king is too far to help. With the king close, the queen wins against everything."
        ],
        diagrams: [
          { fen: "8/8/8/8/8/1Q6/2p5/1k5K", cap: "Black to move. Ka1! draws: if Qxc2 it is stalemate. Kc1 loses to the usual method.", hl: ["a1"] }
        ],
        rules: [
          "Rook pawn or bishop pawn on the seventh, attacking king far: usually a draw.",
          "Defender: aim for the corner, where taking the pawn is stalemate.",
          "With the attacking king nearby, the queen always wins."
        ],
        practice: [
          { t: "tb", fen: "8/8/8/8/8/1Q6/2p5/1k5K b - - 0 1", goal: "draw", plies: 14,
            prompt: "Black to play, in check. Hold the draw.",
            advice: "You do not have to protect the pawn. Where would your king be stalemated if the queen took it?" },
          { t: "quiz", ask: "Queen against a pawn on the seventh, attacking king far away. Which pawn gives the defender drawing chances?",
            options: ["A c-pawn", "A d-pawn", "A b-pawn"],
            why: "Bishop pawns and rook pawns give the stalemate resource in the corner. Against a centre or knight pawn, the queen forces the king in front of its pawn and wins a tempo every time." }
        ]
      },
      {
        id: "c-rvp", title: "Rook against a pawn", mins: 10,
        text: [
          "Rook against pawn is a race between the attacking king and the defending pair of king and pawn. Two stopping methods: <b>cut the king off</b> along a rank or file so it cannot support the pawn, or put the rook <b>behind the pawn</b>, where it attacks it from the start.",
          "If the defending king is right next to its pawn and the attacking king is far, the pawn can be strong enough to draw. Then the rook tries checks to push the king in front of the pawn (gaining time), and sometimes the defender has to beware of a skewer or of underpromotion tricks.",
          "Count: the attacking king must come back within reach of the pawn's path. Each tempo matters."
        ],
        diagrams: [
          { fen: "2R5/8/8/8/3k4/2p5/8/4K3", cap: "The rook attacks from behind the pawn and the king comes to block it: the pawn falls.", hl: ["c8"] }
        ],
        rules: [
          "Rook behind the pawn, or cut the king off from it.",
          "Checks that drive the king in front of its pawn buy tempi.",
          "Count the attacking king's moves to the queening square."
        ],
        practice: [
          { t: "drill", ch: "rookvspawn" },
          { t: "drill", ch: "rookvspawn" },
          { t: "quiz", ask: "Rook against a pawn: where does the rook stop a pawn most efficiently?",
            options: ["Behind the pawn, on its file", "In front of the pawn", "On the rank next to the pawn"],
            why: "Behind the pawn, the rook attacks it at every step and never has to move. In front, the king can push it away." }
        ]
      },
      {
        id: "c-knights", title: "Knights against pawns", mins: 8,
        text: [
          "The knight is a poor defender against a far-advanced pawn: it is short-range and needs time to change direction. Its worst enemy is the <b>rook pawn</b>, because on the edge it has fewer squares from which to cover the queening square.",
          "Rule of thumb: a knight stops a pawn if it can reach any square in front of it, or the queening square, in time. Once the pawn is on the seventh, the knight must control the queening square or be lost.",
          "A knight with its king nearby holds most single pawns. The danger is a pawn supported by its king on the edge of the board."
        ],
        diagrams: [
          { fen: "8/8/8/8/8/8/p1k5/2N1K3", cap: "Knight against a rook pawn on the seventh. Here Nxa2 wins it just in time. With the knight anywhere else, a1 queens.", hl: ["a1"] }
        ],
        rules: [
          "A knight stops a pawn by reaching any square in front of it.",
          "Rook pawns are the knight's worst case.",
          "Keep the knight in front of the pawn, close to your king."
        ],
        practice: [
          { t: "quiz", ask: "Which pawn is the hardest for a lone knight to stop?",
            options: ["A rook pawn", "A centre pawn", "A bishop pawn"],
            why: "On the edge the knight has the fewest squares that control the queening square. Many knight-against-rook-pawn positions are lost that would be draws one file further in." },
          { t: "quiz", ask: "A knight tries to stop a passed pawn. Where is it best placed?",
            options: ["In front of the pawn, on its path", "Behind the pawn", "Next to the pawn, on the same rank"],
            why: "A knight in front blocks the pawn and covers squares on its path. Behind it, it can never catch up." }
        ]
      },
      {
        id: "c-wrongbishop", title: "The wrong bishop", mins: 8,
        text: [
          "King, bishop and rook pawn against a lone king looks winning, but if the bishop <b>does not control the queening square</b> and the defending king reaches the corner, it is a draw. The bishop can never drive the king out of a corner of the other colour, and the pawn cannot push the king out alone.",
          "Check the colour of the promotion square: a1 and h8 are dark, a8 and h1 light. White with an h-pawn needs a dark-squared bishop; with a light-squared bishop and Black's king in h8, it is a draw.",
          "The same idea saves many endings with more pawns: trade into the wrong-bishop ending when you are defending, and avoid it when attacking."
        ],
        diagrams: [
          { fen: "8/5k2/8/7P/4K3/3B4/8/8", cap: "A light-squared bishop and an h-pawn: the wrong bishop. Black draws by reaching h8 (Kg7, Kh8) and staying there.", hl: ["h8"] }
        ],
        rules: [
          "Rook pawn plus a bishop that does not control the queening corner: draw if the king gets there.",
          "Defending: run to the corner.",
          "Attacking: keep the king out of the corner, or keep a second pawn."
        ],
        practice: [
          { t: "tb", fen: "8/5k2/8/7P/4K3/3B4/8/8 b - - 0 1", goal: "draw", plies: 16,
            prompt: "Black to play. A piece down, but you can draw. How?",
            advice: "The bishop is light-squared and the pawn queens on h8, a dark square. Get there and stay." },
          { t: "quiz", ask: "White has king, h-pawn and bishop against a bare king in h8. Which bishop wins?",
            options: ["A dark-squared bishop", "A light-squared bishop", "Either bishop"],
            why: "The h8 square is dark. Only a dark-squared bishop can drive the king out of it." }
        ]
      }
    ]
  },

  {
    id: "s5", title: "Rook endings", level: 3,
    sub: "The most common endings in practice: Lucena, Philidor, cutting the king off and keeping the rook active.",
    lessons: [
      {
        id: "c-lucena", title: "Lucena: building a bridge", mins: 12,
        text: [
          "The most important winning position in rook endings. White's pawn is on the seventh, the king on the queening square, the black king cut off by a file. White's king cannot come out because the black rook checks from behind.",
          "The winning method is the <b>bridge</b>: 1. Rd1+ (push his king one more file away), then <b>Rd4!</b> (rook to the fourth rank). Then the king walks out, and when the checks come, the rook steps across to block one of them.",
          "Remember: you need the defending king cut off by at least one file from the pawn, and a non-rook pawn. The rook on the fourth rank is the bridge the king hides behind."
        ],
        diagrams: [
          { fen: "1K6/1P1k4/8/8/8/8/r7/2R5", cap: "Lucena. White wins with Rd1+ and Rd4, then the king walks out and shelters behind the rook.", hl: ["b8", "b7"], arrows: [["c1", "d1"]] }
        ],
        rules: [
          "Cut the king off by a file first (with check if needed).",
          "Rook to the fourth rank, then the king comes out.",
          "Block the last check with the rook: that is the bridge."
        ],
        practice: [
          { t: "tb", fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1", goal: "promote",
            prompt: "White to play. Build the bridge and queen the pawn.",
            advice: "First push his king another file away with a check. Then put the rook on the fourth rank before your king comes out." },
          { t: "drill", ch: "lucena" },
          { t: "drill", ch: "lucena" }
        ]
      },
      {
        id: "c-philidor", title: "Philidor: the third-rank defence", mins: 12,
        text: [
          "The most important drawing position. The defending king is on the queening square; the attacking king and pawn are on the fifth rank. The defender's rook stands on its <b>third rank</b> (the sixth from White's side), so the attacking king cannot reach it.",
          "When the pawn advances to the sixth rank, the white king loses its shelter. At that moment the rook drops to the back rank and gives <b>checks from behind</b>. The king cannot hide in front of its own pawn.",
          "Common mistakes: putting the rook on the back rank too early (passive), or letting the king through to the sixth before the pawn."
        ],
        diagrams: [
          { fen: "3k4/R7/7r/3PK3/8/8/8/8", cap: "Philidor. Black's rook holds the sixth rank. When the pawn goes to d6, the rook goes to h1 and checks from behind.", hl: ["h6"] }
        ],
        rules: [
          "Rook on your third rank while the pawn is on the fifth.",
          "When the pawn reaches the sixth, go to the back and check from behind.",
          "Do not let the attacking king reach your third rank in front of its pawn."
        ],
        practice: [
          { t: "tb", fen: "3k4/R7/7r/3PK3/8/8/8/8 b - - 0 1", goal: "draw", plies: 18,
            prompt: "Black to play. Hold the Philidor position.",
            advice: "Keep your rook on the sixth rank. Only when the pawn steps to d6 does it drop back to check from behind." },
          { t: "drill", ch: "philidor" },
          { t: "drill", ch: "philidor" }
        ]
      },
      {
        id: "c-cutoff", title: "Cutting the king off", mins: 10,
        text: [
          "Most rook and pawn endings are decided before Lucena or Philidor: by whether the defending king can reach the front of the pawn. If the attacking rook cuts the king off along a file, the attacker usually wins. If the king is in front, it is usually a draw.",
          "A king cut off by <b>one file</b> can often still hold, depending on how far the pawn has advanced and on which side the king stands. Cut off by <b>two or more files</b>, it usually loses. Rook pawns and knight pawns are harder to win.",
          "So the first question in any rook ending: where is his king relative to the pawn, and can I cut it off with my rook?"
        ],
        diagrams: [
          { fen: "8/8/8/5k2/8/8/3P4/3KR3", cap: "Re1 cuts Black's king off along the e-file. It cannot cross to the d-pawn's side, so White's king and pawn advance together.", hl: ["e1"] }
        ],
        rules: [
          "First question: is the king in front of the pawn or cut off from it?",
          "Cut the king off along a file, as far away as you can.",
          "Rook behind passed pawns: yours and his."
        ],
        practice: [
          { t: "drill", ch: "rookpawngeneral" },
          { t: "drill", ch: "rookpawngeneral" },
          { t: "quiz", ask: "In a rook and pawn against rook ending, what usually decides the result?",
            options: ["Whether the defending king can get in front of the pawn", "Who has the more active rook on the seventh", "Which side moves first"],
            why: "With the king in front of the pawn, most positions draw (Philidor and its relatives). With the king cut off, most win (Lucena is waiting at the end)." }
        ]
      },
      {
        id: "c-rookactive", title: "The active rook", mins: 10,
        text: [
          "Rooks are long-range pieces and lose much of their value when they defend passively. A rook that guards a pawn from the side or from in front is tied down; a rook that attacks pawns or checks the king is worth more than a pawn.",
          "Three rules cover most decisions. <b>Rooks belong behind passed pawns</b>, your own and the opponent's (Tarrasch's rule). The <b>seventh rank</b> is the best rank for an attacking rook: pawns there cannot be defended from the side easily, and the enemy king is often trapped on the eighth. And when defending, <b>give up a pawn for activity</b> rather than holding everything passively."
        ],
        diagrams: [
          { fen: "6k1/1R3ppp/8/8/8/8/5PPP/6K1", cap: "A rook on the seventh: it attacks f7 and keeps Black's king on the back rank.", hl: ["b7"] }
        ],
        rules: [
          "Rooks behind passed pawns, both yours and his.",
          "A rook on the seventh rank is often worth a pawn.",
          "Better a pawn down with an active rook than equal with a passive one."
        ],
        practice: [
          { t: "quiz", ask: "White has a passed pawn on a5. Where does White's rook belong?",
            options: ["Behind it, on a1 or a2", "In front of it, on a8", "Beside it, on b5"],
            why: "From behind the rook supports the pawn all the way to a8 and gains scope with every step. From a8 it gets in the way of its own pawn." },
          { t: "quiz", ask: "Black has a passed pawn on a4. Where does White's rook belong?",
            options: ["Behind it, on a8 or a7", "In front of it, on a1", "Beside it, on the fourth rank"],
            why: "Rooks belong behind passed pawns, including enemy ones. From behind, the rook attacks the pawn and its power grows as the pawn advances." },
          { t: "quiz", ask: "You are defending a rook ending a pawn down. Which is usually the better choice?",
            options: ["Give up a second pawn to activate the rook and king", "Guard every pawn with the rook", "Keep the king on the back rank for safety"],
            why: "Passive defence slowly loses: the attacker creates a second weakness. An active rook gives counterplay and many rook endings two pawns down are still drawn." }
        ]
      },
      {
        id: "c-backrank", title: "Back-rank, short side and long side", mins: 10,
        text: [
          "If the defending king is already pushed to the back rank in front of the pawn, the rook can no longer use the Philidor idea. <b>Back-rank defence</b> (rook on the eighth next to the king) holds against rook pawns and knight pawns, but loses against centre and bishop pawns.",
          "When the defending king is pushed off the pawn's file, it should go to the <b>short side</b>, the side with fewer files to the edge. The rook goes to the <b>long side</b>, where it has room to check from a distance: at least three files away from the pawn so the attacking king cannot approach the rook to stop checks.",
          "A good mnemonic: king to the short side, rook to the long side."
        ],
        diagrams: [],
        rules: [
          "Back-rank defence holds only against rook and knight pawns.",
          "King goes to the short side of the pawn.",
          "Rook goes to the long side, checking from at least three files away."
        ],
        practice: [
          { t: "quiz", ask: "Your king has been pushed off the pawn's file. Where should it go?",
            options: ["To the short side, so the rook can check from the long side", "To the long side, to keep away from the edge", "In front of the rook"],
            why: "The rook needs distance to check effectively. With the king on the short side, the rook has the long side to itself." },
          { t: "quiz", ask: "Back-rank defence (king on the queening square, rook on the back rank) against a pawn on the sixth rank holds against which pawns?",
            options: ["Rook pawns and knight pawns", "Centre pawns", "Every pawn"],
            why: "Against a centre or bishop pawn, the attacker has room to bring the rook to the back rank with check and wins. Against rook and knight pawns there is not enough room." }
        ]
      }
    ]
  },

  {
    id: "s6", title: "Minor piece endings", level: 3,
    sub: "Opposite and same-coloured bishops, good and bad bishops, knights, and bishop against knight.",
    lessons: [
      {
        id: "c-ocb", title: "Opposite-coloured bishops", mins: 10,
        text: [
          "With only bishops of opposite colours left, even two extra pawns are often not enough to win. The defending bishop controls squares the attacking bishop never can: if the defender sets up a <b>blockade on squares of his bishop's colour</b>, the pawns are stuck.",
          "The attacker wins only with two widely separated passed pawns (at least three files apart) or connected pawns far advanced with king support. The defender puts the king in front of one pawn and the bishop on a diagonal that stops the other.",
          "In the middlegame, opposite bishops favour the attacker, because one bishop cannot defend the other colour. In the endgame they favour the defender."
        ],
        diagrams: [
          { fen: "8/8/3k4/2bP4/2P5/4K3/4B3/8", cap: "Two connected pawns stopped by a blockade on d6 and the bishop on c5. The white bishop can never challenge the dark squares.", hl: ["d6", "c5"] }
        ],
        rules: [
          "Defender: blockade on your bishop's colour, king in front.",
          "Attacker needs passers far apart (three files or more).",
          "One extra pawn with opposite bishops is almost always a draw."
        ],
        practice: [
          { t: "quiz", ask: "Bishops of opposite colours, White a pawn up. What is the most likely result?",
            options: ["A draw", "A white win", "A black win"],
            why: "The defending bishop blockades on its own colour, which the attacker cannot challenge. One pawn is rarely enough, and even two can draw." },
          { t: "quiz", ask: "Opposite bishops, White has two extra passed pawns. When do they win most easily?",
            options: ["When they are far apart, on different wings", "When they are connected", "When they are on the same file"],
            why: "Widely separated passers stretch the defence: the king can stop one and the bishop the other only if they are close together. Three files or more apart is usually decisive." }
        ]
      },
      {
        id: "c-samebishop", title: "Same-coloured bishops", mins: 10,
        text: [
          "With bishops on the same colour, one extra pawn often wins, because the attacking bishop can contest every diagonal the defender uses. The key tool is <b>interference</b>: place your bishop on the diagonal the defending bishop uses, so it cannot keep control of the pawn's path.",
          "The defender wants to control a square in front of the pawn with both king and bishop, or to reach a position where the bishop sits on a long diagonal that the attacker cannot block with tempo.",
          "<b>Bad bishop</b> warning: when your pawns stand on the same colour as your bishop, it is blocked by them, and the enemy king walks in on the other colour."
        ],
        diagrams: [
          { fen: "8/3P4/4K3/b7/8/8/8/2B3k1", cap: "Black's bishop holds d8 from a5. White wins by contesting the diagonals: Bg5 covers d8 from the other side, the king heads for e8 or c7, and Bd8 or Bb6 blocks Black's diagonal.", hl: ["d8"] }
        ],
        rules: [
          "Same-coloured bishops: one extra pawn often wins.",
          "Interfere: block the defending bishop's diagonal with your own.",
          "Put your pawns on the opposite colour to your bishop."
        ],
        practice: [
          { t: "quiz", ask: "In a bishop ending, where should your pawns usually stand?",
            options: ["On the opposite colour to your bishop", "On the same colour as your bishop", "It does not matter"],
            why: "Pawns on the other colour cover the squares your bishop cannot, and leave the bishop free. Pawns on the bishop's colour make it 'bad' and leave holes on the other colour." },
          { t: "quiz", ask: "What does interference mean in a bishop ending?",
            options: ["Blocking the enemy bishop's diagonal with your own piece", "Trading bishops", "Attacking the enemy bishop with the king"],
            why: "If the defending bishop guards the pawn's path along one diagonal, you put your bishop on that diagonal. It cannot be taken without the pawn moving forward, and the guard is cut." }
        ]
      },
      {
        id: "c-goodbad", title: "Good bishop, bad bishop, and the knight", mins: 10,
        text: [
          "A <b>bad bishop</b> is blocked by its own pawns on its colour. Against a knight, a bad bishop is often a lost cause: the knight finds outposts on the other colour, the king walks in, and the bishop can only watch its own pawns.",
          "A bishop is better than a knight with <b>pawns on both wings</b> and an open position: it covers both sides at once. A knight is better with all pawns on one wing, in a closed position, or with outposts it can use.",
          "<b>Knight endings are like pawn endings</b>: the knight cannot lose tempi, so zugzwang and king activity decide. An extra pawn usually wins, and an outside passed pawn is even stronger than in pawn endings because the knight is bad at stopping it."
        ],
        diagrams: [
          { fen: "8/5k2/1p1p1p2/pPpPpPp1/P1P1P1P1/3B4/4K3/8", cap: "A bad bishop: all of White's pawns are on light squares, like the bishop. It has nothing to attack.", hl: ["d3"] }
        ],
        rules: [
          "Bishop is better: open position, pawns on both wings.",
          "Knight is better: closed position, one wing, outposts.",
          "Knight endings play like pawn endings: activity and zugzwang."
        ],
        practice: [
          { t: "quiz", ask: "Pawns on both wings, open position. Which minor piece is usually better?",
            options: ["The bishop", "The knight", "They are equal"],
            why: "The bishop's long range lets it support or attack both wings at once. The knight needs several moves to switch sides." },
          { t: "quiz", ask: "All the pawns are on the kingside and the position is closed. Which minor piece is usually better?",
            options: ["The knight", "The bishop", "They are equal"],
            why: "In closed positions the bishop's diagonals are blocked and the knight can jump over pawns to reach outposts." },
          { t: "quiz", fen: "8/5k2/1p1p1p2/pPpPpPp1/P1P1P1P1/3B4/4K3/8", ask: "What is wrong with White's bishop?",
            options: ["It is bad: all White's pawns are on its colour", "It is out of play on the queenside", "Nothing: it defends every pawn"],
            why: "Pawns on the same colour block the bishop and leave the dark squares to the enemy king." }
        ]
      },
      {
        id: "c-minorgames", title: "Minor piece technique", mins: 8,
        text: [
          "Practical minor piece endings are won with a few recurring ideas. <b>Restrict the opposing piece</b>: a knight on the rim or a bishop staring at its own pawns is half a piece. <b>Create a second weakness</b>: one weakness can be defended, two cannot. <b>Use the king</b>: with fewer pieces on the board the king becomes the strongest attacker.",
          "When defending with a knight against a passed pawn, keep the knight in front of the pawn. With a bishop, defend from a distance along a long diagonal.",
          "And never forget the wrong rook pawn from Stage 4: when defending, a trade into it can save half a point."
        ],
        diagrams: [],
        rules: [
          "Restrict the enemy minor piece before going for pawns.",
          "Two weaknesses beat one defender.",
          "Bishop defends from a distance, knight from in front."
        ],
        practice: [
          { t: "quiz", ask: "A knight is defending against a passed pawn. Where should it stand?",
            options: ["In front of the pawn, on its path", "Behind the pawn", "On the far wing"],
            why: "From in front, the knight blocks and covers squares the pawn must cross. From behind it can never catch up." },
          { t: "quiz", ask: "You are better in a minor piece ending but your opponent defends one weak pawn. What is the plan?",
            options: ["Create a second weakness on the other wing", "Keep attacking the weak pawn with everything", "Trade pieces into a pawn ending at once"],
            why: "One weakness can be defended. A second weakness on the other side of the board stretches the defence until something breaks." }
        ]
      }
    ]
  },

  {
    id: "s7", title: "Hard endings", level: 3,
    sub: "Rook against minor pieces, queen against rook, the two-bishop and bishop-and-knight mates, queen endings.",
    lessons: [
      {
        id: "c-rvb", title: "Rook against bishop", mins: 10,
        text: [
          "Rook against bishop is a draw in most positions, but only if the defending king heads for the <b>right corner</b>: the one whose colour the bishop does <b>not</b> control. In that corner, the bishop can block a check on the back rank next to the king, and any attempt to pin it leaves the king stalemated.",
          "In the wrong corner (the bishop's colour), the defender is mated: the bishop cannot block on the square next to the corner.",
          "The defending king should never stray to the middle of an edge either. Run to the safe corner and keep the bishop close."
        ],
        diagrams: [
          { fen: "7k/R7/4b1K1/8/8/8/8/8", cap: "Black's light-squared bishop and the dark h8 corner: the safe corner. Rook checks on the back rank are met by Bg8.", hl: ["h8", "g8"] }
        ],
        rules: [
          "Run to the corner NOT of your bishop's colour.",
          "Block back-rank checks with the bishop next to the king.",
          "In the bishop's own corner, the defender loses."
        ],
        practice: [
          { t: "tb", fen: "7k/R7/4b1K1/8/8/8/8/8 b - - 0 1", goal: "draw", plies: 16,
            prompt: "Black to play. Hold the safe corner.",
            advice: "h8 is a dark square and your bishop is light-squared: this is the safe corner. Keep the bishop ready to block on g8." },
          { t: "quiz", ask: "Rook against bishop. The bishop is dark-squared. Which corner is safe for the defending king?",
            options: ["A light corner: a8 or h1", "A dark corner: a1 or h8", "Any corner"],
            why: "In the light corner, a check along the edge can be blocked by the dark bishop on the square next to the corner, and pinning it gives stalemate." }
        ]
      },
      {
        id: "c-rvn", title: "Rook against knight", mins: 8,
        text: [
          "Rook against knight is also usually a draw, with one condition: <b>keep the knight close to the king</b>. A knight separated from its king can be trapped or picked off with forks of the rook. Near the king, it is protected and the defence is easy.",
          "Avoid corners with the king: there the knight's limited range can lead to mating nets. Stay central or near the middle of an edge, with the knight next to you."
        ],
        diagrams: [
          { fen: "8/8/8/8/3kn3/8/8/R3K3", cap: "King and knight together in the centre: an easy draw.", hl: ["d4", "e4"] }
        ],
        rules: [
          "Knight next to its king, always.",
          "Avoid the corners with the defending king.",
          "A stray knight can be trapped by rook and king."
        ],
        practice: [
          { t: "tb", fen: "8/8/8/8/3kn3/8/8/R3K3 b - - 0 1", goal: "draw", plies: 16,
            prompt: "Black to play. Keep the draw: king and knight together.",
            advice: "Do not wander. The knight stays one step from your king." }
        ]
      },
      {
        id: "c-qvr", title: "Queen against rook", mins: 15,
        text: [
          "Queen against rook is a win, but one of the hardest technical tasks in chess: the defender keeps the rook near the king and looks for checks, pins and stalemates. The method is to drive the king to the edge, then aim for <b>Philidor's position</b>, where the defender is in zugzwang and the rook must leave the king to be forked by the queen.",
          "Practical rules: keep your king and queen close to each other so the rook cannot fork or skewer them. Use checks only when they gain something. Look for <b>queen forks</b> of king and rook; most wins end that way.",
          "Within 50 moves, a careful defender can make it very difficult. Practise until the method is automatic."
        ],
        diagrams: [
          { fen: "8/8/4k3/2r5/8/8/8/3QK3", cap: "Queen against rook in the open. Bring the king forward, keep the queen and king together, and push the black king to an edge.", hl: ["d1"] }
        ],
        rules: [
          "Keep queen and king together: avoid skewers and forks.",
          "Drive the king to the edge, then look for zugzwang.",
          "Most wins end in a queen fork of king and rook."
        ],
        practice: [
          { t: "tb", fen: "8/8/4k3/2r5/8/8/8/3QK3 w - - 0 1", goal: "mate",
            prompt: "White to play. Win against perfect defence.",
            advice: "Bring the king up first, keep the queen protected or far from the rook's checks, and look for forks of king and rook." }
        ]
      },
      {
        id: "c-twobishops", title: "Mate with two bishops", mins: 10,
        text: [
          "Two bishops side by side form a <b>wall</b> of two diagonals the king cannot cross. Push the wall forward, with the king right behind it, and herd the enemy king to the edge and then to <b>any corner</b>.",
          "Unlike the knight and bishop, any corner will do. Watch for stalemate when the king is in the corner with few squares."
        ],
        diagrams: [
          { fen: "8/8/8/3k4/8/2BB4/8/4K3", cap: "Two bishops side by side form a barrier. The king and bishops advance together.", hl: ["c3", "d3"] }
        ],
        rules: [
          "Bishops side by side make a wall.",
          "King right behind the bishops.",
          "Any corner works. Watch stalemate."
        ],
        practice: [
          { t: "drill", ch: "twobishops" },
          { t: "drill", ch: "twobishops" }
        ]
      },
      {
        id: "c-bn", title: "Mate with bishop and knight", mins: 15,
        text: [
          "The hardest basic mate. Mate is only possible in a corner of the <b>bishop's colour</b>. The defender runs to the other corner; the attacker drives him to the edge, then along the edge to the right corner.",
          "The drive along the edge uses the knight's <b>W manoeuvre</b>: knight hops in a W-shaped path (for example Nf7-e5-d7-c5-b7 in the classic case), while king and bishop take away the escape squares. It takes up to 33 moves, so efficiency matters under the fifty-move rule.",
          "Learn it once properly and it stays with you."
        ],
        diagrams: [
          { fen: "7k/5K2/5NB1/8/8/8/8/8", cap: "Mate only happens in the bishop's corner. A light-squared bishop needs a8 or h1, so here the king is driven from h8 toward a8.", hl: ["h8", "a8"] }
        ],
        rules: [
          "Mate only in the corner of the bishop's colour.",
          "Drive to the edge, then along it with the knight's W path.",
          "King, bishop and knight work together: no piece alone."
        ],
        practice: [
          { t: "drill", ch: "bishopknight" }
        ]
      },
      {
        id: "c-queens", title: "Queen endings", mins: 8,
        text: [
          "Queen endings are about <b>the passed pawn and the king's shelter</b>. The most advanced passed pawn is usually worth more than an extra pawn elsewhere. The queen supports its pawn and checks the enemy king at the same time.",
          "The defending side seeks <b>perpetual check</b>. The attacking king hides in front of its own pawn or near the enemy king (where checks run out). With queen and pawn against queen, a centre or knight pawn gives good winning chances; a rook pawn or bishop pawn is harder.",
          "Practical tip: centralise the queen. From the centre it reaches every check and every pawn."
        ],
        diagrams: [],
        rules: [
          "The most advanced passed pawn rules.",
          "Defender: look for perpetual check.",
          "Attacker: hide the king near the enemy king or in front of the pawn."
        ],
        practice: [
          { t: "quiz", ask: "In a queen ending, what is usually the most important factor?",
            options: ["The most advanced passed pawn", "The number of pawns", "Which queen is more centralised"],
            why: "A far-advanced passed pawn ties down the enemy queen, and with queens on the board checks and pawn support come together. Material counts less than how far the passer has got." },
          { t: "quiz", ask: "You are a pawn down in a queen ending. What is your main drawing weapon?",
            options: ["Perpetual check", "Trading queens", "Pushing your own pawns"],
            why: "An exposed king can rarely escape a queen's checks. Trading queens leaves you in a lost pawn ending." }
        ]
      }
    ]
  },

  {
    id: "s8", title: "Mastery", level: 4,
    sub: "Thinking like a master in the endgame: principles, zugzwang, fortresses, classic studies, and conversion under pressure.",
    lessons: [
      {
        id: "c-principles", title: "Two weaknesses and no hurry", mins: 10,
        text: [
          "Master technique rests on two principles. The <b>principle of two weaknesses</b>: one weakness can be defended, so create a second on the other side of the board. The defender's pieces cannot cover both, and something gives.",
          "And <b>do not hurry</b> (Shereshevsky's 'don't rush'): in a won ending, the defender has few active ideas. Improve every piece before committing, repeat moves to reach the time control, take away counterplay first. Haste creates chances; patience removes them.",
          "Put together: find the targets, improve the pieces, create the second weakness, and only then break through."
        ],
        diagrams: [],
        rules: [
          "Create a second weakness on the other wing.",
          "Improve every piece before the decisive break.",
          "Take away counterplay first; the win will still be there."
        ],
        practice: [
          { t: "quiz", ask: "You are clearly better but the defender holds his one weak pawn. What is the principle?",
            options: ["Create a second weakness on the other wing", "Exchange everything and hope", "Attack the weak pawn with more pieces"],
            why: "The principle of two weaknesses: defenders can cover one target. Two targets far apart overload them." },
          { t: "quiz", ask: "Your ending is technically won and your opponent is short of moves. What should you avoid?",
            options: ["Hurrying into a break before your pieces are ready", "Repeating moves", "Improving your king"],
            why: "'Do not hurry' is the classic rule. A premature break releases tension and gives counterplay. Repeating once to gain time on the clock costs nothing." }
        ]
      },
      {
        id: "c-zugzwang", title: "Zugzwang", mins: 10,
        text: [
          "In the endgame, the obligation to move is often the decisive factor. <b>Zugzwang</b>: any move worsens your position. <b>Mutual zugzwang</b>: whoever is to move loses (or gives up the win).",
          "The <b>trebuchet</b> is the purest example: two blocked pawns, each king attacking the enemy pawn and defending its own. The side to move must let go of its pawn and usually loses the game.",
          "Learn to recognise these positions, and to steer into them with the opponent to move: triangulation and spare pawn tempi are the tools."
        ],
        diagrams: [
          { fen: "8/8/8/4Kp2/5Pk1/8/8/8", cap: "The trebuchet. Whoever moves must release their pawn and loses. With White to move here, Black wins.", hl: ["e5", "g4"] }
        ],
        rules: [
          "Zugzwang: any move makes things worse.",
          "Mutual zugzwang: the side to move loses.",
          "Spare pawn moves and triangulation decide who moves."
        ],
        practice: [
          { t: "quiz", fen: "8/8/8/4Kp2/5Pk1/8/8/8", ask: "White to move. What is the result?",
            options: ["Black wins: White must abandon the f4-pawn", "White wins", "A draw"],
            why: "A trebuchet. Every king move gives up f4 or abandons f5's attack, and Black takes the f4-pawn with an easily winning ending." },
          { t: "quiz", ask: "What is a spare tempo in a pawn ending?",
            options: ["A pawn move that changes nothing but passes the move", "An extra pawn", "A check that gains time"],
            why: "A pawn that can move one square without changing anything important hands the move to the opponent: often decisive in zugzwang positions." }
        ]
      },
      {
        id: "c-fortress", title: "Fortresses", mins: 10,
        text: [
          "A <b>fortress</b> is a defensive setup the stronger side cannot break, even with a big material advantage. The wrong bishop and rook pawn, rook against bishop in the safe corner, and the blockade in opposite-coloured bishop endings are all fortresses.",
          "Spotting a fortress early is a practical skill. As defender, look for a setup where the attacker cannot create a second weakness or cannot reach the decisive squares. As attacker, ask whether the defender can build one, and prevent it before it is built: often by keeping a pawn on the other wing.",
          "Typical signs: a blockade on the colour the enemy cannot control, a king the attacker cannot reach, a piece that shuttles between two squares forever."
        ],
        diagrams: [
          { fen: "8/5k2/8/7P/4K3/3B4/8/8", cap: "The wrong bishop, a fortress: once Black's king reaches h8 the extra piece does nothing.", hl: ["h8"] }
        ],
        rules: [
          "A fortress is a setup that cannot be broken.",
          "Defending: look for blockades on squares he cannot control.",
          "Attacking: keep pawns on both wings to stop fortresses forming."
        ],
        practice: [
          { t: "quiz", ask: "Which of these is a known fortress?",
            options: ["Rook against bishop with the king in the corner not of the bishop's colour", "Queen against rook", "King and two bishops against king"],
            why: "In the safe corner, the bishop blocks back-rank checks and the king cannot be mated. The other two are wins." },
          { t: "quiz", ask: "You are attacking and fear your opponent can build a fortress. What helps most?",
            options: ["Keeping pawns on both wings", "Trading all the pawns", "Swapping into opposite-coloured bishops"],
            why: "Fortresses rely on a narrow front. Pawns on both wings give you a second front to open." }
        ]
      },
      {
        id: "c-saavedra", title: "Studies that teach", mins: 12,
        text: [
          "Endgame studies are artificial positions with one solution, but the ideas in them appear in real games. The <b>Saavedra position</b> (1895) is the most famous: White's c-pawn queens only after an underpromotion to a rook, because a queen allows a stalemate trick.",
          "1.c7 Rd6+ 2.Kb5 Rd5+ 3.Kb4 Rd4+ 4.Kb3 Rd3+ 5.Kc2 Rd4! The trap: 6.c8=Q? Rc4+! 7.Qxc4 is stalemate. Instead 6.c8=R!! threatens Ra8 mate, and after 6...Ra4 7.Kb3 White threatens both Kxa4 and Rc1 mate.",
          "Solve one study a week and your calculation in real endgames gets sharper."
        ],
        diagrams: [
          { fen: "8/8/1KP5/3r4/8/8/8/k7", cap: "Saavedra. White to play and win. The king must escape the checks and, at the very end, promote to the right piece.", hl: ["c6"] }
        ],
        rules: [
          "Escape checks by walking toward the checking rook.",
          "Before promoting, look for the stalemate trick.",
          "Underpromotion is a real tool, not a curiosity."
        ],
        practice: [
          { t: "tb", fen: "8/8/1KP5/3r4/8/8/8/k7 w - - 0 1", goal: "promote",
            prompt: "White to play and win. Escape the checks, then watch the stalemate trap.",
            advice: "c7 first. Then walk toward the rook to escape the checks. At the end, a queen allows a stalemate trick: think about a rook." },
          { t: "quiz", fen: "8/8/1KP5/3r4/8/8/8/k7", ask: "Why does White promote to a rook at the end of the Saavedra study?",
            options: ["A queen would allow a stalemate trick", "A rook is faster", "The queen would be captured at once"],
            why: "After 6.c8=Q Rc4+! 7.Qxc4 is stalemate. 6.c8=R threatens Ra8 mate; 6...Ra4 7.Kb3 then threatens Kxa4 and Rc1 mate at once." }
        ]
      },
      {
        id: "c-convert", title: "Conversion under pressure", mins: 15,
        text: [
          "The final lesson puts it all together: winning won positions and holding drawn ones against perfect defence, with no hints and no take-backs. This is the level at which endgame skill wins rating points.",
          "Work methodically: identify the type of ending, recall the target position (Lucena, Philidor, key squares), and play toward it. If you fail, review the move where the result changed. Then go again."
        ],
        diagrams: [],
        rules: [
          "Name the ending, recall the target position, steer to it.",
          "When you fail, find the move where the result changed.",
          "Technique is repetition: come back when your reviews are due."
        ],
        practice: [
          { t: "drill", ch: "lucena", level: 4 },
          { t: "drill", ch: "philidor", level: 4 },
          { t: "drill", ch: "rookpawngeneral", level: 4 },
          { t: "drill", ch: "corresponding", level: 4 },
          { t: "drill", ch: "queenvspawn", level: 4 }
        ]
      }
    ]
  }
];
