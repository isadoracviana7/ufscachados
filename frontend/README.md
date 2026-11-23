# UFSCAchados — Frontend

Interface em português do Sistema Inteligente de Gestão de Objetos Perdidos da UFSC.

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal. Para usar outra API, crie `.env.local` com:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

## Conectar ao FastAPI local

O navegador só consegue chamar o FastAPI se o backend permitir a origem do frontend. Adicione no `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173", "http://127.0.0.1:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Sem conexão, o app entra em **Modo demonstração** com registros temporários desta sessão.

## Rotas usadas

- Mural: `/operacoes/vitrine`, `/objetos`
- Publicação: `/objetos`, `/imagens`, `/operacoes/executar-match/{id}`
- Retirada e devolução: `/reivindicacoes`, `/operacoes/conferir-reivindicacao/{id}`, `/operacoes/avaliar-reivindicacao`
- Relatórios: `/relatorios/consulta-1-blocos`, `/relatorios/consulta-2-categorias-status`, `/relatorios/consulta-3-reivindicacoes` e seus gráficos
- Busca inteligente: `/ia/buscar-objeto` (`GEMINI_API_KEY` precisa estar configurada no backend)
- Gestão: todos os CRUDs de objetos, usuários, perfis, reivindicações, blocos, locais, catálogos, imagens, notificações e auditoria
- Rotinas: `/operacoes/processar-vencimentos`, `/banco/inicializar`, `/banco/limpar`
