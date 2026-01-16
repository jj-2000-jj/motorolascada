// Resolve image URLs for recipes by dish_id using a curated map and sensible fallbacks

const DISH_ID_TO_IMAGE = {
  // mains with direct matches
  'spaghetti': 'spaghetti.png',
  'manicotti': 'manicotti.png',
  'lasagna': 'lasagna.png',
  'carbonara': 'carbonara.png',
  'meat-loaf': 'meat-loaf.png',
  'pot-roast': 'pot-roast.png',
  'white-chicken-chili': 'white-chicken-chili.png',
  'breaded-cod': 'breaded-cod.png',
  'shrimp-tacos': 'shrimp-tacos.png',
  'teriyaki-chicken': 'teriyaki-chicken.png',
  // plural/singular or naming differences
  'cheeseburgers': 'cheeseburger.png',
  'blts': 'blt.png',
  'quesadillas': 'quesadilla.png',
  'stir-fried-rice': 'stir-fry-rice.png',
  'shrimp-stir-fry': 'shrimp.png',
  'salmon-in-oven': 'baked-salmon.png',
  'grilled-mahi-mahi': 'mahi-mahi.png',
  'smoked-salmon': 'smoked-salmon.png',
  'smoked-tri-tip': 'tri-tip.png',
  'pulled-pork-sandwiches': 'pulled-pork-sandwich.png',
  'rueben-sandwich': 'rueben.png',
  'chicken-parmesan': 'chicken-parm.png',
  'chicken-roast': 'roasted-chicken.png',
  'chicken-noodle-soup': 'chicken-noodle-soup.png',
  'chicken-enchiladas': 'chicken-enchiladas.png',
  'french-toast': 'french-toast.png',
  'eggs': 'eggs.png',
  'grilled-cheese': 'grilled-cheese.png',
  'hot-dogs': 'hot-dogs.png',
  'chile-verde-omlette-pancake-house': 'chile-verde.png'
};

export function getImageUrlForDishId(dishId) {
  if (!dishId) return null;
  const file = DISH_ID_TO_IMAGE[dishId];
  if (file) return `./images/${file}`;
  // try a naive fallback: use the dishId as filename
  return `./images/${dishId}.png`;
}

