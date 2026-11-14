# Build prompt: Grandma's Recipe Box (iHack 2026)

Paste everything below the line into Claude Code, with Claude Code opened in the iHack2026 folder. Start a new Claude Code session for each milestone if the conversation gets long; the prompt tells it to pick up from HOW-IT-WORKS.md.

---

## Goal

Build "Grandma's Recipe Box," a single-page website that is the most nostalgic recipe experience possible. It recreates Grandma's early-1980s farmhouse kitchen: the user switches on a table lamp, opens a wooden recipe box, riffles through 3x5 cards that visibly age with use, and cooks from them at Grandma's stove. It replaces the ad-filled recipe blogs of today with the recipe tin every home used to have.

This is for a 22.5-hour hackathon (iHack 2026). The team does not need to win; the site needs to work smoothly in a live demo on an iPad, and both team members must be able to explain every part of the code to a judge. Build it in stages and stop after each milestone so the team can test before moving on.

## Context

**Team.** Two people. Both have written HTML, CSS, JavaScript and Python before, but neither has built a project this size. Person A makes the art and the three radio songs; Person B drives you. Use plain, readable code they can follow and explain.

**Where you're working.** You are running in the folder `iHack2026`. That folder is the repo root. The team copies it to GitHub and deploys from GitHub to Netlify (free tier). The folder already contains:
- `IMAGE-PROMPTS.txt` - the 56 images Person A is generating, with the exact file name for each (all go in `assets/img/`).
- `SOUND-CLIPS.txt` - the 21 sound clips, with exact file names (all go in `assets/audio/`). 20 are already in `assets/audio/` (18 required plus fx-pageflip and fx-pencil), generated with code by `tools/synth-sounds.py`. Only the three radio songs are still coming from the team.
- `ihack_project2026.txt` - the team's original concept notes.

Read all three before writing code. Treat their file names as the only correct asset names.

**Art and sound arrive late and in batches.** The site must run from the first milestone with grey placeholder shapes (labelled with the asset id) for any image file that doesn't exist yet, and silence for any missing sound. Dropping a correctly named file into the folder must make it appear with no code change.

**Demo device.** iPad with Safari, plus desktop Chrome. Desktop and tablet only; no phone layout.

**Hard constraints.**
- Plain HTML, CSS and JavaScript (ES modules). No framework, no TypeScript, no build step.
- Allowed libraries only: GSAP (animation timelines), Howler.js (audio), Tesseract.js (photo text), idb-keyval (IndexedDB). Download pinned versions into `/vendor/` so the site works if the venue's internet is poor; don't load them from a CDN at runtime.
- One Netlify Function, `netlify/functions/fetch-recipe.js`, is the only server code.
- The live site uses no AI model and needs no API keys or accounts.
- No location permission prompt. No sound before the user's first click (browsers block it).
- Fonts: Homemade Apple, Caveat, Reenie Beanie, Special Elite (Google Fonts). Download them into `/fonts/`.
- Never request "transparent" images from anyone; objects arrive as PNGs already cut out, and files marked "ON WHITE" in IMAGE-PROMPTS.txt keep their white background and must be drawn with `mix-blend-mode: multiply`.

## Action

Build the site in six milestones. Finish one milestone, report (see Output Format), then **stop and wait** until the team replies "go M1", "go M2" and so on. Never start the next milestone on your own. If you're starting fresh in a new session, read `HOW-IT-WORKS.md` first to see what's already built.

The full product spec is in the appendix below. When the spec and this list disagree, the spec wins. Don't add features that aren't in the spec; the "ADD LATER" items are built only if the team asks.

**M0 - Foundation (about 1 hour).** Create the folder structure from the appendix, `index.html` with the three scene containers, `css/base.css` with the palette as CSS variables, `js/assets.js` (a manifest of every image and sound file name read from the two .txt files, plus the placeholder and silent-audio fallback), a stub of every JS module with its header comment, `netlify.toml`, `README.md` (how to run with `npx netlify dev`, how to deploy, where assets go), `HOW-IT-WORKS.md` (skeleton), `AI-DISCLOSURE.md` and an empty `CREDITS.txt`. Done when `npx netlify dev` shows a dark page with placeholder shapes and the console has no errors.

**M1 - The table scene (about 5 hours).** Dark-kitchen loading state, the lamp entry, the layered table scene, all 12 clickables with their behaviors and sounds, ambient motion, the real-time wall clock, the moon phase, window weather, Grandma's almanac (settings) panel, the three-channel audio engine with the radio stations and reactive sounds, the classroom-pointer cursor, keyboard access and reduced motion.

**M2 - The recipe box (about 6 hours).** IndexedDB storage, the 10 sample cards, the box opening sequence, dividers (including Favorites and "+ new"), free riffling with momentum (wheel, trackpad, touch), card focus with background blur, the 3D flip, card rendering (fonts, ruled lines, illustrations, doodles), aging overlays, favorite, edit, move to divider, delete with confirmation, and all three ways to close the box.

**M3 - Adding and moving recipes (about 4 hours).** The binder import panel with three sleeves (link, photo, write it out), the fetch-recipe Netlify Function, the Tesseract photo path with image pre-processing and the "copy it out" correction editor, the preview card, divider suggestion, the slide-in-with-a-ting filing animation, and the twine-stack export and import.

**M4 - Cook mode (about 3.5 hours).** The stove scene with the time-of-day gradient, the card in its stand, the ingredient checklist, one step at a time on the steno pad (with arrow keys), up to three egg timers, servings scaling with kitchen fractions, the Done Cooking log (date, optional photo, notes), the aging-stage-up animation, and "Not today."

**M5 - Polish and demo prep (about 3 hours).** An iPad Safari pass (audio unlock, touch targets, blur performance, `100dvh`, no double-tap zoom), a performance pass (image sizes, lazy loading after the lamp), an accessibility pass, Open Graph tags using `og-image.jpg`, a favicon, and final versions of README, HOW-IT-WORKS, AI-DISCLOSURE and CREDITS. After M5 nothing new is added.

**M6 - The cat and ambient toggles (about 2 hours; added by the team after M5).** A cat asleep under the table that lifts its head at random intervals and goes back to sleep; a purring loop on the Ambiance channel; and an on/off switch for each ambient sound in the almanac, in addition to the Ambiance slider. Spec: "M6: the cat and ambient toggles" in the appendix. Needs two new images and one new sound, listed there.

**M7 - First-visit intro (about 2 hours; added by the team after M5).** On the first visit only, handwritten notes with hand-drawn arrows point out the vitals and nothing else, then get out of the way. Spec: "M7: first-visit intro" in the appendix.

**M8 - Title sign (about 1 hour; added by the team after M7; the last milestone).** A painted sign reading "Grandma's Recipe Box" hangs over the dark kitchen whenever the lamp is off. Pulling the lamp chain is still the way in: the sign fades away as the room lights up, and comes back when the lamp is switched off. No new button. Spec: "M8: title sign" in the appendix.

M6, M7 and M8 follow the same rules as M0-M5: build one, report in the five-section format, update HOW-IT-WORKS.md, stop and wait for "go". They replace the old rule that nothing is added after M5; nothing beyond M8 is added without the team asking.

**Rules for the code itself.**
- Every file starts with a header comment: what the file does, which files it talks to, and one sentence the team could say to a judge.
- Add a `// WHY:` comment wherever the reason isn't obvious (browser quirks, timing, workarounds). Don't comment obvious lines; the team can read JavaScript.
- Keep functions short and named for what they do. Prefer clarity over cleverness.
- Positions in the scene are percentages of a fixed 16:9 "stage" that scales to fit the screen (letterboxed), so layout is identical on iPad and desktop.
- Every clickable is a real `<button>` with an `aria-label`, reachable by Tab, activated by Enter or Space, with a visible warm focus outline. Esc closes whatever is open.
- Respect `prefers-reduced-motion` and the almanac's reduced-motion switch: replace movement with fades.
- Save to IndexedDB after every change. Never lose user data on a reload.
- The Netlify Function only accepts http/https URLs, refuses private and localhost addresses, times out after 8 seconds, and returns a clear error the site can show as Grandma's note.

## Output Format

After each milestone, reply with exactly these five sections, in this order, and nothing else:

1. **Built** - one or two sentences on what now works.
2. **Files** - every file created or changed, one line each with a short reason.
3. **Run it** - the exact commands to run locally, and anything to install first.
4. **Test it** - a checklist of 6-15 specific things to try, split into "Desktop" and "iPad", each with what should happen. Include at least one keyboard-only check.
5. **Say it to a judge** - 3-5 plain sentences explaining how this milestone works, in words a non-coder would follow.

Also update `HOW-IT-WORKS.md` at every milestone with a plain-language section for what was just built (what it does, which files, how they connect, any tricky part and why it's done that way). Then stop and wait for the next "go".

Keep replies short; the explanations belong in HOW-IT-WORKS.md and in the code comments, not in the chat. If something in the spec is impossible or unclear, ask one specific question before building that part instead of guessing.

---

## Appendix: product spec

### Look and feel
- Early-1980s farmhouse kitchen, Grandma's house. Illustrated (hand-painted gouache style), warm and soft.
- Palette: harvest gold, avocado green, burnt orange, walnut brown, cream, faded red gingham. Nothing on screen is pure white or pure black.
- Interface controls are physical objects wherever possible (lamp, dial, binder, twine). Avoid floating buttons.
- Motion is slow and gentle; nothing flashes or pops.
- Site name "Grandma's Recipe Box" appears only on the box's brass label and in the browser tab title.

### Flow
Dark kitchen → click lamp → Grandma's table. From the table: recipe box → card in focus → "Cook this recipe" → cook mode → "Done Cooking" → card filed back in the box with a ting. Also from the table: the binder (add a recipe → new card filed into the box), the twine stack (export/import) and the wall calendar (almanac settings). Esc, the X in the top-right corner, and "Not today" return to the table.

### Scene 1: the table
- **Before the lamp:** the scene is dark except the stove's fire glow and moonlight through the window. The lamp's pull-chain sways gently, with a small kraft tag (`obj-done-tag`) reading "Pull me" in handwriting. Preload all images and sounds in the background now.
- **Lamp click:** the scene warms up over about 1.5 seconds and all three sound channels start. Later lamp clicks toggle: off dims everything and fades all audio out over one second.
- **Layout, back to front:** window with gingham curtains (upper left, with `view-day` or `view-night` behind the glass), wall clock (upper middle), feed-store calendar (upper right); wood cookstove with fire and kettle (right), wall shelf with the radio (left); pitcher of dried flowers, sugar pot and coffee mug on the table; recipe box (center right), open binder (front left), twine-tied stack (front right), lamp (far left edge). Background image `bg-table.jpg`.
- **The 12 clickables:**

| # | Object | Behavior | Sound |
|---|---|---|---|
| 1 | Lamp | Enter the site; later toggles lights and audio | fx-lamp |
| 2 | Recipe box | Opens Scene 2 | fx-lid |
| 3 | Binder | Opens the import panel | fx-binder |
| 4 | Twine stack | Opens export/import (shows `obj-twine-loose` while open) | fx-twine |
| 5 | Mug | Steam rises, mug slides slightly | fx-clink |
| 6 | Dried flowers | One `obj-petal` drifts down to the tablecloth | none |
| 7 | Window | Curtains open/close | fx-curtain |
| 8 | Sugar pot | Lid (`obj-sugar-lid`) rattles | fx-rattle |
| 9 | Wall clock | Soft chime | fx-chime |
| 10 | Radio | Dial (`obj-radio-dial`) turns; next station | fx-static then crossfade |
| 11 | Kettle | Whistle, then a burst of steam | fx-kettle |
| 12 | Wall calendar | Opens Grandma's almanac panel | fx-pageflip if present |

- Hover (desktop) shows a soft warm glow on clickables. On touch devices, clickables pulse faintly once every 20 seconds so users can find them.
- **Ambient motion (randomized timing):** curtains sway every 6-10 s; firelight flickers on nearby surfaces; kettle steam puffs every 20-40 s; clock pendulum swings in time with the tick; weather plays in the window.
- **Clock:** hands (drawn in code) show the device's real local time.
- **Moon:** drawn in code in the night window at today's real moon phase, calculated from the date.
- **Almanac panel** (on `obj-almanac-open`): light/dark mode (light = warm afternoon with `view-day`; dark = evening, lamp as main light, `view-night`); weather: clear, clouds, rain, snow (drawn in code); three volume sliders (Main, Music, Ambiance); reduced-motion switch. Settings persist.
- **Cursor:** a retro wooden classroom pointer stick, drawn as an SVG cursor, used site-wide.

### Scene 2: the recipe box
- **Opening (about 1.2 s, GSAP timeline):** camera zooms toward the box while the table softens and darkens (`bg-box-closeup.jpg`); the lid (`obj-box-lid`) swings open on its hinge off `obj-box-body-open`; divider tabs rise with fx-shuffle.
- **Dividers:** starting set Breads, Cakes & Pies, Cookies, Main Dishes, Soups, Sides, Canning & Preserves. An automatic "Favorites" divider sits first. A blank tab at the back says "+ new"; clicking it lets the user write a label (shown in handwriting). Clicking a tab jumps to that section. No search anywhere.
- **Riffling:** wheel, trackpad or touch swipe moves through cards freely with momentum; each card tilts forward as it passes like a thumb flicking the deck; the title strip at each card's top edge stays readable.
- **Card in focus:** clicking a card lifts it out and enlarges it toward the viewer; everything behind blurs and music drops to 40%. Controls are pencil marks on the card edge: Turn over (3D flip), Cook this recipe, Heart (favorite, shows `doodle-heart` in the corner), Pencil (edit, `obj-pencil`), Move to... (divider), Wastebasket (delete after a "Throw this card out?" confirmation, `obj-wastebasket`).
- **Card front:** `card-front.jpg` with the title, "From the kitchen of ___" (blank on new cards; optional), ingredients, condensed steps on the blue rules, one category illustration (`ill-*`) and sometimes a doodle (`doodle-*`). Long recipes continue on a second card that looks stapled behind the first.
- **Card back:** `card-back.jpg` with editable notes in handwriting, the cook log (date, photo, notes from each Done Cooking), the original photo for scanned cards, and the source link or "Adapted from..." credit.
- **Lettering:** each card is assigned one font when created (Homemade Apple, Caveat, Reenie Beanie or Special Elite) and keeps it.
- **Illustrations:** fixed per divider (Main Dishes → ill-main, Breads → ill-bread, Cakes & Pies → ill-pie or ill-cake, Cookies → ill-cookie, Soups → ill-soup, Sides → ill-sides, Canning & Preserves → ill-canning; user-made dividers get a random one). A random doodle is chosen at creation for about half the cards and saved.
- **Aging** (only "Cook this recipe" counts as a use; overlays on white, multiply blend, never covering legibility):

| Stage | Uses | Overlays |
|---|---|---|
| Crisp | 0 | none |
| Softened | 1-2 | age-yellowing (light), rounded corners |
| Stained | 3-5 | + age-coffee-ring, age-pencil, age-fingerprint |
| Well-loved | 6+ | + age-corner, age-tape, age-grease, stronger yellowing |

  Overlay positions and rotations are randomized once per card and saved, so a card always looks the same.
- **Closing:** Esc, the X in the top-right corner, or choosing "Cook this recipe." The lid closes (fx-lid-close) and the camera pulls back.

### Scene 3: cook mode
- Background `bg-kitchen-cook.jpg`; the window shows `view-day` or `view-night`. The card sits in `obj-card-stand` beside the burners.
- **Time-of-day gradient** (device clock) over the window and a soft wash: 5-9 am peach dawn; 9 am-4 pm pale gold; 4-8 pm orange-rose dusk; 8 pm-5 am deep indigo night.
- **Tools, in build priority:** (1) ingredient checklist: tap an ingredient on the card for a pencil check and grey it out; (2) one step at a time: current step underlined in pencil on the card and shown large on `obj-steno` with Back/Next arrows and the arrow keys; (3) egg timers: tap `obj-egg-timer` to add one, drag its dial to set minutes, ticks, rings fx-timer-ding; up to three at once; (4) servings: "Makes 4" with − and + marks; quantities scale and display as kitchen fractions (½, ⅓, ¼, ⅔, ¾, ⅛), never decimals; ingredients without a parseable number don't scale.
- **Done Cooking:** the `obj-done-tag` hanging from the stand opens a form on the card's back: date (today pre-filled), optional photo, notes (e.g. "Cook at 350 for 6 hours instead"). Saving files the card back into the box with a slide and fx-ting. If the card just reached a new aging stage, animate it (coffee ring blooms, corner folds).
- **Not today:** returns to the table without a log entry. The use was already counted when cooking started.

### Adding and moving recipes
- **Binder panel** (on `obj-binder-spread`) with three tabbed sleeves:
  - **From a link:** paste a URL → `/.netlify/functions/fetch-recipe?url=...` fetches the page, finds schema.org Recipe JSON-LD (handle `@graph`, arrays, `HowToStep` and `HowToSection`, string or array instructions), and returns `{title, ingredients[], steps[], servings, sourceUrl}`. If nothing is found, show Grandma's note: "I couldn't make that one out. Want to write it out instead?" and pre-fill whatever was found.
  - **From a photo:** upload or take a photo (`accept="image/*"`, `capture="environment"` on iPad). Pre-process on a canvas (greyscale, contrast boost, adaptive threshold), run Tesseract.js in the browser, and show the draft text in a "copy it out" editor beside the photo for the user to correct. Lines that start with a quantity become ingredients; the rest become steps; the user can fix both. The original photo is saved and shown on the card's back.
  - **Write it out:** a blank card form: title, from the kitchen of (optional), ingredients, steps, servings.
- Every path ends with a preview card, a suggested divider from keywords (cookie → Cookies, soup → Soups, pie or cake → Cakes & Pies, bread or biscuit → Breads, chicken, beef or pork → Main Dishes, jam or pickle → Canning & Preserves), then the card slides into the box with fx-ting.
- **Twine stack:** "Tie up a bundle" downloads `grandmas-recipe-box-YYYY-MM-DD.json` containing every card, divider, note, log and photo (photos as base64). "Untie a bundle" opens a file picker and merges cards, skipping any card id already present.

### Sound
- Three channels with independent volumes: Main (effects, default 80%), Music (radio, 35%), Ambiance (fire, clock, rain, snow, 60%).
- Loops (loop-fire, loop-clock, loop-rain, loop-snow, radio-softrock, radio-country, radio-jazz) are 60-90 s; play two overlapping copies with a 2-second crossfade so seams are inaudible.
- Radio: clicking the dial plays fx-static for half a second, then crossfades to the next station (soft rock → country → jazz → soft rock).
- Reactions: music drops to 40% while a card is in focus; the clock tick gets slightly louder when music volume is 0; rain or snow loops play only when that weather is chosen; the fire is slightly louder in dark mode; lamp-off fades everything out over 1 s.
- iPad: unlock audio inside the lamp's click handler.

### Data
```
Card {
  id, title, kitchenOf (may be empty), dividerId,
  ingredients: [{ qty (number or null), unit, item, raw }],
  steps: [string], servings (number or null),
  source: { type: "url" | "photo" | "hand" | "sample", url, credit },
  photoId, notes,
  cookLog: [{ date, photoId, notes }],
  uses, favorite, font, doodle, agingLayout, createdAt
}
Divider { id, label, order, illustration }
Settings { mode, weather, volumes {main, music, ambiance}, reducedMotion, station }
```
Photos are stored as separate IndexedDB entries, resized to at most 1200 px JPEG, referenced by id.

### Sample cards (10)
Adapt these from Fannie Farmer's *Boston Cooking-School Cook Book* (public domain in the USA; Project Gutenberg ebook #65061). Modernize vague directions ("a moderate oven") into exact temperatures and times. The card back credits "Adapted from Fannie Farmer's Boston Cooking-School Cook Book" with the link https://www.gutenberg.org/ebooks/65061. Mark each sample in `js/samples.js` with a `// VERIFY:` comment so the team checks it against the book.

| Recipe | Divider | Starting uses | Extras |
|---|---|---|---|
| Soft Molasses Gingerbread | Cakes & Pies | 7 | Favorite, two cook-log entries |
| Apple Pie | Cakes & Pies | 6 | Favorite, a margin note |
| Baking Powder Biscuits | Breads | 4 | |
| Corn Cake (cornbread) | Breads | 1 | |
| Sugar Cookies | Cookies | 3 | Favorite |
| Molasses Cookies | Cookies | 2 | |
| Chicken Fricassee with Dumplings | Main Dishes | 8 | Note: "Double the dumplings" |
| Cream of Tomato Soup | Soups | 0 | |
| Scalloped Potatoes | Sides | 1 | |
| Chili Sauce | Canning & Preserves | 0 | |

Samples load only when the box is empty (first visit).

### File structure
```
/index.html
/css/   base.css  table.css  box.css  card.css  cook.css  panels.css
/js/    main.js      startup, lamp, switching scenes
        assets.js    asset manifest, placeholders, preloading
        audio.js     three channels, radio, reactions
        table.js     clickables and ambient motion
        sky.js       clock hands, moon phase, weather, time-of-day gradient
        box.js       lid, dividers, riffling, focus
        card.js      drawing card fronts and backs, flipping
        aging.js     which overlays a card gets and where
        cook.js      checklist, steps, timers, servings, done cooking
        fractions.js parsing and scaling quantities
        importer.js  binder: link, photo, write it out
        storage.js   IndexedDB save/load, export/import
        almanac.js   settings panel
        samples.js   the 10 starter cards
/netlify/functions/fetch-recipe.js
/vendor/  gsap, howler, tesseract (+ its worker and English data), idb-keyval
/fonts/
/assets/img/   /assets/audio/
/tools/synth-sounds.py   (already exists: Python script that generated the sound effects; not part of the website)
netlify.toml  README.md  HOW-IT-WORKS.md  AI-DISCLOSURE.md  CREDITS.txt
```

### AI-DISCLOSURE.md must say
- Code: written with Claude (Anthropic) in Claude Code, reviewed and explained by the team.
- Artwork: generated with Google Gemini from the prompts in IMAGE-PROMPTS.txt, then cleaned up by the team.
- Sound effects and ambient loops: generated with code written by Claude (`tools/synth-sounds.py`), no recordings or samples used.
- Radio music: provided by the team; any outside tracks credited in CREDITS.txt.
- Sample recipes: adapted from a public-domain cookbook.
- The live site uses no AI model: link reading uses recipe data that sites already publish, and photo reading runs Tesseract.js in the browser.

### M6: the cat and ambient toggles

**The cat.**
- A farmhouse cat (orange tabby) curled up asleep on the rug under the table in Scene 1, between the table legs, drawn behind nothing and in front of the background. It sits on the floor, so it gets the same soft contact shadow as the table objects.
- Two pictures that swap: `obj-cat-asleep.png` and `obj-cat-awake.png` (same cat, same curled body, only the head differs). The swap is a slow crossfade (about 0.6 s), never a jump.
- **Behaviour:** at a random interval of 25-60 s the cat lifts its head, stays up for 3-6 s, then lowers it and sleeps again. Timing is re-rolled each time. Nothing happens while the lamp is off.
- **Clickable #13:** the cat is a real `<button>` (aria-label "Cat: give it a pat"). A click or tap makes it look up straight away and the purr swells for about 3 s, then both settle. No new sound effect.
- **Reduced motion:** unchanged, because the only motion is a fade.
- **Dark kitchen:** the cat is under the darkness layer like everything else and is disabled until the lamp is lit.

**The purr.**
- New loop `loop-purr.mp3` on the **Ambiance** channel, played with the same two-copy crossfade as the other loops. Quiet: about half the level of the fire at the same slider position.
- Plays whenever the lamp is on and its switch (below) is on. It does not stop when the cat looks up.
- Generated with code like the other ambient loops (extend `tools/synth-sounds.py`), so there is nothing to license. Add it to SOUND-CLIPS.txt, CREDITS.txt and AI-DISCLOSURE.md.

**Ambient switches (almanac).**
- Under the Ambiance slider, one on/off switch per ambient sound: **Fire**, **Clock tick**, **Cat's purr**, **Weather** (the rain or snow loop, whichever the chosen weather plays). All default to on.
- The slider still sets how loud the whole Ambiance channel is; a switch that is off silences just that one sound (with the usual short fade). Example: clock off, fire and purr on.
- The switches are real checkboxes with labels, reachable by Tab, and are saved with the other settings. Settings saved before M6 have no switches stored and must load with everything on.
- These switches affect only the looping ambient sounds. Clicking the clock still chimes; the Music channel is unchanged.

**Data.** `Settings` gains `ambient: { fire, clock, purr, weather }` (booleans, default true).

**New assets (2 images, 1 sound).** Add these to IMAGE-PROMPTS.txt as [57] and [58], to SOUND-CLIPS.txt, and to the manifest in `js/assets.js`. Pair the two cat pictures in `tools/prepare-art.py` so they are cropped to the same box.

[57] `assets/img/obj-cat-asleep.png` - SIZE 4:3, 1600x1200 - OBJECT (remove background)
PROMPT: (STYLE BLOCK) An orange tabby farmhouse cat curled up asleep on the floor, seen from the front and slightly above. Its body is curled into a rounded loaf with its tail wrapped round its side, its head resting down on its front paws at the LEFT end of its body, eyes closed, ears relaxed. The whole cat is in the picture, with nothing cut off. No cushion, no basket, no rug, no floor, nothing else in the picture. On a plain flat pure-white background, centered, with empty space around it, no shadow on the background.
CHECK: eyes closed; head down on the paws; whole cat visible; nothing under or beside it.

[58] `assets/img/obj-cat-awake.png` - SIZE 4:3, 1600x1200 - OBJECT (remove background)
Make this in the SAME Gemini chat, straight after [57].
PROMPT: (STYLE BLOCK) The same orange tabby cat in exactly the same curled position, the same size and in exactly the same place in the picture, with its body, legs and tail unchanged. ONLY the head is different: the head is lifted up off the paws and turned to look toward the viewer, eyes open, ears pricked up. No cushion, no basket, no rug, no floor, nothing else in the picture. On a plain flat pure-white background, centered, with empty space around it, no shadow on the background.
CHECK: body and tail match [57] in size and position; head up, eyes open; looking toward the viewer.

`assets/audio/loop-purr.mp3` - Ambiance loop, 60-90 s, soft steady cat purr, generated with code.

**Done when:** the cat sleeps under the table, looks up on its own now and then and when patted; the purr is audible with the lamp on; each of the four switches silences only its own sound; all of it survives a reload; and a settings record saved before M6 still loads.

### M7: first-visit intro

**Goal.** A first-time visitor learns the few things they must know, and is nudged to explore everything else on their own. It points; it never blocks.

**When.** Only on the first visit (a saved flag). It can be replayed from the almanac with a handwritten "Show me around again".

**Look.** Small scraps of cream paper with handwriting (Caveat), each joined to its object by a hand-drawn pencil arrow drawn in code (SVG). No boxes, no buttons, no dimming of the room. Notes fade in one after another, slowly. Each note's position is worked out from where its object is on screen, so it follows any later layout change.

**Step 1 - the dark kitchen.** One note with an arrow to the lamp: "Pull the chain to come in." (The lamp's own "Pull me" tag stays.) It fades when the lamp is lit.

**Step 2 - the lit table (first time the lamp is lit).** Exactly four notes, the vitals only (the twine stack was added by the team when M7 was built):
- Recipe box: "Your recipes live in here."
- Binder: "Add a recipe: a link, a photo, or write it out."
- Twine-tied stack: "Save your whole box to a file, or load one."
- Wall calendar: "Sound, light and weather."
Plus one line of encouragement with no arrow, low on the screen: "Everything else is yours to find. Go on, poke around."
Nothing is said about the mug, flowers, window, sugar pot, clock, radio, kettle or cat; those are left to be discovered.

**Step 3 - one-line hints inside (first time each is opened).** A single unobtrusive note, no arrows:
- Recipe box: "Scroll or drag to riffle. Tap a card to pick it up."
- Cook mode: "Tap an ingredient to tick it off."

**Getting out of the way.**
- Notes never catch clicks or taps: everything underneath works while they are showing.
- Step 2's notes fade the moment the visitor clicks, taps or presses a key, or after 15 s, whichever comes first. Step 3's hints fade after 6 s or on the first interaction.
- Each step is marked as seen once it has been shown, so a reload part-way through does not repeat it.

**Accessibility.** The notes are real text. A screen reader hears them once as a single polite announcement per step. With reduced motion the notes and arrows simply fade in, with no drawing-on effect. Nothing depends on colour alone.

**Data.** `Settings` gains `introSeen: { lamp, table, box, cook }` (booleans, default false). "Show me around again" sets them all back to false and replays step 2 at once.

**Files.** New module `js/intro.js` (notes, arrows, when to show them); styles in `css/panels.css`; one line each in `main.js`, `box.js` and `cook.js` to announce "the lamp was lit / the box opened / cooking started"; the replay control in `almanac.js`.

**Done when:** a fresh browser shows the lamp note, then the four table notes and the encouragement; none of them blocks a click; they do not return on reload; "Show me around again" brings step 2 back; and with a screen reader each step is announced once.

### M8: title sign

**Goal.** The site gets a front door. Before the lamp is lit, and again whenever it is switched off, the site's name hangs over the dark kitchen, so the page has a beginning to come back to. The lamp and its "Pull me" tag stay exactly as they are and remain the only way in.

**Decided by the team.** No "Enter the Kitchen" button and no full-screen picture: only the sign. The team's first reference (`tools/originals/bg-title-reference.png`) is kept for its layout, but is not used on the site, because it is a full picture with a button and a photographic kitchen painted in.

**Picture (one new image).**
[59] `assets/img/obj-title-sign.png` - SIZE 16:9, 1600x900 - OBJECT (remove background)
PROMPT: (STYLE BLOCK) A blank old-fashioned kitchen sign cut from cream card, wide and low, about two and a half times as wide as it is tall, with a softly scalloped, slightly uneven edge browned with age and a thin hand-inked border line just inside the edge. A small wooden rolling pin lies across the top edge in the middle. A sprig of small red flowers with green leaves is painted at the far left end and a matching sprig at the far right end. A small red heart sits at the bottom centre with a short thin red line on each side of it. The whole middle of the sign is EMPTY plain cream card, with nothing written or drawn on it. Seen flat from straight in front, the whole sign visible with nothing cut off. On a plain flat solid dark teal background, centered, with empty space around it, no shadow on the background.
CHECK: the middle is completely blank (no letters, no scribbles); the whole sign is inside the picture; the background is one flat colour.
WHY a dark teal background here instead of white: the sign is cream, and a background remover cannot tell cream from white at the edges.
WHY blank: image generators misspell lettering. The words are set in code.

**The sign.**
- A layer over the table scene: above the darkness, below the lamp's glow, below panels and below the first-visit notes. It never catches clicks or taps.
- The picture is the blank sign. The words "Grandma's Recipe Box" are real text set on it in code, in Homemade Apple (the script font already in `/fonts`), walnut brown, on two lines, sized in stage units so they scale with the sign. They are the page's `<h1>`.
- It hangs in the upper middle of the stage, about 42% of the stage wide, clear of the lamp, the "Pull me" tag and M7's lamp note. If the note and the sign would touch, the note moves, not the sign.
- It is fully bright in the dark room, like a sign caught in a little light, with a soft shadow behind it.
- It is written into `index.html` and styled in `css/base.css`, so it paints before any script has run.

**How it works with the lamp.**
- Lamp off (including first load): the sign is showing.
- Lamp on: the sign fades out over about 1.5 s, in step with the room lighting up, then is hidden.
- Lamp off again: the sign fades back in over about 1 s, as the room goes dark and the sound fades.
- Nothing about the lamp, the sound unlock or keyboard focus changes.
- Reduced motion: the same fades. Nothing here moves.

**What stays the same.** The lamp, the "Pull me" tag, the dark kitchen and all of M7 (including "Pull the chain to come in.").

**Loading.** `obj-title-sign.png` joins `TABLE_ART`, the pictures fetched before the lamp. Shrunk by `tools/prepare-art.py` to about 900 px wide.

**Files.** `index.html` (the sign and its `<h1>`), `css/base.css` (its styles), `js/main.js` (one line to show or hide it with the lamp), `js/assets.js`, `js/table.js` (`TABLE_ART`), `js/intro.js` (only if the lamp note has to move), `tools/prepare-art.py`, IMAGE-PROMPTS.txt, README (image count), HOW-IT-WORKS.md.

**Done when:** the sign is the first thing seen on load, over the dark kitchen, with the lamp and its tag clear of it; pulling the chain fades the sign out as the room lights; switching the lamp off brings it back; the sign never blocks a click; a screen reader reads "Grandma's Recipe Box" as the page's heading; and until the picture exists the words still show over a placeholder.

### ADD LATER (only if the team asks after M5)
A beagle curled by the stove that sometimes wanders; a Commodore 64 easter egg; a phone layout; page-flip and pencil-scratch sounds.
