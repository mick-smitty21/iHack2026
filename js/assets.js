/*
 * assets.js - the list of every picture and sound, and what to show when one is missing.
 *
 * Talks to: nothing above it. Every other module asks this file for images and sounds.
 *           File names come from IMAGE-PROMPTS.txt and SOUND-CLIPS.txt.
 *
 * Say it to a judge: "This is our asset manifest. Every image and sound is listed once
 * here, and if a file hasn't been made yet the site draws a labelled grey placeholder
 * or plays silence, so we could build the code before the art was finished."
 */

const IMG_FOLDER = 'assets/img/';
const AUDIO_FOLDER = 'assets/audio/';

// kind: 'bg'      = full background, saved as .jpg
//       'object'  = cut-out object, saved as .png
//       'onwhite' = kept on a white background (.png); drawn with mix-blend-mode: multiply
// ratio: width divided by height. It only shapes the grey placeholder; once the real
//        picture loads, its own shape is used (see createAsset). The numbers below
//        match the art after tools/prepare-art.py has trimmed its empty margins.
export const IMAGES = {
  // 1. Backgrounds
  'bg-table':          { kind: 'bg', ratio: 16 / 9 },
  'bg-box-closeup':    { kind: 'bg', ratio: 16 / 9 },
  'bg-kitchen-cook':   { kind: 'bg', ratio: 16 / 9 },
  'view-day':          { kind: 'bg', ratio: 4 / 3 },
  'view-night':        { kind: 'bg', ratio: 4 / 3 },
  // 2. Table-scene objects
  'obj-box-closed':    { kind: 'object', ratio: 1.14 },
  'obj-box-body-open': { kind: 'object', ratio: 1.13 },
  'obj-box-lid':       { kind: 'object', ratio: 1.34 },
  'obj-binder':        { kind: 'object', ratio: 1.78 },
  'obj-binder-spread': { kind: 'object', ratio: 1.89 },
  'obj-twine':         { kind: 'object', ratio: 1.24 },
  'obj-twine-loose':   { kind: 'object', ratio: 1.24 },
  'obj-mug':           { kind: 'object', ratio: 1.08 },
  'obj-pitcher':       { kind: 'object', ratio: 0.75 },
  'obj-petal':         { kind: 'object', ratio: 0.88 },
  'obj-sugar-body':    { kind: 'object', ratio: 0.91 },
  'obj-sugar-lid':     { kind: 'object', ratio: 1.36 },
  'obj-lamp-off':      { kind: 'object', ratio: 0.61 },
  'obj-lamp-on':       { kind: 'object', ratio: 0.61 },
  'obj-radio':         { kind: 'object', ratio: 1.53 },
  'obj-radio-dial':    { kind: 'object', ratio: 1 },
  'obj-clock':         { kind: 'object', ratio: 0.74 },
  'obj-calendar':      { kind: 'object', ratio: 0.63 },
  'obj-almanac-open':  { kind: 'object', ratio: 1.47 },
  'obj-kettle':        { kind: 'object', ratio: 0.9 },
  'obj-curtain':       { kind: 'object', ratio: 0.5 },
  'obj-cat-asleep':    { kind: 'object', ratio: 1.67 },  // the two cat pictures share one
  'obj-cat-awake':     { kind: 'object', ratio: 1.67 },  // crop, so they swap without a jump
  // 3. Card controls and cook-mode props
  'obj-wastebasket':   { kind: 'object', ratio: 0.9 },
  'obj-pencil':        { kind: 'object', ratio: 1.82 },
  'obj-card-stand':    { kind: 'object', ratio: 6.1 },
  'obj-egg-timer':     { kind: 'object', ratio: 0.87 },
  'obj-steno':         { kind: 'object', ratio: 0.74 },
  'obj-done-tag':      { kind: 'object', ratio: 0.41 },
  // 4. Cards and dividers
  'card-front':        { kind: 'bg', ratio: 5 / 3, unused: true },  // see HOW-IT-WORKS, "Art pass"
  'card-back':         { kind: 'bg', ratio: 5 / 3 },
  'divider-tab':       { kind: 'object', ratio: 1.49 },
  // 5. Aging overlays
  'age-yellowing':     { kind: 'onwhite', ratio: 1.72 },
  'age-coffee-ring':   { kind: 'onwhite', ratio: 1.01 },
  'age-grease':        { kind: 'onwhite', ratio: 1.14 },
  'age-fingerprint':   { kind: 'onwhite', ratio: 0.98 },
  'age-tape':          { kind: 'onwhite', ratio: 4.05 },
  'age-corner':        { kind: 'onwhite', ratio: 1.26 },
  'age-pencil':        { kind: 'onwhite', ratio: 1.72 },
  // 6. Category illustrations
  'ill-main':          { kind: 'onwhite', ratio: 0.99 },
  'ill-bread':         { kind: 'onwhite', ratio: 0.84 },
  'ill-pie':           { kind: 'onwhite', ratio: 1.5 },
  'ill-cake':          { kind: 'onwhite', ratio: 1.11 },
  'ill-cookie':        { kind: 'onwhite', ratio: 0.7 },
  'ill-soup':          { kind: 'onwhite', ratio: 0.88 },
  'ill-sides':         { kind: 'onwhite', ratio: 2.04 },
  'ill-canning':       { kind: 'onwhite', ratio: 1.21 },
  // 7. Margin doodles
  'doodle-daisy':      { kind: 'onwhite', ratio: 1 },
  'doodle-cup':        { kind: 'onwhite', ratio: 0.9 },
  'doodle-heart':      { kind: 'onwhite', ratio: 0.89 },
  'doodle-star':       { kind: 'onwhite', ratio: 0.99 },
  'doodle-spoon':      { kind: 'onwhite', ratio: 1.17 },
  // 8. Share image (only used in the page's <meta> tags, never drawn in a scene)
  'og-image':          { kind: 'bg', ratio: 1200 / 630, unused: true },
};

// channel: which volume slider controls it. loop: plays forever with a crossfade.
// optional: the team may never record it, and that's fine.
export const SOUNDS = {
  'loop-fire':      { channel: 'ambiance', loop: true },
  'loop-clock':     { channel: 'ambiance', loop: true },
  'loop-rain':      { channel: 'ambiance', loop: true },
  'loop-snow':      { channel: 'ambiance', loop: true },
  'loop-purr':      { channel: 'ambiance', loop: true },
  'radio-softrock': { channel: 'music', loop: true },
  'radio-country':  { channel: 'music', loop: true },
  'radio-jazz':     { channel: 'music', loop: true },
  'fx-lamp':        { channel: 'main' },
  'fx-lid':         { channel: 'main' },
  'fx-lid-close':   { channel: 'main' },
  'fx-shuffle':     { channel: 'main' },
  'fx-ting':        { channel: 'main' },
  'fx-binder':      { channel: 'main' },
  'fx-twine':       { channel: 'main' },
  'fx-clink':       { channel: 'main' },
  'fx-rattle':      { channel: 'main' },
  'fx-curtain':     { channel: 'main' },
  'fx-chime':       { channel: 'main' },
  'fx-kettle':      { channel: 'main' },
  'fx-static':      { channel: 'main' },
  'fx-timer-ding':  { channel: 'main' },
  'fx-pageflip':    { channel: 'main', optional: true },
  'fx-pencil':      { channel: 'main', optional: true },
};

/* ---------- Images ---------- */

export function imageUrl(id) {
  const extension = IMAGES[id].kind === 'bg' ? '.jpg' : '.png';
  return IMG_FOLDER + id + extension;
}

/**
 * Makes the element for one picture: <div class="asset"><img></div>.
 * If the file doesn't exist yet, the div turns into a grey box labelled with the id.
 * The div has no size of its own; whoever places it (table.js, card.js...) sizes it in CSS.
 */
export function createAsset(id) {
  if (!IMAGES[id]) throw new Error('Unknown image id: ' + id);

  const holder = document.createElement('div');
  holder.className = 'asset asset-' + IMAGES[id].kind;
  holder.dataset.asset = id;
  holder.style.aspectRatio = String(IMAGES[id].ratio);

  const img = document.createElement('img');
  img.alt = ''; // WHY: decorative; the <button> around it carries the aria-label.
  img.draggable = false;
  img.addEventListener('load', () => {
    if (isMissingMarker(img)) showPlaceholder(holder, id);
    // The real picture decides the shape, so replacing art never needs a code change.
    else holder.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
  });
  img.addEventListener('error', () => showPlaceholder(holder, id));
  img.src = imageUrl(id);

  holder.append(img);
  return holder;
}

// WHY: netlify.toml answers a request for a missing image with assets/missing.png, a
// 1x1 pixel, instead of a 404. That keeps the console free of red errors while art is
// still arriving. A real picture is never 1x1, so that size means "not made yet".
// (On any other web server the 404 fires the 'error' event instead; both paths work.)
function isMissingMarker(img) {
  return img.naturalWidth <= 1 && img.naturalHeight <= 1;
}

function showPlaceholder(holder, id) {
  holder.classList.add('is-placeholder');
  holder.replaceChildren(makeLabel(id));
}

function makeLabel(id) {
  const label = document.createElement('span');
  label.className = 'asset-label';
  label.textContent = id;
  return label;
}

/** Every picture the scenes actually draw (not the share image or spare paper). */
export function usedImageIds() {
  return Object.keys(IMAGES).filter((id) => !IMAGES[id].unused);
}

/** Starts downloading images so later scenes appear instantly. Never rejects. */
export function preloadImages(ids = usedImageIds()) {
  return Promise.all(ids.map(preloadOneImage));
}

function preloadOneImage(id) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ id, found: !isMissingMarker(img) });
    img.onerror = () => resolve({ id, found: false });
    img.src = imageUrl(id);
  });
}

/* ---------- Sounds ---------- */

export function soundUrl(id) {
  return AUDIO_FOLDER + id + '.mp3';
}

/**
 * Loads one sound with Howler and returns the Howl. Loading is silent; nothing plays
 * until someone calls .play(), which audio.js only does after the lamp is clicked.
 * A missing file gives silence: netlify.toml serves assets/missing.mp3 (half a second
 * of nothing) in its place, and on other servers Howler's load error is swallowed here,
 * after which .play() simply does nothing.
 */
export function loadSound(id, howlOptions = {}) {
  if (!SOUNDS[id]) throw new Error('Unknown sound id: ' + id);
  return new Howl({
    src: [soundUrl(id)],
    preload: true,
    onloaderror: () => { /* missing clip: stay silent */ },
    ...howlOptions,
  });
}
