import { useState } from "react";
import { api } from "../api.js";
import { Aviso, useAcao } from "../ui.jsx";

// Busca semântica com Gemini: POST /ia/buscar-objeto
export default function Busca() {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState(null);
  const { carregando, erro, executar } = useAcao();

  const buscar = (e) => {
    e.preventDefault();
    executar(async () => {
      setResultados(null);
      setResultados(await api("/ia/buscar-objeto", { method: "POST", body: { descricao_usuario: texto } }));
    });
  };

  return (
    <section>
      <h2>Busca inteligente (IA)</h2>
      <p className="sub">Descreva o que você perdeu com suas palavras. O Gemini compara com os itens do acervo e ranqueia os mais compatíveis.</p>
      <form onSubmit={buscar} className="coluna">
        <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} minLength={3} required
          placeholder="Ex.: Esqueci um carregador preto na biblioteca ontem à tarde" />
        <button disabled={carregando}>{carregando ? "Consultando a IA… (pode levar alguns segundos)" : "Buscar com IA"}</button>
      </form>
      <Aviso>{erro}</Aviso>
      {resultados && resultados.length === 0 && <p className="vazio">A IA não encontrou nenhum item compatível.</p>}
      <div className="grade">
        {(resultados || []).map((r) => (
          <article className="card" key={r.id_objeto}>
            <div className="card-topo">
              <span className={`chip grau-${r.grau_compatibilidade.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}`}>
                Compatibilidade {r.grau_compatibilidade}
              </span>
              <span className="chip suave">#{r.id_objeto}</span>
            </div>
            <h3>{r.descricao_publica}</h3>
            <p className="meta">🤖 {r.justificativa}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
