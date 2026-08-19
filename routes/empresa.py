import logging

from fastapi import APIRouter

from database import execute
from models import EmpresaIn, EmpresaOut

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=EmpresaOut)
def get_empresa():
    row = execute("SELECT * FROM empresa ORDER BY id LIMIT 1", fetchone=True)
    if not row:
        row = execute(
            "INSERT INTO empresa (nombre) VALUES ('') RETURNING *",
            fetchone=True,
        )
    return row


@router.put("/", response_model=EmpresaOut)
def update_empresa(empresa: EmpresaIn):
    existing = execute("SELECT id FROM empresa ORDER BY id LIMIT 1", fetchone=True)
    if existing:
        row = execute(
            """UPDATE empresa SET nombre=%s, nit=%s, direccion=%s, telefono=%s, web=%s, logo=%s
               WHERE id=%s RETURNING *""",
            (empresa.nombre, empresa.nit, empresa.direccion, empresa.telefono, empresa.web, empresa.logo, existing["id"]),
            fetchone=True,
        )
    else:
        row = execute(
            """INSERT INTO empresa (nombre, nit, direccion, telefono, web, logo)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (empresa.nombre, empresa.nit, empresa.direccion, empresa.telefono, empresa.web, empresa.logo),
            fetchone=True,
        )
    logger.info(f"[Empresa] Datos actualizados: {empresa.nombre}")
    return row
