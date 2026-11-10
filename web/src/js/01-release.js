  /* The desktop app's newest release, read from GitHub Releases on every visit, so publishing a release
     updates the site by itself: the version everywhere it shows, the Download button, the date, size,
     SHA-256 and release notes. The page ships with the last known release (REL below) and swaps in what
     GitHub says. If GitHub can't be reached, Download opens the latest release page instead. */
  var REL_API = "https://api.github.com/repos/minnnion/MinnionDeck/releases/latest";
  var REL_PAGE = "https://github.com/minnnion/MinnionDeck/releases/latest";
  var REL = {v:"0.1.1", url:REL_PAGE, page:REL_PAGE, date:"2026-11-07", size:13295616,
    sha:"9f29ff519b1322fa3f4b5143f7eef20c4905d9ee9047072897d3c45979e0a17d", notes:"", file:""};
  var REL_DEFAULT_V = REL.v;
  var relHooks = [];   // other parts that show the version (the setup preview) redraw when it changes
  var relOk = function(u){ return /^https:\/\/github\.com\/minnnion\/MinnionDeck\//.test(u || ""); };
  // The installer is the asset whose name ends in -setup.exe and has x64 in it (as the app's updater finds it)
  function relFrom(j){
    if (!j || !/^v?\d+\.\d+\.\d+/.test(j.tag_name || "")) return null;
    var a = (j.assets || []).filter(function(x){ return /-setup\.exe$/i.test(x.name || "") && /x64/i.test(x.name || ""); })[0];
    return {
      v: String(j.tag_name).replace(/^v/, ""),
      url: a && relOk(a.browser_download_url) ? a.browser_download_url : REL_PAGE,
      page: relOk(j.html_url) ? j.html_url : REL_PAGE,
      date: /^\d{4}-\d\d-\d\d/.test(j.published_at || "") ? j.published_at.slice(0, 10) : "",
      size: a && a.size > 0 ? a.size : 0,
      sha: a && /^sha256:[0-9a-f]{64}$/.test(a.digest || "") ? a.digest.slice(7) : "",
      notes: String(j.body || "").slice(0, 4000),
      file: a ? String(a.name) : ""
    };
  }
  function relEsc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  // Release notes are short markdown: paragraphs, "- " lists, **bold** and `code`. Links show as text.
  function relNotes(md){
    var html = "", list = false;
    md.replace(/\r/g, "").split("\n").forEach(function(line){
      var t = line.trim(), m = t.match(/^[-*]\s+(.*)$/);
      var inl = function(s){ return relEsc(s).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/^#+\s*/, ""); };
      if (m){ if (!list){ html += "<ul>"; list = true; } html += "<li>" + inl(m[1]) + "</li>"; return; }
      if (list){ html += "</ul>"; list = false; }
      if (t) html += "<p>" + inl(t) + "</p>";
    });
    return html + (list ? "</ul>" : "");
  }
  function relDate(d){
    if (!d) return "";
    try { return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric", timeZone:"UTC"}); } catch (e) { return d; }
  }
  function relApply(){
    var all = function(sel, fn){ document.querySelectorAll(sel).forEach(fn); };
    all('[data-rel="v"]', function(el){ el.textContent = REL.v; });
    all('[data-rel="vv"]', function(el){ el.textContent = "v" + REL.v; });
    all(".brand .ver", function(el){ el.setAttribute("aria-label", "version " + REL.v); });
    all('[data-rel="get"]', function(el){ el.href = REL.url; el.title = REL.file ? "Download " + REL.file : "Download from GitHub Releases"; });
    all('[data-rel="page"]', function(el){ el.href = REL.page; });
    var meta = [REL.date ? "Released " + relDate(REL.date) : "", REL.size ? (REL.size / 1048576).toFixed(1) + " MB" : "", "from GitHub Releases"].filter(Boolean).join(" · ");
    all('[data-rel="meta"]', function(el){ el.textContent = meta; });
    all('[data-rel="sha"]', function(el){ el.textContent = REL.sha; (el.closest("[data-rel-wrap]") || el).hidden = !REL.sha; });
    all('[data-rel="notes"]', function(el){ el.innerHTML = relNotes(REL.notes); (el.closest("[data-rel-wrap]") || el).hidden = !REL.notes.trim(); });
    // the bug report's version field, unless someone has typed in it
    all('#bug-form input[name="version"]', function(el){ if (el.value === REL_DEFAULT_V || el.value === el.defaultValue) el.value = el.defaultValue = REL.v; });
    relHooks.forEach(function(f){ try { f(); } catch (e) {} });
  }
  (function(){
    var KEY = "md.release", FRESH = 10 * 60 * 1000, saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
    if (saved && saved.r && saved.r.v){ REL = saved.r; }
    relApply();
    if (saved && Date.now() - saved.t < FRESH) return;
    if (!window.fetch) return;
    fetch(REL_API, {headers:{Accept:"application/vnd.github+json"}}).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      var r = relFrom(j);
      if (!r) return;
      REL = r;
      try { sessionStorage.setItem(KEY, JSON.stringify({t:Date.now(), r:r})); } catch (e) {}
      relApply();
    }, function(){});
  })();
