import io                                                         # Gerencia buffers binários em memória (usado para salvar o gráfico PNG em bytes)
from fastapi import APIRouter, Depends                            # APIRouter modulariza as rotas; Depends injeta a sessão do banco
from fastapi.responses import StreamingResponse                   # Converte o buffer de imagem em um fluxo HTTP para download/exibição
from sqlalchemy.orm import Session                                # Define o tipo da sessão de comunicação ORM com o PostgreSQL
from sqlalchemy import func                                       # Habilita funções de agregação do SQL (como func.count para contagens)
import matplotlib                                                 # Biblioteca principal de plotagem e visualização de dados
matplotlib.use("Agg")                                             # Configura o Matplotlib para rodar em modo gráfico invisível (em memória)
from matplotlib.figure import Figure                              # API orientada a objetos: cada requisição cria sua própria figura (thread-safe, ao contrário do pyplot que usa estado global)

from database import get_db                                       # Fábrica de conexão que abre e fecha sessões com o PostgreSQL
import models                                                     # Mapeamento ORM das tabelas do banco relacional

router = APIRouter()


# ==============================================================================
# OBJETOS POR BLOCO / PRÉDIO (OBJETO, LOCAL_ESPECIFICO, BLOCO_PREDIO)
# ==============================================================================
# Função auxiliar que executa a lógica SQL pura (JOINs e agregação por COUNT)
def _executar_por_bloco(db: Session):
    resultados = (
        db.query(
            models.BlocoPredio.nome.label("bloco_predio"),
            func.count(models.Objeto.id_objeto).label("total_objetos")
        )
        # Faz o JOIN conectando Objeto ao seu Local Específico, e depois ao Bloco/Prédio correspondente
        .join(models.LocalEspecifico, models.Objeto.id_local == models.LocalEspecifico.id_local)
        .join(models.BlocoPredio, models.LocalEspecifico.id_bloco == models.BlocoPredio.id_bloco)
        .group_by(models.BlocoPredio.nome)                          # Agrupa o resultado por nome do bloco
        .order_by(func.count(models.Objeto.id_objeto).desc())       # Ordena do bloco com mais objetos para o com menos
        .all()
    )
    # Retorna uma lista de dicionários limpa pronta para virar JSON
    return [{"bloco_predio": r.bloco_predio, "total_objetos": r.total_objetos} for r in resultados]

# READ ANALÍTICO (GET): Retorna os dados em formato JSON para o relatório por bloco
@router.get(
    "/relatorios/objetos-por-bloco",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Dados): Total de objetos por Bloco/Prédio",
    description="Objetivo: Identificar os setores do campus Jardim das Avenidas com maior incidência de objetos perdidos/encontrados (JOIN entre OBJETO, LOCAL_ESPECIFICO e BLOCO_PREDIO)."
)
def relatorio_por_bloco_dados(db: Session = Depends(get_db)):
    return _executar_por_bloco(db)

# READ GRÁFICO (GET): Renderiza e retorna o relatório por bloco em formato de imagem PNG (Matplotlib)
@router.get(
    "/relatorios/objetos-por-bloco/grafico",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Gráfico): Objetos por Bloco/Prédio (PNG)"
)
def relatorio_por_bloco_grafico(db: Session = Depends(get_db)):
    dados = _executar_por_bloco(db)
    # Limpa os nomes longos dos rótulos para o gráfico ficar esteticamente limpo
    labels = [d["bloco_predio"].replace(" - Jardim das Avenidas", "") for d in dados]
    valores = [d["total_objetos"] for d in dados]

    # Cria a figura e os eixos do gráfico de barras verticais
    fig = Figure(figsize=(8, 4.5))
    ax = fig.subplots()
    bars = ax.bar(labels, valores, color="#1f77b4")
    ax.set_title("Total de Objetos por Bloco/Prédio", fontsize=12, fontweight="bold")
    ax.set_ylabel("Total de Objetos")
    ax.yaxis.get_major_locator().set_params(integer=True)           # Força números inteiros no eixo Y
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=15, ha="right")             # Inclina os nomes para não embolarem
    ax.bar_label(bars, padding=3)                                   # Mostra o valor exato em cima de cada barra
    fig.tight_layout()

    # Salva o gráfico gerado dentro de um buffer de memória (bytes) em vez de salvar no disco rígido
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    buf.seek(0)
    # Retorna o arquivo de imagem diretamente como um fluxo HTTP (StreamingResponse)
    return StreamingResponse(buf, media_type="image/png")


# ==============================================================================
# ITENS POR CATEGORIA E STATUS (OBJETO, CATEGORIA, STATUS)
# ==============================================================================
# Função auxiliar que cruza as categorias dos itens com o status atual no acervo
def _executar_por_categoria_status(db: Session):
    resultados = (
        db.query(
            models.Categoria.nome.label("categoria"),
            models.Status.descricao.label("status_objeto"),
            func.count(models.Objeto.id_objeto).label("quantidade_itens")
        )
        # Relaciona a tabela Objeto com Categoria e com Status através das chaves estrangeiras
        .join(models.Categoria, models.Objeto.id_categoria == models.Categoria.id_categoria)
        .join(models.Status, models.Objeto.id_status == models.Status.id_status)
        .group_by(models.Categoria.nome, models.Status.descricao)   # Agrupa por dupla (categoria + status)
        .order_by(models.Categoria.nome.asc(), func.count(models.Objeto.id_objeto).desc())
        .all()
    )
    return [
        {
            "categoria": r.categoria,
            "status_objeto": r.status_objeto,
            "quantidade_itens": r.quantidade_itens
        }
        for r in resultados
    ]


# READ ANALÍTICO (GET): Retorna os dados em formato JSON para o relatório de categoria e status
@router.get(
    "/relatorios/itens-por-categoria-status",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Dados): Quantidade de itens por Categoria e Status",
    description="Objetivo: Cruzar as categorias de itens com sua situação atual no acervo (JOIN entre OBJETO, CATEGORIA e STATUS)."
)
def relatorio_por_categoria_status_dados(db: Session = Depends(get_db)):
    return _executar_por_categoria_status(db)

# READ GRÁFICO (GET): Renderiza e retorna o relatório de categoria e status em formato de gráfico de barras horizontais (PNG)
@router.get(
    "/relatorios/itens-por-categoria-status/grafico",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Gráfico): Itens por Categoria e Status (PNG)"
)
def relatorio_por_categoria_status_grafico(db: Session = Depends(get_db)):
    dados = _executar_por_categoria_status(db)
    labels = [f"{d['categoria']}\n({d['status_objeto']})" for d in dados]
    valores = [d["quantidade_itens"] for d in dados]

    # Gráfico de barras horizontais (barh) ideal para rótulos descritivos mais longos
    fig = Figure(figsize=(9, 4.8))
    ax = fig.subplots()
    bars = ax.barh(labels, valores, color="#2ca02c")
    ax.set_title("Quantidade de Itens por Categoria e Status", fontsize=12, fontweight="bold")
    ax.set_xlabel("Quantidade de Itens")
    ax.xaxis.get_major_locator().set_params(integer=True)
    ax.bar_label(bars, padding=3)
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


# ==============================================================================
# REIVINDICAÇÕES POR STATUS E CATEGORIA (REIVINDICACAO, OBJETO, CATEGORIA, USUARIO)
# ==============================================================================
# Função auxiliar que analisa o fluxo de solicitações de posse usando múltiplos JOINs
def _executar_por_reivindicacoes(db: Session):
    resultados = (
        db.query(
            models.Reivindicacao.status.label("status_reivindicacao"),
            models.Categoria.nome.label("categoria_objeto"),
            func.count(models.Reivindicacao.id_reivindicacao).label("total_solicitacoes")
        )
        # Conecta Reivindicação ao Objeto, Objeto à Categoria, e Reivindicação ao Usuário solicitante
        .join(models.Objeto, models.Reivindicacao.id_objeto == models.Objeto.id_objeto)
        .join(models.Categoria, models.Objeto.id_categoria == models.Categoria.id_categoria)
        .join(models.Usuario, models.Reivindicacao.id_usuario == models.Usuario.id_usuario)
        .group_by(models.Reivindicacao.status, models.Categoria.nome)       # Agrupa por status da reivindicação e categoria
        .order_by(func.count(models.Reivindicacao.id_reivindicacao).desc())
        .all()
    )
    return [
        {
            "status_reivindicacao": r.status_reivindicacao,
            "categoria_objeto": r.categoria_objeto,
            "total_solicitacoes": r.total_solicitacoes
        }
        for r in resultados
    ]

# READ ANALÍTICO (GET): Retorna os dados em formato JSON para o relatório de reivindicações
@router.get(
    "/relatorios/reivindicacoes-por-status-categoria",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Dados): Total de reivindicações por Status e Categoria",
    description="Objetivo: Avaliar a taxa de solicitações de posse por categoria de objeto e situação de análise (JOIN entre REIVINDICACAO, OBJETO, CATEGORIA e USUARIO)."
)
def relatorio_por_reivindicacoes_dados(db: Session = Depends(get_db)):
    return _executar_por_reivindicacoes(db)

# READ GRÁFICO (GET): Renderiza e retorna o relatório de reivindicações em formato de gráfico de barras verticais (PNG)
@router.get(
    "/relatorios/reivindicacoes-por-status-categoria/grafico",
    tags=["Relatórios e Gráficos"],
    summary="Relatório (Gráfico): Reivindicações por Status e Categoria (PNG)"
)
def relatorio_por_reivindicacoes_grafico(db: Session = Depends(get_db)):
    dados = _executar_por_reivindicacoes(db)
    labels = [f"{d['categoria_objeto']} [{d['status_reivindicacao']}]" for d in dados]
    valores = [d["total_solicitacoes"] for d in dados]

    fig = Figure(figsize=(8.5, 4.5))
    ax = fig.subplots()
    bars = ax.bar(labels, valores, color="#ff7f0e")
    ax.set_title("Total de Reivindicações por Status e Categoria", fontsize=12, fontweight="bold")
    ax.set_ylabel("Total de Solicitações")
    ax.yaxis.get_major_locator().set_params(integer=True)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=15, ha="right")
    ax.bar_label(bars, padding=3)
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")