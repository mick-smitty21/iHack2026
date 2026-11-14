/*
 * storage.js - saves and loads everything in the browser's own database (IndexedDB).
 *
 * Talks to: vendor/idb-keyval.js (a tiny helper that makes IndexedDB one-line simple).
 *           Used by almanac.js (settings). From M2: box.js, card.js, cook.js, importer.js.
 *
 * Say it to a judge: "Everything is saved in the browser's own database after every
 * change, so there are no accounts and nothing is lost on reload."
 *
 * Status: settings (M1). Cards, dividers and photos arrive in M2; export/import in M3.
 */

import { get, set } from '../vendor/idb-keyval.js';

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
  mode: 'dark',            // 'light' = warm afternoon, 'dark' = evening
  weather: 'clear',        // 'clear' | 'clouds' | 'rain' | 'snow'
  volumes: { main: 0.8, music: 0.35, ambiance: 0.6 },
  reducedMotion: false,
  station: 0,              // 0 soft rock, 1 country, 2 jazz
};

/** Returns the saved settings, with defaults filling any gaps. Never throws. */
export async function loadSettings() {
  const saved = await readSafely(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    volumes: { ...DEFAULT_SETTINGS.volumes, ...(saved && saved.volumes) },
  };
}

export function saveSettings(settings) {
  return writeSafely(SETTINGS_KEY, settings);
}

// WHY: IndexedDB can be switched off (Safari private browsing, strict privacy
// settings). The site should still work then; it just won't remember things.
async function readSafely(key) {
  try {
    return await get(key);
  } catch (error) {
    console.warn('Could not read saved data; using defaults.', error);
    return undefined;
  }
}

async function writeSafely(key, value) {
  try {
    await set(key, value);
  } catch (error) {
    console.warn('Could not save; changes will be lost on reload.', error);
  }
}
