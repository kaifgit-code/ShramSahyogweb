# ShramSahyog — Working Demo

A functional, client-only demo of a cooperative gig-work platform for skilled
workers (electricians, plumbers, domestic help, drivers, etc). No backend,
no build step — plain HTML/CSS/JS, data kept in the browser's `localStorage`.

## Features

- **Find a worker** — customers submit a request; SmartMatch ranks available,
  KYC-verified workers first by skill, city, and rating.
- **Urgent / emergency requests** — one tap from the home page marks a
  request urgent and searches every city, not just the customer's own.
- **Register as worker** — new profiles with skills, cooperative name, and a
  KYC section (Aadhaar status + trade/skill certificate ID).
- **Worker dashboard** — profile card, accept/decline requests, mark jobs
  completed, see rating and total payout.
- **My bookings** — customers look up bookings by phone, pay (UPI/cash, with
  an automatic 5% cooperative fee), and rate the worker.
- **Support / complaints** — raise and track complaints about a booking or
  worker; visible to the cooperative admin too.
- **Cooperative admin** — read-only totals: workers, bookings, complaints,
  cooperative fund collected.
- **SMS / IVR simulation** — a prompt-based flow standing in for the
  offline/no-smartphone access path.
- **EN / हिं toggle** — switches all key UI strings between English and Hindi.
- **Light / dark theme toggle** — remembers your choice, and follows system
  preference on first visit.

Ten sample workers are seeded on first load so SmartMatch has something to
match against immediately. Use **Reset demo data** on the admin page to start over.

## Run locally

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```
Or just double-click `index.html`.

## Run the smoke test

```bash
npm install
npm test
```
`test.js` drives the whole loop headlessly with jsdom — request → match →
accept → complete → pay → rate → register → admin → SMS simulation → language
toggle — and fails loudly if any step breaks.

## Push this to GitHub

```bash
git init
git add .
git commit -m "ShramSahyog working prototype"
# create an empty repo on github.com first, then:
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Deploy on GitHub Pages

1. Push this folder to a GitHub repo (steps above).
2. Settings → Pages → set source to your branch (root, or `/docs` if you move
   the files there).
3. Live at `https://<username>.github.io/<repo>/`.

## Known limitations (it's a hackathon demo)

- No real backend, auth, or payment gateway — everything lives in
  `localStorage` on one browser.
- "Login" as a worker is just picking your name from a dropdown.
- KYC verification is a self-declared dropdown, not a real Aadhaar/eKYC check.
- SMS/IVR is simulated with browser prompts, not a real telephony integration.
