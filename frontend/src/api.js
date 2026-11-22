// Camada de acesso à API (FastAPI). A URL base pode ser trocada pela tela (útil quando o túnel muda).
const PADRAO = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function ler(chave, padrao = "") {
  try { return localStorage.getItem(chave) || padrao; } catch { return padrao; }
}
function gravar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: ignora */ }
}

export const getBase = () => ler("apiUrl", PADRAO).trim().replace(/\/+$/, "");
export const setBase = (url) => gravar("apiUrl", url.trim());
export const getAdminKey = () => ler("adminKey");
export const setAdminKey = (k) => gravar("adminKey", k);

// Converte o "detail" do FastAPI (string ou lista de erros do Pydantic) em texto legível
function formatarErro(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc || []).slice(1).join(".") || "campo"}: ${d.msg}`).join(" | ");
  }
  return JSON.stringify(detail);
}

export async function api(caminho, { method = "GET", body, query, admin = false } = {}) {
  const base = getBase();
  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== "" && v != null)).toString()
    : "";
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin && getAdminKey()) headers["X-Admin-Key"] = getAdminKey();

  let res;
  try {
    res = await fetch(base + caminho + qs, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${base}. Confira se o back-end e o túnel estão rodando.`);
  }

  const texto = await res.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }

  if (!res.ok) {
    throw new Error(formatarErro(dados && dados.detail !== undefined ? dados.detail : dados) || `Erro ${res.status}`);
  }
  return dados;
}

// URL completa de um endpoint (usada para <img> dos gráficos PNG)
export const urlCompleta = (caminho) => getBase() + caminho;
