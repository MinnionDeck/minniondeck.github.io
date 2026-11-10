  /* rotating word in the headline */
  var words = ["stream deck","music remote","light switch","control panel"], wi = 0;
  var swap = document.getElementById("swap");
  if (!reduce) setInterval(function(){
    if (home.hidden) return;
    swap.classList.add("out");
    setTimeout(function(){
      wi = (wi + 1) % words.length;
      swap.firstElementChild.textContent = words[wi];
      swap.classList.remove("out"); swap.classList.add("in");
      setTimeout(function(){ swap.classList.remove("in"); }, 340);
    }, 320);
  }, 3200);

  var COL = {tile:"#f7fafc", mint:"#5fd0a8", sky:"#7cc4ff", lilac:"#b79cff", peach:"#ffb38a", sun:"#ffc93c", coral:"#ff5a5f"};
  var REC = [{text:"Off", g:"broadcast", bg:"tile"}, {text:"Recording", g:"broadcast", bg:"coral"}, {text:"Paused", g:"playpause", bg:"sun"}];

  /* General keys, in the order they are placed. The first nine are the app's built-in example keys;
     the rest use its built-in actions and icons. Every key is 1 x 1, as in the app. */
  var KEYS = [
    {l:"Mute mic", act:"mute", anim:"pop"},
    {l:"Go live", act:"live", anim:"jelly"},
    {l:"Record", act:"record", anim:"pop"},
    {l:"Screenshot", g:"camera", bg:"tile", flash:"mint", log:"Screenshot · Win+Shift+S", anim:"press"},
    {l:"Next track", g:"note", bg:"sky", log:"Media · next track", anim:"bounce"},
    {l:"Volume up", g:"bolt", bg:"tile", log:"Volume · up 10%", anim:"bounce"},
    {l:"Play or pause", g:"note", bg:"sky", log:"Media · play or pause", anim:"heart"},
    {l:"Be right back", g:"folder", bg:"lilac", log:"Typed · Be right back!", anim:"jelly"},
    {l:"Open notes", g:"folder", bg:"tile", log:"Opened · notepad.exe", anim:"press"},
    {l:"Volume down", g:"down", bg:"tile", log:"Volume · down 10%", anim:"bounce"},
    {l:"Clip last 30s", g:"bolt", bg:"sun", log:"Clip · Win+Alt+G", anim:"pop"},
    {l:"Open website", g:"globe", bg:"sky", log:"Opened · website", anim:"press"},
    {l:"Type text", g:"type", bg:"tile", log:"Typed · text", anim:"press"},
    {l:"Lock PC", g:"lock", bg:"peach", log:"Keys · Win+L", anim:"pop"},
    {l:"Timer", g:"hourglass", bg:"tile", log:"Wait · 3 s", anim:"press"},
    {l:"Settings", g:"gear", bg:"tile", log:"Deck · settings page", anim:"press"}
  ];
  var KEYMAP = {};
  KEYS.forEach(function(k){ KEYMAP[k.l] = k; });
  var SIZES = [];
  var state = {cols:5, rows:3, mute:false, live:false, rec:0, flash:"", sel:"Mute mic"};
  var pausedUntil = 0;
  var deck = document.getElementById("deck");
  var sizes = document.getElementById("sizes");

  // Place the keys row by row in the first spot each one fits, as the app's grid does
  function pack(cols, rows){
    var used = {}, out = [];
    function free(x, y, w, h){
      if (x + w > cols || y + h > rows) return false;
      for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (used[i + "," + j]) return false;
      return true;
    }
    KEYS.forEach(function(k){
      var tries = [[k.w || 1, k.h || 1]];
      if ((k.w || 1) > 1 || (k.h || 1) > 1) tries.push([1, 1]);
      for (var t = 0; t < tries.length; t++){
        var w = tries[t][0], h = tries[t][1];
        for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++){
          if (free(x, y, w, h)){
            for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) used[i + "," + j] = 1;
            out.push({k:k, x:x, y:y, w:w, h:h});
            return;
          }
        }
      }
    });
    return {keys:out, used:used};
  }

  // What a key looks like right now: its colour, icon and the name under it
  function lookOf(k){
    if (k.act === "mute") return state.mute ? {bg:"coral", g:"cross", t:"Mic muted"} : {bg:"tile", g:"mic", t:"Mute mic"};
    if (k.act === "record"){ var r = REC[state.rec]; return {bg:r.bg, g:r.g, t:"Record: " + r.text}; }
    if (k.act === "live") return {bg:"peach", g:"play", t:state.live ? "ON AIR" : "Go live", cls:state.live ? " onair" : ""};
    return {bg:(state.flash === k.l ? k.flash : k.bg), g:k.g, t:k.l};
  }

  // The pixel phone under the window shows the same page, as the phone page does; its keys press too
  var mph = document.getElementById("mph-deck");
  function mirror(){
    if (!mph) return;
    mph.style.gridTemplateColumns = deck.style.gridTemplateColumns;
    mph.innerHTML = deck.innerHTML;
    mph.querySelectorAll("button").forEach(function(b){ b.tabIndex = -1; b.classList.remove("new", "sel"); b.removeAttribute("title"); });
  }
  function twinOf(btn){
    var other = btn.closest("#mph-deck") ? deck : mph;
    return other ? other.querySelector('.key[data-l="' + (window.CSS && CSS.escape ? CSS.escape(btn.dataset.l) : btn.dataset.l) + '"]') : null;
  }
  function render(opt){
    opt = opt || {};
    var before = {};
    if (opt.flip && !reduce) Array.prototype.forEach.call(deck.querySelectorAll(".key"), function(el){ before[el.dataset.l] = el.getBoundingClientRect(); });
    var p = pack(state.cols, state.rows);
    deck.style.gridTemplateColumns = "repeat(" + state.cols + ",minmax(0,1fr))";
    deck.textContent = "";
    p.keys.forEach(function(s){
      var k = s.k, lk = lookOf(k);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "key" + (s.w === 1 && s.h === 1 ? " sq" : "") + (lk.cls || "") + (k.l === state.sel ? " sel" : "");
      b.style.gridColumn = (s.x + 1) + " / span " + s.w;
      b.style.gridRow = (s.y + 1) + " / span " + s.h;
      b.style.background = COL[lk.bg];
      b.title = k.l;
      b.dataset.l = k.l;
      b.insertAdjacentHTML("beforeend", glyphSvg(lk.g));
      var lbl = document.createElement("span");
      lbl.className = "lbl"; lbl.textContent = lk.t;
      b.appendChild(lbl);
      deck.appendChild(b);
    });
    for (var y = 0; y < state.rows; y++) for (var x = 0; x < state.cols; x++){
      if (p.used[x + "," + y]) continue;
      var e = document.createElement("div");
      e.className = "slot"; e.setAttribute("aria-hidden", "true");
      e.style.gridColumn = String(x + 1); e.style.gridRow = String(y + 1);
      deck.appendChild(e);
    }
    // Keys glide from where they were to where they are now; keys new to the grid pop in
    if (opt.flip && !reduce){
      Array.prototype.forEach.call(deck.querySelectorAll(".key"), function(el, n){
        var a = before[el.dataset.l];
        if (!a){ el.classList.add("new"); el.style.animationDelay = (n * 0.025) + "s"; return; }
        var b = el.getBoundingClientRect();
        if (!el.animate || !b.width) return;
        el.animate([
          {transform:"translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + "," + (a.height / b.height) + ")", transformOrigin:"top left"},
          {transform:"none", transformOrigin:"top left"}
        ], {duration:480, easing:"steps(8,end)"});
      });
    }
    if (opt.anim && !reduce){
      var hit = deck.querySelector('.key[data-l="' + opt.anim.l + '"]');
      if (hit){ hit.classList.add("a-" + opt.anim.type); setTimeout(function(){ hit.classList.remove("a-" + opt.anim.type); }, 700); }
    }
    sizes.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.c == state.cols && b.dataset.r == state.rows)); });
    document.getElementById("gridstat").textContent = state.cols + " × " + state.rows;
    mirror();
    if (opt.anim && !reduce && mph){
      var ph = mph.querySelector('.key[data-l="' + opt.anim.l + '"]');
      if (ph){ ph.classList.add("a-" + opt.anim.type); setTimeout(function(){ ph.classList.remove("a-" + opt.anim.type); }, 700); }
    }
  }

  SIZES.forEach(function(s){
    var b = document.createElement("button");
    b.type = "button"; b.dataset.c = s[0]; b.dataset.r = s[1];
    b.textContent = s[0] + " × " + s[1];
    b.setAttribute("aria-label", "Grid " + s[0] + " by " + s[1]);
    b.addEventListener("click", function(){ pausedUntil = Date.now() + 9000; setSize(s[0], s[1]); });
    sizes.appendChild(b);
  });
  function setSize(c, r){
    if (state.cols === c && state.rows === r) return;
    state.cols = c; state.rows = r;
    render({flip:true});
    addLog("Deck · grid " + c + " × " + r);
  }

  /* app ticker: hand-made colour pixel logos, the same ones the app uses (tools/brand-art.cjs) */
  var BRAND_ART = {"spotify":{"bg":"191414","c":{"g":"1ed760","k":"191414"},"p":[".....gggggg.....","...gggggggggg...","..gggggggggggg..",".gggggggggggggg.",".gggkkkkkkkkggg.","ggkkggggggggkkgg","gkggggggggggggkg","gggggkkkkkkggggg","ggggkggggggkgggg","gggggggggggggggg","ggggggkkkkgggggg",".ggggkggggkgggg.",".gggggggggggggg.","..gggggggggggg..","...gggggggggg...",".....gggggg....."]},"discord":{"bg":"5865f2","c":{"w":"ffffff","b":"5865f2"},"p":["................","................","...ww......ww...","..wwwwwwwwwwww..",".wwwwwwwwwwwwww.",".wwwwwwwwwwwwww.","wwwwbbwwwwbbwwww","wwwwbbwwwwbbwwww","wwwwwwwwwwwwwwww","wwwwwwwwwwwwwwww",".wwwwwwwwwwwwww.","..wwww....wwww..","...ww......ww...","................","................","................"]},"youtube":{"bg":"ffffff","c":{"r":"ff0000","w":"ffffff"},"p":["................","................","................","..rrrrrrrrrrrr..",".rrrrrrrrrrrrrr.","rrrrrrwrrrrrrrrr","rrrrrrwwwrrrrrrr","rrrrrrwwwwwrrrrr","rrrrrrwwwwwrrrrr","rrrrrrwwwrrrrrrr","rrrrrrwrrrrrrrrr",".rrrrrrrrrrrrrr.","..rrrrrrrrrrrr..","................","................","................"]},"twitch":{"bg":"9146ff","c":{"w":"ffffff","p":"9146ff"},"p":["................","...wwwwwwwwwwww.","..wwwwwwwwwwwww.",".wwwwwwwwwwwwww.",".wwwwwwwwwwwwww.",".wwwwwpwwwpwwww.",".wwwwwpwwwpwwww.",".wwwwwpwwwpwwww.",".wwwwwpwwwpwwww.",".wwwwwwwwwwwwww.",".wwwwwwwwwwwww..",".wwwwwwwwwwww...",".wwwwwwwwwww....","....www.........","....ww..........","................"]},"steam":{"bg":"1b2838","c":{"w":"ffffff","b":"1b2838"},"p":["................",".........www....","........wwwww...",".......wwbbbww..","......wwbwwwbww.","......wwbwwwbww.","......wwbwwwbww.","......wwwbbbww..",".....wwwwwwww...","..wwwww..www....",".wwbbww.........",".wbwwbw.........",".wwbbww.........","..wwww..........","................","................"]},"obsstudio":{"bg":"f7fafc","c":{"k":"302e31","w":"ffffff"},"p":[".....kkkkkk.....","...kkkkkkkkkk...","..kkkkwwwkkkkk..",".kkkkwwwwwkkkkk.",".kkkkwwwwwkkkkk.","kkkkkwwwwwkkkkkk","kkkkkkwwwkkkkkkk","kkkkkkkkkkkkkkkk","kkkwwkkkkkwwwkkk","kkwwwwkkkwwwwwkk","kkwwwwkkkwwwwwkk",".kwwwwkkkwwwwwk.",".kkwwkkkkkwwwkk.","..kkkkkkkkkkkk..","...kkkkkkkkkk...",".....kkkkkk....."]},"streamlabs":{"bg":"09161d","c":{"m":"80f5d2","d":"09161d"},"p":["................","................","................","...mmmmmmmmmm...","..mmmmmmmmmmmm..",".mmmmmmmmmmmmmm.",".mmddmddddddmmm.",".mmddmddddddmmm.",".mmmmmddddddmmm.",".mmmmmddddddmmm.",".mmmmmmmmmmmmmm.","..mmmmmmmmmmmm..","...mmmmmmmmmm...","................","................","................"]},"kick":{"bg":"0b0e0f","c":{"g":"53fc19"},"p":["................","................","..gggg....gggg..","..gggg....gggg..","..gggg..gggg....","..gggg..gggg....","..gggggggg......","..gggggggg......","..gggggggg......","..gggggggg......","..gggg..gggg....","..gggg..gggg....","..gggg....gggg..","..gggg....gggg..","................","................"]},"vlcmediaplayer":{"bg":"2b2b2b","c":{"o":"ff8800","w":"ffffff","d":"c95f00"},"p":["................",".......oo.......","......oooo......","......wwww......",".....wwwwww.....",".....oooooo.....","....oooooooo....","....wwwwwwww....","...wwwwwwwwww...","...oooooooooo...","..oooooooooooo..","..oooooooooooo..",".dddddddddddddd.","oooooooooooooooo","oooooooooooooooo","................"]},"googlechrome":{"bg":"ffffff","c":{"r":"db4437","y":"f4b400","g":"0f9d58","w":"ffffff","b":"4285f4"},"p":[".....rrrrrr.....","...rrrrrrrrrr...","..rrrrrrrrrrrr..",".rrrrrrrrrrrrrr.",".grrrrwwwwrrrry.","ggggrwwbbwwryyyy","ggggwwbbbbwwyyyy","ggggwbbbbbbwyyyy","ggggwbbbbbbwyyyy","ggggwwbbbbwwyyyy","gggggwwbbwwyyyyy",".gggggwwwwyyyyy.",".gggggggyyyyyyy.","..ggggggyyyyyy..","...gggggyyyyy...",".....gggyyy....."]},"firefoxbrowser":{"bg":"ffffff","c":{"o":"ff7139","y":"ffbd4f","p":"9059ff","d":"e31587"},"p":[".....yyyyoo.oo..","...yyyyyyooooo..","..yyyyyyyooooo..",".yyyyyyppppoooo.",".yyyyyppppppooo.","yyyyyppppppppooo","oooooppppppppooo","ooooppppppppppoo","oooooppppppppooo","oooooppppppppooo","ooooooppppppoooo",".ooooooppppoooo.",".oooooooooooooo.","..dddddddddddd..","...dddddddddd...",".....dddddd....."]},"zoom":{"bg":"0b5cff","c":{"w":"ffffff"},"p":["................","................","................","................","...wwwwwww......","..wwwwwwwww..w..","..wwwwwwwww.ww..","..wwwwwwwwwwww..","..wwwwwwwwwwww..","..wwwwwwwww.ww..","..wwwwwwwww..w..","...wwwwwww......","................","................","................","................"]},"teamspeak":{"bg":"ffffff","c":{"b":"2580c3","w":"ffffff"},"p":[".....bbbbbb.....","...bbbbbbbbbb...","..bbbbbbbbbbbb..",".bbbbwwwwwwbbbb.",".bbwwwwwwwwwwbb.","bbwwbbbbbbbbwwbb","bbwbbbbbbbbbbwbb","bwwwbbbbbbbbwwwb","bwwwbbbbbbbbwwwb","bwwwbbbbbbbbwwwb","bwwwbbbbbbbbwwwb",".bbbbbbbbbbbwwb.",".bbbbbbbwwwwbbb.","..bbbbbbbbbbbb..","...bbbbbbbbbb...",".....bbbbbb....."]},"whatsapp":{"bg":"25d366","c":{"w":"ffffff"},"p":["................",".....wwwwwww....","...www.....ww...","...w........ww..","..w..ww......w..","..w..www.....ww.",".ww..ww.......w.",".ww...ww......w.",".ww....ww.....w.","..w.....www.www.","..w......wwwww..","...w.......www..","...www.....ww...",".ww..wwwwwww....",".www............","..w............."]},"telegram":{"bg":"ffffff","c":{"b":"26a5e4","w":"ffffff"},"p":[".....bbbbbb.....","...bbbbbbbbbb...","..bbbbbbbbbbbb..",".bbbbbbbbbbbbbb.",".bbbbbbbbbbwwbb.","bbbbbbbbwwwwwbbb","bbbbbwwwwwwwwbbb","bbwwwwwwwwwwwbbb","bbbbwwwwwwwwbbbb","bbbbbbwwbwwwbbbb","bbbbbbwbbbwwbbbb",".bbbbbbbbbbbbbb.",".bbbbbbbbbbbbbb.","..bbbbbbbbbbbb..","...bbbbbbbbbb...",".....bbbbbb....."]},"notion":{"bg":"ffffff","c":{"k":"000000","w":"ffffff"},"p":["................","...kkkkkkkkkk...","..kwwwwwwwwwwk..","..kwwwwwwwwwwk..","..kkkkwwwkkkwk..","..kwkkwwwwkwwk..","..kwkkkwwwkwwk..","..kwkwkkwwkwwk..","..kwkwwkkwkwwk..","..kwkwwwkkkwwk..","..kwkwwwwkkwwk..","..kkkkwwwwkwwk..","..kwwwwwwwwwwk..","..kwwwwwwwwwwk..","...kkkkkkkkkk...","................"]},"davinciresolve":{"bg":"233a51","c":{"b":"3fa9f5","r":"ff5a5f","y":"ffc93c"},"p":["................",".......bb.......",".....bbbbbb.....",".....bbbbbb.....",".....bbbbbb.....",".....bbbbbb.....",".....bbbbbb.....","...rrrbbbbyyy...","..rrrrr..yyyyy..",".rrrrrrryyyyyyy.",".rrrrrrryyyyyyy.",".rrrrrrryyyyyyy.","..rrrrr..yyyyy..","...rrr....yyy...","................","................"]},"audacity":{"bg":"ffffff","c":{"b":"2a4fd7","r":"ff3b30","o":"ff9f0a","y":"ffd60a"},"p":["................","................","......bbbb......","....bbbbbbbb....","...bb......bb...","..bb....y...bb..","..b...o.y....b..",".bb...o.yo...bb.",".bb...oyyo...bb.",".bbb.royyor.bbb.",".bbb.royyor.bbb.",".bbb.royyor.bbb.",".bbb..oyyo..bbb.",".bbb..o.y...bbb.",".bbb....y...bbb.","................"]},"blender":{"bg":"ffffff","c":{"o":"e87d0d","w":"ffffff","b":"265787"},"p":["................","................","................",".......ooooo....","ooooooooooooo...",".ooooooowwwooo..","...oooowwwwwooo.","oooooowwbbbwwoo.","..oooowbbbbbwoo.","....oowbbbbbwoo.","....oowwbbbwwoo.","....ooowwwwwooo.",".....ooowwwooo..","......ooooooo...",".......ooooo....","................"]},"epicgames":{"bg":"2a2a2a","c":{"w":"ffffff","k":"121212"},"p":["................",".wwwwwwwwwwwwww.",".wkkkkkkkkkkkkw.",".wkwwwwkwwwkkkw.",".wkwkkkkwkwkkkw.",".wkwwwkkwwwkkkw.",".wkwkkkkwkkkkkw.",".wkwwwwkwkkkkkw.",".wkkkkkkkkkkkkw.",".wkkkkkkkkkkkkw.",".wkkkkkkkkkkkkw.","..wkkkkkkkkkkw..","...wwkkkkkkww...",".....wwkkww.....",".......ww.......","................"]},"nvidia":{"bg":"1a1a1a","c":{"g":"76b900","w":"ffffff"},"p":["................","................","................","....gggggggg....","..gggggggggggg..",".ggggwwwwwwwggg.",".gggwwwggggwwgg.","ggggwwggwwggwwgg","ggggwwggwwggwwgg","ggggwwwggggwwgg.",".ggggwwwwwwwggg.","..gggggggggggg..","....gggggggg....","................","................","................"]},"plex":{"bg":"1f1f1f","c":{"y":"ebaf00"},"p":["................","................","....yyyy........",".....yyyy.......","......yyyy......",".......yyyy.....","........yyyy....",".........yyyy...",".........yyyy...","........yyyy....",".......yyyy.....","......yyyy......",".....yyyy.......","....yyyy........","................","................"]},"netflix":{"bg":"000000","c":{"r":"e50914","d":"b1060f"},"p":["................","....rr....dd....","....rr....dd....","....drr...dd....","....drr...dd....","....ddrr..dd....","....ddrr..dd....","....dd.rr.dd....","....dd.rr.dd....","....dd..rrdd....","....dd..rrdd....","....dd...rrd....","....dd...rrd....","....dd....rr....","....dd....rr....","................"]},"figma":{"bg":"1e2433","c":{"r":"f24e1e","s":"ff7262","p":"a259ff","b":"1abcfe","g":"0acf83"},"p":["................","................",".....rrrsss.....","....rrrrssss....","....rrrrssss....",".....rrrsss.....",".....ppp.bb.....","....ppppbbbb....","....ppppbbbb....",".....ppp.bb.....",".....ggg........","....gggg........","....gggg........",".....gg.........","................","................"]},"github":{"bg":"ffffff","c":{"k":"181717","w":"ffffff"},"p":[".....kkkkkk.....","...kkkkkkkkkk...","..kkwkkkkkkwkk..",".kkkwwkkkkwwkkk.",".kkkwwwwwwwwkkk.","kkkwwwwwwwwwwkkk","kkkwwwwwwwwwwkkk","kkkwwwwwwwwwwkkk","kkkkwwwwwwwwkkkk","kkkkkwwwwwwkkkkk","kkwwkkwwwwkkkkkk",".kkwwkwwwwkkkkk.",".kkkkkwwwwkkkkk.","..kkkkkkkkkkkk..","...kkkkkkkkkk...",".....kkkkkk....."]},"playstation":{"bg":"0070d1","c":{"w":"ffffff"},"p":["................","................",".....www........",".....wwwwww.....",".....www..ww....",".....www..ww....",".....www.www....",".....wwwwww.....",".....www........","..wwwwwww.wwwww.",".ww..www.....ww.",".wwwwwww.wwwww..","......ww........","................","................","................"]},"amd":{"bg":"000000","c":{"w":"ffffff"},"p":["................","................","..wwwwwwwwwwww..","...wwwwwwwwwww..","...........www..","...........www..","...ww......www..","...www.....www..","...wwww....www..","...wwwww...www..","...wwwwww..www..","...wwwwww..www..","............ww..","................","................","................"]},"applemusic":{"bg":"fa243c","c":{"w":"ffffff"},"p":["................","................",".........wwwww..","......wwwwwwww..","......wwwww..w..","......ww.....w..","......ww.....w..","......ww.....w..","......ww.....w..","......ww..wwww..","......ww.wwwww..","...wwwww..www...","..wwwwww........","..wwwww.........","...www..........","................"]},"instagram":{"bg":"d62976","c":{"a":"feda75","b":"fa7e1e","c":"d62976","d":"962fbf","e":"4f5bd5","w":"ffffff"},"p":["..ccbbbbbbaaaa..",".ccccbbbbbbaaaa.","ccccccbbbbbbaaaa","ccccwwwwwwwwbaaa","dccwccccbbbbwbaa","ddcwcccwwbwbwbba","dddwccwccwbbwbbb","dddwcwccccwbwbbb","dddwdwccccwcwbbb","dddwddwccwccwbbb","eddwdddwwcccwcbb","eedwddddccccwccb","eeedwwwwwwwwcccc","eeeeddddddcccccc",".eeeeddddddcccc.","..eeeeddddddcc.."]},"x":{"bg":"000000","c":{"w":"ffffff"},"p":["................","................","................",".wwww.......ww..","..wwww.....ww...","...wwww...ww....","....wwwwww......",".....wwwww......",".....wwwwww.....","....ww.wwwww....","...ww...wwwww...","..ww.....wwwww..",".ww.......wwwww.","................","................","................"]},"reddit":{"bg":"ff4500","c":{"w":"ffffff","o":"ff4500"},"p":["................","...........ww...",".........w.ww...",".........w......","........w.......","........w.......",".wwwwwwwwwwwwww.",".wwwwwwwwwwwwww.",".wwwwowwwwowwww.","..wwooowwoooww..","..wwwowwwwowww..","..wwwwwwwwwwww..","...wwowwwwoww...","....wwooooww....","................","................"]},"facebook":{"bg":"0866ff","c":{"b":"0866ff","w":"ffffff"},"p":[".....bbbbbb.....","...bbbbbbbbbb...","..bbbbbbwwwwbb..",".bbbbbbwwwwwbbb.",".bbbbbbwwbbbbbb.","bbbbbbbwwbbbbbbb","bbbbbwwwwwwwbbbb","bbbbbwwwwwwwbbbb","bbbbbbbwwbbbbbbb","bbbbbbbwwbbbbbbb","bbbbbbbwwbbbbbbb",".bbbbbbwwbbbbbb.",".bbbbbbwwbbbbbb.","..bbbbbwwbbbbb..","...bbbbwwbbbb...",".....bbbbbb....."]},"tiktok":{"bg":"000000","c":{"c":"25f4ee","r":"fe2c55","w":"ffffff"},"p":["................","................",".......cc.......",".......cww......",".......cwww.....",".......cwwww....",".......cwwrww...",".......cwwr.rr..",".......cwwr.....","....ccccwwr.....","...ccwwwwwr.....","...cwwrrwwr.....","....wwrcwwr.....",".....wwwwrr.....","......rrrr......","................"]},"gmail":{"bg":"ffffff","c":{"b":"4285f4","g":"34a853","r":"ea4335","y":"fbbc05","d":"c5221f"},"p":["................","................","................",".dd..........yy.",".ddr........ryy.",".brrr......rrrg.",".bbrrr....rrrgg.",".bbbrrr..rrrggg.",".bbb.rrrrrr.ggg.",".bbb..rrrr..ggg.",".bbb........ggg.",".bbb........ggg.",".bbb........ggg.",".bbb........ggg.","................","................"]},"signal":{"bg":"3b45fd","c":{"w":"ffffff"},"p":["................",".......ww.......",".....wwwwwww....","....wwwwwwwww...","...wwwwwwwwwww..","...wwwwwwwwwww..","..wwwwwwwwwwww..","..wwwwwwwwwwww..","...wwwwwwwwwww..","...wwwwwwwwwww..","...wwwwwwwwwww..","....wwwwwwwww...",".ww..wwwwwww....",".www............",".ww.............","................"]},"brave":{"bg":"ffffff","c":{"o":"fb542b","d":"d63d18","w":"ffffff"},"p":["................","....oooooooo....","..oooooooooooo..",".oooooooooooooo.",".oooooooooooooo.",".ooowwoooowwooo.",".oooowwoowwoooo.","..oooooooooooo..","..oooooooooooo..","..ooooowwooooo..","...oooowwoooo...","...oooooooooo...","....oooooooo....",".....dddddd.....","......dddd......","................"]},"opera":{"bg":"ffffff","c":{"r":"ff1b2d","d":"c8102e"},"p":["......rrrr......","....rrrrrrrr....","...drrr..rrrr...","..ddrr....rrrr..","..ddrr....rrrr..",".dddr......rrrr.",".dddr......rrrr.",".dddr......rrrr.",".dddr......rrrr.",".dddr......rrrr.",".dddr......rrrr.","..ddrr....rrrr..","..ddrr....rrrr..","...drrr..rrrr...","....rrrrrrrr....","......rrrr......"]},"gimp":{"bg":"ffffff","c":{"g":"8c8073","d":"5c5146","w":"ffffff","k":"1e2433","o":"f39c12"},"p":["................","..gg.......gg...","..ggg.....ggg...","..gggggggggggg..",".gggggggggggggg.",".ggwwkggggwwkgg.",".ggwwkggggwwkgg.",".gggggggggggggg.","..gggggddgggggg.","...gggddddggggg.","....ggggggggg...","......ggggg...o.",".............o..","............o...","...........o....","................"]},"obsidian":{"bg":"1e1e1e","c":{"p":"7c3aed","l":"a78bfa","d":"4c1d95"},"p":["................",".......pp.......","......pplp......",".....pplllp.....","....pppllllp....","....ppplllllp...","...pppplllllp...","...ppppplllllp..","...pppppdllllp..","....ppppddlllp..","....pppdddllp...",".....pppdddlp...","......ppddddp...",".......pdddp....","........ppp.....","................"]},"soundcloud":{"bg":"ff5500","c":{"w":"ffffff"},"p":["................","................","................","................",".........w......",".......wwwww....",".....w.wwwww....","...w.wwwwwwwww..",".w.w.w.wwwwwwww.",".w.w.w.wwwwwwww.",".w.w.w.wwwwwww..",".w.w.w.wwwwwww..","................","................","................","................"]},"battledotnet":{"bg":"191b21","c":{"b":"148eff","l":"6ec1ff"},"p":["................",".....bbbbbb.....","....bbbbbbbb....","...bbbb..bbbb...","..bbb..ll..bbb..",".bbb...llll.bbb.",".bbb.l...ll.bbb.",".bb.ll....ll.bb.",".bb.ll....ll.bb.",".bbb.ll..ll.....",".bbb.llllll.....","..bbb..ll.......","...bbbb..bb.....","....bbbbbbbb....",".....bbbbbb.....","................"]},"riotgames":{"bg":"eb0029","c":{"w":"ffffff"},"p":["................","................","....ww.ww.ww....","...wwwwwwwwww...","..wwwwwwwwwwww..","..wwwwwwwwwwww..","..ww.wwwwwwwww..","...wwwwwwwwwww..","....wwwwwwwww...",".....wwwwwww....","................","..wwwwwwwwwwww..","..wwwwwwwwwwww..","................","................","................"]},"msi":{"bg":"000000","c":{"r":"ff0000","d":"a30000","w":"ffffff"},"p":["................","................","...rr......rr...","...rrr....rrr...","....rrrrrrrr....","....rrwrrwrr....",".....rrrrrr.....","......dddd......","................","..wwww..www.w...","..w.w.w.w.......","..w.w.w.www.w...","..w.w.w...w.w...","..w.w.w.www.w...","................","................"]}};
  var APPS = [["spotify","Spotify"],["discord","Discord"],["youtube","YouTube"],["twitch","Twitch"],["steam","Steam"],["obsstudio","OBS Studio"],["streamlabs","Streamlabs"],["kick","Kick"],["vlcmediaplayer","VLC media player"],["googlechrome","Google Chrome"],["firefoxbrowser","Firefox Browser"],["zoom","Zoom"],["teamspeak","TeamSpeak"],["whatsapp","WhatsApp"],["telegram","Telegram"],["notion","Notion"],["davinciresolve","DaVinci Resolve"],["audacity","Audacity"],["blender","Blender"],["epicgames","Epic Games"],["nvidia","NVIDIA"],["plex","Plex"],["netflix","Netflix"],["figma","Figma"],["github","GitHub"],["playstation","PlayStation"],["amd","AMD"],["applemusic","Apple Music"],["instagram","Instagram"],["x","X"],["reddit","Reddit"],["facebook","Facebook"],["tiktok","TikTok"],["gmail","Gmail"],["signal","Signal"],["brave","Brave"],["opera","Opera"],["gimp","GIMP"],["obsidian","Obsidian"],["soundcloud","SoundCloud"],["battledotnet","Battle.net"],["riotgames","Riot Games"]];
  function logoSvg(slug){
    var a = BRAND_ART[slug], r = "";
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
  // Feature cards for an app's plugin show that app's own logo on its tile colour
  document.querySelectorAll("[data-logo]").forEach(function(el){
    var a = BRAND_ART[el.getAttribute("data-logo")];
    if (!a) return;
    el.style.background = "#" + a.bg;
    el.innerHTML = logoSvg(el.getAttribute("data-logo"));
  });
  var apptrack = document.getElementById("apptrack");
  [0, 1].forEach(function(copy){
    APPS.forEach(function(a){
      var s = document.createElement("span");
      s.className = "tk";
      if (copy) s.setAttribute("aria-hidden", "true");
      s.innerHTML = '<span class="logo" style="background:#' + BRAND_ART[a[0]].bg + '">' + logoSvg(a[0]) + '</span>';
      s.appendChild(document.createTextNode(a[1]));
      apptrack.appendChild(s);
    });
  });

  /* deck presses travel to the PC log */
  var stage = document.getElementById("stage");
  var log = document.getElementById("log");
  var packet = document.getElementById("packet");
  function stamp(){ var d = new Date(); return [d.getHours(),d.getMinutes(),d.getSeconds()].map(function(n){return String(n).padStart(2,"0");}).join(":"); }
  function addLog(text){
    var li = document.createElement("li"); li.className = "new";
    var t = document.createElement("time"); t.textContent = stamp();
    var s = document.createElement("span"); s.textContent = text;
    li.appendChild(t); li.appendChild(s);
    log.insertBefore(li, log.firstChild);
    while (log.children.length > 4) log.removeChild(log.lastChild);
  }
  function send(key){
    if (reduce || !packet.animate) return;
    var sr = stage.getBoundingClientRect(), kr = key.getBoundingClientRect(), pr = log.getBoundingClientRect();
    var x0 = kr.left + kr.width/2 - sr.left, y0 = kr.top + kr.height/2 - sr.top;
    var x1 = pr.left + 14 - sr.left, y1 = pr.top + 10 - sr.top;
    packet.animate([
      {transform:"translate("+x0+"px,"+y0+"px)", opacity:1},
      {transform:"translate("+x1+"px,"+y1+"px)", opacity:1}
    ], {duration:520, easing:"steps(8,end)"}).onfinish = function(){ packet.style.opacity = 0; };
  }
  function act(k, btn){
    var anim = {l:k.l, type:k.anim || "press"};
    if (k.act === "mute"){
      state.mute = !state.mute;
      addLog("Mic · " + (state.mute ? "muted" : "on"));
      render({anim:anim});
    } else if (k.act === "live"){
      state.live = !state.live;
      addLog(state.live ? "Go live · website, wait 3 s, type text" : "Go live · ended");
      render({anim:anim});
    } else if (k.act === "record"){
      state.rec = (state.rec + 1) % REC.length;
      addLog("Record · " + REC[state.rec].text.toLowerCase() + " (Win+Alt+R)");
      render({anim:anim});
    } else if (k.flash){
      state.flash = k.l; render({anim:anim});
      addLog(k.log);
      setTimeout(function(){ state.flash = ""; render({}); }, 450);
    } else {
      addLog(k.log);
      if (!reduce && btn.isConnected){ btn.classList.add("a-" + anim.type); setTimeout(function(){ btn.classList.remove("a-" + anim.type); }, 700); }
    }
  }
  function inspect(k){
    var lk = lookOf(k), p = pack(state.cols, state.rows).keys.filter(function(x){ return x.k === k; })[0] || {w:1, h:1};
    var does = k.act === "mute" ? "Mute or unmute the mic" : k.act === "live" ? "3 steps in order" : k.act === "record" ? "Keys · Win+Alt+R" : (k.log || k.l);
    document.getElementById("aw-name").textContent = lk.t;
    document.getElementById("aw-meta").textContent = does + " · " + p.w + " × " + p.h + " button";
  }
  function press(btn){
    var k = KEYMAP[btn.dataset.l];
    if (!k) return;
    state.sel = k.l;
    deck.querySelectorAll(".key.sel").forEach(function(x){ x.classList.remove("sel"); });
    btn.classList.add("sel");
    inspect(k);
    // The press starts on the phone (its key goes down and sends), the window's key lights with it
    var twin = twinOf(btn), onPhone = btn.closest("#mph-deck") ? btn : twin, onDeck = onPhone === btn ? twin : btn;
    if (onDeck) onDeck.classList.add("sel");
    [btn, twin].forEach(function(b){ if (!b) return; b.classList.add("hit"); setTimeout(function(){ b.classList.remove("hit"); }, 220); });
    if (onDeck && !reduce){ onDeck.classList.remove("ping"); void onDeck.offsetWidth; onDeck.classList.add("ping"); }
    send(onPhone && onPhone.offsetParent ? onPhone : btn);
    document.dispatchEvent(new CustomEvent("md:press", {detail:{label:k.l}}));
    setTimeout(function(){ act(k, onDeck || btn); }, reduce ? 0 : 520);
  }
  function pressLabel(label){
    if (label.charAt(0) === "#"){ var n = label.slice(1).split("x"); setSize(+n[0], +n[1]); return; }
    var btn = deck.querySelector('.key[data-l="' + label + '"]');
    if (btn) press(btn);
  }
  render({});
  inspect(KEYMAP[state.sel]);
  addLog("Deck · My profile opened");

