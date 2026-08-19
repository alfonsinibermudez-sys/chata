// ---------- Demo seed (only once, so the preview shows real content) ----------
(function seedDemoData() {
  if (localStorage.getItem("rc_seeded")) return;

  Store.saveEmpresa({
    nombre: "Recicladora El Progreso S.A.S.",
    nit: "900.512.334-1",
    direccion: "Cra 58A # 29-49, Guayabal",
    telefono: "604 445 2200",
    web: "www.recicladoraelprogreso.com",
    logo: "",
  });

  const g1 = { id: uid(), nombre: "Industrias Metálicas del Norte S.A.S.", nit: "900.234.551-2", sucursal: "Sede Principal", direccion: "Cra 45 # 12-30, Zona Industrial", ciudad: "Medellín", contacto: "Laura Restrepo", telefono: "300 654 2211", email: "laura.restrepo@imnorte.com" };
  const g2 = { id: uid(), nombre: "Autopartes El Rodamiento", nit: "830.112.998-4", sucursal: "Bodega 3", direccion: "Calle 80 # 34-10", ciudad: "Bogotá", contacto: "Carlos Peña", telefono: "310 987 4433", email: "compras@elrodamiento.co" };
  Store.saveGenerador(g1);
  Store.saveGenerador(g2);

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);
  const mk = (day) => `${ym}-${String(day).padStart(2, "0")}`;

  const r1 = {
    id: uid(), consecutivo: nextConsecutivo(), fecha: mk(3), generadorId: g1.id,
    vehiculo: "Foton blanco", placa: "LKN213",
    conductorNombre: "Daniel Felipe Cano Correa", conductorCedula: "1036657956",
    auxiliarNombre: "Harold Yesid Aguirre Ortiz", auxiliarCedula: "1017200097",
    responsable: "Andrés Gómez", destino: "Unidad de transferencia",
    horaLlegada: "10:53", horaSalida: "11:02",
    materiales: [
      { nombre: "Chatarra ferrosa", estado: "Sólido", disposicion: "Aprovechamiento", unidad: "kg", cantidad: 820, valorUnitario: 950, valorTotal: 779000 },
      { nombre: "Viruta de aluminio", estado: "Sólido", disposicion: "Aprovechamiento", unidad: "kg", cantidad: 140, valorUnitario: 3200, valorTotal: 448000 },
    ],
    observaciones: "Material limpio, sin contaminantes visibles.",
    responsableCliente: "Johan Blandón", estado: "enviada", enviadaAt: today.toISOString(), createdAt: today.toISOString(),
  };
  const r2 = {
    id: uid(), consecutivo: nextConsecutivo(), fecha: mk(11), generadorId: g1.id,
    vehiculo: "Foton blanco", placa: "LKN213",
    conductorNombre: "Daniel Felipe Cano Correa", conductorCedula: "1036657956",
    auxiliarNombre: "", auxiliarCedula: "",
    responsable: "Andrés Gómez", destino: "Unidad de transferencia",
    horaLlegada: "09:15", horaSalida: "09:40",
    materiales: [ { nombre: "Chatarra ferrosa", estado: "Sólido", disposicion: "Aprovechamiento", unidad: "kg", cantidad: 615, valorUnitario: 950, valorTotal: 584250 } ],
    observaciones: "", responsableCliente: "Johan Blandón", estado: "enviada", enviadaAt: today.toISOString(), createdAt: today.toISOString(),
  };
  const r3 = {
    id: uid(), consecutivo: nextConsecutivo(), fecha: mk(17), generadorId: g2.id,
    vehiculo: "NPR turbo gris", placa: "SJH812",
    conductorNombre: "Marcela Ortiz", conductorCedula: "1128455678",
    auxiliarNombre: "", auxiliarCedula: "",
    responsable: "Andrés Gómez", destino: "Planta de aprovechamiento",
    horaLlegada: "14:05", horaSalida: "14:35",
    materiales: [
      { nombre: "Cobre mixto", estado: "Sólido", disposicion: "Aprovechamiento", unidad: "kg", cantidad: 58, valorUnitario: 21500, valorTotal: 1247000 },
      { nombre: "Chatarra ferrosa", estado: "Sólido", disposicion: "Aprovechamiento", unidad: "kg", cantidad: 340, valorUnitario: 950, valorTotal: 323000 },
    ],
    observaciones: "Incluye rodamientos usados.", responsableCliente: "Carlos Peña", estado: "pendiente", createdAt: today.toISOString(),
  };
  Store.saveRemision(r1);
  Store.saveRemision(r2);
  Store.saveRemision(r3);

  const detalle = { "Chatarra ferrosa": r1.materiales[0].cantidad + r2.materiales[0].cantidad, "Viruta de aluminio": r1.materiales[1].cantidad };
  Store.saveCertificado({
    id: uid(), generadorId: g1.id, anio: today.getFullYear(), mes: today.getMonth() + 1,
    fechaEmision: today.toISOString().slice(0, 10),
    remisionIds: [r1.id, r2.id], totalKg: detalle["Chatarra ferrosa"] + detalle["Viruta de aluminio"],
    detallePorMaterial: detalle,
  });

  localStorage.setItem("rc_seeded", "1");
})();
