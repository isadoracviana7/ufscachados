# Motor de implementacao e destruicao do BD

from datetime import date, datetime
from sqlalchemy.orm import Session
from database import engine, Base
import models


def criar_e_popular_banco(db: Session):
    # Classe-mae do database.py que herdou as 15 classes do models.py.
    # O metadata e o catalogo interno que guarda as informacoes das tabelas.
    # Cria as tabelas na ordem correta usando a conexao engine para enviar comandos SQL.
    Base.metadata.create_all(bind=engine)

    # Evita duplicar dados se a rota for chamada duas vezes seguidas
    if db.query(models.Status).first():  # Consulta equivalente a SELECT * FROM status LIMIT 1
        return {"mensagem": "As tabelas já existem e já estão populadas."}

    # ==========================================================
    # Tabelas independentes (Nível 1 - sem Foreign Keys)
    # ==========================================================
    status_list = [
        models.Status(id_status=1, descricao="Aguardando Retirada"),
        models.Status(id_status=2, descricao="Em Análise de Reivindicação"),
        models.Status(id_status=3, descricao="Devolvido ao Dono"),
        models.Status(id_status=4, descricao="Expirado / Encaminhado para Doação"),
        models.Status(id_status=5, descricao="Alerta Ativo (Procurando)"),
    ]

    tipos_list = [
        models.TipoRegistro(id_tipo=1, descricao="Item Encontrado"),
        models.TipoRegistro(id_tipo=2, descricao="Item Perdido (Alerta)"),
    ]

    cores_list = [
        models.Cor(id_cor=1, nome="Preto"),
        models.Cor(id_cor=2, nome="Branco"),
        models.Cor(id_cor=3, nome="Azul"),
        models.Cor(id_cor=4, nome="Prata"),
        models.Cor(id_cor=5, nome="Vermelho"),
        models.Cor(id_cor=6, nome="Verde"),
    ]

    categorias_list = [
        models.Categoria(id_categoria=1, nome="Eletrônicos e Acessórios"),
        models.Categoria(id_categoria=2, nome="Documentos e Cartões"),
        models.Categoria(id_categoria=3, nome="Garrafas e Utensílios"),
        models.Categoria(id_categoria=4, nome="Mochilas e Estojos"),
        models.Categoria(id_categoria=5, nome="Chaves"),
    ]

    blocos_list = [
        models.BlocoPredio(id_bloco=1, nome="Bloco A - Jardim das Avenidas"),
        models.BlocoPredio(id_bloco=2, nome="Bloco B - Jardim das Avenidas"),
        models.BlocoPredio(id_bloco=3, nome="Bloco C - Jardim das Avenidas"),
        models.BlocoPredio(id_bloco=4, nome="Auditório - Jardim das Avenidas"),
        models.BlocoPredio(id_bloco=5, nome="Hall - Jardim das Avenidas"),
        models.BlocoPredio(id_bloco=6, nome="Estacionamento"),
    ]

    usuarios_list = [
        models.Usuario(id_usuario=1, nome="Ana Carolina Souza", email="ana.souza@grad.ufsc.br", cpf="11122233344"),
        models.Usuario(id_usuario=2, nome="Lucas Mendes", email="lucas.mendes@ufsc.br", cpf="22233344455"),
        models.Usuario(id_usuario=3, nome="Mariana Costa", email="mariana.costa@grad.ufsc.br", cpf="33344455566"),
        models.Usuario(id_usuario=4, nome="Carlos Eduardo Lima", email="carlos.visitante@gmail.com", cpf="44455566677"),
        models.Usuario(id_usuario=5, nome="Rafael Oliveira", email="rafael.oliveira@grad.ufsc.br", cpf="55566677788"),
        models.Usuario(id_usuario=6, nome="Fernanda Alves", email="fernanda.alves@ufsc.br", cpf="66677788899"),
    ]

    db.add_all(status_list + tipos_list + cores_list + categorias_list + blocos_list + usuarios_list)
    db.commit()

    # ==========================================================
    # Tabelas que dependem do Nível 1 (Nível 2)
    # ==========================================================
    locais_list = [
        models.LocalEspecifico(id_local=1, id_bloco=1, nome="Laboratório de Hardware - Bloco A"),
        models.LocalEspecifico(id_local=2, id_bloco=4, nome="Plateia / Poltronas - Auditório"),
        models.LocalEspecifico(id_local=3, id_bloco=2, nome="Cantina / Área de Convivência - Bloco B"),
        models.LocalEspecifico(id_local=4, id_bloco=3, nome="Biblioteca Setorial - Bloco C"),
        models.LocalEspecifico(id_local=5, id_bloco=5, nome="Recepção / Sofás - Hall"),
        models.LocalEspecifico(id_local=6, id_bloco=6, nome="Bicicletário / Vagas Próximas à Entrada"),
        models.LocalEspecifico(id_local=7, id_bloco=1, nome="Sala 104 - Bloco A"),
    ]

    membros_list = [
        models.MembroUfsc(id_usuario=1, matricula_ufsc=20231045),
        models.MembroUfsc(id_usuario=3, matricula_ufsc=20242089),
        models.MembroUfsc(id_usuario=5, matricula_ufsc=20221033),
    ]

    operadores_list = [
        models.Operador(id_usuario=2),
        models.Operador(id_usuario=6),
    ]

    visitantes_list = [
        models.Visitante(id_usuario=4),
    ]

    db.add_all(locais_list + membros_list + operadores_list + visitantes_list)
    db.commit()

    # ==========================================================
    # Entidade Central (OBJETO - Nível 3)
    # ==========================================================
    objetos_list = [
        models.Objeto(
            id_objeto=1,
            descricao_publica="Garrafa térmica de inox com tampa rosqueável e adesivos na lateral",
            detalhe_seguranca_oculto="Adesivo do curso de Engenharia da Computação e nome 'Ana' riscado no fundo",
            data_registro=date(2026, 11, 10),
            data_vencimento=date(2026, 12, 10),
            id_usuario_cadastro=2,
            id_status=1,  # Aguardando Retirada
            id_cor=4,     # Prata
            id_categoria=3,  # Garrafas
            id_local=1,   # Lab Hardware - Bloco A
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=2,
            descricao_publica="Carregador de notebook USB-C 65W com cabo trançado",
            detalhe_seguranca_oculto="Fita isolante verde enrolada perto do conector USB-C",
            data_registro=date(2026, 11, 12),
            data_vencimento=date(2026, 12, 12),
            id_usuario_cadastro=2,
            id_status=2,  # Em Análise de Reivindicação
            id_cor=1,     # Preto
            id_categoria=1,  # Eletrônicos
            id_local=4,   # Biblioteca - Bloco C
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=3,
            descricao_publica="Molho de chaves com três chaves comuns e chaveiro de acrílico",
            detalhe_seguranca_oculto="Chaveiro em formato de controle de videogame",
            data_registro=date(2026, 11, 15),
            data_vencimento=date(2026, 12, 15),
            id_usuario_cadastro=6,
            id_status=3,  # Devolvido ao Dono
            id_cor=3,     # Azul
            id_categoria=5,  # Chaves
            id_local=3,   # Cantina - Bloco B
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=4,
            descricao_publica="Carteira de estudante UFSC e cartão de transporte urbano",
            detalhe_seguranca_oculto="Foto 3x4 antiga guardada no compartimento interno",
            data_registro=date(2026, 11, 18),
            data_vencimento=date(2026, 12, 18),
            id_usuario_cadastro=2,
            id_status=1,  # Aguardando Retirada
            id_cor=1,     # Preto
            id_categoria=2,  # Documentos
            id_local=2,   # Auditório
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=5,
            descricao_publica="Mochila escolar de lona com dois compartimentos e bolso lateral para garrafa",
            detalhe_seguranca_oculto="Caderno universitário de Cálculo II com nome 'Rafael' na contracapa",
            data_registro=date(2026, 11, 11),
            data_vencimento=date(2026, 12, 11),
            id_usuario_cadastro=6,
            id_status=2,  # Em Análise de Reivindicação
            id_cor=3,     # Azul
            id_categoria=4,  # Mochilas e Estojos
            id_local=5,   # Recepção / Sofás - Hall
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=6,
            descricao_publica="Fone de ouvido Bluetooth intra-auricular dentro de estojo carregador",
            detalhe_seguranca_oculto="Pequeno arranhão na tampa do estojo e borrachinha tamanho P instalada",
            data_registro=date(2026, 11, 14),
            data_vencimento=date(2026, 12, 14),
            id_usuario_cadastro=2,
            id_status=1,  # Aguardando Retirada
            id_cor=2,     # Branco
            id_categoria=1,  # Eletrônicos
            id_local=7,   # Sala 104 - Bloco A
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=7,
            descricao_publica="Chave presencial de automóvel com capa protetora de silicone",
            detalhe_seguranca_oculto="Etiqueta numérica '402' presa na argola metálica",
            data_registro=date(2026, 11, 16),
            data_vencimento=date(2026, 12, 16),
            id_usuario_cadastro=6,
            id_status=1,  # Aguardando Retirada
            id_cor=1,     # Preto
            id_categoria=5,  # Chaves
            id_local=6,   # Bicicletário / Estacionamento
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=8,
            descricao_publica="Estojo escolar de tecido com zíper reforçado contendo canetas e lapiseira",
            detalhe_seguranca_oculto="Lapiseira Pentel 0.7 azul e borracha branca cortada ao meio",
            data_registro=date(2026, 10, 15),
            data_vencimento=date(2026, 11, 15),  # Prazo já vencido em relação a hoje (22/11/2026)
            id_usuario_cadastro=2,
            id_status=1,  # Nasce como 'Aguardando Retirada' para a rotina de vencimentos mudar para 4 ao vivo
            id_cor=5,     # Vermelho
            id_categoria=4,  # Mochilas e Estojos
            id_local=3,   # Cantina - Bloco B
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=9,
            descricao_publica="Calculadora científica com tampa deslizante",
            detalhe_seguranca_oculto="Etiqueta com iniciais 'M.C.' colada atrás da tampa das pilhas",
            data_registro=date(2026, 11, 19),
            data_vencimento=date(2026, 12, 19),
            id_usuario_cadastro=2,
            id_status=3,  # Devolvido ao Dono
            id_cor=1,     # Preto
            id_categoria=1,  # Eletrônicos
            id_local=1,   # Lab Hardware - Bloco A
            id_tipo=1,
        ),
        models.Objeto(
            id_objeto=10,
            descricao_publica="Copo térmico com tampa acrílica transparente (Perdido próximo à Biblioteca)",
            detalhe_seguranca_oculto="Marca de amassado leve na base inferior",
            data_registro=date(2026, 11, 20),
            data_vencimento=date(2026, 12, 20),
            id_usuario_cadastro=1,  # Cadastrado pela própria aluna que perdeu o item (Membro UFSC)
            id_status=5,            # Alerta Ativo (Procurando)
            id_cor=6,               # Verde
            id_categoria=3,         # Garrafas e Utensílios
            id_local=4,             # Biblioteca - Bloco C
            id_tipo=2,              # Item Perdido (Alerta)
        ),
    ]

    db.add_all(objetos_list)
    db.commit()

    # ==========================================================
    # Tabelas Satélites (dependem de Usuario e Objeto - Nível 4)
    # ==========================================================
    historicos_list = [
        models.HistoricoAuditoria(
            id_historico=1, id_objeto=1, id_usuario=2,
            data_hora=datetime(2026, 11, 10, 14, 30), tipo_transacao="CADASTRO_INICIAL"
        ),
        models.HistoricoAuditoria(
            id_historico=2, id_objeto=2, id_usuario=2,
            data_hora=datetime(2026, 11, 12, 10, 15), tipo_transacao="CADASTRO_INICIAL"
        ),
        models.HistoricoAuditoria(
            id_historico=3, id_objeto=3, id_usuario=6,
            data_hora=datetime(2026, 11, 16, 16, 0), tipo_transacao="BAIXA_DEVOLUCAO"
        ),
        models.HistoricoAuditoria(
            id_historico=4, id_objeto=8, id_usuario=2,
            data_hora=datetime(2026, 10, 15, 11, 0), tipo_transacao="CADASTRO_INICIAL"
        ),
        models.HistoricoAuditoria(
            id_historico=5, id_objeto=9, id_usuario=2,
            data_hora=datetime(2026, 11, 20, 11, 20), tipo_transacao="BAIXA_DEVOLUCAO"
        ),
    ]

    imagens_list = [
        models.Imagem(id_imagem=1, id_objeto=1, url_caminho="/uploads/objetos/garrafa_inox_01.jpg"),
        models.Imagem(id_imagem=2, id_objeto=2, url_caminho="/uploads/objetos/carregador_usbc_02.jpg"),
        models.Imagem(id_imagem=3, id_objeto=5, url_caminho="/uploads/objetos/mochila_azul_05.jpg"),
        models.Imagem(id_imagem=4, id_objeto=6, url_caminho="/uploads/objetos/fone_bluetooth_06.jpg"),
    ]

    notificacoes_list = [
        models.Notificacao(
            id_notificacao=1, id_objeto=2, id_usuario=3,
            data_hora=datetime(2026, 11, 13, 9, 0),
            mensagem="Sua reivindicação para o carregador USB-C está em análise pelo operador."
        ),
        models.Notificacao(
            id_notificacao=2, id_objeto=5, id_usuario=5,
            data_hora=datetime(2026, 11, 12, 15, 10),
            mensagem="Recebemos sua solicitação para a mochila azul. Aguarde conferência presencial."
        ),
        models.Notificacao(
            id_notificacao=3, id_objeto=9, id_usuario=3,
            data_hora=datetime(2026, 11, 20, 11, 25),
            mensagem="Reivindicação aprovada! Calculadora científica devolvida ao proprietário."
        ),
    ]

    reivindicacoes_list = [
        models.Reivindicacao(
            id_reivindicacao=1,
            data_hora=datetime(2026, 11, 13, 8, 55),
            justificativa_segredo="O cabo tem uma fita isolante verde perto da ponta que conecta no notebook.",
            status="EM_ANALISE",
            id_usuario=3,
            id_objeto=2,
        ),
        models.Reivindicacao(
            id_reivindicacao=2,
            data_hora=datetime(2026, 11, 16, 15, 40),
            justificativa_segredo="Tem um chaveiro de controle de videogame preso na argola.",
            status="APROVADA",
            id_usuario=4,
            id_objeto=3,
        ),
        models.Reivindicacao(
            id_reivindicacao=3,
            data_hora=datetime(2026, 11, 12, 15, 0),
            justificativa_segredo="Dentro dela há um caderno de Cálculo II com meu nome Rafael na contracapa.",
            status="EM_ANALISE",
            id_usuario=5,
            id_objeto=5,
        ),
        models.Reivindicacao(
            id_reivindicacao=4,
            data_hora=datetime(2026, 11, 20, 10, 50),
            justificativa_segredo="Tem uma etiqueta com as iniciais M.C. colada atrás da tampa das pilhas.",
            status="APROVADA",
            id_usuario=3,
            id_objeto=9,
        ),
        models.Reivindicacao(
            id_reivindicacao=5,
            data_hora=datetime(2026, 11, 15, 14, 10),
            justificativa_segredo="Acho que é meu fone preto da JBL que perdi semana passada.",
            status="REJEITADA",
            id_usuario=1,
            id_objeto=6,
        ),
    ]

    db.add_all(historicos_list + imagens_list + notificacoes_list + reivindicacoes_list)
    db.commit()

    return {"mensagem": "Banco de dados inicializado e todas as 15 tabelas foram populadas com sucesso!"}


def eliminar_todas_tabelas():
    # Remove todas as 15 tabelas respeitando a ordem inversa das Foreign Keys
    Base.metadata.drop_all(bind=engine)
    return {"mensagem": "Todas as tabelas do banco de dados foram eliminadas com sucesso!"}