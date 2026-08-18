"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para Client Components. createBrowserClient devolve um
// singleton por origem, então pode ser chamado em qualquer componente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
