/*
 * fractions.js - reads quantities like "1 1/2 cups flour" out of a line of text.
 * (M4 adds scaling and showing kitchen fractions such as ½ and ¾.)
 *
 * Talks to: nothing; pure text and maths. Used by card.js (editing a card) and,
 *           from M3, importer.js.
 *
 * Say it to a judge: "Each ingredient line is split into an amount, a unit and the
 * item, so later we can scale '1 1/2 cups' when you change the servings."
 */

const UNICODE_FRACTIONS = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};

// Every spelling we accept, mapped to the one we store.
const UNITS = {
  cup: 'cup', cups: 'cup', c: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp', tb: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  quart: 'quart', quarts: 'quart', qt: 'quart',
  pint: 'pint', pints: 'pint', pt: 'pint',
  gallon: 'gallon', gallons: 'gallon',
  gram: 'g', grams: 'g', g: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml',
  liter: 'l', liters: 'l', l: 'l',
  pinch: 'pinch', pinches: 'pinch', dash: 'dash', dashes: 'dash',
  clove: 'clove', cloves: 'clove', slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can', stick: 'stick', sticks: 'stick',
};

// A quantity at the start of a line: "2", "1/2", "1 1/2", "1½", "½", "0.75".
const QUANTITY_PATTERN = /^\s*(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d*\.\d+|\d+\s*[½⅓⅔¼¾⅛⅜⅝⅞]|[½⅓⅔¼¾⅛⅜⅝⅞]|\d+)/;

/** Turns "1 1/2" or "1½" into 1.5. Returns null if the text isn't a quantity. */
export function parseQuantity(text) {
  const clean = text.trim();
  if (!clean) return null;

  const lastChar = clean.slice(-1);
  if (UNICODE_FRACTIONS[lastChar]) {
    const whole = clean.slice(0, -1).trim();
    return (whole ? Number(whole) : 0) + UNICODE_FRACTIONS[lastChar];
  }

  let total = 0;
  for (const part of clean.split(/\s+/)) {
    const value = part.includes('/') ? divide(part) : Number(part);
    if (!Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}

function divide(fraction) {
  const [top, bottom] = fraction.split('/').map(Number);
  return top / bottom;
}

/** True when a line starts with a number, which is how we spot ingredient lines. */
export function startsWithQuantity(line) {
  return QUANTITY_PATTERN.test(line);
}

/**
 * "2 cups sifted flour" -> { qty: 2, unit: 'cup', item: 'sifted flour', raw: (the line) }
 * A line with no number ("salt to taste") keeps qty null and never gets scaled.
 */
export function parseIngredient(line) {
  const raw = line.trim();
  const match = raw.match(QUANTITY_PATTERN);
  if (!match) return { qty: null, unit: '', item: raw, raw };

  const qty = parseQuantity(match[1].replace(/\s*\/\s*/, '/'));
  const rest = raw.slice(match[0].length).trim();
  const [firstWord, ...otherWords] = rest.split(/\s+/);
  const unit = UNITS[firstWord.toLowerCase().replace(/\.$/, '')];

  if (unit) return { qty, unit, item: otherWords.join(' '), raw };
  return { qty, unit: '', item: rest, raw };
}
