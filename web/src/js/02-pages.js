  /* The four use types as colour pixel art, in the same 16 × 16 style as the app logos */
  var CAT_ART = {"general":{"c":{"k":"1e2433","d":"262e43","m":"5fd0a8","s":"7cc4ff","y":"ffc93c","c":"ff5a5f","p":"ffb38a","w":"ffffff"},"p":["................","................",".kkkkkkkkkkkkkk.",".kddddddddddddk.",".kdmmmdsssdyyyk.",".kdmmmdsssdyyyk.",".kdmmmdsssdyyyk.",".kddddddddddddk.",".kdcccdpppdwwwk.",".kdcccdpppdwwwk.",".kdcccdpppdwwwk.",".kddddddddddddk.",".kkkkkkkkkkkkkk.","................","................","................"]}};
  // The uses Minniondeck Setup asks about (minnionsetup\setup-app\ui\index.html), beside General
  Object.assign(CAT_ART, {"streaming":{"c":{"k":"1e2433","g":"c6d3e2","w":"ffffff","r":"ff5a5f"},"p":["................","......kkkk...rr.",".....kggggk..rr.",".....kgwggk.....",".....kggggk.....",".....kgwggk.....",".....kggggk.....","...k.kggggk.k...","...k.kkkkkk.k...","...kk......kk...",".....kkkkkk.....",".......kk.......",".......kk.......",".....kkkkkk.....","................","................"]},"games":{"c":{"k":"1e2433","w":"ffffff","r":"ff5a5f","b":"4c97d6","y":"ffc93c","g":"5fd0a8"},"p":["................","................","................","...kkkk..kkkk...","..kwwwwkkwwwwk..",".kwwwwwwwwwwwwk.",".kwwkwwwwwwrwwk.",".kwkkkwwwwbwywk.",".kwwkwwwwwwgwwk.",".kwwwwwwwwwwwwk.",".kwwwwkkkkwwwwk.","..kwwk....kwwk..","...kk......kk...","................","................","................"]},"work":{"c":{"k":"1e2433","p":"c47f52","y":"ffc93c"},"p":["................","................","................","......kkkk......",".....k....k.....",".kkkkkkkkkkkkkk.",".kppppppppppppk.",".kppppppppppppk.",".kppppppppppppk.",".kkkkkkyykkkkkk.",".kppppppppppppk.",".kppppppppppppk.",".kppppppppppppk.",".kkkkkkkkkkkkkk.","................","................"]}});
  function artSvg(a){
    var r = "";
    a.p.forEach(function(row, y){
      for (var x = 0; x < row.length;){
        var e = x + 1;
        while (e < row.length && row[e] === row[x]) e++;
        if (row[x] !== ".") r += '<rect x="' + x + '" y="' + y + '" width="' + (e - x) + '" height="1" fill="#' + a.c[row[x]] + '"/>';
        x = e;
      }
    });
    return '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
  }
  document.querySelectorAll("[data-simart]").forEach(function(el){ el.innerHTML = artSvg(CAT_ART[el.getAttribute("data-simart")]); });

  /* coming soon pages */
  var SOON = {
  };
  var home = document.getElementById("home-view");
  var soon = document.getElementById("soon-view");
  var dl = document.getElementById("download-view");
  var mk = document.getElementById("market-view");
  var docsV = document.getElementById("docs-view");
  var gifsV = document.getElementById("gifs-view"), imagesV = document.getElementById("images-view"), aboutV = document.getElementById("about-view"), contribV = document.getElementById("contribute-view"), tourV = document.getElementById("tour-view"), termsV = document.getElementById("terms-view"), privacyV = document.getElementById("privacy-view");
  var VIEWS = {home:1, download:1, marketplace:1, docs:1, gifs:1, images:1, about:1, contribute:1, tour:1, terms:1, privacy:1};
  // A view is a page name, and for the marketplace an optional plugin id: "marketplace/minnion_spotify"
  function show(full){
    var parts = String(full || "").split("/"), view = parts[0];
    var page = SOON[view];
    if (!page && !VIEWS[view]) view = "home";
    home.hidden = view !== "home";
    dl.hidden = view !== "download";
    mk.hidden = view !== "marketplace";
    docsV.hidden = view !== "docs";
    gifsV.hidden = view !== "gifs";
    imagesV.hidden = view !== "images";
    aboutV.hidden = view !== "about";
    contribV.hidden = view !== "contribute";
    tourV.hidden = view !== "tour";
    termsV.hidden = view !== "terms";
    privacyV.hidden = view !== "privacy";
    track("view", view + (parts[1] && view === "marketplace" || parts[1] && view === "docs" ? "/" + parts[1] : ""));
    soon.hidden = !page;
    if (view === "download") wizStart();
    if (view === "marketplace") mkOpen(parts[1] || "");
    if (view === "docs") docOpen(parts[1] || ""); else document.title = (window.MD_TITLES && window.MD_TITLES[full]) || "MinnionDeck: free Stream Deck alternative for Windows, with your phone as the deck";
    if (page){
      document.getElementById("soon-title").textContent = page.title;
      document.getElementById("soon-intro").textContent = page.intro;
      var list = document.getElementById("soon-list");
      list.textContent = "";
      page.items.forEach(function(t){ var li = document.createElement("li"); li.textContent = t; list.appendChild(li); });
    }
    document.querySelectorAll(".nav a").forEach(function(a){
      if (a.getAttribute("data-view") === view) a.setAttribute("aria-current","page");
      else a.removeAttribute("aria-current");
    });
    if (typeof revealScan === "function") requestAnimationFrame(revealScan);
    if (window.mdDeckSwitch) window.mdDeckSwitch(full);
    if (window.mdDeckAway){ requestAnimationFrame(window.mdDeckAway); setTimeout(window.mdDeckAway, 60); }
  }
  /* Moving between pages: the old page fades and slides out, the new one in (View Transitions where
     the browser has them, a short CSS entrance otherwise). Then the jump to a section, if any. */
  function go(v, scrollId){
    var done = function(){
      if (!scrollId) return;
      var to = document.getElementById(scrollId);
      if (to) setTimeout(function(){ to.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }, 60);
    };
    var swapNow = function(){ show(v); window.scrollTo(0,0); };
    // a hidden tab never draws a frame, so a transition there would hold the page change back
    if (!reduce && document.startViewTransition && document.visibilityState === "visible"){
      try {
        // if the browser holds the transition back (no frame drawn yet), change the page anyway
        var ran = false, once = function(){ if (ran) return; ran = true; swapNow(); done(); };
        var vt = document.startViewTransition(once);
        setTimeout(function(){ if (!ran){ try { vt.skipTransition(); } catch (e) {} once(); } }, 250);
        vt.updateCallbackDone.catch(function(){});
        // a quick second page change skips the first transition: that is fine, not an error
        vt.ready.catch(function(){}); vt.finished.catch(function(){});
        return;
      } catch (err) {}
    }
    swapNow();
    if (!reduce){
      var cur = document.querySelector("body > main:not([hidden]), #home-view:not([hidden])");
      if (cur){ cur.classList.remove("v-in"); void cur.offsetWidth; cur.classList.add("v-in"); }
    }
    done();
  }

