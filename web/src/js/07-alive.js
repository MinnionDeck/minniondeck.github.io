  /* ===== Alive: Minnion, sounds, mouse life, idle life, scroll stories ===== */
  (function(){
    var fine = window.matchMedia && matchMedia("(pointer:fine)").matches;
    /* --- sounds: soft square-wave blips, off until the visitor turns them on --- */
    var AC = null, soundOn = false, sndBtn = document.getElementById("snd-btn");
    function blip(f, d, type, vol, at){
      if (!soundOn) return;
      try {
        AC = AC || new (window.AudioContext || window.webkitAudioContext)();
        var t = AC.currentTime + (at || 0), o = AC.createOscillator(), g = AC.createGain();
        o.type = type || "square"; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(vol || .04, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
      } catch (e) {}
    }
    function setSound(on, quiet){
      soundOn = on;
      sndBtn.setAttribute("aria-pressed", String(on));
      sndBtn.setAttribute("aria-label", on ? "Sounds: on. Turn off click sounds" : "Sounds: off. Turn on click sounds");
      try { localStorage.setItem("md.sound", on ? "1" : "0"); } catch (e) {}
      if (on && !quiet){ blip(523, .08); blip(659, .08, null, null, .08); blip(784, .14, null, null, .16); }
    }
    sndBtn.addEventListener("click", function(){ setSound(!soundOn); });
    try { if (localStorage.getItem("md.sound") === "1") setSound(true, true); } catch (e) {}
    // only what a person presses makes a sound, never the demos playing by themselves
    document.addEventListener("click", function(e){
      if (!soundOn || !e.isTrusted) return;
      var t = e.target.closest(".key, .sd-key, .rk, .edt-key, .btn, .mn, .cats button, .skills button, .tl, .nav a, .cmdk-btn, .sc-n");
      if (!t || t === sndBtn) return;
      if (t.matches(".key, .sd-key, .edt-key")) blip(380 + Math.random() * 260, .07);
      else if (t.matches(".mn")){ blip(660, .06, "triangle", .06); blip(990, .1, "triangle", .06, .07); }
      else blip(300, .04, "triangle", .05);
    }, true);

    /* --- Minnion: the 16 x 16 logo as SVG parts --- */
    function px(x, y, w, h, c, cls){ return '<rect' + (cls ? ' class="' + cls + '"' : "") + ' x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>'; }
    function mnSvg(){
      var K = "#1e2433", C = "#5fd0a8", E = "#3aa585", A = "#ff5a5f", W = "#ffffff", r = "";
      var rows = {3:".....bbbbbb.....", 4:"...bbccccccbb...", 5:"..bccccccccccb..", 6:"..bccccccccccb..", 7:".bccccccccccccb.", 8:".bccccccccccccb.",
                  9:".bccccccccccceb.", 10:".bccccccccccceb.", 11:"..bccccccccceb..", 12:"...bbccccccbb...", 13:".....bbbbbb....."};
      for (var y in rows){ var row = rows[y];
        for (var x = 0; x < 16;){ var ch = row[x], e = x + 1; while (e < 16 && row[e] === ch) e++;
          if (ch !== ".") r += px(x, +y, e - x, 1, ch === "b" ? K : ch === "e" ? E : C); x = e; } }
      var body = '<g class="ant">' + px(6, 0, 2, 2, A) + px(7, 2, 1, 1, K) + "</g>" + r +
        px(4, 6, 2, 2, W, "eyew") + px(10, 6, 2, 2, W, "eyew") +
        '<g class="pupil">' + px(5, 7, 1, 1, K) + px(11, 7, 1, 1, K) + "</g>" +
        px(4, 7, 2, 1, K, "lid") + px(10, 7, 2, 1, K, "lid") +
        px(7, 9, 2, 1, K, "mouth-flat") +
        '<g class="mouth-joy">' + px(6, 9, 1, 1, K) + px(7, 10, 2, 1, K) + px(9, 9, 1, 1, K) + "</g>" +
        '<g class="mouth-o">' + px(7, 9, 2, 2, K) + px(7, 10, 2, 1, A) + "</g>" +
        '<g class="armL">' + px(-1, 9, 2, 1, K) + "</g>" + '<g class="armR">' + px(15, 9, 2, 1, K) + "</g>";
      return '<svg viewBox="-2 -2 20 18" shape-rendering="crispEdges" aria-hidden="true"><g class="lean"><g class="body">' + body + "</g>" +
        '<g class="legL">' + px(5, 14, 2, 2, K) + '</g><g class="legR">' + px(9, 14, 2, 2, K) + "</g>" +
        '<text class="zz" x="14" y="2">z</text></g></svg>';
    }
    var hero = document.getElementById("mn-hero"), buddy = document.getElementById("mn-buddy");
    [hero, buddy].forEach(function(m){ if (m) m.insertAdjacentHTML("afterbegin", mnSvg()); });
    function mood(m, cls, ms){ m.classList.remove(cls); void m.offsetWidth; m.classList.add(cls); setTimeout(function(){ m.classList.remove(cls); }, ms); }
    function say(m, text, ms){
      var b = m.querySelector(".mn-say"); if (!b) return;
      b.textContent = text; b.classList.add("on");
      clearTimeout(b._t); b._t = setTimeout(function(){ b.classList.remove("on"); }, ms || 2200);
    }
    // eyes follow the mouse, the body leans toward it (smooth); blinks come in pixel steps
    function look(m, x, y){
      var r = m.getBoundingClientRect(); if (!r.width) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height * .45, dx = x - cx, dy = y - cy;
      var px_ = dx > 24 ? 0 : dx < -24 ? -1 : (dx > 0 ? 0 : -1), py_ = dy > 24 ? 0 : -1;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24){ px_ = -.5; py_ = -.5; }
      m.querySelector(".pupil").setAttribute("transform", "translate(" + px_ + "," + py_ + ")");
      var lean = Math.max(-9, Math.min(9, dx / 40));
      m.querySelector(".lean").style.transform = "rotate(" + lean.toFixed(1) + "deg)";
    }
    var lastAct = Date.now(), asleep = false;
    function wake(){
      lastAct = Date.now();
      if (asleep){ asleep = false; hero.classList.remove("sleep"); mood(hero, "wow", 700); mood(hero, "jump", 500); say(hero, "Oh! Hi!", 1400); }
    }
    if (!reduce){
      document.addEventListener("pointermove", function(e){ wake(); if (!home.hidden) look(hero, e.clientX, e.clientY); }, {passive:true});
      window.addEventListener("scroll", wake, {passive:true});
      document.addEventListener("keydown", wake);
      (function blink(){ setTimeout(function(){ if (!asleep){ mood(hero, "blink", 140); if (buddy) mood(buddy, "blink", 140); if (Math.random() < .25) setTimeout(function(){ mood(hero, "blink", 140); }, 260); } blink(); }, 2200 + Math.random() * 3800); })();
      setInterval(function(){ if (!asleep && Date.now() - lastAct > 18000 && !home.hidden){ asleep = true; hero.classList.add("sleep"); } }, 2000);
    }
    var lines = ["Hi! I'm Minnion.", "Tap a key on the deck!", "I live on your phone.", "Free. No account. Promise.", "Ctrl+K finds anything.", "Plugins make me stronger."], li = 0;
    hero.addEventListener("click", function(){ wake(); mood(hero, "wow", 800); mood(hero, "jump", 500); say(hero, lines[li]); li = (li + 1) % lines.length; });
    // every key press on the deck makes Minnion cheer
    var cheerN = 0, cheers = ["Nice!", "Beep boop!", "Your PC did it!", "Again!"];
    document.addEventListener("md:press", function(){
      if (reduce || asleep) return;
      mood(hero, "joy", 650); mood(hero, "jump", 500);
      if (++cheerN % 4 === 0) say(hero, cheers[(cheerN / 4) % cheers.length], 1500);
    });

    /* --- the buddy walks down the side of the home page, next to the section you're reading --- */
    var TIPS = {"sims-title":"Pick one during setup!", "how-title":"Three steps, that's all.", "edt-title":"Make a key right here!", "feat-title":"All on your own PC.",
      "free-title":"Free. Really free.", "market-title":"One click per plugin.", "faq-title":"Questions? Right here.", "final-title":"Let's build your deck!", "app-title":"This is the real app."};
    var tipEls = Object.keys(TIPS).map(function(id){ return document.getElementById(id); }).filter(Boolean);
    var bY = -100, bActive = null, walkT = 0, bQ = false;
    function buddyStep(){
      bQ = false;
      if (!buddy || reduce) return;
      if (home.hidden || window.innerWidth < 1420){ buddy.style.opacity = 0; return; }
      var act = null;
      tipEls.forEach(function(h){ var t = h.getBoundingClientRect().top; if (t < window.innerHeight * .6) act = h; });
      if (!act){ buddy.style.opacity = 0; return; }
      buddy.style.opacity = 1;
      // Stay low enough that the speech bubble above the buddy clears the top bar
      var topBar = document.querySelector("header.top"), bub = buddy.querySelector(".mn-say");
      var minY = (topBar ? topBar.getBoundingClientRect().bottom : 68) + Math.max(bub ? bub.offsetHeight : 0, 48) + 18;
      var y = Math.max(minY, Math.min(window.innerHeight - 170, act.getBoundingClientRect().top - 6));
      var moved = Math.abs(y - bY) > 2;
      if (act !== bActive){
        buddy.style.transition = "transform .6s cubic-bezier(.3,1.3,.5,1), opacity .3s";
        bActive = act; say(buddy, TIPS[act.id], 2600);
      } else buddy.style.transition = "opacity .3s";
      if (moved){ buddy.classList.add("walk"); buddy.classList.toggle("flip", y < bY); clearTimeout(walkT); walkT = setTimeout(function(){ buddy.classList.remove("walk"); }, 420); }
      bY = y; buddy.style.transform = "translateY(" + y + "px)";
    }
    window.addEventListener("scroll", function(){ if (!bQ){ bQ = true; requestAnimationFrame(buddyStep); } }, {passive:true});
    window.addEventListener("resize", buddyStep);
    if (buddy) buddy.style.opacity = 0;

    /* --- keycaps drifting behind the hero, leaning away from the mouse --- */
    var float = document.getElementById("hero-float");
    if (float && !reduce){
      var ICONS = ["sp-play", "timer-countdown", "soundboard-sound", "weather-sun", "sysmon-cpu", "sp-like-on", "weather-rain", "sp-next", "timer-clock"];
      var COLS = ["var(--mint)", "var(--sun)", "var(--peach)", "var(--sky)", "var(--lilac)", "var(--coral)", "var(--sky)", "var(--mint)", "var(--sun)"];
      var SPOTS = [[2, 8], [44, 2], [92, 6], [96, 48], [86, 92], [38, 94], [24, -4], [62, 96], [99, 24]];
      SPOTS.forEach(function(p, i){
        var k = document.createElement("div"); k.className = "kc";
        var size = 34 + (i * 13) % 30;
        // Keep the whole keycap, its shadow and its drift inside the clipped area
        var px = Math.min(Math.max(p[0], 0), 100) / 100, py = Math.min(Math.max(p[1], 0), 100) / 100, m = 32;
        k.style.cssText = "left:calc((100% - " + (size + 2 * m) + "px) * " + px + " + " + m + "px);top:calc((100% - " + (size + 2 * m) + "px) * " + py + " + " + m + "px);--s:" + size + "px;--c:" + COLS[i] + ";--d:" + (3.5 + (i % 4)) + "s";
        k.dataset.depth = String(.4 + (size - 34) / 40);
        k.innerHTML = '<i style="animation-delay:-' + i * .7 + 's"><img src="icons/' + ICONS[i] + '.png" alt=""></i>';
        float.appendChild(k);
      });
      if (fine) document.addEventListener("pointermove", function(e){
        if (home.hidden) return;
        var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
        float.querySelectorAll(".kc").forEach(function(k){ var d = +k.dataset.depth * 26;
          k.style.setProperty("--px", (-nx * d).toFixed(1) + "px"); k.style.setProperty("--py", (-ny * d).toFixed(1) + "px"); });
      }, {passive:true});
    }

    /* --- deck keys glow when the mouse comes near; cards tilt a little toward it --- */
    var stageEl = document.getElementById("stage");
    if (fine && !reduce && stageEl) stageEl.addEventListener("pointermove", function(e){
      document.querySelectorAll("#deck .key").forEach(function(k){
        var r = k.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        k.classList.toggle("near", dx * dx + dy * dy < 70 * 70);
      });
    }, {passive:true});
    if (stageEl) stageEl.addEventListener("pointerleave", function(){ document.querySelectorAll("#deck .key.near").forEach(function(k){ k.classList.remove("near"); }); });
    if (fine && !reduce) document.addEventListener("pointermove", function(e){
      var c = e.target.closest && e.target.closest(".lift"); if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--ry", (((e.clientX - r.left) / r.width - .5) * 6).toFixed(2) + "deg");
      c.style.setProperty("--rx", (-((e.clientY - r.top) / r.height - .5) * 6).toFixed(2) + "deg");
    }, {passive:true});

    /* --- numbers count up when they scroll in (real numbers from the marketplace list) --- */
    var stats = document.getElementById("stats");
    if (stats){
      var targets = {};
      stats.querySelectorAll("b[data-count]").forEach(function(b){ var v = b.getAttribute("data-count"); targets[v] = isNaN(+v) ? +b.textContent : +v; });
      pluginList().then(function(d){
        var ps = d.plugins || [];
        targets.plugins = ps.length;
        targets.keys = ps.reduce(function(a, p){ return a + (p.actions || []).length; }, 0);
        stats.querySelectorAll("b[data-count]").forEach(function(b){ if (b.dataset.done) b.textContent = targets[b.getAttribute("data-count")]; });
      }, function(){});
      function countUp(){
        stats.querySelectorAll("b[data-count]").forEach(function(b){
          var to = targets[b.getAttribute("data-count")], n = 0, steps = 12;
          b.dataset.done = "1";
          if (reduce || !to){ b.textContent = to; return; }
          var t = setInterval(function(){ n++; b.textContent = Math.round(to * n / steps); if (n >= steps){ clearInterval(t); b.textContent = targets[b.getAttribute("data-count")]; } }, 70);
        });
      }
      if ("IntersectionObserver" in window){
        var so = new IntersectionObserver(function(en){ if (en[0].isIntersecting){ so.disconnect(); countUp(); } }, {threshold:.4});
        so.observe(stats);
      } else countUp();
    }

    /* --- the final call's keys fly in from all over as you scroll to it --- */
    var krow = document.querySelector("#home-view .keyrow"), kq = false;
    var OFF = [[-260, -120, -40], [-140, 160, 30], [-40, -200, -20], [60, 180, 25], [170, -140, 35], [280, 110, -30]];
    function keysIn(){
      kq = false;
      if (!krow || reduce || home.hidden) return;
      var r = krow.getBoundingClientRect(), p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight * .55)));
      var q = 1 - p, ease = q * q;
      Array.prototype.forEach.call(krow.children, function(s, i){ var o = OFF[i % OFF.length];
        s.style.transform = "translate(" + (o[0] * ease).toFixed(1) + "px," + (o[1] * ease).toFixed(1) + "px) rotate(" + (o[2] * ease).toFixed(1) + "deg)"; });
    }
    window.addEventListener("scroll", function(){ if (!kq){ kq = true; requestAnimationFrame(keysIn); } }, {passive:true});
    keysIn();

    /* --- idle life: a pixel cat walks along the top of the footer now and then --- */
    var cat = document.getElementById("cat");
    if (cat && !reduce && "IntersectionObserver" in window){
      var K = "#1e2433", Y = "#ffc93c";
      var f1 = ["........k.k.","k.......kkk.",".k......kykk",".kkkkkkkkkk.","..kkkkkkkkk.","..kkkkkkkk..","..k.k...k.k.","..k.k...k.k."];
      var f2 = ["........k.k.","k.......kkk.",".k......kykk",".kkkkkkkkkk.","..kkkkkkkkk.","..kkkkkkkk..","...kk....kk.","...k......k."];
      var svg = "";
      [f1, f2].forEach(function(f, n){ f.forEach(function(row, y){ for (var x = 0; x < 12; x++) if (row[x] !== ".") svg += px(x + n * 12, y, 1, 1, row[x] === "y" ? Y : K); }); });
      cat.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 8" shape-rendering="crispEdges">' + svg + "</svg>") + '")';
      var seen = false, lastWalk = 0;
      function walkCat(){ if (Date.now() - lastWalk < 20000) return; lastWalk = Date.now(); cat.classList.remove("go"); void cat.offsetWidth; cat.classList.add("go"); }
      new IntersectionObserver(function(en){ seen = en[0].isIntersecting; if (seen) setTimeout(walkCat, 900); }).observe(document.querySelector("footer"));
      setInterval(function(){ if (seen && !document.hidden) walkCat(); }, 24000);
    }
  })();

