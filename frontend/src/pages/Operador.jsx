import { useState } from "react";
import { api } from "../api.js";
import { Aviso, Campo, useAcao } from "../ui.jsx";

// Fluxos de negócio exclusivos do operador do protocolo
export default function Operador() {
  const [idOperador, setIdOperador] = useState("2");
  const [idReiv, setIdReiv] = useState("1");
  const [aprovada, setAprovada] = useState("true");
  const [obs, setObs] = useState("Conferido presencialmente no balcão.");
  const [idObjeto, setIdObjeto] = useState("1");
  const [conferencia, setConferencia] = useState(null);
  const [resultado, setResultado] = useState(null);
  const { carregando, erro, setErro, executar } = useAcao();

  const conferir = () => executar(async () => {
    setResultado(null);
    setConferencia(await api(`/operacoes/conferir-reivindicacao/${idReiv}`, { query: { id_operador: idOperador } }));
  });
  const avaliar = () => executar(async () => {
    setConferencia(null);
    setResultado(await api("/operacoes/avaliar-reivindicacao", { method: "POST", body: {
      id_reivindicacao: Number(idReiv), id_operador: Number(idOperador), aprovada: aprovada === "true", observacao_operador: obs || null } }));
  });
  const vencimentos = () => executar(async () => {
    setConferencia(null);
    setResultado(await api("/operacoes/processar-vencimentos", { method: "POST", query: { id_operador: idOperador } }));
  });
  const match = () => executar(async () => {
    setConferencia(null);
    setResultado(await api(`/operacoes/executar-match/${idObjeto}`, { method: "POST" }));
  });

  return (
    <section>
      <h2>Painel do operador</h2>
      <p className="sub">Fluxos transacionais. No seed, os operadores são os usuários 2 e 6.</p>
      <div className="form-grade">
        <Campo rotulo="ID do operador"><input type="number" value={idOperador} onChange={(e) => setIdOperador(e.target.value)} /></Campo>
        <Campo rotulo="ID da reivindicação"><input type="number" value={idReiv} onChange={(e) => setIdReiv(e.target.value)} /></Campo>
      </div>

      <div className="painel">
        <h3>1. Conferir segredo</h3>
        <button onClick={conferir} disabled={carregando}>Conferir reivindicação</button>
      </div>

      <div className="painel">
        <h3>2. Avaliar reivindicação</h3>
        <div className="form-grade">
          <Campo rotulo="Decisão">
            <select value={aprovada} onChange={(e) => setAprovada(e.target.value)}>
              <option value="true">Aprovar</option><option value="false">Rejeitar</option>
            </select>
          </Campo>
          <Campo rotulo="Observação"><input value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
          <button onClick={avaliar} disabled={carregando}>Registrar decisão</button>
        </div>
      </div>

      <div className="painel">
        <h3>3. Expirar prazos vencidos</h3>
        <button onClick={vencimentos} disabled={carregando}>Processar vencimentos</button>
      </div>

      <div className="painel">
        <h3>4. Match automático (achado × alerta de perdido)</h3>
        <div className="form-grade">
          <Campo rotulo="ID do objeto"><input type="number" value={idObjeto} onChange={(e) => setIdObjeto(e.target.value)} /></Campo>
          <button onClick={match} disabled={carregando}>Executar match</button>
        </div>
      </div>

      <Aviso>{erro}</Aviso>
      {conferencia && (
        <div className="painel destaque">
          <h3>Comparação para a reivindicação #{conferencia.id_reivindicacao} ({conferencia.status_atual})</h3>
          <p className="meta">Solicitante: {conferencia.solicitante.nome} ({conferencia.solicitante.email})</p>
          <p className="meta">Objeto: {conferencia.objeto.descricao_publica}</p>
          <div className="duas-colunas">
            <div className="comparar"><strong>Segredo cadastrado</strong><p>{conferencia.comparacao_seguranca.segredo_real_cadastrado}</p></div>
            <div className="comparar"><strong>Justificativa do solicitante</strong><p>{conferencia.comparacao_seguranca.justificativa_informada_pelo_usuario}</p></div>
          </div>
        </div>
      )}
      {resultado && <pre className="json">{JSON.stringify(resultado, null, 2)}</pre>}
    </section>
  );
}
