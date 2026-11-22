import { useEffect, useState } from "react";
import { api, urlCompleta } from "../api.js";
import { Aviso, Tabela, useAcao } from "../ui.jsx";

const RELATORIOS = [
  { key: "bloco", titulo: "Objetos por bloco", caminho: "/relatorios/objetos-por-bloco",
    desc: "Quais blocos/prédios concentram mais objetos. JOIN entre Objeto, Local Específico e Bloco/Prédio, com COUNT agrupado por bloco." },
  { key: "cat", titulo: "Itens por categoria e status", caminho: "/relatorios/itens-por-categoria-status",
    desc: "Quantidade de itens em cada categoria e situação do ciclo de vida. JOIN entre Objeto, Categoria e Status, com COUNT." },
  { key: "reiv", titulo: "Reivindicações por status e categoria", caminho: "/relatorios/reivindicacoes-por-status-categoria",
    desc: "Como as solicitações de posse se distribuem por status e categoria do objeto. JOIN entre Reivindicação, Objeto e Categoria, com COUNT." },
];

// Consultas analíticas do item 6/7c: tabela (JSON) + gráfico (PNG gerado pelo Matplotlib)
export default function Relatorios() {
  const [ativo, setAtivo] = useState(RELATORIOS[0]);
  const [dados, setDados] = useState([]);
  const [versao] = useState(() => Date.now());   // fixo por visita: evita pedir a mesma imagem duas vezes
  const [imgErro, setImgErro] = useState(false);
  const { carregando, erro, executar } = useAcao();

  useEffect(() => {
    setDados([]); setImgErro(false);
    executar(async () => setDados(await api(ativo.caminho)));
  }, [ativo, executar]);

  return (
    <section>
      <h2>Relatórios e gráficos</h2>
      <div className="abas">
        {RELATORIOS.map((r) => (
          <button key={r.key} className={r.key === ativo.key ? "aba ativa" : "aba"} onClick={() => setAtivo(r)}>{r.titulo}</button>
        ))}
      </div>
      <p className="sub">{ativo.desc}</p>
      <Aviso>{erro}</Aviso>
      {carregando && <p className="vazio">Carregando…</p>}
      <div className="duas-colunas">
        <div>
          <h3>Resultado (tabela)</h3>
          <Tabela linhas={dados} />
        </div>
        <div>
          <h3>Gráfico</h3>
          {imgErro
            ? <Aviso>Não foi possível carregar o gráfico.</Aviso>
            : <img key={ativo.key} className="grafico" alt={`Gráfico: ${ativo.titulo}`} src={`${urlCompleta(ativo.caminho)}/grafico?t=${versao}`} onError={() => setImgErro(true)} />}
        </div>
      </div>
    </section>
  );
}
