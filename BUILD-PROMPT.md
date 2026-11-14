# Build prompt: Grandma's Recipe Box (iHack 2026)

Paste everything below the line into Claude Code, with Claude Code opened in the iHack2026 folder. Start a new Claude Code session for each milestone if the conversation gets long; the prompt tells it to pick up from HOW-IT-WORKS.md.

---

## Goal

Build "Grandma's Recipe Box," a single-page website that is the most nostalgic recipe experience possible. It recreates Grandma's early-1980s farmhouse kitchen: the user switches on a table lamp, opens a wooden recipe box, riffles through 3x5 cards that visibly age with use, and cooks from them at Grandma's stove. It replaces the ad-filled recipe blogs of today with the recipe tin every home used to have.

This is for a 22.5-hour hackathon (iHack 2026). The team does not need to win; the site needs to work smoothly in a live demo on an iPad, and both team members must be able to explain every part of the code to a judge. Build it in stages and stop after each milestone so the team can test before moving on.

## Context

**Team.** Two people. Both have written HTML, CSS, JavaScript and Python before, but neither has built a project this size. Person A makes the art and records the sound clips; Person B drives you. Use plain, readable code they can follow and explain.

**Where you're working.** You are running in the folder `iHack2026`. That folder is the repo root. The team copies it to GitHub and deploys from GitHub to Netlify (free tier). The folder already contains:
- `IMAGE-PROMPTS.txt` - the 56 images Person A is generating, with the exact file name for each (all go in `assets/img/`).
- `SOUND-CLIPS.txt` - the 21 sound clips Person A is recording, with exact file names (all go in `assets/audio/`).
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
netlify.toml  README.md  HOW-IT-WORKS.md  AI-DISCLOSURE.md  CREDITS.txt
```

### AI-DISCLOSURE.md must say
- Code: written with Claude (Anthropic) in Claude Code, reviewed and explained by the team.
- Artwork: generated with Google Gemini from the prompts in IMAGE-PROMPTS.txt, then cleaned up by the team.
- Audio: recorded or sourced by the team; outside clips credited in CREDITS.txt.
- Sample recipes: adapted from a public-domain cookbook.
- The live site uses no AI model: link reading uses recipe data that sites already publish, and photo reading runs Tesseract.js in the browser.

### ADD LATER (only if the team asks after M5)
A beagle curled by the stove that sometimes wanders; a Commodore 64 easter egg; a phone layout; page-flip and pencil-scratch sounds.
