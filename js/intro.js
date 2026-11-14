/*
 * intro.js - the first-visit tour: a few handwritten notes with pencil arrows that
 * point out the vitals, then get out of the way.
 *
 * Talks to: almanac.js (reads and saves which steps have been seen), table.js (asks
 *           where an object is on screen), motion.js (reduced motion).
 *           main.js, box.js and cook.js each call one function here to say "the lamp
 *           was lit", "the box opened" or "cooking started".
 *
 * Say it to a judge: "The first time you visit, a few paper notes point at the things
 * you must know about. Each note measures where its object is on screen and draws an
 * arrow to it, so if we move the object the note follows. They never block a click,
 * and a saved flag means you only see them once."
 */

import { getSettings, updateSettings } from './almanac.js';
import { getClickable } from './table.js';
import { motionReduced } from './motion.js';

// Each note names the object it points at and where the note sits relative to that
// object's centre: `across` and `down` are percentages of the stage (negative = left / up).
const LAMP_NOTES = [
  { target: 'lamp', text: 'Pull the chain to come in.', across: 13, down: -11 },
];
const TABLE_NOTES = [
  { target: 'box',      text: 'Your recipes live in here.',                       across: 1,   down: -18 },
  { target: 'binder',   text: 'Add a recipe: a link, a photo, or write it out.',  across: -1,  down: 17 },
  { target: 'twine',    text: 'Save your whole box to a file, or load one.',      across: 3,   down: 15 },
  { target: 'calendar', text: 'Sound, light and weather.',                        across: 17,  down: -9 },
];
const ENCOURAGEMENT = 'Everything else is yours to find. Go on, poke around.';
const BOX_HINT = 'Scroll or drag to riffle. Tap a card to pick it up.';
const COOK_HINT = 'Tap an ingredient to tick it off.';

const TABLE_NOTES_SECONDS = 15;   // how long the table notes stay if nothing is touched
const HINT_SECONDS = 6;
const NOT_SEEN = { lamp: false, table: false, box: false, cook: false };
const SVG = 'http://www.w3.org/2000/svg';

let stage;          // the 16:9 stage; notes are placed by percentages of it
let layer;          // holds the notes; it never catches clicks (see panels.css)
let arrows;         // one <svg> stretched over the stage, for all the arrows
let announcer;      // a hidden line of text that screen readers read out, once per step
let showing = [];   // the notes and arrows on screen right now
let hideTimer = null;
let stopListening = null;   // removes the "first click or key" listeners
let pendingStep = null;     // a step that is waiting for the lamp to finish coming on

/* ---------- Setting up ---------- */

/** main.js calls this once the table is built. Shows the lamp note on a first visit. */
export function initIntro(stageElement) {
  stage = stageElement;
  layer = document.createElement('div');
  layer.className = 'intro-layer';

  arrows = document.createElementNS(SVG, 'svg');
  arrows.setAttribute('class', 'intro-arrows');
  arrows.setAttribute('aria-hidden', 'true');

  announcer = document.createElement('p');
  announcer.className = 'intro-announcer';
  announcer.setAttribute('role', 'status');   // read out politely, never interrupting

  layer.append(arrows, announcer);
  stage.querySelector('#panels').before(layer);   // above the scenes, below any panel

  if (!seen().lamp) showNotes(LAMP_NOTES);
}

function seen() {
  return getSettings().introSeen;
}

function markSeen(...steps) {
  const introSeen = { ...seen() };
  for (const step of steps) introSeen[step] = true;
  updateSettings({ introSeen });
}

/* ---------- The moments other files tell us about ---------- */

/** main.js: the lamp was switched on or off. */
export function introLampChanged(isLit) {
  clearNotes();
  clearTimeout(pendingStep);
  if (!isLit || seen().table) return;
  // WHY the wait: the room takes about a second and a half to light up, and the
  // notes should arrive in a lit kitchen, not on top of the fade.
  pendingStep = setTimeout(showTableNotes, 1600);
}

/** almanac.js (through main.js): "Show me around again". */
export function replayIntro() {
  updateSettings({ introSeen: { ...NOT_SEEN } });
  showTableNotes();
}

/** box.js: the recipe box was opened. */
export function introBoxOpened() {
  if (!seen().box) showHintOnce('box', BOX_HINT, 1400);
}

/** cook.js: cooking started. */
export function introCookStarted() {
  if (!seen().cook) showHintOnce('cook', COOK_HINT, 800);
}

/* ---------- Showing a step ---------- */

function showTableNotes() {
  showNotes(TABLE_NOTES, ENCOURAGEMENT);
  // Marked as seen the moment it is shown, so a reload part-way through won't repeat it.
  markSeen('lamp', 'table');
  fadeAwayAfter(TABLE_NOTES_SECONDS);
}

function showHintOnce(step, text, delayMs) {
  clearNotes();
  clearTimeout(pendingStep);
  pendingStep = setTimeout(() => {
    showing.push(addLooseNote(text, 'intro-hint'));
    announce([text]);
    revealOneByOne();
    markSeen(step);
    fadeAwayAfter(HINT_SECONDS);
  }, delayMs);
}

// Puts a set of notes on screen, each with an arrow to its object, plus an optional
// last line with no arrow.
function showNotes(notes, lastLine) {
  clearNotes();
  for (const note of notes) {
    const paper = addPointingNote(note);
    showing.push(paper, drawArrow(paper, getClickable(note.target)));
  }
  if (lastLine) showing.push(addLooseNote(lastLine, 'intro-encouragement'));
  announce([...notes.map((note) => note.text), lastLine]);
  revealOneByOne();
}

// Screen readers hear the whole step as one sentence; the paper notes themselves are
// hidden from them so nothing is read twice.
function announce(lines) {
  announcer.textContent = lines.filter(Boolean).join(' ');
}

function revealOneByOne() {
  const papers = showing.filter((element) => element.tagName === 'P');
  const lines = showing.filter((element) => element.tagName !== 'P');
  gsap.fromTo(papers, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.45, ease: 'power1.out' });
  if (!lines.length) return;   // a hint has no arrows
  if (motionReduced()) {
    gsap.fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.45 });
    return;
  }
  // Each arrow is "drawn on" just after its note appears. panels.css makes the line
  // one dash exactly as long as itself; sliding that dash into place draws the line.
  gsap.fromTo(lines, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.45, delay: 0.35, ease: 'power1.inOut' });
}

/* ---------- Getting out of the way ---------- */

// The notes leave after `seconds`, or the moment the visitor clicks, taps or presses a key.
function fadeAwayAfter(seconds) {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(clearNotes, seconds * 1000);

  const onFirstTouch = () => clearNotes();
  // WHY the short wait: the click or key press that brought the notes up (lighting the
  // lamp, "Show me around again") is still finishing, and must not also dismiss them.
  const startListening = setTimeout(() => {
    window.addEventListener('pointerdown', onFirstTouch, true);
    window.addEventListener('keydown', onFirstTouch, true);
    window.addEventListener('wheel', onFirstTouch, { capture: true, passive: true });
  }, 500);
  stopListening = () => {
    clearTimeout(startListening);
    window.removeEventListener('pointerdown', onFirstTouch, true);
    window.removeEventListener('keydown', onFirstTouch, true);
    window.removeEventListener('wheel', onFirstTouch, true);
  };
}

function clearNotes() {
  clearTimeout(hideTimer);
  if (stopListening) stopListening();
  stopListening = null;

  const leaving = showing;
  showing = [];
  if (!leaving.length) return;
  gsap.killTweensOf(leaving);
  gsap.to(leaving, { opacity: 0, duration: 0.5, onComplete: () => leaving.forEach((element) => element.remove()) });
}

/* ---------- Making a note ---------- */

function makePaper(text, extraClass) {
  const paper = document.createElement('p');
  paper.className = 'intro-note ' + extraClass;
  paper.setAttribute('aria-hidden', 'true');
  paper.textContent = text;
  paper.style.opacity = '0';
  layer.append(paper);
  return paper;
}

// A note with no arrow; panels.css decides where it sits.
function addLooseNote(text, className) {
  return makePaper(text, className);
}

// A note placed beside its object. Its centre is the object's centre moved by the
// note's `across` and `down`, kept inside the stage.
function addPointingNote({ target, text, across, down }) {
  const paper = makePaper(text, 'intro-pointing');
  const object = boxOnStage(getClickable(target));
  const centreX = (object.left + object.right) / 2 + across;
  const centreY = (object.top + object.bottom) / 2 + down;
  paper.style.left = clamp(centreX, 9, 91) + '%';
  paper.style.top = clamp(centreY, 5, 95) + '%';
  paper.style.setProperty('--tilt', (across > 0 ? 1.5 : -1.5) + 'deg');
  return paper;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Where an element is, in percentages of the stage. */
function boxOnStage(element) {
  const frame = stage.getBoundingClientRect();
  const box = element.getBoundingClientRect();
  return {
    left: (box.left - frame.left) / frame.width * 100,
    right: (box.right - frame.left) / frame.width * 100,
    top: (box.top - frame.top) / frame.height * 100,
    bottom: (box.bottom - frame.top) / frame.height * 100,
  };
}

/* ---------- Drawing an arrow ---------- */

// A gently curved pencil line from the edge of the note to the edge of the object,
// finished with a two-stroke arrowhead.
// WHY the drawing's own grid (viewBox) is set to the stage's size in pixels right now:
// the sums can then be done in plain pixels, and because the stage always keeps its
// 16:9 shape, the arrows simply scale with it if the window is resized afterwards.
function drawArrow(paper, object) {
  const frame = stage.getBoundingClientRect();
  const from = pixelBox(paper, frame);
  const to = pixelBox(object, frame);

  const start = edgePoint(from, centre(to), 6);
  const end = edgePoint(shrunk(to, 0.75), centre(from), 6);
  const bend = bendPoint(start, end);
  const head = arrowHead(bend, end, Math.max(9, frame.width * 0.011));

  arrows.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
  const at = (point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('class', 'intro-arrow');
  path.setAttribute('pathLength', '1');   // lets the CSS and GSAP treat its length as 1
  path.setAttribute('d',
    `M ${at(start)} Q ${at(bend)} ${at(end)} M ${at(head.left)} L ${at(end)} L ${at(head.right)}`);
  path.setAttribute('stroke-width', (frame.width * 0.003).toFixed(2));
  arrows.append(path);
  return path;
}

function pixelBox(element, frame) {
  const box = element.getBoundingClientRect();
  return { left: box.left - frame.left, right: box.right - frame.left, top: box.top - frame.top, bottom: box.bottom - frame.top };
}

function centre(box) {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

// The same box, made smaller around its centre (so an arrow ends on the object, not
// on the empty corner of its rectangle).
function shrunk(box, factor) {
  const middle = centre(box);
  const halfWidth = (box.right - box.left) / 2 * factor;
  const halfHeight = (box.bottom - box.top) / 2 * factor;
  return { left: middle.x - halfWidth, right: middle.x + halfWidth, top: middle.y - halfHeight, bottom: middle.y + halfHeight };
}

// The point where a straight line from the box's centre toward `toward` leaves the
// box, pushed `gap` pixels further out.
function edgePoint(box, toward, gap) {
  const middle = centre(box);
  const dx = toward.x - middle.x;
  const dy = toward.y - middle.y;
  const length = Math.hypot(dx, dy) || 1;
  const reachX = dx ? (box.right - box.left) / 2 / Math.abs(dx) : Infinity;
  const reachY = dy ? (box.bottom - box.top) / 2 / Math.abs(dy) : Infinity;
  const reach = Math.min(reachX, reachY);
  return { x: middle.x + dx * reach + dx / length * gap, y: middle.y + dy * reach + dy / length * gap };
}

// The middle of the line, nudged sideways, which is what makes it a curve.
function bendPoint(start, end) {
  const sideways = 0.18;
  return {
    x: (start.x + end.x) / 2 - (end.y - start.y) * sideways,
    y: (start.y + end.y) / 2 + (end.x - start.x) * sideways,
  };
}

// The two back-swept ends of the arrowhead, `size` pixels long.
function arrowHead(cameFrom, tip, size) {
  const angle = Math.atan2(tip.y - cameFrom.y, tip.x - cameFrom.x);
  const sweep = 0.5;   // about 29 degrees either side
  const barb = (turn) => ({ x: tip.x - size * Math.cos(angle + turn), y: tip.y - size * Math.sin(angle + turn) });
  return { left: barb(sweep), right: barb(-sweep) };
}
