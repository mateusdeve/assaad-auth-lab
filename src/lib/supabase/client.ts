"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  instrumentedFetch,
  makeEntry,
  suffix,
  type AuthLogEntry,
} from "./instrument";
import {
  parseAllCookies,
  decodeSessionCookieValue,
  readSessionFromCookies,
} from "./cookies";

export const AUTHLAB_LOG_EVENT = "authlab:log";

function browserLog(entry: AuthLogEntry) {
  const style =
    entry.kind === "refresh_fail" || entry.kind === "cookie_guard"
      ? "color:#dc2626"
      : "color:#0891b2";
  console.log(`%c[authlab browser] ${entry.at} ${entry.kind}`, style, entry.detail);
  window.dispatchEvent(new CustomEvent(AUTHLAB_LOG_EVENT, { detail: entry }));
}

// Nome do cookie de sessão, derivado como o supabase-js deriva o storageKey:
// sb-<primeiro rótulo do host da URL>-auth-token. Importante porque outros
// projetos podem ter deixado cookies sb-*-auth-token no mesmo localhost.
export function authCookieName() {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  return `sb-${host.split(".")[0]}-auth-token`;
}

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  };
};

function serializeCookie({ name, value, options }: CookieToSet) {
  let s = `${name}=${value}`;
  s += `; Path=${options?.path ?? "/"}`;
  if (options?.maxAge !== undefined) s += `; Max-Age=${options.maxAge}`;
  if (options?.expires) s += `; Expires=${options.expires.toUTCString()}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.secure) s += "; Secure";
  const ss = options?.sameSite;
  s += `; SameSite=${typeof ss === "string" ? ss : ss ? "Strict" : "Lax"}`;
  return s;
}

// FASE 4 — guarda de escrita do cookie de sessão (coordenação entre abas).
//
// O supabase-js já coordena o refresh em si (single-flight por cliente,
// commit guard que descarta tokens rotacionados se o storage mudou durante
// o fetch, BroadcastChannel entre abas). O que ele NÃO impede — e a Fase 3
// demonstrou — é um ator defasado (aba que congelou e acordou) escrever ou
// apagar o cookie compartilhado por cima de uma sessão mais nova:
//
// 1. escrita REGRESSIVA (sessão com expires_at menor que a do cookie) é
//    bloqueada — a aba defasada não sobrescreve a sessão boa das outras;
// 2. REMOÇÃO vinda do cliente é bloqueada — no caminho de falha de refresh
//    com access token vencido, o auth-js apaga o storage (_removeSession),
//    o que nas Fases 1–3 deslogava TODAS as abas de uma sessão que o GoTrue
//    ainda aceitava renovar (docs/fase-2.md, achado 4). Logout legítimo é
//    Server Action (src/app/login/actions.ts): a remoção do cookie vem do
//    servidor e não passa por aqui.
//
// Falha aberta: se o valor não puder ser comparado (ex.: cookie fatiado em
// pedaços), a escrita é permitida e logada — melhor uma escrita duvidosa
// que quebrar sessões grandes.
function guardedSetAll(cookiesToSet: CookieToSet[]) {
  const key = authCookieName();

  for (const cookie of cookiesToSet) {
    const isAuth =
      cookie.name === key || cookie.name.startsWith(`${key}.`);

    if (isAuth) {
      const isRemoval = cookie.value === "" || cookie.options?.maxAge === 0;
      if (isRemoval) {
        browserLog(
          makeEntry(
            "browser",
            "cookie_guard",
            `remoção de ${cookie.name} pelo cliente BLOQUEADA — logout legítimo é via Server Action; sessão do cookie preservada para recuperação`
          )
        );
        continue;
      }

      const incoming = decodeSessionCookieValue(cookie.value);
      const current = readSessionFromCookies(key);
      if (incoming && current && (incoming.expires_at ?? 0) < (current.expires_at ?? 0)) {
        browserLog(
          makeEntry(
            "browser",
            "cookie_guard",
            `escrita REGRESSIVA bloqueada (rt ${suffix(incoming.refresh_token)} é mais velho que o do cookie ${suffix(current.refresh_token)})`
          )
        );
        continue;
      }
      if (!incoming) {
        browserLog(
          makeEntry(
            "browser",
            "cookie_guard",
            `valor de ${cookie.name} não comparável (fatiado?) — escrita permitida`
          )
        );
      }
    }

    document.cookie = serializeCookie(cookie);
  }
}

// Cliente Supabase para Client Components. createBrowserClient devolve um
// singleton por origem, então pode ser chamado em qualquer componente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: instrumentedFetch("browser", browserLog) },
      cookies: {
        getAll: () => parseAllCookies(),
        setAll: guardedSetAll,
      },
    }
  );
}
