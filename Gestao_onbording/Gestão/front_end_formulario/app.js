// Ativa a execução em modo estrito para prevenir erros e comportamentos legados.
'use strict';

// URL base da API do backend.
const API_BASE = 'http://localhost:8000';

// Inicializa os listeners e componentes após o carregamento completo do DOM.
document.addEventListener('DOMContentLoaded', function () {
    // Carrega as vagas cadastradas para popular o seletor.
    carregarVagas();
    // Configura a adição e remoção de tags de habilidades.
    configurarTags();
    // Aplica a máscara de formatação automática para CPF.
    configurarMascaraCPF();
    // Configura a exibição do nome do arquivo de currículo selecionado.
    configurarUpload();
    // Configura a validação e o envio dos dados do formulário.
    configurarEnvio();
});

// Busca as vagas abertas na API e popula o seletor correspondente.
async function carregarVagas() {
    const select  = document.getElementById('select_vaga');
    const aviso   = document.getElementById('aviso_vaga');
    const btnEnv  = document.getElementById('btn_inscricao');

    try {
        // Requisição para listagem de vagas.
        const resp = await fetch(API_BASE + '/vagas');

        // Valida se a resposta HTTP indica sucesso.
        if (!resp.ok) throw new Error('Servidor indisponível');

        const vagas = await resp.json();

        // Filtra apenas registros com status 'Aberta'.
        const vagasAbertas = vagas.filter(v => v.status === 'Aberta');

        select.innerHTML = '';

        if (vagasAbertas.length === 0) {
            // Desabilita a seleção e o envio se não houver vagas disponíveis.
            select.innerHTML = '<option value="">Nenhuma vaga disponível no momento</option>';
            select.disabled  = true;
            btnEnv.disabled  = true;
            aviso.textContent = 'Não há vagas abertas no momento. Entre em contato com o RH para mais informações.';
            aviso.className   = 'aviso_vaga sem_vagas';
        } else {
            select.innerHTML = '<option value="">Selecione a vaga de interesse...</option>';

            // Popula o seletor com as opções de vagas abertas.
            vagasAbertas.forEach(function (v) {
                const opt = document.createElement('option');
                opt.value       = v.id;
                opt.textContent = v.titulo + (v.area ? ' — ' + v.area : '') + (v.local ? ' (' + v.local + ')' : '');
                select.appendChild(opt);
            });

            aviso.className = 'aviso_vaga oculto';
        }
    } catch (err) {
        // Tratamento de falhas de comunicação com a API.
        select.innerHTML = '<option value="">Erro ao carregar vagas</option>';
        select.disabled  = true;
        btnEnv.disabled  = true;
        aviso.textContent = '⚠ Não foi possível carregar as vagas. Verifique se o servidor está ativo.';
        aviso.className   = 'aviso_vaga erro_vagas';
        console.error('Erro ao carregar vagas:', err);
    }
}

// Gerencia a criação e exclusão dinâmica de tags de habilidades.
function configurarTags() {
    const input     = document.getElementById('inputHabilidade');
    const container = document.getElementById('containerTags');

    if (!input || !container) return;

    input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;

        // Evita a submissão do formulário pela tecla Enter.
        e.preventDefault();

        const texto = input.value.trim();
        if (!texto) return;

        // Cria o elemento da tag com botão para remoção e escape contra XSS.
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `<span>${escHtml(texto)}</span><button type="button" class="botao_remover" title="Remover">×</button>`;

        tag.querySelector('.botao_remover').addEventListener('click', () => tag.remove());

        container.insertBefore(tag, input);
        input.value = '';
    });
}

// Aplica formatação de CPF (000.000.000-00) durante a digitação.
function configurarMascaraCPF() {
    const input = document.getElementById('input_cpf');
    if (!input) return;

    input.addEventListener('input', function () {
        // Remove caracteres não numéricos e limita a 11 dígitos.
        let v = input.value.replace(/\D/g, '').slice(0, 11);

        // Aplica pontuações conforme o comprimento atual do valor.
        if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');

        input.value = v;
    });
}

// Atualiza o texto do elemento visual com o nome do arquivo PDF selecionado.
function configurarUpload() {
    const fileInput = document.getElementById('upload_curriculo');
    const labelNome = document.getElementById('nome_arquivo');
    if (!fileInput || !labelNome) return;

    fileInput.addEventListener('change', function () {
        labelNome.textContent = fileInput.files[0]
            ? fileInput.files[0].name
            : 'Clique para selecionar um arquivo PDF';
    });
}

// Valida os campos obrigatórios e submete a inscrição para a API.
function configurarEnvio() {
    const btn = document.getElementById('btn_inscricao');
    if (!btn) return;

    btn.addEventListener('click', async function () {
        // Coleta e sanitização básica dos valores informados.
        const vagaId    = document.getElementById('select_vaga')?.value;
        const nome      = document.getElementById('input_nome')?.value.trim();
        const sobrenome = document.getElementById('input_sobrenome')?.value.trim();
        const email     = document.getElementById('input_email')?.value.trim();
        const data_nasc = document.getElementById('input_data')?.value;
        const cpf       = document.getElementById('input_cpf')?.value.trim();
        const empresa   = document.getElementById('input_empresa')?.value.trim();
        const cargo     = document.getElementById('input_cargo')?.value.trim();

        // Validação de preenchimento dos campos obrigatórios.
        const erros = [];
        if (!vagaId)    erros.push('selecione uma vaga de interesse');
        if (!nome)      erros.push('preencha o nome');
        if (!sobrenome) erros.push('preencha o sobrenome');
        if (!email)     erros.push('preencha o e-mail');
        if (!data_nasc) erros.push('preencha a data de nascimento');
        if (!cpf)       erros.push('preencha o CPF');
        if (!empresa)   erros.push('preencha a última empresa');
        if (!cargo)     erros.push('preencha o último cargo');

        if (erros.length > 0) {
            mostrarFeedback('Por favor: ' + erros.join(', ') + '.', 'erro');
            return;
        }

        // Montagem do payload conforme esperado pelo endpoint /usuarios.
        const payload = {
            nome, sobrenome, email, data_nasc, cpf, empresa, cargo,
            vaga_id: parseInt(vagaId)
        };

        // Bloqueia ações adicionais durante a requisição.
        btn.disabled     = true;
        btn.innerHTML    = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

        try {
            const resp = await fetch(API_BASE + '/usuarios', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            // Tratamento de respostas de erro da API.
            if (!resp.ok) {
                const errData = await resp.json();

                let mensagemErro = 'Erro ao enviar os dados.';
                if (errData.detail) {
                    if (Array.isArray(errData.detail)) {
                        // Formata mensagens de validação retornadas pelo Pydantic/FastAPI.
                        mensagemErro = errData.detail.map(function (e) {
                            const campo = e.loc ? e.loc[e.loc.length - 1] : 'campo';
                            return campo + ': ' + e.msg;
                        }).join(' | ');
                    } else {
                        mensagemErro = String(errData.detail);
                    }
                }
                throw new Error(mensagemErro);
            }

            mostrarFeedback('✓ Inscrição enviada com sucesso! Entraremos em contato em breve.', 'sucesso');
            limparFormulario();
        } catch (err) {
            mostrarFeedback('Erro ao enviar: ' + err.message, 'erro');
        } finally {
            // Restaura o estado original do botão de envio.
            btn.disabled   = false;
            btn.innerHTML  = '<i class="fa-solid fa-paper-plane"></i> Enviar Inscrição';
        }
    });
}

// Exibe mensagem de feedback visual e remove após tempo determinado.
function mostrarFeedback(msg, tipo) {
    const el = document.getElementById('mensagem_feedback');
    if (!el) return;

    el.textContent = msg;
    el.className   = 'mensagem_feedback ' + tipo;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Oculta a notificação após 7 segundos.
    setTimeout(() => { el.className = 'mensagem_feedback oculto'; }, 7000);
}

// Redefine todos os campos do formulário para o estado inicial.
function limparFormulario() {
    ['input_nome','input_sobrenome','input_email','input_data','input_cpf',
     'input_empresa','input_cargo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const sel = document.getElementById('select_vaga');
    if (sel) sel.selectedIndex = 0;

    const tags = document.getElementById('containerTags');
    if (tags) tags.querySelectorAll('.tag').forEach(t => t.remove());

    const nomeArq = document.getElementById('nome_arquivo');
    if (nomeArq) nomeArq.textContent = 'Clique para selecionar um arquivo PDF';
}

// Escapa caracteres especiais em strings para evitar injeção de HTML (XSS).
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}