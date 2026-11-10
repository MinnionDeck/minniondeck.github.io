  /* reveal sections below the fold as they scroll in */
  /* Sections (.rv) and the cards inside their grids (.rvc, one after another by --i) start lowered
     and see-through only when they are below the fold of the page being shown; script adds that
     start state, so without script nothing is ever hidden. Runs again on every page change. */
  var REVEAL_GRIDS = ".sims,.steps,.feats,#home-plugs,.faq,.reqs,.ways,.credits,.rules,.allfeat,.mksteps,.flowsteps,.story,.pledge";
  var io = !reduce && "IntersectionObserver" in window ? new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if (en.isIntersecting){ io.unobserve(en.target); popIn(en.target); } });
  }, {rootMargin:"0px 0px -6% 0px", threshold:0.01}) : null;
  // Cards rise in by keyframes, not a transition, so their own hover lift keeps its quick timing
  function popIn(el){
    el.classList.remove("pre");
    if (!el.classList.contains("rvc")) return;
    el.classList.add("pop");
    el.addEventListener("animationend", function end(e){ if (e.target !== el) return; el.classList.remove("pop"); el.removeEventListener("animationend", end); });
  }
  function revealScan(){
    if (!io) return;
    document.querySelectorAll(REVEAL_GRIDS).forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c, n){
        if (!c.classList.contains("rvc")){ c.classList.add("rvc"); c.style.setProperty("--i", String(Math.min(n, 8))); }
      });
    });
    document.querySelectorAll(".rv, .rvc").forEach(function(el){
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;              // on a hidden page: looked at again when it shows
      if (r.top > window.innerHeight * 0.94){ el.classList.add("pre"); io.observe(el); }
      else el.classList.remove("pre");
    });
  }
  revealScan();
  /* The header darkens and gains its shadow once the page has scrolled */
  var topEl = document.querySelector(".top");
  var onScroll = function(){ topEl.classList.toggle("scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* Reading progress under the header */
  var sprog = document.getElementById("sprog"), progQ = false;
  function progress(){
    progQ = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    sprog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
  }
  window.addEventListener("scroll", function(){ if (!progQ){ progQ = true; requestAnimationFrame(progress); } }, {passive:true});
  window.addEventListener("resize", progress); progress();

  /* Cursor spotlight on every card that lifts, including marketplace cards drawn later */
  document.addEventListener("pointermove", function(e){
    if (e.pointerType !== "mouse") return;
    var c = e.target.closest && e.target.closest(".lift");
    if (!c) return;
    if (!c.classList.contains("spot")) c.classList.add("spot");
    var r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, {passive:true});

  /* How it works, by scrolling: the step nearest the middle of the screen lights and sets the picture */
  (function(){
    var vis = document.getElementById("sc-vis"), qr = document.getElementById("sc-qr");
    if (!vis) return;
    // a QR-looking pattern: the three corner squares, then fixed pseudo-random cells
    var cells = "", seed = 7;
    function finder(x, y){
      for (var o of [[0,0],[14,0],[0,14]]){
        var dx = x - o[0], dy = y - o[1];
        if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5)) ? 1 : 0;
      }
      return -1;
    }
    for (var y = 0; y < 21; y++) for (var x = 0; x < 21; x++){
      var f = finder(x, y), on;
      if (f >= 0) on = f; else { seed = (seed * 9301 + 49297) % 233280; on = seed / 233280 > .52 ? 1 : 0; }
      cells += on ? '<i class="k"></i>' : "<i></i>";
    }
    qr.innerHTML = cells;
    var steps = document.querySelectorAll(".sc-steps > li");
    function light(n){
      vis.setAttribute("data-step", n);
      steps.forEach(function(li){ li.classList.toggle("on", li.getAttribute("data-step") === n); });
    }
    light("1");
    if (!("IntersectionObserver" in window)) { steps.forEach(function(li){ li.classList.add("on"); }); return; }
    var so = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting) light(en.target.getAttribute("data-step")); });
    }, {rootMargin:"-45% 0px -45% 0px"});
    steps.forEach(function(li){ so.observe(li); });
  })();

