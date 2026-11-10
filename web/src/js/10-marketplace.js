  /* marketplace: the plugin list comes from index.json, the same file the app's Plugins page will read */
  var MK = {data:null, cat:"all", q:"", sort:"name"};
  // The same four uses as Minniondeck Setup's first page
  var CATS = [["all","All"],["general","General"],["streaming","Streaming"],["games","Games"],["work","Work"]];
  var CATNAME = {general:"General", streaming:"Streaming", games:"Games", work:"Work"};
  var mkGrid = document.getElementById("mk-grid"), mkList = document.getElementById("mk-list"), mkDetail = document.getElementById("mk-detail");
  var mkQ = document.getElementById("mk-q"), mkSort = document.getElementById("mk-sort"), mkCats = document.getElementById("mk-cats");

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function size(b){ return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB"; }
  function byId(id){ return MK.data && MK.data.plugins.filter(function(p){ return p.id === id; })[0]; }
  // The link the desktop app opens: it looks the plugin up on GitHub itself, so only the id and version go in it
  function appLink(p, v){
    return "minniondeck://install?id=" + encodeURIComponent(p.id) + (v && v !== p.version ? "&v=" + encodeURIComponent(v) : "");
  }
  function profileUrl(p){
    var base = MK.data.release_base;
    return base && p.profile ? base.replace(/\/$/, "") + "/" + p.id + "/" + p.profile.file : "";
  }
  function fileUrl(p, v){
    var base = MK.data.release_base;
    v = v || p.version;
    return base ? base.replace(/\/$/, "") + "/" + p.id + "/" + p.id + "-" + v + ".mdplugin" : "";
  }

  function mkLoad(then){
    if (MK.data) return then();
    mkGrid.innerHTML = '<div class="mk-msg frame" style="grid-column:1/-1"><div class="ldr"><i></i><i></i><i></i></div><p>Reading the plugin list…</p></div>';
    fetch("index.json", {cache:"no-cache"})
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(d){ MK.data = d; then(); })
      .catch(function(){
        mkList.hidden = false; mkDetail.hidden = true;
        mkGrid.innerHTML = '<div class="mk-msg frame" style="grid-column:1/-1"><p>The plugin list didn\'t load. Check your connection and try again.</p><button type="button" class="btn plain" id="mk-retry">Try again</button></div>';
        document.getElementById("mk-retry").onclick = function(){ mkLoad(then); };
      });
  }

  function mkOpen(id){
    mkLoad(function(){
      mkList.hidden = !!id;
      mkDetail.hidden = !id;
      if (id) mkShowDetail(id); else mkShowList();
    });
  }

  function mkShowList(){
    var all = MK.data.plugins, q = MK.q.trim().toLowerCase();
    mkCats.innerHTML = CATS.map(function(c){
      var n = c[0] === "all" ? all.length : all.filter(function(p){ return p.category === c[0]; }).length;
      return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (MK.cat === c[0]) + '">' + c[1] + '<small>' + n + '</small></button>';
    }).join("");
    var list = all.filter(function(p){
      if (MK.cat !== "all" && p.category !== MK.cat) return false;
      if (!q) return true;
      return [p.name, p.summary, p.id, CATNAME[p.category]].concat(p.actions).join(" ").toLowerCase().indexOf(q) >= 0;
    });
    list.sort(function(a, b){
      if (MK.sort === "keys") return b.actions.length - a.actions.length;
      if (MK.sort === "size") return a.size - b.size;
      return a.name.localeCompare(b.name);
    });
    document.getElementById("mk-count").textContent = list.length === 1 ? "1 plugin" : list.length + " plugins";
    if (!list.length){
      var soonCat = (MK.cat === "streaming" || MK.cat === "games" || MK.cat === "work") && !q;
      mkGrid.innerHTML = '<div class="mk-empty frame" style="grid-column:1/-1">' +
        (soonCat ? '<span class="chip soon">Coming soon</span><h3>No ' + CATNAME[MK.cat].toLowerCase() + ' plugins yet</h3><p>Official ' + CATNAME[MK.cat].toLowerCase() + ' plugins are on the way. You can also build one and send it in.</p><a class="btn plain" href="#mk-submit" data-jump="mk-submit">How to add a plugin</a>'
                 : '<h3>Nothing matches “' + esc(MK.q) + '”</h3><p>Try a plugin name or a key, like “timer” or “volume”.</p><button type="button" class="btn plain" data-clear="1">Clear search</button>') + '</div>';
      return;
    }
    mkGrid.innerHTML = list.map(plugCard).join("");
  }
  // One plugin card, as the marketplace shows it (the home page uses the same cards)
  function plugCard(p, n){
      // The plugin's profile as it looks in the app; otherwise its keys' pictures
      var art = p.preview
        ? '<img class="deck" src="' + esc(p.preview) + '" alt="' + esc(p.name) + ' profile in Minniondeck" loading="lazy">'
        : p.shots.length >= 4
        ? '<div class="grid8">' + p.shots.slice(0, 8).map(function(s){ return '<img class="px" src="' + esc(s) + '" alt="">'; }).join("") + '</div>'
        : '<div class="solo"><img class="px" src="' + esc(p.icon) + '" alt=""><div class="bars" style="height:40px"><i></i><i></i><i></i><i></i><i></i></div></div>';
      return '<article class="plug frame lift in" style="animation-delay:' + (n * 0.06) + 's">' +
        '<div class="shot' + (p.preview ? " prev" : "") + '" style="--c:var(--' + esc(p.color || "sky") + ')" data-view="marketplace/' + esc(p.id) + '">' + art + '</div>' +
        '<div class="body"><h3><img class="px" src="' + esc(p.icon) + '" alt="">' + esc(p.name) + '</h3><p>' + esc(p.summary) + '</p>' +
        '<div class="meta">' + (p.official ? '<span class="chip ok">Official</span>' : '<span class="chip">Community</span>') +
        '<span class="chip">' + esc(CATNAME[p.category] || p.category) + '</span><span class="chip">v' + esc(p.version) + '</span><span class="chip">' + p.actions.length + (p.actions.length === 1 ? " key" : " keys") + '</span></div>' +
        '<div class="acts"><a class="btn plain" href="' + routeHref("marketplace/" + p.id) + '" data-view="marketplace/' + esc(p.id) + '">Details</a><a class="btn mint" href="' + esc(appLink(p)) + '" data-install="' + esc(p.id) + '">Install</a></div></div></article>';
  }
  // Home page: the same cards for a few official plugins, read from the same list
  var homePlugs = document.getElementById("home-plugs"), HOME_PICKS = ["minnion_spotify", "minnion_timer", "minnion_sysmon", "minnion_soundboard", "minnion_weather"];
  fetch("index.json", {cache:"no-cache"}).then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); }).then(function(d){
    if (!MK.data) MK.data = d;
    var picks = HOME_PICKS.map(byId).filter(Boolean);
    if (picks.length) homePlugs.innerHTML = picks.map(plugCard).join("");
  }).catch(function(){});
  homePlugs.addEventListener("click", function(e){
    var b = e.target.closest("[data-install]");
    if (b && MK.data){ openInstall(b.getAttribute("data-install"), b.getAttribute("data-ver")); }
  });

  function mkShowDetail(id){
    var p = byId(id);
    if (!p){
      mkDetail.innerHTML = '<a class="back" href="' + routeHref("marketplace") + '" data-view="marketplace">← All plugins</a><div class="mk-empty frame"><h3>That plugin isn\'t in the list</h3><p>It may have been renamed or removed.</p></div>';
      return;
    }
    var li = function(t){ return "<li>" + esc(t) + "</li>"; };
    mkDetail.innerHTML =
      '<a class="back" href="' + routeHref("marketplace") + '" data-view="marketplace">← All plugins</a>' +
      '<div class="pd">' +
        (p.preview
          ? '<div class="pd-shot prev frame" style="--c:var(--' + esc(p.color || "sky") + ')"><img class="deck" src="' + esc(p.preview) + '" alt="' + esc(p.name) + ' profile in Minniondeck"></div>'
          : '<div class="pd-shot frame" style="--c:var(--' + esc(p.color || "sky") + ')"><div class="pd-keys">' +
              p.shots.map(function(s, n){ return '<span style="animation-delay:' + (n * 0.035) + 's"><img class="px" src="' + esc(s) + '" alt=""></span>'; }).join("") +
            '</div></div>') +
        '<div class="pd-info">' +
          '<span class="label">' + esc(CATNAME[p.category] || p.category) + (p.official ? " · Official" : " · Community") + '</span>' +
          '<h1><img class="px" src="' + esc(p.icon) + '" alt="">' + esc(p.name) + '</h1>' +
          '<p>' + esc(p.about) + '</p>' +
          '<div class="pd-meta"><span class="chip">v' + esc(p.version) + '</span><span class="chip">' + p.actions.length + (p.actions.length === 1 ? " key" : " keys") + '</span><span class="chip">Plugin API ' + esc(p.api) + '</span><span class="chip">By ' + esc(p.author) + '</span>' + (p.profile ? '<span class="chip ok">Includes a profile</span>' : "") + '</div>' +
          '<div class="pd-get"><a class="btn mint" href="' + esc(appLink(p)) + '" data-install="' + esc(p.id) + '">Install v' + esc(p.version) + '</a><span class="mk-count">Opens Minniondeck · ' + size(p.size) + ' from GitHub</span></div>' +
          '<div class="hash">SHA-256<code title="' + esc(p.sha256) + '">' + esc(p.sha256) + '</code><button type="button" class="mini" data-copy="' + esc(p.sha256) + '">Copy</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="pd-grid">' +
        '<div class="pd-box frame"><h3>Keys it adds</h3><div class="tags">' + p.actions.map(function(a){ return '<span class="chip">' + esc(a) + '</span>'; }).join("") + '</div></div>' +
        '<div class="pd-box frame"><h3>What you need</h3><ul>' + (p.needs.length ? p.needs.map(li).join("") : "<li>Nothing else</li>") + '</ul>' +
          '<h3 style="margin-top:6px">Settings</h3><ul>' + (p.settings.length ? p.settings.map(li).join("") : "<li>None, it just works</li>") + '</ul></div>' +
        '<div class="pd-box frame"><h3>Versions</h3><table class="vers"><tbody>' + p.versions.map(function(v, n){
          return '<tr><td>v' + esc(v.v) + (n === 0 ? ' <span class="chip ok">Latest</span>' : "") + '</td><td>' + size(v.size) + '</td><td><a class="mini" href="' + esc(appLink(p, v.v)) + '" data-install="' + esc(p.id) + '" data-ver="' + esc(v.v) + '">Install</a></td></tr>';
        }).join("") + '</tbody></table></div>' +
      '</div>' +
      (p.profile ? '<div class="pd-box frame" style="margin-top:20px"><h3>Comes with a profile</h3><p>' + esc(p.profile.name) + ', ' + p.profile.pages + (p.profile.pages === 1 ? " page" : " pages") + '. After the plugin installs, Minniondeck offers to add it to your profiles, so the buttons are ready.</p><div class="pd-get"><a class="mini" href="' + esc(profileUrl(p)) + '" download>Download ' + esc(p.profile.file) + '</a></div><div class="hash">SHA-256<code title="' + esc(p.profile.sha256) + '">' + esc(p.profile.sha256) + '</code><button type="button" class="mini" data-copy="' + esc(p.profile.sha256) + '">Copy</button></div></div>' : "");
  }

  /* install dialog */
  var inst = document.getElementById("inst"), instDl = document.getElementById("inst-dl"), instPending = document.getElementById("inst-pending");
  function openInstall(id, ver){
    var p = byId(id);
    if (!p) return;
    var v = ver || p.version, vi = p.versions.filter(function(x){ return x.v === v; })[0] || {size:p.size};
    var url = fileUrl(p, v);
    document.getElementById("inst-icon").src = p.icon;
    document.getElementById("inst-title").textContent = p.name;
    document.getElementById("inst-sub").textContent = "v" + v + (v === p.version ? " · latest" : " · older version");
    document.getElementById("inst-file").textContent = p.id + "-" + v + ".mdplugin · " + size(vi.size);
    document.getElementById("inst-prof").textContent = p.profile ? " Then it offers to add the " + p.profile.name + " profile." : "";
    var pli = document.getElementById("inst-pli");
    pli.hidden = !(p.profile && profileUrl(p));
    if (!pli.hidden){ document.getElementById("inst-pfile").textContent = p.profile.file + " · " + size(p.profile.size); document.getElementById("inst-pdl").href = profileUrl(p); }
    document.getElementById("inst-name2").textContent = p.name + " " + v;
    document.getElementById("inst-again").href = appLink(p, v);
    document.querySelector("#inst .nope").open = false;
    instDl.href = url || "#";
    if (url) instDl.setAttribute("download", ""); else instDl.removeAttribute("download");
    instDl.textContent = "Download .mdplugin";
    instPending.hidden = true;
    if (inst.showModal) inst.showModal(); else inst.setAttribute("open", "");
  }
  instDl.addEventListener("click", function(e){
    if (instDl.getAttribute("href") !== "#") return;
    e.preventDefault();
    instPending.hidden = false;
    instPending.classList.remove("ping"); void instPending.offsetWidth; instPending.classList.add("ping");
  });
  document.getElementById("inst-x").onclick = function(){ inst.close ? inst.close() : inst.removeAttribute("open"); };
  inst.addEventListener("click", function(e){
    if ((e.target === inst || e.target.closest("[data-view]")) && inst.close) inst.close();
  });

  mk.addEventListener("click", function(e){
    var b = e.target.closest("[data-install]");
    if (b){ openInstall(b.getAttribute("data-install"), b.getAttribute("data-ver")); return; }
    var c = e.target.closest("[data-cat]");
    if (c){ MK.cat = c.getAttribute("data-cat"); mkShowList(); return; }
    if (e.target.closest("[data-clear]")){ MK.q = ""; mkQ.value = ""; mkShowList(); mkQ.focus(); return; }
    var j = e.target.closest("[data-jump]");
    if (j){ e.preventDefault(); document.getElementById(j.getAttribute("data-jump")).scrollIntoView({behavior: reduce ? "auto" : "smooth"}); return; }
    var cp = e.target.closest("[data-copy]");
    if (cp){
      var done = function(t){ cp.textContent = t; setTimeout(function(){ cp.textContent = "Copy"; }, 1400); };
      try { navigator.clipboard.writeText(cp.getAttribute("data-copy")).then(function(){ done("Copied"); }, function(){ done("Select it"); }); }
      catch (err) { done("Select it"); }
    }
  });
  mkQ.addEventListener("input", function(){ MK.q = mkQ.value; if (MK.data) mkShowList(); });
  mkSort.addEventListener("change", function(){ MK.sort = mkSort.value; if (MK.data) mkShowList(); });

