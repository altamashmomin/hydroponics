# Hydroponic Wall

A companion app for an indoor hydroponic grow wall, implemented from the
[Hydroponic Wall Wireframes](https://claude.ai/design/p/0642b27b-7aa3-4b8f-8717-ade7542ff6b3)
design exploration. Plain HTML/CSS/JS — no build step, no dependencies.

## Run it

Open `index.html` directly, or serve the folder so the phone and tablet
screens share state:

```sh
python3 -m http.server 8000
# phone app:  http://localhost:8000/
# wall tablet: http://localhost:8000/tablet.html
```

## Screens

**Phone app (`index.html`)** — four tabs, matching the wireframes:

- **wall** (wireframe 1a, chosen as the home) — the wall as a spatial slot
  grid. Tap a growing slot to open its plant, tap an empty `+` slot to plant
  something new. Slots needing attention are flagged, with a callout below.
- **tasks** — the wall's to-dos; checking "Top up reservoir" also refills it.
- **water** (2b) — reservoir level, pH / EC / temp / last-dose vitals, the
  light schedule, and a top-up logging dialog.
- **log** (2d) — year totals, yield-by-month chart, and the recent history
  of harvests and maintenance.

Overlays:

- **Plant detail** (2a) — opened from a slot: harvest-window progress,
  vitals in context of the species' preferred range, notes, and
  Harvest / Add note actions.
- **New plant** (2c) — species chips, seed / seedling / cutting, date sown,
  and a hint card that compares the species' needs with the wall's current
  light schedule and predicts the first harvest.

**Wall tablet (`tablet.html`)** — the ambient screen (2e): camera view with
tappable slot outlines, "needs you" card, large vitals, upcoming tasks, and
one primary action (mark reservoir filled). Syncs live with the phone app
via `localStorage`.

Wireframes 1b–1d were alternate home-screen directions and are intentionally
not implemented; 1a is the home, per the design doc's recommended next step.

## Layout

```
index.html      phone app shell
tablet.html     wall tablet shell
css/organic.css "Organic" design system tokens + components (from the design project)
css/app.css     app-specific styles built on those tokens
js/store.js     shared state, seed data, derived values, mutations
js/app.js       phone app views + interactions
js/tablet.js    tablet view
```

State is persisted under the `hydro-wall-v1` localStorage key; clear it (or
run `Store.reset()` in the console) to reseed the demo data.
