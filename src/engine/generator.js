import { solve, countSolutions, shuffle, mulberry32, hashString } from "./core.js";
import { grade } from "./techniques.js";

// Difficulty is decided by the hardest technique a human needs, not just the clue count.
export const DIFFICULTIES = {
  easy:   { label: "Easy",   blurb: "Singles only. A calm warm-up.",            minLevel: 1, maxLevel: 1, clues: [36, 40] },
  medium: { label: "Medium", blurb: "Fewer clues, still pure scanning.",        minLevel: 1, maxLevel: 2, clues: [30, 33] },
  hard:   { label: "Hard",   blurb: "Needs pointing pairs and hidden pairs.",  minLevel: 2, maxLevel: 3, clues: [25, 30] },
  expert: { label: "Expert", blurb: "Triples, X-Wings and XY-Wings.",          minLevel: 4, maxLevel: 6, clues: [22, 27] },
};
export const DIFF_KEYS = Object.keys(DIFFICULTIES);

const clueCount = (p) => p.reduce((n, v) => n + (v ? 1 : 0), 0);

// Remove clues in symmetric pairs (180° rotation) for that classic hand-made look.
function minimalPuzzle(solution, rng) {
  const p = solution.slice();
  for (const i of shuffle([...Array(41).keys()], rng)) {
    const j = 80 - i;
    const keep = [p[i], p[j]];
    p[i] = 0; p[j] = 0;
    if (countSolutions(p) !== 1) { p[i] = keep[0]; p[j] = keep[1]; }
  }
  return p;
}

function addClues(p, solution, rng, ok) {
  for (const i of shuffle([...Array(41).keys()], rng)) {
    if (p[i]) continue;
    const j = 80 - i;
    const next = p.slice();
    next[i] = solution[i]; next[j] = solution[j];
    if (ok(next)) return next;
  }
  return null;
}

export function generate(difficulty, { seed, budgetMs = 4000 } = {}) {
  const spec = DIFFICULTIES[difficulty];
  const rng = mulberry32(seed ?? hashString(`${Date.now()}-${Math.random()}`));
  const started = Date.now();
  let fallback = null;

  for (let attempt = 0; ; attempt++) {
    const solution = solve(Array(81).fill(0), rng);
    let puzzle = minimalPuzzle(solution, rng);
    let g = grade(puzzle);

    // Too hard (or beyond our toolbox): add clues until it fits under the ceiling.
    while (g.level > spec.maxLevel) {
      const next = addClues(puzzle, solution, rng, () => true);
      if (!next) break;
      puzzle = next; g = grade(puzzle);
    }

    if (g.level >= spec.minLevel && g.level <= spec.maxLevel) {
      // Pad toward the target clue range without dropping below the floor technique.
      while (clueCount(puzzle) < spec.clues[0]) {
        const next = addClues(puzzle, solution, rng, (q) => grade(q).level >= spec.minLevel);
        if (!next) break;
        puzzle = next;
      }
      const result = { puzzle, solution, difficulty, grade: grade(puzzle), attempts: attempt + 1 };
      // Lifting a puzzle down into range can leave it clue-heavy; keep looking for a leaner one.
      if (clueCount(puzzle) <= spec.clues[1] + 1 || attempt > 200) return result;
      if (!fallback || fallback.grade.level < spec.minLevel || clueCount(puzzle) < clueCount(fallback.puzzle)) fallback = result;
    } else if (g.solved && (!fallback || Math.abs(g.level - spec.minLevel) < Math.abs(fallback.grade.level - spec.minLevel))) {
      fallback = { puzzle, solution, difficulty, grade: g, attempts: attempt + 1 };
    }
    if (Date.now() - started > budgetMs && fallback) return fallback;
  }
}

// Daily: one shared puzzle per calendar day, harder as the week goes on (Mon easy → Sun expert).
const WEEKDAY_DIFF = ["expert", "easy", "medium", "medium", "hard", "hard", "expert"];
export const dailyDifficulty = (dateKey) => WEEKDAY_DIFF[new Date(`${dateKey}T12:00:00`).getDay()];
export const generateDaily = (dateKey) =>
  generate(dailyDifficulty(dateKey), { seed: hashString(`sudoku-daily-${dateKey}`), budgetMs: Infinity });
