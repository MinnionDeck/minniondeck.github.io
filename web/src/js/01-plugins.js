  /* The plugin list: the live index.json in the Minnion-Plugins repo, the same file the app reads,
     fetched once per page and shared by the marketplace, the home page, the command menu and the
     download preview. The site's own index.json is the fallback when GitHub is slow or down, and it
     adds what only the site has: "preview", the profile screenshot in shots/. */
  var PLUGINS_URL = "https://raw.githubusercontent.com/minnnion/Minnion-Plugins/main/index.json";
  var pluginsP = null;
  function getList(url, ms){
    var ctl = window.AbortController ? new AbortController() : null;
    var t = ctl ? setTimeout(function(){ ctl.abort(); }, ms) : 0;
    return fetch(url, ctl ? {cache:"no-cache", signal:ctl.signal} : {cache:"no-cache"})
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(d){
        clearTimeout(t);
        if (!d || !Array.isArray(d.plugins)) throw new Error("not a plugin list");
        // one odd entry must not stop the rest from showing
        d.plugins = d.plugins.filter(function(p){ return p && p.id && p.name; });
        d.plugins.forEach(function(p){
          ["shots", "actions", "needs", "settings", "versions"].forEach(function(k){ if (!Array.isArray(p[k])) p[k] = []; });
        });
        return d;
      }, function(e){ clearTimeout(t); throw e; });
  }
  function pluginList(){
    if (pluginsP) return pluginsP;
    var own = getList("index.json", 8000).catch(function(){ return null; });
    pluginsP = getList(PLUGINS_URL, 5000).then(function(live){
      return own.then(function(o){
        var extra = {};
        ((o && o.plugins) || []).forEach(function(p){ extra[p.id] = p; });
        live.plugins.forEach(function(p){ var x = extra[p.id]; if (x && x.preview && !p.preview) p.preview = x.preview; });
        return live;
      });
    }, function(){
      return own.then(function(o){ if (!o) throw new Error("no plugin list"); return o; });
    }).catch(function(e){ pluginsP = null; throw e; });
    return pluginsP;
  }

