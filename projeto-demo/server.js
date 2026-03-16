// server.js - Servidor Express com API REST completa de Tarefas
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ────────────────────────────────────────────────────────────
app.use(cors());                          // Permite requisições cross-origin
app.use(express.json());                  // Parseia body como JSON
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos

// ─── Helper: resposta padronizada de erro ───────────────────────────────────
function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// ─── GET /api/tasks ─────────────────────────────────────────────────────────
// Retorna todas as tarefas. Aceita query param ?status=pending|in_progress|done
app.get('/api/tasks', (req, res) => {
  try {
    const { status } = req.query;
    let tasks;

    if (status) {
      const validStatuses = ['pending', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, `Status inválido. Use: ${validStatuses.join(', ')}`);
      }
      tasks = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY createdAt DESC').all(status);
    } else {
      tasks = db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC').all();
    }

    res.json({ success: true, data: tasks });
  } catch (err) {
    sendError(res, 500, 'Erro ao buscar tarefas');
  }
});

// ─── GET /api/tasks/:id ─────────────────────────────────────────────────────
// Retorna uma tarefa pelo ID
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return sendError(res, 404, 'Tarefa não encontrada');
    res.json({ success: true, data: task });
  } catch (err) {
    sendError(res, 500, 'Erro ao buscar tarefa');
  }
});

// ─── POST /api/tasks ────────────────────────────────────────────────────────
// Cria uma nova tarefa
app.post('/api/tasks', (req, res) => {
  try {
    const { title, description = '', status = 'pending' } = req.body;

    if (!title || title.trim() === '') {
      return sendError(res, 400, 'O campo "title" é obrigatório');
    }

    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, `Status inválido. Use: ${validStatuses.join(', ')}`);
    }

    const stmt = db.prepare(
      'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)'
    );
    const result = stmt.run(title.trim(), description.trim(), status);

    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newTask });
  } catch (err) {
    sendError(res, 500, 'Erro ao criar tarefa');
  }
});

// ─── PUT /api/tasks/:id ─────────────────────────────────────────────────────
// Atualiza uma tarefa existente
app.put('/api/tasks/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return sendError(res, 404, 'Tarefa não encontrada');

    const { title, description, status } = req.body;

    // Usa o valor atual se o campo não for enviado
    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newDesc  = description !== undefined ? description.trim() : existing.description;
    const newStatus = status !== undefined ? status : existing.status;

    if (!newTitle) return sendError(res, 400, 'O campo "title" não pode ser vazio');

    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(newStatus)) {
      return sendError(res, 400, `Status inválido. Use: ${validStatuses.join(', ')}`);
    }

    db.prepare(
      'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ?'
    ).run(newTitle, newDesc, newStatus, req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    sendError(res, 500, 'Erro ao atualizar tarefa');
  }
});

// ─── DELETE /api/tasks/:id ──────────────────────────────────────────────────
// Remove uma tarefa
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return sendError(res, 404, 'Tarefa não encontrada');

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Tarefa removida com sucesso' });
  } catch (err) {
    sendError(res, 500, 'Erro ao remover tarefa');
  }
});

// ─── Fallback: serve index.html para qualquer rota não-API ──────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Inicia o servidor ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 API disponível em http://localhost:${PORT}/api/tasks`);
});
