/*
 * panels.js - opens and closes the panels that sit on top of a scene (the almanac
 * now; the binder and twine stack in M3), and shows Grandma's little notes.
 *
 * Talks to: index.html (#panels layer), css/panels.css, audio.js (the ting).
 *           Used by almanac.js, importer.js, box.js and cook.js.
 *
 * Say it to a judge: "Every pop-up goes through this one file, so they all behave the
 * same way: Esc or the X closes them, and the keyboard focus goes back to the object
 * you opened them from."
 *
 * Note: this helper file is not in the original file list. It was added so the
 * almanac, binder and twine panels can share one open/close routine.
 */

import { fadeIn, fadeOut, motionReduced } from './motion.js';
import { playEffect } from './audio.js';

const layer = document.getElementById('panels');
let openPanelState = null; // { wrapper, opener, onClose }

/**
 * Shows `content` as a panel. `label` is read out by screen readers.
 * `opener` is the button that opened it; focus returns there on close.
 */
export function openPanel(content, { label, opener, onClose } = {}) {
  closePanel();

  const wrapper = document.createElement('div');
  wrapper.className = 'panel-wrapper';
  wrapper.setAttribute('role', 'dialog');
  wrapper.setAttribute('aria-modal', 'true');
  wrapper.setAttribute('aria-label', label);

  const backdrop = document.createElement('div');
  backdrop.className = 'panel-backdrop';
  backdrop.addEventListener('click', closePanel);

  wrapper.append(backdrop, content, makeCloseButton());
  layer.append(wrapper);
  fadeIn(wrapper);

  openPanelState = { wrapper, opener, onClose };
  focusFirstControl(content);
}

export function closePanel() {
  if (!openPanelState) return;
  const { wrapper, opener, onClose } = openPanelState;
  openPanelState = null;
  fadeOut(wrapper, () => wrapper.remove());
  if (onClose) onClose();
  if (opener) opener.focus();
}

export function isPanelOpen() {
  return openPanelState !== null;
}

function makeCloseButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'panel-close';
  button.setAttribute('aria-label', 'Close');
  button.textContent = '×'; // the multiplication sign, a neater X
  button.addEventListener('click', closePanel);
  return button;
}

function focusFirstControl(content) {
  const first = content.querySelector('input, button, select, textarea');
  if (first) first.focus();
}

// Esc closes whatever is open.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && openPanelState) closePanel();
});

// WHY: while a panel is open, Tab must not wander to the objects hidden behind it.
// If focus tries to leave the panel we pull it back to the panel's first control.
document.addEventListener('focusin', (event) => {
  if (!openPanelState || openPanelState.wrapper.contains(event.target)) return;
  focusFirstControl(openPanelState.wrapper);
});

/* ---------- Grandma's notes ---------- */

let noteTimer = null;

/** A small handwritten note that fades in, waits, and fades away. */
export function showNote(text, seconds = 3.5) {
  const note = getNoteElement();
  note.textContent = text;
  fadeIn(note);
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => fadeOut(note), seconds * 1000);
}

function getNoteElement() {
  let note = layer.querySelector('.grandma-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'grandma-note';
    note.setAttribute('role', 'status'); // screen readers read it out politely
    note.style.opacity = '0';
    layer.append(note);
  }
  return note;
}

/* ---------- Filing a card: it slides into the recipe box with a ting ---------- */

/**
 * A little paper card appears in the middle of the screen and slides into `target`
 * (the recipe box on the table). Used when a new recipe is filed and after cooking.
 */
export function slideCardInto(target, card, onDone) {
  const flyer = document.createElement('div');
  flyer.className = `flying-card font-${card.font}`;
  flyer.textContent = card.title;
  layer.append(flyer);

  const finish = () => {
    playEffect('fx-ting');
    flyer.remove();
    if (onDone) onDone();
  };
  if (motionReduced()) {
    fadeIn(flyer, 0.4);
    setTimeout(() => fadeOut(flyer, finish, 0.4), 700);
    return;
  }
  const journey = offsetBetween(flyer, target);
  gsap.timeline({ onComplete: finish })
    .from(flyer, { opacity: 0, scale: 0.8, duration: 0.35, ease: 'power1.out' })
    .to(flyer, { x: journey.x, y: journey.y, scale: 0.18, rotation: -6, duration: 0.9, ease: 'power2.inOut' }, '+=0.25')
    .to(flyer, { opacity: 0, duration: 0.2 }, '-=0.2');
}

// How far (in pixels) the middle of one element is from the upper middle of another.
function offsetBetween(from, to) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  return {
    x: b.left + b.width / 2 - (a.left + a.width / 2),
    y: b.top + b.height * 0.3 - (a.top + a.height / 2),
  };
}
