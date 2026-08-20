// Minimal IndexedDB wrapper: a key/value "cache" store for offline reads
// (last known empresa/generadores/remisiones/certificados) and a "queue"
// store for remisiones created while offline, pending sync to the server.
const DB_NAME = "remisiones_offline";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "local_id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const Cache = {
  get(key) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readonly");
      const req = tx.objectStore("cache").get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },
  set(key, value) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      tx.objectStore("cache").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  },
};

const Queue = {
  add(item) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  },
  remove(localId) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readwrite");
      tx.objectStore("queue").delete(localId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  },
  list() {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction("queue", "readonly");
      const req = tx.objectStore("queue").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }));
  },
};

function newLocalId() {
  return "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}
