import { useEffect, useState } from "react";
import { DIFFICULTIES, DIFF_KEYS, dailyDifficulty } from "../engine/generator.js";
import { requestDaily } from "../engine/client.js";
import { progressOf } from "../game/state.js";
import { CHALLENGES, CHALLENGE_KEYS } from "../game/challenges.js";
import { todayKey } from "../game/storage.js";
import { MiniBoard, PreviewBoard } from "./Board.jsx";
import { Icon } from "./Icons.jsx";
import { fmt, fmtDate, greeting } from "../util.js";

function Week({ stats, today }) {
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 6 + k);
    return todayKey(d);
  });
  return (
    <div className="week" aria-label="Dailies solved this week">
      {days.map((key) => (
        <span key={key} className={`week-day ${stats.daily[key] ? "done" : ""} ${key === today ? "today" : ""}`}>
          <i>{stats.daily[key] && <Icon.check width={10} height={10} strokeWidth={3.5} />}</i>
          {new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
        </span>
      ))}
    </div>
  );
}

const Stars = ({ n }) => (
  <span className="stars-row" aria-label={`${n} of 3 stars`}>{[1, 2, 3].map((k) => <Icon.star key={k} width={13} height={13} className={k <= n ? "on" : ""} />)}</span>
);

export default function Home({ stats, saved, onResume, onStart, onDaily, onChallenge, onImport }) {
  const today = todayKey();
  const daily = stats.daily[today];
  const dDiff = dailyDifficulty(today);
  const streak = stats.streak.current;
  const [dailyPuzzle, setDailyPuzzle] = useState(null);

  useEffect(() => { let live = true; requestDaily(today).then((p) => live && setDailyPuzzle(p.puzzle)); return () => { live = false; }; }, [today]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea, dialog")) return;
      const n = +e.key;
      if (n >= 1 && n <= 4) { e.preventDefault(); onStart(DIFF_KEYS[n - 1]); }
      else if (e.key === "Enter" && saved) { e.preventDefault(); onResume(); }
      else if (e.key === "d" || e.key === "D") { e.preventDefault(); onDaily(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saved, onResume, onStart, onDaily]);

  return (
    <div className="screen home">
      <header className="home-head">
        <p className="eyebrow">{fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1>{greeting()}</h1>
        {streak > 0 && <p className="streak"><Icon.flame width={14} height={14} />{streak}-day streak</p>}
      </header>

      <div className="home-grid">
        <div className="home-col">
          {saved && (
            <button className="card resume" onClick={onResume}>
              <MiniBoard puzzle={saved.puzzle} values={saved.values} size={52} />
              <span className="row-body">
                <span className="row-title">Continue</span>
                <span className="row-sub">
                  {saved.challenge ? CHALLENGES[saved.challenge].name : saved.mode === "daily" ? "Daily" : saved.mode === "custom" ? "Custom" : DIFFICULTIES[saved.difficulty].label}
                  {" · "}<span className="tnum">{fmt(saved.elapsed)}</span>{" · "}{Math.round(progressOf(saved) * 100)}%
                </span>
              </span>
              <span className="progress" style={{ "--p": progressOf(saved) }} aria-hidden />
              <Icon.arrow className="chev" width={18} height={18} />
            </button>
          )}

          <button className="card daily" onClick={onDaily} aria-label={daily ? "Daily puzzle, solved. Play again" : "Play today's daily puzzle"}>
            <PreviewBoard puzzle={dailyPuzzle} />
            <span className="daily-body">
              <span className="eyebrow">Daily puzzle</span>
              <span className="daily-title">{DIFFICULTIES[dDiff].label}</span>
              <span className="daily-sub">
                {daily ? <>Solved in <b className="tnum">{fmt(daily.time)}</b></> : "Same puzzle for everyone today"}
              </span>
            </span>
            <span className="daily-foot">
              <Week stats={stats} today={today} />
              <span className={`btn ${daily ? "" : "primary"} daily-cta`}>{daily ? "Play again" : "Play"}</span>
            </span>
          </button>
        </div>

        <div className="home-col">
          <section>
            <h2 className="section-label">New game</h2>
            <div className="card list">
              {DIFF_KEYS.map((key, k) => {
                const d = DIFFICULTIES[key], best = stats.byDiff[key].bestTime;
                return (
                  <button key={key} className="list-row" onClick={() => onStart(key)}>
                    <span className="level" aria-hidden>{[1, 2, 3, 4].map((n) => <i key={n} className={n <= k + 1 ? "on" : ""} />)}</span>
                    <span className="row-body">
                      <span className="row-title">{d.label}</span>
                      <span className="row-sub">{d.blurb}</span>
                    </span>
                    {best && <span className="row-meta tnum">{fmt(best)}</span>}
                    <kbd className="hide-sm">{k + 1}</kbd>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="section-label">Challenges</h2>
            <div className="card list">
              {CHALLENGE_KEYS.map((key) => {
                const c = CHALLENGES[key], Glyph = Icon[c.icon];
                return (
                  <button key={key} className="list-row" onClick={() => onChallenge(key)}>
                    <span className="row-icon"><Glyph width={17} height={17} /></span>
                    <span className="row-body">
                      <span className="row-title">{c.name}</span>
                      <span className="row-sub">{c.short}</span>
                    </span>
                    <Stars n={stats.challenges?.[key]?.stars || 0} />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <footer className="home-foot">
        <button className="link" onClick={onImport}><Icon.clipboard width={15} height={15} />Paste a puzzle</button>
        <span className="hide-sm">Press <kbd>?</kbd> for keyboard shortcuts</span>
      </footer>
    </div>
  );
}
