"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createClient,
  authCookieName,
  AUTHLAB_LOG_EVENT,
} from "@/lib/supabase/client";
import { suffix, type AuthLogEntry } from "@/lib/supabase/instrument";
import { readSessionFromCookies } from "@/lib/supabase/cookies";

type PanelEvent = { at: string; label: string; bad?: boolean };

// Lê o refresh token gravado no COOKIE (o que o servidor enxerga).
function refreshTokenFromCookie(): string | null {
  return readSessionFromCookies(authCookieName())?.refresh_token ?? null;
}

// Mostra a sessão COMO O BROWSER A VÊ e compara com o que está no cookie
// (que é o que o servidor usa). Divergência = dessincronização — o dado que
// o enunciado pede para confirmar a causa-raiz.
export function SessionPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [cookieRt, setCookieRt] = useState<string | null>(null);
  const [events, setEvents] = useState<PanelEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();

    const push = (label: string, bad?: boolean) =>
      setEvents((prev) =>
        [
          { at: new Date().toLocaleTimeString(), label, bad },
          ...prev,
        ].slice(0, 8)
      );

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const firstSnapshot = setTimeout(
      () => setCookieRt(refreshTokenFromCookie()),
      0
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      push(`${event}${s ? ` (rt ${suffix(s.refresh_token)})` : ""}`, event === "SIGNED_OUT");
    });

    const onLog = (e: Event) => {
      const entry = (e as CustomEvent<AuthLogEntry>).detail;
      push(
        `${entry.kind}: ${entry.detail}`,
        entry.kind === "refresh_fail" || entry.kind === "cookie_guard"
      );
    };
    window.addEventListener(AUTHLAB_LOG_EVENT, onLog);

    const tick = setInterval(() => {
      setNow(Date.now());
      setCookieRt(refreshTokenFromCookie());
    }, 1000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(AUTHLAB_LOG_EVENT, onLog);
      clearTimeout(firstSnapshot);
      clearInterval(tick);
    };
  }, []);

  const secondsLeft = session?.expires_at
    ? Math.round(session.expires_at - now / 1000)
    : null;

  const memoryRt = session?.refresh_token ?? null;
  const desync = memoryRt !== null && cookieRt !== null && memoryRt !== cookieRt;

  return (
    <section className="space-y-5 rounded-[20px] border-2 border-blush p-[30px]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold">
          Sessão vista pelo cliente (browser)
        </h2>
        {desync && (
          <span className="rounded-full bg-magenta px-3 py-1 text-xs font-bold text-chalk">
            DESSINCRONIZADO
          </span>
        )}
      </header>

      {session ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm tabular-nums">
          <dt className="font-medium opacity-60">usuário</dt>
          <dd>{session.user.email}</dd>
          <dt className="font-medium opacity-60">access token expira em</dt>
          <dd
            className={
              secondsLeft !== null && secondsLeft < 0
                ? "font-bold text-magenta"
                : ""
            }
          >
            {secondsLeft !== null ? `${secondsLeft}s` : "—"}
          </dd>
          <dt className="font-medium opacity-60">refresh token (memória)</dt>
          <dd>{suffix(memoryRt)}</dd>
          <dt className="font-medium opacity-60">refresh token (cookie)</dt>
          <dd className={desync ? "font-bold text-magenta" : ""}>
            {suffix(cookieRt)}
            {desync &&
              " ≠ memória — servidor e cliente vão renovar com tokens diferentes"}
          </dd>
        </dl>
      ) : (
        <p className="text-sm font-bold text-magenta">
          Cliente NÃO tem sessão (servidor renderizou esta página autenticada —
          dessincronizado).
        </p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">
          Eventos de auth nesta aba
        </h3>
        {events.length === 0 ? (
          <p className="text-xs opacity-60">nenhum evento ainda</p>
        ) : (
          <ul className="space-y-1 text-xs tabular-nums">
            {events.map((e, i) => (
              <li key={i} className={e.bad ? "font-bold text-magenta" : ""}>
                {e.at} — {e.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
