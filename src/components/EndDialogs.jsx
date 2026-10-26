import Sheet from "./Sheet.jsx";
import { useEffect, useState } from "react";
import { Icon } from "./Icons.jsx";
import { CHALLENGES } from "../game/challenges.js";
import { DIFFICULTIES } from "../engine/generator.js";
import { fmt, fmtDate } from "../util.js";

// Counts up to `to` over ~0.9s with an ease-out, for the finish screen's numbers.
function useCountUp(to, run) {
  const [v, setV] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    let raf, t0;
    const step = (t) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / 900);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return v;
}

export function WinDialog({ open, game, result, stats, onHome, onNewGame, onShare, onReplay }) {
  const shown = useCountUp(game.elapsed, open);
  const challenge = CHALLENGES[game.challenge];
  const stars = result?.stars || 0;
  const badges = [];
  if (result?.personalBest) badges.push("Personal best");
  if (result?.firstWin) badges.push("First win");
  if (game.mistakes === 0 && game.hints === 0) badges.push("Flawless");
  if (game.rescued) badges.push("Not counted toward records");

  return (
    <Sheet open={open} onClose={onHome} labelledBy="win-title">
      <div className="win">
        <div className="win-check" aria-hidden><Icon.check width={26} height={26} strokeWidth={2.5} /></div>
        <h2 className="win-title" id="win-title">Solved</h2>
        <div className="win-time tnum">{fmt(shown)}</div>
        <div className="win-sub">
          {challenge ? challenge.name : game.mode === "daily" ? `Daily · ${fmtDate(game.dateKey)}` : game.mode === "custom" ? "Custom puzzle" : DIFFICULTIES[game.difficulty].label}
        </div>
        {challenge && (
          <div className="win-stars" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((n) => <span key={n} className={n <= stars ? "on" : ""} style={{ animationDelay: `${300 + n * 120}ms` }}><Icon.star width={26} height={26} /></span>)}
            <small>2 stars under {fmt(challenge.par[0])} · 3 under {fmt(challenge.par[1])} with no mistakes</small>
          </div>
        )}
        {badges.length > 0 && <div className="badges">{badges.map((b) => <span key={b} className="badge">{b}</span>)}</div>}

        <div className="win-stats">
          <div><b>{game.mistakes}</b><span>Mistakes</span></div>
          <div><b>{game.hints}</b><span>Hints</span></div>
          <div><b>{stats.streak.current}</b><span>Day streak</span></div>
        </div>

        <div className="win-actions">
          <button className="btn" onClick={onShare}><Icon.share width={17} height={17} />Share</button>
          <button className="btn" onClick={onReplay}><Icon.replay width={17} height={17} />Replay</button>
          <button className="btn ghost" onClick={onHome}>Home</button>
          <button className="btn primary" onClick={onNewGame} data-autofocus>New game</button>
        </div>
      </div>
    </Sheet>
  );
}

export function LostDialog({ open, game, challenge, onHome, onNewGame, onRescue }) {
  const timeUp = game.rules?.countdown && game.mistakes < (game.rules.mistakeLimit || Infinity);
  return (
    <Sheet open={open} onClose={onHome} labelledBy="lost-title">
      <div className="win lost">
        <h2 className="win-title" id="lost-title">{timeUp ? "Time's up" : "Out of mistakes"}</h2>
        {challenge ? (
          <p className="win-sub">Try {challenge.name} again with a new grid.</p>
        ) : (
          <p className="win-sub">You can keep solving, but this game won't count toward your records.</p>
        )}
        <div className="win-actions">
          {challenge
            ? <button className="btn primary" onClick={onNewGame} data-autofocus>Try again</button>
            : <button className="btn primary" onClick={onRescue} data-autofocus>Keep going</button>}
          <button className="btn ghost" onClick={onHome}>Home</button>
          {!challenge && <button className="btn" onClick={onNewGame}>New game</button>}
        </div>
      </div>
    </Sheet>
  );
}

const KEYCAPS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
export function shareText(game) {
  const ch = CHALLENGES[game.challenge];
  const head = ch ? `Sudoku Challenge · ${ch.name} ${"★".repeat(1 + (game.elapsed <= ch.par[0]) + (game.elapsed <= ch.par[1] && !game.mistakes))}` : game.mode === "daily"
    ? `Sudoku Daily · ${fmtDate(game.dateKey, { weekday: "short", month: "short", day: "numeric" })} (${DIFFICULTIES[game.difficulty].label})`
    : `Sudoku · ${game.mode === "custom" ? "Custom" : DIFFICULTIES[game.difficulty].label}`;
  const flair = [`⏱ ${fmt(game.elapsed)}`];
  if (game.mistakes === 0 && game.hints === 0) flair.push("✦ Flawless");
  else flair.push(`✕ ${game.mistakes}`, `💡 ${game.hints}`);
  const lines = [head, flair.join("  ")];
  if (game.boxOrder.length === 9) {
    lines.push("");
    for (let r = 0; r < 3; r++) lines.push([0, 1, 2].map((c) => KEYCAPS[game.boxOrder.indexOf(r * 3 + c)]).join(""));
  }
  lines.push("", location.origin);
  return lines.join("\n");
}
