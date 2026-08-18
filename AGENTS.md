<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras do projeto

- Next.js 16: use `proxy.ts` (export `proxy`), NUNCA `middleware.ts`.
- A doc oficial do @supabase/ssr ainda ensina `middleware.ts` — adaptar, não copiar.
- `proxy.ts` só faz refresh de token e escrita de cookie.
  Autorização NÃO mora ali (CVE-2025-29927). Vai no DAL/RSC/Route Handler.
- Sempre `getUser()` para verificar, nunca `getSession()` em servidor.
- API de cookies do @supabase/ssr: `getAll`/`setAll`. `get`/`set`/`remove` é deprecado.
- Nunca usar service_role key.
- Antes de escrever código, ler o doc relevante em node_modules/next/dist/docs/.
- Fases 1–3 constroem o bug DE PROPÓSITO. Não corrigir antecipadamente.
