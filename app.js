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
    if (arena && name !== "now") arena.setActive(false);
    render();
    window.scrollTo(0, 0);
  }
  function setClock(p) {
    var h = p.hh;
    $("#greet").textContent = h >= 4 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : h >= 17 && h < 22 ? "Good evening" : "Good night";
    $("#date-line").textContent = prettyDate(p.dateStr).replace(/ \d{4}$/, "");
    $("#clock-time").textContent = SR.pad(p.hh) + ":" + SR.pad(p.mm);
  }
  function render() {
    var p = now();
    setClock(p);
    if (SCREENS[current]) SCREENS[current]($("#screen-" + current), p);
  }

  // ---------- shared UI bits
  function icon(name, cls) {
    return '<svg class="ico' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }

  // Countdown ring; the big number is the time left in the block.
  function ring(pct, minsLeft) {
    var R = 52, C = 2 * Math.PI * R;
    var m = Math.max(0, Math.ceil(minsLeft));
    var big = m < 60 ? String(m) : Math.floor(m / 60) + ":" + SR.pad(m % 60);
    return '<div class="ring" role="progressbar" aria-label="Block progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="' + R + '"/>' +
      '<circle class="ring-bar" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/></svg>' +
      '<div class="ring-label"><span class="ring-big">' + big + '</span><span class="ring-unit">' + (m < 60 ? "min left" : "h left") + "</span></div></div>";
  }

  function pageHead(eyebrow, title, right) {
    return '<div class="page-head"><div><p class="eyebrow">' + esc(eyebrow) + '</p><h2 class="page-title">' + title + "</h2></div>" + (right || "") + "</div>";
  }

  // ---------- 3D mascot (arena3d.js, loaded only when needed)
  var stage = document.createElement("div");
  stage.className = "arena-stage";
  stage.innerHTML = '<div class="arena-bubble" hidden></div>';
  var arena = null, arenaLoading = false, arenaFailed = false, arenaInfo = null;
  var reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function wantArena() { return state.settings.three && !arenaFailed; }

  function syncArena() {
    if (!wantArena()) { if (arena) arena.setActive(false); return; }
    if (!arena) {
      if (arenaLoading) return;
      arenaLoading = true;
      import("./arena3d.js").then(function (m) {
        arena = m.createArena(stage, { reducedMotion: reducedMotion, onTap: mascotTap });
        arenaLoading = false;
        syncArena();
      }).catch(function () {
        // No WebGL, or opened as a file: carry on without the mascot.
        arenaFailed = true;
        arenaLoading = false;
        render();
      });
      return;
    }
    if (arenaInfo) arena.show(arenaInfo);
    arena.setActive(current === "now" && stage.isConnected);
  }

  var QUIPS = ["Let's go!", "Focus mode: ON", "One block at a time.", "You've got this!", "No zero days.", "Future you says thanks.", "Stay on the road!"];
  var bubbleTimer;
  function mascotTap() {
    buzz(12);
    var p = now();
    var nn = currentNowNext(p);
    var line;
    if (nn.status === "sleep") line = "Zzz… go to sleep!";
    else if (nn.status === "block" && Math.random() < 0.5) line = dur(SR.toMin(nn.current.end) - p.minutes) + " left — keep going!";
    else line = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    var bub = stage.querySelector(".arena-bubble");
    bub.textContent = line;
    bub.hidden = false;
    bub.classList.remove("pop");
    void bub.offsetWidth;
    bub.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bub.hidden = true; }, 2200);
  }

  function currentNowNext(p) {
    var mode = modeFor(p.dateStr);
    return SR.findNowNext(SR.blocksForDay(state, p.dow, mode),
      SR.blocksForDay(state, (p.dow + 1) % 7, modeFor(SR.addDays(p.dateStr, 1))), p.minutes);
  }

  // ---------- small delights: vibration + confetti
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  var confettiCanvas = null;
  function confetti(count) {
    if (reducedMotion) return;
    if (!confettiCanvas) {
      confettiCanvas = document.createElement("canvas");
      confettiCanvas.className = "confetti";
      confettiCanvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(confettiCanvas);
    }
    var c = confettiCanvas, ctx = c.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ["#ffd23f", "#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6"];
    var parts = [];
    for (var i = 0; i < count; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[i % colors.length]
      });
    }
    var start = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var alive = false;
      parts.forEach(function (q) {
        q.vy += 0.45; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.r += q.vr;
        if (q.y < innerHeight + 20) alive = true;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r);
        ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h * Math.abs(Math.cos(q.r)));
        ctx.restore();
      });
      if (alive && t - start < 3500) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(start);
  }

  // Tick/untick a block, with feedback. A big celebration when the day starts counting toward the streak.
  function toggleDone(id, value, source) {
    var p = now();
    var before = SR.dayScore(state, p.dateStr).qualifies;
    setDone(p.dateStr, id, value);
    if (!value) return;
    buzz(15);
    var after = SR.dayScore(state, p.dateStr).qualifies;
    if (!before && after) {
      confetti(160);
      if (arena) arena.celebrate();
      toast("Streak day secured! 🔥");
    } else if (source === "hero") {
      confetti(60);
      if (arena) arena.celebrate();
    }
  }

  // ---------- Now screen
  SCREENS.now = function (root, p) {
    var mode = modeFor(p.dateStr);
    var tomorrowStr = SR.addDays(p.dateStr, 1);
    var today = SR.blocksForDay(state, p.dow, mode);
    var tomorrow = SR.blocksForDay(state, (p.dow + 1) % 7, modeFor(tomorrowStr));
    var nn = SR.findNowNext(today, tomorrow, p.minutes);
    var st = SR.streaks(state, p.dateStr);
    var html = '<div class="cols"><div class="col-a">';

    if (mode !== "normal") {
      html += '<p class="notice">' + icon("bolt") + "<span>Running the <strong>" + esc(state.plans[mode].label) + "</strong> today. Switch it on the Today screen.</span></p>";
    }

    if (nn.status === "block") {
      var b = nn.current, s = SR.toMin(b.start), e = SR.toMin(b.end);
      var pct = Math.min(100, Math.max(0, ((p.minutes - s) / (e - s)) * 100));
      var topic = SR.laneTopic(p.monthKey, b.lane);
      var done = isDone(p.dateStr, b.id);
      html += arenaHtml(b.lane, laneLabel(b.lane), "Now playing");
      html += '<article class="hero lane-' + esc(b.lane) + (done ? " is-done" : "") + '">' +
        '<div class="hero-head"><span class="live"><span class="live-dot"></span>Now</span>' + chip(b.lane) + "</div>" +
        '<h2 class="hero-title">' + esc(b.title) + "</h2>" +
        (b.details ? '<p class="hero-details">' + esc(b.details) + "</p>" : "") +
        '<div class="hero-row">' + ring(pct, e - p.minutes) +
        '<dl class="hero-meta">' +
        "<div><dt>Block</dt><dd>" + range(b) + "</dd></div>" +
        "<div><dt>Done so far</dt><dd>" + Math.round(pct) + "%</dd></div>" +
        (b.optional ? "<div><dt>Type</dt><dd>Optional</dd></div>" : "") +
        "</dl></div>" +
        (topic ? '<div class="hero-topic">' + icon("target") + '<div><span class="eyebrow">This month</span><p>' + esc(topic) + "</p></div></div>" : "") +
        '<button type="button" class="btn hero-done" data-done="' + esc(b.id) + '" aria-pressed="' + done + '">' +
        icon("check") + (done ? "Done — tap to undo" : "Mark as done") + "</button>" +
        "</article>";
    } else if (nn.status === "sleep") {
      var sleepBlk = nn.current;
      var slept = sleepBlk && isDone(p.dateStr, sleepBlk.id);
      html += arenaHtml("routine", "Sleeping", "Recharging", "sleep");
      html += '<article class="hero hero-night">' +
        '<div class="hero-head"><span class="live"><span class="live-dot"></span>Now</span><span class="night-tag">Routine</span></div>' +
        '<div class="night-icon">' + icon("moon") + "</div>" +
        '<h2 class="hero-title">Sleep — 7.5 h, non-negotiable</h2>' +
        '<p class="hero-details">Phone down. Tomorrow starts at ' + esc(nn.next ? nn.next.start : "06:30") + ".</p>" +
        (sleepBlk ? '<button type="button" class="btn hero-done" data-done="' + esc(sleepBlk.id) + '" aria-pressed="' + !!slept + '">' +
          icon("check") + (slept ? "In bed — tap to undo" : "I'm in bed") + "</button>" : "") +
        "</article>";
    } else {
      html += arenaHtml("routine", "Free time", "Taking a break");
      html += '<article class="hero hero-free">' +
        '<div class="hero-head"><span class="live"><span class="live-dot"></span>Now</span>' + chip("routine") + "</div>" +
        '<div class="night-icon">' + icon("cup") + "</div>" +
        '<h2 class="hero-title">Free time</h2>' +
        '<p class="hero-details">Nothing scheduled' + (nn.next ? " for " + dur(SR.toMin(nn.next.start) - p.minutes) : "") + ". Rest, eat, or catch up.</p>" +
        "</article>";
    }

    html += '</div><div class="col-b">';
    if (nn.next) {
      var n = nn.next;
      html += '<article class="next lane-' + esc(n.lane) + '">' +
        '<div class="next-when"><span class="eyebrow">Up next</span><span class="next-time">' + esc(n.start) + "</span>" +
        '<span class="next-in">' + (nn.nextIsTomorrow ? "tomorrow" : "in " + dur(SR.toMin(n.start) - p.minutes)) + "</span></div>" +
        '<div class="next-body">' + chip(n.lane) + '<h3 class="next-title">' + esc(n.title) + "</h3>" +
        '<p class="small muted">' + range(n) + (n.details ? " · " + esc(n.details) : "") + "</p></div>" +
        "</article>";
    }

    var score = SR.dayScore(state, p.dateStr);
    html += '<div class="mini-stats">' +
      '<div class="mini">' + icon("flame", "c-flame") + "<div><strong>" + st.current + "</strong><span>day streak</span></div></div>" +
      '<div class="mini">' + icon("target", "c-accent") + "<div><strong>" + Math.round(score.ratio * 100) + "%</strong><span>of today done</span></div></div>" +
      "</div>";

    // Later today: the few blocks after "next".
    var later = today.filter(function (b) { return SR.toMin(b.start) > p.minutes && b !== nn.next; }).slice(0, 4);
    if (later.length && !nn.nextIsTomorrow) {
      html += '<article class="card later"><h3 class="card-title">' + icon("today") + "Later today</h3><ul>" +
        later.map(function (b) {
          return '<li class="lane-' + esc(b.lane) + '"><span class="later-time">' + esc(b.start) + '</span><span class="later-dot"></span><span class="later-title">' + esc(b.title) + "</span></li>";
        }).join("") + "</ul></article>";
    }
    html += "</div></div>";
    root.innerHTML = html;

    // Move the persistent 3D stage into this render (keeps the WebGL context alive).
    var slot = root.querySelector(".arena-slot");
    if (slot) {
      slot.appendChild(stage);
      var info = slot.parentNode.dataset;
      arenaInfo = { lane: info.lane, mood: info.mood, skin: SR.skinFor(st.longest) };
    }
    syncArena();
  };

  function arenaHtml(lane, title, eyebrow, mood) {
    if (!wantArena()) return "";
    return '<section class="arena lane-' + esc(lane) + '" data-lane="' + esc(lane) + '" data-mood="' + (mood || "work") + '" aria-label="Mascot">' +
      '<div class="arena-slot"></div>' +
      '<div class="arena-sign"><span class="eyebrow">' + esc(eyebrow) + "</span><strong>" + esc(title) + "</strong></div>" +
      '<p class="arena-hint">Tap me · drag to spin</p></section>';
  }

  // ---------- Today screen
  var MODES = [["normal", "Normal"], ["three", "3-hour plan"], ["one", "1-hour day"]];

  SCREENS.today = function (root, p) {
    var mode = modeFor(p.dateStr);
    var blocks = SR.blocksForDay(state, p.dow, mode);
    var tomorrow = SR.blocksForDay(state, (p.dow + 1) % 7, modeFor(SR.addDays(p.dateStr, 1)));
    var nn = SR.findNowNext(blocks, tomorrow, p.minutes);
    var html = "";

    html += pageHead("Today", esc(D.WEEKDAYS_LONG[p.dow]),
      mode === "normal" ? '<button type="button" class="btn small primary" data-add="' + p.dow + '">' + icon("plus") + "Add block</button>" : "");
    html += '<div class="seg" role="group" aria-label="Day plan">' + MODES.map(function (m) {
      return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (mode === m[0]) + '">' + m[1] + "</button>";
    }).join("") + "</div>";

    if (mode !== "normal") {
      html += '<div class="card"><label>Plan start time<input type="time" id="plan-start" value="' + esc(state.plans[mode].start) + '"></label>' +
        '<p class="small muted">The ' + esc(state.plans[mode].label) + " replaces today's timeline. Tick every item to keep your streak.</p></div>";
    }

    html += '<div class="cols"><div class="col-a">';
    html += streakHtml(p);

    html += '<ol class="timeline" aria-label="Today\'s blocks">';
    blocks.forEach(function (b) {
      var done = isDone(p.dateStr, b.id);
      var isCur = nn.current === b;
      var past = SR.toMin(b.end) <= p.minutes;
      var cls = "tl-row lane-" + esc(b.lane) + (isCur ? " current" : "") + (done ? " done" : "") + (past ? " past" : "");
      html += '<li class="' + cls + '">' +
        '<div class="tl-time"><span>' + esc(b.start) + '</span><span class="tl-end">' + esc(b.end) + "</span></div>" +
        '<div class="tl-card">' +
        '<label class="tick"><input type="checkbox" data-check="' + esc(b.id) + '"' + (done ? " checked" : "") + '><span class="sr-only">Done: ' + esc(b.title) + "</span></label>" +
        '<button type="button" class="tl-item"' + (b.plan ? "" : ' data-edit="' + esc(b.id) + '"') + ">" +
        '<span class="tl-top">' + chip(b.lane) + (isCur ? '<span class="now-tag"><span class="live-dot"></span>Now</span>' : "") +
        (b.optional ? '<span class="opt-tag">optional</span>' : "") + "</span>" +
        '<span class="t">' + esc(b.title) + "</span>" +
        (b.details ? '<span class="d">' + esc(b.details) + "</span>" : "") +
        "</button></div></li>";
    });
    html += "</ol>";
    if (mode === "normal") html += '<p class="hint">Tap a block to edit it. A block that repeats on several weekdays changes on all of them.</p>';
    html += '</div><div class="col-b">' + trophyHtml(p) + first30Html(p) + heatmapHtml(p) + "</div></div>";
    root.innerHTML = html;
  };

  // ---------- Week screen (Sun → Sat timetable)
  var WK_START = 6 * 60, WK_END = 24 * 60, PX = 1.05; // px per minute

  SCREENS.week = function (root, p) {
    var h = (WK_END - WK_START) * PX;
    var html = pageHead("Timetable", "Week", '<button type="button" class="btn small primary" data-add="' + p.dow + '">' + icon("plus") + "Add block</button>");
    html += '<p class="hint">Tap a block to edit it. With a mouse, drag a block up or down to move it.</p>';
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
    var prev = $(".week-wrap", root);
    var keep = prev && weekScrolled ? prev.scrollLeft : null;
    root.innerHTML = html;
    var wrap = $(".week-wrap", root);
    if (keep != null) wrap.scrollLeft = keep;
    else {
      // First time on a narrow screen: scroll so today's column is visible.
      var col = $(".wk-col.today", root);
      if (col && col.offsetLeft + col.offsetWidth > wrap.clientWidth) wrap.scrollLeft = col.offsetLeft - 44;
      weekScrolled = true;
    }
  };
  var weekScrolled = false;

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
    var html = '<div class="month-nav"><button type="button" class="icon-btn" data-month="-1" aria-label="Previous month">' + icon("left") + "</button>" +
      '<div class="month-title"><p class="eyebrow">' + (monthOffset === 0 ? "This month" : "Roadmap") + '</p><h2 class="page-title">' + esc(title) + "</h2></div>" +
      '<button type="button" class="icon-btn" data-month="1" aria-label="Next month">' + icon("right") + "</button></div>";
    if (monthOffset !== 0) html += '<div class="btn-row"><button type="button" class="btn small ghost" data-month="0">Back to this month</button></div>';

    if (t.phase0) {
      html += '<article class="card"><h3 class="card-title">' + icon("bolt") + 'Phase 0</h3><p>' + esc(t.text) + "</p>" +
        '<p class="small muted">The roadmap topics start in October 2026. Use the First 30 days list on the Today screen.</p></article>';
      root.innerHTML = html;
      return;
    }
    if (t.reused) html += '<p class="small muted">Showing the April 2028 plan (it carries on until the roadmap ends).</p>';

    var e = t.entry;
    html += '<article class="card lc-card"><h3 class="card-title">' + icon("target") + "LeetCode target</h3>" +
      '<div class="lc-target">' + esc(e.lc) + '</div><p class="small muted">problems solved in total by the end of the month</p></article>';

    html += '<article class="card"><h3 class="card-title">' + icon("month") + 'Topics by lane</h3><div class="topic-list">';
    D.TOPIC_LANES.forEach(function (l) {
      var v = e[l];
      html += '<div class="topic lane-' + l + '">' + chip(l) + "<p>" + esc(v && v !== "—" ? v : "— (nothing new this month)") + "</p></div>";
    });
    html += "</div></article>";

    var doneMap = state.monthDone[ym] || {};
    html += '<article class="card"><h3 class="card-title">' + icon("check") + "Done when</h3>";
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

  // ---------- First 30 days (23 Sep → 22 Oct 2026), shown under Today's timeline
  function first30Html(p) {
    var rows = SR.first30For(p.dateStr);
    if (!rows) return "";
    var dayN = SR.daysBetween("2026-09-23", p.dateStr) + 1;
    var rec = (state.days[p.dateStr] && state.days[p.dateStr].first30) || {};
    var n = rows.filter(function (_, i) { return rec[i]; }).length;
    return '<article class="card"><div class="card-head"><h3 class="card-title">' + icon("calendar") + "First 30 days · day " + dayN + "</h3>" +
      '<span class="small muted">' + n + "/" + rows.length + "</span></div>" +
      '<ul class="checklist">' + rows.map(function (r, i) {
        var c = !!rec[i];
        var empty = r.text === "—" || r.text === "Off";
        return '<li><label><input type="checkbox" data-f30="' + i + '"' + (c ? " checked" : "") + '>' +
          '<span class="col">' + esc(r.col) + "</span>" +
          '<span class="' + (c ? "done-text" : empty ? "muted" : "") + '">' + esc(r.text) + "</span></label></li>";
      }).join("") + "</ul></article>";
  }

  // ---------- Settings screen
  function classBlockFor(dow) {
    return state.blocks.filter(function (b) { return b.kind === "class" && b.days.indexOf(dow) !== -1; })[0];
  }

  SCREENS.settings = function (root, p) {
    var html = pageHead("Preferences", "Settings") + '<div class="settings-grid">';

    html += '<article class="card"><h3 class="card-title">' + icon("bolt") + "Look</h3>" +
      '<div class="seg seg-2" role="group" aria-label="Theme">' +
      '<button type="button" data-theme="arena" aria-pressed="' + (state.settings.theme === "arena") + '">Arena</button>' +
      '<button type="button" data-theme="classic" aria-pressed="' + (state.settings.theme === "classic") + '">Classic</button></div>' +
      '<label class="check"><input type="checkbox" id="three-toggle"' + (state.settings.three ? " checked" : "") + "> 3D mascot on the Now screen</label>" +
      '<p class="small muted">' + (arenaFailed ? "3D isn't available on this device or when the app is opened as a file." :
        "Your mascot changes with the lane you're working on and gets upgrades from Trophy Road. Turn it off to save battery.") + "</p></article>";

    html += '<article class="card"><h3 class="card-title">' + icon("school") + "University class times</h3>" +
      '<p class="small muted">Tick the days you have classes. Other blocks are not moved automatically — check the Week screen for overlaps.</p>' +
      '<div class="class-grid">';
    for (var d = 0; d < 7; d++) {
      var cb = classBlockFor(d);
      html += '<label class="check"><input type="checkbox" data-classday="' + d + '"' + (cb ? " checked" : "") + "> " + D.WEEKDAYS[d] + "</label>" +
        '<input type="time" aria-label="' + D.WEEKDAYS_LONG[d] + ' class start" data-classstart="' + d + '" value="' + (cb ? cb.start : "09:00") + '">' +
        '<input type="time" aria-label="' + D.WEEKDAYS_LONG[d] + ' class end" data-classend="' + d + '" value="' + (cb ? cb.end : "14:00") + '">';
    }
    html += '</div><div class="msg error" id="class-err" role="alert"></div>' +
      '<div class="btn-row"><button type="button" class="btn primary" id="class-save">Save class times</button></div></article>';

    html += '<article class="card"><h3 class="card-title">' + icon("bolt") + 'Short plans</h3><div class="row2">' +
      '<label>3-hour plan starts<input type="time" data-planstart="three" value="' + esc(state.plans.three.start) + '"></label>' +
      '<label>1-hour day starts<input type="time" data-planstart="one" value="' + esc(state.plans.one.start) + '"></label>' +
      "</div></article>";

    html += '<article class="card"><h3 class="card-title">' + icon("calendar") + "Google Calendar reminders</h3>" +
      '<p class="small">Exports your current weekly routine as repeating events with a reminder 5 minutes before each block (Sleep is skipped). Import steps are in the README.</p>' +
      '<label>Start repeating from<input type="date" id="ics-start" value="' + SR.nextSunday(SR.addDays(p.dateStr, 1)) + '"></label>' +
      '<div class="btn-row"><button type="button" class="btn primary" id="ics-export">Export .ics</button></div></article>';

    html += '<article class="card"><h3 class="card-title">' + icon("data") + "Your data</h3>" +
      '<p class="small muted">Everything is stored only in this browser. To move to another device: Export here, send the file to yourself, then Import on the other device.</p>' +
      '<div class="btn-row"><button type="button" class="btn" id="json-export">Export data (JSON)</button>' +
      '<button type="button" class="btn" id="json-import">Import data (JSON)</button>' +
      '<input type="file" id="json-file" accept=".json,application/json" hidden>' +
      '<button type="button" class="btn danger" id="reset">Reset to default</button></div></article>';

    html += '<article class="card desktop-only"><h3 class="card-title">' + icon("settings") + "Keyboard shortcuts</h3>" +
      '<ul class="keys">' + [["1 – 5", "Switch screens"], ["D", "Mark the current block done"], ["A", "Add a block"],
        ["← →", "Previous / next month (Month screen)"], ["?", "Show shortcuts"]].map(function (k) {
        return "<li><kbd>" + k[0] + "</kbd><span>" + k[1] + "</span></li>";
      }).join("") + "</ul></article>";
    html += "</div>";
    html += '<p class="tiny muted">All times are Asia/Dhaka (UTC+6). Tip: add ?now=2026-09-27T20:44 to the address to preview another time.</p>';
    root.innerHTML = html;
  };

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  document.addEventListener("click", function (ev) {
    var id = ev.target.id;
    if (id === "class-save") {
      var rows = [], err = "";
      for (var d = 0; d < 7; d++) {
        if (!$('[data-classday="' + d + '"]').checked) continue;
        var s = $('[data-classstart="' + d + '"]').value, e = $('[data-classend="' + d + '"]').value;
        if (!SR.isTime(s) || !SR.isTime(e) || SR.toMin(e) <= SR.toMin(s)) { err = D.WEEKDAYS_LONG[d] + ": end must be after start."; break; }
        rows.push({ d: d, s: s, e: e });
      }
      $("#class-err").textContent = err;
      if (err) return;
      var old = {};
      state.blocks.forEach(function (b) { if (b.kind === "class") b.days.forEach(function (x) { old[x] = b; }); });
      state.blocks = state.blocks.filter(function (b) { return b.kind !== "class"; });
      rows.forEach(function (r) {
        var prev = old[r.d] || {};
        state.blocks.push({ id: "class-" + r.d, days: [r.d], start: r.s, end: r.e, lane: "routine",
          title: prev.title || "University", details: prev.details != null ? prev.details : "Classes / thesis", kind: "class" });
      });
      save();
      toast("Class times saved");
      render();
    } else if (ev.target.closest("[data-theme]")) {
      state.settings.theme = ev.target.closest("[data-theme]").dataset.theme;
      save();
      applyLook();
      render();
    } else if (id === "ics-export") {
      var start = $("#ics-start").value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) { toast("Pick a start date first"); return; }
      download("study-routine.ics", SR.buildICS(state.blocks, start, new Date()), "text/calendar;charset=utf-8");
      toast("Downloaded study-routine.ics");
    } else if (id === "json-export") {
      var out = SR.clone(state);
      out.app = "study-routine";
      out.exportedAt = new Date().toISOString();
      download("study-routine-" + now().dateStr + ".json", JSON.stringify(out, null, 2), "application/json");
      toast("Downloaded your data");
    } else if (id === "json-import") {
      $("#json-file").click();
    } else if (id === "reset") {
      if (!confirm("Reset everything to the default routine? This deletes your edits, ticks and streak on this device.")) return;
      if (!confirm("Are you sure? Export your data first if you might want it back.")) return;
      state = SR.defaultState();
      save();
      toast("Reset to default");
      render();
    }
  });

  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "json-file" && t.files && t.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try { parsed = JSON.parse(reader.result); } catch (e) { toast("That file isn't valid JSON."); return; }
        if (!parsed || !Array.isArray(parsed.blocks)) { toast("That file isn't a Study Routine export."); return; }
        if (!confirm("Replace all data on this device with the imported file?")) return;
        state = SR.normalizeState(parsed);
        save();
        toast("Data imported");
        render();
      };
      reader.onerror = function () { toast("Couldn't read that file."); };
      reader.readAsText(t.files[0]);
      t.value = "";
    } else if (t.id === "three-toggle") {
      state.settings.three = t.checked;
      save();
      toast(t.checked ? "3D mascot on" : "3D mascot off");
    } else if (t.matches("[data-planstart]") && SR.isTime(t.value)) {
      state.plans[t.dataset.planstart].start = t.value;
      save();
      toast("Plan start saved");
    }
  });

  // ---------- streak, never-skip badges, heatmap
  function streakHtml(p) {
    var st = SR.streaks(state, p.dateStr);
    var score = SR.dayScore(state, p.dateStr);
    var mode = modeFor(p.dateStr);
    var blocks = SR.blocksForDay(state, p.dow, mode);
    function doneWhere(fn) { return blocks.some(function (b) { return fn(b) && isDone(p.dateStr, b.id); }); }
    var badges = [
      ["Walk", doneWhere(function (b) { return b.tag === "walk"; })],
      ["DSA", doneWhere(function (b) { return b.lane === "dsa"; })],
      ["IELTS", doneWhere(function (b) { return b.lane === "ielts"; })],
      ["Shutdown", doneWhere(function (b) { return b.tag === "shutdown" || (b.plan && b.lane === "routine"); })],
      ["Sleep", doneWhere(function (b) { return b.tag === "sleep"; })]
    ];
    var pct = Math.round(score.ratio * 100);
    return '<article class="card streak-card"><div class="stats">' +
      '<div class="stat">' + icon("flame", "c-flame") + '<div class="n">' + st.current + '</div><div class="l">Day streak</div></div>' +
      '<div class="stat">' + icon("trophy", "c-trophy") + '<div class="n">' + st.longest + '</div><div class="l">Best streak</div></div>' +
      '<div class="stat">' + icon("target", "c-accent") + '<div class="n">' + pct + '%</div><div class="l">Today</div></div>' +
      "</div>" +
      '<div class="goal"><div class="goal-bar"><span style="width:' + pct + '%"></span><i style="left:70%"></i></div>' +
      '<p class="tiny muted">' + (score.qualifies ? "Today counts toward your streak." : "Reach 70% of study blocks (or finish a short plan) to keep the streak.") + "</p></div>" +
      '<div><p class="eyebrow">Never skip</p><div class="badges">' + badges.map(function (b) {
        return '<span class="badge' + (b[1] ? " ok" : "") + '">' + (b[1] ? icon("check") : '<span class="badge-dot"></span>') + b[0] + "</span>";
      }).join("") + "</div></div></article>";
  }

  function trophyHtml(p) {
    var best = SR.streaks(state, p.dateStr).longest;
    var next = SR.nextMilestone(best);
    return '<article class="card trophy"><div class="card-head"><h3 class="card-title">' + icon("trophy") + "Trophy Road</h3>" +
      '<span class="small muted">Best: ' + best + " day" + (best === 1 ? "" : "s") + "</span></div>" +
      '<ol class="road">' + SR.MILESTONES.map(function (m) {
        var got = best >= m.days;
        return '<li class="road-node' + (got ? " got" : "") + (next === m ? " is-next" : "") + '">' +
          '<span class="road-badge">' + (got ? icon("check") : m.days) + "</span>" +
          '<span class="road-days">' + m.days + "d</span>" +
          '<span class="road-reward">' + esc(m.reward) + "</span></li>";
      }).join("") + "</ol>" +
      '<p class="small muted">' + (next
        ? "<strong>" + (next.days - best) + " more streak day" + (next.days - best === 1 ? "" : "s") + "</strong> to unlock " + esc(next.reward) + ". Rewards upgrade your mascot on the Now screen."
        : "Every reward unlocked. Legendary.") + "</p></article>";
  }

  function heatmapHtml(p) {
    var thisSunday = SR.addDays(p.dateStr, -p.dow);
    var start = SR.addDays(thisSunday, -7 * 11);
    var cells = "";
    for (var i = 0; i < 84; i++) {
      var d = SR.addDays(start, i);
      if (d > p.dateStr) { cells += '<span class="cell future" aria-hidden="true"></span>'; continue; }
      var sc = SR.dayScore(state, d);
      var lvl = sc.qualifies ? 4 : sc.ratio >= 0.5 ? 3 : sc.ratio >= 0.25 ? 2 : sc.ratio > 0 ? 1 : 0;
      cells += '<span class="cell l' + lvl + (d === p.dateStr ? " today" : "") + '" title="' + d + ": " + Math.round(sc.ratio * 100) + '%"></span>';
    }
    return '<article class="card"><div class="card-head"><h3 class="card-title">' + icon("week") + "Last 12 weeks</h3>" +
      '<span class="legend tiny muted">less <span class="cell" style="background:var(--heat-0)"></span><span class="cell" style="background:var(--heat-1)"></span>' +
      '<span class="cell" style="background:var(--heat-2)"></span><span class="cell" style="background:var(--heat-3)"></span><span class="cell" style="background:var(--heat-4)"></span> streak day</span></div>' +
      '<div class="heatmap" role="img" aria-label="Daily completion for the last 12 weeks, rows Sunday to Saturday">' + cells + "</div></article>";
  }

  // ---------- events
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-done]");
    if (t) {
      toggleDone(t.dataset.done, !isDone(now().dateStr, t.dataset.done), "hero");
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
      toggleDone(t.dataset.check, t.checked, "tick");
      render();
    } else if (t.matches("[data-f30]")) {
      var r = dayRec(now().dateStr);
      if (!r.first30) r.first30 = {};
      if (t.checked) r.first30[t.dataset.f30] = true; else delete r.first30[t.dataset.f30];
      save();
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

  // ---------- theme
  function applyLook() {
    var arenaTheme = state.settings.theme === "arena";
    document.documentElement.classList.toggle("theme-arena", arenaTheme);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute("content", arenaTheme ? "#1b3fb5" : (m.media.indexOf("dark") !== -1 ? "#0b0d12" : "#f3f4f8"));
    });
  }

  // ---------- keyboard shortcuts (computer)
  var ORDER = ["now", "today", "week", "month", "settings"];
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || $("#editor").open) return;
    if (/INPUT|SELECT|TEXTAREA/.test((ev.target && ev.target.tagName) || "")) return;
    var k = ev.key;
    if (k >= "1" && k <= "5") { show(ORDER[+k - 1]); return; }
    if (k === "d" || k === "D") {
      var nn = currentNowNext(now());
      if (nn.current) {
        toggleDone(nn.current.id, !isDone(now().dateStr, nn.current.id), "hero");
        toast(isDone(now().dateStr, nn.current.id) ? "Done: " + nn.current.title : "Unticked: " + nn.current.title);
        render();
      }
      return;
    }
    if (k === "a" || k === "A") { ev.preventDefault(); openEditor(null, now().dow); return; }
    if (current === "month" && (k === "ArrowLeft" || k === "ArrowRight")) { monthOffset += k === "ArrowLeft" ? -1 : 1; render(); return; }
    if (k === "?") toast("Keys: 1–5 screens · D done · A add block · ←/→ months");
  });

  // ---------- swipe left/right between screens (phone)
  var touch = null;
  $("#main").addEventListener("touchstart", function (ev) {
    if (ev.touches.length !== 1 || ev.target.closest(".week-wrap, .arena, .road, input, textarea, select")) { touch = null; return; }
    touch = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  $("#main").addEventListener("touchend", function (ev) {
    if (!touch) return;
    var dx = ev.changedTouches[0].clientX - touch.x, dy = ev.changedTouches[0].clientY - touch.y;
    var fast = Date.now() - touch.t < 600;
    touch = null;
    if (!fast || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    var i = ORDER.indexOf(current) + (dx < 0 ? 1 : -1);
    if (i >= 0 && i < ORDER.length) show(ORDER[i]);
  }, { passive: true });

  // ---------- Week grid: drag a block with the mouse to move it (5-minute steps)
  var drag = null, swallowClick = false;
  document.addEventListener("pointerdown", function (ev) {
    var el = ev.target.closest(".wk-block");
    if (!el || ev.pointerType !== "mouse" || ev.button !== 0) return;
    var b = state.blocks.filter(function (x) { return x.id === el.dataset.edit; })[0];
    if (!b) return;
    drag = { el: el, block: b, y: ev.clientY, top: parseFloat(el.style.top), moved: false, delta: 0 };
  });
  document.addEventListener("pointermove", function (ev) {
    if (!drag) return;
    var dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 5) return;
    drag.moved = true;
    var s = SR.toMin(drag.block.start), e = SR.toMin(drag.block.end);
    var delta = Math.round(dy / PX / 5) * 5;
    delta = Math.max(-s, Math.min(1439 - e, delta));
    drag.delta = delta;
    drag.el.style.top = (drag.top + delta * PX) + "px";
    drag.el.classList.add("dragging");
    drag.el.querySelector(".wt").textContent = SR.fromMin(s + delta) + " " + drag.block.title;
  });
  document.addEventListener("pointerup", function () {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (!d.moved) return;
    swallowClick = true;
    if (!d.delta) { render(); return; }
    d.block.start = SR.fromMin(SR.toMin(d.block.start) + d.delta);
    d.block.end = SR.fromMin(SR.toMin(d.block.end) + d.delta);
    save();
    var ov = SR.overlaps(state.blocks, d.block);
    toast("Moved to " + d.block.start + "–" + d.block.end + (ov.length ? " (overlaps " + ov[0].title + ")" : ""));
    render();
  });
  document.addEventListener("click", function (ev) {
    if (swallowClick) { swallowClick = false; ev.stopPropagation(); ev.preventDefault(); }
  }, true);

  // ---------- offline support (only works over http/https, not when opened as a file)
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline mode unavailable */ });
    });
  }

  // ---------- start
  load();
  applyLook();
  var startScreen = "now";
  try { startScreen = sessionStorage.getItem("sr.screen") || "now"; } catch (e) { /* ignore */ }
  if (SCREENS[location.hash.slice(1)]) startScreen = location.hash.slice(1); // e.g. index.html#today
  show(SCREENS[startScreen] ? startScreen : "now");
  // Refresh every 15 s. Screens with inputs only re-render when the minute changes and nothing is focused/open.
  var lastMinute = -1;
  setInterval(function () {
    var p = now();
    var minute = p.hh * 60 + p.mm;
    setClock(p);
    var busy = $("#editor").open || (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName));
    if (current === "now") render();
    else if (minute !== lastMinute && !busy) render();
    lastMinute = minute;
  }, 15000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
})();
