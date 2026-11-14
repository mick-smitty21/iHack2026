/*
 * almanac.js - Grandma's almanac: the settings and the panel that changes them
 * (light/dark, weather, three volumes, reduced motion).
 *
 * Talks to: storage.js (saves settings), panels.js (opens the panel), motion.js
 *           (reduced-motion switch), assets.js (the almanac picture). main.js listens
 *           with onSettingsChange() and passes the news to audio.js, sky.js and table.js.
 *
 * Say it to a judge: "Settings live inside a farmer's almanac instead of a menu, and
 * every change is saved straight away so it survives a reload."
 */

import { createAsset } from './assets.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './storage.js';
import { openPanel, closePanel } from './panels.js';
import { setReducedMotionSwitch, deviceAsksForReducedMotion } from './motion.js';

let settings = structuredClone(DEFAULT_SETTINGS);
const listeners = [];
let showMeAround = () => {};   // main.js swaps in the function that replays the tour

/** Loads saved settings once at startup. */
export async function initSettings() {
  settings = await loadSettings();
  setReducedMotionSwitch(settings.reducedMotion);
  return settings;
}

export function getSettings() {
  return settings;
}

/** Other modules register a function to be told about every change. */
export function onSettingsChange(listener) {
  listeners.push(listener);
}

/** main.js registers what "Show me around again" should do (see intro.js). */
export function onShowMeAround(action) {
  showMeAround = action;
}

/** Merges `changes` into the settings, saves, and tells everyone. */
export function updateSettings(changes) {
  settings = { ...settings, ...changes };
  setReducedMotionSwitch(settings.reducedMotion);
  saveSettings(settings);
  for (const listener of listeners) listener(settings);
}

/* ---------- The panel ---------- */

const MODES = [
  { value: 'light', label: 'Afternoon' },
  { value: 'dark', label: 'Evening' },
];
const WEATHERS = [
  { value: 'clear', label: 'Clear' },
  { value: 'clouds', label: 'Clouds' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
];
const VOLUMES = [
  { key: 'main', label: 'Main' },
  { key: 'music', label: 'Music' },
  { key: 'ambiance', label: 'Ambiance' },
];
// One switch per background sound. The Ambiance slider sets how loud they all are;
// these choose which of them you hear at all.
const AMBIENT_SOUNDS = [
  { key: 'fire', label: 'Fire' },
  { key: 'clock', label: 'Clock tick' },
  { key: 'purr', label: "Cat's purr" },
  { key: 'weather', label: 'Weather' },
];

/** Opens the almanac. `opener` is the wall-calendar button, so focus can return to it. */
export function openAlmanac(opener) {
  openPanel(buildAlmanac(), { label: "Grandma's almanac: settings", opener });
}

function buildAlmanac() {
  const book = document.createElement('div');
  book.className = 'almanac';

  const leftPage = makePage(
    makeHeading('The Almanac'),
    makeChoiceGroup('Light', 'mode', MODES, settings.mode),
    makeChoiceGroup('Weather', 'weather', WEATHERS, settings.weather),
    makeShowMeAroundButton(),
  );
  const rightPage = makePage(
    makeHeading('Sound'),
    ...VOLUMES.map(makeVolumeSlider),
    makeAmbientSwitches(),
    makeMotionSwitch(),
    makeCredit(),
  );

  book.append(createAsset('obj-almanac-open'), leftPage, rightPage);
  return book;
}

// A handwritten line at the foot of the page that replays the first-visit notes.
function makeShowMeAroundButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'almanac-replay';
  button.textContent = 'Show me around again';
  button.addEventListener('click', () => {
    closePanel();      // the notes point at things on the table, so clear the book away
    showMeAround();
  });
  return button;
}

// A small line at the foot of the page saying who made the site.
function makeCredit() {
  const credit = document.createElement('p');
  credit.className = 'almanac-credit';
  credit.textContent = 'Created by Kaden Jones and Jacob Wagner for iHack2026';
  return credit;
}

function makePage(...children) {
  const page = document.createElement('div');
  page.className = 'almanac-page';
  page.append(...children);
  return page;
}

function makeHeading(text) {
  const heading = document.createElement('h2');
  heading.className = 'almanac-heading';
  heading.textContent = text;
  return heading;
}

// A group of radio buttons that look like handwritten words; the chosen one is
// circled in pencil (see panels.css).
function makeChoiceGroup(title, settingName, options, current) {
  const group = document.createElement('fieldset');
  group.className = 'almanac-group';

  const legend = document.createElement('legend');
  legend.textContent = title;
  group.append(legend);

  for (const option of options) {
    group.append(makeChoice(settingName, option, option.value === current));
  }
  return group;
}

function makeChoice(settingName, option, isChosen) {
  const label = document.createElement('label');
  label.className = 'almanac-choice';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = settingName;
  input.value = option.value;
  input.checked = isChosen;
  input.addEventListener('change', () => updateSettings({ [settingName]: option.value }));

  const text = document.createElement('span');
  text.textContent = option.label;

  label.append(input, text);
  return label;
}

function makeVolumeSlider({ key, label }) {
  const row = document.createElement('label');
  row.className = 'almanac-slider';

  const name = document.createElement('span');
  name.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(settings.volumes[key] * 100));
  input.addEventListener('input', () => {
    updateSettings({ volumes: { ...settings.volumes, [key]: Number(input.value) / 100 } });
  });

  row.append(name, input);
  return row;
}

// Four labelled checkboxes under the Ambiance slider.
function makeAmbientSwitches() {
  const group = document.createElement('fieldset');
  group.className = 'almanac-ambient';

  // The group's name is for screen readers; sighted users see it under "Ambiance".
  group.setAttribute('aria-label', 'Which background sounds play');
  group.append(...AMBIENT_SOUNDS.map(makeAmbientSwitch));
  return group;
}

function makeAmbientSwitch({ key, label }) {
  const row = document.createElement('label');
  row.className = 'almanac-switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = settings.ambient[key];
  input.addEventListener('change', () => {
    updateSettings({ ambient: { ...settings.ambient, [key]: input.checked } });
  });

  const text = document.createElement('span');
  text.textContent = label;

  row.append(input, text);
  return row;
}

function makeMotionSwitch() {
  const row = document.createElement('label');
  row.className = 'almanac-switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = settings.reducedMotion;
  input.addEventListener('change', () => updateSettings({ reducedMotion: input.checked }));

  const text = document.createElement('span');
  text.textContent = deviceAsksForReducedMotion()
    ? 'Gentle motion (your device already asks for it)'
    : 'Gentle motion';

  row.append(input, text);
  return row;
}
