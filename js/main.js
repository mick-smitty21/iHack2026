/*
 * main.js - startup, the lamp, and switching between the three scenes.
 *
 * Talks to: almanac.js (settings), table.js (scene 1), audio.js (sound), assets.js
 *           (preloading), panels.js (closing panels). Later: box.js and cook.js.
 *
 * Say it to a judge: "This is the front door. It loads your saved settings, builds
 * the kitchen table, and owns the lamp: one click on the lamp is what lights the
 * room and unlocks the sound."
 */

import { IMAGES, preloadImages } from './assets.js';
import { initSettings, onSettingsChange } from './almanac.js';
import { buildTable, setLampLit, applySettings as applyTableSettings } from './table.js';
import {
  preloadSounds, lampSwitchedOn, lampSwitchedOff, applySettings as applyAudioSettings,
} from './audio.js';
import { closePanel } from './panels.js';

const scenes = {
  table: document.getElementById('scene-table'),
  box: document.getElementById('scene-box'),
  cook: document.getElementById('scene-cook'),
};

let lampIsOn = false;

/** Shows one scene and hides the other two. M2+ adds the animated transitions. */
export function showScene(name) {
  for (const [key, element] of Object.entries(scenes)) {
    const isActive = key === name;
    element.hidden = !isActive;
    element.classList.toggle('is-active', isActive);
  }
}

async function start() {
  const settings = await initSettings();
  buildTable(scenes.table, { onLampClick: toggleLamp });
  applySettingsEverywhere(settings);
  onSettingsChange(applySettingsEverywhere);
  showScene('table');

  // While the kitchen is dark, fetch the art and sound in the background.
  preloadSounds();
  reportMissingArt(await preloadImages());
}

function applySettingsEverywhere(settings) {
  applyTableSettings(settings);
  applyAudioSettings(settings);
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
