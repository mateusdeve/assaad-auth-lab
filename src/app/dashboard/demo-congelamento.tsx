"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient, authCookieName } from "@/lib/supabase/client";
import { suffix } from "@/lib/supabase/instrument";

// FERRAMENTA DE DEMO (Fase 3): simula uma aba que congelou (background,
// laptop suspenso) segurando uma sessão antiga e, ao acordar, grava esse
// estado defasado por cima do cookie compartilhado — exatamente a corrida
// de escrita não-atômica em document.cookie que acontece entre abas reais.
// A partir daí só rodam caminhos reais: o SSR e o auto-refresh das outras
// abas leem o cookie defasado, tentam renovar com token já consumido e o
// GoTrue responde refresh_token_already_used.

function writeSessionCookie(session: Session) {
  const name = authCookieName();
  const json = JSON.stringify(session);
  const value =
    "base64-" +
    btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (value.length > 3900) throw new Error("sessão grande demais para a demo");
  document.cookie = `${name}=${value}; path=/; max-age=34560000; SameSite=Lax`;
}

export function DemoCongelamento() {
  const [frozen, setFrozen] = useState<Session | null>(null);
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [currentRt, setCurrentRt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const supabase = createClient();
    // Não usar getSession() em polling: com jwt_expiry curto, cada chamada
    // dentro da margem de expiração dispara um refresh (tempestade de
    // rotações). onAuthStateChange observa sem renovar.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) =>
      setCurrentRt(s?.refresh_token ?? null)
    );
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      subscription.unsubscribe();
      clearInterval(tick);
    };
  }, []);

  const congelar = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setFrozen(session);
    setFrozenAt(Date.now());
  };

  const acordar = () => {
    if (!frozen) return;
    writeSessionCookie(frozen);
    // A aba que acordou navega — o SSR recebe o cookie defasado.
    window.location.reload();
  };

  const rotated = frozen !== null && currentRt !== null && frozen.refresh_token !== currentRt;
  const waited = frozenAt !== null ? Math.round((now - frozenAt) / 1000) : 0;
  const armed = rotated && waited > 10;

  return (
    <section className="space-y-3 rounded border border-dashed border-amber-400 p-4 text-sm">
      <h2 className="font-medium">🧊 Demo: aba congelada (Fase 3)</h2>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={congelar}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          1. Congelar (capturar sessão)
        </button>
        <button
          onClick={acordar}
          disabled={!frozen}
          className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 ${
            armed ? "bg-red-600" : "bg-neutral-400 dark:bg-neutral-600"
          }`}
        >
          2. Acordar com a sessão velha
        </button>
      </div>

      {frozen && (
        <p className="font-mono text-xs text-neutral-500">
          congelada: rt {suffix(frozen.refresh_token)} há {waited}s · atual: rt{" "}
          {suffix(currentRt)}{" "}
          {armed ? (
            <span className="font-semibold text-red-600">
              — cadeia avançou e a janela de reuso (10s) passou: acordar agora
              derruba tudo
            </span>
          ) : rotated ? (
            <span className="text-amber-600">
              — cadeia avançou; aguarde passar a janela de reuso (10s)
            </span>
          ) : (
            <span>— aguardando o auto-refresh rotacionar o token (~30s)</span>
          )}
        </p>
      )}
    </section>
  );
}
