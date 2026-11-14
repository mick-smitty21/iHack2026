/*
 * card.js - makes recipe cards: the data for a new one, and the front, back and
 * edit form you see on screen. Also flips a card over.
 *
 * Talks to: aging.js (stains and wear), assets.js (paper, illustrations, doodles),
 *           fractions.js (reading ingredient lines when a card is edited).
 *           Used by box.js now, and by cook.js and importer.js later.
 *
 * Say it to a judge: "A card is plain HTML text laid over a picture of an index
 * card, so the recipe stays real, selectable text in a handwriting font. Each card
 * is given its handwriting once, when it's created, and keeps it."
 */

import { createAsset } from './assets.js';
import { agingStage, makeAgingLayout, buildAgingLayer } from './aging.js';
import { parseIngredient } from './fractions.js';

export const FONTS = ['homemade-apple', 'caveat', 'reenie-beanie', 'special-elite'];
const DOODLES = ['doodle-daisy', 'doodle-cup', 'doodle-star', 'doodle-spoon'];

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** A short unique id. WHY: crypto.randomUUID() is missing on plain http:// pages,
    which is how the iPad reaches the laptop during testing, so we make our own. */
export function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** A complete new card. Pass the fields you know; everything else gets a default. */
export function makeNewCard(fields = {}) {
  return {
    id: makeId(),
    title: '',
    kitchenOf: '',
    dividerId: '',
    ingredients: [],
    steps: [],
    servings: null,
    source: { type: 'hand', url: '', credit: '' },
    photoId: null,
    notes: '',
    cookLog: [],
    uses: 0,
    favorite: false,
    font: pickOne(FONTS),                               // chosen once, kept forever
    doodle: Math.random() < 0.5 ? pickOne(DOODLES) : null, // about half the cards get one
    agingLayout: makeAgingLayout(),
    createdAt: Date.now(),
    ...fields,
  };
}

/* ---------- Small element helpers ---------- */

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makePaper(assetId) {
  const paper = createAsset(assetId);
  paper.classList.add('card-paper');
  return paper;
}

/* ---------- The whole card ---------- */

/**
 * Builds a card you can look at and flip.
 * options.illustration - the ill-* picture for the card's divider
 * options.onNotesChange(text) - called when the notes on the back are edited
 * options.loadPhoto(id) - returns a Promise of a picture URL (cook-log photos)
 */
export function buildCard(card, options = {}) {
  const element = el('div', `card font-${card.font} stage-${agingStage(card.uses)}`);
  element.dataset.id = card.id;

  const inner = el('div', 'card-inner');
  const back = buildBack(card, options);
  back.inert = true; // WHY: the hidden face must not catch Tab or clicks
  inner.append(buildFront(card, options), back);
  element.append(inner);
  return element;
}

/** Turns the card over (CSS does the 3D turn, or a fade with reduced motion). */
export function flipCard(element) {
  const isFlipped = element.classList.toggle('is-flipped');
  element.querySelector('.card-front').inert = isFlipped;
  element.querySelector('.card-back').inert = !isFlipped;
  return isFlipped;
}

/* ---------- Front ---------- */

function buildFront(card, { illustration }) {
  const face = el('div', 'card-face card-front');
  face.append(
    makePaper('card-front'),
    buildFirstPage(card, illustration),
    buildSecondPage(card),
    buildAgingLayer(card),
  );
  return face;
}

function buildFirstPage(card, illustration) {
  const page = el('div', 'card-page page-1');

  const kitchen = el('p', 'card-kitchen', 'From the kitchen of ');
  kitchen.append(el('span', 'card-kitchen-name', card.kitchenOf || ''));

  const body = el('div', 'card-body');
  body.append(buildIngredientList(card), buildStepList(card.steps));

  page.append(kitchen, el('h3', 'card-title', card.title || 'Untitled recipe'), body);
  if (illustration) page.append(makeDecoration('card-illustration', illustration));
  if (card.doodle) page.append(makeDecoration('card-doodle', card.doodle));
  if (card.favorite) page.append(makeDecoration('card-heart', 'doodle-heart'));
  return page;
}

// The second page starts empty. paginateCard() moves steps onto it if they don't fit.
function buildSecondPage(card) {
  const page = el('div', 'card-page page-2');
  const body = el('div', 'card-body');
  body.append(buildStepList([]));
  page.append(el('h3', 'card-title', (card.title || 'Untitled recipe') + ' (continued)'), body);
  return page;
}

function makeDecoration(className, assetId) {
  const holder = el('div', className);
  holder.append(createAsset(assetId));
  return holder;
}

function buildIngredientList(card) {
  const list = el('ul', 'card-ingredients');
  for (const ingredient of card.ingredients) list.append(el('li', '', ingredient.raw));
  if (card.servings) list.append(el('li', 'card-servings', 'Makes ' + card.servings));
  return list;
}

function buildStepList(steps) {
  const list = el('ol', 'card-steps');
  for (const step of steps) list.append(el('li', '', step));
  return list;
}

/**
 * Long recipes: if the steps run off the bottom of the card, move the ones that
 * don't fit onto a second card that looks stapled behind the first.
 * WHY: this has to run after the card is on screen (and its font has loaded),
 * because only then does the browser know how tall the text really is.
 */
export function paginateCard(element) {
  const firstSteps = element.querySelector('.page-1 .card-steps');
  const secondSteps = element.querySelector('.page-2 .card-steps');
  const body = element.querySelector('.page-1 .card-body');

  firstSteps.append(...secondSteps.children); // start over with everything on page 1
  while (firstSteps.scrollHeight > body.clientHeight + 1 && firstSteps.children.length > 1) {
    secondSteps.prepend(firstSteps.lastElementChild);
  }
  secondSteps.start = firstSteps.children.length + 1; // numbering carries on
  const hasSecondPage = secondSteps.children.length > 0;
  element.classList.toggle('has-second-page', hasSecondPage);
  return hasSecondPage;
}

/** Swaps which of the two stapled pages is on top. */
export function turnPage(element) {
  return element.classList.toggle('showing-page-2');
}

/* ---------- Back ---------- */

function buildBack(card, { onNotesChange, loadPhoto }) {
  const face = el('div', 'card-face card-back');
  const content = el('div', 'card-back-content');

  content.append(buildNotes(card, onNotesChange));
  if (card.cookLog.length) content.append(buildCookLog(card, loadPhoto));
  if (card.photoId && loadPhoto) content.append(buildPhoto(card.photoId, loadPhoto, 'The original recipe photo'));
  content.append(buildSource(card.source));

  face.append(makePaper('card-back'), content, buildAgingLayer(card));
  return face;
}

function buildNotes(card, onNotesChange) {
  const label = el('label', 'card-notes');
  const notes = el('textarea');
  notes.value = card.notes;
  notes.placeholder = 'Notes...';
  notes.rows = 3;
  notes.addEventListener('input', () => { if (onNotesChange) onNotesChange(notes.value); });
  label.append(el('span', 'card-back-heading', 'Notes'), notes);
  return label;
}

function buildCookLog(card, loadPhoto) {
  const section = el('div', 'card-log');
  section.append(el('span', 'card-back-heading', 'Cooked'));
  for (const entry of card.cookLog) {
    const line = el('p', 'card-log-entry');
    line.append(el('strong', '', formatDate(entry.date)), ' ' + (entry.notes || ''));
    if (entry.photoId && loadPhoto) line.append(buildPhoto(entry.photoId, loadPhoto, 'Photo from that day'));
    section.append(line);
  }
  return section;
}

function formatDate(isoDate) {
  // WHY: adding a time stops "1981-12-24" being read as UTC and shown a day early.
  const date = new Date(isoDate + 'T12:00:00');
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildPhoto(photoId, loadPhoto, description) {
  const image = el('img', 'card-photo');
  image.alt = description;
  loadPhoto(photoId).then((url) => { if (url) image.src = url; });
  return image;
}

function buildSource(source) {
  const line = el('p', 'card-source');
  if (source.credit) line.append(source.credit + ' ');
  if (source.url) {
    const link = el('a', '', hostName(source.url));
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener';
    line.append(link);
  }
  return line;
}

function hostName(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/* ---------- Edit form (the Pencil) ---------- */

/**
 * A card-shaped form for changing a recipe. onSave gets the changed fields;
 * the caller decides how to store them.
 */
export function buildEditForm(card, { onSave, onCancel }) {
  const form = el('form', `card card-editing font-${card.font}`);
  const face = el('div', 'card-face');

  const title = makeField('input', 'Title', card.title);
  const kitchenOf = makeField('input', 'From the kitchen of (optional)', card.kitchenOf);
  const servings = makeField('input', 'Makes', card.servings || '');
  servings.input.type = 'number';
  servings.input.min = '1';
  const ingredients = makeField('textarea', 'Ingredients, one per line', card.ingredients.map((i) => i.raw).join('\n'));
  const steps = makeField('textarea', 'Steps, one per line', card.steps.join('\n'));

  const save = el('button', 'pencil-mark', 'Save');
  save.type = 'submit';
  const cancel = el('button', 'pencil-mark', 'Never mind');
  cancel.type = 'button';
  cancel.addEventListener('click', onCancel);

  const topRow = el('div', 'edit-row');
  topRow.append(title.label, kitchenOf.label, servings.label);
  const bottomRow = el('div', 'edit-row edit-row-tall');
  bottomRow.append(ingredients.label, steps.label);
  const buttons = el('div', 'edit-buttons');
  buttons.append(save, cancel);

  face.append(makePaper('card-front'), topRow, bottomRow, buttons);
  form.append(face);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSave({
      title: title.input.value.trim(),
      kitchenOf: kitchenOf.input.value.trim(),
      servings: Number(servings.input.value) || null,
      ingredients: splitLines(ingredients.input.value).map(parseIngredient),
      steps: splitLines(steps.input.value),
    });
  });
  return form;
}

function makeField(tag, labelText, value) {
  const label = el('label', 'edit-field');
  const input = el(tag);
  input.value = value;
  label.append(el('span', '', labelText), input);
  return { label, input };
}

function splitLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}
