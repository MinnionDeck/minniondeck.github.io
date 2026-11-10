  /* Edit button teaser: a small working copy of the app's editor. Look on the left, What it does on the right */
  var ED_ICONS = ["mic", "cross", "play", "broadcast", "camera", "note", "bolt", "folder", "globe", "type", "lock", "hourglass", "gear", "down"];
  var ED_COLS = [["tile", "White"], ["mint", "Mint"], ["sky", "Sky"], ["lilac", "Lilac"], ["peach", "Peach"], ["sun", "Sun"], ["coral", "Coral"]];
  // The app's built-in actions, each with the one box you fill in (if any)
  var ED_ACTS = {
    keys: {n:"Press keys", f:"Keys", ph:"Click here, then press the keys", def:"Win+Shift+S", help:"Click the box, then press the keys together. Backspace clears it."},
    type: {n:"Type text", f:"Text", ph:"What to type", def:"Be right back!"},
    click: {n:"Mouse click", f:"Button", opts:["Left", "Right", "Middle"], def:"Left"},
    program: {n:"Open a program", f:"Program", ph:"C:\\Windows\\notepad.exe", def:"notepad.exe"},
    web: {n:"Open a website", f:"Address", ph:"https://", def:"https://minniondeck.github.io"},
    volume: {n:"Change volume", f:"Change", opts:["Up 10%", "Down 10%", "Up 5%", "Down 5%"], def:"Up 10%"},
    mute: {n:"Mute microphone", help:"Nothing to fill in. It has two states: Mic on and Mic muted."},
    wait: {n:"Wait", f:"Milliseconds", ph:"3000", def:"3000"},
    page: {n:"Go to page", f:"Page", opts:["Page 1", "Streaming", "Settings"], def:"Streaming"},
    back: {n:"Back", help:"Nothing to fill in. Goes to the page before."}
  };
  var ED_MAX_STATES = 8, ED_MAX_STEPS = 4;
  var ED, edSaved, edPlayT = 0;
  var $e = function(id){ return document.getElementById(id); };
  function edClone(o){ return JSON.parse(JSON.stringify(o)); }
  function edDefault(){
    return {name:"Mute mic", mode:"single", steps:[{a:"mute", v:""}], show:"both", pos:"below", cur:0,
      states:[{s:"Mic on", t:"", g:"mic", bg:"tile"}, {s:"Mic muted", t:"Mic muted", g:"cross", bg:"coral"}]};
  }
  // What a key on the deck at the top looks like in the editor
  function edFromHero(k){
    var e = {name:k.l, mode:"single", steps:[], show:"both", pos:"below", cur:0, states:[]};
    if (k.act === "mute") return edDefault();
    if (k.act === "record"){
      e.states = REC.map(function(r){ return {s:r.text, t:"Record: " + r.text, g:r.g, bg:r.bg}; });
      e.steps = [{a:"keys", v:"Win+Alt+R"}];
      return e;
    }
    if (k.act === "live"){
      e.states = [{s:"Off", t:"", g:"play", bg:"peach"}, {s:"On air", t:"ON AIR", g:"play", bg:"coral"}];
      e.mode = "sequence";
      e.steps = [{a:"program", v:"obs64.exe"}, {a:"wait", v:"3000"}, {a:"keys", v:"Ctrl+Shift+L"}];
      return e;
    }
    e.states = [{s:"Look", t:"", g:k.g, bg:k.bg}];
    var log = k.log || "", m;
    if ((m = log.match(/^(?:Keys|Clip|Screenshot) · (.+)$/))) e.steps = [{a:"keys", v:m[1]}];
    else if ((m = log.match(/^Typed · (.+)$/)) && m[1] !== "text") e.steps = [{a:"type", v:m[1]}];
    else if (/^Typed/.test(log)) e.steps = [{a:"type", v:"Hello!"}];
    else if ((m = log.match(/^Volume · (up|down) (\d+)%$/))) e.steps = [{a:"volume", v:(m[1] === "up" ? "Up " : "Down ") + m[2] + "%"}];
    else if (/^Opened · website/.test(log)) e.steps = [{a:"web", v:ED_ACTS.web.def}];
    else if ((m = log.match(/^Opened · (.+)$/))) e.steps = [{a:"program", v:m[1]}];
    else if (/^Wait/.test(log)) e.steps = [{a:"wait", v:"3000"}];
    else if (/^Deck/.test(log)) e.steps = [{a:"page", v:"Settings"}];
    else if (/^Media/.test(log)) e.steps = [{a:"keys", v:/next/.test(log) ? "Media Next" : "Media Play/Pause"}];
    else e.steps = [{a:"keys", v:ED_ACTS.keys.def}];
    return e;
  }
  function edProblems(){
    var p = [];
    if (!ED.name.trim()) p.push("Give the button a name.");
    ED.steps.forEach(function(s, i){
      var A = ED_ACTS[s.a], pre = ED.mode === "sequence" ? "Step " + (i + 1) + ": " : "", v = String(s.v || "").trim();
      if (A.f && !A.opts && !v) p.push(pre + A.f + " is empty.");
      else if (s.a === "web" && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v)) p.push(pre + "Address must start with http:// or https://.");
      else if (s.a === "wait" && (!/^\d+$/.test(v) || +v > 60000)) p.push(pre + "Milliseconds must be between 0 and 60000.");
    });
    return p;
  }
  function edSeg(box, opts, val, fn){
    box.innerHTML = opts.map(function(o){ return '<button type="button" class="edt-b' + (o[0] === val ? " on" : "") + '" aria-pressed="' + (o[0] === val) + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join("");
    box.onclick = function(e){ var b = e.target.closest("[data-v]"); if (b){ fn(b.dataset.v); edDraw(); edFocus(box, b.dataset.v); } };
  }
  function edFocus(box, v){ var b = box.querySelector('[data-v="' + v + '"]'); if (b) b.focus(); }
  function edKey(){
    var st = ED.states[ED.cur], k = $e("edt-key"), txt = st.t || ED.name || "";
    k.style.background = COL[st.bg];
    k.className = "edt-key" + (ED.pos === "above" ? " up" : "");
    k.innerHTML = (ED.show !== "text" ? glyphSvg(st.g) : "") + (ED.show !== "icon" ? '<span class="lbl"></span>' : "");
    var l = k.querySelector(".lbl"); if (l) l.textContent = txt;
  }
  function edDraw(){
    var st = ED.states[ED.cur], n = ED.states.length;
    $e("edt-head").textContent = "Edit button · " + (ED.name.trim() || "New button");
    edKey();
    var chips = ED.states.map(function(s, i){ return '<button type="button" class="edt-b' + (i === ED.cur ? " on" : "") + '" aria-pressed="' + (i === ED.cur) + '" data-st="' + i + '">' + (s.s || "Look " + (i + 1)) + '</button>'; }).join("");
    $e("edt-states").innerHTML = chips + '<button type="button" class="edt-b" data-st="add"' + (n >= ED_MAX_STATES ? " disabled" : "") + '>+ Add look</button>' + (n > 1 ? '<button type="button" class="edt-b" data-st="del">Remove this look</button>' : "");
    $e("edt-st-help").textContent = n === 1 ? "One look. Add a look to make the button change each time you press it."
      : "Each press shows the next look: " + ED.states.map(function(s){ return s.s; }).join(" → ") + ", then back to " + ED.states[0].s + ". The app allows up to 8.";
    $e("edt-play").disabled = n < 2;
    if (document.activeElement !== $e("edt-text")) $e("edt-text").value = st.t;
    if (document.activeElement !== $e("edt-name")) $e("edt-name").value = ED.name;
    $e("edt-icons").innerHTML = ED_ICONS.map(function(g){ return '<button type="button" data-g="' + g + '" aria-pressed="' + (g === st.g) + '" aria-label="' + g + ' icon">' + glyphSvg(g) + '</button>'; }).join("");
    $e("edt-cols").innerHTML = ED_COLS.map(function(c){ return '<button type="button" class="edt-sw" data-c="' + c[0] + '" aria-pressed="' + (c[0] === st.bg) + '" aria-label="' + c[1] + '" title="' + c[1] + '" style="background:' + COL[c[0]] + '"></button>'; }).join("");
    edSeg($e("edt-show"), [["both", "Icon and name"], ["icon", "Icon only"], ["text", "Text only"]], ED.show, function(v){ ED.show = v; });
    edSeg($e("edt-pos"), [["below", "Below icon"], ["above", "Above icon"]], ED.pos, function(v){ ED.pos = v; });
    edSeg($e("edt-runs"), [["single", "One action"], ["sequence", "A sequence"]], ED.mode, function(v){ if (v === "single" && ED.steps.length > 1) return; ED.mode = v; });
    $e("edt-runs").querySelector('[data-v="single"]').disabled = ED.mode === "sequence" && ED.steps.length > 1;
    $e("edt-runs-help").textContent = ED.mode === "sequence" ? (ED.steps.length > 1 ? "Steps run in order, top to bottom. Remove steps until one is left to switch back to one action." : "Steps run in order, top to bottom.") : "";
    edSteps();
    edStatus();
  }
  function edSteps(){
    var seq = ED.mode === "sequence", box = $e("edt-steps");
    box.innerHTML = ED.steps.map(function(s, i){
      var A = ED_ACTS[s.a], id = "edt-s" + i;
      var opts = Object.keys(ED_ACTS).map(function(k){ return '<option value="' + k + '"' + (k === s.a ? " selected" : "") + '>' + ED_ACTS[k].n + '</option>'; }).join("");
      var field = !A.f ? "" : A.opts
        ? '<label class="edt-cap" for="' + id + 'v">' + A.f + '</label><select id="' + id + 'v" data-i="' + i + '" data-k="v">' + A.opts.map(function(o){ return '<option' + (o === s.v ? " selected" : "") + '>' + o + '</option>'; }).join("") + '</select>'
        : '<label class="edt-cap" for="' + id + 'v">' + A.f + '</label><input id="' + id + 'v" data-i="' + i + '" data-k="v" autocomplete="off" placeholder="' + A.ph + '"' + (s.a === "keys" ? ' readonly data-keys="1"' : "") + '>';
      return '<div class="' + (seq ? "edt-step" : "") + '">' + (seq ? "<b>" + (i + 1) + "</b>" : "") +
        '<div class="edt-f"><label class="edt-cap" for="' + id + '">Action</label><select id="' + id + '" data-i="' + i + '" data-k="a">' + opts + '</select>' + field +
        (A.help ? '<span class="edt-help">' + A.help + '</span>' : "") + '</div>' +
        (seq && ED.steps.length > 1 ? '<button type="button" class="edt-b" data-del="' + i + '" aria-label="Remove step ' + (i + 1) + '">✕</button>' : "") + '</div>';
    }).join("") + (seq ? '<div class="edt-row" style="margin-top:10px"><button type="button" class="edt-b" data-addstep="1"' + (ED.steps.length >= ED_MAX_STEPS ? " disabled" : "") + '>+ Add step</button></div>' : "");
    // Values go in after the markup, so names and text with quotes stay as typed
    box.querySelectorAll('input[data-k="v"]').forEach(function(inp){ inp.value = ED.steps[+inp.dataset.i].v; });
  }
  function edStatus(){
    var p = edProblems(), s = $e("edt-status"), changed = JSON.stringify(ED) !== JSON.stringify(edSaved);
    s.className = "";
    if (p.length){ s.className = "bad"; s.textContent = (p.length === 1 ? "1 thing to fix: " : p.length + " things to fix: ") + p.join(" "); }
    else s.textContent = changed ? "Changes not saved yet." : "Nothing changed yet.";
    $e("edt-save").disabled = !!p.length;
    $e("edt-undo").disabled = !changed;
  }
  function edPress(){
    var k = $e("edt-key");
    k.classList.remove("hit"); void k.offsetWidth; k.classList.add("hit");
    if (ED.states.length > 1){ ED.cur = (ED.cur + 1) % ED.states.length; edDraw(); $e("edt-key").classList.add("hit"); }
  }
  function edLoad(e){ clearInterval(edPlayT); ED = e; edSaved = edClone(e); edDraw(); }

  $e("edt-key").addEventListener("click", function(){ edPress(); $e("edt-key").focus(); });
  $e("edt-press").addEventListener("click", function(){ var k = $e("edt-key"); k.classList.remove("hit"); void k.offsetWidth; k.classList.add("hit"); });
  $e("edt-play").addEventListener("click", function(){
    clearInterval(edPlayT);
    var left = ED.states.length;
    edPlayT = setInterval(function(){ edPress(); if (--left <= 0) clearInterval(edPlayT); }, reduce ? 300 : 700);
  });
  $e("edt-states").addEventListener("click", function(e){
    var b = e.target.closest("[data-st]"); if (!b || b.disabled) return;
    var v = b.dataset.st;
    if (v === "add"){ var c = ED.states[ED.cur]; ED.states.push({s:"State " + (ED.states.length + 1), t:"", g:c.g, bg:c.bg}); ED.cur = ED.states.length - 1; }
    else if (v === "del"){ ED.states.splice(ED.cur, 1); ED.cur = Math.max(0, ED.cur - 1); }
    else ED.cur = +v;
    edDraw();
    var again = $e("edt-states").querySelector('[data-st="' + (v === "add" || v === "del" ? ED.cur : v) + '"]'); if (again) again.focus();
  });
  $e("edt-icons").addEventListener("click", function(e){ var b = e.target.closest("[data-g]"); if (!b) return; ED.states[ED.cur].g = b.dataset.g; edDraw(); $e("edt-icons").querySelector('[data-g="' + b.dataset.g + '"]').focus(); });
  $e("edt-cols").addEventListener("click", function(e){ var b = e.target.closest("[data-c]"); if (!b) return; ED.states[ED.cur].bg = b.dataset.c; edDraw(); $e("edt-cols").querySelector('[data-c="' + b.dataset.c + '"]').focus(); });
  $e("edt-text").addEventListener("input", function(){ ED.states[ED.cur].t = this.value; edKey(); edStatus(); });
  $e("edt-name").addEventListener("input", function(){ ED.name = this.value; this.classList.toggle("bad", !this.value.trim()); $e("edt-head").textContent = "Edit button · " + (ED.name.trim() || "New button"); edKey(); edStatus(); });
  var steps = $e("edt-steps");
  steps.addEventListener("change", function(e){
    var t = e.target, i = +t.dataset.i; if (isNaN(i)) return;
    if (t.dataset.k === "a"){ ED.steps[i] = {a:t.value, v:ED_ACTS[t.value].def || ""}; edDraw(); $e("edt-s" + i).focus(); }
    else { ED.steps[i].v = t.value; edStatus(); }
  });
  steps.addEventListener("input", function(e){ var t = e.target; if (t.dataset.k === "v" && !t.dataset.keys){ ED.steps[+t.dataset.i].v = t.value; edStatus(); } });
  // The Keys box records the keys you press together, like the app's
  steps.addEventListener("keydown", function(e){
    var t = e.target; if (!t.dataset.keys || e.key === "Tab") return;
    e.preventDefault();
    if (e.key === "Backspace" || e.key === "Delete"){ t.value = ""; }
    else if (["Control", "Shift", "Alt", "Meta"].indexOf(e.key) < 0){
      var name = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      t.value = (e.ctrlKey ? "Ctrl+" : "") + (e.metaKey ? "Win+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "") + name;
    }
    ED.steps[+t.dataset.i].v = t.value; edStatus();
  });
  steps.addEventListener("click", function(e){
    var d = e.target.closest("[data-del]"), a = e.target.closest("[data-addstep]");
    if (d){ ED.steps.splice(+d.dataset.del, 1); edDraw(); var nb = steps.querySelector("[data-addstep]"); if (nb) nb.focus(); }
    else if (a && !a.disabled){ ED.steps.push({a:"wait", v:"1000"}); edDraw(); $e("edt-s" + (ED.steps.length - 1)).focus(); }
  });
  $e("edt-undo").addEventListener("click", function(){ ED = edClone(edSaved); $e("edt-name").classList.remove("bad"); edDraw(); $e("edt-status").textContent = "Changes undone."; });
  $e("edt-save").addEventListener("click", function(){
    if (edProblems().length) return;
    edSaved = edClone(ED); edDraw();
    var s = $e("edt-status"); s.className = "ok"; s.textContent = "Saved. In the app, the button is now on your PC and your phone at once.";
    var w = $e("edt"); w.classList.remove("flash"); void w.offsetWidth; w.classList.add("flash");
  });
  // Double-click a key on the deck to edit it, as in the app
  deck.addEventListener("dblclick", function(e){
    var b = e.target.closest(".key");
    if (!b || !KEYMAP[b.dataset.l]) return;
    state.sel = b.dataset.l;
    $e("aw-edit").click();
  });
  // The deck's Edit button opens the picked key here
  $e("aw-edit").addEventListener("click", function(){
    pausedUntil = Date.now() + 60000;
    var k = KEYMAP[state.sel] || KEYMAP["Mute mic"];
    edLoad(edFromHero(k));
    var sec = $e("try-editor");
    sec.classList.remove("pre"); sec.classList.add("in");
    sec.scrollIntoView({behavior: reduce ? "auto" : "smooth"});
    setTimeout(function(){ $e("edt-name").focus({preventScroll:true}); }, reduce ? 0 : 500);
  });
  edLoad(edDefault());

  var demo = ["Mute mic","Record","Go live","Next track","Volume up","Record","Play or pause","Screenshot","Mute mic","Open notes","Clip last 30s","Go live","Record","Be right back"], oi = 0;
  if (!reduce) setInterval(function(){
    if (home.hidden || document.hidden || Date.now() < pausedUntil) return;
    pressLabel(demo[oi]); oi = (oi + 1) % demo.length;
  }, 2300);

  var topBar = document.querySelector(".top"), menuBtn = document.getElementById("menu-btn");
  function menu(open){
    topBar.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    document.getElementById("menu-label").textContent = open ? "Close" : "Menu";
  }
  menuBtn.addEventListener("click", function(){ menu(!topBar.classList.contains("open")); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && topBar.classList.contains("open")){ menu(false); menuBtn.focus(); } });
  document.addEventListener("click", function(e){ if (topBar.classList.contains("open") && !e.target.closest(".top")) menu(false); });
  if (window.matchMedia) matchMedia("(min-width:1101px)").addEventListener("change", function(m){ if (m.matches) menu(false); });

  document.addEventListener("click", function(e){
    var link = e.target.closest("[data-view]");
    if (link){
      menu(false);
      e.preventDefault();
      var v = link.getAttribute("data-view");
      try { history.pushState(null, "", routeHref(v)); } catch (err) {}
      go(v, link.getAttribute("data-scroll"));
      return;
    }
    var key = e.target.closest(".key");
    if (key){ pausedUntil = Date.now() + 9000; press(key); }
  });

