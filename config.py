import os
from pathlib import Path

ROOT = Path(__file__).parent

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/remisiones")

APP_ENV = os.getenv("APP_ENV", "development")
DEBUG = APP_ENV == "development"
PORT = int(os.getenv("PORT", "8000"))

LOG_FILE = os.getenv("LOG_FILE", "app.log")
LOG_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
LOG_BACKUP_COUNT = 3

ESTADOS_REMISION = {"pendiente", "enviada"}
ESTADOS_MATERIAL = {"Sólido", "Líquido", "Semisólido"}

# SMTP para el envío de manifiestos por email (ver routes/remisiones.py).
# Mientras no estén configuradas, el endpoint responde 503 en vez de fallar
# a medias — no hay valores por defecto que "funcionen a lo tonto".
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER
