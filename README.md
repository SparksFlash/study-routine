# Study Routine

A small web app for your phone and laptop. It shows what you should be doing right now, today's timeline, a weekly timetable, and this month's roadmap topics. It also tracks your streak and exports your routine to Google Calendar.

- Plain HTML, CSS and JavaScript. There is no build step and no server.
- It works offline once it's installed.
- All times are Asia/Dhaka, even if your device is set to another time zone.
- Your data (edits, ticks, streak) is stored **only in the browser you use**. Use Export/Import to move it between devices (see below).

## What's in the folder

| File | What it is |
|---|---|
| `index.html` | The app page |
| `styles.css` | Look and feel (light and dark mode follow your system) |
| `app.js` | The screens and buttons |
| `logic.js` | Time zone, current/next block, streak, `.ics` export (no UI) |
| `data.js` | Default routine, short plans, monthly topics, first 30 days |
| `manifest.webmanifest`, `sw.js`, `icons/` | What makes it installable and work offline |
| `tests.html`, `tests.js` | Tests |
| `.github/workflows/pages.yml` | Publishes the app to GitHub Pages automatically |

To change the **default** routine or topics, edit `data.js`. Normal day-to-day edits happen inside the app and don't need code.

---

## 1. Open it on your computer

**Quickest:** double-click `index.html`. Everything works except offline mode and "install as app", which need a web address.

**Like the real thing:** open a terminal in this folder and run:

```
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser. Press `Ctrl+C` in the terminal to stop.

**Run the tests:** open <http://localhost:8000/tests.html> (or double-click `tests.html`). It should say **33 / 33 passed**. You can also run `node tests.js`.

**Preview another time:** add `?now=` to the address, for example <http://localhost:8000/?now=2026-09-27T20:44>. The app then acts as if it's that time in Dhaka. You can also open a screen directly: `#today`, `#week`, `#month`, `#settings`.

---

## 2. Put it online with GitHub Pages (free)

The project is already a Git repository with all the work committed. You only need to create an empty repository on GitHub, push to it, and turn on Pages.

In these steps, replace `YOUR-USERNAME` with your GitHub username.

### Step A: Create an empty repository on GitHub

1. Go to <https://github.com/new>.
2. **Repository name:** `study-routine`
3. Choose **Public**. GitHub Pages is free only for public repositories on a free account. Your personal data never goes to GitHub: it stays in your browser.
4. **Don't** tick "Add a README", ".gitignore" or "license". The repository must be empty.
5. Click **Create repository**.

### Step B: Push this folder

Open a terminal in this folder and run:

```
git remote add origin https://github.com/YOUR-USERNAME/study-routine.git
git push -u origin main
```

If the push is refused with a message about `workflow` scope, run `gh auth refresh -s workflow` (or `gh auth login`) and push again.

### Step C: Turn on Pages

1. On GitHub, open your repository and click **Settings** (top bar).
2. In the left menu, click **Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Click the **Actions** tab at the top of the repository. You'll see the "Deploy to GitHub Pages" workflow running. It runs the tests first and then publishes. If it already ran and failed because Pages wasn't turned on yet, click the run, then **Re-run all jobs**.
5. After a minute or two, the run turns green ✓. Your app is at:

   **https://YOUR-USERNAME.github.io/study-routine/**

From then on, every `git push` republishes the app automatically.

---

## 3. Install it on your Android phone

1. Open **https://YOUR-USERNAME.github.io/study-routine/** in **Chrome** on your phone.
2. Tap the **⋮** menu (top right).
3. Tap **Add to Home screen**, then choose **Install**. On some phones this item is called **Install app**.
4. The **Routine** icon appears on your home screen. It opens full-screen and works offline.

On an iPhone: open the link in Safari, tap **Share**, then **Add to Home Screen**.

When you publish an update, the app picks it up the next time you open it while online.

---

## 4. Get phone notifications with Google Calendar

The app can't send notifications by itself. Instead, it exports your weekly routine as a calendar file, and Google Calendar reminds you when each block starts.

### Export the file

1. In the app, go to **Settings → Google Calendar (.ics)**.
2. **Start repeating from** is set to next Sunday by default. Pick another date if you like.
3. Tap **Export .ics**. A file called `study-routine.ics` downloads.

It contains one weekly repeating event per block (Sleep is left out), with a reminder 5 minutes before. It always uses your **current** routine, including your edits.

### Import it into Google Calendar

Do this on a **computer**, because the Google Calendar phone app can't import files.

1. Open <https://calendar.google.com>.
2. **Create a separate calendar**, so you can delete or replace everything in one go:
   1. In the left sidebar, next to **Other calendars**, click **+** and then **Create new calendar**.
   2. **Name:** `Study Routine`. **Time zone:** (GMT+06:00) Dhaka.
   3. Click **Create calendar**.
3. **Set its reminder.** Google Calendar sometimes ignores reminders inside imported files, so set one on the calendar itself:
   1. In the left menu of Settings, under **Settings for my calendars**, click **Study Routine**.
   2. Scroll down to **Event notifications**, click **Add notification**, and set it to **Notification, 5 minutes**.
4. **Import the file:**
   1. In the left menu of Settings, click **Import & export**.
   2. Under **Select file from your computer**, choose `study-routine.ics`.
   3. Under **Add to calendar**, choose **Study Routine**. Don't choose your main calendar.
   4. Click **Import**.
5. On your phone, open the **Google Calendar** app. Tap **☰**, make sure **Study Routine** is ticked, and allow notifications for the Google Calendar app in your Android settings.

### Changed your routine? Re-import it

1. In Google Calendar **Settings**, click **Study Routine**, scroll to the bottom, and click **Remove calendar → Delete**.
2. Repeat step 2 (create the calendar), step 3 (set the reminder) and step 4 (import) with a newly exported file.

This avoids ending up with every event twice.

---

## 5. Move your data between phone and laptop

Each browser keeps its own copy of your data, so the phone and laptop don't sync automatically.

1. On the device that has the up-to-date data, go to **Settings → Export data (JSON)**. A file like `study-routine-2026-09-23.json` downloads.
2. Send the file to your other device, for example by email to yourself, Google Drive, or Telegram "Saved Messages".
3. On the other device, go to **Settings → Import data (JSON)**, choose the file, and confirm.

Importing **replaces** everything on that device, including routine edits, ticks, streak and checklists. Treat one device as the main one, and export from it often.

**Reset to default** (in Settings) deletes all your edits and history on that device and restores the original routine. It asks you to confirm twice.

---

## How the app behaves

- **Now:** shows the current block with its minutes left, a progress bar, this month's topic for that lane, and a **Done ✓** button. Below it is the next block. Between 23:00 and your first block, it shows **Sleep — 7.5 h, non-negotiable**. If two blocks overlap, the one that started later is shown as current.
- **Today:** today's timeline with checkboxes, and the **Normal / 3-hour plan / 1-hour minimum day** switch. Choosing a short plan replaces today's timeline with that plan (plus Sleep). Its start time can be changed there or in Settings. Below the timeline you'll find the streak, the never-skip badges (Walk · DSA · IELTS · Shutdown · Sleep), the First 30 days checklist (23 Sep to 22 Oct 2026), and a 12-week heatmap.
- **Streak:** a day counts if you tick at least **70% of its non-routine blocks**, or tick **every item** of the 3-hour or 1-hour plan. Routine and optional blocks don't count. While today isn't done yet, the streak shows the days up to yesterday, so it doesn't drop to 0 each morning.
- **Week:** a Sun→Sat timetable. Tap any block to edit it. Use **+ Add block** to add one.
- **Editing:** you can change the start/end time, weekdays, lane, title, details and "optional". If the end time is before the start time, the app won't save. If the block overlaps another one, it warns you but still saves. **Duplicate to other days** makes a copy on the weekdays you pick. A block that repeats on several days is one block, so an edit changes all of those days.
- **Month:** each lane's topic, the LeetCode target (total solved) and the "Done when" checklist for that month. Use ‹ › to look at other months. September 2026 shows Phase 0. May to September 2028 reuse the April 2028 plan.
- **Settings:** class times per weekday, short-plan start times, `.ics` export, and export/import/reset of your data.

### Changes I made to your seed routine

- **Friday Shutdown** is at **21:20–21:35**, because Friday's IELTS block runs 21:00–21:20 and the two would overlap otherwise. On every other day, Shutdown stays at 21:05–21:20.
- **Saturday's LeetCode contest** (20:30–22:00) is marked **optional**. It overlaps Shutdown, which is fine: Shutdown shows as current from 21:05.
- **Sleep** is stored as a 23:00–23:59 block, so you can tick "In bed ✓". It is never exported to the calendar.
