// Demonstração multi-aba: dois iframes same-origin do /dashboard.
// Cada iframe é um contexto JS isolado com seu próprio cliente supabase-js
// (como abas reais), mas todos compartilham o MESMO cookie de sessão —
// exatamente a topologia do bug. Roteiro em docs/fase-3.md.
export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-[60px] pt-[100px] md:px-16">
      <header className="mb-10">
        <p className="mb-4 text-sm font-medium">demonstração multi-aba</p>
        <h1 className="display text-magenta text-[clamp(44px,6vw,80px)]">
          Duas abas.
          <br />
          Um cookie.
        </h1>
        <p className="mt-5 max-w-[60ch] text-base">
          Congele a sessão na Aba B, espere a cadeia de tokens avançar e
          acorde-a. Antes da correção, esse gesto derrubava as duas abas;
          agora, a guarda de escrita bloqueia o estado defasado e ninguém
          desloga.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {(["Aba A — usuário ativo", "Aba B — vai congelar"] as const).map(
          (label) => (
            <figure
              key={label}
              className="overflow-hidden rounded-[20px] border-2 border-blush"
            >
              <figcaption className="border-b-2 border-blush px-5 py-2.5 text-sm font-bold">
                {label}
              </figcaption>
              <iframe
                src="/dashboard"
                title={label}
                className="h-[640px] w-full bg-chalk"
              />
            </figure>
          )
        )}
      </div>
    </main>
  );
}
