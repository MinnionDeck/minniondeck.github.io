  /* The page deck. Each page is an "app" with its own profile of five keys; changing page switches the
     profile by itself (the keys flip over one by one), the way Minniondeck does when an app comes to the
     front. Every key does something real on that page. Keys 1-5 on the keyboard press them. */
  (function(){
    var dock = document.getElementById("sdeck"), keysEl = document.getElementById("sd-keys");
    var nameEl = document.getElementById("sd-name"), subEl = document.getElementById("sd-sub"), lcd = dock.querySelector(".sd-lcd");
    var fold = document.getElementById("sd-fold");
    var $ = function(s, root){ return (root || document).querySelector(s); };
    function nav(v, to){ return function(){ try { history.pushState(null, "", routeHref(v)); } catch (e) {} go(v, to); }; }
    function jump(id){ return function(){ var el = document.getElementById(id); if (el) el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"start"}); }; }
    function top(){ window.scrollTo({top:0, behavior: reduce ? "auto" : "smooth"}); }
    function press(sel, root){ return function(){ var el = $(sel, root && document.querySelector(root)); if (el) el.click(); }; }
    function find(sel, root){ return function(){ return !!$(sel, root && document.querySelector(root)); }; }
    function focusIn(sel){ return function(){ var el = $(sel); if (el){ el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block:"center"}); setTimeout(function(){ el.focus({preventScroll:true}); }, reduce ? 0 : 350); } }; }
    function search(){ document.getElementById("cmdk-btn").click(); }
    function catBtn(name){ return Array.prototype.find.call(document.querySelectorAll("#mk-cats button"), function(b){ return b.textContent.indexOf(name) === 0; }); }
    // [label, glyph or icon path, colour, action, available?, what the screen says after]
    var P = {
      home: ["Home", [
        ["Press a key", "bolt", "sun", function(){ pausedUntil = Date.now() + 9000; top(); setTimeout(function(){ pressLabel(demo[oi]); oi = (oi + 1) % demo.length; }, reduce ? 0 : 400); }, null, "Deck key pressed"],
        ["Edit a button", "type", "mint", jump("try-editor"), null, "Edit button"],
        ["How it works", "book", "sky", jump("how-title"), null, "Three steps"],
        ["Plugins", "folder", "lilac", nav("marketplace"), null, "Marketplace"],
        ["Download", "down", "mint", nav("download"), null, "Download"]
      ]],
      tour: ["Tour", [
        ["The app", "gear", "sky", jump("tr-app"), null, "Five pages"],
        ["Phone link", "phone", "mint", jump("tr-conn"), null, "How it connects"],
        ["Make a key", "plus", "sun", jump("tr-make"), null, "Empty key to button"],
        ["Everything", "star", "lilac", jump("tr-all"), null, "All features"],
        ["Download", "down", "mint", nav("download"), null, "Download"]
      ]],
      marketplace: ["Marketplace", [
        ["Find a plugin", "search", "tile", focusIn("#mk-q"), find("#mk-q"), "Type to search"],
        ["General", "folder", "lilac", function(){ var b = catBtn("General"); if (b) b.click(); }, function(){ return !!catBtn("General"); }, "General plugins"],
        ["Most keys", "star", "sun", function(){ var s = document.getElementById("mk-sort"); s.value = "keys"; s.dispatchEvent(new Event("change")); }, null, "Sorted by keys"],
        ["Show all", "cross", "tile", function(){ var b = catBtn("All"); if (b) b.click(); var q = document.getElementById("mk-q"); if (q.value){ q.value = ""; q.dispatchEvent(new Event("input")); } }, function(){ return !!catBtn("All"); }, "All plugins"],
        ["Submit yours", "plus", "mint", jump("mk-submit"), null, "Submit a plugin"]
      ]],
      plugin: ["Plugin", [
        ["All plugins", "left", "tile", press("#mk-detail .back"), find("#mk-detail .back"), "Marketplace"],
        ["Install", "down", "mint", press("#mk-detail .pd-get a.btn.mint"), find("#mk-detail .pd-get a.btn.mint"), "Opening Minniondeck"],
        ["Copy SHA", "copy", "sky", press("#mk-detail .hash .mini"), find("#mk-detail .hash .mini"), "SHA-256 copied"],
        ["Find another", "search", "tile", search, null, "Search"],
        ["Submit yours", "plus", "lilac", function(){ nav("marketplace", "mk-submit")(); }, null, "Submit a plugin"]
      ]],
      docs: ["Docs", [
        ["Previous", "left", "tile", press("#d-pager a:not(.nx)"), find("#d-pager a:not(.nx)"), "Previous topic"],
        ["Next topic", "right", "mint", press("#d-pager a.nx"), find("#d-pager a.nx"), "Next topic"],
        ["Search docs", "search", "sky", focusIn("#d-q"), null, "Type to search"],
        ["Back to top", "up", "tile", top, null, "Top of the page"],
        ["Report a bug", "bug", "coral", nav("contribute", "ct-bug"), null, "Bug report"]
      ]],
      gifs: ["Now in the app", [
        ["Download", "down", "mint", nav("download"), null, "Get MinnionDeck"],
        ["How it works", "book", "sky", nav("docs/images"), null, "Edit image"],
        ["Marketplace", "star", "sun", nav("marketplace"), null, "Plugins"],
        ["Docs", "book", "tile", nav("docs"), null, "Docs"],
        ["Home", "left", "lilac", nav("home"), null, "Home"]
      ]],
      images: ["Now in the app", [
        ["Download", "down", "mint", nav("download"), null, "Get MinnionDeck"],
        ["How it works", "book", "sky", nav("docs/images"), null, "Edit image"],
        ["Marketplace", "star", "sun", nav("marketplace"), null, "Plugins"],
        ["Docs", "book", "tile", nav("docs"), null, "Docs"],
        ["Home", "left", "lilac", nav("home"), null, "Home"]
      ]],
      download: ["Download", [
        ["Windows", "down", "mint", press('[data-get="pc"]'), find('[data-get="pc"]'), "Downloading the installer"],
        ["Setup: next", "right", "tile", press("#wiz-next"), function(){ var b = document.getElementById("wiz-next"); return b && !b.disabled; }, "Next setup step"],
        ["What you need", "gear", "lilac", jump("req-title"), null, "Requirements"],
        ["Updates", "shield", "sky", jump("upd-title"), null, "After install"],
        ["Questions", "book", "sun", jump("dlfaq-title"), null, "Installing"]
      ]],
      contribute: ["Contribute", [
        ["Ways to help", "star", "sun", jump("ct-ways"), null, "Pick one"],
        ["Write a report", "bug", "coral", focusIn("#bug-form input, #bug-form textarea"), null, "Bug report"],
        ["Copy report", "copy", "sky", press("#bug-copy"), find("#bug-copy"), "Report copied"],
        ["Submit plugin", "plus", "mint", nav("marketplace", "mk-submit"), null, "Submit a plugin"],
        ["Read docs", "book", "lilac", nav("docs"), null, "Docs"]
      ]],
      about: ["About", [
        ["Promises", "shield", "mint", jump("ab-why"), null, "Four promises"],
        ["The story", "book", "sky", jump("ab-now"), null, "The story so far"],
        ["Built with", "gear", "lilac", jump("ab-cred"), null, "Credits"],
        ["Help out", "star", "sun", nav("contribute"), null, "Contribute"],
        ["Download", "down", "mint", nav("download"), null, "Download"]
      ]]
    };
    var cur = "", keys = [];
    function iconOf(g){ return GL[g] ? glyphSvg(g) : '<img src="' + g + '" alt="">'; }
    function avail(k){ try { return !k[4] || k[4](); } catch (e) { return false; } }
    function draw(animate){
      var prof = P[cur][1];
      keys = prof;
      var html = "";
      prof.forEach(function(k, i){
        var on = avail(k);
        html += '<button type="button" class="sd-key' + (animate ? " flip" : "") + '" style="--i:' + i + ';background:' + COL[k[2]] + '" data-i="' + i + '" aria-keyshortcuts="' + (i + 1) + '" aria-label="' + k[0] + ' (key ' + (i + 1) + ')"' + (on ? "" : ' aria-disabled="true"') + '><kbd aria-hidden="true">' + (i + 1) + "</kbd>" + iconOf(k[1]) + '<span class="t">' + k[0] + "</span></button>";
      });
      keysEl.innerHTML = html;
      if (animate) setTimeout(function(){ keysEl.querySelectorAll(".flip").forEach(function(b){ b.classList.remove("flip"); }); }, 800);
    }
    function lcdSay(sub, name){
      subEl.textContent = sub; nameEl.textContent = name;
      if (!reduce){ lcd.classList.remove("switch"); void lcd.offsetWidth; lcd.classList.add("switch"); }
    }
    // Called from show(): picks the profile for the page now in front
    window.mdDeckSwitch = function(full){
      var parts = String(full || "").split("/"), v = parts[0];
      var id = v === "marketplace" && parts[1] ? "plugin" : (P[v] ? v : "home");
      if (id === cur){ setTimeout(refresh, 400); return; }
      var first = !cur;
      cur = id;
      draw(!first && !reduce);
      lcdSay(first ? "Profile" : "Switched to", P[id][0]);
      setTimeout(refresh, 500);
    };
    // Keys whose target appears later (plugin details, the docs pager) become available when it does
    function refresh(){
      keysEl.querySelectorAll(".sd-key").forEach(function(b, i){
        if (!keys[i]) return;
        if (avail(keys[i])) b.removeAttribute("aria-disabled"); else b.setAttribute("aria-disabled", "true");
      });
    }
    function hit(i){
      var k = keys[i], b = keysEl.children[i];
      if (!k || !b) return;
      if (!avail(k)){ lcdSay("Not on this page yet", k[0]); return; }
      b.classList.add("down"); setTimeout(function(){ b.classList.remove("down"); }, 160);
      if (!reduce){ b.classList.remove("ok"); void b.offsetWidth; b.classList.add("ok"); }
      lcdSay(k[0], k[5]);
      k[3]();
      setTimeout(refresh, 600);
    }
    keysEl.addEventListener("click", function(e){ var b = e.target.closest(".sd-key"); if (b) hit(+b.getAttribute("data-i")); });
    document.addEventListener("keydown", function(e){
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (!/^[1-5]$/.test(e.key)) return;
      var a = document.activeElement;
      if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      if (dock.classList.contains("folded")) return;   // folding the deck turns its single-key shortcuts off
      hit(+e.key - 1);
    });
    // Folded or open, remembered in this browser
    function setFold(f){
      dock.classList.toggle("folded", f); document.body.classList.toggle("deck-folded", f);
      fold.setAttribute("aria-expanded", String(!f));
      fold.setAttribute("aria-label", f ? "Show the page deck and turn on its 1 to 5 keys" : "Hide the page deck and turn off its 1 to 5 keys");
      try { localStorage.setItem("md.deckFolded", f ? "1" : "0"); } catch (e) {}
    }
    fold.addEventListener("click", function(){ setFold(!dock.classList.contains("folded")); });
    try { if (localStorage.getItem("md.deckFolded") === "1") setFold(true); } catch (e) {}
    // On Home the hero already is a deck: the page deck waits until the hero has scrolled away
    var heroEl = document.querySelector(".hero");
    function awayCheck(){
      var onHome = !home.hidden && heroEl;
      dock.classList.toggle("away", !!(onHome && heroEl.getBoundingClientRect().bottom > window.innerHeight * 0.35));
    }
    window.addEventListener("scroll", awayCheck, {passive:true});
    window.mdDeckAway = awayCheck;
    // Out of the way while typing, so it never covers a form or the phone keyboard
    document.addEventListener("focusin", function(e){ if (e.target.matches && e.target.matches("input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=file]), textarea, select")) dock.classList.add("typing"); });
    document.addEventListener("focusout", function(){ setTimeout(function(){ var a = document.activeElement; if (!a || !a.matches("input, textarea, select")) dock.classList.remove("typing"); }, 0); });
    // Phones and tablets: slide down while scrolling down to read, back up when scrolling up,
    // near the top or at the end of the page (14-touch.css)
    var tuckMq = window.matchMedia && matchMedia("(max-width:1024px)"), lastY = window.scrollY, run = 0;
    window.addEventListener("scroll", function(){
      var y = window.scrollY, d = y - lastY; lastY = y;
      if (!tuckMq || !tuckMq.matches){ dock.classList.remove("tuck"); return; }
      run = (d > 0) === (run > 0) ? run + d : d;
      var atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      if (y < 80 || atEnd || run < -24) dock.classList.remove("tuck");
      else if (run > 48) dock.classList.add("tuck");
    }, { passive: true });
  })();

