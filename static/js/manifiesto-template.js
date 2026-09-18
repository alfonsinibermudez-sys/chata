// Plantilla del manifiesto de carga: la usan tanto la app (impresión desde
// "Remisiones"/"Modo operador") como la página pública `manifiesto.html`
// (el link que se manda por email/WhatsApp), para no mantener el diseño
// duplicado en dos lugares.
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

function totalKgRemision(r) {
  return r.materiales.reduce((s, m) => s + (parseFloat(m.cantidad) || 0), 0);
}
function totalValorRemision(r) {
  return r.materiales.reduce((s, m) => {
    const vt = m.valor_total != null ? parseFloat(m.valor_total) : (parseFloat(m.cantidad) || 0) * (parseFloat(m.valor_unitario) || 0);
    return s + (vt || 0);
  }, 0);
}

const MIN_TABLE_ROWS = 6;

function timeLabel(hhmm, fecha) {
  if (!hhmm) return { time: "—", date: fmtDate(fecha) };
  const [h, m] = hhmm.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = ((hour + 11) % 12) + 1;
  return { time: `${hour12}:${m} ${suffix}`, date: fmtDate(fecha) };
}

// r: RemisionOut: g: GeneradorOut (o null); emp: EmpresaOut (o {})
function buildManifiestoHtml(r, g, emp) {
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

  return `
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
          <div class="row"><span class="k">Conductor</span><span class="v">${r.conductor_nombre || "—"}</span></div>
          <div class="row"><span class="k">Cédula conductor</span><span class="v">${r.conductor_cedula || "—"}</span></div>
          <div class="row"><span class="k">Auxiliar</span><span class="v">${r.auxiliar_nombre || "—"}</span></div>
          <div class="row"><span class="k">Cédula auxiliar</span><span class="v">${r.auxiliar_cedula || "—"}</span></div>
          <div class="row"><span class="k">Responsable</span><span class="v">${r.responsable || "—"}</span></div>
          <div class="row"><span class="k">Destino</span><span class="v">${r.destino || "—"}</span></div>
        </div>
      </div>

      <div class="doc-section-title">Servicio de recolección y transporte de residuos</div>
      <table class="doc-table doc-table--brand">
        <thead><tr><th>Nombre</th><th>Estado</th><th>Disposición</th><th class="num">Unid</th><th class="num">Cant</th></tr></thead>
        <tbody>${materialRows}${blankRowsHtml}</tbody>
      </table>
      <div class="doc-totales">
        <span>Total kg: <strong>${fmtKg(totalKgRemision(r))}</strong></span>
        <span>Total valor: <strong>${fmtCOP(totalValorRemision(r))}</strong></span>
      </div>
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
