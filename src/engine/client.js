// Puzzle generation runs off the main thread. We keep one puzzle per difficulty warm
// so "New game" feels instant.
import { generate, generateDaily } from "./generator.js";

let worker = null;
let nextId = 1;
const pending = new Map();
const warm = new Map();

function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => { pending.get(data.id)?.(data.result); pending.delete(data.id); };
    worker.onerror = () => { worker = false; };
  } catch {
    worker = false;
  }
  return worker;
}

function run(msg) {
  const w = getWorker();
  if (!w) return new Promise((res) => setTimeout(() => res(msg.dateKey ? generateDaily(msg.dateKey) : generate(msg.difficulty)), 0));
  return new Promise((res) => { const id = nextId++; pending.set(id, res); w.postMessage({ id, ...msg }); });
}

export function requestPuzzle(difficulty) {
  const ready = warm.get(difficulty);
  warm.delete(difficulty);
  const p = ready || run({ difficulty });
  p.then(() => prefetch(difficulty));
  return p;
}

export function prefetch(difficulty) {
  if (!warm.has(difficulty)) warm.set(difficulty, run({ difficulty }));
}

export const requestDaily = (dateKey) => run({ dateKey });
