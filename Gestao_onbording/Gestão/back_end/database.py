# Gerenciamento de conexão e inicialização do banco de dados SQLite.

import sqlite3
import os

# Caminho absoluto para o arquivo de banco de dados SQLite.
DB_PATH = os.path.join(os.path.dirname(__file__), 'bd.db')


def get_conn():
    """Retorna uma conexão configurada com o banco de dados SQLite."""
    conn = sqlite3.connect(DB_PATH)
    # Permite o acesso a colunas por nome através de mapeamento por chave.
    conn.row_factory = sqlite3.Row
    # Habilita a verificação de integridade referencial de chaves estrangeiras.
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Cria a estrutura de tabelas no banco de dados se não existirem."""
    conn = get_conn()
    try:
        # Tabela para armazenamento de vagas de emprego.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS vagas (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo    TEXT    NOT NULL,
                area      TEXT    NOT NULL DEFAULT '',
                local     TEXT    NOT NULL DEFAULT '',
                tipo      TEXT    NOT NULL DEFAULT 'CLT',
                descricao TEXT             DEFAULT '',
                status    TEXT    NOT NULL DEFAULT 'Aberta',
                criado_em TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            )
        """)

        # Tabela para armazenamento de candidatos cadastrados.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nome        TEXT    NOT NULL,
                sobrenome   TEXT    NOT NULL,
                email       TEXT    NOT NULL,
                cpf         TEXT    NOT NULL,
                data_nasc   TEXT    NOT NULL,
                empresa     TEXT    NOT NULL,
                cargo       TEXT    NOT NULL,
                vaga_id     INTEGER,
                vaga_titulo TEXT             DEFAULT '',
                status      TEXT    NOT NULL DEFAULT 'Novo',
                criado_em   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (vaga_id) REFERENCES vagas(id) ON DELETE SET NULL
            )
        """)

        conn.commit()
        print("✔ Banco de dados iniciado com sucesso.")
    finally:
        # Garante o fechamento da conexão com o banco de dados.
        conn.close()
