/* Study Routine — UI. Depends on data.js (SR_DATA) and logic.js (SR). */
(function () {
  "use strict";

  var D = SR.DATA;
  var KEY = "studyRoutine.v1";
  var state;

  // ---------- clock (Asia/Dhaka). Add ?now=2026-09-27T20:44 to the URL to preview another time.
  var offsetMs = 0;
  (function () {
    try {
      var q = new URLSearchParams(location.search).get("now");
      if (q && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(q)) {
        var t = Date.parse(q.slice(0, 16) + ":00+06:00");
        if (!isNaN(t)) offsetMs = t - Date.now();
      }
    } catch (e) { /* ignore */ }
  })();
  function now() { return SR.dhakaParts(new Date(Date.now() + offsetMs)); }

  // ---------- storage (every access wrapped; falls back to the default routine)
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? SR.normalizeState(JSON.parse(raw)) : SR.defaultState();
    } catch (e) {
      state = SR.defaultState();
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast("Couldn't save — storage is full or blocked.");
      return false;
    }
  }
  function dayRec(dateStr) {
    if (!state.days[dateStr]) state.days[dateStr] = {};
    var r = state.days[dateStr];
    if (!r.done) r.done = {};
    return r;
  }
  function modeFor(dateStr) { return (state.days[dateStr] && state.days[dateStr].mode) || "normal"; }
  function isDone(dateStr, id) { return !!(state.days[dateStr] && state.days[dateStr].done && state.days[dateStr].done[id]); }
  function setDone(dateStr, id, v) {
    var r = dayRec(dateStr);
    if (v) r.done[id] = true; else delete r.done[id];
    save();
  }

  // ---------- helpers
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, rootEl) { return (rootEl || document).querySelector(sel); }
  function laneLabel(l) { return D.LANES[l] ? D.LANES[l].label : l; }
  function chip(l) { return '<span class="lane-chip lane-' + esc(l) + '">' + esc(laneLabel(l)) + "</span>"; }
  function range(b) { return esc(b.start) + "–" + esc(b.end); }
  function dur(min) {
    min = Math.max(0, Math.ceil(min));
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min";
  }
  function prettyDate(dateStr) {
    var p = dateStr.split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return D.WEEKDAYS[SR.dowOf(dateStr)] + ", " + (+p[2]) + " " + months[+p[1] - 1] + " " + p[0];
  }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // ---------- navigation
  var current = "now";
  var SCREENS = {};
  function show(name) {
    current = name;
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== "screen-" + name; });
    document.querySelectorAll(".tabbar button").forEach(function (b) {
      if (b.dataset.screen === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    try { sessionStorage.setItem("sr.screen", name); } catch (e) { /* ignore */ }
    render();
    window.scrollTo(0, 0);
  }
  function render() {
    var p = now();
    $("#clock").textContent = D.WEEKDAYS[p.dow] + " " + SR.pad(p.hh) + ":" + SR.pad(p.mm) + " · Dhaka";
    if (SCREENS[current]) SCREENS[current]($("#screen-" + current), p);
  }

  // ---------- Now screen
  SCREENS.now = function (root, p) {
    var mode = modeFor(p.dateStr);
    var tomorrowStr = SR.addDays(p.dateStr, 1);
    var today = SR.blocksForDay(state, p.dow, mode);
    var tomorrow = SR.blocksForDay(state, (p.dow + 1) % 7, modeFor(tomorrowStr));
    var nn = SR.findNowNext(today, tomorrow, p.minutes);
    var html = "";

    if (mode !== "normal") {
      html += '<p class="small muted">Today is running the <strong>' + esc(state.plans[mode].label) + "</strong>. Change it on the Today screen.</p>";
    }

    if (nn.status === "block") {
      var b = nn.current, s = SR.toMin(b.start), e = SR.toMin(b.end);
      var pct = Math.min(100, Math.max(0, ((p.minutes - s) / (e - s)) * 100));
      var topic = SR.laneTopic(p.monthKey, b.lane);
      var done = isDone(p.dateStr, b.id);
      html += '<article class="card now-card lane-' + esc(b.lane) + '">' +
        '<div class="card-head"><span class="label">Now</span>' + chip(b.lane) + "</div>" +
        '<div class="time">' + range(b) + (b.optional ? " · optional" : "") + "</div>" +
        '<div class="title">' + esc(b.title) + "</div>" +
        (b.details ? '<div class="details">' + esc(b.details) + "</div>" : "") +
        '<div class="remaining">' + dur(e - p.minutes) + " left</div>" +
        '<div class="progress" role="progressbar" aria-label="Block progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><span style="width:' + pct.toFixed(1) + '%"></span></div>' +
        (topic ? '<div class="topic"><strong>This month:</strong> ' + esc(topic) + "</div>" : "") +
        '<div class="btn-row"><button type="button" class="btn primary done-btn" data-done="' + esc(b.id) + '" aria-pressed="' + done + '">' +
        (done ? "Done ✓ (tap to undo)" : "Done ✓") + "</button></div>" +
        "</article>";
    } else if (nn.status === "sleep") {
      var sleepBlk = nn.current;
      html += '<article class="card sleep-card">' +
        '<div class="card-head"><span class="label small muted">Now</span>' + chip("routine") + "</div>" +
        '<div class="title">Sleep — 7.5 h, non-negotiable</div>' +
        '<p class="muted">Phone down. Tomorrow starts at ' + esc(nn.next ? nn.next.start : "06:30") + ".</p>" +
        (sleepBlk ? '<div class="btn-row"><button type="button" class="btn done-btn" data-done="' + esc(sleepBlk.id) + '" aria-pressed="' + isDone(p.dateStr, sleepBlk.id) + '">' +
          (isDone(p.dateStr, sleepBlk.id) ? "In bed ✓ (tap to undo)" : "In bed ✓") + "</button></div>" : "") +
        "</article>";
    } else {
      html += '<article class="card sleep-card">' +
        '<div class="card-head"><span class="label small muted">Now</span>' + chip("routine") + "</div>" +
        '<div class="title">Free time</div>' +
        '<p class="muted">Nothing scheduled' + (nn.next ? " for " + dur(SR.toMin(nn.next.start) - p.minutes) : "") + ". Rest, eat, or catch up.</p>" +
        "</article>";
    }

    if (nn.next) {
      var n = nn.next;
      var when = nn.nextIsTomorrow
        ? "Tomorrow at " + esc(n.start)
        : "At " + esc(n.start) + " · in " + dur(SR.toMin(n.start) - p.minutes);
      html += '<article class="card next-card lane-' + esc(n.lane) + '">' +
        '<div class="card-head"><span class="small muted">Next</span>' + chip(n.lane) + "</div>" +
        '<div class="title">' + esc(n.title) + "</div>" +
        '<div class="small">' + when + " · " + range(n) + "</div>" +
        (n.details ? '<div class="small muted">' + esc(n.details) + "</div>" : "") +
        "</article>";
    }
    root.innerHTML = html;
  };

  // ---------- Today screen
  var MODES = [["normal", "Normal"], ["three", "3-hour plan"], ["one", "1-hour minimum day"]];

  SCREENS.today = function (root, p) {
    var mode = modeFor(p.dateStr);
    var blocks = SR.blocksForDay(state, p.dow, mode);
    var tomorrow = SR.blocksForDay(state, (p.dow + 1) % 7, modeFor(SR.addDays(p.dateStr, 1)));
    var nn = SR.findNowNext(blocks, tomorrow, p.minutes);
    var html = "";

    html += '<div class="card-head"><h2>' + esc(prettyDate(p.dateStr)) + "</h2></div>";
    html += '<div class="seg" role="group" aria-label="Day plan">' + MODES.map(function (m) {
      return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + m[1] + "</button>";
    }).join("") + "</div>";

    if (mode !== "normal") {
      html += '<div class="card"><label>Plan start time<input type="time" id="plan-start" value="' + esc(state.plans[mode].start) + '"></label>' +
        '<p class="small muted">The ' + esc(state.plans[mode].label) + " replaces today's timeline. Tick every item to keep your streak.</p></div>";
    }

    html += streakHtml(p);

    html += '<ol class="timeline" aria-label="Today\'s blocks">';
    blocks.forEach(function (b) {
      var done = isDone(p.dateStr, b.id);
      var isCur = nn.current === b;
      var past = SR.toMin(b.end) <= p.minutes;
      var cls = "tl-row" + (isCur ? " current" : "") + (done ? " done" : "") + (past ? " past" : "");
      html += '<li class="' + cls + '">' +
        '<span class="tl-check"><input type="checkbox" data-check="' + esc(b.id) + '"' + (done ? " checked" : "") +
        ' aria-label="Done: ' + esc(b.title) + '"></span>' +
        '<button type="button" class="tl-item lane-' + esc(b.lane) + '"' + (b.plan ? "" : ' data-edit="' + esc(b.id) + '"') + ">" +
        '<span class="top"><span class="time">' + range(b) + "</span>" +
        (isCur ? '<span class="now-tag">NOW</span>' : "") + chip(b.lane) + "</span>" +
        '<span class="t">' + esc(b.title) + (b.optional ? " <span class=\"tiny\">(optional)</span>" : "") + "</span>" +
        (b.details ? '<span class="d">' + esc(b.details) + "</span>" : "") +
        "</button></li>";
    });
    html += "</ol>";
    if (mode === "normal") html += '<p class="small muted">Tap a block to edit it. Edits apply to every weekday the block repeats on.</p>';
    html += first30Html(p) + heatmapHtml(p);
    root.innerHTML = html;
  };

  // Filled in by later sections.
  function streakHtml() { return ""; }
  function first30Html() { return ""; }
  function heatmapHtml() { return ""; }

  // ---------- events
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-done]");
    if (t) {
      var p = now();
      setDone(p.dateStr, t.dataset.done, !isDone(p.dateStr, t.dataset.done));
      render();
      return;
    }
    var m = ev.target.closest("[data-mode]");
    if (m) {
      var r = dayRec(now().dateStr);
      if (m.dataset.mode === "normal") delete r.mode; else r.mode = m.dataset.mode;
      save();
      render();
    }
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.matches("[data-check]")) {
      setDone(now().dateStr, t.dataset.check, t.checked);
      render();
    } else if (t.id === "plan-start" && SR.isTime(t.value)) {
      state.plans[modeFor(now().dateStr)].start = t.value;
      save();
      render();
    }
  });
  document.querySelectorAll(".tabbar button").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.screen); });
  });

  // ---------- start
  load();
  var startScreen = "now";
  try { startScreen = sessionStorage.getItem("sr.screen") || "now"; } catch (e) { /* ignore */ }
  show(SCREENS[startScreen] ? startScreen : "now");
  // Refresh every 15 s. Screens with inputs only re-render when the minute changes and nothing is focused/open.
  var lastMinute = -1;
  setInterval(function () {
    var p = now();
    var minute = p.hh * 60 + p.mm;
    var busy = $("#editor").open || (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));
    if (current === "now") render();
    else if (minute !== lastMinute && !busy) render();
    lastMinute = minute;
  }, 15000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
})();
