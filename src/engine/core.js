// ─── GRID GEOMETRY ───
// Cells are indexed 0..80 row-major. Candidates are bitmasks with bit d set for digit d (1..9).
export const ALL = 0b1111111110;
export const R = (i) => (i / 9) | 0;
export const C = (i) => i % 9;
export const B = (i) => ((R(i) / 3) | 0) * 3 + ((C(i) / 3) | 0);

export const ROWS = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c));
export const COLS = Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c));
export const BOXES = Array.from({ length: 9 }, (_, b) =>
  Array.from({ length: 9 }, (_, k) => (((b / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + (b % 3) * 3 + (k % 3))
);
// 0-8 rows, 9-17 columns, 18-26 boxes
export const UNITS = [...ROWS, ...COLS, ...BOXES];
export const CELL_UNITS = Array.from({ length: 81 }, (_, i) => [R(i), 9 + C(i), 18 + B(i)]);
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of CELL_UNITS[i]) for (const j of UNITS[u]) if (j !== i) s.add(j);
  return [...s];
});

export const sees = (a, b) => a !== b && (R(a) === R(b) || C(a) === C(b) || B(a) === B(b));
export const unitName = (u) => (u < 9 ? `row ${u + 1}` : u < 18 ? `column ${u - 8}` : `box ${u - 17}`);
export const cellName = (i) => `R${R(i) + 1}C${C(i) + 1}`;

const POP = new Uint8Array(1024).map((_, m) => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c; });
export const popcount = (m) => POP[m];
export const digitsOf = (m) => { const out = []; for (let d = 1; d <= 9; d++) if (m & (1 << d)) out.push(d); return out; };
export const firstDigit = (m) => { for (let d = 1; d <= 9; d++) if (m & (1 << d)) return d; return 0; };

export function candidatesFor(values) {
  const cand = new Array(81).fill(0);
  for (let i = 0; i < 81; i++) {
    if (values[i]) continue;
    let used = 0;
    for (const p of PEERS[i]) used |= 1 << values[p];
    cand[i] = ALL & ~used;
  }
  return cand;
}

// Cells whose value clashes with a peer (rule violations, independent of the solution).
export function conflictsOf(values) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map();
    for (const i of unit) {
      const v = values[i];
      if (!v) continue;
      if (seen.has(v)) { bad.add(i); bad.add(seen.get(v)); } else seen.set(v, i);
    }
  }
  return bad;
}

// ─── BRUTE-FORCE SOLVER (bitmask DFS with minimum-remaining-values) ───
function search(values, rng, limit, onSolution) {
  const g = values.slice();
  const rows = new Uint16Array(9), cols = new Uint16Array(9), boxes = new Uint16Array(9);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v;
    if ((rows[R(i)] | cols[C(i)] | boxes[B(i)]) & bit) return 0;
    rows[R(i)] |= bit; cols[C(i)] |= bit; boxes[B(i)] |= bit;
  }
  let count = 0;
  const go = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = ALL & ~(rows[R(i)] | cols[C(i)] | boxes[B(i)]);
      const n = POP[m];
      if (n < bestN) { best = i; bestMask = m; bestN = n; if (n <= 1) break; }
    }
    if (best === -1) { count++; onSolution?.(g); return count >= limit; }
    if (bestN === 0) return false;
    let ds = digitsOf(bestMask);
    if (rng) ds = shuffle(ds, rng);
    const r = R(best), c = C(best), b = B(best);
    for (const d of ds) {
      const bit = 1 << d;
      g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (go()) return true;
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
    }
    return false;
  };
  go();
  return count;
}

export function solve(values, rng) {
  let out = null;
  search(values, rng, 1, (g) => { out = g.slice(); });
  return out;
}

export const countSolutions = (values, limit = 2) => search(values, null, limit);

// ─── RANDOMNESS ───
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function shuffle(a, rng = Math.random) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// ─── PUZZLE STRINGS ───
export function parsePuzzle(text) {
  const chars = (text || "").replace(/[^0-9.\-_*xX]/g, "");
  if (chars.length !== 81) return null;
  return [...chars].map((ch) => (/[1-9]/.test(ch) ? +ch : 0));
}

export const puzzleToString = (values) => values.map((v) => v || ".").join("");
