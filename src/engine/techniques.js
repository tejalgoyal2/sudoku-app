// ─── HUMAN-STYLE LOGICAL SOLVER ───
// Each technique inspects (values, cand) and returns the first step it finds, or null.
// The same steps grade generated puzzles and power the teaching hints.
import {
  UNITS, ROWS, COLS, BOXES, CELL_UNITS, PEERS, R, C, B, ALL,
  candidatesFor, popcount, digitsOf, firstDigit, sees, unitName, cellName,
} from "./core.js";

export const TECHNIQUES = {
  "naked-single":  { name: "Naked Single",     level: 1, blurb: "An empty cell where every digit but one is ruled out by its row, column and box." },
  "hidden-single": { name: "Hidden Single",    level: 1, blurb: "A digit that has only one cell left in a row, column or box, even if that cell could be other digits too." },
  "pointing":      { name: "Pointing Pair",    level: 2, blurb: "If a digit's only spots in a box all sit on one line, the rest of that line can't have that digit." },
  "claiming":      { name: "Box/Line Claim",   level: 2, blurb: "If a digit's only spots on a line all sit in one box, the rest of that box can't have that digit." },
  "naked-pair":    { name: "Naked Pair",       level: 3, blurb: "Two cells that can only be the same two digits use them up, so no one else in that row, column or box can be those digits." },
  "hidden-pair":   { name: "Hidden Pair",      level: 3, blurb: "Two digits that only fit in the same two cells claim those cells, so those cells can't be anything else." },
  "naked-triple":  { name: "Naked Triple",     level: 4, blurb: "Three cells that between them only have the same three digits use them up." },
  "hidden-triple": { name: "Hidden Triple",    level: 4, blurb: "Three digits that only fit in the same three cells claim those cells." },
  "x-wing":        { name: "X-Wing",           level: 5, blurb: "A digit that has just two spots in each of two rows, in the same two columns. Those columns can't have it anywhere else (and the same with rows and columns swapped)." },
  "xy-wing":       { name: "XY-Wing",          level: 5, blurb: "Three two-option cells in a chain. One of the two outer ones must be the shared digit, so any cell that sees both can't be it." },
  "swordfish":     { name: "Swordfish",        level: 6, blurb: "Like an X-Wing, but spread over three rows and three columns." },
  "naked-quad":    { name: "Naked Quad",       level: 6, blurb: "Four cells that between them only have the same four digits use them up." },
};

const step = (id, fields) => ({ id, ...TECHNIQUES[id], ...fields });
const list = (xs, and = "and") => (xs.length <= 1 ? `${xs[0] ?? ""}` : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);

const WORD = { 2: "two", 3: "three", 4: "four" };
const sorted = (xs) => [...xs].sort((a, b) => a - b);
const cellList = (cells) => list(cells.map(cellName));
const cap = (t) => t[0].toUpperCase() + t.slice(1);

// Why can't `d` go in cell `i`? A filled peer holding d is the reason (and the cell to point at).
const blockerOf = (values, i, d) => PEERS[i].find((p) => values[p] === d) ?? -1;

function* combos(arr, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) yield* combos(arr, k, i + 1, [...acc, arr[i]]);
}

// ─── SINGLES ───
function nakedSingle(values, cand) {
  for (let i = 0; i < 81; i++) {
    if (values[i] || popcount(cand[i]) !== 1) continue;
    const d = firstDigit(cand[i]);
    // For every other digit, find the filled cell that rules it out, and file it under row / column / box.
    const byUnit = { row: [], column: [], box: [] }, proof = [], unexplained = [];
    for (let e = 1; e <= 9; e++) {
      if (e === d) continue;
      const h = blockerOf(values, i, e);
      if (h < 0) { unexplained.push(e); continue; }
      proof.push(h);
      byUnit[R(h) === R(i) ? "row" : C(h) === C(i) ? "column" : "box"].push(e);
    }
    const where = { row: R(i) + 1, column: C(i) + 1, box: B(i) + 1 };
    const parts = Object.entries(byUnit).filter(([, ds]) => ds.length).map(([u, ds]) => `${u} ${where[u]} has ${list(ds)}`);
    const ruled = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((e) => e !== d && !unexplained.includes(e));
    return step("naked-single", {
      place: { i, d }, focus: [i], units: [], digits: [d], proof,
      headline: `${cellName(i)} has to be ${d}`,
      nudge: `Look at ${unitName(R(i))}. One empty cell there has only a single digit that can still go in it. Can you spot it?`,
      text: `${cap(parts.join("; "))}. So ${cellName(i)} can't be ${list(ruled, "or")}.${unexplained.length ? ` Earlier steps also ruled out ${list(unexplained)}.` : ""} The only digit left is ${d}.`,
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
      // Every other empty cell in the unit is blocked for d. Ring the d that blocks it, cross d out in it.
      const proof = new Set(), crossed = {};
      let early = false;
      for (const i of UNITS[u]) {
        if (values[i] || i === spot) continue;
        crossed[i] = bit;
        const h = blockerOf(values, i, d);
        if (h >= 0) proof.add(h); else early = true;
      }
      return step("hidden-single", {
        place: { i: spot, d }, focus: [spot], units: [u], digits: [d], proof: [...proof], crossed,
        headline: `In ${unitName(u)}, the ${d} can only go in ${cellName(spot)}`,
        nudge: `Look at ${unitName(u)}. One digit has just one cell left where it can go. Can you find which?`,
        text: `${cap(unitName(u))} needs a ${d}. Every other empty cell in it can't be ${d}: each one already sees a ${d} in its row, column or box (ringed on the board, and crossed out in those cells).${early ? " A few were ruled out by the earlier steps." : ""} That leaves ${cellName(spot)} for the ${d}.`,
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
          elims, focus: spots, units: [18 + b, u], digits: [d], marks: Object.fromEntries(spots.map((i) => [i, bit])),
          headline: `In box ${b + 1}, the ${d} must be in ${unitName(u)}`,
          nudge: `Look at box ${b + 1}. Where can the ${d} still go? Notice anything about those cells?`,
          text: `In box ${b + 1}, the ${d} can only go in ${cellList(spots)}, and they're all in ${unitName(u)}. So box ${b + 1}'s ${d} will land in ${unitName(u)}, and no other cell in ${unitName(u)} can be ${d}. Cross out the ${d} in ${cellList(elims.map((e) => e.i))}.`,
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
        elims, focus: spots, units: [u, 18 + b], digits: [d], marks: Object.fromEntries(spots.map((i) => [i, bit])),
        headline: `In ${unitName(u)}, the ${d} must be in box ${b + 1}`,
        nudge: `Look at ${unitName(u)}. Where can the ${d} still go? Notice anything about those cells?`,
        text: `In ${unitName(u)}, the ${d} can only go in ${cellList(spots)}, and they're all in box ${b + 1}. So box ${b + 1}'s ${d} has to be on that line, and no other cell in the box can be ${d}. Cross out the ${d} in ${cellList(elims.map((e) => e.i))}.`,
      });
    }
  }
  return null;
}

// ─── NAKED / HIDDEN SUBSETS ───
const SUBSET_IDS = { naked: { 2: "naked-pair", 3: "naked-triple", 4: "naked-quad" }, hidden: { 2: "hidden-pair", 3: "hidden-triple" } };

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
          elims, focus: cells, units: [u], digits: ds, marks: Object.fromEntries(cells.map((i) => [i, cand[i]])),
          headline: `${cellList(cells)} hold ${list(ds)} between them`,
          nudge: `Look at ${unitName(u)}. Can you find ${WORD[n]} cells that only have the same ${WORD[n]} digits left?`,
          text: `${cellList(cells)} can only be ${list(ds, "or")}. Together they take ${n === 2 ? "both" : `all ${WORD[n]}`} of those digits, so nobody else in ${unitName(u)} can be ${list(ds, "or")}. Cross them out of the other cells.`,
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
          elims, focus: cells, units: [u], digits: ds, marks: Object.fromEntries(cells.map((i) => [i, cand[i] & keep])),
          headline: `${list(ds)} can only go in ${cellList(cells)}`,
          nudge: `Look at ${unitName(u)}. ${n === 2 ? "Two digits only fit" : "Three digits only fit"} in the same ${WORD[n]} cells. Which?`,
          text: `In ${unitName(u)}, the ${list(ds)} have no other place to go than ${cellList(cells)}. So those ${WORD[n]} cells will hold exactly those digits, and any other digit in them can be crossed out.`,
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
          const spots = set.flatMap((l) => l.spots);
          return step(id, {
            elims, focus: spots, units, digits: [d], marks: Object.fromEntries(spots.map((i) => [i, bit])),
            headline: `The ${d}s in ${bw} ${list(baseKs.map((k) => k + 1))} line up`,
            nudge: `Follow the ${d}s. In ${WORD[n]} ${bw}, the ${d} can only go in the same ${WORD[n]} ${cw}. Can you see which?`,
            text: `In ${bw} ${list(baseKs.map((k) => k + 1))}, the ${d} can only go in ${cw} ${list(sorted(crossSet).map((x) => x + 1))} (marked). So ${bw} ${list(baseKs.map((k) => k + 1))} put their ${d}s in those ${WORD[n]} ${cw}, and no other cell in ${cw} ${list(sorted(crossSet).map((x) => x + 1))} can be ${d}. Cross them out.`,
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
          elims, focus: [p, w1, w2], units: [], digits: [z], marks: Object.fromEntries([p, w1, w2].map((i) => [i, cand[i]])),
          headline: `${cellName(p)}, ${cellName(w1)} and ${cellName(w2)} force a ${z}`,
          nudge: `Find a cell with only two options that links two other two-option cells. Together they force a digit.`,
          text: `${cellName(p)} is ${a} or ${b}. If it's ${a}, then ${cellName(w1)} can't be ${a}, so it's ${z}. If it's ${b}, then ${cellName(w2)} can't be ${b}, so it's ${z}. Either way one of those two is a ${z}, so any cell that sees both of them can't be ${z}. Cross the ${z} out of those cells.`,
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
