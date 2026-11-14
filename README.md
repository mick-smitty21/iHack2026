# Grandma's Recipe Box

A single-page recipe box set in Grandma's early-1980s farmhouse kitchen, built for iHack 2026.
Pull the lamp chain, open the wooden box, riffle through index cards that age as you cook
from them, and cook at Grandma's stove. No ads, no accounts, no AI on the live site.

Plain HTML, CSS and JavaScript: no framework and no build step.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer. Then, in this folder:

```
npx netlify dev
```

The first run downloads the Netlify tool (about a minute) and may ask "OK to proceed?" - answer `y`.
It then prints a local address, normally http://localhost:8888. Open that in Chrome.
Stop it with Ctrl+C.

On Windows PowerShell, if you see "running scripts is disabled", run this once and try again:

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

> Opening `index.html` by double-clicking will not work: browsers block JavaScript
> modules on `file://` pages. Always use `npx netlify dev`.

**Testing on the iPad:** put the iPad and the laptop on the same Wi-Fi, find the laptop's
IP address (`ipconfig` on Windows, look for "IPv4 Address"), and open `http://THAT-ADDRESS:8888`
in Safari. If it won't connect, allow Node.js through Windows Firewall when Windows asks.
No sound on the iPad? Turn the volume up and switch off Silent Mode (the bell in Control Center).

## Deploy

1. Commit and push to GitHub.
2. On netlify.com: **Add new site > Import an existing project**, pick the GitHub repo.
3. Leave the build command empty. `netlify.toml` already sets the publish folder (`.`)
   and the functions folder (`netlify/functions`).
4. Every later push to `main` redeploys automatically.
5. **Once you know the site's address**, open `index.html` and replace the two
   `assets/img/og-image.jpg` in the Open Graph lines with the full address, for example
   `https://YOUR-SITE.netlify.app/assets/img/og-image.jpg`. Link previews need the full address.

## Demo-day checklist

- [ ] Open the **deployed** site on the iPad once on good Wi-Fi beforehand, light the lamp,
      open the box and cook mode once. That downloads everything while the connection is good.
- [ ] iPad: volume up, Silent Mode off, Auto-Lock set to Never, landscape.
- [ ] For a full-screen kitchen: Safari > Share > **Add to Home Screen**, then open it from the icon.
      Note: the home-screen copy keeps its own separate set of cards from Safari's.
- [ ] To show the box as new: Settings > Safari > Advanced > Website Data, remove the site.
      (On a laptop: F12 > Application > Storage > Clear site data.) The 10 sample cards return.
- [ ] Have one recipe link that you have already tested ready to paste, and one clear photo of a
      **printed** recipe. Tesseract reads print well and handwriting poorly.
- [ ] Keep a "bundle" file (from the twine stack) as a backup of your demo cards.

## Where the art and sound go

| What | Folder | Names come from |
|---|---|---|
| Images (58) | `assets/img/` | `IMAGE-PROMPTS.txt` |
| Sound clips (22 + 2 optional) | `assets/audio/` | `SOUND-CLIPS.txt` |

Use the exact file names from those two lists. Until a file exists the site shows a grey
placeholder labelled with the asset's id (or plays silence). Drop the file in, reload, and
it appears. The browser console (F12) lists any images still missing.

**After adding or replacing pictures**, run this once (needs Python with Pillow:
`python -m pip install pillow`). It trims the empty margins around objects, cleans the white
backgrounds of stains and doodles, and shrinks oversized files so the site loads quickly:

```
python tools/prepare-art.py
```

**Replacing a background or a large object changes where things must sit.** The layout is
measured against the current pictures; see "If the art is replaced" notes in `HOW-IT-WORKS.md`.

Don't delete `assets/missing.png` or `assets/missing.mp3`; they are the stand-ins served
for files that don't exist yet.

## What's in the folder

```
index.html          the one page
css/                one stylesheet per scene, plus base.css (colours, fonts, stage)
js/                 one module per job; start at main.js
netlify/functions/  fetch-recipe.js, the only server code
vendor/             pinned local copies of the four libraries
fonts/              the four handwriting / typewriter fonts
assets/img/         artwork       assets/audio/  sound clips
tools/              helper scripts for making assets (not part of the website)
favicon.svg, apple-touch-icon.png   tab and home-screen icons
```

Libraries (all local, nothing loaded from a CDN at runtime):
GSAP 3.15.1, Howler.js 2.2.4, Tesseract.js 7.0.0 (core 7.0.0, English data 1.0.0), idb-keyval 6.3.0.

## Known limits

- **Recipe links:** only sites that publish schema.org Recipe data work, and some sites block
  automated readers. Those show Grandma's note and you write the recipe out instead.
- **Photos:** printed recipes read well; handwriting usually needs heavy correcting.
- **Phones:** there is no phone layout. Desktop and tablet only.
- **Your cards live in this browser on this device.** Use the twine stack to move them.
- **Sample recipes** were adapted from memory of the cookbook; see the `// VERIFY:` comments
  in `js/samples.js` before relying on any quantity.

For how the code works, read `HOW-IT-WORKS.md`. For where AI was used, read `AI-DISCLOSURE.md`.
Credits and licenses are in `CREDITS.txt`.
