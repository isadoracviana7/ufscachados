# UFSCAchados — Front-end (React + Vite)

Front do trabalho de Banco de Dados I. Roda no **Vercel** e conversa com o **back FastAPI + PostgreSQL local** do seu computador por meio de um **túnel Cloudflare** (que dá uma URL https pública para o seu `localhost:8000`).

```
Navegador ──► Front (Vercel, https) ──► Túnel Cloudflare (https) ──► FastAPI (seu PC :8000) ──► PostgreSQL (seu PC)
```

## Telas
Mural público · Busca IA (Gemini) · CRUD das 15 tabelas · Relatórios (tabela + gráfico) · Painel do operador · Admin (criar/eliminar tabelas)

---

## PARTE 1 — Preparar o back (no seu PC)

1. Substitua no projeto do back: `main.py`, `routers/ia.py` e `routers/relatorios.py` pelos novos.
2. No `.env` do back, adicione (veja `.env.example`):
   ```
   ADMIN_KEY=uma-senha-sua
   CORS_ORIGINS=http://localhost:5173
   ```
   Qualquer endereço `*.vercel.app` já é aceito pelo CORS. Se usar domínio próprio, coloque-o em `CORS_ORIGINS`.
3. Suba o back:
   ```
   uvicorn main:app --port 8000
   ```
   Teste em http://127.0.0.1:8000/docs.

## PARTE 2 — Testar o front localmente (opcional, 2 minutos)

```
cd ufscachados-front
npm install
npm run dev
```
Abra http://localhost:5173. O canto superior direito deve mostrar **API online**.
Na aba **Admin**, informe a `ADMIN_KEY` e clique em "Criar tabelas e popular".

## PARTE 3 — Abrir o túnel

1. Instale o cloudflared:
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Mac: `brew install cloudflared`
2. Com o back rodando, execute em **outro terminal**:
   ```
   cloudflared tunnel --url http://localhost:8000
   ```
3. Ele imprime uma URL parecida com `https://alguma-coisa.trycloudflare.com`. **Copie.**
   Teste abrindo `https://alguma-coisa.trycloudflare.com/docs` no navegador.

> A URL muda toda vez que você reinicia o túnel, e o túnel só funciona com seu PC ligado, o back rodando e o terminal do cloudflared aberto.

## PARTE 4 — Publicar o front no Vercel

1. Crie um repositório no GitHub só com a pasta do front (sem `node_modules`; o `.gitignore` já cuida disso) e faça o push.
2. Em vercel.com → **Add New → Project** → importe o repositório. O Vercel detecta Vite sozinho (Build: `npm run build`, Output: `dist`).
3. (Opcional) Em **Environment Variables**, crie `VITE_API_URL` com a URL do túnel. Não é obrigatório, veja abaixo.
4. **Deploy.**

## PARTE 5 — Ligar o front ao túnel (e religar quando a URL mudar)

Abra o site do Vercel → clique no selo **API offline/online** no canto superior direito → cole a URL do túnel → **Salvar**.
A URL fica salva no navegador, então **não precisa refazer o deploy** quando o túnel mudar; é só colar a nova.

---

## Checklist antes de apresentar
- [ ] PostgreSQL ligado, back rodando (`uvicorn`), túnel aberto
- [ ] Selo mostra **API online** no site do Vercel
- [ ] Admin → "Eliminar todas as tabelas" → "Criar tabelas e popular"
- [ ] Mural, CRUD (inserir/editar/excluir), 3 relatórios com gráfico, Operador, Busca IA
- [ ] Plano B: `npm run dev` local, ou o `/docs` do back

## Problemas comuns
| Sintoma | Causa / solução |
|---|---|
| "API offline" | Back ou túnel parado, ou URL do túnel mudou. Atualize a URL pelo selo. |
| Erro de CORS no console | A origem do front não está liberada. `*.vercel.app` já é aceito; para outro domínio use `CORS_ORIGINS`. |
| Admin responde 401 | `ADMIN_KEY` do front diferente da do `.env` do back. |
| Busca IA com erro 503 | Gemini sobrecarregado. O back já tenta de novo e troca de modelo; tente outra vez. |
| Gráfico não aparece | Back fora do ar ou banco vazio (use Admin → Criar tabelas). |
