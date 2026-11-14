# How it works

Plain-language notes on how Grandma's Recipe Box is built, one section per milestone.
**Starting a new coding session? Read this first**, then the "Build status" list.

## Build status

- [x] **M0 - Foundation**
- [x] **M1 - The table scene**
- [x] **M2 - The recipe box**
- [x] **M3 - Adding and moving recipes**
- [x] **M4 - Cook mode**
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

**Positions.** These were first-pass guesses until the art arrived; see "Art pass"
below for how they were fitted.

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

**Paper.** The red line and blue rules are drawn with CSS gradients (see "Art pass").

**Esc backs out one layer:** slip -> edit form -> held card -> box. The X closes the box.

**Starting uses.** The samples start with different use counts so every aging stage
is visible straight away.


## Art pass (after M2, when the real art arrived)

**What changed.** The art was fitted to the code and the code to the art.

**`tools/prepare-art.py` (not part of the website).** Run it after adding or replacing
pictures: `python tools/prepare-art.py`. It does two jobs:

- *Trims objects.* Gemini centres every object in a big empty square. A clock told to
  be "10% wide" was really a 10%-wide square with a small clock in the middle, which is
  why things looked small and misplaced. The script crops each cut-out PNG to the
  object itself. Pictures that swap (lamp off/on, twine tied/loose) share one crop so
  they don't jump.
- *Whitens "ON WHITE" pictures.* Multiply blending only hides a background that is
  pure white. Gemini's "white" was often cream or shaded, which showed as pale boxes on
  the cards. The script divides each picture by its own background colour so the
  background becomes true white, then crops to the drawing.

It is safe to run repeatedly. After it runs, each picture's real shape is read when it
loads (`createAsset` in `assets.js`), so sizes in the code are simply "how wide".

**The table is laid out against the painted background.** `bg-table.jpg` already
contains a window frame, a round clock mount, a pinned sheet for the calendar, a
shelf, a stove and a table. `LAYOUT` in `table.js` puts each object on its painted
spot: the clock covers the mount, the calendar covers the sheet, the radio stands on
the shelf, the kettle on the burner, everything else on the table top.

**The window.** The view can't go "behind" a painted window, so it is drawn on top and
cut into the shape of the seven glass panes with a `clip-path` (`WINDOW_PANES` in
`table.js`). The painted wooden bars between the panes stay visible, so it reads as
looking through the glass. The moon and the weather are clipped the same way.

**Why the stains had white boxes.** `mix-blend-mode: multiply` blends a picture with
what is behind it *in the same layer*. Each stain sat in a wrapper that was rotated and
semi-transparent, and that makes the wrapper its own layer, so the stain blended with
nothing and stayed white. The fix is to put the blend on the wrapper itself
(`.age-mark` and friends in `card.css`).

**The cards' rules are drawn in code.** `card-front.jpg` has painted rules spaced for
about 9 lines of writing; a recipe needs about 14. Both faces therefore use the plain
paper of `card-back.jpg`, and the red line and blue rules are CSS gradients spaced at
exactly the text's line height. `card-front.jpg` is currently unused.

**The box holds the cards.** The open box is painted at an angle. To make cards stand
inside it, the box picture is drawn twice: once behind the cards, and once in front,
clipped to just the near walls, which hides the cards' feet. The deck and the lid are
skewed by the angle of the box's front edge (`BOX_SLANT_DEGREES` in `box.js`), and
cards further back step up and to the left (`BACK_STEP`) to follow the box's sides.

**Dividers.** A divider is `divider-tab.png` drawn the same size as a card. Its tab
takes up the divider's own title strip, so it never hides the title of the card
behind it.

**The dog-eared corner.** At the well-loved stage the top-right corner of the card
front is snipped off with a `clip-path`, and the fold from `age-corner.png` is laid
over it with its inner edges faded out.

**Sitting right.** The shelf is painted above eye level and sloping away to the
right, so the radio art is drawn from below with its near end on the left, and is
turned 3 degrees to set its base along the shelf. The radio's own dial is covered by
`obj-radio-dial.png`, squeezed slightly sideways to match the angle of the radio's
face; only the picture inside turns when you click. The binder is painted from
straight above, so CSS tips it back (`rotateX`) to make it lie on the table.

**Small touches.** Objects on the table and stove get a soft contact shadow.
The pendulum swings inside the clock's painted glass door. The site name is typed on
the paper slip in the box's brass holder.

**If art is replaced later.** Run the script, reload, and compare. The numbers to
nudge are `LAYOUT` and `WINDOW_PANES` (`table.js`), `CLOCK_CENTER` (`sky.js`), and in
`box.css` the `.box-front` clip, `.deck` and `.box-lid`.

## M3 - Adding and moving recipes

**What it does.** The binder on the table adds a recipe three ways: from a web link,
from a photo, or by writing it out. All three end at the same place: a card form you
can correct, a preview of the finished card with a suggested divider, and the card
sliding into the box with a ting. The twine-tied stack saves the whole box to one
file, or adds the cards from such a file.

**Which files.**

- `js/importer.js` - the binder panel, the photo clean-up, Tesseract, the preview,
  the filing animation, and the twine panel.
- `netlify/functions/fetch-recipe.js` - the only server code: fetches a page and
  returns its recipe.
- `js/storage.js` - `makeBundle()` and `mergeBundle()` for export and import.
- `css/panels.css` - the binder and twine styles.
- `js/table.js` - the binder and twine objects now open their panels.

**One form, three ways to fill it.** The binder's right-hand page is always the same
card form. The left-hand page has three tabs ("sleeves") that are just three ways of
filling that form in: fetch a link, read a photo, or do nothing and type. Whatever
the link or photo gives is only a first draft the user corrects. That is why there is
one `fillForm()` and one `readForm()`, not three separate paths.

**From a link.** A browser is not allowed to read another website's pages (a security
rule called the same-origin policy), so the site asks our Netlify Function to do it.
Recipe sites publish their recipe as structured data for search engines, in a
`<script type="application/ld+json">` block using the schema.org "Recipe" format. The
function finds that block and returns title, ingredients, steps and servings. Nothing
is guessed and no AI is involved; if a site doesn't publish that data, or blocks us,
the user gets Grandma's note and writes it out instead.

**Tricky part: keeping the function safe.** A function that fetches any address could
be tricked into fetching private addresses inside Netlify's own network. So it only
accepts http/https, looks up where the name really points and refuses private and
local addresses, follows redirects itself so every hop gets the same check, and gives
up after 8 seconds.

**From a photo.** Everything happens in the browser; the photo never leaves the
device. `prepareForReading()` cleans the picture on a `<canvas>`: grey it, stretch the
contrast, then an *adaptive threshold* marks a pixel as ink if it is clearly darker
than its own neighbourhood. That handles shadows and yellowed paper, where one fixed
cut-off would fail. Tesseract.js (loaded from `/vendor` only when first needed) reads
the cleaned picture. `sortLinesIntoRecipe()` makes the first line the title, lines
starting with an amount ingredients, and the rest steps. Tesseract reads print well
and handwriting poorly, which is exactly why the result lands in an editable form
beside the photo ("copy it out"). The original photo is saved (shrunk to 1200 px) and
shown on the card's back.

**Suggesting a divider.** `suggestDivider()` looks for words in the title in a fixed
order: cookie, soup, pie or cake, bread or biscuit, chicken/beef/pork, jam or pickle.
The first match wins (so "Chicken Pot Pie" suggests Cakes & Pies), and the user can
change it on the preview.

**Filing.** The card is saved first, then a small paper card animates from the middle
of the screen to wherever the recipe box is, and `fx-ting` plays as it lands.

**Bundles.** "Tie up a bundle" writes every card, divider and photo into one JSON
file named `grandmas-recipe-box-YYYY-MM-DD.json`. A JSON file can only hold text, so
photos are stored as base64 text. "Untie a bundle" adds the cards from a file and
skips any card whose id is already in the box, so loading the same bundle twice
changes nothing. Dividers the box doesn't have yet come along with their cards.

**Needs `npx netlify dev`.** "From a link" only works when the site is served by
Netlify (locally with `npx netlify dev`, or deployed), because that is what runs the
function. Photos, writing out and bundles work anywhere.

## M4 - Cook mode

**What it does.** "Cook this recipe" on a held card closes the box and takes you to
Grandma's stove. The card stands in a holder. You can tick off ingredients, follow one
step at a time on the steno pad, run up to three egg timers, and change the servings.
The "Done cooking" tag writes the date, your notes and an optional photo on the back
of the card, then the card slides back into the box. "Not today" just goes back.

**Which files.**

- `js/cook.js` + `css/cook.css` - the whole scene and its four tools.
- `js/fractions.js` - `formatKitchenFraction()` and `formatIngredient()` for scaling.
- `js/sky.js` - `timeOfDay()`.
- `js/box.js` - "Cook this recipe" now calls back to `main.js`.
- `js/main.js` - passes the card from the box to the stove, and brings you back.
- `js/panels.js` - `slideCardInto()`, the card-into-the-box animation, now shared by
  the binder and the stove.

**How they connect.** `box.js` doesn't know about the stove; it just tells `main.js`
"cook this card". `main.js` calls `openCook(card, illustration)`. When you leave,
`cook.js` tells `main.js` whether the cook was logged, and `main.js` shows the table
and, if it was, slides the card into the box with the ting.

**It is the same card.** `cook.js` asks `card.js` for the normal card, then adjusts
it: each ingredient line becomes a button you can tick, the "Makes" line gains a
minus and a plus, and the current step gets a pencil underline. Nothing about the
card's look is duplicated.

**When a use is counted.** The moment cooking starts, `card.uses` goes up by one and
is saved; that is the only thing that ages a card. During the cook the card is drawn
as it looked *before*. On "Done cooking", if that use pushed it into a new stage,
`showNewWear()` swaps in the new wear layer and the new stains bloom in. "Not today"
skips the log, but the use still counts, as the spec says.

**Servings and kitchen fractions.** Changing "Makes" gives a scale (new servings
divided by the written servings). Each ingredient's amount is multiplied by it and
`formatKitchenFraction()` rounds to the nearest fraction a cook actually measures
(eighths, quarters, thirds, halves), so you never see a decimal. Lines with no amount
("salt to taste") are left exactly as written. Big batches (12 or more) change by six
at a time.

**Tricky part: timers that stay right.** A timer stores the clock time it should
*end* at, and four times a second works out how long is left. It does not count down
a number, because browsers slow timers down in background tabs and the count would
drift. Dragging round the egg sets the minutes from the angle of your finger
(straight up is 0, a quarter turn is 15); the arrow keys do the same for keyboards.

**Light in the kitchen.** It follows the almanac first, then the clock. Evening (dark
mode) is always night. Afternoon (light mode) uses `timeOfDay()`, which reads the
device clock and returns dawn, day or dusk; if the clock says night, plain daytime is
shown, so choosing Afternoon always gives a daylight kitchen. That one word becomes a
class on the scene (`time-dusk`), and `cook.css` has a sky tint for the window and a
faint colour wash for the room for each.

**The window.** The view fills the painted pane exactly (`.cook-glass`). Two
full-length curtain panels, made from the same `obj-curtain.png` as the table scene,
hang from a rod drawn in CSS. They cover the short half-height curtains that are
painted into the background.

**The card stands on its rest.** The rest is a long low block seen from the front.
It is drawn after the card, so its top edge covers the card's bottom edge and the
card looks like it stands in the groove. The "Done cooking" tag hangs from the
rest's brass hook.

**The egg timer's dial** is a dotted ring round the egg with one knob on it. The
code turns the whole ring; the knob rides round with it to mark the minutes.

**Fitted to this background.** The layout was measured against the current
`bg-kitchen-cook.jpg`: a plain wall, one window upper left, and a level counter
across the bottom. The timers stand on the counter under the window, the steno pad
between the window and the card, the card and its rest on the right. **If that
picture is replaced again, the positions in `cook.css` must be re-measured**;
nothing adjusts itself.

**Keys.** Left and Right arrows change the step. Esc closes the log form if it is
open, otherwise leaves the stove.

**If the art is replaced.** Positions live at the top of each block in `cook.css`
(`.cook-card`, `.cook-stand`, `.cook-steno`, `.cook-timers`, `.cook-window`).

## M5 - Polish and demo prep

_Not built yet._
