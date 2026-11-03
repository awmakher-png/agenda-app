const STORAGE_KEY = 'agenda_demandas_v2';

// Prazo padrão ao abrir o formulário: agora + 24 horas
const PRAZO_PADRAO_HORAS = 24;

// Considera "próximo" quando faltam menos de 2 horas para o prazo
const PRAZO_PROXIMO_MS = 2 * 60 * 60 * 1000;

// Pesos para ordenação de urgência (Alta > Média > Baixa)
const PESO_URGENCIA = { Alta: 3, Média: 2, Baixa: 1 };

let tarefas = [];
let editandoId = null;

// ---------- Elementos do DOM ----------
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

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
  carregar();
  render();
  iniciarVerificacaoNotificacoes();

  btnNova.addEventListener('click', abrirNovaTarefa);
  btnFechar.addEventListener('click', fecharModal);
  btnCancelar.addEventListener('click', fecharModal);
  btnExcluir.addEventListener('click', excluirTarefaModal);
  document.getElementById('form-tarefa').addEventListener('submit', salvarTarefa);

  // Fecha o modal clicando no overlay (fora do painel)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
  });

  // Fecha o modal pressionando ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('visible')) {
      fecharModal();
    }
  });
});

// ---------- Persistência (LocalStorage) ----------
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tarefas = raw ? JSON.parse(raw) : [];
    tarefas.forEach((t) => {
      t.notificadoVencida = t.notificadoVencida === true;
      t.notificadoProxima = t.notificadoProxima === true;
    });
  } catch (e) {
    console.error('Erro ao carregar tarefas do LocalStorage:', e);
    tarefas = [];
  }
}

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
}

// ---------- CRUD ----------
function abrirNovaTarefa() {
  editandoId = null;
  modalTitulo.textContent = 'Nova Demanda';
  btnExcluir.style.display = 'none';

  inputId.value = '';
  inputTitulo.value = '';
  inputDescricao.value = '';
  inputUrgencia.value = '';

  // Prazo padrão: data/hora atual + 24h (ajustado para fuso local)
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

  salvar();
  fecharModal();
  render();
}

function excluirTarefa(id) {
  if (!confirm('Excluir esta demanda?')) return;
  tarefas = tarefas.filter((t) => t.id !== id);
  salvar();
  render();
  mostrarToast('Demanda excluída.', 'erro');
}

function excluirTarefaModal() {
  excluirTarefa(inputId.value);
}

function toggleConcluida(id) {
  const t = tarefas.find((x) => x.id === id);
  if (t) {
    t.concluida = !t.concluida;
    salvar();
    render();
  }
}

// ---------- Ordenação ----------
// 1) Não concluídas primeiro
// 2) Urgência: Alta -> Média -> Baixa
// 3) Prazo: mais próximo primeiro
function ordenar(lista) {
  return [...lista].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;

    const pa = PESO_URGENCIA[a.urgencia] || 0;
    const pb = PESO_URGENCIA[b.urgencia] || 0;
    if (pb !== pa) return pb - pa;

    return new Date(a.prazo) - new Date(b.prazo);
  });
}

// ---------- Renderização ----------
function render() {
  const lista = ordenar(tarefas);
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
    const badgeClass = 'badge--' + t.urgencia.toLowerCase();
    const idAttr = String(t.id).replace(/'/g, '&#039;').replace(/"/g, '&quot;');

    tr.innerHTML = `
      <td class="col-status">
        <input
          type="checkbox"
          class="tarefa-checkbox"
          ${t.concluida ? 'checked' : ''}
          aria-label="Concluir ${escapeHtml(t.titulo)}"
        >
      </td>
      <td class="col-tarefa" style="cursor:pointer" onclick="abrirEdicao('${idAttr}')">
        <div class="tarefa-titulo ${t.concluida ? 'concluido' : ''}">
          ${escapeHtml(t.titulo)}
        </div>
        ${t.descricao ? `<div class="tarefa-descricao ${t.concluida ? 'concluido' : ''}">${escapeHtml(t.descricao)}</div>` : ''}
      </td>
      <td class="col-prazo">
        <span class="tarefa-prazo ${vencida ? 'vencido' : ''}">
          ${formatarPrazo(t.prazo)} ${vencida ? '⚠' : ''}
        </span>
      </td>
      <td class="col-urgencia">
        <span class="badge ${badgeClass}">${escapeHtml(t.urgencia)}</span>
      </td>
      <td class="col-acoes">
        <button class="btn-icon editar" title="Editar" onclick="event.stopPropagation(); abrirEdicao('${idAttr}')">✏</button>
      </td>
    `;

    tr.querySelector('.tarefa-checkbox').addEventListener('change', (e) => {
      e.stopPropagation();
      toggleConcluida(t.id);
    });

    tbody.appendChild(tr);
  });
}

// ---------- Utilitários ----------
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

// ---------- Lógica de notificação (WhatsApp) ----------
function verificarNotificacoes() {
  const agora = Date.now();
  let mudou = false;

  for (const t of tarefas) {
    if (t.concluida) continue;

    const prazoMs = new Date(t.prazo).getTime();
    if (isNaN(prazoMs)) continue;

    // Prazo já vencido
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
    }
    // Prazo vencendo em menos de 2 horas
    else if (
      prazoMs >= agora &&
      prazoMs - agora <= PRAZO_PROXIMO_MS &&
      !t.notificadoProxima
    ) {
      t.notificadoProxima = true;
      mudou = true;
      const minutos = Math.round((prazoMs - agora) / 60000);
      const msg =
        `📅 Prazo próximo: "${t.titulo}"\n` +
        `Vence em aproximadamente ${minutos} minuto(s) (${formatarPrazo(
          t.prazo
        )}).\n` +
        `Urgência: ${t.urgencia}\n` +
        (t.descricao ? `Descrição: ${t.descricao}` : '');
      enviarWhatsApp(msg);
      mostrarToast(`📅 Prazo próximo: ${t.titulo}`, 'alerta');
    }
  }

  if (mudou) {
    salvar();
    render();
  }
}

function iniciarVerificacaoNotificacoes() {
  verificarNotificacoes();
  // Verifica periodicamente a cada 1 minuto
  setInterval(verificarNotificacoes, 60 * 1000);
}

// ---------- WhatsApp (stub) ----------
/**
 * Função assíncrona de envio via WhatsApp.
 * Atualmente é um "stub": apenas exibe no console.
 * Substitua por integração real com a API do WhatsApp ou link wa.me quando necessário.
 */
async function enviarWhatsApp(mensagem) {
  console.log(
    '[enviarWhatsApp - STUB]',
    new Date().toLocaleString('pt-BR'),
    '-',
    mensagem
  );
  // Exemplo de futura integração:
  // await fetch('https://api.seuwhatsapp.com/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ mensagem }),
  // });
}
