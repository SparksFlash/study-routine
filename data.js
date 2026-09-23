/* Study Routine — seed data.
 * Everything here is the DEFAULT. Your edits live in localStorage and never change this file.
 * Weekdays: 0 = Sunday … 6 = Saturday. Times are Asia/Dhaka, "HH:MM".
 */
(function (root) {
  "use strict";

  var CLASS_DAYS = [0, 1, 2, 3, 4];
  var ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  var LANES = {
    ai:       { label: "AI theory" },
    cs:       { label: "CS theory" },
    project:  { label: "Project" },
    dsa:      { label: "DSA" },
    research: { label: "Research" },
    kaggle:   { label: "Kaggle" },
    sd:       { label: "System design" },
    ielts:    { label: "IELTS" },
    routine:  { label: "Routine" }
  };

  // Lanes that have a monthly topic (in this display order).
  var TOPIC_LANES = ["ai", "cs", "project", "dsa", "kaggle", "research", "sd"];

  function b(id, days, start, end, lane, title, details, extra) {
    var o = { id: id, days: days, start: start, end: end, lane: lane, title: title, details: details || "" };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  var BLOCKS = [
    // ---- Every day
    b("wake", ALL_DAYS, "06:30", "07:00", "routine", "Wake up, water, 10-min walk", "", { tag: "walk" }),
    b("shutdown", [0, 1, 2, 3, 4, 6], "21:05", "21:20", "routine", "Shutdown", "Log LeetCode, Anki, write tomorrow's 3 tasks", { tag: "shutdown" }),
    // Friday's IELTS runs 21:00–21:20, so Friday's shutdown follows it instead of overlapping.
    b("shutdown-fri", [5], "21:20", "21:35", "routine", "Shutdown", "Log LeetCode, Anki, write tomorrow's 3 tasks", { tag: "shutdown" }),
    b("sleep", ALL_DAYS, "23:00", "23:59", "routine", "Sleep", "7.5 h, non-negotiable", { tag: "sleep" }),

    // ---- Class days (Sun–Thu)
    b("dw1-sun", [0], "07:00", "08:30", "ai", "Deep work 1: AI theory", "Math / ML / DL"),
    b("dw1-mon", [1], "07:00", "08:30", "cs", "Deep work 1: CS theory", "OS / Networks / DB"),
    b("dw1-tue", [2], "07:00", "08:30", "ai", "Deep work 1: AI theory", "Math / ML / DL"),
    b("dw1-wed", [3], "07:00", "08:30", "cs", "Deep work 1: CS theory", "OS / Networks / DB"),
    b("dw1-thu", [4], "07:00", "08:30", "ai", "Deep work 1: AI theory → code", "Implement this week's concept in code"),
    b("class-0", [0], "09:00", "14:00", "routine", "University", "Classes / thesis", { kind: "class" }),
    b("class-1", [1], "09:00", "14:00", "routine", "University", "Classes / thesis", { kind: "class" }),
    b("class-2", [2], "09:00", "14:00", "routine", "University", "Classes / thesis", { kind: "class" }),
    b("class-3", [3], "09:00", "14:00", "routine", "University", "Classes / thesis", { kind: "class" }),
    b("class-4", [4], "09:00", "14:00", "routine", "University", "Classes / thesis", { kind: "class" }),
    b("lunch-nap", CLASS_DAYS, "14:00", "15:00", "routine", "Lunch + 20-min nap", ""),
    b("dw2", CLASS_DAYS, "15:00", "16:30", "project", "Deep work 2: project implementation", "End with a commit"),
    b("break", CLASS_DAYS, "16:30", "17:00", "routine", "Break, move", ""),
    b("dsa-new", [0, 1, 2, 3], "17:00", "18:15", "dsa", "DSA: 2 new + 1 re-solve", ""),
    b("dsa-thu", [4], "17:00", "18:15", "dsa", "DSA: Re-solve day", "5 problems, no new"),
    b("dinner", CLASS_DAYS, "18:15", "19:30", "routine", "Dinner, exercise, family", ""),
    b("rot-sun", [0], "19:30", "20:45", "cs", "CS/backend reading", ""),
    b("rot-mon", [1], "19:30", "20:45", "kaggle", "Kaggle", ""),
    b("rot-tue", [2], "19:30", "20:45", "research", "Read 1 paper → lit matrix", ""),
    b("rot-wed", [3], "19:30", "20:45", "sd", "System design", "Backend concepts until Mar 2027"),
    b("rot-thu", [4], "19:30", "20:45", "kaggle", "Kaggle", ""),
    b("ielts-sun", [0], "20:45", "21:05", "ielts", "IELTS Listening", "1 section + transcript review"),
    b("ielts-mon", [1], "20:45", "21:05", "ielts", "IELTS Reading", "1 passage, timed 20 min"),
    b("ielts-tue", [2], "20:45", "21:05", "ielts", "IELTS Writing Task 1", ""),
    b("ielts-wed", [3], "20:45", "21:05", "ielts", "IELTS Speaking", "Part 2 cue card recorded + 3 Part 3 questions"),
    b("ielts-thu", [4], "20:45", "21:05", "ielts", "IELTS Vocabulary + Listening", ""),

    // ---- Friday
    b("fri-research", [5], "07:00", "10:00", "research", "Research deep block", "Experiments / writing"),
    b("fri-free", [5], "10:00", "14:00", "routine", "Free", ""),
    b("weekend-lunch", [5, 6], "14:00", "15:00", "routine", "Lunch", ""),
    b("fri-off", [5], "15:00", "19:30", "routine", "OFF — recovery", ""),
    b("fri-kaggle", [5], "19:30", "21:00", "kaggle", "Kaggle or catch-up", ""),
    b("fri-ielts", [5], "21:00", "21:20", "ielts", "IELTS Writing Task 2 (part a)", "Plan + intro + body 1"),

    // ---- Saturday
    b("sat-project", [6], "07:00", "09:30", "project", "Project long block", ""),
    b("sat-dsa", [6], "10:00", "11:30", "dsa", "DSA weekly revision", "+ virtual weekly contest from Jan 2027"),
    b("sat-review", [6], "11:30", "12:30", "routine", "Weekly review & plan", "Check month's \"done when\", re-rate weak skills, plan next week's 5 deliverables"),
    b("sat-sd", [6], "15:00", "16:00", "sd", "CS / system design reading", ""),
    b("sat-ielts", [6], "19:30", "19:50", "ielts", "IELTS Writing Task 2 (part b) + Speaking", "Body 2 + conclusion, self-score"),
    b("sat-contest", [6], "20:30", "22:00", "dsa", "LeetCode Biweekly contest (optional)", "From Jan 2027, only on contest weeks", { optional: true })
  ];

  var PLANS = {
    three: {
      label: "3-hour plan",
      start: "18:00",
      items: [
        { lane: "dsa", title: "DSA", details: "1 new + 1 re-solve", min: 60 },
        { lane: "project", title: "This week's #1 deliverable", details: "", min: 90 },
        { lane: "ielts", title: "IELTS", details: "", min: 20 },
        { lane: "routine", title: "Log + plan", details: "", min: 10 }
      ]
    },
    one: {
      label: "1-hour minimum day",
      start: "18:00",
      items: [
        { lane: "dsa", title: "1 LeetCode re-solve", details: "", min: 25 },
        { lane: "ielts", title: "IELTS", details: "", min: 20 },
        { lane: "ai", title: "Current theory chapter", details: "", min: 15 }
      ]
    }
  };

  var PHASE0_TEXT = "Phase 0: audit & setup — diagnostics, tooling, trackers.";

  var MONTHLY_TOPICS = {
    "2026-10": {"ai":"Linear algebra: MML ch 2–4 + 3Blue1Brown; NumPy","cs":"OS: OSTEP ch 4–10, 13–20, 26–32; Linux/Git (Missing Semester); Python depth","project":"P1 pykv (Redis-like KV store) v1.0","dsa":"Arrays, hashing, two pointers, sliding window, prefix sum, stack (C++ new, Python re-solve)","kaggle":"Kaggle Learn: Pandas, Intro ML; EDA notebook #1","research":"Status doc; lit matrix 6 papers; paper #1 experiment plan","sd":"HTTP basics (MDN)","lc":45,"done":["pykv works with redis-cli + benchmarks in README","Explain page-table walk and a race-condition fix without notes","SVD image-compression notebook"]},
    "2026-11": {"ai":"Probability (Stat 110 / MML 6), calculus & optimization (MML 5, 7); Géron ch 1–4 + ISLP 2–4","cs":"Networks: Kurose ch 1–3 (+IP/NAT), TLS/DNS; OSTEP 36–42 (file systems, journaling)","project":"Linear/logistic regression from scratch vs sklearn; P1 v1.1 (snapshot + AOF compaction)","dsa":"Stack, linked list, binary search (incl. on answer), recursion","kaggle":"First Playground submission with 5-fold CV","research":"Paper #1 experiments; lit matrix 12","sd":"HTTP caching, REST basics","lc":85,"done":["HTTPS request trace write-up","Logistic regression matches sklearn within 1e-3","CV–leaderboard gap documented"]},
    "2026-12": {"ai":"Statistics (CIs, bootstrap, hypothesis tests); Géron trees, ensembles, LightGBM, metrics","cs":"DBMS: CMU 15-445 (storage, B+tree, joins, concurrency control, recovery); Postgres isolation/MVCC; SQL 50","project":"postgres-lab: 10 experiments (indexes, isolation anomalies, deadlocks, EXPLAIN)","dsa":"Trees (DFS/BFS), BST, backtracking","kaggle":"Playground top 30%; notebook #2","research":"Paper #1 full draft","sd":"Caching basics","lc":120,"done":["SQL 50 done","Reproduce write skew and fix it","Explain B+tree and WAL from memory"]},
    "2027-01": {"ai":"PCA/k-means/bias-variance; Goodfellow 4–5, 6 (start); PyTorch basics","cs":"FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic; REST design, idempotency; auth (argon2, JWT+refresh, OAuth2/OIDC, RBAC); OWASP API Top 10","project":"P3 bookit v0.5 (concurrency-safe booking API)","dsa":"Heaps/top-K, backtracking II, intervals — new problems now in Python; contests begin","kaggle":"Playground top 20%","research":"Submit paper #1; apply for internships","sd":"API design","lc":155,"done":["200 parallel bookings → exactly 1 success (test)","Auth test suite green"]},
    "2027-02": {"ai":"Goodfellow 6–8 (feedforward, regularization, optimization)","cs":"Redis caching + rate limiting (Lua), Celery, logging/metrics, Docker, GitHub Actions, AWS core","project":"P3 v1.0 on AWS + Locust report; P2 autograd engine","dsa":"Graphs I: BFS/DFS, grids, topo sort, union-find","kaggle":"Playground top 15%","research":"Choose flagship direction with supervisor; start lit review","sd":"Scaling basics","lc":190,"done":["P3 production checklist passes (auth, RBAC, ≥80% coverage, CI/CD, HTTPS, dashboard, load test)","Autograd gradient check passes"]},
    "2027-03": {"ai":"Goodfellow 7, 9, 11; ResNet-18 on CIFAR-10 with W&B","cs":"DDIA ch 1–9; Kafka + outbox pattern; CS:APP ch 6","project":"P3 v1.1 (Kafka events); ResNet ablation table","dsa":"Graphs II: Dijkstra, MST, greedy (~1550 rating)","kaggle":"Join a CV competition","research":"Flagship lit matrix 20; research question v1","sd":"Alex Xu ch 1–6","lc":220,"done":["URL shortener design in 45 min with estimates","ResNet ≥93% + ablation report"]},
    "2027-04": {"ai":"Goodfellow 10 (partial); Karpathy Zero to Hero; Attention Is All You Need","cs":"OOP/LLD: 6 design patterns + 3 LLD problems","project":"P4 tinygpt-bn (BPE tokenizer + GPT on Bangla corpus, KV-cache inference)","dsa":"DP I: 1D, 2D, knapsack, LIS, LCS","kaggle":"Finish CV competition (top 25%)","research":"Flagship baseline reproduced; resume v1, LinkedIn, GitHub profile","sd":"Alex Xu ch 7–12","lc":250,"done":["Implement and explain a Transformer (every tensor shape)","2 system-design mocks"]},
    "2027-05": {"ai":"HF/PEFT, LoRA/QLoRA, quantization; Huyen AI Engineering ch 1–4; Raschka ch 5–7","cs":"Structured outputs, tool calling","project":"LoRA finetune: baseline vs prompting vs finetune, with CIs","dsa":"DP II, tries, monotonic stack/deque; mock interviews 2/month","kaggle":"Notebooks only","research":"Flagship experiments; book IELTS test; job applications 5–10/week","sd":"Mocks","lc":275,"done":["Finetune beats baseline on held-out data, with error analysis"]},
    "2027-06": {"ai":"Huyen ch 5–6: embeddings, chunking, BM25, pgvector HNSW, hybrid search, reranking, RAG evaluation","cs":"Langfuse tracing, prompt injection basics","project":"P5 groundwork (RAG) core","dsa":"Mixed timed sets, bit manipulation, math","kaggle":"Notebooks only","research":"Start paper reproduction R1; IELTS 45 min/day","sd":"Weekly mock","lc":300,"done":["Eval harness reports metrics on ≥150-question golden set"]},
    "2027-07": {"ai":"Huyen ch 7–8; semantic caching, guardrails, cost/latency","cs":"Observability","project":"P5 v1.0 deployed; R1 reproduction repo + report","dsa":"Company-tagged mixed; readiness test","kaggle":"Notebooks only","research":"Thesis defense; flagship results; weekly IELTS full mock","sd":"Weekly mock","lc":320,"done":["RAG system built + evaluated","Paper reproduced","Medium DSA interview readiness criteria met"]},
    "2027-08": {"ai":"Huyen ch 9–10; vLLM, KV cache, batching, GPU basics; MIT 6.5940 selected","cs":"Computer architecture + GPU memory hierarchy","project":"P6 benchmark harness (HF vs vLLM, fp16 vs int4)","dsa":"Maintenance 3–4/week + contests","kaggle":"—","research":"IELTS TEST; 25-professor shortlist; SOP v1","sd":"—","lc":330,"done":["IELTS ≥7.5","Benchmark report published"]},
    "2027-09": {"ai":"Agents: tool loops, MCP, agent evaluation; OWASP LLM Top 10","cs":"—","project":"P6 gateway + agent service","dsa":"Maintenance","kaggle":"—","research":"Professor emails batch 1; recommenders confirmed; write flagship paper","sd":"—","lc":340,"done":["Agent passes ≥30-task eval suite with failure taxonomy"]},
    "2027-10": {"ai":"—","cs":"—","project":"P6: semantic cache, Kafka metering, dashboards, load tests","dsa":"Maintenance","kaggle":"Team NLP/LLM competition","research":"Email batch 2; SOP final; flagship preprint on arXiv + submission","sd":"Alex Xu 13–15 + AI system design (LLM serving, RAG platform, agent platform)","lc":350,"done":["Flagship on arXiv"]},
    "2027-11": {"ai":"—","cs":"K8s via kind, minimal Terraform, LLD refresh","project":"P6 v1.0","dsa":"Maintenance","kaggle":"Competition","research":"SUBMIT US applications + early scholarships","sd":"—","lc":360,"done":["US applications submitted"]},
    "2027-12": {"ai":"—","cs":"—","project":"P6 polish + blog post","dsa":"Maintenance","kaggle":"Finish competition (bronze = stretch)","research":"Remaining applications; paper revisions","sd":"—","lc":370,"done":["All applications submitted; 3 letters confirmed"]},
    "2028-01": {"ai":"Goodfellow 14, 15, 20 + DDPM paper","cs":"—","project":"—","dsa":"Maintenance","kaggle":"—","research":"Europe applications; 10-min research talk","sd":"Recommendation + search system design","lc":375,"done":[]},
    "2028-02": {"ai":"—","cs":"—","project":"—","dsa":"Maintenance","kaggle":"—","research":"Admissions interviews; flagship extension experiments","sd":"System design + LLD mocks","lc":380,"done":["LLM-serving + RAG-platform designs mocked, rated 'hire'"]},
    "2028-03": {"ai":"CUDA/Triton basics — only if systems track","cs":"—","project":"—","dsa":"Maintenance","kaggle":"—","research":"Decisions; paper #2 / extension","sd":"—","lc":390,"done":[]},
    "2028-04": {"ai":"—","cs":"—","project":"—","dsa":"Maintenance","kaggle":"—","research":"DECISION GATE: admitted → funding + visa; not admitted → stronger job + reapply Fall 2029","sd":"—","lc":395,"done":[]}
  };

  // First 30 days: date | AM | PM | DSA | Evening | IELTS
  var FIRST30_COLUMNS = ["AM", "PM", "DSA", "Evening", "IELTS"];
  var FIRST30_RAW = [
    "2026-09-23 | Read roadmap; write 1-page Why+Goals; build tracker | Env setup: Linux/WSL2, VS Code, uv, ruff, pytest, Git+SSH; repos dsa, notes, lab-notebook | Diagnostic (C++, 25 min each): LC 1, 20, 121 | Missing Semester L1 (shell) | Speaking: 3 Part-1 answers recorded",
    "2026-09-24 | MML ch 2 exercises; 3B1B LA ep 1–3 | Python diagnostic: word-frequency CLI with tests (90 min) | Diagnostic: LC 49, 238, 3 | Kaggle account; Learn Pandas 1–3 | Vocab + Listening",
    "2026-09-25 | Research 3 h: 1-page research status; list 15 papers | Off | — | SQL 50 #1–10 | Writing T2 (a)",
    "2026-09-26 | Full IELTS diagnostic mock; score it | Weekly review: rate 40 skills 0–5 | Review diagnostics; tag weak patterns | Missing Semester L2 | Writing T2 (b)",
    "2026-09-27 | 3B1B ep 4–7; MML 2.1–2.4 | Python classes, iterators, generators (3 exercises) | LC 217, 242 | Git lecture + Pro Git ch 2–3 | Listening",
    "2026-09-28 | OSTEP ch 4–5; fork/exec/wait | Decorators + context managers | LC 347, 128 | Kaggle Learn Pandas 4–6 | Reading",
    "2026-09-29 | MML 2.5–2.7; NumPy | typing, dataclasses, pathlib, logging; refactor CLI | LC 36, 169 | Research: paper 1 → lit matrix | Writing T1",
    "2026-09-30 | OSTEP ch 6–7 | asyncio basics | LC 125, 167 | Missing Semester debugging & profiling | Speaking",
    "2026-10-01 | MML ch 3; Gram–Schmidt in NumPy | asyncio TCP echo server | Re-solve in Python: 1, 20, 49, 121, 238 | Kaggle Learn Data Viz 1–2 | Vocab + Listening",
    "2026-10-02 | Research 3 h: papers 2–3; paper #1 experiment list | Off | — | Start EDA notebook | Writing T2 (a)",
    "2026-10-03 | P1 pykv design doc + repo skeleton + CI | Weekly review | Re-solve flagged; pattern notes | OSTEP ch 8 | Writing T2 (b) + Speaking",
    "2026-10-04 | MML ch 4 part 1 + 3B1B eigen | P1: RESP parser (TDD) | LC 15, 11 | OSTEP ch 13–14; Phase 0 report | Listening",
    "2026-10-05 | OSTEP ch 15–16 | P1: store + dispatch + concurrent server | LC 26, 42 | EDA notebook | Reading",
    "2026-10-06 | MML ch 4 SVD; image compression notebook | P1: TTL | LC 424, 567 | Research paper 4 | Writing T1",
    "2026-10-07 | OSTEP ch 18–19 | P1: AOF persistence | LC 643, 209 | MDN HTTP overview | Speaking",
    "2026-10-08 | MML ch 5 | P1: LRU eviction | Re-solve day (5, Python) | Publish EDA notebook | Vocab + Listening",
    "2026-10-09 | Research 3 h: W&B + lab notebook; baseline | Off | — | Notebook conclusions | Writing T2 (a)",
    "2026-10-10 | P1: redis-benchmark throughput + p99 | Weekly review | LC 146 + revision | OSTEP ch 26–28 | Writing T2 (b) + Speaking",
    "2026-10-11 | Matrix gradients; gradient check | P1 README + diagram + coverage | LC 560, 303 | OSTEP ch 29–30 | Listening",
    "2026-10-12 | OSTEP ch 31–32 | P1: threads vs asyncio experiment | LC 724, 523 | Kaggle Intro ML 1–3 | Reading",
    "2026-10-13 | Stat 110 L1–2 / MML 6.1–6.3 | P1: snapshot + AOF compaction | LC 155, 150 | Research paper 5 | Writing T1",
    "2026-10-14 | OSTEP ch 39–40, 42 | P1: kill -9 durability test | LC 739, 496 | MDN HTTP caching | Speaking",
    "2026-10-15 | Stat 110 L3–4; Monte Carlo sims | P1: consistent hashing, 3 nodes | Re-solve day (5, Python) | Kaggle Intro ML 4–7 | Vocab + Listening",
    "2026-10-16 | Research 3 h: experiments; draft results | Off | — | Catch-up | Writing T2 (a)",
    "2026-10-17 | P1 v1.0 release | Weekly review | LC 853, 84 | — | Writing T2 (b) + Speaking",
    "2026-10-18 | Gaussian MLE derived + coded | C++ STL refresher | LC 704, 74 | Git: rebase, bisect | Listening",
    "2026-10-19 | Kurose ch 1 | Blog draft: mini-Redis | LC 875, 153 | Kaggle Intermediate ML 1–3 | Reading",
    "2026-10-20 | MML ch 7: GD + momentum | Publish blog | LC 33, 981 | Research paper 6 | Writing T1",
    "2026-10-21 | Kurose ch 2 | pykv as systemd service | LC 53, 56 | FastAPI first steps | Speaking",
    "2026-10-22 | Month-1 self-exam (recorded) + 3 unseen Mediums | Re-rate skills; plan M2 | Re-solve day | Kaggle Intermediate ML 4–7 | Vocab + Listening"
  ];

  var DATA = {
    LANES: LANES,
    TOPIC_LANES: TOPIC_LANES,
    BLOCKS: BLOCKS,
    PLANS: PLANS,
    PHASE0_TEXT: PHASE0_TEXT,
    MONTHLY_TOPICS: MONTHLY_TOPICS,
    FIRST30_COLUMNS: FIRST30_COLUMNS,
    FIRST30_RAW: FIRST30_RAW,
    WEEKDAYS: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    WEEKDAYS_LONG: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  };

  if (typeof module === "object" && module.exports) module.exports = DATA;
  else root.SR_DATA = DATA;
})(typeof globalThis !== "undefined" ? globalThis : this);
