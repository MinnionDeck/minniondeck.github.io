  /* ===== GIF and image makers =====
     Both draw pixel art with the same editor; the GIF maker adds frames, a timeline and starter
     animations. Work is kept in this browser (localStorage) and leaves as a .gif or .png file, which
     Minniondeck takes with Import in the Edit button window, or straight to the app with Sync
     (15-sync.js) when the page was opened from MinnionDeck. */

  // Save and load, never failing: private windows and full storage just stop keeping things
  var STORE = {
    get: function(k, d){ try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  function download(blob, name){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
  }
  function fileName(s, ext){ return (String(s || "minniondeck").trim().replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 40) || "minniondeck") + ext; }
  var uid = function(p){ return p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); };

  // GIF89a encoder: one shared colour table (index 0 is see-through), LZW as in the spec,
  // "restore to background" between frames so see-through parts don't keep the last frame.
  // delays: optional milliseconds for each frame; without one a frame lasts 1/fps.
  function encodeGif(frames, size, scale, fps, delays){
    var cols = [], idx = {};
    frames.forEach(function(f){ f.forEach(function(c){ if (c && !(c in idx) && cols.length < 255){ idx[c] = cols.length + 1; cols.push(c); } }); });
    var n = cols.length + 1, bits = 1;
    while ((1 << bits) < n) bits++;
    var P = 1 << bits, W = size * scale, H = size * scale, out = [];
    var b = function(v){ out.push(v & 255); }, w16 = function(v){ b(v); b(v >> 8); }, str = function(s){ for (var i = 0; i < s.length; i++) b(s.charCodeAt(i)); };
    str("GIF89a"); w16(W); w16(H); b(0x80 | ((bits - 1) << 4) | (bits - 1)); b(0); b(0);
    for (var i = 0; i < P; i++){
      var hex = i === 0 || i > cols.length ? "#000000" : cols[i - 1];
      b(parseInt(hex.slice(1, 3), 16)); b(parseInt(hex.slice(3, 5), 16)); b(parseInt(hex.slice(5, 7), 16));
    }
    b(0x21); b(0xFF); b(11); str("NETSCAPE2.0"); b(3); b(1); w16(0); b(0);
    var base = Math.max(2, Math.round(100 / Math.min(50, Math.max(1, fps))));
    var minCode = Math.max(2, bits);
    frames.forEach(function(f, fi){
      var ms = delays && delays[fi];
      b(0x21); b(0xF9); b(4); b((2 << 2) | 1); w16(ms ? Math.max(2, Math.round(ms / 10)) : base); b(0); b(0);
      b(0x2C); w16(0); w16(0); w16(W); w16(H); b(0);
      var px = new Array(W * H);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++){ var c = f[Math.floor(y / scale) * size + Math.floor(x / scale)]; px[y * W + x] = c ? idx[c] || 0 : 0; }
      var data = lzw(minCode, px);
      b(minCode);
      for (var o = 0; o < data.length; o += 255){ var len = Math.min(255, data.length - o); b(len); for (var k = 0; k < len; k++) out.push(data[o + k]); }
      b(0);
    });
    b(0x3B);
    return new Uint8Array(out);
  }
  function lzw(minCode, px){
    var clear = 1 << minCode, eoi = clear + 1, size = minCode + 1, next = eoi + 1, table = new Map();
    var bytes = [], cur = 0, nb = 0;
    var emit = function(code){ cur |= code << nb; nb += size; while (nb >= 8){ bytes.push(cur & 255); cur >>>= 8; nb -= 8; } };
    emit(clear);
    var prefix = px[0];
    for (var i = 1; i < px.length; i++){
      var k = px[i], key = prefix * 256 + k, got = table.get(key);
      if (got !== undefined){ prefix = got; continue; }
      emit(prefix);
      if (next === 4096){ emit(clear); table = new Map(); next = eoi + 1; size = minCode + 1; }
      else { if (next >= (1 << size)) size++; table.set(key, next++); }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nb > 0) bytes.push(cur & 255);
    return bytes;
  }

  var PAL = ["#1e2433","#ffffff","#5fd0a8","#7cc4ff","#b79cff","#ffb38a","#ff5a5f","#ffc93c","#56627d","#c6d3e2","#3aa585","#4c97d6","#8a6fe0","#e08a5c","#c93c41","#000000"];
  var TOOL_ICONS = {
    pencil: ["......##",".....###","....###.","...###..","..###...",".###....","##......","#......."],
    eraser: ["........","....###.","...#####","..######",".######.","#..###..","##..#...","###....."],
    fill:   ["...#....","..###...",".#####..","#######.",".#####.#","..###..#","...#...#","........"],
    picker: [".....##.","....####","...####.","..#.##..",".#.#....","#.#.....","##......","#......."],
    line:   [".......#","......#.",".....#..","....#...","...#....","..#.....",".#......","#......."],
    rect:   ["########","#......#","#......#","#......#","#......#","#......#","#......#","########"],
    circle: ["..####..",".#....#.","#......#","#......#","#......#","#......#",".#....#.","..####.."],
    move:   ["...##...","..####..","...##...","#..##..#","########","#..##..#","...##...","..####.."],
    text:   ["########","########","...##...","...##...","...##...","...##...","...##...","..####.."]
  };
  var TOOLS = [["pencil","Pencil","B"],["eraser","Eraser","E"],["fill","Fill","F"],["picker","Pick","I"],["line","Line","L"],["rect","Box","R"],["circle","Circle","C"],["move","Move","M"],["text","Text","T"]];

  // A 3 × 5 pixel font for the Text tool and the starter animations
  var FONT = (function(){
    var src = {
      A:"010101111101101", B:"110101110101110", C:"011100100100011", D:"110101101101110", E:"111100110100111", F:"111100110100100",
      G:"011100101101011", H:"101101111101101", I:"111010010010111", J:"001001001101010", K:"101101110101101", L:"100100100100111",
      M:"101111111101101", N:"110101101101101", O:"010101101101010", P:"110101110100100", Q:"010101101110011", R:"110101110101101",
      S:"011100010001110", T:"111010010010010", U:"101101101101111", V:"101101101101010", W:"101101111111101", X:"101101010101101",
      Y:"101101010010010", Z:"111001010100111", "0":"111101101101111", "1":"010110010010111", "2":"110001010100111", "3":"110001010001110",
      "4":"101101111001001", "5":"111100110001110", "6":"011100111101111", "7":"111001010010010", "8":"111101111101111", "9":"111101111001110",
      " ":"000000000000000", "!":"010010010000010", "?":"110001010000010", ".":"000000000000010", ":":"000010000010000", "-":"000000111000000",
      "+":"000010111010000", "%":"101001010100101", "/":"001001010100100", "#":"101111101111101"
    };
    var out = {}; for (var k in src) out[k] = src[k].split("").map(Number); return out;
  })();
  // Drawing helpers on a plain s × s array of colours (null = see-through)
  var PX = {
    set: function(f, s, x, y, c){ if (x >= 0 && y >= 0 && x < s && y < s) f[y * s + x] = c; },
    rect: function(f, s, x0, y0, x1, y1, c, filled){
      var ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
      for (var y = ay; y <= by; y++) for (var x = ax; x <= bx; x++) if (filled || x === ax || x === bx || y === ay || y === by) PX.set(f, s, x, y, c);
    },
    ellipse: function(f, s, x0, y0, x1, y1, c, filled){
      var ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
      var cx = (ax + bx) / 2, cy = (ay + by) / 2, rx = (bx - ax) / 2 + .5, ry = (by - ay) / 2 + .5;
      var inside = function(x, y){ var dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };
      for (var y = ay; y <= by; y++) for (var x = ax; x <= bx; x++){
        if (!inside(x, y)) continue;
        if (filled || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) PX.set(f, s, x, y, c);
      }
    },
    text: function(f, s, str, x0, y0, c){
      var x = x0;
      String(str).toUpperCase().split("").forEach(function(ch){
        var g = FONT[ch] || FONT["?"];
        for (var i = 0; i < 15; i++) if (g[i]) PX.set(f, s, x + i % 3, y0 + Math.floor(i / 3), c);
        x += 4;
      });
    },
    textWidth: function(str){ return Math.max(0, String(str).length * 4 - 1); }
  };

  // Starter animations, drawn for any canvas size
  var STARTERS = [
    { id: "pulse", name: "Pulse", fps: 8, make: function(s){ var out = []; [.28, .34, .4, .44, .4, .34].forEach(function(r){ var f = new Array(s * s).fill(null), m = (s - 1) / 2, k = Math.round(r * s); PX.ellipse(f, s, Math.round(m - k), Math.round(m - k), Math.round(m + k), Math.round(m + k), "#5fd0a8", true); out.push(f); }); return out; } },
    { id: "spin", name: "Loading spin", fps: 10, make: function(s){ var out = [], m = (s - 1) / 2, R = s * .34, d = Math.max(1, Math.round(s / 12));
      for (var t = 0; t < 8; t++){ var f = new Array(s * s).fill(null);
        for (var i = 0; i < 8; i++){ var a = i / 8 * Math.PI * 2, x = Math.round(m + Math.cos(a) * R), y = Math.round(m + Math.sin(a) * R), on = (i + 8 - t) % 8;
          PX.rect(f, s, x - d, y - d, x + d, y + d, on === 0 ? "#ffffff" : on < 3 ? "#7cc4ff" : "#56627d", true); }
        out.push(f); }
      return out; } },
    { id: "bar", name: "Loading bar", fps: 8, make: function(s){ var out = [], y0 = Math.round(s * .42), y1 = Math.round(s * .58), x0 = Math.round(s * .12), x1 = s - 1 - x0;
      for (var t = 0; t <= 8; t++){ var f = new Array(s * s).fill(null); PX.rect(f, s, x0, y0, x1, y1, "#c6d3e2", false);
        var w = Math.round((x1 - x0 - 2) * t / 8); if (w > 0) PX.rect(f, s, x0 + 1, y0 + 1, x0 + w, y1 - 1, "#5fd0a8", true); out.push(f); }
      return out; } },
    { id: "rec", name: "Recording", fps: 2, make: function(s){ var out = [];
      // "REC" beside the dot when there's room for it, otherwise the dot alone
      var words = s >= 24;
      [true, false].forEach(function(on){ var f = new Array(s * s).fill(null), r = Math.max(2, Math.round(s * (words ? .14 : .28))), cx = words ? Math.round(s * .26) : Math.round((s - 1) / 2), cy = Math.round((s - 1) / 2);
        if (on) PX.ellipse(f, s, cx - r, cy - r, cx + r, cy + r, "#ff5a5f", true);
        else PX.ellipse(f, s, cx - r, cy - r, cx + r, cy + r, "#56627d", false);
        if (words) PX.text(f, s, "REC", cx + r + 3, cy - 2, "#ffffff"); out.push(f); });
      return out; } },
    { id: "blink", name: "Blink", fps: 6, make: function(s){ var out = [], ey = Math.round(s * .42), w = Math.max(2, Math.round(s * .12)), h = Math.max(3, Math.round(s * .22)), lx = Math.round(s * .3), rx = Math.round(s * .58);
      [1, 1, 1, 1, .5, 0, .5].forEach(function(o){ var f = new Array(s * s).fill(null), hh = Math.max(0, Math.round(h * o));
        [lx, rx].forEach(function(x){ if (hh > 0) PX.rect(f, s, x, ey + Math.round((h - hh) / 2), x + w, ey + Math.round((h - hh) / 2) + hh, "#1e2433", true); else PX.rect(f, s, x, ey + Math.round(h / 2), x + w, ey + Math.round(h / 2), "#1e2433", true); });
        PX.rect(f, s, Math.round(s * .38), Math.round(s * .74), Math.round(s * .62), Math.round(s * .76), "#1e2433", true);
        for (var i = 0; i < f.length; i++) if (!f[i]) f[i] = "#ffc93c";
        out.push(f); });
      return out; } },
    { id: "ping", name: "Ping", fps: 10, make: function(s){ var out = [], m = (s - 1) / 2;
      [.1, .18, .26, .34, .42, .48].forEach(function(r, i){ var f = new Array(s * s).fill(null), k = Math.round(r * s), d = Math.round(s * .1);
        PX.ellipse(f, s, Math.round(m - k), Math.round(m - k), Math.round(m + k), Math.round(m + k), i < 4 ? "#7cc4ff" : "#4c97d6", false);
        PX.ellipse(f, s, Math.round(m - d), Math.round(m - d), Math.round(m + d), Math.round(m + d), "#ff5a5f", true); out.push(f); });
      return out; } },
    { id: "heart", name: "Heartbeat", fps: 6, make: function(s){ var H = ["01100110","11111111","11111111","11111111","01111110","00111100","00011000","00000000"], out = [];
      [.62, .74, .62, .62].forEach(function(k){ var f = new Array(s * s).fill(null), size = Math.round(s * k), o = Math.round((s - size) / 2);
        for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (H[Math.floor(y / size * 8)][Math.floor(x / size * 8)] === "1") PX.set(f, s, o + x, o + y, "#ff5a5f");
        out.push(f); });
      return out; } }
  ];

  // The pixel editor. cfg: { root, key, frames (GIF maker), noun, sizes, size }
  function PixelEditor(cfg){
    var root = cfg.root, anim = !!cfg.frames;
    var lib = STORE.get(cfg.key, []), cur = null, frame = 0, tool = "pencil", colour = "#1e2433";
    var mirror = false, onion = anim, filled = false, zoom = 1, undo = [], redo = [], playing = null, drawing = false, last = null, start = null, base = null;
    var saveT = 0;
    root.innerHTML =
      '<div class="mkr mkr-px' + (anim ? " mkr-gif" : "") + '">' +
      '<div class="mp frame">' +
        '<div class="grp"><h3>Tools</h3><div class="tools" role="group" aria-label="Tools">' +
          TOOLS.map(function(t){ return '<button type="button" class="tl" data-tool="' + t[0] + '" title="' + t[1] + ' (' + t[2] + ')" aria-pressed="false">' + rowsSvg(TOOL_ICONS[t[0]]) + t[1] + '</button>'; }).join("") +
        '</div></div>' +
        '<label class="chk" data-k="fillw"><input type="checkbox" data-k="filled"> Filled shapes</label>' +
        '<label class="fld" data-k="textw" hidden>Text to stamp<input type="text" data-k="stamp" maxlength="12" value="HI"></label>' +
        '<label class="chk"><input type="checkbox" data-k="mirror"> Mirror drawing</label>' +
        (anim ? '<label class="chk"><input type="checkbox" data-k="onion" checked> Onion skin</label>' : "") +
        '<div class="grp"><h3>Frame</h3><div class="bar2 tight-btns"><button type="button" class="btn plain" data-a="flipH" title="Flip left to right">⇋ Flip</button><button type="button" class="btn plain" data-a="flipV" title="Flip upside down">⇵ Flip</button><button type="button" class="btn plain" data-a="rot" title="Turn a quarter to the right">↻ Turn</button></div></div>' +
        '<div class="grp"><h3>Colour</h3><div class="sw" data-k="sw"></div><label class="crow"><input type="color" data-k="col" value="#1e2433" aria-label="Any colour"> Any colour</label></div>' +
        '<label class="fld">Size<select data-k="size">' + cfg.sizes.map(function(s){ return '<option value="' + s + '">' + s + ' × ' + s + ' pixels</option>'; }).join("") + '</select></label>' +
      '</div>' +
      '<div class="stage2">' +
        '<div class="bar2"><label class="fld grow" style="flex-direction:row;align-items:center;gap:8px">Name<input type="text" data-k="name" maxlength="24" style="flex:1"></label>' +
        '<button type="button" class="btn plain" data-a="undo" title="Undo (Ctrl+Z)">Undo</button><button type="button" class="btn plain" data-a="redo" title="Redo (Ctrl+Y)">Redo</button><button type="button" class="btn plain" data-a="clear">Clear</button></div>' +
        '<div class="cvwrap" data-k="wrap"><canvas data-k="cv" width="512" height="512" aria-label="Drawing area" tabindex="0"></canvas></div>' +
        '<div class="bar2 zoom" role="group" aria-label="Zoom"><span class="zl">Zoom</span>' + [[1,"Fit"],[1.5,"150%"],[2,"200%"],[3,"300%"]].map(function(z){ return '<button type="button" class="mini" data-zoom="' + z[0] + '" aria-pressed="' + (z[0] === 1) + '">' + z[1] + '</button>'; }).join("") + '<span class="grow"></span><span class="zl" data-k="cursor"></span></div>' +
        (anim ? '<div class="timeline frame"><div class="bar2"><b class="tl-h">Timeline</b><button type="button" class="btn plain" data-a="add">+ Frame</button><button type="button" class="btn plain" data-a="dup">Copy frame</button><button type="button" class="btn plain" data-a="del">Delete frame</button><button type="button" class="btn plain" data-a="left" aria-label="Move frame left">◀</button><button type="button" class="btn plain" data-a="right" aria-label="Move frame right">▶</button></div>' +
          '<div class="frames" data-k="frames" role="group" aria-label="Frames"></div>' +
          '<label class="fld ftime">This frame shows for<span class="bar2"><input type="number" min="20" max="5000" step="10" data-k="ms" placeholder="speed"> ms</span><small>Leave empty to use the speed for every frame.</small></label></div>' : "") +
      '</div>' +
      '<div class="mp frame side-r">' +
        '<div class="grp"><h3>On the deck</h3><div class="key-prev"><div class="kp-key"><canvas data-k="pv" width="64" height="64"></canvas></div><span class="kp-name" data-k="pvname"></span></div>' +
          (anim ? '<button type="button" class="btn plain" data-a="play" style="font-size:15px;padding:5px 12px">▶ Play</button><label class="fld"><span>Speed: <b data-k="fpsv"></b> frames a second</span><input type="range" min="1" max="24" data-k="fps"></label>' : "") + '</div>' +
        '<div class="grp"><h3>Download</h3><label class="fld">Scale<select data-k="scale"><option value="4">4× bigger</option><option value="8" selected>8× bigger</option><option value="16">16× bigger</option></select></label><button type="button" class="btn mint" data-a="export" style="font-size:16px;padding:7px 14px">Download ' + (anim ? "GIF" : "PNG") + '</button><p class="empty2" data-k="out"></p>' + syncHtml() + '</div>' +
        (anim ? '<div class="grp"><h3>Start from an animation</h3><div class="starters" data-k="starters"></div></div>' : "") +
        '<div class="grp"><h3>Start from a picture</h3><label class="btn plain" style="font-size:15px;padding:5px 12px;cursor:pointer">Choose a picture…<input type="file" accept="image/*" data-k="from" hidden></label></div>' +
        '<div class="grp"><h3>Saved in this browser</h3><button type="button" class="btn plain" data-a="new" style="font-size:15px;padding:5px 12px">+ New ' + cfg.noun + '</button><div class="lib" data-k="lib"></div></div>' +
      '</div></div>';
    var q = function(k){ return root.querySelector('[data-k="' + k + '"]'); };
    var cv = q("cv"), g = cv.getContext("2d");

    function blank(s){ return new Array(s * s).fill(null); }
    function make(name, size){ return { id: uid(cfg.frames ? "g" : "p"), name: name, size: size, frames: anim ? [blank(size), blank(size)] : [blank(size)], fps: 8, updated: Date.now() }; }
    function px(){ return cur.frames[frame]; }
    // Each frame can have its own time (ms); the list always matches the frames
    function delays(){ if (!cur.delays || cur.delays.length !== cur.frames.length) cur.delays = cur.frames.map(function(_, i){ return (cur.delays && cur.delays[i]) || 0; }); return cur.delays; }
    function persist(){
      clearTimeout(saveT);
      saveT = setTimeout(function(){
        cur.updated = Date.now();
        if (!STORE.set(cfg.key, lib)) q("out").textContent = "This browser couldn't keep it. Download it before you leave.";
        STORE.set(cfg.key + ":cur", cur.id);
        drawLib();
      }, 250);
    }
    function state(){ return JSON.stringify({ frames: cur.frames, size: cur.size, frame: frame, delays: cur.delays || null }); }
    function snap(){ undo.push(state()); if (undo.length > 60) undo.shift(); redo = []; }
    function restore(from, to){
      if (!from.length) return;
      to.push(state());
      var s = JSON.parse(from.pop());
      cur.frames = s.frames; cur.size = s.size; cur.delays = s.delays || undefined; frame = Math.min(s.frame, cur.frames.length - 1);
      persist(); drawAll();
    }

    function cell(){ return cv.width / cur.size; }
    function draw(){
      var s = cur.size, c = cell();
      g.clearRect(0, 0, cv.width, cv.height);
      if (anim && onion && frame > 0){
        g.globalAlpha = .28;
        cur.frames[frame - 1].forEach(function(col, i){ if (col){ g.fillStyle = col; g.fillRect((i % s) * c, Math.floor(i / s) * c, c, c); } });
        g.globalAlpha = 1;
      }
      px().forEach(function(col, i){ if (col){ g.fillStyle = col; g.fillRect((i % s) * c, Math.floor(i / s) * c, c, c); } });
      g.strokeStyle = "rgba(30,36,51,.12)"; g.lineWidth = 1;
      g.beginPath();
      for (var i = 1; i < s; i++){ var p = Math.round(i * c) + .5; g.moveTo(p, 0); g.lineTo(p, cv.height); g.moveTo(0, p); g.lineTo(cv.width, p); }
      g.stroke();
      if (mirror){ g.strokeStyle = "rgba(76,151,214,.6)"; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(cv.width / 2 + .5, 0); g.lineTo(cv.width / 2 + .5, cv.height); g.stroke(); g.setLineDash([]); }
    }
    function paintFrame(canvas, f, s){
      var x = canvas.getContext("2d");
      canvas.width = s; canvas.height = s;
      x.clearRect(0, 0, s, s);
      f.forEach(function(col, i){ if (col){ x.fillStyle = col; x.fillRect(i % s, Math.floor(i / s), 1, 1); } });
    }
    function drawFrames(){
      if (!anim) return;
      var box = q("frames"), dl = delays();
      box.innerHTML = "";
      cur.frames.forEach(function(f, i){
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-label", "Frame " + (i + 1)); b.setAttribute("aria-current", String(i === frame));
        var c = document.createElement("canvas"); paintFrame(c, f, cur.size);
        b.appendChild(c);
        var n = document.createElement("small"); n.textContent = i + 1; b.appendChild(n);
        if (dl[i]){ var t = document.createElement("em"); t.textContent = dl[i] + "ms"; b.appendChild(t); }
        b.addEventListener("click", function(){ stop(); frame = i; drawAll(); });
        box.appendChild(b);
      });
      var cur0 = box.querySelector('[aria-current="true"]'); if (cur0 && cur0.scrollIntoView) cur0.scrollIntoView({ block: "nearest", inline: "nearest" });
      q("ms").value = dl[frame] || "";
    }
    function drawLib(){
      var box = q("lib");
      box.innerHTML = "";
      lib.slice().sort(function(a, b){ return b.updated - a.updated; }).forEach(function(it){
        var row = document.createElement("div");
        row.className = "it"; row.setAttribute("aria-current", String(it.id === cur.id));
        var c = document.createElement("canvas"); paintFrame(c, it.frames[0], it.size);
        var nm = document.createElement("button"); nm.type = "button"; nm.className = "nm"; nm.textContent = it.name || "Untitled";
        nm.addEventListener("click", function(){ open(it); });
        var del = document.createElement("button"); del.type = "button"; del.className = "mini"; del.textContent = "Delete";
        del.setAttribute("aria-label", "Delete " + (it.name || "Untitled"));
        del.addEventListener("click", function(){
          if (!confirm("Delete " + (it.name || "this") + " from this browser?")) return;
          lib.splice(lib.indexOf(it), 1);
          if (it === cur){ if (!lib.length) lib.push(make("My " + cfg.noun, cfg.size)); open(lib[0]); }
          persist(); drawLib();
        });
        row.append(c, nm, del);
        box.appendChild(row);
      });
    }
    function drawPrev(){
      paintFrame(q("pv"), cur.frames[playing ? playing.i : frame], cur.size);
      q("pvname").textContent = cur.name || "Untitled";
      if (anim) q("fpsv").textContent = cur.fps;
    }
    function drawZoom(){
      cv.style.width = zoom === 1 ? "" : Math.round(512 * zoom) + "px";
      q("wrap").classList.toggle("zoomed", zoom !== 1);
      root.querySelectorAll("[data-zoom]").forEach(function(b){ b.setAttribute("aria-pressed", String(+b.dataset.zoom === zoom)); });
    }
    function drawAll(){
      draw(); drawFrames(); drawPrev(); drawZoom();
      q("name").value = cur.name;
      q("size").value = String(cur.size);
      if (anim) q("fps").value = cur.fps;
      root.querySelectorAll("[data-tool]").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.tool === tool)); });
      root.querySelectorAll(".sw button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.c === colour)); });
      q("col").value = colour;
      q("fillw").hidden = tool !== "rect" && tool !== "circle";
      q("textw").hidden = tool !== "text";
    }
    function open(it){ stop(); cur = it; frame = 0; undo = []; redo = []; q("out").textContent = ""; drawAll(); drawLib(); STORE.set(cfg.key + ":cur", it.id); }

    // Drawing
    function at(e){
      var r = cv.getBoundingClientRect(), s = cur.size;
      var x = Math.floor((e.clientX - r.left) / r.width * s), y = Math.floor((e.clientY - r.top) / r.height * s);
      return x < 0 || y < 0 || x >= s || y >= s ? null : [x, y];
    }
    function setPx(x, y, v){ var s = cur.size; px()[y * s + x] = v; if (mirror) px()[y * s + (s - 1 - x)] = v; }
    function fill(x, y, v){
      var s = cur.size, f = px(), from = f[y * s + x];
      if (from === v) return;
      var st = [[x, y]];
      while (st.length){
        var p = st.pop(), i = p[1] * s + p[0];
        if (p[0] < 0 || p[1] < 0 || p[0] >= s || p[1] >= s || f[i] !== from) continue;
        f[i] = v;
        st.push([p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]);
      }
    }
    function line(a, b2, v){
      var x0 = a[0], y0 = a[1], x1 = b2[0], y1 = b2[1], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
      for (;;){ setPx(x0, y0, v); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy){ err += dy; x0 += sx; } if (e2 <= dx){ err += dx; y0 += sy; } }
    }
    // Shapes and moving start again from the frame as it was when the press began, so the drag is live
    function shape(p){
      var s = cur.size;
      cur.frames[frame] = base.slice();
      if (tool === "line") line(start, p, colour);
      else if (tool === "move"){
        var dx = p[0] - start[0], dy = p[1] - start[1], f = blank(s);
        for (var y = 0; y < s; y++) for (var x = 0; x < s; x++){ var nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < s && ny < s) f[ny * s + nx] = base[y * s + x]; }
        cur.frames[frame] = f;
      } else {
        var tmp = blank(s);
        (tool === "rect" ? PX.rect : PX.ellipse)(tmp, s, start[0], start[1], p[0], p[1], colour, filled);
        tmp.forEach(function(c, i){ if (c) setPx(i % s, Math.floor(i / s), c); });
      }
    }
    function apply(p, first){
      if (tool === "picker"){ var c = px()[p[1] * cur.size + p[0]]; if (c){ colour = c; tool = "pencil"; drawAll(); } return; }
      if (tool === "fill"){ if (first){ fill(p[0], p[1], colour); if (mirror) fill(cur.size - 1 - p[0], p[1], colour); } }
      else if (tool === "text"){
        if (first){ var t = q("stamp").value || "HI", tmp = blank(cur.size); PX.text(tmp, cur.size, t, p[0], p[1], colour); tmp.forEach(function(c2, i){ if (c2) setPx(i % cur.size, Math.floor(i / cur.size), c2); }); }
      }
      else if (tool === "line" || tool === "rect" || tool === "circle" || tool === "move") shape(p);
      else { var v = tool === "eraser" ? null : colour; if (last) line(last, p, v); else setPx(p[0], p[1], v); }
      last = p;
      draw();
    }
    cv.addEventListener("pointerdown", function(e){
      var p = at(e); if (!p) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      stop();
      if (tool !== "picker") snap();
      drawing = true; last = null; start = p; base = px().slice();
      apply(p, true);
    });
    cv.addEventListener("pointermove", function(e){
      var p = at(e);
      q("cursor").textContent = p ? p[0] + ", " + p[1] : "";
      if (!drawing || tool === "fill" || tool === "picker" || tool === "text") return;
      if (p) apply(p, false);
    });
    cv.addEventListener("pointerleave", function(){ q("cursor").textContent = ""; });
    var end = function(){ if (!drawing) return; drawing = false; last = null; start = null; base = null; if (tool !== "picker"){ persist(); drawFrames(); drawPrev(); } };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);

    // Controls
    q("sw").innerHTML = PAL.map(function(c){ return '<button type="button" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '" aria-pressed="false"></button>'; }).join("");
    q("sw").addEventListener("click", function(e){ var b = e.target.closest("[data-c]"); if (b){ colour = b.dataset.c; if (tool === "eraser" || tool === "picker") tool = "pencil"; drawAll(); } });
    q("col").addEventListener("input", function(){ colour = q("col").value; if (tool === "eraser" || tool === "picker") tool = "pencil"; drawAll(); });
    root.querySelector(".tools").addEventListener("click", function(e){ var b = e.target.closest("[data-tool]"); if (b){ tool = b.dataset.tool; drawAll(); } });
    root.querySelector('[data-k="mirror"]').addEventListener("change", function(e){ mirror = e.target.checked; draw(); });
    q("filled").addEventListener("change", function(e){ filled = e.target.checked; });
    if (anim) root.querySelector('[data-k="onion"]').addEventListener("change", function(e){ onion = e.target.checked; draw(); });
    q("name").addEventListener("input", function(){ cur.name = q("name").value.slice(0, 24); q("pvname").textContent = cur.name || "Untitled"; persist(); });
    q("size").addEventListener("change", function(){
      var ns = +q("size").value, os = cur.size;
      if (ns === os) return;
      snap();
      cur.frames = cur.frames.map(function(f){ var o = blank(ns); for (var y = 0; y < Math.min(ns, os); y++) for (var x = 0; x < Math.min(ns, os); x++) o[y * ns + x] = f[y * os + x]; return o; });
      cur.size = ns; persist(); drawAll();
    });
    root.addEventListener("click", function(e){ var b = e.target.closest("[data-zoom]"); if (b){ zoom = +b.dataset.zoom; drawZoom(); } });
    if (anim){
      q("fps").addEventListener("input", function(){ cur.fps = +q("fps").value; persist(); drawPrev(); if (playing){ stop(); play(); } });
      q("ms").addEventListener("change", function(){
        var v = Math.round(+q("ms").value), dl = delays();
        snap(); dl[frame] = v >= 20 ? Math.min(5000, v) : 0;
        persist(); drawFrames(); if (playing){ stop(); play(); }
      });
      q("starters").innerHTML = STARTERS.map(function(st){ return '<button type="button" class="st" data-starter="' + st.id + '" title="' + st.name + '"><canvas width="16" height="16"></canvas><span>' + st.name + '</span></button>'; }).join("");
      // Little moving previews of the starters while the page is open
      var stFrames = {}, stTick = 0;
      STARTERS.forEach(function(st){ stFrames[st.id] = st.make(16); });
      var paintStarters = function(){
        root.querySelectorAll("[data-starter]").forEach(function(b){ var fr = stFrames[b.dataset.starter]; paintFrame(b.querySelector("canvas"), fr[stTick % fr.length], 16); });
      };
      paintStarters();
      setInterval(function(){ if (root.offsetParent && !reduce && !document.hidden){ stTick++; paintStarters(); } }, 160);
      q("starters").addEventListener("click", function(e){
        var b = e.target.closest("[data-starter]"); if (!b) return;
        var st = STARTERS.filter(function(x){ return x.id === b.dataset.starter; })[0], s = cur.size;
        var it = make(st.name, s); it.frames = st.make(s); it.fps = st.fps;
        lib.push(it); open(it); persist();
        q("out").textContent = st.name + " is ready to change. Draw over it, then download or sync.";
      });
    }
    function play(){
      if (playing) return;
      var dl = delays();
      playing = { i: frame, t: 0 };
      var tick = function(){ playing.t = setTimeout(function(){ if (!playing) return; playing.i = (playing.i + 1) % cur.frames.length; drawPrev(); tick(); }, dl[playing.i] || 1000 / cur.fps); };
      tick();
      root.querySelector('[data-a="play"]').textContent = "■ Stop";
    }
    function stop(){
      if (!playing) return;
      clearTimeout(playing.t); playing = null;
      var b = root.querySelector('[data-a="play"]'); if (b) b.textContent = "▶ Play";
      drawPrev();
    }
    // Frame changes keep the times list in step with the frames
    function splice(i, del, f){ var dl = delays(); if (f) { cur.frames.splice(i, del, f); dl.splice(i, del, 0); } else { cur.frames.splice(i, del); dl.splice(i, del); } }
    function swap(a, b2){ var dl = delays(), f = cur.frames[a]; cur.frames[a] = cur.frames[b2]; cur.frames[b2] = f; var t = dl[a]; dl[a] = dl[b2]; dl[b2] = t; }
    function transform(fn){ snap(); var s = cur.size, f = px(), o = blank(s); for (var y = 0; y < s; y++) for (var x = 0; x < s; x++){ var t = fn(x, y, s); o[t[1] * s + t[0]] = f[y * s + x]; } cur.frames[frame] = o; persist(); drawAll(); }
    var ACTS = {
      undo: function(){ restore(undo, redo); },
      redo: function(){ restore(redo, undo); },
      clear: function(){ snap(); cur.frames[frame] = blank(cur.size); persist(); drawAll(); },
      add: function(){ snap(); splice(frame + 1, 0, blank(cur.size)); frame++; persist(); drawAll(); },
      dup: function(){ snap(); var t = delays()[frame]; splice(frame + 1, 0, px().slice()); delays()[frame + 1] = t; frame++; persist(); drawAll(); },
      del: function(){ if (cur.frames.length < 2) return; snap(); splice(frame, 1); frame = Math.max(0, frame - 1); persist(); drawAll(); },
      left: function(){ if (frame < 1) return; snap(); swap(frame, frame - 1); frame--; persist(); drawAll(); },
      right: function(){ if (frame >= cur.frames.length - 1) return; snap(); swap(frame, frame + 1); frame++; persist(); drawAll(); },
      flipH: function(){ transform(function(x, y, s){ return [s - 1 - x, y]; }); },
      flipV: function(){ transform(function(x, y, s){ return [x, s - 1 - y]; }); },
      rot: function(){ transform(function(x, y, s){ return [s - 1 - y, x]; }); },
      play: function(){ if (playing) stop(); else play(); },
      "new": function(){ var it = make("My " + cfg.noun, cur ? cur.size : cfg.size); lib.push(it); open(it); persist(); },
      "export": function(){
        var name = fileName(cur.name, anim ? ".gif" : ".png"), out = q("out");
        toBlob(function(bl){ download(bl, name); out.textContent = name + " · " + Math.max(1, Math.round(bl.size / 1024)) + " KB. Import it in a button's " + (anim ? "GIF" : "Image") + " section."; });
      },
      sync: function(){ toBlob(function(bl){ deskSync(bl, root.querySelector("[data-sync-msg]")); }); }
    };
    // The file, at the chosen scale: every frame as a GIF, or this picture as a PNG
    function toBlob(then){
      var scale = +q("scale").value, s = cur.size;
      if (anim){ then(new Blob([encodeGif(cur.frames, s, scale, cur.fps, delays())], { type: "image/gif" })); return; }
      var c = document.createElement("canvas"); c.width = c.height = s * scale;
      var x = c.getContext("2d");
      px().forEach(function(col, i){ if (col){ x.fillStyle = col; x.fillRect((i % s) * scale, Math.floor(i / s) * scale, scale, scale); } });
      c.toBlob(then, "image/png");
    }
    root.addEventListener("click", function(e){ var b = e.target.closest("[data-a]"); if (b && ACTS[b.dataset.a]) ACTS[b.dataset.a](); });
    root.addEventListener("keydown", function(e){
      if (e.target.matches("input[type=text], input[type=number], select, textarea")) return;
      var k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z"){ e.preventDefault(); e.shiftKey ? ACTS.redo() : ACTS.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === "y"){ e.preventDefault(); ACTS.redo(); return; }
      var t = { b: "pencil", e: "eraser", f: "fill", i: "picker", l: "line", r: "rect", c: "circle", m: "move", t: "text" }[k];
      if (t && !e.ctrlKey && !e.metaKey && !e.altKey){ tool = t; drawAll(); }
    });
    // A picture (image, bitmap or video frame) fitted into an s × s grid of colours
    function gridFrom(src, s){
      var c = document.createElement("canvas"); c.width = c.height = s;
      var W = src.displayWidth || src.naturalWidth || src.width, H = src.displayHeight || src.naturalHeight || src.height;
      var x = c.getContext("2d"), k = Math.min(s / W, s / H), w = W * k, h = H * k;
      // pixel art that divides evenly (MinnionDeck's 256 px button faces) stays crisp; photos are smoothed
      if (W % s === 0 && H % s === 0) x.imageSmoothingEnabled = false; else x.imageSmoothingQuality = "high";
      x.drawImage(src, (s - w) / 2, (s - h) / 2, w, h);
      var d = x.getImageData(0, 0, s, s).data, hx = function(v){ return ("0" + v.toString(16)).slice(-2); };
      return blank(s).map(function(_, i){ return d[i * 4 + 3] < 128 ? null : "#" + hx(d[i * 4]) + hx(d[i * 4 + 1]) + hx(d[i * 4 + 2]); });
    }
    function picture(blob, then){
      var img = new Image();
      img.onload = function(){ then(img); URL.revokeObjectURL(img.src); };
      img.onerror = function(){ q("out").textContent = "That picture couldn't be read."; URL.revokeObjectURL(img.src); };
      img.src = URL.createObjectURL(blob);
    }
    q("from").addEventListener("change", function(){
      var f = q("from").files[0]; if (!f) return;
      picture(f, function(img){ snap(); cur.frames[frame] = gridFrom(img, cur.size); persist(); drawAll(); });
      q("from").value = "";
    });
    // MinnionDeck's picture for the button: a new item to start from. A GIF keeps its frames and
    // times where the browser can read them (ImageDecoder), otherwise its first frame.
    function loadImage(blob, name){
      var s = cfg.sizes[cfg.sizes.length - 1];
      var done = function(frames, fps, times){
        var it = make(String(name || "From MinnionDeck").slice(0, 24), s);
        it.frames = frames.length ? frames : [blank(s)]; it.fps = fps || 8;
        if (times && times.some(function(t){ return t; })) it.delays = times;
        lib.push(it); open(it); persist();
        q("out").textContent = "Brought in from MinnionDeck at " + s + " × " + s + " pixels" + (anim ? ", " + it.frames.length + " frame" + (it.frames.length === 1 ? "" : "s") : "") + ".";
      };
      if (anim && window.ImageDecoder && /gif|webp/.test(blob.type)){
        var dec = new ImageDecoder({ data: blob.stream(), type: blob.type }), frames = [], durs = [];
        dec.tracks.ready.then(function(){
          var n = Math.min(60, dec.tracks.selectedTrack.frameCount || 1), i = 0;
          var next = function(){
            if (i >= n){
              dec.close();
              var ms = durs.map(function(d){ return d ? Math.round(d / 1000) : 0; }), avg = ms.length ? ms.reduce(function(a, b){ return a + b; }, 0) / ms.length : 0;
              var same = ms.every(function(m){ return Math.abs(m - ms[0]) < 15; });
              done(frames, avg ? Math.max(1, Math.min(24, Math.round(1000 / avg))) : 8, same ? null : ms);
              return;
            }
            dec.decode({ frameIndex: i++ }).then(function(r){ frames.push(gridFrom(r.image, s)); durs.push(r.image.duration || 0); r.image.close(); next(); }, function(){ i = n; next(); });
          };
          next();
        }, function(){ picture(blob, function(img){ done([gridFrom(img, s)]); }); });
        return;
      }
      picture(blob, function(img){ done([gridFrom(img, s)]); });
    }

    if (!lib.length) lib.push(make("My " + cfg.noun, cfg.size));
    var want = STORE.get(cfg.key + ":cur", null);
    open(lib.filter(function(it){ return it.id === want; })[0] || lib[0]);
    return { stop: stop, loadImage: loadImage };
  }

  // The button designer: a background, then text, icons, shapes and pictures on top, drawn on a
  // canvas the size of the button (256 pixels for each key) and saved as a PNG
  var UNIT = 256;
  var ICON_FILES = "camera-save camera-toggle camera-view lt-check lt-fix lt-ok lt-problem lt-report lt-timeline lt-warn map nav-folder nav-phases sp-knob sp-library sp-like-on sp-list sp-next sp-now sp-pause sp-play sp-prev sp-volume icon".split(" ");
  var IMG_CACHE = {};
  function img(src, then){
    if (IMG_CACHE[src]) return IMG_CACHE[src].complete ? IMG_CACHE[src] : null;
    var im = new Image(); im.onload = then; im.src = src; IMG_CACHE[src] = im;
    return null;
  }
  function roundRect(x, X, Y, W, H, r){
    r = Math.max(0, Math.min(r, W / 2, H / 2));
    x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath();
  }
  function Designer(root){
    var KEY = "md.designs";
    var lib = STORE.get(KEY, []), d = null, sel = -1, drag = null, saveT = 0, sideTab = "button";
    var TEMPLATES = [
      { name: "Name and icon", make: function(){ return { bg: { type: "colour", c1: "#5fd0a8", c2: "#3aa585" }, layers: [ L("icon", { glyph: "mic", x: 50, y: 40, size: 46, colour: "#1e2433" }), L("text", { text: "MUTE", x: 50, y: 80, size: 18, colour: "#1e2433" }) ] }; } },
      { name: "Big word", make: function(){ return { bg: { type: "two", c1: "#ff5a5f", c2: "#c93c41" }, layers: [ L("text", { text: "LIVE", x: 50, y: 50, size: 34, colour: "#ffffff", shadow: true }) ] }; } },
      { name: "Picture badge", make: function(){ return { bg: { type: "colour", c1: "#1e2433", c2: "#262e43" }, layers: [ L("icon", { src: "icons/sp-play.png", x: 50, y: 42, size: 56 }), L("text", { text: "PLAY", x: 50, y: 84, size: 16, colour: "#ffc93c" }) ] }; } },
      { name: "Status light", make: function(){ return { bg: { type: "gradient", c1: "#262e43", c2: "#1e2433" }, layers: [ L("shape", { kind: "circle", x: 50, y: 40, size: 40, colour: "#5fd0a8", outline: 4, ocolour: "#0b0e14", shadow: true }), L("text", { text: "ON AIR", x: 50, y: 82, size: 15, colour: "#e4eaf6" }) ] }; } },
      { name: "Counter badge", make: function(){ return { bg: { type: "colour", c1: "#7cc4ff", c2: "#4c97d6", radius: 12 }, layers: [ L("icon", { glyph: "note", x: 46, y: 52, size: 50, colour: "#1e2433" }), L("shape", { kind: "badge", x: 76, y: 24, size: 30, colour: "#ff5a5f", outline: 3, ocolour: "#ffffff" }), L("text", { text: "3", x: 76, y: 24, size: 16, colour: "#ffffff" }) ] }; } }
    ];
    function L(type, o){ var l = { type: type, x: 50, y: 50, size: 30, hidden: false }; for (var k in o) l[k] = o[k]; return l; }
    function make(t){ var b = (t || TEMPLATES[0]).make(); return { id: uid("d"), name: (t ? t.name : "My design"), w: 1, h: 1, bg: b.bg, layers: b.layers, updated: Date.now() }; }

    root.innerHTML =
      '<div class="mkr mkr-design">' +
      '<div class="mp frame">' +
        '<div class="tabs3" role="tablist" aria-label="Button settings">' + [["button","Button"],["start","Start from"],["saved","Saved"]].map(function(t){ return '<button type="button" role="tab" data-side="' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>' +
        '<div data-pane="button">' +
          '<div class="grp"><h3>Button size</h3><div class="sizes" data-k="sizes"></div></div>' +
          '<div class="grp"><h3>Background</h3><div class="segs" data-k="bgt"></div>' +
            '<label class="crow"><input type="color" data-k="c1" aria-label="Background colour"> <span data-k="c1l">Colour</span></label>' +
            '<label class="crow" data-k="c2w"><input type="color" data-k="c2" aria-label="Second colour"> <span data-k="c2l">Second colour</span></label>' +
            '<label class="btn plain" data-k="bgpw" style="font-size:14px;padding:4px 10px;cursor:pointer">Choose a picture…<input type="file" accept="image/*" data-k="bgpic" hidden></label></div>' +
          '<div class="grp"><h3>Corners</h3><label class="fld"><span>Rounded: <b data-k="radv"></b></span><input type="range" min="0" max="40" data-k="radius"></label></div>' +
        '</div>' +
        '<div data-pane="start" hidden><div class="grp"><h3>Templates</h3><div class="tpls" data-k="tpls"></div></div></div>' +
        '<div data-pane="saved" hidden><div class="grp"><h3>Saved in this browser</h3><button type="button" class="btn plain" data-a="new" style="font-size:15px;padding:5px 12px">+ New design</button><div class="lib" data-k="lib"></div></div></div>' +
      '</div>' +
      '<div class="stage2">' +
        '<div class="bar2"><label class="fld grow" style="flex-direction:row;align-items:center;gap:8px">Name<input type="text" data-k="name" maxlength="24" style="flex:1"></label></div>' +
        '<div class="cvwrap"><canvas class="design" data-k="cv" width="256" height="256" aria-label="The button. Drag a part to move it." tabindex="0"></canvas></div>' +
        '<p class="empty2">Click a part to pick it, then drag it, or use the arrow keys. Each button size is its own design.</p>' +
      '</div>' +
      '<div class="mp frame side-r">' +
        '<div class="grp"><h3>Parts</h3><div class="bar2"><button type="button" class="btn plain" data-a="addText">+ Text</button><button type="button" class="btn plain" data-a="addIcon">+ Icon</button><button type="button" class="btn plain" data-a="addShape">+ Shape</button><label class="btn plain" style="cursor:pointer;font-size:15px;padding:5px 12px">+ Picture<input type="file" accept="image/*" data-k="addPic" hidden></label></div><ul class="layers" data-k="layers"></ul></div>' +
        '<div class="grp" data-k="props"></div>' +
        '<div class="grp"><h3>Download</h3><button type="button" class="btn mint" data-a="export" style="font-size:16px;padding:7px 14px">Download PNG</button><p class="empty2" data-k="out"></p>' + syncHtml() + '</div>' +
      '</div></div>';
    var q = function(k){ return root.querySelector('[data-k="' + k + '"]'); };
    var cv = q("cv"), g = cv.getContext("2d");
    var boxes = [];

    function persist(){
      clearTimeout(saveT);
      saveT = setTimeout(function(){
        d.updated = Date.now();
        if (!STORE.set(KEY, lib)) q("out").textContent = "This browser couldn't keep it (pictures take room). Download it before you leave.";
        STORE.set(KEY + ":cur", d.id);
        drawLib();
      }, 300);
    }
    // Outline and shadow work the same for text, icons and shapes
    function effects(x, l, s, paint){
      if (l.shadow){ x.save(); x.translate(Math.max(2, s * .06), Math.max(2, s * .06)); x.globalAlpha = .45; paint("#000000", true); x.restore(); }
      if (l.outline > 0) paint(l.ocolour || "#1e2433", false, l.outline);
      paint(null);
    }
    function render(x, W, H, outline){
      x.imageSmoothingEnabled = false;
      var bg = d.bg, rad = (bg.radius || 0) / 100 * Math.min(W, H);
      x.clearRect(0, 0, W, H);
      x.save();
      if (rad > 0){ roundRect(x, 0, 0, W, H, rad); x.clip(); }
      if (bg.type === "two"){ x.fillStyle = bg.c1; x.fillRect(0, 0, W, H / 2); x.fillStyle = bg.c2; x.fillRect(0, H / 2, W, H - H / 2); }
      else if (bg.type === "gradient"){ var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, bg.c1); gr.addColorStop(1, bg.c2 || bg.c1); x.fillStyle = gr; x.fillRect(0, 0, W, H); }
      else { x.fillStyle = bg.c1; x.fillRect(0, 0, W, H); }
      if (bg.type === "picture" && bg.src){
        var im = img(bg.src, redraw);
        if (im){ var k = Math.max(W / im.width, H / im.height); x.imageSmoothingEnabled = true; x.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k); x.imageSmoothingEnabled = false; }
      }
      var bx = [];
      d.layers.forEach(function(l){
        if (l.hidden){ bx.push(null); return; }
        var cx = l.x / 100 * W, cy = l.y / 100 * H, s = l.size / 100 * Math.min(W, H);
        if (l.type === "text"){
          x.font = "700 " + Math.round(s) + 'px "Pixelify Sans", monospace';
          x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
          var lines = String(l.text || "").split("\n"), lh = s * 1.05, tw = 0;
          lines.forEach(function(t){ tw = Math.max(tw, x.measureText(t).width); });
          effects(x, l, s, function(col, sh, ow){
            lines.forEach(function(t, n){
              var ty = cy + (n - (lines.length - 1) / 2) * lh;
              if (ow){ x.lineWidth = ow * 2; x.strokeStyle = col; x.strokeText(t, cx, ty); }
              else { x.fillStyle = col || l.colour; x.fillText(t, cx, ty); }
            });
          });
          bx.push([cx - tw / 2, cy - lh * lines.length / 2, tw, lh * lines.length]);
        } else if (l.type === "shape"){
          var sw = s * (l.kind === "badge" ? 1.6 : 1), sh2 = s;
          var path = function(){ if (l.kind === "circle"){ x.beginPath(); x.arc(cx, cy, s / 2, 0, Math.PI * 2); } else roundRect(x, cx - sw / 2, cy - sh2 / 2, sw, sh2, l.kind === "badge" ? sh2 / 2 : (l.round || 0) / 100 * s); };
          effects(x, l, s, function(col, sh, ow){ path(); if (ow){ x.lineWidth = ow * 2; x.strokeStyle = col; x.stroke(); } else { x.fillStyle = col || l.colour; x.fill(); } });
          bx.push([cx - sw / 2, cy - sh2 / 2, sw, sh2]);
        } else if (l.type === "icon" && l.glyph){
          var rows = GL[l.glyph] || GL.bolt, p = s / 8;
          var dots = function(col, grow){ x.fillStyle = col; rows.forEach(function(row, y){ for (var c = 0; c < 8; c++) if (row[c] === "#") x.fillRect(Math.round(cx - s / 2 + c * p) - grow, Math.round(cy - s / 2 + y * p) - grow, Math.ceil(p) + grow * 2, Math.ceil(p) + grow * 2); }); };
          effects(x, l, s, function(col, sh, ow){ dots(col || l.colour, ow ? ow : 0); });
          bx.push([cx - s / 2, cy - s / 2, s, s]);
        } else {
          var im2 = img(l.src, redraw);
          if (im2){
            var r = im2.width / im2.height, w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s;
            if (l.shadow){ x.save(); x.globalAlpha = .45; x.filter = "brightness(0)"; x.drawImage(im2, cx - w / 2 + s * .06, cy - h / 2 + s * .06, w, h); x.restore(); }
            x.imageSmoothingEnabled = l.type === "picture"; x.drawImage(im2, cx - w / 2, cy - h / 2, w, h); x.imageSmoothingEnabled = false; bx.push([cx - w / 2, cy - h / 2, w, h]);
          }
          else bx.push([cx - s / 2, cy - s / 2, s, s]);
        }
      });
      x.restore();
      if (outline && sel >= 0 && bx[sel]){ var b = bx[sel]; x.setLineDash([6, 4]); x.lineWidth = 3; x.strokeStyle = "#ffc93c"; x.strokeRect(b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8); x.setLineDash([]); }
      return bx;
    }
    function redraw(){
      cv.width = UNIT * d.w; cv.height = UNIT * d.h;
      // Shown a little bigger than it's saved, so small parts are easy to grab
      cv.style.width = (d.w * 300) + "px";
      boxes = render(g, cv.width, cv.height, true);
    }
    function drawLib(){
      var box = q("lib");
      box.innerHTML = "";
      lib.slice().sort(function(a, b){ return b.updated - a.updated; }).forEach(function(it){
        var row = document.createElement("div");
        row.className = "it"; row.setAttribute("aria-current", String(it.id === d.id));
        var sw = document.createElement("canvas"); sw.width = sw.height = 36;
        var sx = sw.getContext("2d"); sx.fillStyle = it.bg.c1; sx.fillRect(0, 0, 36, 36); if (it.bg.type === "two" || it.bg.type === "gradient"){ sx.fillStyle = it.bg.c2; sx.fillRect(0, 18, 36, 18); }
        var nm = document.createElement("button"); nm.type = "button"; nm.className = "nm"; nm.textContent = (it.name || "Untitled") + " · " + it.w + "×" + it.h;
        nm.addEventListener("click", function(){ open(it); });
        var del = document.createElement("button"); del.type = "button"; del.className = "mini"; del.textContent = "Delete";
        del.setAttribute("aria-label", "Delete " + (it.name || "Untitled"));
        del.addEventListener("click", function(){
          if (!confirm("Delete " + (it.name || "this design") + " from this browser?")) return;
          lib.splice(lib.indexOf(it), 1);
          if (it === d){ if (!lib.length) lib.push(make()); open(lib[0]); }
          persist(); drawLib();
        });
        row.append(sw, nm, del);
        box.appendChild(row);
      });
    }
    var layerName = function(l){ return l.name ? l.name : l.type === "text" ? "Text: " + (String(l.text || "").split("\n")[0] || "empty") : l.type === "icon" ? "Icon" + (l.glyph ? ": " + l.glyph : "") : l.type === "shape" ? "Shape: " + ({ box: "box", circle: "circle", badge: "badge" }[l.kind] || "box") : "Picture"; };
    function drawSide(){
      q("name").value = d.name;
      root.querySelectorAll("[data-side]").forEach(function(b){ b.setAttribute("aria-selected", String(b.dataset.side === sideTab)); });
      root.querySelectorAll("[data-pane]").forEach(function(p){ p.hidden = p.dataset.pane !== sideTab; });
      q("sizes").innerHTML = [[1,1],[2,1],[1,2],[2,2]].map(function(s){ return '<button type="button" data-w="' + s[0] + '" data-h="' + s[1] + '" aria-pressed="' + (d.w === s[0] && d.h === s[1]) + '">' + s[0] + ' × ' + s[1] + '</button>'; }).join("");
      q("bgt").innerHTML = [["colour","One colour"],["two","Two colours"],["gradient","Gradient"],["picture","Picture"]].map(function(t){ return '<button type="button" data-bg="' + t[0] + '" aria-pressed="' + (d.bg.type === t[0]) + '">' + t[1] + '</button>'; }).join("");
      q("c1").value = d.bg.c1; q("c2").value = d.bg.c2 || "#1e2433";
      q("c1l").textContent = d.bg.type === "gradient" ? "Top" : "Colour"; q("c2l").textContent = d.bg.type === "gradient" ? "Bottom" : "Second colour";
      q("c2w").hidden = d.bg.type !== "two" && d.bg.type !== "gradient"; q("bgpw").hidden = d.bg.type !== "picture";
      q("radius").value = d.bg.radius || 0; q("radv").textContent = (d.bg.radius || 0) ? d.bg.radius + "%" : "square";
      q("tpls").innerHTML = TEMPLATES.map(function(t, i){ return '<button type="button" class="tpl" data-tpl="' + i + '"><canvas width="96" height="96"></canvas><span>' + t.name + '</span></button>'; }).join("");
      // template thumbnails: each drawn with the same renderer
      var keep = d;
      q("tpls").querySelectorAll("[data-tpl]").forEach(function(b){
        var t = TEMPLATES[+b.dataset.tpl], m = t.make();
        d = { w: 1, h: 1, bg: m.bg, layers: m.layers };
        var c = b.querySelector("canvas"), off = document.createElement("canvas"); off.width = off.height = UNIT;
        render(off.getContext("2d"), UNIT, UNIT, false);
        c.getContext("2d").drawImage(off, 0, 0, 96, 96);
      });
      d = keep;
      var ul = q("layers");
      ul.innerHTML = "";
      d.layers.forEach(function(l, i){
        var li = document.createElement("li"); li.setAttribute("aria-current", String(i === sel)); if (l.hidden) li.className = "off";
        var nm = document.createElement("button"); nm.type = "button"; nm.className = "nm"; nm.textContent = layerName(l);
        nm.addEventListener("click", function(){ sel = i; drawAll(); });
        var acts = document.createElement("span"); acts.className = "bar2"; acts.style.gap = "4px";
        [["↑", "up", "Move up"], ["↓", "down", "Move down"], [l.hidden ? "Show" : "Hide", "vis", l.hidden ? "Show it" : "Hide it"], ["✕", "rm", "Remove"]].forEach(function(a){
          var b = document.createElement("button"); b.type = "button"; b.className = "mini"; b.textContent = a[0]; b.setAttribute("aria-label", a[2] + ": " + layerName(l));
          b.addEventListener("click", function(){
            if (a[1] === "rm"){ d.layers.splice(i, 1); sel = -1; }
            else if (a[1] === "vis") l.hidden = !l.hidden;
            else { var j = a[1] === "up" ? i + 1 : i - 1; if (j < 0 || j >= d.layers.length) return; d.layers.splice(i, 1); d.layers.splice(j, 0, l); sel = j; }
            persist(); drawAll();
          });
          acts.appendChild(b);
        });
        li.append(nm, acts);
        ul.appendChild(li);
      });
      if (!d.layers.length) ul.innerHTML = '<li class="empty2" style="border:0;background:none">No parts yet. Add text, an icon, a shape or a picture.</li>';
      // the button (its colour or picture) is always the bottom layer; its settings are under Button
      var bl = document.createElement("li"); bl.className = "base";
      var bn = document.createElement("button"); bn.type = "button"; bn.className = "nm";
      bn.textContent = (d.bg.type === "picture" ? "Picture" : "Button") + " · bottom layer";
      bn.addEventListener("click", function(){ sel = -1; sideTab = "button"; drawAll(); });
      var bh = document.createElement("span"); bh.className = "empty2"; bh.textContent = "Button tab";
      bl.append(bn, bh); ul.insertBefore(bl, ul.firstChild);
      drawProps();
    }
    function drawProps(){
      var box = q("props"), l = d.layers[sel];
      if (!l){ box.innerHTML = ""; return; }
      var h = '<h3>' + (l.type === "text" ? "Text" : l.type === "icon" ? "Icon" : l.type === "shape" ? "Shape" : "Picture") + '</h3>';
      if (l.type === "text") h += '<label class="fld">What it says<textarea data-p="text" rows="2" maxlength="40"></textarea></label>';
      if (l.type === "shape") h += '<div class="segs" data-k="kinds">' + [["box","Box"],["circle","Circle"],["badge","Badge"]].map(function(k){ return '<button type="button" data-kind="' + k[0] + '" aria-pressed="' + ((l.kind || "box") === k[0]) + '">' + k[1] + '</button>'; }).join("") + '</div>';
      if (l.type === "text" || l.glyph || l.type === "shape") h += '<label class="crow"><input type="color" data-p="colour" aria-label="Colour"> Colour</label>';
      h += '<label class="fld">Size<input type="range" min="6" max="100" data-p="size"></label>';
      if (l.type === "shape" && (l.kind || "box") === "box") h += '<label class="fld">Rounded corners<input type="range" min="0" max="50" data-p="round"></label>';
      if (l.type !== "picture" && !(l.type === "icon" && l.src)) h += '<div class="fx"><label class="fld">Outline<input type="range" min="0" max="16" data-p="outline"></label><label class="crow"><input type="color" data-p="ocolour" aria-label="Outline colour"> Outline colour</label></div>';
      h += '<label class="chk"><input type="checkbox" data-p="shadow"> Drop shadow</label>';
      if (l.type === "icon") h += '<div class="ibox" data-k="ibox" role="group" aria-label="Icons"></div>';
      box.innerHTML = h;
      var t = box.querySelector('[data-p="text"]'); if (t) t.value = l.text;
      var c = box.querySelector('[data-p="colour"]'); if (c) c.value = l.colour || "#1e2433";
      var oc = box.querySelector('[data-p="ocolour"]'); if (oc) oc.value = l.ocolour || "#1e2433";
      var ow = box.querySelector('[data-p="outline"]'); if (ow) ow.value = l.outline || 0;
      var rd = box.querySelector('[data-p="round"]'); if (rd) rd.value = l.round || 0;
      box.querySelector('[data-p="size"]').value = l.size;
      box.querySelector('[data-p="shadow"]').checked = !!l.shadow;
      box.querySelectorAll("[data-p]").forEach(function(inp){
        inp.addEventListener(inp.type === "checkbox" ? "change" : "input", function(){
          var k = inp.dataset.p;
          l[k] = inp.type === "checkbox" ? inp.checked : (k === "size" || k === "outline" || k === "round") ? +inp.value : inp.value;
          if (k === "text") drawSideNames();
          redraw(); persist();
        });
      });
      var kinds = box.querySelector('[data-k="kinds"]');
      if (kinds) kinds.addEventListener("click", function(e){ var b = e.target.closest("[data-kind]"); if (!b) return; l.kind = b.dataset.kind; persist(); drawAll(); });
      if (l.type === "icon"){
        var ib = box.querySelector('[data-k="ibox"]');
        ib.innerHTML = Object.keys(GL).map(function(n){ return '<button type="button" data-glyph="' + n + '" title="' + n + '" aria-pressed="' + (l.glyph === n) + '">' + glyphSvg(n) + '</button>'; }).join("") +
          ICON_FILES.map(function(f){ var src = "icons/" + f + ".png"; return '<button type="button" data-src="' + src + '" title="' + f + '" aria-pressed="' + (l.src === src) + '"><img class="px" src="' + src + '" alt=""></button>'; }).join("");
        ib.addEventListener("click", function(e){
          var b = e.target.closest("button"); if (!b) return;
          if (b.dataset.glyph){ l.glyph = b.dataset.glyph; delete l.src; if (!l.colour) l.colour = "#1e2433"; }
          else { l.src = b.dataset.src; delete l.glyph; }
          persist(); drawAll();
        });
      }
    }
    function drawSideNames(){ var b = q("layers").querySelectorAll(".nm"); d.layers.forEach(function(l, i){ if (b[i]) b[i].textContent = layerName(l); }); }
    function drawAll(){ redraw(); drawSide(); }
    function open(it){ d = it; sel = -1; q("out").textContent = ""; drawAll(); drawLib(); STORE.set(KEY + ":cur", it.id); }
    function readFile(inp, then){
      var f = inp.files[0]; inp.value = ""; if (!f) return;
      if (f.size > 3 * 1024 * 1024){ q("out").textContent = "That picture is over 3 MB. Pick a smaller one."; return; }
      var rd = new FileReader(); rd.onload = function(){ then(rd.result); }; rd.readAsDataURL(f);
    }

    root.addEventListener("click", function(e){
      var b = e.target.closest("button"); if (!b || !root.contains(b)) return;
      if (b.dataset.side){ sideTab = b.dataset.side; drawSide(); return; }
      if (b.dataset.w){ d.w = +b.dataset.w; d.h = +b.dataset.h; persist(); drawAll(); return; }
      if (b.dataset.bg){ d.bg.type = b.dataset.bg; if ((b.dataset.bg === "two" || b.dataset.bg === "gradient") && !d.bg.c2) d.bg.c2 = "#1e2433"; persist(); drawAll(); return; }
      if (b.dataset.tpl){ var t = TEMPLATES[+b.dataset.tpl], m = t.make(); d.bg = m.bg; d.layers = m.layers; sel = -1; sideTab = "button"; persist(); drawAll(); return; }
      var a = b.dataset.a;
      if (a === "addText"){ d.layers.push(L("text", { text: "TEXT", size: 22, colour: "#ffffff", y: 50 })); sel = d.layers.length - 1; persist(); drawAll(); }
      if (a === "addIcon"){ d.layers.push(L("icon", { glyph: "bolt", size: 44, colour: "#1e2433", y: 45 })); sel = d.layers.length - 1; persist(); drawAll(); }
      if (a === "addShape"){ d.layers.push(L("shape", { kind: "circle", size: 40, colour: "#ffc93c", outline: 3, ocolour: "#1e2433" })); sel = d.layers.length - 1; persist(); drawAll(); }
      if (a === "new"){ var it = make(); it.name = "My design"; lib.push(it); open(it); persist(); }
      if (a === "export"){
        var name = fileName(d.name, ".png");
        toBlob(function(bl){ download(bl, name); q("out").textContent = name + " · " + Math.max(1, Math.round(bl.size / 1024)) + " KB. Import it in a button's Image section, on a " + d.w + " × " + d.h + " button."; });
      }
      if (a === "sync") toBlob(function(bl){ deskSync(bl, root.querySelector("[data-sync-msg]")); });
    });
    q("name").addEventListener("input", function(){ d.name = q("name").value.slice(0, 24); persist(); });
    q("c1").addEventListener("input", function(){ d.bg.c1 = q("c1").value; redraw(); persist(); });
    q("c2").addEventListener("input", function(){ d.bg.c2 = q("c2").value; redraw(); persist(); });
    q("radius").addEventListener("input", function(){ d.bg.radius = +q("radius").value; q("radv").textContent = d.bg.radius ? d.bg.radius + "%" : "square"; redraw(); persist(); });
    q("bgpic").addEventListener("change", function(){ readFile(q("bgpic"), function(src){ d.bg.src = src; d.bg.type = "picture"; persist(); drawAll(); }); });
    q("addPic").addEventListener("change", function(){ readFile(q("addPic"), function(src){ d.layers.push(L("picture", { src: src, size: 60 })); sel = d.layers.length - 1; persist(); drawAll(); }); });

    // Pick a part by clicking it (the topmost one), then drag it
    function pos(e){ var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; }
    cv.addEventListener("pointerdown", function(e){
      var p = pos(e), hit = -1;
      for (var i = boxes.length - 1; i >= 0; i--){ var b = boxes[i]; if (b && p[0] >= b[0] - 6 && p[0] <= b[0] + b[2] + 6 && p[1] >= b[1] - 6 && p[1] <= b[1] + b[3] + 6){ hit = i; break; } }
      sel = hit;
      if (hit >= 0){ try { cv.setPointerCapture(e.pointerId); } catch (err) {} drag = { p: p, x: d.layers[hit].x, y: d.layers[hit].y }; }
      drawAll();
    });
    cv.addEventListener("pointermove", function(e){
      if (!drag || sel < 0) return;
      var p = pos(e), l = d.layers[sel];
      l.x = Math.max(0, Math.min(100, Math.round(drag.x + (p[0] - drag.p[0]) / cv.width * 100)));
      l.y = Math.max(0, Math.min(100, Math.round(drag.y + (p[1] - drag.p[1]) / cv.height * 100)));
      redraw();
    });
    var up = function(){ if (drag){ drag = null; persist(); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("keydown", function(e){
      var l = d.layers[sel], m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!l) return;
      if (m){ e.preventDefault(); var st = e.shiftKey ? 5 : 1; l.x = Math.max(0, Math.min(100, l.x + m[0] * st)); l.y = Math.max(0, Math.min(100, l.y + m[1] * st)); redraw(); persist(); }
      if (e.key === "Delete"){ d.layers.splice(sel, 1); sel = -1; persist(); drawAll(); }
    });
    function toBlob(then){
      var c = document.createElement("canvas"); c.width = UNIT * d.w; c.height = UNIT * d.h;
      render(c.getContext("2d"), c.width, c.height, false);
      c.toBlob(then, "image/png");
    }
    // MinnionDeck's picture for the button becomes a new design's background (kept to 512 pixels, so it
    // fits in this browser's storage), ready for text and icons on top
    function loadImage(blob, name){
      var im = new Image();
      im.onload = function(){
        var k = Math.min(1, 512 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(im.src);
        var it = make(); it.name = String(name || "From MinnionDeck").slice(0, 24); it.layers = [];
        it.bg = { type: "picture", c1: "#1e2433", c2: "#262e43", src: c.toDataURL("image/png") };
        lib.push(it); open(it); persist();
        q("out").textContent = "Brought in from MinnionDeck. Add text or icons on top, then press Sync.";
      };
      im.onerror = function(){ URL.revokeObjectURL(im.src); q("out").textContent = "MinnionDeck's picture couldn't be read."; };
      im.src = URL.createObjectURL(blob);
    }

    // layers: [{name, role: "background"|"picture"|"icon", icon, png (base64, size × size)}], bottom first
    function loadLayers(layers, size, name){
      var it = make(); it.name = String(name || "From MinnionDeck").slice(0, 24); it.layers = [];
      it.bg = { type: "colour", c1: "#1e2433", c2: "#262e43" };
      var left = layers.length, done = function(){
        if (--left > 0) return;
        it.layers = it.layers.filter(Boolean);   // MinnionDeck's order, without the gap the background leaves
        lib.push(it); open(it); persist();
        q("out").textContent = "Brought in from MinnionDeck as layers. Move, resize or swap the icon, add parts, then press Sync.";
      };
      if (!left){ left = 1; done(); return; }
      layers.forEach(function(ly, idx){
        var im = new Image();
        im.onload = function(){
          var c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
          var x = c.getContext("2d"); x.drawImage(im, 0, 0);
          var px = x.getImageData(0, 0, c.width, c.height).data;
          if (ly.role === "background"){
            // a solid colour: keep it as the button's colour, so it stays easy to change
            var i = ((c.height >> 1) * c.width + (c.width >> 1)) * 4, h = function(v){ return ("0" + v.toString(16)).slice(-2); };
            it.bg = { type: "colour", c1: "#" + h(px[i]) + h(px[i + 1]) + h(px[i + 2]), c2: "#262e43" };
          } else if (ly.role === "picture"){
            it.bg = { type: "picture", c1: "#1e2433", c2: "#262e43", src: im.src };
          } else {
            // the icon, cut to the part that has pixels, placed where it sits on the button
            var x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
            for (var y = 0; y < c.height; y++) for (var xx = 0; xx < c.width; xx++) if (px[(y * c.width + xx) * 4 + 3] > 8){ if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            if (x1 >= 0){
              var w = x1 - x0 + 1, hh = y1 - y0 + 1, cut = document.createElement("canvas"); cut.width = w; cut.height = hh;
              cut.getContext("2d").drawImage(c, x0, y0, w, hh, 0, 0, w, hh);
              var S = size || c.width;
              it.layers[idx] = L("icon", { name: ly.name || "Icon", from: ly.icon || "", src: cut.toDataURL("image/png"), x: Math.round((x0 + w / 2) / S * 1000) / 10, y: Math.round((y0 + hh / 2) / S * 1000) / 10, size: Math.round(Math.max(w, hh) / S * 1000) / 10 });
            }
          }
          done();
        };
        im.onerror = done;
        im.src = "data:image/png;base64," + ly.png;
      });
    }

    if (!lib.length) lib.push(make());
    var want = STORE.get(KEY + ":cur", null);
    open(lib.filter(function(it){ return it.id === want; })[0] || lib[0]);
    if (document.fonts && document.fonts.load) document.fonts.load('700 20px "Pixelify Sans"').then(redraw, function(){});
    return { loadImage: loadImage, loadLayers: loadLayers };
  }

  // Built the first time each page opens
  var MAKERS = {};
  function makerReady(view){
    if (view === "gifs" && !MAKERS.gif){ MAKERS.gif = PixelEditor({ root: document.getElementById("gif-ed"), key: "md.gifs", frames: true, noun: "GIF", sizes: [16, 24, 32, 48, 64], size: 16 }); deskRefresh(); }
    if (view === "images" && !MAKERS.design){ MAKERS.design = Designer(document.getElementById("img-design")); deskRefresh(); }
  }
  function makerOpen(view){
    makerReady(view);
    if (view !== "gifs" && MAKERS.gif) MAKERS.gif.stop();
  }
  // Images has two tools: the button designer and the pixel picture editor
  function imgTab(which){
    var pix = which === "pixel";
    document.getElementById("img-design").hidden = pix;
    document.getElementById("img-pixel").hidden = !pix;
    document.querySelectorAll("#images-view [data-itab]").forEach(function(t){ t.setAttribute("aria-selected", String(t.dataset.itab === which)); });
    if (pix && !MAKERS.pixel){ MAKERS.pixel = PixelEditor({ root: document.getElementById("img-pixel"), key: "md.pics", frames: false, noun: "picture", sizes: [16, 24, 32, 48, 64], size: 32 }); deskRefresh(); }
  }
  document.querySelector("#images-view .tabs2").addEventListener("click", function(e){
    var b = e.target.closest("[data-itab]"); if (b) imgTab(b.dataset.itab);
  });
  window.mdEncodeGif = encodeGif;

  var start = location.hash.slice(1);
