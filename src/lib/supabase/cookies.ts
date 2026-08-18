"use client";

import type { Session } from "@supabase/supabase-js";

// Utilitários client-side para ler/decodificar o cookie de sessão do
// @supabase/ssr (formato "base64-" + base64url sem padding, com possível
// fatiamento em <nome>.0, <nome>.1, …).

export function parseAllCookies(): Array<{ name: string; value: string }> {
  if (!document.cookie) return [];
  return document.cookie.split("; ").map((c) => {
    const eq = c.indexOf("=");
    return { name: c.slice(0, eq), value: decodeURIComponent(c.slice(eq + 1)) };
  });
}

export function decodeSessionCookieValue(raw: string): Session | null {
  try {
    let json = raw;
    if (raw.startsWith("base64-")) {
      let b64 = raw.slice(7).replace(/-/g, "+").replace(/_/g, "/");
      b64 += "=".repeat((4 - (b64.length % 4)) % 4);
      json = atob(b64);
    }
    const parsed = JSON.parse(json) as Session;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// Junta os pedaços (se houver) e decodifica a sessão gravada no cookie.
export function readSessionFromCookies(key: string): Session | null {
  const chunks = parseAllCookies()
    .filter(({ name }) => name === key || name.startsWith(`${key}.`))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (chunks.length === 0) return null;
  return decodeSessionCookieValue(chunks.map((c) => c.value).join(""));
}
