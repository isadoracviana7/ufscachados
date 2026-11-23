<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture
- Keep TanStack Start and its Vite bootstrap for routing and SSR; all content pages live under `src/routes` so the Lovable runtime remains supported.
- Route components use `AppProvider` for the simulated session and object refresh; the profile selector is a demo, never an authentication boundary.
- All FastAPI traffic goes through `src/services/api.ts`; fall back only on transport failures, never mask HTTP validation or server errors as successful demo writes.
- Demo data is session-memory only and secrets are separate from public item records; browser demo data does not provide production secrecy.
- The FastAPI source remains external: do not provision a replacement database or auth service for this frontend-only integration.
- Derive management forms from the attached backend's Pydantic schemas and permit only the fields accepted by each update endpoint to preserve request compatibility.
- All visual tokens and responsive rules live in `src/styles.css`; media imports use registered asset pointers, except the small public favicon.
- Pre-bundle route-only client libraries in `vite.config.ts` `optimizeDeps.include`; late dependency discovery can load duplicate React copies in an open preview.
