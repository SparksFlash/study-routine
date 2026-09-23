/* Study Routine — pure logic (no DOM). Used by app.js and tests.js.
 * Works in the browser (global `SR`) and in Node (module.exports).
 */
(function (root, factory) {
  var data = root.SR_DATA || (typeof require === "function" ? require("./data.js") : null);
  var api = factory(data);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (DATA) {
  "use strict";

  var TZ = "Asia/Dhaka";
  var DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  // ---------- small helpers

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function toMin(hhmm) {
    var p = String(hhmm).split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function fromMin(m) {
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  }
  function isTime(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)); }

  // Date strings are "YYYY-MM-DD" calendar dates (no time zone attached).
  function dateStrFromParts(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function parseDate(s) {
    var p = s.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function addDays(s, n) {
    var d = parseDate(s);
    d.setUTCDate(d.getUTCDate() + n);
    return dateStrFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  function dowOf(s) { return parseDate(s).getUTCDay(); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }

  // ---------- Asia/Dhaka clock

  var fmt = null;
  function dhakaParts(date) {
    date = date || new Date();
    if (!fmt) {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
      });
    }
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    var y = +o.year, mo = +o.month, d = +o.day, h = +o.hour % 24, mi = +o.minute, s = +o.second;
    var dateStr = dateStrFromParts(y, mo, d);
    return {
      y: y, m: mo, d: d, hh: h, mm: mi, ss: s,
      dateStr: dateStr,
      dow: dowOf(dateStr),
      minutes: h * 60 + mi + s / 60, // fractional minutes since Dhaka midnight
      monthKey: y + "-" + pad(mo)
    };
  }

  // ---------- blocks for a day

  function sortBlocks(list) {
    return list.slice().sort(function (a, b) {
      return toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end);
    });
  }

  function planBlocks(plans, key) {
    var plan = plans[key];
    var t = toMin(plan.start);
    return plan.items.map(function (it, i) {
      var blk = {
        id: "plan-" + key + "-" + i, days: [0, 1, 2, 3, 4, 5, 6],
        start: fromMin(t), end: fromMin(Math.min(t + it.min, 1439)),
        lane: it.lane, title: it.title, details: it.details || "", plan: key
      };
      t += it.min;
      return blk;
    });
  }

  // mode: "normal" | "three" | "one"
  function blocksForDay(state, dow, mode) {
    var own = state.blocks.filter(function (b) { return b.days.indexOf(dow) !== -1; });
    if (mode === "three" || mode === "one") {
      var sleep = own.filter(function (b) { return b.tag === "sleep"; });
      return sortBlocks(planBlocks(state.plans, mode).concat(sleep));
    }
    return sortBlocks(own);
  }

  // Current block = the one covering `minutes`; on overlap, the latest start wins.
  // Returns { status: "block" | "gap" | "sleep", current, next, nextIsTomorrow }
  function findNowNext(today, tomorrow, minutes) {
    var current = null;
    today.forEach(function (b) {
      var s = toMin(b.start), e = toMin(b.end);
      if (s <= minutes && minutes < e) {
        if (!current || s > toMin(current.start) || (s === toMin(current.start) && e < toMin(current.end))) current = b;
      }
    });
    var next = null, nextIsTomorrow = false;
    for (var i = 0; i < today.length; i++) {
      if (toMin(today[i].start) > minutes && today[i] !== current) { next = today[i]; break; }
    }
    if (!next && tomorrow.length) { next = tomorrow[0]; nextIsTomorrow = true; }

    var status;
    if (current) status = current.tag === "sleep" ? "sleep" : "block";
    else if (nextIsTomorrow || !today.length || minutes < toMin(today[0].start)) status = "sleep";
    else status = "gap";
    return { status: status, current: current, next: next, nextIsTomorrow: nextIsTomorrow };
  }

  // ---------- monthly topics

  function topicsFor(monthKey) {
    var T = DATA.MONTHLY_TOPICS;
    if (T[monthKey]) return { key: monthKey, source: monthKey, entry: T[monthKey] };
    var keys = Object.keys(T).sort();
    if (monthKey < keys[0]) return { key: monthKey, source: null, phase0: true, text: DATA.PHASE0_TEXT };
    // May 2028 onward reuses the last entry (April 2028).
    var last = keys[keys.length - 1];
    return { key: monthKey, source: last, entry: T[last], reused: true };
  }

  function laneTopic(monthKey, lane) {
    var t = topicsFor(monthKey);
    if (t.phase0) return DATA.TOPIC_LANES.indexOf(lane) !== -1 ? t.text : "";
    var v = t.entry[lane];
    return v && v !== "—" ? v : "";
  }

  // ---------- first 30 days

  var first30 = null;
  function first30For(dateStr) {
    if (!first30) {
      first30 = {};
      DATA.FIRST30_RAW.forEach(function (line) {
        var parts = line.split("|").map(function (s) { return s.trim(); });
        first30[parts[0]] = parts.slice(1);
      });
    }
    var row = first30[dateStr];
    if (!row) return null;
    return row.map(function (text, i) { return { col: DATA.FIRST30_COLUMNS[i], text: text }; });
  }

  // ---------- state

  function defaultState() {
    return {
      v: 1,
      blocks: clone(DATA.BLOCKS),
      plans: clone(DATA.PLANS),
      days: {},      // "YYYY-MM-DD": { mode, done: {blockId: true}, first30: {index: true} }
      monthDone: {}  // "YYYY-MM": { index: true }
    };
  }

  function validBlock(b) {
    return b && typeof b.id === "string" && Array.isArray(b.days) && b.days.length &&
      b.days.every(function (d) { return d >= 0 && d <= 6; }) &&
      isTime(b.start) && isTime(b.end) && toMin(b.end) > toMin(b.start) &&
      DATA.LANES[b.lane] && typeof b.title === "string";
  }

  // Accepts anything (parsed JSON or garbage); always returns a usable state.
  function normalizeState(raw) {
    var def = defaultState();
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.blocks)) return def;
    var s = def;
    s.blocks = raw.blocks.filter(validBlock).map(function (b) {
      var o = clone(b);
      o.details = typeof o.details === "string" ? o.details : "";
      return o;
    });
    if (!s.blocks.length) s.blocks = clone(DATA.BLOCKS);
    if (raw.plans && typeof raw.plans === "object") {
      ["three", "one"].forEach(function (k) {
        var p = raw.plans[k];
        if (p && isTime(p.start) && Array.isArray(p.items) && p.items.length) s.plans[k] = clone(p);
      });
    }
    if (raw.days && typeof raw.days === "object") s.days = clone(raw.days);
    if (raw.monthDone && typeof raw.monthDone === "object") s.monthDone = clone(raw.monthDone);
    return s;
  }

  // ---------- validation for the editor

  function validateBlock(b) {
    var errors = [];
    if (!isTime(b.start)) errors.push("Start time is missing.");
    if (!isTime(b.end)) errors.push("End time is missing.");
    if (isTime(b.start) && isTime(b.end) && toMin(b.end) <= toMin(b.start)) errors.push("End time must be after start time.");
    if (!b.days || !b.days.length) errors.push("Pick at least one weekday.");
    if (!String(b.title || "").trim()) errors.push("Title is required.");
    return errors;
  }

  // Blocks (other than b itself) that share a weekday and overlap in time.
  function overlaps(blocks, b) {
    if (!isTime(b.start) || !isTime(b.end)) return [];
    var s = toMin(b.start), e = toMin(b.end);
    return blocks.filter(function (o) {
      if (o.id === b.id) return false;
      if (!o.days.some(function (d) { return b.days.indexOf(d) !== -1; })) return false;
      return toMin(o.start) < e && s < toMin(o.end);
    });
  }

  // ---------- streak

  // Blocks that count toward the 70% rule: non-routine, non-optional.
  function countable(blocks) {
    return blocks.filter(function (b) { return b.lane !== "routine" && !b.optional; });
  }

  function dayScore(state, dateStr) {
    var rec = state.days[dateStr] || {};
    var done = rec.done || {};
    var normal = countable(blocksForDay(state, dowOf(dateStr), "normal"));
    var nDone = normal.filter(function (b) { return done[b.id]; }).length;
    var ratio = normal.length ? nDone / normal.length : 0;
    var qualifies = normal.length > 0 && ratio >= 0.7;
    ["three", "one"].forEach(function (k) {
      var pb = planBlocks(state.plans, k);
      var pd = pb.filter(function (b) { return done[b.id]; }).length;
      var pr = pd / pb.length;
      if (pr > ratio) ratio = pr;
      if (pr === 1) qualifies = true;
    });
    return { ratio: ratio, qualifies: qualifies };
  }

  // Today still in progress: if today doesn't qualify yet, the streak counts up to yesterday.
  function streaks(state, todayStr) {
    var current = 0;
    var d = dayScore(state, todayStr).qualifies ? todayStr : addDays(todayStr, -1);
    while (dayScore(state, d).qualifies) { current++; d = addDays(d, -1); }

    var dates = Object.keys(state.days).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k) && k <= todayStr; }).sort();
    var longest = 0, run = 0, prev = null;
    dates.forEach(function (k) {
      if (dayScore(state, k).qualifies) {
        run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
        prev = k;
        if (run > longest) longest = run;
      } else {
        run = 0; prev = null;
      }
    });
    return { current: current, longest: Math.max(longest, current) };
  }

  // ---------- .ics export

  function icsEscape(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  // Fold lines longer than 75 octets (RFC 5545 §3.1), never splitting a UTF-8 character.
  function foldLine(line) {
    var out = [], cur = "", curBytes = 0, limit = 75;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var code = line.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < line.length) { ch += line[++i]; }
      var bytes = utf8Len(ch);
      if (curBytes + bytes > limit) {
        out.push(cur);
        cur = " "; curBytes = 1; limit = 75;
      }
      cur += ch; curBytes += bytes;
    }
    out.push(cur);
    return out.join("\r\n");
  }
  function utf8Len(ch) {
    var c = ch.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  function icsDateTime(dateStr, hhmm) {
    return dateStr.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00";
  }

  function nextSunday(dateStr) {
    var dow = dowOf(dateStr);
    return addDays(dateStr, dow === 0 ? 0 : 7 - dow);
  }

  // blocks: the (edited) routine; startDate: "YYYY-MM-DD"; now: Date (for DTSTAMP).
  function buildICS(blocks, startDate, now) {
    now = now || new Date();
    var stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Study Routine//Study Routine PWA//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Study Routine",
      "X-WR-TIMEZONE:" + TZ,
      "BEGIN:VTIMEZONE",
      "TZID:" + TZ,
      "X-LIC-LOCATION:" + TZ,
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0600",
      "TZOFFSETTO:+0600",
      "TZNAME:+06",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
    sortBlocks(blocks).forEach(function (b) {
      if (b.tag === "sleep" || b.allDay || !validBlock(b)) return;
      var days = b.days.slice().sort();
      // First occurrence: the first date on/after startDate that falls on one of the block's weekdays.
      var first = startDate;
      while (days.indexOf(dowOf(first)) === -1) first = addDays(first, 1);
      var laneLabel = DATA.LANES[b.lane].label;
      var summary = "[" + laneLabel + "] " + b.title;
      lines.push(
        "BEGIN:VEVENT",
        "UID:" + b.id + "-" + stamp + "@study-routine",
        "DTSTAMP:" + stamp,
        "DTSTART;TZID=" + TZ + ":" + icsDateTime(first, b.start),
        "DTEND;TZID=" + TZ + ":" + icsDateTime(first, b.end),
        "RRULE:FREQ=WEEKLY;BYDAY=" + days.map(function (d) { return DAY_CODES[d]; }).join(","),
        "SUMMARY:" + icsEscape(summary)
      );
      if (b.details) lines.push("DESCRIPTION:" + icsEscape(b.details));
      lines.push(
        "TRANSP:OPAQUE",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + icsEscape(summary),
        "TRIGGER:-PT5M",
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    return lines.map(foldLine).join("\r\n") + "\r\n";
  }

  return {
    TZ: TZ, DATA: DATA,
    pad: pad, clone: clone, toMin: toMin, fromMin: fromMin, isTime: isTime,
    addDays: addDays, dowOf: dowOf, daysBetween: daysBetween,
    dhakaParts: dhakaParts,
    sortBlocks: sortBlocks, planBlocks: planBlocks, blocksForDay: blocksForDay, findNowNext: findNowNext,
    topicsFor: topicsFor, laneTopic: laneTopic, first30For: first30For,
    defaultState: defaultState, normalizeState: normalizeState, validBlock: validBlock,
    validateBlock: validateBlock, overlaps: overlaps,
    countable: countable, dayScore: dayScore, streaks: streaks,
    icsEscape: icsEscape, foldLine: foldLine, nextSunday: nextSunday, buildICS: buildICS
  };
});
