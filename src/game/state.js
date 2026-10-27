// ─── GAME REDUCER ───
// All game rules live here. Side effects (sound, haptics, animation) are described by `fx`
// and played by the UI, so undo/redo and persistence stay pure.
import { UNITS, BOXES, PEERS, R, C, B, candidatesFor } from "../engine/core.js";
import { CHALLENGES } from "./challenges.js";

export function newGame({ puzzle, solution, difficulty, grade, mode = "classic", dateKey = null, challenge = null }) {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mode, difficulty, dateKey, grade: grade ? { level: grade.level, counts: grade.counts } : null,
    challenge, rules: challenge ? CHALLENGES[challenge].rules : null,
    bonusTime: 0, awarded: [],
    puzzle, solution,
    values: puzzle.slice(),
    notes: Array(81).fill(0),
    selected: puzzle.indexOf(0),
    notesMode: false,
    lockedDigit: 0,
    mistakes: 0, hints: 0, assists: 0,
    elapsed: 0,
    status: "playing",
    rescued: false,
    past: [], future: [],
    boxOrder: [],
    fx: { seq: 0 },
  };
}

const solvedUnit = (values, solution, u) => UNITS[u].every((i) => values[i] === solution[i]);
const placedCount = (values, solution, d) => values.reduce((n, v, i) => n + (v === d && solution[i] === d ? 1 : 0), 0);

// Writes a set of cell changes and records them as one undoable entry.
function commit(state, changes, extra = {}) {
  const values = state.values.slice(), notes = state.notes.slice();
  const entry = [];
  for (const [i, v, n] of changes) {
    if (values[i] === v && notes[i] === n) continue;
    entry.push([i, values[i], notes[i], v, n]);
    values[i] = v; notes[i] = n;
  }
  if (!entry.length) return null;
  return { ...state, values, notes, past: [...state.past, entry], future: [], ...extra };
}

const fx = (state, type, data = {}) => ({ seq: state.fx.seq + 1, type, ...data });

function afterPlacement(prev, next, i, d, opts) {
  const { solution } = next;
  const correct = d === solution[i];
  let s = next;

  if (!correct) {
    const mistakes = s.mistakes + 1;
    const limit = opts.autoCheck && !s.rescued ? opts.mistakeLimit : 0;
    // On a countdown a wrong digit costs time, more than a right one earns, so guessing doesn't pay.
    const bonusTime = s.bonusTime - (s.rules?.penalty || 0);
    const outOfTime = !!s.rules?.countdown && s.elapsed >= s.rules.countdown + bonusTime;
    const lost = outOfTime || (limit > 0 && mistakes >= limit);
    return { ...s, mistakes, bonusTime, status: lost ? "lost" : s.status, fx: fx(s, lost ? "lost" : "error", { cells: [i], digit: d, silent: !opts.autoCheck, reason: outOfTime ? "time" : undefined }) };
  }

  if (s.rules?.bonus && !s.awarded.includes(i)) s = { ...s, bonusTime: s.bonusTime + s.rules.bonus, awarded: [...s.awarded, i] };

  const units = [R(i), 9 + C(i), 18 + B(i)].filter((u) => !solvedUnit(prev.values, solution, u) && solvedUnit(s.values, solution, u));
  const boxOrder = units.includes(18 + B(i)) ? [...s.boxOrder, B(i)] : s.boxOrder;
  const digitDone = placedCount(s.values, solution, d) === 9;
  s = { ...s, boxOrder, lockedDigit: digitDone && s.lockedDigit === d ? 0 : s.lockedDigit };

  if (s.values.every((v, k) => v === solution[k])) return { ...s, status: "won", selected: null, fx: fx(s, "won", { cells: [i] }) };
  if (units.length) return { ...s, fx: fx(s, "unit", { cells: [i], units, digit: d, digitDone }) };
  if (digitDone) return { ...s, fx: fx(s, "digit", { cells: [i], digit: d }) };
  if (!opts.autoCheck && s.values.every(Boolean)) return { ...s, fx: fx(s, "full-wrong") };
  return { ...s, fx: fx(s, "place", { cells: [i], digit: d }) };
}

function input(state, { d, i = state.selected, note = state.notesMode }, opts) {
  if (i === null || i === undefined || state.status !== "playing" || state.puzzle[i]) return state;
  const v = state.values[i];

  if (note) {
    if (state.rules?.noNotes) return state;
    if (v && (!opts.autoCheck || v === state.solution[i])) return state;
    const s = commit(state, [[i, 0, state.notes[i] ^ (1 << d)]]);
    return s ? { ...s, fx: fx(s, "note", { cells: [i], digit: d }) } : state;
  }

  if (v === d) return erase(state, i);
  if (opts.autoCheck && v && v === state.solution[i]) return state; // confirmed cells stay put

  const changes = [[i, d, 0]];
  const clearsNotes = opts.autoRemoveNotes && (d === state.solution[i] || !opts.autoCheck);
  if (clearsNotes) for (const p of PEERS[i]) if (state.notes[p] & (1 << d)) changes.push([p, state.values[p], state.notes[p] & ~(1 << d)]);
  const s = commit(state, changes);
  return s ? afterPlacement(state, s, i, d, opts) : state;
}

function erase(state, i = state.selected) {
  if (i === null || state.status !== "playing" || state.puzzle[i]) return state;
  const s = commit(state, [[i, 0, 0]]);
  return s ? { ...s, fx: fx(s, "erase", { cells: [i] }) } : state;
}

function timeTravel(state, from, to, useNext) {
  if (state.status !== "playing" || !state[from].length) return state;
  const entry = state[from][state[from].length - 1];
  const values = state.values.slice(), notes = state.notes.slice();
  for (const [i, pv, pn, nv, nn] of entry) { values[i] = useNext ? nv : pv; notes[i] = useNext ? nn : pn; }
  return {
    ...state, values, notes,
    [from]: state[from].slice(0, -1),
    [to]: [...state[to], entry],
    selected: entry[0][0],
    fx: fx(state, useNext ? "redo" : "undo", { cells: entry.map((e) => e[0]) }),
  };
}

function move(state, { dr, dc, jump }) {
  const start = state.selected ?? 40;
  let r = R(start), c = C(start);
  for (let k = 0; k < 9; k++) {
    r = (r + dr + 9) % 9; c = (c + dc + 9) % 9;
    if (!jump || !state.values[r * 9 + c]) break;
  }
  return { ...state, selected: r * 9 + c };
}

function nextEmpty(state, dir) {
  const start = state.selected ?? -1;
  for (let k = 1; k <= 81; k++) {
    const i = (((start + k * dir) % 81) + 81) % 81;
    if (!state.values[i]) return { ...state, selected: i };
  }
  return state;
}

// Challenge rules override the player's settings: mistakes always count, and the limit is the challenge's.
const rulesOpts = (state, opts) =>
  state?.rules ? { ...opts, autoCheck: true, mistakeLimit: state.rules.mistakeLimit || 0 } : opts;

export function reducer(state, action) {
  const opts = rulesOpts(state, action.opts || {});
  const rules = state?.rules || {};
  switch (action.type) {
    case "load": return action.game;
    case "select":
      return state.status === "playing" ? { ...state, selected: action.i } : state;
    case "move": return state.status === "playing" ? move(state, action) : state;
    case "next-empty": return state.status === "playing" ? nextEmpty(state, action.dir) : state;
    case "toggle-notes": return rules.noNotes ? state : { ...state, notesMode: !state.notesMode };
    case "lock-digit": return { ...state, lockedDigit: state.lockedDigit === action.d ? 0 : action.d };
    case "input": return input(state, action, opts);
    case "erase": return erase(state);
    case "undo": return timeTravel(state, "past", "future", false);
    case "redo": return timeTravel(state, "future", "past", true);
    case "hint-used": return rules.noHints ? state : { ...state, hints: state.hints + 1 };
    case "tick": {
      if (state.status !== "playing") return state;
      const s = { ...state, elapsed: state.elapsed + 1 };
      if (rules.countdown && s.elapsed >= rules.countdown + s.bonusTime) return { ...s, status: "lost", fx: fx(s, "lost", { cells: [], reason: "time" }) };
      return s;
    }

    case "auto-notes": {
      if (state.status !== "playing" || rules.noNotes || rules.noAutoNotes) return state;
      const trusted = state.values.map((v, i) => (opts.autoCheck && v !== state.solution[i] ? 0 : v));
      const cand = candidatesFor(trusted);
      const changes = [];
      for (let i = 0; i < 81; i++) if (!state.values[i]) changes.push([i, 0, cand[i]]);
      const s = commit(state, changes, { assists: state.assists + 1 });
      return s ? { ...s, fx: fx(s, "auto-notes", { cells: changes.map((c) => c[0]) }) } : state;
    }

    case "clear-notes": {
      const changes = [];
      for (let i = 0; i < 81; i++) if (state.notes[i]) changes.push([i, state.values[i], 0]);
      return commit(state, changes) || state;
    }

    // A hint either fixes a mistake or walks a logical chain that ends in a placement.
    case "apply-hint": {
      const { hint } = action;
      if (state.status !== "playing" || rules.noHints) return state;
      if (hint.kind === "mistake") {
        const s = commit(state, [[hint.i, 0, 0]], { selected: hint.i });
        return s ? { ...s, fx: fx(s, "erase", { cells: [hint.i] }) } : state;
      }
      const notes = state.notes.slice();
      const changes = new Map();
      for (const st of hint.chain) for (const { i, d } of st.elims || []) {
        if (notes[i] & (1 << d)) { notes[i] &= ~(1 << d); changes.set(i, [i, state.values[i], notes[i]]); }
      }
      const last = hint.chain[hint.chain.length - 1];
      const base = state;
      if (!last.place) {
        const s = commit(base, [...changes.values()]);
        return s ? { ...s, fx: fx(s, "hint", { cells: [...changes.keys()] }) } : { ...base, fx: fx(base, "hint", { cells: [] }) };
      }
      const { i, d } = last.place;
      const s = commit({ ...base, notesMode: false }, [...changes.values()]) || { ...base, notesMode: false };
      return input({ ...s, selected: i }, { d, i, note: false }, { ...opts, autoRemoveNotes: true });
    }

    // After running out of mistakes the player may keep going; the result won't count toward records.
    case "rescue": return state.rules ? state : { ...state, status: "playing", rescued: true };
    default: return state;
  }
}

export const progressOf = (g) => {
  const empty = g.puzzle.filter((v) => !v).length;
  const filled = g.values.reduce((n, v, i) => n + (!g.puzzle[i] && v === g.solution[i] ? 1 : 0), 0);
  return empty ? filled / empty : 1;
};

export { BOXES };
