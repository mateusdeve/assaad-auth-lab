import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { SessionPanel } from "./session-panel";
import { DemoCongelamento } from "./demo-congelamento";
import { SessionRecovery } from "./session-recovery";

// Proteção da rota feita aqui, junto do dado (não no proxy — CVE-2025-29927).
// getUser() valida o token contra o servidor de Auth; nunca getSession() aqui.
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Com o proxy renovando o token antes do RSC, chegar aqui significa
    // sessão realmente ausente/inválida — o redirect é legítimo.
    console.log(
      `\x1b[33m[authlab server] redirect /login\x1b[0m motivo: ${
        error?.message ?? "sem usuário"
      }`
    );
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">
          Sessão validada no servidor
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Sessão viva.
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-line bg-panel px-4 py-1.5 text-sm font-medium text-mist">
            {user.email}
          </span>
          <form action={logout}>
            <button className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-mist transition-colors hover:border-red hover:text-red">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="space-y-6">
        <SessionRecovery />
        <DemoCongelamento />
        <SessionPanel />
      </div>
    </main>
  );
}
