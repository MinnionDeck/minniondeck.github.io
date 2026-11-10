// After `vite build`: put dist/index.html and dist/assets/ at the repo root, where GitHub Pages serves them.
// Only those two are touched. index.json, icons/, shots/, relay.json, robots.txt and sitemap.xml are
// left as they are (the plugin publish scripts in E:\minniondeck\plugins\tools write some of them).
import fs from "node:fs";
import path from "node:path";

const WEB = path.resolve(import.meta.dirname, "..");
const DIST = path.join(WEB, "dist");
const SITE = path.resolve(WEB, "..");

if (!fs.existsSync(path.join(DIST, "index.html"))) throw new Error("No dist/index.html. Run vite build first.");
if (!fs.existsSync(path.join(SITE, "index.json"))) throw new Error(SITE + " doesn't look like the website repo (no index.json).");

fs.rmSync(path.join(SITE, "assets"), { recursive: true, force: true });
fs.cpSync(path.join(DIST, "assets"), path.join(SITE, "assets"), { recursive: true });
fs.copyFileSync(path.join(DIST, "index.html"), path.join(SITE, "index.html"));

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(1) + " KB";
console.log("index.html  " + kb(path.join(SITE, "index.html")));
for (const f of fs.readdirSync(path.join(SITE, "assets"))) console.log("assets/" + f + "  " + kb(path.join(SITE, "assets", f)));
console.log("Copied to " + SITE + ". Commit index.html and assets/ with the web/ changes.");
