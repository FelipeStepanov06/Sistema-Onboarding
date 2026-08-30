from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, APIRouter
from model import Usuario
from controllers import router
import json
import sqlite3




app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # O "*" significa que aceitamos requisições de qualquer origem/porta
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os métodos (GET, POST, etc)
    allow_headers=["*"],
)

app.include_router(router)