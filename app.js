const STORAGE_KEY = 'agenda_demandas_v1';
// Considera "próximo" as tarefas cujo prazo esteja dentro das próximas 24 horas.
const PRAZO_PROXIMO_MS = 24 * 60 * 60 * 1000;
const URGENCIA_PESO = { Alta: 3, Média: 2, Baixa: 1 };

let tarefas = [];
let editandoId = null;

// ---------- Elementos do DOM ----------
const form = document.getElementById('form-demanda');
const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
const btnSalvar = document.getElementById('btn-salvar');
const listaPendentes = document.getElementById('lista-pendentes');
const vazioPendentes = document.getElementById('vazio-pendentes');
const listaConcluidas = document.getElementById('lista-concluidas');
const vazioConcluidas = document.getElementById('vazio-concluidas');
const toggleConcluidas = document.getElementById('toggle-concluidas');
const setaConcluidas = document.getElementById('seta-concluidas');

const statPendentes = document.getElementById('stat-pendentes');
const statVencidas = document.getElementById('stat-vencidas');
const statAltas = document.getElementById('stat-altas');
const statConcluidas = document.getElementById('stat-concluidas');

const modalEdicao = document.getElementById('modal-edicao');
const formEdicao = document.getElementById('form-edicao');
const editId = document.getElementById('edit-id');
const editTitulo = document.getElementById('edit-titulo');
const editDescricao = document.getElementById('edit-descricao');
const editPrazo = document.getElementById('edit-prazo');
const editUrgencia = document.getElementById('edit-urgencia');
const btnFecharModalEdicao = document.getElementById('btn-fechar-modal-edicao');
const btnExcluirTarefa = document.getElementById('btn-excluir-tarefa');

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', () => {
  carregar();
  render();
  verificarNotificacoes();
  // Verifica periodicamente a cada 1 minuto
  setInterval(verificarNotificacoes, 60 * 1000);

  form.addEventListener('submit', adicionarDemanda);
  btnCancelarEdicao.addEventListener('click', cancelarEdicao);

  formEdicao.addEventListener('submit', salvarEdicao);
  btnFecharModalEdicao.addEventListener('click', fecharModalEdicao);
  btnExcluirTarefa.addEventListener('click', excluirDemandaModal);
  modalEdicao.addEventListener('click', (e) => {
    const backdrop = document.getElementById('btn-fechar-modal');
    if (e.target === modalEdicao || e.target === backdrop) fecharModalEdicao();
  });

  toggleConcluidas.addEventListener('click', () => {
    const visivel = listaConcluidas.style.display !== 'none';
    listaConcluidas.style.display = visivel ? 'none' : 'block';
    vazioConcluidas.style.display = visivel ? 'none' : 'block';
    setaConcluidas.textContent = visivel ? '▾' : '▴';
  });
});

// ---------- Persistência (LocalStorage) ----------
function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tarefas = raw ? JSON.parse(raw) : [];
    tarefas.forEach((t) => {
      t.notificadoProxima = t.notificadoProxima === true;
      t.notificadoVencida = t.notificadoVencida === true;
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
function adicionarDemanda(e) {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const descricao = document.getElementById('descricao').value.trim();
  const prazo = document.getElementById('prazo').value;
  const urgencia = document.getElementById('urgencia').value;

  if (!titulo || !prazo) return;

  const eraEdicao = !!editandoId;

  const nova = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    titulo,
    descricao,
    prazo,
    urgencia,
    concluida: false,
    criadaEm: new Date().toISOString(),
    notificadoProxima: false,
    notificadoVencida: false,
  };

  if (eraEdicao) {
    const idx = tarefas.findIndex((t) => t.id === editandoId);
    if (idx !== -1) {
      nova.id = editandoId;
      nova.concluida = tarefas[idx].concluida;
      tarefas[idx] = nova;
    }
    editandoId = null;
    btnCancelarEdicao.style.display = 'none';
    btnSalvar.textContent = 'Adicionar Demanda';
  } else {
    tarefas.push(nova);
  }

  salvar();
  form.reset();
  render();
  mostrarToast(
    eraEdicao ? 'Demanda atualizada com sucesso!' : 'Demanda adicionada com sucesso!',
    'sucesso'
  );
}

function cancelarEdicao() {
  editandoId = null;
  form.reset();
  btnCancelarEdicao.style.display = 'none';
  btnSalvar.textContent = 'Adicionar Demanda';
}

function editarDemanda(id) {
  const t = tarefas.find((x) => x.id === id);
  if (!t) return;

  editandoId = id;
  editId.value = t.id;
  editTitulo.value = t.titulo;
  editDescricao.value = t.descricao;
  editPrazo.value = t.prazo;
  editUrgencia.value = t.urgencia;

  modalEdicao.hidden = false;
  modalEdicao.setAttribute('aria-hidden', 'false');
}

function fecharModalEdicao() {
  modalEdicao.hidden = true;
  modalEdicao.setAttribute('aria-hidden', 'true');
}

function salvarEdicao(e) {
  e.preventDefault();

  const id = editId.value;
  const idx = tarefas.findIndex((t) => t.id === id);
  if (idx === -1) {
    fecharModalEdicao();
    return;
  }

  tarefas[idx] = {
    ...tarefas[idx],
    titulo: editTitulo.value.trim(),
    descricao: editDescricao.value.trim(),
    prazo: editPrazo.value,
    urgencia: editUrgencia.value,
  };

  salvar();
  fecharModalEdicao();
  render();
  mostrarToast('Demanda atualizada com sucesso!', 'sucesso');
}

function excluirDemanda(id) {
  if (!confirm('Tem certeza que deseja excluir esta demanda?')) return;
  tarefas = tarefas.filter((t) => t.id !== id);
  salvar();
  render();
  mostrarToast('Demanda excluída.', 'erro');
}

function excluirDemandaModal() {
  excluirDemanda(editId.value);
}

function toggleConcluida(id) {
  const t = tarefas.find((x) => x.id === id);
  if (t) {
    t.concluida = !t.concluida;
    salvar();
    render();
  }
}

// ---------- Renderização ----------
function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const pa = URGENCIA_PESO[a.urgencia] || 0;
    const pb = URGENCIA_PESO[b.urgencia] || 0;
    if (pb !== pa) return pb - pa; // Alta primeiro
    return new Date(a.prazo) - new Date(b.prazo); // prazo mais próximo primeiro
  });
}

function formatarPrazo(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return 'Data inválida';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estaVencida(iso) {
  return new Date(iso).getTime() < Date.now();
}

function render() {
  const pendentes = ordenar(tarefas.filter((t) => !t.concluida));
  const concluidas = ordenar(tarefas.filter((t) => t.concluida));

  const agora = Date.now();
  const vencidas = tarefas.filter((t) => !t.concluida && estaVencida(t.prazo)).length;
  const altas = tarefas.filter((t) => !t.concluida && t.urgencia === 'Alta').length;

  statPendentes.textContent = pendentes.length;
  statVencidas.textContent = vencidas;
  statAltas.textContent = altas;
  statConcluidas.textContent = concluidas.length;

  // Pendentes
  listaPendentes.innerHTML = '';
  if (pendentes.length === 0) {
    vazioPendentes.style.display = 'block';
    listaPendentes.style.display = 'none';
  } else {
    vazioPendentes.style.display = 'none';
    listaPendentes.style.display = 'flex';
    pendentes.forEach((t) => {
      const vencida = estaVencida(t.prazo);
      const card = document.createElement('div');
      card.className = `task-card ${
        vencida ? 'task-card--vencido' : ''
      } ${t.urgencia === 'Alta' ? 'task-card--urgente' : ''}`;
      card.innerHTML = `
        <input type="checkbox" class="task-checkbox" aria-label="Marcar como concluída">
        <div class="task-info">
          <span class="task-titulo">${escapeHtml(t.titulo)}</span>
          ${t.descricao ? `<p class="task-descricao">${escapeHtml(t.descricao)}</p>` : ''}
          <div class="task-meta">
            <span class="badge badge--${t.urgencia.toLowerCase()}">${escapeHtml(
        t.urgencia
      )}</span>
            <span class="prazo ${vencida ? 'badge--vencido' : ''}" title="${formatarPrazo(
        t.prazo
      )}">
              ${vencida ? '⚠ Vencido em ' : ''}${formatarPrazo(t.prazo)}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon btn-editar" title="Editar" aria-label="Editar ${escapeHtml(
            t.titulo
          )}">✏</button>
          <button class="btn-icon btn-excluir-icon" title="Excluir" aria-label="Excluir ${escapeHtml(
            t.titulo
          )}">🗑</button>
        </div>
      `;

      const checkbox = card.querySelector('.task-checkbox');
      checkbox.checked = t.concluida;
      checkbox.addEventListener('change', () => toggleConcluida(t.id));
      card.querySelector('.btn-editar').addEventListener('click', () => editarDemanda(t.id));
      card.querySelector('.btn-excluir-icon').addEventListener('click', () => excluirDemanda(t.id));

      listaPendentes.appendChild(card);
    });
  }

  // Concluídas
  listaConcluidas.innerHTML = '';
  if (concluidas.length === 0) {
    vazioConcluidas.style.display = 'block';
    listaConcluidas.style.display = 'none';
  } else {
    vazioConcluidas.style.display = 'none';
    listaConcluidas.style.display = 'flex';
    concluidas.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'task-card task-card--concluida';
      card.innerHTML = `
        <input type="checkbox" class="task-checkbox" checked disabled aria-label="Concluída">
        <div class="task-info">
          <span class="task-titulo concluido">${escapeHtml(t.titulo)}</span>
          ${t.descricao ? `<p class="task-descricao concluido">${escapeHtml(t.descricao)}</p>` : ''}
          <div class="task-meta">
            <span class="badge badge--${t.urgencia.toLowerCase()}">${escapeHtml(
        t.urgencia
      )}</span>
            <span class="prazo">Concluída</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon btn-editar" title="Editar" aria-label="Editar ${escapeHtml(
            t.titulo
          )}">✏</button>
          <button class="btn-icon btn-excluir-icon" title="Excluir" aria-label="Excluir ${escapeHtml(
            t.titulo
          )}">🗑</button>
        </div>
      `;
      card.querySelector('.btn-editar').addEventListener('click', () => editarDemanda(t.id));
      card.querySelector('.btn-excluir-icon').addEventListener('click', () => excluirDemanda(t.id));
      listaConcluidas.appendChild(card);
    });
  }
}

// ---------- Lógica de Notificação ----------
function verificarNotificacoes() {
  const agora = Date.now();
  let mudou = false;

  for (const t of tarefas) {
    if (t.concluida) continue;

    const prazoMs = new Date(t.prazo).getTime();
    if (isNaN(prazoMs)) continue;

    let mensagem = '';

    if (prazoMs < agora && !t.notificadoVencida) {
      // Prazo já vencido
      t.notificadoVencida = true;
      mudou = true;
      mensagem = `⚠️ Tarefa VENCIDA: "${t.titulo}"\nPrazo: ${formatarPrazo(
        t.prazo
      )}\nUrgência: ${t.urgencia}\n${t.descricao ? 'Descrição: ' + t.descricao : ''}`;
      enviarWhatsApp(mensagem);
      mostrarToast(
        `⚠️ Vencida: ${t.titulo}`,
        'erro'
      );
    } else if (
      prazoMs >= agora &&
      prazoMs - agora <= PRAZO_PROXIMO_MS &&
      !t.notificadoProxima
    ) {
      // Prazo se aproximando
      t.notificadoProxima = true;
      mudou = true;
      const minutos = Math.round((prazoMs - agora) / 60000);
      mensagem = `📅 Prazo se aproximando: "${t.titulo}"\nVence em aproximadamente ${minutos} minuto(s) (${formatarPrazo(
        t.prazo
      )}).\nUrgência: ${t.urgencia}\n${t.descricao ? 'Descrição: ' + t.descricao : ''}`;
      enviarWhatsApp(mensagem);
      mostrarToast(
        `📅 Prazo próximo: ${t.titulo}`,
        'alerta'
      );
    }
  }

  if (mudou) salvar();
}

// ---------- WhatsApp (stub) ----------
/**
 * Função assíncrona de envio via WhatsApp.
 * Atualmente é um "stub": apenas exibe no console.
 * Substitua por integração real com API do WhatsApp ou link wa.me quando necessário.
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

// ---------- Utilitários ----------
function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function mostrarToast(texto, tipo = 'sucesso') {
  const toast = document.getElementById('toast');
  toast.textContent = texto;
  toast.className = 'toast';
  toast.classList.add(`toast--${tipo}`, 'toast--visivel');
  setTimeout(() => {
    toast.classList.remove('toast--visivel');
  }, 4000);
}
