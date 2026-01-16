// Date/time helpers without external libraries. All operations use local time.

export function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function toISODate(d) { const y = d.getFullYear(); const m = (d.getMonth()+1).toString().padStart(2,'0'); const day = d.getDate().toString().padStart(2,'0'); return `${y}-${m}-${day}`; }
export function fromISODate(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }

// Monday start-of-week
export function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun .. 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day; // move back to Monday
  return addDays(x, diffToMonday);
}

export function weekRange(monday) { return { monday: startOfWeek(monday), sunday: addDays(startOfWeek(monday), 6) }; }

export function formatWeekRange(monday) {
  const { sunday } = weekRange(monday);
  return `${formatMonthDay(monday)} — ${formatMonthDay(sunday)}`;
}

function formatMonthDay(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ISO week number with week-year (YYYY-Www)
export function getWeekId(d) {
  const { week, year } = isoWeekAndYear(d);
  return `${year}-W${String(week).padStart(2,'0')}`;
}

export function isoWeekAndYear(date) {
  // Copy date so don't modify original
  const d = new Date(date.getTime());
  // Thursday in current week decides the year
  d.setHours(0,0,0,0);
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const day = (d.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  d.setDate(d.getDate() + 3 - day);
  const weekYear = d.getFullYear();
  // January 4th is always in week 1.
  const jan4 = new Date(weekYear, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);
  const diffMs = startOfDay(date) - week1Monday;
  const week = 1 + Math.floor(diffMs / (7 * 24 * 3600 * 1000));
  return { week, year: weekYear };
}

export function parseHHMM(hhmm) {
  const [h,m] = (hhmm || '17:00').split(':').map(n=>parseInt(n,10));
  return { hours: isNaN(h)?17:h, minutes: isNaN(m)?0:m };
}

export function combineDateAndTime(date, hhmm) {
  const { hours, minutes } = parseHHMM(hhmm);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

