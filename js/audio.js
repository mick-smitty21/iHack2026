/*
 * audio.js - all sound: three volume channels (Main, Music, Ambiance), the radio,
 * seamless loops, and the ways sound reacts to what's happening.
 *
 * Talks to: assets.js (sound list, loading with Howler). main.js tells it about the
 *           lamp and settings; table.js asks it to play effects and change station.
 *
 * Say it to a judge: "All sound goes through three volume channels, and each long
 * loop is two overlapping copies that crossfade so you never hear the seam."
 */

import { SOUNDS, soundUrl, loadSound } from './assets.js';

const CROSSFADE_MS = 2000;
const STATIONS = ['radio-softrock', 'radio-country', 'radio-jazz'];
const STATIC_MS = 500;

const state = {
  started: false,       // have the sounds been created yet? (only after the first click)
  lampOn: false,
  cardFocused: false,   // M2 sets this while a recipe card is held up
  settings: null,
  nextFadeMs: 300,     // how gently the next settings change fades in
};

const loops = {};       // id -> SeamlessLoop
const effects = {};     // id -> Howl

/* ---------- A loop with no audible seam ---------- */

class SeamlessLoop {
  constructor(id) {
    this.howl = loadSound(id);
    this.volume = 0;
    this.playing = false;
    this.copyId = null;       // Howler's id for the copy currently playing
    this.fadingCopyId = null; // the older copy, while two overlap
    this.nextCopyTimer = null;
  }

  start(fadeMs = 1000) {
    if (this.playing) return;
    this.playing = true;
    this.playCopy(fadeMs);
  }

  playCopy(fadeMs) {
    this.copyId = this.howl.play();
    this.howl.fade(0, this.volume, fadeMs, this.copyId);
    this.scheduleNextCopy();
  }

  // Start a second copy two seconds before this one ends, and fade between them.
  scheduleNextCopy() {
    const lengthMs = this.howl.duration() * 1000;
    if (!lengthMs) {
      // Not loaded yet: try again once Howler knows how long the clip is.
      this.howl.once('load', () => { if (this.playing) this.scheduleNextCopy(); });
      return;
    }
    if (lengthMs < CROSSFADE_MS * 3) {
      // WHY: a very short clip (like the silent stand-in for a missing file) can't
      // be crossfaded with itself, so let Howler loop it the plain way.
      this.howl.loop(true, this.copyId);
      return;
    }
    this.nextCopyTimer = setTimeout(() => this.crossfadeToNewCopy(), lengthMs - CROSSFADE_MS);
  }

  crossfadeToNewCopy() {
    this.fadingCopyId = this.copyId;
    this.fadeOutAndStop(this.copyId, CROSSFADE_MS);
    this.playCopy(CROSSFADE_MS);
  }

  setVolume(volume, fadeMs = 300) {
    const from = this.volume;
    this.volume = volume;
    if (this.playing) this.howl.fade(from, volume, fadeMs, this.copyId);
  }

  stop(fadeMs = 1000) {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this.nextCopyTimer);
    this.fadeOutAndStop(this.copyId, fadeMs);
    // If we were caught mid-crossfade, hurry the older copy out as well.
    if (this.fadingCopyId !== null) this.fadeOutAndStop(this.fadingCopyId, fadeMs);
    this.copyId = null;
    this.fadingCopyId = null;
  }

  fadeOutAndStop(copyId, fadeMs) {
    const currentVolume = this.howl.volume(copyId);
    this.howl.fade(currentVolume, 0, fadeMs, copyId);
    setTimeout(() => this.howl.stop(copyId), fadeMs);
  }
}

/* ---------- Starting up ---------- */

/**
 * Before the lamp: quietly download every clip into the browser's cache.
 * WHY: we don't create any Howler sounds yet, because browsers complain about (and
 * block) audio objects made before the user's first click. A plain fetch is allowed.
 */
export function preloadSounds() {
  for (const id of Object.keys(SOUNDS)) {
    fetch(soundUrl(id)).catch(() => { /* missing or offline: silence later */ });
  }
}

/** Remembers the latest settings and, if sound is running, applies them. */
export function applySettings(settings) {
  state.settings = settings;
  refreshLoops(state.nextFadeMs);
  state.nextFadeMs = 300;
}

/**
 * Called from inside the lamp's click handler.
 * WHY: iPad Safari only unlocks audio during a real tap, so the sounds must be
 * created and the audio engine resumed right here, not a moment later.
 */
export function lampSwitchedOn() {
  if (!state.started) createAllSounds();
  if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
  state.lampOn = true;
  playEffect('fx-lamp');
  refreshLoops(1500);
}

/** Lamp off: one last click, then everything fades out over one second. */
export function lampSwitchedOff() {
  playEffect('fx-lamp');
  state.lampOn = false;
  refreshLoops(1000);
  for (const [id, howl] of Object.entries(effects)) {
    if (id !== 'fx-lamp') howl.fade(howl.volume(), 0, 1000);
  }
}

function createAllSounds() {
  for (const [id, info] of Object.entries(SOUNDS)) {
    if (info.loop) loops[id] = new SeamlessLoop(id);
    else effects[id] = loadSound(id);
  }
  state.started = true;
}

/* ---------- Effects (Main channel) ---------- */

export function playEffect(id) {
  const howl = effects[id];
  if (!howl || !state.lampOn) return;
  howl.stop();                                    // restart if it's already playing
  howl.volume(state.settings.volumes.main);
  howl.play();
}

/* ---------- Radio (Music channel) ---------- */

/**
 * Half a second of static, then the next station fades in over one second.
 * `saveStation` stores the new station number (table.js passes the almanac's saver),
 * which comes straight back to applySettings() below and swaps the music.
 */
export function tuneToNextStation(saveStation) {
  const next = (state.settings.station + 1) % STATIONS.length;
  playEffect('fx-static');
  setTimeout(() => {
    if (effects['fx-static']) effects['fx-static'].stop();
    state.nextFadeMs = 1000;
    saveStation(next);
  }, STATIC_MS);
}

/** M2: music drops to 40% while a card is in focus. */
export function setCardFocused(isFocused) {
  state.cardFocused = isFocused;
  refreshLoops(600);
}

/* ---------- Deciding what plays, and how loud ---------- */

function shouldPlay(id) {
  const { weather, station } = state.settings;
  if (id === 'loop-rain') return weather === 'rain';
  if (id === 'loop-snow') return weather === 'snow';
  if (SOUNDS[id].channel === 'music') return id === STATIONS[station];
  return true; // the fire and the clock always play
}

function loopVolume(id) {
  const { volumes, mode } = state.settings;
  if (SOUNDS[id].channel === 'music') {
    return volumes.music * (state.cardFocused ? 0.4 : 1);
  }
  let volume = volumes.ambiance;
  // The fire is a little louder in the evening, when it's the heart of the room.
  if (id === 'loop-fire') volume *= mode === 'dark' ? 1 : 0.8;
  // With the radio silent you notice the clock, so its tick comes up a little.
  if (id === 'loop-clock') volume *= volumes.music === 0 ? 1 : 0.75;
  return volume;
}

/** Looks at the lamp and the settings and starts, stops or re-levels every loop. */
function refreshLoops(fadeMs = 300) {
  if (!state.started) return;
  for (const [id, loop] of Object.entries(loops)) {
    if (state.lampOn && shouldPlay(id)) {
      loop.setVolume(loopVolume(id), fadeMs);
      loop.start(fadeMs);
    } else {
      loop.stop(fadeMs);
    }
  }
}
