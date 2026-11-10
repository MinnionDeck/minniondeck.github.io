// Serves the repo root the way GitHub Pages does (gzip, 10-minute cache) to check a build before pushing.
// relay.json answers {} so a local look doesn't send visits or reports to the real relay.
// usage: npm run preview   (then open http://localhost:4173)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".png": "image/png", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  if (p === "/relay.json") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end("{}"); }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT + path.sep) || file.includes(path.sep + ".git") || file.includes(path.sep + "web" + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end("Not found"); }
  const type = TYPES[path.extname(file)] || "application/octet-stream";
  const head = { "Content-Type": type, "Cache-Control": "max-age=600" };
  let body = fs.readFileSync(file);
  if (/html|json|javascript|css|svg|plain|xml/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "")) { body = zlib.gzipSync(body); head["Content-Encoding"] = "gzip"; }
  res.writeHead(200, head);
  res.end(body);
}).listen(PORT, () => console.log("http://localhost:" + PORT));
