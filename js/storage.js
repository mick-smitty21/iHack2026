/*
 * storage.js - saves and loads everything in the browser's own database (IndexedDB).
 *
 * Talks to: vendor/idb-keyval.js (a tiny helper that makes IndexedDB one-line simple).
 *           Used by almanac.js (settings). From M2: box.js, card.js, cook.js, importer.js.
 *
 * Say it to a judge: "Everything is saved in the browser's own database after every
 * change, so there are no accounts and nothing is lost on reload."
 *
 * Status: settings (M1), cards, dividers and photos (M2), bundles to export/import (M3).
 */

import { get, set } from '../vendor/idb-keyval.js';
import { makeId } from './card.js';
import { makeSampleCards } from './samples.js';

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
  mode: 'dark',            // 'light' = warm afternoon, 'dark' = evening
  weather: 'clear',        // 'clear' | 'clouds' | 'rain' | 'snow'
  volumes: { main: 0.8, music: 0.35, ambiance: 0.6 },
  // One on/off switch for each background sound (rain and snow share 'weather').
  ambient: { fire: true, clock: true, purr: true, weather: true },
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
    // WHY merged separately: settings saved before the cat arrived have no `ambient`
    // at all, and those visitors should get every sound switched on, not an error.
    ambient: { ...DEFAULT_SETTINGS.ambient, ...(saved && saved.ambient) },
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

/* ---------- Cards and dividers ---------- */

const CARDS_KEY = 'cards';
const DIVIDERS_KEY = 'dividers';
const ILLUSTRATIONS = ['ill-main', 'ill-bread', 'ill-pie', 'ill-cake', 'ill-cookie', 'ill-soup', 'ill-sides', 'ill-canning'];

function makeStartingDividers() {
  return [
    { id: 'breads',      label: 'Breads',              order: 1, illustration: 'ill-bread' },
    { id: 'cakes-pies',  label: 'Cakes & Pies',        order: 2, illustration: 'ill-cake' },
    { id: 'cookies',     label: 'Cookies',             order: 3, illustration: 'ill-cookie' },
    { id: 'main-dishes', label: 'Main Dishes',         order: 4, illustration: 'ill-main' },
    { id: 'soups',       label: 'Soups',               order: 5, illustration: 'ill-soup' },
    { id: 'sides',       label: 'Sides',               order: 6, illustration: 'ill-sides' },
    { id: 'canning',     label: 'Canning & Preserves', order: 7, illustration: 'ill-canning' },
  ];
}

// The box's contents live here in memory; every change is also written to IndexedDB.
let cards = [];
let dividers = [];

/**
 * Loads the box at startup. On the very first visit nothing is saved yet, so the
 * starting dividers and the 10 sample cards are put in (and saved).
 * WHY: "nothing saved" (undefined) is different from "saved but empty" ([]). If you
 * throw out every card, the samples do not come back.
 */
export async function loadBox() {
  const savedDividers = await readSafely(DIVIDERS_KEY);
  const savedCards = await readSafely(CARDS_KEY);

  dividers = savedDividers || makeStartingDividers();
  cards = savedCards || makeSampleCards();
  if (!savedDividers) writeSafely(DIVIDERS_KEY, dividers);
  if (!savedCards) writeSafely(CARDS_KEY, cards);
}

export function getCards() {
  return cards;
}

export function getDividers() {
  return [...dividers].sort((a, b) => a.order - b.order);
}

/** Saves a card: replaces the one with the same id, or adds it if it's new. */
export function saveCard(card) {
  const index = cards.findIndex((existing) => existing.id === card.id);
  if (index === -1) cards.push(card);
  else cards[index] = card;
  return writeSafely(CARDS_KEY, cards);
}

export function deleteCard(cardId) {
  cards = cards.filter((card) => card.id !== cardId);
  return writeSafely(CARDS_KEY, cards);
}

/** Adds a divider the user wrote. It gets a random illustration, as the spec says. */
export function addDivider(label) {
  const divider = {
    id: makeId(),
    label,
    order: Math.max(0, ...dividers.map((d) => d.order)) + 1,
    illustration: ILLUSTRATIONS[Math.floor(Math.random() * ILLUSTRATIONS.length)],
  };
  dividers.push(divider);
  writeSafely(DIVIDERS_KEY, dividers);
  return divider;
}

/* ---------- Photos ---------- */

/** Stores a picture (a Blob) under its own key and returns the id to keep on the card. */
export async function savePhoto(blob) {
  const id = makeId();
  await writeSafely('photo:' + id, blob);
  return id;
}

/** Returns a URL the page can show in an <img>, or null if the photo is gone. */
export async function loadPhotoUrl(photoId) {
  const blob = await readSafely('photo:' + photoId);
  return blob ? URL.createObjectURL(blob) : null;
}

/* ---------- Bundles: the whole box in one file ---------- */

const BUNDLE_NAME = 'grandmas-recipe-box';

/** Everything in the box as one object: cards, dividers, and photos as text. */
export async function makeBundle() {
  const photos = {};
  for (const photoId of listPhotoIds(cards)) {
    const blob = await readSafely('photo:' + photoId);
    if (blob) photos[photoId] = await blobToDataUrl(blob);
  }
  return { app: BUNDLE_NAME, version: 1, exportedAt: new Date().toISOString(), dividers, cards, photos };
}

/** "grandmas-recipe-box-2026-11-14.json" for today's date. */
export function bundleFileName(date = new Date()) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${BUNDLE_NAME}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Adds a bundle's cards to the box. A card whose id is already in the box is
 * skipped, so untying the same bundle twice changes nothing.
 * Returns { added, skipped }. Throws if the file isn't one of our bundles.
 */
export async function mergeBundle(bundle) {
  if (!bundle || bundle.app !== BUNDLE_NAME || !Array.isArray(bundle.cards)) {
    throw new Error('Not a recipe box bundle');
  }
  addMissingDividers(bundle.dividers || []);

  const newCards = bundle.cards.filter((card) => !cards.some((existing) => existing.id === card.id));
  for (const photoId of listPhotoIds(newCards)) {
    const dataUrl = (bundle.photos || {})[photoId];
    if (dataUrl) await writeSafely('photo:' + photoId, await dataUrlToBlob(dataUrl));
  }
  cards.push(...newCards);
  await writeSafely(CARDS_KEY, cards);
  return { added: newCards.length, skipped: bundle.cards.length - newCards.length };
}

// A card from someone else's box may sit behind a divider this box doesn't have.
function addMissingDividers(bundleDividers) {
  let nextOrder = Math.max(0, ...dividers.map((d) => d.order)) + 1;
  for (const divider of bundleDividers) {
    if (dividers.some((existing) => existing.id === divider.id)) continue;
    dividers.push({ ...divider, order: nextOrder });
    nextOrder += 1;
  }
  writeSafely(DIVIDERS_KEY, dividers);
}

// Every photo a list of cards points at: the scanned original and cook-log photos.
function listPhotoIds(cardList) {
  const ids = [];
  for (const card of cardList) {
    if (card.photoId) ids.push(card.photoId);
    for (const entry of card.cookLog || []) if (entry.photoId) ids.push(entry.photoId);
  }
  return ids;
}

// WHY: a JSON file can only hold text, so each photo is turned into a long
// "data:image/jpeg;base64,..." string on the way out, and back into a picture on the way in.
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}
