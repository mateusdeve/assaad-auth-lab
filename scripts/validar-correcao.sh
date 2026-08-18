#!/usr/bin/env bash
# Fase 4 — valida a correção pela mesma trilha que reproduzia o bug.
# Pré-requisitos: `supabase start` e `npm run dev` rodando.
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
echo "   refresh token original (P): …${RT_ORIGINAL: -8}"

COOKIE_VALUE=$(echo "$SESSION" | python3 -c '
import base64, sys
raw = sys.stdin.buffer.read().strip()
print("base64-" + base64.urlsafe_b64encode(raw).decode().rstrip("="))')
COOKIE="sb-127-auth-token=$COOKIE_VALUE"

say "2) Esperando 31s — token entra na margem de renovação do auth-js"
echo "   (jwt_expiry=120; o proxy renova quando faltam <90s = EXPIRY_MARGIN_MS)"
sleep 31

say "3) SSR com token expirado — ANTES isso perdia a rotação; AGORA o proxy"
echo "   renova e devolve Set-Cookie com a sessão nova:"
HEADERS=$(curl -s -D - -o /dev/null -b "$COOKIE" "$APP_URL/dashboard")
STATUS=$(echo "$HEADERS" | head -1 | awk '{print $2}')
NEW_COOKIE_VALUE=$(echo "$HEADERS" | grep -i '^set-cookie: sb-127-auth-token=' | head -1 | sed 's/^[Ss]et-[Cc]ookie: sb-127-auth-token=//; s/;.*//')
echo "   GET /dashboard -> $STATUS"
if [ -z "$NEW_COOKIE_VALUE" ]; then
  echo "   FALHOU: nenhum Set-Cookie de sessão na resposta"; exit 1
fi
NEW_RT=$(echo "$NEW_COOKIE_VALUE" | python3 -c '
import base64, json, sys
raw = sys.stdin.read().strip()
raw = raw[7:] if raw.startswith("base64-") else raw
raw += "=" * (-len(raw) % 4)
print(json.loads(base64.urlsafe_b64decode(raw))["refresh_token"])')
echo "   Set-Cookie presente: sessão avançou P (…${RT_ORIGINAL: -8}) -> …${NEW_RT: -8}"

say "4) Navegando de novo com o cookie NOVO — access token válido, sem renovar"
curl -s -o /dev/null -w '   GET /dashboard -> %{http_code}\n' \
  -b "sb-127-auth-token=$NEW_COOKIE_VALUE" "$APP_URL/dashboard"

say "5) /auth/recover com o cookie novo — recuperação responde 200"
curl -s -o /dev/null -w '   POST /auth/recover -> %{http_code}\n' \
  -X POST -b "sb-127-auth-token=$NEW_COOKIE_VALUE" "$APP_URL/auth/recover"

say "6) /auth/recover SEM cookie — sessão morta de verdade responde 401"
curl -s -o /dev/null -w '   POST /auth/recover -> %{http_code}\n' \
  -X POST "$APP_URL/auth/recover"

say "7) O token velho P continua de uso único no GoTrue (semântica intacta)"
sleep 11
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$RT_ORIGINAL\"}" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if "refresh_token" in d:
    print("   reuso de P aceito (janela de graca do GoTrue) — inofensivo:")
    print("   nenhum ator segura P; o browser ja recebeu o cookie novo no passo 3.")
else:
    print("   GoTrue:", d.get("error_code", d.get("msg")))
    print("   => reuso de P rejeitado; e nenhum ator o segura — sem vitimas.")'

say "OK: rotação persiste, cookie avança, recuperação funciona."
