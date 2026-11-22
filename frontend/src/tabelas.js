// Descrição das 15 tabelas para o CRUD genérico.
// type: int | text | date | datetime | status  |  req: obrigatório na criação  |  upd: pode ser alterado no PUT
const f = (name, type, req = true, upd = false) => ({ name, type, req, upd });

export const TABELAS = [
  { key: "objetos", label: "Objeto", path: "/objetos", id: "id_objeto", fields: [
      f("id_objeto", "int"), f("descricao_publica", "text", true, true), f("detalhe_seguranca_oculto", "text", true, true),
      f("data_registro", "date"), f("data_vencimento", "date", false, true), f("id_usuario_cadastro", "int"),
      f("id_status", "int", true, true), f("id_cor", "int"), f("id_categoria", "int"), f("id_local", "int", true, true), f("id_tipo", "int"),
  ]},
  { key: "usuarios", label: "Usuário", path: "/usuarios", id: "id_usuario", fields: [
      f("id_usuario", "int"), f("nome", "text", true, true), f("email", "text", true, true), f("cpf", "text"),
  ]},
  { key: "membros", label: "Membro UFSC", path: "/usuarios/membro-ufsc", id: "id_usuario", fields: [
      f("id_usuario", "int"), f("matricula_ufsc", "int", true, true),
  ]},
  { key: "operadores", label: "Operador", path: "/usuarios/operador", id: "id_usuario", fields: [ f("id_usuario", "int") ]},
  { key: "visitantes", label: "Visitante", path: "/usuarios/visitante", id: "id_usuario", fields: [ f("id_usuario", "int") ]},
  { key: "reivindicacoes", label: "Reivindicação", path: "/reivindicacoes", id: "id_reivindicacao", fields: [
      f("id_reivindicacao", "int"), f("data_hora", "datetime"), f("justificativa_segredo", "text"),
      f("status", "text", false, true), f("id_usuario", "int"), f("id_objeto", "int"),
  ]},
  { key: "blocos", label: "Bloco/Prédio", path: "/blocos", id: "id_bloco", fields: [ f("id_bloco", "int"), f("nome", "text", true, true) ]},
  { key: "locais", label: "Local Específico", path: "/locais", id: "id_local", fields: [
      f("id_local", "int"), f("id_bloco", "int", true, true), f("nome", "text", true, true),
  ]},
  { key: "categorias", label: "Categoria", path: "/categorias", id: "id_categoria", fields: [ f("id_categoria", "int"), f("nome", "text", true, true) ]},
  { key: "cores", label: "Cor", path: "/cores", id: "id_cor", fields: [ f("id_cor", "int"), f("nome", "text", true, true) ]},
  { key: "status", label: "Status", path: "/status", id: "id_status", fields: [ f("id_status", "int"), f("descricao", "text", true, true) ]},
  { key: "tipos", label: "Tipo de Registro", path: "/tipos-registro", id: "id_tipo", fields: [ f("id_tipo", "int"), f("descricao", "text", true, true) ]},
  { key: "imagens", label: "Imagem", path: "/imagens", id: "id_imagem", fields: [
      f("id_imagem", "int"), f("id_objeto", "int"), f("url_caminho", "text", true, true),
  ]},
  { key: "notificacoes", label: "Notificação", path: "/notificacoes", id: "id_notificacao", fields: [
      f("id_notificacao", "int"), f("id_objeto", "int"), f("id_usuario", "int"), f("data_hora", "datetime"), f("mensagem", "text", true, true),
  ]},
  { key: "auditoria", label: "Auditoria", path: "/auditoria", id: "id_historico", fields: [
      f("id_historico", "int"), f("id_objeto", "int"), f("id_usuario", "int"), f("data_hora", "datetime"), f("tipo_transacao", "text", true, true),
  ]},
];
