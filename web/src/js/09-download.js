  /* download button: the PC app's installer on GitHub Releases, filled in by 01-release.js.
     Phones need no app (they open the deck in the browser) */

  /* setup preview: the same steps as Minniondeck Setup (minnionsetup\setup-app\ui\index.html):
     pick a use, choose parts (the marketplace's plugins), install, then pair from the app */
  var SIMS = [
    {id:"general", name:"General", note:"Stream Deck for your PC", bg:"lilac", svg:artSvg(CAT_ART.general)},
    {id:"streaming", name:"Streaming", note:"Go live, scenes", bg:"coral", svg:artSvg(CAT_ART.streaming), soon:true},
    {id:"games", name:"Games", note:"Game macros", bg:"sky", svg:artSvg(CAT_ART.games), soon:true},
    {id:"work", name:"Work", note:"Meetings, focus", bg:"peach", svg:artSvg(CAT_ART.work), soon:true}
  ];
  var BASE = [
    {n:"Minniondeck", v:REL.v, img:"icons/icon.png", lock:true}
  ];
  relHooks.push(function(){ BASE[0].v = REL.v; });
  // The marketplace's General plugins, read from the plugin list when the preview starts (these until then)
  var PARTS = {
    general:[{n:"Spotify", v:"0.1.0", img:"icons/sp-now.png"},{n:"Timer", v:"0.1.0", img:"icons/timer-countdown.png"},{n:"System Monitor", v:"0.2.0", img:"icons/sysmon-cpu.png"},{n:"Soundboard", v:"0.1.0", img:"icons/soundboard-sound.png"},{n:"Weather", v:"0.2.0", img:"icons/weather-weather.png"}]
  };
  var STEPS = [
    {t:"What will you use it for?", i:"Setup picks the plugins that go with it."},
    {t:"Choose parts", i:"Untick anything you don't want. Add more later from the marketplace."},
    {t:"Installing", i:"Installing Minniondeck, then downloading each plugin from the Minnion Marketplace and checking it."},
    {t:"Minniondeck is ready", i:"Pair your phone from the app."}
  ];
  var wiz = {step:0, sim:"general", picked:{}, run:0, paused:0, timer:0, started:false};
  var wBody = document.getElementById("wiz-body"), wBack = document.getElementById("wiz-back"), wNext = document.getElementById("wiz-next");

  function iconHtml(p){ return p.img ? '<img class="px" src="' + p.img + '" alt="">' : p.svg; }
  function partsFor(){ return BASE.concat(PARTS[wiz.sim]); }
  function resetPicked(){ wiz.picked = {}; partsFor().forEach(function(p){ wiz.picked[p.n] = !p.off; }); }

  function wizDraw(){
    var s = STEPS[wiz.step];
    document.getElementById("wiz-title").textContent = s.t;
    document.getElementById("wiz-intro").textContent = s.i;
    document.getElementById("wiz-now").textContent = "Step " + (wiz.step + 1) + " of 4";
    Array.prototype.forEach.call(document.getElementById("wiz-side").children, function(li, n){
      li.className = n < wiz.step ? "done" : n === wiz.step ? "on" : "";
      li.firstElementChild.textContent = n < wiz.step ? "✓" : String(n + 1);
    });
    wBack.disabled = wiz.step === 0 || wiz.step === 2;
    wNext.disabled = wiz.step === 2;
    wNext.textContent = wiz.step === 1 ? "Install" : wiz.step === 3 ? "Start over" : "Next";
    var h = "";
    if (wiz.step === 0){
      h = '<div class="opts" role="radiogroup" aria-label="What you will use it for">' + SIMS.map(function(m){
        return '<button type="button" class="opt" role="radio" data-sim="' + m.id + '" aria-checked="' + (wiz.sim === m.id) + '"' + (m.soon ? ' aria-disabled="true"' : "") + '>' +
          '<span class="ic" style="background:var(--' + m.bg + ')">' + iconHtml(m) + '</span><strong>' + m.name + '</strong><small>' + m.note + '</small>' +
          (m.soon ? '<span class="chip soon">soon</span>' : "") + '</button>';
      }).join("") + '</div>';
    } else if (wiz.step === 1){
      h = '<ul class="parts">' + partsFor().map(function(p){
        var on = wiz.picked[p.n];
        return '<li class="part' + (p.lock ? " locked" : "") + (on ? "" : " off") + '" role="checkbox" tabindex="' + (p.lock ? -1 : 0) + '" aria-checked="' + on + '"' + (p.lock ? ' aria-disabled="true"' : "") + ' data-part="' + p.n + '">' +
          '<span class="box"></span>' + iconHtml(p) + '<span>' + p.n + '</span><small>' + p.v + '</small></li>';
      }).join("") + '</ul>';
    } else if (wiz.step === 2){
      h = '<div class="prog">' + partsFor().filter(function(p){ return wiz.picked[p.n]; }).map(function(p, n){
        return '<div class="ln"><span>' + p.n + '</span><small data-st="' + n + '">Waiting</small><div class="meter"><i data-m="' + n + '"></i></div></div>';
      }).join("") + '<div class="ln" style="margin-top:6px"><b>All</b><small id="wiz-pct">0%</small><div class="meter all"><i id="wiz-all"></i></div></div></div>';
    } else {
      h = '<div class="ready"><div class="logo"><img class="px" src="icons/icon.png" alt=""></div><ol>' +
        '<li>Open <b>Minniondeck</b>, then its <b>Phones</b> page.</li><li>Scan the code with your phone&#39;s camera and open the link.</li><li>Press <b>Allow</b> on the PC. Your deck opens in the phone&#39;s browser.</li></ol></div>';
    }
    wBody.innerHTML = h;
    wBody.classList.remove("in"); void wBody.offsetWidth; wBody.classList.add("in");
    if (wiz.step === 2) wizInstall();
  }

  // Each picked part fills its bar in turn, like setup does: download, then check the SHA-256
  function wizInstall(){
    var run = ++wiz.run, n = 0, list = wBody.querySelectorAll("[data-m]"), total = list.length;
    function next(){
      if (run !== wiz.run || n >= total){ if (run === wiz.run) setTimeout(function(){ if (run === wiz.run){ wiz.step = 3; wizDraw(); } }, 500); return; }
      var bar = wBody.querySelector('[data-m="' + n + '"]'), st = wBody.querySelector('[data-st="' + n + '"]'), pct = 0, i = n;
      st.textContent = "Downloading";
      var t = setInterval(function(){
        if (run !== wiz.run){ clearInterval(t); return; }
        pct = Math.min(100, pct + (reduce ? 100 : 20));
        bar.style.width = pct + "%";
        var all = Math.round(((i + pct / 100) / total) * 100);
        document.getElementById("wiz-all").style.width = all + "%";
        document.getElementById("wiz-pct").textContent = all + "%";
        if (pct === 60) st.textContent = "Checking SHA-256";
        if (pct >= 100){ clearInterval(t); st.textContent = "Installed"; st.className = "ok"; n++; next(); }
      }, 110);
    }
    next();
  }

  function wizGo(step){ wiz.step = step; wizDraw(); }
  function hold(){ wiz.paused = Date.now() + 12000; }
  wBody.addEventListener("click", function(e){
    var o = e.target.closest(".opt");
    if (o){ hold(); if (o.getAttribute("aria-disabled") === "true") return; wiz.sim = o.dataset.sim; resetPicked(); wizDraw(); return; }
    var p = e.target.closest(".part");
    if (p && !p.classList.contains("locked")){ hold(); wiz.picked[p.dataset.part] = !wiz.picked[p.dataset.part]; wizDraw(); }
  });
  wBody.addEventListener("keydown", function(e){
    var p = e.target.closest(".part");
    if (p && (e.key === " " || e.key === "Enter")){ e.preventDefault(); p.click(); var again = wBody.querySelector('[data-part="' + p.dataset.part + '"]'); if (again) again.focus(); }
  });
  wNext.addEventListener("click", function(){ hold(); if (wiz.step === 3){ wizGo(0); return; } if (wiz.step === 0) resetPicked(); wizGo(wiz.step + 1); });
  wBack.addEventListener("click", function(){ hold(); wizGo(Math.max(0, wiz.step - 1)); });

  // Self-running tour of the General setup, while nobody is clicking
  function wizStart(){
    if (wiz.timer) return;
    resetPicked(); wizDraw();
    // The plugins Choose parts lists are the marketplace's General ones, as in the real setup
    pluginList().then(function(d){
      var list = (d.plugins || []).filter(function(p){ return p.category === "general"; });
      if (!list.length) return;
      PARTS.general = list.map(function(p){ return {n:p.name, v:p.version, img:p.icon}; });
      if (wiz.step <= 1){ resetPicked(); wizDraw(); }
    }).catch(function(){});
    if (reduce) return;
    var beat = 0;
    wiz.timer = setInterval(function(){
      if (dl.hidden || document.hidden || Date.now() < wiz.paused || wiz.step === 2) return;
      beat++;
      if (wiz.step === 0){
        if (beat % 2 === 0) wizGo(1);
      } else if (wiz.step === 1){ wizGo(2); }
      else if (wiz.step === 3 && beat % 2 === 0){ wizGo(0); }
    }, 2400);
  }


