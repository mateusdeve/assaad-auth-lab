"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { suffix } from "@/lib/supabase/instrument";

// FERRAMENTA DE DEMO: simula uma aba que congelou (background, laptop
// suspenso) segurando uma sessão antiga e que, ao acordar, tenta usá-la —
// via supabase.auth.setSession(), o caminho real da lib: com o access token
// vencido, ela dispara um refresh com o refresh token defasado (já
// consumido) e o GoTrue responde refresh_token_already_used.
//
// Nas Fases 1–3 esse gesto derrubava TODAS as abas (o auth-js apagava o
// cookie compartilhado). Na Fase 4, a guarda de escrita preserva o cookie
// bom e o SessionRecovery reidrata a sessão — ninguém desloga.

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

  const acordar = async () => {
    if (!frozen) return;
    const supabase = createClient();
    // Caminho real: a aba "acordou" e tenta retomar com a sessão que tinha
    // em memória. O erro do refresh (se houver) aparece no painel.
    await supabase.auth.setSession({
      access_token: frozen.access_token,
      refresh_token: frozen.refresh_token,
    });
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
