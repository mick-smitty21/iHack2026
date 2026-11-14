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

import { preloadImages, usedImageIds } from './assets.js';
import { initSettings, onSettingsChange, onShowMeAround } from './almanac.js';
import {
  buildTable, setLampLit, focusClickable, getClickable, TABLE_ART,
  applySettings as applyTableSettings,
} from './table.js';
import { loadBox } from './storage.js';
import { initBox, openBox, illustrationFor } from './box.js';
import { initCook, openCook } from './cook.js';
import {
  preloadSounds, lampSwitchedOn, lampSwitchedOff, applySettings as applyAudioSettings,
} from './audio.js';
import { closePanel, showNote, slideCardInto } from './panels.js';
import { initIntro, introLampChanged, replayIntro } from './intro.js';

const scenes = {
  table: document.getElementById('scene-table'),
  box: document.getElementById('scene-box'),
  cook: document.getElementById('scene-cook'),
};

const titleSign = document.getElementById('title-sign');   // written in index.html

let lampIsOn = false;
let otherScenesReady = false;
let artFound = [];   // what the preloader found, for the console report

async function start() {
  const settings = await initSettings();
  await loadBox();
  buildTable(scenes.table, { onLampClick: toggleLamp, onBoxClick: openBox });
  applySettingsEverywhere(settings);
  onSettingsChange(applySettingsEverywhere);
  initIntro(document.getElementById('stage'));   // first visit: a note points at the lamp
  onShowMeAround(replayIntro);

  // While the kitchen is dark, fetch only what the table needs, plus the sounds.
  // Everything else waits for the lamp (see prepareOtherScenes).
  preloadSounds();
  artFound = await preloadImages(TABLE_ART);
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
    prepareOtherScenes();
  } else {
    closePanel();
    lampSwitchedOff();
  }
  setLampLit(lampIsOn);
  titleSign.classList.toggle('is-away', lampIsOn);   // the sign shows only in the dark
  introLampChanged(lampIsOn);
}

// The first time the lamp is lit, build the recipe box and the stove and start
// fetching their pictures.
// WHY not at startup: the first screen should appear as fast as possible, even on
// slow Wi-Fi. The rest loads in the background while you look around the table.
function prepareOtherScenes() {
  if (otherScenesReady) return;
  otherScenesReady = true;

  initBox(scenes.box, scenes.table, {
    onClosed: () => focusClickable('box'),
    onCook: (card) => openCook(card, illustrationFor(card)),
  });
  initCook(scenes.cook, { onLeave: returnFromStove });

  const theRest = usedImageIds().filter((id) => !TABLE_ART.includes(id));
  preloadImages(theRest).then((results) => reportMissingArt([...artFound, ...results]));
}

// Back at the table after cooking. If the cook was logged ("Done Cooking"), the card
// slides back into the box with a ting; after "Not today" it just goes back quietly.
function returnFromStove(card, wasCooked) {
  scenes.table.hidden = false;
  focusClickable('box');
  if (wasCooked) slideCardInto(getClickable('box'), card, () => showNote('Filed back in the box.'));
}

// Tells the team (in the browser console) which pictures still need to be dropped
// into assets/img/. Uses console.info so it never shows up as an error.
function reportMissingArt(results) {
  const missing = results.filter((r) => !r.found).map((r) => r.id);
  console.info(`Art: ${results.length - missing.length} of ${results.length} images found.`);
  if (missing.length) console.info('Still showing placeholders for: ' + missing.join(', '));
}

start();
