import Link from "next/link";

const REPO = "https://github.com/mateusdeve/assaad-auth-lab";

const sintomas = [
  {
    titulo: "Sem padrão de tempo",
    texto:
      "Ora depois de minutos, ora depois de horas. Depende de quando o token expira e de qual requisição chega primeiro — por isso parece aleatório.",
  },
  {
    titulo: "Pior com várias abas",
    texto:
      "Cada aba renova a mesma sessão. Basta uma delas acordar com um token velho para derrubar todas as outras de uma vez.",
  },
  {
    titulo: "Depois da inatividade",
    texto:
      "Aba em segundo plano, laptop que dormiu: os timers congelam, o token vence e a volta do usuário dispara a corrida fatal.",
  },
];

const anatomia = [
  {
    n: "01",
    titulo: "A rotação se perde no SSR",
    texto:
      "Sem proxy, a renovação acontece dentro de um Server Component — onde o Next descarta escrita de cookies. O refresh token novo (de uso único) simplesmente evapora.",
  },
  {
    n: "02",
    titulo: "O app entra em estado latente",
    texto:
      "O GoTrue tem uma graça: reusar um token cujo filho nunca foi usado devolve o mesmo filho. Tudo “funciona” — pagando um refresh por requisição — e a bomba fica armada.",
  },
  {
    n: "03",
    titulo: "Outra aba puxa o gatilho",
    texto:
      "Quando o auto-refresh de uma aba ativa avança a cadeia, qualquer cópia velha do token vira veneno: HTTP 400 refresh_token_already_used.",
  },
  {
    n: "04",
    titulo: "O front desloga todo mundo — sozinho",
    texto:
      "Medimos: a sessão ainda era válida no servidor. Mas o cliente, ao ver o erro, apaga o cookie compartilhado e derruba todas as abas. O logout é auto-infligido.",
  },
];

const camadas = [
  {
    n: "1",
    titulo: "proxy.ts renova e persiste",
    texto:
      "Único ponto de refresh do SSR: reescreve o request (os RSCs já enxergam a sessão nova) e devolve Set-Cookie (o browser avança junto). Zero autorização ali — proteção mora no RSC, junto do dado.",
    tag: "requisito 1 · fluxo @supabase/ssr",
  },
  {
    n: "2",
    titulo: "O cookie nunca regride",
    texto:
      "Guarda de escrita no browser client: sessão defasada não sobrescreve nem apaga a sessão boa das outras abas. Complementa o single-flight e o BroadcastChannel que a lib já traz.",
    tag: "requisito 2 · coordenação entre abas",
  },
  {
    n: "3",
    titulo: "Recuperar antes de expulsar",
    texto:
      "No 401, o app pergunta ao servidor (POST /auth/recover) e reidrata a sessão a partir do cookie saneado. Só vai para o login com a morte confirmada.",
    tag: "requisito 3 · UX resiliente",
  },
];

const fases = [
  { n: "PR #1", nome: "o bug, de propósito", href: `${REPO}/pull/1` },
  { n: "PR #2", nome: "causa-raiz com dados", href: `${REPO}/pull/2` },
  { n: "PR #3", nome: "demo multi-aba", href: `${REPO}/pull/3` },
  { n: "PR #4", nome: "correção em 3 camadas", href: `${REPO}/pull/4` },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5">
      {/* hero */}
      <section className="py-24 md:py-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs font-medium text-mist">
          <span className="h-1.5 w-1.5 rounded-full bg-orange" />
          Teste técnico · Engenharia Frontend Sênior
        </span>
        <h1 className="mt-8 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] md:text-7xl">
          A aula não pode cair.
          <br />
          <span className="text-blue-soft">A sessão também não.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-mist">
          Alunos eram deslogados no meio do estudo — sem padrão, ao trocar de
          aba, depois de uma pausa. Este laboratório{" "}
          <strong className="font-semibold text-snow">reproduz</strong> o bug
          de produção,{" "}
          <strong className="font-semibold text-snow">
            confirma a causa-raiz com dados
          </strong>{" "}
          e o{" "}
          <strong className="font-semibold text-snow">elimina</strong> pela
          ótica do frontend.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/demo"
            className="rounded-xl bg-blue px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-soft"
          >
            Ver a demo multi-aba
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-line bg-panel px-6 py-3.5 text-base font-semibold transition-colors hover:border-mist"
          >
            Entrar no app
          </Link>
          <a
            href={REPO}
            className="px-3 py-3.5 text-base font-medium text-mist underline-offset-4 transition-colors hover:text-snow hover:underline"
          >
            Ler o código →
          </a>
        </div>
        <div className="mt-12 flex flex-wrap gap-2 text-xs font-medium text-mist">
          {[
            "Next.js 16 · App Router · proxy.ts",
            "@supabase/ssr · cookies httpOnly",
            "GoTrue · refresh tokens rotativos",
            "4 PRs · bug → dados → correção",
          ].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-line px-3 py-1.5"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      {/* sintomas */}
      <section className="border-t border-line py-20 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          O sintoma
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          “Os usuários estão sendo deslogados aleatoriamente.”
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {sintomas.map((s) => (
            <article
              key={s.titulo}
              className="rounded-2xl border border-line bg-panel p-7"
            >
              <h3 className="text-lg font-semibold">{s.titulo}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                {s.texto}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* anatomia */}
      <section id="bug" className="border-t border-line py-20 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          A anatomia do bug
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Um token de uso único, usado duas vezes.
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-9 md:grid-cols-2">
          {anatomia.map((a) => (
            <div key={a.n} className="flex gap-5">
              <span className="text-2xl font-extrabold tabular-nums text-blue-soft">
                {a.n}
              </span>
              <div>
                <h3 className="text-lg font-semibold">{a.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {a.texto}
                </p>
              </div>
            </div>
          ))}
        </div>

        <figure className="mt-16 overflow-hidden rounded-2xl border border-line">
          <video
            src="/demo-bug.mp4"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Duas abas lado a lado: a aba congelada acorda e as duas são deslogadas"
            className="w-full"
          />
          <figcaption className="border-t border-line bg-panel px-6 py-4 text-sm text-mist">
            <strong className="font-semibold text-snow">
              Gravação do bug (antes da correção):
            </strong>{" "}
            a aba B congela segurando uma sessão antiga; ao acordar, o token já
            consumido derruba as duas abas — de uma sessão que o servidor ainda
            aceitava renovar.
          </figcaption>
        </figure>
      </section>

      {/* correção */}
      <section id="correcao" className="border-t border-line py-20 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          A correção
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Três camadas, uma por elo da cadeia.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {camadas.map((c) => (
            <article
              key={c.n}
              className="flex flex-col rounded-2xl border border-line bg-panel p-7"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue text-lg font-extrabold text-white">
                {c.n}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{c.titulo}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-mist">
                {c.texto}
              </p>
              <p className="mt-5 text-xs font-medium text-orange">{c.tag}</p>
            </article>
          ))}
        </div>
        <p className="mt-12 text-2xl font-bold tracking-tight md:text-3xl">
          Resultado: o mesmo gesto que derrubava todas as abas termina em
          autocura. <span className="text-blue-soft">Ninguém desloga.</span>
        </p>
      </section>

      {/* validação */}
      <section className="border-t border-line py-20 md:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          Não acredite em mim
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Valide você mesmo, em dois comandos.
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-panel p-7">
            <p className="text-sm font-semibold">Rodar local</p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-5 text-sm leading-7 text-mist">
              <code>{`supabase start        # JWT de 120s p/ demo rápida
npm run dev

# a correção, ponta a ponta (Set-Cookie avançando a sessão):
bash scripts/validar-correcao.sh

# a anatomia do bug, via curl:
bash scripts/reproduzir-bug.sh`}</code>
            </pre>
          </div>
          <div className="flex flex-col justify-between gap-8 rounded-2xl border border-line bg-panel p-7">
            <div>
              <p className="text-sm font-semibold">O processo, em 4 PRs</p>
              <ul className="mt-4 space-y-2.5">
                {fases.map((f) => (
                  <li key={f.n}>
                    <a
                      href={f.href}
                      className="group flex items-baseline gap-3 text-sm"
                    >
                      <span className="font-semibold tabular-nums text-blue-soft">
                        {f.n}
                      </span>
                      <span className="text-mist transition-colors group-hover:text-snow">
                        {f.nome}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm leading-relaxed text-mist">
              Cada fase é um PR com documentação própria em{" "}
              <a
                href={`${REPO}/tree/main/docs`}
                className="font-medium text-snow underline-offset-4 hover:underline"
              >
                /docs
              </a>
              — incluindo as respostas da{" "}
              <a
                href={`${REPO}/blob/main/docs/parte-1-teorica.md`}
                className="font-medium text-snow underline-offset-4 hover:underline"
              >
                avaliação teórica
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-10 text-sm text-mist">
        <p>Assaad · Auth Lab — teste técnico, Engenharia Frontend Sênior</p>
        <a
          href={REPO}
          className="font-medium transition-colors hover:text-snow"
        >
          github.com/mateusdeve/assaad-auth-lab
        </a>
      </footer>
    </main>
  );
}
