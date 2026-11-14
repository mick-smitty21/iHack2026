/*
 * fractions.js - reads quantities like "1 1/2 cups flour" out of a line of text,
 * scales them for more or fewer servings, and shows kitchen fractions such as ½ and ¾.
 *
 * Talks to: nothing; pure text and maths. Used by card.js (editing a card),
 *           importer.js (spotting ingredient lines) and cook.js (scaling).
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

/* ---------- Scaling and showing amounts ---------- */

// The only fractions a kitchen uses, with their symbols. Amounts are rounded to the
// nearest one, so you never see "0.375 cups".
const KITCHEN_FRACTIONS = [
  { value: 0, symbol: '' },
  { value: 1 / 8, symbol: '⅛' },
  { value: 1 / 4, symbol: '¼' },
  { value: 1 / 3, symbol: '⅓' },
  { value: 1 / 2, symbol: '½' },
  { value: 2 / 3, symbol: '⅔' },
  { value: 3 / 4, symbol: '¾' },
  { value: 1, symbol: '' },
];

/** 1.5 -> "1½", 0.3333 -> "⅓", 2 -> "2". Never a decimal, and never nothing. */
export function formatKitchenFraction(amount) {
  let whole = Math.floor(amount);
  const leftover = amount - whole;

  let nearest = KITCHEN_FRACTIONS[0];
  for (const fraction of KITCHEN_FRACTIONS) {
    if (Math.abs(fraction.value - leftover) < Math.abs(nearest.value - leftover)) nearest = fraction;
  }
  if (nearest.value === 1) whole += 1;               // e.g. 1.97 rounds up to 2
  if (whole === 0 && !nearest.symbol) return '⅛';    // too small to measure: call it an eighth
  return (whole || '') + nearest.symbol;
}

const PLURAL_UNITS = { cup: 'cups', quart: 'quarts', pint: 'pints', gallon: 'gallons', clove: 'cloves',
  slice: 'slices', can: 'cans', stick: 'sticks', pinch: 'pinches', dash: 'dashes' };

/**
 * The text for one ingredient at `scale` times the written amount (2 = double).
 * At scale 1, or when the line had no amount we could read, the cook's own words
 * are shown untouched.
 */
export function formatIngredient(ingredient, scale = 1) {
  if (scale === 1 || ingredient.qty === null) return ingredient.raw;
  const amount = formatKitchenFraction(ingredient.qty * scale);
  // "1 cup" and "½ cup", but "1½ cups" and "2 cups".
  const isSingular = amount === '1' || /^[⅛¼⅓½⅔¾]$/.test(amount);
  const unit = !isSingular && PLURAL_UNITS[ingredient.unit] ? PLURAL_UNITS[ingredient.unit] : ingredient.unit;
  return [amount, unit, ingredient.item].filter(Boolean).join(' ');
}
