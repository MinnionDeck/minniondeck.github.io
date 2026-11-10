  /* One tab for the app: Minniondeck opens "?app#gifs" in the browser. If this site is already open
     in another tab, that tab turns to the page and this new one closes; otherwise it stays. */
  // a page at its own address (/download/, /docs/install/ ...) says which view it is
  var start = document.documentElement.getAttribute("data-route") || currentRoute();
  var fromApp = /[?&]app\b/.test(location.search);
  // the app (and old links) open "/?app#gifs" or "/#download": the address becomes /gifs/ or /download/
  if (VIEWS[start.split("/")[0]] && (fromApp || (location.hash && start === location.hash.slice(1)))) history.replaceState(null, "", routeHref(start));
  var tabs = "BroadcastChannel" in window ? new BroadcastChannel("minniondeck-site") : null;
  if (tabs) tabs.onmessage = function(e){
    var m = e.data || {};
    if (m.type !== "open") return;
    tabs.postMessage({ type: "here", id: m.id });
    if (currentRoute() !== m.view) history.pushState(null, "", routeHref(m.view));
    show(m.view); window.scrollTo(0,0); window.focus();
  };
  if (fromApp && tabs){
    var ask = Math.random().toString(36).slice(2), answered = false;
    tabs.addEventListener("message", function(e){
      if (!e.data || e.data.type !== "here" || e.data.id !== ask || answered) return;
      answered = true;
      tabs.onmessage = null;   // this tab is going: it takes no more requests
      window.close();          // a browser that won't close it just keeps showing the page
    });
    tabs.postMessage({ type: "open", id: ask, view: start });
  }
  show(start);
