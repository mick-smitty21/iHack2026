# Grandma's Recipe Box

A single-page recipe box set in Grandma's early-1980s farmhouse kitchen. Built for iHack 2026.
Plain HTML, CSS and JavaScript: no framework and no build step.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer. Then, in this folder:

```
npx netlify dev
```

The first run downloads the Netlify tool (about a minute) and may ask "OK to proceed?" - answer `y`.
It then prints a local address, normally http://localhost:8888. Open that in Chrome.

Stop it with Ctrl+C.

**Testing on the iPad:** put the iPad and the laptop on the same Wi-Fi, find the laptop's
IP address (`ipconfig` on Windows, look for "IPv4 Address"), and open `http://THAT-ADDRESS:8888`
in Safari. If it won't connect, allow Node.js through Windows Firewall when Windows asks.

> Opening `index.html` by double-clicking will not work: browsers block JavaScript
> modules on `file://` pages. Always use `npx netlify dev`.

## Where the art and sound go

| What | Folder | Names come from |
|---|---|---|
| Images (56) | `assets/img/` | `IMAGE-PROMPTS.txt` |
| Sound clips (21 + 2 optional) | `assets/audio/` | `SOUND-CLIPS.txt` |

Use the exact file names from those two lists. Until a file exists the site shows a grey
placeholder labelled with the asset's id (or plays silence). Drop the file in, reload, and
it appears: no code change. The browser console (F12) lists which images are still missing.

Don't delete `assets/missing.png` or `assets/missing.mp3`; they are the stand-ins served
for files that don't exist yet.

## Deploy

1. Commit and push to GitHub.
2. On netlify.com: **Add new site > Import an existing project**, pick the GitHub repo.
3. Leave the build command empty. `netlify.toml` already sets the publish folder (`.`)
   and the functions folder (`netlify/functions`).
4. Every later push to `main` redeploys automatically.

## What's in the folder

```
index.html          the one page
css/                one stylesheet per scene, plus base.css (colours, fonts, stage)
js/                 one module per job; start at main.js
netlify/functions/  fetch-recipe.js, the only server code
vendor/             pinned local copies of the four libraries
fonts/              the four handwriting / typewriter fonts
assets/img/         artwork       assets/audio/  sound clips
```

Libraries (all local, nothing loaded from a CDN at runtime):
GSAP 3.15.1, Howler.js 2.2.4, Tesseract.js 7.0.0 (core 7.0.0, English data 1.0.0), idb-keyval 6.3.0.

For how the code works, read `HOW-IT-WORKS.md`. For where AI was used, read `AI-DISCLOSURE.md`.
