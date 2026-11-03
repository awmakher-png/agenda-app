/* ============================================================
   AGENDA DE DEMANDAS + CLIENTES
   LocalStorage | Notion + ClickUp style | Vanilla JS
   ============================================================ */

// ---------- Chaves de armazenamento ----------
const STORAGE_DEMANDAS = 'agenda_demandas_v2';
const STORAGE_CLIENTES = 'agenda_clientes_v1';

// ---------- Constantes ----------
const PRAZO_PADRAO_HORAS = 24;
const PESO_URGENCIA = { Alta: 3, Média: 2, Baixa: 1 };

let tarefas = [];
let editandoId = null;

let clientes = [];
let editandoClienteId = null;

// ---------- Elementos: Abas ----------
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// ---------- Elementos de estatísticas ----------
const statPendentes = document.getElementById('stat-pendentes');
const statVencidas = document.getElementById('stat-vencidas');
const statAltas = document.getElementById('stat-altas');
const statConcluidas = document.getElementById('stat-concluidas');

function alternarAba(e) {
  const alvo = e.currentTarget.dataset.tab;

  // Atualiza botões
  tabBtns.forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === alvo);
    b.setAttribute('aria-selected', b.dataset.tab === alvo);
  });

  // Atualiza conteúdos
  tabContents.forEach((c) => {
    c.classList.toggle('active', c.id === `tab-${alvo}`);
  });
}

tabBtns.forEach((btn) => btn.addEventListener('click', alternarAba));

// ============================================================
// DEMANDAS
// ============================================================

const tbody = document.getElementById('tbody-tarefas');
const emptyState = document.getElementById('empty-state');
const btnNova = document.getElementById('btn-nova-tarefa');

const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const btnFechar = document.getElementById('btn-fechar-modal');
const btnCancelar = document.getElementById('btn-cancelar');
const btnExcluir = document.getElementById('btn-excluir');
const modalTitulo = document.getElementById('modal-titulo');
const toast = document.getElementById('toast');

const inputId = document.getElementById('tarefa-id');
const inputTitulo = document.getElementById('tarefa-titulo');
const inputDescricao = document.getElementById('tarefa-descricao');
const inputPrazo = document.getElementById('tarefa-prazo');
const inputUrgencia = document.getElementById('tarefa-urgencia');
const inputCurso = document.getElementById('tarefa-curso');

// ---------- Persistência ----------
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_DEMANDAS);
    tarefas = raw ? JSON.parse(raw) : [];
    tarefas.forEach((t) => {
      t.notificadoVencida = t.notificadoVencida === true;
      t.notificadoProxima = t.notificadoProxima === true;
      t.curso = t.curso || '';
    });
  } catch (e) {
    console.error('Erro ao carregar demandas:', e);
    tarefas = [];
  }

  try {
    const rawC = localStorage.getItem(STORAGE_CLIENTES);
    clientes = rawC ? JSON.parse(rawC) : [];
  } catch (e) {
    console.error('Erro ao carregar clientes:', e);
    clientes = [];
  }
}

function salvarDemandas() {
  localStorage.setItem(STORAGE_DEMANDAS, JSON.stringify(tarefas));
}

function salvarClientes() {
  localStorage.setItem(STORAGE_CLIENTES, JSON.stringify(clientes));
}

// ---------- Tema claro/escuro ----------
const themeToggle = document.getElementById('theme-toggle');

function initTheme() {
  const salvo = localStorage.getItem('agenda_tema');
  if (salvo === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
  }
}

function alternarTema() {
  if (themeToggle.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('agenda_tema', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('agenda_tema', 'light');
  }
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  carregar();
  renderDemandas();
  renderClientes();
  iniciarVerificacaoNotificacoes();

  // Tema
  themeToggle.addEventListener('change', alternarTema);

  // Filtros Demandas
  filtroBuscaDemanda.addEventListener('input', renderDemandas);
  filtroCurso.addEventListener('change', renderDemandas);
  filtroUrgencia.addEventListener('change', renderDemandas);
  filtroStatus.addEventListener('change', renderDemandas);
  filtroPrazo.addEventListener('change', renderDemandas);
  btnLimparFiltroDemanda.addEventListener('click', limparFiltroDemanda);

  // Filtros Clientes
  filtroBuscaCliente.addEventListener('input', renderClientes);
  filtroChecklistCliente.addEventListener('change', renderClientes);
  btnLimparFiltroCliente.addEventListener('click', limparFiltroCliente);

  // Demandas
  btnNova.addEventListener('click', abrirNovaTarefa);
  btnFechar.addEventListener('click', fecharModal);
  btnCancelar.addEventListener('click', fecharModal);
  btnExcluir.addEventListener('click', excluirTarefaModal);
  document.getElementById('form-tarefa').addEventListener('submit', salvarTarefa);

  // Clientes
  document.getElementById('btn-novo-cliente').addEventListener('click', abrirNovoCliente);
  document.getElementById('btn-fechar-modal-cliente').addEventListener('click', fecharModalCliente);
  document.getElementById('btn-cancelar-cliente').addEventListener('click', fecharModalCliente);
  document.getElementById('btn-excluir-cliente').addEventListener('click', excluirClienteModal);
  document.getElementById('form-cliente').addEventListener('submit', salvarCliente);

  // Fecha modais clicando fora
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });
  document.getElementById('modal-cliente-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-cliente-overlay')) fecharModalCliente();
  });

  // Fecha modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('visible')) fecharModal();
      if (document.getElementById('modal-cliente-overlay').classList.contains('visible')) {
        fecharModalCliente();
      }
    }
  });
});

// ============================================================
// CRUD DEMANDAS
// ============================================================

function abrirNovaTarefa() {
  editandoId = null;
  modalTitulo.textContent = 'Nova Demanda';
  btnExcluir.style.display = 'none';

  inputId.value = '';
  inputTitulo.value = '';
  inputDescricao.value = '';
  inputUrgencia.value = '';

  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  agora.setHours(agora.getHours() + PRAZO_PADRAO_HORAS);
  inputPrazo.value = agora.toISOString().slice(0, 16);

  abrirModal();
}

function abrirEdicao(id) {
  const t = tarefas.find((x) => x.id === id);
  if (!t) return;

  editandoId = id;
  modalTitulo.textContent = 'Editar Demanda';
  btnExcluir.style.display = 'inline-block';

  inputId.value = t.id;
  inputTitulo.value = t.titulo;
  inputCurso.value = t.curso || '';
  inputDescricao.value = t.descricao || '';
  inputPrazo.value = t.prazo.slice(0, 16);
  inputUrgencia.value = t.urgencia;

  abrirModal();
}

function abrirModal() {
  modalOverlay.classList.add('visible');
  modalOverlay.setAttribute('aria-hidden', 'false');
  inputTitulo.focus();
}

function fecharModal() {
  modalOverlay.classList.remove('visible');
  modalOverlay.setAttribute('aria-hidden', 'true');
  editandoId = null;
}

function salvarTarefa(e) {
  e.preventDefault();

  const titulo = inputTitulo.value.trim();
  const descricao = inputDescricao.value.trim();
  const prazo = inputPrazo.value;
  const urgencia = inputUrgencia.value;

  if (!titulo || !urgencia) return;

  const dados = {
    titulo,
    curso: inputCurso.value.trim(),
    descricao,
    prazo,
    urgencia,
    concluida: false,
    notificadoVencida: false,
    notificadoProxima: false,
  };

  if (editandoId) {
    const idx = tarefas.findIndex((t) => t.id === editandoId);
    if (idx !== -1) {
      dados.id = editandoId;
      dados.concluida = tarefas[idx].concluida;
      dados.notificadoVencida = tarefas[idx].notificadoVencida;
      dados.notificadoProxima = tarefas[idx].notificadoProxima;
      tarefas[idx] = dados;
    }
    mostrarToast('Demanda atualizada.', 'sucesso');
  } else {
    dados.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    dados.criadaEm = new Date().toISOString();
    tarefas.push(dados);
    mostrarToast('Demanda criada.', 'sucesso');
  }

  salvarDemandas();
  fecharModal();
  renderDemandas();
}

function excluirTarefa(id) {
  if (!confirm('Excluir esta demanda?')) return;
  tarefas = tarefas.filter((t) => t.id !== id);
  salvarDemandas();
  renderDemandas();
  mostrarToast('Demanda excluída.', 'erro');
}

function excluirTarefaModal() {
  excluirTarefa(inputId.value);
}

function toggleConcluida(id) {
  const t = tarefas.find((x) => x.id === id);
  if (t) {
    t.concluida = !t.concluida;
    salvarDemandas();
    renderDemandas();
  }
}

// ---------- Render Demandas ----------
function ordenarDemandas(lista) {
  return [...lista].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;

    const pa = PESO_URGENCIA[a.urgencia] || 0;
    const pb = PESO_URGENCIA[b.urgencia] || 0;
    if (pb !== pa) return pb - pa;

    return new Date(a.prazo) - new Date(b.prazo);
  });
}

function filtrarDemandas() {
  const busca = filtroBuscaDemanda.value.toLowerCase().trim();
  const curso = filtroCurso.value;
  const urgencia = filtroUrgencia.value;
  const status = filtroStatus.value;
  const prazoAte = filtroPrazo.value;

  return tarefas.filter((t) => {
    if (busca) {
      const texto = `${t.titulo} ${t.descricao || ''} ${t.curso || ''}`.toLowerCase();
      if (!texto.includes(busca)) return false;
    }

    if (curso && t.curso !== curso) return false;

    if (urgencia && t.urgencia !== urgencia) return false;

    if (status === 'pendente' && t.concluida) return false;
    if (status === 'concluida' && !t.concluida) return false;

    if (prazoAte) {
      const prazoData = new Date(t.prazo).toISOString().slice(0, 10);
      if (prazoData > prazoAte) return false;
    }

    return true;
  });
}

function popularFiltroCurso() {
  const cursos = [...new Set(tarefas.map((t) => t.curso).filter(Boolean))];
  filtroCurso.innerHTML = '<option value="">Todos os cursos</option>';
  cursos.forEach((curso) => {
    const opt = document.createElement('option');
    opt.value = curso;
    opt.textContent = curso;
    filtroCurso.appendChild(opt);
  });
}

function atualizarEstatisticas() {
  const pendentes = tarefas.filter((t) => !t.concluida).length;
  const concluidas = tarefas.filter((t) => t.concluida).length;
  const agora = Date.now();
  const vencidas = tarefas.filter(
    (t) => !t.concluida && new Date(t.prazo).getTime() < agora
  ).length;
  const altas = tarefas.filter((t) => !t.concluida && t.urgencia === 'Alta').length;

  if (statPendentes) statPendentes.textContent = pendentes;
  if (statVencidas) statVencidas.textContent = vencidas;
  if (statAltas) statAltas.textContent = altas;
  if (statConcluidas) statConcluidas.textContent = concluidas;
}

function renderDemandas() {
  const lista = ordenarDemandas(filtrarDemandas());
  tbody.innerHTML = '';

  if (lista.length === 0) {
    emptyState.style.display = 'block';
    tbody.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  tbody.style.display = '';

  lista.forEach((t) => {
    const tr = document.createElement('tr');
    if (t.concluida) tr.classList.add('concluida');

    const vencida = new Date(t.prazo).getTime() < Date.now();
    const idSafe = String(t.id).replace(/'/g, '&#039;').replace(/"/g, '&quot;');

    tr.innerHTML = `
      <td class="col-status">
        <input type="checkbox" class="tarefa-checkbox" ${t.concluida ? 'checked' : ''}
          aria-label="Concluir ${escapeHtml(t.titulo)}">
      </td>
      <td class="col-tarefa" style="cursor:pointer" onclick="abrirEdicao('${idSafe}')">
        <div class="tarefa-titulo ${t.concluida ? 'concluido' : ''}">
          ${escapeHtml(t.titulo)}
        </div>
        ${t.descricao ? `<div class="tarefa-descricao ${t.concluida ? 'concluido' : ''}">${escapeHtml(t.descricao)}</div>` : ''}
      </td>
      <td class="col-curso">
        <span class="curso-badge">${escapeHtml(t.curso || '—')}</span>
      </td>
      <td class="col-prazo">
        <span class="tarefa-prazo ${vencida ? 'vencido' : ''}">
          ${formatarPrazo(t.prazo)} ${vencida ? '⚠' : ''}
        </span>
      </td>
      <td class="col-urgencia">
        <span class="badge badge--${t.urgencia.toLowerCase()}">${escapeHtml(t.urgencia)}</span>
      </td>
      <td class="col-acoes">
        <button class="btn-icon editar" title="Editar"
          onclick="event.stopPropagation(); abrirEdicao('${idSafe}')">✏</button>
        <button class="btn-icon excluir" title="Excluir"
          onclick="event.stopPropagation(); excluirTarefa('${idSafe}')">🗑</button>
      </td>
    `;

    tr.querySelector('.tarefa-checkbox').addEventListener('change', (e) => {
      e.stopPropagation();
      toggleConcluida(t.id);
    });

    tbody.appendChild(tr);
  });

  popularFiltroCurso();
  atualizarEstatisticas();
}

function limparFiltroDemanda() {
  filtroBuscaDemanda.value = '';
  filtroCurso.value = '';
  filtroUrgencia.value = '';
  filtroStatus.value = '';
  filtroPrazo.value = '';
  renderDemandas();
}

// ============================================================
// CRUD CLIENTES
// ============================================================

const tbodyClientes = document.getElementById('tbody-clientes');
const emptyClientes = document.getElementById('empty-clientes');

// ---------- Elementos de filtro ----------
const filtroBuscaDemanda = document.getElementById('filtro-busca-demanda');
const filtroCurso = document.getElementById('filtro-curso');
const filtroUrgencia = document.getElementById('filtro-urgencia');
const filtroStatus = document.getElementById('filtro-status');
const filtroPrazo = document.getElementById('filtro-prazo');
const btnLimparFiltroDemanda = document.getElementById('btn-limpar-filtro-demanda');

const filtroBuscaCliente = document.getElementById('filtro-busca-cliente');
const filtroChecklistCliente = document.getElementById('filtro-checklist-cliente');
const btnLimparFiltroCliente = document.getElementById('btn-limpar-filtro-cliente');

const modalClienteOverlay = document.getElementById('modal-cliente-overlay');
const modalCliente = document.getElementById('modal-cliente');
const modalClienteTitulo = document.getElementById('modal-cliente-titulo');
const btnExcluirCliente = document.getElementById('btn-excluir-cliente');

const inputClienteId = document.getElementById('cliente-id');
const inputClienteNome = document.getElementById('cliente-nome');
const inputClienteContato = document.getElementById('cliente-contato');
const inputClienteSaldo = document.getElementById('cliente-saldo');
const inputClienteConta = document.getElementById('cliente-conta');

function abrirNovoCliente() {
  editandoClienteId = null;
  modalClienteTitulo.textContent = 'Novo Cliente';
  btnExcluirCliente.style.display = 'none';

  inputClienteId.value = '';
  inputClienteNome.value = '';
  inputClienteContato.value = '';
  inputClienteSaldo.value = '';
  inputClienteConta.value = '';

  abrirModalCliente();
}

function abrirEdicaoCliente(id) {
  const c = clientes.find((x) => x.id === id);
  if (!c) return;

  editandoClienteId = id;
  modalClienteTitulo.textContent = 'Editar Cliente';
  btnExcluirCliente.style.display = 'inline-block';

  inputClienteId.value = c.id;
  inputClienteNome.value = c.nome;
  inputClienteContato.value = c.contato || '';
  inputClienteSaldo.value = c.saldo ?? '';
  inputClienteConta.value = c.conta || '';

  abrirModalCliente();
}

function abrirModalCliente() {
  modalClienteOverlay.classList.add('visible');
  modalClienteOverlay.setAttribute('aria-hidden', 'false');
  inputClienteNome.focus();
}

function fecharModalCliente() {
  modalClienteOverlay.classList.remove('visible');
  modalClienteOverlay.setAttribute('aria-hidden', 'true');
  editandoClienteId = null;
}

function salvarCliente(e) {
  e.preventDefault();

  const nome = inputClienteNome.value.trim();
  const contato = inputClienteContato.value.trim();
  const saldo = inputClienteSaldo.value === '' ? null : parseFloat(inputClienteSaldo.value);
  const conta = inputClienteConta.value.trim();

  if (!nome) return;

  const dados = {
    nome,
    contato,
    saldo,
    conta,
    ultimaComunicacao: null,
    saldoRevisadoEm: null,
    contaRevisadaEm: null,
    criadaEm: new Date().toISOString(),
  };

  if (editandoClienteId) {
    const idx = clientes.findIndex((c) => c.id === editandoClienteId);
    if (idx !== -1) {
      dados.id = editandoClienteId;
      // Mantém histórico de marcações diárias ao editar
      dados.ultimaComunicacao = clientes[idx].ultimaComunicacao;
      dados.saldoRevisadoEm = clientes[idx].saldoRevisadoEm;
      dados.contaRevisadaEm = clientes[idx].contaRevisadaEm;
      clientes[idx] = dados;
    }
    mostrarToast('Cliente atualizado.', 'sucesso');
  } else {
    dados.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    clientes.push(dados);
    mostrarToast('Cliente cadastrado.', 'sucesso');
  }

  salvarClientes();
  fecharModalCliente();
  renderClientes();
}

function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  clientes = clientes.filter((c) => c.id !== id);
  salvarClientes();
  renderClientes();
  mostrarToast('Cliente excluído.', 'erro');
}

function excluirClienteModal() {
  excluirCliente(inputClienteId.value);
}

// ---------- Checklist diário ----------
function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function marcarItemDiario(clienteId, campo) {
  const c = clientes.find((x) => x.id === clienteId);
  if (!c) return;

  const hoje = hojeISO();

  // Toggle: se já marcou hoje, desmarca; senão marca
  if (c[campo] === hoje) {
    c[campo] = null;
  } else {
    c[campo] = hoje;
  }

  salvarClientes();
  renderClientes();
}

// ============================================================
// RENDER CLIENTES
// ============================================================

function formatarMoeda(valor) {
  if (valor == null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR');
}

function estaFeitoHoje(dataISO) {
  return dataISO === hojeISO();
}

function filtrarClientes() {
  const busca = filtroBuscaCliente.value.toLowerCase().trim();
  const checklistFiltro = filtroChecklistCliente.value;

  return clientes.filter((c) => {
    if (busca) {
      const texto = `${c.nome} ${c.contato || ''} ${c.conta || ''}`.toLowerCase();
      if (!texto.includes(busca)) return false;
    }

    const hoje = hojeISO();
    const feitoComunicacao = c.ultimaComunicacao === hoje;
    const feitoSaldo = c.saldoRevisadoEm === hoje;
    const feitoConta = c.contaRevisadaEm === hoje;

    if (checklistFiltro === 'comunicacao' && feitoComunicacao) return false;
    if (checklistFiltro === 'saldo' && feitoSaldo) return false;
    if (checklistFiltro === 'conta' && feitoConta) return false;
    if (checklistFiltro === 'todos-feitos' && !(feitoComunicacao && feitoSaldo && feitoConta)) return false;

    return true;
  });
}

function renderClientes() {
  const lista = filtrarClientes();
  tbodyClientes.innerHTML = '';

  if (lista.length === 0) {
    emptyClientes.style.display = 'block';
    tbodyClientes.style.display = 'none';
    return;
  }

  emptyClientes.style.display = 'none';
  tbodyClientes.style.display = '';

  lista.forEach((c) => {
    const tr = document.createElement('tr');
    const idSafe = String(c.id).replace(/'/g, '&#039;').replace(/"/g, '&quot;');

    const feitoComunicacao = estaFeitoHoje(c.ultimaComunicacao);
    const feitoSaldo = estaFeitoHoje(c.saldoRevisadoEm);
    const feitoConta = estaFeitoHoje(c.contaRevisadaEm);

    tr.innerHTML = `
      <td class="col-cliente">
        <div class="cliente-nome" style="cursor:pointer" onclick="abrirEdicaoCliente('${idSafe}')">
          ${escapeHtml(c.nome)}
        </div>
      </td>
      <td class="col-contato">
        ${escapeHtml(c.contato || '—')}
      </td>
      <td class="col-saldo">
        ${formatarMoeda(c.saldo)}
      </td>
      <td class="col-conta">
        ${escapeHtml(c.conta || '—')}
      </td>
      <td class="col-ultima">
        ${formatarDataCurta(c.ultimaComunicacao)}
      </td>
      <td class="col-checklist">
        <div class="checklist">
          <label class="check-item ${feitoComunicacao ? 'feito' : ''}" title="Comunicação">
            <input type="checkbox" ${feitoComunicacao ? 'checked' : ''}
              onchange="marcarItemDiario('${idSafe}', 'ultimaComunicacao')">
            <span class="check-label">💬 Comunicação</span>
          </label>
          <label class="check-item ${feitoSaldo ? 'feito' : ''}" title="Saldo">
            <input type="checkbox" ${feitoSaldo ? 'checked' : ''}
              onchange="marcarItemDiario('${idSafe}', 'saldoRevisadoEm')">
            <span class="check-label">💰 Saldo</span>
          </label>
          <label class="check-item ${feitoConta ? 'feito' : ''}" title="Conta">
            <input type="checkbox" ${feitoConta ? 'checked' : ''}
              onchange="marcarItemDiario('${idSafe}', 'contaRevisadaEm')">
            <span class="check-label">🏦 Conta</span>
          </label>
        </div>
      </td>
      <td class="col-acoes">
        <button class="btn-icon editar" title="Editar"
          onclick="event.stopPropagation(); abrirEdicaoCliente('${idSafe}')">✏</button>
      </td>
    `;

    tbodyClientes.appendChild(tr);
  });
}

function limparFiltroCliente() {
  filtroBuscaCliente.value = '';
  filtroChecklistCliente.value = '';
  renderClientes();
}

// ============================================================
// NOTIFICAÇÕES WHATSAPP (stub)
// ============================================================

function iniciarVerificacaoNotificacoes() {
  verificarNotificacoes();
  setInterval(verificarNotificacoes, 60 * 1000);
}

function verificarNotificacoes() {
  const agora = Date.now();
  let mudou = false;

  for (const t of tarefas) {
    if (t.concluida) continue;

    const prazoMs = new Date(t.prazo).getTime();
    if (isNaN(prazoMs)) continue;

    if (prazoMs < agora && !t.notificadoVencida) {
      t.notificadoVencida = true;
      mudou = true;
      const msg =
        `⚠️ Tarefa VENCIDA: "${t.titulo}"\n` +
        `Prazo: ${formatarPrazo(t.prazo)}\n` +
        `Urgência: ${t.urgencia}\n` +
        (t.descricao ? `Descrição: ${t.descricao}` : '');
      enviarWhatsApp(msg);
      mostrarToast(`⚠️ Vencida: ${t.titulo}`, 'erro');
    } else if (
      prazoMs >= agora &&
      prazoMs - agora <= 2 * 60 * 60 * 1000 &&
      !t.notificadoProxima
    ) {
      t.notificadoProxima = true;
      mudou = true;
      const minutos = Math.round((prazoMs - agora) / 60000);
      const msg =
        `📅 Prazo próximo: "${t.titulo}"\n` +
        `Vence em aproximadamente ${minutos} minuto(s) (${formatarPrazo(t.prazo)}).\n` +
        `Urgência: ${t.urgencia}\n` +
        (t.descricao ? `Descrição: ${t.descricao}` : '');
      enviarWhatsApp(msg);
      mostrarToast(`📅 Prazo próximo: ${t.titulo}`, 'alerta');
    }
  }

  if (mudou) {
    salvarDemandas();
    renderDemandas();
  }
}

async function enviarWhatsApp(mensagem) {
  console.log(
    '[enviarWhatsApp - STUB]',
    new Date().toLocaleString('pt-BR'),
    '-',
    mensagem
  );
}

// ============================================================
// UTILITÁRIOS
// ============================================================

function formatarPrazo(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function mostrarToast(texto, tipo = 'sucesso') {
  toast.textContent = texto;
  toast.className = `toast toast--${tipo} visible`;
  setTimeout(() => toast.classList.remove('visible'), 3500);
}

// Expor funções globais usadas nos onclick do HTML
window.abrirEdicao = abrirEdicao;
window.abrirEdicaoCliente = abrirEdicaoCliente;
window.marcarItemDiario = marcarItemDiario;
