// Small shared helpers for TAGTOWN.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
// shortest-angle lerp for yaw
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, ms);
}
// Persistent settings (difficulty, quality, paint color)
const KEY = 'tagtown.settings.v1';
export const settings = Object.assign(
  { difficulty: 'easy', quality: 'high', color: '#e63946' },
  JSON.parse(localStorage.getItem(KEY) || '{}')
);
export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {}
}
