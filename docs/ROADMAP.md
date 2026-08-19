# Hydro Garden — handoff & roadmap

Where the app stands today, how its data flows, and the concrete path to
feeding it real readings from a Raspberry Pi. Written to be reopened at the
start of the next session.

- **Status:** app shipped and hosted — live at
  <https://altamashmomin.github.io/hydroponics/>
- **Data today:** seeded demo values (no backend, no hardware yet)
- **Next:** Raspberry Pi sensors (Phase 1 below)

---

## 1 · What we built

A companion app for an indoor hydroponic garden — plain HTML/CSS/JS, no
framework, no build step — grown across seven merged PRs from a wireframe
into a hosted product.

**Features shipped**

- **Multi-setup garden** — wall, tower, and shelf layouts, each with its own
  slots, reservoir, sensors, light schedule, and tasks.
- **Plant lifecycle** — add, harvest (cut vs whole), notes, and move/swap
  between slots or setups.
- **Photo growth timeline** — camera capture stored in IndexedDB, labeled by
  grow-day.
- **Derived reminders** — watering and harvest nudges computed from state,
  with browser notifications.
- **Wall tablet** — an ambient, across-the-room screen synced to the phone.
- **Modern design + dark mode** — an emerald/amber system in light and dark
  themes.

**The codebase**

| Path | Role |
|------|------|
| `index.html` / `tablet.html` | The two shells (phone app, wall tablet) |
| `js/store.js` | **State + all logic** — setups, slots, sensors, reminders. The heart. |
| `js/app.js` · `js/tablet.js` | The two views |
| `js/photos.js` · `js/notify.js` · `js/theme.js` | Photo storage, notifications, theme toggle |
| `css/organic.css` | Design tokens (light + dark) |
| `css/app.css` | App-specific styles |
| `.github/workflows/pages.yml` | Auto-deploy to GitHub Pages on merge to `main` |

State persists in the browser under the `hydro-garden-v2` localStorage key
(photos in IndexedDB). Clear it, or run `Store.reset()` in the console, to
reseed the demo data.

---

## 2 · How the data flows today

Everything lives in the browser. There is no backend and no hardware yet —
the sensor numbers you see are seeded demo values.

```
Demo values  ──▶  Store         ──▶  Reminders  ──▶  Phone + Tablet
 seed()           localStorage       derived         rendered UI
```

**The seam that matters:** each setup already carries `sensors` (pH, EC,
temp), `reservoir` (level, days left), and `light`. The reminder engine
(`Store.reminders()`) *derives* watering and harvest alerts straight from
those fields. Swap the demo numbers for live readings and the reminders
become real — **no logic change required.**

---

## 3 · The plan: real sensors on a Pi

The target pipeline. A reader service on the Pi samples the probes, stores a
time-series, and serves it; the app fetches it in place of the demo values.
Hosting the app *on the Pi* at first keeps everything on your LAN with no
cloud accounts.

```
Probes         ──▶  Pi agent        ──▶  SQLite + API  ──▶  Store adapter  ──▶  App
pH·EC·temp·lvl      python·I²C/1-wire     /readings          poll + map          live UI
```

The `Store` gains a `setup.source = { type: 'pi', url }`. It polls
`/readings`, maps the values into `sensors` / `reservoir` / `light`, and keeps
the last-known reading with a stale/offline flag. Plants, notes, photos, and
tasks stay local.

### Starter hardware

| Measure | Recommended part | Bus | Notes |
|---------|------------------|-----|-------|
| **Solution temp** | DS18B20 waterproof + 4.7 kΩ | 1-Wire | Do this first — cheap, and pH/EC need it for compensation |
| **pH** | Atlas Scientific EZO-pH + probe | I²C | Isolated & calibratable. Budget: DFRobot analog + ADS1115 |
| **EC / nutrients** | Atlas Scientific EZO-EC + K1.0 | I²C | Same story as pH |
| **Probe carrier** | Whitebox Labs Tentacle T3 | I²C | Hosts the EZO circuits and **isolates** probes so they don't fight |
| **Reservoir level** | Ultrasonic or eTape, or float switch | GPIO | A float switch is the simplest "low water" signal to start |
| **Light** | Relay on the grow light | GPIO | Control it on a schedule → on/off is *known*, not sensed |
| **Brain** | Raspberry Pi 4/5 or Zero 2 W | — | Enable I²C + 1-Wire in `raspi-config` |

### Five things that bite first-timers

1. **The Pi has no analog input.** Analog probes need an ADC (ADS1115) or an
   I²C "smart" circuit like Atlas EZO. This is the #1 surprise.
2. **Probes cross-talk in shared water.** Two bare analog probes in one
   reservoir interfere. Isolated EZO circuits (the Tentacle) fix it — matters
   more once pumps run.
3. **Calibration is not optional.** pH with 4/7/10 buffers, EC with a known
   solution. Probes drift and pH probes are consumables — store them wet and
   recalibrate on a schedule.
4. **HTTPS can't call your Pi.** The Pages site (https) can't fetch a LAN Pi
   (http) — mixed content. Host the app on the Pi to start; add a cloud relay
   later for remote access.
5. **Mains + water demands respect.** Pumps and lights switch mains voltage
   next to a reservoir. Use properly-rated relays/SSRs and a GFCI outlet, keep
   mains clear of the water, and be conservative here — this is the one place
   to slow down.

---

## 4 · Roadmap

| Phase | Status | What |
|-------|--------|------|
| **0 — The app** | ✅ Done | Wireframe → multi-setup app, photos, reminders, dark mode, hosted on Pages. |
| **1 — Hardware bring-up** | ▶ Next | Wire and read *one sensor at a time*, starting with the DS18B20 temp probe, then pH, then EC, then level. Calibrate each. Goal: correct numbers printing in a terminal. |
| **2 — Pi service** | Soon | A Python reader agent (systemd) samples on an interval into SQLite and exposes `/readings` + `/history`. Host the app on the Pi. |
| **3 — App goes live** | Soon | Add the `Store` source adapter: poll the Pi, map readings into each setup, show stale/offline gracefully. Reminders become real automatically. |
| **4 — History & trends** | Later | Real pH/EC/temp trend charts from the time-series, reusing the existing chart component. |
| **5 — Control & automation** | Later | Relays for lights, peristaltic dosing pumps for pH/nutrients, and closed-loop correction with safety interlocks. |
| **6 — Remote & alerts** | Later | A cloud relay for off-LAN access and real push notifications; multiple Pis mapped to multiple setups. |

---

## 5 · Starting the next session

Have on hand: the Raspberry Pi (flashed with Raspberry Pi OS, on your
network, SSH on), and whichever probe you're starting with. Then open a
session and say something like:

> Let's start Phase 1 on the hydroponics Pi. I have a Raspberry Pi **[model]**
> and a **[DS18B20 temp probe]**. Walk me through wiring it, enabling the
> interface, and reading a correct value — one sensor at a time.

Everything above is already in the repo's history and this doc, so a fresh
session can pick up with full context.
