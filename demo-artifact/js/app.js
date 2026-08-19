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
  return Store.getGeneradores().find(g => g.id === id);
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
  if (name === "certificados") renderCertificados();
  if (name === "empresa") renderEmpresaForm();
}

// ---------- Mi empresa ----------
function applyBrand() {
  const e = Store.getEmpresa();
  document.getElementById("brand-title").textContent = e.nombre || "Remisiones";
  const mark = document.getElementById("brand-mark");
  mark.innerHTML = e.logo ? `<img src="${e.logo}" alt="Logo">` : "R";
}

function renderEmpresaForm() {
  const e = Store.getEmpresa();
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

document.getElementById("form-empresa").addEventListener("submit", (e) => {
  e.preventDefault();
  const prev = Store.getEmpresa();
  const empresa = {
    nombre: document.getElementById("emp-nombre").value.trim(),
    nit: document.getElementById("emp-nit").value.trim(),
    direccion: document.getElementById("emp-direccion").value.trim(),
    telefono: document.getElementById("emp-telefono").value.trim(),
    web: document.getElementById("emp-web").value.trim(),
    logo: pendingLogo || prev.logo || "",
  };
  Store.saveEmpresa(empresa);
  applyBrand();
  alert("Datos de la empresa guardados.");
});

// ---------- Dashboard ----------
function renderDashboard() {
  const remisiones = Store.getRemisiones();
  const generadores = Store.getGeneradores();
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

  const recent = [...remisiones].sort((a, b) => b.consecutivo - a.consecutivo).slice(0, 6);
  if (recent.length === 0) {
    document.getElementById("dashboard-recent").innerHTML = `<div class="empty-state">Aún no hay remisiones. Crea la primera desde "Nueva remisión".</div>`;
    return;
  }
  document.getElementById("dashboard-recent").innerHTML = `
    <table class="data-table">
      <thead><tr><th>#</th><th>Fecha</th><th>Generador</th><th>Total kg</th><th>Estado</th></tr></thead>
      <tbody>
        ${recent.map(r => {
          const g = generadorById(r.generadorId);
          return `<tr>
            <td class="num">${r.consecutivo}</td>
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
  return estado === "enviada"
    ? `<span class="badge badge-enviada">Enviada</span>`
    : `<span class="badge badge-pendiente">Pendiente</span>`;
}

function totalKgRemision(r) {
  return r.materiales.reduce((s, m) => s + (parseFloat(m.cantidad) || 0), 0);
}
function totalValorRemision(r) {
  return r.materiales.reduce((s, m) => s + (parseFloat(m.valorTotal) || 0), 0);
}

// ---------- Generadores ----------
function fillGeneradorSelects() {
  const generadores = Store.getGeneradores();
  const opts = generadores.map(g => `<option value="${g.id}">${g.nombre}</option>`).join("");
  const selRem = document.getElementById("rem-generador");
  const selFilter = document.getElementById("filter-generador");
  const selCert = document.getElementById("cert-generador");
  selRem.innerHTML = generadores.length ? opts : `<option value="">-- Registra un generador primero --</option>`;
  selFilter.innerHTML = `<option value="">Todos los generadores</option>` + opts;
  selCert.innerHTML = generadores.length ? opts : `<option value="">-- Registra un generador primero --</option>`;
}

document.getElementById("form-generador").addEventListener("submit", (e) => {
  e.preventDefault();
  const g = {
    id: uid(),
    nombre: document.getElementById("gen-nombre").value.trim(),
    nit: document.getElementById("gen-nit").value.trim(),
    sucursal: document.getElementById("gen-sucursal").value.trim(),
    direccion: document.getElementById("gen-direccion").value.trim(),
    ciudad: document.getElementById("gen-ciudad").value.trim(),
    contacto: document.getElementById("gen-contacto").value.trim(),
    telefono: document.getElementById("gen-telefono").value.trim(),
    email: document.getElementById("gen-email").value.trim(),
  };
  Store.saveGenerador(g);
  e.target.reset();
  renderGeneradores();
  fillGeneradorSelects();
});

function renderGeneradores() {
  const list = Store.getGeneradores();
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
      <td><button class="btn btn-danger btn-sm" onclick="removeGenerador('${g.id}')">Eliminar</button></td>
    </tr>
  `).join("");
  fillGeneradorSelects();
}

function removeGenerador(id) {
  if (!confirm("¿Eliminar este generador? Las remisiones ya creadas no se verán afectadas.")) return;
  Store.deleteGenerador(id);
  renderGeneradores();
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

document.getElementById("form-remision").addEventListener("submit", (e) => {
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
      valorUnitario,
      valorTotal: cantidad * valorUnitario,
    };
  }).filter(m => m.cantidad > 0 || m.nombre !== "Material sin especificar");

  if (materiales.length === 0) { alert("Agrega al menos un material con cantidad."); return; }

  const remision = {
    id: uid(),
    consecutivo: nextConsecutivo(),
    fecha: document.getElementById("rem-fecha").value,
    generadorId,
    vehiculo: document.getElementById("rem-vehiculo").value.trim(),
    placa: document.getElementById("rem-placa").value.trim(),
    conductorNombre: document.getElementById("rem-conductor-nombre").value.trim(),
    conductorCedula: document.getElementById("rem-conductor-cedula").value.trim(),
    auxiliarNombre: document.getElementById("rem-auxiliar-nombre").value.trim(),
    auxiliarCedula: document.getElementById("rem-auxiliar-cedula").value.trim(),
    responsable: document.getElementById("rem-responsable").value.trim(),
    destino: document.getElementById("rem-destino").value.trim(),
    horaLlegada: document.getElementById("rem-hora-llegada").value,
    horaSalida: document.getElementById("rem-hora-salida").value,
    materiales,
    observaciones: document.getElementById("rem-observaciones").value.trim(),
    responsableCliente: document.getElementById("rem-responsable-cliente").value.trim(),
    estado: "pendiente",
    createdAt: new Date().toISOString(),
  };
  Store.saveRemision(remision);
  e.target.reset();
  document.getElementById("materiales-body").innerHTML = "";
  addMaterialRow();
  alert(`Remisión N.° ${remision.consecutivo} guardada.`);
  setView("remisiones");
});

// ---------- Remisiones list ----------
function renderRemisiones() {
  fillGeneradorSelects();
  const genFilter = document.getElementById("filter-generador").value;
  const mesFilter = document.getElementById("filter-mes").value;
  const estadoFilter = document.getElementById("filter-estado").value;

  let list = Store.getRemisiones();
  if (genFilter) list = list.filter(r => r.generadorId === genFilter);
  if (mesFilter) list = list.filter(r => r.fecha.slice(0, 7) === mesFilter);
  if (estadoFilter) list = list.filter(r => r.estado === estadoFilter);
  list = list.sort((a, b) => b.consecutivo - a.consecutivo);

  const body = document.getElementById("remisiones-body");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="empty-state">No hay remisiones que coincidan con el filtro.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(r => {
    const g = generadorById(r.generadorId);
    return `<tr>
      <td class="num">${r.consecutivo}</td>
      <td class="num">${fmtDate(r.fecha)}</td>
      <td>${g ? g.nombre : "—"}</td>
      <td class="num">${fmtKg(totalKgRemision(r))} kg</td>
      <td class="num">${fmtCOP(totalValorRemision(r))}</td>
      <td>${estadoBadge(r.estado)}</td>
      <td class="row-actions">
        <button class="btn btn-secondary btn-sm" onclick="printRemision('${r.id}')">Imprimir / PDF</button>
        ${r.estado === "pendiente" ? `<button class="btn btn-primary btn-sm" onclick="marcarEnviada('${r.id}')">Marcar enviada</button>` : ""}
        <button class="btn btn-danger btn-sm" onclick="removeRemision('${r.id}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

["filter-generador", "filter-mes", "filter-estado"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderRemisiones);
});

function marcarEnviada(id) {
  Store.updateRemision(id, { estado: "enviada", enviadaAt: new Date().toISOString() });
  renderRemisiones();
}
function removeRemision(id) {
  if (!confirm("¿Eliminar esta remisión?")) return;
  Store.deleteRemision(id);
  renderRemisiones();
  renderDashboard();
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
  const r = Store.getRemisiones().find(x => x.id === id);
  if (!r) return;
  const g = generadorById(r.generadorId);
  const emp = Store.getEmpresa();
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

  const llegada = timeLabel(r.horaLlegada, r.fecha);
  const salida = timeLabel(r.horaSalida, r.fecha);

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
          <div class="num">N.° ${r.consecutivo}</div>
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
          <div class="row"><span class="k">Conductor</span><span class="v">${[r.conductorNombre, r.conductorCedula].filter(Boolean).join(" / ") || "—"}</span></div>
          <div class="row"><span class="k">Auxiliar</span><span class="v">${[r.auxiliarNombre, r.auxiliarCedula].filter(Boolean).join(" / ") || "—"}</span></div>
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
          ${r.responsable || ""}
        </div>
        <div class="doc-signature">
          <div class="role">Responsable cliente</div>
          ${r.responsableCliente || ""}
        </div>
      </div>

      <div class="doc-footer">
        <div>${emp.nombre || ""}${emp.nit ? " · NIT " + emp.nit : ""}${emp.direccion ? " · " + emp.direccion : ""}</div>
        <div class="doc-id">ID ${r.id}</div>
      </div>
    </div>
  `;
  document.getElementById("print-remision").innerHTML = html;
  window.print();
}

// ---------- Certificados ----------
document.getElementById("btn-generar-cert").addEventListener("click", () => {
  const generadorId = document.getElementById("cert-generador").value;
  const mesValue = document.getElementById("cert-mes").value; // yyyy-mm
  if (!generadorId || !mesValue) { alert("Selecciona generador y mes."); return; }

  const remisiones = Store.getRemisiones().filter(r => r.generadorId === generadorId && r.fecha.slice(0, 7) === mesValue);
  if (remisiones.length === 0) { alert("No hay remisiones para ese generador en ese mes."); return; }

  const detallePorMaterial = {};
  let totalKg = 0;
  remisiones.forEach(r => r.materiales.forEach(m => {
    detallePorMaterial[m.nombre] = (detallePorMaterial[m.nombre] || 0) + (parseFloat(m.cantidad) || 0);
    totalKg += parseFloat(m.cantidad) || 0;
  }));

  const [anio, mes] = mesValue.split("-");
  const cert = {
    id: uid(),
    generadorId,
    anio: parseInt(anio, 10),
    mes: parseInt(mes, 10),
    fechaEmision: new Date().toISOString().slice(0, 10),
    remisionIds: remisiones.map(r => r.id),
    totalKg,
    detallePorMaterial,
  };
  Store.saveCertificado(cert);
  renderCertificados();
  printCertificado(cert.id);
});

function renderCertificados() {
  fillGeneradorSelects();
  const list = Store.getCertificados().sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes));
  const body = document.getElementById("certificados-body");
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">Aún no se han generado certificados.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(c => {
    const g = generadorById(c.generadorId);
    return `<tr>
      <td>${g ? g.nombre : "—"}</td>
      <td>${MESES[c.mes - 1]} ${c.anio}</td>
      <td class="num">${fmtKg(c.totalKg)} kg</td>
      <td class="num">${c.remisionIds.length}</td>
      <td class="num">${fmtDate(c.fechaEmision)}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="printCertificado('${c.id}')">Imprimir / PDF</button></td>
    </tr>`;
  }).join("");
}

function printCertificado(id) {
  const c = Store.getCertificados().find(x => x.id === id);
  if (!c) return;
  const g = generadorById(c.generadorId);
  const emp = Store.getEmpresa();
  const remisiones = Store.getRemisiones().filter(r => c.remisionIds.includes(r.id)).sort((a, b) => a.consecutivo - b.consecutivo);

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
      <div class="doc-gen-meta">Emitido ${fmtDate(c.fechaEmision)}</div>

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
          ${Object.entries(c.detallePorMaterial).map(([nombre, kg]) => `<tr><td>${nombre}</td><td class="num">${fmtKg(kg)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="doc-note" style="text-align:right; font-weight:600; color:#333;">Total recolectado: ${fmtKg(c.totalKg)} kg</div>

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
  document.getElementById("print-certificado").innerHTML = html;
  window.print();
}

// ---------- Init ----------
applyBrand();
renderDashboard();
