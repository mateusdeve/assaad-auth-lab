import Link from "next/link";
import Image from "next/image";

const fases = [
  { n: "01", nome: "o bug, de propósito", href: "docs/fase-1.md" },
  { n: "02", nome: "causa-raiz com dados", href: "docs/fase-2.md" },
  { n: "03", nome: "demo multi-aba", href: "docs/fase-3.md" },
  { n: "04", nome: "correção em 3 camadas", href: "docs/fase-4.md" },
];

const REPO = "https://github.com/mateusdeve/assaad-auth-lab";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 md:px-16">
      {/* 1 — manifesto */}
      <section className="flex min-h-svh flex-col justify-end pb-[60px] pt-[120px]">
        <p className="mb-5 text-sm font-medium">
          plataforma assaad · laboratório de autenticação
        </p>
        <h1 className="display text-magenta text-[clamp(64px,11vw,150px)]">
          A aula
          <br />
          não pode cair.
        </h1>
        <p className="display text-blush text-[clamp(40px,7vw,94px)]">
          a sessão também não.
        </p>
        <p className="mt-10 max-w-[60ch] text-lg md:text-xl">
          Alunos estavam sendo deslogados no meio do estudo — sem padrão, ao
          trocar de aba, depois de uma pausa. Este laboratório reproduz o bug
          de produção, confirma a causa-raiz com dados e o elimina pela ótica
          do frontend: Next.js App Router + Supabase com sessão em cookie.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4 text-base font-bold">
          <Link
            href="/login"
            className="rounded-[10px] bg-magenta px-6 py-3 text-chalk transition-transform hover:scale-[1.03]"
          >
            Entrar
          </Link>
          <Link
            href="/demo"
            className="rounded-[10px] border-2 border-ink px-6 py-3 transition-colors hover:border-magenta hover:text-magenta"
          >
            Ver a demo
          </Link>
          <a
            href={REPO}
            className="px-2 py-3 font-medium underline-offset-4 hover:text-magenta hover:underline"
          >
            Ler o código ↗
          </a>
        </div>
      </section>

      {/* 2 — o bug */}
      <section className="flex min-h-svh flex-col justify-center py-[120px]">
        <p className="mb-5 text-sm font-medium">
          o problema real de produção
        </p>
        <h2 className="display text-magenta text-[clamp(56px,9vw,130px)]">
          Um token de uso
          <br />
          único, usado duas
          <br />
          vezes.
        </h2>
        <p className="mt-10 max-w-[60ch] text-lg md:text-xl">
          Sem um proxy renovando a sessão, a rotação do refresh token
          acontecia dentro de um Server Component — onde o Next descarta
          cookies. O token novo se perdia; quando outra aba avançava a
          cadeia, qualquer cópia velha explodia em{" "}
          <em className="not-italic font-bold">
            refresh_token_already_used
          </em>{" "}
          — e o frontend derrubava todas as abas de uma sessão que ainda
          estava viva.
        </p>
        <figure className="mt-14">
          <Image
            src="/demo-bug.gif"
            alt="Duas abas lado a lado: a aba congelada acorda e as duas são deslogadas"
            width={1568}
            height={555}
            unoptimized
            className="w-full"
          />
          <figcaption className="mt-3 text-sm">
            fase 3 — a aba congelada acorda e derruba todo mundo
          </figcaption>
        </figure>
      </section>

      {/* 3 — a correção */}
      <section className="flex min-h-svh flex-col justify-center py-[120px]">
        <p className="mb-5 text-sm font-medium">a correção, em camadas</p>
        <h2 className="display text-magenta text-[clamp(56px,9vw,130px)]">
          Renovar. Guardar.
          <br />
          Recuperar.
        </h2>
        <ul className="mt-12 max-w-[64ch] space-y-8 text-lg md:text-xl">
          <li>
            <span className="display mr-4 text-bubblegum text-3xl md:text-4xl">
              01
            </span>
            <strong>proxy.ts renova e persiste.</strong> Único ponto de
            refresh do SSR: request reescrito, Set-Cookie na resposta —
            servidor e browser avançam juntos.
          </li>
          <li>
            <span className="display mr-4 text-bubblegum text-3xl md:text-4xl">
              02
            </span>
            <strong>o cookie nunca regride.</strong> Guarda de escrita no
            cliente: sessão defasada não sobrescreve nem apaga a sessão boa
            das outras abas.
          </li>
          <li>
            <span className="display mr-4 text-bubblegum text-3xl md:text-4xl">
              03
            </span>
            <strong>recuperar antes de expulsar.</strong> No 401, o app
            pergunta ao servidor antes de redirecionar — a maioria dessas
            sessões ainda estava válida.
          </li>
        </ul>
        <p className="display mt-16 text-blush text-[clamp(40px,7vw,94px)]">
          ninguém desloga.
        </p>
      </section>

      {/* rodapé */}
      <footer className="border-t-2 border-blush py-[60px]">
        <p className="mb-6 text-sm font-medium">o processo, em quatro PRs</p>
        <ul className="flex flex-wrap gap-3">
          {fases.map((f) => (
            <li key={f.n}>
              <a
                href={`${REPO}/blob/main/${f.href}`}
                className="inline-block rounded-full bg-blush px-4 py-1.5 text-sm font-medium transition-colors hover:bg-magenta hover:text-chalk"
              >
                {f.n} · {f.nome}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm">
          teste técnico — engenharia frontend sênior ·{" "}
          <a
            href={REPO}
            className="font-medium underline-offset-4 hover:text-magenta hover:underline"
          >
            github.com/mateusdeve/assaad-auth-lab
          </a>
        </p>
      </footer>
    </main>
  );
}
