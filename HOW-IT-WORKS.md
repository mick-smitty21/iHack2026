# How it works

Plain-language notes on how Grandma's Recipe Box is built, one section per milestone.
**Starting a new coding session? Read this first**, then the "Build status" list.

## Build status

- [x] **M0 - Foundation**
- [x] **M1 - The table scene**
- [x] **M2 - The recipe box**
- [ ] M3 - Adding and moving recipes
- [ ] M4 - Cook mode
- [ ] M5 - Polish and demo prep

## The big picture

The site is one page (`index.html`). It holds a **stage**: a box that is always 16:9 and
is scaled to fit the screen, like a film with black bars. Three **scenes** are stacked on
the stage (the table, the recipe box, the stove) and only one is shown at a time.

Each job has its own JavaScript file in `js/`. `main.js` starts everything. Each file
begins with a comment saying what it does, which files it talks to, and one sentence
you can say to a judge.

---

## M0 - Foundation

**What it does.** Opens a dark kitchen made of labelled grey boxes: one box for every
picture that hasn't been drawn yet, each roughly where it will sit.

**Which files.**

- `index.html` - the stage, the three scene containers, and the script tags.
- `css/base.css` - the colour palette as named variables, the four fonts, the stage
  sizing, and the grey placeholder look.
- `js/assets.js` - the manifest: all 56 images and 23 sounds (21 + 2 optional) by id.
- `js/table.js` + `css/table.css` - first-pass positions of the table objects.
- `js/main.js` - builds the table, shows it, preloads images, reports what's missing.
- `netlify.toml` - how the site is served, plus the missing-file rules below.
- Everything else in `js/` and `css/` is a stub with its header comment, ready for its milestone.

**How they connect.** `main.js` asks `table.js` to build scene 1. `table.js` walks its
`LAYOUT` list and asks `assets.js` for each picture with `createAsset(id)`. `assets.js`
turns the id into a file name (`.jpg` for backgrounds, `.png` for everything else),
tries to load it, and swaps in a grey labelled box if it isn't there.

**The stage unit.** `base.css` defines `--u` as 1% of the stage's width. Positions are
percentages of the stage, and text and borders are sized in `--u`, so the whole scene
scales together and looks the same on an iPad and a laptop.

**Tricky part: missing files without errors.** Normally a missing image is a red 404
error in the console. Two rules in `netlify.toml` say: if a file in `assets/img/` or
`assets/audio/` doesn't exist, send `assets/missing.png` (a single pixel) or
`assets/missing.mp3` (half a second of silence) instead. Netlify always serves a real
file first, so the rule switches itself off the moment the real file is dropped in.
`assets.js` recognises the single pixel (no real picture is 1x1) and draws the
placeholder. If the site is ever served some other way, the ordinary "image failed to
load" event does the same job.

**Tricky part: libraries.** GSAP and Howler are loaded as ordinary scripts and create
the globals `gsap` and `Howl`. idb-keyval is a JavaScript module and will be imported
from `vendor/idb-keyval.js`. Tesseract (M3) loads its worker, engine and English data
from `vendor/tesseract/`. All are local copies so the demo doesn't depend on venue Wi-Fi.

**Tricky part: "ON WHITE" images.** Stains, illustrations and doodles keep their white
background. `assets.js` marks them `kind: 'onwhite'` and `base.css` draws them with
`mix-blend-mode: multiply`, which makes white vanish into whatever is underneath.

---

## M1 - The table scene

**What it does.** The page opens on a dark kitchen lit only by moonlight and the stove.
Pulling the lamp's chain warms the room up and starts the sound. Twelve objects are
clickable, the clock shows real time, the moon shows tonight's real phase, and the
wall calendar opens Grandma's almanac (the settings).

**Which files.**

- `js/main.js` - owns the lamp: one function, `toggleLamp()`, turns light and sound on or off.
- `js/table.js` + `css/table.css` - builds the 12 buttons from the `LAYOUT` table, one small
  `add...()` function per object, plus the ambient timers (curtains, fire, kettle steam).
- `js/sky.js` - clock hands, moon and window weather, all drawn in code.
- `js/audio.js` - the three channels, the seamless loops, the radio and the reactions.
- `js/almanac.js` - holds the settings and builds the almanac panel.
- `js/storage.js` - saves and loads the settings in IndexedDB.
- `js/panels.js` + `css/panels.css` - opens/closes any panel and shows Grandma's notes. *(extra file)*
- `js/motion.js` - the single "should things move?" check, fades and random timers. *(extra file)*

The two extra files are not in the original file list. They hold code that several
modules share, so it isn't copied into each one.

**How they connect.** `main.js` loads the settings (`almanac.js` -> `storage.js`), asks
`table.js` to build the scene, then hands the settings to `table.js` and `audio.js`.
Whenever the almanac changes a setting it saves it and calls every listener, and
`main.js` passes the new settings to the same two modules again. So there is exactly
one path for settings: almanac -> main -> table and audio.

**The lamp and the dark.** Darkness is not baked into the pictures. Two dark layers sit
over the scene: `table-darkness` (lamp off) and `table-evening` (evening mode with the
lamp on). Each has soft holes cut in it with a CSS mask where light falls: the window
and stove in the first, the lamp in the second. Turning the lamp on just adds the class
`is-lit` to the scene and CSS fades the layers over 1.5 seconds. While the lamp is off
every other button is `disabled`, which is also what guarantees no sound can play
before the first click.

**Tricky part: sound on the iPad.** Browsers only let sound start during a real tap.
So nothing audio-related is created while the kitchen is dark; `audio.js` only
*downloads* the clips (a plain `fetch`, which is allowed). The Howler sounds are created
inside the lamp's click handler, which is the "unlock".

**Tricky part: loops with no seam.** A looped MP3 has a tiny gap where it restarts.
`SeamlessLoop` in `audio.js` avoids it: two seconds before a copy ends it starts a
second copy and fades from one to the other. A clip shorter than six seconds (such as
the silent stand-in for a missing file) just loops the ordinary way.

**How loud is each loop?** One function, `loopVolume()`, answers that from the settings:
its channel's slider, times a small adjustment (fire a bit louder in the evening, clock
a bit louder when Music is at zero, music at 40% while a card is in focus - that last
one is used from M2). `shouldPlay()` decides whether a loop plays at all (rain only in
rain, only the current radio station). After any change `refreshLoops()` runs both.

**The moon.** `moonPhase()` counts the days since a known new moon (6 Jan 2000) and
divides by the length of a lunar month (29.53 days); the leftover fraction is the
phase. The lit shape is two curves: half the round edge, plus the shadow's edge, which
is half an ellipse whose width follows the phase.

**The weather.** A `<canvas>` over the window glass. Each cloud, raindrop or snowflake
is a point in a 0-to-1 square, so it doesn't matter how big the window is on screen.

**Reduced motion.** `motion.js` says yes if the device asks for it *or* the almanac
switch is on. JavaScript animations check `motionReduced()` and fade instead of moving;
CSS animations (pendulum, lamp chain) carry the class `swings`, which is switched off.

**Keyboard.** Every object is a real `<button>` with an `aria-label`. Tab reaches the
lamp first. A panel keeps Tab inside itself, Esc or the X closes it, and focus returns
to the object that opened it.

**Not built yet.** The recipe box, binder and twine stack play their sound and show a
note saying which milestone they arrive in.

**When the art arrives.** Tune the numbers in `LAYOUT` (top of `table.js`) so each
object sits where `bg-table.jpg` expects it, `CLOCK_CENTER` (top of `sky.js`) so the
hands sit on the clock face, and the `.radio-dial`, `.pendulum`, `.lamp-chain` and
`.brass-label` positions in `table.css`.

## M2 - The recipe box

**What it does.** Clicking the box on the table zooms in, swings the lid open and shows
the cards standing in a row with their titles showing. You riffle through them with the
wheel, a finger or the arrow keys, jump with the divider tabs, and click a card to hold
it up. A held card can be turned over, edited, favorited, moved to another divider or
thrown out. Ten starter cards are in the box on the first visit.

**Which files.**

- `js/storage.js` - now also keeps the cards, dividers and photos. The lists live in
  memory and every change is written to IndexedDB straight away.
- `js/samples.js` - the 10 starter cards. **Each has a `// VERIFY:` comment: they were
  written from memory of the cookbook and need checking against it.**
- `js/card.js` + `css/card.css` - makes a new card's data, and draws the front, back
  and edit form. Also the flip and the second "stapled" page.
- `js/aging.js` - which wear a card shows and where.
- `js/fractions.js` - splits "1 1/2 cups flour" into amount, unit and item.
- `js/box.js` + `css/box.css` - the scene itself: opening, the deck, riffling, the tab
  rail, the held-up card and its pencil marks, and the little confirm slips.

**How they connect.** `main.js` calls `loadBox()` at startup, so the cards are ready
before anyone clicks. `table.js` calls `openBox()` when the box is clicked. `box.js`
asks `storage.js` for the cards and dividers and builds the deck. When a card is picked
up, `box.js` asks `card.js` to draw the full card. Every change (favorite, edit, move,
notes, delete) goes `box.js` -> `storage.js` -> IndexedDB, then the card is redrawn
from the saved data.

**Riffling, the one-number idea.** `position` says which item is at the front; 3.4
means "almost halfway from item 3 to item 4". The wheel adds to `velocity`; each frame
`position += velocity` and `velocity *= 0.92` (friction). When it is nearly stopped it
eases onto the nearest whole number. `layoutDeck()` then places every item from its
`distance = index - position`: items behind stand one strip higher each; the item
being flicked past (distance between 0 and -1) tips forward, drops and fades.
A finger drag changes `position` directly and hands its last speed to `velocity` when
you let go.

**Deck cards are cheap, held cards are full.** In the deck each card is only a strip of
paper with its title, so a big box stays smooth. The full card (ingredients, steps,
stains, back) is built only for the one card you pick up.

**Card sizes.** Everything on a card is sized in `em`. One CSS line sets the card's
font size to 1/42 of its width, so a card is always 25.2em tall and the same layout
works at any size. The blue rules are 1.45em apart and the text's line height is
1.45em, which is why the writing sits on the lines.

**Fonts.** A card gets one of four handwritings when it is created and keeps it
(`card.font`). Because the fonts have different natural sizes, each has a
`--font-scale` in `card.css` that evens them out.

**Tricky part: long recipes.** The browser only knows how tall text is once it is on
screen. So after a card is shown, `paginateCard()` checks whether the steps run past
the bottom; if so it moves steps one at a time onto a second page until the first
fits, and the card gains a "Next page" pencil mark and a stapled sheet behind it.

**Tricky part: the flip.** Front and back are two layers in the same place; the back is
pre-turned 180 degrees and `backface-visibility: hidden` hides whichever faces away.
Turning the wrapper 180 degrees swaps them. The hidden face is marked `inert` so Tab
and clicks can't reach it. With reduced motion the faces fade instead.

**Aging.** `agingStage(uses)` gives 0-3. Stage 1 warms the paper and rounds the
corners (pure CSS, no art needed). Stages 2 and 3 add stain pictures. Their positions
were rolled once in `makeAgingLayout()` when the card was created and saved with it.
Until the stain art exists you see faint dashed outlines where each will go.

**Paper before the art arrives.** Until `card-front.jpg` exists, the card paper, red
line and blue rules are drawn with CSS gradients, so cards are fully readable now.

**Esc backs out one layer:** slip -> edit form -> held card -> box. The X closes the box.

**Not built yet.** "Cook this recipe" shows a note (M4), so use counts don't change yet;
the samples start with different use counts so every aging stage is visible.

**When the art arrives.** Tune `.box-body`, `.box-lid` and `.deck` in `box.css` so the
deck sits inside the painted box, and the `4.2em` / `1.45em` numbers in `card.css` if
the painted rules are spaced differently.

## M3 - Adding and moving recipes

_Not built yet._

## M4 - Cook mode

_Not built yet._

## M5 - Polish and demo prep

_Not built yet._
