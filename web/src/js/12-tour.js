  /* tour: the app window mock, click through its pages */
  var TR_GL = {
    star: ["...##...","...##...","########",".######.","..####..",".##..##.","##....##","........"],
    grid: ["........",".##..##.",".##..##.","........","........",".##..##.",".##..##.","........"],
    people: ["..##....",".####.##","..##.###","......#.",".####...","######..","######..","........"],
    phone: ["..####..","..#..#..","..#..#..","..#..#..","..#..#..","..####..","..#.##..","..####.."],
    shop: ["..####..",".#....#.",".#....#.","########","#......#","#.#..#.#","#......#","########"],
    pen: [".....##.","....####","...####.","..####..",".####...",".###....","##......","........"],
    gear: GL.gear
  };
  function trKey(slug){ var a = BRAND_ART[slug]; return '<span style="background:#' + a.bg + '">' + logoSvg(slug) + '</span>'; }
  function trGlyphKey(name, bg){ return '<span style="background:' + bg + ';color:#1e2433">' + glyphSvg(name) + '</span>'; }
  function trQr(seed, n){
    var h = "";
    function finder(x, y, ax, ay){ var dx = x - ax, dy = y - ay; if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return -1; return (dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5)) ? 1 : 0; }
    for (var y = 0; y < 21; y++) for (var x = 0; x < 21; x++){
      var f = Math.max(finder(x, y, 0, 0), finder(x, y, 14, 0), finder(x, y, 0, 14));
      var near = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      var on = f >= 0 ? f === 1 : near ? false : ((x * 31 + y * 17 + seed * (x ^ y)) % 7) < 3;
      h += '<i' + (on ? ' class="k"' : "") + '></i>';
    }
    return h;
  }
  var hs = function(n, pos){ return '<span class="hs" data-n="' + n + '" style="' + pos + '">' + n + '</span>'; };
  var TR = [
    { id: "deck", name: "Deck", icon: "grid", crumb: "My profile / Page 1",
      lead: "Where your buttons live. It looks the same on the PC and on your phone.",
      points: [["Profile", "Which set of pages you're looking at. It can switch by itself when an app comes to the front."],
               ["Pages and folders", "+ Page and + Folder make more. Double-click a name, or press F2, to rename it."],
               ["Page tools", "The back arrow closes the pages panel (or Ctrl+B). Then the grid size (3 × 3, 4 × 3 or 5 × 3), Edit layout to move buttons, and what your phones see."],
               ["Buttons", "Every button is a square: its picture in the middle, its name small at the bottom. Click an empty key (+) to make one, double-click a button to edit it."],
               ["Right-click menu", "Right-click a button for Edit button, Duplicate, Copy, Paste, Move to page and Delete."]],
      html: function(){
        var g = [trGlyphKey("mic", "#f7fafc"), trKey("obsstudio"), trKey("spotify"), trKey("discord"), trKey("youtube"),
                 trGlyphKey("bolt", "#b79cff"), trGlyphKey("camera", "#5fd0a8"), trGlyphKey("lock", "#ffb38a"), trKey("twitch"), '<span class="e">+</span>',
                 trGlyphKey("globe", "#7cc4ff"), '<span class="e">+</span>', '<span class="e">+</span>', trGlyphKey("note", "#ffc93c"), '<span class="e">+</span>'];
        g[2] = g[2].replace("<span ", '<span class="sel" ');
        var pg = function(name, n, on){ return '<div class="am-node' + (on ? " on" : "") + '">' + rowsSvg(TR_GL.grid) + '<span>' + name + '</span><i>' + n + '</i></div>'; };
        return '<div class="am-dk"><aside class="am-dside">' +
          '<div class="am-dprof" style="position:relative">' + hs(1, "right:-8px;top:-8px") + '<span class="chip">' + rowsSvg(TR_GL.star) + '</span><div><b>My profile</b><small>Switched by hand</small></div></div>' +
          '<span class="am-cap">Pages</span><div class="am-drow" style="position:relative">' + hs(2, "right:-8px;top:-10px") + '<span class="am-b">+ Page</span><span class="am-b">+ Folder</span></div>' +
          pg("Page 1", 9, 1) + pg("Streaming", 6) +
          '<div class="am-node"><span class="tw">▼</span>' + glyphSvg("folder") + '<span>Work</span><i>2</i></div>' +
          '<div class="am-dsub">' + pg("Meetings", 15) + pg("Focus", 8) + '</div></aside>' +
          '<div class="am-dmain" style="position:relative"><div class="am-top" style="position:relative">' + hs(3, "right:-2px;top:-4px") + '<span class="am-b">‹</span><b><span>My profile / </span>Page 1</b><span class="am-b">5 × 3 grid ▾</span><span class="am-b">Edit layout</span><span class="am-b">Show on phones</span></div>' +
          '<div class="am-dgrid"><div class="am-grid" style="position:relative">' + hs(4, "left:4px;top:-10px") + g.join("") + '</div></div>' +
          '<div class="am-menu">' + hs(5, "right:-10px;top:-10px") + ['Edit button', 'Duplicate', 'Copy', 'Paste', 'Move to page ›', 'Delete'].map(function(m, i){ return '<span' + (i === 5 ? ' class="del"' : i === 3 ? ' class="off"' : '') + '>' + m + '</span>'; }).join('') + '</div></div></div>';
      } },
    { id: "editor", name: "Edit button", icon: "pen", crumb: "My profile / Page 1 / New button",
      lead: "The window where you make a button and change it, in four steps, next to a live preview.",
      points: [["Opening it", "Click an empty key (+) to make a new button. For a button you have, double-click it, or pick Edit button in its right-click menu."],
               ["Preview", "The button as it looks on the deck and on your phone. Try it plays its press effect."],
               ["1. Name", "What the button is called. It shows small at the bottom of the button."],
               ["2. What it does", "Search every action, or filter by Built in or by a plugin, like Spotify or Timer: press keys, type text, open a program or website, change the volume and more."],
               ["3. Picture", "35 simple pictures, 1,036 pixel icons and 3,466 app logos, with search. Up to 8 looks: each press shows the next, like Mic on and Mic muted."],
               ["4. Colour", "The button's colour and how it moves when you press it."],
               ["Add button", "Add button puts it on the PC and your phones at once. The bar at the bottom says which step still needs filling in. Cancel leaves everything as it was."]],
      html: function(){
        var step = function(n, q, body, h){ return '<div style="display:flex;flex-direction:column;gap:4px;position:relative">' + hs(h, "right:-8px;top:-6px") + '<b><span class="am-b" style="padding:0 4px">' + n + '</span> ' + q + '</b>' + body + '</div>'; };
        return '<div class="am-ed">' +
          '<div class="am-p" style="display:flex;flex-direction:column;gap:8px;align-items:center;position:relative">' + hs(2, "right:-8px;top:-10px") +
          '<span style="width:72px;height:72px;flex:none;display:grid;place-items:center;position:relative;background:#7cc4ff;color:#1e2433;border:3px solid #e4eaf6">' + glyphSvg("mic").replace("<svg ", '<svg width="30" height="30" ') + '<small style="position:absolute;bottom:3px;font-size:9px">Mute mic</small></span>' +
          '<span class="am-b">Try it</span><span class="am-dim" style="text-align:center">How the button looks on the deck and on your phone.</span></div>' +
          '<div class="am-p" style="display:flex;flex-direction:column;gap:8px;position:relative">' + hs(1, "left:-10px;top:-10px") +
          step(1, "What is it called?", '<span class="am-b">Mute mic</span>', 3) +
          step(2, "What does it do?", '<span class="am-b">Search 64 actions, like volume or spotify</span><div class="am-row"><span class="am-b on">All</span><span class="am-b">Built in</span><span class="am-b">Spotify</span><span class="am-b">Timer</span></div>', 4) +
          step(3, "Picture", '<div class="am-row"><span class="am-b on">Mic on</span><span class="am-b">Mic muted</span><span class="am-b">+ Add look</span></div>', 5) +
          step(4, "Colour", '<div class="am-row" style="gap:3px">' + ["#7cc4ff", "#5fd0a8", "#b79cff", "#ffb38a", "#ff5a5f", "#ffc93c"].map(function(c, i){ return '<i style="display:inline-block;width:12px;height:12px;border:2px solid ' + (i ? "#000" : "#e4eaf6") + ';background:' + c + '"></i>'; }).join("") + '</div>', 6) +
          '<div class="am-row" style="margin-top:auto;justify-content:flex-end;position:relative">' + hs(7, "left:-8px;top:-6px") + '<span class="am-b">Cancel</span><span class="am-b">Add button</span></div></div></div>';
      } },
    { id: "profiles", name: "Profiles", icon: "people", crumb: "Profiles",
      lead: "A profile is a set of pages: one for streaming, one for gaming, one for every day.",
      points: [["Your profiles", "One card per profile: its picture and colour, pages and buttons, and when it switches. Use this profile puts it on your deck; the one in use has a mint band on top."],
               ["Switch automatically", "One switch for all of them. It says what it will do, like \"On. 2 profiles switch when their app comes to the front.\" Edit a profile to pick its app."],
               ["Add and share", "+ New profile, or the dashed card, starts one with an empty page. Import… adds a .mdprofile file."]],
      html: function(){
        var card = function(name, colour, g, stats, when, inUse){ return '<div class="am-p am-card"' + (inUse ? ' style="border-top:5px solid #5fd0a8"' : "") + '><div class="sw"><span style="display:grid;place-items:center;width:22px;height:22px;background:' + colour + ';color:#1e2433;border:2px solid #e4eaf6">' + glyphSvg(g).replace("<svg ", '<svg width="13" height="13" ') + '</span><div><b>' + name + '</b><div class="am-dim">' + stats + '</div></div>' + (inUse ? '<span class="am-b on" style="margin-left:auto">In use</span>' : "") + '</div><span class="am-dim">' + when + '</span><div class="am-row"><span class="am-b' + (inUse ? "" : " on") + '" style="flex:1;text-align:center">' + (inUse ? "✓ In use" : "Use this profile") + '</span><span class="am-b">Edit</span></div></div>'; };
        return '<div class="am-row" style="position:relative"><b style="margin-right:auto">Profiles</b><span class="am-b">Import…</span><span class="am-b on">+ New profile</span>' + hs(3, "right:-6px;top:-12px") + '</div>' +
          '<p class="am-dim" style="margin:0">A profile is a set of pages. Pick the one you want to use, or let Minniondeck switch for you when an app comes to the front.</p>' +
          '<div class="am-p" style="display:flex;align-items:center;gap:8px;position:relative">' + hs(2, "right:-8px;top:-10px") + '<div style="margin-right:auto"><b>Switch automatically</b><div class="am-dim">On. 1 profile switches when its app comes to the front.</div></div><span class="am-sw"></span></div>' +
          '<div class="am-cards" style="position:relative">' + hs(1, "left:-8px;top:-8px") +
          card("My profile", "#7cc4ff", "star", "3 pages · 21 buttons", "Switched by hand", 1) + card("Streaming", "#b79cff", "play", "1 page · 4 buttons", "When OBS Studio is in front", 0) + '</div>';
      } },
    { id: "phones", name: "Phones", icon: "phone", crumb: "Phones",
      lead: "Pair phones and see which are connected. The pairing code only works while this page is open.",
      points: [["Paired phones", "Each phone and whether it's connected. Rename one, or forget it."],
               ["Pair a new phone", "Point the phone's camera at the code, open the link and press Allow here. The deck opens in its browser, no app needed. The code carries this PC's address, a one-time code and a check for the PC's certificate."],
               ["The code", "Pairing uses a 6-digit code you confirm on the PC, and each phone gets its own key. The code is good for 5 minutes and 5 tries."]],
      // The real page also has a Preview of your deck on a phone, on its side or upright
      html: function(){
        var ph = function(name, on, detail){ return '<div class="am-p" style="display:flex;justify-content:space-between;gap:6px;align-items:center"><div><b>' + name + '</b><div class="am-dim">' + detail + '</div></div><span class="am-b' + (on ? " on" : "") + '">' + (on ? "Connected" : "Offline") + '</span></div>'; };
        return '<b>Phones</b>' +
          '<div style="display:flex;flex-direction:column;gap:6px;position:relative">' + hs(1, "left:-8px;top:-8px") + '<span class="am-cap">Paired phones</span>' + ph("Pixel 8", 1, "In the browser · now") + ph("Galaxy Tab", 0, "Last seen yesterday") + '</div>' +
          '<div class="am-p" style="border-style:dashed;display:flex;gap:10px;align-items:center;position:relative">' + hs(2, "left:-8px;top:-8px") + '<div class="am-qr" style="width:72px;height:72px">' + trQr(5) + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:3px"><b>Pair a new phone</b><span class="am-dim">1. Point the phone&#39;s camera at this code.</span><span class="am-dim">2. Open the link it shows.</span><span class="am-dim">3. Press Allow here.</span>' +
          '<div style="position:relative;align-self:flex-start">' + hs(3, "right:-24px;top:-4px") + '<b style="font-family:var(--f-mono)">482 913</b> <span class="am-dim">· expires in 5 minutes</span></div></div></div>';
      } },
    { id: "marketplace", name: "Marketplace", icon: "shop", crumb: "Marketplace",
      lead: "The plugins in the Minnion Marketplace, read live from GitHub.",
      points: [["Find a plugin", "Search by name or key, pick a category, or sort by name, most keys or size."],
               ["Install or update", "Install downloads the plugin from GitHub, checks it and asks first. A plugin with a newer version shows Update."]],
      html: function(){
        var card = function(name, about, btn){ return '<div class="am-p" style="display:flex;flex-direction:column;gap:4px"><b>' + name + '</b><span class="am-dim">' + about + '</span><span class="am-b' + (btn === "Install" ? " go" : "") + '" style="align-self:flex-start">' + btn + '</span></div>'; };
        return '<b>Plugins for your deck</b>' +
          '<div class="am-row" style="position:relative">' + hs(1, "left:-8px;top:-8px") + '<span class="am-b" style="flex:1">Search plugins and keys</span><span class="am-b on">All 5</span><span class="am-b">General 5</span></div>' +
          '<div class="am-cards" style="position:relative">' + hs(2, "right:-8px;top:-8px") + card("Timer", "Countdowns, a stopwatch and a clock.", "Install") + card("Spotify", "Play, skip, like and volume.", "Installed") + '</div>';
      } },
    { id: "settings", name: "Settings", icon: "gear", crumb: "Settings",
      lead: "Everything you can set, in tabs down the side.",
      points: [["General", "Start with Windows, start in the tray, and whether closing the window keeps it running."],
               ["Appearance, Profiles and pages", "Light or dark, how much moves, button size, names on buttons, switching profiles by app, where it opens."],
               ["Phones and Plugins", "The port, phones following the PC's page, vibrate and keep awake. Your plugins, Developer mode and trusted authors."],
               ["Backup, Updates, About", "Backups and restore, versions, and where your data and logs are."]],
      html: function(){
        var tabs = ["General", "Appearance", "Profiles and pages", "Phones", "Plugins", "Backup", "Updates", "About"];
        return '<div class="am-set"><div class="am-tabs" style="position:relative">' + hs(1, "right:-8px;top:-8px") + '<span class="am-b">⌕ Search settings</span>' + tabs.map(function(t, i){ return '<span' + (i ? "" : ' class="on"') + '>' + t + '</span>'; }).join("") + '</div>' +
          '<div class="am-p" style="position:relative">' + hs(2, "right:-8px;top:-10px") + '<b>General</b>' +
          '<div class="am-field"><span>Start with Windows</span><span class="am-sw"></span></div>' +
          '<div class="am-field"><span>Start minimised to the tray</span><span class="am-sw"></span></div>' +
          '<div class="am-field"><span>When you close the window</span><span class="am-row"><span class="am-b on">Keep running</span><span class="am-b">Quit</span></span></div>' +
          '<div class="am-field" style="position:relative">' + hs(3, "right:-8px;top:-8px") + '<span>Language</span><span class="am-b">English ▾</span></div>' +
          '<div class="am-field" style="border:0;position:relative">' + hs(4, "right:-8px;top:-4px") + '<span class="am-dim">More languages are on the way.</span></div></div></div>';
      } }
  ];
  var amRail = document.getElementById("am-rail"), amView = document.getElementById("am-view");
  document.getElementById("aw-rail").innerHTML = ["grid", "people", "phone", "shop", "", "gear"].map(function(g, i){ return g ? '<span' + (i ? "" : ' class="on"') + '>' + rowsSvg(TR_GL[g]) + '</span>' : '<span class="sp"></span>'; }).join("");
  TR.forEach(function(t, i){
    if (t.id === "settings") { var sp = document.createElement("span"); sp.className = "sp"; amRail.appendChild(sp); }
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.dataset.tr = t.id;
    b.innerHTML = rowsSvg(TR_GL[t.icon]) + t.name;
    amRail.appendChild(b);
  });
  function trShow(id){
    var t = TR.filter(function(x){ return x.id === id; })[0] || TR[0];
    amRail.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-selected", String(b.dataset.tr === t.id)); });
    document.getElementById("am-crumb").textContent = t.crumb;
    amView.innerHTML = t.html();
    amView.classList.remove("in"); void amView.offsetWidth; amView.classList.add("in");
    document.getElementById("tr-note-title").textContent = t.name;
    document.getElementById("tr-note-lead").textContent = t.lead;
    document.getElementById("tr-points").innerHTML = t.points.map(function(p, i){ return '<li data-n="' + (i + 1) + '"><span class="n">' + (i + 1) + '</span><div><b>' + p[0] + '</b>' + p[1] + '</div></li>'; }).join("");
  }
  amRail.addEventListener("click", function(e){ var b = e.target.closest("[data-tr]"); if (b) trShow(b.dataset.tr); });
  amRail.addEventListener("keydown", function(e){
    var ids = TR.map(function(t){ return t.id; }), cur = ids.indexOf((amRail.querySelector('[aria-selected="true"]') || {}).dataset ? amRail.querySelector('[aria-selected="true"]').dataset.tr : "deck");
    var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    var next = ids[(cur + d + ids.length) % ids.length];
    trShow(next); amRail.querySelector('[data-tr="' + next + '"]').focus();
  });
  // Pointing at a numbered note lights up its number in the window
  document.getElementById("tr-points").addEventListener("mouseover", function(e){
    var li = e.target.closest("li"); amView.querySelectorAll(".hs").forEach(function(h){ h.classList.toggle("hot", !!li && h.dataset.n === li.dataset.n); });
  });
  document.getElementById("tr-points").addEventListener("mouseleave", function(){ amView.querySelectorAll(".hs").forEach(function(h){ h.classList.remove("hot"); }); });
  trShow("deck");
  document.getElementById("tr-qr").innerHTML = trQr(9);
  var trArt = { phone: trKey("spotify"), apps: artSvg(CAT_ART.general), act: glyphSvg("bolt"), look: logoSvg("spotify"), look2: logoSvg("spotify") };
  document.querySelectorAll("[data-trg]").forEach(function(el){
    var k = el.getAttribute("data-trg");
    el.innerHTML = k === "phone" ? rowsSvg(TR_GL.phone) : trArt[k];
  });

