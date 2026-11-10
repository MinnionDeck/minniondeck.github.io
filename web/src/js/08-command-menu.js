  /* Command menu: Ctrl+K (or /) opens it anywhere. Pages, actions, plugins (from index.json) and docs topics */
  (function(){
    var dlg = document.getElementById("cmdk"), q = document.getElementById("cmdk-q"), list = document.getElementById("cmdk-list");
    var btn = document.getElementById("cmdk-btn");
    if (!dlg || !dlg.showModal) { if (btn) btn.hidden = true; return; }
    var ITEMS = null, shown = [], at = 0;
    var PAGE_NOTE = {home:"The start page", tour:"How the app works", marketplace:"Plugins to add", docs:"Guides and help", gifs:"Draw an animation", images:"Design a button picture", contribute:"Help and report bugs", about:"The project", download:"Get the app"};
    function build(){
      var out = [];
      document.querySelectorAll(".nav a[data-view]").forEach(function(a){
        var v = a.getAttribute("data-view");
        out.push({g:"Pages", t:a.textContent.trim(), s:PAGE_NOTE[v] || "", v:v, ic:"›"});
      });
      [["Download for Windows", "The installer, v" + REL.v, "download", "", "↓"],
       ["Report a bug", "Send it with your log file", "contribute", "ct-bug", "!"],
       ["Submit a plugin", "Send your .mdplugin to the marketplace", "marketplace", "mk-submit", "+"],
       ["Try the button editor", "Make a button here in the page", "home", "try-editor", "✎"]].forEach(function(x){
        out.push({g:"Actions", t:x[0], s:x[1], v:x[2], to:x[3], ic:x[4]});
      });
      document.querySelectorAll("#docs-view article.dpage[data-slug]").forEach(function(a){
        out.push({g:"Docs", t:a.getAttribute("data-title"), s:a.getAttribute("data-group") || "Docs", v:"docs/" + a.getAttribute("data-slug"), ic:"?", k:a.textContent.slice(0, 600)});
      });
      return out;
    }
    function plugins(){
      fetch("index.json", {cache:"no-cache"}).then(function(r){ return r.json(); }).then(function(d){
        (d.plugins || []).forEach(function(p){
          ITEMS.push({g:"Plugins", t:p.name, s:p.summary || "", v:"marketplace/" + p.id, img:p.icon, k:(p.actions || []).join(" ") + " " + (p.category || "")});
        });
        if (dlg.open) draw();
      }, function(){});
    }
    function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
    function hi(t, w){
      if (!w) return esc(t);
      var i = t.toLowerCase().indexOf(w);
      return i < 0 ? esc(t) : esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + w.length)) + "</mark>" + esc(t.slice(i + w.length));
    }
    function score(it, words){
      var t = it.t.toLowerCase(), s = (it.s + " " + (it.k || "")).toLowerCase(), n = 0;
      for (var w of words){
        if (t.indexOf(w) === 0) n += 6; else if (t.indexOf(w) > 0) n += 4; else if (s.indexOf(w) >= 0) n += 1; else return 0;
      }
      return n;
    }
    function draw(){
      var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      shown = words.length
        ? ITEMS.map(function(it){ return [score(it, words), it]; }).filter(function(x){ return x[0] > 0; }).sort(function(a, b){ return b[0] - a[0]; }).slice(0, 12).map(function(x){ return x[1]; })
        : ITEMS.filter(function(it){ return it.g === "Pages" || it.g === "Actions"; });
      if (!words.length) shown.sort(function(a, b){ return a.g === b.g ? 0 : a.g === "Actions" ? -1 : 1; });
      at = 0;
      var h = "", last = "", w0 = words[0] || "";
      shown.forEach(function(it, i){
        if (it.g !== last){ h += '<li class="grp" role="presentation">' + it.g + "</li>"; last = it.g; }
        h += '<li role="option" id="ck-' + i + '" data-i="' + i + '" aria-selected="' + (i === 0) + '"><span class="ci">' +
          (it.img ? '<img src="' + esc(it.img) + '" alt="">' : esc(it.ic || "›")) + "</span><span><b>" + hi(it.t, w0) + "</b><small>" + esc(it.s) + "</small></span><em>" + it.g.replace(/s$/, "") + "</em></li>";
      });
      list.innerHTML = h || '<li class="cmdk-empty" role="presentation">No page, plugin or docs topic matches “' + esc(q.value.trim()) + '”. Try a plugin name such as Spotify, or a word such as pair.</li>';
      q.setAttribute("aria-activedescendant", shown.length ? "ck-0" : "");
    }
    function move(d){
      if (!shown.length) return;
      var old = list.querySelector('[aria-selected="true"]'); if (old) old.setAttribute("aria-selected", "false");
      at = (at + d + shown.length) % shown.length;
      var el = document.getElementById("ck-" + at);
      el.setAttribute("aria-selected", "true"); el.scrollIntoView({block:"nearest"});
      q.setAttribute("aria-activedescendant", el.id);
    }
    function pick(i){
      var it = shown[i]; if (!it) return;
      dlg.close();
      try { history.pushState(null, "", routeHref(it.v)); } catch (err) {}
      menu(false);
      go(it.v, it.to);
    }
    function open(){
      if (!ITEMS){ ITEMS = build(); plugins(); }
      q.value = ""; draw();
      dlg.showModal(); q.focus();
    }
    btn.addEventListener("click", open);
    document.addEventListener("keydown", function(e){
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)){ e.preventDefault(); dlg.open ? dlg.close() : open(); }
    });
    q.addEventListener("input", draw);
    q.addEventListener("keydown", function(e){
      if (e.key === "ArrowDown"){ e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); move(-1); }
      else if (e.key === "Enter"){ e.preventDefault(); pick(at); }
    });
    list.addEventListener("click", function(e){ var o = e.target.closest("[role=option]"); if (o) pick(+o.getAttribute("data-i")); });
    list.addEventListener("mousemove", function(e){ var o = e.target.closest("[role=option]"); if (o && +o.getAttribute("data-i") !== at) move(+o.getAttribute("data-i") - at); });
    dlg.addEventListener("click", function(e){ if (e.target === dlg) dlg.close(); });
  })();

