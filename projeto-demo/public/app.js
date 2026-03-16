// app.js - Lógica do frontend: consome a API REST e gerencia a interface

const API = '/api/tasks';

// ── Referências ao DOM ─────────────────────────────────────────────────────
const form        = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const titleInput  = document.getElementById('title');
const descInput   = document.getElementById('description');
const statusInput = document.getElementById('status');
const submitBtn   = document.getElementById('submit-btn');
const cancelBtn   = document.getElementById('cancel-btn');
const formTitle   = document.getElementById('form-title');

const filterSelect = document.getElementById('filter');
const taskList     = document.getElementById('task-list');
const taskCount    = document.getElementById('task-count');
const emptyState   = document.getElementById('empty-state');

const toast         = document.getElementById('toast');
const confirmModal  = document.getElementById('confirm-modal');
const confirmDelete = document.getElementById('confirm-delete');
const cancelDelete  = document.getElementById('cancel-delete');

// ID da tarefa aguardando confirmação de exclusão
let pendingDeleteId = null;

// ── Utilitários ────────────────────────────────────────────────────────────

// Exibe o toast de feedback por 3 segundos
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
}

// Formata data ISO para pt-BR
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Mapeia valor de status para rótulo legível
const STATUS_LABEL = {
  pending:     '⏳ Pendente',
  in_progress: '🔄 Em andamento',
  done:        '✅ Concluída',
};

// ── Renderização ───────────────────────────────────────────────────────────

// Cria o elemento <li> de uma tarefa
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.status}`;
  li.dataset.id = task.id;

  li.innerHTML = `
    <div class="task-body">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description
        ? `<div class="task-desc">${escapeHtml(task.description)}</div>`
        : ''}
      <div class="task-meta">
        <span class="status-pill ${task.status}">${STATUS_LABEL[task.status]}</span>
        <span class="task-date">${formatDate(task.createdAt)}</span>
      </div>
    </div>
    <div class="task-actions">
      <button class="btn btn-secondary btn-sm" onclick="startEdit(${task.id})">Editar</button>
      <button class="btn btn-danger btn-sm"    onclick="askDelete(${task.id})">Excluir</button>
    </div>
  `;
  return li;
}

// Escapa caracteres HTML para evitar XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Atualiza a lista de tarefas na tela
function renderTasks(tasks) {
  taskList.innerHTML = '';
  taskCount.textContent = tasks.length;

  if (tasks.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  tasks.forEach(t => taskList.appendChild(createTaskElement(t)));
}

// ── Chamadas à API ─────────────────────────────────────────────────────────

// Busca e exibe tarefas (com filtro opcional)
async function loadTasks() {
  const status = filterSelect.value;
  const url    = status ? `${API}?status=${status}` : API;

  try {
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    renderTasks(json.data);
  } catch (err) {
    showToast('Erro ao carregar tarefas', 'error');
  }
}

// Cria uma nova tarefa
async function createTask(data) {
  const res  = await fetch(API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// Atualiza uma tarefa existente
async function updateTask(id, data) {
  const res  = await fetch(`${API}/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// Remove uma tarefa
async function deleteTask(id) {
  const res  = await fetch(`${API}/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
}

// ── Eventos do formulário ──────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    title:       titleInput.value,
    description: descInput.value,
    status:      statusInput.value,
  };

  try {
    if (taskIdInput.value) {
      // Modo edição
      await updateTask(taskIdInput.value, data);
      showToast('Tarefa atualizada com sucesso!');
    } else {
      // Modo criação
      await createTask(data);
      showToast('Tarefa criada com sucesso!');
    }
    resetForm();
    loadTasks();
  } catch (err) {
    showToast(err.message || 'Erro ao salvar tarefa', 'error');
  }
});

// Cancela edição e volta ao modo criação
cancelBtn.addEventListener('click', resetForm);

// Recarrega lista ao mudar o filtro
filterSelect.addEventListener('change', loadTasks);

// ── Edição ─────────────────────────────────────────────────────────────────

// Preenche o formulário com os dados da tarefa para edição
async function startEdit(id) {
  try {
    const res  = await fetch(`${API}/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const task = json.data;
    taskIdInput.value  = task.id;
    titleInput.value   = task.title;
    descInput.value    = task.description || '';
    statusInput.value  = task.status;

    formTitle.textContent    = 'Editar Tarefa';
    submitBtn.textContent    = 'Salvar Alterações';
    cancelBtn.classList.remove('hidden');

    // Rola até o formulário
    form.scrollIntoView({ behavior: 'smooth' });
    titleInput.focus();
  } catch (err) {
    showToast('Erro ao carregar tarefa para edição', 'error');
  }
}

// Limpa o formulário e volta ao estado de criação
function resetForm() {
  form.reset();
  taskIdInput.value        = '';
  formTitle.textContent    = 'Nova Tarefa';
  submitBtn.textContent    = 'Criar Tarefa';
  cancelBtn.classList.add('hidden');
}

// ── Exclusão com confirmação ───────────────────────────────────────────────

// Abre o modal de confirmação
function askDelete(id) {
  pendingDeleteId = id;
  confirmModal.classList.remove('hidden');
}

// Confirma a exclusão
confirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  confirmModal.classList.add('hidden');

  try {
    await deleteTask(pendingDeleteId);
    showToast('Tarefa excluída com sucesso!');
    loadTasks();
  } catch (err) {
    showToast('Erro ao excluir tarefa', 'error');
  } finally {
    pendingDeleteId = null;
  }
});

// Cancela a exclusão
cancelDelete.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
  pendingDeleteId = null;
});

// Fecha o modal ao clicar fora dele
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.add('hidden');
    pendingDeleteId = null;
  }
});

// ── Inicialização ──────────────────────────────────────────────────────────
loadTasks();
