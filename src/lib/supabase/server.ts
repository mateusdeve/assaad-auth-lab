import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
// Um cliente novo por request — nunca compartilhar entre requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // BUG INTENCIONAL (Fases 1–3): quando este cliente é usado num
            // Server Component, o Next proíbe escrever cookies e este catch
            // engole a falha. Se o @supabase/ssr rotacionar o refresh token
            // aqui dentro, o token novo é PERDIDO e o cookie continua com o
            // token antigo (de uso único, já consumido) → logout "aleatório".
            // Sem proxy.ts fazendo o refresh, este caminho é atingido sempre
            // que o access token expira. Não corrigir antes da Fase 4.
          }
        },
      },
    }
  );
}
