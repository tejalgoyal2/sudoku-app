import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { UNITS, R, C } from "../engine/core.js";
import { DIFFICULTIES } from "../engine/generator.js";
import { computeHint } from "../game/hints.js";
import { sound, haptic } from "../game/sound.js";
import Board, { LoadingBoard } from "./Board.jsx";
import { Toolbar, NumberPad, HintCard, Countdown, urgency } from "./Controls.jsx";
import { WinDialog, LostDialog } from "./EndDialogs.jsx";
import GamePanel from "./GamePanel.jsx";
import { Icon } from "./Icons.jsx";
import { CHALLENGES, timeLeft } from "../game/challenges.js";
import { fmt, fmtDate } from "../util.js";

const LEVEL_OF = { easy: 1, medium: 2, hard: 3, expert: 4 };
const dist = (a, b) => Math.hypot(R(a) - R(b), C(a) - C(b));
const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

export default function Play({ game, act, settings, loading, dialogOpen, result, stats, onHome, onNewGame, onShare, toast }) {
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(null);
  const [waves, setWaves] = useState({ cells: {}, shake: null });
  const [fresh, setFresh] = useState({});
  const [entering, setEntering] = useState(true);
  const [replay, setReplay] = useState(null);
  const [endOpen, setEndOpen] = useState(false);
  const [pressed, setPressed] = useState(0);
  const [seen, setSeen] = useState(() => new Set());
  const gameRef = useRef(game);
  gameRef.current = game;

  // Fresh board: stagger the cells in, reset transient UI.
  useEffect(() => {
    if (!game) return;
    setEntering(true); setHint(null); setReplay(null); setFresh({}); setWaves({ cells: {}, shake: null }); setPaused(false); setSeen(new Set());
    setEndOpen(game.status !== "playing");
    const t = setTimeout(() => setEntering(false), 1000);
    return () => clearTimeout(t);
  }, [game?.id]);

  // ─── EFFECTS: sound, haptics and board animation for each game event ───
  const lastFx = useRef(null);
  useEffect(() => {
    if (!game) return;
    const f = game.fx, tag = `${game.id}:${f.seq}`;
    if (!f.seq || lastFx.current === tag) { lastFx.current = tag; return; }
    lastFx.current = tag;
    const origin = f.cells?.[0];
    const mark = (cells, kind, delayOf) => setWaves({ cells: Object.fromEntries(cells.map((i) => [i, { key: f.seq, kind, delay: delayOf(i) }])), shake: null });
    const pop = () => origin !== undefined && setFresh((m) => ({ ...m, [origin]: f.seq }));

    switch (f.type) {
      case "place": sound.place(f.digit); haptic(15); pop(); break;
      case "note": sound.note(f.digit); haptic(15); break;
      case "erase": sound.erase(); break;
      case "undo": case "redo": sound.undo(); break;
      case "auto-notes": sound.hint(); break;
      case "error":
        if (f.silent) { sound.place(f.digit); pop(); break; }
        sound.error(); haptic([30, 60, 30]);
        setWaves((w) => ({ ...w, shake: origin }));
        setTimeout(() => setWaves((w) => (w.shake === origin ? { ...w, shake: null } : w)), 420);
        break;
      case "unit":
        sound.unit(f.digit, f.units.length); haptic(25); pop();
        mark([...new Set(f.units.flatMap((u) => UNITS[u]))], "unit", (i) => dist(origin, i) * 55);
        break;
      case "digit": {
        sound.digit(f.digit); haptic([20, 40, 20]); pop();
        const cells = game.values.flatMap((v, i) => (v === f.digit ? [i] : []));
        mark(cells, "digit", (i) => dist(origin, i) * 40);
        break;
      }
      case "hint": sound.hint(); if (f.cells.length) mark(f.cells, "hint", () => 0); break;
      case "won":
        pop(); sound.win(); haptic([30, 70, 30, 70, 60]);
        mark([...Array(81).keys()], "win", (i) => dist(origin, i) * 70);
        setTimeout(() => setEndOpen(true), 1500);
        break;
      case "lost":
        sound.lost(); haptic([60, 80, 120]);
        if (f.reason === "time") toast("Time's up!");
        setWaves((w) => ({ ...w, shake: origin }));
        setTimeout(() => setEndOpen(true), 700);
        break;
      case "full-wrong": toast("The board is full, but something isn't right yet."); break;
    }
  }, [game?.fx]);

  // ─── TIMER ───
  const running = !!game && game.status === "playing" && !paused && !dialogOpen && !replay && !loading;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => act({ type: "tick" }), 1000);
    return () => clearInterval(id);
  }, [running, act]);

  const left = timeLeft(game);
  useEffect(() => {
    if (!running || left === null || left > 10 || left <= 0) return;
    sound.tick(left <= 5);
    if (left <= 5) haptic(20);
  }, [left, running]);

  useEffect(() => {
    const onVis = () => { if (document.hidden && gameRef.current?.status === "playing") setPaused(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ─── ACTIONS ───
  const input = useCallback((d, note) => {
    const g = gameRef.current;
    if (!g || g.selected === null) return;
    setHint(null);
    act({ type: "input", d, note: note ?? g.notesMode });
  }, [act]);

  const onCellDown = useCallback((i, e) => {
    const g = gameRef.current;
    if (!g || g.status !== "playing") return;
    e.preventDefault();
    act({ type: "select", i });
    if (g.lockedDigit && !g.puzzle[i]) { setHint(null); act({ type: "input", d: g.lockedDigit, i }); }
  }, [act]);

  const onPadDigit = (d) => { if (game.lockedDigit) act({ type: "lock-digit", d }); else input(d); };
  const erase = () => { setHint(null); act({ type: "erase" }); };
  const undo = () => { setHint(null); act({ type: "undo" }); };
  const redo = () => { setHint(null); act({ type: "redo" }); };
  const autoNotes = () => {
    if (game.rules?.noNotes || game.rules?.noAutoNotes) return toast("Auto-notes are off in this challenge");
    setHint(null); act({ type: "auto-notes" }); toast("Notes filled with every candidate");
  };
  const toggleNotes = () => {
    if (game.rules?.noNotes) return toast("Pen only: no pencil marks");
    act({ type: "toggle-notes" });
  };

  const hintAction = () => {
    if (game.rules?.noHints) return toast("No hints in this challenge");
    if (!hint) {
      const h = computeHint(game);
      if (!h) return;
      sound.hint();
      setHint({ hint: h, stage: 1, step: 0 });
      return;
    }
    const total = hint.hint.kind === "mistake" ? 1 : hint.hint.chain.length;
    if (hint.stage === 1) { act({ type: "hint-used" }); setHint({ ...hint, stage: 2 }); }
    else if (hint.step < total - 1) setHint({ ...hint, step: hint.step + 1 });
    else { act({ type: "apply-hint", hint: hint.hint }); setHint(null); }
  };

  // Techniques a hint has explained get ticked off in the side panel.
  useEffect(() => {
    if (hint?.stage !== 2 || hint.hint.kind === "mistake") return;
    const id = hint.hint.chain[hint.step]?.id;
    if (id && !seen.has(id)) setSeen((m) => new Set(m).add(id));
  }, [hint]);

  const highlight = useMemo(() => {
    if (!hint) return null;
    const h = hint.hint;
    const s = h.kind === "mistake" ? h : h.chain[hint.step];
    if (hint.stage === 1) return { units: s.units.length ? s.units : [R(s.focus[0])] };
    const elims = {};
    for (const { i, d } of s.elims || []) elims[i] = (elims[i] || 0) | (1 << d);
    return { units: s.units, focus: s.focus, elims, target: s.place?.i ?? (h.kind === "mistake" ? h.i : undefined) };
  }, [hint]);

  // ─── REPLAY: re-live the solve from the undo history ───
  const startReplay = () => {
    const entries = game.past.filter((e) => e.some((c) => c[1] !== c[3]));
    if (!entries.length) return;
    setEndOpen(false);
    setReplay({ values: game.puzzle.slice(), k: 0, entries });
  };
  useEffect(() => {
    if (!replay) return;
    if (replay.k >= replay.entries.length) {
      const t = setTimeout(() => { setReplay(null); setEndOpen(true); }, 900);
      return () => clearTimeout(t);
    }
    const speed = Math.max(35, Math.min(180, 6000 / replay.entries.length));
    const t = setTimeout(() => {
      const values = replay.values.slice();
      const entry = replay.entries[replay.k];
      for (const [i, , , nv] of entry) values[i] = nv;
      const changed = entry.find((c) => c[1] !== c[3]);
      if (changed && changed[3]) { setFresh((m) => ({ ...m, [changed[0]]: `r${replay.k}` })); sound.place(changed[3]); }
      setReplay({ ...replay, values, k: replay.k + 1 });
    }, speed);
    return () => clearTimeout(t);
  }, [replay]);

  // ─── KEYBOARD ───
  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      if (!g || dialogOpen || endOpen || e.target.closest?.("input, textarea, dialog")) return;
      const k = e.key, mod = e.metaKey || e.ctrlKey;
      const handled = () => e.preventDefault();

      if (replay) { if (k === "Escape" || k === " ") { handled(); setReplay(null); setEndOpen(true); } return; }
      if (k === "Escape" && hint) { handled(); setHint(null); return; }
      if ((k === "p" || k === "P" || k === "Escape") && !mod && g.status === "playing") { handled(); setPaused((p) => !p); return; }
      if (paused) { if (k === " " || k === "Enter") { handled(); setPaused(false); } return; }
      if (g.status !== "playing") return;

      const digit = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
      if (digit && !mod) {
        handled();
        const d = +digit[1];
        if (d === 0) return erase();
        setPressed(d); setTimeout(() => setPressed(0), 130);
        return input(d, e.shiftKey || e.altKey ? !g.notesMode : undefined);
      }
      if (ARROWS[k]) {
        handled();
        const [dr, dc] = ARROWS[k];
        return act({ type: "move", dr, dc, jump: mod || e.altKey });
      }
      if (k === "Tab") { handled(); return act({ type: "next-empty", dir: e.shiftKey ? -1 : 1 }); }
      if (k === "Backspace" || k === "Delete") { handled(); return erase(); }
      if (mod && (k === "z" || k === "Z")) { handled(); return e.shiftKey ? redo() : undo(); }
      if (mod && (k === "y" || k === "Y")) { handled(); return redo(); }
      if (mod) return;
      switch (k.toLowerCase()) {
        case "n": case " ": handled(); return toggleNotes();
        case "z": case "u": handled(); return undo();
        case "y": case "r": handled(); return redo();
        case "h": handled(); return hintAction();
        case "enter": if (hint) { handled(); return hintAction(); } return;
        case "a": handled(); return autoNotes();
        case "l": {
          handled();
          const v = g.selected !== null ? g.values[g.selected] : 0;
          return act({ type: "lock-digit", d: v || g.lockedDigit });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const counts = useMemo(() => {
    const c = Array(10).fill(0);
    if (game) for (const v of game.values) c[v]++;
    return c;
  }, [game?.values]);

  const challenge = game?.challenge ? CHALLENGES[game.challenge] : null;
  const limit = game?.rules ? game.rules.mistakeLimit || 0 : settings.autoCheck && !settings.zen && !game?.rescued ? settings.mistakeLimit : 0;
  const diff = game ? DIFFICULTIES[game.difficulty] : null;

  const label = game && !loading ? (
    <span className="game-label">
      {challenge ? <>{Icon[challenge.icon]?.({ width: 14, height: 14 })}{challenge.name}</>
        : game.mode === "daily" ? <><Icon.calendar width={14} height={14} />Daily · {fmtDate(game.dateKey)}</>
        : game.mode === "custom" ? "Custom" : diff.label}
      {game.mode !== "custom" && <span className="level">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= LEVEL_OF[game.difficulty] ? "on" : ""} />)}</span>}
    </span>
  ) : <span className="game-label">Generating…</span>;

  return (
    <div className="play" data-urgency={running ? urgency(left) || undefined : undefined}>
      {game && !loading && (
        <GamePanel
          key={game.id} game={game} settings={settings} stats={stats} label={label} limit={limit} seen={seen}
          paused={paused} onPause={() => setPaused((p) => !p)} onJump={(i) => { setPaused(false); act({ type: "select", i }); }}
        />
      )}
      <div className="play-col">
        <div className="status-bar">
          {label}
          {game && !loading && (
            <div className="stat-row">
              {(settings.autoCheck || game.rules) && !(settings.zen && !game.rules) && (limit > 0 ? (
                <span className="mistake-marks" aria-label={`${game.mistakes} of ${limit} mistakes`} title="Mistakes">
                  {Array.from({ length: limit }, (_, k) => <i key={k} className={k < game.mistakes ? "hit" : ""} />)}
                </span>
              ) : game.mistakes > 0 && <span className="mistake-count">{game.mistakes} ✕</span>)}
              {left !== null ? (
                <Countdown game={game} className="timer" key={game.id} />
              ) : settings.showTimer && !settings.zen && <span className="timer tnum" aria-label="Elapsed time">{fmt(game.elapsed)}</span>}
              {game.status === "playing" && (
                <button className="icon-btn sm" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Resume" : "Pause"} title="Pause (P)">
                  {paused ? <Icon.play width={16} height={16} /> : <Icon.pause width={16} height={16} />}
                </button>
              )}
            </div>
          )}
        </div>
        {left !== null && game && !loading && (
          <div className={`countdown-bar ${urgency(left)}`}><i style={{ transform: `scaleX(${Math.min(1, Math.max(0, left) / game.rules.countdown)})` }} /></div>
        )}

        {!game || loading ? <LoadingBoard /> : (
          <Board
            game={game}
            displayValues={replay?.values}
            settings={settings}
            highlight={highlight}
            waves={waves}
            freshMap={fresh}
            paused={paused}
            entering={entering}
            fog={!!game.rules?.fog && game.status === "playing"}
            onCellDown={onCellDown}
            onResume={() => setPaused(false)}
            replayProgress={replay ? replay.k / replay.entries.length : undefined}
          />
        )}
      </div>

      {game && !loading && (
        <div className="side">
          {hint && (
            <HintCard
              hint={hint.hint} stage={hint.stage} step={hint.step}
              onReveal={hintAction} onNext={hintAction} onApply={() => { act({ type: "apply-hint", hint: hint.hint }); setHint(null); }} onClose={() => setHint(null)}
            />
          )}
          {replay ? (
            <div className="card replay-card">
              <p>Replaying your solve</p>
              <button className="btn ghost" onClick={() => { setReplay(null); setEndOpen(true); }}>Skip</button>
            </div>
          ) : (
            <>
              <Toolbar game={game} onUndo={undo} onErase={erase} onNotes={toggleNotes} onAutoNotes={autoNotes} onHint={hintAction} hintOpen={!!hint} haptics={settings.haptics} />
              <NumberPad game={game} counts={counts} onDigit={onPadDigit} onLock={(d) => { act({ type: "lock-digit", d }); haptic(20); }} pressed={pressed} haptics={settings.haptics} />
              {game.lockedDigit > 0 && (
                <p className="side-note">
                  Painting <b>{game.lockedDigit}</b>. Tap cells to place it, tap the key again to stop.
                </p>
              )}
              {challenge && !game.lockedDigit && <p className="side-note">{challenge.blurb}</p>}
            </>
          )}
        </div>
      )}

      {game && (
        <>
          <WinDialog open={endOpen && game.status === "won" && !replay} game={game} result={result} stats={stats} onHome={onHome} onNewGame={onNewGame} onShare={onShare} onReplay={startReplay} />
          <LostDialog open={endOpen && game.status === "lost"} game={game} challenge={challenge} onHome={onHome} onNewGame={onNewGame} onRescue={() => { setEndOpen(false); act({ type: "rescue" }); }} />
        </>
      )}
    </div>
  );
}
