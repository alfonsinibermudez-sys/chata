import logging
from datetime import datetime, timezone
from typing import Optional

import psycopg2.extras
from fastapi import APIRouter, HTTPException, Query

from database import execute, get_conn, release_conn
from models import RemisionCreate, RemisionOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _attach_materiales(remisiones: list[dict]) -> list[dict]:
    if not remisiones:
        return remisiones
    ids = [r["id"] for r in remisiones]
    materiales = execute(
        "SELECT * FROM materiales WHERE remision_id = ANY(%s) ORDER BY id",
        (ids,),
        fetch=True,
    )
    by_remision: dict[int, list] = {}
    for m in materiales:
        by_remision.setdefault(m["remision_id"], []).append(m)
    for r in remisiones:
        r["materiales"] = by_remision.get(r["id"], [])
    return remisiones


@router.get("/", response_model=list[RemisionOut])
def list_remisiones(
    generador_id: Optional[int] = None,
    mes: Optional[str] = Query(None, description="YYYY-MM"),
    estado: Optional[str] = None,
):
    where = []
    params: list = []
    if generador_id:
        where.append("generador_id = %s")
        params.append(generador_id)
    if mes:
        where.append("to_char(fecha, 'YYYY-MM') = %s")
        params.append(mes)
    if estado:
        where.append("estado = %s")
        params.append(estado)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    rows = execute(f"SELECT * FROM remisiones {clause} ORDER BY consecutivo DESC", tuple(params), fetch=True)
    return _attach_materiales(rows)


@router.get("/{remision_id}", response_model=RemisionOut)
def get_remision(remision_id: int):
    row = execute("SELECT * FROM remisiones WHERE id = %s", (remision_id,), fetchone=True)
    if not row:
        raise HTTPException(status_code=404, detail="Remisión no encontrada")
    return _attach_materiales([row])[0]


@router.post("/", response_model=RemisionOut)
def create_remision(r: RemisionCreate):
    generador = execute("SELECT id FROM generadores WHERE id = %s", (r.generador_id,), fetchone=True)
    if not generador:
        raise HTTPException(status_code=404, detail="Generador no encontrado")
    if not r.materiales:
        raise HTTPException(status_code=422, detail="Agrega al menos un material")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE consecutivos SET valor = valor + 1 WHERE scope = 'remision' RETURNING valor"
            )
            consecutivo = cur.fetchone()["valor"]

            cur.execute(
                """INSERT INTO remisiones (
                     consecutivo, fecha, generador_id, vehiculo, placa,
                     conductor_nombre, conductor_cedula, auxiliar_nombre, auxiliar_cedula,
                     responsable, destino, hora_llegada, hora_salida,
                     observaciones, responsable_cliente, estado
                   ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pendiente')
                   RETURNING *""",
                (
                    consecutivo, r.fecha, r.generador_id, r.vehiculo, r.placa,
                    r.conductor_nombre, r.conductor_cedula, r.auxiliar_nombre, r.auxiliar_cedula,
                    r.responsable, r.destino, r.hora_llegada, r.hora_salida,
                    r.observaciones, r.responsable_cliente,
                ),
            )
            remision = dict(cur.fetchone())

            materiales = []
            for m in r.materiales:
                valor_total = round(m.cantidad * m.valor_unitario, 2)
                cur.execute(
                    """INSERT INTO materiales (remision_id, nombre, estado, disposicion, unidad, cantidad, valor_unitario, valor_total)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                    (remision["id"], m.nombre, m.estado, m.disposicion, m.unidad, m.cantidad, m.valor_unitario, valor_total),
                )
                materiales.append(dict(cur.fetchone()))

            conn.commit()
            remision["materiales"] = materiales
            logger.info(f"[Remisiones] Creada N.{consecutivo} generador={r.generador_id}")
            return remision
    except Exception as e:
        conn.rollback()
        logger.error(f"[Remisiones] Error creando remisión: {e}")
        raise HTTPException(status_code=500, detail="Error creando la remisión")
    finally:
        release_conn(conn)


@router.patch("/{remision_id}/enviar", response_model=RemisionOut)
def marcar_enviada(remision_id: int):
    row = execute(
        "UPDATE remisiones SET estado = 'enviada', enviada_at = %s WHERE id = %s RETURNING *",
        (datetime.now(timezone.utc), remision_id),
        fetchone=True,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Remisión no encontrada")
    logger.info(f"[Remisiones] Marcada enviada: {remision_id}")
    return _attach_materiales([row])[0]


@router.delete("/{remision_id}")
def delete_remision(remision_id: int):
    row = execute("DELETE FROM remisiones WHERE id = %s RETURNING id", (remision_id,), fetchone=True)
    if not row:
        raise HTTPException(status_code=404, detail="Remisión no encontrada")
    logger.info(f"[Remisiones] Eliminada: {remision_id}")
    return {"ok": True}
