import logging

from fastapi import APIRouter, HTTPException

from database import execute
from models import GeneradorCreate, GeneradorOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[GeneradorOut])
def list_generadores():
    return execute("SELECT * FROM generadores ORDER BY nombre", fetch=True)


@router.post("/", response_model=GeneradorOut)
def create_generador(g: GeneradorCreate):
    row = execute(
        """INSERT INTO generadores (nombre, nit, sucursal, direccion, ciudad, contacto, telefono, email)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (g.nombre, g.nit, g.sucursal, g.direccion, g.ciudad, g.contacto, g.telefono, g.email),
        fetchone=True,
    )
    logger.info(f"[Generadores] Creado: {g.nombre}")
    return row


@router.delete("/{generador_id}")
def delete_generador(generador_id: int):
    en_uso = execute("SELECT id FROM remisiones WHERE generador_id = %s LIMIT 1", (generador_id,), fetchone=True)
    if en_uso:
        raise HTTPException(status_code=409, detail="No se puede eliminar: tiene remisiones asociadas")
    row = execute("DELETE FROM generadores WHERE id = %s RETURNING id", (generador_id,), fetchone=True)
    if not row:
        raise HTTPException(status_code=404, detail="Generador no encontrado")
    logger.info(f"[Generadores] Eliminado: {generador_id}")
    return {"ok": True}
