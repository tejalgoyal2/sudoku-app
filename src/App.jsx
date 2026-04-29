import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── UTILS ───
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const R = (i) => Math.floor(i / 9), C = (i) => i % 9, B = (i) => Math.floor(R(i) / 3) * 3 + Math.floor(C(i) / 3);
const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };

// ─── SUDOKU ENGINE ───
function isValid(grid, idx, num) {
  const r = R(idx), c = C(idx), br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 9; i++) {
    if (grid[r * 9 + i] === num || grid[i * 9 + c] === num) return false;
    const bi = (br + Math.floor(i / 3)) * 9 + bc + (i % 3);
    if (grid[bi] === num) return false;
  }
  return true;
}

function solve(grid, randomize = false) {
  const g = [...grid];
  function go() {
    const e = g.indexOf(0);
    if (e === -1) return true;
    const nums = randomize ? shuffle([1,2,3,4,5,6,7,8,9]) : [1,2,3,4,5,6,7,8,9];
    for (const n of nums) {
      if (isValid(g, e, n)) { g[e] = n; if (go()) return true; g[e] = 0; }
    }
    return false;
  }
  return go() ? g : null;
}

function countSolutions(grid, limit = 2) {
  const g = [...grid]; let count = 0;
  function go() {
    if (count >= limit) return;
    const e = g.indexOf(0);
    if (e === -1) { count++; return; }
    for (let n = 1; n <= 9; n++) {
      if (isValid(g, e, n)) { g[e] = n; go(); g[e] = 0; }
    }
  }
  go(); return count;
}

function generatePuzzle(difficulty) {
  const targets = { easy: 40, medium: 33, hard: 27, expert: 23 };
  const target = targets[difficulty] + Math.floor(Math.random() * 3);
  const solution = solve(Array(81).fill(0), true);
  const puzzle = [...solution];
  const indices = shuffle([...Array(81).keys()]);
  let clues = 81;
  for (const idx of indices) {
    if (clues <= target) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle) === 1) { clues--; } else { puzzle[idx] = backup; }
  }
  return { puzzle, solution };
}

// ─── STORAGE ───
const STATS_KEY = "sudoku_stats_v1";
const SETTINGS_KEY = "sudoku_settings_v1";

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    if (s) return s;
  } catch {}
  return { easy:{played:0,won:0,bestTime:null,totalTime:0}, medium:{played:0,won:0,bestTime:null,totalTime:0}, hard:{played:0,won:0,bestTime:null,totalTime:0}, expert:{played:0,won:0,bestTime:null,totalTime:0}, currentStreak:0, bestStreak:0, lastPlayDate:null };
}
function saveStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

// ─── THEME ───
const themes = {
  light: {
    bg: "#F5F0E8", surface: "#FFFFFF", surfaceAlt: "#F0EBE3", gridLine: "#D4CFC5", gridThick: "#6B635A",
    textPrimary: "#2C2520", textSecondary: "#8A8078", givenNum: "#2C2520", userNum: "#4A7C9B",
    selected: "#FFF0C8", selectedBorder: "#E8B830", related: "#F5EFE5", sameNum: "#E5EEF5",
    error: "#D44040", errorBg: "#FDE8E8", accent: "#D4952A", accentHover: "#C08520",
    noteText: "#A09888", padBg: "#EDE8E0", padHover: "#E0D8CC", padActive: "#D4CFC5",
    success: "#3B8550", controlBg: "#EDE8E0",
  },
  dark: {
    bg: "#131416", surface: "#1E1F24", surfaceAlt: "#262730", gridLine: "#33343D", gridThick: "#5C5D66",
    textPrimary: "#E8E5DD", textSecondary: "#8A8680", givenNum: "#E8E5DD", userNum: "#6EB8E0",
    selected: "#443A1E", selectedBorder: "#D4A020", related: "#282A35", sameNum: "#1E3040",
    error: "#F06060", errorBg: "#402020", accent: "#E0A830", accentHover: "#F0C050",
    noteText: "#6A665E", padBg: "#262730", padHover: "#353640", padActive: "#44454F",
    success: "#5ABF70", controlBg: "#262730",
  },
};

// ─── MAIN APP ───
export default function SudokuApp() {
  const [dark, setDark] = useState(() => loadSettings().dark ?? true);
  const t = themes[dark ? "dark" : "light"];

  const [screen, setScreen] = useState("menu"); // menu | play | stats
  const [difficulty, setDifficulty] = useState("easy");
  const [generating, setGenerating] = useState(false);

  // Game state
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(null); // null | 'won' | 'lost'
  const [undoStack, setUndoStack] = useState([]);
  const [stats, setStats] = useState(loadStats);
  const [completedUnits, setCompletedUnits] = useState(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  const timerRef = useRef(null);
  const maxMistakes = 3;

  // Theme persistence
  useEffect(() => { saveSettings({ dark }); }, [dark]);

  // Timer
  useEffect(() => {
    if (screen === "play" && !paused && !gameOver) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [screen, paused, gameOver]);

  // Pause on visibility change
  useEffect(() => {
    const handler = () => { if (document.hidden && screen === "play") setPaused(true); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [screen]);

  // Number counts
  const numCounts = useMemo(() => {
    const counts = Array(10).fill(0);
    board.forEach(c => { if (c.value) counts[c.value]++; });
    return counts;
  }, [board]);

  // Start new game
  const startGame = useCallback((diff) => {
    setDifficulty(diff);
    setGenerating(true);
    setScreen("play");
    setTimeout(() => {
      const { puzzle: p, solution: s } = generatePuzzle(diff);
      setPuzzle(p);
      setSolution(s);
      setBoard(p.map((v) => ({ value: v, given: v !== 0, notes: new Set(), isError: false })));
      setSelected(null);
      setNotesMode(false);
      setMistakes(0);
      setTimer(0);
      setPaused(false);
      setGameOver(null);
      setUndoStack([]);
      setCompletedUnits(new Set());
      setShowConfetti(false);
      setGenerating(false);
    }, 50);
  }, []);

  // Check for completed units
  const checkCompletedUnits = useCallback((newBoard) => {
    const newCompleted = new Set();
    for (let i = 0; i < 9; i++) {
      // Row
      const rowVals = [];
      for (let c = 0; c < 9; c++) rowVals.push(newBoard[i * 9 + c].value);
      if (rowVals.every(v => v > 0) && new Set(rowVals).size === 9) newCompleted.add(`r${i}`);
      // Col
      const colVals = [];
      for (let r = 0; r < 9; r++) colVals.push(newBoard[r * 9 + i].value);
      if (colVals.every(v => v > 0) && new Set(colVals).size === 9) newCompleted.add(`c${i}`);
      // Box
      const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3, boxVals = [];
      for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) boxVals.push(newBoard[r * 9 + c].value);
      if (boxVals.every(v => v > 0) && new Set(boxVals).size === 9) newCompleted.add(`b${i}`);
    }
    setCompletedUnits(newCompleted);
  }, []);

  // Handle number input
  const handleNumber = useCallback((num) => {
    if (selected === null || gameOver || paused) return;
    const cell = board[selected];
    if (cell.given) return;

    const newBoard = board.map(c => ({ ...c, notes: new Set(c.notes) }));

    if (notesMode) {
      const prev = { idx: selected, value: cell.value, notes: new Set(cell.notes), type: "note" };
      if (newBoard[selected].notes.has(num)) newBoard[selected].notes.delete(num);
      else newBoard[selected].notes.add(num);
      newBoard[selected].value = 0;
      setUndoStack(s => [...s, prev]);
    } else {
      const prev = { idx: selected, value: cell.value, notes: new Set(cell.notes), type: "value" };
      if (num === solution[selected]) {
        newBoard[selected].value = num;
        newBoard[selected].notes = new Set();
        newBoard[selected].isError = false;
        // Remove this number from notes in same row/col/box
        for (let i = 0; i < 81; i++) {
          if (R(i) === R(selected) || C(i) === C(selected) || B(i) === B(selected)) {
            newBoard[i].notes.delete(num);
          }
        }
      } else {
        newBoard[selected].value = num;
        newBoard[selected].isError = true;
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        if (newMistakes >= maxMistakes) {
          setGameOver("lost");
          const s = { ...stats };
          s[difficulty].played++;
          setStats(s);
          saveStats(s);
        }
      }
      setUndoStack(s => [...s, prev]);
    }
    setBoard(newBoard);
    checkCompletedUnits(newBoard);

    // Check win
    if (!notesMode && newBoard.every(c => c.value !== 0 && !c.isError)) {
      setGameOver("won");
      setShowConfetti(true);
      const s = { ...stats };
      s[difficulty].played++;
      s[difficulty].won++;
      s[difficulty].totalTime += timer;
      if (!s[difficulty].bestTime || timer < s[difficulty].bestTime) s[difficulty].bestTime = timer;
      // Streak
      const today = new Date().toDateString();
      if (s.lastPlayDate) {
        const last = new Date(s.lastPlayDate);
        const diff2 = Math.floor((new Date(today) - last) / 86400000);
        if (diff2 <= 1) s.currentStreak++;
        else s.currentStreak = 1;
      } else { s.currentStreak = 1; }
      s.lastPlayDate = today;
      if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
      setStats(s);
      saveStats(s);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [selected, board, notesMode, solution, gameOver, paused, mistakes, stats, difficulty, timer, checkCompletedUnits]);

  // Erase
  const handleErase = useCallback(() => {
    if (selected === null || gameOver || paused) return;
    const cell = board[selected];
    if (cell.given) return;
    const prev = { idx: selected, value: cell.value, notes: new Set(cell.notes), type: "erase" };
    const newBoard = board.map(c => ({ ...c, notes: new Set(c.notes) }));
    newBoard[selected].value = 0;
    newBoard[selected].notes = new Set();
    newBoard[selected].isError = false;
    setBoard(newBoard);
    setUndoStack(s => [...s, prev]);
  }, [selected, board, gameOver, paused]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || gameOver || paused) return;
    const last = undoStack[undoStack.length - 1];
    const newBoard = board.map(c => ({ ...c, notes: new Set(c.notes) }));
    newBoard[last.idx].value = last.value;
    newBoard[last.idx].notes = new Set(last.notes);
    newBoard[last.idx].isError = last.value ? last.value !== solution[last.idx] : false;
    setBoard(newBoard);
    setUndoStack(s => s.slice(0, -1));
    checkCompletedUnits(newBoard);
  }, [undoStack, board, solution, gameOver, paused, checkCompletedUnits]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (screen !== "play") return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) handleNumber(n);
      if (e.key === "Backspace" || e.key === "Delete") handleErase();
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) handleUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, handleNumber, handleErase, handleUndo]);

  // ─── STYLES ───
  const fontLink = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`;

  const cellSize = "min(calc((100vw - 40px) / 9), 52px)";

  // ─── RENDER ───
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: t.bg, color: t.textPrimary, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", transition: "background 0.3s, color 0.3s" }}>
      <style>{fontLink}{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${t.bg}; overflow-x: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(720deg); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes unitFlash { 0% { background: ${t.success}33; } 100% { background: transparent; } }
        .cell-enter { animation: popIn 0.15s ease-out; }
        .generating { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ width: "100%", maxWidth: 480, padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {screen !== "menu" && (
            <button onClick={() => { setScreen("menu"); setPaused(false); }} style={{ background: "none", border: "none", color: t.textSecondary, cursor: "pointer", fontSize: 18, padding: 4, display: "flex" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: t.textPrimary }}>
            Sudoku
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {screen === "menu" && (
            <button onClick={() => setScreen("stats")} style={{ background: t.controlBg, border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: t.textSecondary, fontSize: 13, fontWeight: 500, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
              Stats
            </button>
          )}
          <button onClick={() => setDark(!dark)} style={{ background: t.controlBg, border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: t.textSecondary, fontSize: 16, display: "flex", alignItems: "center" }}>
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </div>

      {/* ─── MENU SCREEN ─── */}
      {screen === "menu" && (
        <div style={{ width: "100%", maxWidth: 480, padding: "24px 20px", animation: "fadeIn 0.3s ease-out", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <p style={{ color: t.textSecondary, fontSize: 15, fontWeight: 400 }}>Select difficulty to start</p>
          </div>

          {/* Streak display */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "12px 0", marginBottom: 4 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: t.accent }}>{stats.currentStreak}</div>
              <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>Current Streak</div>
            </div>
            <div style={{ width: 1, background: t.gridLine }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: t.textPrimary }}>{stats.bestStreak}</div>
              <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>Best Streak</div>
            </div>
          </div>

          {["easy", "medium", "hard", "expert"].map((diff) => {
            const labels = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };
            const descs = { easy: "Perfect for warming up", medium: "A solid challenge", hard: "For seasoned solvers", expert: "Only the brave" };
            const clueRange = { easy: "38–42 clues", medium: "33–35 clues", hard: "27–29 clues", expert: "23–25 clues" };
            const ds = stats[diff];
            const avg = ds.won > 0 ? fmt(Math.round(ds.totalTime / ds.won)) : "—";
            const best = ds.bestTime ? fmt(ds.bestTime) : "—";
            return (
              <button key={diff} onClick={() => startGame(diff)} style={{
                background: t.surface, border: `1.5px solid ${t.gridLine}`, borderRadius: 14, padding: "16px 18px",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.transform = "translateY(-1px)"; }}
                 onMouseLeave={e => { e.currentTarget.style.borderColor = t.gridLine; e.currentTarget.style.transform = "none"; }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary, marginBottom: 2 }}>{labels[diff]}</div>
                  <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 400 }}>{descs[diff]}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: t.textSecondary }}>Best {best}</div>
                  <div style={{ fontSize: 12, color: t.textSecondary }}>Avg {avg}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── STATS SCREEN ─── */}
      {screen === "stats" && (
        <div style={{ width: "100%", maxWidth: 480, padding: "16px 20px", animation: "fadeIn 0.3s ease-out" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Statistics</h2>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, padding: "14px", background: t.surface, borderRadius: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: t.accent }}>{stats.currentStreak}</div>
              <div style={{ fontSize: 11, color: t.textSecondary }}>Current Streak</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{stats.bestStreak}</div>
              <div style={{ fontSize: 11, color: t.textSecondary }}>Best Streak</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{Object.values(stats).filter(v => typeof v === "object").reduce((a, b) => a + b.won, 0)}</div>
              <div style={{ fontSize: 11, color: t.textSecondary }}>Total Wins</div>
            </div>
          </div>
          {["easy", "medium", "hard", "expert"].map(diff => {
            const d = stats[diff]; const pct = d.played ? Math.round((d.won / d.played) * 100) : 0;
            return (
              <div key={diff} style={{ background: t.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{diff}</span>
                  <span style={{ fontSize: 13, color: t.textSecondary }}>{d.won}/{d.played} games</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: t.textSecondary }}>
                  <span>Win rate: {pct}%</span>
                  <span>Best: {d.bestTime ? fmt(d.bestTime) : "—"}</span>
                  <span>Avg: {d.won ? fmt(Math.round(d.totalTime / d.won)) : "—"}</span>
                </div>
              </div>
            );
          })}
          <button onClick={() => {
            if (confirm("Reset all statistics? This cannot be undone.")) {
              const fresh = loadStats();
              Object.keys(fresh).forEach(k => { if (typeof fresh[k] === "object") fresh[k] = {played:0,won:0,bestTime:null,totalTime:0}; else fresh[k] = 0; });
              fresh.lastPlayDate = null;
              setStats(fresh); saveStats(fresh);
            }
          }} style={{ marginTop: 12, width: "100%", padding: "12px", background: "transparent", border: `1px solid ${t.error}40`, borderRadius: 10, color: t.error, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 }}>
            Reset Statistics
          </button>
        </div>
      )}

      {/* ─── GAME SCREEN ─── */}
      {screen === "play" && (
        <div style={{ width: "100%", maxWidth: 480, padding: "4px 20px 20px", animation: "fadeIn 0.25s ease-out", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

          {/* Difficulty + Timer bar */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", color: t.accent, background: `${t.accent}18`, padding: "4px 10px", borderRadius: 8 }}>
              {difficulty}
            </span>
            <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 14 }}>
              <span style={{ color: mistakes > 0 ? t.error : t.textSecondary, fontWeight: 600, fontSize: 13 }}>
                {mistakes}/{maxMistakes} ✕
              </span>
              <span style={{ color: t.textSecondary, fontWeight: 500, fontVariantNumeric: "tabular-nums", minWidth: 44 }}>
                {fmt(timer)}
              </span>
              {!gameOver && (
                <button onClick={() => setPaused(!paused)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textSecondary, display: "flex", padding: 2 }}>
                  {paused
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/></svg>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Board */}
          {generating ? (
            <div style={{ width: `calc(${cellSize} * 9 + 6px)`, height: `calc(${cellSize} * 9 + 6px)`, display: "flex", alignItems: "center", justifyContent: "center", background: t.surface, borderRadius: 10 }}>
              <span className="generating" style={{ fontSize: 15, color: t.textSecondary, fontWeight: 500 }}>Generating puzzle…</span>
            </div>
          ) : paused ? (
            <div onClick={() => setPaused(false)} style={{
              width: `calc(${cellSize} * 9 + 6px)`, height: `calc(${cellSize} * 9 + 6px)`,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8,
              background: t.surface, borderRadius: 10, cursor: "pointer", border: `2px solid ${t.gridLine}`,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill={t.textSecondary}><polygon points="5 3 19 12 5 21"/></svg>
              <span style={{ fontSize: 14, color: t.textSecondary, fontWeight: 500 }}>Tap to resume</span>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              {/* Confetti */}
              {showConfetti && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 10, borderRadius: 10 }}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${Math.random() * 100}%`,
                      top: -10,
                      width: 6 + Math.random() * 6,
                      height: 6 + Math.random() * 6,
                      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                      background: ["#E8A838", "#4A7C9B", "#D44040", "#3B8550", "#9B59B6", "#E67E22"][Math.floor(Math.random() * 6)],
                      animation: `confettiFall ${1.5 + Math.random() * 2}s ${Math.random() * 0.8}s ease-in forwards`,
                    }} />
                  ))}
                </div>
              )}
              <div style={{
                display: "grid", gridTemplateColumns: `repeat(9, ${cellSize})`,
                border: `2.5px solid ${t.gridThick}`, borderRadius: 10, overflow: "hidden",
                background: t.gridLine, gap: 0,
              }}>
                {board.map((cell, idx) => {
                  const r = R(idx), c = C(idx);
                  const isSelected = idx === selected;
                  const selR = selected !== null ? R(selected) : -1, selC = selected !== null ? C(selected) : -1, selB = selected !== null ? B(selected) : -1;
                  const isRelated = selected !== null && !isSelected && (r === selR || c === selC || B(idx) === selB);
                  const isSameNum = selected !== null && !isSelected && cell.value && board[selected]?.value && cell.value === board[selected].value;

                  let bg = t.surface;
                  if (isSelected) bg = t.selected;
                  else if (isSameNum) bg = t.sameNum;
                  else if (isRelated) bg = t.related;
                  if (cell.isError) bg = t.errorBg;

                  return (
                    <div key={idx} onClick={() => !gameOver && setSelected(idx)} style={{
                      width: cellSize, height: cellSize,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: bg,
                      borderRight: (c + 1) % 3 === 0 && c < 8 ? `2px solid ${t.gridThick}` : `0.5px solid ${t.gridLine}`,
                      borderBottom: (r + 1) % 3 === 0 && r < 8 ? `2px solid ${t.gridThick}` : `0.5px solid ${t.gridLine}`,
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.1s",
                      boxShadow: isSelected ? `inset 0 0 0 2px ${t.selectedBorder}` : "none",
                    }}>
                      {cell.value ? (
                        <span className={!cell.given && cell.value ? "cell-enter" : ""} style={{
                          fontSize: `calc(${cellSize} * 0.5)`,
                          fontWeight: cell.given ? 700 : 500,
                          color: cell.isError ? t.error : cell.given ? t.givenNum : t.userNum,
                          lineHeight: 1,
                        }}>
                          {cell.value}
                        </span>
                      ) : cell.notes.size > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, width: "80%", height: "80%" }}>
                          {[1,2,3,4,5,6,7,8,9].map(n => (
                            <span key={n} style={{
                              fontSize: `calc(${cellSize} * 0.2)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: cell.notes.has(n) ? t.noteText : "transparent",
                              fontWeight: 500, lineHeight: 1,
                            }}>{n}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls */}
          {!generating && !paused && (
            <>
              <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: `calc(${cellSize} * 9 + 6px)`, justifyContent: "center", marginTop: 4 }}>
                {[
                  { label: "Undo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 2.1-5.5L3 7"/></svg>, action: handleUndo, disabled: undoStack.length === 0 },
                  { label: "Erase", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16l9-13 8 8-5 9z"/><path d="M7 20l6-6"/></svg>, action: handleErase },
                  { label: "Notes", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>, action: () => setNotesMode(!notesMode), active: notesMode },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} disabled={btn.disabled || !!gameOver}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      padding: "10px 0", background: btn.active ? `${t.accent}22` : t.controlBg,
                      border: btn.active ? `1.5px solid ${t.accent}` : "1.5px solid transparent",
                      borderRadius: 12, cursor: btn.disabled || gameOver ? "default" : "pointer",
                      opacity: btn.disabled || gameOver ? 0.4 : 1,
                      color: btn.active ? t.accent : t.textSecondary, fontFamily: "inherit", fontSize: 11, fontWeight: 500,
                      transition: "all 0.15s",
                    }}>
                    {btn.icon}<span>{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* Number Pad */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 5, width: "100%", maxWidth: `calc(${cellSize} * 9 + 6px)`, marginTop: 2 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => {
                  const remaining = 9 - numCounts[n];
                  const isDone = remaining <= 0;
                  return (
                    <button key={n} onClick={() => !isDone && handleNumber(n)} disabled={isDone || !!gameOver}
                      style={{
                        aspectRatio: "1 / 1.15",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                        background: isDone ? t.surfaceAlt : t.padBg,
                        border: "none", borderRadius: 10, cursor: isDone || gameOver ? "default" : "pointer",
                        opacity: isDone || gameOver ? 0.3 : 1,
                        fontFamily: "inherit", fontSize: `calc(${cellSize} * 0.45)`, fontWeight: 700,
                        color: t.textPrimary, transition: "all 0.1s",
                      }}
                      onMouseEnter={e => { if (!isDone && !gameOver) e.currentTarget.style.background = t.padHover; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isDone ? t.surfaceAlt : t.padBg; }}>
                      {n}
                      <span style={{ fontSize: 9, fontWeight: 500, color: t.textSecondary, lineHeight: 1 }}>{remaining > 0 ? remaining : "✓"}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Game Over Overlay */}
          {gameOver && (
            <div style={{
              padding: "20px", background: t.surface, borderRadius: 16, textAlign: "center",
              border: `1.5px solid ${t.gridLine}`, width: "100%", maxWidth: `calc(${cellSize} * 9 + 6px)`,
              animation: "fadeIn 0.3s ease-out", marginTop: 4,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: gameOver === "won" ? t.success : t.error }}>
                {gameOver === "won" ? "Puzzle Complete!" : "Game Over"}
              </div>
              <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 14 }}>
                {gameOver === "won" ? `Solved in ${fmt(timer)}` : "Too many mistakes"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setScreen("menu")} style={{
                  flex: 1, padding: "12px", background: t.controlBg, border: "none", borderRadius: 10,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: t.textPrimary,
                }}>Menu</button>
                <button onClick={() => startGame(difficulty)} style={{
                  flex: 1, padding: "12px", background: t.accent, border: "none", borderRadius: 10,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#FFF",
                }}>New Game</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
