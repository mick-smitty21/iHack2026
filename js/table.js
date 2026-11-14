/*
 * table.js - scene 1: the kitchen table, its 12 clickable objects and ambient motion.
 *
 * Talks to: assets.js (pictures), sky.js (clock hands, moon, weather), audio.js
 *           (effects, radio), almanac.js (opens settings, saves the station),
 *           importer.js (binder and twine panels), motion.js (reduced motion, timing).
 *           main.js builds it and tells it when the lamp or the settings change.
 *
 * Say it to a judge: "Every object on the table is a real button placed by
 * percentages of the stage. Each one has a tiny function for what it does when you
 * click it, and a few timers add life: curtains sway, the fire flickers, steam puffs."
 */

import { createAsset } from './assets.js';
import { createClockHands, createMoon, createWeather } from './sky.js';
import { playEffect, tuneToNextStation } from './audio.js';
import { openAlmanac, updateSettings } from './almanac.js';
import { openBinder, openTwine } from './importer.js';
import { motionReduced, randomBetween, repeatAtRandom, fadeIn } from './motion.js';

// Where each clickable sits: x, y, w, h are percentages of the stage (x and w of its
// width, y and h of its height). Without h, the height comes from the picture's shape.
// These numbers were measured against bg-table.jpg: the window frame, the round
// clock mount, the pinned sheet for the calendar, the shelf, the stove top and the
// table top are all painted into that background, and each object sits on its spot.
const LAYOUT = {
  window:   { x: 19.5, y: 0,    w: 24, h: 46.5 },  // the whole painted window frame
  clock:    { x: 45.5, y: 5.1,  w: 11.6 },         // its face covers the round wall mount
  calendar: { x: 59.8, y: 7,    w: 11 },           // covers the pinned sheet of paper
  radio:    { x: 3.8,  y: 18.6, w: 9.5 },          // stands on the wall shelf
  kettle:   { x: 85.5, y: 34.8, w: 6 },            // on the stove's right-hand burner
  flowers:  { x: 27.5, y: 46.5, w: 6.5 },          // everything below stands on the table
  sugar:    { x: 36,   y: 53.3, w: 4.8, h: 11.7 },
  mug:      { x: 42,   y: 60.4, w: 4 },
  box:      { x: 47,   y: 46.3, w: 12 },
  binder:   { x: 15.5, y: 54,   w: 12 },
  twine:    { x: 55.5, y: 58,   w: 6.5 },         // well inside the table's right edge
  lamp:     { x: 9.3,  y: 47.4, w: 6.5 },
};

// The seven panes of glass in the painted window, as fractions of the .window-glass
// box (left, top, width, height). The view, moon and weather are clipped to these, so
// they show through the glass and the wooden bars between the panes stay in front.
const WINDOW_PANES = [
  [0.012, 0,     0.272, 0.213], [0.351, 0,     0.305, 0.213], [0.719, 0,     0.281, 0.211],
  [0.012, 0.250, 0.276, 0.252], [0.355, 0.248, 0.301, 0.254], [0.724, 0.248, 0.276, 0.254],
  [0,     0.574, 1,     0.426],
];

const CURTAIN_OPEN_SCALE = 0.42;  // how narrow a curtain is when pulled open
const MAX_PETALS = 8;

let scene;                 // the #scene-table element
const clickables = {};     // name -> <button>
const parts = {};          // other elements we animate (lid, dial, glow...)
let weather;               // the window's weather canvas controller
let curtainsClosed = false;
let dialTurns = 0;
let mugNudged = false;

/* ---------- Building the scene (back to front) ---------- */

export function buildTable(sceneElement, { onLampClick, onBoxClick }) {
  scene = sceneElement;
  scene.append(makeBackground());

  addWindow();
  addClock();
  addCalendar();
  addRadio();
  addKettle();
  addFlowers();
  addSugarPot();
  addMug();
  addRecipeBox(onBoxClick);
  addBinder();
  addTwineStack();

  // Light and shadow sit over the objects; the lamp floats above them (z-index in
  // table.css) so it stays visible and clickable in the dark.
  parts.fireGlow = makeLayer('glow glow-fire');
  scene.append(
    makeLayer('petal-layer'),
    makeLayer('table-evening'),
    makeLayer('table-darkness'),
    parts.fireGlow,
    makeLayer('glow glow-moon'),
  );
  addLamp(onLampClick);

  startAmbientMotion();
  setLampLit(false);
}

function makeBackground() {
  const background = createAsset('bg-table');
  background.classList.add('table-bg');
  return background;
}

function makeLayer(className) {
  const layer = document.createElement('div');
  layer.className = className;
  return layer;
}

/** Makes one clickable object: a real <button>, positioned from LAYOUT. */
function makeClickable(name, label, onClick) {
  const { x, y, w, h } = LAYOUT[name];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'clickable clickable-' + name;
  button.setAttribute('aria-label', label);
  button.style.left = x + '%';
  button.style.top = y + '%';
  button.style.width = w + '%';
  if (h) button.style.height = h + '%';
  button.addEventListener('click', onClick);

  clickables[name] = button;
  scene.append(button);
  return button;
}

function makePart(className, ...children) {
  const part = document.createElement('div');
  part.className = className;
  part.append(...children);
  return part;
}

/* ---------- 1. Lamp ---------- */

function addLamp(onLampClick) {
  const button = makeClickable('lamp', '', onLampClick);
  // WHY: Tab visits buttons in page order, and the lamp should be the first stop.
  scene.querySelector('.table-bg').after(button);

  const tagText = document.createElement('span');
  tagText.className = 'lamp-tag-text';
  tagText.textContent = 'Pull me';
  const tag = makePart('lamp-tag', createAsset('obj-done-tag'), tagText);

  button.append(
    makePart('lamp-halo'),
    makePart('lamp-picture lamp-off', createAsset('obj-lamp-off')),
    makePart('lamp-picture lamp-on', createAsset('obj-lamp-on')),
    makePart('lamp-chain swings', tag),
  );
}

/** main.js calls this when the lamp is switched. Dark kitchen <-> lit kitchen. */
export function setLampLit(isLit) {
  scene.classList.toggle('is-lit', isLit);
  clickables.lamp.setAttribute('aria-label', isLit
    ? 'Lamp: pull the chain to turn off the lights and sound'
    : 'Lamp: pull the chain to turn on the lights');

  // In the dark only the lamp works, so nothing can make a sound before the first click.
  for (const [name, button] of Object.entries(clickables)) {
    if (name !== 'lamp') button.disabled = !isLit;
  }
}

/** One of the table's objects, by name (e.g. the box, so a card can slide into it). */
export function getClickable(name) {
  return clickables[name];
}

/** Puts keyboard focus back on one of the table's objects (after a scene closes). */
export function focusClickable(name) {
  clickables[name].focus({ preventScroll: true });
}

function isLit() {
  return scene.classList.contains('is-lit');
}

/* ---------- 2-4. Recipe box (scene 2), binder (add a recipe), twine stack (bundles) ---------- */

function addRecipeBox(onBoxClick) {
  const button = makeClickable('box', 'Recipe box: open it', onBoxClick);
  const brassLabel = document.createElement('span');
  brassLabel.className = 'brass-label';
  brassLabel.textContent = "Grandma's Recipe Box";
  button.append(createAsset('obj-box-closed'), brassLabel);
}

function addBinder() {
  const button = makeClickable('binder', 'Binder: add a recipe', () => {
    playEffect('fx-binder');
    openBinder(button, clickables.box);
  });
  button.append(createAsset('obj-binder'));
}

function addTwineStack() {
  const button = makeClickable('twine', 'Twine-tied stack: save or load a bundle of recipes', () => {
    playEffect('fx-twine');
    button.classList.add('is-untied');   // shows obj-twine-loose while the panel is open
    openTwine(button, () => button.classList.remove('is-untied'));
  });
  button.append(
    makePart('twine-tied', createAsset('obj-twine')),
    makePart('twine-loose', createAsset('obj-twine-loose')),
  );
}

/* ---------- 5. Mug ---------- */

function addMug() {
  const button = makeClickable('mug', 'Coffee mug', () => {
    playEffect('fx-clink');
    mugNudged = !mugNudged;
    if (!motionReduced()) {
      gsap.to(button, { xPercent: mugNudged ? 14 : 0, duration: 0.9, ease: 'power2.out' });
    }
    puffSteam(button, 3, { left: 30, top: -15 });
  });
  button.append(createAsset('obj-mug'));
}

/* ---------- 6. Dried flowers ---------- */

function addFlowers() {
  const button = makeClickable('flowers', 'Pitcher of dried flowers', dropPetal);
  button.append(createAsset('obj-pitcher'));
}

function dropPetal() {
  const layer = scene.querySelector('.petal-layer');
  const petal = makePart('petal', createAsset('obj-petal'));
  const start = { left: LAYOUT.flowers.x + randomBetween(0.5, 5), top: LAYOUT.flowers.y + 3 };
  const end = { left: start.left + randomBetween(-2.5, 2.5), top: randomBetween(62.5, 67) };
  layer.append(petal);
  if (layer.children.length > MAX_PETALS) layer.firstElementChild.remove();

  if (motionReduced()) {
    gsap.set(petal, { left: end.left + '%', top: end.top + '%' });
    fadeIn(petal, 1);
    return;
  }
  gsap.set(petal, { left: start.left + '%', top: start.top + '%' });
  gsap.to(petal, { top: end.top + '%', duration: 3.5, ease: 'sine.in' });
  gsap.to(petal, { left: end.left + '%', rotation: randomBetween(-200, 200), duration: 3.5, ease: 'sine.inOut' });
}

/* ---------- 7. Window ---------- */

function addWindow() {
  const button = makeClickable('window', 'Window: open or close the curtains', toggleCurtains);

  const glass = makePart('window-glass',
    makePart('view view-day', createAsset('view-day')),
    makePart('view view-night', createAsset('view-night')),
    createMoon(),
  );
  weather = createWeather(glass);

  button.append(makePaneClip(), glass, makeCurtain('left'), makeCurtain('right'));
  gsap.set(button.querySelectorAll('.curtain'), { scaleX: CURTAIN_OPEN_SCALE });
}

// An invisible SVG that only holds the pane shapes; table.css points the glass at it
// with clip-path: url(#window-panes).
function makePaneClip() {
  const rects = WINDOW_PANES
    .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`)
    .join('');
  const holder = document.createElement('div');
  holder.innerHTML = `<svg width="0" height="0" aria-hidden="true" style="position:absolute">
    <clipPath id="window-panes" clipPathUnits="objectBoundingBox">${rects}</clipPath></svg>`;
  return holder.firstElementChild;
}

// .curtain is squeezed to open/close; .curtain-cloth inside it sways in the breeze.
function makeCurtain(side) {
  const cloth = makePart('curtain-cloth', createAsset('obj-curtain'));
  return makePart('curtain curtain-' + side, cloth);
}

function toggleCurtains() {
  curtainsClosed = !curtainsClosed;
  playEffect('fx-curtain');
  const curtains = clickables.window.querySelectorAll('.curtain');
  const scaleX = curtainsClosed ? 1 : CURTAIN_OPEN_SCALE;
  if (motionReduced()) {
    gsap.set(curtains, { scaleX });
    fadeIn(curtains, 0.8);
  } else {
    gsap.to(curtains, { scaleX, duration: 1.2, ease: 'power2.inOut' });
  }
}

function swayCurtains() {
  if (motionReduced()) return;
  const lean = randomBetween(1, 2.5) * (Math.random() < 0.5 ? -1 : 1);
  gsap.to(scene.querySelectorAll('.curtain-cloth'), {
    skewX: lean, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: 1,
  });
}

/* ---------- 8. Sugar pot ---------- */

function addSugarPot() {
  const button = makeClickable('sugar', 'Sugar pot', () => {
    playEffect('fx-rattle');
    rattle(parts.sugarLid);
  });
  parts.sugarLid = makePart('sugar-lid', createAsset('obj-sugar-lid'));
  button.append(makePart('sugar-body', createAsset('obj-sugar-body')), parts.sugarLid);
}

function rattle(element) {
  if (motionReduced()) { fadeIn(element, 0.6); return; }
  gsap.fromTo(element, { rotation: -4 }, {
    rotation: 4, duration: 0.09, ease: 'sine.inOut', yoyo: true, repeat: 5,
    onComplete: () => gsap.to(element, { rotation: 0, duration: 0.15 }),
  });
}

/* ---------- 9. Wall clock ---------- */

function addClock() {
  const button = makeClickable('clock', 'Wall clock: hear it chime', () => playEffect('fx-chime'));
  button.append(
    createAsset('obj-clock'),
    makePart('pendulum-window', makePart('pendulum swings')),  // swings behind the little glass door
    createClockHands(),
  );
}

/* ---------- 10. Radio ---------- */

function addRadio() {
  const button = makeClickable('radio', 'Radio: turn the dial to the next station', () => {
    dialTurns += 1;
    gsap.to(parts.radioNeedle, { rotation: dialTurns * 120, duration: motionReduced() ? 0 : 0.6, ease: 'power2.out' });
    tuneToNextStation((station) => updateSettings({ station }));
  });
  // WHY two layers: .radio-dial is squeezed sideways once (in table.css) to match the
  // angle of the radio's face; the picture inside it is the part that turns.
  parts.radioNeedle = createAsset('obj-radio-dial');
  button.append(createAsset('obj-radio'), makePart('radio-dial', parts.radioNeedle));
}

/* ---------- 11. Kettle ---------- */

function addKettle() {
  const button = makeClickable('kettle', 'Kettle: make it whistle', () => {
    playEffect('fx-kettle');
    // The whistle builds first; the steam bursts out a moment later.
    setTimeout(() => puffSteam(button, 7, { left: 55, top: -10 }), 1200);
  });
  button.append(createAsset('obj-kettle'));
}

/* ---------- 12. Wall calendar ---------- */

function addCalendar() {
  const button = makeClickable('calendar', "Wall calendar: open Grandma's almanac (settings)", () => {
    playEffect('fx-pageflip');
    openAlmanac(button);
  });
  button.append(createAsset('obj-calendar'));
}

/* ---------- Steam (drawn in code) ---------- */

// Adds soft round puffs to `host` that rise and fade. `at` is where they start,
// in percent of the host's box. With reduced motion they only fade in and out.
function puffSteam(host, puffCount, at) {
  for (let i = 0; i < puffCount; i += 1) {
    const puff = makePart('steam-puff');
    puff.style.left = at.left + randomBetween(-8, 8) + '%';
    puff.style.top = at.top + '%';
    host.append(puff);

    const timeline = gsap.timeline({ delay: i * 0.18, onComplete: () => puff.remove() });
    timeline.to(puff, { opacity: 0.7, duration: 0.6 }).to(puff, { opacity: 0, duration: 1.9 });
    if (!motionReduced()) {
      timeline.fromTo(puff, { scale: 0.5 }, {
        yPercent: -260, xPercent: randomBetween(-50, 50), scale: 1.7, duration: 2.5, ease: 'power1.out',
      }, 0);
    }
  }
}

/* ---------- Ambient motion ---------- */

function startAmbientMotion() {
  repeatAtRandom(6, 10, swayCurtains);
  repeatAtRandom(20, 40, () => {
    if (isLit()) puffSteam(clickables.kettle, 2, { left: 55, top: -10 });
  });
  flickerFire();
  // The pendulum and the lamp chain swing with CSS animations (see table.css).
}

// The fire's glow drifts between slightly dimmer and slightly brighter, forever.
function flickerFire() {
  gsap.to(parts.fireGlow, {
    opacity: motionReduced() ? 0.75 : randomBetween(0.6, 0.9),
    duration: randomBetween(0.3, 0.8),
    ease: 'sine.inOut',
    onComplete: flickerFire,
  });
}

/* ---------- Settings ---------- */

/** main.js calls this at startup and whenever the almanac changes something. */
export function applySettings(settings) {
  const isEvening = settings.mode === 'dark';
  scene.classList.toggle('mode-dark', isEvening);
  scene.classList.toggle('mode-light', !isEvening);
  scene.classList.toggle('is-overcast', settings.weather !== 'clear');
  scene.classList.toggle('is-gloomy', settings.weather === 'rain' || settings.weather === 'snow');
  weather.set(settings.weather, isEvening);
}
