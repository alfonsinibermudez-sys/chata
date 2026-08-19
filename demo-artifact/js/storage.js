const DB_KEYS = {
  generadores: "rc_generadores",
  remisiones: "rc_remisiones",
  certificados: "rc_certificados",
  consecutivo: "rc_consecutivo",
  empresa: "rc_empresa",
};

function dbGet(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function dbSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nextConsecutivo() {
  let n = parseInt(localStorage.getItem(DB_KEYS.consecutivo) || "0", 10);
  n += 1;
  localStorage.setItem(DB_KEYS.consecutivo, String(n));
  return n;
}

const Store = {
  getGeneradores: () => dbGet(DB_KEYS.generadores),
  saveGenerador(g) {
    const list = dbGet(DB_KEYS.generadores);
    list.push(g);
    dbSet(DB_KEYS.generadores, list);
  },
  deleteGenerador(id) {
    dbSet(DB_KEYS.generadores, dbGet(DB_KEYS.generadores).filter(g => g.id !== id));
  },

  getRemisiones: () => dbGet(DB_KEYS.remisiones),
  saveRemision(r) {
    const list = dbGet(DB_KEYS.remisiones);
    list.push(r);
    dbSet(DB_KEYS.remisiones, list);
  },
  updateRemision(id, patch) {
    const list = dbGet(DB_KEYS.remisiones);
    const idx = list.findIndex(r => r.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      dbSet(DB_KEYS.remisiones, list);
    }
  },
  deleteRemision(id) {
    dbSet(DB_KEYS.remisiones, dbGet(DB_KEYS.remisiones).filter(r => r.id !== id));
  },

  getCertificados: () => dbGet(DB_KEYS.certificados),
  saveCertificado(c) {
    const list = dbGet(DB_KEYS.certificados);
    list.push(c);
    dbSet(DB_KEYS.certificados, list);
  },

  getEmpresa: () => {
    const raw = localStorage.getItem(DB_KEYS.empresa);
    return raw ? JSON.parse(raw) : { nombre: "", nit: "", direccion: "", telefono: "", web: "", logo: "" };
  },
  saveEmpresa(e) {
    localStorage.setItem(DB_KEYS.empresa, JSON.stringify(e));
  },
};
