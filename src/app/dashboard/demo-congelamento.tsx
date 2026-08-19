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
    <section className="space-y-4 rounded-[20px] bg-blush p-[30px]">
      <h2 className="text-base font-bold">🧊 Demo: aba congelada</h2>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={congelar}
          className="rounded-[10px] border-2 border-ink px-4 py-2 text-sm font-bold transition-colors hover:border-magenta hover:text-magenta"
        >
          1. Congelar (capturar sessão)
        </button>
        <button
          onClick={acordar}
          disabled={!frozen}
          className={`rounded-[10px] px-4 py-2 text-sm font-bold text-chalk transition-transform disabled:opacity-40 ${
            armed ? "bg-magenta hover:scale-[1.02]" : "bg-cotton"
          }`}
        >
          2. Acordar com a sessão velha
        </button>
      </div>

      {frozen && (
        <p className="text-xs tabular-nums">
          congelada: rt {suffix(frozen.refresh_token)} há {waited}s · atual: rt{" "}
          {suffix(currentRt)}{" "}
          {armed ? (
            <span className="font-bold text-magenta">
              — cadeia avançou e a janela de reuso (10s) passou: acordar agora
              derruba tudo
            </span>
          ) : rotated ? (
            <span className="font-medium">
              — cadeia avançou; aguarde passar a janela de reuso (10s)
            </span>
          ) : (
            <span className="opacity-70">
              — aguardando o auto-refresh rotacionar o token (~30s)
            </span>
          )}
        </p>
      )}
    </section>
  );
}
