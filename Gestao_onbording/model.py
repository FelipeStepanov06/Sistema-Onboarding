from pydantic import BaseModel, EmailStr

def dados(BaseModel):
    email:EmailStr
    nome:str
    sobrenome:str
    data_nasc:int
    cpf:str
    ult_emrpesa:str
    ult_cargo:str

