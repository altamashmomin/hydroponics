// Shared data layer for the phone app (index.html) and wall tablet (tablet.html).
// State lives in localStorage so both screens see the same wall; tabs sync via
// the 'storage' event.
'use strict';

const Store = (() => {
  const KEY = 'hydro-wall-v1';
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

  function seed() {
    return {
      wallName: 'Kitchen wall',
      slots: [
        { id: 1, plant: plant('basil', 26, { notes: [{ date: daysAgo(3), text: 'smells incredible — nearly ready' }] }) },
        { id: 2, plant: plant('mint', 20) },
        { id: 3, plant: null },
        { id: 4, plant: plant('lettuce', 12, {
          needs: 'leaf tips browning — check pH',
          notes: [
            { date: daysAgo(7), text: 'leaf tips browning' },
            { date: daysAgo(12), text: 'thinned to 3 seedlings' },
          ],
        }) },
        { id: 5, plant: plant('lettuce', 18) },
        { id: 6, plant: plant('chard', 15) },
        { id: 7, plant: plant('kale', 9) },
        { id: 8, plant: plant('thyme', 30, { needs: 'getting leggy — pinch back' }) },
        { id: 9, plant: null },
        { id: 10, plant: plant('arugula', 14) },
        { id: 11, plant: plant('pak choi', 16) },
        { id: 12, plant: plant('dill', 11) },
        { id: 13, plant: plant('coriander', 8) },
        { id: 14, plant: plant('basil', 5, { stage: 'seedling' }) },
        { id: 15, plant: null },
      ],
      reservoir: { level: 38, topUpLiters: 1.5, daysLeft: 4 },
      sensors: { ph: 6.9, phMax: 6.2, ec: 1.4, waterTemp: 21, lastDoseDaysAgo: 6 },
      light: { on: 6, off: 20 },
      tasks: [
        { id: 't1', label: 'Top up reservoir · 1.5 L', due: 'today', done: false, kind: 'topup' },
        { id: 't2', label: 'Check pH — slot 4', due: 'today', done: false, kind: 'ph' },
        { id: 't3', label: 'Harvest basil', due: 'Thu', done: false, kind: 'harvest' },
        { id: 't4', label: 'Nutrient dose', due: 'Sat', done: false, kind: 'dose' },
      ],
      log: [
        { type: 'harvest', label: 'Basil · 40 g', sub: 'slot 1 · 2nd cut', date: daysAgo(7) },
        { type: 'harvest', label: 'Lettuce · 210 g', sub: 'slot 4 · whole head', date: daysAgo(12) },
        { type: 'harvest', label: 'Mint · 25 g', sub: 'slot 2', date: daysAgo(16) },
        { type: 'maintenance', label: 'Filter cleaned', sub: 'maintenance', date: daysAgo(21) },
      ],
      stats: { yearGrams: 1800, yearHarvests: 23 },
      // Grams harvested per month this year; the last entry is the running month.
      monthly: [
        { label: 'Jan', g: 90 }, { label: 'Feb', g: 140 }, { label: 'Mar', g: 210 },
        { label: 'Apr', g: 260 }, { label: 'May', g: 240 }, { label: 'Jun', g: 310 },
        { label: 'Jul', g: 380 }, { label: 'Aug', g: 170 },
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

  // ── derived values ────────────────────────────────────────────────────
  const profile = species => SPECIES[species] || DEFAULT_PROFILE;
  const dayOf = p => Math.max(1, Math.floor((Date.now() - new Date(p.sown)) / DAY) + 1);
  const readyDate = p => new Date(new Date(p.sown).getTime() + profile(p.species).days * DAY);
  const progress = p => Math.min(100, Math.round(dayOf(p) / profile(p.species).days * 100));

  function counts() {
    const growing = state.slots.filter(s => s.plant).length;
    const attention = state.slots.filter(s => s.plant && s.plant.needs).length;
    const empty = state.slots.length - growing;
    return { growing, attention, empty };
  }

  function lightNow(date = new Date()) {
    const h = date.getHours() + date.getMinutes() / 60;
    const { on, off } = state.light;
    const isOn = h >= on && h < off;
    return {
      isOn,
      hoursLeft: isOn ? Math.round(off - h) : null,
      total: off - on,
      // Hours of light delivered so far today.
      soFar: Math.max(0, Math.min(off, h) - on),
    };
  }

  // ── mutations ─────────────────────────────────────────────────────────
  function harvest(slotId, grams, whole) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || !slot.plant) return;
    const name = slot.plant.species;
    state.log.unshift({
      type: 'harvest',
      label: `${cap(name)} · ${grams} g`,
      sub: `slot ${slotId}${whole ? ' · whole plant' : ' · cut'}`,
      date: new Date().toISOString(),
    });
    state.stats.yearGrams += grams;
    state.stats.yearHarvests += 1;
    state.monthly[state.monthly.length - 1].g += grams;
    if (whole) slot.plant = null;
    save();
  }

  function addNote(slotId, text) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || !slot.plant || !text.trim()) return;
    slot.plant.notes.unshift({ date: new Date().toISOString(), text: text.trim() });
    save();
  }

  function plantSlot(slotId, species, stage, sownISO) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot || slot.plant) return;
    slot.plant = {
      species, stage, sown: sownISO || new Date().toISOString(),
      needs: null, notes: [],
    };
    save();
  }

  function resolveNeeds(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (slot && slot.plant) { slot.plant.needs = null; save(); }
  }

  function topUp(liters) {
    state.reservoir.level = 100;
    state.reservoir.daysLeft = 10;
    state.reservoir.topUpLiters = 0;
    state.log.unshift({
      type: 'maintenance',
      label: `Reservoir topped up · ${liters} L`,
      sub: 'maintenance',
      date: new Date().toISOString(),
    });
    const t = state.tasks.find(t => t.kind === 'topup');
    if (t) t.done = true;
    save();
  }

  function toggleTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    if (t.kind === 'topup' && t.done) { topUp(state.reservoir.topUpLiters || 1.5); return; }
    save();
  }

  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  load();
  return {
    get: () => state, SPECIES, profile, dayOf, readyDate, progress, counts, lightNow,
    harvest, addNote, plantSlot, resolveNeeds, topUp, toggleTask,
    subscribe, save, reset, cap,
  };
})();
