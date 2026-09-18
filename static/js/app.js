// ---------- Helpers ----------
const fmtCOP = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const fmtKg = (n) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};
const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmtDateLong = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return `${isoDate} (${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2,"0")} ${MESES[d.getMonth()].slice(0,3).toLowerCase()}.)`;
};

function generadorById(id) {
  return CACHE.generadores.find(g => g.id === id);
}

// Firma/logo van como <img src="data:..."> recién insertados en el DOM, así
// que aún no terminaron de decodificar cuando window.print() se llama justo
// después de fijar innerHTML — sin esto, el navegador a veces los imprime en
// blanco (el texto sí sale porque no necesita decodificar nada).
function printWhenImagesReady(container) {
  const imgs = [...container.querySelectorAll("img")];
  const ready = imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  }));
  Promise.race([Promise.all(ready), new Promise(resolve => setTimeout(resolve, 1500))])
    .then(() => window.print());
}

function showError(err) {
  if (err instanceof NetworkError) {
    alert("Sin conexión — esta acción necesita internet. Inténtalo de nuevo cuando vuelva la señal.");
    return;
  }
  alert("Ocurrió un error: " + (err && err.message ? err.message : err));
  console.error(err);
}

// ---------- Navigation ----------
function setView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  const navBtn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add("active");
  refreshView(name);
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});
document.querySelectorAll("[data-view-link]").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.viewLink));
});

function refreshView(name) {
  if (name === "dashboard") renderDashboard();
  if (name === "nueva-remision") renderNuevaRemisionForm();
  if (name === "remisiones") renderRemisiones();
  if (name === "generadores") renderGeneradores();
  if (name === "productos") renderProductos();
  if (name === "operadores") renderOperadores();
  if (name === "certificados") renderCertificados();
  if (name === "empresa") renderEmpresaForm();
}

// ---------- Mi empresa ----------
function applyBrand() {
  const e = CACHE.empresa || {};
  document.getElementById("brand-title").textContent = e.nombre || "Remisiones";
  const mark = document.getElementById("brand-mark");
  mark.innerHTML = e.logo ? `<img src="${e.logo}" alt="Logo">` : "R";
}

function renderEmpresaForm() {
  const e = CACHE.empresa || {};
  document.getElementById("emp-nombre").value = e.nombre || "";
  document.getElementById("emp-nit").value = e.nit || "";
  document.getElementById("emp-direccion").value = e.direccion || "";
  document.getElementById("emp-telefono").value = e.telefono || "";
  document.getElementById("emp-web").value = e.web || "";
  document.getElementById("logo-preview").innerHTML = e.logo ? `<img src="${e.logo}" alt="Logo">` : "Logo";
}

let pendingLogo = null;
document.getElementById("emp-logo").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingLogo = reader.result;
    document.getElementById("logo-preview").innerHTML = `<img src="${pendingLogo}" alt="Logo">`;
  };
  reader.readAsDataURL(file);
});

document.getElementById("form-empresa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const empresa = {
    nombre: document.getElementById("emp-nombre").value.trim(),
    nit: document.getElementById("emp-nit").value.trim(),
    direccion: document.getElementById("emp-direccion").value.trim(),
    telefono: document.getElementById("emp-telefono").value.trim(),
    web: document.getElementById("emp-web").value.trim(),
    logo: pendingLogo || (CACHE.empresa && CACHE.empresa.logo) || "",
  };
  try {
    CACHE.empresa = await apiPut("/empresa/", empresa);
    applyBrand();
    alert("Datos de la empresa guardados.");
  } catch (err) { showError(err); }
});

// ---------- Dashboard ----------
function renderDashboard() {
  const remisiones = allRemisiones();
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const delMes = remisiones.filter(r => r.fecha.slice(0, 7) === ym);
  const pendientes = remisiones.filter(r => r.estado === "pendiente");
  const totalKgMes = delMes.reduce((s, r) => s + totalKgRemision(r), 0);

  document.getElementById("stat-grid").innerHTML = `
    <div class="stat-card"><div class="value">${remisiones.length}</div><div class="label">Remisiones totales</div></div>
    <div class="stat-card"><div class="value">${delMes.length}</div><div class="label">Remisiones este mes</div></div>
    <div class="stat-card"><div class="value">${fmtKg(totalKgMes)} kg</div><div class="label">Material recolectado (mes)</div></div>
    <div class="stat-card"><div class="value">${pendientes.length}</div><div class="label">Pendientes de envío</div></div>
  `;

  const recent = [...remisiones].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  if (recent.length === 0) {
    document.getElementById("dashboard-recent").innerHTML = `<div class="empty-state">Aún no hay remisiones. Crea la primera desde "Nueva remisión".</div>`;
    return;
  }
  document.getElementById("dashboard-recent").innerHTML = `
    <table class="data-table">
      <thead><tr><th>#</th><th>Fecha</th><th>Generador</th><th>Total kg</th><th>Estado</th></tr></thead>
      <tbody>
        ${recent.map(r => {
          const g = generadorById(r.generador_id);
          return `<tr>
            <td class="num">${r.consecutivo ?? "—"}</td>
            <td class="num">${fmtDate(r.fecha)}</td>
            <td>${g ? g.nombre : "—"}</td>
            <td class="num">${fmtKg(totalKgRemision(r))} kg</td>
            <td>${estadoBadge(r.estado)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function estadoBadge(estado) {
  if (estado === "enviada") return `<span class="badge badge-enviada">Enviada</span>`;
  if (estado === "pendiente_sync") return `<span class="badge badge-sync">Sin sincronizar</span>`;
  return `<span class="badge badge-pendiente">Pendiente</span>`;
}

function totalKgRemision(r) {
  return r.materiales.reduce((s, m) => s + (parseFloat(m.cantidad) || 0), 0);
}
function totalValorRemision(r) {
  return r.materiales.reduce((s, m) => {
    const vt = m.valor_total != null ? parseFloat(m.valor_total) : (parseFloat(m.cantidad) || 0) * (parseFloat(m.valor_unitario) || 0);
    return s + (vt || 0);
  }, 0);
}

// ---------- Generadores ----------
function fillGeneradorSelects() {
  const generadores = CACHE.generadores;
  const opts = generadores.map(g => `<option value="${g.id}">${g.nombre}</option>`).join("");
  const selRem = document.getElementById("rem-generador");
  const selFilter = document.getElementById("filter-generador");
  const selCert = document.getElementById("cert-generador");
  selRem.innerHTML = generadores.length ? opts : `<option value="">-- Registra un generador primero --</option>`;
  selFilter.innerHTML = `<option value="">Todos los generadores</option>` + opts;
  selCert.innerHTML = generadores.length ? opts : `<option value="">-- Registra un generador primero --</option>`;
}

document.getElementById("form-generador").addEventListener("submit", async (e) => {
  e.preventDefault();
  const g = {
    nombre: document.getElementById("gen-nombre").value.trim(),
    nit: document.getElementById("gen-nit").value.trim(),
    sucursal: document.getElementById("gen-sucursal").value.trim(),
    direccion: document.getElementById("gen-direccion").value.trim(),
    ciudad: document.getElementById("gen-ciudad").value.trim(),
    contacto: document.getElementById("gen-contacto").value.trim(),
    telefono: document.getElementById("gen-telefono").value.trim(),
    email: document.getElementById("gen-email").value.trim(),
  };
  try {
    await apiPost("/generadores/", g);
    e.target.reset();
    await refreshGeneradores();
    renderGeneradores();
  } catch (err) { showError(err); }
});

function renderGeneradores() {
  const list = CACHE.generadores;
  const body = document.getElementById("generadores-body");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">No hay generadores registrados.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(g => `
    <tr>
      <td>${g.nombre}</td>
      <td>${g.nit}</td>
      <td>${g.ciudad || "—"}</td>
      <td>${g.contacto || "—"}</td>
      <td>${g.email || "—"}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeGenerador(${g.id})">Eliminar</button></td>
    </tr>
  `).join("");
  fillGeneradorSelects();
}

async function removeGenerador(id) {
  if (!confirm("¿Eliminar este generador?")) return;
  try {
    await apiDelete(`/generadores/${id}`);
    await refreshGeneradores();
    renderGeneradores();
  } catch (err) { showError(err); }
}

// ---------- Productos (catálogo para el modo operador) ----------
let editingProductoId = null;

function fillCategoriasDatalist() {
  const categorias = [...new Set(CACHE.productos.map(p => p.categoria))].sort();
  document.getElementById("prod-categorias-list").innerHTML = categorias.map(c => `<option value="${c}">`).join("");
}

function renderProductos() {
  fillCategoriasDatalist();
  const panel = document.getElementById("productos-panel");
  if (CACHE.productos.length === 0) {
    panel.innerHTML = `<div class="empty-state">No hay productos en el catálogo. Agrega el primero arriba.</div>`;
    return;
  }
  const porCategoria = {};
  CACHE.productos.forEach(p => {
    (porCategoria[p.categoria] || (porCategoria[p.categoria] = [])).push(p);
  });
  panel.innerHTML = Object.keys(porCategoria).sort().map(cat => `
    <div class="prod-categoria-group">
      <h3 class="prod-categoria-titulo">${cat}</h3>
      ${porCategoria[cat].map(p => `
        <div class="prod-row ${p.activo ? "" : "inactivo"}">
          <span class="icon">${p.icono || "📦"}</span>
          <span class="nombre">${p.nombre}</span>
          <span class="unidad">${fmtCOP(p.valor_unitario)}/${p.unidad}</span>
          <div class="row-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="editProducto(${p.id})">Editar</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="toggleProductoActivo(${p.id})">${p.activo ? "Desactivar" : "Activar"}</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeProducto(${p.id})">Eliminar</button>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function editProducto(id) {
  const p = CACHE.productos.find(x => x.id === id);
  if (!p) return;
  editingProductoId = id;
  document.getElementById("prod-id").value = id;
  document.getElementById("prod-categoria").value = p.categoria;
  document.getElementById("prod-nombre").value = p.nombre;
  document.getElementById("prod-icono").value = p.icono;
  document.getElementById("prod-unidad").value = p.unidad;
  document.getElementById("prod-valor").value = p.valor_unitario;
  document.getElementById("btn-prod-guardar").textContent = "Guardar cambios";
  document.getElementById("btn-prod-cancelar").style.display = "inline-block";
  document.getElementById("prod-categoria").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelEditProducto() {
  editingProductoId = null;
  document.getElementById("form-producto").reset();
  document.getElementById("prod-id").value = "";
  document.getElementById("btn-prod-guardar").textContent = "+ Agregar producto";
  document.getElementById("btn-prod-cancelar").style.display = "none";
}
document.getElementById("btn-prod-cancelar").addEventListener("click", cancelEditProducto);

document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const existing = editingProductoId ? CACHE.productos.find(x => x.id === editingProductoId) : null;
  const payload = {
    categoria: document.getElementById("prod-categoria").value.trim(),
    nombre: document.getElementById("prod-nombre").value.trim(),
    icono: document.getElementById("prod-icono").value.trim() || "📦",
    unidad: document.getElementById("prod-unidad").value,
    valor_unitario: parseFloat(document.getElementById("prod-valor").value) || 0,
    orden: existing ? existing.orden : 0,
    activo: existing ? existing.activo : true,
  };
  try {
    if (editingProductoId) {
      await apiPut(`/productos/${editingProductoId}`, payload);
    } else {
      await apiPost("/productos/", payload);
    }
    cancelEditProducto();
    await refreshProductos();
    renderProductos();
  } catch (err) { showError(err); }
});

async function toggleProductoActivo(id) {
  const p = CACHE.productos.find(x => x.id === id);
  if (!p) return;
  try {
    await apiPut(`/productos/${id}`, { ...p, activo: !p.activo });
    await refreshProductos();
    renderProductos();
  } catch (err) { showError(err); }
}

async function removeProducto(id) {
  if (!confirm("¿Eliminar este producto del catálogo?")) return;
  try {
    await apiDelete(`/productos/${id}`);
    await refreshProductos();
    renderProductos();
  } catch (err) { showError(err); }
}

// ---------- Operadores (quién recolecta) ----------
let editingOperadorId = null;

function renderOperadores() {
  const panel = document.getElementById("operadores-panel");
  if (CACHE.operadores.length === 0) {
    panel.innerHTML = `<div class="empty-state">No hay operadores registrados. Agrega el primero arriba.</div>`;
    return;
  }
  const list = [...CACHE.operadores].sort((a, b) => a.nombre.localeCompare(b.nombre));
  panel.innerHTML = list.map(o => `
    <div class="prod-row ${o.activo ? "" : "inactivo"}">
      <span class="nombre">${o.nombre}</span>
      <span class="unidad">${[o.cedula, o.placa].filter(Boolean).join(" · ") || "—"}</span>
      <div class="row-actions">
        <button type="button" class="btn btn-secondary btn-sm" onclick="editOperador(${o.id})">Editar</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="toggleOperadorActivo(${o.id})">${o.activo ? "Desactivar" : "Activar"}</button>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeOperador(${o.id})">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function editOperador(id) {
  const o = CACHE.operadores.find(x => x.id === id);
  if (!o) return;
  editingOperadorId = id;
  document.getElementById("oper-id").value = id;
  document.getElementById("oper-nombre").value = o.nombre;
  document.getElementById("oper-cedula").value = o.cedula || "";
  document.getElementById("oper-vehiculo").value = o.vehiculo || "";
  document.getElementById("oper-placa").value = o.placa || "";
  operFirmaClear();
  document.getElementById("oper-firma-existente").style.display = o.firma ? "inline" : "none";
  document.getElementById("btn-oper-guardar").textContent = "Guardar cambios";
  document.getElementById("btn-oper-cancelar").style.display = "inline-block";
}

function cancelEditOperador() {
  editingOperadorId = null;
  document.getElementById("form-operador").reset();
  document.getElementById("oper-id").value = "";
  operFirmaClear();
  document.getElementById("oper-firma-existente").style.display = "none";
  document.getElementById("btn-oper-guardar").textContent = "+ Agregar operador";
  document.getElementById("btn-oper-cancelar").style.display = "none";
}
document.getElementById("btn-oper-cancelar").addEventListener("click", cancelEditOperador);

// ---- Firma de referencia del operador (se registra una sola vez) ----
const operFirmaCanvas = document.getElementById("oper-firma-canvas");
const operFirmaCtx = operFirmaCanvas.getContext("2d");
operFirmaCtx.lineWidth = 3;
operFirmaCtx.lineCap = "round";
operFirmaCtx.lineJoin = "round";
operFirmaCtx.strokeStyle = "#1a211c";
let operFirmaDrawing = false;
let operFirmaHasContent = false;

function operFirmaPos(evt) {
  const rect = operFirmaCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (operFirmaCanvas.width / rect.width),
    y: (evt.clientY - rect.top) * (operFirmaCanvas.height / rect.height),
  };
}
operFirmaCanvas.addEventListener("pointerdown", (e) => {
  operFirmaDrawing = true;
  const p = operFirmaPos(e);
  operFirmaCtx.beginPath();
  operFirmaCtx.moveTo(p.x, p.y);
  e.preventDefault();
});
operFirmaCanvas.addEventListener("pointermove", (e) => {
  if (!operFirmaDrawing) return;
  const p = operFirmaPos(e);
  operFirmaCtx.lineTo(p.x, p.y);
  operFirmaCtx.stroke();
  operFirmaHasContent = true;
  e.preventDefault();
});
window.addEventListener("pointerup", () => { operFirmaDrawing = false; });
document.getElementById("btn-oper-firma-limpiar").addEventListener("click", () => {
  operFirmaClear();
  document.getElementById("oper-firma-existente").style.display = "none";
});

function operFirmaClear() {
  operFirmaCtx.clearRect(0, 0, operFirmaCanvas.width, operFirmaCanvas.height);
  operFirmaHasContent = false;
}

document.getElementById("form-operador").addEventListener("submit", async (e) => {
  e.preventDefault();
  const existing = editingOperadorId ? CACHE.operadores.find(x => x.id === editingOperadorId) : null;
  const payload = {
    nombre: document.getElementById("oper-nombre").value.trim(),
    cedula: document.getElementById("oper-cedula").value.trim(),
    vehiculo: document.getElementById("oper-vehiculo").value.trim(),
    placa: document.getElementById("oper-placa").value.trim(),
    firma: operFirmaHasContent ? operFirmaCanvas.toDataURL("image/png") : (existing ? existing.firma : ""),
    activo: existing ? existing.activo : true,
  };
  try {
    if (editingOperadorId) {
      await apiPut(`/operadores/${editingOperadorId}`, payload);
    } else {
      await apiPost("/operadores/", payload);
    }
    cancelEditOperador();
    await refreshOperadores();
    renderOperadores();
  } catch (err) { showError(err); }
});

async function toggleOperadorActivo(id) {
  const o = CACHE.operadores.find(x => x.id === id);
  if (!o) return;
  try {
    await apiPut(`/operadores/${id}`, { ...o, activo: !o.activo });
    await refreshOperadores();
    renderOperadores();
  } catch (err) { showError(err); }
}

async function removeOperador(id) {
  if (!confirm("¿Eliminar este operador?")) return;
  try {
    await apiDelete(`/operadores/${id}`);
    await refreshOperadores();
    renderOperadores();
  } catch (err) { showError(err); }
}

// ---------- Nueva remisión ----------
function renderNuevaRemisionForm() {
  fillGeneradorSelects();
  document.getElementById("rem-fecha").value = new Date().toISOString().slice(0, 10);
  if (document.getElementById("materiales-body").children.length === 0) {
    addMaterialRow();
  }
}

function addMaterialRow() {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" class="mat-nombre" placeholder="Ej: Chatarra ferrosa"></td>
    <td>
      <select class="mat-estado">
        <option value="Sólido">Sólido</option>
        <option value="Líquido">Líquido</option>
        <option value="Semisólido">Semisólido</option>
      </select>
    </td>
    <td><input type="text" class="mat-disposicion" placeholder="Ej: Aprovechamiento"></td>
    <td>
      <select class="mat-unidad">
        <option value="kg">kg</option>
        <option value="lb">lb</option>
        <option value="gal">gal</option>
        <option value="unidad">unidad</option>
      </select>
    </td>
    <td><input type="number" class="mat-cantidad" min="0" step="0.01" value="0"></td>
    <td><input type="number" class="mat-valorunit" min="0" step="1" value="0"></td>
    <td class="mat-valortotal">$0</td>
    <td><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('tr').remove(); recalcTotals();">✕</button></td>
  `;
  document.getElementById("materiales-body").appendChild(row);
  row.querySelector(".mat-cantidad").addEventListener("input", recalcTotals);
  row.querySelector(".mat-valorunit").addEventListener("input", recalcTotals);
  recalcTotals();
}
document.getElementById("btn-add-material").addEventListener("click", addMaterialRow);

function recalcTotals() {
  let totalKg = 0, totalValor = 0;
  document.querySelectorAll("#materiales-body tr").forEach(row => {
    const cant = parseFloat(row.querySelector(".mat-cantidad").value) || 0;
    const vu = parseFloat(row.querySelector(".mat-valorunit").value) || 0;
    const vt = cant * vu;
    row.querySelector(".mat-valortotal").textContent = fmtCOP(vt);
    totalKg += cant;
    totalValor += vt;
  });
  document.getElementById("total-kg").textContent = fmtKg(totalKg);
  document.getElementById("total-valor").textContent = fmtCOP(totalValor);
}

document.getElementById("form-remision").addEventListener("submit", async (e) => {
  e.preventDefault();
  const generadorId = document.getElementById("rem-generador").value;
  if (!generadorId) { alert("Registra y selecciona un generador de residuos."); return; }

  const materiales = [...document.querySelectorAll("#materiales-body tr")].map(row => {
    const cantidad = parseFloat(row.querySelector(".mat-cantidad").value) || 0;
    const valorUnitario = parseFloat(row.querySelector(".mat-valorunit").value) || 0;
    return {
      nombre: row.querySelector(".mat-nombre").value.trim() || "Material sin especificar",
      estado: row.querySelector(".mat-estado").value,
      disposicion: row.querySelector(".mat-disposicion").value.trim(),
      unidad: row.querySelector(".mat-unidad").value,
      cantidad,
      valor_unitario: valorUnitario,
    };
  }).filter(m => m.cantidad > 0 || m.nombre !== "Material sin especificar");

  if (materiales.length === 0) { alert("Agrega al menos un material con cantidad."); return; }

  const payload = {
    fecha: document.getElementById("rem-fecha").value,
    generador_id: parseInt(generadorId, 10),
    vehiculo: document.getElementById("rem-vehiculo").value.trim(),
    placa: document.getElementById("rem-placa").value.trim(),
    conductor_nombre: document.getElementById("rem-conductor-nombre").value.trim(),
    conductor_cedula: document.getElementById("rem-conductor-cedula").value.trim(),
    auxiliar_nombre: document.getElementById("rem-auxiliar-nombre").value.trim(),
    auxiliar_cedula: document.getElementById("rem-auxiliar-cedula").value.trim(),
    responsable: document.getElementById("rem-responsable").value.trim(),
    destino: document.getElementById("rem-destino").value.trim(),
    hora_llegada: document.getElementById("rem-hora-llegada").value,
    hora_salida: document.getElementById("rem-hora-salida").value,
    observaciones: document.getElementById("rem-observaciones").value.trim(),
    responsable_cliente: document.getElementById("rem-responsable-cliente").value.trim(),
    materiales,
  };

  try {
    const remision = await apiPost("/remisiones/", payload);
    e.target.reset();
    document.getElementById("materiales-body").innerHTML = "";
    addMaterialRow();
    await refreshRemisiones();
    alert(`Remisión N.° ${remision.consecutivo} guardada.`);
    setView("remisiones");
  } catch (err) {
    if (err instanceof NetworkError) {
      await Queue.add({ local_id: newLocalId(), payload, created_at: new Date().toISOString() });
      await refreshPending();
      e.target.reset();
      document.getElementById("materiales-body").innerHTML = "";
      addMaterialRow();
      updateSyncStatus();
      alert("Sin conexión: la remisión quedó guardada en este dispositivo y se enviará sola cuando vuelva el internet.");
      setView("remisiones");
      return;
    }
    showError(err);
  }
});

// ---------- Remisiones list ----------
function renderRemisiones() {
  fillGeneradorSelects();
  const genFilter = document.getElementById("filter-generador").value;
  const mesFilter = document.getElementById("filter-mes").value;
  const estadoFilter = document.getElementById("filter-estado").value;

  let list = allRemisiones();
  if (genFilter) list = list.filter(r => String(r.generador_id) === genFilter);
  if (mesFilter) list = list.filter(r => r.fecha.slice(0, 7) === mesFilter);
  if (estadoFilter) list = list.filter(r => r.estado === estadoFilter);
  list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const body = document.getElementById("remisiones-body");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">No hay remisiones que coincidan con el filtro.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(r => {
    const g = generadorById(r.generador_id);
    const idArg = r._pending ? `'${r.id}'` : r.id;
    return `<tr>
      <td class="num">${r.consecutivo ?? "—"}</td>
      <td class="num">${fmtDate(r.fecha)}</td>
      <td>${g ? g.nombre : "—"}</td>
      <td class="num">${fmtKg(totalKgRemision(r))} kg</td>
      <td class="num">${fmtCOP(totalValorRemision(r))}</td>
      <td>${estadoBadge(r.estado)}</td>
      <td class="row-actions">
        <button class="btn btn-secondary btn-sm" onclick="printRemision(${idArg})">Imprimir / PDF</button>
        ${r.estado === "pendiente" ? `<button class="btn btn-primary btn-sm" onclick="marcarEnviada(${idArg})">Marcar enviada</button>` : ""}
        <button class="btn btn-danger btn-sm" onclick="removeRemision(${idArg})">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

["filter-generador", "filter-mes", "filter-estado"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderRemisiones);
});

async function marcarEnviada(id) {
  try {
    await apiPatch(`/remisiones/${id}/enviar`);
    await refreshRemisiones();
    renderRemisiones();
  } catch (err) { showError(err); }
}
async function removeRemision(id) {
  if (!confirm("¿Eliminar esta remisión?")) return;
  if (typeof id === "string" && id.startsWith("local-")) {
    await Queue.remove(id);
    await refreshPending();
    renderRemisiones();
    renderDashboard();
    updateSyncStatus();
    return;
  }
  try {
    await apiDelete(`/remisiones/${id}`);
    await refreshRemisiones();
    renderRemisiones();
    renderDashboard();
  } catch (err) { showError(err); }
}

// ---------- Print: Remisión (Manifiesto de carga) ----------
const MIN_TABLE_ROWS = 6;

function timeLabel(hhmm, fecha) {
  if (!hhmm) return { time: "—", date: fmtDate(fecha) };
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = ((hour + 11) % 12) + 1;
  return { time: `${hour12}:${m} ${suffix}`, date: fmtDate(fecha) };
}

function printRemision(id) {
  const r = allRemisiones().find(x => x.id === id);
  if (!r) return;
  const g = generadorById(r.generador_id);
  const emp = CACHE.empresa || {};
  const now = new Date();

  const materialRows = r.materiales.map(m => `<tr>
    <td>${m.nombre}</td>
    <td>${m.estado}</td>
    <td>${m.disposicion || "—"}</td>
    <td class="num">${m.unidad}</td>
    <td class="num">${fmtKg(m.cantidad)}</td>
  </tr>`).join("");
  const blankRows = Math.max(0, MIN_TABLE_ROWS - r.materiales.length);
  const blankRowsHtml = Array.from({ length: blankRows }).map(() => `<tr><td class="blank">.</td><td class="blank">.</td><td class="blank">.</td><td class="blank">.</td><td class="blank">.</td></tr>`).join("");

  const llegada = timeLabel(r.hora_llegada, r.fecha);
  const salida = timeLabel(r.hora_salida, r.fecha);

  const html = `
    <div class="doc">
      <div class="doc-topbar">
        <div class="doc-brand">
          ${emp.logo ? `<img class="logo" src="${emp.logo}" alt="Logo">` : `<div class="logo-fallback">${(emp.nombre || "R").charAt(0)}</div>`}
          <div>
            <div class="doc-brand-name">${emp.nombre || "Mi Empresa"}</div>
            <div class="doc-brand-meta">${emp.nit ? "NIT " + emp.nit : ""}${emp.direccion ? " · " + emp.direccion : ""}${emp.telefono ? " · " + emp.telefono : ""}</div>
          </div>
        </div>
        <div class="doc-doctype">
          <div class="label">Manifiesto de carga</div>
          <div class="num">${r._pending ? "Sin sincronizar" : "N.° " + r.consecutivo}</div>
        </div>
      </div>
      <div class="doc-gen-meta">Documento generado ${now.toLocaleDateString("es-CO")} ${now.toLocaleTimeString("es-CO")}${emp.web ? " · " + emp.web : ""}</div>

      <div class="doc-panels">
        <div class="doc-panel">
          <h4>Cliente</h4>
          <div class="row"><span class="k">Fecha de programación</span><span class="v">${fmtDateLong(r.fecha)}</span></div>
          <div class="row"><span class="k">Empresa</span><span class="v">${g ? g.nombre : "—"}</span></div>
          <div class="row"><span class="k">ID</span><span class="v">${g ? g.nit : "—"}</span></div>
          <div class="row"><span class="k">Sucursal</span><span class="v">${g ? [g.sucursal, g.direccion].filter(Boolean).join(" / ") || "—" : "—"}</span></div>
          <div class="row"><span class="k">Tel</span><span class="v">${g ? (g.telefono || "—") : "—"}</span></div>
        </div>
        <div class="doc-panel">
          <h4>${emp.nombre || "Transporte"}</h4>
          <div class="row"><span class="k">Vehículo</span><span class="v">${r.vehiculo || "—"}</span></div>
          <div class="row"><span class="k">Placa</span><span class="v">${r.placa || "—"}</span></div>
          <div class="row"><span class="k">Conductor</span><span class="v">${[r.conductor_nombre, r.conductor_cedula].filter(Boolean).join(" / ") || "—"}</span></div>
          <div class="row"><span class="k">Auxiliar</span><span class="v">${[r.auxiliar_nombre, r.auxiliar_cedula].filter(Boolean).join(" / ") || "—"}</span></div>
          <div class="row"><span class="k">Responsable</span><span class="v">${r.responsable || "—"}</span></div>
          <div class="row"><span class="k">Destino</span><span class="v">${r.destino || "—"}</span></div>
        </div>
      </div>

      <div class="doc-section-title">Servicio de recolección y transporte de residuos</div>
      <table class="doc-table doc-table--brand">
        <thead><tr><th>Nombre</th><th>Estado</th><th>Disposición</th><th class="num">Unid</th><th class="num">Cant</th></tr></thead>
        <tbody>${materialRows}${blankRowsHtml}</tbody>
      </table>
      <div class="doc-note">Nota: pesos/cantidades sujetos a calibración de báscula.</div>

      <div class="doc-obs">
        <div class="doc-obs-label">Observaciones</div>
        <div class="doc-obs-box">${r.observaciones || "&nbsp;"}</div>
      </div>

      <div class="doc-hora-cards">
        <div class="doc-hora-card">
          <div class="hlabel">Hora y fecha de llegada al cliente</div>
          <div class="time">${llegada.time}</div>
          <div class="date">${llegada.date}</div>
        </div>
        <div class="doc-hora-card">
          <div class="hlabel">Hora y fecha de salida del cliente</div>
          <div class="time">${salida.time}</div>
          <div class="date">${salida.date}</div>
        </div>
      </div>

      <div class="doc-signatures">
        <div class="doc-signature">
          <div class="role">Responsable ${emp.nombre || ""}</div>
          ${r.firma_responsable ? `<img src="${r.firma_responsable}" style="max-width:180px;max-height:60px;display:block;margin:0 auto 4px;">` : ""}${r.responsable || ""}
        </div>
        <div class="doc-signature">
          <div class="role">Responsable cliente</div>
          ${r.firma_cliente ? `<img src="${r.firma_cliente}" style="max-width:180px;max-height:60px;display:block;margin:0 auto 4px;">` : ""}${r.responsable_cliente || ""}
        </div>
      </div>

      <div class="doc-footer">
        <div>${emp.nombre || ""}${emp.nit ? " · NIT " + emp.nit : ""}${emp.direccion ? " · " + emp.direccion : ""}</div>
        <div class="doc-id">ID ${r.id}</div>
      </div>
    </div>
  `;
  const printArea = document.getElementById("print-remision");
  printArea.innerHTML = html;
  printWhenImagesReady(printArea);
}

// ---------- Certificados ----------
document.getElementById("btn-generar-cert").addEventListener("click", async () => {
  const generadorId = document.getElementById("cert-generador").value;
  const mesValue = document.getElementById("cert-mes").value; // yyyy-mm
  if (!generadorId || !mesValue) { alert("Selecciona generador y mes."); return; }
  if (!navigator.onLine) { alert("Los certificados necesitan conexión, porque el servidor suma las remisiones ya sincronizadas. Conéctate e inténtalo de nuevo."); return; }
  if (CACHE.pending.length > 0) { alert("Tienes remisiones sin sincronizar. Sincronízalas primero para que el certificado quede completo."); return; }

  try {
    const cert = await apiPost("/certificados/generar", { generador_id: parseInt(generadorId, 10), mes: mesValue });
    await refreshCertificados();
    renderCertificados();
    printCertificado(cert.id);
  } catch (err) { showError(err); }
});

function renderCertificados() {
  fillGeneradorSelects();
  const list = [...CACHE.certificados].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes));
  const body = document.getElementById("certificados-body");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Aún no se han generado certificados.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(c => {
    const g = generadorById(c.generador_id);
    return `<tr>
      <td>${g ? g.nombre : "—"}</td>
      <td>${MESES[c.mes - 1]} ${c.anio}</td>
      <td class="num">${fmtKg(c.total_kg)} kg</td>
      <td class="num">${c.remision_ids.length}</td>
      <td class="num">${fmtDate(c.fecha_emision)}</td>
      <td class="row-actions">
        <button class="btn btn-secondary btn-sm" onclick="printCertificado(${c.id})">Imprimir / PDF</button>
        <button class="btn btn-danger btn-sm" onclick="removeCertificado(${c.id})">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

async function removeCertificado(id) {
  if (!confirm("¿Eliminar este certificado?")) return;
  try {
    await apiDelete(`/certificados/${id}`);
    await refreshCertificados();
    renderCertificados();
  } catch (err) { showError(err); }
}

function printCertificado(id) {
  const c = CACHE.certificados.find(x => x.id === id);
  if (!c) return;
  const g = generadorById(c.generador_id);
  const emp = CACHE.empresa || {};
  const remisiones = CACHE.remisiones.filter(r => c.remision_ids.includes(r.id)).sort((a, b) => a.consecutivo - b.consecutivo);

  const html = `
    <div class="doc">
      <div class="doc-topbar">
        <div class="doc-brand">
          ${emp.logo ? `<img class="logo" src="${emp.logo}" alt="Logo">` : `<div class="logo-fallback">${(emp.nombre || "R").charAt(0)}</div>`}
          <div>
            <div class="doc-brand-name">${emp.nombre || "Mi Empresa"}</div>
            <div class="doc-brand-meta">${emp.nit ? "NIT " + emp.nit : ""}${emp.direccion ? " · " + emp.direccion : ""}</div>
          </div>
        </div>
        <div class="doc-doctype">
          <div class="label">Certificado de recolección</div>
          <div class="num">${MESES[c.mes - 1]} ${c.anio}</div>
        </div>
      </div>
      <div class="doc-gen-meta">Emitido ${fmtDate(c.fecha_emision)}</div>

      <div class="doc-panels">
        <div class="doc-panel" style="grid-column: 1 / -1;">
          <h4>Generador del residuo</h4>
          <div class="row"><span class="k">Nombre / Razón social</span><span class="v">${g ? g.nombre : "—"}</span></div>
          <div class="row"><span class="k">NIT / CC</span><span class="v">${g ? g.nit : "—"}</span></div>
          <div class="row"><span class="k">Sucursal</span><span class="v">${g ? [g.sucursal, g.direccion].filter(Boolean).join(" / ") || "—" : "—"}</span></div>
        </div>
      </div>

      <div class="doc-cert-text">
        Por medio del presente documento, <strong>${emp.nombre || "esta empresa"}</strong> certifica que durante el periodo de
        <strong>${MESES[c.mes - 1]} de ${c.anio}</strong> recolectó y gestionó los residuos generados por
        <strong>${g ? g.nombre : "—"}</strong> (NIT ${g ? g.nit : "—"}), de acuerdo con el detalle relacionado a continuación,
        en el marco de ${remisiones.length} manifiesto(s) de carga.
      </div>

      <div class="doc-section-title">Detalle de material recolectado</div>
      <table class="doc-table">
        <thead><tr><th>Tipo de material</th><th class="num">Cantidad total (kg)</th></tr></thead>
        <tbody>
          ${Object.entries(c.detalle_por_material).map(([nombre, kg]) => `<tr><td>${nombre}</td><td class="num">${fmtKg(kg)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="doc-note" style="text-align:right; font-weight:600; color:#333;">Total recolectado: ${fmtKg(c.total_kg)} kg</div>

      <div class="doc-section-title" style="margin-top:16px;">Manifiestos incluidos</div>
      <table class="doc-table">
        <thead><tr><th class="num">N.°</th><th>Fecha</th><th class="num">Total kg</th></tr></thead>
        <tbody>
          ${remisiones.map(r => `<tr><td class="num">${r.consecutivo}</td><td>${fmtDate(r.fecha)}</td><td class="num">${fmtKg(totalKgRemision(r))}</td></tr>`).join("")}
        </tbody>
      </table>

      <div class="doc-signatures">
        <div class="doc-signature"><div class="role">Responsable ${emp.nombre || ""}</div></div>
        <div class="doc-signature"><div class="role">Sello</div></div>
      </div>

      <div class="doc-footer">
        <div>${emp.nombre || ""}${emp.nit ? " · NIT " + emp.nit : ""}${emp.direccion ? " · " + emp.direccion : ""}</div>
        <div class="doc-id">ID ${c.id}</div>
      </div>
    </div>
  `;
  const printArea = document.getElementById("print-certificado");
  printArea.innerHTML = html;
  printWhenImagesReady(printArea);
}

// ---------- Sync status ----------
let syncing = false;

function updateSyncStatus() {
  const el = document.getElementById("sync-status");
  const dot = document.getElementById("sync-dot");
  const text = document.getElementById("sync-text");
  const btn = document.getElementById("btn-sync-now");
  const pendingCount = CACHE.pending.length;

  el.classList.remove("offline", "syncing");
  if (syncing) {
    el.classList.add("syncing");
    text.textContent = `Sincronizando ${pendingCount} remisión(es)…`;
  } else if (!navigator.onLine) {
    el.classList.add("offline");
    text.textContent = pendingCount > 0 ? `Sin conexión · ${pendingCount} por sincronizar` : "Sin conexión";
  } else if (pendingCount > 0) {
    el.classList.add("offline");
    text.textContent = `Conectado · ${pendingCount} por sincronizar`;
  } else {
    text.textContent = "Conectado";
  }
  btn.style.display = (!syncing && navigator.onLine && pendingCount > 0) ? "block" : "none";
}

async function trySync() {
  if (syncing || !navigator.onLine || CACHE.pending.length === 0) return;
  syncing = true;
  updateSyncStatus();
  const result = await syncPending();
  syncing = false;
  updateSyncStatus();
  if (result.synced > 0) {
    renderDashboard();
    renderRemisiones();
  }
  return result;
}

document.getElementById("btn-sync-now").addEventListener("click", trySync);
window.addEventListener("online", () => { updateSyncStatus(); trySync(); });
window.addEventListener("offline", updateSyncStatus);

// ---------- Install button ----------
// Browsers only show their own install banner under narrow, inconsistent
// conditions (and iOS Safari never shows one at all), so we drive install
// from our own always-visible button instead of relying on that.
let deferredInstallPrompt = null;

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function updateInstallButton() {
  const btn = document.getElementById("btn-install");
  btn.style.display = (!isStandaloneApp() && (deferredInstallPrompt || isIOS())) ? "block" : "none";
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButton();
});

document.getElementById("btn-install").addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallButton();
  } else if (isIOS()) {
    alert('Para instalar: toca el ícono de compartir (el cuadrado con la flecha hacia arriba) en la barra de Safari, y luego "Añadir a pantalla de inicio".');
  } else {
    alert('Busca el ícono de instalación en la barra de direcciones, o el menú del navegador → "Instalar app".');
  }
});

// ---------- Service worker (installable app + offline app shell) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("[SW] registro falló", err));
  });
}

// ---------- Modo operador / administrador ----------
// Modo operador: pantalla completa, grande y visual (poco texto, mucho ícono)
// pensada para quien recolecta en sitio y puede tener poca costumbre de
// lectura. El administrador sigue registrando clientes y el catálogo de
// productos desde el modo normal; el operador solo elige y confirma.
function setModo(modo) {
  localStorage.setItem("xtend6_modo", modo);
  if (modo === "operador") {
    document.body.classList.add("modo-operador");
    initOperador();
  } else {
    document.body.classList.remove("modo-operador");
    document.body.classList.remove("op-en-materiales");
  }
}
document.getElementById("btn-modo-operador").addEventListener("click", () => setModo("operador"));
document.getElementById("btn-modo-admin").addEventListener("click", () => setModo("admin"));

const opState = {
  operadorId: null, operadorNombre: "", operadorCedula: "", operadorVehiculo: "", operadorPlaca: "", operadorFirma: "",
  clienteId: null, categoriaActiva: null, items: [],
};

function opBrand() {
  const e = CACHE.empresa || {};
  document.getElementById("op-brand-title").textContent = e.nombre || "Remisiones";
  document.getElementById("op-brand-mark").innerHTML = e.logo ? `<img src="${e.logo}" alt="Logo">` : "R";
}

function opUpdateOperadorChip() {
  const chip = document.getElementById("op-operador-chip");
  if (opState.operadorId) {
    chip.style.display = "inline-block";
    chip.textContent = `👤 ${opState.operadorNombre} · cambiar`;
  } else {
    chip.style.display = "none";
  }
}

// Cada paso hacia adelante deja una entrada en el historial del navegador,
// para que el botón "atrás" físico del celular retroceda un paso del
// asistente en vez de cerrar la app (ver el listener de popstate más abajo).
function opSetStep(name, pushHistory) {
  document.querySelectorAll(".op-step").forEach(s => s.classList.remove("active"));
  document.getElementById("op-step-" + name).classList.add("active");
  document.body.classList.toggle("op-en-materiales", name === "materiales");
  closeTicketPanel();
  if (pushHistory) history.pushState({ opStep: name }, "");
}

function initOperador() {
  opBrand();
  opState.operadorId = null;
  opState.operadorNombre = "";
  opState.operadorCedula = "";
  opState.operadorVehiculo = "";
  opState.operadorPlaca = "";
  opState.operadorFirma = "";
  opState.clienteId = null;
  opState.categoriaActiva = null;
  opState.items = [];
  opUpdateOperadorChip();
  renderOpOperadores();
  opSetStep("operador", true);
}

window.addEventListener("popstate", () => {
  if (!document.body.classList.contains("modo-operador")) return;
  const activo = document.querySelector(".op-step.active");
  const step = activo ? activo.id.replace("op-step-", "") : "operador";
  if (step === "cliente") { opSetStep("operador", true); }
  else if (step === "materiales") { renderOpClientes(); opSetStep("cliente", true); }
  else if (step === "confirmar") { opSetStep("materiales", true); }
  else if (step === "exito") { opState.clienteId = null; opState.items = []; renderOpClientes(); opSetStep("cliente", true); }
  // en el primer paso ("operador") se deja avanzar la navegación real (salir/atrás del navegador).
});

// ---- Paso 0: elegir operador ----
function renderOpOperadores() {
  const grid = document.getElementById("op-operadores-grid");
  const operadores = [...CACHE.operadores].filter(o => o.activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (operadores.length === 0) {
    grid.innerHTML = `<div class="empty-state">No hay operadores registrados todavía. Pide a un administrador que registre uno en "Operadores".</div>`;
    return;
  }
  grid.innerHTML = operadores.map(o => `
    <button type="button" class="op-picker-card" onclick="opSeleccionarOperador(${o.id})">
      <div class="op-picker-avatar op-picker-avatar--operador">${(o.nombre || "?").charAt(0).toUpperCase()}</div>
      <div class="op-picker-nombre">${o.nombre}</div>
    </button>
  `).join("");
}

function opSeleccionarOperador(id) {
  const o = CACHE.operadores.find(x => x.id === id);
  if (!o) return;
  opState.operadorId = id;
  opState.operadorNombre = o.nombre;
  opState.operadorCedula = o.cedula || "";
  opState.operadorVehiculo = o.vehiculo || "";
  opState.operadorPlaca = o.placa || "";
  opState.operadorFirma = o.firma || "";
  opUpdateOperadorChip();
  renderOpClientes();
  opSetStep("cliente", true);
}
document.getElementById("op-operador-chip").addEventListener("click", () => {
  renderOpOperadores();
  opSetStep("operador", true);
});
document.getElementById("btn-op-volver-operador").addEventListener("click", () => {
  renderOpOperadores();
  opSetStep("operador", true);
});

// ---- Paso 1: elegir cliente ----
function renderOpClientes() {
  const grid = document.getElementById("op-clientes-grid");
  const generadores = [...CACHE.generadores].sort((a, b) => a.nombre.localeCompare(b.nombre));
  if (generadores.length === 0) {
    grid.innerHTML = `<div class="empty-state">No hay clientes registrados todavía. Pide a un administrador que registre uno en "Generadores".</div>`;
    return;
  }
  grid.innerHTML = generadores.map(g => `
    <button type="button" class="op-picker-card" onclick="opSeleccionarCliente(${g.id})">
      <div class="op-picker-avatar">${(g.nombre || "?").charAt(0).toUpperCase()}</div>
      <div>
        <div class="op-picker-nombre">${g.nombre}</div>
        <div class="op-picker-sub">${[g.sucursal, g.ciudad].filter(Boolean).join(" · ") || "&nbsp;"}</div>
      </div>
    </button>
  `).join("");
}

function opSeleccionarCliente(id) {
  opState.clienteId = id;
  opState.categoriaActiva = null;
  opState.items = [];
  const g = generadorById(id);
  document.getElementById("op-materiales-cliente-nombre").textContent = g ? g.nombre : "¿Qué recogiste?";
  renderOpCategorias();
  renderOpTicket();
  opSetStep("materiales", true);
}
document.getElementById("btn-op-volver-cliente").addEventListener("click", () => opSetStep("cliente"));

// ---- Paso 2: categorías + productos ----
function opProductosActivos() {
  return CACHE.productos.filter(p => p.activo);
}

function renderOpCategorias() {
  const productos = opProductosActivos();
  const categorias = [...new Set(productos.map(p => p.categoria))];
  if (!opState.categoriaActiva || !categorias.includes(opState.categoriaActiva)) {
    opState.categoriaActiva = categorias[0] || null;
  }
  const row = document.getElementById("op-categorias-row");
  if (categorias.length === 0) {
    row.innerHTML = "";
    document.getElementById("op-productos-grid").innerHTML = `<div class="empty-state">No hay productos activos en el catálogo. Pide a un administrador que agregue alguno en "Productos".</div>`;
    return;
  }
  row.innerHTML = categorias.map(cat => {
    const first = productos.find(p => p.categoria === cat);
    const catEsc = cat.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    return `<button type="button" class="op-categoria-pill ${cat === opState.categoriaActiva ? "active" : ""}" onclick="opSeleccionarCategoria('${catEsc}')">
      <span class="icon">${first ? first.icono : "📦"}</span>${cat}
    </button>`;
  }).join("");
  renderOpProductos();
}

function opSeleccionarCategoria(cat) {
  opState.categoriaActiva = cat;
  renderOpCategorias();
}

function opCantidadEnTicket(productoId) {
  const item = opState.items.find(i => i.producto_id === productoId);
  return item ? item.cantidad : 0;
}

function renderOpProductos() {
  const productos = opProductosActivos().filter(p => p.categoria === opState.categoriaActiva);
  const grid = document.getElementById("op-productos-grid");
  if (productos.length === 0) {
    grid.innerHTML = `<div class="empty-state">No hay productos en esta categoría.</div>`;
    return;
  }
  grid.innerHTML = productos.map(p => {
    const cant = opCantidadEnTicket(p.id);
    return `<button type="button" class="op-producto-card" onclick="opAbrirCantidad(${p.id})">
      ${cant > 0 ? `<span class="badge-cant">${fmtKg(cant)}</span>` : ""}
      <span class="icon">${p.icono || "📦"}</span>
      <span class="nombre">${p.nombre}</span>
    </button>`;
  }).join("");
}

// ---- Modal de cantidad ----
let opModalProductoId = null;

function opAbrirCantidad(productoId) {
  const p = CACHE.productos.find(x => x.id === productoId);
  if (!p) return;
  opModalProductoId = productoId;
  document.getElementById("op-modal-producto").innerHTML = `<span class="icon">${p.icono || "📦"}</span> ${p.nombre}`;
  document.getElementById("op-modal-unidad").textContent = `Unidad: ${p.unidad}`;
  document.getElementById("op-modal-quick").style.display = (p.unidad === "kg" || p.unidad === "lb") ? "flex" : "none";
  const actual = opCantidadEnTicket(productoId);
  document.getElementById("op-cantidad-input").value = actual > 0 ? actual : 1;
  document.getElementById("op-modal-cantidad").classList.add("open");
}

function opCerrarModalCantidad() {
  document.getElementById("op-modal-cantidad").classList.remove("open");
  opModalProductoId = null;
}
document.getElementById("btn-op-cancelar-cantidad").addEventListener("click", opCerrarModalCantidad);

document.getElementById("btn-op-menos").addEventListener("click", () => {
  const input = document.getElementById("op-cantidad-input");
  input.value = Math.max(0, (parseFloat(input.value) || 0) - 1);
});
document.getElementById("btn-op-mas").addEventListener("click", () => {
  const input = document.getElementById("op-cantidad-input");
  input.value = (parseFloat(input.value) || 0) + 1;
});
document.querySelectorAll(".op-quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById("op-cantidad-input");
    input.value = (parseFloat(input.value) || 0) + parseFloat(btn.dataset.add);
  });
});

function opVibrar() {
  if (navigator.vibrate) navigator.vibrate(25);
}

document.getElementById("btn-op-agregar-cantidad").addEventListener("click", () => {
  const cantidad = parseFloat(document.getElementById("op-cantidad-input").value) || 0;
  const p = CACHE.productos.find(x => x.id === opModalProductoId);
  if (!p) return;
  const existing = opState.items.find(i => i.producto_id === p.id);
  if (cantidad <= 0) {
    if (existing) opState.items = opState.items.filter(i => i.producto_id !== p.id);
  } else if (existing) {
    existing.cantidad = cantidad;
  } else {
    opState.items.push({ producto_id: p.id, nombre: p.nombre, icono: p.icono, unidad: p.unidad, valor_unitario: p.valor_unitario, cantidad });
  }
  opVibrar();
  opCerrarModalCantidad();
  renderOpProductos();
  renderOpTicket();
});

// ---- Ticket (lista de materiales agregados) ----
function renderOpTicket() {
  const count = opState.items.length;
  document.getElementById("op-ticket-info-text").textContent = count === 0
    ? "Toca un producto para agregarlo"
    : `${count} material(es) agregado(s)`;
  document.getElementById("btn-op-continuar").disabled = count === 0;

  const lista = document.getElementById("op-ticket-lista");
  if (count === 0) {
    lista.innerHTML = `<div class="op-ticket-empty">Aún no has agregado materiales.</div>`;
    return;
  }
  lista.innerHTML = opState.items.map(i => `
    <div class="op-ticket-item">
      <span class="icon">${i.icono || "📦"}</span>
      <div class="info">
        <div class="nombre">${i.nombre}</div>
        <div class="cant">${fmtKg(i.cantidad)} ${i.unidad}</div>
      </div>
      <button type="button" onclick="opQuitarItem(${i.producto_id})">✕</button>
    </div>
  `).join("");
}

function opQuitarItem(productoId) {
  opState.items = opState.items.filter(i => i.producto_id !== productoId);
  renderOpProductos();
  renderOpTicket();
}

function closeTicketPanel() {
  document.getElementById("op-ticket-panel").classList.remove("open");
}
document.getElementById("btn-op-ver-ticket").addEventListener("click", () => {
  document.getElementById("op-ticket-panel").classList.toggle("open");
});
document.getElementById("btn-op-cerrar-ticket").addEventListener("click", closeTicketPanel);

document.getElementById("btn-op-continuar").addEventListener("click", () => {
  if (opState.items.length === 0) return;
  closeTicketPanel();
  renderOpConfirmar();
  opSetStep("confirmar", true);
});
document.getElementById("btn-op-volver-materiales").addEventListener("click", () => opSetStep("materiales"));

// ---- Paso 3: confirmar ----
function renderOpConfirmar() {
  const g = generadorById(opState.clienteId);
  const totalValor = opState.items.reduce((s, i) => s + (i.cantidad * (i.valor_unitario || 0)), 0);
  document.getElementById("op-resumen").innerHTML = `
    <div class="op-resumen-cliente">${g ? g.nombre : "—"}</div>
    ${opState.items.map(i => `
      <div class="op-resumen-item">
        <span class="icon">${i.icono || "📦"}</span>
        <span class="nombre">${i.nombre}</span>
        <span class="cant">${fmtKg(i.cantidad)} ${i.unidad}</span>
      </div>
    `).join("")}
    <div class="op-resumen-item op-resumen-total">
      <span class="nombre">Total</span>
      <span class="cant">${fmtCOP(totalValor)}</span>
    </div>
  `;
  document.getElementById("op-placa").value = opState.operadorPlaca;
  document.getElementById("op-vehiculo-hint").textContent = opState.operadorVehiculo ? `(${opState.operadorVehiculo})` : "(opcional)";
  document.getElementById("op-observaciones").value = "";
  opFirmaClear();
}

// ---- Firma táctil de quien recibe ----
const opFirmaCanvas = document.getElementById("op-firma-canvas");
const opFirmaCtx = opFirmaCanvas.getContext("2d");
opFirmaCtx.lineWidth = 3;
opFirmaCtx.lineCap = "round";
opFirmaCtx.lineJoin = "round";
opFirmaCtx.strokeStyle = "#1a211c";
let opFirmaDrawing = false;
let opFirmaHasContent = false;

function opFirmaPos(evt) {
  const rect = opFirmaCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (opFirmaCanvas.width / rect.width),
    y: (evt.clientY - rect.top) * (opFirmaCanvas.height / rect.height),
  };
}
opFirmaCanvas.addEventListener("pointerdown", (e) => {
  opFirmaDrawing = true;
  const p = opFirmaPos(e);
  opFirmaCtx.beginPath();
  opFirmaCtx.moveTo(p.x, p.y);
  e.preventDefault();
});
opFirmaCanvas.addEventListener("pointermove", (e) => {
  if (!opFirmaDrawing) return;
  const p = opFirmaPos(e);
  opFirmaCtx.lineTo(p.x, p.y);
  opFirmaCtx.stroke();
  opFirmaHasContent = true;
  e.preventDefault();
});
window.addEventListener("pointerup", () => { opFirmaDrawing = false; });
document.getElementById("btn-op-firma-limpiar").addEventListener("click", opFirmaClear);

function opFirmaClear() {
  opFirmaCtx.clearRect(0, 0, opFirmaCanvas.width, opFirmaCanvas.height);
  opFirmaHasContent = false;
}

document.getElementById("btn-op-guardar").addEventListener("click", async () => {
  const payload = {
    fecha: new Date().toISOString().slice(0, 10),
    generador_id: opState.clienteId,
    responsable: opState.operadorNombre,
    conductor_nombre: opState.operadorNombre,
    conductor_cedula: opState.operadorCedula,
    vehiculo: opState.operadorVehiculo,
    placa: document.getElementById("op-placa").value.trim(),
    observaciones: document.getElementById("op-observaciones").value.trim(),
    firma_cliente: opFirmaHasContent ? opFirmaCanvas.toDataURL("image/png") : "",
    firma_responsable: opState.operadorFirma,
    materiales: opState.items.map(i => ({
      nombre: i.nombre,
      estado: "Sólido",
      disposicion: "",
      unidad: i.unidad,
      cantidad: i.cantidad,
      valor_unitario: i.valor_unitario || 0,
    })),
  };
  const btn = document.getElementById("btn-op-guardar");
  btn.disabled = true;
  try {
    const remision = await apiPost("/remisiones/", payload);
    await refreshRemisiones();
    renderOpExito(remision, false);
    opSetStep("exito", true);
  } catch (err) {
    if (err instanceof NetworkError) {
      const item = { local_id: newLocalId(), payload, created_at: new Date().toISOString() };
      await Queue.add(item);
      await refreshPending();
      updateSyncStatus();
      renderOpExito(pendingAsRemision(item), true);
      opSetStep("exito", true);
    } else {
      showError(err);
    }
  } finally {
    btn.disabled = false;
  }
});

// ---- Paso 4: éxito ----
let opUltimaRemisionId = null;
function renderOpExito(remision, offline) {
  opUltimaRemisionId = remision.id;
  document.getElementById("op-exito-title").textContent = offline ? "Guardada en este dispositivo" : "¡Recolección guardada!";
  document.getElementById("op-exito-sub").textContent = offline
    ? "Sin conexión: se enviará sola cuando vuelva el internet."
    : `Remisión N.° ${remision.consecutivo}`;
}
document.getElementById("btn-op-imprimir").addEventListener("click", () => {
  if (opUltimaRemisionId != null) printRemision(opUltimaRemisionId);
});
document.getElementById("btn-op-nueva").addEventListener("click", () => {
  opState.clienteId = null;
  opState.items = [];
  renderOpClientes();
  opSetStep("cliente", true);
});

// ---------- Init ----------
(async function init() {
  try {
    await loadAll();
    applyBrand();
    renderDashboard();
    updateSyncStatus();
    updateInstallButton();
    trySync();
    if (localStorage.getItem("xtend6_modo") === "operador") setModo("operador");
  } catch (err) {
    console.error(err);
    document.querySelector(".content").innerHTML = `<div class="panel"><p>No se pudo conectar con el servidor. ¿Está corriendo la API?</p><p style="color:#888;font-size:12px;">${err.message}</p></div>`;
  }
})();
