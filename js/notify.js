// Browser notifications for urgent reminders. This is a static app with no
// backend, so notifications fire while a page is open — in practice the
// always-on tablet is the reliable sender. Each reminder notifies at most
// once per day (dedupe log in localStorage).
'use strict';

const Notify = (() => {
  const KEY = 'hydro-notified-v1';

  const supported = () => 'Notification' in window;
  const enabled = () => supported() && Notification.permission === 'granted';
  const canAsk = () => supported() && Notification.permission === 'default';
  const denied = () => supported() && Notification.permission === 'denied';

  function request() {
    return supported() ? Notification.requestPermission() : Promise.resolve('denied');
  }

  function push(reminders) {
    if (!enabled()) return;
    let log;
    try { log = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { log = {}; }
    const today = new Date().toISOString().slice(0, 10);
    reminders.filter(r => r.urgent).forEach(r => {
      if (log[r.id] === today) return;
      try {
        new Notification('Hydro garden', { body: `${r.label} — ${r.sub}`, tag: r.id });
        log[r.id] = today;
      } catch (e) { /* some platforms require a service worker; stay silent */ }
    });
    localStorage.setItem(KEY, JSON.stringify(log));
  }

  return { supported, enabled, canAsk, denied, request, push };
})();
