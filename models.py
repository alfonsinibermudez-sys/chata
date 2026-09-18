from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------- Empresa ----------
class EmpresaIn(BaseModel):
    nombre: str = ""
    nit: str = ""
    direccion: str = ""
    telefono: str = ""
    web: str = ""
    logo: str = ""


class EmpresaOut(EmpresaIn):
    id: int

    class Config:
        from_attributes = True


# ---------- Generadores ----------
class GeneradorCreate(BaseModel):
    nombre: str
    nit: str = ""
    sucursal: str = ""
    direccion: str = ""
    ciudad: str = ""
    contacto: str = ""
    telefono: str = ""
    email: str = ""


class GeneradorOut(GeneradorCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Productos (catálogo para el modo operador) ----------
class ProductoIn(BaseModel):
    categoria: str
    nombre: str
    icono: str = "📦"
    unidad: str = "kg"
    valor_unitario: float = 0
    orden: int = 0
    activo: bool = True


class ProductoOut(ProductoIn):
    id: int

    class Config:
        from_attributes = True


# ---------- Operadores (quién recolecta, para "Modo operador") ----------
class OperadorIn(BaseModel):
    nombre: str
    activo: bool = True


class OperadorOut(OperadorIn):
    id: int

    class Config:
        from_attributes = True


# ---------- Materiales (anidados en Remisión) ----------
class MaterialIn(BaseModel):
    nombre: str
    estado: str = "Sólido"
    disposicion: str = ""
    unidad: str = "kg"
    cantidad: float = 0
    valor_unitario: float = 0


class MaterialOut(MaterialIn):
    id: int
    valor_total: float

    class Config:
        from_attributes = True


# ---------- Remisiones ----------
class RemisionCreate(BaseModel):
    fecha: date
    generador_id: int
    vehiculo: str = ""
    placa: str = ""
    conductor_nombre: str = ""
    conductor_cedula: str = ""
    auxiliar_nombre: str = ""
    auxiliar_cedula: str = ""
    responsable: str = ""
    destino: str = ""
    hora_llegada: str = ""
    hora_salida: str = ""
    observaciones: str = ""
    responsable_cliente: str = ""
    firma_cliente: str = ""
    materiales: list[MaterialIn] = Field(default_factory=list)


class RemisionOut(BaseModel):
    id: int
    consecutivo: int
    fecha: date
    generador_id: int
    vehiculo: str
    placa: str
    conductor_nombre: str
    conductor_cedula: str
    auxiliar_nombre: str
    auxiliar_cedula: str
    responsable: str
    destino: str
    hora_llegada: str
    hora_salida: str
    observaciones: str
    responsable_cliente: str
    firma_cliente: str = ""
    estado: str
    created_at: datetime
    enviada_at: Optional[datetime] = None
    materiales: list[MaterialOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ---------- Certificados ----------
class CertificadoGenerar(BaseModel):
    generador_id: int
    mes: str  # "YYYY-MM"


class CertificadoOut(BaseModel):
    id: int
    generador_id: int
    anio: int
    mes: int
    fecha_emision: date
    total_kg: float
    detalle_por_material: dict
    remision_ids: list[int]
    created_at: datetime

    class Config:
        from_attributes = True
