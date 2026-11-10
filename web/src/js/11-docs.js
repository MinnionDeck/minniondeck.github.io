  /* docs: one topic at a time, a sidebar built from the topics, and search across all of them */
  var DOCS = Array.prototype.slice.call(document.querySelectorAll("#d-main .dpage"));
  var dNav = document.getElementById("d-nav"), dRes = document.getElementById("d-res"), dQ = document.getElementById("d-q");
  var dPager = document.getElementById("d-pager"), dSide = document.getElementById("dside"), dMenu = document.getElementById("d-menu");
  (function(){
    var groups = {}, order = [];
    DOCS.forEach(function(a){
      var g = a.getAttribute("data-group");
      if (!groups[g]){ groups[g] = []; order.push(g); }
      groups[g].push(a);
    });
    dNav.innerHTML = order.map(function(g){
      return '<div><h4>' + esc(g) + '</h4><ul>' + groups[g].map(function(a){
        var s = a.getAttribute("data-slug");
        return '<li><a href="' + routeHref("docs/" + s) + '" data-view="docs/' + s + '">' + esc(a.getAttribute("data-title")) + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
  })();
  function docLink(a, cls, word){
    var s = a.getAttribute("data-slug");
    return '<a class="' + cls + '" href="' + routeHref("docs/" + s) + '" data-view="docs/' + s + '"><small>' + word + '</small>' + esc(a.getAttribute("data-title")) + '</a>';
  }
  function docOpen(slug){
    var i = 0;
    DOCS.forEach(function(a, n){ if (a.getAttribute("data-slug") === slug) i = n; });
    DOCS.forEach(function(a, n){ a.hidden = n !== i; });
    var cur = DOCS[i];
    cur.classList.remove("in"); void cur.offsetWidth; cur.classList.add("in");
    dNav.querySelectorAll("a").forEach(function(l){
      if (l.getAttribute("data-view") === "docs/" + cur.getAttribute("data-slug")) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    dPager.innerHTML = (i > 0 ? docLink(DOCS[i - 1], "pv", "← Previous") : "") + (i < DOCS.length - 1 ? docLink(DOCS[i + 1], "nx", "Next →") : "");
    dSide.classList.remove("open"); dMenu.setAttribute("aria-expanded", "false");
    document.title = (i ? cur.getAttribute("data-title") + " · MinnionDeck Docs" : "MinnionDeck Docs: guides for buttons, phones and plugins");
  }
  dMenu.addEventListener("click", function(){
    var open = !dSide.classList.contains("open");
    dSide.classList.toggle("open", open); dMenu.setAttribute("aria-expanded", String(open));
  });
  // Search: every topic whose text has all the words, with a bit of the text around the first one
  dQ.addEventListener("input", function(){
    var q = dQ.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    dRes.hidden = !words.length;
    dNav.hidden = !!words.length;
    if (!words.length){ dRes.innerHTML = ""; return; }
    var hits = DOCS.filter(function(a){ var t = a.textContent.toLowerCase(); return words.every(function(w){ return t.indexOf(w) >= 0; }); });
    dRes.innerHTML = hits.length ? hits.map(function(a){
      var t = a.textContent.replace(/\s+/g, " "), at = t.toLowerCase().indexOf(words[0]);
      var bit = t.slice(Math.max(0, at - 30), at + 70);
      var safe = esc(bit).replace(new RegExp("(" + words.map(function(w){ return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi"), "<mark>$1</mark>");
      var s = a.getAttribute("data-slug");
      return '<li><a href="' + routeHref("docs/" + s) + '" data-view="docs/' + s + '"><b>' + esc(a.getAttribute("data-title")) + '</b><small>…' + safe + '…</small></a></li>';
    }).join("") : '<li class="mk-count">Nothing found. Try another word.</li>';
  });
  dRes.addEventListener("click", function(e){ if (e.target.closest("a")){ dQ.value = ""; dRes.hidden = true; dNav.hidden = false; } });

  window.addEventListener("popstate", function(){ go(currentRoute()); });

