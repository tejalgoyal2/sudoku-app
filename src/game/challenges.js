// ─── CHALLENGES ───
// Each challenge is a normal puzzle with one rule twisted. The reducer enforces `rules`,
// so the UI only has to show them. Stars: 1 for finishing, 2 under par, 3 under the
// gold time with no mistakes.

export const CHALLENGES = {
  blitz: {
    name: "Blitz", short: "1-minute clock, +4s right, −5s wrong", difficulty: "easy", icon: "bolt",
    blurb: "One minute on the clock. Every correct digit adds 4 seconds, every wrong one takes 5.",
    rules: { countdown: 60, bonus: 4, penalty: 5 }, par: [180, 140],
  },
  sudden: {
    name: "Sudden Death", short: "One mistake ends it", difficulty: "medium", icon: "skull",
    blurb: "One wrong digit and it's over. Breathe.",
    rules: { mistakeLimit: 1 }, par: [600, 420],
  },
  pen: {
    name: "Pen Only", short: "No notes, no hints", difficulty: "medium", icon: "pen",
    blurb: "No pencil marks, no hints. Keep it all in your head.",
    rules: { noNotes: true, noHints: true }, par: [720, 480],
  },
  fog: {
    name: "Fog", short: "You only see around your cursor", difficulty: "easy", icon: "fog",
    blurb: "You can only see the row, column and box around your cursor.",
    rules: { fog: true }, par: [480, 330],
  },
  purist: {
    name: "Purist", short: "Expert grid, no help, three strikes", difficulty: "expert", icon: "gem",
    blurb: "Expert grid. No hints, no auto-notes, three strikes.",
    rules: { noHints: true, noAutoNotes: true, mistakeLimit: 3 }, par: [1800, 1200],
  },
};
export const CHALLENGE_KEYS = Object.keys(CHALLENGES);

export function starsFor(game) {
  const c = CHALLENGES[game.challenge];
  if (!c || game.status !== "won") return 0;
  return 1 + (game.elapsed <= c.par[0] ? 1 : 0) + (game.elapsed <= c.par[1] && game.mistakes === 0 ? 1 : 0);
}

// Seconds left on a countdown challenge, or null when there's no clock.
export const timeLeft = (game) => (game?.rules?.countdown ? game.rules.countdown + (game.bonusTime || 0) - game.elapsed : null);
