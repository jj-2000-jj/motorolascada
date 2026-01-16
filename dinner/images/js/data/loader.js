import { parseCSV } from '../utils/csv.js';

export async function loadCSVs(force = false) {
  const [recipesCsv, mealsCsv] = await Promise.all([
    fetch('./data/recipes_for_webapp.csv', { cache: force ? 'reload' : 'default' }).then(r => r.text()),
    fetch('./data/meals_enriched.csv', { cache: force ? 'reload' : 'default' }).then(r => r.text())
  ]);
  const recipes = parseCSV(recipesCsv, { header: true, skipEmptyLines: true }).data;
  const meals = parseCSV(mealsCsv, { header: true, skipEmptyLines: true }).data;
  const recipeById = {};
  for (const r of recipes) recipeById[r.dish_id] = r;
  return { recipes, meals, recipeById };
}

