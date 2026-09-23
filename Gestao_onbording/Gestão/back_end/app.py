# Ponto de entrada da aplicação FastAPI.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from controllers import router

# Inicialização do banco de dados e criação de tabelas na inicialização do servidor.
init_db()

# Instância da aplicação FastAPI e metadados para a documentação OpenAPI/Swagger.
app = FastAPI(
    title="RecrutaWeb API",
    description="API para gerenciamento de candidatos",
    version="1.0.0"
)

# Configuração de CORS (Cross-Origin Resource Sharing) para permitir requisições externas.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro das rotas modulares da API.
app.include_router(router)