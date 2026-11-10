  /* Addresses: every view has its own path (/download/, /docs/install/ ...), no "#".
     SITE_BASE is where the site lives ("/" on its own domain). */
  var SITE_BASE = document.documentElement.getAttribute("data-base") || "/";
  function routeHref(v){ return SITE_BASE + (v && v !== "home" ? v + "/" : ""); }
  function currentRoute(){
    var p = location.pathname;
    if (p.indexOf(SITE_BASE) === 0) p = p.slice(SITE_BASE.length);
    p = p.replace(/(^|\/)index\.html$/, "").replace(/\/+$/, "");
    // an old "#download" link still opens its view
    return p || location.hash.slice(1) || "";
  }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Bug reports and visit counts go through the relay (minnionwebsite/relay) to a private repo.
     A view is the page name; a click is a download or a link off the site. No cookies and no id
     that lasts: sid is random for this tab only. Do Not Track and Global Privacy Control are kept. */
  var RELAY = "", relayQueue = [];
  // relay.json (written by relay/setup.ps1) says where the relay is; views wait until it is known
  fetch("relay.json", {cache:"no-store"}).then(function(r){ return r.ok ? r.json() : {}; }).then(function(j){
    RELAY = /^https:\/\/[\w.-]+$/.test(j.url || "") ? j.url : "";
    var q = relayQueue; relayQueue = null;
    q.forEach(function(a){ track(a[0], a[1]); });
  }, function(){ relayQueue = null; });
  var SID = (function(){ try { var x = sessionStorage.getItem("md.sid"); if (!x){ x = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("md.sid", x); } return x; } catch (e) { return "x" + Math.random().toString(36).slice(2, 10); } })();
  var quiet = navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  var lastView = "";
  function track(type, name){
    if (relayQueue){ relayQueue.push([type, name]); return; }
    if (!RELAY || quiet) return;
    if (type === "view"){ if (name === lastView) return; lastView = name; }
    var body = JSON.stringify({sid:SID, type:type, name:name, ref:type === "view" && !document.referrer.startsWith(location.origin) ? document.referrer.replace(/^https?:\/\//, "").split("/")[0] : "", lang:navigator.language, width:innerWidth});
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(RELAY + "/hit", new Blob([body], {type:"text/plain"})))) fetch(RELAY + "/hit", {method:"POST", body:body, keepalive:true}); } catch (e) {}
  }
  document.addEventListener("click", function(e){
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (a.hasAttribute("download") || /\/releases\/|\.(exe|apk|msi|zip|mdplugin|mdprofile)(\?|$)/i.test(href)) track("event", "download:" + href.split("/").pop().slice(0, 80));
    else if (/^https?:/.test(href) && a.host !== location.host) track("event", "out:" + a.host);
  }, true);

