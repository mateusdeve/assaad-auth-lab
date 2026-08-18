# Fase 1 — App autenticado ingênuo (o bug plantado)

Objetivo: reproduzir fielmente o setup que causa o "deslogamento aleatório"
do enunciado, antes de instrumentar (Fase 2), demonstrar multi-aba (Fase 3)
e corrigir (Fase 4).

## O que foi construído

- `src/lib/supabase/server.ts` — server client (`@supabase/ssr`, API
  `getAll`/`setAll`), um por request.
- `src/lib/supabase/client.ts` — browser client (singleton).
- `/login` — login/signup por e-mail+senha via Server Actions
  (`src/app/login/actions.ts`). Server Actions podem escrever cookies, então
  o fluxo de entrada é sólido.
- `/dashboard` — rota protegida no próprio RSC com `auth.getUser()`
  (validação junto do dado, não no proxy — CVE-2025-29927). Inclui
  `SessionPanel`, que mostra a sessão **como o browser a vê** (expiração,
  sufixo do refresh token, eventos `onAuthStateChange`).

## O bug intencional (NÃO corrigir antes da Fase 4)

**Não existe `proxy.ts`.** A cadeia do defeito:

1. Access token expira (usuário inativo, aba em segundo plano).
2. Próxima requisição SSR: `getUser()` no RSC → `@supabase/ssr` tenta
   renovar a sessão usando o refresh token do cookie.
3. GoTrue rotaciona: devolve access token novo + refresh token novo e marca
   o antigo como consumido (uso único).
4. O `setAll` tenta persistir os cookies novos, mas **RSC não pode escrever
   cookies** — o `try/catch` (igual ao da doc oficial do Supabase) engole o
   erro. Os tokens novos são perdidos.
5. O cookie do browser continua com o refresh token ANTIGO, já consumido.
6. Qualquer renovação futura (outra aba, auto-refresh do cliente, novo SSR
   fora da janela de tolerância de reuso do GoTrue) → `Invalid Refresh
   Token: Already Used` → GoTrue revoga a família de tokens → logout.

Isso explica os sintomas do enunciado: sem padrão de tempo claro (depende de
quando o token expira e de qual requisição chega primeiro), pior ao trocar
de aba (várias renovações concorrentes) e após inatividade (expiração
garantida).

## Decisões e justificativas

- **Next 16**: convenção é `proxy.ts` (export `proxy`), não `middleware.ts`
  — a ausência dele na Fase 1 é o análogo exato de "esqueceram o middleware"
  da doc do Supabase para Next 15.
- **`getUser()` e não `getSession()` no servidor**: `getSession()` só lê o
  cookie sem validar assinatura/expiração no Auth server. Mantido correto
  desde a Fase 1 porque não faz parte do bug investigado.
- **Proteção no RSC/DAL e não no proxy**: CVE-2025-29927 mostrou que
  middleware pode ser contornado (`x-middleware-subrequest`); autorização
  mora junto do dado. O proxy (Fase 4) só renovará token e escreverá cookie.
- **Server Actions para login/logout**: podem escrever cookies; formulário
  funciona sem JS; erros via `useActionState`.

## Como rodar

```bash
npm run dev
```

Requer `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Crie uma conta em `/login` (se o projeto
Supabase exigir confirmação de e-mail, confirme antes de entrar).

Nesta fase o bug ainda não é fácil de observar a olho nu: com JWT de 1h ele
é raro por natureza ("aleatório"). A Fase 2 instrumenta o app e encurta a
expiração para tornar a corrida reproduzível em segundos.
