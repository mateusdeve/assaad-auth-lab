// Demonstração multi-aba: dois iframes same-origin do /dashboard.
// Cada iframe é um contexto JS isolado com seu próprio cliente supabase-js
// (como abas reais), mas todos compartilham o MESMO cookie de sessão —
// exatamente a topologia do bug. Roteiro em docs/fase-3.md.
export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12">
      <header className="mb-10 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          Demonstração multi-aba
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Duas abas. Um cookie.
        </h1>
        <p className="mt-4 leading-relaxed text-mist">
          Congele a sessão na <strong className="text-snow">Aba B</strong>,
          espere a cadeia de tokens avançar (o aviso fica vermelho) e
          acorde-a. Antes da correção, esse gesto derrubava as duas abas;
          agora a guarda de escrita bloqueia o estado defasado e{" "}
          <strong className="text-snow">ninguém desloga</strong>.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {(["Aba A — usuário ativo", "Aba B — vai congelar"] as const).map(
          (label) => (
            <figure
              key={label}
              className="overflow-hidden rounded-2xl border border-line"
            >
              <figcaption className="border-b border-line bg-panel px-5 py-3 text-sm font-semibold">
                {label}
              </figcaption>
              <iframe
                src="/dashboard"
                title={label}
                className="h-[680px] w-full bg-ink"
              />
            </figure>
          )
        )}
      </div>
    </main>
  );
}
