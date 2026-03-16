// database.js - Configuração e inicialização do banco de dados SQLite
const Database = require('better-sqlite3');
const path = require('path');

// Cria ou abre o arquivo de banco de dados na pasta do projeto
const db = new Database(path.join(__dirname, 'tasks.db'));

// Habilita WAL mode para melhor performance com leituras concorrentes
db.pragma('journal_mode = WAL');

// Cria a tabela de tarefas se não existir
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    NOT NULL,
    description TEXT  DEFAULT '',
    status    TEXT    NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending', 'in_progress', 'done')),
    createdAt TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

module.exports = db;
