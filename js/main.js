/*
 * main.js - startup, the lamp, and switching between the three scenes.
 *
 * Talks to: assets.js (preloading), table.js (builds scene 1). From M1 on it also
 *           starts audio.js, sky.js and almanac.js, and later box.js and cook.js.
 *
 * Say it to a judge: "This is the front door. When the page loads it builds the
 * kitchen table, starts fetching the artwork in the background, and it is the one
 * place that decides which of the three scenes is on screen."
 */

import { IMAGES, preloadImages } from './assets.js';
import { buildTable } from './table.js';

const scenes = {
  table: document.getElementById('scene-table'),
  box: document.getElementById('scene-box'),
  cook: document.getElementById('scene-cook'),
};

/** Shows one scene and hides the other two. M1+ adds the animated transitions. */
export function showScene(name) {
  for (const [key, element] of Object.entries(scenes)) {
    const isActive = key === name;
    element.hidden = !isActive;
    element.classList.toggle('is-active', isActive);
  }
}

async function start() {
  buildTable(scenes.table);
  showScene('table');
  reportMissingArt(await preloadImages());
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
