import { useState } from "react";
import Sheet from "./Sheet.jsx";
import { THEMES, THEME_KEYS, themeVars, themeAttrs } from "../theme/themes.js";
import { sound, VOICES } from "../game/sound.js";
import { Icon } from "./Icons.jsx";
import { TECHNIQUES } from "../engine/techniques.js";
import { parsePuzzle, countSolutions, solve } from "../engine/core.js";
import { grade } from "../engine/techniques.js";

const Switch = ({ checked, onChange, label }) => (
  <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
);

function Setting({ label, desc, children }) {
  return (
    <div className="setting">
      <div><div className="label">{label}</div>{desc && <div className="desc">{desc}</div>}</div>
      {children}
    </div>
  );
}

// A corner of the theme's board: its box shading, lines, corners and digits.
const SAMPLE = [5, 0, 0, 0, 0, 3, 0, 8, 0];
function Swatch({ k, on, onPick, label }) {
  return (
    <button className={`swatch ${on ? "on" : ""}`} onClick={() => onPick()} aria-pressed={on} title={label}>
      <span className="swatch-art" style={themeVars(k)} {...themeAttrs(k)}>
        <span className="sw-board">
          {SAMPLE.map((v, b) => (
            <i key={b} className={b % 2 ? "" : "alt"}>{v ? <b className={b === 5 ? "u" : "g"}>{v}</b> : b === 4 ? <em /> : null}</i>
          ))}
        </span>
      </span>
      <span className="swatch-name">{label}</span>
    </button>
  );
}

export function SettingsSheet({ open, onClose, settings, set, pickTheme, themeVoice }) {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="section-title first">Theme <kbd>T</kbd></div>
      <div className="swatches">
        <Swatch k={dark ? "graphite" : "paper"} label="Auto" on={settings.theme === "auto"} onPick={() => pickTheme("auto")} />
        {THEME_KEYS.map((k) => <Swatch key={k} k={k} label={THEMES[k].name} on={settings.theme === k} onPick={() => pickTheme(k)} />)}
      </div>

      <div className="section-title">Play</div>
      <Setting label="Zen mode" desc="Hide the timer and mistakes. No mistake limit. Just you and the grid.">
        <Switch label="Zen mode" checked={settings.zen} onChange={(zen) => set({ zen })} />
      </Setting>
      <Setting label="Check mistakes" desc="Flag wrong digits right away.">
        <Switch label="Check mistakes" checked={settings.autoCheck} onChange={(autoCheck) => set({ autoCheck })} />
      </Setting>
      <Setting label="Mistake limit">
        <div className="segmented" role="radiogroup" aria-label="Mistake limit">
          {[[3, "3"], [5, "5"], [0, "Off"]].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={settings.mistakeLimit === v} className={settings.mistakeLimit === v ? "on" : ""} onClick={() => set({ mistakeLimit: v })}>{l}</button>
          ))}
        </div>
      </Setting>
      <Setting label="Show timer">
        <Switch label="Show timer" checked={settings.showTimer} onChange={(showTimer) => set({ showTimer })} />
      </Setting>
      <Setting label="Auto-remove notes" desc="Placing a digit clears it from notes in the same row, column and box.">
        <Switch label="Auto-remove notes" checked={settings.autoRemoveNotes} onChange={(autoRemoveNotes) => set({ autoRemoveNotes })} />
      </Setting>

      <div className="section-title">Highlights</div>
      <Setting label="Row, column & box">
        <Switch label="Highlight row, column and box" checked={settings.highlightPeers} onChange={(highlightPeers) => set({ highlightPeers })} />
      </Setting>
      <Setting label="Matching digits" desc="Also lights up matching notes.">
        <Switch label="Highlight matching digits" checked={settings.highlightSame} onChange={(highlightSame) => set({ highlightSame })} />
      </Setting>
      <Setting label="Rule conflicts" desc="Underline digits that clash in a row, column or box.">
        <Switch label="Highlight conflicts" checked={settings.highlightConflicts} onChange={(highlightConflicts) => set({ highlightConflicts })} />
      </Setting>

      <div className="section-title">Sound & feel</div>
      <Setting label="Sound">
        <Switch label="Sound" checked={settings.sound} onChange={(sound) => set({ sound })} />
      </Setting>
      {settings.sound && (
        <Setting label="Sound style" desc={settings.voice === "theme" ? `Matches the theme: ${VOICES[themeVoice].label.toLowerCase()}.` : undefined}>
          <div className="segmented" role="radiogroup" aria-label="Sound style">
            {[["theme", "Theme"], ...Object.entries(VOICES).map(([k, v]) => [k, v.label])].map(([v, l]) => (
              <button key={v} role="radio" aria-checked={settings.voice === v} className={settings.voice === v ? "on" : ""}
                onClick={() => { set({ voice: v }); sound.configure({ ...settings, voice: v === "theme" ? themeVoice : v }); sound.preview(); }}>{l}</button>
            ))}
          </div>
        </Setting>
      )}
      {settings.sound && (
        <Setting label="Volume">
          <input type="range" min="0.05" max="1" step="0.05" value={settings.volume} onChange={(e) => set({ volume: +e.target.value })} aria-label="Volume" />
        </Setting>
      )}
      <Setting label="Haptics" desc="Vibration on supported devices.">
        <Switch label="Haptics" checked={settings.haptics} onChange={(haptics) => set({ haptics })} />
      </Setting>
    </Sheet>
  );
}

const SHORTCUTS = [
  ["Play", [
    ["Place a digit", ["1", "–", "9"]],
    ["Toggle a note", ["⇧", "1–9"]],
    ["Notes mode", ["N"], ["Space"]],
    ["Erase", ["⌫"], ["0"]],
    ["Undo / redo", ["Z"], ["Y"]],
    ["Hint (press again to go deeper)", ["H"]],
    ["Fill all notes", ["A"]],
    ["Paint the selected digit", ["L"]],
  ]],
  ["Move", [
    ["Move around (wraps)", ["←", "↑", "→", "↓"]],
    ["Jump to next empty in a direction", ["⌘/Ctrl", "Arrow"]],
    ["Next / previous empty cell", ["Tab"], ["⇧", "Tab"]],
  ]],
  ["Anywhere", [
    ["Pause", ["P"], ["Esc"]],
    ["Next theme", ["T"]],
    ["Statistics", ["S"]],
    ["Zen mode", ["F"]],
    ["Mute", ["M"]],
    ["Settings", [","]],
    ["This help", ["?"]],
    ["Home: start a difficulty", ["1", "–", "4"]],
    ["Home: daily / continue", ["D"], ["↵"]],
  ]],
];

export function HelpSheet({ open, onClose }) {
  const [tab, setTab] = useState(() => (window.matchMedia("(pointer: coarse)").matches ? "how" : "keys"));
  return (
    <Sheet open={open} onClose={onClose} title="Help">
      <div className="tabs" role="tablist">
        {[["keys", "Shortcuts"], ["how", "How to play"], ["tech", "Techniques"]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "keys" && SHORTCUTS.map(([group, items]) => (
        <div className="shortcut-group" key={group}>
          <h3>{group}</h3>
          {items.map(([label, ...combos]) => (
            <div className="shortcut" key={label}>
              <span>{label}</span>
              <span className="keys">
                {combos.map((c, n) => (
                  <span key={n} style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
                    {n > 0 && <span style={{ color: "var(--text-dim)", fontSize: 12, margin: "0 2px" }}>or</span>}
                    {c.map((key) => (key === "–" ? <span key={key} style={{ color: "var(--text-dim)" }}>–</span> : <kbd key={key}>{key}</kbd>))}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
      {tab === "how" && (
        <div className="prose">
          <p>Fill every row, column and 3×3 box with the digits <b>1–9</b>, each exactly once.</p>
          <p><b>Notes.</b> Turn on notes mode (N) to pencil in candidates. Hold <kbd>⇧</kbd> while typing a digit to add a note without switching modes.</p>
          <p><b>Painting.</b> Long-press (or right-click) a number key to lock it, then tap cell after cell to place it. Great for scanning one digit at a time.</p>
          <p><b>Hints that teach.</b> A hint starts by pointing you at the right area. Ask again and it explains the technique. Ask a third time and it makes the move.</p>
          <p><b>Challenges.</b> Five variations on the rules: a countdown clock, one mistake allowed, no notes, limited sight, and an expert run with no help. Earn up to three stars on each.</p>
          <p><b>Daily puzzle.</b> Everyone gets the same puzzle each day. It starts easy on Monday and builds to expert by Sunday.</p>
          <p><b>Share & replay.</b> When you finish, watch a replay of your solve or share your result.</p>
          <p>Your progress saves automatically. Close the tab and you'll pick up right where you left off.</p>
        </div>
      )}
      {tab === "tech" && Object.values(TECHNIQUES).map((t) => (
        <div className="tech-item" key={t.name}>
          <div className="t">{t.name}<span className="chip" style={{ padding: "2px 7px", fontSize: 11 }}>Level {t.level}</span></div>
          <p>{t.blurb}</p>
        </div>
      ))}
    </Sheet>
  );
}

export function ImportSheet({ open, onClose, onPlay }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    const p = parsePuzzle(text);
    if (!p) return setError("Need exactly 81 cells: digits 1–9, with 0 or . for blanks.");
    const n = countSolutions(p);
    if (n === 0) return setError("This puzzle has no solution.");
    if (n > 1) return setError("This puzzle has more than one solution.");
    setError("");
    onPlay({ puzzle: p, solution: solve(p), grade: grade(p) });
    setText("");
  };
  return (
    <Sheet open={open} onClose={onClose} title="Paste a puzzle">
      <div className="import">
        <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginBottom: 10 }}>Paste a puzzle from a book, a newspaper or a friend. Row by row, with 0 or . for blanks. Spaces and line breaks are fine.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79" autoFocus spellCheck={false} />
        <div className="err" role="alert">{error}</div>
        <button className="btn primary block" onClick={submit} style={{ marginTop: 6 }}>Play this puzzle</button>
      </div>
    </Sheet>
  );
}
