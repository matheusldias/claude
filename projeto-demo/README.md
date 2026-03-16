# Gerenciador de Tarefas — Demo Claude Code

Projeto fullstack simples para demonstrar as principais funcionalidades do Claude Code.

## Stack

| Camada    | Tecnologia         |
|-----------|--------------------|
| Frontend  | HTML + CSS + JS vanilla |
| Backend   | Node.js + Express  |
| Banco     | SQLite (better-sqlite3) |

## Estrutura

```
projeto-demo/
├── server.js       # Servidor Express + API REST
├── database.js     # Configuração do SQLite
├── seed.js         # Script para popular dados de exemplo
├── package.json
└── public/
    ├── index.html  # Página única (SPA)
    ├── style.css   # Estilos responsivos
    └── app.js      # Lógica do frontend
```

## Instalação e uso

```bash
# 1. Entrar na pasta do projeto
cd projeto-demo

# 2. Instalar dependências
npm install

# 3. (Opcional) Popular o banco com dados de exemplo
node seed.js

# 4. Iniciar o servidor
npm start
```

Acesse **http://localhost:3000** no navegador.

## Endpoints da API

| Método | Rota              | Descrição                          |
|--------|-------------------|------------------------------------|
| GET    | `/api/tasks`      | Lista todas as tarefas             |
| GET    | `/api/tasks?status=pending` | Lista com filtro de status |
| GET    | `/api/tasks/:id`  | Retorna uma tarefa                 |
| POST   | `/api/tasks`      | Cria uma nova tarefa               |
| PUT    | `/api/tasks/:id`  | Atualiza uma tarefa                |
| DELETE | `/api/tasks/:id`  | Remove uma tarefa                  |

### Campos da tarefa

```json
{
  "id": 1,
  "title": "Título da tarefa",
  "description": "Descrição opcional",
  "status": "pending | in_progress | done",
  "createdAt": "2024-01-01 12:00:00"
}
```

## Funcionalidades do frontend

- Listagem de tarefas com filtro por status
- Criar e editar tarefas via formulário
- Excluir com modal de confirmação
- Feedback visual (toast) de sucesso/erro
- Layout responsivo para mobile e desktop
