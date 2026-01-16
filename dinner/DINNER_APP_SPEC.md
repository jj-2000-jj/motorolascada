
# Dinner — A Minimal, Stable, ADHD‑friendly Family Meal Planner (Spec for Developers)

**Purpose:** Build a simple, rock‑solid web app named **Dinner** that runs from a single folder on a basic Hostinger site (`motorolascada.com/dinner`). The app reduces decision friction for an ADHD user by providing clear weekly suggestions, low‑effort replacements, and fast access to recipes, timelines, and shopping lists. **No build tools** or server frameworks required.

---

## 0) Hosting & Deployment Constraints

- **Hosting:** Static Hostinger site. All files live in `/dinner` in the web root. The app must work by uploading that single folder via FTP or file manager.
- **Tech stack:** Pure HTML/CSS/vanilla JS. No Node build step. All third‑party libraries are **vendored locally** (copied into `/dinner/vendor`).
- **Data files:** Two CSV files in `/dinner/data` (editable in any spreadsheet app):
  - `recipes_for_webapp.csv`
  - `meals_enriched.csv`
- **Persistence:** **LocalStorage** (no server). Provide export/import of app state as a JSON file to carry data between devices.
- **Offline:** Optional service worker for caching static files; app keeps working if CSVs were already loaded once.
- **Time zone:** Use browser local time. Defaults can assume America/Denver but should not hard‑code it.

---

## 1) Design System — Scandinavian, Calm, Focused

- **Visual style:** white/light surfaces, lots of whitespace, subtle neumorphic shadows, rounded corners (12–16px), thin neutral borders.
- **Colors (WCAG AA):**
  - Background: `#F7F7F7`
  - Surface: `#FFFFFF`
  - Text: `#1F2937` (near-slate)
  - Accent: `#5BA199` (sage) for primary buttons/links
  - Muted Accent: `#8FBDB7` for hovers/secondary states
  - Danger: `#D9776F` (salmon) for deletes
  - Border: `#E5E7EB`
- **Typography:** System UI stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"`
- **Spacing scale:** 4, 8, 12, 16, 24, 32
- **Tap targets:** min 44×44 px (iPhone friendly)
- **Motion:** Minimal; respect `prefers-reduced-motion`
- **Accessibility:** Keyboard navigable; visible focus rings; color contrast AA; ARIA landmarks; labels for inputs.

---

## 2) Core User Goals (ADHD‑Friendly)

1. **Default weekly plan** with low friction: Monday–Thursday pre‑filled; Fri–Sun empty but visible.
2. **One‑tap alternatives** when a suggestion doesn’t feel right: _Suggest new_, _Write your own_, _Delete_.
3. **Everything in one place:** recipe details, quantities (for 5), copyable instructions & ingredients, and a generated **timeline** to hit a target ready time (default **5:00 PM**, editable).
4. **Memory without effort:** automatically save what was planned, what was cooked, a star rating, and **personal notes** that re‑surface next time that meal appears.
5. **Groceries with one button:** make a weekly **shopping list** (whole week or remainder) and allow **Copy** or **Download**.

---

## 3) Information Architecture

### 3.1 Pages
- **/dinner/index.html**
  - Header: “Dinner” + week picker (arrow previous/next, shows week range).
  - **Weekly Calendar (Mon–Sun)** cards:
    - Mon–Thu **auto‑suggested** on first load of each new week.
    - Fri–Sun shown but empty by default with **“Add meal”** CTA.
    - Each day card shows: Main + Sides chips. Actions: **Change** ▸ (Suggest/Write/Delete), **Details**, **Made?** toggle.
  - Footer: “Shopping List”, “Export Data”, “Import Data”, “Reset Week”.
- **Meal Detail Modal/Route**
  - Shows **Main & Sides** with tabs: _Recipe_, _Ingredients_, _Timeline_.
  - Controls: target **Ready at** time (default 5:00 PM, editable), **Copy Instructions**, **Copy Ingredients**.
  - User fields: **Rating (1–5)**, **Notes** (persist), “Mark as Made”.

### 3.2 Data Sources
- **CSV (editable):**
  - `recipes_for_webapp.csv` columns:
    - `dish_id`, `dish_name`, `course` (`Main|Side`), `category` (for mains; `Side` for sides),
    - `servings` (= 5), `prep_minutes`, `cook_minutes`, `difficulty`, `method`, `ingredients` (newline‑separated), `steps` (numbered, newline‑separated)
  - `meals_enriched.csv` columns:
    - `Category`, `Main`, `Side 1`, `Side 2`, `Main_Recipe_ID`, `Side1_Recipe_ID`, `Side2_Recipe_ID`
- **App State (LocalStorage JSON):**
  - Key: `dinner.v1.state`
  - Shape:
    ```json
    {
      "version": 1,
      "weeks": {
        "2025-W35": {
          "generatedOn": "2025-08-27",
          "days": {
            "2025-09-01": { "status":"planned|made|skipped", "main":"smoked-tri-tip", "sides":["rolls","green-salad"], "rating":4, "notes":"Cut thinner next time" },
            "...": {}
          }
        }
      },
      "mealNotes": {
        "smoked-tri-tip": [ {"date":"2025-08-05","text":"Family loved it"}, {"date":"2025-08-27","text":"Try more pepper"} ]
      },
      "history": { "smoked-tri-tip": ["2025-08-05","2025-08-27"], "cheeseburgers": ["2025-07-15"] }
    }
    ```
  - Additional keys: `dinner.v1.settings` (e.g., target ready time).

---

## 4) Auto‑Suggestion Logic (Mon–Thu)

**Goal:** Variety by **category** and **recency**, prefer **easy** meals on weekdays.

**Inputs:**
- Meals list from `meals_enriched.csv`.
- Recipes metadata (`difficulty`, `prep_minutes + cook_minutes`).
- History in LocalStorage (`history` with dates cooked; plan entries).

**Constraints:**
- **No same category** on consecutive weekdays.
- Avoid same **dish** if cooked in the **last 14 days**.
- Favor `difficulty=Easy` and total time ≤ **45 minutes** for Mon–Thu.
- If Friday–Sunday get filled, allow longer cook meals.

**Scoring heuristic (pick top non‑conflicting):**
```
score(dish) =
  + (days_since_last_made / 7)                 // more time since last = higher
  + (rating_avg * 1.5)                          // liked meals bubble up
  - (conflict_with_neighbor_category ? 5 : 0)   // avoid cluster
  - (time_over_45_min ? 2 : 0)                  // penalize long on weekdays
  - (difficulty == "Medium" ? 1 : 0)
```
Tie‑break with “High taste‑to‑effort” (Easy + <=30min) and random small jitter.

**When user taps “Change” → “Suggest new”:**
- Re‑run suggestion for that specific day with added constraint “exclude current dish IDs.”

**“Write your own”:**
- Free‑form entry; user can pick an existing dish or create a **custom** main/side. Custom entries get ephemeral `dish_id = custom-<slug>` and a blank recipe page that simply lists user text (quantities manual).

**“Delete meal”:**
- Clears the day; day remains unplanned.

---

## 5) Timeline Builder (Target “Ready at” Default 5:00 PM)

**Purpose:** Reduce time anxiety. Show **start times** for each component so everything finishes together (or non‑hot items early).

**Inputs per dish:** `prep_minutes`, `cook_minutes`, `method`, and **special rules**.

**Special rules:**
- **Rolls = Frozen Rhodes rolls → 3 hours** before ready time: plan “Set out to rise” at `T-3:00` (plus 10 min bake near end).
- **No‑cook items** (salads, salsas, cold sides): may be done any time **same day**; default to `T-1:00` with note “can be done earlier”.
- **Long cooks** (slow cooker): show **morning start** to hit target.

**Algorithm (simple & reliable):**
1. For each component, compute `total = prep + cook`. Mark `hot` if `method` ∈ {Bake, Roast, Grill, Stovetop, Smoker} **and** not salad/salsa/no‑cook.
2. **Hot** items: set **finish** = target time `T`. **Start** = `T - total`. If overlapping hot items, stagger by **prioritizing mains**; sides start earlier but aim to finish by `T-5`.
3. **No‑cook** items: default start `T-60` (flag as flexible).
4. **Rolls:** schedule `Set out` at `T-3:00`, `Bake` at `T-0:15`.
5. Render a vertical time list: `HH:MM — Task` (e.g., `4:10 PM — Start roasting broccoli (18m)`).
6. Allow user to nudge target time; recompute instantly.

**Output example (for “Salmon in oven + Rice + Roasted asparagus + Rolls”):**
- 2:00 PM — Set out **Rhodes rolls** to rise (3h)
- 4:02 PM — Start **Rice** (18m + 5m rest)
- 4:05 PM — Preheat oven to 425°F
- 4:12 PM — Start **Asparagus** (12m roast)
- 4:18 PM — Start **Salmon** (14m bake)
- 4:45 PM — Bake **Rolls** (10m)
- 5:00 PM — **Serve**

---

## 6) Shopping List Builder

- Scope selector: **This week** or **From today → Sunday** (remainder).
- Pull all **planned** days only.
- For each meal, concatenate **ingredients** (from CSV), attempt simple aggregation by normalizing identical lines (string‑match), but **don’t fail** if units differ—keep both.
- Output formats:
  - **Grouped by meal** (most accurate, quickest to implement).
  - **Flat list (deduped)** (best‑effort).
- Actions: **Copy**, **Download .txt**.

---

## 7) Data Editing & Refresh

- CSVs are the source of truth:
  - Update `data/recipes_for_webapp.csv` to edit recipes or times.
  - Update `data/meals_enriched.csv` to edit the default meal combos.
- Provide a header action **“Reload Data”** to refetch CSVs without a hard refresh.
- If CSVs fail to load, show a **non‑blocking warning** and fall back to last in‑memory data/state snapshot.

---

## 8) Persistence Model

- **LocalStorage keys:**
  - `dinner.v1.state`: complete app state (see shape above).
  - `dinner.v1.settings`: `{ "readyAt": "17:00", "firstDayOfWeek": "Mon" }`
- **Export/Import:**
  - Export: generate `dinner-state-YYYY-MM-DD.json` for download.
  - Import: validate `version`, merge by week ID; prompt before overwrite.
- **Reset week:** clears only the selected `YYYY-WW` object.

---

## 9) File & Folder Structure

```
/dinner
  ├── index.html
  ├── styles.css
  ├── app.js
  ├── sw.js                         # optional service worker (cache)
  ├── /data
  │     ├── recipes_for_webapp.csv
  │     └── meals_enriched.csv
  └── /vendor
        ├── papaparse.min.js        # CSV parsing
        └── luxon.min.js            # date/time helpers
```
> _All vendor files are local. No CDN dependency._

---

## 10) UI Wireframe (Textual)

- **Header:** “Dinner” ◂ Week ▸  | [Reload Data] [Export] [Import]
- **Subheader:** Week of **Mon Sep 1 – Sun Sep 7**  | Ready at: **5:00 PM** (edit)
- **Calendar grid (7 cards):**
  - **Mon** [Suggested meal X (category chip)] [Details] [Change]
  - **Tue** [Suggested meal Y] [Details] [Change]
  - **Wed** [Suggested meal Z] [Details] [Change]
  - **Thu** [Suggested meal …] [Details] [Change]
  - **Fri** [Add meal]
  - **Sat** [Add meal]
  - **Sun** [Add meal]
- **Day card footer:** [Made? ✓] [Rating ★★★☆☆] [Notes 📝]
- **Details modal tabs:** _Recipe_ | _Ingredients_ | _Timeline_ | _Notes_
  - Buttons: **Copy Instructions**, **Copy Ingredients**

---

## 11) HTML/CSS/JS Scaffolding

### index.html
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dinner</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <header class="app-header">
    <h1>Dinner</h1>
    <div class="controls">
      <button id="prevWeek" aria-label="Previous Week">◂</button>
      <div id="weekLabel" class="week-label"></div>
      <button id="nextWeek" aria-label="Next Week">▸</button>
      <div class="spacer"></div>
      <label>Ready at <input id="readyAt" type="time" value="17:00" /></label>
      <button id="reloadData">Reload Data</button>
      <button id="exportState">Export</button>
      <label class="import-btn">Import <input id="importState" type="file" accept="application/json" hidden></label>
    </div>
  </header>

  <main id="calendar" class="calendar"></main>

  <footer class="app-footer">
    <button id="shoppingList">Shopping List</button>
    <button id="resetWeek" class="danger">Reset Week</button>
  </footer>

  <script src="./vendor/papaparse.min.js"></script>
  <script src="./vendor/luxon.min.js"></script>
  <script src="./app.js"></script>
</body>
</html>
```

### styles.css (theme tokens & components)
```css
:root {
  --bg: #F7F7F7;
  --surface: #FFFFFF;
  --text: #1F2937;
  --accent: #5BA199;
  --accent-2: #8FBDB7;
  --danger: #D9776F;
  --border: #E5E7EB;
  --radius: 14px;
  --shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06);
  --space: 16px;
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Inter, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
}

.app-header, .app-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.app-footer { border-top: 1px solid var(--border); border-bottom: none; position: sticky; bottom: 0; }

.controls { display: flex; align-items: center; gap: 10px; width: 100%; }
.controls .spacer { flex: 1; }
button {
  background: var(--accent); color: white; border: none; border-radius: 10px;
  padding: 10px 14px; box-shadow: var(--shadow); cursor: pointer;
}
button:hover { background: var(--accent-2); }
button.danger { background: var(--danger); }

.calendar {
  display: grid; gap: 16px; padding: 16px;
  grid-template-columns: repeat(7, minmax(200px, 1fr));
}
@media (max-width: 1024px) {
  .calendar { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .calendar { grid-template-columns: 1fr; }
}

.day-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow); padding: 12px; display: flex; flex-direction: column; gap: 8px;
}
.day-head { display:flex; justify-content: space-between; align-items: center; font-weight: 600; }
.meal-line { display:flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.chip { background: #EEF5F4; color: #234; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border); }
.actions { display:flex; gap: 8px; flex-wrap: wrap; }
label input[type="time"] { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border); }

/* Focus */
:focus-visible { outline: 3px solid #99D5CD; outline-offset: 2px; }
```

### app.js (key functions & data model stubs)
```js
// ----- Utilities -----
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const LS_KEY = "dinner.v1.state";
const SETTINGS_KEY = "dinner.v1.settings";

const DateTime = window.luxon.DateTime;

function loadSettings() {
  const def = { readyAt: "17:00" };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")); }
  catch { return def; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

function getWeekId(dt) { // ISO week id, e.g. 2025-W35
  const wk = dt.toISOWeekDate().slice(0, 8); // YYYY-Www
  return wk;
}
function weekRange(dt) {
  const monday = dt.startOf("week"); // Mon if locale supports; otherwise use .minus({days: (dt.weekday+6)%7})
  return { monday, sunday: monday.plus({ days: 6 }) };
}

function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || { version:1, weeks:{}, mealNotes:{}, history:{} }; } catch { return {version:1,weeks:{},mealNotes:{},history:{}}; } }
function saveState(state) { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

// ----- CSV Loading -----
async function loadCSVs() {
  const [recipesCsv, mealsCsv] = await Promise.all([
    fetch("./data/recipes_for_webapp.csv").then(r=>r.text()),
    fetch("./data/meals_enriched.csv").then(r=>r.text()),
  ]);
  const recipes = Papa.parse(recipesCsv, { header: true, skipEmptyLines: true }).data;
  const meals = Papa.parse(mealsCsv, { header: true, skipEmptyLines: true }).data;
  const recipeById = {}; recipes.forEach(r => recipeById[r.dish_id] = r);
  return { recipes, meals, recipeById };
}

// ----- Suggestion Engine (simplified) -----
function pickSuggestionsForWeek(mealsData, recipeById, state, monday) {
  // Build pools by category → list of mains (recipe_id) with metadata
  const byCategory = {};
  mealsData.forEach(row => {
    if (!row.Main_Recipe_ID) return;
    const cat = row.Category || "Misc";
    byCategory[cat] ||= [];
    byCategory[cat].push({
      cat,
      mainId: row.Main_Recipe_ID,
      sides: [row.Side1_Recipe_ID, row.Side2_Recipe_ID].filter(Boolean)
    });
  });

  // Simple rotating categories to avoid clusters
  const cats = Object.keys(byCategory);
  const days = [0,1,2,3]; // Mon..Thu
  const plan = {};
  let lastCat = null;

  for (const d of days) {
    const date = monday.plus({ days: d }).toISODate();
    // choose a category not equal to lastCat
    const choices = cats.filter(c => c !== lastCat);
    const cat = choices[(Math.random()*choices.length)|0] || cats[0];
    // choose a dish from that category with recency/rating bias
    const opt = byCategory[cat].sort((a,b) => scoreMeal(b, state) - scoreMeal(a, state))[0];
    plan[date] = { main: opt.mainId, sides: opt.sides, status: "planned" };
    lastCat = cat;
  }
  return plan;

  function scoreMeal(opt, state) {
    const hist = state.history[opt.mainId] || [];
    const last = hist.length ? DateTime.fromISO(hist[hist.length-1]) : null;
    const daysSince = last ? Math.max(1, DateTime.now().diff(last, "days").days) : 999;
    // Here we could look up average rating from notes; keep simple
    return daysSince + (Math.random()*0.1);
  }
}

// ----- Calendar Rendering -----
function renderWeekApp({ recipes, meals, recipeById }) {
  const state = loadState();
  const settings = loadSettings();
  let currentMonday = DateTime.now().startOf("week"); // Monday

  const weekLabel = $("#weekLabel");
  const calendar = $("#calendar");
  const readyAtInput = $("#readyAt");

  readyAtInput.value = settings.readyAt || "17:00";
  readyAtInput.addEventListener("change", () => { settings.readyAt = readyAtInput.value; saveSettings(settings); });

  function ensureWeek(monday) {
    const wid = getWeekId(monday);
    state.weeks[wid] ||= { generatedOn: DateTime.now().toISODate(), days: {} };
    // Suggest for Mon-Thu if empty
    for (let i=0;i<4;i++) {
      const date = monday.plus({days:i}).toISODate();
      if (!state.weeks[wid].days[date]) {
        const suggest = pickSuggestionsForWeek(meals, recipeById, state, monday);
        Object.assign(state.weeks[wid].days, suggest);
        break;
      }
    }
    saveState(state);
    return wid;
  }

  function setWeek(monday) {
    currentMonday = monday;
    const wid = ensureWeek(monday);
    const { sunday } = weekRange(monday);
    weekLabel.textContent = `${monday.toFormat("LLL d")} — ${sunday.toFormat("LLL d")}`;
    drawDays();
  }

  function drawDays() {
    const wid = getWeekId(currentMonday);
    const weekObj = state.weeks[wid] || { days: {} };
    calendar.innerHTML = "";
    for (let i=0;i<7;i++) {
      const date = currentMonday.plus({days:i}).toISODate();
      const isWeekday = i <= 3;
      const day = weekObj.days[date];
      const el = document.createElement("div");
      el.className = "day-card";
      el.innerHTML = DayCard(date, isWeekday, day, recipes, recipeById);
      calendar.appendChild(el);
      bindDayCard(el, date);
    }
  }

  function DayCard(date, isWeekday, day, recipes, recipeById) {
    const d = DateTime.fromISO(date);
    const title = d.toFormat("ccc L/d");
    if (!day) {
      return `
        <div class="day-head"><div>${title}</div><div class="chip">Empty</div></div>
        <div class="actions"><button data-act="add" data-date="${date}">Add meal</button></div>
      `;
    }
    const main = recipeById[day.main];
    const sideNames = (day.sides||[]).map(id => recipeById[id]?.dish_name).filter(Boolean);
    return `
      <div class="day-head"><div>${title}</div><div class="chip">${main?.category || ''}</div></div>
      <div class="meal-line"><strong>${main?.dish_name || '(Custom meal)'}</strong>${
        sideNames.length ? ' — ' + sideNames.join(' · ') : ''
      }</div>
      <div class="actions">
        <button data-act="details" data-date="${date}">Details</button>
        <button data-act="change" data-date="${date}">Change</button>
        <button data-act="made" data-date="${date}">${day.status==='made'?'✓ Made':'Mark Made'}</button>
      </div>
      <div class="actions">
        <label>Rating
          <select data-act="rate" data-date="${date}">
            <option value="">—</option>
            ${[1,2,3,4,5].map(n => `<option ${day.rating==n?'selected':''}>${n}</option>`).join('')}
          </select>
        </label>
        <button data-act="notes" data-date="${date}">Notes</button>
      </div>
    `;
  }

  function bindDayCard(el, date) {
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]"); if (!btn) return;
      const act = btn.dataset.act;
      if (act === "add" || act === "change") return openChangeDialog(date);
      if (act === "details") return openDetails(date);
      if (act === "made") return markMade(date);
      if (act === "notes") return editNotes(date);
      if (act === "rate") return setRating(date, btn.value);
    });
  }

  function markMade(date) {
    const wid = getWeekId(currentMonday);
    const day = state.weeks[wid].days[date];
    if (!day) return;
    day.status = "made";
    state.history[day.main] ||= [];
    state.history[day.main].push(date);
    saveState(state);
    drawDays();
  }
  function setRating(date, val) {
    const wid = getWeekId(currentMonday);
    state.weeks[wid].days[date].rating = parseInt(val||0)||null;
    saveState(state);
  }

  // TODO: implement openChangeDialog, openDetails, editNotes with modals

  // Navigation
  $("#prevWeek").onclick = () => setWeek(currentMonday.minus({ weeks: 1 }));
  $("#nextWeek").onclick = () => setWeek(currentMonday.plus({ weeks: 1 }));
  $("#reloadData").onclick = () => location.reload();
  $("#exportState").onclick = () => {
    const blob = new Blob([JSON.stringify(loadState(), null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `dinner-state-${DateTime.now().toISODate()}.json`; a.click();
  };
  $("#importState").onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then(txt => { const s = JSON.parse(txt); localStorage.setItem(LS_KEY, JSON.stringify(s)); location.reload(); });
  };
  $("#shoppingList").onclick = () => {/* build list from planned days */};
  $("#resetWeek").onclick = () => {
    const wid = getWeekId(currentMonday);
    const s = loadState();
    if (confirm("Clear this week's plan?")) { delete s.weeks[wid]; saveState(s); location.reload(); }
  };

  setWeek(currentMonday);
}

// Boot
loadCSVs().then(renderWeekApp).catch(err => {
  alert("Failed to load data files. Please ensure the CSVs exist in /dinner/data.");
  console.error(err);
});
```

---

## 12) Details Modal Behaviors

- **Details** shows **Main + Sides** pulled by `dish_id`s with three tabs:
  1. **Recipe:** nice layout of steps
  2. **Ingredients:** list with **Copy** button
  3. **Timeline:** generated schedule to hit “Ready at” time; **Copy** button

- **Write your own meal:**
  - Modal with inputs: _Title_, _Sides (comma‑sep)_, _Notes_. Stored as a custom entry for that date only.
- **Change → Suggest new:**
  - Reruns suggestion with constraints: no same category as adjacent days, no recent duplicate (<14d).

- **Notes & Ratings:**
  - Notes are saved per **meal (dish_id)** in `mealNotes[dishId]` and also attached to the day instance. The **next time** that meal appears, surface previous notes in the modal under a collapsible section: “Previous notes for this meal”.

---

## 13) Copy & Download API (JS)

```js
async function copyText(str) {
  try { await navigator.clipboard.writeText(str); alert("Copied!"); }
  catch { /* fallback */ const ta = document.createElement("textarea"); ta.value = str; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); alert("Copied!"); }
}

function downloadTxt(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
```
- Bind to **Copy Ingredients**, **Copy Instructions**, and **Shopping List** buttons.

---

## 14) iPhone + Desktop Responsiveness

- Grid collapses to **1 column** under 640px.
- Inputs and buttons use large hit areas and 16px+ font.
- Time controls use native `<input type="time">` (iOS‑friendly).
- Sticky footer with shopping list and reset is always reachable.

---

## 15) Stability & Testing Checklist

- Load CSVs from `/dinner/data` (ensure correct relative paths).
- No external CDNs; all JS/CSS vendored locally.
- Test on Safari iOS, Chrome Android, Chrome Desktop, Edge.
- LocalStorage full? Fallback to showing a warning and still render.
- Missing CSV columns? Show a top‑bar warning but don’t crash.
- First‑run UX: Generate suggestions; show one‑line tip: “Tap Change to reshuffle any day.”
- Optional `sw.js` caches `index.html`, `styles.css`, `app.js`, `/data/*.csv`, and `/vendor/*.js` for resilience.

---

## 16) Future‑proof Hooks (Optional)

- **Scale servings** (5 → N) multiplier on detail page.
- **Tag meals** as “High taste‑to‑effort” (derive: `difficulty=Easy` and `prep+cook <= 30`).
- **Print view** for the weekly plan and shopping list.

---

## 17) Source CSV Contract (from this project)

- `data/recipes_for_webapp.csv` and `data/meals_enriched.csv` must be uploaded alongside the app.
- All recipes are portioned for **5**.
- Ingredient lines are plain text; no strict unit parsing required by the app (keep aggregation simple).

---

## 18) Definition of Done

- Upload `/dinner` to Hostinger.
- Open `https://motorolascada.com/dinner/`:
  - Sees clean Scandinavia‑style UI.
  - Mon–Thu auto‑filled with varied meals.
  - Can change any meal via Suggest/Write/Delete.
  - Details modal shows recipe, ingredients, and a working timeline to 5:00 PM (editable).
  - Ratings and notes save and reappear next time.
  - Shopping list builds for the planned date range and can be copied or downloaded.
  - Works on iPhone and desktop without layout glitches.
