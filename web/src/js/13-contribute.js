  /* contribute: pick a skill to light up the ways that fit; tabs for setup; the bug report builder */
  var ctCards = Array.prototype.slice.call(document.querySelectorAll("#ct-cards .way"));
  function ctSkill(sk){
    var n = 0;
    document.querySelectorAll("#contribute-view [data-skill]").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.skill === sk)); });
    ctCards.forEach(function(c){
      var fits = sk === "all" || c.dataset.skills.split(" ").indexOf(sk) >= 0;
      c.classList.toggle("dim", !fits); c.classList.toggle("hit", fits && sk !== "all");
      if (fits) n++;
    });
    document.getElementById("ct-count").textContent = sk === "all" ? ctCards.length + " ways to help, for every kind of skill." : n === 1 ? "1 way fits you, lit up below." : n + " ways fit you, lit up below.";
  }
  document.querySelector("#contribute-view .skills").addEventListener("click", function(e){ var b = e.target.closest("[data-skill]"); if (b) ctSkill(b.dataset.skill); });
  ctSkill("all");
  function ctTab(id){
    document.querySelectorAll("#contribute-view [data-ctab]").forEach(function(t){
      var on = t.dataset.ctab === id;
      t.setAttribute("aria-selected", String(on));
      document.getElementById("ctp-" + t.dataset.ctab).hidden = !on;
    });
  }
  var ctTabs = document.querySelector("#ct-setup .tabs2"); if (ctTabs) ctTabs.addEventListener("click", function(e){ var b = e.target.closest("[data-ctab]"); if (b) ctTab(b.dataset.ctab); });
  document.getElementById("contribute-view").addEventListener("click", function(e){
    var j = e.target.closest("[data-jump]");
    if (!j) return;
    e.preventDefault();
    if (j.dataset.tab) ctTab(j.dataset.tab);
    document.getElementById(j.dataset.jump).scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });
  var bugForm = document.getElementById("bug-form"), bugText = document.getElementById("bug-text");
  function bugReport(){
    var v = function(n){ var el = bugForm.elements[n]; return el.type === "file" ? (el.files[0] ? el.files[0].name : "") : el.value.trim(); };
    var or = function(t){ return t || "_Not filled in_"; };
    var lines = [
      "## " + (v("title") || "Short title of the bug"),
      "",
      "**Part:** " + v("area") + (v("plugin") ? " · " + v("plugin") : ""),
      "",
      "### Steps to make it happen",
      or(v("steps")),
      "",
      "### What I expected",
      or(v("expected")),
      "",
      "### What happened",
      or(v("actual")),
      "",
      "### My setup",
      "- Minniondeck " + (v("version") || "?") + " on " + v("os"),
      "- Phone: " + (v("phone") || "not used"),
      "- Other app: " + (v("sim") || "none"),
      "- Log attached: " + (v("logfile") || "no")
    ];
    bugText.textContent = lines.join("\n");
  }
  bugForm.addEventListener("input", bugReport);
  bugForm.addEventListener("change", bugReport);
  bugReport();
  // Send: through the relay into the private reports repo
  var bugSend = document.getElementById("bug-send");
  bugSend.addEventListener("click", function(){
    var msg = document.getElementById("bug-msg"), el = bugForm.elements;
    var f = el.logfile.files[0];
    if (!el.title.value.trim() && !el.actual.value.trim()){ msg.textContent = "Say what went wrong first: the one line at the top, or What happened."; el.title.focus(); return; }
    if (f && f.size > 2 * 1024 * 1024){ msg.textContent = "The log file is over 2 MB. Send the last part of it instead."; return; }
    if (!RELAY){ msg.textContent = "Sending isn't set up yet. Copy the report instead."; return; }
    var r = {page: currentRoute()};
    ["title","area","plugin","steps","expected","actual","version","os","phone","sim","contact"].forEach(function(n){ r[n] = el[n].value.trim(); });
    var body = new FormData();
    body.append("report", JSON.stringify(r));
    if (f) body.append("log", f, f.name);
    bugSend.disabled = true; msg.textContent = "Sending…";
    fetch(RELAY + "/report", {method:"POST", body:body}).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(j){
        if (!res.ok) throw new Error(j.error || "The report didn't go through. Try again, or copy it.");
        msg.textContent = "Sent. Thank you! Your report number is " + j.id + ".";
        track("event", "bug-report:" + r.area);
        bugForm.reset(); bugReport();
      });
    }).catch(function(e){ msg.textContent = e.message && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the server. Check your connection, or copy the report."; })
      .then(function(){ bugSend.disabled = false; });
  });
  document.getElementById("bug-copy").addEventListener("click", function(){
    var msg = document.getElementById("bug-msg"), done = function(t){ msg.textContent = t; };
    try {
      navigator.clipboard.writeText(bugText.textContent).then(function(){ done("Copied."); }, function(){ done("Couldn't copy. Select the report and copy it yourself."); });
    } catch (err) { done("Couldn't copy. Select the report and copy it yourself."); }
  });

