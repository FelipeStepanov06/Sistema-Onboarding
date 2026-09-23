# Modelos de validação de dados (schemas Pydantic) para as requisições da API.

from pydantic import BaseModel, EmailStr
from typing import Optional


class Usuario(BaseModel):
    """Modelo de dados para cadastro de candidato."""
    nome:       str
    sobrenome:  str
    # Validação automática de formato de e-mail.
    email:      EmailStr
    data_nasc:  str
    cpf:        str
    empresa:    str
    cargo:      str
    # Identificador opcional da vaga à qual o candidato está se vinculando.
    vaga_id:    Optional[int] = None


class StatusUpdate(BaseModel):
    """Modelo de dados para atualização do status de um candidato."""
    status: str


class VagaCreate(BaseModel):
    """Modelo de dados para criação de uma nova vaga."""
    titulo:    str
    area:      str = ''
    local:     str = ''
    tipo:      str = 'CLT'
    descricao: str = ''
    status:    str = 'Aberta'


class VagaStatusUpdate(BaseModel):
    """Modelo de dados para atualização do status de uma vaga."""
    status: str
