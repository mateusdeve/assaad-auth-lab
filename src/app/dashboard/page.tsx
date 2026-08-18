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
    <main className="flex-1 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-neutral-500">
              Sessão validada no servidor para <strong>{user.email}</strong>
            </p>
          </div>
          <form action={logout}>
            <button className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700">
              Sair
            </button>
          </form>
        </header>

        <SessionRecovery />
        <DemoCongelamento />
        <SessionPanel />
      </div>
    </main>
  );
}
