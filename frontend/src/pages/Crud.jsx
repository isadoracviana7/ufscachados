import { useEffect, useState } from "react";
import { api } from "../api.js";
import { TABELAS } from "../tabelas.js";
import { Aviso, Tabela, Campo, useAcao } from "../ui.jsx";

const tipoInput = { int: "number", text: "text", date: "date", datetime: "datetime-local" };

// Converte o texto digitado para o tipo que a API espera; vazio vira undefined (campo omitido)
function converter(valor, tipo) {
  if (valor === "" || valor === undefined || valor === null) return undefined;
  return tipo === "int" ? Number(valor) : valor;
}
function montarCorpo(campos, valores) {
  const corpo = {};
  for (const c of campos) {
    const v = converter(valores[c.name], c.type);
    if (v !== undefined) corpo[c.name] = v;
  }
  return corpo;
}

// CRUD genérico das 15 tabelas: GET (listar) / POST (inserir) / PUT (atualizar) / DELETE (excluir)
export default function Crud() {
  const [chave, setChave] = useState(TABELAS[0].key);
  const tabela = TABELAS.find((t) => t.key === chave);
  const [linhas, setLinhas] = useState([]);
  const [novo, setNovo] = useState({});
  const [edicao, setEdicao] = useState(null);       // linha em edição
  const [valoresEdicao, setValoresEdicao] = useState({});
  const [ok, setOk] = useState("");
  const { carregando, erro, setErro, executar } = useAcao();

  const camposEdit = tabela.fields.filter((c) => c.upd);

  const carregar = () => executar(async () => setLinhas(await api(tabela.path)));
  useEffect(() => { setNovo({}); setEdicao(null); setOk(""); setErro(""); setLinhas([]); carregar(); /* eslint-disable-next-line */ }, [chave]);

  const inserir = (e) => {
    e.preventDefault();
    executar(async () => {
      await api(tabela.path, { method: "POST", body: montarCorpo(tabela.fields, novo) });
      setNovo({}); setOk("Registro inserido com sucesso."); await carregar();
    });
  };

  const iniciarEdicao = (linha) => {
    const v = {};
    camposEdit.forEach((c) => { v[c.name] = linha[c.name] == null ? "" : c.type === "datetime" ? String(linha[c.name]).slice(0, 16) : linha[c.name]; });
    setEdicao(linha); setValoresEdicao(v); setOk("");
  };

  const salvarEdicao = (e) => {
    e.preventDefault();
    executar(async () => {
      await api(`${tabela.path}/${edicao[tabela.id]}`, { method: "PUT", body: montarCorpo(camposEdit, valoresEdicao) });
      setEdicao(null); setOk("Registro atualizado com sucesso."); await carregar();
    });
  };

  const excluir = (linha) => {
    if (!window.confirm(`Excluir ${tabela.label} ${linha[tabela.id]}?`)) return;
    executar(async () => {
      await api(`${tabela.path}/${linha[tabela.id]}`, { method: "DELETE" });
      setOk("Registro excluído."); await carregar();
    });
  };

  const input = (c, valores, setValores) => (
    <Campo rotulo={`${c.name}${c.req ? " *" : ""}`} key={c.name}>
      <input type={tipoInput[c.type]} value={valores[c.name] ?? ""} required={c.req}
        onChange={(e) => setValores({ ...valores, [c.name]: e.target.value })} />
    </Campo>
  );

  return (
    <section>
      <h2>CRUD das tabelas</h2>
      <p className="sub">Inserir, listar, atualizar e excluir em cada uma das 15 tabelas, respeitando as chaves estrangeiras (a API devolve erro se uma dependência não existir).</p>

      <div className="abas">
        {TABELAS.map((t) => (
          <button key={t.key} className={t.key === chave ? "aba ativa" : "aba"} onClick={() => setChave(t.key)}>{t.label}</button>
        ))}
      </div>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      <details className="painel" open>
        <summary>Inserir em {tabela.label}</summary>
        <form onSubmit={inserir} className="form-grade">
          {tabela.fields.map((c) => input(c, novo, setNovo))}
          <button disabled={carregando}>Inserir</button>
        </form>
      </details>

      {edicao && (
        <div className="painel destaque">
          <h3>Editando {tabela.label} {edicao[tabela.id]}</h3>
          <form onSubmit={salvarEdicao} className="form-grade">
            {camposEdit.map((c) => input({ ...c, req: false }, valoresEdicao, setValoresEdicao))}
            <button disabled={carregando}>Salvar</button>
            <button type="button" className="secundario" onClick={() => setEdicao(null)}>Cancelar</button>
          </form>
        </div>
      )}

      <div className="topo-lista">
        <h3>{tabela.label} ({linhas.length})</h3>
        <button className="secundario" onClick={carregar} disabled={carregando}>↻ Atualizar</button>
      </div>
      <Tabela linhas={linhas} acoes={(l) => (
        <>
          {camposEdit.length > 0 && <button className="mini" onClick={() => iniciarEdicao(l)}>Editar</button>}
          <button className="mini perigo" onClick={() => excluir(l)}>Excluir</button>
        </>
      )} />
    </section>
  );
}
