// ─── HUMAN-STYLE LOGICAL SOLVER ───
// Each technique inspects (values, cand) and returns the first step it finds, or null.
// The same steps grade generated puzzles and power the teaching hints.
import {
  UNITS, ROWS, COLS, BOXES, CELL_UNITS, PEERS, R, C, B, ALL,
  candidatesFor, popcount, digitsOf, firstDigit, sees, unitName, cellName,
} from "./core.js";

export const TECHNIQUES = {
  "naked-single":  { name: "Naked Single",     level: 1, blurb: "A cell where every digit but one is already used by its row, column or box." },
  "hidden-single": { name: "Hidden Single",    level: 1, blurb: "A digit that has only one possible home inside a row, column or box." },
  "pointing":      { name: "Pointing Pair",    level: 2, blurb: "When a digit's spots inside a box all line up, it can't appear elsewhere on that line." },
  "claiming":      { name: "Box/Line Claim",   level: 2, blurb: "When a digit's spots on a line all sit in one box, it can't appear elsewhere in that box." },
  "naked-pair":    { name: "Naked Pair",       level: 3, blurb: "Two cells in a unit that share the same two candidates lock those digits to themselves." },
  "hidden-pair":   { name: "Hidden Pair",      level: 3, blurb: "Two digits that only fit in the same two cells of a unit claim those cells." },
  "naked-triple":  { name: "Naked Triple",     level: 4, blurb: "Three cells whose candidates together use only three digits lock those digits in." },
  "hidden-triple": { name: "Hidden Triple",    level: 4, blurb: "Three digits confined to the same three cells of a unit claim those cells." },
  "x-wing":        { name: "X-Wing",           level: 5, blurb: "A digit confined to the same two columns across two rows (or vice versa) forms a rectangle that clears those lines." },
  "xy-wing":       { name: "XY-Wing",          level: 5, blurb: "A pivot with two candidates and two pincers force a shared digit out of any cell that sees both pincers." },
  "swordfish":     { name: "Swordfish",        level: 6, blurb: "An X-Wing stretched across three rows and three columns." },
  "naked-quad":    { name: "Naked Quad",       level: 6, blurb: "Four cells whose candidates use only four digits." },
};

const step = (id, fields) => ({ id, ...TECHNIQUES[id], ...fields });
const list = (xs) => (xs.length <= 1 ? `${xs[0] ?? ""}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) yield* combos(arr, k, i + 1, [...acc, arr[i]]);
}

// ─── SINGLES ───
function nakedSingle(values, cand) {
  for (let i = 0; i < 81; i++) {
    if (values[i] || popcount(cand[i]) !== 1) continue;
    const d = firstDigit(cand[i]);
    return step("naked-single", {
      place: { i, d }, focus: [i], units: [], digits: [d],
      nudge: `One cell in ${unitName(R(i))} has only a single option left.`,
      text: `${cellName(i)} can only be ${d} — every other digit already appears in its row, column or box.`,
    });
  }
  return null;
}

function hiddenSingle(values, cand) {
  // Boxes first: that's how most people scan.
  const order = [...UNITS.keys()].sort((a, b) => (b >= 18) - (a >= 18));
  for (const u of order) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      let spot = -1, n = 0;
      for (const i of UNITS[u]) {
        if (values[i] === d) { n = -1; break; }
        if (!values[i] && cand[i] & bit) { spot = i; n++; }
      }
      if (n !== 1) continue;
      return step("hidden-single", {
        place: { i: spot, d }, focus: [spot], units: [u], digits: [d],
        nudge: `Look at ${unitName(u)} — one digit has only one place to go.`,
        text: `In ${unitName(u)}, ${d} fits only in ${cellName(spot)}. Every other cell there is blocked for ${d}.`,
      });
    }
  }
  return null;
}

// ─── LOCKED CANDIDATES ───
function lockedCandidates(values, cand) {
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const spots = BOXES[b].filter((i) => !values[i] && cand[i] & bit);
      if (spots.length < 2) continue;
      for (const [line, idx, label] of [[ROWS, R, "row"], [COLS, C, "column"]]) {
        const k = idx(spots[0]);
        if (!spots.every((i) => idx(i) === k)) continue;
        const elims = line[k].filter((i) => B(i) !== b && !values[i] && cand[i] & bit).map((i) => ({ i, d }));
        if (!elims.length) continue;
        const u = label === "row" ? k : 9 + k;
        return step("pointing", {
          elims, focus: spots, units: [18 + b, u], digits: [d],
          nudge: `In box ${b + 1}, where can ${d} go?`,
          text: `In box ${b + 1}, every spot for ${d} lies in ${unitName(u)}. So ${d} must land in that stretch, and can be removed from the rest of ${unitName(u)}.`,
        });
      }
    }
  }
  for (let u = 0; u < 18; u++) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      const spots = UNITS[u].filter((i) => !values[i] && cand[i] & bit);
      if (spots.length < 2) continue;
      const b = B(spots[0]);
      if (!spots.every((i) => B(i) === b)) continue;
      const elims = BOXES[b].filter((i) => !UNITS[u].includes(i) && !values[i] && cand[i] & bit).map((i) => ({ i, d }));
      if (!elims.length) continue;
      return step("claiming", {
        elims, focus: spots, units: [u, 18 + b], digits: [d],
        nudge: `In ${unitName(u)}, where can ${d} go?`,
        text: `In ${unitName(u)}, every spot for ${d} sits inside box ${b + 1}. So box ${b + 1}'s ${d} must be on that line — remove ${d} from the box's other cells.`,
      });
    }
  }
  return null;
}

// ─── NAKED / HIDDEN SUBSETS ───
const SUBSET_IDS = { naked: { 2: "naked-pair", 3: "naked-triple", 4: "naked-quad" }, hidden: { 2: "hidden-pair", 3: "hidden-triple" } };
const SUBSET_WORD = { 2: "two", 3: "three", 4: "four" };

function nakedSubset(n) {
  return (values, cand) => {
    for (let u = 0; u < 27; u++) {
      const empty = UNITS[u].filter((i) => !values[i]);
      if (empty.length <= n) continue;
      const pool = empty.filter((i) => popcount(cand[i]) >= 2 && popcount(cand[i]) <= n);
      for (const cells of combos(pool, n)) {
        let mask = 0;
        for (const i of cells) mask |= cand[i];
        if (popcount(mask) !== n) continue;
        const elims = [];
        for (const i of empty) if (!cells.includes(i)) for (const d of digitsOf(cand[i] & mask)) elims.push({ i, d });
        if (!elims.length) continue;
        const ds = digitsOf(mask);
        return step(SUBSET_IDS.naked[n], {
          elims, focus: cells, units: [u], digits: ds,
          nudge: `Look for ${SUBSET_WORD[n]} cells in ${unitName(u)} that share the same few candidates.`,
          text: `${list(cells.map(cellName))} can only hold ${list(ds)}. Those ${SUBSET_WORD[n]} digits must fill those ${SUBSET_WORD[n]} cells, so remove them from the rest of ${unitName(u)}.`,
        });
      }
    }
    return null;
  };
}

function hiddenSubset(n) {
  return (values, cand) => {
    for (let u = 0; u < 27; u++) {
      const empty = UNITS[u].filter((i) => !values[i]);
      if (empty.length <= n) continue;
      const where = {};
      const pool = [];
      for (let d = 1; d <= 9; d++) {
        const spots = empty.filter((i) => cand[i] & (1 << d));
        if (spots.length >= 2 && spots.length <= n) { where[d] = spots; pool.push(d); }
      }
      for (const ds of combos(pool, n)) {
        const cells = [...new Set(ds.flatMap((d) => where[d]))];
        if (cells.length !== n) continue;
        const keep = ds.reduce((m, d) => m | (1 << d), 0);
        const elims = [];
        for (const i of cells) for (const d of digitsOf(cand[i] & ~keep)) elims.push({ i, d });
        if (!elims.length) continue;
        return step(SUBSET_IDS.hidden[n], {
          elims, focus: cells, units: [u], digits: ds,
          nudge: `In ${unitName(u)}, ${SUBSET_WORD[n]} digits are squeezed into the same ${SUBSET_WORD[n]} cells.`,
          text: `In ${unitName(u)}, ${list(ds)} only fit in ${list(cells.map(cellName))}. Those cells must hold exactly those digits, so their other candidates can go.`,
        });
      }
    }
    return null;
  };
}

// ─── FISH (X-Wing, Swordfish) ───
function fish(n) {
  const id = n === 2 ? "x-wing" : "swordfish";
  return (values, cand) => {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << d;
      for (const rowBase of [true, false]) {
        const base = rowBase ? ROWS : COLS;
        const cross = rowBase ? COLS : ROWS;
        const crossOf = rowBase ? C : R;
        const lines = [];
        for (let k = 0; k < 9; k++) {
          const spots = base[k].filter((i) => !values[i] && cand[i] & bit);
          if (spots.length >= 2 && spots.length <= n) lines.push({ k, spots });
        }
        for (const set of combos(lines, n)) {
          const crossSet = [...new Set(set.flatMap((l) => l.spots.map(crossOf)))];
          if (crossSet.length !== n) continue;
          const baseKs = set.map((l) => l.k);
          const elims = [];
          for (const x of crossSet) {
            for (const i of cross[x]) {
              const k = rowBase ? R(i) : C(i);
              if (!baseKs.includes(k) && !values[i] && cand[i] & bit) elims.push({ i, d });
            }
          }
          if (!elims.length) continue;
          const bw = rowBase ? "rows" : "columns", cw = rowBase ? "columns" : "rows";
          const units = [...baseKs.map((k) => (rowBase ? k : 9 + k)), ...crossSet.map((x) => (rowBase ? 9 + x : x))];
          return step(id, {
            elims, focus: set.flatMap((l) => l.spots), units, digits: [d],
            nudge: `Follow the ${d}s: a few ${bw} only allow ${d} in the same ${cw}.`,
            text: `In ${bw} ${list(baseKs.map((k) => k + 1))}, ${d} can only go in ${cw} ${list(crossSet.map((x) => x + 1).sort())}. Those ${cw} get their ${d} from these ${bw}, so ${d} can be removed everywhere else in them.`,
          });
        }
      }
    }
    return null;
  };
}

// ─── XY-WING ───
function xyWing(values, cand) {
  const bivalue = [];
  for (let i = 0; i < 81; i++) if (!values[i] && popcount(cand[i]) === 2) bivalue.push(i);
  for (const p of bivalue) {
    const [a, b] = digitsOf(cand[p]);
    const wings = bivalue.filter((w) => w !== p && sees(p, w) && popcount(cand[w] & cand[p]) === 1);
    for (const w1 of wings) {
      if (!(cand[w1] & (1 << a))) continue;
      const z = firstDigit(cand[w1] & ~(1 << a));
      for (const w2 of wings) {
        if (w2 === w1 || cand[w2] !== ((1 << b) | (1 << z))) continue;
        const elims = [];
        for (let i = 0; i < 81; i++) {
          if (values[i] || i === p || i === w1 || i === w2) continue;
          if (cand[i] & (1 << z) && sees(i, w1) && sees(i, w2)) elims.push({ i, d: z });
        }
        if (!elims.length) continue;
        return step("xy-wing", {
          elims, focus: [p, w1, w2], units: [], digits: [z],
          nudge: `Find a cell with two candidates that links two other two-candidate cells.`,
          text: `${cellName(p)} is ${a} or ${b}. If it's ${a}, ${cellName(w1)} becomes ${z}; if it's ${b}, ${cellName(w2)} becomes ${z}. Either way one of them is ${z}, so no cell seeing both can be ${z}.`,
        });
      }
    }
  }
  return null;
}

const FINDERS = [
  nakedSingle, hiddenSingle, lockedCandidates,
  nakedSubset(2), hiddenSubset(2), nakedSubset(3), hiddenSubset(3),
  fish(2), xyWing, fish(3), nakedSubset(4),
];

export function findStep(values, cand) {
  for (const f of FINDERS) { const s = f(values, cand); if (s) return s; }
  return null;
}

export function applyStep(values, cand, s) {
  if (s.place) {
    const { i, d } = s.place;
    values[i] = d; cand[i] = 0;
    for (const p of PEERS[i]) cand[p] &= ~(1 << d);
  }
  if (s.elims) for (const { i, d } of s.elims) cand[i] &= ~(1 << d);
}

// Solve as a human would. `level` is the hardest technique needed; Infinity means our toolbox wasn't enough.
export function grade(puzzle) {
  const values = puzzle.slice();
  const cand = candidatesFor(values);
  const counts = {};
  let level = 0, score = 0;
  for (let guard = 0; guard < 1000; guard++) {
    if (!values.includes(0)) return { solved: true, level, score, counts };
    const s = findStep(values, cand);
    if (!s) return { solved: false, level: Infinity, score, counts };
    counts[s.id] = (counts[s.id] || 0) + 1;
    level = Math.max(level, s.level);
    score += s.level * s.level;
    applyStep(values, cand, s);
  }
  return { solved: false, level: Infinity, score, counts };
}

// The shortest run of logical steps from `values` that ends with a placed digit.
// Walks eliminations until one of them unlocks a placement. Long chains are rare but real on
// expert grids, so the cap is generous; the hint card lets the player skip to the end.
export function hintChain(values, maxSteps = 60) {
  const v = values.slice();
  const cand = candidatesFor(v);
  const chain = [];
  while (chain.length < maxSteps) {
    const s = findStep(v, cand);
    if (!s) break;
    chain.push(s);
    if (s.place) return chain;
    applyStep(v, cand, s);
  }
  return chain.length ? chain : null;
}

export { ALL };
