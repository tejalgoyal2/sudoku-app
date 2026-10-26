export const fmt = (s) => {
  if (s === null || s === undefined) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export const fmtDate = (key, opts = { month: "short", day: "numeric" }) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, opts);

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : "Good evening";
};
