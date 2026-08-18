"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createClient,
  authCookieName,
  AUTHLAB_LOG_EVENT,
} from "@/lib/supabase/client";
import { suffix, type AuthLogEntry } from "@/lib/supabase/instrument";

type PanelEvent = { at: string; label: string; bad?: boolean };

// Lê o refresh token gravado no COOKIE (o que o servidor enxerga), inclusive
// cookies fatiados (.0, .1) e com prefixo "base64-".
function refreshTokenFromCookie(): string | null {
  const jar = document.cookie.split("; ").map((c) => {
    const eq = c.indexOf("=");
    return [c.slice(0, eq), decodeURIComponent(c.slice(eq + 1))] as const;
  });

  const key = authCookieName();
  const chunks = jar
    .filter(([name]) => name === key || name.startsWith(`${key}.`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  if (chunks.length === 0) return null;

  let raw = chunks.map(([, v]) => v).join("");
  try {
    if (raw.startsWith("base64-")) {
      let b64 = raw.slice(7).replace(/-/g, "+").replace(/_/g, "/");
      b64 += "=".repeat((4 - (b64.length % 4)) % 4);
      raw = atob(b64);
    }
    return (JSON.parse(raw) as { refresh_token?: string }).refresh_token ?? null;
  } catch {
    return null;
  }
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
      push(`${entry.kind}: ${entry.detail}`, entry.kind === "refresh_fail");
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
    <section className="space-y-4 rounded border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <header className="flex items-center justify-between">
        <h2 className="font-medium">Sessão vista pelo cliente (browser)</h2>
        {desync && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            DESSINCRONIZADO
          </span>
        )}
      </header>

      {session ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
          <dt className="text-neutral-500">usuário</dt>
          <dd>{session.user.email}</dd>
          <dt className="text-neutral-500">access token expira em</dt>
          <dd className={secondsLeft !== null && secondsLeft < 0 ? "text-red-600" : ""}>
            {secondsLeft !== null ? `${secondsLeft}s` : "—"}
          </dd>
          <dt className="text-neutral-500">refresh token (memória)</dt>
          <dd>{suffix(memoryRt)}</dd>
          <dt className="text-neutral-500">refresh token (cookie)</dt>
          <dd className={desync ? "text-red-600 font-semibold" : ""}>
            {suffix(cookieRt)}
            {desync && " ≠ memória — servidor e cliente vão renovar com tokens diferentes"}
          </dd>
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
              <li key={i} className={e.bad ? "text-red-600" : ""}>
                {e.at} — {e.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
