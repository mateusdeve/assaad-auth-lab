# Fase 2 — Ambiente reproduzível + instrumentação (confirmar com dados)

O enunciado manda "investigar e confirmar com dados antes de propor a
correção". Esta fase torna o bug observável e mensurável.

## Ambiente local determinístico

- `supabase init` + `supabase start` (stack local via Docker).
- `supabase/config.toml`:
  - `jwt_expiry = 30` — access token expira em 30s; a corrida que em produção
    leva horas para aparecer vira questão de segundos.
  - `token_refresh = 1000` — rate limit elevado só para o lab.
  - Mantidos os defaults de produção que importam para o bug:
    `enable_refresh_token_rotation = true` e
    `refresh_token_reuse_interval = 10`.
- `.env.development.local` aponta o app para o Supabase local (sobrepõe o
  `.env.local` em dev; a chave publishable local é default público do CLI).
- Usuário de teste criado por signup comum (`teste@authlab.dev`) — nunca
  service_role.

## Instrumentação

- `src/lib/supabase/instrument.ts` — `fetch` interceptado nos DOIS clientes:
  loga toda chamada a `/auth/v1/token` (grant, latência, sufixo do refresh
  token novo, ou o erro do GoTrue em caso de falha).
- `src/lib/supabase/server.ts` — loga no terminal (`[authlab server]`):
  - `refresh_ok` / `refresh_fail` — renovações feitas pelo servidor;
  - `cookie_write` — sessão persistida com sucesso (Server Action/Route
    Handler);
  - `cookie_write_dropped` — **o flagrante**: rotação aconteceu dentro de um
    RSC, o Next proibiu a escrita do cookie e o refresh token novo foi
    perdido.
- `src/lib/supabase/client.ts` — mesmos logs no console do browser +
  `CustomEvent` consumido pelo painel.
- `SessionPanel` agora compara o refresh token **na memória do cliente** com
  o refresh token **no cookie** (o que o servidor usa) e acende o selo
  "DESSINCRONIZADO" quando divergem — a dessincronização servidor×cliente do
  enunciado, visível em tempo real.

## O experimento e o que os dados mostraram

`scripts/reproduzir-bug.sh` (requer `supabase start` + `npm run dev`; se a
porta 3000 estiver ocupada, `APP_URL=http://localhost:<porta> bash
scripts/reproduzir-bug.sh`). Resultado observado — que **refinou a hipótese
inicial**:

1. **SSR pós-expiração**: terminal mostra `refresh_ok` seguido de
   `cookie_write_dropped` — o RSC rotaciona o token e perde o cookie novo,
   a cada requisição. Confirmado nos logs.
2. **Grace do GoTrue**: enquanto o filho do token reutilizado está sem uso,
   o GoTrue devolve **o mesmo filho** (recuperação benigna) — mesmo fora da
   janela de 10s. Por isso o bug não explode imediatamente: o app "funciona",
   mas paga um round-trip de refresh (~70–140ms) em toda requisição SSR e o
   cookie nunca avança. É o estado latente que torna o logout "aleatório".
3. **O gatilho fatal**: quando a cadeia avança de verdade (auto-refresh de
   uma aba ativa consome C1 → C2), qualquer ator ainda segurando P (aba
   congelada que acordou, request em voo, cookie de outro dispositivo)
   recebe `400 refresh_token_already_used`.
4. **A sessão continuava viva**: após o erro em P, o refresh com C2 é
   aceito. O GoTrue (nesta versão) não revogou a família — quem desloga é o
   **cliente**: o auth-js, ao ver o erro, apaga a sessão/cookie
   compartilhado e todas as abas caem. O logout global é auto-infligido
   pelo front sobre uma sessão recuperável — é exatamente isso que o
   requisito (3) do teste (recuperar antes de redirecionar) corrige.

A demonstração multi-aba com UI real é a Fase 3.

Nota operacional: se o Docker publicar outro serviço na porta 3000 (caso
desta máquina: `crm-rtg-api-1`), o `next dev` sobe em outra porta — confira
o terminal e ajuste `APP_URL`.
