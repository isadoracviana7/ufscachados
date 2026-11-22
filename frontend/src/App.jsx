import { useEffect, useState } from "react";
import { api, getBase, setBase } from "./api.js";
import Mural from "./pages/Mural.jsx";
import Busca from "./pages/Busca.jsx";
import Crud from "./pages/Crud.jsx";
import Relatorios from "./pages/Relatorios.jsx";
import Operador from "./pages/Operador.jsx";
import Admin from "./pages/Admin.jsx";

const PAGINAS = [
  { key: "mural", rotulo: "Mural", comp: Mural },
  { key: "ia", rotulo: "Busca IA", comp: Busca },
  { key: "crud", rotulo: "CRUD", comp: Crud },
  { key: "rel", rotulo: "Relatórios", comp: Relatorios },
  { key: "op", rotulo: "Operador", comp: Operador },
  { key: "admin", rotulo: "Admin", comp: Admin },
];

export default function App() {
  const [pagina, setPagina] = useState("mural");
  const [urlApi, setUrlApi] = useState(getBase());
  const [editandoUrl, setEditandoUrl] = useState(false);
  const [rascunho, setRascunho] = useState(getBase());
  const [online, setOnline] = useState(null);   // null = verificando
  const [versao, setVersao] = useState(0);      // força recarregar a página atual ao trocar a URL

  useEffect(() => {
    setOnline(null);
    api("/openapi.json").then(() => setOnline(true)).catch(() => setOnline(false));
  }, [urlApi]);

  const salvarUrl = (e) => {
    e.preventDefault();
    setBase(rascunho);
    setUrlApi(getBase());
    setVersao((v) => v + 1);
    setEditandoUrl(false);
  };

  const Atual = PAGINAS.find((p) => p.key === pagina).comp;

  return (
    <>
      <header className="topo">
        <div className="marca">UFSC<span>Achados</span></div>
        <nav>
          {PAGINAS.map((p) => (
            <button key={p.key} className={p.key === pagina ? "nav ativo" : "nav"} onClick={() => setPagina(p.key)}>{p.rotulo}</button>
          ))}
        </nav>
        <button className="api-badge" onClick={() => { setRascunho(urlApi); setEditandoUrl(!editandoUrl); }} title="Configurar URL da API">
          <i className={online === null ? "ponto" : online ? "ponto on" : "ponto off"} />
          {online === null ? "Conectando…" : online ? "API online" : "API offline"}
        </button>
      </header>

      {editandoUrl && (
        <form className="url-form" onSubmit={salvarUrl}>
          <label>URL da API (back-end)
            <input value={rascunho} onChange={(e) => setRascunho(e.target.value)} placeholder="https://xxxx.trycloudflare.com" />
          </label>
          <button>Salvar</button>
          <button type="button" className="secundario" onClick={() => setEditandoUrl(false)}>Fechar</button>
        </form>
      )}
      {online === false && !editandoUrl && (
        <div className="faixa-offline">
          Sem conexão com <strong>{urlApi}</strong>. Confira se o back-end e o túnel estão rodando e, se a URL do túnel mudou, clique em “API offline” para atualizá-la.
        </div>
      )}

      <main><Atual key={`${pagina}-${versao}`} /></main>
      <footer>UFSCAchados · Banco de Dados I (DEC7129) · UFSC Araranguá</footer>
    </>
  );
}
