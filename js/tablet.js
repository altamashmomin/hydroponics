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

const MOON = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M16.5 11.7A6.5 6.5 0 0 1 8.3 3.5 6.5 6.5 0 1 0 16.5 11.7Z"></path></svg>';
const SUN = '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.4"></circle><path d="M10 1.6v2.1M10 16.3v2.1M1.6 10h2.1M16.3 10h2.1M4.1 4.1l1.5 1.5M14.4 14.4l1.5 1.5M15.9 4.1l-1.5 1.5M5.6 14.4l-1.5 1.5"></path></svg>';
function themeButton() {
  const dark = Theme.current() === 'dark';
  return `<button class="round-btn" data-action="theme" aria-label="Switch to ${dark ? 'light' : 'dark'} mode">${dark ? SUN : MOON}</button>`;
}

function render() {
  const setup = Store.getSetup(setupId);
  const { growing, attention, empty } = Store.counts(setup);
  const light = Store.lightNow(setup);
  const openTasks = setup.tasks.filter(t => !t.done);
  const rems = Store.reminders(setup);
  const urgent = [...rems.filter(r => r.urgent), ...openTasks.filter(t => t.due === 'today')];
  const upcoming = [...rems.filter(r => !r.urgent), ...openTasks.filter(t => t.due !== 'today')];
  const picked = setup.slots.find(s => s.id === pickedSlot);
  const camNoun = setup.type === 'wall' ? 'full wall' : setup.type === 'tower' ? 'full tower' : 'all shelves';

  root.innerHTML = `
  <div class="tablet-left">
    <div class="tablet-head">
      <h1>${esc(setup.name)}</h1>
      <div style="display:flex;align-items:center;gap:14px">
        <span class="tablet-clock">${fmtClock(new Date())}</span>
        ${themeButton()}
      </div>
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
  if (e.target.closest('[data-action="theme"]')) { Theme.toggle(); render(); return; }
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
Theme.subscribe(render);
// Keep the clock, light state, and derived reminders current; the tablet
// is the always-on screen, so it's also the reliable notification sender.
setInterval(() => { render(); Notify.push(Store.allReminders()); }, 60000);
render();
Notify.push(Store.allReminders());
