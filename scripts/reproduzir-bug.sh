#!/usr/bin/env bash
# Fase 2 — reproduz a cadeia completa do "deslogamento aleatório" sem browser.
# Pré-requisitos: `supabase start` e `npm run dev` rodando.
# Acompanhe o terminal do `next dev` para ver os logs [authlab server].
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
APP_URL="${APP_URL:-http://localhost:3000}"
ANON_KEY="${ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"
EMAIL="${EMAIL:-teste@authlab.dev}"
PASSWORD="${PASSWORD:-senha-lab-123}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1) Login via GoTrue (grant=password)"
SESSION=$(curl -sf -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

RT_ORIGINAL=$(echo "$SESSION" | python3 -c 'import json,sys;print(json.load(sys.stdin)["refresh_token"])')
echo "   refresh token original: …${RT_ORIGINAL: -8}"

# Cookie no formato do @supabase/ssr: "base64-" + base64url(JSON da sessão).
# Nome: sb-<ref>-auth-token, onde ref = primeiro rótulo do host (aqui "127").
COOKIE_VALUE=$(echo "$SESSION" | python3 -c '
import base64, sys
raw = sys.stdin.buffer.read().strip()
print("base64-" + base64.urlsafe_b64encode(raw).decode().rstrip("="))')
COOKIE="sb-127-auth-token=$COOKIE_VALUE"

say "2) SSR com token válido — deve responder 200 sem renovar"
curl -s -o /dev/null -w '   GET /dashboard -> %{http_code}\n' -b "$COOKIE" "$APP_URL/dashboard"

say "3) Esperando 31s o access token expirar (jwt_expiry=30)…"
sleep 31

say "4) SSR com token expirado — RSC renova, rotaciona e PERDE o cookie novo"
echo "   (veja no terminal do next dev: refresh_ok seguido de cookie_write_dropped)"
curl -s -o /dev/null -w '   GET /dashboard -> %{http_code}\n' -b "$COOKIE" "$APP_URL/dashboard"

refresh() {
  curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"refresh_token\":\"$1\"}"
}
rt_of() { python3 -c 'import json,sys;print(json.load(sys.stdin).get("refresh_token",""))'; }

say "5) Outra aba (auto-refresh do browser) consome a cadeia: P -> C1 -> C2"
echo "   Enquanto o filho de P estava sem uso, o GoTrue devolvia o MESMO filho"
echo "   (recuperação benigna) — por isso o SSR acima 'sobreviveu'. Agora a"
echo "   cadeia avança de verdade, como faria o auto-refresh de uma aba ativa:"
C1=$(refresh "$RT_ORIGINAL" | rt_of); echo "   P  (…${RT_ORIGINAL: -8}) -> C1 (…${C1: -8})"
C2=$(refresh "$C1" | rt_of);          echo "   C1 (…${C1: -8}) -> C2 (…${C2: -8})"

say "6) Esperando 11s (fora da janela de reuso de 10s do GoTrue)…"
sleep 11

say "7) Ator defasado (aba congelada / request em voo) renova com P"
refresh "$RT_ORIGINAL" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if "refresh_token" in d:
    print("   INESPERADO: refresh aceito, rt ..." + d["refresh_token"][-8:])
else:
    print("   GoTrue: HTTP", d.get("code", "?"), d.get("error_code", ""), "-", d.get("msg"))
    print("   => auth-js trata esse erro APAGANDO a sessao/cookie compartilhado:")
    print("      todas as abas deslogam. O deslogamento \"aleatorio\" e este.")'

say "8) SSR com o cookie defasado (P) — o servidor tambem expulsa o usuario"
curl -s -o /dev/null -w '   GET /dashboard -> %{http_code} (redirect para /login)\n' -b "$COOKIE" "$APP_URL/dashboard"

say "9) MAS a sessao ainda estava viva: C2 continua valido no GoTrue"
refresh "$C2" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if "refresh_token" in d:
    print("   refresh com C2 aceito (novo rt ..." + d["refresh_token"][-8:] + ")")
    print("   => o logout foi AUTO-INFLIGIDO pelo front sobre sessao recuperavel.")
    print("      Motiva o requisito (3): tentar recuperar antes de ir pro /login.")
else:
    print("   C2 tambem falhou:", d.get("msg"))'
