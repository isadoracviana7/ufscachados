import { useState, useCallback } from "react";

// Executa uma chamada assíncrona controlando carregando/erro
export function useAcao() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const executar = useCallback(async (fn) => {
    setCarregando(true);
    setErro("");
    try { return await fn(); }
    catch (e) { setErro(e.message || String(e)); return undefined; }
    finally { setCarregando(false); }
  }, []);
  return { carregando, erro, setErro, executar };
}

export function Aviso({ tipo = "erro", children }) {
  if (!children) return null;
  return <div className={`aviso ${tipo}`} role={tipo === "erro" ? "alert" : "status"}>{children}</div>;
}

export function Tabela({ linhas, acoes }) {
  if (!linhas || linhas.length === 0) return <p className="vazio">Nenhum registro.</p>;
  const colunas = Object.keys(linhas[0]).filter((c) => typeof linhas[0][c] !== "object" || linhas[0][c] === null);
  return (
    <div className="tabela-wrap">
      <table>
        <thead>
          <tr>{colunas.map((c) => <th key={c}>{c}</th>)}{acoes && <th>Ações</th>}</tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {colunas.map((c) => <td key={c}>{l[c] === null || l[c] === undefined ? "—" : String(l[c])}</td>)}
              {acoes && <td className="acoes">{acoes(l)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Campo({ rotulo, children }) {
  return <label className="campo"><span>{rotulo}</span>{children}</label>;
}
