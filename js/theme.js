// Light / dark theme. Two-state toggle whose starting point is the OS
// preference; once the user flips it, their explicit choice is stored and
// wins. Applied as data-theme on <html> (also set by an inline <head>
// script so there's no flash before this file loads). Shared by the phone
// app and the tablet, and synced across tabs.
'use strict';

const Theme = (() => {
  const KEY = 'hydro-theme';
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = [];

  const stored = () => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  };
  const current = () => {
    const s = stored();
    return s === 'dark' || s === 'light' ? s : (mq.matches ? 'dark' : 'light');
  };
  const apply = () => document.documentElement.setAttribute('data-theme', current());
  const emit = () => listeners.forEach(fn => fn(current()));

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    apply(); emit();
  }

  function subscribe(fn) { listeners.push(fn); }

  // Follow the OS while no explicit choice is stored; sync across tabs.
  mq.addEventListener('change', () => { if (!stored()) { apply(); emit(); } });
  window.addEventListener('storage', e => { if (e.key === KEY) { apply(); emit(); } });

  apply();
  return { current, toggle, subscribe, apply };
})();
