import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  instrumentedFetch,
  makeEntry,
  suffix,
  type AuthLogEntry,
} from "./instrument";

function serverLog(entry: AuthLogEntry) {
  const color =
    entry.kind === "refresh_fail" || entry.kind === "cookie_write_dropped"
      ? "\x1b[31m"
      : "\x1b[36m";
  console.log(
    `${color}[authlab server] ${entry.at} ${entry.kind}\x1b[0m ${entry.detail}`
  );
}

// Extrai o sufixo do refresh token de um valor de cookie do @supabase/ssr
// (JSON puro ou com prefixo "base64-"), só para fins de log.
function refreshSuffixFromCookie(value: string): string {
  try {
    const json = value.startsWith("base64-")
      ? Buffer.from(value.slice(7), "base64").toString("utf8")
      : value;
    const parsed = JSON.parse(json) as { refresh_token?: string };
    return suffix(parsed.refresh_token);
  } catch {
    return "?";
  }
}

// Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
// Um cliente novo por request — nunca compartilhar entre requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: instrumentedFetch("server", serverLog) },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          const authCookies = cookiesToSet.filter(({ name }) =>
            name.includes("-auth-token")
          );
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
            if (authCookies.length > 0) {
              serverLog(
                makeEntry(
                  "server",
                  "cookie_write",
                  `sessão persistida no cookie (refresh token ${refreshSuffixFromCookie(
                    authCookies[0].value
                  )})`
                )
              );
            }
          } catch {
            // BUG INTENCIONAL (Fases 1–3): quando este cliente é usado num
            // Server Component, o Next proíbe escrever cookies e este catch
            // engole a falha. Se o @supabase/ssr rotacionar o refresh token
            // aqui dentro, o token novo é PERDIDO e o cookie continua com o
            // token antigo (de uso único, já consumido) → logout "aleatório".
            // Sem proxy.ts fazendo o refresh, este caminho é atingido sempre
            // que o access token expira. Não corrigir antes da Fase 4.
            if (authCookies.length > 0) {
              serverLog(
                makeEntry(
                  "server",
                  "cookie_write_dropped",
                  `ESCRITA DE COOKIE DESCARTADA em RSC — refresh token ${refreshSuffixFromCookie(
                    authCookies[0].value
                  )} PERDIDO; browser segue com o token antigo, já consumido`
                )
              );
            }
          }
        },
      },
    }
  );
}
