"use client";

import { createBrowserClient } from "@supabase/ssr";
import { instrumentedFetch, type AuthLogEntry } from "./instrument";

export const AUTHLAB_LOG_EVENT = "authlab:log";

function browserLog(entry: AuthLogEntry) {
  const style =
    entry.kind === "refresh_fail" ? "color:#dc2626" : "color:#0891b2";
  console.log(`%c[authlab browser] ${entry.at} ${entry.kind}`, style, entry.detail);
  window.dispatchEvent(new CustomEvent(AUTHLAB_LOG_EVENT, { detail: entry }));
}

// Cliente Supabase para Client Components. createBrowserClient devolve um
// singleton por origem, então pode ser chamado em qualquer componente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: instrumentedFetch("browser", browserLog) },
    }
  );
}
