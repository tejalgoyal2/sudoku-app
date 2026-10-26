import { useState, useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef, startTransition, ViewTransition } from "react";
import { flushSync } from "react-dom";
import "./styles.css";
import { DIFF_KEYS } from "./engine/generator.js";
import { parsePuzzle, countSolutions, solve } from "./engine/core.js";
import { grade } from "./engine/techniques.js";
import { requestPuzzle, requestDaily, prefetch } from "./engine/client.js";
import { reducer, newGame } from "./game/state.js";
import { CHALLENGES } from "./game/challenges.js";
import { loadSettings, saveSettings, loadStats, saveStats, emptyStats, recordResult, loadGame, saveGame, todayKey } from "./game/storage.js";
import { sound } from "./game/sound.js";
import { THEMES, THEME_KEYS, resolveTheme, normalizeTheme, applyTheme } from "./theme/themes.js";
import Home from "./components/Home.jsx";
import Play from "./components/Play.jsx";
import Stats from "./components/Stats.jsx";
import { SettingsSheet, HelpSheet, ImportSheet } from "./components/Panels.jsx";
import { shareText } from "./components/EndDialogs.jsx";
import { Icon } from "./components/Icons.jsx";

function usePrefersDark() {
  const q = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return dark;
}

const tierFor = (g, clues) => (g.level <= 1 ? (clues >= 34 ? "easy" : "medium") : g.level <= 3 ? "hard" : "expert");
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function App() {
  const [settings, setSettings] = useState(() => { const s = loadSettings(); return { ...s, theme: normalizeTheme(s.theme) }; });
  const [stats, setStats] = useState(loadStats);
  const [game, dispatch] = useReducer(reducer, null, () => { const g = loadGame(); return g ? { ...g, fx: { seq: 0 } } : null; });
  const [screen, setScreen] = useState("home");
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const prefersDark = usePrefersDark();
  const themeKey = resolveTheme(settings.theme, prefersDark);
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const startToken = useRef(0);

  useLayoutEffect(() => applyTheme(themeKey), [themeKey]);
  const voice = settings.voice === "theme" || !settings.voice ? THEMES[themeKey].voice : settings.voice;
  useEffect(() => { saveSettings(settings); sound.configure({ ...settings, voice }); }, [settings, voice]);
  useEffect(() => { if (game) saveGame(game); }, [game]);
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 800));
    idle(() => DIFF_KEYS.forEach(prefetch));
  }, []);

  const set = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const toast = useCallback((msg) => setToastMsg({ msg, id: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // A short crossfade between palettes.
  const pickTheme = useCallback((key) => {
    const apply = () => flushSync(() => set({ theme: key }));
    if (!document.startViewTransition || reducedMotion()) return apply();
    document.startViewTransition(apply);
  }, [set]);

  const go = useCallback((s) => startTransition(() => { setScreen(s); window.scrollTo({ top: 0 }); }), []);

  const opts = useMemo(() => ({
    autoCheck: settings.autoCheck,
    mistakeLimit: settings.zen ? 0 : settings.mistakeLimit,
    autoRemoveNotes: settings.autoRemoveNotes,
  }), [settings.autoCheck, settings.mistakeLimit, settings.zen, settings.autoRemoveNotes]);
  const act = useCallback((a) => dispatch({ ...a, opts }), [opts]);

  // Record each finished game once.
  const recorded = useRef(null);
  useEffect(() => {
    if (!game || (game.status !== "won" && game.status !== "lost")) return;
    const tag = `${game.id}:${game.status}`;
    if (recorded.current === tag) return;
    recorded.current = tag;
    if (game.mode === "custom") { setResult({}); return; }
    const r = recordResult(statsRef.current, game);
    setStats(r.stats); saveStats(r.stats); setResult(r);
  }, [game?.status, game?.id]);

  // ─── STARTING GAMES ───
  const begin = useCallback(async (make) => {
    const token = ++startToken.current;
    startTransition(() => { setScreen("play"); setLoading(true); setResult(null); setDialog(null); window.scrollTo({ top: 0 }); });
    const g = await make();
    if (token !== startToken.current) return;
    dispatch({ type: "load", game: g });
    setLoading(false);
  }, []);

  const startGame = useCallback((difficulty) => begin(async () => newGame(await requestPuzzle(difficulty))), [begin]);
  const startChallenge = useCallback((key) => begin(async () => newGame({ ...(await requestPuzzle(CHALLENGES[key].difficulty)), mode: "challenge", challenge: key })), [begin]);
  const startDaily = useCallback(() => {
    const key = todayKey();
    if (game?.mode === "daily" && game.dateKey === key && game.status === "playing") return go("play");
    begin(async () => newGame({ ...(await requestDaily(key)), mode: "daily", dateKey: key }));
  }, [begin, game, go]);
  const startCustom = useCallback(({ puzzle, solution, grade: g }) => {
    begin(async () => newGame({ puzzle, solution, grade: g, difficulty: tierFor(g, puzzle.filter(Boolean).length), mode: "custom" }));
  }, [begin]);
  const resume = useCallback(() => { if (game?.status === "playing") go("play"); }, [game, go]);

  // Home-screen shortcuts from the installed PWA: /?start=daily or /?start=easy
  useEffect(() => {
    const start = new URLSearchParams(location.search).get("start");
    if (!start) return;
    history.replaceState(null, "", location.pathname);
    if (start === "daily") startDaily();
    else if (DIFF_KEYS.includes(start)) startGame(start);
    else if (CHALLENGES[start]) startChallenge(start);
  }, []);

  const goHome = useCallback(() => { startToken.current++; setLoading(false); go("home"); }, [go]);
  const newSame = useCallback(() => (game?.challenge ? startChallenge(game.challenge) : startGame(game?.difficulty || "easy")), [game, startGame, startChallenge]);

  const share = useCallback(async () => {
    const text = shareText(game);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast("Result copied"); }
    } catch {}
  }, [game, toast]);

  const resetStats = () => {
    if (!confirm("Reset all statistics? This cannot be undone.")) return;
    const fresh = emptyStats();
    setStats(fresh); saveStats(fresh);
    toast("Statistics reset");
  };

  // ─── GLOBAL SHORTCUTS ───
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea") || dialog) return;
      const k = e.key;
      if (k === "?") { e.preventDefault(); setDialog("help"); }
      else if (k === ",") { e.preventDefault(); setDialog("settings"); }
      else if (k === "t" || k === "T") {
        const next = THEME_KEYS[(THEME_KEYS.indexOf(themeKey) + (e.shiftKey ? -1 : 1) + THEME_KEYS.length) % THEME_KEYS.length];
        pickTheme(next); toast(THEMES[next].name);
      } else if (k === "m" || k === "M") { set({ sound: !settings.sound }); toast(settings.sound ? "Sound off" : "Sound on"); }
      else if (k === "f" || k === "F") { set({ zen: !settings.zen }); toast(settings.zen ? "Zen mode off" : "Zen mode on"); }
      else if (k === "s" || k === "S") { if (screen !== "play") go(screen === "stats" ? "home" : "stats"); }
      else if (k === "Escape" && screen === "stats") goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, themeKey, settings.sound, settings.zen, screen, set, toast, goHome, go, pickTheme]);

  // Paste a puzzle string anywhere on the home screen to play it.
  useEffect(() => {
    if (screen !== "home" || dialog) return;
    const onPaste = (e) => {
      const p = parsePuzzle(e.clipboardData?.getData("text"));
      if (!p) return;
      if (countSolutions(p) !== 1) return toast("That puzzle doesn't have a unique solution");
      startCustom({ puzzle: p, solution: solve(p), grade: grade(p) });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [screen, dialog, startCustom, toast]);

  const zen = settings.zen && screen === "play";
  const playing = game?.status === "playing" ? game : null;

  return (
    <div className={`app ${zen ? "zen" : ""}`} data-screen={screen}>
      <header className="topbar">
        <div className="topbar-left">
          {screen !== "home" && <button className="icon-btn" onClick={goHome} aria-label="Home"><Icon.back width={22} height={22} /></button>}
          <button className="brand" onClick={goHome} aria-label="Sudoku home">
            <span className="brand-mark" aria-hidden>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
            <span className="brand-name">Sudoku</span>
          </button>
        </div>
        <div className="top-actions">
          {screen === "play" && (
            <button className={`icon-btn ${settings.zen ? "on" : ""}`} onClick={() => set({ zen: !settings.zen })} aria-label="Zen mode" aria-pressed={settings.zen} title="Zen mode (F)"><Icon.zen /></button>
          )}
          {screen !== "play" && (
            <button className={`icon-btn ${screen === "stats" ? "on" : ""}`} onClick={() => go(screen === "stats" ? "home" : "stats")} aria-label="Statistics" title="Statistics (S)"><Icon.stats /></button>
          )}
          <button className="icon-btn" onClick={() => set({ sound: !settings.sound })} aria-label={settings.sound ? "Mute" : "Unmute"} title="Sound (M)">{settings.sound ? <Icon.sound /> : <Icon.mute />}</button>
          <button className="icon-btn" onClick={() => setDialog("settings")} aria-label="Settings" title="Settings (,)"><Icon.settings /></button>
          <button className="icon-btn hide-sm" onClick={() => setDialog("help")} aria-label="Help and shortcuts" title="Help (?)"><Icon.help /></button>
        </div>
      </header>

      <ViewTransition key={screen} enter="vt-in" exit="vt-out">
        <main className="main">
          {screen === "home" && (
            <Home stats={stats} saved={playing} onResume={resume} onStart={startGame} onDaily={startDaily} onChallenge={startChallenge} onImport={() => setDialog("import")} />
          )}
          {screen === "play" && (
            <Play
              game={game} act={act} settings={settings} loading={loading} dialogOpen={!!dialog}
              result={result} stats={stats} onHome={goHome} onNewGame={newSame} onShare={share} toast={toast}
            />
          )}
          {screen === "stats" && <Stats stats={stats} onReset={resetStats} />}
        </main>
      </ViewTransition>

      <SettingsSheet open={dialog === "settings"} onClose={() => setDialog(null)} settings={settings} set={set} pickTheme={pickTheme} themeVoice={THEMES[themeKey].voice} />
      <HelpSheet open={dialog === "help"} onClose={() => setDialog(null)} />
      <ImportSheet open={dialog === "import"} onClose={() => setDialog(null)} onPlay={startCustom} />

      <div className="toast-wrap" aria-live="polite">
        {toastMsg && <div className="toast" key={toastMsg.id}>{toastMsg.msg}</div>}
      </div>
    </div>
  );
}
