// After `vite build --mode editor`: the page is editor.html in the build; MinnionDeck serves it as
// /editor/ (index.html), so rename it.
import fs from "node:fs";
import path from "node:path";
const out = path.resolve(import.meta.dirname, "..", "editor-dist");
fs.renameSync(path.join(out, "editor.html"), path.join(out, "index.html"));
let n = 0, size = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { n++; size += fs.statSync(f).size; } });
walk(out);
console.log("editor-dist: " + n + " files, " + (size / 1024).toFixed(0) + " KB. MinnionDeck serves this folder at /editor/.");
