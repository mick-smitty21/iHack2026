/*
 * box.js - scene 2: the open recipe box. Lid, dividers, riffling through the cards,
 * and holding one card up to read, flip, edit, move or throw out.
 *
 * Talks to: storage.js (cards and dividers), card.js (draws the card and edit form),
 *           aging.js (wear stage), audio.js (sounds, quieter music), assets.js,
 *           panels.js (notes), motion.js. main.js opens it from the table.
 *
 * Say it to a judge: "Riffling is driven by one number: how far through the deck you
 * are. The wheel or your finger pushes that number, friction slows it down, and every
 * card works out its own position and tilt from how far it is from that number."
 */

import { createAsset } from './assets.js';
import {
  getCards, getDividers, saveCard, deleteCard, addDivider, loadPhotoUrl,
} from './storage.js';
import { buildCard, buildEditForm, flipCard, paginateCard, turnPage } from './card.js';
import { agingStage } from './aging.js';
import { playEffect, setCardFocused } from './audio.js';
import { showNote } from './panels.js';
import { motionReduced, fadeIn, fadeOut } from './motion.js';

const FAVORITES_ID = 'favorites';
const CARDS_VISIBLE_BEHIND = 11;  // how many title strips you can see past the front card
const STRIP_PERCENT = 8.5;        // how much of each card behind peeks out (% of card height)
const FRICTION = 0.92;            // each frame the riffle keeps 92% of its speed
const WHEEL_PUSH = 0.0009;        // how hard one wheel "click" pushes the deck

let scene;          // #scene-box
let tableScene;     // #scene-table (we zoom it during the opening)
let onClosed;       // main.js callback: the box has finished closing
const parts = {};   // stage, lid, rail, deck, focusLayer

let isOpen = false;
let items = [];        // everything in the deck, front to back: dividers and cards
let position = 0;      // which item is at the front; fractions mean "between two"
let velocity = 0;      // items per frame
let isAnimating = false;
let drag = null;       // { lastY, moved } while a finger or mouse is dragging
let lastShuffleSound = 0;

let focused = null;    // { card, element } while a card is held up
let slip = null;       // the little confirm / choose note, when showing
let isEditing = false;

/* ---------- Building the scene (once, at startup) ---------- */

export function initBox(sceneElement, tableSceneElement, callbacks) {
  scene = sceneElement;
  tableScene = tableSceneElement;
  onClosed = callbacks.onClosed;

  const background = createAsset('bg-box-closeup');
  background.classList.add('box-bg');

  parts.lid = makePart('box-lid', createAsset('obj-box-lid'));
  parts.rail = makePart('tab-rail');
  parts.deck = makePart('deck');
  parts.stage = makePart('box-stage',
    parts.lid,
    makePart('box-body', createAsset('obj-box-body-open')),
    parts.rail,
    parts.deck,
  );
  parts.focusLayer = makePart('focus-layer');

  scene.append(background, parts.stage, parts.focusLayer, makeCloseButton());
  listenForRiffling();
  document.addEventListener('keydown', handleKey);
}

function makePart(className, ...children) {
  const part = document.createElement('div');
  part.className = className;
  part.append(...children);
  return part;
}

function makeButton(className, text, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

function makeCloseButton() {
  const button = makeButton('scene-close', '×', closeBox);
  button.setAttribute('aria-label', 'Close the recipe box');
  return button;
}

/* ---------- Opening and closing ---------- */

export function openBox() {
  if (isOpen) return;
  isOpen = true;
  rebuildDeck();
  jumpTo(firstCardIndex(), false);
  scene.hidden = false;
  playEffect('fx-lid');

  if (motionReduced()) {
    fadeIn(scene, 0.6);
    playEffect('fx-shuffle');
    finishOpening();
    return;
  }

  // About 1.2 seconds: zoom toward the box, fade the close-up in, swing the lid, raise the tabs.
  gsap.timeline({ onComplete: finishOpening })
    .to(tableScene, {
      scale: 1.7, transformOrigin: '66% 64%', filter: 'blur(4px) brightness(0.6)',
      duration: 0.6, ease: 'power2.in',
    }, 0)
    .fromTo(scene, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.35)
    .fromTo(parts.lid, { rotationX: 84 }, { rotationX: 6, duration: 0.6, ease: 'power2.out' }, 0.45)
    .add(() => playEffect('fx-shuffle'), 0.8)
    .fromTo(parts.rail.children, { yPercent: 130, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.35, stagger: 0.03, ease: 'power2.out' }, 0.8);
}

function finishOpening() {
  tableScene.hidden = true; // WHY: hidden things can't be reached with Tab
  focusFrontItem();
}

export function closeBox() {
  if (!isOpen) return;
  if (focused) unfocusCard(false);
  isOpen = false;
  playEffect('fx-lid-close');
  tableScene.hidden = false;

  const finish = () => { scene.hidden = true; onClosed(); };
  if (motionReduced()) {
    gsap.set(tableScene, { scale: 1, filter: 'none' });
    fadeOut(scene, finish, 0.5);
    return;
  }
  gsap.timeline({ onComplete: finish })
    .to(parts.lid, { rotationX: 84, duration: 0.4, ease: 'power2.in' }, 0)
    .to(scene, { opacity: 0, duration: 0.4 }, 0.3)
    .to(tableScene, { scale: 1, filter: 'blur(0px) brightness(1)', duration: 0.6, ease: 'power2.out' }, 0.3)
    .set(tableScene, { clearProps: 'filter,transform' });
}

/* ---------- What's in the deck ---------- */

// The deck, front to back: Favorites, then each divider followed by its cards,
// then the blank "+ new" divider at the very back.
function listDeckItems() {
  const cards = getCards();
  const list = [{ kind: 'divider', id: FAVORITES_ID, label: 'Favorites' }];
  for (const card of cards.filter((c) => c.favorite)) list.push({ kind: 'card', card });

  for (const divider of getDividers()) {
    list.push({ kind: 'divider', id: divider.id, label: divider.label });
    for (const card of cards.filter((c) => c.dividerId === divider.id)) list.push({ kind: 'card', card });
  }
  list.push({ kind: 'divider', id: 'new', label: '+ new' });
  return list;
}

/** Throws away the deck's elements and builds them again from the saved cards. */
function rebuildDeck() {
  items = listDeckItems();
  parts.deck.replaceChildren();
  parts.rail.replaceChildren();

  items.forEach((item, index) => {
    item.element = item.kind === 'card' ? makeDeckCard(item.card, index) : makeDeckDivider(item, index);
    item.element.style.zIndex = String(items.length - index); // front items cover back ones
    parts.deck.append(item.element);
    if (item.kind === 'divider') parts.rail.append(makeRailTab(item, index));
  });

  position = clampPosition(position);
  layoutDeck();
}

// In the deck a card is just its paper and its title strip. The full card is only
// built when you pick it up, which keeps riffling smooth with lots of cards.
function makeDeckCard(card, index) {
  const button = makeButton(`deck-item deck-card font-${card.font} stage-${agingStage(card.uses)}`, '', () => {
    if (!drag || !drag.moved) focusCard(card);
  });
  button.setAttribute('aria-label', 'Recipe card: ' + (card.title || 'Untitled recipe'));
  button.addEventListener('focus', () => bringIntoView(index));

  const title = document.createElement('span');
  title.className = 'deck-title';
  title.textContent = card.title || 'Untitled recipe';
  button.append(title);
  return button;
}

function makeDeckDivider(item, index) {
  const divider = makePart('deck-item deck-divider');
  divider.style.setProperty('--tab-slot', String(index % 3)); // stagger tabs left, middle, right
  const tab = document.createElement('span');
  tab.className = 'deck-tab';
  tab.textContent = item.label;
  divider.append(createAsset('divider-tab'), tab);
  return divider;
}

/* ---------- The tab rail: every divider, always in reach ---------- */

function makeRailTab(item, index) {
  if (item.id === 'new') return makeNewDividerTab();
  const tab = makeButton('rail-tab', item.label, () => jumpTo(index));
  tab.setAttribute('aria-label', 'Jump to ' + item.label);
  return tab;
}

function makeNewDividerTab() {
  const tab = makeButton('rail-tab rail-tab-new', '+ new', () => {
    tab.replaceWith(makeNewDividerInput());
  });
  tab.setAttribute('aria-label', 'Add a new divider');
  return tab;
}

// Clicking "+ new" swaps the tab for a text box written in the same handwriting.
function makeNewDividerInput() {
  const input = document.createElement('input');
  input.className = 'rail-tab rail-tab-input';
  input.setAttribute('aria-label', 'Name for the new divider');
  input.maxLength = 24;

  let finished = false;
  const finish = (shouldSave) => {
    if (finished) return;
    finished = true;
    const label = input.value.trim();
    const divider = shouldSave && label ? addDivider(label) : null;
    rebuildDeck();
    if (divider) jumpTo(items.findIndex((item) => item.id === divider.id));
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') { event.stopPropagation(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  setTimeout(() => input.focus(), 0);
  return input;
}

/* ---------- Riffling ---------- */

function clampPosition(value) {
  return Math.max(0, Math.min(items.length - 1, value));
}

function firstCardIndex() {
  const index = items.findIndex((item) => item.kind === 'card');
  return index === -1 ? 0 : index;
}

/** Places every deck item according to how far it is from the front. */
function layoutDeck() {
  const gentle = motionReduced();
  items.forEach((item, index) => {
    const distance = index - position; // 0 = at the front, 3 = three cards back, -1 = flicked past
    const style = item.element.style;

    // WHY: a card that has been flicked all the way past is invisible but would still
    // sit on top and swallow clicks meant for the front card, so hide it completely.
    if (distance > CARDS_VISIBLE_BEHIND || distance < -0.98) {
      style.visibility = 'hidden';
      return;
    }
    style.visibility = 'visible';

    if (distance >= 0) {
      // Standing in the box: each card back sits a strip higher and a touch smaller.
      style.transform = `translateY(${-distance * STRIP_PERCENT}%) scale(${1 - distance * 0.012})`;
      style.opacity = distance > CARDS_VISIBLE_BEHIND - 1 ? String(CARDS_VISIBLE_BEHIND - distance) : '1';
    } else {
      // Flicked forward by the thumb: it tips toward you, drops away and fades.
      const flick = Math.min(1, -distance);
      const tilt = gentle ? 0 : -55 * flick;
      const drop = gentle ? 0 : 70 * flick;
      style.transform = `translateY(${drop}%) rotateX(${tilt}deg)`;
      style.opacity = String(1 - flick);
    }
  });
}

function startAnimating() {
  if (isAnimating) return;
  isAnimating = true;
  requestAnimationFrame(animateRiffle);
}

// One frame of momentum: move, slow down, and when nearly stopped, settle on a card.
function animateRiffle() {
  if (!drag) {
    position += velocity;
    velocity *= FRICTION;

    const nearest = Math.round(position);
    if (Math.abs(velocity) < 0.004) {
      velocity = 0;
      position += (nearest - position) * 0.2;
      if (Math.abs(nearest - position) < 0.003) position = nearest;
    }
    if (position !== clampPosition(position)) {
      position = clampPosition(position);
      velocity = 0;
    }
  }
  layoutDeck();
  playShuffleSoundIfMoving();

  const settled = !drag && velocity === 0 && Number.isInteger(position);
  if (settled) isAnimating = false;
  else requestAnimationFrame(animateRiffle);
}

function playShuffleSoundIfMoving() {
  const now = Date.now();
  if (Math.abs(velocity) > 0.05 && now - lastShuffleSound > 1500) {
    lastShuffleSound = now;
    playEffect('fx-shuffle');
  }
}

/** Glides to an item (a divider tab was clicked, or the arrow keys were used). */
function jumpTo(index, animate = true) {
  const target = clampPosition(index);
  velocity = 0;
  if (!animate || motionReduced()) {
    position = target;
    layoutDeck();
    return;
  }
  gsap.to({ value: position }, {
    value: target, duration: 0.6, ease: 'power2.out',
    onUpdate() { position = this.targets()[0].value; layoutDeck(); },
  });
}

// Keyboard users Tab from card to card; make sure the focused one is visible.
function bringIntoView(index) {
  if (Math.round(position) !== index) jumpTo(index);
}

function listenForRiffling() {
  const deck = parts.deck;

  // Mouse wheel and trackpad.
  scene.addEventListener('wheel', (event) => {
    if (focused) return;
    event.preventDefault();
    if (motionReduced()) { stepBy(Math.sign(event.deltaY)); return; }
    velocity += event.deltaY * WHEEL_PUSH;
    startAnimating();
  }, { passive: false });

  // Finger (or mouse) drag: the deck follows directly, then coasts when you let go.
  deck.addEventListener('pointerdown', (event) => {
    drag = { lastY: event.clientY, moved: false, lastMove: 0 };
    velocity = 0;
  });
  window.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const stripPixels = stripHeightInPixels();
    const change = (event.clientY - drag.lastY) / stripPixels; // down = forward through the deck
    if (Math.abs(event.clientY - drag.lastY) > 4) drag.moved = true;
    if (!drag.moved) return;
    drag.lastY = event.clientY;
    drag.lastMove = change;
    position = clampPosition(position + change);
    startAnimating();
  });
  const endDrag = () => {
    if (!drag) return;
    velocity = motionReduced() ? 0 : drag.lastMove; // keep going at the speed of the last move
    // WHY: keep `drag` alive for one tick so the click that follows a drag can see
    // drag.moved and not open a card by accident.
    const finishedDrag = drag;
    setTimeout(() => { if (drag === finishedDrag) drag = null; }, 0);
    startAnimating();
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
}

function stripHeightInPixels() {
  const anyItem = items[0] && items[0].element;
  return anyItem ? (anyItem.offsetHeight * STRIP_PERCENT) / 100 : 30;
}

let lastStepTime = 0;
function stepBy(direction) {
  const now = Date.now();
  if (now - lastStepTime < 120) return; // one card at a time, not a blur
  lastStepTime = now;
  jumpTo(Math.round(position) + direction);
}

function focusFrontItem() {
  const front = items[Math.round(position)];
  if (front && front.kind === 'card') front.element.focus({ preventScroll: true });
}

/* ---------- Keyboard ---------- */

function handleKey(event) {
  if (!isOpen) return;
  if (event.key === 'Escape') { stepBack(); return; }
  if (focused || isTyping(event.target)) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); stepBy(1); }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1); }
}

function isTyping(target) {
  return target.matches('input, textarea');
}

// Esc backs out one layer at a time: the slip, then editing, then the card, then the box.
function stepBack() {
  if (slip) closeSlip();
  else if (isEditing) showFocusedCard();
  else if (focused) unfocusCard();
  else closeBox();
}

/* ---------- A card in focus ---------- */

function illustrationFor(card) {
  if (card.dividerId === 'cakes-pies') return /pie/i.test(card.title) ? 'ill-pie' : 'ill-cake';
  const divider = getDividers().find((d) => d.id === card.dividerId);
  return divider ? divider.illustration : null;
}

function focusCard(card) {
  focused = { card, element: null };
  scene.classList.add('has-focus');
  parts.stage.inert = true;      // the deck behind can't be clicked or tabbed to
  setCardFocused(true);          // music drops to 40%
  showFocusedCard();

  const holder = parts.focusLayer.firstElementChild;
  if (motionReduced()) fadeIn(holder, 0.5);
  else gsap.fromTo(holder, { scale: 0.6, yPercent: 30, opacity: 0 },
    { scale: 1, yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });
}

/** (Re)draws the held-up card and its pencil marks from the saved data. */
function showFocusedCard() {
  const { card } = focused;
  isEditing = false;
  closeSlip();

  const element = buildCard(card, {
    illustration: illustrationFor(card),
    loadPhoto: loadPhotoUrl,
    onNotesChange: (text) => { card.notes = text; saveCard(card); },
  });
  focused.element = element;

  const holder = makePart('focus-holder', element, makePencilMarks(card, element));
  parts.focusLayer.replaceChildren(holder);

  paginateCard(element);
  // WHY: the handwriting fonts may still be loading the first time; measure again after.
  document.fonts.ready.then(() => {
    if (focused && focused.element === element) {
      holder.querySelector('.mark-page').hidden = !paginateCard(element);
    }
  });
  holder.querySelector('.mark-page').hidden = !element.classList.contains('has-second-page');
  holder.querySelector('.pencil-mark').focus({ preventScroll: true });
}

// The controls: handwritten pencil marks down the card's edge.
function makePencilMarks(card, element) {
  const marks = makePart('pencil-marks');

  const pageMark = makeButton('pencil-mark mark-page', 'Next page', () => {
    pageMark.textContent = turnPage(element) ? 'First page' : 'Next page';
  });
  const heartMark = makeButton('pencil-mark', card.favorite ? '♥ Favorite' : '♡ Favorite', () => {
    card.favorite = !card.favorite;
    saveCard(card);
    showFocusedCard();
  });
  heartMark.setAttribute('aria-pressed', String(card.favorite));

  marks.append(
    makeButton('pencil-mark', 'Turn over', () => flipCard(element)),
    pageMark,
    makeButton('pencil-mark mark-cook', 'Cook this recipe', () => {
      showNote('The stove is not lit yet. Cook mode arrives in milestone 4.');
    }),
    heartMark,
    makeIconMark('obj-pencil', 'Edit', () => editFocusedCard()),
    makeButton('pencil-mark', 'Move to...', () => chooseDivider(card)),
    makeIconMark('obj-wastebasket', 'Throw out', () => confirmDelete(card)),
    makeButton('pencil-mark', 'Put it back', () => unfocusCard()),
  );
  return marks;
}

function makeIconMark(assetId, text, onClick) {
  const button = makeButton('pencil-mark has-icon', '', onClick);
  const label = document.createElement('span');
  label.textContent = text;
  button.append(createAsset(assetId), label);
  return button;
}

function unfocusCard(returnFocus = true) {
  if (!focused) return;
  const cardId = focused.card.id;
  focused = null;
  isEditing = false;
  closeSlip();
  scene.classList.remove('has-focus');
  parts.stage.inert = false;
  setCardFocused(false);
  parts.focusLayer.replaceChildren();

  rebuildDeck(); // the card may have changed title, divider or favourite
  const index = items.findIndex((item) => item.kind === 'card' && item.card.id === cardId);
  if (index !== -1) jumpTo(index, false);
  if (returnFocus) focusFrontItem();
}

/* ---------- Edit, move, delete ---------- */

function editFocusedCard() {
  const { card } = focused;
  isEditing = true;
  const form = buildEditForm(card, {
    onSave: (changes) => {
      Object.assign(card, changes);
      saveCard(card);
      showFocusedCard();
    },
    onCancel: showFocusedCard,
  });
  parts.focusLayer.replaceChildren(makePart('focus-holder', form));
  form.querySelector('input').focus();
}

function chooseDivider(card) {
  const choices = getDividers().map((divider) => ({
    text: divider.label + (divider.id === card.dividerId ? ' (here now)' : ''),
    action: () => {
      card.dividerId = divider.id;
      saveCard(card);
      showFocusedCard();
      showNote('Filed under ' + divider.label + '.');
    },
  }));
  choices.push({ text: 'Never mind', action: closeSlip });
  openSlip('Move to...', choices);
}

function confirmDelete(card) {
  openSlip('Throw this card out?', [
    { text: 'No, keep it', action: closeSlip },
    {
      text: 'Yes, throw it out',
      action: () => {
        deleteCard(card.id);
        unfocusCard();
      },
    },
  ]);
}

// A slip is a small note with a question and a few handwritten answers.
function openSlip(question, choices) {
  closeSlip();
  slip = makePart('slip');
  slip.setAttribute('role', 'dialog');
  slip.setAttribute('aria-label', question);

  const heading = document.createElement('p');
  heading.className = 'slip-question';
  heading.textContent = question;
  slip.append(heading);
  for (const choice of choices) slip.append(makeButton('pencil-mark', choice.text, choice.action));

  parts.focusLayer.append(slip);
  parts.focusLayer.firstElementChild.inert = true;
  fadeIn(slip, 0.3);
  slip.querySelector('button').focus();
}

function closeSlip() {
  if (!slip) return;
  slip.remove();
  slip = null;
  const holder = parts.focusLayer.firstElementChild;
  if (holder) {
    holder.inert = false;
    const firstMark = holder.querySelector('.pencil-mark');
    if (firstMark) firstMark.focus({ preventScroll: true });
  }
}
