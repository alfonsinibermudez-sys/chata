# RemisionesChatarreria

**Qué hace:** App para que una chatarrería genere remisiones (manifiestos de carga de residuos), las almacene y emita certificados mensuales por generador de residuos. Es un "Manifiesto de Carga" (referencia: software Grinclic). Decisión histórica de no mostrar valores monetarios en la tabla imprimible: **revertida 2026-09-18** a pedido del usuario — el PDF ahora sí muestra el total en kg y el total en valor al pie de la tabla de materiales.

Tiene dos modos de uso: el modo administrador normal (registrar generadores/productos/operadores, emitir certificados) y un "Modo operador" — pantalla completa, grande y visual, pensada para quien recolecta en sitio y puede tener poca costumbre de lectura (selecciona operador → cliente → materiales por categoría con íconos → firma táctil → guarda). Los operadores tienen su propio perfil (cédula, vehículo/placa habituales, firma de referencia) que autocompleta la remisión.

**Stack y entry point:** FastAPI, entry point `main.py`. Rutas en `routes/` (`remisiones.py`, `generadores.py`, `empresa.py`, `certificados.py`, `productos.py`, `operadores.py`).

**Base de datos/persistencia:** PostgreSQL con `psycopg2` crudo (pool + `execute()`), sin ORM — mismo estilo que `TigoApp`. Esquema en `migrations/001_init.sql`, idempotente (`CREATE TABLE IF NOT EXISTS`), se aplica solo al arrancar vía `database.py: init_db()` → `_run_migrations()`. No hay Alembic ni migraciones incrementales adicionales todavía (solo el 001).

**Integraciones clave:** Ninguna externa (Sheets/Slack/etc. no usadas). Frontend propio en `static/` (HTML/CSS/JS vanilla), servido por el mismo FastAPI (`StaticFiles(html=True)` montado en `/`), consume la API vía fetch (`static/js/api.js` mantiene cache en memoria `CACHE`). Tiene soporte PWA (manifest.json, sw.js, idb.js para sync offline).

**Gotchas conocidos:**
- `demo-artifact/` es una versión standalone con localStorage (sin backend); se regenera con `demo-artifact/build-preview.js`, no se edita a mano.
- `ejemplo remisión .pdf` y `Remisiones Chatarrería.pdf` en la raíz tienen datos reales de la empresa/un tercero — están en `.gitignore`, nunca commitear ni compartir.
- Remoto: `github.com/alfonsinibermudez-sys/chata.git` (rama `main`).
- **El servicio de Railway (proyecto `chata`) NO tiene auto-deploy conectado a GitHub** (confirmado 2026-09-17: hubo varios commits sin deploy nuevo durante casi un mes). Pushear a GitHub no basta — hace falta `railway up` (CLI, ya logueada y linkeada en este equipo) además del push.
- Service worker (`static/sw.js`) cachea el app shell: usa estrategia network-first (corregido 2026-09-18, antes era stale-while-revalidate y mostraba la versión vieja hasta la segunda recarga después de cada deploy). Subir `CACHE_VERSION` en cada deploy que toque `index.html`/`css`/`js`.
- Imágenes nuevas (firma o logo) insertadas por JS antes de `window.print()`: hay que esperar a que carguen (`printWhenImagesReady` en `app.js`) o el navegador las imprime en blanco — pasó con las firmas de `firma_cliente`/`firma_responsable` (corregido 2026-09-18).
- Migraciones nuevas sobre tablas que ya existen en producción necesitan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` explícito en `001_init.sql` — el `CREATE TABLE IF NOT EXISTS` no hace nada si la tabla ya existe, aunque le agregues columnas al `CREATE` de arriba.

**Deploy:** Railway (`Procfile` + `railway.json`, Nixpacks, healthcheck `/health`), vía `railway up` (ver gotcha de arriba — no hay auto-deploy). El usuario se encarga del deploy — NUNCA desplegar ni crear/pushear a un remoto de git sin que lo pida explícitamente.
