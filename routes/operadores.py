import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from database import execute
from models import OperadorIn, OperadorOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[OperadorOut])
def list_operadores(activo: Optional[bool] = None):
    if activo is None:
        return execute("SELECT * FROM operadores ORDER BY nombre", fetch=True)
    return execute(
        "SELECT * FROM operadores WHERE activo = %s ORDER BY nombre",
        (activo,),
        fetch=True,
    )


@router.post("/", response_model=OperadorOut)
def create_operador(o: OperadorIn):
    row = execute(
        "INSERT INTO operadores (nombre, activo) VALUES (%s, %s) RETURNING *",
        (o.nombre, o.activo),
        fetchone=True,
    )
    logger.info(f"[Operadores] Creado: {o.nombre}")
    return row


@router.put("/{operador_id}", response_model=OperadorOut)
def update_operador(operador_id: int, o: OperadorIn):
    row = execute(
        "UPDATE operadores SET nombre=%s, activo=%s WHERE id=%s RETURNING *",
        (o.nombre, o.activo, operador_id),
        fetchone=True,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    logger.info(f"[Operadores] Actualizado: {operador_id}")
    return row


@router.delete("/{operador_id}")
def delete_operador(operador_id: int):
    row = execute("DELETE FROM operadores WHERE id = %s RETURNING id", (operador_id,), fetchone=True)
    if not row:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    logger.info(f"[Operadores] Eliminado: {operador_id}")
    return {"ok": True}
