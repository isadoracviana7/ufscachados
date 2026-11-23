export interface FieldSpec {
  key: string;
  type: string;
  required: boolean;
}
export interface Resource {
  path: string;
  label: string;
  idKey: string;
  fields: FieldSpec[];
  editFields: string[];
}
export const resources: Resource[] = [
  {
    path: "objetos",
    label: "Objetos",
    idKey: "id_objeto",
    fields: [
      {
        key: "descricao_publica",
        type: "text",
        required: true,
      },
      {
        key: "data_registro",
        type: "date",
        required: true,
      },
      {
        key: "data_vencimento",
        type: "date",
        required: false,
      },
      {
        key: "id_usuario_cadastro",
        type: "number",
        required: true,
      },
      {
        key: "id_status",
        type: "number",
        required: true,
      },
      {
        key: "id_cor",
        type: "number",
        required: true,
      },
      {
        key: "id_categoria",
        type: "number",
        required: true,
      },
      {
        key: "id_local",
        type: "number",
        required: true,
      },
      {
        key: "id_tipo",
        type: "number",
        required: true,
      },
      {
        key: "id_objeto",
        type: "number",
        required: true,
      },
      {
        key: "detalhe_seguranca_oculto",
        type: "text",
        required: true,
      },
    ],
    editFields: [
      "descricao_publica",
      "detalhe_seguranca_oculto",
      "data_vencimento",
      "id_status",
      "id_local",
    ],
  },
  {
    path: "usuarios",
    label: "Usuários",
    idKey: "id_usuario",
    fields: [
      {
        key: "nome",
        type: "text",
        required: true,
      },
      {
        key: "email",
        type: "email",
        required: true,
      },
      {
        key: "cpf",
        type: "text",
        required: true,
      },
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
    ],
    editFields: ["nome", "email"],
  },
  {
    path: "usuarios/membro-ufsc",
    label: "Membros UFSC",
    idKey: "id_usuario",
    fields: [
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
      {
        key: "matricula_ufsc",
        type: "number",
        required: true,
      },
    ],
    editFields: ["matricula_ufsc"],
  },
  {
    path: "usuarios/operador",
    label: "Operadores",
    idKey: "id_usuario",
    fields: [
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
    ],
    editFields: [],
  },
  {
    path: "usuarios/visitante",
    label: "Visitantes",
    idKey: "id_usuario",
    fields: [
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
    ],
    editFields: [],
  },
  {
    path: "reivindicacoes",
    label: "Reivindicações",
    idKey: "id_reivindicacao",
    fields: [
      {
        key: "id_reivindicacao",
        type: "number",
        required: true,
      },
      {
        key: "data_hora",
        type: "datetime-local",
        required: true,
      },
      {
        key: "justificativa_segredo",
        type: "text",
        required: true,
      },
      {
        key: "status",
        type: "text",
        required: false,
      },
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
      {
        key: "id_objeto",
        type: "number",
        required: true,
      },
    ],
    editFields: ["status"],
  },
  {
    path: "blocos",
    label: "Blocos e prédios",
    idKey: "id_bloco",
    fields: [
      {
        key: "nome",
        type: "text",
        required: true,
      },
      {
        key: "id_bloco",
        type: "number",
        required: true,
      },
    ],
    editFields: ["nome"],
  },
  {
    path: "locais",
    label: "Locais específicos",
    idKey: "id_local",
    fields: [
      {
        key: "id_bloco",
        type: "number",
        required: true,
      },
      {
        key: "nome",
        type: "text",
        required: true,
      },
      {
        key: "id_local",
        type: "number",
        required: true,
      },
    ],
    editFields: ["id_bloco", "nome"],
  },
  {
    path: "categorias",
    label: "Categorias",
    idKey: "id_categoria",
    fields: [
      {
        key: "nome",
        type: "text",
        required: true,
      },
      {
        key: "id_categoria",
        type: "number",
        required: true,
      },
    ],
    editFields: ["nome"],
  },
  {
    path: "cores",
    label: "Cores",
    idKey: "id_cor",
    fields: [
      {
        key: "nome",
        type: "text",
        required: true,
      },
      {
        key: "id_cor",
        type: "number",
        required: true,
      },
    ],
    editFields: ["nome"],
  },
  {
    path: "status",
    label: "Status",
    idKey: "id_status",
    fields: [
      {
        key: "descricao",
        type: "text",
        required: true,
      },
      {
        key: "id_status",
        type: "number",
        required: true,
      },
    ],
    editFields: ["descricao"],
  },
  {
    path: "tipos-registro",
    label: "Tipos de registro",
    idKey: "id_tipo",
    fields: [
      {
        key: "descricao",
        type: "text",
        required: true,
      },
      {
        key: "id_tipo",
        type: "number",
        required: true,
      },
    ],
    editFields: ["descricao"],
  },
  {
    path: "imagens",
    label: "Imagens",
    idKey: "id_imagem",
    fields: [
      {
        key: "id_imagem",
        type: "number",
        required: true,
      },
      {
        key: "id_objeto",
        type: "number",
        required: true,
      },
      {
        key: "url_caminho",
        type: "text",
        required: true,
      },
    ],
    editFields: ["url_caminho"],
  },
  {
    path: "notificacoes",
    label: "Notificações",
    idKey: "id_notificacao",
    fields: [
      {
        key: "id_notificacao",
        type: "number",
        required: true,
      },
      {
        key: "id_objeto",
        type: "number",
        required: true,
      },
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
      {
        key: "data_hora",
        type: "datetime-local",
        required: true,
      },
      {
        key: "mensagem",
        type: "text",
        required: true,
      },
    ],
    editFields: ["mensagem"],
  },
  {
    path: "auditoria",
    label: "Auditoria",
    idKey: "id_historico",
    fields: [
      {
        key: "id_historico",
        type: "number",
        required: true,
      },
      {
        key: "id_objeto",
        type: "number",
        required: true,
      },
      {
        key: "id_usuario",
        type: "number",
        required: true,
      },
      {
        key: "data_hora",
        type: "datetime-local",
        required: true,
      },
      {
        key: "tipo_transacao",
        type: "text",
        required: true,
      },
    ],
    editFields: ["tipo_transacao"],
  },
];
export const fieldLabel = (key: string) =>
  ({
    descricao_publica: "Descrição pública",
    detalhe_seguranca_oculto: "Detalhe de segurança oculto",
    nome: "Nome",
    descricao: "Descrição",
    email: "E-mail",
    cpf: "CPF",
    matricula_ufsc: "Matrícula UFSC",
    url_caminho: "URL ou caminho da imagem",
    tipo_transacao: "Tipo de transação",
    data_hora: "Data e hora",
    data_registro: "Data do registro",
    data_vencimento: "Data de vencimento",
    justificativa_segredo: "Justificativa de posse",
    mensagem: "Mensagem",
  })[key] ?? key.replaceAll("_", " ").replace("id ", "ID ");
