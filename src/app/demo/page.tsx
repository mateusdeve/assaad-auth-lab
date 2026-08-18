// Demonstração multi-aba (Fase 3): dois iframes same-origin do /dashboard.
// Cada iframe é um contexto JS isolado com seu próprio cliente supabase-js
// (como abas reais), mas todos compartilham o MESMO cookie de sessão —
// exatamente a topologia do bug. Roteiro em docs/fase-3.md.
export default function DemoPage() {
  return (
    <main className="flex-1 space-y-3 p-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">
          Demo multi-aba — deslogamento aleatório
        </h1>
        <p className="text-xs text-neutral-500">
          duas “abas” isoladas, um cookie compartilhado
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {(["Aba A — usuário ativo", "Aba B — vai congelar"] as const).map(
          (label) => (
            <figure
              key={label}
              className="overflow-hidden rounded border border-neutral-300 dark:border-neutral-700"
            >
              <figcaption className="border-b border-neutral-300 bg-neutral-100 px-3 py-1.5 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900">
                {label}
              </figcaption>
              <iframe
                src="/dashboard"
                title={label}
                className="h-[560px] w-full bg-white dark:bg-neutral-950"
              />
            </figure>
          )
        )}
      </div>
    </main>
  );
}
