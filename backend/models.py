# Define como as tabelas existem dentro do PostgreSQL(chaves primárias, estrangeiras, tipos SQL)

# Mapeia as tabelas ligando a classe Python ao nome exato da tabela no PostgreSQL
# Define as colunas e restricoes 
# Define os vinculos reais entre tabelas por meio das chaves estrangeiras
# Facilita a navegacao no Python como acessar itens sem precisar montar JOIN manualmente para leituras simples

from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey    # Traduzem os tipos do Python para os tipos importados e criam chaves estrangeiras
from sqlalchemy.orm import relationship                                             # Cria ligacoes logicas sem a necessidade de usar um join
from database import Base                                                           # Importa a classe-mae criada no database.py


# Tabelas de dominio/ catalogo: São independente(sem fk) - Status, TipoRegistro, Cor, Categoria, BlocoPredio
class Status(Base):                                                     # Entra no catalogo interno do SQLAlchemy 
    __tablename__ = "status"                                            # Nome seguindo o padrao do postgreSQL

    id_status = Column(Integer, primary_key=True, index=True)          
    descricao = Column(Text, nullable=False)                            #nullable=False: NOT NULL | nullable=True: permite NULL

    objetos = relationship("Objeto", back_populates="status")


class TipoRegistro(Base):
    __tablename__ = "tipo_registro"

    id_tipo = Column(Integer, primary_key=True, index=True)
    descricao = Column(Text, nullable=False)

    objetos = relationship("Objeto", back_populates="tipo_registro")


class Cor(Base):
    __tablename__ = "cor"

    id_cor = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)

    objetos = relationship("Objeto", back_populates="cor")              # Cria uma lista de objeto por cor


class Categoria(Base):
    __tablename__ = "categoria"

    id_categoria = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)

    objetos = relationship("Objeto", back_populates="categoria")        


class BlocoPredio(Base):
    __tablename__ = "bloco_predio"

    id_bloco = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)

    locais = relationship("LocalEspecifico", back_populates="bloco")    # Cria uma lista de localespecifico por bloco

# Hieraruia de localizacao: local.bloco.nome devolve o nome do predio sem criar outra consulta
class LocalEspecifico(Base):
    __tablename__ = "local_especifico"

    id_local = Column(Integer, primary_key=True, index=True)
    id_bloco = Column(Integer, ForeignKey("bloco_predio.id_bloco"), nullable=False)
    nome = Column(String(100), nullable=False)

    bloco = relationship("BlocoPredio", back_populates="locais")        # Cria um atributo bloco no objeto python, como uma sala que fica em apenas um predio
    objetos = relationship("Objeto", back_populates="local")            # Conecta o local aos objetos

# Genrealizacao/ especializacao usuarios: uselist=False: Avisa ao SQLAlchemy que o relacionamento é 1 para 1 | cascade="all, delete-orphan": Se um Usuario for excluído do banco, o SQLAlchemy apaga automaticamente o registro filho correspondente
class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)                # Só pode haver um valor do item na tabela
    cpf = Column(String(14), nullable=False, unique=True)

    # Relacionamentos 1:1 com subclasses
    membro_ufsc = relationship("MembroUfsc", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    visitante = relationship("Visitante", back_populates="usuario", uselist=False, cascade="all, delete-orphan")
    operador = relationship("Operador", back_populates="usuario", uselist=False, cascade="all, delete-orphan")

    # Relacionamentos 1:N
    objetos_cadastrados = relationship("Objeto", back_populates="usuario_cadastro")
    historicos = relationship("HistoricoAuditoria", back_populates="usuario")
    notificacoes = relationship("Notificacao", back_populates="usuario")
    reivindicacoes = relationship("Reivindicacao", back_populates="usuario")


class MembroUfsc(Base):
    __tablename__ = "membro_ufsc"

    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)
    matricula_ufsc = Column(Integer, nullable=False, unique=True)

    usuario = relationship("Usuario", back_populates="membro_ufsc")


class Visitante(Base):
    __tablename__ = "visitante"

    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)

    usuario = relationship("Usuario", back_populates="visitante")


class Operador(Base):
    __tablename__ = "operador"

    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), primary_key=True)

    usuario = relationship("Usuario", back_populates="operador")

# Entidade central(Objeto) e Satelites(HistoricoAuditoria, Imagem, Notificacao, Reivindicacao): O cascade="all, delete-orphan" configurado dentro de Objeto garante, suas imagens, notificações, históricos e reivindicações vinculadas sejam removidos em cascata sem travar o banco.
class Objeto(Base):
    __tablename__ = "objeto"

    id_objeto = Column(Integer, primary_key=True, index=True)
    descricao_publica = Column(Text, nullable=False)
    detalhe_seguranca_oculto = Column(Text, nullable=True)
    data_registro = Column(Date, nullable=False)
    data_vencimento = Column(Date, nullable=True)

    id_usuario_cadastro = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_status = Column(Integer, ForeignKey("status.id_status"), nullable=False)
    id_cor = Column(Integer, ForeignKey("cor.id_cor"), nullable=False)
    id_categoria = Column(Integer, ForeignKey("categoria.id_categoria"), nullable=False)
    id_local = Column(Integer, ForeignKey("local_especifico.id_local"), nullable=False)
    id_tipo = Column(Integer, ForeignKey("tipo_registro.id_tipo"), nullable=False)

    usuario_cadastro = relationship("Usuario", back_populates="objetos_cadastrados")
    status = relationship("Status", back_populates="objetos")
    cor = relationship("Cor", back_populates="objetos")
    categoria = relationship("Categoria", back_populates="objetos")
    local = relationship("LocalEspecifico", back_populates="objetos")
    tipo_registro = relationship("TipoRegistro", back_populates="objetos")

    historicos = relationship("HistoricoAuditoria", back_populates="objeto", cascade="all, delete-orphan")
    imagens = relationship("Imagem", back_populates="objeto", cascade="all, delete-orphan")
    notificacoes = relationship("Notificacao", back_populates="objeto", cascade="all, delete-orphan")
    reivindicacoes = relationship("Reivindicacao", back_populates="objeto", cascade="all, delete-orphan")


class HistoricoAuditoria(Base):
    __tablename__ = "historico_auditoria"

    id_historico = Column(Integer, primary_key=True, index=True)
    id_objeto = Column(Integer, ForeignKey("objeto.id_objeto"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    data_hora = Column(DateTime, nullable=False)
    tipo_transacao = Column(String(100), nullable=False)

    objeto = relationship("Objeto", back_populates="historicos")
    usuario = relationship("Usuario", back_populates="historicos")


class Imagem(Base):
    __tablename__ = "imagem"

    id_imagem = Column(Integer, primary_key=True, index=True)
    id_objeto = Column(Integer, ForeignKey("objeto.id_objeto"), nullable=False)
    url_caminho = Column(Text, nullable=False)

    objeto = relationship("Objeto", back_populates="imagens")


class Notificacao(Base):
    __tablename__ = "notificacao"

    id_notificacao = Column(Integer, primary_key=True, index=True)
    id_objeto = Column(Integer, ForeignKey("objeto.id_objeto"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    data_hora = Column(DateTime, nullable=False)
    mensagem = Column(Text, nullable=False)

    objeto = relationship("Objeto", back_populates="notificacoes")
    usuario = relationship("Usuario", back_populates="notificacoes")


class Reivindicacao(Base):
    __tablename__ = "reivindicacao"

    id_reivindicacao = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, nullable=False)
    justificativa_segredo = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="PENDENTE")                 #Define um valor automatico caso nada seja informado na insercao
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    id_objeto = Column(Integer, ForeignKey("objeto.id_objeto"), nullable=False)

    usuario = relationship("Usuario", back_populates="reivindicacoes")
    objeto = relationship("Objeto", back_populates="reivindicacoes")