import { addDays, toISODate, getWeekId, fromISODate, combineDateAndTime, formatTime } from '../utils/date.js';
import { getImageUrlForDishId } from '../utils/images.js';

export function renderCalendar({ root, monday, state, data, settings, onChange }) {
  root.innerHTML = '';
  const widDays = getWeekDays(monday);
  const wid = getWeekId(monday);
  const weekObj = state.weeks[wid] || { days: {} };

  const today = new Date();
  const todayIso = toISODate(today);

  for (let i = 0; i < 7; i++) {
    const date = toISODate(widDays[i]);
    const isWeekday = i < 4;
    // Hide past days only when viewing the current week
    const isCurrentWeek = getWeekId(today) === getWeekId(monday);
    if (isCurrentWeek && date < todayIso) continue;
    const day = weekObj.days[date];
    const el = document.createElement('div');
    el.className = 'day-card';
    el.innerHTML = DayCard({ date, index: i, isWeekday, day, data, settings });
    bindDayCard(el, { date, onChange });
    root.appendChild(el);
  }
}

function getWeekDays(monday) {
  const arr = [];
  for (let i = 0; i < 7; i++) arr.push(addDays(monday, i));
  return arr;
}

// getWeekId is imported from utils/date.js

function DayCard({ date, index, isWeekday, day, data, settings }) {
  const d = fromISODate(date);
  const title = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
  if (!day) {
    return `
      <div class="day-head"><div>${title}</div><div class="chip">Empty</div></div>
      <div class="actions"><button data-act="add" data-date="${date}">Add meal</button></div>
    `;
  }
  const main = data.recipeById[day.main];
  const sideRecs = (day.sides || []).map(id => data.recipeById[id]).filter(Boolean);
  const sideNames = sideRecs.map(r => r?.dish_name || '').filter(Boolean);
  const customSideNames = (day.customSideNames || []).filter(Boolean);
  const img = getImageUrlForDishId(day.main);
  const cat = main?.category || 'Custom';

  const minutes = (v) => parseInt(v || '0', 10) || 0;
  const mainPrep = minutes(main?.prep_minutes);
  const mainCook = minutes(main?.cook_minutes);
  const mainBefore = minutes(main?.inactive_before_minutes);
  const mainAfter = minutes(main?.inactive_after_minutes);
  const mainActiveTotal = mainPrep + mainCook;
  const mainTotal = mainBefore + mainActiveTotal + mainAfter;
  const sidesTotal = sideRecs.reduce((sum, r) => {
    return sum + minutes(r?.prep_minutes) + minutes(r?.cook_minutes) + minutes(r?.inactive_before_minutes) + minutes(r?.inactive_after_minutes);
  }, 0);
  const mealTotal = mainTotal + sidesTotal;
  const fmtTotal = (m) => m >= 60 ? `${Math.floor(m/60)}h ${m%60? (m%60+'m') : ''}`.trim() : `${m}m`;
  const timeBadge = `<span class="badge-time" title="Total time (prep + cook + inactive)">${fmtTotal(mealTotal)}</span>`;

  // Noon-start warning for main if inactive_before pushes start before 12:00
  let noonWarn = '';
  if (mainBefore > 0) {
    const T = combineDateAndTime(d, (settings?.readyAt) || '17:00');
    const startInactive = new Date(T.getTime() - (mainBefore + mainActiveTotal + mainAfter) * 60 * 1000);
    if (startInactive.getHours() < 12) {
      noonWarn = `<div class="muted" style="font-size:12px;">⚠️ Start inactive by ${formatTime(startInactive)}</div>`;
    }
  }
  return `
    <div class="day-head"><div>${title}</div><div class="chip">${cat}</div></div>
    ${img ? `<img src="${img}" alt="" data-act="details" data-date="${date}" style="width:100%; height:140px; object-fit:cover; border-radius: 12px; border:1px solid var(--border); cursor:pointer;"/>` : ''}
    <div class="meal-line"><strong>${main?.dish_name || '(Custom meal)'}</strong>${[...sideNames, ...customSideNames].length ? ' — ' + [...sideNames, ...customSideNames].join(' · ') : ''} ${timeBadge}</div>
    ${noonWarn}
    <div class="actions">
      <button data-act="details" data-date="${date}">Details</button>
      <button data-act="change" data-date="${date}">Change</button>
      <button data-act="made" data-date="${date}">${day.status === 'made' ? '✓ Made' : 'Mark Made'}</button>
    </div>
    ${StarRating({ date, rating: day.rating })}
    <div class="actions"><button data-act="notes" data-date="${date}">Notes</button></div>
  `;
}

function bindDayCard(el, { date, onChange }) {
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'add') return onChange({ type: 'addMeal', date });
    if (act === 'change') return onChange({ type: 'openChange', date });
    if (act === 'details') return onChange({ type: 'openDetails', date });
    if (act === 'made') return onChange({ type: 'markMade', date });
    if (act === 'notes') return onChange({ type: 'addNotes', date });
  });
  el.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-act="rate"]'); if (!sel) return;
    onChange({ type: 'rate', date, value: sel.value });
  });
  el.addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]'); if (!star) return;
    const value = star.getAttribute('data-star');
    onChange({ type: 'rate', date, value });
  });
}

function StarRating({ date, rating }) {
  const r = Number(rating) || 0;
  const stars = [1,2,3,4,5].map(n => `<button aria-label="Rate ${n}" class="star ${n<=r?'on':''}" data-star="${n}">★</button>`).join('');
  return `<div class="stars" role="group" aria-label="Rating">${stars}<span class="visually-hidden" data-act="rate" data-date="${date}">${r||''}</span></div>`;
}

