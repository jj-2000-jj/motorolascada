import { parseCSV } from './utils/csv.js';
import { getWeekId, startOfWeek, addDays, toISODate } from './utils/date.js';
import { loadState, saveState, loadSettings, saveSettings, exportStateJSON, importStateMerge } from './storage/state.js';
import { suggestForDate } from './suggest/engine.js';
import { buildTimeline } from './features/timeline.js';
import { buildShoppingListText } from './features/shopping.js';

export function runAllTests(ctx) {
  const oks = [];
  const fails = [];
  const logOk = (m) => oks.push('OK: ' + m);
  const logFail = (m) => fails.push('FAIL: ' + m);

  // Backup LS to restore after tests
  const LS_BACKUP = localStorage.getItem('dinner.v1.state');
  const SET_BACKUP = localStorage.getItem('dinner.v1.settings');
  try {
    // 1) Data load sanity
    try {
      if (!Array.isArray(ctx.appData.recipes) || ctx.appData.recipes.length < 10) throw new Error('recipes length');
      if (!Array.isArray(ctx.appData.meals) || ctx.appData.meals.length < 10) throw new Error('meals length');
      const sample = ctx.appData.recipes[0];
      ['dish_id','dish_name','course'].forEach(k => { if (!(k in sample)) throw new Error('missing ' + k); });
      if (!ctx.appData.recipeById['salmon-in-oven']) throw new Error('missing recipe salmon-in-oven');
      logOk('Data files parsed and indexed');
    } catch (e) { logFail('Data load: ' + e.message); }

    // 2) Week ID format
    try {
      const wid = getWeekId(new Date());
      if (!/^\d{4}-W\d{2}$/.test(wid)) throw new Error('format ' + wid);
      logOk('Week ID format');
    } catch (e) { logFail('Week ID: ' + e.message); }

    // 3) Suggestion engine avoids same category when requested
    try {
      const s1 = suggestForDate(ctx.appData, ctx.appState, new Date(), {});
      if (!s1) throw new Error('no suggestion');
      const cat1 = ctx.appData.recipeById[s1.main]?.category;
      const s2 = suggestForDate(ctx.appData, ctx.appState, new Date(), { avoidCategory: cat1 });
      if (!s2) throw new Error('no second suggestion');
      const cat2 = ctx.appData.recipeById[s2.main]?.category;
      if (cat1 === cat2) throw new Error('category not avoided');
      logOk('Suggestion avoidCategory honored');
    } catch (e) { logFail('Suggestion: ' + e.message); }

    // 4) Timeline builder special rules
    try {
      const recMain = ctx.appData.recipeById['salmon-in-oven'];
      const recSide1 = ctx.appData.recipeById['asparagus'];
      const recRolls = ctx.appData.recipeById['rolls'];
      const lines = buildTimeline([recMain, recSide1, recRolls], '17:00');
      const hasRollsSet = lines.some(l => /Set out .*rolls/i.test(l));
      const hasBakeRolls = lines.some(l => /Bake Rolls/i.test(l));
      const hasServe = lines.some(l => /Serve/.test(l));
      if (!hasRollsSet || !hasBakeRolls || !hasServe) throw new Error('special rules missing');
      logOk('Timeline special rules (Rolls, Serve)');
    } catch (e) { logFail('Timeline: ' + e.message); }

    // 5) Shopping list generation for a fake planned day
    try {
      const monday = startOfWeek(new Date());
      const wid = getWeekId(monday);
      const state = { version:1, weeks:{}, mealNotes:{}, history:{} };
      state.weeks[wid] = { generatedOn: toISODate(new Date()), days:{} };
      const date = toISODate(monday);
      state.weeks[wid].days[date] = { status:'planned', main:'spaghetti', sides:['salad'] };
      const txt = buildShoppingListText({ monday, scope:'week', data: ctx.appData, state });
      if (!/spaghetti/i.test(txt) && !/marinara/i.test(txt)) throw new Error('expected ingredients not present');
      logOk('Shopping list built for planned day');
    } catch (e) { logFail('Shopping list: ' + e.message); }

    // 6) Persistence: save rating and settings, export/import
    try {
      const monday = startOfWeek(new Date());
      const wid = getWeekId(monday);
      const state = { version:1, weeks:{}, mealNotes:{}, history:{} };
      state.weeks[wid] = { generatedOn: toISODate(new Date()), days:{} };
      const date = toISODate(monday);
      state.weeks[wid].days[date] = { status:'planned', main:'spaghetti', sides:['salad'], rating:4 };
      saveState(state);
      const loaded = loadState();
      if (loaded.weeks[wid].days[date].rating !== 4) throw new Error('rating not persisted');
      const s = loadSettings();
      const oldReady = s.readyAt;
      s.readyAt = '18:30'; saveSettings(s);
      if (loadSettings().readyAt !== '18:30') throw new Error('settings not persisted');
      // export/import merge
      const { text } = exportStateJSON();
      const other = { version:1, weeks:{}, mealNotes:{}, history:{} };
      const otherWid = wid; const otherDate = toISODate(addDays(monday, 1));
      other.weeks[otherWid] = { generatedOn: toISODate(new Date()), days: {} };
      other.weeks[otherWid].days[otherDate] = { status:'planned', main:'lasagna', sides:['french-bread'] };
      importStateMerge(JSON.stringify(other));
      const merged = loadState();
      if (!merged.weeks[wid].days[otherDate]) throw new Error('week not merged');
      // restore
      const sr = loadSettings(); sr.readyAt = oldReady; saveSettings(sr);
      logOk('Persistence and export/import');
    } catch (e) { logFail('Persistence: ' + e.message); }

  } finally {
    // Restore localStorage to pre-test state
    if (LS_BACKUP == null) localStorage.removeItem('dinner.v1.state'); else localStorage.setItem('dinner.v1.state', LS_BACKUP);
    if (SET_BACKUP == null) localStorage.removeItem('dinner.v1.settings'); else localStorage.setItem('dinner.v1.settings', SET_BACKUP);
  }

  const summary = `${oks.length} passed, ${fails.length} failed`;
  alert(`Tests: ${summary}\n\n${oks.concat(fails).join('\n')}`);
}

