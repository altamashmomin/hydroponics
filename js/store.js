// Shared data layer for the phone app (index.html) and tablet (tablet.html).
// A household can run several hydroponic setups — wall panels, freestanding
// towers, shelf units — each with its own slots, reservoir, sensors, light
// schedule, and tasks. Harvest history and yield stats are shared.
// State lives in localStorage so all screens see the same garden; tabs sync
// via the 'storage' event.
'use strict';

const Store = (() => {
  const KEY = 'hydro-garden-v2';
  const DAY = 86400000;

  // Grow profiles: days to first harvest, light hours, pH range, typical cut weight.
  const SPECIES = {
    basil: { days: 44, light: 14, ph: [5.8, 6.2], grams: 40 },
    coriander: { days: 40, light: 12, ph: [6.2, 6.8], grams: 30 },
    lettuce: { days: 30, light: 14, ph: [5.5, 6.2], grams: 210 },
    kale: { days: 35, light: 14, ph: [5.5, 6.5], grams: 120 },
    chard: { days: 40, light: 12, ph: [6.0, 6.5], grams: 150 },
    mint: { days: 30, light: 14, ph: [5.5, 6.0], grams: 25 },
    thyme: { days: 50, light: 12, ph: [5.5, 7.0], grams: 20 },
    arugula: { days: 25, light: 12, ph: [6.0, 6.5], grams: 80 },
    'pak choi': { days: 35, light: 12, ph: [6.0, 7.0], grams: 140 },
    dill: { days: 40, light: 12, ph: [5.5, 6.5], grams: 30 },
    spinach: { days: 30, light: 12, ph: [6.0, 7.0], grams: 100 },
    parsley: { days: 30, light: 12, ph: [5.5, 6.5], grams: 30 },
    chives: { days: 30, light: 12, ph: [6.0, 6.5], grams: 20 },
    strawberry: { days: 60, light: 12, ph: [5.5, 6.2], grams: 120 },
    'cherry tomato': { days: 65, light: 16, ph: [5.5, 6.5], grams: 250 },
    pepper: { days: 80, light: 16, ph: [5.5, 6.5], grams: 150 },
  };
  const DEFAULT_PROFILE = { days: 35, light: 13, ph: [5.8, 6.5], grams: 50 };

  const daysAgo = n => new Date(Date.now() - n * DAY).toISOString();

  function plant(species, sownDaysAgo, extra = {}) {
    return Object.assign({
      species,
      sown: daysAgo(sownDaysAgo),
      stage: 'seed',
      needs: null,
      notes: [],
    }, extra);
  }
  const slots = defs => defs.map((d, i) => ({ id: i + 1, plant: d ? plant(...d) : null }));

  function seed() {
    return {
      activeSetupId: 'wall1',
      setups: [
        {
          id: 'wall1', name: 'Kitchen wall', type: 'wall',
          layout: { cols: 3 },
          slots: slots([
            ['basil', 26, { notes: [{ date: daysAgo(3), text: 'smells incredible — nearly ready' }] }],
            ['mint', 20],
            null,
            ['lettuce', 12, {
              needs: 'leaf tips browning — check pH',
              notes: [
                { date: daysAgo(7), text: 'leaf tips browning' },
                { date: daysAgo(12), text: 'thinned to 3 seedlings' },
              ],
            }],
            ['lettuce', 18],
            ['chard', 15],
            ['kale', 9],
            ['thyme', 30, { needs: 'getting leggy — pinch back' }],
            null,
            ['arugula', 14],
            ['pak choi', 16],
            ['dill', 11],
            ['coriander', 8],
            ['basil', 5, { stage: 'seedling' }],
            null,
          ]),
          reservoir: { level: 38, topUpLiters: 1.5, daysLeft: 4 },
          sensors: { ph: 6.9, phMax: 6.2, ec: 1.4, waterTemp: 21, lastDoseDaysAgo: 6 },
          light: { on: 6, off: 20 },
          tasks: [
            { id: 'w1', label: 'Top up reservoir · 1.5 L', due: 'today', done: false, kind: 'topup' },
            { id: 'w2', label: 'Check pH — slot 4', due: 'today', done: false, kind: 'ph' },
            { id: 'w3', label: 'Harvest basil', due: 'Thu', done: false, kind: 'harvest' },
            { id: 'w4', label: 'Nutrient dose', due: 'Sat', done: false, kind: 'dose' },
          ],
        },
        {
          id: 'tower1', name: 'Balcony tower', type: 'tower',
          layout: { perLevel: 2 },
          slots: slots([
            ['cherry tomato', 38, { needs: 'tie new growth to the support' }],
            ['strawberry', 35],
            ['strawberry', 35],
            ['basil', 15],
            ['parsley', 20],
            ['chives', 28],
            null,
            ['lettuce', 8],
            ['spinach', 12],
            ['pepper', 40],
            ['mint', 10],
            null,
          ]),
          reservoir: { level: 74, topUpLiters: 0, daysLeft: 8 },
          sensors: { ph: 6.1, phMax: 6.5, ec: 1.8, waterTemp: 23, lastDoseDaysAgo: 2 },
          light: { on: 5, off: 21 },
          tasks: [
            { id: 't1', label: 'Tie tomato to support', due: 'today', done: false, kind: 'other' },
            { id: 't2', label: 'Prune strawberry runners', due: 'Sun', done: false, kind: 'other' },
          ],
        },
        {
          id: 'shelf1', name: 'Pantry shelves', type: 'shelves',
          layout: { perShelf: 4 },
          slots: slots([
            ['arugula', 6],
            ['arugula', 6],
            ['kale', 10],
            null,
            ['basil', 22],
            ['coriander', 18],
            ['dill', 14],
            ['chives', 25],
            ['lettuce', 20],
            ['spinach', 16],
            null,
            ['pak choi', 12],
          ]),
          reservoir: { level: 55, topUpLiters: 1, daysLeft: 6 },
          sensors: { ph: 6.0, phMax: 6.5, ec: 1.2, waterTemp: 20, lastDoseDaysAgo: 4 },
          light: { on: 7, off: 19 },
          tasks: [
            { id: 's1', label: 'Sow a new tray of arugula', due: 'Sun', done: false, kind: 'other' },
          ],
        },
      ],
      log: [
        { type: 'harvest', label: 'Strawberry · 120 g', sub: 'Balcony tower · slot 2', date: daysAgo(5) },
        { type: 'harvest', label: 'Basil · 40 g', sub: 'Kitchen wall · slot 1 · 2nd cut', date: daysAgo(7) },
        { type: 'harvest', label: 'Lettuce · 210 g', sub: 'Kitchen wall · slot 4 · whole head', date: daysAgo(12) },
        { type: 'harvest', label: 'Mint · 25 g', sub: 'Kitchen wall · slot 2', date: daysAgo(16) },
        { type: 'maintenance', label: 'Filter cleaned', sub: 'Kitchen wall', date: daysAgo(21) },
      ],
      stats: { yearGrams: 1920, yearHarvests: 24 },
      // Grams harvested per month this year; the last entry is the running month.
      monthly: [
        { label: 'Jan', g: 90 }, { label: 'Feb', g: 140 }, { label: 'Mar', g: 210 },
        { label: 'Apr', g: 260 }, { label: 'May', g: 240 }, { label: 'Jun', g: 310 },
        { label: 'Jul', g: 380 }, { label: 'Aug', g: 290 },
      ],
    };
  }

  let state;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : seed();
    } catch (e) {
      state = seed();
    }
    return state;
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach(fn => fn());
  }
  function reset() { state = seed(); save(); }

  const listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    // Cross-tab: phone and tablet stay in sync.
    window.addEventListener('storage', e => { if (e.key === KEY) { load(); fn(); } });
  }

  // ── setups ────────────────────────────────────────────────────────────
  const getSetup = id => state.setups.find(s => s.id === id) || state.setups[0];
  const active = () => getSetup(state.activeSetupId);
  function setActive(id) {
    if (state.setups.some(s => s.id === id)) { state.activeSetupId = id; save(); }
  }
  // Slots per row when the setup is drawn as a grid.
  function columns(setup) {
    if (setup.type === 'tower') return setup.layout.perLevel || 2;
    if (setup.type === 'shelves') return setup.layout.perShelf || 4;
    return setup.layout.cols || 3;
  }

  // ── setup lifecycle ───────────────────────────────────────────────────
  // cfg: {name, type, c1, c2, lightOn, lightOff} where c1 is slots per row
  // (columns / pods per level / slots per shelf) and c2 is the row count.
  const layoutFor = cfg =>
    cfg.type === 'tower' ? { perLevel: cfg.c1 } :
    cfg.type === 'shelves' ? { perShelf: cfg.c1 } : { cols: cfg.c1 };

  function addSetup(cfg) {
    const id = 'setup-' + Math.random().toString(36).slice(2, 8);
    state.setups.push({
      id, name: cfg.name, type: cfg.type,
      layout: layoutFor(cfg),
      slots: Array.from({ length: cfg.c1 * cfg.c2 }, (_, i) => ({ id: i + 1, plant: null })),
      reservoir: { level: 100, topUpLiters: 0, daysLeft: 10 },
      sensors: { ph: 6.0, phMax: 6.5, ec: 1.5, waterTemp: 21, lastDoseDaysAgo: 0 },
      light: { on: cfg.lightOn, off: cfg.lightOff },
      tasks: [],
    });
    state.activeSetupId = id;
    save();
    return id;
  }

  // Returns false (and changes nothing) if shrinking would drop a slot
  // that still has a plant in it.
  function updateSetup(id, cfg) {
    const setup = state.setups.find(s => s.id === id);
    if (!setup) return false;
    const count = cfg.c1 * cfg.c2;
    if (setup.slots.slice(count).some(sl => sl.plant)) return false;
    setup.name = cfg.name;
    setup.type = cfg.type;
    setup.layout = layoutFor(cfg);
    setup.light = { on: cfg.lightOn, off: cfg.lightOff };
    const old = setup.slots;
    setup.slots = Array.from({ length: count }, (_, i) => ({ id: i + 1, plant: old[i] ? old[i].plant : null }));
    save();
    return true;
  }

  function removeSetup(id) {
    if (state.setups.length <= 1) return false;
    state.setups = state.setups.filter(s => s.id !== id);
    if (state.activeSetupId === id) state.activeSetupId = state.setups[0].id;
    save();
    return true;
  }

  // ── derived values ────────────────────────────────────────────────────
  const profile = species => SPECIES[species] || DEFAULT_PROFILE;
  const dayOf = p => Math.max(1, Math.floor((Date.now() - new Date(p.sown)) / DAY) + 1);
  const readyDate = p => new Date(new Date(p.sown).getTime() + profile(p.species).days * DAY);
  const progress = p => Math.min(100, Math.round(dayOf(p) / profile(p.species).days * 100));

  function counts(setup) {
    const growing = setup.slots.filter(s => s.plant).length;
    const attention = setup.slots.filter(s => s.plant && s.plant.needs).length;
    const empty = setup.slots.length - growing;
    return { growing, attention, empty };
  }

  function lightNow(setup, date = new Date()) {
    const h = date.getHours() + date.getMinutes() / 60;
    const { on, off } = setup.light;
    const isOn = h >= on && h < off;
    return {
      isOn,
      hoursLeft: isOn ? Math.round(off - h) : null,
      total: off - on,
      // Hours of light delivered so far today.
      soFar: Math.max(0, Math.min(off, h) - on),
    };
  }

  // ── mutations (all take the setup id they act on) ─────────────────────
  function harvest(setupId, slotId, grams, whole) {
    const setup = getSetup(setupId);
    const slot = setup.slots.find(s => s.id === slotId);
    if (!slot || !slot.plant) return;
    state.log.unshift({
      type: 'harvest',
      label: `${cap(slot.plant.species)} · ${grams} g`,
      sub: `${setup.name} · slot ${slotId}${whole ? ' · whole plant' : ' · cut'}`,
      date: new Date().toISOString(),
    });
    state.stats.yearGrams += grams;
    state.stats.yearHarvests += 1;
    state.monthly[state.monthly.length - 1].g += grams;
    if (whole) slot.plant = null;
    save();
  }

  function addNote(setupId, slotId, text) {
    const slot = getSetup(setupId).slots.find(s => s.id === slotId);
    if (!slot || !slot.plant || !text.trim()) return;
    slot.plant.notes.unshift({ date: new Date().toISOString(), text: text.trim() });
    save();
  }

  function plantSlot(setupId, slotId, species, stage, sownISO) {
    const slot = getSetup(setupId).slots.find(s => s.id === slotId);
    if (!slot || slot.plant) return;
    slot.plant = {
      species, stage, sown: sownISO || new Date().toISOString(),
      needs: null, notes: [],
    };
    save();
  }

  // Move a plant to another slot — in the same setup or a different one.
  // If the target slot is occupied the two plants swap places.
  function movePlant(fromSetupId, fromSlotId, toSetupId, toSlotId) {
    const from = getSetup(fromSetupId).slots.find(s => s.id === fromSlotId);
    const to = getSetup(toSetupId).slots.find(s => s.id === toSlotId);
    if (!from || !to || !from.plant || from === to) return false;
    [from.plant, to.plant] = [to.plant, from.plant];
    save();
    return true;
  }

  function resolveNeeds(setupId, slotId) {
    const slot = getSetup(setupId).slots.find(s => s.id === slotId);
    if (slot && slot.plant) { slot.plant.needs = null; save(); }
  }

  function topUp(setupId, liters) {
    const setup = getSetup(setupId);
    setup.reservoir.level = 100;
    setup.reservoir.daysLeft = 10;
    setup.reservoir.topUpLiters = 0;
    state.log.unshift({
      type: 'maintenance',
      label: `Reservoir topped up · ${liters} L`,
      sub: setup.name,
      date: new Date().toISOString(),
    });
    const t = setup.tasks.find(t => t.kind === 'topup');
    if (t) t.done = true;
    save();
  }

  function toggleTask(setupId, taskId) {
    const setup = getSetup(setupId);
    const t = setup.tasks.find(t => t.id === taskId);
    if (!t) return;
    t.done = !t.done;
    if (t.kind === 'topup' && t.done) { topUp(setupId, setup.reservoir.topUpLiters || 1.5); return; }
    save();
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  load();
  return {
    get: () => state, SPECIES, profile, dayOf, readyDate, progress, counts, lightNow,
    getSetup, active, setActive, columns,
    addSetup, updateSetup, removeSetup,
    harvest, addNote, plantSlot, movePlant, resolveNeeds, topUp, toggleTask,
    subscribe, save, reset, cap,
  };
})();
