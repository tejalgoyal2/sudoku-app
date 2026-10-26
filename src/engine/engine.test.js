import { test } from "node:test";
import assert from "node:assert/strict";
import { countSolutions, candidatesFor, parsePuzzle, solve } from "./core.js";
import { grade, hintChain, applyStep, findStep } from "./techniques.js";
import { generate, generateDaily, DIFFICULTIES, DIFF_KEYS } from "./generator.js";
import { reducer, newGame } from "../game/state.js";
import { computeHint } from "../game/hints.js";

const OPTS = { autoCheck: true, mistakeLimit: 3, autoRemoveNotes: true };

test("every difficulty yields a unique puzzle graded within its band", () => {
  for (const d of DIFF_KEYS) {
    for (let k = 0; k < 5; k++) {
      const { puzzle, solution, grade: g } = generate(d);
      assert.equal(countSolutions(puzzle), 1, `${d} puzzle must be unique`);
      assert.ok(puzzle.every((v, i) => !v || v === solution[i]), "clues agree with solution");
      assert.ok(g.solved && g.level >= DIFFICULTIES[d].minLevel && g.level <= DIFFICULTIES[d].maxLevel, `${d} graded level ${g.level}`);
    }
  }
});

test("daily puzzle is the same for everyone on a given date", () => {
  const a = generateDaily("2026-10-25"), b = generateDaily("2026-10-25"), c = generateDaily("2026-10-26");
  assert.deepEqual(a.puzzle, b.puzzle);
  assert.notDeepEqual(a.puzzle, c.puzzle);
});

test("hint chains alone can solve a generated expert puzzle", () => {
  const { puzzle, solution } = generate("expert");
  const values = puzzle.slice();
  for (let guard = 0; guard < 200 && values.includes(0); guard++) {
    const chain = hintChain(values);
    assert.ok(chain, "a hint is always available");
    const last = chain[chain.length - 1];
    assert.ok(last.place, "chain ends in a placement");
    assert.equal(last.place.d, solution[last.place.i], `${last.name} placed the right digit`);
    values[last.place.i] = last.place.d;
  }
  assert.deepEqual(values, solution);
});

test("eliminations never remove a digit from its true cell", () => {
  const { puzzle, solution } = generate("expert");
  const values = puzzle.slice(), cand = candidatesFor(values);
  for (let guard = 0; guard < 300 && values.includes(0); guard++) {
    const s = findStep(values, cand);
    if (!s) break;
    for (const { i, d } of s.elims || []) assert.notEqual(solution[i], d, `${s.name} wrongly eliminated ${d}`);
    applyStep(values, cand, s);
  }
});

test("puzzles beyond the technique library are flagged and still get a hint", () => {
  // Arto Inkala's "world's hardest sudoku": needs chains far past our human toolbox.
  const p = parsePuzzle("800000000003600000070090200050007000000045700000100030001000068008500010090000400");
  assert.equal(countSolutions(p), 1);
  assert.equal(grade(p).level, Infinity);
  const solution = solve(p);
  const hint = computeHint({ values: p, puzzle: p, solution, selected: null });
  const step = hint.chain[0];
  assert.equal(step.id, "reveal");
  assert.equal(step.place.d, solution[step.place.i]);
});

test("reducer: mistakes, undo/redo, notes and winning", () => {
  const { puzzle, solution } = generate("easy");
  let s = newGame({ puzzle, solution, difficulty: "easy" });
  const i = puzzle.indexOf(0);
  const wrong = (solution[i] % 9) + 1;

  s = reducer(s, { type: "select", i });
  s = reducer(s, { type: "input", d: wrong, opts: OPTS });
  assert.equal(s.mistakes, 1);
  s = reducer(s, { type: "undo" });
  assert.equal(s.values[i], 0, "undo clears the wrong digit");
  assert.equal(s.mistakes, 1, "undo doesn't refund mistakes");
  s = reducer(s, { type: "redo" });
  assert.equal(s.values[i], wrong);

  s = reducer(s, { type: "erase" });
  s = reducer(s, { type: "input", d: 5, note: true, opts: OPTS });
  assert.equal(s.notes[i], 1 << 5);

  for (let k = 0; k < 2; k++) s = reducer(s, { type: "input", d: wrong, i, opts: OPTS }), s = reducer(s, { type: "erase" });
  assert.equal(s.status, "lost", "third mistake loses");
  s = reducer(s, { type: "rescue" });
  assert.equal(s.status, "playing");

  for (let k = 0; k < 81; k++) if (!s.puzzle[k]) s = reducer(s, { type: "input", d: solution[k], i: k, note: false, opts: OPTS });
  assert.equal(s.status, "won");
  assert.equal(s.boxOrder.length, 9, "every box completion is recorded for the share grid");
});

test("challenge rules: sudden death, pen only, countdown with bonus, stars", async () => {
  const { starsFor } = await import("../game/challenges.js");
  const { puzzle, solution } = generate("easy");
  const i = puzzle.indexOf(0), j = puzzle.indexOf(0, i + 1);
  const wrong = (solution[i] % 9) + 1;
  const lax = { autoCheck: false, mistakeLimit: 0, autoRemoveNotes: true };

  // Sudden death ignores the player's lax settings: one mistake ends it, and there's no rescue.
  let s = newGame({ puzzle, solution, difficulty: "medium", mode: "challenge", challenge: "sudden" });
  s = reducer(s, { type: "input", d: wrong, i, opts: lax });
  assert.equal(s.status, "lost");
  assert.equal(reducer(s, { type: "rescue" }).status, "lost");

  // Pen only: no notes, no hints.
  s = newGame({ puzzle, solution, difficulty: "medium", mode: "challenge", challenge: "pen" });
  assert.equal(reducer(s, { type: "toggle-notes" }).notesMode, false);
  assert.equal(reducer(s, { type: "input", d: 3, i, note: true, opts: OPTS }), s);
  assert.equal(reducer(s, { type: "auto-notes", opts: OPTS }), s);
  assert.equal(reducer(s, { type: "hint-used" }).hints, 0);

  // Blitz: correct digits buy time once per cell; the clock running out loses.
  s = newGame({ puzzle, solution, difficulty: "easy", mode: "challenge", challenge: "blitz" });
  s = reducer(s, { type: "input", d: solution[i], i, opts: OPTS });
  assert.equal(s.bonusTime, 4);
  s = reducer(s, { type: "erase" });
  s = reducer(s, { type: "input", d: solution[i], i, opts: OPTS });
  assert.equal(s.bonusTime, 4, "re-entering the same cell doesn't farm time");
  s = reducer(s, { type: "input", d: solution[j], i: j, opts: OPTS });
  assert.equal(s.bonusTime, 8);
  for (let t = 0; t < 308; t++) s = reducer(s, { type: "tick" });
  assert.equal(s.status, "lost");
  assert.equal(s.fx.reason, "time");

  // Stars: finishing, par, and gold-with-no-mistakes.
  const won = { challenge: "fog", status: "won", mistakes: 0 };
  assert.equal(starsFor({ ...won, elapsed: 900 }), 1);
  assert.equal(starsFor({ ...won, elapsed: 400 }), 2);
  assert.equal(starsFor({ ...won, elapsed: 300 }), 3);
  assert.equal(starsFor({ ...won, elapsed: 300, mistakes: 1 }), 2);
});

test("stats record challenge stars", async () => {
  const { recordResult, emptyStats } = await import("../game/storage.js");
  const game = { status: "won", mode: "challenge", challenge: "fog", difficulty: "easy", elapsed: 200, mistakes: 0, hints: 0, assists: 0, rescued: false, dateKey: null };
  const r = recordResult(emptyStats(), game);
  assert.equal(r.stars, 3);
  assert.equal(r.stats.challenges.fog.stars, 3);
  assert.equal(r.stats.byDiff.easy.bestTime, null, "challenge times don't set difficulty records");
  const slower = recordResult(r.stats, { ...game, elapsed: 900 });
  assert.equal(slower.stats.challenges.fog.stars, 3, "best stars are kept");
  assert.equal(slower.stats.challenges.fog.best, 200);
});
