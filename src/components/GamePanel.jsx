import { useState } from "react";
import { BOXES } from "../engine/core.js";
import { TECHNIQUES } from "../engine/techniques.js";
import { CHALLENGES, timeLeft } from "../game/challenges.js";
import { dailyStreak } from "../game/storage.js";
import { Icon } from "./Icons.jsx";
import { fmt } from "../util.js";

// The left column on wide screens: the clock, a map of the boxes, how this solve compares with
// your others, and (on request) the techniques the puzzle needs.
export default function GamePanel({ game, settings, stats, label, limit, paused, onPause, onJump, seen }) {
  const [showTech, setShowTech] = useState(false);
  const [open, setOpen] = useState(null);
  const left = timeLeft(game);
  const challenge = CHALLENGES[game.challenge];
  const filled = game.values.filter(Boolean).length;
  const d = stats.byDiff[game.difficulty];
  const techs = Object.entries(game.grade?.counts || {}).sort((a, b) => (TECHNIQUES[a[0]]?.level || 0) - (TECHNIQUES[b[0]]?.level || 0));
  const showClock = left !== null || (settings.showTimer && !settings.zen);

  return (
    <aside className="panel" aria-label="Game details">
      <section className="panel-block">
        {label}
        {showClock && (
          <div className={`panel-timer tnum ${left !== null && left <= 30 ? "low" : ""}`} aria-label={left !== null ? "Time left" : "Elapsed time"}>
            {fmt(left !== null ? Math.max(0, left) : game.elapsed)}
          </div>
        )}
        <div className="panel-row">
          {limit > 0 ? (
            <span className="mistake-marks" aria-label={`${game.mistakes} of ${limit} mistakes`}>
              {Array.from({ length: limit }, (_, k) => <i key={k} className={k < game.mistakes ? "hit" : ""} />)}
            </span>
          ) : <span className="panel-dim">{game.mistakes ? `${game.mistakes} mistake${game.mistakes > 1 ? "s" : ""}` : "No mistakes"}</span>}
          {game.status === "playing" && (
            <button className="btn ghost panel-pause" onClick={onPause}>
              {paused ? <Icon.play width={14} height={14} /> : <Icon.pause width={14} height={14} />}{paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
      </section>

      <section className="panel-block">
        <h3 className="panel-label">Boxes <span className="tnum">{filled}/81</span></h3>
        <div className="box-map">
          {BOXES.map((cells, b) => {
            const done = cells.every((i) => game.values[i] === game.solution[i]);
            const target = cells.find((i) => !game.values[i]) ?? cells[0];
            return (
              <button key={b} className={`bm-box ${done ? "done" : ""}`} onClick={() => onJump(target)} aria-label={`Box ${b + 1}${done ? ", complete" : ""}`}>
                {cells.map((i) => <i key={i} className={game.puzzle[i] ? "g" : game.values[i] ? "u" : ""} />)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-block">
        <h3 className="panel-label">{challenge ? "Stars" : "Your times"}</h3>
        {challenge ? (
          <dl className="panel-list">
            <div><dt>Finish</dt><dd><Icon.star width={12} height={12} /></dd></div>
            <div><dt>Under {fmt(challenge.par[0])}</dt><dd><Icon.star width={12} height={12} /><Icon.star width={12} height={12} /></dd></div>
            <div><dt>Under {fmt(challenge.par[1])}, no mistakes</dt><dd><Icon.star width={12} height={12} /><Icon.star width={12} height={12} /><Icon.star width={12} height={12} /></dd></div>
          </dl>
        ) : (
          <dl className="panel-list">
            <div><dt>Best</dt><dd className="tnum">{fmt(d?.bestTime)}</dd></div>
            <div><dt>Average</dt><dd className="tnum">{d?.won ? fmt(Math.round(d.totalTime / d.won)) : "—"}</dd></div>
            {game.mode === "daily" ? <div><dt>Daily streak</dt><dd>{dailyStreak(stats)}</dd></div> : <div><dt>Solved</dt><dd>{d?.won || 0}</dd></div>}
          </dl>
        )}
      </section>

      {techs.length > 0 && (
        <section className="panel-block">
          <h3 className="panel-label">This puzzle needs</h3>
          {showTech ? (
            <ul className="tech-list">
              {techs.map(([id, n]) => (
                <li key={id} className={`${seen.has(id) ? "seen" : ""} ${open === id ? "open" : ""}`}>
                  <button onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
                    <span>{TECHNIQUES[id]?.name || id}</span>
                    <span className="tech-n">×{n}</span>
                  </button>
                  {open === id && <p>{TECHNIQUES[id]?.blurb}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <button className="link reveal" onClick={() => setShowTech(true)}>Show techniques<Icon.arrow width={13} height={13} /></button>
          )}
        </section>
      )}
    </aside>
  );
}
