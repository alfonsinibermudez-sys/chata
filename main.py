import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import APP_ENV
from database import init_db, close_db, health_check
from logger_setup import setup_logging
from routes import empresa, generadores, remisiones, certificados

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[App] Iniciando...")
    init_db()
    yield
    close_db()
    logger.info("[App] Cerrando...")


app = FastAPI(title="Remisiones Chatarrería API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(empresa.router, prefix="/api/empresa", tags=["empresa"])
app.include_router(generadores.router, prefix="/api/generadores", tags=["generadores"])
app.include_router(remisiones.router, prefix="/api/remisiones", tags=["remisiones"])
app.include_router(certificados.router, prefix="/api/certificados", tags=["certificados"])


@app.get("/health")
def health():
    db_ok = health_check()
    return {"status": "ok" if db_ok else "degraded", "env": APP_ENV, "db": db_ok}


STATIC_DIR = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
