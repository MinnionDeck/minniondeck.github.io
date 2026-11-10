// Builds the website from web/ into web/dist/. `npm run build` then copies index.html and assets/
// to the repo root, where GitHub Pages serves them (scripts/publish.mjs).
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "src");
const SITE = path.resolve(import.meta.dirname, "..");

// <!--#include partials/home.html --> in index.html is replaced by that file from src/
function includes() {
  const inline = (html, seen = []) =>
    html.replace(/<!--#include (\S+) -->/g, (_, rel) => {
      const file = path.join(SRC, rel);
      if (seen.includes(file)) throw new Error("include loop: " + rel);
      return inline(fs.readFileSync(file, "utf8"), [...seen, file]);
    });
  return {
    name: "md-includes",
    transformIndexHtml: { order: "pre", handler: (html) => inline(html) },
    // partials aren't modules, so reload the page whenever one changes
    configureServer(server) {
      const dir = path.join(SRC, "partials");
      server.watcher.add(dir);
      server.watcher.on("change", (file) => {
        if (path.resolve(file).startsWith(dir)) server.ws.send({ type: "full-reload" });
      });
    },
  };
}

// The page script is one closure split into src/js/NN-*.js for reading. They share their variables,
// so they are joined in name order inside one function, as the page always had it.
function pageScript() {
  const ID = "virtual:page-script", RID = "\0" + ID, DIR = path.join(SRC, "js");
  return {
    name: "md-page-script",
    resolveId: (id) => (id === ID ? RID : null),
    load(id) {
      if (id !== RID) return null;
      const files = fs.readdirSync(DIR).filter((f) => /^\d+-.+\.js$/.test(f)).sort();
      files.forEach((f) => this.addWatchFile(path.join(DIR, f)));
      return "(function(){\n" + files.map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("") + "})();\n";
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(DIR)) {
        const mod = server.moduleGraph.getModuleById(RID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}

// The MinnionDeck editor page (editor.html): the GIF maker and Images, served by the app itself.
// Its script is the same closure idea, from the site's icon and makers files plus editor-only parts.
const EDITOR_FILES = ["js/03-glyphs.js", "editor/shim.js", "editor/makers.js", "editor/sync.js", "editor/start.js"];
function editorScript() {
  const ID = "virtual:editor-script", RID = "\0" + ID;
  return {
    name: "md-editor-script",
    resolveId: (id) => (id === ID ? RID : null),
    load(id) {
      if (id !== RID) return null;
      EDITOR_FILES.forEach((f) => this.addWatchFile(path.join(SRC, f)));
      return "(function(){\n" + EDITOR_FILES.map((f) => fs.readFileSync(path.join(SRC, f), "utf8")).join("") + "})();\n";
    },
  };
}
// The editor's built-in pictures (the designer's icon list) go next to it
function editorIcons() {
  return {
    name: "md-editor-icons",
    closeBundle() { fs.cpSync(path.join(SITE, "icons"), path.join(import.meta.dirname, "editor-dist", "icons"), { recursive: true }); },
  };
}

// Preload the two Latin fonts the first screen uses, so text doesn't wait for the CSS to find them
function preloadFonts() {
  return {
    name: "md-preload-fonts",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const want = /^(pixelify-sans-latin-wght-normal|ibm-plex-mono-latin-400-normal)-.+\.woff2$/;
        const tags = Object.keys(ctx.bundle)
          .filter((f) => want.test(path.basename(f)))
          .map((f) => ({ tag: "link", attrs: { rel: "preload", href: "./" + f, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head-prepend" }));
        return { html, tags };
      },
    },
  };
}

// In dev, relay.json answers {} so working on the site doesn't send visits or reports to the real relay
function localRelay() {
  return {
    name: "md-local-relay",
    configureServer(server) {
      server.middlewares.use("/relay.json", (_req, res) => { res.setHeader("Content-Type", "application/json"); res.end("{}"); });
    },
  };
}

export default defineConfig(({ command, mode }) => ({
  base: "./",
  // In dev, the repo root's index.json, icons/, shots/ and relay.json are served as they are.
  // The build leaves them alone: the plugin publish scripts write those files directly.
  publicDir: command === "serve" ? SITE : false,
  plugins: [localRelay(), includes(), pageScript(), editorScript(), preloadFonts()].concat(mode === "editor" ? [editorIcons()] : []),
  build: {
    // `npm run build:editor` makes editor-dist/ (index.html, assets/, icons/) for MinnionDeck to serve
    outDir: mode === "editor" ? "editor-dist" : "dist",
    rollupOptions: mode === "editor" ? { input: path.resolve(import.meta.dirname, "editor.html") } : undefined,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    // esbuild keeps the CSS exactly as drawn; Vite's default (Lightning CSS) shifted a few glow pixels
    cssMinify: "esbuild",
  },
  server: { port: 5173 },
}));
