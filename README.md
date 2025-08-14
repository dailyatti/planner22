Cherry Digital Planner (Modular)
================================

A modular, Netlify-ready daily planner with a cherry theme.

Features
--------
- Daily tasks, priorities, schedule, meals
- Hydration tracker with adjustable goal and clickable glasses
- Mood tracker (emotions, 1–10 slider, notes)
- Notes & Ideas with formatting tools and TXT export
- PhD-level menstrual cycle tracker: logs actual starts, computes average cycle length from history, predicts next period and ovulation, CSV export, clear history
- PDF/PNG export, print, autosave per date

Structure
---------
- `index.html` – App shell
- `assets/css/cherry.css` – Theme and layout
- `assets/js/main.js` – App orchestration (ES modules)
- `assets/js/modules/*` – Feature modules (utils, exporter, todos, water, mood, notes, cycle)
- `netlify.toml` – Netlify config
- `404.html` – Netlify SPA fallback

Local development
-----------------
Open `index.html` in a browser. No build step is required.

Deploy to Netlify
-----------------
- Push this repository to GitHub
- Connect the repo in Netlify; use the default settings (no build command, publish directory `.`)

License
-------
MIT


