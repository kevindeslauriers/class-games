# Class Board

A quiz board for a whole class. The teacher's computer drives the projector; every student answers every clue on their own laptop or phone.

Courses so far:

- **SNC1W**, Grade 9 Science (de-streamed): four units (ecosystems, space, chemistry, electricity). This is the default course.
- **MDM4U**, Grade 12 Data Management: the eight units of the course outline (probability, permutations, combinations and Pascal's triangle, discrete distributions, organizing data, one-variable statistics, normal distributions, two-variable statistics). Most clues are calculations; graph clues use a Venn diagram, a tree diagram, Pascal's triangle, a box plot, histograms, normal curves and scatter plots.
- **AP Microeconomics**: the six College Board units, with about a quarter of clues needing a calculation (as on the exam) and over 80 clues built around graphs: supply and demand, surplus, price controls, taxes, cost curves, the competitive firm, monopoly, monopolistic competition, monopsony, externalities, the Lorenz curve and a payoff matrix.

The teacher picks the course and which units the board draws from in the lobby; the screen remembers the last choice. A `# Default course` line in any of a course's files makes it the one a new teacher screen starts on.

- **Teacher:** open `/class`. Each teacher gets their own room and code, so classes never meet. Choose the units, the number of teams, one or two boards, the time per clue, Daily Doubles and the final clue. Click a student's name to move, rename or remove them. Use **New class (new code)** when the next class arrives.
- **Students:** go to the site's home page or scan the QR code, and type the code and their first name, then pick their team (table group). A simple name filter blocks rude names.
- A team picks each clue (on a device, or the teacher clicks it). Everyone answers before the timer runs out; answers close early once everyone has answered. Right answers earn the student the clue's value; the team earns the value × the share of its members who got it right.
- Clues are multiple choice (A to D keys work), typed (spelling is forgiven) or numbers (`3e8` and `3 x 10^8` both work; number clues get 50% more time).
- After each clue the board shows the answer, the class's % right, each team's result and how many picked each choice. For typed answers it groups what students wrote, so the teacher can **Accept** a near miss for everyone who wrote it.
- **Daily Double:** the team that finds it agrees on a wager. Everyone answers; the team wins the wager if at least half of its members are right. **Final clue:** every team wagers the same way.
- The teacher can pause, close answers early, skip a clue or end a board. **Report (CSV)** downloads % right for each question and every student's answers and score. Nothing is stored on the server: rooms live in memory and close after 3 hours with nobody connected.
- If a school network blocks WebSockets, the pages switch to ordinary web requests (long polling) on their own.

## Clue banks

Each file in `class-clues/` is one unit of a course:

```
# Course: SNC1W | Grade 9 Science (De-streamed)
# Unit: bio | Biology: Sustainable Ecosystems
## ENERGY FLOW
1 | On average, about this percent of the energy ... | 10% | 1%; 50%; 90%
2 | Most of the energy that is not passed on is lost as this | HEAT | LIGHT; SOUND; ELECTRICITY
3 | Producers capture 10 000 kJ. How many kJ reach the primary consumers? | = 1000 kJ ~1%
4 | Name the process ... | CELLULAR RESPIRATION / RESPIRATION
...
FINAL | ENERGY FLOW | clue | answer
```

Each category has one clue at each level 1 to 5 (worth 100 to 500, doubled on the second board). An answer with `| WRONG; WRONG; WRONG` after it is multiple choice; `= number unit ~tolerance` is a number (tolerance `~2%` by default, `~0` for exact; students can type fractions like `3/8`, decimals or scientific notation); anything else is typed, with other accepted answers after slashes. `^` in a clue shows as a superscript (`10^8`). Every unit has 12 categories and 4 final clues, so one unit can fill two boards. Another course is just more files with a different `# Course:` line; the course menu appears once there are two.

### Graphs

Put `[graph: name]` anywhere in a clue to show `class-clues/images/name.svg` beside it, on the projector and on every student's screen:

```
1 | [graph: monopoly] How many units does this profit-maximizing monopoly produce? | = 30 units ~0
```

The AP Micro and MDM4U graphs are drawn by `tools/graphs.js` from real equations, so every labelled number matches the curves (for example, the monopoly's MR = MC at 30 units, P = $70, ATC = $52). Run `npm run graphs` after changing it. Any other SVG dropped into `class-clues/images/` works too, and `npm test` fails if a clue names a graph that isn't there.

## Sounds

The teacher's screen plays sounds made with Web Audio. To use a recording instead, put an `.mp3` in `public/sounds/` named after the sound: `quiz-board`, `quiz-pick`, `quiz-right`, `quiz-wrong`, `quiz-timesup`, `quiz-dailydouble`, `quiz-think`, `quiz-final`, `quiz-roundbreak`, `quiz-champ`, `join` or `tick`.

## Running

```
npm install
npm start        # teacher: http://localhost:3000/class, students: http://localhost:3000
npm test
```

`npm test` also checks every clue bank, so a typo in a clue file fails the tests instead of quietly dropping a category.

## How it works

`server.js` serves the pages, a WebSocket at `/ws` and the polling fallback at `/rt/*`. `lib/classrooms.js` keeps one room per teacher screen; `lib/classroom.js` runs a game (teams, clues, timers, scoring, the report) and reads the clue banks; `lib/match.js` forgives typos in typed answers. The server decides everything; the answer to a clue is never sent to students until answers close.
