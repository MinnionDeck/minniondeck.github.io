  /* The editor page (editor.html) has only the GIF maker and Images, served by MinnionDeck itself.
     These stand in for the website parts the makers use. */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(view){
    view = view === "gifs" ? "gifs" : "images";
    document.getElementById("gifs-view").hidden = view !== "gifs";
    document.getElementById("images-view").hidden = view !== "images";
    document.querySelectorAll(".ed-nav a").forEach(function(a){
      if (a.getAttribute("data-view") === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    makerOpen(view);
  }
