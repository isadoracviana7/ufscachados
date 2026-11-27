from typing import List, Union                                      # Permite tipar retornos como "uma lista de objetos" ou múltiplos schemas
from fastapi import APIRouter, Depends, HTTPException, status
# APIRouter: cria um mini_FastAPI modular para organizar rotas fora do main.py
# Depends: injeta dependências automaticamente (como abrir e fechar a sessão do banco)
# HTTPException: interrompe a execução e devolve erros HTTP padronizados (400, 404, etc.)
# status: constantes legíveis para códigos HTTP (ex: HTTP_201_CREATED)

from sqlalchemy.orm import Session                 # Tipo da sessão ativa de comunicação com o PostgreSQL
from sqlalchemy.exc import IntegrityError          # Exceção disparada quando o banco barra duplicatas ou FKs inválidas
from sqlalchemy import func

from datetime import datetime, date
from database import get_db                        # Função geradora que abre e fecha a conexão com o banco
import models                                      # Classes ORM que representam as tabelas físicas
import schemas                                     # Classes Pydantic que validam entrada e filtram saída

# Instancia o roteador que será conectado ao app principal (main.py) via app.include_router()
router = APIRouter()


# Função auxiliar para verificar se um usuário é operador
def verificar_se_e_operador(id_usuario: int, db: Session) -> bool:
    if not id_usuario:
        return False
    op = db.query(models.Operador).filter(models.Operador.id_usuario == id_usuario).first()
    return op is not None


# ==============================================================================
# CRUD DE OBJETO (Entidade Central do Sistema)
# ==============================================================================

# CREATE (POST): Cadastra um novo objeto perdido/encontrado
@router.post("/objetos", response_model=schemas.ObjetoResponse, status_code=status.HTTP_201_CREATED, tags=["Objetos"])
def criar_objeto(objeto: schemas.ObjetoCreate, db: Session = Depends(get_db)):
    novo_objeto = models.Objeto(**objeto.model_dump())
    try:
        db.add(novo_objeto)
        db.commit()
        db.refresh(novo_objeto)

        # MATCH AUTOMÁTICO POR SEMELHANÇA (Se for Item Encontrado - id_tipo == 1)
        if novo_objeto.id_tipo == 1:
            alertas_compativeis = db.query(models.Objeto).filter(
                models.Objeto.id_tipo == 2,  # Alerta de item perdido
                models.Objeto.id_categoria == novo_objeto.id_categoria,
                models.Objeto.id_cor == novo_objeto.id_cor
            ).all()

            if alertas_compativeis:
                prox_id_notif = (db.query(func.max(models.Notificacao.id_notificacao)).scalar() or 0) + 1
                agora = datetime.now()

                for idx, alerta in enumerate(alertas_compativeis):
                    existe_notificacao = db.query(models.Notificacao).filter(
                        models.Notificacao.id_objeto == novo_objeto.id_objeto,
                        models.Notificacao.id_usuario == alerta.id_usuario_cadastro
                    ).first()

                    if not existe_notificacao:
                        nova_notif = models.Notificacao(
                            id_notificacao=prox_id_notif + idx,
                            id_objeto=novo_objeto.id_objeto,
                            id_usuario=alerta.id_usuario_cadastro,
                            data_hora=agora,
                            mensagem=f"Match Automático! Encontramos um item compatível com o seu alerta (Objeto #{novo_objeto.id_objeto}: {novo_objeto.descricao_publica[:60]}...)"
                        )
                        db.add(nova_notif)
                
                db.commit()

        return novo_objeto
    
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Erro de integridade: verifique se o id_objeto já existe ou se todas as chaves estrangeiras são válidas."
        )


# READ ALL (GET): Lista todos os objetos cadastrados (Oculta ou exibe o detalhe de segurança dependendo se é operador)
@router.get("/objetos", response_model=List[Union[schemas.ObjetoOperadorResponse, schemas.ObjetoResponse]], tags=["Objetos"])
def listar_objetos(id_usuario_logado: int = None, db: Session = Depends(get_db)):
    objetos = db.query(models.Objeto).all()
    e_operador = verificar_se_e_operador(id_usuario_logado, db)

    if not e_operador:
        for obj in objetos:
            obj.detalhe_seguranca_oculto = None

    return objetos


# READ ONE (GET): Busca um único objeto pelo seu ID na URL
@router.get("/objetos/{id_objeto}", response_model=Union[schemas.ObjetoOperadorResponse, schemas.ObjetoResponse], tags=["Objetos"])
def buscar_objeto(id_objeto: int, id_usuario_logado: int = None, db: Session = Depends(get_db)):
    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == id_objeto).first()
    if not objeto:
        raise HTTPException(status_code=404, detail="Objeto não encontrado.")
    
    e_operador = verificar_se_e_operador(id_usuario_logado, db)
    if not e_operador:
        objeto.detalhe_seguranca_oculto = None

    return objeto


# UPDATE (PUT): Atualiza parcialmente os dados de um objeto existente
@router.put("/objetos/{id_objeto}", response_model=schemas.ObjetoResponse, tags=["Objetos"])
def atualizar_objeto(id_objeto: int, dados: schemas.ObjetoUpdate, db: Session = Depends(get_db)):
    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == id_objeto).first()
    if not objeto:
        raise HTTPException(status_code=404, detail="Objeto não encontrado.")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(objeto, campo, valor)

    try:
        db.commit()
        db.refresh(objeto)
        return objeto
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Chave estrangeira inválida na atualização.")


# DELETE (DELETE): Remove um objeto e, por cascata, suas imagens/notificações/reivindicações
@router.delete("/objetos/{id_objeto}", tags=["Objetos"])
def deletar_objeto(id_objeto: int, db: Session = Depends(get_db)):
    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == id_objeto).first()
    if not objeto:
        raise HTTPException(status_code=404, detail="Objeto não encontrado.")
    db.delete(objeto)
    db.commit()
    return {"mensagem": f"Objeto {id_objeto} removido com sucesso."}


# ==============================================================================
# CRUD DE USUÁRIO E SUBCLASSES (Especialização 1:1)
# ==============================================================================

@router.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED, tags=["Usuários e Perfis"])
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    novo = models.Usuario(**usuario.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID, e-mail ou CPF já cadastrado no sistema.")


@router.get("/usuarios", response_model=List[schemas.UsuarioResponse], tags=["Usuários e Perfis"])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()


@router.put("/usuarios/{id_usuario}", response_model=schemas.UsuarioResponse, tags=["Usuários e Perfis"])
def atualizar_usuario(id_usuario: int, dados: schemas.UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)

    try:
        db.commit()
        db.refresh(usuario)
        return usuario
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="E-mail duplicado.")


@router.delete("/usuarios/{id_usuario}", tags=["Usuários e Perfis"])
def deletar_usuario(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    try:
        db.delete(usuario)
        db.commit()
        return {"mensagem": f"Usuário {id_usuario} removido com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir usuário que possui objetos ou reivindicações vinculadas.")
    

@router.post("/usuarios/membro-ufsc", response_model=schemas.MembroUfscResponse, tags=["Usuários e Perfis"])
def vincular_membro_ufsc(dados: schemas.MembroUfscCreate, db: Session = Depends(get_db)):
    membro = models.MembroUfsc(**dados.model_dump())
    try:
        db.add(membro)
        db.commit()
        db.refresh(membro)
        return membro
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Usuário inexistente ou matrícula UFSC já vinculada.")


@router.get("/usuarios/membro-ufsc", response_model=List[schemas.MembroUfscResponse], tags=["Usuários e Perfis"])
def listar_membros_ufsc(db: Session = Depends(get_db)):
    return db.query(models.MembroUfsc).all()


@router.put("/usuarios/membro-ufsc/{id_usuario}", response_model=schemas.MembroUfscResponse, tags=["Usuários e Perfis"], summary="Atualizar matrícula de Membro UFSC")
def atualizar_membro_ufsc(id_usuario: int, dados: schemas.MembroUfscUpdate, db: Session = Depends(get_db)):
    membro = db.query(models.MembroUfsc).filter(models.MembroUfsc.id_usuario == id_usuario).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Vínculo de Membro UFSC não encontrado.")
    membro.matricula_ufsc = dados.matricula_ufsc
    try:
        db.commit()
        db.refresh(membro)
        return membro
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Matrícula UFSC já pertencente a outro usuário.")


@router.delete("/usuarios/membro-ufsc/{id_usuario}", tags=["Usuários e Perfis"], summary="Remover vínculo de Membro UFSC")
def deletar_membro_ufsc(id_usuario: int, db: Session = Depends(get_db)):
    membro = db.query(models.MembroUfsc).filter(models.MembroUfsc.id_usuario == id_usuario).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Vínculo de Membro UFSC não encontrado.")
    db.delete(membro)
    db.commit()
    return {"mensagem": f"Vínculo de Membro UFSC do usuário {id_usuario} removido."}


@router.post("/usuarios/operador", response_model=schemas.OperadorResponse, tags=["Usuários e Perfis"])
def vincular_operador(dados: schemas.OperadorCreate, db: Session = Depends(get_db)):
    op = models.Operador(**dados.model_dump())
    try:
        db.add(op)
        db.commit()
        db.refresh(op)
        return op
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Usuário inexistente ou já cadastrado como operador.")


@router.get("/usuarios/operador", response_model=List[schemas.OperadorResponse], tags=["Usuários e Perfis"], summary="Listar operadores")
def listar_operadores(db: Session = Depends(get_db)):
    return db.query(models.Operador).all()


@router.delete("/usuarios/operador/{id_usuario}", tags=["Usuários e Perfis"], summary="Remover vínculo de Operador")
def deletar_operador(id_usuario: int, db: Session = Depends(get_db)):
    op = db.query(models.Operador).filter(models.Operador.id_usuario == id_usuario).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operador não encontrado.")
    db.delete(op)
    db.commit()
    return {"mensagem": f"Vínculo de Operador do usuário {id_usuario} removido."}


@router.post("/usuarios/visitante", response_model=schemas.VisitanteResponse, tags=["Usuários e Perfis"])
def vincular_visitante(dados: schemas.VisitanteCreate, db: Session = Depends(get_db)):
    vis = models.Visitante(**dados.model_dump())
    try:
        db.add(vis)
        db.commit()
        db.refresh(vis)
        return vis
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Usuário inexistente ou já cadastrado como visitante.")


@router.get("/usuarios/visitante", response_model=List[schemas.VisitanteResponse], tags=["Usuários e Perfis"], summary="Listar visitantes")
def listar_visitantes(db: Session = Depends(get_db)):
    return db.query(models.Visitante).all()


@router.delete("/usuarios/visitante/{id_usuario}", tags=["Usuários e Perfis"], summary="Remover vínculo de Visitante")
def deletar_visitante(id_usuario: int, db: Session = Depends(get_db)):
    vis = db.query(models.Visitante).filter(models.Visitante.id_usuario == id_usuario).first()
    if not vis:
        raise HTTPException(status_code=404, detail="Visitante não encontrado.")
    db.delete(vis)
    db.commit()
    return {"mensagem": f"Vínculo de Visitante do usuário {id_usuario} removido."}


# ==============================================================================
# CRUD DE REIVINDICAÇÃO (Solicitações de Posse dos Itens)
# ==============================================================================

@router.post("/reivindicacoes", response_model=schemas.ReivindicacaoResponse, status_code=status.HTTP_201_CREATED, tags=["Reivindicações"])
def criar_reivindicacao(dados: schemas.ReivindicacaoCreate, db: Session = Depends(get_db)):
    # 1. Verifica se o objeto realmente existe
    objeto = db.query(models.Objeto).filter(models.Objeto.id_objeto == dados.id_objeto).first()
    if not objeto:
        raise HTTPException(status_code=404, detail="Objeto não encontrado.")

    # 2. Regra de Negócio: Verifica se já existe uma reivindicação ativa (EM_ANALISE) para este objeto
    reivindicacao_existente = db.query(models.Reivindicacao).filter(
        models.Reivindicacao.id_objeto == dados.id_objeto,
        models.Reivindicacao.status == models.StatusReivindicacao.EM_ANALISE
    ).first()

    if reivindicacao_existente:
        raise HTTPException(
            status_code=400, 
            detail="Este objeto já possui uma reivindicação em processo de análise por outro usuário."
        )

    # 3. Se não houver conflito, cria a nova reivindicação
    nova = models.Reivindicacao(**dados.model_dump())
    try:
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Verifique se id_reivindicacao é único e se usuário/objeto existem.")


@router.get("/reivindicacoes", response_model=List[schemas.ReivindicacaoResponse], tags=["Reivindicações"])
def listar_reivindicacoes(db: Session = Depends(get_db)):
    return db.query(models.Reivindicacao).all()


@router.put("/reivindicacoes/{id_reivindicacao}", response_model=schemas.ReivindicacaoResponse, tags=["Reivindicações"])
def atualizar_status_reivindicacao(id_reivindicacao: int, dados: schemas.ReivindicacaoUpdate, db: Session = Depends(get_db)):
    reiv = db.query(models.Reivindicacao).filter(models.Reivindicacao.id_reivindicacao == id_reivindicacao).first()
    if not reiv:
        raise HTTPException(status_code=404, detail="Reivindicação não encontrada.")
    reiv.status = dados.status
    db.commit()
    db.refresh(reiv)
    return reiv


@router.delete("/reivindicacoes/{id_reivindicacao}", tags=["Reivindicações"])
def deletar_reivindicacao(id_reivindicacao: int, db: Session = Depends(get_db)):
    reiv = db.query(models.Reivindicacao).filter(models.Reivindicacao.id_reivindicacao == id_reivindicacao).first()
    if not reiv:
        raise HTTPException(status_code=404, detail="Reivindicação não encontrada.")
    db.delete(reiv)
    db.commit()
    return {"mensagem": f"Reivindicação {id_reivindicacao} removida."}


# ==============================================================================
# CRUD DE CATÁLOGOS E LOCALIZAÇÃO (Tabelas Auxiliares e Hierarquia Espacial)
# ==============================================================================

@router.post("/blocos", response_model=schemas.BlocoPredioResponse, tags=["Locais e Catálogos"])
def criar_bloco(dados: schemas.BlocoPredioCreate, db: Session = Depends(get_db)):
    novo = models.BlocoPredio(**dados.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Bloco já cadastrado.")


@router.get("/blocos", response_model=List[schemas.BlocoPredioResponse], tags=["Locais e Catálogos"])
def listar_blocos(db: Session = Depends(get_db)):
    return db.query(models.BlocoPredio).all()


@router.put("/blocos/{id_bloco}", response_model=schemas.BlocoPredioResponse, tags=["Locais e Catálogos"], summary="Atualizar nome do bloco")
def atualizar_bloco(id_bloco: int, dados: schemas.BlocoPredioBase, db: Session = Depends(get_db)):
    bloco = db.query(models.BlocoPredio).filter(models.BlocoPredio.id_bloco == id_bloco).first()
    if not bloco:
        raise HTTPException(status_code=404, detail="Bloco não encontrado.")
    bloco.nome = dados.nome
    try:
        db.commit()
        db.refresh(bloco)
        return bloco
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe outro bloco com esse nome.")


@router.delete("/blocos/{id_bloco}", tags=["Locais e Catálogos"], summary="Excluir bloco")
def deletar_bloco(id_bloco: int, db: Session = Depends(get_db)):
    bloco = db.query(models.BlocoPredio).filter(models.BlocoPredio.id_bloco == id_bloco).first()
    if not bloco:
        raise HTTPException(status_code=404, detail="Bloco não encontrado.")
    try:
        db.delete(bloco)
        db.commit()
        return {"mensagem": f"Bloco {id_bloco} removido com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir um bloco que possui locais específicos vinculados.")


@router.post("/locais", response_model=schemas.LocalEspecificoResponse, tags=["Locais e Catálogos"])
def criar_local(dados: schemas.LocalEspecificoCreate, db: Session = Depends(get_db)):
    novo = models.LocalEspecifico(**dados.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID duplicado ou id_bloco inexistente.")


@router.get("/locais", response_model=List[schemas.LocalEspecificoResponse], tags=["Locais e Catálogos"])
def listar_locais(db: Session = Depends(get_db)):
    return db.query(models.LocalEspecifico).all()


@router.put("/locais/{id_local}", response_model=schemas.LocalEspecificoResponse, tags=["Locais e Catálogos"], summary="Atualizar local específico")
def atualizar_local(id_local: int, dados: schemas.LocalEspecificoUpdate, db: Session = Depends(get_db)):
    local = db.query(models.LocalEspecifico).filter(models.LocalEspecifico.id_local == id_local).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(local, campo, valor)
    try:
        db.commit()
        db.refresh(local)
        return local
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="id_bloco informado não existe.")


@router.delete("/locais/{id_local}", tags=["Locais e Catálogos"], summary="Excluir local específico")
def deletar_local(id_local: int, db: Session = Depends(get_db)):
    local = db.query(models.LocalEspecifico).filter(models.LocalEspecifico.id_local == id_local).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    try:
        db.delete(local)
        db.commit()
        return {"mensagem": f"Local {id_local} removido com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir um local vinculado a objetos cadastrados.")


@router.post("/categorias", response_model=schemas.CategoriaResponse, tags=["Locais e Catálogos"])
def criar_categoria(dados: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    nova = models.Categoria(**dados.model_dump())
    try:
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Categoria já existe.")


@router.get("/categorias", response_model=List[schemas.CategoriaResponse], tags=["Locais e Catálogos"])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()


@router.put("/categorias/{id_categoria}", response_model=schemas.CategoriaResponse, tags=["Locais e Catálogos"], summary="Atualizar categoria")
def atualizar_categoria(id_categoria: int, dados: schemas.CategoriaBase, db: Session = Depends(get_db)):
    cat = db.query(models.Categoria).filter(models.Categoria.id_categoria == id_categoria).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    cat.nome = dados.nome
    try:
        db.commit()
        db.refresh(cat)
        return cat
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma categoria com esse nome.")


@router.delete("/categorias/{id_categoria}", tags=["Locais e Catálogos"], summary="Excluir categoria")
def deletar_categoria(id_categoria: int, db: Session = Depends(get_db)):
    cat = db.query(models.Categoria).filter(models.Categoria.id_categoria == id_categoria).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    try:
        db.delete(cat)
        db.commit()
        return {"mensagem": f"Categoria {id_categoria} removida com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir uma categoria em uso por objetos.")


@router.post("/cores", response_model=schemas.CorResponse, tags=["Locais e Catálogos"])
def criar_cor(dados: schemas.CorCreate, db: Session = Depends(get_db)):
    nova = models.Cor(**dados.model_dump())
    try:
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cor já existe.")


@router.get("/cores", response_model=List[schemas.CorResponse], tags=["Locais e Catálogos"])
def listar_cores(db: Session = Depends(get_db)):
    return db.query(models.Cor).all()


@router.put("/cores/{id_cor}", response_model=schemas.CorResponse, tags=["Locais e Catálogos"], summary="Atualizar cor")
def atualizar_cor(id_cor: int, dados: schemas.CorBase, db: Session = Depends(get_db)):
    cor = db.query(models.Cor).filter(models.Cor.id_cor == id_cor).first()
    if not cor:
        raise HTTPException(status_code=404, detail="Cor não encontrada.")
    cor.nome = dados.nome
    try:
        db.commit()
        db.refresh(cor)
        return cor
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Já existe uma cor com esse nome.")


@router.delete("/cores/{id_cor}", tags=["Locais e Catálogos"], summary="Excluir cor")
def deletar_cor(id_cor: int, db: Session = Depends(get_db)):
    cor = db.query(models.Cor).filter(models.Cor.id_cor == id_cor).first()
    if not cor:
        raise HTTPException(status_code=404, detail="Cor não encontrada.")
    try:
        db.delete(cor)
        db.commit()
        return {"mensagem": f"Cor {id_cor} removida com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir uma cor em uso por objetos.")


@router.post("/status", response_model=schemas.StatusResponse, status_code=status.HTTP_201_CREATED, tags=["Locais e Catálogos"], summary="Criar novo status")
def criar_status(dados: schemas.StatusCreate, db: Session = Depends(get_db)):
    novo = models.Status(**dados.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID de status já cadastrado.")


@router.get("/status", response_model=List[schemas.StatusResponse], tags=["Locais e Catálogos"])
def listar_status(db: Session = Depends(get_db)):
    return db.query(models.Status).all()


@router.put("/status/{id_status}", response_model=schemas.StatusResponse, tags=["Locais e Catálogos"], summary="Atualizar descrição do status")
def atualizar_status(id_status: int, dados: schemas.StatusBase, db: Session = Depends(get_db)):
    st = db.query(models.Status).filter(models.Status.id_status == id_status).first()
    if not st:
        raise HTTPException(status_code=404, detail="Status não encontrado.")
    st.descricao = dados.descricao
    db.commit()
    db.refresh(st)
    return st


@router.delete("/status/{id_status}", tags=["Locais e Catálogos"], summary="Excluir status")
def deletar_status(id_status: int, db: Session = Depends(get_db)):
    st = db.query(models.Status).filter(models.Status.id_status == id_status).first()
    if not st:
        raise HTTPException(status_code=404, detail="Status não encontrado.")
    try:
        db.delete(st)
        db.commit()
        return {"mensagem": f"Status {id_status} removido com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir um status vinculado a objetos.")


@router.post("/tipos-registro", response_model=schemas.TipoRegistroResponse, status_code=status.HTTP_201_CREATED, tags=["Locais e Catálogos"], summary="Criar novo tipo de registro")
def criar_tipo_registro(dados: schemas.TipoRegistroCreate, db: Session = Depends(get_db)):
    novo = models.TipoRegistro(**dados.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID de tipo de registro já cadastrado.")

    
@router.get("/tipos-registro", response_model=List[schemas.TipoRegistroResponse], tags=["Locais e Catálogos"])
def listar_tipos_registro(db: Session = Depends(get_db)):
    return db.query(models.TipoRegistro).all()


@router.put("/tipos-registro/{id_tipo}", response_model=schemas.TipoRegistroResponse, tags=["Locais e Catálogos"], summary="Atualizar tipo de registro")
def atualizar_tipo_registro(id_tipo: int, dados: schemas.TipoRegistroBase, db: Session = Depends(get_db)):
    tipo = db.query(models.TipoRegistro).filter(models.TipoRegistro.id_tipo == id_tipo).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de registro não encontrado.")
    tipo.descricao = dados.descricao
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/tipos-registro/{id_tipo}", tags=["Locais e Catálogos"], summary="Excluir tipo de registro")
def deletar_tipo_registro(id_tipo: int, db: Session = Depends(get_db)):
    tipo = db.query(models.TipoRegistro).filter(models.TipoRegistro.id_tipo == id_tipo).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de registro não encontrado.")
    try:
        db.delete(tipo)
        db.commit()
        return {"mensagem": f"Tipo de registro {id_tipo} removido com sucesso."}
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Não é possível excluir um tipo de registro vinculado a objetos.")


# ==============================================================================
# TABELAS SATÉLITES (Auditoria, Imagens e Notificações)
# ==============================================================================

@router.post("/imagens", response_model=schemas.ImagemResponse, tags=["Auditoria, Imagens e Notificações"])
def adicionar_imagem(dados: schemas.ImagemCreate, db: Session = Depends(get_db)):
    nova = models.Imagem(**dados.model_dump())
    try:
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID duplicado ou id_objeto inexistente.")


@router.get("/imagens", response_model=List[schemas.ImagemResponse], tags=["Auditoria, Imagens e Notificações"])
def listar_imagens(db: Session = Depends(get_db)):
    return db.query(models.Imagem).all()


@router.put("/imagens/{id_imagem}", response_model=schemas.ImagemResponse, tags=["Auditoria, Imagens e Notificações"], summary="Alterar caminho/URL da imagem")
def atualizar_imagem(id_imagem: int, dados: schemas.ImagemUpdate, db: Session = Depends(get_db)):
    img = db.query(models.Imagem).filter(models.Imagem.id_imagem == id_imagem).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada.")
    img.url_caminho = dados.url_caminho
    db.commit()
    db.refresh(img)
    return img


@router.delete("/imagens/{id_imagem}", tags=["Auditoria, Imagens e Notificações"], summary="Remover imagem")
def deletar_imagem(id_imagem: int, db: Session = Depends(get_db)):
    img = db.query(models.Imagem).filter(models.Imagem.id_imagem == id_imagem).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada.")
    db.delete(img)
    db.commit()
    return {"mensagem": f"Imagem {id_imagem} removida com sucesso."}


@router.post("/notificacoes", response_model=schemas.NotificacaoResponse, tags=["Auditoria, Imagens e Notificações"])
def criar_notificacao(dados: schemas.NotificacaoCreate, db: Session = Depends(get_db)):
    nova = models.Notificacao(**dados.model_dump())
    try:
        db.add(nova)
        db.commit()
        db.refresh(nova)
        return nova
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID duplicado ou usuário/objeto inexistente.")


@router.get("/notificacoes", response_model=List[schemas.NotificacaoResponse], tags=["Auditoria, Imagens e Notificações"])
def listar_notificacoes(db: Session = Depends(get_db)):
    return db.query(models.Notificacao).all()


@router.put("/notificacoes/{id_notificacao}", response_model=schemas.NotificacaoResponse, tags=["Auditoria, Imagens e Notificações"], summary="Editar texto da notificação")
def atualizar_notificacao(id_notificacao: int, dados: schemas.NotificacaoUpdate, db: Session = Depends(get_db)):
    notif = db.query(models.Notificacao).filter(models.Notificacao.id_notificacao == id_notificacao).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    notif.mensagem = dados.mensagem
    db.commit()
    db.refresh(notif)
    return notif


@router.delete("/notificacoes/{id_notificacao}", tags=["Auditoria, Imagens e Notificações"], summary="Excluir notificação")
def deletar_notificacao(id_notificacao: int, db: Session = Depends(get_db)):
    notif = db.query(models.Notificacao).filter(models.Notificacao.id_notificacao == id_notificacao).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    db.delete(notif)
    db.commit()
    return {"mensagem": f"Notificação {id_notificacao} removida com sucesso."}


@router.post("/auditoria", response_model=schemas.HistoricoAuditoriaResponse, tags=["Auditoria, Imagens e Notificações"])
def registrar_auditoria(dados: schemas.HistoricoAuditoriaCreate, db: Session = Depends(get_db)):
    novo = models.HistoricoAuditoria(**dados.model_dump())
    try:
        db.add(novo)
        db.commit()
        db.refresh(novo)
        return novo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="ID duplicado ou usuário/objeto inexistente.")


@router.get("/auditoria", response_model=List[schemas.HistoricoAuditoriaResponse], tags=["Auditoria, Imagens e Notificações"])
def listar_auditoria(db: Session = Depends(get_db)):
    return db.query(models.HistoricoAuditoria).all()


@router.put("/auditoria/{id_historico}", response_model=schemas.HistoricoAuditoriaResponse, tags=["Auditoria, Imagens e Notificasjoner"], summary="Corrigir registro de auditoria")
def atualizar_auditoria(id_historico: int, dados: schemas.HistoricoAuditoriaUpdate, db: Session = Depends(get_db)):
    hist = db.query(models.HistoricoAuditoria).filter(models.HistoricoAuditoria.id_historico == id_historico).first()
    if not hist:
        raise HTTPException(status_code=404, detail="Registro de auditoria não encontrado.")
    hist.tipo_transacao = dados.tipo_transacao
    db.commit()
    db.refresh(hist)
    return hist


@router.delete("/auditoria/{id_historico}", tags=["Auditoria, Imagens e Notificações"], summary="Remover registro de auditoria")
def deletar_auditoria(id_historico: int, db: Session = Depends(get_db)):
    hist = db.query(models.HistoricoAuditoria).filter(models.HistoricoAuditoria.id_historico == id_historico).first()
    if not hist:
        raise HTTPException(status_code=404, detail="Registro de auditoria não encontrado.")
    db.delete(hist)
    db.commit()
    return {"mensagem": f"Registro de auditoria {id_historico} removido com sucesso."}