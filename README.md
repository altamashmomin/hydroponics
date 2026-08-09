# Hydroponic Garden

A companion app for indoor hydroponic growing, implemented from the
[Hydroponic Wall Wireframes](https://claude.ai/design/p/0642b27b-7aa3-4b8f-8717-ade7542ff6b3)
design exploration and generalized to support multiple setup types — wall
panels, freestanding towers, and shelf units. Plain HTML/CSS/JS — no build
step, no dependencies.

## Run it

Open `index.html` directly, or serve the folder so the phone and tablet
screens share state:

```sh
python3 -m http.server 8000
# phone app:   http://localhost:8000/
# tablet:      http://localhost:8000/tablet.html            (first setup)
#              http://localhost:8000/tablet.html?setup=tower1
```

## Setups

The app models a household running several hydroponic setups at once. Each
setup has a type that drives how its slots are drawn on the home screen:

- **wall** — a mounted panel, drawn as a framed grid (wireframe 1a)
- **tower** — a freestanding column, pods around a central spine
- **shelves** — a shelf/cabinet unit, rows of slots on shelf boards

Every setup carries its own slots, reservoir, sensors (pH/EC/temp), light
schedule, and tasks. Harvest history and yield stats are shared across the
whole garden. The demo seeds three setups: a kitchen wall, a balcony tower,
and pantry shelves — switch between them with the ⌄ button in the header.

The same ⌄ picker is where setups are managed: **+ new setup** opens a form
(name, type, dimensions, light schedule) and **✎ edit** changes the active
one. Resizing keeps existing plants by position and refuses to drop slots
that still have something growing in them; deleting a setup asks first and
keeps the harvest log (at least one setup always remains).

## Screens

**Phone app (`index.html`)** — four tabs:

- **home** (named after the active setup's type — wall / tower / shelves):
  the setup as a spatial, tappable slot layout. Tap a growing slot to open
  its plant, tap an empty `+` slot to plant something new. Slots needing
  attention are flagged, with a callout below.
- **tasks** — to-dos grouped by setup; checking a top-up task also refills
  that setup's reservoir.
- **water** (wireframe 2b) — the active setup's reservoir level, pH / EC /
  temp / last-dose vitals, light schedule, and a top-up logging dialog.
- **log** (2d) — garden-wide totals, yield-by-month chart, and the recent
  history of harvests and maintenance across all setups.

Overlays:

- **Plant detail** (2a) — opened from a slot: harvest-window progress,
  vitals in context of the species' preferred range, notes, and
  Harvest / Add note / Move actions. Move puts the home screen into move
  mode: tap an empty slot to relocate the plant, tap another plant to swap
  places, or switch setups first to carry it to a different unit.
- **New plant** (2c) — species chips, seed / seedling / cutting, date sown,
  and a hint card that compares the species' needs with the setup's current
  light schedule and predicts the first harvest.

**Tablet (`tablet.html`)** — the ambient screen (2e), pinned to one setup
via `?setup=<id>`: camera view with tappable slot outlines matching the
setup's layout, "needs you" card, large vitals, upcoming tasks, and one
primary action (mark reservoir filled). Syncs live with the phone app via
`localStorage`.

Wireframes 1b–1d were alternate home-screen directions and are intentionally
not implemented; 1a is the home, per the design doc's recommended next step.

## Layout

```
index.html      phone app shell
tablet.html     tablet shell
css/organic.css "Organic" design system tokens + components (from the design project)
css/app.css     app-specific styles built on those tokens
js/store.js     shared state (setups, slots, sensors, tasks, log), seed data, mutations
js/app.js       phone app views + interactions
js/tablet.js    tablet view
```

State is persisted under the `hydro-garden-v2` localStorage key; clear it
(or run `Store.reset()` in the console) to reseed the demo data.
