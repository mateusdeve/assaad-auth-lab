# Parte 1 — Avaliação teórica

Respostas em formato de posição defensável, com exemplos deste repositório
onde couber (a parte prática virou laboratório para várias delas).

---

## 1. Server Components vs Client Components numa área autenticada

**Regra de bolso:** Server Component é o default; Client Component é
exceção justificada por interatividade (estado, eventos, efeitos, APIs de
browser). O ganho dos RSCs não é só bundle menor — é poder buscar dados
perto da fonte, com segredos que nunca chegam ao cliente, e enviar HTML
pronto.

**Numa área autenticada isso vira arquitetura:**

- **Proteção de rota mora junto do dado** — no RSC/DAL/Route Handler, não
  em middleware. O CVE-2025-29927 (bypass do middleware via header
  `x-middleware-subrequest`) provou que autorização centralizada no
  middleware é uma linha de defesa que pode simplesmente não rodar. No lab:
  `dashboard/page.tsx` decide com `supabase.auth.getUser()`; o `proxy.ts`
  só renova token e escreve cookie.
- **Sessão SSR vs cliente são duas visões que podem divergir** — e essa
  divergência é bug de produção real (a parte prática inteira é sobre
  isso). O servidor enxerga a sessão pelo cookie da requisição; o cliente,
  pela memória do supabase-js + cookie vivo. Quem renova token no fluxo SSR
  tem que conseguir *persistir* a renovação (middleware/proxy — RSC não
  escreve cookie), senão as duas visões dessincronizam.
- **`getUser()` no servidor, nunca `getSession()`**: `getSession()` só lê
  o cookie (que o cliente controla); `getUser()` valida contra o Auth
  server. Em RSC, custo de rede se paga com segurança.
- **Composição típica:** página RSC autentica e busca dados → passa para
  ilhas client pequenas (player, editor, formulário). Client Components no
  nível das folhas, não no topo da árvore — `"use client"` no layout raiz
  arrasta a aplicação inteira para o cliente.

---

## 2. TanStack Query para dados autenticados

**Papel:** TanStack Query é cache de estado de servidor no cliente — dono
do ciclo busca/stale/revalidação. Com dados autenticados, as decisões que
importam:

- **Identidade no cache:** a query key precisa incluir a identidade quando
  o dado é por usuário (`['courses', userId]`). A armadilha clássica é
  logout/troca de conta com cache quente: dados do usuário A renderizados
  para o usuário B. No logout, `queryClient.clear()` (ou `removeQueries` do
  escopo autenticado) é obrigatório.
- **401 é sinal, não erro comum:** o `retry` default (3x) reexecuta
  inclusive 401 — inútil e barulhento. Config global: não fazer retry de
  4xx; num 401, acionar o fluxo de recuperação de sessão (no lab:
  `SessionRecovery` tenta `/auth/recover` antes de redirecionar) e só
  então invalidar.
- **Invalidação por evento, não por palpite:** mutation bem-sucedida →
  `invalidateQueries` do escopo afetado (granular, não `clear`).
  `staleTime` realista por recurso (perfil: minutos; lista colaborativa:
  segundos) evita refetch storm em `refetchOnWindowFocus` — que eu mantenho
  ligado para dados que outros atores mudam, e desligo para dados imutáveis.
- **Optimistic updates com disciplina:** `onMutate` (cancela queries em
  voo + snapshot + aplica otimista) / `onError` (rollback do snapshot) /
  `onSettled` (invalida). A armadilha é otimizar sem rollback ou esquecer
  o `cancelQueries` — um refetch em voo sobrescreve o estado otimista.
- **SSR/App Router:** prefetch no servidor + `HydrationBoundary` para não
  buscar duas vezes; um `QueryClient` **por request** no servidor (nunca
  singleton — vaza dado entre usuários, mesma classe de bug do cliente
  Supabase compartilhado).

---

## 3. Nanostores vs `useState` vs TanStack Query

Três donos para três tipos de estado; o erro comum é usar um no lugar do
outro.

- **`useState`/`useReducer` — estado local de UI:** vive e morre com o
  componente. Input controlado, aba ativa, modal aberto. Se só um
  componente (e filhos diretos) lê, não sai daqui. Promover cedo demais
  para estado global é a fonte nº 1 de re-render desnecessário.
- **TanStack Query — estado de servidor:** qualquer coisa que o backend é
  a fonte da verdade (lista de cursos, perfil, progresso do aluno). Não é
  "estado global que veio de fetch" — é *cache* com política de validade.
  Duplicá-lo num store global cria duas fontes da verdade que divergem.
- **Nanostores — estado global de cliente:** o que é do cliente, cruza a
  árvore e não pertence ao servidor: tema, preferências de player
  (volume/velocidade), rascunho de resposta ainda não submetido, flags de
  UI compartilhadas entre ilhas. O atrativo do Nanostores no App Router é
  ser leve e framework-agnóstico: cada ilha client assina só o átomo que
  usa (`useStore`), sem Provider gigante — bom para arquiteturas com
  poucas ilhas interativas em páginas RSC.

**Exemplo integrado (player de vídeo):** posição atual do vídeo =
`useState` (ou ref) no player; volume/velocidade preferidos = Nanostores
(persistem entre aulas); "aula concluída" = mutation TanStack Query com
update otimista na lista de progresso.

No lab, o "estado global" de auth ficou onde deve: no supabase-js
(sincronizado por cookie + BroadcastChannel), com os componentes assinando
`onAuthStateChange` — a lição da Fase 3 é que espelhar sessão em outro
store cria exatamente a dessincronização que causava o bug.

---

## 4. Formulários grandes e complexos (react-hook-form + zod)

- **Por que RHF:** inputs não controlados por default — digitar num campo
  não re-renderiza o formulário inteiro. Num editor de questões com dezenas
  de campos, isso é a diferença entre INP saudável e formulário que
  "engasga". `watch` global é a armadilha que joga esse ganho fora: usar
  `useWatch` escopado no campo/subárvore que precisa reagir.
- **Zod como fonte única da verdade:** um schema, três usos — tipos
  (`z.infer`), validação client (resolver) e **revalidação no servidor**
  (Server Action/Route Handler — validação de cliente é UX, não segurança).
  Schemas compostos (`discriminatedUnion` para tipos de questão,
  `superRefine` para regras cruzadas como "gabarito ∈ alternativas").
- **Formulário grande = formulário fatiado:** `useFieldArray` para
  coleções (alternativas, seções); wizard com um schema por etapa
  (`schema.pick(...)`) validando na transição; autosave de rascunho com
  debounce (mutation idempotente) para ninguém perder 40 minutos de edição
  — o submit final valida o schema completo.
- **UX de erro:** validar `onBlur`/`onSubmit` (validar a cada tecla pune
  quem ainda está digitando), mensagens no campo + resumo no topo com
  âncoras nos campos inválidos e `focus` no primeiro erro. Estados de
  submissão explícitos (pending/erro de servidor mapeado de volta ao campo
  via `setError`).
- **No App Router:** RHF + Server Actions convivem bem — `useActionState`
  para o resultado do servidor (como no `/login` do lab, onde o erro do
  Supabase volta para a UI sem JS obrigatório) e RHF para a experiência
  rica no cliente.

---

## 5. Diagnóstico e melhoria de LCP/INP em app Next pesado

**Primeiro medir, depois mexer** — a parte prática deste repo é o
argumento: a hipótese inicial estava incompleta até a instrumentação
(Fase 2) mostrar a graça do GoTrue. Performance é igual.

- **Diagnóstico:** dados de campo primeiro (CrUX/RUM — `web-vitals` ou
  Vercel Analytics) para saber *onde* dói em dispositivo real; depois
  reproduzir em lab (Lighthouse/DevTools com throttling, React Profiler,
  flamegraph de INP para achar long tasks e handlers lentos).
- **LCP** (provável vilão: capa/poster do player ou hero da página):
  - o elemento LCP não pode esperar JS: imagem com `next/image` +
    `priority`/`fetchpriority=high`, `preconnect` ao CDN de mídia;
  - player de vídeo **não** entra no bundle inicial: `next/dynamic` com
    `ssr: false`, renderizando um poster estático clicável (facade) — o
    player carrega na intenção de uso;
  - RSC + streaming: shell estático servido já, dados pesados atrás de
    `Suspense` — o LCP não espera a query mais lenta da página;
  - fontes com `next/font` (self-host, `display: swap`, sem layout shift).
- **INP** (provável vilão: editor de questões re-renderizando o mundo):
  - quebrar o estado — RHF não controlado, `useWatch` escopado, memo nas
    linhas de listas; virtualização (TanStack Virtual) em listas longas;
  - separar urgente de adiável: `useTransition`/`useDeferredValue` para
    preview/busca enquanto a digitação continua fluida;
  - long tasks para fora da main thread (sanitização/diff pesado em Web
    Worker) e hidratação menor = menos JS: mover o que não é interativo
    de volta para RSC.
- **Regressão sob controle:** budget de performance no CI (Lighthouse CI)
  e `@next/bundle-analyzer` no PR — performance é processo, não sprint.

---

## 6. Acessibilidade e consistência de UI (Tailwind + Radix)

- **Radix resolve o que é difícil de fazer certo à mão:** foco gerenciado,
  navegação por teclado, ARIA e dismissal corretos em Dialog, Dropdown,
  Popover, Tabs. A regra do time: interação com semântica não-trivial
  começa em primitivo Radix (ou nativo); `div onClick` não passa em review.
  Tailwind cuida da aparência; Radix, do comportamento — a separação é o
  que mantém acessibilidade consistente sob pressão de prazo.
- **Consistência com Tailwind = design tokens, não classes soltas:** tema
  no `@theme`/config (cores semânticas `bg-surface`, `text-danger`,
  espaçamento, tipografia) e componentes de UI encapsulando as receitas
  (com `cva` para variantes tipadas). Classe arbitrária (`text-[#hex]`)
  em página é code smell; se o token não existe, a conversa é com o design
  system.
- **Acessibilidade como critério de aceite:** foco visível
  (`focus-visible:` em tudo interativo), contraste validado nos tokens
  (não caso a caso), formulários com `label`/`aria-describedby` de erro
  (RHF + `aria-invalid`), `prefers-reduced-motion` respeitado, e conteúdo
  dinâmico anunciado (`role="status"`/`aria-live` — como o aviso do
  `SessionRecovery` no lab).
- **Verificação em camadas:** eslint-plugin-jsx-a11y + axe nos testes de
  componente (falha o CI), teste manual de teclado nos fluxos críticos, e
  leitor de tela (VoiceOver/NVDA) nos fluxos de dinheiro/avaliação. Radix
  dá a base, mas composição errada quebra a11y do mesmo jeito — automação
  pega o grosso, gente pega o resto.
