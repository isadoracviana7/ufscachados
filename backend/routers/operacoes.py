from datetime import date, datetime                                     # Gerencia datas e horários correntes para logs e prazos
from typing import Optional                                             # Permite definir parâmetros opcionais nas rotas da API
from fastapi import APIRouter, Depends, HTTPException, Query              # Ferramentas do FastAPI para rotas, dependências, erros e query params
from pydantic import BaseModel, Field                                   # Valida e estrutura os dados de entrada via Pydantic
from sqlalchemy.orm import Session                                      # Gerencia a sessão de comunicação com o PostgreSQL
from sqlalchemy import func                                             # Habilita funções analíticas e de agregação do SQL (como func.max)

from database import get_db                                             # Fábrica que abre e fecha conexões com o banco de dados
import models                                                           # Mapeamento ORM de todas as tabelas do projeto

router = APIRouter()


# Schema de entrada específico para o fluxo de decisão do operador
class DecisaoReivindicacao(BaseModel):
    id_reivindicacao: int = Field(..., gt=0, examples=[1])
    id_operador: int = Field(..., gt=0, examples=[2])
    aprovada: bool = Field(..., examples=[True])
    observacao_operador: Optional[str] = Field(None, examples=["Conferido presencialmente no balcão."])


# ==============================================================================
# CONFERÊNCIA DE SEGREDO (Visão Exclusiva do Operador)
# ==============================================================================
# READ (GET): Permite que o operador compare o segredo oculto do item com a justificativa dada por quem perdeu
@router.get(
    "/operacoes/conferir-reivindicacao/{id_reivindicacao}",
    tags=["Fluxos de Negócio"],
    summary="Comparar segredo oculto do objeto com a justificativa do solicitante"
)
def conferir_reivindicacao(
    id_reivindicacao: int,
    id_operador: int = Query(..., gt=0, description="ID do usuário operador que está analisando"),
    db: Session = Depends(get_db)
):
    # Regra de negócio: valida se quem está consultando o segredo realmente é um OPERADOR
    operador = db.query(models.Operador).filter(models.Operador.id_usuario == id_operador).first()
    if not operador:
        raise HTTPException(status_code=403, detail="Acesso negado: apenas usuários com perfil OPERADOR podem visualizar detalhes de segurança ocultos.")

    # Busca a reivindicação pelo ID informado na URL
    reiv = db.query(models.Reivindicacao).filter(models.Reivindicacao.id_reivindicacao == id_reivindicacao).first()
    if not reiv:
        raise HTTPException(status_code=404, detail="Reivindicação não encontrada.")

    # Busca o objeto e o usuário solicitante vinculados à reivindicação
    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == reiv.id_objeto).first()
    solicitante = db.query(models.Usuario).filter(models.Usuario.id_usuario == reiv.id_usuario).first()

    # Retorna um dicionário consolidado para o operador comparar lado a lado
    return {
        "id_reivindicacao": reiv.id_reivindicacao,
        "status_atual": reiv.status,
        "solicitante": {"id": solicitante.id_usuario, "nome": solicitante.nome, "email": solicitante.email},
        "objeto": {"id": objeto.id_objeto, "descricao_publica": objeto.descricao_publica},
        "comparacao_seguranca": {
            "segredo_real_cadastrado": objeto.detalhe_seguranca_oculto,
            "justificativa_informada_pelo_usuario": reiv.justificativa_segredo
        }
    }


# ==============================================================================
# AVALIAÇÃO TRANSACIONAL DE REIVINDICAÇÃO (Atualiza 4 tabelas de uma vez)
# ==============================================================================
# POST: Executa uma transação complexa que aprova/rejeita o pedido e atualiza em cascata o status do objeto, auditoria e notificação
@router.post(
    "/operacoes/avaliar-reivindicacao",
    tags=["Fluxos de Negócio"],
    summary="Aprovar ou rejeitar reivindicação (atualiza Objeto, Auditoria e Notificação)"
)
def avaliar_reivindicacao(dados: DecisaoReivindicacao, db: Session = Depends(get_db)):
    # 1. Valida perfil de Operador
    operador = db.query(models.Operador).filter(models.Operador.id_usuario == dados.id_operador).first()
    if not operador:
        raise HTTPException(status_code=403, detail="Apenas operadores autorizados podem julgar reivindicações.")

    # 2. Busca reivindicação e objeto vinculado
    reiv = db.query(models.Reivindicacao).filter(models.Reivindicacao.id_reivindicacao == dados.id_reivindicacao).first()
    if not reiv:
        raise HTTPException(status_code=404, detail="Reivindicação não encontrada.")

    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == reiv.id_objeto).first()
    agora = datetime.now()

    # Calcula próximos IDs livres para Auditoria e Notificação
    prox_id_hist = (db.query(func.max(models.HistoricoAuditoria.id_historico)).scalar() or 0) + 1
    prox_id_notif = (db.query(func.max(models.Notificacao.id_notificacao)).scalar() or 0) + 1

    if dados.aprovada:
        reiv.status = models.StatusReivindicacao.APROVADA
        objeto.id_status = 3  # Devolvido ao Dono
        tipo_log = "BAIXA_DEVOLUCAO"
        msg_usuario = f"Sua reivindicação para '{objeto.descricao_publica}' foi APROVADA! Retire o item na recepção."

        # Regra de negócio: Rejeita automaticamente outras solicitações pendentes para este mesmo objeto
        outras = db.query(models.Reivindicacao).filter(
            models.Reivindicacao.id_objeto == objeto.id_objeto,
            models.Reivindicacao.id_reivindicacao != reiv.id_reivindicacao,
            models.Reivindicacao.status == models.StatusReivindicacao.EM_ANALISE
        ).all()
        for outra in outras:
            outra.status = models.StatusReivindicacao.REJEITADA
    else:
        reiv.status = models.StatusReivindicacao.REJEITADA
        objeto.id_status = 1  # Volta para Aguardando Retirada
        tipo_log = "REIVINDICACAO_REJEITADA"
        msg_usuario = f"Sua reivindicação para '{objeto.descricao_publica}' foi REJEITADA pois o detalhe de segurança não conferiu."

    # 3. Grava trilha automática na tabela HISTORICO_AUDITORIA
    novo_log = models.HistoricoAuditoria(
        id_historico=prox_id_hist,
        id_objeto=objeto.id_objeto,
        id_usuario=dados.id_operador,
        data_hora=agora,
        tipo_transacao=tipo_log
    )

    # 4. Dispara notificação automática na tabela NOTIFICACAO
    nova_notif = models.Notificacao(
        id_notificacao=prox_id_notif,
        id_objeto=objeto.id_objeto,
        id_usuario=reiv.id_usuario,
        data_hora=agora,
        mensagem=msg_usuario
    )

    db.add_all([novo_log, nova_notif])
    db.commit()

    # Adiciona tudo na sessão e confirma a transação atômica no banco (COMMIT)
    return {
        "mensagem": "Decisão processada com sucesso em todas as tabelas vinculadas.",
        "reivindicacao_status": reiv.status,
        "objeto_novo_status": objeto.id_status,
        "auditoria_gerada_id": prox_id_hist,
        "notificacao_enviada_id": prox_id_notif
    }


# ==============================================================================
# ROTINA DE EXPIRAÇÃO AUTOMÁTICA DE PRAZOS
# ==============================================================================
# POST: Executa a varredura para encaminhar ao destino de doação itens cujo prazo legal expirou
@router.post(
    "/operacoes/processar-vencimentos",
    tags=["Fluxos de Negócio"],
    summary="Encaminhar para doação objetos com data_vencimento expirada"
)
def processar_vencimentos(
    id_operador: int = Query(..., gt=0, description="ID do operador executando a rotina"),
    db: Session = Depends(get_db)
):
    # Valida perfil de operador
    operador = db.query(models.Operador).filter(models.Operador.id_usuario == id_operador).first()
    if not operador:
        raise HTTPException(status_code=403, detail="Apenas operadores podem executar a rotina de vencimentos.")

    hoje = date.today()
    # Busca objetos ainda ativos (status 1 ou 2) cujo prazo de guarda já passou
    vencidos = db.query(models.Objeto).filter(
        models.Objeto.id_status.in_([1, 2]),
        models.Objeto.data_vencimento < hoje
    ).all()

    if not vencidos:
        return {"mensagem": "Nenhum objeto vencido pendente encontrado.", "total_atualizado": 0}

    prox_id_hist = (db.query(func.max(models.HistoricoAuditoria.id_historico)).scalar() or 0) + 1
    agora = datetime.now()

    # Atualiza o status de cada item vencido para 4 (Expirado / Doação) e gera log de auditoria
    for idx, obj in enumerate(vencidos):
        obj.id_status = 4  # Expirado / Encaminhado para Doação
        db.add(models.HistoricoAuditoria(
            id_historico=prox_id_hist + idx,
            id_objeto=obj.id_objeto,
            id_usuario=id_operador,
            data_hora=agora,
            tipo_transacao="EXPIRACAO_AUTOMATICA_DOACAO"
        ))

    db.commit()
    return {
        "mensagem": f"{len(vencidos)} objeto(s) vencido(s) atualizado(s) para doação e registrado(s) na auditoria.",
        "ids_afetados": [o.id_objeto for o in vencidos]
    }


# ==============================================================================
# VITRINE PÚBLICA COM JOINS E FILTROS (Sem expor segredos)
# ==============================================================================
# GET: Vitrine de consulta pública com múltiplos filtros opcionais por bloco, categoria e cor
@router.get(
    "/operacoes/vitrine",
    tags=["Fluxos de Negócio"],
    summary="Consulta pública enriquecida com nomes de Bloco, Local, Categoria, Cor e Fotos"
)
def listar_vitrine_publica(
    id_bloco: Optional[int] = Query(None, description="Filtrar por ID do Bloco"),
    id_categoria: Optional[int] = Query(None, description="Filtrar por ID da Categoria"),
    id_cor: Optional[int] = Query(None, description="Filtrar por ID da Cor"),
    apenas_disponiveis: bool = Query(True, description="Mostrar apenas itens aguardando retirada (status 1)"),
    db: Session = Depends(get_db)
):
    # Constrói a consulta unificada cruzando 5 tabelas do banco de dados relacional
    query = (
        db.query(
            models.Objeto,
            models.Categoria.nome.label("categoria"),
            models.Cor.nome.label("cor"),
            models.Status.descricao.label("status"),
            models.LocalEspecifico.nome.label("local"),
            models.BlocoPredio.nome.label("bloco"),
        )
        .join(models.Categoria, models.Objeto.id_categoria == models.Categoria.id_categoria)
        .join(models.Cor, models.Objeto.id_cor == models.Cor.id_cor)
        .join(models.Status, models.Objeto.id_status == models.Status.id_status)
        .join(models.LocalEspecifico, models.Objeto.id_local == models.LocalEspecifico.id_local)
        .join(models.BlocoPredio, models.LocalEspecifico.id_bloco == models.BlocoPredio.id_bloco)
    )

    # Aplica filtros condicionais baseados nos parâmetros opcionais recebidos na URL
    if apenas_disponiveis:
        query = query.filter(models.Objeto.id_status == 1)
    if id_bloco:
        query = query.filter(models.BlocoPredio.id_bloco == id_bloco)
    if id_categoria:
        query = query.filter(models.Objeto.id_categoria == id_categoria)
    if id_cor:
        query = query.filter(models.Objeto.id_cor == id_cor)

    resultados = []
    # Monta a resposta pública formatada (garantindo total segurança ao omitir o detalhe_seguranca_oculto)
    for obj, categoria, cor, status_desc, local, bloco in query.all():
        resultados.append({
            "id_objeto": obj.id_objeto,
            "descricao_publica": obj.descricao_publica,
            "categoria": categoria,
            "cor": cor,
            "status": status_desc,
            "local_encontrado": f"{local} ({bloco})",
            "data_registro": obj.data_registro,
            "data_vencimento": obj.data_vencimento,
            "imagens": [img.url_caminho for img in obj.imagens]
            #detalhe_seguranca_oculto NUNCA é incluído aqui
        })

    return resultados


# ==============================================================================
# MATCH AUTOMÁTICO DE OBJETOS POR SEMELHANÇA (Categoria, Cor e Tipo Alerta)
# ==============================================================================
# POST: Dispara o cruzamento automático entre itens recém-achados e alertas de itens perdidos
@router.post(
    "/operacoes/executar-match/{id_objeto}",
    tags=["Fluxos de Negócio"],
    summary="Executar match automático entre um item encontrado e alertas de itens perdidos"
)
def executar_match_objeto(id_objeto: int, db: Session = Depends(get_db)):
    """
    Verifica se um objeto recém-cadastrado (Item Encontrado, id_tipo=1) 
    possui correspondência com alertas de itens perdidos (id_tipo=2) 
    com base na mesma Categoria e Cor. Se houver, gera uma Notificação automática.
    """
    objeto_atual = db.query(models.Objeto).filter(models.Objeto.id_objeto == id_objeto).first()
    if not objeto_atual:
        raise HTTPException(status_code=404, detail="Objeto não encontrado.")

    # Só executa o match se for um item encontrado (tipo 1)
    if objeto_atual.id_tipo != 1:
        return {"mensagem": "O objeto cadastrado não é um item encontrado (id_tipo != 1), match não aplicável."}

    # Busca alertas de itens perdidos (tipo 2) na mesma categoria e cor
    alertas_compativeis = db.query(models.Objeto).filter(
        models.Objeto.id_tipo == 2,
        models.Objeto.id_categoria == objeto_atual.id_categoria,
        models.Objeto.id_cor == objeto_atual.id_cor,
        models.Objeto.id_objeto != objeto_atual.id_objeto
    ).all()

    if not alertas_compativeis:
        return {"match_encontrado": False, "mensagem": "Nenhum alerta de item perdido compatível encontrado no momento."}

    # Calcula o próximo ID livre para Notificação seguindo o mesmo padrão do projeto
    prox_id_notif = (db.query(func.max(models.Notificacao.id_notificacao)).scalar() or 0) + 1
    agora = datetime.now()
    notificacoes_geradas = []

    for idx, alerta in enumerate(alertas_compativeis):
        # Evita duplicar notificação idêntica para o mesmo usuário e objeto
        existe_notificacao = db.query(models.Notificacao).filter(
            models.Notificacao.id_objeto == objeto_atual.id_objeto,
            models.Notificacao.id_usuario == alerta.id_usuario_cadastro
        ).first()

        if not existe_notificacao:
            nova_notificacao = models.Notificacao(
                id_notificacao=prox_id_notif + idx,
                id_objeto=objeto_atual.id_objeto,
                id_usuario=alerta.id_usuario_cadastro,
                data_hora=agora,
                mensagem=f"Match Potencial! Encontramos um item compatível com o seu alerta de perda (Objeto #{objeto_atual.id_objeto}: {objeto_atual.descricao_publica[:60]}...)"
            )
            db.add(nova_notificacao)
            notificacoes_geradas.append(alerta.id_usuario_cadastro)

    db.commit()

    return {
        "match_encontrado": True,
        "total_alertas_notificados": len(notificacoes_geradas),
        "usuarios_notificados": notificacoes_geradas,
        "mensagem": "Match executado com sucesso e notificações geradas para os donos dos alertas!"
    }