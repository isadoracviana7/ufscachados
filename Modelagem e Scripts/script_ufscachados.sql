-- Geração de Modelo físico
-- Sql ANSI 2003 - brModelo.



CREATE TABLE STATUS (
id_status Inteiro PRIMARY KEY,
descricao Texto(1000)
)

CREATE TABLE TIPO_REGISTRO (
id_tipo Inteiro PRIMARY KEY,
descricao Texto(1000)
)

CREATE TABLE COR (
id_cor Inteiro PRIMARY KEY,
nome Texto(100)
)

CREATE TABLE CATEGORIA (
id_categoria Inteiro PRIMARY KEY,
nome Texto(100)
)

CREATE TABLE LOCAL_ESPECIFICO (
id_local Inteiro PRIMARY KEY,
id_bloco Inteiro,
nome Texto(100)
)

CREATE TABLE BLOCO_PREDIO (
id_bloco Inteiro PRIMARY KEY,
nome Texto(100)
)

CREATE TABLE MEMBRO_UFSC (
matricula_ufsc Inteiro,
id_usuario Inteiro PRIMARY KEY
)

CREATE TABLE OPERADOR (
id_usuario Inteiro PRIMARY KEY
)

CREATE TABLE OBJETO (
data_vencimento Data,
descricao_publica Texto(1000),
id_objeto Inteiro PRIMARY KEY,
detalhe_seguranca_oculto Texto(100),
data_registro Data,
id_usuario_cadastro Inteiro,
id_status Inteiro,
id_cor Inteiro,
id_categoria Inteiro,
id_local Inteiro,
id_tipo Inteiro,
FOREIGN KEY(id_status) REFERENCES STATUS (id_status),
FOREIGN KEY(id_cor) REFERENCES COR (id_cor),
FOREIGN KEY(id_categoria) REFERENCES CATEGORIA (id_categoria),
FOREIGN KEY(id_local) REFERENCES LOCAL_ESPECIFICO (id_local),
FOREIGN KEY(id_tipo) REFERENCES TIPO_REGISTRO (id_tipo)
)

CREATE TABLE USUARIO (
email Texto(100),
nome Texto(100),
id_usuario Inteiro PRIMARY KEY,
cpf Texto(11)
)

CREATE TABLE HISTORICO_AUDITORIA (
id_objeto Inteiro,
id_usuario Inteiro,
id_historico Inteiro PRIMARY KEY,
data_hora Data/Hora,
tipo_transacao Texto(100),
FOREIGN KEY(id_objeto) REFERENCES OBJETO (id_objeto),
FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario)
)

CREATE TABLE IMAGEM (
id_imagem Inteiro PRIMARY KEY,
id_objeto Inteiro,
url_caminho Texto(1000),
FOREIGN KEY(id_objeto) REFERENCES OBJETO (id_objeto)
)

CREATE TABLE NOTIFICACAO (
id_objeto Inteiro,
id_usuario Inteiro,
id_notificacao Inteiro PRIMARY KEY,
data_hora Data/Hora,
mensagem Texto(1000),
FOREIGN KEY(id_objeto) REFERENCES OBJETO (id_objeto),
FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario)
)

CREATE TABLE REIVINDICACAO (
id_reivindicacao Inteiro PRIMARY KEY,
data_hora Data/Hora,
justificativa_segredo Texto(1000),
status Número(30),
id_usuario Inteiro,
id_objeto Inteiro,
FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario),
FOREIGN KEY(id_objeto) REFERENCES OBJETO (id_objeto)
)

CREATE TABLE VISITANTE (
id_usuario Inteiro PRIMARY KEY,
FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario)
)

ALTER TABLE LOCAL_ESPECIFICO ADD FOREIGN KEY(id_bloco) REFERENCES BLOCO_PREDIO (id_bloco)
ALTER TABLE MEMBRO_UFSC ADD FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario)
ALTER TABLE OPERADOR ADD FOREIGN KEY(id_usuario) REFERENCES USUARIO (id_usuario)
ALTER TABLE OBJETO ADD FOREIGN KEY(id_usuario_cadastro) REFERENCES USUARIO (id_usuario)
