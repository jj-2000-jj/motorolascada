import { addDays, toISODate, getWeekId } from '../utils/date.js';

export function buildShoppingListText({ monday, scope, data, state }) {
  const wid = getWeekId(monday);
  const week = state.weeks[wid] || { days: {} };
  const startIdx = scope === 'remainder' ? Math.max(0, daysFromMonday(new Date(), monday)) : 0;
  const dates = [];
  for (let i = startIdx; i < 7; i++) dates.push(toISODate(addDays(monday, i)));
  const planned = dates.map(d => [d, week.days[d]]).filter(([,day]) => !!day);
  const lines = [];
  for (const [date, day] of planned) {
    const recMain = data.recipeById[day.main];
    const sideRecs = (day.sides || []).map(id => data.recipeById[id]).filter(Boolean);
    const title = recMain?.dish_name || 'Custom meal';
    lines.push(`== ${date} — ${title} ==`);
    if (recMain?.ingredients) lines.push(...norm(recMain.ingredients).map(s => `- ${s}`));
    for (const s of sideRecs) if (s?.ingredients) lines.push(...norm(s.ingredients).map(x => `- ${x}`));
    lines.push('');
  }
  if (!lines.length) return 'No planned meals in selected range.';
  return lines.join('\n');
}

function daysFromMonday(today, monday) {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  const diff = Math.floor((a - b) / (24 * 3600 * 1000));
  return Math.min(6, Math.max(0, diff));
}

function norm(s) { return String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean); }

// getWeekId imported from utils/date.js

