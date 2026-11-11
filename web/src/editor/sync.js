  /* ===== Sync, on the editor page MinnionDeck serves =====
     MinnionDeck opens http://127.0.0.1:<port>/editor/?token=<32 hex>#images (or #gifs). The page and
     the app are on the same address, so it simply asks: GET /v1/session, GET /v1/image (the button's
     picture to start from), POST /v1/image (Sync). It also listens on /v1/events: when Edit image is
     pressed again, the app tells this tab (it answers POST /v1/ack) and the tab opens the new button,
     so the app doesn't open another tab. */
  var DESK = null;
  var DESK_TOKEN = (new URLSearchParams(location.search).get("token") || "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(DESK_TOKEN)) DESK_TOKEN = "";
  function deskFetch(path, opts, more){ return fetch(path + "?token=" + DESK.token + (more || ""), Object.assign({ cache: "no-store" }, opts || {})); }
  function deskJson(r){ return r.json().catch(function(){ return { ok: false, error: "MinnionDeck sent an answer this page can't read (" + r.status + ")." }; }); }
  var DESK_OFFLINE = "MinnionDeck isn't answering. Is it still open? Press Edit image in it again.";

  function deskRefresh(msg){
    var st = DESK ? DESK.state : "none";
    document.querySelectorAll("[data-desk]").forEach(function(bar){
      bar.hidden = false;
      bar.className = "desk-bar frame " + (st === "none" ? "expired" : st);
      var text = st === "none" ? "Open this from MinnionDeck: Edit button › Edit image."
        : st === "checking" ? "Connecting to MinnionDeck…"
        : st === "linked" ? "Editing " + (DESK.name ? "“" + DESK.name + "”" : "the button") + " in MinnionDeck. " + (DESK.note || "Sync puts your picture straight on it.")
        : st === "expired" ? (DESK.error || "This Edit window was closed. Press Edit image in MinnionDeck again.")
        : DESK_OFFLINE;
      bar.innerHTML = '<i aria-hidden="true"></i><span></span>' + (st === "offline" ? '<button type="button" class="mini" data-desk-retry>Try again</button>' : "");
      bar.querySelector("span").textContent = text;
    });
    document.querySelectorAll("[data-sync]").forEach(function(box){
      var b = box.querySelector('[data-a="sync"]'), p = box.querySelector("[data-sync-msg]");
      b.disabled = st !== "linked";
      if (msg && box.contains(msg.el)) return;
      p.textContent = st === "linked" ? "Puts this on " + (DESK.name ? "“" + DESK.name + "”" : "the button") + " in MinnionDeck." : "Sync works while the Edit button window is open in MinnionDeck.";
    });
  }
  function deskSay(el, text, ok){ if (!el) return; el.textContent = text; el.classList.toggle("bad", ok === false); el.classList.toggle("good", ok === true); }
  function deskStart(){
    if (!DESK_TOKEN){ DESK = null; deskRefresh(); return; }
    DESK = { token: DESK_TOKEN, state: "checking" };
    deskRefresh();
    deskFetch("/v1/session").then(function(r){ return deskJson(r).then(function(j){ return [r, j]; }); }).then(function(a){
      var r = a[0], j = a[1];
      if (!r.ok || !j.ok){ DESK.state = r.status === 401 ? "expired" : "offline"; DESK.error = j.error; deskRefresh(); return; }
      DESK.state = "linked"; DESK.kind = j.kind === "gif" ? "gif" : "image"; DESK.name = String(j.name || "").slice(0, 40);
      if (!j.has_image) DESK.note = "It has no picture yet, so you start from a blank one.";
      deskRefresh();
      // the button's picture, once per Edit image (a reload doesn't bring it in again)
      var seen = ""; try { seen = sessionStorage.getItem("md.editor.loaded") || ""; } catch (e) {}
      if (seen === DESK.token) return;
      // a picture made here before opens as it was left, every layer still separate
      if (DESK.kind === "image" && j.design){
        deskFetch("/v1/design").then(function(r4){ return r4.ok ? r4.json() : null; }).then(function(dj){
          if (!dj || !Array.isArray(dj.layers)) return deskLayers(j);
          try { sessionStorage.setItem("md.editor.loaded", DESK.token); } catch (e) {}
          DESK.note = "It's open below as you left it, with its layers. Change them, then press Sync.";
          deskRefresh();
          show("images"); imgTab("design"); MAKERS.design.loadDesign(dj, DESK.name || "From MinnionDeck");
        }, function(){ deskLayers(j); });
        return;
      }
      deskLayers(j);
    }, function(){ DESK.state = "offline"; deskRefresh(); });
  }
  // a picture look comes as layers (the button, then its icon) when the app has them
  function deskLayers(j){
    if (!(DESK.kind === "image" && j.layers > 0)) return deskPicture(j);
    deskFetch("/v1/layers").then(function(r3){ return r3.ok ? r3.json() : null; }).then(function(lj){
      if (!lj || !lj.ok || !lj.layers || !lj.layers.length) return deskPicture(j);
      try { sessionStorage.setItem("md.editor.loaded", DESK.token); } catch (e) {}
      DESK.note = "It's open below as layers: the button at the bottom, the icon on top. Change them, then press Sync.";
      deskRefresh();
      show("images"); imgTab("design"); MAKERS.design.loadLayers(lj.layers, lj.size, DESK.name || "From MinnionDeck");
    }, function(){ deskPicture(j); });
  }
  // the flattened picture, for GIFs and for an app without layers
  function deskPicture(j){
      if (!j.has_image) return;
      deskFetch("/v1/image").then(function(r2){ return r2.ok ? r2.blob() : null; }).then(function(bl){
        if (!bl || !bl.size){ DESK.note = "Its picture didn't come through. You can still make one and press Sync."; deskRefresh(); return; }
        try { sessionStorage.setItem("md.editor.loaded", DESK.token); } catch (e) {}
        DESK.note = "Its picture is open below. Draw on it, then press Sync.";
        deskRefresh();
        deskBring(bl);
      }, function(){});
  }
  function deskBring(blob){
    var name = DESK.name || "From MinnionDeck";
    if (DESK.kind === "gif"){ show("gifs"); MAKERS.gif.loadImage(blob, name); }
    else { show("images"); imgTab("pixel"); MAKERS.pixel.loadImage(blob, name); }
  }
  // whole: this picture is the button's own layers, so its icon is in the picture (or was taken out
  // here). The app then stops drawing its icon; for any other picture it keeps it.
  // design: the layers this picture was made from, kept with it so it can be edited in layers again
  function deskSync(blob, el, whole, design){
    if (!DESK || DESK.state !== "linked"){ deskSay(el, "Sync works while the Edit button window is open in MinnionDeck.", false); return; }
    if (!blob){ deskSay(el, "Nothing to send yet.", false); return; }
    if (blob.size > 25 * 1024 * 1024){ deskSay(el, "That's over 25 MB. Try a smaller scale.", false); return; }
    deskSay(el, "Syncing…");
    var send = function(){
      deskFetch("/v1/image", { method: "POST", headers: { "Content-Type": blob.type || "image/png" }, body: blob }, whole ? "&icon=inside" : "").then(function(r){
        return deskJson(r).then(function(j){
          if (r.status === 401){ DESK.state = "expired"; DESK.error = j.error; deskRefresh({ el: el }); }
          deskSay(el, j.ok ? (j.message || "Synced to MinnionDeck") : (j.error || "MinnionDeck didn't take it."), !!j.ok);
        });
      }, function(){ DESK.state = "offline"; deskRefresh({ el: el }); deskSay(el, DESK_OFFLINE, false); });
    };
    // the picture goes either way: without its design it just opens flat next time
    if (design) deskFetch("/v1/design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(design) }).then(send, send);
    else send();
  }
  document.addEventListener("click", function(e){ if (e.target.closest("[data-desk-retry]")) deskStart(); });
  function syncHtml(){ return '<div class="sync" data-sync><button type="button" class="btn mint" data-a="sync" disabled>Sync to MinnionDeck</button><p class="empty2" data-sync-msg aria-live="polite"></p></div>'; }

  // Edit image pressed again while this tab is open: take it here instead of a new tab
  function deskEvents(){
    if (!window.EventSource) return;
    var es = new EventSource("/v1/events"), fails = 0;
    es.onopen = function(){ fails = 0; };
    es.addEventListener("edit", function(e){
      var m = null; try { m = JSON.parse(e.data); } catch (err) {}
      if (!m || !/^[0-9a-f]{32}$/i.test(m.token || "")) return;
      var t = String(m.token).toLowerCase(), view = m.view === "gifs" ? "gifs" : "images";
      fetch("/v1/ack?token=" + t, { method: "POST", cache: "no-store" }).catch(function(){}).then(function(){
        es.close();
        // a fresh page load: the newest editor the app has, on the new button
        location.replace(location.pathname + "?token=" + t + "#" + view);
      });
    });
    es.onerror = function(){ if (es.readyState === 2 || ++fails >= 3){ es.close(); setTimeout(deskEvents, 30000); } };
  }
