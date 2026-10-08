#!/usr/bin/env bash
# Confere o ambiente de trabalho da March. Uso: bash ambiente/verificar.sh [--instalar]
set -u
INSTALAR=0; [ "${1:-}" = "--instalar" ] && INSTALAR=1
HS_VERSAO=8.15.0
pend=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
falta(){ printf '  \033[33mfalta\033[0m %s\n' "$1"; pend=$((pend+1)); }

GCLOUD=$(command -v gcloud || { [ -x "$HOME/google-cloud-sdk/bin/gcloud" ] && echo "$HOME/google-cloud-sdk/bin/gcloud"; } || true)

echo "Ferramentas"
command -v node >/dev/null && ok "node $(node --version)" || falta "Node.js 24 LTS"
command -v gh   >/dev/null && ok "gh $(gh --version | head -1 | awk '{print $3}')" || falta "GitHub CLI (gh)"
if ! command -v hs >/dev/null && [ $INSTALAR = 1 ] && command -v npm >/dev/null; then
  npm install -g "@hubspot/cli@$HS_VERSAO" >/dev/null 2>&1
fi
command -v hs >/dev/null && ok "hs $(hs --version 2>/dev/null | tail -1)" || falta "HubSpot CLI: npm install -g @hubspot/cli@$HS_VERSAO"
if [ -z "$GCLOUD" ] && [ $INSTALAR = 1 ]; then
  tmp=$(mktemp -d); curl -fsSL -o "$tmp/gc.tgz" https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz \
    && tar -xzf "$tmp/gc.tgz" -C "$HOME" \
    && "$HOME/google-cloud-sdk/install.sh" --quiet --usage-reporting=false --path-update=true --command-completion=true >/dev/null 2>&1
  rm -rf "$tmp"; GCLOUD="$HOME/google-cloud-sdk/bin/gcloud"; [ -x "$GCLOUD" ] || GCLOUD=""
fi
[ -n "$GCLOUD" ] && ok "gcloud $("$GCLOUD" --version 2>/dev/null | head -1 | awk '{print $4}')" || falta "Google Cloud CLI (rode com --instalar)"
# Confere os navegadores da versão atual do Playwright (versão antiga em cache não vale).
navegadores(){
  command -v npx >/dev/null || { echo "npx"; return; }
  npx -y playwright install --dry-run chromium webkit firefox 2>/dev/null \
    | awk '/Install location:/{print $3}' | while read -r d; do [ -d "$d" ] || basename "$d"; done
}
if [ -n "$(navegadores)" ] && [ $INSTALAR = 1 ] && command -v npx >/dev/null; then
  npx -y playwright install chromium webkit firefox >/dev/null 2>&1
fi
faltam=$(navegadores | tr '\n' ' ')
[ -z "$faltam" ] && ok "navegadores do Playwright (chromium, webkit, firefox)" || falta "navegadores do Playwright: $faltam(rode com --instalar)"

echo "Logins"
gh auth status >/dev/null 2>&1 && ok "GitHub" || falta "gh auth login"
if command -v hs >/dev/null; then
  hs account list 2>/dev/null | grep -q "52134971" && ok "HubSpot (conta 52134971)" || falta "hs init (conta 52134971)"
fi
if command -v claude >/dev/null; then
  claude mcp list 2>/dev/null | grep -qi "hubspot" && ok "MCP HubSpotDev no Claude Code" || falta "hs mcp setup (Claude Code, standalone, $HS_VERSAO)"
fi
if [ -n "$GCLOUD" ]; then
  conta=$("$GCLOUD" auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
  [ -n "$conta" ] && ok "gcloud ($conta)" || falta "gcloud auth login"
  [ "$("$GCLOUD" config get-value project 2>/dev/null)" = "site-march" ] && ok "gcloud projeto site-march" || falta "gcloud config set project site-march"
fi

echo "Acesso à VPS"
chave=$(ls ~/.ssh/march_vps_* 2>/dev/null | grep -v '\.pub$' | head -1)
if [ -n "$chave" ]; then
  ssh -i "$chave" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=8 deploy@179.197.70.152 true 2>/dev/null \
    && ok "ssh deploy@179.197.70.152 ($chave)" || falta "chave $chave ainda não cadastrada no usuário deploy"
else
  falta "chave SSH da VPS (ver ambiente/README.md, passo 4)"
fi

echo
[ $pend = 0 ] && echo "Ambiente completo." || { echo "$pend pendência(s). Veja ambiente/README.md."; exit 1; }
