/*
 * importer.js - adding and moving recipes. The binder adds one recipe from a link,
 * from a photo, or by writing it out; the twine stack saves or loads the whole box.
 *
 * Talks to: netlify/functions/fetch-recipe.js (reads a recipe page), vendor/tesseract
 *           (reads a photo, in the browser), fractions.js (spots ingredient lines),
 *           card.js (new card, preview), box.js (illustration), storage.js (saving,
 *           bundles), panels.js, assets.js, audio.js, motion.js. Opened by table.js.
 *
 * Say it to a judge: "All three ways of adding a recipe just fill in the same card
 * form, which you can correct before filing. Links are read from the recipe data
 * sites already publish, photos are read by Tesseract inside the browser, and
 * there's no AI model anywhere on the live site."
 */

import { createAsset } from './assets.js';
import { makeNewCard, buildCard, paginateCard } from './card.js';
import { parseIngredient, startsWithQuantity } from './fractions.js';
import { illustrationFor } from './box.js';
import {
  getDividers, saveCard, savePhoto, makeBundle, bundleFileName, mergeBundle,
} from './storage.js';
import { openPanel, closePanel, showNote } from './panels.js';
import { playEffect } from './audio.js';
import { motionReduced, fadeIn, fadeOut } from './motion.js';

const GRANDMAS_NOTE = "I couldn't make that one out. Want to write it out instead?";
const PHOTO_MAX_SIZE = 1200;   // saved photos are at most this many pixels wide or tall
const READING_MAX_SIZE = 1800; // the copy Tesseract reads can be a bit bigger

// Title words that suggest a divider. The first match wins.
const DIVIDER_HINTS = [
  { words: ['cookie'], dividerId: 'cookies' },
  { words: ['soup'], dividerId: 'soups' },
  { words: ['pie', 'cake'], dividerId: 'cakes-pies' },
  { words: ['bread', 'biscuit'], dividerId: 'breads' },
  { words: ['chicken', 'beef', 'pork'], dividerId: 'main-dishes' },
  { words: ['jam', 'pickle'], dividerId: 'canning' },
];

/* ---------- Small element helpers ---------- */

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeButton(className, text, onClick) {
  const button = el('button', className, text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function makeField(tag, labelText) {
  const label = el('label', 'binder-field');
  const input = el(tag);
  label.append(el('span', '', labelText), input);
  return { label, input };
}

function splitLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

/* ---------- The binder ---------- */

// While the binder is open: where the recipe came from, and the photo if there is one.
let draft;
let binder;       // the panel's root element
let form;         // the right-hand page's inputs
let boxButton;    // where the filed card flies to

/** Opens the binder. `opener` is the binder on the table; `box` is the recipe box. */
export function openBinder(opener, box) {
  boxButton = box;
  draft = { source: { type: 'hand', url: '', credit: '' }, photoBlob: null };
  binder = el('div', 'binder');
  showPages();
  openPanel(binder, { label: 'Add a recipe', opener });
}

// The two pages: on the left, where the recipe comes from; on the right, the card form.
function showPages(savedValues) {
  form = buildForm();
  if (savedValues) fillForm(savedValues);
  binder.replaceChildren(createAsset('obj-binder-spread'), buildSourcePage(), form.page);
}

/* ----- Left page: three sleeves ----- */

const SLEEVES = [
  { id: 'link', label: 'From a link', build: buildLinkSleeve },
  { id: 'photo', label: 'From a photo', build: buildPhotoSleeve },
  { id: 'write', label: 'Write it out', build: buildWriteSleeve },
];

function buildSourcePage() {
  const page = el('div', 'binder-page');
  const tabs = el('div', 'binder-tabs');
  tabs.setAttribute('role', 'tablist');
  const sleeve = el('div', 'binder-sleeve');

  const show = (chosen) => {
    for (const tab of tabs.children) tab.setAttribute('aria-selected', String(tab.dataset.id === chosen.id));
    sleeve.replaceChildren(...chosen.build());
  };
  for (const item of SLEEVES) {
    const tab = makeButton('binder-tab', item.label, () => show(item));
    tab.setAttribute('role', 'tab');
    tab.dataset.id = item.id;
    tabs.append(tab);
  }
  show(SLEEVES[0]);

  page.append(tabs, sleeve);
  return page;
}

/* ----- Sleeve 1: from a link ----- */

function buildLinkSleeve() {
  const address = makeField('input', 'Paste the recipe\'s web address');
  address.input.type = 'url';
  address.input.placeholder = 'https://';
  const status = el('p', 'binder-status');
  status.setAttribute('role', 'status');

  const fetchIt = async () => {
    status.textContent = 'Reading the page...';
    const result = await fetchRecipe(address.input.value.trim());
    draft.source = { type: 'url', url: result.sourceUrl || address.input.value.trim(), credit: '' };
    fillForm(result);
    status.textContent = result.found ? 'Copied onto the card. Check it over.' : GRANDMAS_NOTE;
    form.title.focus();
  };
  address.input.addEventListener('keydown', (event) => { if (event.key === 'Enter') fetchIt(); });

  return [address.label, makeButton('pencil-mark', 'Fetch it', fetchIt), status];
}

/** Asks our Netlify Function to read the page. Never throws: failures come back as found: false. */
async function fetchRecipe(address) {
  try {
    const response = await fetch('/.netlify/functions/fetch-recipe?url=' + encodeURIComponent(address));
    return await response.json();
  } catch {
    return { found: false }; // offline, or the function isn't running
  }
}

/* ----- Sleeve 2: from a photo ----- */

function buildPhotoSleeve() {
  const status = el('p', 'binder-status');
  status.setAttribute('role', 'status');
  const preview = el('img', 'binder-photo');
  preview.alt = 'The photo being copied out';
  preview.hidden = true;

  const readPhoto = async (file) => {
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    status.textContent = 'Putting on my glasses...';
    try {
      const picture = await loadPicture(file);
      draft.photoBlob = await shrinkToJpeg(picture, PHOTO_MAX_SIZE);
      draft.source = { type: 'photo', url: '', credit: '' };
      const text = await readTextFromPicture(picture, (percent) => {
        status.textContent = `Reading... ${percent}%`;
      });
      fillForm(sortLinesIntoRecipe(text));
      status.textContent = 'Here is what I could read. Copy it out properly on the card.';
    } catch (problem) {
      console.warn('Photo reading failed', problem);
      status.textContent = GRANDMAS_NOTE;
    }
    form.title.focus();
  };

  return [
    // WHY two buttons: on an iPad, capture="environment" opens the camera straight
    // away, so a second button without it is needed to pick an existing photo.
    makePhotoPicker('Take a photo', true, readPhoto),
    makePhotoPicker('Choose a photo', false, readPhoto),
    status,
    preview,
  ];
}

// A real <input type="file">, hidden, inside a label that looks like a pencil mark.
function makePhotoPicker(text, useCamera, onPicked) {
  const label = el('label', 'pencil-mark binder-picker');
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (useCamera) input.setAttribute('capture', 'environment');
  input.addEventListener('change', () => onPicked(input.files[0]));
  label.append(input, el('span', '', text));
  return label;
}

function loadPicture(file) {
  return new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = () => reject(new Error('That file is not a picture'));
    picture.src = URL.createObjectURL(file);
  });
}

/** Draws the picture onto a canvas no bigger than maxSize in either direction. */
function drawScaled(picture, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(picture.naturalWidth, picture.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(picture.naturalWidth * scale);
  canvas.height = Math.round(picture.naturalHeight * scale);
  canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function shrinkToJpeg(picture, maxSize) {
  return new Promise((resolve) => drawScaled(picture, maxSize).toBlob(resolve, 'image/jpeg', 0.85));
}

/* ----- Making the photo easier to read ----- */

/**
 * Turns a photo into crisp black writing on white, which is what Tesseract reads
 * best: grey it, stretch the contrast, then decide pixel by pixel whether it is ink.
 */
export function prepareForReading(picture) {
  const canvas = drawScaled(picture, READING_MAX_SIZE);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const image = context.getImageData(0, 0, canvas.width, canvas.height);

  const grey = toGreyscale(image.data);
  boostContrast(grey);
  const blackAndWhite = adaptiveThreshold(grey, canvas.width, canvas.height);

  for (let i = 0; i < blackAndWhite.length; i += 1) {
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = blackAndWhite[i];
    image.data[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function toGreyscale(pixels) {
  const grey = new Uint8ClampedArray(pixels.length / 4);
  for (let i = 0; i < grey.length; i += 1) {
    // The eye sees green as brightest and blue as darkest, hence the weights.
    grey[i] = 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2];
  }
  return grey;
}

// Stretches the picture so its darkest 2% becomes black and its lightest 2% white.
function boostContrast(grey) {
  const counts = new Uint32Array(256);
  for (const value of grey) counts[value] += 1;
  const cutoff = grey.length * 0.02;

  let dark = 0;
  for (let seen = counts[0]; seen < cutoff && dark < 255; seen += counts[dark]) dark += 1;
  let light = 255;
  for (let seen = counts[255]; seen < cutoff && light > 0; seen += counts[light]) light -= 1;

  const range = Math.max(1, light - dark);
  for (let i = 0; i < grey.length; i += 1) grey[i] = ((grey[i] - dark) * 255) / range;
}

/**
 * Adaptive threshold: a pixel is "ink" if it is clearly darker than the average of
 * its own neighbourhood. That copes with shadows and yellowed paper, where one
 * fixed cut-off for the whole photo would fail.
 * WHY the "sums" table: sums[y][x] holds the total of every pixel above and to the
 * left, so the total of any rectangle is four look-ups instead of thousands of adds.
 */
function adaptiveThreshold(grey, width, height) {
  const sums = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowTotal = 0;
    for (let x = 0; x < width; x += 1) {
      rowTotal += grey[y * width + x];
      sums[(y + 1) * (width + 1) + (x + 1)] = sums[y * (width + 1) + (x + 1)] + rowTotal;
    }
  }

  const reach = Math.max(8, Math.round(Math.max(width, height) / 40)); // neighbourhood half-size
  const result = new Uint8ClampedArray(grey.length);
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - reach);
    const bottom = Math.min(height, y + reach + 1);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - reach);
      const right = Math.min(width, x + reach + 1);
      const total = sums[bottom * (width + 1) + right] - sums[top * (width + 1) + right]
        - sums[bottom * (width + 1) + left] + sums[top * (width + 1) + left];
      const average = total / ((bottom - top) * (right - left));
      result[y * width + x] = grey[y * width + x] < average * 0.85 ? 0 : 255;
    }
  }
  return result;
}

/* ----- Reading the text with Tesseract ----- */

let tesseractLoading = null;

// WHY loaded only now: Tesseract is several megabytes, and most visitors never scan
// a photo. Everything comes from /vendor, so it works without the internet.
function loadTesseract() {
  if (!tesseractLoading) {
    tesseractLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/tesseract/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Tesseract could not be loaded'));
      document.head.append(script);
    });
  }
  return tesseractLoading;
}

async function readTextFromPicture(picture, onProgress) {
  await loadTesseract();
  // WHY full addresses: the worker runs in its own little world and doesn't know
  // which page it belongs to, so "vendor/..." on its own would not be found.
  const here = (path) => new URL(path, document.baseURI).href;
  const worker = await Tesseract.createWorker('eng', 1, {
    workerPath: here('vendor/tesseract/worker.min.js'),
    corePath: here('vendor/tesseract/core'),
    langPath: here('vendor/tesseract/lang'),
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress(Math.round(message.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(prepareForReading(picture));
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Sorts read lines into a recipe: the first line is the title, lines that start
 * with an amount ("2 cups...") are ingredients, and everything else is a step.
 * It is only a first guess; the user corrects it on the card form.
 */
export function sortLinesIntoRecipe(text) {
  const lines = splitLines(text).filter(looksLikeWriting);
  const title = lines.length && !startsWithQuantity(lines[0]) ? lines.shift() : '';
  return {
    title,
    ingredients: lines.filter(startsWithQuantity),
    steps: lines.filter((line) => !startsWithQuantity(line)),
    servings: null,
  };
}

// Shadows and the edge of the card often get "read" as scraps like "eee" or "EE —".
// Real writing has at least three letters or digits and isn't one character repeated.
function looksLikeWriting(line) {
  const characters = line.replace(/[^a-z0-9]/gi, '');
  return characters.length >= 3 && !/^(.)\1*$/i.test(characters);
}

/* ----- Sleeve 3: write it out ----- */

function buildWriteSleeve() {
  return [el('p', 'binder-hint', 'Write it out on the card, the way you would for a friend. One ingredient to a line, one step to a line.')];
}

/* ----- Right page: the card form ----- */

function buildForm() {
  const title = makeField('input', 'Title');
  const kitchenOf = makeField('input', 'From the kitchen of (optional)');
  const servings = makeField('input', 'Makes');
  servings.input.type = 'number';
  servings.input.min = '1';
  const ingredients = makeField('textarea', 'Ingredients, one per line');
  const steps = makeField('textarea', 'Steps, one per line');

  const topRow = el('div', 'binder-row');
  topRow.append(kitchenOf.label, servings.label);
  const page = el('div', 'binder-page binder-form');
  page.append(title.label, topRow, ingredients.label, steps.label,
    makeButton('pencil-mark binder-next', 'Look it over', showPreview));

  return {
    page,
    title: title.input,
    kitchenOf: kitchenOf.input,
    servings: servings.input,
    ingredients: ingredients.input,
    steps: steps.input,
  };
}

// Puts whatever was found onto the form. Anything missing is simply left blank.
function fillForm({ title, kitchenOf, ingredients, steps, servings }) {
  form.title.value = title || '';
  form.kitchenOf.value = kitchenOf || '';
  form.servings.value = servings || '';
  form.ingredients.value = (ingredients || []).join('\n');
  form.steps.value = (steps || []).join('\n');
}

function readForm() {
  return {
    title: form.title.value.trim(),
    kitchenOf: form.kitchenOf.value.trim(),
    servings: Number(form.servings.value) || null,
    ingredients: splitLines(form.ingredients.value),
    steps: splitLines(form.steps.value),
  };
}

/* ----- Preview, choose a divider, file it ----- */

/** Picks a divider from words in the title, e.g. "Oatmeal Cookies" -> Cookies. */
export function suggestDivider(title) {
  const lowerTitle = title.toLowerCase();
  const dividers = getDividers();
  for (const hint of DIVIDER_HINTS) {
    const matches = hint.words.some((word) => lowerTitle.includes(word));
    if (matches && dividers.some((divider) => divider.id === hint.dividerId)) return hint.dividerId;
  }
  return dividers[0].id; // nothing matched: start with the first divider
}

function showPreview() {
  const values = readForm();
  if (!values.title) {
    showNote('Give the recipe a title first.');
    form.title.focus();
    return;
  }

  const card = makeNewCard({
    ...values,
    ingredients: values.ingredients.map(parseIngredient),
    dividerId: suggestDivider(values.title),
    source: draft.source,
  });

  const cardHolder = el('div', 'binder-preview-card');
  const drawCard = () => {
    const element = buildCard(card, { illustration: illustrationFor(card) });
    cardHolder.replaceChildren(element);
    paginateCard(element);
  };

  const picker = buildDividerPicker(card, drawCard);
  const buttons = el('div', 'binder-preview-buttons');
  buttons.append(
    makeButton('pencil-mark', 'Fix something', () => showPages(values)),
    makeButton('pencil-mark mark-cook', 'File it in the box', () => fileCard(card)),
  );

  const preview = el('div', 'binder-preview');
  preview.append(cardHolder, picker, buttons);
  binder.replaceChildren(createAsset('obj-binder-spread'), preview);
  drawCard();
  picker.querySelector('select').focus();
}

function buildDividerPicker(card, onChange) {
  const label = el('label', 'binder-divider');
  const select = el('select');
  for (const divider of getDividers()) {
    const option = el('option', '', divider.label);
    option.value = divider.id;
    option.selected = divider.id === card.dividerId;
    select.append(option);
  }
  select.addEventListener('change', () => {
    card.dividerId = select.value;
    onChange(); // the illustration follows the divider
  });
  label.append(el('span', '', 'File under'), select);
  return label;
}

async function fileCard(card) {
  if (draft.photoBlob) card.photoId = await savePhoto(draft.photoBlob);
  await saveCard(card);
  const divider = getDividers().find((d) => d.id === card.dividerId);
  closePanel();
  slideCardIntoBox(card, () => showNote(`Filed under ${divider.label}.`));
}

/** A little card slides from the middle of the screen into the recipe box: ting! */
function slideCardIntoBox(card, onDone) {
  const layer = document.getElementById('panels');
  const flyer = el('div', `flying-card font-${card.font}`, card.title);
  layer.append(flyer);

  const finish = () => {
    playEffect('fx-ting');
    flyer.remove();
    onDone();
  };
  if (motionReduced()) {
    fadeIn(flyer, 0.4);
    setTimeout(() => fadeOut(flyer, finish, 0.4), 700);
    return;
  }
  const target = offsetBetween(flyer, boxButton);
  gsap.timeline({ onComplete: finish })
    .from(flyer, { opacity: 0, scale: 0.8, duration: 0.35, ease: 'power1.out' })
    .to(flyer, { x: target.x, y: target.y, scale: 0.18, rotation: -6, duration: 0.9, ease: 'power2.inOut' }, '+=0.25')
    .to(flyer, { opacity: 0, duration: 0.2 }, '-=0.2');
}

// How far (in pixels) the middle of one element is from the middle of another.
function offsetBetween(from, to) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  return {
    x: b.left + b.width / 2 - (a.left + a.width / 2),
    y: b.top + b.height * 0.3 - (a.top + a.height / 2),
  };
}

/* ---------- The twine stack: save or load the whole box ---------- */

/** Opens the bundle panel. onClose lets table.js tie the twine back up. */
export function openTwine(opener, onClose) {
  const slip = el('div', 'twine-slip');
  const status = el('p', 'binder-status');
  status.setAttribute('role', 'status');

  slip.append(
    el('h2', 'twine-heading', 'A bundle of recipes'),
    el('p', 'binder-hint', 'Tie up every card, note and photo into one file to keep safe or hand to someone. Untie a bundle to add its cards to this box.'),
    makeButton('pencil-mark', 'Tie up a bundle', () => tieUpBundle(status)),
    makeBundlePicker('Untie a bundle', (file) => untieBundle(file, status)),
    status,
  );
  openPanel(slip, { label: 'Save or load a bundle of recipes', opener, onClose });
}

async function tieUpBundle(status) {
  const bundle = await makeBundle();
  const file = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
  const link = el('a');
  link.href = URL.createObjectURL(file);
  link.download = bundleFileName();
  link.click(); // the browser saves it like any other download
  URL.revokeObjectURL(link.href);
  playEffect('fx-twine');
  status.textContent = `Tied up ${bundle.cards.length} cards as ${link.download}.`;
}

async function untieBundle(file, status) {
  if (!file) return;
  try {
    const { added, skipped } = await mergeBundle(JSON.parse(await file.text()));
    playEffect('fx-shuffle');
    status.textContent = `Added ${added} ${added === 1 ? 'card' : 'cards'}.`
      + (skipped ? ` ${skipped} already in the box.` : '');
  } catch {
    status.textContent = "That doesn't look like one of my bundles.";
  }
}

function makeBundlePicker(text, onPicked) {
  const label = el('label', 'pencil-mark binder-picker');
  const input = el('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => { onPicked(input.files[0]); input.value = ''; });
  label.append(input, el('span', '', text));
  return label;
}
