from model import BaseModel,Usuario
from pydantic import BaseModel, EmailStr
from app import FastAPI, APIRouter

router = APIRouter()


@router.post('/usuarios')
def criar_usuario(dados:Usuario):
    return{"mensagem":"Candidato criado com sucesso"}

def salvar_usuarios(dados:Usuario):
    print(dados)
    pass