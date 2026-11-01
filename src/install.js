// ─── INSTALL ───
// Chrome, Edge and Samsung Internet fire `beforeinstallprompt` when the app can be installed;
// keeping the event lets Settings show a real Install button. Safari never fires it, so iPhone
// users get the steps instead.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener("appinstalled", () => { deferred = null; notify(); });

export const subscribeInstall = (f) => { listeners.add(f); return () => listeners.delete(f); };
export const canPrompt = () => !!deferred;
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; notify();
  return outcome === "accepted";
}

export const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const platform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
};
