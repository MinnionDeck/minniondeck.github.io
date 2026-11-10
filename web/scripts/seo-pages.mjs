// After publish.mjs: gives every view of the site its own address, so search engines see more
// than one page. The site itself is unchanged: each address is the same index.html, opened on its
// view, with its own title, description, canonical address and link preview.
//
//   /download/  /tour/  /marketplace/  /marketplace/<plugin>/  /docs/  /docs/<topic>/
//   /about/  /contribute/  /privacy/  /terms/
//
// It also turns the site's own "#view" links into those addresses (clicks still change the view in
// place, and the address bar shows the path), and writes sitemap.xml, robots.txt and 404.html.
//
// The site's address is ORIGIN, and BASE is the path it lives under ("/" on its own domain).
// To move the site, change these two lines and build again.
import fs from "node:fs";
import path from "node:path";

const SITE = path.resolve(import.meta.dirname, "..", "..");
const ORIGIN = "https://minniondeck.github.io";
const BASE = "/";
const HOME_TITLE = "MinnionDeck: free Stream Deck alternative for Windows, with your phone as the deck";
const TAG = " · MinnionDeck";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const clip = (s, n = 158) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)) + "…");

let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
const plugins = JSON.parse(fs.readFileSync(path.join(SITE, "index.json"), "utf8")).plugins || [];

// The pages: view → [title, description]
const ROUTES = {
  download: ["Download MinnionDeck for Windows: free Stream Deck alternative", "Get the free MinnionDeck installer for Windows 10 and 11. No account to make, and your phone needs no app: your deck opens in its web browser."],
  tour: ["How MinnionDeck works: a tour of the app and the phone deck", "A quick look around MinnionDeck: the desktop app, how your phone connects to it over Wi-Fi, and everything your buttons can do."],
  marketplace: ["MinnionDeck plugins: Spotify, Soundboard, Timer, Weather and more", "Free plugins for your deck: Spotify controls, a soundboard, timers, live weather and a system monitor. Install them from the app in one click."],
  docs: ["MinnionDeck Docs: guides for buttons, phones and plugins", "How MinnionDeck works: install it and pair your phone, make buttons, profiles, pictures and GIFs, and make and publish your own plugins."],
  about: ["About MinnionDeck: a free deck for your PC", "MinnionDeck turns your phone into a deck of buttons for your PC: shortcuts, apps, media and streaming, one press each. No pricey hardware, no account, no subscription."],
  contribute: ["Help improve MinnionDeck: bug reports, plugins and more", "MinnionDeck is free to use. Streamers, artists, writers, translators and developers all make it better: report a bug, share an idea or make a plugin."],
  privacy: ["Privacy Policy" + TAG, "What MinnionDeck and its website collect (very little), where it is kept and the choices you have. No account, no ads, and your deck stays on your PC."],
  terms: ["Terms of Service" + TAG, "The terms for using MinnionDeck, its plugins and its website."],
};
for (const p of plugins) {
  ROUTES["marketplace/" + p.id] = [`${p.name} plugin for MinnionDeck`, clip(`${p.summary || ""} A free plugin for MinnionDeck, the Stream Deck alternative for Windows.`.trim())];
}
// Each docs topic, from the page itself (the first one is /docs/)
for (const m of html.matchAll(/<article[^>]*data-slug="([^"]+)"[^>]*data-title="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)) {
  const [, slug, title, body] = m;
  if (slug === "start") continue;
  const p = body.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  ROUTES["docs/" + slug] = [`${text(title)} · MinnionDeck Docs`, clip(p ? text(p[1]) : `${text(title)}: MinnionDeck docs.`)];
}
const routePath = (v) => BASE + v + "/";

// The site's own "#view" links become real addresses (data-view keeps clicks in place)
const known = new Set(["home", ...Object.keys(ROUTES)]);
html = html.replace(/href="#([\w/-]+)"(?=[^>]*data-view=)/g, (all, v) => (known.has(v) ? `href="${v === "home" ? BASE : routePath(v)}"` : all));
// where the site lives: for the page script, and so relative addresses (assets, icons, index.json)
// mean the site's root on deeper pages too
html = html.replace(/<html lang="en"[^>]*>/, `<html lang="en" data-base="${BASE}">`);
html = html.replace(/<head>\n(<base href="[^"]*">\n)?/, `<head>\n<base href="${BASE}">\n`);

// The titles the page shows as you move around it
const titles = Object.fromEntries(Object.entries(ROUTES).map(([v, [t]]) => [v, t]));
const titleScript = `<script>window.MD_TITLES=${JSON.stringify(titles).replace(/</g, "\\u003c")}</script>`;
html = html.replace(/<script>window\.MD_TITLES=.*?<\/script>\n?/s, "");
html = html.replace(/(<title>)/, titleScript + "\n$1");
fs.writeFileSync(path.join(SITE, "index.html"), html);

// One page per view
const setMeta = (h, re, value) => {
  if (!re.test(h)) throw new Error("index.html has no " + re);
  return h.replace(re, value);
};
for (const [view, [title, desc]] of Object.entries(ROUTES)) {
  const url = ORIGIN + routePath(view);
  const crumbs = [{ name: "MinnionDeck", url: ORIGIN + BASE }];
  const parts = view.split("/");
  if (parts.length > 1) crumbs.push({ name: ROUTES[parts[0]][0].split(":")[0].replace(TAG, ""), url: ORIGIN + routePath(parts[0]) });
  crumbs.push({ name: title.replace(TAG, "").replace(" · MinnionDeck Docs", ""), url });
  const breadcrumb = JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) });
  let page = html;
  page = page.replace(/<html lang="en"[^>]*>/, `<html lang="en" data-base="${BASE}" data-route="${esc(view)}">`);
  page = setMeta(page, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  page = setMeta(page, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  page = setMeta(page, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  page = setMeta(page, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  page = setMeta(page, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  page = setMeta(page, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  page = setMeta(page, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`);
  page = setMeta(page, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`);
  // the app's own description stays on the home page and Download; the others say where they are
  const ld = `<script type="application/ld+json">\n${breadcrumb}\n</script>`;
  page = view === "download" ? page.replace(/<\/head>/, ld + "\n</head>") : setMeta(page, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, ld);
  const dir = path.join(SITE, ...view.split("/"));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page);
}

// 404.html: any other address still shows the site (its script opens that view, or the home page)
fs.writeFileSync(path.join(SITE, "404.html"), html.replace(/<head>\n/, '<head>\n<meta name="robots" content="noindex">\n'));

// robots.txt points search engines at the sitemap
fs.writeFileSync(path.join(SITE, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}${BASE}sitemap.xml\n`);

// sitemap.xml: the home page and every view
const today = new Date().toISOString().slice(0, 10);
const urls = [ORIGIN + BASE, ...Object.keys(ROUTES).map((v) => ORIGIN + routePath(v))];
fs.writeFileSync(
  path.join(SITE, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`
);
console.log(`${Object.keys(ROUTES).length} pages, sitemap.xml with ${urls.length} addresses`);
