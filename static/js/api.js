const API_BASE = "/api";

class NetworkError extends Error {}

async function apiRequest(method, path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new NetworkError("Sin conexión al servidor");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

const apiGet = (path) => apiRequest("GET", path);
const apiPost = (path, body) => apiRequest("POST", path, body);
const apiPut = (path, body) => apiRequest("PUT", path, body);
const apiPatch = (path, body) => apiRequest("PATCH", path, body || {});
const apiDelete = (path) => apiRequest("DELETE", path);

// In-memory cache: render functions read from here synchronously; mutations
// go through the API and then refresh the relevant slice + re-render.
// CACHE.pending holds remisiones created offline, not yet synced to the server.
const CACHE = { empresa: {}, generadores: [], remisiones: [], certificados: [], productos: [], pending: [] };

async function loadAll() {
  try {
    const [empresa, generadores, remisiones, certificados, productos] = await Promise.all([
      apiGet("/empresa/"),
      apiGet("/generadores/"),
      apiGet("/remisiones/"),
      apiGet("/certificados/"),
      apiGet("/productos/"),
    ]);
    CACHE.empresa = empresa;
    CACHE.generadores = generadores;
    CACHE.remisiones = remisiones;
    CACHE.certificados = certificados;
    CACHE.productos = productos;
    await Promise.all([
      Cache.set("empresa", empresa),
      Cache.set("generadores", generadores),
      Cache.set("remisiones", remisiones),
      Cache.set("certificados", certificados),
      Cache.set("productos", productos),
    ]);
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;
    // Offline on first load: fall back to whatever we cached last time.
    CACHE.empresa = (await Cache.get("empresa")) || {};
    CACHE.generadores = (await Cache.get("generadores")) || [];
    CACHE.remisiones = (await Cache.get("remisiones")) || [];
    CACHE.certificados = (await Cache.get("certificados")) || [];
    CACHE.productos = (await Cache.get("productos")) || [];
  }
  await refreshPending();
}

async function refreshGeneradores() {
  CACHE.generadores = await apiGet("/generadores/");
  await Cache.set("generadores", CACHE.generadores);
}
async function refreshProductos() {
  CACHE.productos = await apiGet("/productos/");
  await Cache.set("productos", CACHE.productos);
}
async function refreshRemisiones() {
  CACHE.remisiones = await apiGet("/remisiones/");
  await Cache.set("remisiones", CACHE.remisiones);
}
async function refreshCertificados() {
  CACHE.certificados = await apiGet("/certificados/");
  await Cache.set("certificados", CACHE.certificados);
}
async function refreshPending() {
  CACHE.pending = await Queue.list();
}

// A "pending" queue item shaped like a normal RemisionOut, so render/print
// code can treat synced and unsynced remisiones the same way.
function pendingAsRemision(item) {
  return {
    ...item.payload,
    id: item.local_id,
    consecutivo: null,
    estado: "pendiente_sync",
    created_at: item.created_at,
    enviada_at: null,
    _pending: true,
  };
}

function allRemisiones() {
  return [...CACHE.pending.map(pendingAsRemision), ...CACHE.remisiones];
}

// Sends one queued remisión to the server; throws NetworkError if still offline.
async function syncOne(item) {
  const saved = await apiPost("/remisiones/", item.payload);
  await Queue.remove(item.local_id);
  CACHE.remisiones = [saved, ...CACHE.remisiones];
  await Cache.set("remisiones", CACHE.remisiones);
  return saved;
}

// Syncs everything in the queue, oldest first (so consecutivo order matches
// creation order). Stops at the first failure and leaves the rest queued.
async function syncPending() {
  const items = [...CACHE.pending].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let synced = 0;
  for (const item of items) {
    try {
      await syncOne(item);
      synced++;
    } catch (e) {
      await refreshPending();
      return { synced, done: false, error: e };
    }
  }
  await refreshPending();
  return { synced, done: true };
}
