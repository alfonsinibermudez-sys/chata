import json
import logging
from datetime import date

from fastapi import APIRouter, HTTPException

from database import execute
from models import CertificadoGenerar, CertificadoOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[CertificadoOut])
def list_certificados():
    return execute("SELECT * FROM certificados ORDER BY anio DESC, mes DESC", fetch=True)


@router.post("/generar", response_model=CertificadoOut)
def generar_certificado(payload: CertificadoGenerar):
    generador = execute("SELECT id FROM generadores WHERE id = %s", (payload.generador_id,), fetchone=True)
    if not generador:
        raise HTTPException(status_code=404, detail="Generador no encontrado")

    anio, mes = (int(x) for x in payload.mes.split("-"))

    remisiones = execute(
        "SELECT id FROM remisiones WHERE generador_id = %s AND to_char(fecha, 'YYYY-MM') = %s",
        (payload.generador_id, payload.mes),
        fetch=True,
    )
    if not remisiones:
        raise HTTPException(status_code=404, detail="No hay remisiones para ese generador en ese mes")
    remision_ids = [r["id"] for r in remisiones]

    materiales = execute(
        "SELECT nombre, cantidad FROM materiales WHERE remision_id = ANY(%s)",
        (remision_ids,),
        fetch=True,
    )
    detalle: dict[str, float] = {}
    total_kg = 0.0
    for m in materiales:
        cantidad = float(m["cantidad"])
        detalle[m["nombre"]] = round(detalle.get(m["nombre"], 0) + cantidad, 2)
        total_kg += cantidad

    row = execute(
        """INSERT INTO certificados (generador_id, anio, mes, fecha_emision, total_kg, detalle_por_material, remision_ids)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (payload.generador_id, anio, mes, date.today(), round(total_kg, 2), json.dumps(detalle), remision_ids),
        fetchone=True,
    )
    logger.info(f"[Certificados] Generado generador={payload.generador_id} periodo={payload.mes}")
    return row
