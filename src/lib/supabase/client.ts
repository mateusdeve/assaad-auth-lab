"use client";

import { createBrowserClient } from "@supabase/ssr";
import { instrumentedFetch, type AuthLogEntry } from "./instrument";

export const AUTHLAB_LOG_EVENT = "authlab:log";

// Nome do cookie de sessão, derivado como o supabase-js deriva o storageKey:
// sb-<primeiro rótulo do host da URL>-auth-token. Importante porque outros
// projetos podem ter deixado cookies sb-*-auth-token no mesmo localhost.
export function authCookieName() {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  return `sb-${host.split(".")[0]}-auth-token`;
}

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
