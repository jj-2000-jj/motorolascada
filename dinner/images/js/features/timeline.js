import { parseHHMM, combineDateAndTime, formatTime } from '../utils/date.js';

export function buildTimeline(recipes, readyAtHHMM) {
  const now = new Date();
  const T = combineDateAndTime(now, readyAtHHMM || '17:00');
  const tasks = [];

  for (const r of recipes) {
    const name = r.dish_name || 'Item';
    const method = (r.method || '').toLowerCase();
    const prep = parseInt(r.prep_minutes || '0', 10) || 0;
    const cook = parseInt(r.cook_minutes || '0', 10) || 0;
    const inactiveBefore = parseInt(r.inactive_before_minutes || '0', 10) || 0;
    const inactiveAfter = parseInt(r.inactive_after_minutes || '0', 10) || 0;
    const activeTotal = prep + cook;
    const total = inactiveBefore + activeTotal + inactiveAfter;
    const isNoCook = ['no-cook'].includes(method);

    if (name.toLowerCase().includes('roll') || r.dish_id === 'rolls') {
      // Rhodes rolls special rule (uses CSV if present, falls back to 3h/10m)
      const riseMin = (parseInt(r.inactive_before_minutes || '0', 10) || 0) || 180;
      const setOut = new Date(T.getTime() - riseMin * 60 * 1000);
      tasks.push({ time: setOut, text: `Set out ${name} to rise (${formatDuration(riseMin)})` });
      const bakeMin = (parseInt(r.cook_minutes || '0', 10) || 0) || 10;
      const bake = new Date(T.getTime() - bakeMin * 60 * 1000);
      tasks.push({ time: bake, text: `Bake Rolls (${bakeMin}m)` });
      continue;
    }

    if (isNoCook) {
      const start = new Date(T.getTime() - 60 * 60 * 1000);
      tasks.push({ time: start, text: `Prepare ${name} (no-cook; flexible)` });
      continue;
    }

    // If there is an inactive-before step (rise/marinate), schedule it explicitly
    if (inactiveBefore > 0) {
      const startInactive = new Date(T.getTime() - (inactiveBefore + activeTotal + inactiveAfter) * 60 * 1000);
      tasks.push({ time: startInactive, text: `Start inactive prep for ${name} (${formatDuration(inactiveBefore)})` });
    }

    // Hot items aim to finish at T; account for post-cook rest inside the window
    const start = new Date(T.getTime() - (activeTotal + inactiveAfter) * 60 * 1000);
    const hot = /(bake|roast|grill|stovetop|smoker|skillet|boil)/i.test(r.method || '');
    const suffix = inactiveAfter > 0 ? `${activeTotal}m + ${formatDuration(inactiveAfter)} rest` : `${activeTotal}m`;
    if (hot) tasks.push({ time: start, text: `Start ${name} (${suffix})` });
    else tasks.push({ time: start, text: `Begin ${name} (${suffix})` });
  }

  // Sort tasks by time
  tasks.sort((a, b) => a.time - b.time);
  const lines = tasks.map(t => `${formatTime(t.time)} — ${t.text}`);
  lines.push(`${formatTime(T)} — Serve`);
  return lines;
}

function formatDuration(mins) {
  const m = Math.max(0, mins|0);
  if (m % 60 === 0) return `${m/60}h`;
  if (m > 60) { const h = Math.floor(m/60); const r = m % 60; return `${h}h ${r}m`; }
  return `${m}m`;
}

