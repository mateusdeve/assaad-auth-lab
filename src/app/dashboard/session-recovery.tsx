"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  authCookieName,
  AUTHLAB_LOG_EVENT,
} from "@/lib/supabase/client";
import { readSessionFromCookies } from "@/lib/supabase/cookies";
import { makeEntry, type AuthLogEntry } from "@/lib/supabase/instrument";

// FASE 4 — UX resiliente (requisito 3): ao ver a sessão morrer no cliente
// (SIGNED_OUT ou falha de refresh), NÃO redirecionar imediatamente.
// Primeiro: POST /auth/recover valida/renova a sessão do cookie no servidor;
// se sobreviveu, reidrata o cliente com setSession a partir do cookie.
// Só desiste (→ /login) se o servidor confirmar que a sessão morreu de fato
// — que é o que acontece num logout legítimo (Server Action limpa o cookie).
export function SessionRecovery() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const busy = useRef(false);
  const attempts = useRef<number[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const emit = (kind: AuthLogEntry["kind"], detail: string) =>
      window.dispatchEvent(
        new CustomEvent(AUTHLAB_LOG_EVENT, {
          detail: makeEntry("browser", kind, detail),
        })
      );

    const recover = async (motivo: string) => {
      if (busy.current) return;
      // No máximo 3 tentativas por minuto — depois disso, é logout de verdade.
      const now = Date.now();
      attempts.current = attempts.current.filter((t) => now - t < 60_000);
      if (attempts.current.length >= 3) {
        router.replace("/login");
        return;
      }
      attempts.current.push(now);
      busy.current = true;
      setStatus(`sessão caiu (${motivo}) — tentando recuperar…`);

      try {
        const res = await fetch("/auth/recover", { method: "POST" });
        if (res.ok) {
          const session = readSessionFromCookies(authCookieName());
          if (session) {
            const { error } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            if (!error) {
              emit("recover_ok", "sessão recuperada a partir do cookie");
              setStatus("sessão recuperada — nenhum redirect necessário");
              setTimeout(() => setStatus(null), 5000);
              return;
            }
          }
        }
        emit("recover_fail", "servidor confirmou sessão encerrada");
        router.replace("/login");
      } finally {
        busy.current = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void recover("SIGNED_OUT");
    });

    const onLog = (e: Event) => {
      const entry = (e as CustomEvent<AuthLogEntry>).detail;
      if (entry.kind === "refresh_fail") void recover("refresh 4xx");
    };
    window.addEventListener(AUTHLAB_LOG_EVENT, onLog);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(AUTHLAB_LOG_EVENT, onLog);
    };
  }, [router]);

  if (!status) return null;
  return (
    <p
      role="status"
      className="rounded-[10px] bg-cotton px-4 py-3 text-sm font-bold text-chalk"
    >
      🛟 {status}
    </p>
  );
}
