#Define como os dados trafegam dentro do Python (o que o usuário digita no menu ou o que a IA retorna) antes de irem para o banco.

#Aqui ocorre a parametrizacao correta dos dados que entram na tabela
#Se algo estiver fora dos conformes como um email sem @, o Pydantic barra imediatamente
#Faz a conversao automatica dos valores para o tipo correto
#Facilita o uso da da API do Gemini/LLM ao forcar o modelo a devolver dados extamente nos campos definidos,
#prontos para serem salvos ou pesquoisados no banco sem precisar limpar o texto livre


from datetime import date, datetime                             # Traz os tipos reais de data deata hora do Python e bloqueia vlaores impossiveis
from typing import Optional, List                               # Indicacao de campo nao obrigatorio,  e campos com lista de elementops de determinado tipo
from pydantic import BaseModel, EmailStr, Field, ConfigDict     # Improtar a classe mae de todos os schemas, formato especial do email, field permite adicionar regras de tamanho e configDict é o dicionario de ocnfiguracoes internas do Pydantic v2


# ==========================================
# TABELAS DE DOMÍNIO / CATÁLOGO
# ==========================================

class StatusBase(BaseModel):
    descricao: str = Field(..., min_length=2)

class StatusCreate(StatusBase):
    id_status: int = Field(..., gt=0)

class StatusResponse(StatusCreate):
    model_config = ConfigDict(from_attributes=True)


class TipoRegistroBase(BaseModel):
    descricao: str = Field(..., min_length=2)

class TipoRegistroCreate(TipoRegistroBase):
    id_tipo: int = Field(..., gt=0)

class TipoRegistroResponse(TipoRegistroCreate):
    model_config = ConfigDict(from_attributes=True)


class CorBase(BaseModel):                                       # Define o que é comum em qualquer opercao com cor 
    nome: str = Field(..., min_length=2, max_length=100)        # Os três pontinhos significam que o campo é obrigatorio

class CorCreate(CorBase):                                       # Herda nome da CorBase
    id_cor: int = Field(..., gt=0)                              # adicona id_cor | gt=0 maior que 0

class CorResponse(CorCreate):                                   # Define o formato da resposta que a API devovle ao cliente
    model_config = ConfigDict(from_attributes=True)             # O SQLAlchemy devolve objetos Python, enquanto o FastAPI devolve JSON


class CategoriaBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)        

class CategoriaCreate(CategoriaBase):
    id_categoria: int = Field(..., gt=0)

class CategoriaResponse(CategoriaCreate):
    model_config = ConfigDict(from_attributes=True)


class BlocoPredioBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)

class BlocoPredioCreate(BlocoPredioBase):
    id_bloco: int = Field(..., gt=0)

class BlocoPredioResponse(BlocoPredioCreate):
    model_config = ConfigDict(from_attributes=True)


class LocalEspecificoBase(BaseModel):
    id_bloco: int = Field(..., gt=0)                        # Todo local especifico deve estar associado a um bloco
    nome: str = Field(..., min_length=2, max_length=100)

class LocalEspecificoCreate(LocalEspecificoBase):
    id_local: int = Field(..., gt=0)

class LocalEspecificoUpdate(BaseModel):
    id_bloco: Optional[int] = Field(None, gt=0)
    nome: Optional[str] = Field(None, min_length=2, max_length=100)

class LocalEspecificoResponse(LocalEspecificoCreate):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# USUÁRIOS E SUBCLASSES
# ==========================================

class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr                                         # Valida formato real de e-mail (exige @ e domínio)
    cpf: str = Field(..., min_length=11, max_length=14)

class UsuarioCreate(UsuarioBase):                           
    id_usuario: int = Field(..., gt=0, examples=[100], description="Use ID >= 100 para não colidir com a carga inicial (1 a 6)")

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=100)     
    email: Optional[EmailStr] = None                        # O optional com o valor None permite que só um cmapo seja atualizado                  

class UsuarioResponse(UsuarioCreate):
    model_config = ConfigDict(from_attributes=True)


class MembroUfscCreate(BaseModel):
    id_usuario: int = Field(..., gt=0)
    matricula_ufsc: int = Field(..., gt=0)

class MembroUfscUpdate(BaseModel):
    matricula_ufsc: int = Field(..., gt=0)

class MembroUfscResponse(MembroUfscCreate):
    model_config = ConfigDict(from_attributes=True)


class VisitanteCreate(BaseModel):
    id_usuario: int = Field(..., gt=0)

class VisitanteResponse(VisitanteCreate):
    model_config = ConfigDict(from_attributes=True)


class OperadorCreate(BaseModel):
    id_usuario: int = Field(..., gt=0)

class OperadorResponse(OperadorCreate):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# ENTIDADE CENTRAL: OBJETO
# ==========================================

class ObjetoBase(BaseModel):
    descricao_publica: str = Field(..., min_length=5)
    data_registro: date
    data_vencimento: Optional[date] = None
    id_usuario_cadastro: int = Field(..., gt=0)
    id_status: int = Field(..., gt=0)
    id_cor: int = Field(..., gt=0)
    id_categoria: int = Field(..., gt=0)
    id_local: int = Field(..., gt=0)
    id_tipo: int = Field(..., gt=0)

class ObjetoCreate(ObjetoBase):
    id_objeto: int = Field(..., gt=0, examples=[100], description="Use ID >= 100 para não colidir com a carga inicial (1 a 10)")
    # O segredo entra apenas na criação/atualização, nunca na resposta pública
    detalhe_seguranca_oculto: str = Field(..., min_length=3, examples=["Adesivo azul na tampa interna"])

class ObjetoUpdate(BaseModel):                      
    descricao_publica: Optional[str] = None
    detalhe_seguranca_oculto: Optional[str] = None
    data_vencimento: Optional[date] = None
    id_status: Optional[int] = Field(None, gt=0)
    id_local: Optional[int] = Field(None, gt=0)

class ObjetoResponse(ObjetoBase):                       # Herda ObjetoBase + ObjetoCreate, mas sem o detalhe_seguranca_oculto
    id_objeto: int
    model_config = ConfigDict(from_attributes=True)

class ObjetoOperadorResponse(ObjetoResponse):           # Resposta estendida exclusiva para operadores
    detalhe_seguranca_oculto: Optional[str] = None


# ==========================================
# TABELAS SATÉLITES (AUDITORIA, IMAGEM, NOTIFICAÇÃO, REIVINDICAÇÃO)
# ==========================================

class HistoricoAuditoriaCreate(BaseModel):
    id_historico: int = Field(..., gt=0)
    id_objeto: int = Field(..., gt=0)
    id_usuario: int = Field(..., gt=0)
    data_hora: datetime
    tipo_transacao: str = Field(..., min_length=2, max_length=100)

class HistoricoAuditoriaUpdate(BaseModel):
    tipo_transacao: str = Field(..., min_length=2, max_length=100)

class HistoricoAuditoriaResponse(HistoricoAuditoriaCreate):
    model_config = ConfigDict(from_attributes=True)


class ImagemCreate(BaseModel):
    id_imagem: int = Field(..., gt=0)
    id_objeto: int = Field(..., gt=0)
    url_caminho: str = Field(..., min_length=5)

class ImagemUpdate(BaseModel):
    url_caminho: str = Field(..., min_length=5)

class ImagemResponse(ImagemCreate):
    model_config = ConfigDict(from_attributes=True)


class NotificacaoCreate(BaseModel):
    id_notificacao: int = Field(..., gt=0)
    id_objeto: int = Field(..., gt=0)
    id_usuario: int = Field(..., gt=0)
    data_hora: datetime
    mensagem: str = Field(..., min_length=3)

class NotificacaoUpdate(BaseModel):
    mensagem: str = Field(..., min_length=3)

class NotificacaoResponse(NotificacaoCreate):
    model_config = ConfigDict(from_attributes=True)


class ReivindicacaoCreate(BaseModel):                  
    id_reivindicacao: int = Field(..., gt=0, examples=[100], description="Use ID >= 100 para não colidir com a carga inicial (1 a 5)")
    data_hora: datetime
    justificativa_segredo: str = Field(..., min_length=5)
    status: str = Field(default="PENDENTE", max_length=30)
    id_usuario: int = Field(..., gt=0)
    id_objeto: int = Field(..., gt=0)

class ReivindicacaoUpdate(BaseModel):
    status: str = Field(..., max_length=30)

class ReivindicacaoResponse(ReivindicacaoCreate):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# IA GENERATIVA 
# ==========================================

class BuscaIAPrompt(BaseModel):
    descricao_usuario: str = Field(
        ...,
        min_length=3,
        examples=["Esqueci um carregador preto na biblioteca ontem à tarde"],
        description="Descrição livre do item perdido em linguagem natural"
    )

class ResultadoBuscaIA(BaseModel):
    id_objeto: int
    descricao_publica: str
    grau_compatibilidade: str
    justificativa: str