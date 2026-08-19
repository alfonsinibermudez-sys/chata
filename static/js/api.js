const API_BASE = "/api";

async function apiRequest(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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
const CACHE = { empresa: {}, generadores: [], remisiones: [], certificados: [] };

async function loadAll() {
  const [empresa, generadores, remisiones, certificados] = await Promise.all([
    apiGet("/empresa/"),
    apiGet("/generadores/"),
    apiGet("/remisiones/"),
    apiGet("/certificados/"),
  ]);
  CACHE.empresa = empresa;
  CACHE.generadores = generadores;
  CACHE.remisiones = remisiones;
  CACHE.certificados = certificados;
}

async function refreshGeneradores() { CACHE.generadores = await apiGet("/generadores/"); }
async function refreshRemisiones() { CACHE.remisiones = await apiGet("/remisiones/"); }
async function refreshCertificados() { CACHE.certificados = await apiGet("/certificados/"); }
