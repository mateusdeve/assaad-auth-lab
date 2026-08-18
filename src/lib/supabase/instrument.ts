// Instrumentação da Fase 2: intercepta as chamadas ao endpoint de token do
// GoTrue para registrar cada renovação (sucesso/falha) e cada rotação de
// refresh token. É só observabilidade — não altera o comportamento de auth.

export type AuthLogEntry = {
  at: string;
  side: "server" | "browser" | "proxy";
  kind:
    | "refresh_ok"
    | "refresh_fail"
    | "password_ok"
    | "cookie_write"
    | "cookie_write_dropped"
    | "cookie_guard"
    | "recover_ok"
    | "recover_fail";
  detail: string;
};

export type LogSink = (entry: AuthLogEntry) => void;

export function makeEntry(
  side: AuthLogEntry["side"],
  kind: AuthLogEntry["kind"],
  detail: string
): AuthLogEntry {
  return { at: new Date().toISOString().slice(11, 23), side, kind, detail };
}

export function suffix(token: string | undefined | null) {
  return token ? `…${token.slice(-8)}` : "?";
}

export function instrumentedFetch(
  side: AuthLogEntry["side"],
  sink: LogSink
): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const grant = url.includes("/auth/v1/token")
      ? new URL(url).searchParams.get("grant_type")
      : null;

    const started = Date.now();
    const res = await fetch(input, init);

    if (grant === "refresh_token" || grant === "password") {
      const body = (await res
        .clone()
        .json()
        .catch(() => null)) as Record<string, unknown> | null;
      const ms = Date.now() - started;

      if (!res.ok) {
        sink(
          makeEntry(
            side,
            "refresh_fail",
            `HTTP ${res.status} ${body?.error_code ?? ""}: ${
              body?.msg ?? body?.error_description ?? "?"
            } (${ms}ms)`
          )
        );
      } else {
        sink(
          makeEntry(
            side,
            grant === "password" ? "password_ok" : "refresh_ok",
            `novo refresh token ${suffix(
              body?.refresh_token as string
            )} (${ms}ms)`
          )
        );
      }
    }

    return res;
  };
}
