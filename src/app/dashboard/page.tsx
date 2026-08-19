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
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-[60px] pt-[100px] md:px-16">
      <header className="mb-12">
        <p className="mb-4 text-sm font-medium">sessão validada no servidor</p>
        <h1 className="display text-magenta text-[clamp(48px,7vw,94px)]">
          Sessão viva.
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blush px-4 py-1.5 text-sm font-medium">
            {user.email}
          </span>
          <form action={logout}>
            <button className="rounded-full border-2 border-ink px-4 py-1 text-sm font-bold transition-colors hover:border-magenta hover:text-magenta">
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-3xl space-y-8">
        <SessionRecovery />
        <DemoCongelamento />
        <SessionPanel />
      </div>
    </main>
  );
}
