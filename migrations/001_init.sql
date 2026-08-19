-- Esquema inicial: remisiones de chatarrería / gestión de residuos.
-- Idempotente: seguro de correr en cada arranque de la app.

CREATE TABLE IF NOT EXISTS empresa (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL DEFAULT '',
    nit TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    telefono TEXT NOT NULL DEFAULT '',
    web TEXT NOT NULL DEFAULT '',
    logo TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS generadores (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nit TEXT NOT NULL DEFAULT '',
    sucursal TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    ciudad TEXT NOT NULL DEFAULT '',
    contacto TEXT NOT NULL DEFAULT '',
    telefono TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consecutivos (
    scope TEXT PRIMARY KEY,
    valor INTEGER NOT NULL DEFAULT 0
);
INSERT INTO consecutivos (scope, valor) VALUES ('remision', 0)
ON CONFLICT (scope) DO NOTHING;

CREATE TABLE IF NOT EXISTS remisiones (
    id SERIAL PRIMARY KEY,
    consecutivo INTEGER NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    generador_id INTEGER NOT NULL REFERENCES generadores(id) ON DELETE RESTRICT,
    vehiculo TEXT NOT NULL DEFAULT '',
    placa TEXT NOT NULL DEFAULT '',
    conductor_nombre TEXT NOT NULL DEFAULT '',
    conductor_cedula TEXT NOT NULL DEFAULT '',
    auxiliar_nombre TEXT NOT NULL DEFAULT '',
    auxiliar_cedula TEXT NOT NULL DEFAULT '',
    responsable TEXT NOT NULL DEFAULT '',
    destino TEXT NOT NULL DEFAULT '',
    hora_llegada TEXT NOT NULL DEFAULT '',
    hora_salida TEXT NOT NULL DEFAULT '',
    observaciones TEXT NOT NULL DEFAULT '',
    responsable_cliente TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    enviada_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_remisiones_generador ON remisiones(generador_id);
CREATE INDEX IF NOT EXISTS idx_remisiones_fecha ON remisiones(fecha);

CREATE TABLE IF NOT EXISTS materiales (
    id SERIAL PRIMARY KEY,
    remision_id INTEGER NOT NULL REFERENCES remisiones(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Sólido',
    disposicion TEXT NOT NULL DEFAULT '',
    unidad TEXT NOT NULL DEFAULT 'kg',
    cantidad NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_materiales_remision ON materiales(remision_id);

CREATE TABLE IF NOT EXISTS certificados (
    id SERIAL PRIMARY KEY,
    generador_id INTEGER NOT NULL REFERENCES generadores(id) ON DELETE RESTRICT,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    fecha_emision DATE NOT NULL,
    total_kg NUMERIC(14,2) NOT NULL DEFAULT 0,
    detalle_por_material JSONB NOT NULL DEFAULT '{}',
    remision_ids INTEGER[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_certificados_generador ON certificados(generador_id);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
