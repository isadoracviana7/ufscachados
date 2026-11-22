import { useState } from "react";
import { api, getAdminKey, setAdminKey } from "../api.js";
import { Aviso, useAcao } from "../ui.jsx";

// Item 7e: criar tabelas + carga inicial, e eliminar todas as tabelas
export default function Admin() {
  const [chave, setChave] = useState(getAdminKey());
  const [msg, setMsg] = useState("");
  const { carregando, erro, executar } = useAcao();

  const inicializar = () => executar(async () => {
    setAdminKey(chave); setMsg("");
    const r = await api("/banco/inicializar", { method: "POST", admin: true });
    setMsg(r.mensagem);
  });
  const limpar = () => {
    if (!window.confirm("Isso APAGA todas as tabelas e dados do banco. Continuar?")) return;
    executar(async () => {
      setAdminKey(chave); setMsg("");
      const r = await api("/banco/limpar", { method: "DELETE", admin: true });
      setMsg(r.mensagem);
    });
  };

  return (
    <section>
      <h2>Administração do banco</h2>
      <p className="sub">Cria as 15 tabelas com a carga inicial, ou elimina todas. Se o back-end tiver ADMIN_KEY no .env, informe a mesma chave abaixo.</p>
      <label className="campo largo"><span>Chave de administrador (ADMIN_KEY)</span>
        <input type="password" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="deixe vazio se o back não exige" />
      </label>
      <div className="linha">
        <button onClick={inicializar} disabled={carregando}>Criar tabelas e popular</button>
        <button className="perigo" onClick={limpar} disabled={carregando}>Eliminar todas as tabelas</button>
      </div>
      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{msg}</Aviso>
    </section>
  );
}
