// seed.js - Popula o banco de dados com tarefas de exemplo
const db = require('./database');

const tasks = [
  {
    title: 'Configurar ambiente de desenvolvimento',
    description: 'Instalar Node.js, VSCode e extensões necessárias para o projeto.',
    status: 'done',
  },
  {
    title: 'Criar estrutura do projeto',
    description: 'Organizar pastas, arquivos e dependências do backend e frontend.',
    status: 'done',
  },
  {
    title: 'Implementar API REST',
    description: 'Criar endpoints GET, POST, PUT e DELETE para gerenciar tarefas.',
    status: 'in_progress',
  },
  {
    title: 'Desenvolver interface do usuário',
    description: 'Criar página HTML com listagem, formulário e botões de ação.',
    status: 'in_progress',
  },
  {
    title: 'Adicionar autenticação',
    description: 'Implementar login com JWT para proteger as rotas da API.',
    status: 'pending',
  },
  {
    title: 'Escrever testes automatizados',
    description: 'Cobrir os principais fluxos da API com testes de integração.',
    status: 'pending',
  },
  {
    title: 'Deploy em produção',
    description: 'Publicar a aplicação em um servidor cloud (Railway, Render, etc.).',
    status: 'pending',
  },
];

// Limpa dados anteriores e insere os de exemplo
db.prepare('DELETE FROM tasks').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name='tasks'").run();

const insert = db.prepare(
  'INSERT INTO tasks (title, description, status) VALUES (?, ?, ?)'
);

tasks.forEach(t => insert.run(t.title, t.description, t.status));

console.log(`✅ Seed concluído! ${tasks.length} tarefas inseridas.`);
