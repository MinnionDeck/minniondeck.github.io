  // Start: the page from the address (#images or #gifs), the link to MinnionDeck, and listening for
  // the next Edit image
  document.querySelector(".ed-nav").addEventListener("click", function(e){
    var a = e.target.closest("[data-view]"); if (!a) return;
    e.preventDefault();
    var v = a.getAttribute("data-view");
    history.replaceState(null, "", location.pathname + location.search + "#" + v);
    show(v);
  });
  show(location.hash.slice(1) || "images");
  deskStart();
  deskEvents();
