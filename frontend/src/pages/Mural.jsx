import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Aviso, useAcao, Campo } from "../ui.jsx";

// Vitrine pública: GET /operacoes/vitrine (nunca expõe o segredo do objeto)
export default function Mural() {
  const [itens, setItens] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cores, setCores] = useState([]);
  const [filtro, setFiltro] = useState({ id_bloco: "", id_categoria: "", id_cor: "", apenas_disponiveis: true });
  const { carregando, erro, executar } = useAcao();

  useEffect(() => {
    executar(async () => {
      setBlocos(await api("/blocos"));
      setCategorias(await api("/categorias"));
      setCores(await api("/cores"));
    });
  }, [executar]);

  const buscar = () => executar(async () => setItens(await api("/operacoes/vitrine", { query: filtro })));
  useEffect(() => { buscar(); /* eslint-disable-next-line */ }, []);

  const set = (k) => (e) => setFiltro({ ...filtro, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const opcoes = (lista, id, nome) => lista.map((o) => <option key={o[id]} value={o[id]}>{o[nome]}</option>);

  return (
    <section>
      <h2>Mural público</h2>
      <p className="sub">Itens encontrados no campus. O detalhe de segurança nunca é exibido aqui (RN02).</p>
      <div className="filtros">
        <Campo rotulo="Bloco"><select value={filtro.id_bloco} onChange={set("id_bloco")}><option value="">Todos</option>{opcoes(blocos, "id_bloco", "nome")}</select></Campo>
        <Campo rotulo="Categoria"><select value={filtro.id_categoria} onChange={set("id_categoria")}><option value="">Todas</option>{opcoes(categorias, "id_categoria", "nome")}</select></Campo>
        <Campo rotulo="Cor"><select value={filtro.id_cor} onChange={set("id_cor")}><option value="">Todas</option>{opcoes(cores, "id_cor", "nome")}</select></Campo>
        <label className="check"><input type="checkbox" checked={filtro.apenas_disponiveis} onChange={set("apenas_disponiveis")} /> Só disponíveis</label>
        <button onClick={buscar} disabled={carregando}>{carregando ? "Buscando…" : "Filtrar"}</button>
      </div>
      <Aviso>{erro}</Aviso>
      <div className="grade">
        {itens.map((i) => (
          <article className="card" key={i.id_objeto}>
            <div className="card-topo">
              <span className="chip">{i.categoria}</span>
              <span className="chip suave">{i.cor}</span>
            </div>
            <h3>{i.descricao_publica}</h3>
            <p className="meta">📍 {i.local_encontrado}</p>
            <p className="meta">🗓 Registrado em {i.data_registro}{i.data_vencimento ? ` · prazo ${i.data_vencimento}` : ""}</p>
            <p className="meta">#{i.id_objeto} · {i.status}</p>
          </article>
        ))}
      </div>
      {!carregando && !erro && itens.length === 0 && <p className="vazio">Nenhum item encontrado. Se o banco está vazio, inicialize-o na aba Admin.</p>}
    </section>
  );
}
