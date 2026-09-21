# GoRun

A monthly running-goal tracker that turns a single number — *"100 km this month"* — into a weekly training plan, tracks every run against it, and keeps the whole thing on your device.

No account. No server. No build step. No dependencies. Open `index.html` in a browser and it works.

> **Context:** built as the Day 1 exercise of the **Palo IT Gen2 training programme**. The goal of the exercise was not really "ship a running app" — it was to practise a **spec-driven, AI-assisted delivery workflow**: meeting transcript → user stories → implementation plans → working software, with the plans as the contract throughout.

---

## Live demo

**https://santoshmc.github.io/gorun/**

The app is installable as a PWA and works fully offline once loaded.

---

## Table of contents

- [What the project was about](#what-the-project-was-about)
- [The workflow: transcript → stories → plans → code](#the-workflow-transcript--stories--plans--code)
- [The pivot: why this is vanilla JS and not React](#the-pivot-why-this-is-vanilla-js-and-not-react)
- [How it was built](#how-it-was-built)
- [Architecture](#architecture)
- [The 20 user stories](#the-20-user-stories)
- [Design language](#design-language)
- [Running it](#running-it)
- [Tests](#tests)
- [Honest limitations](#honest-limitations)
- [What I'd do differently](#what-id-do-differently)
- [Repository map](#repository-map)

---

## What the project was about

The brief came out of a product discussion about casual runners who set themselves a distance target each month and then have no idea whether they're on track. The app had to answer four questions at a glance:

1. **What am I aiming for?** — a monthly distance goal.
2. **What do I run today?** — a generated weekly plan, adjustable to real life.
3. **Am I on track?** — daily, weekly and monthly progress from actual activity data.
4. **Why should I keep going?** — streaks, badges, points, friends, challenges and coaching.

That decomposed into **20 vertically-sliced user stories**, each one a thin end-to-end slice rather than a technical layer. All 20 are implemented.

---

## The workflow: transcript → stories → plans → code

The exercise was built around three reusable prompts in [`.github/prompts/`](.github/prompts/), each with a distinct role:

```
meeting transcript
        │
        │  generate-stories-from-transcript.prompt.md
        │  (agile BA: INVEST principles, vertical slicing)
        ▼
docs/stories/01..20-*.md          ← 20 user stories + acceptance criteria
        │
        │  generate-implementation-plan.prompt.md
        │  (planner: design, components, state, AC — no code)
        ▼
docs/implementation-plans/STORY-01..20-*.md
        │
        │  execute-implementation-plan.prompt.md
        │  (executor: build, test, verify, update status)
        ▼
working application
```

The separation matters. The planner is explicitly forbidden from writing code, and the executor is explicitly forbidden from inventing scope. The **acceptance criteria in the story files are the contract** — every one of them is traceable to an assertion in the test suite.

Each plan carries a status marker (`🟩 COMPLETED`) plus a *Delivered in / Verified by / Note* block, so the plan folder doubles as the delivery record.

---

## The pivot: why this is vanilla JS and not React

This is the most instructive part of the exercise, so it's documented rather than hidden.

**Stories 1–3 were originally built in React 18 + TypeScript + Vite + Tailwind + Zustand.** That code is still in this repo under [`src/`](src/) and [`index.vite.html`](index.vite.html).

Partway through, the constraints changed — captured in [`Agents.md`](Agents.md):

> Use only vanilla HTML, CSS, and JavaScript — no frameworks, no TypeScript, no JSX.
> Never use npm, package.json, bundlers (Vite, Webpack, Parcel), or any tool that requires Node.js.
> Keep the project structure flat and simple: `index.html`, `style.css`, `script.js`.

**Why the constraint was the right call for this project:**

| Concern | With the toolchain | Without it |
|---|---|---|
| Time to first render | `npm install` → 136 MB of `node_modules` → dev server | double-click `index.html` |
| Showcasing it | needs a build and a host | any browser, any machine, even offline |
| Failure modes | Node version, install failures, bundler config | none — it's just files |
| Supply chain | hundreds of transitive dependencies | zero dependencies |
| Longevity | breaks when the toolchain moves on | works as long as browsers exist |

For an app that is **100% client-side with `localStorage` as its only persistence**, a build pipeline was pure overhead. The framework was solving problems this project didn't have.

**What the pivot actually cost:** less than it looks. The business logic — plan generation, progress maths, streaks, classification — was already written as pure functions with no React in them. Those ported to plain JS almost one-to-one. What was rewritten was the *rendering* layer, and stories 13–20 had no implementation in either stack.

**What it bought:** an app that installs as a PWA, runs with the network switched off, and has no attack surface from third-party packages.

> The React code is deliberately retained. It is no longer the delivered product, but deleting it would erase the most interesting part of the story.

---

## How it was built

### Contract-first, then parallel

The rebuild was deliberately sequenced so that independent work could happen simultaneously without collisions:

1. **Foundation written first** — `app.core.js`, `app.domain.js`, `app.store.js` and `style.css`. These define the entire contract: how state is read (`GR.select.derive()`), how it's changed (`GR.actions.*`), how DOM is built (`GR.h()`), and which CSS classes exist.
2. **Three UI modules built in parallel against that contract**, each owning a disjoint set of panels so no two touched the same file.
3. **Integration, then verification in a real browser.**

Every UI module follows the same rule, which is what keeps the app coherent:

> **Read only through `GR.select.derive()`. Write only through `GR.actions.*`. Never mutate state directly, and never call `renderAll()` yourself.**

Because every action funnels through one `commit()` function, badge awarding and revocation, points recalculation and re-rendering are automatic and impossible to forget.

### Derived, not stored

Streaks, badges, points, challenge progress and leaderboard positions are **never persisted**. They are recomputed from activities on every change.

This is what makes story 8 (*correct a misclassified activity*) work properly: reclassifying a walk as a run retroactively fixes the month total, the week, the daily completion, the streak, the points ledger — and can even **revoke a badge** that is no longer deserved. An incremental counter would have quietly drifted out of sync.

### Verification found real bugs

Static review would not have caught most of these. They only appeared by driving the actual DOM:

| Bug | Cause |
|---|---|
| Progress bars invisible | `.meter__fill` was a `<span>` — inline elements ignore `height: 100%` |
| Plan weeks clipped to 70px | flex items shrink inside a scroll container; needed `flex: none` |
| Install button always visible | `[hidden]` silently defeated by `display: inline-flex` |
| Status chips truncated to "CONNEC" | chips shrinking instead of the row wrapping |
| **Cross-provider de-duplication never triggered** | each provider generated an *independent* feed, so two sources never reported the same run — the story 5 criterion was untestable |
| **Challenge progress stuck at 0 km** | contribution counted only runs logged *after* joining |

The last two are the ones worth noting: both panels *looked* fine and threw no errors. Only checking the numbers against the acceptance criteria exposed them.

---

## Architecture

```
index.html          shell — bento grid of 15 panels, ordered <script> tags
style.css           design system: tokens, components, bento layout, responsive
app.core.js         namespace, safe storage, state store + pub/sub, GR.h() DOM helper,
                    inline SVG icons, Web Audio sound engine, dialogs, toasts, confetti
app.domain.js       PURE LOGIC — units, dates, validation, plan generation & editing,
                    provider feed, classification, de-duplication, progress, streaks,
                    badges, points, friends, leaderboard, challenges, coaching copy
app.store.js        GR.select.derive() (memoised derived state) + GR.actions.* (mutations)
app.ui.core.js      panels: goal, training plan, activities, connected sources   (stories 1–8)
app.ui.progress.js  panels: month, streak, today, week, coach, history     (stories 9–12, 20)
app.ui.social.js    panels: badges, points, friends, leaderboard, challenges,
                    share dialog                                              (stories 13–18)
script.js           bootstrap, month switcher, settings, sample data, PWA install, SW reg
manifest.json       PWA manifest
sw.js               service worker — cache-first app shell
icon.svg            app icon
tests.html          79-assertion test suite, runs in the browser
```

Load order is `core → domain → store → ui.* → script`, via plain `<script>` tags. No ES modules, deliberately: `import` requires `http://` and would break opening the file directly from disk.

**Canonical unit is kilometres.** Everything is stored in km and converted only at the point of display, so switching between km and miles can never corrupt stored data.

**Plan weeks map to real dates.** A month is split into four blocks (days 1–7, 8–14, 15–21, 22–end), so every planned day has an actual calendar date. That's what makes daily completion, weekly rollups and streaks deterministic.

---

## The 20 user stories

| # | Story | Where it lives |
|---|---|---|
| 1 | Create a monthly running distance goal | `app.ui.core.js` · goal panel + dialog |
| 2 | Generate a systematic weekly run plan | `app.domain.js` `generatePlan()` |
| 3 | Customise the generated plan | `setDayDistance` / `toggleDayType` / `moveDay` + mismatch banner |
| 4 | Connect a health or fitness account | `app.ui.core.js` · sources panel, consent + scopes |
| 5 | Import run activities and metrics | `fetchProviderActivities()` + de-duplication |
| 6 | Log a run manually | log-run dialog, pace & speed derived |
| 7 | Count only runs towards the goal | `classifyActivity()` — provider label, pace fallback |
| 8 | Correct a misclassified activity | `setActivityType()`, correction survives re-sync |
| 9 | See whether today's planned distance was hit | `dailyCompletion()` · today panel |
| 10 | Track weekly progress | `weekProgress()` · week panel |
| 11 | Track monthly goal progress | `monthProgress()` · month + history panels |
| 12 | Build and maintain a streak | `calculateStreak()` — rest days neutral |
| 13 | Earn badges | `evaluateBadges()` — 12 badges, auto award **and revoke** |
| 14 | Invite friends | link / email / consent-gated contacts |
| 15 | Share runs and streaks externally | preview + editable text, Web Share, X, LinkedIn |
| 16 | Compete on a leaderboard | week/month, self always visible, opt-out |
| 17 | Join a community challenge | 4 challenges, standings, countdown |
| 18 | Earn reward points | published rule, ledger, partner catalogue |
| 19 | Use it comfortably on a phone browser | verified 375 / 768 / 1280 px |
| 20 | Get motivational nudges and coaching | `coachingMessage()` · coach panel |

Full text in [`docs/stories/`](docs/stories/); build notes in [`docs/implementation-plans/`](docs/implementation-plans/).

---

## Design language

**Soft neo-brutalism, pastel palette** — per the direction in [`Agents.md`](Agents.md):

- **Bento grid** — 15 flat cards, no hero card, reflowing 12 → 6 → 1 column
- **2px black borders** with **hard offset shadows in the card's accent colour**, no blur
- **Rounded corners** to soften the brutalism
- **Eight pastel accents** — salmon, periwinkle, yellow, green, cyan, lavender, coral, pink
- **Bold uppercase system sans** — no webfont, so there are zero external requests
- **Hand-written inline SVG icons** — no icon library, keeps the app self-contained
- **Web Audio sound effects** — tones synthesised in code, no audio files
- **Animations throughout**, all disabled under `prefers-reduced-motion`

Every one of those choices serves the same constraint: the app must be a handful of files that work offline with no network requests at all.

---

## Running it

### Simplest — no tooling

```bash
open index.html      # macOS
```

Everything works from `file://`: goals, plans, activity import, progress, badges, sharing.

### For PWA install and offline caching

Service workers require an `http(s)` origin, so serve the folder:

```bash
python3 -m http.server 8099
# then open http://127.0.0.1:8099/
```

The app detects `file://` and skips service-worker registration rather than throwing.

### Seeing it populated

**Settings (⚙) → "Fill this month with sample data"** sets a goal, generates a plan, connects a demo source, imports activities, adds a friend and joins a challenge — so every panel has something to show. Erase it any time from the same menu.

The provider feed is **deterministic**, seeded per month, so re-syncing returns the same sessions and de-duplication is observable rather than theoretical.

---

## Tests

```bash
open tests.html
```

**79 assertions, no build step, no package manager** — a plain HTML page that loads the logic modules and prints a pass/fail report.

Covering: unit conversion and formatting, month/date arithmetic, goal and activity validation, plan generation and editing, mismatch detection, classification, de-duplication, daily/weekly/monthly progress, streak rules, points, and the full action layer including badge revocation, correction-survives-resync, and recovery from corrupt `localStorage`.

Additionally verified in-browser during development:

- 41 acceptance assertions driven through the live UI
- Zero console errors on load and interaction; all 15 panels render in empty **and** populated states
- No horizontal overflow and no sub-32px tap targets at 375 / 768 / 1280 px
- Service worker caches all 12 shell files; the app boots with the network disabled
- State survives reload and degrades gracefully when storage is corrupt or unwritable

---

## Honest limitations

This app has **no backend**, by design. Rather than fake it silently, the UI states it plainly:

- **Health providers (stories 4–5)** — no OAuth, no tokens, no API. Connecting runs a consent screen with real scope labels, then loads a deterministic locally-generated feed. Providers report *overlapping subsets of the same underlying sessions*, so de-duplication behaves the way it would against real sources.
- **Friends, leaderboard, challenges (14, 16, 17)** — seeded fixtures plus `localStorage`. Invites generate a real shareable link; acceptance is marked manually and is labelled as simulated in the UI.
- **Sharing (15)** — Web Share API with clipboard fallback, plus X and LinkedIn intent links. LinkedIn's `share-offsite` endpoint only accepts a URL, so the app URL is shared and the composed message is copied for pasting.
- **Reward redemption (18)** — a demo; the points balance is never debited.
- **Reminders (20)** — opt-in browser notifications where permitted, otherwise in-app only. With no push server, reminders cannot fire while the app is closed.
- **Data is per-browser.** No sync. Clearing site data starts you over.

---

## What I'd do differently

- **Fix the constraints before writing code.** The React → vanilla pivot cost real work that a five-minute conversation about hosting and distribution would have avoided.
- **Write the acceptance assertions alongside the plans.** Both logic bugs above survived because the criteria existed in prose but not yet as executable checks.
- **Smaller UI modules.** `app.ui.core.js` grew past 1,500 lines; splitting per panel would read better.
- **A visual regression check.** Four of the six bugs found were CSS layout issues that no logic test could ever catch.

---

## Repository map

```
index.html  style.css  script.js          the app
app.core.js  app.domain.js  app.store.js  foundation
app.ui.core.js  app.ui.progress.js  app.ui.social.js
manifest.json  sw.js  icon.svg            PWA
tests.html                                browser test suite

Agents.md                                 constraints the build had to honour
.github/prompts/                          the three workflow prompts
docs/stories/                             20 user stories + acceptance criteria
docs/implementation-plans/                20 plans, each with a status block

src/  index.vite.html  package.json       superseded React/TS/Vite build,
vite.config.ts  tailwind.config.ts        retained as history of the pivot
tsconfig.json  postcss.config.js
```

---

*Palo IT — Gen2 training programme, Day 1.*
