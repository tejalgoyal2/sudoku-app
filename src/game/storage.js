// ─── LOCAL PERSISTENCE ───
// Everything lives on-device. Each read is defensive: storage can be blocked or hold old shapes.
import { DIFF_KEYS } from "../engine/generator.js";
import { starsFor } from "./challenges.js";

const KEYS = { stats: "sudoku_stats_v2", settings: "sudoku_settings_v2", game: "sudoku_game_v2" };
const LEGACY = { stats: "sudoku_stats_v1", settings: "sudoku_settings_v1" };

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const remove = (k) => { try { localStorage.removeItem(k); } catch {} };

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayDiff = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

// ─── SETTINGS ───
export const DEFAULT_SETTINGS = {
  theme: "auto",
  sound: true,
  voice: "theme",
  volume: 0.5,
  haptics: true,
  autoCheck: true,
  mistakeLimit: 3,
  highlightPeers: true,
  highlightSame: true,
  highlightConflicts: true,
  autoRemoveNotes: true,
  showTimer: true,
  zen: false,
};

export function loadSettings() {
  const s = read(KEYS.settings);
  if (s) return { ...DEFAULT_SETTINGS, ...s };
  const legacy = read(LEGACY.settings);
  if (legacy && typeof legacy.dark === "boolean") return { ...DEFAULT_SETTINGS, theme: legacy.dark ? "graphite" : "paper" };
  return { ...DEFAULT_SETTINGS };
}
export const saveSettings = (s) => write(KEYS.settings, s);

// ─── STATS ───
const emptyDiff = () => ({ played: 0, won: 0, bestTime: null, totalTime: 0, flawless: 0 });
export const emptyStats = () => ({
  byDiff: Object.fromEntries(DIFF_KEYS.map((d) => [d, emptyDiff()])),
  history: [],
  streak: { current: 0, best: 0, lastDate: null },
  daily: {},
  challenges: {},
});

export function loadStats() {
  const s = read(KEYS.stats);
  if (s?.byDiff) return { ...emptyStats(), ...s, byDiff: { ...emptyStats().byDiff, ...s.byDiff } };
  const legacy = read(LEGACY.stats);
  const fresh = emptyStats();
  if (legacy) {
    for (const d of DIFF_KEYS) if (legacy[d]) fresh.byDiff[d] = { ...emptyDiff(), ...legacy[d] };
    fresh.streak = {
      current: legacy.currentStreak || 0,
      best: legacy.bestStreak || 0,
      lastDate: legacy.lastPlayDate ? todayKey(new Date(legacy.lastPlayDate)) : null,
    };
  }
  return fresh;
}
export const saveStats = (s) => write(KEYS.stats, s);

// Returns the new stats plus what changed, so the win screen can celebrate it.
export function recordResult(stats, game) {
  const s = structuredClone(stats);
  const won = game.status === "won";
  const d = s.byDiff[game.difficulty] || (s.byDiff[game.difficulty] = emptyDiff());
  const flawless = won && game.mistakes === 0 && game.hints === 0;
  const counted = !game.rescued;
  const prevBest = d.bestTime;
  const today = todayKey();

  if (counted) d.played++;
  if (won) {
    d.won++;
    d.totalTime += game.elapsed;
    if (flawless) d.flawless = (d.flawless || 0) + 1;
    if (counted && game.mode !== "challenge" && (!d.bestTime || game.elapsed < d.bestTime)) d.bestTime = game.elapsed;

    const gap = s.streak.lastDate ? dayDiff(s.streak.lastDate, today) : null;
    if (gap === null || gap > 1) s.streak.current = 1;
    else if (gap === 1) s.streak.current++;
    s.streak.lastDate = today;
    s.streak.best = Math.max(s.streak.best, s.streak.current);

    if (game.mode === "daily" && !s.daily[game.dateKey]) {
      s.daily[game.dateKey] = { time: game.elapsed, mistakes: game.mistakes, hints: game.hints, difficulty: game.difficulty };
    }
  }
  const stars = starsFor(game);
  if (game.mode === "challenge") {
    const c = s.challenges[game.challenge] || (s.challenges[game.challenge] = { played: 0, won: 0, stars: 0, best: null });
    c.played++;
    if (won) {
      c.won++;
      c.stars = Math.max(c.stars, stars);
      if (!c.best || game.elapsed < c.best) c.best = game.elapsed;
    }
  }

  s.history = [
    { difficulty: game.difficulty, mode: game.mode, challenge: game.challenge, won, time: game.elapsed, mistakes: game.mistakes, hints: game.hints, date: today },
    ...s.history,
  ].slice(0, 200);

  return {
    stats: s,
    personalBest: won && counted && game.mode !== "challenge" && prevBest !== null && game.elapsed < prevBest,
    stars,
    firstWin: won && d.won === 1,
    flawless,
  };
}

export function dailyStreak(stats, today = todayKey()) {
  let n = 0;
  const d = new Date(`${today}T12:00:00`);
  if (!stats.daily[today]) d.setDate(d.getDate() - 1);
  while (stats.daily[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ─── IN-PROGRESS GAME ───
export function loadGame() {
  const g = read(KEYS.game);
  return g?.puzzle?.length === 81 && g.status === "playing" ? g : null;
}
export function saveGame(game) {
  if (!game || game.status !== "playing") { remove(KEYS.game); return; }
  const { fx, ...rest } = game;
  write(KEYS.game, { ...rest, past: rest.past.slice(-2000), future: [] });
}
export const clearGame = () => remove(KEYS.game);
