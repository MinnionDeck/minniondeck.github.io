  /* Submit a plugin: the name, id and version are read from the .mdplugin's manifest.json here,
     then the relay gets the form (POST /submit), each file (PUT, the plugin with a progress bar)
     and "all sent" (POST /submit/<id>/done). It keeps them in the private repo for review. */
  var subForm = document.getElementById("sub-form"), subMsg = document.getElementById("sub-msg"), subSend = document.getElementById("sub-send"), subProg = document.getElementById("sub-prog");
  var subPlugin = null; // { file, sha256, manifest } once the plugin file is read
  var SUB_MAX = { plugin: 90, icon: 1, shot: 5, profile: 2 };
  // One file out of a zip by name: its central directory says where, then stored or deflated
  function zipEntry(buf, want){
    var b = new Uint8Array(buf), v = new DataView(buf), e = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50){ e = i; break; }
    if (e < 0) return Promise.reject(new Error("That isn't a .mdplugin file (it isn't a zip)."));
    var n = v.getUint16(e + 10, true), p = v.getUint32(e + 16, true);
    for (var k = 0; k < n && p + 46 <= b.length; k++){
      var nl = v.getUint16(p + 28, true), name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
      if (name === want){
        var method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), at = v.getUint32(p + 42, true);
        var start = at + 30 + v.getUint16(at + 26, true) + v.getUint16(at + 28, true), data = b.subarray(start, start + size);
        if (method === 0) return Promise.resolve(data);
        if (method !== 8 || typeof DecompressionStream === "undefined") return Promise.reject(new Error("This browser can't read the plugin file. Try a newer Chrome, Edge or Firefox."));
        return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer().then(function(x){ return new Uint8Array(x); });
      }
      p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return Promise.resolve(null);
  }
  function subFill(m){
    var el = subForm.elements;
    el.name.value = m ? m.name : ""; el.id.value = m ? m.id : ""; el.version.value = m ? m.version : "";
  }
  subForm.elements.plugin.addEventListener("change", function(){
    var f = this.files[0], note = document.getElementById("sub-file-msg");
    subPlugin = null; subFill(null);
    if (!f) return;
    if (f.size > SUB_MAX.plugin * 1048576){ note.textContent = "That file is over 90 MB."; return; }
    note.textContent = "Reading the plugin file…";
    f.arrayBuffer().then(function(buf){
      return Promise.all([zipEntry(buf, "manifest.json"), crypto.subtle.digest("SHA-256", buf), zipEntry(buf, "signature.json")]);
    }).then(function(r){
      if (!r[0]) throw new Error("That file has no manifest.json. Make it with Minniondeck.exe plugin pack.");
      var m;
      try { m = JSON.parse(new TextDecoder().decode(r[0]).replace(/^﻿/, "")); } catch (e) { throw new Error("Its manifest.json isn't valid JSON."); }
      if (!m.id || !m.name || !m.version) throw new Error("Its manifest.json needs an id, a name and a version.");
      if (!/^[a-z][a-z0-9_]{1,47}$/.test(m.id)) throw new Error("Its id, \"" + m.id + "\", must be lower-case letters, digits and _, starting with a letter.");
      if (/^minnion_/.test(m.id)) throw new Error("Ids starting with minnion_ are kept for official plugins. Give yours another id in manifest.json and pack it again.");
      if (!/^\d+\.\d+\.\d+[\w.+-]*$/.test(m.version)) throw new Error("Its version, \"" + m.version + "\", should look like 1.0.0.");
      subPlugin = { file: f, sha256: Array.prototype.map.call(new Uint8Array(r[1]), function(x){ return ("0" + x.toString(16)).slice(-2); }).join(""), manifest: m };
      subFill(m);
      note.textContent = (f.size / 1048576).toFixed(1) + " MB, " + (r[2] ? "signed" : "not signed (that's fine: Minniondeck signs it when it's approved)") + ".";
    }).catch(function(e){ note.textContent = e.message; });
  });
  // One file to the relay, with the upload's progress (fetch can't report it)
  function subPut(id, key, kind, f, onProgress){
    return new Promise(function(ok, no){
      var x = new XMLHttpRequest();
      x.open("PUT", RELAY + "/submit/" + id + "/file?kind=" + kind + "&name=" + encodeURIComponent(f.name));
      x.setRequestHeader("X-Upload-Key", key);
      if (onProgress) x.upload.onprogress = function(e){ if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function(){ var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} if (x.status === 200) ok(j); else no(new Error(j.error || "A file didn't go through. Try again.")); };
      x.onerror = function(){ no(new Error("Couldn't reach the server. Check your connection and try again.")); };
      x.send(f);
    });
  }
  subSend.addEventListener("click", function(){
    var el = subForm.elements, say = function(t){ subMsg.textContent = t; };
    if (!subPlugin){ say(el.plugin.files[0] ? "The plugin file can't be sent: see the note under it." : "Pick the plugin file first."); el.plugin.focus(); return; }
    if (!el.summary.value.trim()){ say("Say what it does, in one line."); el.summary.focus(); return; }
    if (!el.about.value.trim()){ say("Write the full description."); el.about.focus(); return; }
    if (!el.creator.value.trim()){ say("Say what name to show as the creator."); el.creator.focus(); return; }
    var extras = ["icon", "shot", "profile"].filter(function(k){ return el[k].files[0]; });
    for (var i = 0; i < extras.length; i++) if (el[extras[i]].files[0].size > SUB_MAX[extras[i]] * 1048576){ say("The " + {icon:"icon", shot:"screenshot", profile:"profile"}[extras[i]] + " is over " + SUB_MAX[extras[i]] + " MB."); return; }
    if (!el.agree.checked){ say("Tick the box to agree to the rules first."); el.agree.focus(); return; }
    if (!RELAY){ say("Sending isn't set up yet. Try again later."); return; }
    var m = subPlugin.manifest, body = { id: m.id, name: m.name, version: m.version, page: currentRoute(), agree: true, plugin: { size: subPlugin.file.size, sha256: subPlugin.sha256 } };
    ["category", "summary", "about", "needs", "creator"].forEach(function(n){ body[n] = el[n].value.trim(); });
    subSend.disabled = true; subProg.hidden = false; subProg.value = 0; say("Sending the form…");
    var sid, key;
    fetch(RELAY + "/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(j){ if (!res.ok) throw new Error(j.error || "The form didn't go through. Try again."); return j; });
    }).then(function(j){
      sid = j.id; key = j.key;
      say("Sending the plugin file…");
      return subPut(sid, key, "plugin", subPlugin.file, function(f){ subProg.value = f; say("Sending the plugin file… " + Math.round(f * 100) + "%"); });
    }).then(function(){
      return extras.reduce(function(chain, k){ return chain.then(function(){ say("Sending the " + {icon:"icon", shot:"screenshot", profile:"profile"}[k] + "…"); return subPut(sid, key, k, el[k].files[0]); }); }, Promise.resolve());
    }).then(function(){
      return fetch(RELAY + "/submit/" + sid + "/done", { method: "POST", headers: { "X-Upload-Key": key } }).then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(j){ if (!res.ok) throw new Error(j.error || "The last step didn't go through. Try again."); });
      });
    }).then(function(){
      say("Sent. Thank you! Your submission number is " + sid + ". We review every plugin by hand, within 7 days. If it's approved, it shows up in the marketplace.");
      track("event", "plugin-submit:" + body.category);
      subForm.reset(); subPlugin = null; subFill(null); subProg.hidden = true;
      document.getElementById("sub-file-msg").textContent = "Pick the next plugin file, if you have another.";
    }).catch(function(e){ say(e.message && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the server. Check your connection and try again."); subProg.hidden = true; })
      .then(function(){ subSend.disabled = false; });
  });

