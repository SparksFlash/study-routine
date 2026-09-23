/* Study Routine — tests. Run in a browser via tests.html, or in a terminal with: node tests.js */
(function (root) {
  "use strict";
  var SR = root.SR || require("./logic.js");
  var results = [];

  function test(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, msg: e && e.message }); }
  }
  function eq(actual, expected, label) {
    if (actual !== expected) throw new Error((label ? label + ": " : "") + "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
  }
  function ok(cond, label) { if (!cond) throw new Error(label || "assertion failed"); }

  var S = SR.defaultState();
  function at(dow, hhmm, state) {
    state = state || S;
    return SR.findNowNext(SR.blocksForDay(state, dow, "normal"), SR.blocksForDay(state, (dow + 1) % 7, "normal"), SR.toMin(hhmm));
  }
  function id(b) { return b ? b.id : null; }

  // ---------- Now / next
  test("06:29 Sunday → sleep, next is wake-up today", function () {
    var r = at(0, "06:29");
    eq(r.status, "sleep"); eq(r.current, null); eq(id(r.next), "wake"); eq(r.nextIsTomorrow, false);
  });
  test("06:30 Sunday → wake-up block, next Deep work 1", function () {
    var r = at(0, "06:30");
    eq(r.status, "block"); eq(id(r.current), "wake"); eq(id(r.next), "dw1-sun");
  });
  test("20:44 Sunday → rotation block, next IELTS", function () {
    var r = at(0, "20:44");
    eq(id(r.current), "rot-sun"); eq(id(r.next), "ielts-sun");
  });
  test("20:45 Sunday → IELTS starts exactly on time", function () {
    var r = at(0, "20:45");
    eq(id(r.current), "ielts-sun"); eq(id(r.next), "shutdown");
  });
  test("23:30 → sleep, next is tomorrow's first block", function () {
    var r = at(3, "23:30");
    eq(r.status, "sleep"); eq(id(r.current), "sleep"); eq(id(r.next), "wake"); eq(r.nextIsTomorrow, true);
  });
  test("00:30 Friday → sleep, next is today's wake-up", function () {
    var r = at(5, "00:30");
    eq(r.status, "sleep"); eq(id(r.next), "wake"); eq(r.nextIsTomorrow, false);
  });
  test("Friday 09:59 → research deep block", function () {
    eq(id(at(5, "09:59").current), "fri-research");
  });
  test("Friday 21:25 → Friday shutdown (after IELTS)", function () {
    eq(id(at(5, "21:25").current), "shutdown-fri");
  });
  test("Friday 22:00 → free gap, next is sleep", function () {
    var r = at(5, "22:00");
    eq(r.status, "gap"); eq(id(r.next), "sleep");
  });
  test("Saturday 09:45 → gap between project and DSA", function () {
    var r = at(6, "09:45");
    eq(r.status, "gap"); eq(id(r.next), "sat-dsa");
  });
  test("Overlap: later start wins (Sat 21:10 shutdown over contest)", function () {
    eq(id(at(6, "21:10").current), "shutdown");
  });
  test("3-hour plan replaces the day's timeline", function () {
    var list = SR.blocksForDay(S, 1, "three");
    eq(list.length, 5, "4 plan items + sleep");
    eq(list[0].start, "18:00"); eq(list[1].start, "19:00"); eq(list[2].start, "20:30"); eq(list[3].end, "21:00");
  });

  // ---------- Asia/Dhaka time
  test("UTC 19:30 → Dhaka 01:30 next day (Wednesday)", function () {
    var p = SR.dhakaParts(new Date("2026-09-22T19:30:00Z"));
    eq(p.dateStr, "2026-09-23"); eq(p.hh, 1); eq(p.mm, 30); eq(p.dow, 3);
  });
  test("UTC Saturday 18:00 → Dhaka Sunday 00:00", function () {
    var p = SR.dhakaParts(new Date("2026-09-26T18:00:00Z"));
    eq(p.dateStr, "2026-09-27"); eq(p.hh, 0); eq(p.dow, 0);
  });
  test("New Year in Dhaka happens at 18:00 UTC", function () {
    var p = SR.dhakaParts(new Date("2026-12-31T18:30:00Z"));
    eq(p.dateStr, "2027-01-01"); eq(p.monthKey, "2027-01"); eq(p.minutes, 30);
  });
  test("Date helpers", function () {
    eq(SR.addDays("2026-12-31", 1), "2027-01-01");
    eq(SR.addDays("2028-03-01", -1), "2028-02-29");
    eq(SR.dowOf("2026-09-23"), 3);
    eq(SR.nextSunday("2026-09-23"), "2026-09-27");
    eq(SR.nextSunday("2026-09-27"), "2026-09-27");
  });

  // ---------- .ics
  var ics = SR.buildICS(S.blocks, "2026-09-27", new Date("2026-09-23T00:00:00Z"));
  var lines = ics.split("\r\n");
  test(".ics: envelope, CRLF line endings, VTIMEZONE", function () {
    eq(lines[0], "BEGIN:VCALENDAR");
    eq(lines[lines.length - 2], "END:VCALENDAR");
    eq(lines[lines.length - 1], "", "ends with CRLF");
    ok(ics.indexOf("\n") === ics.indexOf("\r\n") + 1, "no bare LF");
    ok(!/[^\r]\n/.test(ics), "every LF preceded by CR");
    ok(ics.indexOf("VERSION:2.0") > 0 && ics.indexOf("PRODID:") > 0, "VERSION and PRODID");
    ok(/BEGIN:VTIMEZONE\r\nTZID:Asia\/Dhaka/.test(ics), "VTIMEZONE Asia/Dhaka");
    ok(ics.indexOf("TZOFFSETTO:+0600") > 0, "UTC+6 offset");
  });
  test(".ics: lines ≤ 75 octets, BEGIN/END balanced", function () {
    var stack = [];
    lines.forEach(function (l) {
      var bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(l).length : Buffer.byteLength(l);
      ok(bytes <= 75, "line too long: " + l);
      if (l.indexOf("BEGIN:") === 0) stack.push(l.slice(6));
      if (l.indexOf("END:") === 0) eq(stack.pop(), l.slice(4), "END matches BEGIN");
    });
    eq(stack.length, 0);
  });
  test(".ics: one VEVENT per block, Sleep skipped, 5-min alarm each", function () {
    var n = (ics.match(/BEGIN:VEVENT/g) || []).length;
    eq(n, S.blocks.filter(function (b) { return b.tag !== "sleep"; }).length);
    eq((ics.match(/TRIGGER:-PT5M/g) || []).length, n);
    eq((ics.match(/RRULE:FREQ=WEEKLY;BYDAY=/g) || []).length, n);
    ok(ics.indexOf("] Sleep") === -1, "no Sleep event");
  });
  test(".ics: SUMMARY is [Lane] Title, first date lands on the right weekday", function () {
    var unfolded = ics.replace(/\r\n /g, "");
    var ev = unfolded.split("BEGIN:VEVENT").filter(function (s) { return s.indexOf("UID:dw1-thu-") !== -1; })[0];
    ok(ev, "Thursday deep-work event exists");
    ok(ev.indexOf("SUMMARY:[AI theory] Deep work 1: AI theory → code") !== -1, "summary");
    ok(ev.indexOf("DTSTART;TZID=Asia/Dhaka:20261001T070000") !== -1, "first Thursday after 27 Sep is 1 Oct");
    ok(ev.indexOf("DTEND;TZID=Asia/Dhaka:20261001T083000") !== -1, "end");
    ok(ev.indexOf("RRULE:FREQ=WEEKLY;BYDAY=TH") !== -1, "rrule");
    ok(ev.indexOf("DESCRIPTION:Implement this week's concept in code") !== -1, "description");
  });
  test(".ics: text escaping and UTF-8-safe folding", function () {
    eq(SR.icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
    var long = "SUMMARY:" + new Array(40).join("é→");
    var folded = SR.foldLine(long);
    eq(folded.replace(/\r\n /g, ""), long, "unfolds back to original");
    folded.split("\r\n").forEach(function (l) {
      var bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(l).length : Buffer.byteLength(l);
      ok(bytes <= 75, "folded line ≤ 75 bytes");
    });
  });

  // ---------- monthly topics
  test("Topic lookup: October 2026", function () {
    var t = SR.topicsFor("2026-10");
    eq(t.entry.lc, 45); ok(/MML ch 2–4/.test(t.entry.ai));
    eq(SR.laneTopic("2026-10", "sd"), "HTTP basics (MDN)");
  });
  test("Topic lookup: September 2026 is Phase 0", function () {
    var t = SR.topicsFor("2026-09");
    ok(t.phase0); ok(/Phase 0/.test(SR.laneTopic("2026-09", "ai")));
  });
  test("Topic lookup: May–Sep 2028 reuse April 2028", function () {
    ["2028-05", "2028-07", "2028-09"].forEach(function (k) {
      var t = SR.topicsFor(k);
      eq(t.source, "2028-04", k); eq(t.entry.lc, 395);
    });
  });
  test("Topic lookup: '—' means no topic", function () {
    eq(SR.laneTopic("2027-10", "ai"), "");
    eq(SR.laneTopic("2027-10", "project"), "P6: semantic cache, Kafka metering, dashboards, load tests");
  });
  test("First 30 days lookup", function () {
    var r = SR.first30For("2026-09-23");
    eq(r.length, 5); eq(r[2].col, "DSA"); ok(/LC 1, 20, 121/.test(r[2].text));
    eq(SR.first30For("2026-10-23"), null);
  });

  // ---------- streak
  function doneAll(state, date, fraction) {
    var list = SR.countable(SR.blocksForDay(state, SR.dowOf(date), "normal"));
    var n = Math.round(list.length * fraction);
    state.days[date] = { done: {} };
    list.slice(0, n).forEach(function (b) { state.days[date].done[b.id] = true; });
  }
  test("70% rule: Wednesday 3/5 fails, 4/5 counts", function () {
    var st = SR.defaultState();
    doneAll(st, "2026-09-23", 0.6);
    eq(SR.dayScore(st, "2026-09-23").qualifies, false);
    doneAll(st, "2026-09-23", 0.8);
    eq(SR.dayScore(st, "2026-09-23").qualifies, true);
  });
  test("Optional blocks don't count (Saturday contest)", function () {
    ok(!SR.countable(SR.blocksForDay(S, 6, "normal")).some(function (b) { return b.id === "sat-contest"; }));
  });
  test("A fully ticked 3-hour or 1-hour plan counts", function () {
    var st = SR.defaultState();
    st.days["2026-09-23"] = { mode: "one", done: { "plan-one-0": true, "plan-one-1": true, "plan-one-2": true } };
    eq(SR.dayScore(st, "2026-09-23").qualifies, true);
    delete st.days["2026-09-23"].done["plan-one-2"];
    eq(SR.dayScore(st, "2026-09-23").qualifies, false);
  });
  test("Current streak counts to yesterday while today is in progress", function () {
    var st = SR.defaultState();
    ["2026-09-20", "2026-09-21", "2026-09-22"].forEach(function (d) { doneAll(st, d, 1); });
    eq(SR.streaks(st, "2026-09-23").current, 3);
    doneAll(st, "2026-09-23", 1);
    eq(SR.streaks(st, "2026-09-23").current, 4);
  });
  test("Longest streak survives a break", function () {
    var st = SR.defaultState();
    ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-06", "2026-09-07"].forEach(function (d) { doneAll(st, d, 1); });
    var r = SR.streaks(st, "2026-09-08");
    eq(r.current, 2); eq(r.longest, 4);
  });

  // ---------- state + editor validation
  test("Broken or empty storage falls back to the default routine", function () {
    eq(SR.normalizeState(null).blocks.length, S.blocks.length);
    eq(SR.normalizeState("garbage").blocks.length, S.blocks.length);
    eq(SR.normalizeState({ blocks: [{ id: 1 }] }).blocks.length, S.blocks.length);
  });
  test("Editor: end must be after start; overlaps are reported", function () {
    ok(SR.validateBlock({ start: "10:00", end: "09:00", days: [0], title: "x" }).length === 1);
    eq(SR.validateBlock({ start: "10:00", end: "11:00", days: [0], title: "x" }).length, 0);
    var ov = SR.overlaps(S.blocks, { id: "new", start: "08:00", end: "09:30", days: [0], title: "x" });
    ok(ov.some(function (b) { return b.id === "dw1-sun"; }) && ov.some(function (b) { return b.id === "class-0"; }));
  });

  // ---------- report
  var failed = results.filter(function (r) { return !r.ok; });
  if (typeof document !== "undefined" && document.getElementById("results")) {
    var out = document.getElementById("results");
    document.getElementById("summary").textContent = (results.length - failed.length) + " / " + results.length + " passed";
    document.getElementById("summary").className = failed.length ? "bad" : "good";
    out.innerHTML = results.map(function (r) {
      var li = document.createElement("li");
      li.className = r.ok ? "pass" : "fail";
      li.textContent = (r.ok ? "✓ " : "✗ ") + r.name + (r.ok ? "" : " — " + r.msg);
      return li.outerHTML;
    }).join("");
  } else {
    results.forEach(function (r) { console.log((r.ok ? "✓ " : "✗ ") + r.name + (r.ok ? "" : "\n    " + r.msg)); });
    console.log("\n" + (results.length - failed.length) + " / " + results.length + " passed");
    if (typeof process !== "undefined") process.exitCode = failed.length ? 1 : 0;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
