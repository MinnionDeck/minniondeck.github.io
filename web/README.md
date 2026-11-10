# Minniondeck website: source

The site at https://minniondeck.github.io is built from this folder with [Vite](https://vite.dev).
GitHub Pages still serves the root of `main` as plain files. The build just writes `index.html` and
`assets/` there.

## Build and publish

```
cd web
npm install          # once
npm run build        # builds into web/dist/, then copies index.html and assets/ to the repo root
npm run preview      # serves the repo root like GitHub Pages (gzip) at http://localhost:4173
```

Then commit the `web/` changes together with the new `index.html` and `assets/` and push `main`.
GitHub Pages publishes it within a minute or two. Old files in `assets/` are removed on each build,
so a commit always holds exactly one set.

While working on it, `npm run dev` starts a live server at http://localhost:5173. Saving a file
reloads the page. It also serves `index.json`, `icons/`, `shots/` and `relay.json` from the repo root.

## What's where

| Path | What it is |
|---|---|
| `index.html` | The page's `<head>` and the order of its parts (`<!--#include partials/... -->`) |
| `src/partials/*.html` | One file per view: header, home, download, marketplace, docs, makers (the "moved into the app" note), about, contribute, tour, soon, footer |
| `src/styles/NN-*.css` | The CSS, in the order it applies (`main.css` imports them). `00-fonts.css` holds the fonts |
| `src/js/NN-*.js` | The page script, split by feature. **They're one script:** the build joins them in name order inside one function, so they share variables. Keep the number prefix, and add new files with a number that puts them in the right place |
| `src/fonts/` | Pixelify Sans and IBM Plex Mono (Latin, Latin Extended), served from the site. OFL licences beside them |
| `vite.config.js` | The includes, the script joining, font preloads and the output settings |
| `scripts/publish.mjs` | Copies `dist/index.html` and `dist/assets/` to the repo root, and nothing else |
| `scripts/preview.mjs` | Local server for the built site (`relay.json` answers `{}`, so nothing reaches the real relay) |

## The desktop version comes from GitHub Releases

`src/js/01-release.js` reads https://api.github.com/repos/minnnion/MinnionDeck/releases/latest on
each visit and fills in:

- the version in the header, the home page, About, the setup preview, the search menu and the bug report;
- the Download button (the asset whose name ends in `-setup.exe` and contains `x64`);
- the release date, size, SHA-256 and "What's new" on the Download page.

**Publishing a release on GitHub updates the site by itself.** There's nothing to rebuild or
commit. The answer is kept for 10 minutes per browser tab. GitHub allows 60 of these requests an
hour for each visitor, without a token.

If GitHub can't be reached, Download opens https://github.com/minnnion/MinnionDeck/releases/latest.
The version shown then is the one built into the page (`REL` at the top of the file, plus the same
numbers in the partials). Update those now and then, so a visitor who can't reach GitHub still sees
a recent version.

## The MinnionDeck editor (GIF maker and Images)

The GIF maker and Images editor are no longer on the website; the website's `#gifs` and `#images`
show a short "moved into the app" note, so old links still land somewhere. The editor is a separate
page, `editor.html`, that **MinnionDeck serves itself**:

```
cd web
npm run build:editor   # makes web/editor-dist/ (index.html, assets/, icons/)
```

MinnionDeck serves `editor-dist` at `http://127.0.0.1:<port>/editor/`. Its Edit button window ›
**Edit image** opens `/editor/?token=<32 hex>#images` (or `#gifs`). The page and the app share one
address, so there are no browser permission prompts:

- `GET /v1/session` names the button;
- `GET /v1/image` is its picture or GIF to start from;
- `POST /v1/image` (the **Sync to MinnionDeck** button) puts the edited one on the look.

An open editor tab listens on `GET /v1/events`. When Edit image is pressed again, the app tells that
tab (it answers `POST /v1/ack`) and the tab reloads onto the new button, so no new tab opens. The
app side is `minniondeck-rust-ui/src/backend/websync.rs`.

| Path | What it is |
|---|---|
| `editor.html` | The editor page |
| `src/editor/makers.js` | The pixel editor (GIF maker, Pixel picture) and the button designer: tools, timeline, starter animations, shapes, effects, deck preview |
| `src/editor/sync.js` | Talking to the app: session, picture, Sync, and taking the next Edit image |
| `src/editor/shim.js`, `start.js` | Page switching and start-up |
| `src/styles/08-makers.css`, `src/editor/editor.css` | Its look (plus the site's `main.css`) |
| `src/js/03-glyphs.js` | The 8 × 8 icons, shared with the website |

After changing the editor, run `npm run build:editor` and give MinnionDeck the new `editor-dist`.

## Phones and tablets

The site is tested at phone widths (360, 390, 430 px) and tablet widths (768 and 820 px portrait,
1024 and 1180 px landscape). Phone and tablet rules are in each part's CSS under `@media` queries.
`src/styles/14-touch.css` holds the touch-screen extras:

- Small buttons and links get a finger-sized hit area on touch screens (Apple 44pt, Material 48dp, over WCAG 2.2's 24px floor).
- Form fields are 16px on phones, so the keyboard doesn't zoom the page.
- The page deck slides down while you scroll down and comes back when you scroll up, on screens up to 1024 px wide (the script is at the end of `src/js/06-page-deck.js`).
- The floating keycaps behind the hero are hidden on phones.

These rules only apply up to 1024 px wide or on touch screens, so the desktop layout doesn't change.

## Files the build never touches

These stay at the repo root and are edited directly. The plugin scripts in
`E:\minniondeck\plugins\tools` (`publish-to-marketplace.cjs`, `submission.cjs`) write some of them:

- `index.json`: the marketplace list the site shows (same format and URL as before)
- `icons/`, `shots/`: plugin pictures named by `index.json`
- `relay.json`: where bug reports and visits go
- `robots.txt`, `sitemap.xml`, `_config.yml` (keeps `web/` out of the published site)

Links the desktop app opens, like `https://minniondeck.github.io/?app#gifs`, work as before. The page
is still one page with `#view` addresses.

## Before and after (2026-11-06)

Lighthouse, mobile, median of 3 runs. Both versions were served by the same local gzip server:

| | Before (one hand-written file) | After (Vite build) |
|---|---|---|
| Performance score | 97 | 99 |
| First paint / LCP | 2.04 s | 1.52 s |
| Render-blocking requests | Google Fonts stylesheet (about 760 ms) | none |
| Servers contacted | 3 (site, fonts.googleapis.com, fonts.gstatic.com) | 1 |
| Layout shift (CLS) | 0.017 | 0.005 |
| Total blocking time | 0 ms | about 70 ms (the same script, now run after the first paint) |
| Page + CSS + JS, gzipped | 108 KB in one file | 26 + 22 + 45 KB in three files |

The CSS and JS now cache as separate files. A visit after a text-only change downloads only the
26 KB HTML. GitHub Pages caches every file for 10 minutes and can't be told otherwise, so long-term
caching isn't possible here.

Every view was checked with screenshots (desktop and phone width) against the old page. Views
with no wording changes come out pixel-identical. The CSS is minified with esbuild, not Vite's
default, because the default moved a few glow pixels.
