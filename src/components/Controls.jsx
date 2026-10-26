import { useRef } from "react";
import { Icon } from "./Icons.jsx";
import { TECHNIQUES } from "../engine/techniques.js";

export function Toolbar({ game, onUndo, onErase, onNotes, onAutoNotes, onHint, hintOpen }) {
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
export function NumberPad({ game, counts, onDigit, onLock, pressed }) {
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
