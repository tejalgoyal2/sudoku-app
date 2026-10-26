import { DIFFICULTIES, DIFF_KEYS } from "../engine/generator.js";
import { todayKey, dailyStreak } from "../game/storage.js";
import { CHALLENGES, CHALLENGE_KEYS } from "../game/challenges.js";
import { Icon } from "./Icons.jsx";
import { fmt } from "../util.js";

function Sparkline({ times }) {
  if (times.length < 2) return null;
  const w = 300, h = 36, max = Math.max(...times), min = Math.min(...times), span = max - min || 1;
  const pts = times.map((t, k) => [(k / (times.length - 1)) * w, 4 + (1 - (t - min) / span) * (h - 8)]);
  const best = times.indexOf(max);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="Recent solve times, higher is faster">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[best][0]} cy={pts[best][1]} r="3.5" fill="var(--accent)" />
    </svg>
  );
}

function DailyHeatmap({ stats }) {
  const today = new Date(`${todayKey()}T12:00:00`);
  const start = new Date(today);
  start.setDate(start.getDate() - 7 * 17 - today.getDay());
  const cells = [];
  for (let d = new Date(start); cells.length < 18 * 7; d.setDate(d.getDate() + 1)) {
    const key = todayKey(d);
    cells.push(<i key={key} title={key} className={`${stats.daily[key] ? "on" : ""} ${key === todayKey() ? "today" : ""} ${d > today ? "future" : ""}`} />);
  }
  return <div className="card heatmap" aria-label="Daily puzzles solved, last 18 weeks">{cells}</div>;
}

export default function Stats({ stats, onReset }) {
  const totals = Object.values(stats.byDiff).reduce((a, d) => ({ played: a.played + d.played, won: a.won + d.won, flawless: a.flawless + (d.flawless || 0) }), { played: 0, won: 0, flawless: 0 });
  return (
    <div className="screen stats">
      <header className="page-head">
        <h1>Statistics</h1>
        <p>Saved on this device only.</p>
      </header>
      <div className="stat-tiles">
        <div className="card stat-tile"><b>{stats.streak.current}</b><span>Win streak</span></div>
        <div className="card stat-tile"><b>{stats.streak.best}</b><span>Best streak</span></div>
        <div className="card stat-tile"><b>{dailyStreak(stats)}</b><span>Daily streak</span></div>
        <div className="card stat-tile"><b>{totals.won}</b><span>Wins</span></div>
        <div className="card stat-tile"><b>{totals.played ? Math.round((totals.won / totals.played) * 100) : 0}%</b><span>Win rate</span></div>
        <div className="card stat-tile"><b>{totals.flawless}</b><span>Flawless</span></div>
      </div>

      <h2 className="section-label">Daily puzzles <span>last 18 weeks</span></h2>
      <DailyHeatmap stats={stats} />

      <h2 className="section-label">By difficulty</h2>
      <div className="diff-stats">
      {DIFF_KEYS.map((key) => {
        const d = stats.byDiff[key];
        const recent = stats.history.filter((h) => h.won && h.difficulty === key).slice(0, 20).map((h) => h.time).reverse();
        return (
          <div className="card diff-stat" key={key}>
            <div className="top"><b>{DIFFICULTIES[key].label}</b><span>{d.won}/{d.played} won</span></div>
            <div className="nums">
              <span>Best <b className="tnum">{fmt(d.bestTime)}</b></span>
              <span>Avg <b className="tnum">{d.won ? fmt(Math.round(d.totalTime / d.won)) : "—"}</b></span>
              <span>Flawless <b>{d.flawless || 0}</b></span>
            </div>
            <Sparkline times={recent.map((t) => -t)} />
          </div>
        );
      })}
      </div>

      <h2 className="section-label">Challenges</h2>
      <div className="card list">
        {CHALLENGE_KEYS.map((key) => {
          const c = CHALLENGES[key], rec = stats.challenges?.[key];
          return (
            <div key={key} className="list-row static">
              <span className="row-body">
                <span className="row-title">{c.name}</span>
                <span className="row-sub">{rec?.played ? `${rec.won} of ${rec.played} won` : "Not played yet"}</span>
              </span>
              {rec?.best && <span className="row-meta tnum">{fmt(rec.best)}</span>}
              <span className="stars-row">{[1, 2, 3].map((n) => <Icon.star key={n} width={13} height={13} className={n <= (rec?.stars || 0) ? "on" : ""} />)}</span>
            </div>
          );
        })}
      </div>

      <button className="btn danger reset" onClick={onReset}>Reset statistics</button>
    </div>
  );
}
