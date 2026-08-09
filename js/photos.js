// Photo storage. Images live in IndexedDB (as data URLs keyed by photo id)
// rather than localStorage — a season of growth photos would blow through
// localStorage's ~5 MB quota and take the whole app state down with it.
// Photo metadata (id + date) stays on the plant in the Store.
'use strict';

const Photos = (() => {
  const DB = 'hydro-photos';
  const STORE = 'photos';
  let dbp = null;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbp;
  }

  function tx(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    }));
  }

  // Downscale + recompress a captured file so a photo costs ~50-150 KB.
  function process(file, maxEdge = 900, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
      img.src = url;
    });
  }

  return {
    process,
    put: (id, dataUrl) => tx('readwrite', s => s.put(dataUrl, id)),
    get: id => tx('readonly', s => s.get(id)),
    remove: id => tx('readwrite', s => s.delete(id)),
    removeMany: ids => { if (ids.length) tx('readwrite', s => { ids.forEach(id => s.delete(id)); }).catch(() => {}); },
  };
})();
