const LS_KEY = 'dinner.v1.state';
const SETTINGS_KEY = 'dinner.v1.settings';

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || { version: 1, weeks: {}, mealNotes: {}, history: {} };
  } catch {
    return { version: 1, weeks: {}, mealNotes: {}, history: {} };
  }
}

export function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function resetWeek(weekId) {
  const s = loadState();
  delete s.weeks[weekId];
  saveState(s);
}

export function loadSettings() {
  const def = { readyAt: '17:00' };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); }
  catch { return def; }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function exportStateJSON() {
  const state = loadState();
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return { filename: `dinner-state-${yyyy}-${mm}-${dd}.json`, text: JSON.stringify(state, null, 2) };
}

export function importStateMerge(text) {
  const incoming = JSON.parse(text);
  if (!incoming || typeof incoming !== 'object') throw new Error('Invalid JSON');
  if (incoming.version !== 1) throw new Error('Unsupported version');
  const cur = loadState();
  // Merge weeks
  cur.weeks = Object.assign({}, cur.weeks, incoming.weeks || {});
  // Merge mealNotes
  for (const [dishId, arr] of Object.entries(incoming.mealNotes || {})) {
    cur.mealNotes[dishId] ||= [];
    cur.mealNotes[dishId].push(...arr);
  }
  // Merge history
  for (const [dishId, dates] of Object.entries(incoming.history || {})) {
    cur.history[dishId] ||= [];
    for (const d of dates) if (!cur.history[dishId].includes(d)) cur.history[dishId].push(d);
  }
  saveState(cur);
}

