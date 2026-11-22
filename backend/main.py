from typing import Optional
import os                                                   # Lê variáveis de ambiente (origens permitidas do CORS)
from fastapi import FastAPI, Depends, HTTPException, Header         # Classes principais do FastAPI para criar rotas, gerenciar dependências e tratar erros HTTP
from fastapi.middleware.cors import CORSMiddleware          # Libera o front-end (outro domínio) para chamar a API
from fastapi.responses import RedirectResponse              # Resposta de redirecionamento para mandar o usuário para a página de documentação
from sqlalchemy.orm import Session                          # Para gerenciar a sessão de conexão com o banco de dados

from database import get_db                                 # Função get_db do arquivo database.py para injetar a sessão do banco nas rotas
import seed                                                 # Modulo que Criaa e popula as 15 tabelas do banco de dados
from routers import crud, operacoes, relatorios, ia         # Importa os roteadores modulares que agrupam as rotas por funcionalidade (CRUDs, operações, relatórios e IA)



# ==============================================================================
# METADADOS E ORDENAÇÃO VISUAL DAS SEÇÕES NO SWAGGER (/docs)
# ==============================================================================
# Define uma lista de dicionários contendo o nome (tag) e a descrição de cada seção que orgnizam a interface grafica do Swagger
tags_metadata = [
    {
        "name": "Administração do Banco",
        "description": "Inicialização das 15 tabelas com carga de dados oficial e limpeza completa do esquema (Req. 7.e).",
    },
    {
        "name": "Fluxos de Negócio",
        "description": "Operações transacionais compostas: vitrine pública filtrada, conferência de segredo pelo operador, avaliação de reivindicação e expiração automática de prazos.",
    },
    {
        "name": "Relatórios e Gráficos",
        "description": "Consultas analíticas com agregação SQL (JOIN, GROUP BY, COUNT) e visualização gráfica em PNG (Req. 7.c).",
    },
    {
        "name": "Busca Inteligente (IA)",
        "description": "Busca semântica em linguagem natural integrada à API do Google Gemini (Req. 7.f).",
    },
    {
        "name": "Objetos",
        "description": "CRUD da entidade central de itens perdidos ou encontrados (com ocultação do segredo na saída pública).",
    },
    {
        "name": "Usuários e Perfis",
        "description": "CRUD da superclasse Usuário e especializações 1:1 (Membro UFSC, Operador e Visitante).",
    },
    {
        "name": "Reivindicações",
        "description": "CRUD das solicitações de posse vinculadas aos objetos e usuários.",
    },
    {
        "name": "Locais e Catálogos",
        "description": "CRUD dos blocos da Unidade Jardim das Avenidas, locais específicos, categorias, cores, status e tipos de registro.",
    },
    {
        "name": "Auditoria, Imagens e Notificações",
        "description": "Gerenciamento de fotos anexadas, notificações aos usuários e trilha de auditoria (append-only).",
    },
]


# ==============================================================================
# INICIALIZAÇÃO DA APLICAÇÃO FASTAPI
# ==============================================================================
# Instancia a aplicação principal do FastAPI, configurando o título, a descrição acadêmica,
app = FastAPI(
    title="UFSCAchados - Sistema de Achados e Perdidos",
    description="Trabalho Final de Banco de Dados I (DEC7129 - UFSC Araranguá) | API RESTful com PostgreSQL, SQLAlchemy, Matplotlib e Gemini.",
    version="1.0.0",
    openapi_tags=tags_metadata      #vinculacao dos metadados de tags criados para organizar o /docs.
)


# ==============================================================================
# CORS (permite que o front-end hospedado no Vercel chame esta API)
# ==============================================================================
# Defina CORS_ORIGINS no .env separando por vírgula, ex.: https://meu-app.vercel.app,http://localhost:3000
origens = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origens,
    allow_origin_regex=r"https://.*\.vercel\.app",     # Aceita também os deploys de preview do Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Redireciona automaticamente a raiz (/) para a interface interativa (/docs)
@app.get("/", include_in_schema=False)
def raiz():
    return RedirectResponse(url="/docs")


# ==============================================================================
# PROTEÇÃO DAS ROTAS DE ADMINISTRAÇÃO
# ==============================================================================
# Se ADMIN_KEY estiver definida no .env, as rotas /banco/* exigem o cabeçalho X-Admin-Key com esse valor.
# Se não estiver definida (uso 100% local), as rotas continuam livres.
def exigir_admin(x_admin_key: Optional[str] = Header(default=None)):
    chave = os.getenv("ADMIN_KEY")
    if chave and x_admin_key != chave:
        raise HTTPException(status_code=401, detail="Chave de administrador inválida ou ausente (cabeçalho X-Admin-Key).")


# ==============================================================================
# ADMINISTRAÇÃO DO BANCO DE DADOS
# ==============================================================================
# Cria fisicamente as 15 tabelas no PostgreSQL e popula o banco com o seed.py
@app.post(
    "/banco/inicializar",
    tags=["Administração do Banco"],
    summary="Criar as 15 tabelas e popular carga inicial",
    dependencies=[Depends(exigir_admin)]
)
def inicializar_banco(db: Session = Depends(get_db)):
    try:
        return seed.criar_e_popular_banco(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao inicializar banco: {str(e)}")

# Elimina completamente todas as tabelas do banco de dados (Drop All)
@app.delete(
    "/banco/limpar",
    tags=["Administração do Banco"],
    summary="Eliminar todas as tabelas do banco (Drop All)",
    dependencies=[Depends(exigir_admin)]
)
def limpar_banco():
    try:
        return seed.eliminar_todas_tabelas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao eliminar tabelas: {str(e)}")


# ==============================================================================
# ACOPLAMENTO DOS ROTEADORES MODULARES
# ==============================================================================
app.include_router(operacoes.router)
app.include_router(relatorios.router)
app.include_router(ia.router)
app.include_router(crud.router)