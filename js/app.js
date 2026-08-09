// Phone app: garden home (wall / tower / shelves layouts, tap a slot),
// plant detail, add-plant flow, water & light, tasks, and the harvest log.
'use strict';

const app = document.getElementById('app');

const ui = {
  tab: 'garden',
  overlay: null,        // {type:'plant'|'add', slotId}
  dialog: null,         // {type:'harvest'|'topup', slotId}
  noteOpen: false,      // inline note form on plant detail
  pickerOpen: false,    // setup switcher on the garden screen
  addForm: null,        // add-plant form state
};

const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── garden home ─────────────────────────────────────────────────────────

function gardenScreen() {
  const setup = Store.active();
  const { growing, attention } = Store.counts(setup);
  const attnSlots = setup.slots.filter(s => s.plant && s.plant.needs);
  return `
  <div class="screen">
    <div class="screen-head">
      <h1 class="screen-title">${esc(setup.name)}</h1>
      <button class="setup-toggle" data-action="setup-picker" aria-expanded="${ui.pickerOpen}"
        aria-label="Switch setup">⌄</button>
    </div>
    ${ui.pickerOpen ? `
    <div class="chip-row" role="listbox" aria-label="Your setups">
      ${Store.get().setups.map(s => `
        <button class="chip${s.id === setup.id ? ' on' : ''}" role="option" aria-selected="${s.id === setup.id}"
          data-action="switch-setup" data-setup="${s.id}">${esc(s.name)}</button>`).join('')}
      <button class="chip chip-dashed" data-action="setup-edit">✎ edit</button>
      <button class="chip chip-dashed" data-action="setup-new">+ new setup</button>
    </div>` : ''}
    <div class="pill-row">
      <span class="tag tag-accent-2">${growing} growing</span>
      ${attention ? `<span class="tag tag-accent">${attention} need you</span>` : ''}
    </div>
    ${setupFrame(setup)}
    ${attnSlots.map(s => `
      <div class="attn-note" data-action="open" data-slot="${s.id}" role="button" tabindex="0">
        Slot ${s.id} · ${esc(s.plant.species)}
        <small>${esc(s.plant.needs)}</small>
      </div>`).join('')}
  </div>`;
}

// Each setup type gets its own physical layout; the slots inside are the
// same tappable component everywhere.
function setupFrame(setup) {
  const cols = Store.columns(setup);
  if (setup.type === 'tower') {
    return `<div class="tower-frame">
      <div class="tower-grid" style="grid-template-columns:repeat(${cols},1fr)" role="list" aria-label="Tower pods">
        ${setup.slots.map(slotButton).join('')}
      </div>
    </div>`;
  }
  if (setup.type === 'shelves') {
    const rows = [];
    for (let i = 0; i < setup.slots.length; i += cols) rows.push(setup.slots.slice(i, i + cols));
    return `<div class="shelves-frame" role="list" aria-label="Shelf slots">
      ${rows.map((row, i) => `
        <div class="shelf">
          <div class="shelf-slots" style="grid-template-columns:repeat(${cols},1fr)">
            ${row.map(slotButton).join('')}
          </div>
          <div class="shelf-board" aria-hidden="true"></div>
          <div class="shelf-label">shelf ${i + 1}</div>
        </div>`).join('')}
    </div>`;
  }
  return `<div class="wall-frame" style="grid-template-columns:repeat(${cols},1fr)" role="list" aria-label="Wall slots">
    ${setup.slots.map(slotButton).join('')}
  </div>`;
}

function slotButton(s) {
  if (!s.plant) {
    return `<button class="slot slot-empty" data-action="add" data-slot="${s.id}" aria-label="Add a plant to slot ${s.id}">+</button>`;
  }
  const attn = s.plant.needs ? ' slot-attn' : '';
  return `<button class="slot${attn}" data-action="open" data-slot="${s.id}">
    <span class="slot-day">d${Store.dayOf(s.plant)}</span>${esc(s.plant.species)}
  </button>`;
}

// ── tasks ───────────────────────────────────────────────────────────────

function tasksScreen() {
  const setups = Store.get().setups;
  const open = setups.reduce((n, s) => n + s.tasks.filter(t => !t.done).length, 0);
  return `
  <div class="screen">
    <h1 class="screen-title">Tasks</h1>
    <p class="text-muted" style="margin:0;font-size:13px">${open ? `${open} to do` : 'all done — the garden is happy'}</p>
    ${setups.filter(s => s.tasks.length).map(s => `
      <h6 style="margin:var(--space-2) 0 0">${esc(s.name)}</h6>
      <div class="rows">
        ${s.tasks.map(t => `
          <div class="row task-row${t.done ? ' task-done' : ''}" data-action="task" data-setup="${s.id}" data-task="${t.id}" role="button" tabindex="0">
            <span class="task-check" aria-hidden="true">✓</span>
            <span class="row-main">${esc(t.label)}</span>
            <span class="row-when">${esc(t.due)}</span>
          </div>`).join('')}
      </div>`).join('')}
  </div>`;
}

// ── water & light ───────────────────────────────────────────────────────

function waterScreen() {
  const setup = Store.active();
  const r = setup.reservoir;
  const light = Store.lightNow(setup);
  const onPct = (setup.light.off - setup.light.on) / 24 * 100;
  const prePct = setup.light.on / 24 * 100;
  return `
  <div class="screen">
    <div class="screen-head">
      <h1 class="screen-title">Water &amp; light</h1>
      <span class="text-muted" style="font-size:13px">${esc(setup.name)}</span>
    </div>
    <div class="card res-card">
      <div class="res-tank" role="img" aria-label="Reservoir at ${r.level}%">
        <div class="res-fill" style="height:${r.level}%"></div>
      </div>
      <div>
        <div class="res-num">${r.level}%</div>
        <div class="text-muted" style="font-size:13px">~${r.daysLeft} days left</div>
        ${r.topUpLiters ? `<div style="font-size:13px;color:var(--color-accent-700)">top up ${r.topUpLiters} L</div>` : ''}
      </div>
    </div>
    <div class="vitals">
      ${vital('pH', setup.sensors.ph, setup.sensors.ph > setup.sensors.phMax ? `above ${setup.sensors.phMax}` : 'in range', setup.sensors.ph > setup.sensors.phMax)}
      ${vital('EC', setup.sensors.ec, 'in range')}
      ${vital('water temp', setup.sensors.waterTemp + '°C', 'in range')}
      ${vital('last dose', setup.sensors.lastDoseDaysAgo + ' d ago', '')}
    </div>
    <div class="step-label">light schedule</div>
    <div class="card" style="gap:var(--space-2)">
      <div class="light-track" role="img" aria-label="Lights on ${pad(setup.light.on)}:00 to ${pad(setup.light.off)}:00">
        <div style="width:${prePct}%"></div>
        <div class="light-on" style="width:${onPct}%"></div>
      </div>
      <div style="font-size:14px">on ${pad(setup.light.on)}:00 → ${pad(setup.light.off)}:00 · ${setup.light.off - setup.light.on} h
        <span class="text-muted">· ${light.isOn ? `on now, ${light.hoursLeft} h left` : 'off now'}</span>
      </div>
    </div>
    <div class="action-row">
      <button class="btn btn-secondary" data-action="dialog-topup">Log a top-up</button>
    </div>
  </div>`;
}

function vital(label, value, note, warn) {
  return `<div class="card vital">
    <span class="v-label">${esc(label)}</span>
    <span class="v-value">${esc(value)}</span>
    <span class="v-note${warn ? ' warn' : ''}">${esc(note)}</span>
  </div>`;
}

// ── log ─────────────────────────────────────────────────────────────────

function logScreen() {
  const st = Store.get();
  const kg = (st.stats.yearGrams / 1000).toFixed(1);
  return `
  <div class="screen">
    <h1 class="screen-title">Log</h1>
    <div class="card stat-pair">
      <div class="stat"><span class="stat-num">${kg} kg</span><span class="stat-label">harvested this year</span></div>
      <div class="stat"><span class="stat-num">${st.stats.yearHarvests}</span><span class="stat-label">harvests</span></div>
    </div>
    ${yieldChart(st.monthly)}
    <div class="step-label">recent</div>
    <div class="rows">
      ${st.log.map(e => `
        <div class="row">
          <span class="row-thumb${e.type === 'maintenance' ? ' maint' : ''}" aria-hidden="true">${e.type === 'maintenance' ? '⚙' : '✂'}</span>
          <span class="row-main">${esc(e.label)}<br><span class="row-sub">${esc(e.sub)}</span></span>
          <span class="row-when">${fmtDate(e.date)}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

// Single-series bar chart: one hue, rounded data-ends, tooltip per bar,
// only the max value direct-labeled. A hidden table mirrors the data.
function yieldChart(monthly) {
  const max = Math.max(...monthly.map(m => m.g), 1);
  const maxIdx = monthly.findIndex(m => m.g === max);
  return `
  <div class="chart">
    <div class="step-label" id="chart-label">yield by month</div>
    <div class="chart-plot" role="img" aria-labelledby="chart-label"
         aria-label="Yield by month: ${monthly.map(m => `${m.label} ${m.g} grams`).join(', ')}">
      ${monthly.map((m, i) => `
        <div class="chart-col" tabindex="0">
          <div class="chart-bar" style="height:${Math.round(m.g / max * 100)}%"></div>
          <span class="chart-tip">${m.label} · ${m.g} g</span>
          ${i === maxIdx ? `<span class="chart-max">${m.g} g</span>` : ''}
        </div>`).join('')}
    </div>
    <div class="chart-x">${monthly.map(m => `<span>${m.label}</span>`).join('')}</div>
    <table class="sr-only"><caption>Yield by month</caption>
      <tbody>${monthly.map(m => `<tr><th scope="row">${m.label}</th><td>${m.g} g</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}

// ── overlays ────────────────────────────────────────────────────────────

function plantOverlay(slotId) {
  const setup = Store.active();
  const slot = setup.slots.find(s => s.id === slotId);
  if (!slot || !slot.plant) return '';
  const p = slot.plant;
  const prof = Store.profile(p.species);
  const light = Store.lightNow(setup);
  return `
  <div class="overlay">
    <div class="screen">
      <div class="overlay-head">
        <button class="back-btn" data-action="back" aria-label="Back">←</button>
        <h1 class="screen-title">${esc(Store.cap(p.species))}</h1>
        <span class="slot-ref">${esc(setup.name)} · slot ${slot.id}</span>
      </div>
      <div class="ph-dash" style="height:130px">plant photo — today</div>
      <div class="pill-row">
        ${p.needs ? `<button class="tag tag-outline" data-action="resolve" data-slot="${slot.id}" title="Mark as handled">${esc(shortNeeds(p.needs))} ✕</button>` : ''}
        <span class="tag tag-neutral">day ${Store.dayOf(p)} of ${prof.days}</span>
      </div>
      <div class="card">
        <span class="step-label" style="margin:0">harvest window</span>
        <div class="meter${p.needs ? ' warn' : ''}"><i style="width:${Store.progress(p)}%"></i></div>
        <div class="meter-row"><span>sown ${fmtDate(p.sown)}</span><span>ready ~${fmtDate(Store.readyDate(p))}</span></div>
      </div>
      <div class="vitals">
        ${vital('pH', setup.sensors.ph, setup.sensors.ph > prof.ph[1] ? 'high for ' + esc(p.species) : 'in range', setup.sensors.ph > prof.ph[1])}
        ${vital('light today', light.soFar.toFixed(0) + ' h', 'of ' + (setup.light.off - setup.light.on) + ' h')}
      </div>
      <div class="step-label">notes</div>
      <div class="notes">
        ${p.notes.length ? p.notes.map(n => `${fmtDate(n.date)} — ${esc(n.text)}`).join('<br>') : '<span class="text-muted">no notes yet</span>'}
      </div>
      ${ui.noteOpen ? `
      <form data-form="note" style="display:flex;gap:8px">
        <input class="input" name="text" placeholder="what did you notice?" autofocus>
        <button class="btn btn-primary" type="submit">Save</button>
      </form>` : ''}
      <div class="action-row">
        <button class="btn btn-primary" data-action="dialog-harvest" data-slot="${slot.id}">Harvest</button>
        <button class="btn btn-secondary" data-action="note-toggle">Add note</button>
      </div>
    </div>
  </div>`;
}

function shortNeeds(needs) {
  return needs.length > 24 ? needs.split('—').pop().trim() : needs;
}

function addOverlay(slotId) {
  const f = ui.addForm;
  const setup = Store.active();
  const speciesList = Object.keys(Store.SPECIES);
  const prof = f.species ? Store.profile(f.species) : null;
  const setupLight = setup.light.off - setup.light.on;
  let hint = '';
  if (prof && f.species) {
    const ready = new Date(new Date(f.date).getTime() + prof.days * 86400000);
    const lightNote = prof.light === setupLight
      ? `Your ${setup.type} ${setup.type === 'shelves' ? 'run' : 'runs'} ${setupLight} h — no change needed.`
      : `Your ${setup.type} ${setup.type === 'shelves' ? 'run' : 'runs'} ${setupLight} h — consider ${prof.light} h.`;
    hint = `${esc(Store.cap(f.species))} likes ${prof.light} h light and pH ${prof.ph[0]}–${prof.ph[1]}. ${lightNote}
      Expect a first harvest around <b>${fmtDate(ready)}</b>.`;
  }
  return `
  <div class="overlay">
    <div class="screen">
      <div class="overlay-head">
        <button class="back-btn" data-action="back" aria-label="Close">✕</button>
        <h1 class="screen-title" style="font-size:24px">New plant · slot ${slotId}</h1>
      </div>
      <div class="step-label">1 · what are you growing</div>
      <div class="chip-row">
        ${speciesList.map(sp => `
          <button class="chip${f.species === sp ? ' on' : ''}" data-action="pick-species" data-species="${sp}">${esc(Store.cap(sp))}</button>`).join('')}
        <button class="chip chip-dashed${f.other ? ' on' : ''}" data-action="pick-other">other…</button>
      </div>
      ${f.other ? `<input class="input" data-input="other-name" placeholder="species name" value="${esc(f.species || '')}">` : ''}
      <div class="step-label">2 · starting from</div>
      <div class="seg" role="radiogroup" aria-label="Starting from">
        ${['seed', 'seedling', 'cutting'].map(s => `
          <label class="seg-opt"><input type="radio" name="stage" value="${s}" ${f.stage === s ? 'checked' : ''}>${s}</label>`).join('')}
      </div>
      <div class="step-label">3 · date sown</div>
      <input class="input" type="date" data-input="sown-date" value="${f.date}" max="${today()}">
      ${hint ? `<div class="card species-hint">${hint}</div>` : ''}
      <div class="action-row">
        <button class="btn btn-primary" data-action="plant-it" ${f.species ? '' : 'disabled'}>Plant it</button>
      </div>
    </div>
  </div>`;
}

// ── setup form (create + edit) ──────────────────────────────────────────

const TYPE_DIMS = {
  wall: { labels: ['columns', 'rows'], defaults: [3, 5] },
  tower: { labels: ['pods per level', 'levels'], defaults: [2, 6] },
  shelves: { labels: ['slots per shelf', 'shelves'], defaults: [4, 3] },
};

// How many growing plants sit in slots that would be removed by the
// form's current size — the reason a shrink can be blocked.
function setupShrinkBlockers(f) {
  if (f.mode !== 'edit') return 0;
  const setup = Store.getSetup(f.id);
  return setup.slots.slice(f.c1 * f.c2).filter(s => s.plant).length;
}

function slotCountLine(f) {
  const blocked = setupShrinkBlockers(f);
  return `${f.c1 * f.c2} slots` + (blocked
    ? ` <span class="form-warn">— ${blocked} growing plant${blocked > 1 ? 's' : ''} in removed slots; harvest or move them first</span>`
    : '');
}

function setupOverlay() {
  const f = ui.setupForm;
  const dims = TYPE_DIMS[f.type];
  const onlySetup = Store.get().setups.length <= 1;
  return `
  <div class="overlay">
    <form class="screen" data-form="setup">
      <div class="overlay-head">
        <button class="back-btn" type="button" data-action="back" aria-label="Close">✕</button>
        <h1 class="screen-title" style="font-size:24px">${f.mode === 'edit' ? 'Edit setup' : 'New setup'}</h1>
      </div>
      <div class="field">
        <label for="su-name">name</label>
        <input class="input" id="su-name" name="name" data-input="setup-name" value="${esc(f.name)}"
          placeholder="e.g. Living-room tower" required>
      </div>
      <div class="step-label">type</div>
      <div class="seg" role="radiogroup" aria-label="Setup type">
        ${['wall', 'tower', 'shelves'].map(t => `
          <label class="seg-opt"><input type="radio" name="setup-type" value="${t}" ${f.type === t ? 'checked' : ''}>${t}</label>`).join('')}
      </div>
      <div class="step-label">size</div>
      <div class="field-row">
        <div class="field">
          <label for="su-c1">${dims.labels[0]}</label>
          <input class="input" id="su-c1" type="number" min="1" max="8" data-input="setup-c1" value="${f.c1}" required>
        </div>
        <div class="field">
          <label for="su-c2">${dims.labels[1]}</label>
          <input class="input" id="su-c2" type="number" min="1" max="10" data-input="setup-c2" value="${f.c2}" required>
        </div>
      </div>
      <div class="step-label" data-slot-count>${slotCountLine(f)}</div>
      <div class="step-label">light schedule</div>
      <div class="field-row">
        <div class="field">
          <label for="su-on">lights on (hour)</label>
          <input class="input" id="su-on" type="number" min="0" max="23" data-input="setup-on" value="${f.lightOn}" required>
        </div>
        <div class="field">
          <label for="su-off">lights off (hour)</label>
          <input class="input" id="su-off" type="number" min="1" max="24" data-input="setup-off" value="${f.lightOff}" required>
        </div>
      </div>
      ${f.mode === 'create' ? `<div class="card species-hint">Reservoir and sensor readings fill in once the unit is connected — the new setup starts with a full tank.</div>` : ''}
      <div class="action-row">
        <button class="btn btn-primary" type="submit" ${setupShrinkBlockers(f) ? 'disabled' : ''}>
          ${f.mode === 'edit' ? 'Save changes' : 'Create setup'}
        </button>
      </div>
      ${f.mode === 'edit' ? `
      <button class="btn btn-ghost btn-delete" type="button" data-action="delete-setup"
        ${onlySetup ? 'disabled title="You need at least one setup"' : ''}>Delete this setup</button>` : ''}
    </form>
  </div>`;
}

function patchSetupForm() {
  const f = ui.setupForm;
  const count = document.querySelector('[data-slot-count]');
  if (count) count.innerHTML = slotCountLine(f);
  const btn = document.querySelector('[data-form="setup"] button[type="submit"]');
  if (btn) btn.disabled = !!setupShrinkBlockers(f);
}

function deleteSetupDialog() {
  const f = ui.setupForm;
  const setup = Store.getSetup(f.id);
  const growing = setup.slots.filter(s => s.plant).length;
  return `
  <div class="dialog-backdrop" data-action="close-dialog">
    <div class="dialog">
      <div class="dialog-title">Delete ${esc(setup.name)}?</div>
      <div class="dialog-body">
        ${growing ? `${growing} growing plant${growing > 1 ? 's' : ''} and its tasks go with it.` : 'Its tasks go with it.'}
        Harvest log entries stay.
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" type="button" data-action="close-dialog">Cancel</button>
        <button class="btn btn-primary" type="button" data-action="confirm-delete-setup">Delete</button>
      </div>
    </div>
  </div>`;
}

// ── dialogs ─────────────────────────────────────────────────────────────

function harvestDialog(slotId) {
  const slot = Store.active().slots.find(s => s.id === slotId);
  if (!slot || !slot.plant) return '';
  const prof = Store.profile(slot.plant.species);
  return `
  <div class="dialog-backdrop" data-action="close-dialog">
    <form class="dialog" data-form="harvest">
      <div class="dialog-title">Harvest ${esc(slot.plant.species)}</div>
      <div class="field">
        <label for="hv-grams">how much came off?</label>
        <input class="input" id="hv-grams" name="grams" type="number" min="1" value="${prof.grams}" required>
      </div>
      <div class="seg" role="radiogroup" aria-label="Harvest type">
        <label class="seg-opt"><input type="radio" name="mode" value="cut" checked>a cut — keeps growing</label>
        <label class="seg-opt"><input type="radio" name="mode" value="whole">whole plant</label>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" type="button" data-action="close-dialog">Cancel</button>
        <button class="btn btn-primary" type="submit">Log harvest</button>
      </div>
    </form>
  </div>`;
}

function topupDialog() {
  const r = Store.active().reservoir;
  return `
  <div class="dialog-backdrop" data-action="close-dialog">
    <form class="dialog" data-form="topup">
      <div class="dialog-title">Log a top-up</div>
      <div class="dialog-body">${r.topUpLiters ? `The garden suggests ${r.topUpLiters} L to fill the reservoir.` : 'Log the water you added.'}</div>
      <div class="field">
        <label for="tu-l">liters added</label>
        <input class="input" id="tu-l" name="liters" type="number" step="0.5" min="0.5" value="${r.topUpLiters || 1.5}" required>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-secondary" type="button" data-action="close-dialog">Cancel</button>
        <button class="btn btn-primary" type="submit">Mark filled</button>
      </div>
    </form>
  </div>`;
}

// ── shell ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'garden', ico: '⌗' },
  { id: 'tasks', label: 'tasks', ico: '✓' },
  { id: 'water', label: 'water', ico: '◍' },
  { id: 'log', label: 'log', ico: '✎' },
];

function tabbar() {
  // The home tab is named after what you're looking at: wall / tower / shelves.
  const gardenLabel = Store.active().type;
  return `<nav class="tabbar" aria-label="Main">
    ${TABS.map(t => `
      <button data-action="tab" data-tab="${t.id}" ${ui.tab === t.id ? "aria-current='page'" : ''}>
        <span class="ico" aria-hidden="true">${t.ico}</span>${t.label || gardenLabel}
      </button>`).join('')}
  </nav>`;
}

function render() {
  const screens = { garden: gardenScreen, tasks: tasksScreen, water: waterScreen, log: logScreen };
  let html = screens[ui.tab]() + tabbar();
  if (ui.overlay?.type === 'plant') html += plantOverlay(ui.overlay.slotId);
  if (ui.overlay?.type === 'add') html += addOverlay(ui.overlay.slotId);
  if (ui.overlay?.type === 'setup') html += setupOverlay();
  if (ui.dialog?.type === 'harvest') html += harvestDialog(ui.dialog.slotId);
  if (ui.dialog?.type === 'topup') html += topupDialog();
  if (ui.dialog?.type === 'delete-setup') html += deleteSetupDialog();
  app.innerHTML = html;
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

const today = () => new Date().toISOString().slice(0, 10);
const activeId = () => Store.get().activeSetupId;

// ── events ──────────────────────────────────────────────────────────────

app.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const slotId = Number(el.dataset.slot);
  switch (el.dataset.action) {
    case 'tab':
      ui.tab = el.dataset.tab; ui.overlay = null; ui.dialog = null; ui.pickerOpen = false; render(); break;
    case 'setup-picker':
      ui.pickerOpen = !ui.pickerOpen; render(); break;
    case 'switch-setup':
      ui.pickerOpen = false; Store.setActive(el.dataset.setup); break;
    case 'setup-new':
      ui.pickerOpen = false;
      ui.overlay = { type: 'setup' };
      ui.setupForm = { mode: 'create', name: '', type: 'wall', c1: 3, c2: 5, lightOn: 6, lightOff: 20 };
      render(); break;
    case 'setup-edit': {
      const s = Store.active();
      ui.pickerOpen = false;
      ui.overlay = { type: 'setup' };
      ui.setupForm = {
        mode: 'edit', id: s.id, name: s.name, type: s.type,
        c1: Store.columns(s), c2: Math.ceil(s.slots.length / Store.columns(s)),
        lightOn: s.light.on, lightOff: s.light.off,
      };
      render(); break;
    }
    case 'delete-setup':
      ui.dialog = { type: 'delete-setup' }; render(); break;
    case 'confirm-delete-setup': {
      const name = Store.getSetup(ui.setupForm.id).name;
      if (Store.removeSetup(ui.setupForm.id)) {
        ui.dialog = null; ui.overlay = null;
        render();
        toast(`${name} deleted`);
      } else {
        toast('You need at least one setup');
      }
      break;
    }
    case 'open':
      ui.overlay = { type: 'plant', slotId }; ui.noteOpen = false; render(); break;
    case 'add':
      ui.overlay = { type: 'add', slotId };
      ui.addForm = { species: null, other: false, stage: 'seed', date: today() };
      render(); break;
    case 'back':
      ui.overlay = null; ui.noteOpen = false; render(); break;
    case 'resolve':
      Store.resolveNeeds(activeId(), slotId); toast('Marked as handled'); break;
    case 'note-toggle':
      ui.noteOpen = !ui.noteOpen; render();
      document.querySelector('[data-form="note"] input')?.focus(); break;
    case 'dialog-harvest':
      ui.dialog = { type: 'harvest', slotId }; render(); break;
    case 'dialog-topup':
      ui.dialog = { type: 'topup' }; render(); break;
    case 'close-dialog':
      if (e.target === el || el.tagName === 'BUTTON') { ui.dialog = null; render(); }
      break;
    case 'task':
      Store.toggleTask(el.dataset.setup, el.dataset.task); break;
    case 'pick-species':
      ui.addForm.species = el.dataset.species; ui.addForm.other = false; render(); break;
    case 'pick-other':
      ui.addForm.other = true; ui.addForm.species = ui.addForm.otherName || null; render();
      document.querySelector('[data-input="other-name"]')?.focus(); break;
    case 'plant-it': {
      const f = ui.addForm;
      const target = ui.overlay.slotId;
      Store.plantSlot(activeId(), target, f.species, f.stage, new Date(f.date + 'T12:00:00').toISOString());
      ui.overlay = null; ui.tab = 'garden';
      render();
      toast(`${Store.cap(f.species)} planted in slot ${target}`);
      break;
    }
  }
});

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

app.addEventListener('input', e => {
  const inp = e.target.closest('[data-input]');
  if (!inp) return;
  if (ui.addForm) {
    if (inp.dataset.input === 'other-name') {
      ui.addForm.species = inp.value.trim().toLowerCase() || null;
      ui.addForm.otherName = ui.addForm.species;
      // Enable/disable Plant it without re-rendering (would lose focus).
      const btn = document.querySelector('[data-action="plant-it"]');
      if (btn) btn.disabled = !ui.addForm.species;
    }
    if (inp.dataset.input === 'sown-date') { ui.addForm.date = inp.value; render(); }
  }
  if (ui.setupForm && ui.overlay?.type === 'setup') {
    const f = ui.setupForm;
    switch (inp.dataset.input) {
      case 'setup-name': f.name = inp.value; break;
      // Patch the slot count and save-button state in place — a full
      // render would steal focus from the field being typed in.
      case 'setup-c1': f.c1 = clampInt(inp.value, 1, 8, f.c1); patchSetupForm(); break;
      case 'setup-c2': f.c2 = clampInt(inp.value, 1, 10, f.c2); patchSetupForm(); break;
      case 'setup-on': f.lightOn = clampInt(inp.value, 0, 23, f.lightOn); break;
      case 'setup-off': f.lightOff = clampInt(inp.value, 1, 24, f.lightOff); break;
    }
  }
});

app.addEventListener('change', e => {
  if (e.target.name === 'stage' && ui.addForm) ui.addForm.stage = e.target.value;
  if (e.target.name === 'setup-type' && ui.setupForm) {
    const f = ui.setupForm;
    f.type = e.target.value;
    // A fresh setup gets sensible dimensions for its type; an edit keeps
    // the numbers the user already has.
    if (f.mode === 'create') [f.c1, f.c2] = TYPE_DIMS[f.type].defaults;
    render();
  }
});

app.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target.closest('[data-form]');
  if (!form) return;
  if (form.dataset.form === 'note') {
    Store.addNote(activeId(), ui.overlay.slotId, new FormData(form).get('text'));
    ui.noteOpen = false; render();
  }
  if (form.dataset.form === 'harvest') {
    const data = new FormData(form);
    const whole = data.get('mode') === 'whole';
    Store.harvest(activeId(), ui.dialog.slotId, Number(data.get('grams')), whole);
    ui.dialog = null;
    if (whole) ui.overlay = null;
    render();
    toast('Harvest logged');
  }
  if (form.dataset.form === 'topup') {
    Store.topUp(activeId(), Number(new FormData(form).get('liters')));
    ui.dialog = null; render();
    toast('Reservoir marked filled');
  }
  if (form.dataset.form === 'setup') {
    const f = ui.setupForm;
    f.name = String(new FormData(form).get('name') || '').trim();
    if (!f.name) return;
    if (f.lightOn >= f.lightOff) { toast('Lights-on must be before lights-off'); return; }
    if (f.mode === 'edit') {
      if (!Store.updateSetup(f.id, f)) { toast('Move the plants out of removed slots first'); return; }
      ui.overlay = null; render();
      toast('Setup updated');
    } else {
      Store.addSetup(f);
      ui.overlay = null; ui.tab = 'garden'; render();
      toast(`${f.name} created — tap + to start planting`);
    }
  }
});

// Keyboard activation for div-based rows (attention note, task rows).
app.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
    e.preventDefault(); e.target.click();
  }
});

Store.subscribe(render);
render();
