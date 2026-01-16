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
    const total = prep + cook;
    const isNoCook = ['no-cook'].includes(method);

    if (name.toLowerCase().includes('roll') || r.dish_id === 'rolls') {
      // Rhodes rolls special rule
      const setOut = new Date(T.getTime() - 3 * 60 * 60 * 1000);
      tasks.push({ time: setOut, text: `Set out Rhodes rolls to rise (3h)` });
      const bake = new Date(T.getTime() - 15 * 60 * 1000);
      tasks.push({ time: bake, text: `Bake Rolls (10m)` });
      continue;
    }

    if (isNoCook) {
      const start = new Date(T.getTime() - 60 * 60 * 1000);
      tasks.push({ time: start, text: `Prepare ${name} (no-cook; flexible)` });
      continue;
    }

    // Hot items aim to finish at T
    const start = new Date(T.getTime() - total * 60 * 1000);
    const hot = /(bake|roast|grill|stovetop|smoker|skillet|boil)/i.test(r.method || '');
    if (hot) tasks.push({ time: start, text: `Start ${name} (${total}m)` });
    else tasks.push({ time: start, text: `Begin ${name} (${total}m)` });
  }

  // Sort tasks by time
  tasks.sort((a, b) => a.time - b.time);
  const lines = tasks.map(t => `${formatTime(t.time)} — ${t.text}`);
  lines.push(`${formatTime(T)} — Serve`);
  return lines;
}

