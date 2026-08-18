import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// FASE 4 — ponto central de recuperação de sessão (requisito 3 do teste).
//
// Chamado pelo SessionRecovery quando o cliente vê a sessão morrer
// (SIGNED_OUT / falha de refresh). Route Handler PODE escrever cookies:
// getUser() valida a sessão do cookie e, se o access token venceu, renova e
// persiste — devolvendo ao browser um cookie são. A Fase 2 provou que na
// maioria desses "logouts" a sessão ainda era válida no GoTrue (achado 4);
// este endpoint é o que transforma esse fato em UX: recuperar em vez de
// expulsar para o /login.
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ recovered: false }, { status: 401 });
  }

  return NextResponse.json({ recovered: true });
}
