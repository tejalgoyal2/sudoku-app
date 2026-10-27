import { useRef, useState, useEffect } from "react";
import { Icon } from "./Icons.jsx";
import { TECHNIQUES } from "../engine/techniques.js";
import { timeLeft } from "../game/challenges.js";
import { fmt } from "../util.js";
import { Tap } from "./Tap.jsx";

// The countdown on timed challenges. Under 15 seconds it turns red and the digits beat once a
// second (keyed on the time so each new second replays the beat); the last 5 beat harder.
// Time won or lost floats off beside it.
export const urgency = (left) => (left === null ? "" : left <= 5 ? "critical" : left <= 15 ? "low" : "");

export function Countdown({ game, className = "" }) {
  const left = Math.max(0, timeLeft(game));
  const prev = useRef(game.bonusTime);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    const d = game.bonusTime - prev.current;
    prev.current = game.bonusTime;
    if (d) setDelta({ d, key: game.fx.seq });
  }, [game.bonusTime]);
  const level = urgency(left);
  return (
    <span className={`countdown ${className} ${level}`} role="timer" aria-label={`${left} seconds left`}>
      <span className="tnum" key={level ? left : "calm"}>{fmt(left)}</span>
      {delta && <span key={delta.key} className={`time-delta ${delta.d > 0 ? "up" : "down"}`} aria-hidden>{delta.d > 0 ? "+" : "−"}{Math.abs(delta.d)}s</span>}
    </span>
  );
}

export function Toolbar({ game, onUndo, onErase, onNotes, onAutoNotes, onHint, hintOpen, haptics }) {
  const off = game.status !== "playing";
  const rules = game.rules || {};
  const tools = [
    { key: "undo", label: "Undo", icon: <Icon.undo />, action: onUndo, disabled: off || !game.past.length, kbd: "Z" },
    { key: "erase", label: "Erase", icon: <Icon.erase />, action: onErase, disabled: off, kbd: "⌫" },
    { key: "notes", label: "Notes", icon: <Icon.pencil />, action: onNotes, on: game.notesMode, toggle: true, disabled: off || rules.noNotes, kbd: "N" },
    { key: "auto", label: "Fill notes", icon: <Icon.wand />, action: onAutoNotes, disabled: off || rules.noNotes || rules.noAutoNotes, kbd: "A" },
    { key: "hint", label: "Hint", icon: <Icon.bulb />, action: onHint, on: hintOpen, disabled: off || rules.noHints, kbd: "H" },
  ];
  return (
    <div className="toolbar" role="toolbar" aria-label="Game tools">
      {tools.map((t) => (
        <button key={t.key} className={`tool tool-${t.key} ${t.on ? "on" : ""}`} onClick={t.action} disabled={t.disabled} title={`${t.label} (${t.kbd})`} aria-pressed={t.toggle || t.key === "hint" ? !!t.on : undefined}>
          <span className="tool-icon">{t.icon}</span>
          <span className="tool-label">{t.label}</span>
          <Tap on={haptics && !t.disabled} />
        </button>
      ))}
    </div>
  );
}

// How many of a digit are still to place: a 3×3 of dots, like a tiny box. Lit dots are the
// ones left, so a fresh digit shows a full square and it empties as you go.
const Pips = ({ left }) => (
  <span className="pips" aria-hidden>{Array.from({ length: 9 }, (_, k) => <i key={k} className={k < left ? "on" : ""} />)}</span>
);

// Tap a key to fill the selected cell. Long-press or right-click locks a digit
// so you can paint it across the board ("digit-first" input).
export function NumberPad({ game, counts, onDigit, onLock, pressed, haptics }) {
  const timer = useRef(null);
  const longPressed = useRef(false);
  const off = game.status !== "playing";
  const selValue = game.selected !== null ? game.values[game.selected] : 0;

  const down = (d) => {
    longPressed.current = false;
    timer.current = setTimeout(() => { longPressed.current = true; onLock(d); }, 420);
  };
  const up = () => clearTimeout(timer.current);

  return (
    <div className={`pad ${game.notesMode ? "notes-mode" : ""}`} role="group" aria-label={game.notesMode ? "Number pad, notes mode" : "Number pad"}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const left = Math.max(0, 9 - counts[d]);
        const done = left === 0;
        const locked = game.lockedDigit === d;
        return (
          <button
            key={d}
            className={`key ${done ? "done" : ""} ${locked ? "locked" : ""} ${selValue === d && !locked ? "match" : ""} ${pressed === d ? "pressed" : ""}`}
            disabled={off || (done && !locked)}
            aria-label={`${d}${locked ? ", locked" : ""}, ${left} left`}
            aria-pressed={locked}
            onPointerDown={() => down(d)}
            onPointerUp={up}
            onPointerLeave={up}
            onContextMenu={(e) => { e.preventDefault(); clearTimeout(timer.current); if (!longPressed.current) onLock(d); }}
            onClick={() => { if (!longPressed.current) onDigit(d); }}
          >
            <span className="num">{d}</span>
            <Pips left={left} />
            <Tap on={haptics && !off && !(done && !locked)} />
          </button>
        );
      })}
    </div>
  );
}

const Level = ({ n }) => (
  <span className="lvl" aria-label={`Level ${n}`}>{[1, 2, 3, 4, 5, 6].map((k) => <i key={k} className={k <= n ? "on" : ""} />)}</span>
);

export function HintCard({ hint, stage, step, onReveal, onNext, onApply, onClose }) {
  const s = hint.kind === "mistake" ? hint : hint.chain[step];
  const total = hint.kind === "mistake" ? 1 : hint.chain.length;
  const last = step === total - 1;
  const blurb = TECHNIQUES[s.id]?.blurb;
  return (
    <div className="card hint-card" role="status" aria-live="polite" key={`${stage}-${step}`}>
      <div className="hint-head">
        <span className="hint-bulb"><Icon.bulb width={16} height={16} /></span>
        <span className="tech">{stage === 1 ? "A nudge" : s.name}</span>
        {stage === 2 && s.level > 0 && s.level < 7 && <Level n={s.level} />}
        <button className="icon-btn close" onClick={onClose} aria-label="Close hint"><Icon.close width={16} height={16} /></button>
      </div>
      <ol className="hint-ladder" aria-label="Hint depth">
        <li className={stage === 1 ? "now" : "past"}>Look</li>
        <li className={stage === 2 && !last ? "now" : stage === 2 ? "past" : ""}>Learn{total > 1 && stage === 2 && ` ${step + 1}/${total}`}</li>
        <li className={stage === 2 && last ? "now" : ""}>Place</li>
      </ol>
      {total > 1 && stage === 2 && <div className="hint-steps">{hint.chain.map((_, k) => <i key={k} className={k <= step ? "on" : ""} />)}</div>}
      <p>{stage === 1 ? s.nudge : s.text}</p>
      {stage === 2 && blurb && <p className="blurb">{blurb}</p>}
      <div className="hint-actions">
        {stage === 1 && <button className="btn primary" onClick={onReveal}>Show me <kbd>H</kbd></button>}
        {stage === 2 && !last && <button className="btn primary" onClick={onNext}>Next step <kbd>H</kbd></button>}
        {stage === 2 && !last && total > 2 && <button className="btn ghost" onClick={onApply}>Skip to the answer</button>}
        {stage === 2 && last && <button className="btn primary" onClick={onApply}>{hint.kind === "mistake" ? "Clear it" : s.place ? "Place it" : "Apply"} <kbd>H</kbd></button>}
      </div>
    </div>
  );
}
