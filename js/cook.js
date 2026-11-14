/*
 * cook.js - scene 3: cooking from a card at Grandma's stove. Tick off ingredients,
 * follow one step at a time, run egg timers, change the servings, and log the cook.
 *
 * Talks to: card.js (draws the card), aging.js (wear), fractions.js (scaling),
 *           sky.js (time of day), storage.js (saving, photos), audio.js (sounds),
 *           panels.js (notes), assets.js, motion.js. main.js opens and closes it.
 *
 * Say it to a judge: "Cook mode is the same card propped in a stand. Tapping an
 * ingredient ticks it off, the steno pad shows one step at a time in big writing,
 * and when you're done the date and your notes are written on the back of the card."
 */

import { createAsset } from './assets.js';
import { buildCard, flipCard, paginateCard } from './card.js';
import { agingStage, buildAgingLayer } from './aging.js';
import { formatIngredient } from './fractions.js';
import { timeOfDay } from './sky.js';
import { saveCard, savePhoto, loadPhotoUrl } from './storage.js';
import { playEffect } from './audio.js';
import { showNote } from './panels.js';
import { motionReduced, fadeIn, fadeOut } from './motion.js';

const MAX_TIMERS = 3;
const MAX_MINUTES = 60;
const PHOTO_MAX_SIZE = 1200;

let scene;        // #scene-cook
let onLeave;      // main.js callback: (card, wasCooked) => back to the table
const parts = {}; // cardHolder, steno pieces, timerRow...

let isOpen = false;
let card = null;          // the recipe being cooked
let cardElement = null;
let illustration = null;
let stageBefore = 0;      // the card's wear before this cook, to animate any change
let servings = null;
let stepIndex = 0;
let checked = new Set();  // which ingredient numbers are ticked off
let timers = [];
let logFormOpen = false;

/* ---------- Small element helpers ---------- */

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeButton(className, text, onClick, label) {
  const button = el('button', className, text);
  button.type = 'button';
  if (label) button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

/* ---------- Building the scene (once, at startup) ---------- */

export function initCook(sceneElement, callbacks) {
  scene = sceneElement;
  onLeave = callbacks.onLeave;

  const background = createAsset('bg-kitchen-cook');
  background.classList.add('cook-bg');

  parts.cardHolder = el('div', 'cook-card');
  // WHY two copies of the stand: the card has to sit IN its slot. The back copy is
  // drawn, then the card, then a front copy that cook.css clips to just the front
  // lip, which hides the card's bottom edge (the same trick as the recipe box).
  const standBack = el('div', 'cook-stand');
  standBack.append(createAsset('obj-card-stand'));
  const standFront = el('div', 'cook-stand cook-stand-front');
  standFront.append(createAsset('obj-card-stand'));

  scene.append(
    background,
    buildWindow(),
    el('div', 'cook-wash'),            // the soft colour of the time of day over everything
    standBack,
    parts.cardHolder,
    standFront,
    buildDoneTag(),
    buildSteno(),
    buildTimerShelf(),
    makeButton('cook-not-today', 'Not today', () => leave(false)),
    makeButton('scene-close', '×', () => leave(false), 'Leave the stove'),
  );
  document.addEventListener('keydown', handleKey);
}

// The view through the window: cook.css places this exactly over the strip of glass
// that shows between the painted curtains.
function buildWindow() {
  const glass = el('div', 'cook-window');
  const day = el('div', 'view view-day');
  day.append(createAsset('view-day'));
  const night = el('div', 'view view-night');
  night.append(createAsset('view-night'));
  glass.append(day, night, el('div', 'cook-sky')); // the sky tint sits over the view
  return glass;
}

function buildDoneTag() {
  const tag = makeButton('cook-done-tag', '', openLogForm, 'Done cooking: write it in the cook log');
  tag.append(createAsset('obj-done-tag'), el('span', 'cook-done-text', 'Done cooking'));
  return tag;
}

function buildSteno() {
  const pad = el('div', 'cook-steno');
  parts.stepCount = el('p', 'steno-count');
  parts.stepText = el('p', 'steno-step');
  parts.stepText.setAttribute('aria-live', 'polite'); // screen readers read each new step
  parts.back = makeButton('steno-arrow', '← Back', () => showStep(stepIndex - 1));
  parts.next = makeButton('steno-arrow', 'Next →', () => showStep(stepIndex + 1));
  const arrows = el('div', 'steno-arrows');
  arrows.append(parts.back, parts.next);

  const page = el('div', 'steno-page');
  page.append(parts.stepCount, parts.stepText, arrows);
  pad.append(createAsset('obj-steno'), page);
  return pad;
}

function buildTimerShelf() {
  const shelf = el('div', 'cook-timers');
  const addButton = makeButton('timer-add', '', addTimer, 'Egg timer: add a timer');
  addButton.append(createAsset('obj-egg-timer'));
  parts.timerRow = el('div', 'timer-row');
  shelf.append(addButton, parts.timerRow);
  return shelf;
}

/* ---------- Starting and leaving ---------- */

/** Starts cooking `recipe`. `picture` is the ill-* illustration for its divider. */
export function openCook(recipe, picture) {
  card = recipe;
  illustration = picture;
  isOpen = true;
  stageBefore = agingStage(card.uses);
  servings = card.servings;
  stepIndex = 0;
  checked = new Set();
  logFormOpen = false;

  // Only "Cook this recipe" counts as a use, and it counts the moment you start.
  card.uses += 1;
  saveCard(card);

  setTimeOfDay();
  drawCard();
  showStep(0);
  scene.hidden = false;
  fadeIn(scene, 0.6);
}

function setTimeOfDay() {
  const now = timeOfDay();
  for (const name of ['dawn', 'day', 'dusk', 'night']) scene.classList.toggle('time-' + name, name === now);
}

/** Back to the table. `wasCooked` is true after Done Cooking, false for "Not today". */
function leave(wasCooked) {
  if (!isOpen) return;
  isOpen = false;
  for (const timer of [...timers]) removeTimer(timer);
  const finished = card;
  fadeOut(scene, () => {
    scene.hidden = true;
    parts.cardHolder.replaceChildren();
    onLeave(finished, wasCooked);
  }, 0.5);
}

function handleKey(event) {
  if (!isOpen) return;
  const typing = event.target.matches('input, textarea, [role="slider"]');
  if (event.key === 'Escape') {
    if (logFormOpen) closeLogForm();
    else leave(false);
  } else if (!typing && !logFormOpen && event.key === 'ArrowRight') {
    showStep(stepIndex + 1);
  } else if (!typing && !logFormOpen && event.key === 'ArrowLeft') {
    showStep(stepIndex - 1);
  }
}

/* ---------- The card in its stand ---------- */

// The card is drawn as it looked BEFORE this cook; any new wear appears when you finish.
function drawCard() {
  const asItWas = { ...card, uses: card.uses - 1 };
  cardElement = buildCard(asItWas, { illustration, loadPhoto: loadPhotoUrl });
  parts.cardHolder.replaceChildren(cardElement);

  makeIngredientsTickable();
  addServingsMarks();
  paginateCard(cardElement);
  document.fonts.ready.then(() => {
    if (isOpen && cardElement.isConnected) { paginateCard(cardElement); underlineStep(); }
  });
}

function ingredientLines() {
  return [...cardElement.querySelectorAll('.card-ingredients li:not(.card-servings)')];
}

function stepLines() {
  return [...cardElement.querySelectorAll('.card-steps li')];
}

/* ----- Tool 1: the ingredient checklist ----- */

// Each ingredient becomes a real button, so it can be tapped or reached with Tab.
function makeIngredientsTickable() {
  ingredientLines().forEach((line, number) => {
    const button = makeButton('cook-ingredient', line.textContent, () => {
      if (checked.has(number)) checked.delete(number);
      else checked.add(number);
      playEffect('fx-pencil');
      markChecked(button, number);
    });
    line.replaceChildren(button);
    markChecked(button, number);
  });
}

function markChecked(button, number) {
  const isChecked = checked.has(number);
  button.classList.toggle('is-checked', isChecked);
  button.setAttribute('aria-pressed', String(isChecked));
}

/* ----- Tool 4: servings ----- */

// "Makes 4" gains a minus and a plus. Cards with no "Makes" number can't be scaled.
function addServingsMarks() {
  const line = cardElement.querySelector('.card-servings');
  if (!line) return;
  parts.servingsText = el('span', 'cook-servings-text');
  line.replaceChildren(
    makeButton('cook-servings-mark', '−', () => changeServings(-1), 'Make less'),
    parts.servingsText,
    makeButton('cook-servings-mark', '+', () => changeServings(1), 'Make more'),
  );
  showServings();
}

// One tap changes a small recipe by 1 serving. A big batch ("Makes 36" cookies)
// moves by half a dozen, so you aren't tapping thirty times to halve it.
function changeServings(direction) {
  const stepSize = card.servings >= 12 ? 6 : 1;
  servings = Math.max(stepSize, servings + direction * stepSize);
  showServings();
}

function showServings() {
  parts.servingsText.textContent = 'Makes ' + servings;
  const scale = servings / card.servings;
  ingredientLines().forEach((line, number) => {
    line.querySelector('button').textContent = formatIngredient(card.ingredients[number], scale);
  });
}

/* ----- Tool 2: one step at a time ----- */

function showStep(index) {
  const steps = card.steps;
  stepIndex = Math.max(0, Math.min(steps.length - 1, index));
  parts.stepCount.textContent = steps.length ? `Step ${stepIndex + 1} of ${steps.length}` : '';
  parts.stepText.textContent = steps.length ? steps[stepIndex] : 'This card has no steps written on it.';
  parts.back.disabled = stepIndex === 0;
  parts.next.disabled = stepIndex >= steps.length - 1;
  underlineStep();
}

// Underlines the current step on the card, turning to the stapled second page if
// that is where the step is written.
function underlineStep() {
  const lines = stepLines();
  lines.forEach((line, number) => line.classList.toggle('is-current', number === stepIndex));
  const current = lines[stepIndex];
  if (current) cardElement.classList.toggle('showing-page-2', Boolean(current.closest('.page-2')));
}

/* ----- Tool 3: egg timers ----- */

function addTimer() {
  if (timers.length >= MAX_TIMERS) {
    showNote('Three timers is all the stove top will hold.');
    return;
  }
  const timer = { minutes: 0, endsAt: null, ticking: null, ringing: false, dragged: false };
  // The dial: a dotted ring round the egg with one knob on it that marks the minutes.
  timer.hand = el('div', 'timer-dial');
  timer.hand.append(el('span', 'timer-knob'));
  timer.readout = el('span', 'timer-readout');
  timer.element = el('div', 'timer');
  timer.element.tabIndex = 0;
  timer.element.setAttribute('role', 'slider');
  timer.element.setAttribute('aria-label', 'Egg timer: drag the dial, or use the arrow keys, to set minutes');
  timer.element.setAttribute('aria-valuemin', '0');
  timer.element.setAttribute('aria-valuemax', String(MAX_MINUTES));
  timer.element.append(timer.hand, createAsset('obj-egg-timer'), timer.readout);

  listenToDial(timer);
  timers.push(timer);
  parts.timerRow.append(timer.element);
  fadeIn(timer.element, 0.4);
  showTimer(timer, 0);
  timer.element.focus({ preventScroll: true });
}

function removeTimer(timer) {
  clearInterval(timer.ticking);
  timer.element.remove();
  timers = timers.filter((other) => other !== timer);
}

// Dragging round the egg sets the minutes, like twisting a real wind-up timer:
// straight up is 0, a quarter turn clockwise is 15, and so on round to 60.
function listenToDial(timer) {
  const dial = timer.element;
  const minutesAt = (event) => {
    const box = dial.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1; // 0 at the top, clockwise
    return Math.round(turn * MAX_MINUTES);
  };

  dial.addEventListener('pointerdown', (event) => {
    if (timer.ringing) return;
    dial.setPointerCapture(event.pointerId); // keep following the finger outside the egg
    timer.dragged = false;
    timer.dragging = true;
  });
  dial.addEventListener('pointermove', (event) => {
    if (!timer.dragging) return;
    timer.dragged = true;
    clearInterval(timer.ticking);
    timer.minutes = minutesAt(event);
    showTimer(timer, timer.minutes * 60);
  });
  dial.addEventListener('pointerup', () => {
    if (timer.ringing) { removeTimer(timer); return; }       // a tap silences a ringing timer
    timer.dragging = false;
    if (timer.dragged) startTimer(timer);
  });
  dial.addEventListener('keydown', (event) => {
    if (timer.ringing) { removeTimer(timer); return; }
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
    if (step) {
      event.preventDefault();
      event.stopPropagation(); // don't also turn the recipe's step
      clearInterval(timer.ticking);
      timer.minutes = Math.max(0, Math.min(MAX_MINUTES, timer.minutes + step));
      showTimer(timer, timer.minutes * 60);
      startTimer(timer);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      removeTimer(timer);
    }
  });
}

function startTimer(timer) {
  clearInterval(timer.ticking);
  if (timer.minutes === 0) { removeTimer(timer); return; } // wound back to nothing: put it away
  // WHY we remember when it ENDS instead of counting down a number: browsers slow
  // timers down in background tabs, but the clock is always right.
  timer.endsAt = Date.now() + timer.minutes * 60 * 1000;
  timer.ticking = setInterval(() => tick(timer), 250);
}

function tick(timer) {
  const secondsLeft = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  showTimer(timer, secondsLeft);
  if (secondsLeft === 0) ring(timer);
}

function showTimer(timer, secondsLeft) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  timer.readout.textContent = `${minutes}:${seconds}`;
  timer.hand.style.transform = `rotate(${(secondsLeft / 60 / MAX_MINUTES) * 360}deg)`;
  timer.element.setAttribute('aria-valuenow', String(Math.ceil(secondsLeft / 60)));
  timer.element.setAttribute('aria-valuetext', `${minutes} minutes ${Number(seconds)} seconds left`);
}

function ring(timer) {
  clearInterval(timer.ticking);
  timer.ringing = true;
  timer.element.classList.add('is-ringing');
  timer.readout.textContent = "Time's up!";
  playEffect('fx-timer-ding');
  showNote('The egg timer is ringing. Tap it to quiet it.', 6);
  if (!motionReduced()) {
    gsap.fromTo(timer.element, { rotation: -5 }, { rotation: 5, duration: 0.12, yoyo: true, repeat: 11, ease: 'sine.inOut',
      onComplete: () => gsap.set(timer.element, { rotation: 0 }) });
  }
}

/* ---------- Done Cooking: the cook log on the back of the card ---------- */

function openLogForm() {
  if (logFormOpen) return;
  logFormOpen = true;
  const back = cardElement.querySelector('.card-back-content');
  back.replaceChildren(buildLogForm());
  flipCard(cardElement);
  back.querySelector('textarea').focus({ preventScroll: true });
}

function closeLogForm() {
  logFormOpen = false;
  flipCard(cardElement);
}

function buildLogForm() {
  const form = el('form', 'cook-log-form');

  const date = el('input');
  date.type = 'date';
  date.value = todayAsText();
  const photo = el('input');
  photo.type = 'file';
  photo.accept = 'image/*';
  const notes = el('textarea');
  notes.rows = 3;
  notes.placeholder = 'e.g. Cook at 350 for 6 hours instead';

  const save = makeButton('pencil-mark mark-cook', 'Save and file it', () => {});
  save.type = 'submit';
  const buttons = el('div', 'cook-log-buttons');
  buttons.append(makeButton('pencil-mark', 'Not yet', closeLogForm), save);

  form.append(
    el('h3', 'cook-log-heading', 'Cooked it!'),
    labelled('When', date),
    labelled('A photo (optional)', photo),
    labelled('Notes', notes),
    buttons,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveLogEntry(date.value || todayAsText(), photo.files[0], notes.value.trim());
  });
  return form;
}

function labelled(text, input) {
  const label = el('label', 'cook-log-field');
  label.append(el('span', '', text), input);
  return label;
}

// "2026-11-14" in the device's own time zone (toISOString would give the UTC date).
function todayAsText() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function saveLogEntry(date, photoFile, notes) {
  const photoId = photoFile ? await savePhoto(await shrinkPhoto(photoFile)) : null;
  card.cookLog.push({ date, photoId, notes });
  await saveCard(card);

  logFormOpen = false;
  flipCard(cardElement); // turn back to the front to see the card age
  const delay = showNewWear() ? 2200 : 900;
  setTimeout(() => leave(true), delay);
}

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => {
      const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(picture.naturalWidth, picture.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(picture.naturalWidth * scale);
      canvas.height = Math.round(picture.naturalHeight * scale);
      canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    };
    picture.onerror = () => reject(new Error('That file is not a picture'));
    picture.src = URL.createObjectURL(file);
  });
}

/**
 * If this cook pushed the card into a new stage of wear, the new marks appear now:
 * stains bloom outward and the paper softens. Returns true if anything changed.
 */
function showNewWear() {
  const stageNow = agingStage(card.uses);
  if (stageNow === stageBefore) return false;

  const front = cardElement.querySelector('.card-front');
  const oldLayer = front.querySelector('.card-aging');
  const newLayer = buildAgingLayer(card);
  oldLayer.replaceWith(newLayer);
  cardElement.classList.replace('stage-' + stageBefore, 'stage-' + stageNow);

  const newMarks = [...newLayer.children].slice(oldLayer.children.length);
  if (motionReduced()) gsap.from(newMarks, { opacity: 0, duration: 1.2 });
  else gsap.from(newMarks, { opacity: 0, scale: 0.5, duration: 1.4, stagger: 0.25, ease: 'power2.out' });
  return true;
}
