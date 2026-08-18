# Fase 3 — Demonstração multi-aba

Requisito (4) do teste: demonstrar o cenário com múltiplas abas abertas.

![Demo multi-aba](assets/demo-multi-aba-logout.gif)

## Como a demo funciona

- **`/demo`**: dois iframes same-origin do `/dashboard`, lado a lado. Cada
  iframe é um contexto JS isolado com seu próprio supabase-js (como abas
  reais), e todos compartilham o mesmo cookie de sessão — a topologia exata
  do bug. Iframes em vez de abas reais só para caber tudo numa gravação;
  o comportamento é idêntico com duas abas/janelas.
- **"🧊 Demo: aba congelada"** (`demo-congelamento.tsx`): simula uma aba que
  congelou (background com timers suspensos, laptop que dormiu) segurando
  uma sessão antiga:
  1. **Congelar** captura a sessão atual (o refresh token P).
  2. O auto-refresh das "abas" segue rotacionando (P → C1 → C2…) — o painel
     mostra a cadeia avançando (~30s por rotação com `jwt_expiry=30`).
  3. **Acordar** grava a sessão congelada por cima do cookie compartilhado —
     a corrida de escrita não-atômica em `document.cookie` que acontece
     entre abas reais — e recarrega o iframe.
  A partir do passo 3, só rodam caminhos reais de produção: nada na demo
  chama a API do GoTrue diretamente.

## O que a gravação mostra

1. As duas abas saudáveis, mesmo refresh token em memória e cookie.
2. Aba B congela; a cadeia avança; o aviso fica vermelho quando o reuso do
   token congelado se tornou fatal (rotação + janela de 10s vencida).
3. Aba B acorda: o SSR recebe o cookie defasado, tenta renovar com token já
   consumido (`refresh_token_already_used`), `getUser()` falha → expulsa
   para `/login`.
4. **Aba A — que estava perfeitamente saudável — desloga sozinha**: o
   auto-refresh dela lê o cookie compartilhado (agora defasado), toma
   `HTTP 400`, e o auth-js apaga a sessão: `refresh_fail` → `SIGNED_OUT`
   no painel. O usuário é derrubado em todas as abas de uma sessão que o
   GoTrue ainda considerava recuperável (Fase 2, achado 4).

## Notas de implementação descobertas nesta fase

- **Não fazer polling com `getSession()`**: com JWT curto, cada chamada
  dentro da margem de expiração dispara um refresh — vira tempestade de
  rotações. Observabilidade via `onAuthStateChange`.
- **Vários cookies `sb-*-auth-token` podem coexistir** no mesmo host (outros
  projetos em localhost): o nome certo é derivado da URL do Supabase
  (`sb-<primeiro rótulo do host>-auth-token`), como o supabase-js faz.
- O valor `base64-` do cookie é base64url **sem padding** — repor o padding
  antes de `atob`.

## Reproduzir manualmente

1. `supabase start` + `npm run dev`
2. Login em `/login` (`teste@authlab.dev` / `senha-lab-123`)
3. Abrir `/demo`
4. Na Aba B: **Congelar** → esperar o aviso ficar vermelho (~40s) →
   **Acordar**
5. Observar a Aba B ser expulsa e a Aba A deslogar sozinha em seguida
