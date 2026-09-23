'use strict';

// ════════════════════════════════════════
//  CONFIGURAÇÃO
// ════════════════════════════════════════
// URL base da API do backend.
const API = 'http://localhost:8000';

// ── Estado global ──
// Identificador da tela atualmente exibida.
let telaAtual  = '';
// Cache em memória dos candidatos obtidos da API.
let candidatos = [];
// Cache em memória das vagas obtidas da API.
let vagas      = [];
// Instâncias ativas dos gráficos do Chart.js para permitir destruição antes de nova renderização.
let grafEvolucao    = null;
let grafDiversidade = null;

// ════════════════════════════════════════
//  INICIALIZAÇÃO
// ════════════════════════════════════════
// Executa as rotinas de inicialização após o carregamento completo do DOM.
document.addEventListener('DOMContentLoaded', function () {
    carregarPerfilSalvo();
    configurarNavegacao();
    // Define o Dashboard como tela inicial padrão.
    navegarPara('dashboard');
});

// ════════════════════════════════════════
//  PERFIL DO RECRUTADOR (localStorage)
// ════════════════════════════════════════
// Recupera as informações de perfil salvas no localStorage ou aplica valores padrão.
function carregarPerfilSalvo() {
    const nome  = localStorage.getItem('rw_nome')  || 'Recrutador(a)';
    const cargo = localStorage.getItem('rw_cargo') || 'Admin';
    atualizarPerfilSidebar(nome, cargo);
}

// Atualiza os elementos visuais do perfil do usuário na barra lateral.
function atualizarPerfilSidebar(nome, cargo) {
    const elNome  = document.getElementById('rec_nome');
    const elCargo = document.getElementById('rec_cargo');
    const elAv    = document.getElementById('avatar_rec');
    if (elNome)  elNome.textContent  = nome;
    if (elCargo) elCargo.textContent = cargo;
    // Define a inicial do nome como texto do avatar.
    if (elAv)    elAv.textContent    = nome.charAt(0).toUpperCase();
}

// ════════════════════════════════════════
//  NAVEGAÇÃO SPA
// ════════════════════════════════════════
// Associa eventos de clique aos links de navegação para alternar telas via SPA.
function configurarNavegacao() {
    document.querySelectorAll('.nav_item[data-tela]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault(); // Previne o recarregamento padrão da página.
            navegarPara(a.dataset.tela);
        });
    });
}

// Gerencia a transição de telas, clonando o template solicitado para o contêiner principal.
function navegarPara(tela) {
    // Evita recarregamento se a tela de destino já estiver ativa.
    if (telaAtual === tela) return;
    telaAtual = tela;

    // Atualiza a classe de item ativo nos links da barra lateral.
    document.querySelectorAll('.nav_item[data-tela]').forEach(function (a) {
        a.classList.toggle('active', a.dataset.tela === tela);
    });

    // Destrói instâncias existentes de gráficos antes de renderizar um novo conteúdo.
    if (grafEvolucao)    { grafEvolucao.destroy();    grafEvolucao    = null; }
    if (grafDiversidade) { grafDiversidade.destroy();  grafDiversidade = null; }

    // Recupera o template da tela correspondente e o contêiner principal.
    const tmpl = document.getElementById('tela_' + tela);
    const main = document.getElementById('conteudo_principal');
    
    // Exibe mensagem informativa caso o template solicitado não exista.
    if (!tmpl) { main.innerHTML = '<div style="padding:40px;color:#9ca3af;">Tela não encontrada.</div>'; return; }

    // Limpa o conteúdo atual e insere a nova tela.
    main.innerHTML = '';
    main.appendChild(tmpl.content.cloneNode(true));

    // Executa a função de inicialização da tela correspondente.
    ({ dashboard: iniciarDashboard, candidatos: iniciarCandidatos, vagas: iniciarVagas,
       relatorios: iniciarRelatorios, configuracoes: iniciarConfiguracoes }[tela] || (() => {}))();
}

// ════════════════════════════════════════
//  REQUISIÇÕES À API
// ════════════════════════════════════════
// Funções auxiliares para requisições HTTP via Fetch API.

// Executa requisição GET e retorna a resposta decodificada em JSON.
async function get(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error('Erro ' + r.status);
    return r.json();
}

// Executa requisição POST com corpo serializado em JSON.
async function post(path, body) {
    const r = await fetch(API + path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Erro'); }
    return r.json();
}

// Executa requisição PATCH para atualização parcial de dados.
async function patch(path, body) {
    const r = await fetch(API + path, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Erro'); }
    return r.json();
}

// Executa requisição DELETE para exclusão de recurso.
async function del(path) {
    const r = await fetch(API + path, { method:'DELETE' });
    if (!r.ok) { const e = await r.json().catch(()=>({detail:'Erro'})); throw new Error(e.detail || 'Erro'); }
}

// ════════════════════════════════════════
//  TELA: DASHBOARD
// ════════════════════════════════════════
// Inicializa os dados e componentes do Dashboard.
async function iniciarDashboard() {
    try {
        // Carrega candidatos e vagas concorrentemente para otimizar tempo de resposta.
        [candidatos, vagas] = await Promise.all([ get('/usuarios'), get('/vagas') ]);
    } catch {
        candidatos = []; vagas = [];
    }

    // ── KPIs ──
    // Contabiliza totais filtrados por status.
    const vagasAbertas   = vagas.filter(v => v.status === 'Aberta').length;
    const novos          = candidatos.filter(c => c.status === 'Novo').length;
    const entrevistas    = candidatos.filter(c => c.status === 'Entrevista').length;
    const contratados    = candidatos.filter(c => c.status === 'Contratado').length;

    // Atualiza os valores e descrições dos cards de KPI no DOM.
    setEl('kpi_vagas',        vagasAbertas);
    setEl('kpi_vagas_desc',   vagasAbertas === 1 ? '1 vaga disponível' : vagasAbertas + ' vagas disponíveis');
    setEl('kpi_novos',        novos);
    setEl('kpi_novos_desc',   novos === 1 ? 'Novo candidato' : novos + ' aguardando avaliação');
    setEl('kpi_entrevistas',  entrevistas);
    setEl('kpi_contratados',  contratados);

    // ── Gráfico de evolução ──
    // Renderiza o gráfico cronológico ou exibe o estado vazio se não houver registros.
    const ctx   = document.getElementById('grafico_evolucao');
    const empty = document.getElementById('grafico_empty');

    if (candidatos.length === 0) {
        if (ctx)   ctx.style.display = 'none';
        if (empty) empty.classList.remove('oculto');
    } else {
        // Gera dados consolidados dos últimos 30 dias para o gráfico.
        const { labels, dados } = gerarDadosEvolucao(candidatos, 30);
        if (empty) empty.classList.add('oculto');
        grafEvolucao = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Inscrições',
                    data: dados,
                    borderColor: '#1a569e',
                    backgroundColor: 'rgba(26,86,158,0.10)',
                    borderWidth: 2.5, fill: true, tension: 0.4, // Curvatura suave das linhas.
                    pointRadius: 0, pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#1a569e'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color:'#9ca3af', font:{size:11} }, grid: { color:'#f0f4f8' } },
                    y: { min:0, ticks: { color:'#9ca3af', font:{size:11}, stepSize:1 }, grid: { color:'#f0f4f8' } }
                }
            }
        });
    }

    // ── Feed de atividade recente ──
    // Obtém as 5 inscrições mais recentes sem modificar o array original.
    const feedEl = document.getElementById('feed_lista');
    if (!feedEl) return;

    const recentes = [...candidatos].slice(0, 5);
    if (recentes.length === 0) {
        feedEl.innerHTML = `<div class="feed_empty">
            <i class="fa-regular fa-clock"></i>
            <p>Nenhuma atividade recente.</p>
            <p style="margin-top:4px;">As inscrições aparecerão aqui.</p>
        </div>`;
    } else {
        // Mapeia os candidatos recentes gerando o HTML do feed com avatar e tempo decorrido.
        feedEl.innerHTML = recentes.map(function (c) {
            const cor    = corAvatar(c.id);
            const inic   = (c.nome.charAt(0) + c.sobrenome.charAt(0)).toUpperCase();
            const tempo  = tempoRelativo(c.criado_em);
            const vaga   = c.vaga_titulo ? ' para <strong>' + escHtml(c.vaga_titulo) + '</strong>' : '';
            return `<div class="feed_item">
                <div class="avatar_feed" style="background:${cor};">${inic}</div>
                <div class="feed_texto">
                    <span><strong>${escHtml(c.nome)} ${escHtml(c.sobrenome)}</strong> se inscreveu${vaga}</span>
                    <span class="feed_tempo">${tempo}</span>
                </div>
            </div>`;
        }).join(''); // Concatena os elementos sem separador de vírgula.
    }
}

// ════════════════════════════════════════
//  TELA: CANDIDATOS
// ════════════════════════════════════════
// Inicializa os dados e filtros da tela de candidatos.
async function iniciarCandidatos() {
    try {
        [candidatos, vagas] = await Promise.all([ get('/usuarios'), get('/vagas') ]);
    } catch {
        candidatos = []; vagas = [];
    }

    // Popula o elemento <select> de filtro com as vagas disponíveis.
    const filtroVaga = document.getElementById('filtro_vaga');
    if (filtroVaga) {
        vagas.forEach(function (v) {
            const o = document.createElement('option');
            o.value = v.id; o.textContent = v.titulo;
            filtroVaga.appendChild(o);
        });
    }

    // Renderiza a tabela e configura os manipuladores de eventos dos filtros.
    renderCandidatos(candidatos);
    configurarFiltrosCandidatos();
}

// Renderiza as linhas da tabela de candidatos a partir da lista fornecida.
function renderCandidatos(lista) {
    const subtitulo = document.getElementById('subtitulo_candidatos');
    if (subtitulo) subtitulo.textContent = lista.length + ' candidato(s) encontrado(s)';

    const tbody = document.getElementById('tbody_candidatos');
    if (!tbody) return;

    // Exibe mensagem de estado vazio caso a lista não contenha registros.
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10">
            <div class="tabela_empty">
                <i class="fa-solid fa-users-slash"></i>
                <h4>Nenhum candidato encontrado</h4>
                <p>Quando candidatos preencherem o formulário, aparecerão aqui.</p>
            </div>
        </td></tr>`;
        return;
    }

    // Renderiza cada linha com caracteres especiais escapados contra XSS.
    tbody.innerHTML = lista.map(function (c) {
        const nome  = escHtml(c.nome + ' ' + c.sobrenome);
        const data  = fmtData(c.data_nasc);
        const badge = classeStatus(c.status); // Retorna a classe CSS correspondente ao status.
        const vaga  = c.vaga_titulo ? escHtml(c.vaga_titulo) : '<span style="color:#9ca3af">—</span>';
        return `<tr>
            <td><input type="checkbox"></td>
            <td>${nome}</td>
            <td>${escHtml(c.email)}</td>
            <td>${escHtml(c.cpf)}</td>
            <td>${data}</td>
            <td>${escHtml(c.empresa)}</td>
            <td>${escHtml(c.cargo)}</td>
            <td>${vaga}</td>
            <td><span class="badge ${badge}">${escHtml(c.status)}</span></td>
            <td>
                <div class="acoes">
                    <button class="btn_acao" title="Ver detalhes"
                        onclick="verCandidato(${c.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn_acao" title="Alterar status"
                        onclick="abrirModalStatus(${c.id}, '${escHtml(c.nome + ' ' + c.sobrenome)}', '${escHtml(c.status)}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn_acao danger" title="Remover"
                        onclick="confirmarDeleteCandidato(${c.id}, '${escHtml(c.nome)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Listener do checkbox do cabeçalho para seleção em lote.
    const checkTodos = document.getElementById('check_todos');
    if (checkTodos) {
        // Sincroniza o estado de seleção de todas as caixas de seleção da tabela.
        checkTodos.addEventListener('change', function () {
            tbody.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = checkTodos.checked);
        });
    }
}

// Configura os ouvintes de eventos para filtragem em tempo real da lista de candidatos.
function configurarFiltrosCandidatos() {
    const busca       = document.getElementById('busca_candidato');
    const filtroStatus = document.getElementById('filtro_status');
    const filtroVaga   = document.getElementById('filtro_vaga');

    function aplicarFiltros() {
        const termo  = busca?.value.toLowerCase() || '';
        const status = filtroStatus?.value || '';
        const vagaId = filtroVaga?.value || '';

        // Filtra os dados diretamente em memória.
        const filtrados = candidatos.filter(function (c) {
            // Busca textual combinando nome, e-mail, cargo e empresa.
            const matchTermo  = (c.nome+' '+c.sobrenome+c.email+c.cargo+c.empresa).toLowerCase().includes(termo);
            const matchStatus = !status || c.status === status;
            const matchVaga   = !vagaId || String(c.vaga_id) === vagaId;
            return matchTermo && matchStatus && matchVaga;
        });
        renderCandidatos(filtrados);
    }

    busca?.addEventListener('input', aplicarFiltros);
    filtroStatus?.addEventListener('change', aplicarFiltros);
    filtroVaga?.addEventListener('change', aplicarFiltros);
}

// Exibe o modal com informações detalhadas do candidato.
function verCandidato(id) {
    const c = candidatos.find(x => x.id === id);
    if (!c) return;
    abrirModal('Detalhes do Candidato', `
        <div style="display:grid;gap:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Nome</label>
                    <p style="font-weight:600;">${escHtml(c.nome + ' ' + c.sobrenome)}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Status</label>
                    <p><span class="badge ${classeStatus(c.status)}">${escHtml(c.status)}</span></p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">E-mail</label>
                    <p>${escHtml(c.email)}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">CPF</label>
                    <p>${escHtml(c.cpf)}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Data Nascimento</label>
                    <p>${fmtData(c.data_nasc)}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Vaga de Interesse</label>
                    <p>${c.vaga_titulo ? escHtml(c.vaga_titulo) : '—'}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Última Empresa</label>
                    <p>${escHtml(c.empresa)}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Último Cargo</label>
                    <p>${escHtml(c.cargo)}</p></div>
            </div>
            <div style="border-top:1px solid #f0f4f8;padding-top:10px;">
                <label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Inscrito em</label>
                <p style="font-size:13px;">${c.criado_em || '—'}</p>
            </div>
        </div>
    `);
}

// Exibe o modal de formulário para alteração de status do candidato.
function abrirModalStatus(id, nome, statusAtual) {
    const opcoes = ['Novo','Em Análise','Entrevista','Contratado','Reprovado'];
    const html = `
        <div class="modal_form">
            <p style="font-size:14px;color:#4b5563;margin-bottom:8px;">
                Alterar status de <strong>${nome}</strong>:
            </p>
            <div class="form_grp">
                <label>Novo Status</label>
                <select id="sel_status_modal">
                    ${opcoes.map(s => `<option ${s===statusAtual?'selected':''} value="${s}">${s}</option>`).join('')}
                </select>
            </div>
            <div id="msg_modal"></div>
            <div class="modal_btns">
                <button class="btn_cancelar" onclick="fecharModal()">Cancelar</button>
                <button class="btn_primario" onclick="salvarStatus(${id})">
                    <i class="fa-solid fa-check"></i> Salvar
                </button>
            </div>
        </div>`;
    abrirModal('Alterar Status do Candidato', html);
}

// Envia requisição PATCH com o novo status e atualiza a exibição da tela.
async function salvarStatus(id) {
    const sel = document.getElementById('sel_status_modal');
    if (!sel) return;
    try {
        await patch('/usuarios/' + id + '/status', { status: sel.value });
        fecharModal();
        telaAtual = ''; // Redefine telaAtual para forçar a re-execução da inicialização.
        navegarPara('candidatos');
    } catch (e) {
        mostrarMsgModal(e.message, 'erro');
    }
}

// Solicita confirmação e executa a exclusão do candidato.
async function confirmarDeleteCandidato(id, nome) {
    // Diálogo de confirmação para prevenir exclusões acidentais.
    if (!confirm('Remover candidato "' + nome + '"? Esta ação não pode ser desfeita.')) return;
    try {
        await del('/usuarios/' + id);
        telaAtual = ''; navegarPara('candidatos');
    } catch (e) { alert('Erro: ' + e.message); }
}

// ════════════════════════════════════════
//  TELA: VAGAS
// ════════════════════════════════════════
// Inicializa os dados da tela de vagas e contabiliza inscrições vinculadas.
async function iniciarVagas() {
    try { vagas = await get('/vagas'); } catch { vagas = []; }

    // Mapeia a quantidade de candidatos inscritos por vaga.
    let contagem = {};
    try {
        const cands = await get('/usuarios');
        cands.forEach(function (c) {
            // Incrementa a contagem de candidatos associados à vaga.
            if (c.vaga_id) contagem[c.vaga_id] = (contagem[c.vaga_id] || 0) + 1;
        });
    } catch {}

    renderVagas(vagas, contagem);
    configurarFiltrosVagas(contagem);

    // Associa evento de clique ao botão de abertura do modal de criação de vaga.
    document.getElementById('btn_nova_vaga')?.addEventListener('click', abrirModalNovaVaga);
}

// Renderiza as linhas da tabela de vagas com dados de identificação e total de inscritos.
function renderVagas(lista, contagem) {
    const subtitulo = document.getElementById('subtitulo_vagas');
    if (subtitulo) subtitulo.textContent = lista.length + ' vaga(s) cadastrada(s)';

    const tbody = document.getElementById('tbody_vagas');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">
            <div class="tabela_empty">
                <i class="fa-solid fa-briefcase"></i>
                <h4>Nenhuma vaga cadastrada</h4>
                <p>Crie sua primeira vaga clicando em "Nova Vaga".</p>
                <button class="btn_primario" onclick="abrirModalNovaVaga()">
                    <i class="fa-solid fa-plus"></i> Nova Vaga
                </button>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(function (v) {
        const badge = classeVaga(v.status);
        const nCands = (contagem && contagem[v.id]) || 0;
        const dtCriada = v.criado_em ? v.criado_em.split(' ')[0] : '—'; // Extrai a data da string de data/hora.
        return `<tr>
            <td style="font-weight:600;">${escHtml(v.titulo)}</td>
            <td>${escHtml(v.area || '—')}</td>
            <td>${escHtml(v.local || '—')}</td>
            <td>${escHtml(v.tipo || '—')}</td>
            <td>
                <button class="btn_acao" title="Ver candidatos desta vaga"
                    onclick="filtrarCandidatosPorVaga(${v.id})">
                    ${nCands} <i class="fa-solid fa-users" style="font-size:11px;margin-left:4px;"></i>
                </button>
            </td>
            <td><span class="badge ${badge}">${escHtml(v.status)}</span></td>
            <td style="color:#9ca3af;">${dtCriada}</td>
            <td>
                <div class="acoes">
                    <button class="btn_acao" title="Ver detalhes"
                        onclick="verVaga(${v.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn_acao" title="Alterar status"
                        onclick="abrirModalStatusVaga(${v.id}, '${escHtml(v.titulo)}', '${escHtml(v.status)}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn_acao danger" title="Excluir vaga"
                        onclick="confirmarDeleteVaga(${v.id}, '${escHtml(v.titulo)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Configura os filtros de busca textual e status da tela de vagas.
function configurarFiltrosVagas(contagem) {
    const busca  = document.getElementById('busca_vaga');
    const filtro = document.getElementById('filtro_status_vaga');

    function aplicar() {
        const termo  = busca?.value.toLowerCase() || '';
        const status = filtro?.value || '';
        const filtradas = vagas.filter(function (v) {
            return (v.titulo + v.area + v.local + v.tipo).toLowerCase().includes(termo)
                && (!status || v.status === status);
        });
        renderVagas(filtradas, contagem);
    }

    busca?.addEventListener('input', aplicar);
    filtro?.addEventListener('change', aplicar);
}

// Redireciona para a tela de candidatos com o filtro da vaga especificada pré-aplicado.
function filtrarCandidatosPorVaga(vagaId) {
    telaAtual = '';
    navegarPara('candidatos');
    // Aguarda a renderização do template no DOM antes de definir o valor do filtro.
    setTimeout(function () {
        const filtroVaga = document.getElementById('filtro_vaga');
        if (filtroVaga) {
            filtroVaga.value = vagaId;
            // Dispara evento 'change' para acionar os filtros configurados.
            filtroVaga.dispatchEvent(new Event('change'));
        }
    }, 150);
}

// Exibe o modal com o formulário de cadastro de nova vaga.
function abrirModalNovaVaga() {
    const html = `
        <div class="modal_form">
            <div class="form_row">
                <div class="form_grp" style="grid-column:1/-1;">
                    <label>Título da Vaga *</label>
                    <input type="text" id="nv_titulo" placeholder="Ex: Desenvolvedor Backend Senior">
                </div>
            </div>
            <div class="form_row">
                <div class="form_grp">
                    <label>Área / Departamento</label>
                    <input type="text" id="nv_area" placeholder="Ex: Tecnologia">
                </div>
                <div class="form_grp">
                    <label>Local</label>
                    <input type="text" id="nv_local" placeholder="Ex: Remoto / São Paulo, SP">
                </div>
            </div>
            <div class="form_row">
                <div class="form_grp">
                    <label>Tipo de Contrato</label>
                    <select id="nv_tipo">
                        <option value="CLT">CLT</option>
                        <option value="PJ">PJ</option>
                        <option value="Estágio">Estágio</option>
                        <option value="Freelancer">Freelancer</option>
                    </select>
                </div>
                <div class="form_grp">
                    <label>Status</label>
                    <select id="nv_status">
                        <option value="Aberta">Aberta</option>
                        <option value="Pausada">Pausada</option>
                        <option value="Fechada">Fechada</option>
                    </select>
                </div>
            </div>
            <div class="form_grp">
                <label>Descrição</label>
                <textarea id="nv_descricao" placeholder="Descreva os requisitos, responsabilidades e benefícios da vaga..."></textarea>
            </div>
            <div id="msg_modal"></div>
            <div class="modal_btns">
                <button class="btn_cancelar" onclick="fecharModal()">Cancelar</button>
                <button class="btn_primario" id="btn_salvar_vaga" onclick="salvarNovaVaga()">
                    <i class="fa-solid fa-plus"></i> Criar Vaga
                </button>
            </div>
        </div>`;
    abrirModal('Nova Vaga', html);
}

// Valida os dados do formulário e submete requisição POST para criação da vaga.
async function salvarNovaVaga() {
    const titulo    = document.getElementById('nv_titulo')?.value.trim();
    const area      = document.getElementById('nv_area')?.value.trim();
    const local     = document.getElementById('nv_local')?.value.trim();
    const tipo      = document.getElementById('nv_tipo')?.value;
    const status    = document.getElementById('nv_status')?.value;
    const descricao = document.getElementById('nv_descricao')?.value.trim();

    if (!titulo) { mostrarMsgModal('O título da vaga é obrigatório.', 'erro'); return; }

    // Desativa o botão de envio durante a requisição para evitar submissões duplicadas.
    const btn = document.getElementById('btn_salvar_vaga');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...'; }

    try {
        await post('/vagas', { titulo, area, local, tipo, status, descricao });
        fecharModal();
        telaAtual = ''; navegarPara('vagas');
    } catch (e) {
        mostrarMsgModal(e.message, 'erro');
        // Restaura o estado inicial do botão em caso de erro.
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-plus"></i> Criar Vaga'; }
    }
}

// Exibe o modal com as informações detalhadas da vaga.
function verVaga(id) {
    const v = vagas.find(x => x.id === id);
    if (!v) return;
    abrirModal('Detalhes da Vaga', `
        <div style="display:grid;gap:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div style="grid-column:1/-1;">
                    <label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Título</label>
                    <p style="font-weight:700;font-size:16px;">${escHtml(v.titulo)}</p>
                </div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Área</label>
                    <p>${v.area || '—'}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Local</label>
                    <p>${v.local || '—'}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Tipo</label>
                    <p>${v.tipo || '—'}</p></div>
                <div><label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Status</label>
                    <p><span class="badge ${classeVaga(v.status)}">${escHtml(v.status)}</span></p></div>
            </div>
            ${v.descricao ? `<div style="border-top:1px solid #f0f4f8;padding-top:10px;">
                <label style="font-size:11px;color:#9ca3af;text-transform:uppercase;">Descrição</label>
                <p style="font-size:13px;color:#4b5563;margin-top:4px;white-space:pre-wrap;">${escHtml(v.descricao)}</p>
            </div>` : ''}
        </div>
    `);
}

// Exibe o modal para atualização do status da vaga.
function abrirModalStatusVaga(id, titulo, statusAtual) {
    const opcoes = ['Aberta','Pausada','Fechada'];
    abrirModal('Alterar Status da Vaga', `
        <div class="modal_form">
            <p style="font-size:14px;color:#4b5563;margin-bottom:8px;">
                Alterar status de <strong>${escHtml(titulo)}</strong>:
            </p>
            <div class="form_grp">
                <label>Novo Status</label>
                <select id="sel_sv_status">
                    ${opcoes.map(s=>`<option ${s===statusAtual?'selected':''} value="${s}">${s}</option>`).join('')}
                </select>
            </div>
            <div id="msg_modal"></div>
            <div class="modal_btns">
                <button class="btn_cancelar" onclick="fecharModal()">Cancelar</button>
                <button class="btn_primario" onclick="salvarStatusVaga(${id})">
                    <i class="fa-solid fa-check"></i> Salvar
                </button>
            </div>
        </div>`);
}

// Envia requisição PATCH com o novo status da vaga.
async function salvarStatusVaga(id) {
    const sel = document.getElementById('sel_sv_status');
    if (!sel) return;
    try {
        await patch('/vagas/' + id + '/status', { status: sel.value });
        fecharModal();
        telaAtual = ''; navegarPara('vagas');
    } catch (e) { mostrarMsgModal(e.message, 'erro'); }
}

// Solicita confirmação e executa a exclusão da vaga.
async function confirmarDeleteVaga(id, titulo) {
    if (!confirm('Excluir a vaga "' + titulo + '"?\n\nIsso não pode ser desfeito. Vagas com candidatos vinculados não podem ser excluídas.')) return;
    try {
        await del('/vagas/' + id);
        telaAtual = ''; navegarPara('vagas');
    } catch (e) { alert('Erro: ' + e.message); }
}

// ════════════════════════════════════════
//  TELA: RELATÓRIOS
// ════════════════════════════════════════
// Inicializa os dados, tabela consolidada e gráficos da tela de relatórios.
async function iniciarRelatorios() {
    let cands = [];
    try { cands = await get('/usuarios'); } catch {}

    // Consolida e renderiza o total de candidatos por status na tabela de resumo.
    const statusList  = ['Novo','Em Análise','Entrevista','Contratado','Reprovado'];
    const tbody       = document.getElementById('tbody_status_rel');
    if (tbody) {
        if (cands.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="td_empty">Sem dados</td></tr>';
        } else {
            // Contabiliza os candidatos em cada categoria de status.
            tbody.innerHTML = statusList.map(function (s) {
                const n = cands.filter(c => c.status === s).length;
                return `<tr><td>${s}</td><td style="font-weight:600;">${n}</td></tr>`;
            }).join('');
        }
    }

    // Configura e renderiza o gráfico de distribuição de candidatos por status.
    const ctx   = document.getElementById('grafico_diversidade');
    const empty = document.getElementById('rel_empty');
    if (cands.length === 0) {
        if (ctx)   ctx.style.display = 'none';
        if (empty) empty.classList.remove('oculto');
    } else {
        if (empty) empty.classList.add('oculto');
        const counts = statusList.map(s => cands.filter(c => c.status === s).length);
        const cores  = ['#22c55e','#f59e0b','#3b82f6','#8b5cf6','#ef4444'];
        
        // Cria nova instância do gráfico de barras no canvas do relatório.
        grafDiversidade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: statusList,
                datasets: [{ label: 'Candidatos', data: counts, backgroundColor: cores, borderRadius: 5 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color:'#9ca3af', font:{size:12} } },
                    y: { min: 0, ticks: { color:'#9ca3af', font:{size:11}, stepSize:1 }, grid: { color:'#f0f4f8' } }
                }
            }
        });
    }

    // Ouvinte de evento para o botão de geração de relatório.
    document.getElementById('btn_gerar_rel')?.addEventListener('click', function () {
        const tipo = document.getElementById('tipo_relatorio')?.value;
        alert('Gerando: ' + tipo + '\n\n(Exportação de PDF em desenvolvimento)');
    });
}

// ════════════════════════════════════════
//  TELA: CONFIGURAÇÕES
// ════════════════════════════════════════
// Inicializa os campos da tela de configurações com os dados salvos.
function iniciarConfiguracoes() {
    // Carrega os valores previamente armazenados no localStorage.
    document.getElementById('cfg_nome')?.setAttribute('value', localStorage.getItem('rw_nome')  || '');
    document.getElementById('cfg_cargo')?.setAttribute('value', localStorage.getItem('rw_cargo') || '');
    document.getElementById('cfg_email')?.setAttribute('value', localStorage.getItem('rw_email') || '');

    // Configura o evento de salvamento das configurações do perfil.
    document.getElementById('btn_salvar_cfg')?.addEventListener('click', function () {
        const nome  = document.getElementById('cfg_nome')?.value.trim()  || 'Recrutador(a)';
        const cargo = document.getElementById('cfg_cargo')?.value.trim() || 'Admin';
        const email = document.getElementById('cfg_email')?.value.trim() || '';
        
        localStorage.setItem('rw_nome',  nome);
        localStorage.setItem('rw_cargo', cargo);
        localStorage.setItem('rw_email', email);
        
        atualizarPerfilSidebar(nome, cargo);
        
        const btn = document.getElementById('btn_salvar_cfg');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        // Restaura o texto original do botão após intervalo de feedback.
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações'; }, 2500);
    });
}

// ════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════
// Exibe o modal com o título e conteúdo especificados.
function abrirModal(titulo, corpo) {
    setEl('modal_titulo', titulo);
    const body = document.getElementById('modal_body');
    if (body) body.innerHTML = corpo;
    // Torna a camada de sobreposição do modal visível.
    document.getElementById('modal_overlay')?.classList.remove('oculto');
}

// Oculta o modal caso a ação se origine do fechamento explícito ou clique no overlay.
function fecharModal(evt) {
    if (evt && evt.target !== document.getElementById('modal_overlay')) return;
    document.getElementById('modal_overlay')?.classList.add('oculto');
}

// Exibe mensagem de feedback visual dentro do modal.
function mostrarMsgModal(msg, tipo) {
    const el = document.getElementById('msg_modal');
    if (el) { el.className = 'msg_inline ' + tipo; el.textContent = msg; }
}

// ════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════
// Solicita confirmação do usuário antes de efetuar saída da aplicação.
function confirmarSaida() {
    if (confirm('Deseja sair do painel administrativo?')) {
        // Notificação provisória enquanto o fluxo de logout completo está em implementação.
        alert('Funcionalidade de autenticação em desenvolvimento.');
    }
}

// Atualiza o textContent de um elemento pelo seu ID se existir no DOM.
function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Converte caracteres especiais em entidades HTML para mitigar vulnerabilidades de XSS.
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Converte data no formato YYYY-MM-DD para string legível (DD Mês AAAA).
function fmtData(d) {
    if (!d) return '—';
    try {
        const [a,m,dd] = d.split('-');
        const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return dd + ' ' + meses[parseInt(m,10)-1] + ' ' + a;
    } catch { return d; }
}

// Retorna a classe CSS correspondente ao status do candidato.
function classeStatus(s) {
    return ({
        'Novo':'novo','Em Análise':'em_analise','Entrevista':'entrevista',
        'Contratado':'contratado','Reprovado':'reprovado'
    })[s] || 'novo';
}

// Retorna a classe CSS correspondente ao status da vaga.
function classeVaga(s) {
    return ({ 'Aberta':'aberta', 'Pausada':'pausada', 'Fechada':'fechada' })[s] || 'aberta';
}

// Retorna uma cor consistente da paleta com base no identificador numérico.
function corAvatar(id) {
    const cores = ['#1a569e','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
    return cores[id % cores.length];
}

// Calcula e formata o tempo decorrido relativo a partir de uma data fornecida.
function tempoRelativo(dt) {
    if (!dt) return '—';
    try {
        const agora   = new Date();
        const criado  = new Date(dt.replace(' ','T')); // Normaliza o formato de data/hora para padrão ISO.
        const diff    = Math.floor((agora - criado) / 60000); // Diferença em minutos.
        if (diff < 1)   return 'agora mesmo';
        if (diff < 60)  return diff + ' min atrás';
        if (diff < 1440) return Math.floor(diff/60) + 'h atrás';
        return Math.floor(diff/1440) + ' dia(s) atrás';
    } catch { return dt; }
}

// Gera série contínua de datas e totais diários para o gráfico de evolução temporal.
function gerarDadosEvolucao(cands, dias) {
    const hoje  = new Date();
    const labels = [];
    const dados  = [];

    for (let i = dias - 1; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - i);
        const iso = d.toISOString().split('T')[0]; // Data em formato YYYY-MM-DD.
        labels.push(d.getDate());
        // Contabiliza registros correspondentes à data especificada.
        dados.push(cands.filter(c => (c.criado_em || '').startsWith(iso)).length);
    }
    return { labels, dados };
}
