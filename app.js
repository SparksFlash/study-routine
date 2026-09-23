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
    if (mode === "normal") {
      html += '<div class="btn-row"><button type="button" class="btn small" data-add="' + p.dow + '">+ Add block</button></div>' +
        '<p class="small muted">Tap a block to edit it. Edits apply to every weekday the block repeats on.</p>';
    }
    html += first30Html(p) + heatmapHtml(p);
    root.innerHTML = html;
  };

  // ---------- Week screen (Sun → Sat timetable)
  var WK_START = 6 * 60, WK_END = 24 * 60, PX = 1.05; // px per minute

  SCREENS.week = function (root, p) {
    var h = (WK_END - WK_START) * PX;
    var html = '<div class="card-head"><h2>Week</h2><button type="button" class="btn small primary" data-add="' + p.dow + '">+ Add block</button></div>';
    html += '<p class="small muted">Tap any block to edit it. Scroll sideways on a phone.</p>';
    html += '<div class="week-wrap"><div class="week" role="grid" aria-label="Weekly timetable">';
    html += '<div class="wk-head" aria-hidden="true"></div>';
    D.WEEKDAYS.forEach(function (d, i) {
      html += '<div class="wk-head' + (i === p.dow ? " today" : "") + '">' + d + "</div>";
    });
    html += '<div class="wk-axis" style="height:' + h + 'px" aria-hidden="true">';
    for (var m = WK_START; m < WK_END; m += 60) {
      if (m > WK_START) html += '<span class="lbl" style="top:' + (m - WK_START) * PX + 'px">' + SR.pad(m / 60) + ":00</span>";
    }
    html += "</div>";
    for (var dow = 0; dow < 7; dow++) {
      html += '<div class="wk-col' + (dow === p.dow ? " today" : "") + '" style="height:' + h + 'px">';
      for (var hm = WK_START + 60; hm < WK_END; hm += 60) html += '<span class="wk-hour" style="top:' + (hm - WK_START) * PX + 'px"></span>';
      SR.blocksForDay(state, dow, "normal").forEach(function (b) {
        var s = Math.max(SR.toMin(b.start), WK_START), e = Math.min(SR.toMin(b.end), WK_END);
        if (e <= s) return;
        html += '<button type="button" class="wk-block lane-' + esc(b.lane) + (b.optional ? " optional" : "") + '" data-edit="' + esc(b.id) + '"' +
          ' style="top:' + ((s - WK_START) * PX).toFixed(1) + "px;height:" + Math.max(16, (e - s) * PX - 2).toFixed(1) + 'px"' +
          ' aria-label="' + esc(D.WEEKDAYS_LONG[dow] + " " + b.start + " to " + b.end + ", " + laneLabel(b.lane) + ": " + b.title) + '">' +
          '<span class="wt">' + esc(b.start) + " " + esc(b.title) + "</span>" +
          (e - s >= 40 ? '<span class="wl">' + esc(laneLabel(b.lane)) + "</span>" : "") +
          "</button>";
      });
      if (dow === p.dow && p.minutes >= WK_START) html += '<span class="wk-now" style="top:' + ((p.minutes - WK_START) * PX).toFixed(1) + 'px"></span>';
      html += "</div>";
    }
    html += "</div></div>";
    html += '<div class="legend-lanes" aria-label="Lanes">' + Object.keys(D.LANES).map(chip).join("") + "</div>";
    root.innerHTML = html;
  };

  // ---------- block editor
  var editing = null; // { id|null, draft }
  var ed = $("#editor"), edForm = $("#editor-form");

  function dayPicks(container, name, selected) {
    container.innerHTML = D.WEEKDAYS.map(function (d, i) {
      return '<label><input type="checkbox" name="' + name + '" value="' + i + '"' + (selected.indexOf(i) !== -1 ? " checked" : "") + "> " + d + "</label>";
    }).join("");
  }
  $("#editor-lane").innerHTML = Object.keys(D.LANES).map(function (k) {
    return '<option value="' + k + '">' + esc(D.LANES[k].label) + "</option>";
  }).join("");

  function readForm() {
    var f = edForm.elements;
    var days = Array.prototype.filter.call(edForm.querySelectorAll('input[name="day"]'), function (c) { return c.checked; })
      .map(function (c) { return +c.value; });
    var base = editing.id ? state.blocks.filter(function (b) { return b.id === editing.id; })[0] : {};
    var b = SR.clone(base || {});
    b.id = editing.id || "b-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    b.start = f.start.value; b.end = f.end.value; b.days = days;
    b.lane = f.lane.value; b.title = f.title.value.trim(); b.details = f.details.value.trim();
    if (f.optional.checked) b.optional = true; else delete b.optional;
    return b;
  }

  function checkForm() {
    var b = readForm();
    var errs = SR.validateBlock(b);
    $("#editor-errors").textContent = errs.join(" ");
    var ov = errs.length ? [] : SR.overlaps(state.blocks, b);
    $("#editor-warn").textContent = ov.length
      ? "Heads up: overlaps with " + ov.slice(0, 3).map(function (o) { return o.title + " (" + o.start + "–" + o.end + ")"; }).join(", ") +
        (ov.length > 3 ? " and " + (ov.length - 3) + " more" : "") + ". You can still save."
      : "";
    return { block: b, errors: errs, overlaps: ov };
  }

  function openEditor(id, defaultDay) {
    var b = id ? state.blocks.filter(function (x) { return x.id === id; })[0] : null;
    if (id && !b) return;
    editing = { id: id || null };
    var f = edForm.elements;
    b = b || { start: "18:00", end: "19:00", days: [defaultDay == null ? now().dow : defaultDay], lane: "project", title: "", details: "" };
    $("#editor-title").textContent = id ? "Edit block" : "Add block";
    f.start.value = b.start; f.end.value = b.end;
    f.lane.value = b.lane; f.title.value = b.title; f.details.value = b.details || "";
    f.optional.checked = !!b.optional;
    dayPicks($("#editor-days"), "day", b.days);
    dayPicks($("#editor-dup-days"), "dupday", []);
    $("#editor-dup").hidden = true;
    $("#editor-delete").hidden = !id;
    $("#editor-dup-toggle").hidden = !id;
    $("#editor-note").textContent = id && b.days.length > 1
      ? "Repeats on " + b.days.map(function (d) { return D.WEEKDAYS[d]; }).join(", ") + ". Changes apply to all of these days."
      : "";
    checkForm();
    $("#editor-errors").textContent = "";
    if (typeof ed.showModal === "function") ed.showModal(); else ed.setAttribute("open", "");
  }
  function closeEditor() {
    if (typeof ed.close === "function") ed.close(); else ed.removeAttribute("open");
    editing = null;
  }

  edForm.addEventListener("input", checkForm);
  edForm.addEventListener("change", checkForm);
  edForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var r = checkForm();
    if (r.errors.length) return;
    var idx = state.blocks.map(function (b) { return b.id; }).indexOf(r.block.id);
    if (idx === -1) state.blocks.push(r.block); else state.blocks[idx] = r.block;
    save();
    closeEditor();
    toast(r.overlaps.length ? "Saved (overlaps with " + r.overlaps[0].title + ")" : "Saved");
    render();
  });
  $("#editor-cancel").addEventListener("click", closeEditor);
  $("#editor-delete").addEventListener("click", function () {
    if (!editing || !editing.id) return;
    var b = state.blocks.filter(function (x) { return x.id === editing.id; })[0];
    if (!confirm('Delete "' + b.title + '" from ' + b.days.map(function (d) { return D.WEEKDAYS[d]; }).join(", ") + "?")) return;
    state.blocks = state.blocks.filter(function (x) { return x.id !== editing.id; });
    save();
    closeEditor();
    toast("Deleted");
    render();
  });
  $("#editor-dup-toggle").addEventListener("click", function () { $("#editor-dup").hidden = !$("#editor-dup").hidden; });
  $("#editor-dup-go").addEventListener("click", function () {
    var days = Array.prototype.filter.call(edForm.querySelectorAll('input[name="dupday"]'), function (c) { return c.checked; })
      .map(function (c) { return +c.value; });
    if (!days.length) { $("#editor-errors").textContent = "Pick at least one day to copy to."; return; }
    var r = checkForm();
    if (r.errors.length && !(r.errors.length === 1 && !r.block.days.length)) return;
    var copy = SR.clone(r.block);
    copy.id = "b-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    copy.days = days;
    delete copy.kind;
    state.blocks.push(copy);
    save();
    closeEditor();
    toast("Copied to " + days.map(function (d) { return D.WEEKDAYS[d]; }).join(", "));
    render();
  });

  // ---------- This month screen
  var monthOffset = 0;
  var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  SCREENS.month = function (root, p) {
    var idx = p.y * 12 + (p.m - 1) + monthOffset;
    var ym = Math.floor(idx / 12) + "-" + SR.pad(idx % 12 + 1);
    var t = SR.topicsFor(ym);
    var title = MONTH_NAMES[idx % 12] + " " + Math.floor(idx / 12);
    var html = '<div class="month-nav"><button type="button" class="btn small" data-month="-1" aria-label="Previous month">‹</button>' +
      "<h2>" + esc(title) + (monthOffset === 0 ? ' <span class="small muted">(this month)</span>' : "") + "</h2>" +
      '<button type="button" class="btn small" data-month="1" aria-label="Next month">›</button></div>';
    if (monthOffset !== 0) html += '<div class="btn-row"><button type="button" class="btn small ghost" data-month="0">Back to this month</button></div>';

    if (t.phase0) {
      html += '<article class="card"><h3>Phase 0</h3><p>' + esc(t.text) + "</p>" +
        '<p class="small muted">The roadmap topics start in October 2026. Use the First 30 days list on the Today screen.</p></article>';
      root.innerHTML = html;
      return;
    }
    if (t.reused) html += '<p class="small muted">Showing the April 2028 plan (it carries on until the roadmap ends).</p>';

    var e = t.entry;
    html += '<article class="card"><div class="card-head"><h3>LeetCode target</h3></div>' +
      '<div class="lc-target">' + esc(e.lc) + ' <span class="small muted">problems solved in total by month end</span></div></article>';

    html += '<article class="card"><h3>Topics by lane</h3><div class="topic-list">';
    D.TOPIC_LANES.forEach(function (l) {
      var v = e[l];
      html += '<div class="topic lane-' + l + '">' + chip(l) + "<p>" + esc(v && v !== "—" ? v : "— (nothing new this month)") + "</p></div>";
    });
    html += "</div></article>";

    var doneMap = state.monthDone[ym] || {};
    html += '<article class="card"><h3>Done when</h3>';
    if (!e.done.length) html += '<p class="small muted">No checkpoint for this month.</p>';
    else {
      html += '<ul class="checklist">' + e.done.map(function (txt, i) {
        var c = !!doneMap[i];
        return '<li><label><input type="checkbox" data-mdone="' + ym + "|" + i + '"' + (c ? " checked" : "") + '><span class="' + (c ? "done-text" : "") + '">' + esc(txt) + "</span></label></li>";
      }).join("") + "</ul>";
      var n = e.done.filter(function (_, i) { return doneMap[i]; }).length;
      html += '<p class="small muted">' + n + " of " + e.done.length + " done</p>";
    }
    html += "</article>";
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
    var e = ev.target.closest("[data-edit]");
    if (e) { openEditor(e.dataset.edit); return; }
    var a = ev.target.closest("[data-add]");
    if (a) { openEditor(null, +a.dataset.add); return; }
    var mo = ev.target.closest("[data-month]");
    if (mo) {
      monthOffset = +mo.dataset.month === 0 ? 0 : monthOffset + (+mo.dataset.month);
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
    } else if (t.matches("[data-mdone]")) {
      var parts = t.dataset.mdone.split("|");
      if (!state.monthDone[parts[0]]) state.monthDone[parts[0]] = {};
      if (t.checked) state.monthDone[parts[0]][parts[1]] = true; else delete state.monthDone[parts[0]][parts[1]];
      save();
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
