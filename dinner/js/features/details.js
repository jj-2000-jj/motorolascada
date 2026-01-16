import { combineDateAndTime, formatTime, toISODate, parseHHMM, getWeekId } from '../utils/date.js';
import { getImageUrlForDishId } from '../utils/images.js';
import { saveSettings } from '../storage/state.js';
import { copyText } from '../utils/dom.js';
import { buildTimeline } from './timeline.js';

export function openDetailsModal({ date, monday, data, state, settings, onSave }) {
  const wid = getWeekId(monday);
  const day = state.weeks[wid]?.days[date];
  if (!day) return;
  const recMain = data.recipeById[day.main] || { dish_name: '(Custom)', ingredients: '', steps: '' };
  const sideRecs = (day.sides || []).map(id => data.recipeById[id]).filter(Boolean);

  const container = document.createElement('div');
  const hero = getImageUrlForDishId(day.main);
  container.innerHTML = `
    <div class="modal">
      <header><h3>${recMain.dish_name}</h3><button data-x aria-label="Close">✕</button></header>
      ${hero ? `<img src="${hero}" alt="" style="width:100%; max-height:240px; object-fit:cover; border-radius:12px; border:1px solid var(--border);"/>` : ''}
      <div class="tabs">
        <button data-tab="recipe" class="tab-btn" aria-selected="true">Recipe</button>
        <button data-tab="ingredients" class="tab-btn">Ingredients</button>
        <button data-tab="timeline" class="tab-btn">Timeline</button>
        <button data-tab="notes" class="tab-btn">Notes</button>
      </div>
      <section id="tab-recipe" class="tab-panel active"></section>
      <section id="tab-ingredients" class="tab-panel"></section>
      <section id="tab-timeline" class="tab-panel"></section>
      <section id="tab-notes" class="tab-panel"></section>
    </div>`;
  const root = document.getElementById('modalRoot');
  root.innerHTML = ''; root.appendChild(container); root.classList.add('active');
  container.querySelector('[data-x]').onclick = () => closeModal();

  // Render tabs content
  renderRecipe();
  renderIngredients();
  renderTimeline();
  renderNotes();

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
  function switchTab(id) {
    container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    container.querySelector(`#tab-${id}`).classList.add('active');
    container.querySelectorAll('.tab-btn').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'));
  }

  function renderRecipe() {
    const el = container.querySelector('#tab-recipe');
    const listSteps = normalizeLines(recMain.steps);
    const block = `
      <h4>Main</h4>
      <ol>${listSteps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${sideRecs.map(r => `<h4>${r.dish_name}</h4><ol>${normalizeLines(r.steps).map(s=>`<li>${s}</li>`).join('')}</ol>`).join('')}
      <div class="actions" style="margin-top:8px;"><button id="copyInstr">Copy Instructions</button></div>
    `;
    el.innerHTML = block;
    el.querySelector('#copyInstr').onclick = () => {
      const text = `Instructions for ${recMain.dish_name}\n\n` + [recMain, ...sideRecs].map(r => `${r.dish_name}\n${normalizeLines(r.steps).map((s,i)=>`${i+1}. ${s}`).join('\n')}`).join('\n\n');
      copyText(text);
    };
  }

  function renderIngredients() {
    const el = container.querySelector('#tab-ingredients');
    const block = `
      <h4>Main</h4>
      <ul>${normalizeLines(recMain.ingredients).map(s => `<li>${s}</li>`).join('')}</ul>
      ${sideRecs.map(r => `<h4>${r.dish_name}</h4><ul>${normalizeLines(r.ingredients).map(s=>`<li>${s}</li>`).join('')}</ul>`).join('')}
      <div class="actions" style="margin-top:8px;"><button id="copyIngr">Copy Ingredients</button></div>
    `;
    el.innerHTML = block;
    el.querySelector('#copyIngr').onclick = () => {
      const text = `Ingredients for ${recMain.dish_name}\n\n` + [recMain, ...sideRecs].map(r => `${r.dish_name}\n${normalizeLines(r.ingredients).map(s=>`- ${s}`).join('\n')}`).join('\n\n');
      copyText(text);
    };
  }

  function renderTimeline() {
    const el = container.querySelector('#tab-timeline');
    const readyAtCtrl = `<label>Ready at <input id="readyAtDetail" type="time" value="${settings.readyAt || '17:00'}"></label>`;
    const steps = buildTimeline([recMain, ...sideRecs], settings.readyAt || '17:00');
    el.innerHTML = `${readyAtCtrl}<div style="height:8px"></div><ul>${steps.map(s=>`<li>${s}</li>`).join('')}</ul><div class="actions" style="margin-top:8px;"><button id="copyTL">Copy Timeline</button></div>`;
    el.querySelector('#readyAtDetail').onchange = (e) => {
      const v = e.target.value || '17:00';
      const u = buildTimeline([recMain, ...sideRecs], v);
      settings.readyAt = v; saveSettings(settings); onSave?.();
      el.querySelector('ul').innerHTML = u.map(s=>`<li>${s}</li>`).join('');
    };
    el.querySelector('#copyTL').onclick = () => copyText(steps.join('\n'));
  }

  function renderNotes() {
    const el = container.querySelector('#tab-notes');
    const prev = (day.main && state.mealNotes[day.main]) ? state.mealNotes[day.main] : [];
    el.innerHTML = `
      <textarea id="noteText" rows="6" placeholder="Notes for this meal..."></textarea>
      <div class="actions"><button id="saveNote">Save note</button></div>
      ${prev?.length ? `<div class="muted">Previous notes:</div><ul>${prev.map(n=>`<li>${n.date}: ${n.text}</li>`).join('')}</ul>` : ''}
    `;
    el.querySelector('#saveNote').onclick = () => {
      const text = el.querySelector('#noteText').value.trim(); if (!text) return;
      state.mealNotes[day.main] ||= []; state.mealNotes[day.main].push({ date: toISODate(new Date()), text });
      day.notes = text; onSave?.();
      alert('Saved');
    };
  }
}

function normalizeLines(s) {
  return String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

function closeModal() {
  const root = document.getElementById('modalRoot');
  root.classList.remove('active');
  root.innerHTML = '';
}

// getWeekId imported from utils/date.js

