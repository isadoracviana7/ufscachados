import { demoItems, demoSecrets, demoTables } from "@/data/demo";
import { images } from "@/data/assets";
import { isPublic, normalize, type Item, type Match, type RecordData } from "@/data/types";

export const API_URL = import.meta.env["VITE_API_URL"] || "http://127.0.0.1:8000";
export type Connection = "conectando" | "online" | "demo";

let connection: Connection = "conectando";
let items = structuredClone(demoItems);
let tables = structuredClone(demoTables);
let secrets = { ...demoSecrets };
const listeners = new Set<(c: Connection) => void>();

export const subscribeConnection = (fn: (c: Connection) => void) => {
  listeners.add(fn);
  fn(connection);
  return () => {
    listeners.delete(fn);
  };
};

function setConnection(c: Connection) {
  connection = c;
  listeners.forEach((fn) => fn(c));
}

function getLoggedUserIdParam(): string {
  try {
    const savedUser = window.localStorage.getItem("ufscachados-user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.id) return `?id_usuario_logado=${parsed.id}`;
    }
  } catch {
    // Ignora erro de leitura do localStorage
  }
  return "";
}

export class ApiError extends Error {}

export async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  if (connection === "demo") throw new TypeError("Modo demonstração");
  let response: Response;

  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  if (import.meta.env["VITE_ADMIN_KEY"]) {
    headers["X-Admin-Key"] = import.meta.env["VITE_ADMIN_KEY"];
  }

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    if (connection === "conectando") {
      setConnection("demo");
    }
    throw e;
  }

  setConnection("online");
  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(
      typeof detail.detail === "string" ? detail.detail : JSON.stringify(detail.detail ?? detail),
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function fallback<T>(action: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (e) {
    if (e instanceof ApiError || connection === "online") throw e;
    return local();
  }
}

export function retryConnection() {
  setConnection("conectando");
}

function imageFor(text: string) {
  const n = normalize(text);
  const key = n.includes("carteira")
    ? "carteira"
    : n.includes("carregador")
      ? "carregador"
      : n.includes("fone")
        ? "fone"
        : n.includes("mochila")
          ? "mochila"
          : n.includes("chave presencial")
            ? "chave-carro"
            : n.includes("chave")
              ? "chaves"
              : n.includes("copo")
                ? "copo"
                : n.includes("garrafa")
                  ? "garrafa"
                  : n.includes("caderno")
                    ? "caderno"
                    : n.includes("chuva")
                      ? "guarda-chuva"
                      : n.includes("estojo")
                        ? "estojo"
                        : "carteirinha";
  return images[key] ?? "";
}

export function itemRecord(i: Item): RecordData {
  return {
    id_objeto: i.id,
    descricao_publica: `${i.title} — ${i.description}`,
    data_registro: i.date,
    data_vencimento: i.expires,
    id_usuario_cadastro: i.userId,
    id_status: i.status,
    id_cor: i.colorId,
    id_categoria: i.categoryId,
    id_local: i.localId,
    id_tipo: i.type === "achado" ? 1 : 2,
  };
}

export async function listItems(): Promise<Item[]> {
  return fallback(
    async () => {
      const userIdParam = getLoggedUserIdParam();
      const [publicRows, raw] = await Promise.all([
        request<Record<string, unknown>[]>("/operacoes/vitrine?apenas_disponiveis=false"),
        request<RecordData[]>(`/objetos${userIdParam}`),
      ]);
      return publicRows.map((r) => {
        const o = raw.find((x) => x["id_objeto"] === r["id_objeto"]);
        const desc = String(r["descricao_publica"]);
        const imgs = Array.isArray(r["imagens"]) ? r["imagens"] : [];
        const src = typeof imgs[0] === "string" ? imgs[0] : "";
        return {
          id: Number(r["id_objeto"]),
          title: desc.split(" — ")[0] ?? desc,
          description: desc,
          category: String(r["categoria"]),
          location: String(r["local_encontrado"]),
          date: String(r["data_registro"]),
          expires: r["data_vencimento"] ? String(r["data_vencimento"]) : null,
          image: src ? (src.startsWith("/") ? `${API_URL}${src}` : src) : imageFor(desc),
          type: o?.["id_tipo"] === 2 ? "perdido" : "achado",
          status: Number(o?.["id_status"] ?? 1),
          categoryId: Number(o?.["id_categoria"] ?? 1),
          localId: Number(o?.["id_local"] ?? 1),
          colorId: Number(o?.["id_cor"] ?? 1),
          userId: Number(o?.["id_usuario_cadastro"] ?? 1),
        };
      });
    },
    () => structuredClone(items),
  );
}

export async function listResource(path: string): Promise<RecordData[]> {
  const query = path === "objetos" ? getLoggedUserIdParam() : "";
  return fallback(
    () => request<RecordData[]>(`/${path}${query}`),
    () => structuredClone(path === "objetos" ? items.map(itemRecord) : (tables[path] ?? [])),
  );
}

export async function saveResource(
  path: string,
  body: RecordData,
  idKey: string,
  editing = false,
): Promise<RecordData> {
  return fallback(
    () =>
      request<RecordData>(
        `/${path}${editing ? `/${body[idKey]}` : ""}`,
        editing ? "PUT" : "POST",
        body,
      ),
    () => {
      if (path === "objetos") {
        const old = items.find((i) => i.id === Number(body[idKey]));
        if (old) {
          Object.assign(old, {
            status: Number(body["id_status"] ?? old.status),
            description: String(body["descricao_publica"] ?? old.description),
            localId: Number(body["id_local"] ?? old.localId),
            expires: body["data_vencimento"] ? String(body["data_vencimento"]) : old.expires,
          });
          return itemRecord(old);
        }
      }
      const target = tables[path] ?? [];
      const at = target.findIndex((r) => r[idKey] === body[idKey]);
      if (editing && at >= 0) target[at] = { ...target[at], ...body };
      else {
        if (at >= 0) throw new ApiError("Este ID já está cadastrado.");
        target.push({ ...body });
      }
      tables[path] = target;
      return body;
    },
  );
}

export async function deleteResource(path: string, id: number, idKey: string) {
  return fallback(
    () => request<unknown>(`/${path}/${id}`, "DELETE"),
    () => {
      if (path === "objetos") items = items.filter((i) => i.id !== id);
      else tables[path] = (tables[path] ?? []).filter((r) => r[idKey] !== id);
      return { mensagem: "Registro excluído." };
    },
  );
}

export async function createItem(item: Item, secret: string) {
  return fallback(
    async () => {
      await request("/objetos", "POST", { ...itemRecord(item), detalhe_seguranca_oculto: secret });
      if (item.image.startsWith("data:")) {
        try {
          await request("/imagens", "POST", {
            id_imagem: Math.floor(100000 + Math.random() * 900000),
            id_objeto: item.id,
            url_caminho: item.image,
          });
        } catch {
          // Ignora erro opcional de imagem para não invalidar o cadastro do objeto
        }
      }
      return item;
    },
    () => {
      items.unshift(item);
      secrets[item.id] = secret;
      return item;
    },
  );
}

export async function createClaim(itemId: number, userId: number, justification: string) {
  const body: RecordData = {
    id_reivindicacao: Math.floor(100000 + Math.random() * 900000),
    id_objeto: itemId,
    id_usuario: userId,
    data_hora: new Date().toISOString(),
    justificativa_segredo: justification,
    status: "EM_ANALISE",
  };
  return saveResource("reivindicacoes", body, "id_reivindicacao");
}

export async function conferClaim(id: number, operatorId = 2) {
  return fallback(
    () =>
      request<{
        comparacao_seguranca: {
          segredo_real_cadastrado: string;
          justificativa_informada_pelo_usuario: string;
        };
        solicitante: { nome: string };
      }>(`/operacoes/conferir-reivindicacao/${id}?id_operador=${operatorId}`),
    () => {
      const row = tables["reivindicacoes"]?.find((r) => r["id_reivindicacao"] === id);
      if (!row) throw new ApiError("Reivindicação não encontrada.");
      return {
        comparacao_seguranca: {
          segredo_real_cadastrado: secrets[Number(row["id_objeto"])] ?? "Sem detalhe cadastrado.",
          justificativa_informada_pelo_usuario: String(row["justificativa_segredo"]),
        },
        solicitante: {
          nome: String(
            tables["usuarios"]?.find((r) => r["id_usuario"] === row["id_usuario"])?.["name"] ??
              tables["usuarios"]?.find((r) => r["id_usuario"] === row["id_usuario"])?.["nome"] ??
              "Solicitante",
          ),
        },
      };
    },
  );
}

export async function getSecret(itemId: number, operatorId = 2): Promise<string> {
  if (connection === "demo") return secrets[itemId] ?? "Não informado.";

  try {
    const obj = await request<RecordData>(`/objetos/${itemId}?id_usuario_logado=${operatorId}`);
    if (obj && typeof obj["detalhe_seguranca_oculto"] === "string" && obj["detalhe_seguranca_oculto"].trim() !== "") {
      return obj["detalhe_seguranca_oculto"];
    }
  } catch {
    // Caso a rota direta falhe, tenta via reivindicação abaixo
  }

  const claims = await listResource("reivindicacoes");
  const claim = claims.find((r) => r["id_objeto"] === itemId);
  if (claim) {
    return (await conferClaim(Number(claim["id_reivindicacao"]), operatorId)).comparacao_seguranca
      .segredo_real_cadastrado;
  }

  return "Sem detalhe de segurança cadastrado para este item.";
}

export async function decideClaim(
  id: number,
  approved: boolean,
  observation: string,
  operatorId = 2,
) {
  return fallback(
    () =>
      request("/operacoes/avaliar-reivindicacao", "POST", {
        id_reivindicacao: id,
        id_operador: operatorId,
        aprovada: approved,
        observacao_operador: observation,
      }),
    () => {
      const claim = tables["reivindicacoes"]?.find((r) => r["id_reivindicacao"] === id);
      if (!claim) throw new ApiError("Reivindicação não encontrada.");
      claim["status"] = approved ? "APROVADA" : "REJEITADA";
      const item = items.find((i) => i.id === claim["id_objeto"]);
      if (item) item.status = approved ? 3 : 1;
      (tables["auditoria"] ??= []).push({
        id_historico: Math.floor(100000 + Math.random() * 900000),
        id_objeto: Number(claim["id_objeto"]),
        id_usuario: operatorId,
        data_hora: new Date().toISOString(),
        tipo_transacao: approved ? "BAIXA_DEVOLUCAO" : "REIVINDICACAO_REJEITADA",
      });
      (tables["notificacoes"] ??= []).push({
        id_notificacao: Math.floor(100000 + Math.random() * 900000),
        id_objeto: Number(claim["id_objeto"]),
        id_usuario: Number(claim["id_usuario"]),
        data_hora: new Date().toISOString(),
        mensagem: approved
          ? "Reivindicação aprovada. Retire o item no Protocolo."
          : "Reivindicação rejeitada.",
      });
      return { mensagem: "Decisão registrada." };
    },
  );
}

export async function closeLost(item: Item, reason: string, operatorId = 2) {
  await saveResource("objetos", { id_objeto: item.id, id_status: 3 }, "id_objeto", true);
  await saveResource(
    "auditoria",
    {
      id_historico: Math.floor(100000 + Math.random() * 900000),
      id_objeto: item.id,
      id_usuario: operatorId,
      data_hora: new Date().toISOString(),
      tipo_transacao: reason === "plataforma" ? "ENCONTRADO_PLATAFORMA" : "ENCONTRADO_EXTERNO",
    },
    "id_historico",
  );
}

export async function semanticSearch(text: string): Promise<Match[]> {
  return fallback(
    () => request<Match[]>("/ia/buscar-objeto", "POST", { descricao_usuario: text }),
    () => {
      const words = normalize(text)
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const synonyms =
        normalize(text).includes("fone") || normalize(text).includes("estojo branco")
          ? "fone branco"
          : text;
      return items
        .filter(isPublic)
        .map((i) => ({
          id_objeto: i.id,
          score:
            words.filter((w) => normalize(`${i.title} ${i.description} ${i.location}`).includes(w))
              .length + (normalize(synonyms).includes("fone") && i.title.includes("Fones") ? 2 : 0),
        }))
        .filter((i) => i.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((i) => ({
          id_objeto: i.id_objeto,
          grau_compatibilidade: i.score >= 2 ? "Alta" : "Média",
          justificativa: "Correspondência local por palavras-chave (demonstração, sem IA).",
        }));
    },
  );
}

export async function operation(path: string, body?: RecordData) {
  return fallback(
    () => request<unknown>(path, "POST", body),
    () => {
      if (path.includes("processar-vencimentos")) {
        let count = 0;
        items.forEach((i) => {
          if (
            [1, 2].includes(i.status) &&
            i.expires &&
            i.expires < new Date().toISOString().slice(0, 10)
          ) {
            i.status = 4;
            count++;
          }
        });
        return { mensagem: `${count} objeto(s) encaminhado(s) para doação.` };
      }
      if (path.includes("/banco/inicializar")) {
        items = structuredClone(demoItems);
        tables = structuredClone(demoTables);
        secrets = { ...demoSecrets };
        return { mensagem: "Demonstração reinicializada." };
      }
      return { mensagem: "Verificação de compatibilidade concluída na demonstração." };
    },
  );
}

export async function clearDatabase() {
  return fallback(
    () => request("/banco/limpar", "DELETE"),
    () => {
      items = [];
      tables = {};
      return { mensagem: "Dados da demonstração removidos." };
    },
  );
}

export async function reports() {
  return Promise.all([
    listReport("objetos-por-bloco"),
    listReport("itens-por-categoria-status"),
    listReport("reivindicacoes-por-status-categoria"),
  ]);
}

async function listReport(path: string): Promise<RecordData[]> {
  return fallback(
    () => request<RecordData[]>(`/relatorios/${path}`),
    () => {
      if (path === "objetos-por-bloco")
        return Object.entries(
          items.reduce<Record<string, number>>((a, i) => {
            a[i.location] = (a[i.location] ?? 0) + 1;
            return a;
          }, {}),
        ).map(([bloco_predio, total_objetos]) => ({ bloco_predio, total_objetos }));
      if (path === "itens-por-categoria-status")
        return items.map((i) => ({
          categoria: i.category,
          status_objeto: i.status === 3 ? "Devolvido" : i.type === "achado" ? "Achado" : "Perdido",
          quantidade_itens: 1,
        }));
      return (tables["reivindicacoes"] ?? []).map((r) => ({
        status_reivindicacao: r["status"] ?? "",
        categoria_objeto: items.find((i) => i.id === r["id_objeto"])?.category ?? "",
        total_solicitacoes: 1,
      }));
    },
  );
}
