"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthEvent = { at: string; event: string; expiresAt: number | null };

// Mostra a sessão COMO O BROWSER A VÊ. Comparar este painel com o e-mail
// renderizado pelo servidor é o que expõe a dessincronização nas Fases 2–3.
export function SessionPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setEvents((prev) =>
        [
          {
            at: new Date().toLocaleTimeString(),
            event,
            expiresAt: s?.expires_at ?? null,
          },
          ...prev,
        ].slice(0, 20)
      );
    });

    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(tick);
    };
  }, []);

  const secondsLeft = session?.expires_at
    ? Math.round(session.expires_at - now / 1000)
    : null;

  return (
    <section className="space-y-4 rounded border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <h2 className="font-medium">Sessão vista pelo cliente (browser)</h2>

      {session ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-neutral-500">usuário</dt>
          <dd>{session.user.email}</dd>
          <dt className="text-neutral-500">access token expira em</dt>
          <dd className={secondsLeft !== null && secondsLeft < 0 ? "text-red-600" : ""}>
            {secondsLeft !== null ? `${secondsLeft}s` : "—"}
          </dd>
          <dt className="text-neutral-500">refresh token (sufixo)</dt>
          <dd>…{session.refresh_token.slice(-8)}</dd>
        </dl>
      ) : (
        <p className="text-red-600">
          Cliente NÃO tem sessão (servidor renderizou esta página autenticada —
          dessincronizado).
        </p>
      )}

      <div>
        <h3 className="mb-1 text-xs font-medium text-neutral-500">
          Eventos de auth nesta aba
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-neutral-500">nenhum evento ainda</p>
        ) : (
          <ul className="space-y-0.5 font-mono text-xs">
            {events.map((e, i) => (
              <li key={i}>
                {e.at} — {e.event}
                {e.expiresAt ? ` (exp ${new Date(e.expiresAt * 1000).toLocaleTimeString()})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
