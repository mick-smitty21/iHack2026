/*
 * main.js - startup, the lamp, and switching between the three scenes.
 *
 * Talks to: almanac.js (settings), storage.js (loads the cards), table.js (scene 1),
 *           box.js (scene 2), cook.js (scene 3), audio.js (sound), assets.js
 *           (preloading), panels.js (notes, the card sliding into the box).
 *
 * Say it to a judge: "This is the front door. It loads your saved settings, builds
 * the kitchen table, and owns the lamp: one click on the lamp is what lights the
 * room and unlocks the sound."
 */

import { IMAGES, preloadImages } from './assets.js';
import { initSettings, onSettingsChange } from './almanac.js';
import {
  buildTable, setLampLit, focusClickable, getClickable, applySettings as applyTableSettings,
} from './table.js';
import { loadBox } from './storage.js';
import { initBox, openBox, illustrationFor } from './box.js';
import { initCook, openCook } from './cook.js';
import {
  preloadSounds, lampSwitchedOn, lampSwitchedOff, applySettings as applyAudioSettings,
} from './audio.js';
import { closePanel, showNote, slideCardInto } from './panels.js';

const scenes = {
  table: document.getElementById('scene-table'),
  box: document.getElementById('scene-box'),
  cook: document.getElementById('scene-cook'),
};

let lampIsOn = false;

async function start() {
  const settings = await initSettings();
  await loadBox();
  buildTable(scenes.table, { onLampClick: toggleLamp, onBoxClick: openBox });
  initBox(scenes.box, scenes.table, {
    onClosed: () => focusClickable('box'),
    onCook: (card) => openCook(card, illustrationFor(card)),
  });
  initCook(scenes.cook, { onLeave: returnFromStove });
  applySettingsEverywhere(settings);
  onSettingsChange(applySettingsEverywhere);

  // While the kitchen is dark, fetch the art and sound in the background.
  preloadSounds();
  reportMissingArt(await preloadImages());
}

function applySettingsEverywhere(settings) {
  applyTableSettings(settings);
  applyAudioSettings(settings);
}

// Back at the table after cooking. If the cook was logged ("Done Cooking"), the card
// slides back into the box with a ting; after "Not today" it just goes back quietly.
function returnFromStove(card, wasCooked) {
  scenes.table.hidden = false;
  focusClickable('box');
  if (wasCooked) slideCardInto(getClickable('box'), card, () => showNote('Filed back in the box.'));
}

// WHY: the audio calls happen directly inside this click handler (not after an
// await or a timer) because browsers, iPad Safari above all, only allow sound to
// start during a real click or tap.
function toggleLamp() {
  lampIsOn = !lampIsOn;
  if (lampIsOn) {
    lampSwitchedOn();
  } else {
    closePanel();
    lampSwitchedOff();
  }
  setLampLit(lampIsOn);
}

// Tells the team (in the browser console) which pictures still need to be dropped
// into assets/img/. Uses console.info so it never shows up as an error.
function reportMissingArt(results) {
  const missing = results.filter((r) => !r.found).map((r) => r.id);
  const total = Object.keys(IMAGES).length;
  console.info(`Art: ${total - missing.length} of ${total} images found.`);
  if (missing.length) console.info('Still showing placeholders for: ' + missing.join(', '));
}

start();
