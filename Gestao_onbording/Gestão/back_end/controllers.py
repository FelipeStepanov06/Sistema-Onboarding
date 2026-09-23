# Definição das rotas e regras de negócio da API.

from fastapi import APIRouter, HTTPException
from model import Usuario, StatusUpdate, VagaCreate, VagaStatusUpdate
from database import get_conn

router = APIRouter()

# Conjuntos com os valores válidos para status de candidato e de vaga.
STATUS_CANDIDATO = {'Novo', 'Em Análise', 'Entrevista', 'Contratado', 'Reprovado'}
STATUS_VAGA      = {'Aberta', 'Fechada', 'Pausada'}


# -------------------------------------------------------------------------
# ROTAS DE VAGAS DE EMPREGO
# -------------------------------------------------------------------------

@router.get('/vagas')
def listar_vagas():
    """Retorna todas as vagas cadastradas ordenadas por id decrescente."""
    conn = get_conn()
    try:
        cursor = conn.execute(
            "SELECT id, titulo, area, local, tipo, descricao, status, criado_em FROM vagas ORDER BY id DESC"
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@router.post('/vagas', status_code=201)
def criar_vaga(dados: VagaCreate):
    """Cria uma nova vaga de emprego."""
    if dados.status not in STATUS_VAGA:
        raise HTTPException(status_code=400, detail=f"Status inválido. Opções: {', '.join(STATUS_VAGA)}")
    
    conn = get_conn()
    try:
        # Parâmetros parametrizados para prevenção de SQL Injection.
        cursor = conn.execute(
            "INSERT INTO vagas (titulo, area, local, tipo, descricao, status) VALUES (?, ?, ?, ?, ?, ?)",
            (dados.titulo, dados.area, dados.local, dados.tipo, dados.descricao, dados.status)
        )
        conn.commit()
        return {"mensagem": "Vaga criada com sucesso!", "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch('/vagas/{vaga_id}/status')
def atualizar_status_vaga(vaga_id: int, dados: VagaStatusUpdate):
    """Atualiza o status de uma vaga existente."""
    if dados.status not in STATUS_VAGA:
        raise HTTPException(status_code=400, detail=f"Status inválido. Opções: {', '.join(STATUS_VAGA)}")
    
    conn = get_conn()
    try:
        cur = conn.execute("UPDATE vagas SET status = ? WHERE id = ?", (dados.status, vaga_id))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vaga não encontrada.")
        return {"mensagem": f"Status da vaga atualizado para '{dados.status}'"}
    finally:
        conn.close()


@router.delete('/vagas/{vaga_id}', status_code=204)
def deletar_vaga(vaga_id: int):
    """Remove uma vaga caso não existam candidatos vinculados a ela."""
    conn = get_conn()
    try:
        # Validação de dependência referencial antes da exclusão.
        count = conn.execute("SELECT COUNT(*) FROM usuarios WHERE vaga_id = ?", (vaga_id,)).fetchone()[0]
        if count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Não é possível excluir: há {count} candidato(s) vinculado(s) a esta vaga."
            )
        
        cur = conn.execute("DELETE FROM vagas WHERE id = ?", (vaga_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vaga não encontrada.")
    finally:
        conn.close()


# -------------------------------------------------------------------------
# ROTAS DE CANDIDATOS (USUÁRIOS)
# -------------------------------------------------------------------------

@router.post('/usuarios', status_code=201)
def criar_usuario(dados: Usuario):
    """Cadastra um novo candidato e vincula a uma vaga aberta quando informada."""
    conn = get_conn()
    try:
        vaga_titulo = ''
        if dados.vaga_id:
            row = conn.execute("SELECT titulo FROM vagas WHERE id = ? AND status = 'Aberta'", (dados.vaga_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Vaga não encontrada ou não está aberta.")
            # Denormalização do título da vaga para otimização de leitura.
            vaga_titulo = row['titulo']

        conn.execute(
            """INSERT INTO usuarios (nome, sobrenome, email, cpf, data_nasc, empresa, cargo, vaga_id, vaga_titulo, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Novo')""",
            (dados.nome, dados.sobrenome, dados.email, dados.cpf,
             dados.data_nasc, dados.empresa, dados.cargo, dados.vaga_id, vaga_titulo)
        )
        conn.commit()
        return {"mensagem": "Inscrição realizada com sucesso!"}
    except HTTPException:
        # Propaga exceções HTTP pré-definidas.
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get('/usuarios')
def listar_usuarios():
    """Retorna todos os candidatos cadastrados ordenados por id decrescente."""
    conn = get_conn()
    try:
        cursor = conn.execute(
            """SELECT id, nome, sobrenome, email, cpf, data_nasc, empresa, cargo,
                      vaga_id, vaga_titulo, status, criado_em
               FROM usuarios ORDER BY id DESC"""
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@router.patch('/usuarios/{usuario_id}/status')
def atualizar_status_usuario(usuario_id: int, dados: StatusUpdate):
    """Atualiza o status de um candidato existente."""
    if dados.status not in STATUS_CANDIDATO:
        raise HTTPException(status_code=400, detail=f"Status inválido. Opções: {', '.join(STATUS_CANDIDATO)}")
    
    conn = get_conn()
    try:
        cur = conn.execute("UPDATE usuarios SET status = ? WHERE id = ?", (dados.status, usuario_id))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Candidato não encontrado.")
        return {"mensagem": f"Status atualizado para '{dados.status}'"}
    finally:
        conn.close()


@router.delete('/usuarios/{usuario_id}', status_code=204)
def deletar_usuario(usuario_id: int):
    """Remove um candidato pelo identificador."""
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM usuarios WHERE id = ?", (usuario_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Candidato não encontrado.")
    finally:
        conn.close()