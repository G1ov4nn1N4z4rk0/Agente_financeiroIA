"""Aplicação Principal FastAPI - Backend do Agente Financeiro WhatsApp Web."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Força codificação UTF-8 no stdout/stderr no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Adiciona o diretório raiz do projeto ao path para suportar imports relativos e absolutos
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Carrega variáveis de ambiente
load_dotenv()

from backend.routes import router as api_router

app = FastAPI(
    title="WhatsApp Web - Agente Financeiro Azure AI",
    description="Interface WhatsApp Web conectada ao agente financeiro giovanni01-agente no Azure AI",
    version="1.0.0",
)

# Configuração de CORS para permitir requisições locais
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra as rotas da API
app.include_router(api_router)

# Caminho para os arquivos estáticos do frontend
FRONTEND_DIR = BASE_DIR / "frontend"

if FRONTEND_DIR.exists():
    # Monta arquivos CSS, JS e Assets estáticos
    app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
    if (FRONTEND_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    # Rota raiz servindo o index.html do WhatsApp Web
    @app.get("/", include_in_schema=False)
    async def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"\n=======================================================")
    print(f"🚀 Iniciando Servidor WhatsApp Web - Agente Azure AI")
    print(f"📡 Backend & Frontend disponíveis em: http://localhost:{port}")
    print(f"📑 Documentação Swagger em: http://localhost:{port}/docs")
    print(f"=======================================================\n")
    uvicorn.run("backend.app:app", host=host, port=port, reload=False)
