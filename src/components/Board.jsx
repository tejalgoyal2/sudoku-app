import { memo, useMemo } from "react";
import { BOXES, R, C, B, digitsOf, conflictsOf } from "../engine/core.js";
import { Icon } from "./Icons.jsx";

const NOTE_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROWS9 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const Cell = memo(function Cell({ i, value, given, notes, cls, digitCls, hlDigit, elims, wave, fresh, onPointerDown }) {
  const lift = wave && !fresh;
  return (
    <div
      id={`cell-${i}`}
      role="gridcell"
      aria-label={`Row ${R(i) + 1}, column ${C(i) + 1}${value ? `, ${value}${given ? " given" : ""}` : notes ? `, notes ${digitsOf(notes).join(" ")}` : ", empty"}`}
      className={`cell ${cls}`}
      style={{ "--rc": R(i) + C(i) }}
      onPointerDown={(e) => onPointerDown(i, e)}
    >
      {wave && <span key={wave.key} className={`wave ${wave.kind}`} style={{ animationDelay: `${wave.delay}ms` }} />}
      {value ? (
        <span
          key={`v${value}-${fresh || ""}-${lift ? wave.key : ""}`}
          className={`digit ${given ? "given" : "user"} ${digitCls} ${fresh ? "pop" : ""} ${lift ? `lift ${wave.kind}` : ""}`}
          style={lift ? { animationDelay: `${wave.delay}ms` } : undefined}
        >
          {value}
        </span>
      ) : (
        <div className="pencil" aria-hidden>
          {NOTE_DIGITS.map((d) => {
            const has = notes & (1 << d), el = elims & (1 << d);
            return <span key={d} className={`${has || el ? "on" : ""} ${el ? "elim" : has && d === hlDigit ? "hl" : ""}`}>{d}</span>;
          })}
        </div>
      )}
    </div>
  );
});

// Thin lines between cells, thick between boxes. Drawn on top so the cells underneath can be
// transparent and the gliding highlights show through.
const GridLines = memo(() => (
  <svg className="grid-lines" viewBox="0 0 9 9" preserveAspectRatio="none" aria-hidden>
    {[1, 2, 4, 5, 7, 8].map((k) => <g key={k} className="thin"><line x1={k} y1="0" x2={k} y2="9" /><line x1="0" y1={k} x2="9" y2={k} /></g>)}
    {[3, 6].map((k) => <g key={k} className="thick"><line x1={k} y1="0" x2={k} y2="9" /><line x1="0" y1={k} x2="9" y2={k} /></g>)}
  </svg>
));

export default function Board({ game, displayValues, settings, highlight, waves, freshMap, paused, entering, fog, onCellDown, onResume, replayProgress }) {
  const values = displayValues || game.values;
  const { puzzle, solution, notes, selected, lockedDigit } = game;
  const showErrors = settings.autoCheck || !!game.rules;
  const live = selected !== null && !displayValues;

  const conflicts = useMemo(() => (settings.highlightConflicts ? conflictsOf(values) : new Set()), [values, settings.highlightConflicts]);

  const selValue = selected !== null ? values[selected] : 0;
  const focusDigit = lockedDigit || selValue;
  const hintUnits = highlight?.units ? new Set(highlight.units.flatMap((u) => (u < 9 ? ROWS9.map((k) => u * 9 + k) : u < 18 ? ROWS9.map((k) => k * 9 + (u - 9)) : BOXES[u - 18]))) : null;
  const hintFocus = new Set(highlight?.focus || []);
  const elimMap = highlight?.elims || {};
  const sees = (i) => live && (R(i) === R(selected) || C(i) === C(selected) || B(i) === B(selected));

  const cellProps = (i) => {
    const v = values[i];
    const cls = [];
    if (showErrors && v && !puzzle[i] && v !== solution[i] && !displayValues) cls.push("err");
    else if (settings.highlightSame && focusDigit && v === focusDigit && i !== selected) cls.push("same");
    else if (hintUnits?.has(i)) cls.push("hint-unit");
    if (hintFocus.has(i)) cls.push("hint-focus");
    if (highlight?.target === i) cls.push("hint-target");
    if (waves?.shake === i) cls.push("shake");
    if (fog && !sees(i) && !displayValues) cls.push("fogged");
    return {
      i, value: v, given: !!puzzle[i],
      notes: v ? 0 : notes[i],
      cls: cls.join(" "),
      digitCls: conflicts.has(i) && !puzzle[i] ? "conflict" : "",
      hlDigit: settings.highlightSame ? focusDigit : 0,
      elims: elimMap[i] || 0,
      wave: waves?.cells[i],
      fresh: freshMap?.[i] || 0,
    };
  };

  const pos = live ? { "--r": R(selected), "--c": C(selected), "--br": Math.floor(R(selected) / 3), "--bc": Math.floor(C(selected) / 3) } : {};

  return (
    <div className="board-wrap">
      <div
        className={`board ${entering ? "enter" : ""} ${paused ? "paused" : ""} ${live ? "has-sel" : ""} ${settings.highlightPeers ? "peers" : ""} ${fog ? "fog" : ""} ${lockedDigit ? "painting" : ""}`}
        style={pos}
        role="grid"
        aria-label="Sudoku board"
        aria-activedescendant={selected !== null ? `cell-${selected}` : undefined}
        tabIndex={0}
      >
        <div className="box-tint" aria-hidden>{ROWS9.map((b) => <i key={b} />)}</div>
        <div className="hl-layer" aria-hidden><i className="hl-row" /><i className="hl-col" /><i className="hl-box" /><i className="hl-sel" /></div>
        <div className="cells">
          {ROWS9.map((r) => (
            <div role="row" key={r} style={{ display: "contents" }}>
              {ROWS9.map((c) => { const i = r * 9 + c; return <Cell key={i} {...cellProps(i)} onPointerDown={onCellDown} />; })}
            </div>
          ))}
        </div>
        <GridLines />
        <i className="cursor" aria-hidden />
      </div>
      {paused && (
        <div className="board-overlay" onClick={onResume}>
          <div className="inner">
            <div className="play-icon"><Icon.play width={26} height={26} /></div>
            <span>Paused</span>
            <small>Tap or press Space to resume</small>
          </div>
        </div>
      )}
      {replayProgress !== undefined && <div className="replay-bar"><i style={{ width: `${replayProgress * 100}%` }} /></div>}
    </div>
  );
}

export function LoadingBoard() {
  return (
    <div className="board-wrap">
      <div className="loading-board" aria-label="Generating puzzle">
        {Array.from({ length: 81 }, (_, i) => <i key={i} style={{ "--rc": R(i) + C(i) }} />)}
      </div>
    </div>
  );
}

export function MiniBoard({ puzzle, values, size = 84, className = "" }) {
  return (
    <div className={`mini-board ${className}`} style={{ "--s": `${size}px` }} aria-hidden>
      {puzzle.map((p, i) => <i key={i} className={p ? "g" : values?.[i] ? "u" : ""} style={{ "--rc": R(i) + C(i) }} />)}
    </div>
  );
}

// Today's daily, drawn small with its clues, for the home screen.
export function PreviewBoard({ puzzle }) {
  return (
    <div className="preview-board" aria-hidden>
      {Array.from({ length: 81 }, (_, i) => <i key={i}>{puzzle?.[i] || ""}</i>)}
      <GridLines />
    </div>
  );
}
