import { startOfWeek, addDays, toISODate, fromISODate, formatWeekRange, getWeekId, parseHHMM, formatTime, combineDateAndTime } from './utils/date.js';
import { $, $$, copyText, downloadTxt, createEl } from './utils/dom.js';
import { loadState, saveState, loadSettings, saveSettings, exportStateJSON, importStateMerge, resetWeek } from './storage/state.js';
import { loadCSVs } from './data/loader.js';
import { pickSuggestionsForWeek, suggestForDate } from './suggest/engine.js';
import { renderCalendar } from './ui/calendar.js';
import { openDetailsModal } from './features/details.js';
import { buildShoppingListText } from './features/shopping.js';
import { getImageUrlForDishId } from './utils/images.js';
import { runAllTests } from './tests.js';

let appData = { recipes: [], meals: [], recipeById: {} };
let appState = loadState();
let settings = loadSettings();
let currentMonday = startOfWeek(new Date());

async function boot() {
  try {
    appData = await loadCSVs();
    initUI();
  } catch (err) {
    const b = document.getElementById('banner');
    if (b) { b.textContent = 'Failed to load data files. Using last saved state if available.'; b.hidden = false; b.style.display = 'block'; setTimeout(()=>{ b.hidden = true; }, 4000); }
    console.error(err);
  }
}

function initUI() {
  const weekLabel = $('#weekLabel');
  const calendar = $('#calendar');
  const readyAtInput = $('#readyAt');

  readyAtInput.value = settings.readyAt || '17:00';
  readyAtInput.addEventListener('change', () => { settings.readyAt = readyAtInput.value; saveSettings(settings); rerender(); });

  const prevBtn = $('#prevWeek'); if (prevBtn) prevBtn.onclick = () => setWeek(addDays(currentMonday, -7));
  const nextBtn = $('#nextWeek'); if (nextBtn) nextBtn.onclick = () => setWeek(addDays(currentMonday, +7));

  const reloadBtn = $('#reloadData'); if (reloadBtn) reloadBtn.onclick = async () => {
    try { appData = await loadCSVs(true); setWeek(currentMonday); } catch (e) { alert('Reload failed'); }
  };
  const exportBtn = $('#exportState'); if (exportBtn) exportBtn.onclick = () => {
    const { filename, text } = exportStateJSON();
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };
  const importInput = $('#importState'); if (importInput) importInput.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then(txt => { try { importStateMerge(txt); setWeek(currentMonday); } catch { alert('Invalid state file'); } });
  };
  const shopBtn = $('#shoppingList'); if (shopBtn) shopBtn.onclick = () => openShoppingList();
  const resetBtn = $('#resetWeek'); if (resetBtn) resetBtn.onclick = () => { if (confirm('Clear this week\'s plan?')) { const wid = getWeekId(currentMonday); resetWeek(wid); setWeek(currentMonday); } };
  const testBtn = $('#runTests'); if (testBtn) testBtn.onclick = () => runAllTests({ appData, appState, settings, now: new Date() });

  function rerender() { setWeek(currentMonday, /*skipEnsure*/ true); }

  function ensureWeek(monday) {
    const wid = getWeekId(monday);
    appState.weeks[wid] ||= { generatedOn: toISODate(new Date()), days: {} };
    // Suggest Mon-Thu if any missing
    let needs = false;
    for (let i = 0; i < 4; i++) {
      const date = toISODate(addDays(monday, i));
      if (!appState.weeks[wid].days[date]) { needs = true; break; }
    }
    if (needs) {
      const plan = pickSuggestionsForWeek(appData, appState, monday);
      Object.assign(appState.weeks[wid].days, plan);
      saveState(appState);
    }
    return wid;
  }

  function setWeek(monday, skipEnsure = false) {
    currentMonday = monday;
    const wid = skipEnsure ? getWeekId(monday) : ensureWeek(monday);
    const rangeLabel = formatWeekRange(monday);
    weekLabel.textContent = rangeLabel;
    renderCalendar({
      root: calendar,
      monday,
      state: appState,
      data: appData,
      settings,
      onChange: handleDayAction
    });
  }

  function handleDayAction(action) {
    const wid = getWeekId(currentMonday);
    if (action.type === 'markMade') {
      const day = appState.weeks[wid].days[action.date];
      if (!day) return;
      day.status = 'made';
      appState.history[day.main] ||= [];
      if (!appState.history[day.main].includes(action.date)) appState.history[day.main].push(action.date);
      saveState(appState);
      setWeek(currentMonday, true);
    } else if (action.type === 'rate') {
      const d = appState.weeks[wid].days[action.date] ||= {};
      d.rating = action.value ? parseInt(action.value) : null;
      saveState(appState);
    } else if (action.type === 'openDetails') {
      openDetailsModal({ date: action.date, monday: currentMonday, data: appData, state: appState, settings, onSave: () => { saveState(appState); setWeek(currentMonday, true); } });
    } else if (action.type === 'openChange') {
      openChangeDialog(action.date);
    } else if (action.type === 'addMeal') {
      openChangeDialog(action.date);
    } else if (action.type === 'addNotes') {
      openNotesDialog(action.date);
    }
  }

  function openChangeDialog(dateStr) {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="modal">
        <header><h3>Change Meal</h3><button data-x>✕</button></header>
        <div class="actions">
          <button data-suggest>Suggest new</button>
          <button data-write>Write your own</button>
          <button data-delete class="danger">Delete</button>
        </div>
        <div class="picker-grid" id="pickerGrid"></div>
      </div>`;
    showModal(container);
    container.querySelector('[data-x]').onclick = closeModal;
    container.querySelector('[data-suggest]').onclick = () => {
      const wid = getWeekId(currentMonday);
      const suggestion = suggestForDate(appData, appState, fromISODate(dateStr), { exclude: [appState.weeks[wid].days[dateStr]?.main].filter(Boolean) });
      appState.weeks[wid].days[dateStr] = suggestion;
      saveState(appState); closeModal(); setWeek(currentMonday, true);
    };
    container.querySelector('[data-write]').onclick = () => openWriteOwnDialog(dateStr);
    container.querySelector('[data-delete]').onclick = () => {
      const wid = getWeekId(currentMonday);
      delete appState.weeks[wid].days[dateStr]; saveState(appState); closeModal(); setWeek(currentMonday, true);
    };

    // Build image picker grid of all mains
    const grid = container.querySelector('#pickerGrid');
    const tiles = appData.recipes
      .filter(r => (r.course||'').toLowerCase()==='main')
      .slice(0, 200)
      .map(r => {
        const img = getImageUrlForDishId(r.dish_id);
        const name = r.dish_name;
        return `
          <button class="tile" data-pick="${r.dish_id}" title="${name}">
            <img src="${img}" alt="${name}"/>
            <span class="overlay">${name}</span>
          </button>`;
      }).join('');
    grid.innerHTML = tiles || '<div class="muted">No recipes</div>';
    grid.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-pick]'); if (!btn) return;
      const mainId = btn.getAttribute('data-pick');
      const recipe = appData.recipeById[mainId];
      const combo = findDefaultSidesForMain(mainId);
      const wid = getWeekId(currentMonday);
      appState.weeks[wid].days[dateStr] = { status:'planned', main: mainId, sides: combo, rating:null };
      saveState(appState); closeModal(); setWeek(currentMonday, true);
    });
  }

  function openWriteOwnDialog(dateStr) {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="modal">
        <header><h3>Write your own</h3><button data-x>✕</button></header>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <label>Title <input type="text" id="ownTitle" placeholder="e.g., Steak + Salad"/></label>
          <label>Sides (comma-separated) <input type="text" id="ownSides" placeholder="e.g., Rolls, Green salad"/></label>
          <label>Notes <textarea id="ownNotes" rows="3"></textarea></label>
          <div class="actions"><button id="ownSave">Save</button></div>
        </div>
      </div>`;
    showModal(container);
    container.querySelector('[data-x]').onclick = closeModal;
    container.querySelector('#ownSave').onclick = () => {
      const title = container.querySelector('#ownTitle').value.trim();
      const sidesRaw = container.querySelector('#ownSides').value.trim();
      const sides = sidesRaw ? sidesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!title) { alert('Please enter a title'); return; }
      const dishId = `custom-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`;
      const wid = getWeekId(currentMonday);
      appState.weeks[wid].days[dateStr] = { status: 'planned', main: dishId, sides: sides.map((s,i)=>`custom-${i+1}-${s.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`), customSideNames: sides, rating: null, notes: container.querySelector('#ownNotes').value.trim() };
      // store a minimal custom recipe card stub so details page shows something
      if (!appData.recipeById[dishId]) {
        appData.recipeById[dishId] = { dish_id: dishId, dish_name: title, course: 'Main', category: 'Custom', servings: '5', prep_minutes: '0', cook_minutes: '0', difficulty: 'Easy', method: 'Assemble', ingredients: '', steps: title };
      }
      saveState(appState); closeModal(); setWeek(currentMonday, true);
    };
  }

  function openNotesDialog(dateStr) {
    const wid = getWeekId(currentMonday);
    const day = appState.weeks[wid].days[dateStr] ||= {};
    const prevNotes = (day.main && appState.mealNotes[day.main]) ? appState.mealNotes[day.main] : [];
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="modal">
        <header><h3>Notes</h3><button data-x>✕</button></header>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <textarea id="noteText" rows="6" placeholder="Notes for this meal..."></textarea>
          <div class="actions"><button id="saveNote">Save note</button></div>
          ${prevNotes?.length ? `<div class="muted">Previous notes:</div><ul>${prevNotes.map(n=>`<li>${n.date}: ${n.text}</li>`).join('')}</ul>` : ''}
        </div>
      </div>`;
    showModal(container);
    container.querySelector('[data-x]').onclick = closeModal;
    container.querySelector('#saveNote').onclick = () => {
      const text = container.querySelector('#noteText').value.trim();
      if (!text) return closeModal();
      appState.mealNotes[day.main] ||= [];
      appState.mealNotes[day.main].push({ date: toISODate(new Date()), text });
      day.notes = text;
      saveState(appState); closeModal(); setWeek(currentMonday, true);
    };
  }

  function openShoppingList() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="modal">
        <header><h3>Shopping List</h3><button data-x>✕</button></header>
        <div class="actions" style="margin-bottom:8px;">
          <button data-scope="week">This week</button>
          <button data-scope="remainder">From today → Sunday</button>
        </div>
        <pre id="shopText" style="white-space:pre-wrap; background:#f9fafb; padding:12px; border-radius:10px; max-height:50vh; overflow:auto;"></pre>
        <div class="actions">
          <button id="copyShop">Copy</button>
          <button id="downloadShop">Download .txt</button>
        </div>
      </div>`;
    showModal(container);
    const pre = container.querySelector('#shopText');
    const make = (scope) => {
      const text = buildShoppingListText({ monday: currentMonday, scope, data: appData, state: appState });
      pre.textContent = text;
    };
    make('week');
    container.querySelector('[data-x]').onclick = closeModal;
    container.querySelector('[data-scope="week"]').onclick = () => make('week');
    container.querySelector('[data-scope="remainder"]').onclick = () => make('remainder');
    container.querySelector('#copyShop').onclick = () => copyText(pre.textContent);
    container.querySelector('#downloadShop').onclick = () => downloadTxt(`shopping-list-${toISODate(new Date())}.txt`, pre.textContent);
  }

  function showModal(contentEl) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = '';
    root.appendChild(contentEl);
    root.classList.add('active');
    document.body.style.overflow = 'hidden';
    root.onclick = (e) => { if (e.target === root) closeModal(); };
  }
  function closeModal() {
    const root = document.getElementById('modalRoot');
    root.classList.remove('active');
    root.innerHTML = '';
    document.body.style.overflow = '';
  }

  function findDefaultSidesForMain(mainId) {
    // Look up first matching row in meals CSV and return its sides
    for (const row of appData.meals) {
      if (row.Main_Recipe_ID === mainId) {
        return [row.Side1_Recipe_ID, row.Side2_Recipe_ID].filter(Boolean);
      }
    }
    return [];
  }

  // Initial render
  setWeek(currentMonday);
}

boot();

