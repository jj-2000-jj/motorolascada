import { addDays, toISODate, startOfWeek } from '../utils/date.js';

export function pickSuggestionsForWeek(appData, state, monday) {
  const plan = {};
  let lastCat = null;
  // Only suggest for remaining days of week (today or future), but not past days
  const todayIso = toISODate(new Date());
  for (let i = 0; i < 4; i++) { // Mon..Thu only
    const date = toISODate(addDays(monday, i));
    if (date < todayIso) continue;
    const s = suggestForDate(appData, state, addDays(monday, i), { avoidCategory: lastCat });
    if (s) {
      plan[date] = Object.assign({ status: 'planned' }, s);
      lastCat = appData.recipeById[s.main]?.category || null;
    }
  }
  return plan;
}

export function suggestForDate(appData, state, dateObj, opts = {}) {
  const { meals, recipeById } = appData;
  const avoidCategory = opts.avoidCategory || null;
  const exclude = new Set(opts.exclude || []);
  let best = null; let bestScore = -Infinity;

  for (const row of meals) {
    const mainId = row.Main_Recipe_ID; if (!mainId) continue;
    if (exclude.has(mainId)) continue;
    const cat = row.Category || 'Misc';
    if (avoidCategory && cat === avoidCategory) continue;
    if (madeWithinDays(state, mainId, 14)) continue;

    const rec = recipeById[mainId] || {};
    const prep = parseInt(rec.prep_minutes || '0', 10) || 0;
    const cook = parseInt(rec.cook_minutes || '0', 10) || 0;
    const inactiveBefore = parseInt(rec.inactive_before_minutes || '0', 10) || 0;
    const inactiveAfter = parseInt(rec.inactive_after_minutes || '0', 10) || 0;
    const total = prep + cook + inactiveBefore + inactiveAfter;
    const difficulty = (rec.difficulty || '').toLowerCase();
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4; // Mon-Thu
    let score = daysSinceLast(state, mainId) / 7;
    score += ratingAvg(state, mainId) * 1.5;
    if (isWeekday && total > 45) score -= 2;
    if (difficulty === 'medium') score -= 1;
    score += Math.random() * 0.1; // jitter

    if (score > bestScore) {
      bestScore = score;
      best = {
        main: mainId,
        sides: [row.Side1_Recipe_ID, row.Side2_Recipe_ID].filter(Boolean)
      };
    }
  }
  return best;
}

function daysSinceLast(state, dishId) {
  const arr = state.history[dishId] || [];
  if (!arr.length) return 999;
  const last = arr[arr.length - 1];
  const lastDate = new Date(last);
  const now = new Date();
  const diff = now - lastDate;
  return Math.max(1, Math.floor(diff / (24 * 3600 * 1000)));
}

function madeWithinDays(state, dishId, days) {
  const arr = state.history[dishId] || [];
  if (!arr.length) return false;
  const last = arr[arr.length - 1];
  const lastDate = new Date(last);
  const diff = new Date() - lastDate;
  return diff < days * 24 * 3600 * 1000;
}

function ratingAvg(state, dishId) {
  let total = 0, count = 0;
  for (const week of Object.values(state.weeks || {})) {
    for (const [date, day] of Object.entries(week.days || {})) {
      if (day.main === dishId && day.rating) { total += day.rating; count++; }
    }
  }
  return count ? total / count : 0;
}

