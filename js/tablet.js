// Ambient tablet screen (wireframe 2e). Readable across the room, camera
// view with tappable slot outlines, one primary action. A tablet is pinned
// to one physical setup: pass ?setup=<id> (defaults to the first setup).
'use strict';

const root = document.getElementById('tablet');
const setupId = new URLSearchParams(location.search).get('setup') || Store.get().setups[0].id;
let pickedSlot = null;

const fmtClock = d => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render() {
  const setup = Store.getSetup(setupId);
  const { growing, attention, empty } = Store.counts(setup);
  const light = Store.lightNow(setup);
  const openTasks = setup.tasks.filter(t => !t.done);
  const urgent = openTasks.filter(t => t.due === 'today');
  const upcoming = openTasks.filter(t => t.due !== 'today');
  const picked = setup.slots.find(s => s.id === pickedSlot);
  const camNoun = setup.type === 'wall' ? 'full wall' : setup.type === 'tower' ? 'full tower' : 'all shelves';

  root.innerHTML = `
  <div class="tablet-left">
    <div class="tablet-head">
      <h1>${esc(setup.name)}</h1>
      <span class="tablet-clock">${fmtClock(new Date())}</span>
    </div>
    <div class="cam">
      <div class="cam-hint">live camera — ${camNoun}, ${setup.slots.length} slots<br>slot outlines overlaid, tappable</div>
      <div class="cam-grid" style="grid-template-columns:repeat(${Store.columns(setup)},1fr)">
        ${setup.slots.map(s => {
          const cls = !s.plant ? ' empty' : (s.plant.needs ? ' attn' : '');
          const pick = s.id === pickedSlot ? ' picked' : '';
          const label = s.plant ? esc(s.plant.species) : 'empty';
          return `<button class="cam-slot${cls}${pick}" data-slot="${s.id}" aria-label="Slot ${s.id}: ${label}"><span>${label}</span></button>`;
        }).join('')}
      </div>
    </div>
    ${picked && picked.plant ? `
      <div class="attn-note" style="cursor:default">
        Slot ${picked.id} · ${esc(picked.plant.species)} — day ${Store.dayOf(picked.plant)} of ${Store.profile(picked.plant.species).days}
        ${picked.plant.needs ? `<small>${esc(picked.plant.needs)}</small>` : `<small>ready ~${Store.readyDate(picked.plant).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small>`}
      </div>` : ''}
    <div class="pill-row">
      <span class="tag tag-accent-2">${growing} growing</span>
      ${attention ? `<span class="tag tag-accent">${attention} need you</span>` : ''}
      <span class="tag tag-neutral">${empty} empty</span>
    </div>
  </div>
  <div class="tablet-right">
    <div class="card needs-card">
      <span class="needs-kicker">needs you</span>
      ${urgent.length
        ? `<span class="needs-body">${urgent.map(t => esc(t.label)).join('<br>')}</span>`
        : `<span class="needs-body ok">nothing right now — enjoy the greenery</span>`}
    </div>
    <div class="vitals">
      ${tile('water', setup.reservoir.level + '%')}
      ${tile('pH', setup.sensors.ph)}
      ${tile('EC', setup.sensors.ec)}
      ${tile('light', light.isOn ? `on · ${light.hoursLeft} h left` : 'off')}
    </div>
    <div class="card">
      <span class="step-label" style="margin:0">next up</span>
      <div class="rows">
        ${upcoming.length ? upcoming.map(t => `
          <div class="row"><span class="row-main">${esc(t.label)}</span><span class="row-when">${esc(t.due)}</span></div>`).join('')
          : '<div class="row"><span class="row-main text-muted">nothing scheduled</span></div>'}
      </div>
    </div>
    <div style="flex:1"></div>
    ${setup.reservoir.level < 100
      ? `<button class="btn btn-primary" id="fill-btn" style="padding-block:14px;font-size:16px">Mark reservoir filled</button>`
      : `<div class="tag tag-accent-2" style="align-self:center">reservoir full</div>`}
  </div>`;
}

function tile(label, value) {
  return `<div class="card vital">
    <span class="v-label">${esc(label)}</span>
    <span class="v-value">${esc(value)}</span>
  </div>`;
}

root.addEventListener('click', e => {
  const slot = e.target.closest('.cam-slot');
  if (slot) {
    pickedSlot = pickedSlot === Number(slot.dataset.slot) ? null : Number(slot.dataset.slot);
    render();
    return;
  }
  if (e.target.closest('#fill-btn')) {
    Store.topUp(setupId, Store.getSetup(setupId).reservoir.topUpLiters || 1.5);
  }
});

Store.subscribe(render);
setInterval(render, 60000); // keep the clock and light state current
render();
