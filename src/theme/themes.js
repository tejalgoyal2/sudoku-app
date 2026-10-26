// ─── THEMES ───
// A theme is like a chess set: a palette, a board and a set of digits. Beyond colour each one
// picks how the board is drawn (box shading, line style, corners), how the number keys look,
// which typeface the digits use and, for a couple, one small ink detail. Nothing lives in the
// page background. Applied as CSS custom properties and data attributes on <html>, so a theme
// switch never re-renders the board.

// board: [boxes, lines, corner radius]; keys: raised | flat | outline; digits: sans | mono; ink: riso | glow
export const THEMES = {
  paper: {
    name: "Paper", dark: false, voice: "wood", board: ["plain", "solid", 12], keys: "raised", digits: "sans", ink: null,
    bg: "#F6F6F3", surface: "#FFFFFF", surface2: "#EEEEEA", boxAlt: "#F3F4F6", line: "#E2E2DC", lineStrong: "#3A3A36",
    text: "#1D1D1B", textDim: "#6F6F69", given: "#1D1D1B", user: "#2C5BD0", note: "#77776F",
    accent: "#2C5BD0", onAccent: "#FFFFFF", selected: "#D6E1FA", peer: "#EEF1F6", same: "#C6D5F7",
    error: "#D0372E", errorBg: "#FBE2DF", success: "#2C8A55",
  },
  classic: {
    name: "Classic", dark: false, voice: "wood", board: ["checker", "solid", 2], keys: "flat", digits: "sans", ink: null,
    bg: "#F4F4F0", surface: "#FFFFFF", surface2: "#E9E9E4", boxAlt: "#EEEFEA", line: "#D9D9D3", lineStrong: "#1C1C1C",
    text: "#161616", textDim: "#6B6B66", given: "#161616", user: "#0E6E73", note: "#73736D",
    accent: "#0E6E73", onAccent: "#FFFFFF", selected: "#CBE7E6", peer: "#E6ECEB", same: "#B9DDDB",
    error: "#C62F2F", errorBg: "#F8DCDA", success: "#2C7F4F",
  },
  linen: {
    name: "Linen", dark: false, voice: "felt", board: ["plain", "solid", 16], keys: "outline", digits: "sans", ink: null,
    bg: "#F2EDE4", surface: "#FBF8F2", surface2: "#E9E2D6", boxAlt: "#F4EFE6", line: "#DFD6C7", lineStrong: "#433A31",
    text: "#2B241E", textDim: "#7A6F63", given: "#2B241E", user: "#2F6B4F", note: "#857A6D",
    accent: "#2F6B4F", onAccent: "#FFFFFF", selected: "#D3E4D6", peer: "#EFE9DE", same: "#C5DCCB",
    error: "#BF3B2C", errorBg: "#F5DDD6", success: "#2F6B4F",
  },
  riso: {
    name: "Riso", dark: false, voice: "felt", board: ["plain", "solid", 6], keys: "flat", digits: "sans", ink: "riso",
    bg: "#F4F0E8", surface: "#FCFAF6", surface2: "#ECE6DB", boxAlt: "#F5F0E8", line: "#E3DCCF", lineStrong: "#2E2A3A",
    text: "#24212E", textDim: "#77717F", given: "#24212E", user: "#2F55B5", note: "#837D8A",
    accent: "#E0457B", onAccent: "#FFFFFF", selected: "#F9D5E2", peer: "#F1ECE4", same: "#D9E1F5",
    error: "#D23B30", errorBg: "#FADCD8", success: "#2E8A5E",
  },
  dusk: {
    name: "Dusk", dark: false, voice: "glass", board: ["plain", "solid", 20], keys: "flat", digits: "sans", ink: null,
    bg: "#EFEAF6", surface: "#FCFBFE", surface2: "#E5DFF0", boxAlt: "#F4F1F9", line: "#DCD5EA", lineStrong: "#3B3350",
    text: "#241F33", textDim: "#746D88", given: "#241F33", user: "#6A4FC8", note: "#807A93",
    accent: "#6A4FC8", onAccent: "#FFFFFF", selected: "#E1D9F8", peer: "#F0ECF7", same: "#D3C8F4",
    error: "#CC3D3D", errorBg: "#F8DEDE", success: "#2F8A5E",
  },
  graphite: {
    name: "Graphite", dark: true, voice: "felt", board: ["plain", "solid", 10], keys: "outline", digits: "sans", ink: null,
    bg: "#151517", surface: "#1E1E21", surface2: "#28282C", boxAlt: "#222225", line: "#323237", lineStrong: "#8A8A92",
    text: "#EDEDEF", textDim: "#96969E", given: "#EDEDEF", user: "#7FA6FF", note: "#8C8C94",
    accent: "#7FA6FF", onAccent: "#0E1424", selected: "#2C3B5E", peer: "#26262B", same: "#24365C",
    error: "#FF6B63", errorBg: "#43201F", success: "#5BC88A",
  },
  midnight: {
    name: "Midnight", dark: true, voice: "glass", board: ["plain", "solid", 12], keys: "flat", digits: "sans", ink: "glow",
    bg: "#0E1422", surface: "#151D2E", surface2: "#1D273B", boxAlt: "#182134", line: "#26314A", lineStrong: "#7C89A6",
    text: "#E8ECF4", textDim: "#8C97AE", given: "#E8ECF4", user: "#F2B84B", note: "#8490A8",
    accent: "#F2B84B", onAccent: "#1B1406", selected: "#463A1E", peer: "#1C2539", same: "#3D3420",
    error: "#FF6F6F", errorBg: "#40202A", success: "#5CC78E",
  },
  mocha: {
    name: "Mocha", dark: true, voice: "felt", board: ["checker", "solid", 8], keys: "raised", digits: "sans", ink: null,
    bg: "#1A1512", surface: "#231D19", surface2: "#2E2621", boxAlt: "#29221D", line: "#3A312A", lineStrong: "#A08F80",
    text: "#F1E8DF", textDim: "#A8998B", given: "#F1E8DF", user: "#E59866", note: "#9E8F82",
    accent: "#E59866", onAccent: "#21140B", selected: "#4D3423", peer: "#2B241F", same: "#4A3324",
    error: "#FF7466", errorBg: "#45221D", success: "#86C58E",
  },
  forest: {
    name: "Forest", dark: true, voice: "felt", board: ["plain", "solid", 16], keys: "flat", digits: "sans", ink: null,
    bg: "#0F1714", surface: "#16211C", surface2: "#1E2C25", boxAlt: "#1A2620", line: "#273830", lineStrong: "#7F998B",
    text: "#E4EEE8", textDim: "#8EA598", given: "#E4EEE8", user: "#6FD39C", note: "#839A8D",
    accent: "#6FD39C", onAccent: "#07180F", selected: "#24443A", peer: "#1C2A23", same: "#21483A",
    error: "#FF7A6E", errorBg: "#3F211D", success: "#6FD39C",
  },
  blueprint: {
    name: "Blueprint", dark: true, voice: "glass", board: ["plain", "dashed", 0], keys: "outline", digits: "mono", ink: null,
    bg: "#163A6B", surface: "#1A4378", surface2: "#21508C", boxAlt: "#1D4880", line: "#4A7BB8", lineStrong: "#DCE9FA",
    text: "#EEF4FF", textDim: "#A3BDE0", given: "#FFFFFF", user: "#FFD666", note: "#A9C3E6",
    accent: "#FFD666", onAccent: "#12294A", selected: "#2C5D9C", peer: "#1E4B85", same: "#2E679E",
    error: "#FF8F85", errorBg: "#5A2E4E", success: "#8CF0B8",
  },
  contrast: {
    name: "High Contrast", dark: true, voice: "wood", board: ["checker", "solid", 6], keys: "outline", digits: "sans", ink: null,
    bg: "#000000", surface: "#000000", surface2: "#1A1A1A", boxAlt: "#161616", line: "#5C5C5C", lineStrong: "#FFFFFF",
    text: "#FFFFFF", textDim: "#CCCCCC", given: "#FFFFFF", user: "#4DD0FF", note: "#C0C0C0",
    accent: "#FFD400", onAccent: "#000000", selected: "#5C4D00", peer: "#242424", same: "#00384D",
    error: "#FF5252", errorBg: "#4D0000", success: "#69F0AE",
  },
};

export const THEME_KEYS = Object.keys(THEMES);

// Earlier versions had other themes; each maps to its closest one here.
const RENAMED = {
  stone: "linen", walnut: "mocha", rose: "riso", lavender: "dusk",
  press: "linen", late: "mocha", ink: "paper", matcha: "linen", sakura: "riso", desert: "linen", bauhaus: "classic",
  candy: "dusk", ocean: "midnight", aurora: "graphite", nord: "graphite", synthwave: "dusk", terminal: "forest",
};
export const normalizeTheme = (key) => RENAMED[key] || key;

export const resolveTheme = (key, prefersDark) => {
  key = normalizeTheme(key);
  return key === "auto" ? (prefersDark ? "graphite" : "paper") : THEMES[key] ? key : "paper";
};

const VARS = ["bg", "surface", "surface2", "boxAlt", "line", "lineStrong", "text", "textDim", "given", "user", "note",
  "accent", "onAccent", "selected", "peer", "same", "error", "errorBg", "success"];
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function themeVars(key) {
  const t = THEMES[key];
  const v = Object.fromEntries(VARS.map((name) => [`--${kebab(name)}`, t[name]]));
  v["--board-radius"] = `${t.board[2]}px`;
  return v;
}

// The board, key and digit choices as data attributes, for <html> or a preview swatch.
export const themeAttrs = (key) => {
  const t = THEMES[key];
  return { "data-boxes": t.board[0], "data-lines": t.board[1], "data-keys": t.keys, "data-digits": t.digits, "data-ink": t.ink || "none" };
};

export function applyTheme(key) {
  const t = THEMES[key];
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars(key))) root.style.setProperty(k, v);
  root.style.colorScheme = t.dark ? "dark" : "light";
  root.style.background = t.bg;
  root.dataset.theme = key;
  root.dataset.mode = t.dark ? "dark" : "light";
  for (const [k, v] of Object.entries(themeAttrs(key))) root.setAttribute(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.bg);
  // index.html reads this before React boots, so the first paint already has the right background.
  try { localStorage.setItem("sudoku_boot", JSON.stringify({ bg: t.bg })); } catch {}
}
