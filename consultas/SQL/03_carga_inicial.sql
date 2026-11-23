-- ============================================================================
-- CARGA INICIAL DE DADOS - UFSCACHADOS (Compatível com script_ufscachados_ddl)
-- ============================================================================

-- 1. STATUS (Domínio conforme RN02)
INSERT INTO STATUS (id_status, descricao) VALUES
    (1, 'Cadastrado'),
    (2, 'Em Processo'),
    (3, 'Devolvido'),
    (4, 'Encerrado/Doado');

-- 2. TIPO_REGISTRO (Domínio conforme RN02)
INSERT INTO TIPO_REGISTRO (id_tipo, descricao) VALUES
    (1, 'Achado'),
    (2, 'Perdido');

-- 3. COR
INSERT INTO COR (id_cor, nome) VALUES
    (1, 'Preto'),
    (2, 'Prata'),
    (3, 'Azul'),
    (4, 'Branco'),
    (5, 'Vermelho'),
    (6, 'Transparente');

-- 4. CATEGORIA
INSERT INTO CATEGORIA (id_categoria, nome) VALUES
    (1, 'Documentos e Carteirinhas'),
    (2, 'Eletrônicos e Carregadores'),
    (3, 'Garrafas e Utensílios'),
    (4, 'Chaves e Acessórios'),
    (5, 'Vestuário e Mochilas');

-- 5. BLOCO_PREDIO (Campus Araranguá - RN07)
INSERT INTO BLOCO_PREDIO (id_bloco, nome) VALUES
    (1, 'Unidade Jardim das Avenidas (Bloco A)'),
    (2, 'Unidade Mato Alto (Bloco C)'),
    (3, 'Restaurante Universitário (RU)'),
    (4, 'Biblioteca Universitária (BU)');

-- 6. LOCAL_ESPECIFICO (RN07)
INSERT INTO LOCAL_ESPECIFICO (id_local, id_bloco, nome) VALUES
    (1, 1, 'Sala 201 - Bloco A'),
    (2, 1, 'LabTec - Laboratório de Hardware'),
    (3, 1, 'Corredor Térreo - Bloco A'),
    (4, 2, 'Auditório Bloco C'),
    (5, 2, 'Sala 304 - Bloco C'),
    (6, 3, 'Refeitório Principal RU'),
    (7, 4, 'Sala de Estudos em Grupo BU');

-- 7. USUARIO (Base comum da especialização Total e Exclusiva)
INSERT INTO USUARIO (id_usuario, nome, email, cpf) VALUES
    (1, 'Gabrieli Jorge Barbosa', 'gabrieli.barbosa@grad.ufsc.br', '111.111.111-11'),
    (2, 'Isadora da Costa Viana', 'isadora.viana@grad.ufsc.br', '222.222.222-22'),
    (3, 'Carlos Eduardo Silva', 'carlos.operador@ufsc.br', '333.333.333-33'),
    (4, 'Fernanda Lima (Protocolo)', 'fernanda.protocolo@ufsc.br', '444.444.444-44'),
    (5, 'Mariana Souza', 'mariana.visitante@gmail.com', '555.555.555-55'),
    (6, 'Roberto Alves', 'roberto.visitante@hotmail.com', '666.666.666-66'),
    (7, 'Lucas Ferreira', 'lucas.ferreira@grad.ufsc.br', '777.777.777-77'),
    (8, 'Beatriz Mendes', 'beatriz.mendes@grad.ufsc.br', '888.888.888-88');

-- 8. ESPECIALIZAÇÕES DE USUÁRIO (MEMBRO_UFSC, OPERADOR, VISITANTE)
INSERT INTO MEMBRO_UFSC (id_usuario, matricula_ufsc) VALUES
    (1, 24201546),
    (2, 24201890),
    (7, 23104512),
    (8, 25102233);

INSERT INTO OPERADOR (id_usuario) VALUES
    (3),
    (4);

INSERT INTO VISITANTE (id_usuario) VALUES
    (5),
    (6);

-- 9. OBJETO (12 itens distribuídos entre blocos, categorias e status)
INSERT INTO OBJETO (id_objeto, descricao_publica, detalhe_seguranca_oculto, data_registro, data_vencimento, id_usuario_cadastro, id_status, id_cor, id_categoria, id_local, id_tipo) VALUES
    (1, 'Carregador de notebook USB-C 65W', 'Adesivo pequeno de gato na fonte e fita isolante na ponta', '2026-09-10', '2026-12-15', 1, 3, 1, 2, 2, 1),
    (2, 'Garrafa térmica de inox 500ml', 'Tampa com arranhão profundo e iniciais L.F. gravadas no fundo', '2026-09-15', '2026-12-15', 3, 1, 2, 3, 6, 1),
    (3, 'Carteirinha estudantil UFSC', 'Matrícula final 512, dentro de porta-cartão transparente', '2026-09-20', '2026-12-15', 2, 3, 3, 1, 7, 1),
    (4, 'Molho com 3 chaves e chaveiro', 'Chaveiro emborrachado do Batman com fita azul', '2026-10-01', '2026-12-15', 3, 1, 1, 4, 1, 1),
    (5, 'Casaco moletom com capuz', 'Etiqueta interna rasgada e mancha pequena no punho esquerdo', '2026-08-05', '2026-10-30', 4, 4, 1, 5, 4, 1),
    (6, 'Fone de ouvido Bluetooth intra-auricular', 'Case com risco na tampa e borrachinha direita tamanho P', '2026-10-10', '2026-12-15', 7, 2, 4, 2, 6, 2),
    (7, 'Calculadora científica Casio fx-82MS', 'Nome Beatriz escrito a caneta atrás da tampa deslizante', '2026-10-14', '2026-12-15', 1, 3, 1, 2, 1, 1),
    (8, 'Carteira de identidade (RG) e cartão ônibus', 'Emitida em SC, foto 3x4 antiga no plástico interno', '2026-10-18', '2026-12-15', 3, 3, 6, 1, 3, 1),
    (9, 'Copo térmico com tampa azul', 'Adesivo da Semana Acadêmica de Engenharia de Computação', '2026-10-22', '2026-12-15', 2, 1, 3, 3, 6, 1),
    (10, 'Guarda-chuva dobrável', 'Cabo de madeira com cordão arrebentado', '2026-10-28', '2026-12-15', 4, 4, 5, 4, 5, 1),
    (11, 'Pendrive 32GB Kingston', 'Rótulo com fita crepe escrito Arquitetura de Computadores', '2026-11-03', '2026-12-15', 8, 2, 1, 2, 2, 1),
    (12, 'Óculos de grau armação fina', 'Estojo rígido cinza com flanela verde dentro', '2026-11-08', '2026-12-15', 3, 1, 2, 4, 7, 1);

-- 10. IMAGEM (RN06 - Múltiplas fotos por objeto)
INSERT INTO IMAGEM (id_imagem, id_objeto, url_caminho) VALUES
    (1, 1, '/uploads/objetos/carregador_usbc_frente.jpg'),
    (2, 1, '/uploads/objetos/carregador_usbc_detalhe.jpg'),
    (3, 2, '/uploads/objetos/garrafa_inox_1.jpg'),
    (4, 4, '/uploads/objetos/chaveiro_batman.jpg'),
    (5, 7, '/uploads/objetos/calculadora_casio.jpg'),
    (6, 12, '/uploads/objetos/oculos_grau.jpg');

-- 11. REIVINDICACAO (RN04 - Concorrência e validação)
INSERT INTO REIVINDICACAO (id_reivindicacao, data_hora, justificativa_segredo, status, id_usuario, id_objeto) VALUES
    (1, '2026-09-11 14:20:00', 'Tem um adesivo de gato na fonte e fita isolante na ponta.', 'Aprovada', 2, 1),
    (2, '2026-09-11 15:05:00', 'Acho que é o meu carregador preto da Dell.', 'Rejeitada', 5, 1),
    (3, '2026-09-21 10:15:00', 'Minha carteirinha de Engenharia de Computação, matrícula termina em 512.', 'Aprovada', 7, 3),
    (4, '2026-10-15 16:40:00', 'Calculadora Casio com meu nome Beatriz escrito atrás da tampa.', 'Aprovada', 8, 7),
    (5, '2026-10-19 09:30:00', 'Meu RG de SC que caiu perto da secretaria do Bloco A.', 'Aprovada', 6, 8),
    (6, '2026-11-04 11:10:00', 'Pendrive com fita crepe escrito Arquitetura de Computadores.', 'Pendente', 1, 11),
    (7, '2026-11-04 13:00:00', 'Perdi um pendrive preto no laboratório ontem.', 'Rejeitada', 5, 11);

-- 12. HISTORICO_AUDITORIA (RN05 - Rastreabilidade)
INSERT INTO HISTORICO_AUDITORIA (id_historico, id_objeto, id_usuario, data_hora, tipo_transacao) VALUES
    (1, 1, 1, '2026-09-10 10:00:00', 'CADASTRO_OBJETO'),
    (2, 1, 3, '2026-09-11 16:00:00', 'APROVACAO_REIVINDICACAO_E_DEVOLUCAO'),
    (3, 3, 2, '2026-09-20 14:10:00', 'CADASTRO_OBJETO'),
    (4, 3, 3, '2026-09-21 11:00:00', 'APROVACAO_REIVINDICACAO_E_DEVOLUCAO'),
    (5, 5, 4, '2026-10-31 18:00:00', 'BAIXA_POR_VENCIMENTO_DOACAO'),
    (6, 7, 1, '2026-10-14 09:15:00', 'CADASTRO_OBJETO'),
    (7, 7, 4, '2026-10-15 17:20:00', 'APROVACAO_REIVINDICACAO_E_DEVOLUCAO');

-- 13. NOTIFICACAO (UC04 - Alertas automáticos)
INSERT INTO NOTIFICACAO (id_notificacao, id_objeto, id_usuario, data_hora, mensagem) VALUES
    (1, 1, 2, '2026-09-11 16:01:00', 'Sua reivindicação para "Carregador de notebook USB-C 65W" foi aprovada! Retire no Protocolo.'),
    (2, 3, 7, '2026-09-20 14:15:00', 'Encontramos uma Carteirinha estudantil UFSC na Biblioteca que corresponde aos seus dados.'),
    (3, 7, 8, '2026-10-15 17:25:00', 'Sua reivindicação para "Calculadora científica Casio fx-82MS" foi aprovada!'),
    (4, 8, 6, '2026-10-19 10:00:00', 'Sua reivindicação para "Carteira de identidade (RG)" foi aprovada!');