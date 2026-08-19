import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { instrumentedFetch, makeEntry, type AuthLogEntry } from "@/lib/supabase/instrument";
import { resilientFetch } from "@/lib/supabase/resilient-fetch";

function proxyLog(entry: AuthLogEntry) {
  const color = entry.kind === "refresh_fail" ? "\x1b[31m" : "\x1b[35m";
  console.log(
    `${color}[authlab proxy] ${entry.at} ${entry.kind}\x1b[0m ${entry.detail}`
  );
}

// FASE 4 — o coração da correção.
//
// O proxy roda antes de todo request de página e é o ÚNICO lugar do fluxo
// SSR autorizado a renovar o token, porque aqui a escrita de cookie funciona
// (Set-Cookie na resposta + request reescrito para os RSCs desta própria
// requisição). Com isso a rotação do refresh token nunca mais se perde — o
// bug das Fases 1–3 era exatamente a rotação acontecendo dentro de RSC, onde
// o Next descarta cookies.
//
// O que o proxy NÃO faz: autorização. Nenhum redirect por falta de sessão
// aqui (CVE-2025-29927 — middleware/proxy pode ser contornado); proteger
// rota é papel do RSC/DAL, junto do dado (src/app/dashboard/page.tsx).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: instrumentedFetch("proxy", proxyLog, resilientFetch()) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Reescreve o request (RSCs desta requisição já enxergam a sessão
          // nova) e a response (browser recebe o Set-Cookie).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          if (cookiesToSet.some(({ name }) => name.includes("-auth-token"))) {
            proxyLog(
              makeEntry(
                "proxy",
                "cookie_write",
                "sessão renovada persistida no request e na response"
              )
            );
          }
        },
      },
    }
  );

  // getUser() valida o token e, se expirado, renova — disparando o setAll
  // acima. IMPORTANTe: não usar o resultado para autorizar nada aqui.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Todas as rotas de app; fora ficam apenas estáticos.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
