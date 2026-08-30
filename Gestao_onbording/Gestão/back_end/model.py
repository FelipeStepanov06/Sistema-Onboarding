from pydantic import BaseModel, EmailStr



class Usuario(BaseModel):
    email:EmailStr
    nome:str
    sobrenome:str
    data:str
    cpf:str
    empresa:str
    cargo:str

