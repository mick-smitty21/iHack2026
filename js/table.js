/*
 * table.js - scene 1: the kitchen table, its clickable objects and ambient motion.
 *
 * Talks to: assets.js (pictures). From M1: audio.js (sounds), sky.js (clock, moon,
 *           weather), almanac.js (settings), main.js (opening the box and panels).
 *
 * Say it to a judge: "Every object on the table is listed in one layout table with
 * its position as a percentage of the stage, and this file places them in order from
 * the back wall to the front of the table."
 *
 * M0 status: objects are placed as plain pictures. M1 turns the 12 clickables into
 * real <button>s and adds behaviours, sounds and ambient motion.
 */

import { createAsset } from './assets.js';

// Back to front. x, y and w are percentages of the stage (x and w of its width,
// y of its height). Height comes from each picture's own shape.
// These are first-pass positions; M1 tunes them once bg-table.jpg exists.
const LAYOUT = [
  { asset: 'view-night',     x: 8,   y: 8,  w: 20 },
  { asset: 'obj-curtain',    x: 6,   y: 6,  w: 7 },
  { asset: 'obj-curtain',    x: 23,  y: 6,  w: 7, mirrored: true },
  { asset: 'obj-clock',      x: 45,  y: 4,  w: 10 },
  { asset: 'obj-calendar',   x: 79,  y: 5,  w: 9 },
  { asset: 'obj-radio',      x: 9,   y: 37, w: 11 },
  { asset: 'obj-radio-dial', x: 16,  y: 43, w: 2.5 },
  { asset: 'obj-kettle',     x: 81,  y: 36, w: 7 },
  { asset: 'obj-pitcher',    x: 31,  y: 44, w: 8 },
  { asset: 'obj-sugar-body', x: 44,  y: 60, w: 5 },
  { asset: 'obj-sugar-lid',  x: 44,  y: 55, w: 5 },
  { asset: 'obj-mug',        x: 51,  y: 66, w: 5 },
  { asset: 'obj-box-closed', x: 59,  y: 54, w: 14 },
  { asset: 'obj-lamp-off',   x: 0.5, y: 44, w: 10 },
  { asset: 'obj-done-tag',   x: 8.5, y: 62, w: 3 },
  { asset: 'obj-binder',     x: 17,  y: 66, w: 17 },
  { asset: 'obj-twine',      x: 79,  y: 72, w: 10 },
];

/** Fills the table scene: background first, then every object, then the darkness. */
export function buildTable(scene) {
  scene.append(makeBackground());
  for (const item of LAYOUT) scene.append(makeProp(item));
  scene.append(makeDarkness());
}

function makeBackground() {
  const background = createAsset('bg-table');
  background.classList.add('table-bg');
  return background;
}

function makeProp({ asset, x, y, w, mirrored }) {
  const prop = document.createElement('div');
  prop.className = 'prop';
  prop.style.left = x + '%';
  prop.style.top = y + '%';
  prop.style.width = w + '%';
  if (mirrored) prop.classList.add('is-mirrored');
  prop.append(createAsset(asset));
  return prop;
}

// The dark kitchen before the lamp is pulled. M1 fades this out on the lamp click.
function makeDarkness() {
  const darkness = document.createElement('div');
  darkness.className = 'table-darkness';
  return darkness;
}
