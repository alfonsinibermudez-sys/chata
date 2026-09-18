import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from database import execute
from models import ProductoIn, ProductoOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[ProductoOut])
def list_productos(activo: Optional[bool] = None):
    if activo is None:
        return execute("SELECT * FROM productos ORDER BY categoria, orden, nombre", fetch=True)
    return execute(
        "SELECT * FROM productos WHERE activo = %s ORDER BY categoria, orden, nombre",
        (activo,),
        fetch=True,
    )


@router.post("/", response_model=ProductoOut)
def create_producto(p: ProductoIn):
    row = execute(
        """INSERT INTO productos (categoria, nombre, icono, unidad, valor_unitario, orden, activo)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *""",
        (p.categoria, p.nombre, p.icono, p.unidad, p.valor_unitario, p.orden, p.activo),
        fetchone=True,
    )
    logger.info(f"[Productos] Creado: {p.categoria} / {p.nombre}")
    return row


@router.put("/{producto_id}", response_model=ProductoOut)
def update_producto(producto_id: int, p: ProductoIn):
    row = execute(
        """UPDATE productos SET categoria=%s, nombre=%s, icono=%s, unidad=%s,
             valor_unitario=%s, orden=%s, activo=%s
           WHERE id=%s RETURNING *""",
        (p.categoria, p.nombre, p.icono, p.unidad, p.valor_unitario, p.orden, p.activo, producto_id),
        fetchone=True,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    logger.info(f"[Productos] Actualizado: {producto_id}")
    return row


@router.delete("/{producto_id}")
def delete_producto(producto_id: int):
    row = execute("DELETE FROM productos WHERE id = %s RETURNING id", (producto_id,), fetchone=True)
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    logger.info(f"[Productos] Eliminado: {producto_id}")
    return {"ok": True}
