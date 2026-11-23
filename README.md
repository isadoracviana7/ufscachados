# 🎓 UFSCAchados — Sistema Inteligente de Achados e Perdidos

> **Um reencontro começa aqui.** Plataforma web desenvolvida para facilitar o registro, a gestão e a recuperação de objetos perdidos e encontrados nos campi da **Universidade Federal de Santa Catarina (UFSC — Campus Araranguá)**.

🔗 **Acesse a aplicação online:** [ufsc-found-and-found.vercel.app](https://ufsc-found-and-found.vercel.app)

⚙️ **API em produção (Swagger Docs):** [ufscachados-api.onrender.com/docs](https://ufscachados-api.onrender.com/docs)

---

## 📋 Sobre o Projeto

O **UFSCAchados** resolve o problema da descentralização de informações sobre itens perdidos no ambiente universitário. O sistema oferece um mural público acessível a estudantes, servidores e visitantes, além de uma área restrita para operadores e administradores gerenciarem o ciclo de vida de cada objeto (registro, reivindicação e devolução).

O grande diferencial da plataforma é a **Busca Inteligente com Inteligência Artificial**, que permite ao usuário descrever o objeto perdido em linguagem natural (ex: *"esqueci uma garrafa térmica azul perto da biblioteca ontem"*) e encontrar correspondências semânticas no banco de dados.

---

## ✨ Funcionalidades Principais

* **Mural Público Interativo:** Visualização de itens divididos entre *Perdidos* e *Achados*, com filtros por categoria, local/bloco do campus, data e ordenação.
* **Busca Inteligente com IA:** Integração com a API do **Google Gemini** (`gemini-3.5-flash`) para interpretar descrições em linguagem natural e ranquear os objetos mais compatíveis.
* **Painel de Gestão (Operador/Admin):**
  * Cadastro de novos objetos com detalhes de localização e descrição.
  * Atualização de status (ex: marcar item como *Devolvido* ou *Reivindicado*).
  * Controle de acesso protegido por chave de autenticação.
* **Resiliência (Modo Demonstração):** Caso a API esteja temporariamente indisponível ou em inicialização (*cold start*), o front-end alterna automaticamente para um modo de demonstração com dados locais para manter a navegabilidade.

---

## 🛠️ Tecnologias Utilizadas

### Front-end (`/frontend`)
* **React** + **TypeScript**
* **Vite** (Build tool e servidor de desenvolvimento)
* **Tailwind CSS** & **shadcn/ui** (Estilização e componentes de interface)
* **Hospedagem:** Vercel

### Back-end (`/backend`)
* **Python 3** + **FastAPI** (API RESTful assíncrona)
* **Google GenAI SDK** (Integração com modelos Gemini para busca semântica)
* **Pydantic** (Validação de dados e schemas)
* **Hospedagem:** Render

---

## 📁 Estrutura do Repositório

```text
ufscachados/
├── backend/                  # API desenvolvida em FastAPI (Python)
│   ├── main.py               # Rotas principais, configuração de CORS e integração IA
│   ├── requirements.txt      # Dependências do Python
│   └── ...
├── frontend/                 # Aplicação web em React + TypeScript + Vite
│   ├── src/                  # Componentes, páginas, contextos e serviços de API
│   ├── package.json          # Dependências do Node.js
│   └── ...
└── README.md                 # Documentação do projeto
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (v18 ou superior)
* **Python** (v3.10 ou superior)
* Uma chave de API válida do **Google Gemini** (`GEMINI_API_KEY`)

### 1. Configurando o Back-end

```bash
# Acesse a pasta do back-end
cd backend

# Crie e ative o ambiente virtual
python -m venv .venv
# No Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# No Linux/macOS:
# source .venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente (crie um arquivo .env na pasta backend)
# GEMINI_API_KEY=sua_chave_aqui
# GEMINI_MODEL=gemini-3.5-flash

# Inicie o servidor local
uvicorn main:app --reload
```

O back-end estará disponível em `http://127.0.0.1:8000` e a documentação interativa em `http://127.0.0.1:8000/docs`.

### 2. Configurando o Front-end

```bash
# Em outro terminal, acesse a pasta do front-end
cd frontend

# Instale as dependências
npm install

# Configure as variáveis de ambiente (crie um arquivo .env na pasta frontend)
# VITE_API_URL=http://127.0.0.1:8000 (ou https://ufscachados-api.onrender.com)
# VITE_ADMIN_KEY=sua_chave_admin

# Inicie o servidor de desenvolvimento
npm run dev
```

O front-end estará acessível em `http://localhost:8080`.

---

## 👩‍💻 Autoria

Desenvolvido por **Isadora Viana** ([@isadoracviana7](https://github.com/isadoracviana7)) e **Gabrieli Jorge Barbosa** ([@gabi-barbosa](https://github.com/gabi-barbosa)) como projeto acadêmico — **Universidade Federal de Santa Catarina (UFSC)**.
