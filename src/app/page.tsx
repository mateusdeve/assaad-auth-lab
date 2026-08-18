import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">assaad-auth-lab</h1>
        <p className="text-sm text-neutral-500">
          Laboratório do deslogamento aleatório: Next.js App Router + Supabase
          com sessão em cookie (SSR). Fases 1–3 reproduzem o bug; Fase 4
          corrige.
        </p>
        <div className="flex justify-center gap-3 text-sm">
          <Link href="/login" className="underline underline-offset-4">
            Login
          </Link>
          <Link href="/dashboard" className="underline underline-offset-4">
            Dashboard (protegido)
          </Link>
        </div>
      </div>
    </main>
  );
}
