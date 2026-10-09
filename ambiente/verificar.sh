#!/usr/bin/env bash
# Confere o ambiente de trabalho da March. Uso: bash ambiente/verificar.sh [--instalar]
#
# Sem argumento só confere: não baixa nem executa nada da internet.
# Com --instalar, instala o que falta, sempre em versão fixa:
#   - pacotes npm com --ignore-scripts (nenhum script de instalação de terceiros roda);
#   - gcloud em versão fixa, conferido por SHA-256 antes de extrair;
#   - nunca com sudo, nunca mexendo em arquivos de shell sem avisar.
# MCPs não são registrados aqui: o registro é feito pela pessoa, uma vez (ver README, "MCPs").
set -u
INSTALAR=0; [ "${1:-}" = "--instalar" ] && INSTALAR=1

HS_VERSAO=8.15.0
META_VERSAO=1.2.0
UR_VERSAO=1.0.0
PW_VERSAO=1.64.0
GCLOUD_VERSAO=588.0.0
GCLOUD_SHA256_x86_64=e38ceac43022bb5a4d94d5a4a9c9c51f90f28c910b59a018ae07011e220c4412
GCLOUD_SHA256_arm=15d0365242d72caebda77647642ae73f68bde10b1f71338c8a704aea200d8ab1
VPS_HOST=179.197.70.152
# Chave pública do servidor (não é segredo). Confira a impressão digital no README antes de mudar.
VPS_CHAVE_HOST="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA8Rm0pjqUKVeNH7Hdm1SAILcg/onWgDGihrJlLHGaTV"

pend=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
falta(){ printf '  \033[33mfalta\033[0m %s\n' "$1"; pend=$((pend+1)); }
opcional(){ printf '  \033[2mopcional\033[0m %s\n' "$1"; }

# Instala um pacote npm global em versão fixa, sem scripts de instalação e sem sudo.
npm_global(){
  local pacote=$1
  local prefixo; prefixo=$(npm config get prefix 2>/dev/null)
  if [ ! -w "$prefixo" ] && [ ! -w "$prefixo/lib" ]; then
    echo "    $prefixo não é gravável: configure um prefixo do usuário (npm config set prefix ~/.npm-global) em vez de usar sudo"
    return 1
  fi
  npm install -g --ignore-scripts --no-audit --no-fund "$pacote" >/dev/null
}

# Confere se o comando existe E está na versão fixa (só o nome não basta: outro programa com o
# mesmo nome, ou uma versão antiga, passaria).
versao_ok(){ # comando, versão esperada, comando que imprime a versão
  command -v "$1" >/dev/null && eval "$3" 2>/dev/null | grep -qF "$2"
}

GCLOUD=$(command -v gcloud || { [ -x "$HOME/google-cloud-sdk/bin/gcloud" ] && echo "$HOME/google-cloud-sdk/bin/gcloud"; } || true)

echo "Ferramentas"
command -v node >/dev/null && ok "node $(node --version)" || falta "Node.js 24 LTS"
command -v gh   >/dev/null && ok "gh $(gh --version | head -1 | awk '{print $3}')" || falta "GitHub CLI (gh)"

if ! versao_ok hs "$HS_VERSAO" "hs --version" && [ $INSTALAR = 1 ]; then npm_global "@hubspot/cli@$HS_VERSAO"; fi
versao_ok hs "$HS_VERSAO" "hs --version" && ok "hs $HS_VERSAO" \
  || falta "HubSpot CLI $HS_VERSAO (rode com --instalar; hoje: $(hs --version 2>/dev/null | tail -1 || echo ausente))"

if [ -z "$GCLOUD" ] && [ $INSTALAR = 1 ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) arq=x86_64; sha=$GCLOUD_SHA256_x86_64 ;;
    Linux-aarch64|Linux-arm64) arq=arm; sha=$GCLOUD_SHA256_arm ;;
    *) arq=""; echo "    gcloud: sistema $(uname -s)-$(uname -m) sem pacote fixado; instale pelo site do Google" ;;
  esac
  if [ -n "$arq" ]; then
    tmp=$(mktemp -d)
    url="https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-$GCLOUD_VERSAO-linux-$arq.tar.gz"
    if curl -fsSL -o "$tmp/gc.tgz" "$url" && echo "$sha  $tmp/gc.tgz" | sha256sum -c --status; then
      [ -e "$HOME/google-cloud-sdk" ] && echo "    $HOME/google-cloud-sdk já existe; não sobrescrevo" \
        || { tar -xzf "$tmp/gc.tgz" -C "$HOME" \
             && "$HOME/google-cloud-sdk/install.sh" --quiet --usage-reporting=false --path-update=false --command-completion=false \
             && echo "    gcloud instalado; acrescente ao PATH: export PATH=\"\$HOME/google-cloud-sdk/bin:\$PATH\""; }
    else
      echo "    gcloud: download falhou ou o SHA-256 não confere; nada foi extraído"
    fi
    rm -rf "$tmp"; GCLOUD="$HOME/google-cloud-sdk/bin/gcloud"; [ -x "$GCLOUD" ] || GCLOUD=""
  fi
fi
[ -n "$GCLOUD" ] && ok "gcloud $("$GCLOUD" --version 2>/dev/null | head -1 | awk '{print $4}')" || falta "Google Cloud CLI (rode com --instalar)"

if ! versao_ok meta "$META_VERSAO" "meta --version" && [ $INSTALAR = 1 ] && command -v uv >/dev/null; then
  uv tool install "meta-ads==$META_VERSAO" >/dev/null
fi
versao_ok meta "$META_VERSAO" "meta --version" && ok "meta $META_VERSAO" \
  || falta "Meta Ads CLI $META_VERSAO: rode com --instalar (precisa do uv e Python 3.12+)"

if ! versao_ok uptimerobot "$UR_VERSAO" "uptimerobot --version" && [ $INSTALAR = 1 ]; then npm_global "@uptimerobot/cli@$UR_VERSAO"; fi
versao_ok uptimerobot "$UR_VERSAO" "uptimerobot --version" && ok "uptimerobot $UR_VERSAO" || falta "CLI do UptimeRobot $UR_VERSAO (rode com --instalar)"

# Playwright: a CLI em versão fixa decide quais navegadores essa versão usa. Usa o binário do
# prefixo global do npm pelo caminho completo (outro `playwright` no PATH, como o do pip, não vale).
# A conferência é local (--dry-run não baixa nada); se não responder, é "falta", nunca "ok".
PW="$(npm config get prefix 2>/dev/null)/bin/playwright"
if ! versao_ok "$PW" "$PW_VERSAO" "\"$PW\" --version" && [ $INSTALAR = 1 ]; then npm_global "playwright@$PW_VERSAO"; fi
if versao_ok "$PW" "$PW_VERSAO" "\"$PW\" --version"; then
  locais=$("$PW" install --dry-run chromium webkit firefox 2>/dev/null | awk '/Install location:/{print $3}')
  if [ -z "$locais" ]; then
    falta "navegadores do Playwright: não consegui conferir (playwright install --dry-run não respondeu)"
  else
    faltam=$(for d in $locais; do [ -d "$d" ] || basename "$d"; done | tr '\n' ' ')
    if [ -n "$faltam" ] && [ $INSTALAR = 1 ]; then
      "$PW" install chromium webkit firefox >/dev/null && faltam=""
    fi
    [ -z "$faltam" ] && ok "navegadores do Playwright $PW_VERSAO" || falta "navegadores do Playwright: $faltam(rode com --instalar)"
  fi
else
  falta "Playwright $PW_VERSAO (rode com --instalar)"
fi

echo "Logins"
gh auth status >/dev/null 2>&1 && ok "GitHub" || falta "gh auth login"
if command -v hs >/dev/null; then
  hs account list 2>/dev/null | grep -q "52134971" && ok "HubSpot (conta 52134971)" || falta "hs init (conta 52134971)"
fi
if [ -n "$GCLOUD" ]; then
  conta=$("$GCLOUD" auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
  [ -n "$conta" ] && ok "gcloud ($conta)" || falta "gcloud auth login"
  [ "$("$GCLOUD" config get-value project 2>/dev/null)" = "site-march" ] && ok "gcloud projeto site-march" || falta "gcloud config set project site-march"
fi
for f in "$HOME/.config/healthchecks/api-key"; do
  if [ -f "$f" ]; then
    [ "$(stat -c %a "$f")" = 600 ] && ok "chave do Healthchecks (600)" || falta "chmod 600 $f"
  else
    falta "chave do Healthchecks em $f (README, passo 3)"
  fi
done
if [ -f "$HOME/.config/meta/credentials" ]; then
  [ "$(stat -c %a "$HOME/.config/meta/credentials")" = 600 ] && ok "token da Meta Ads CLI (600)" || falta "chmod 600 ~/.config/meta/credentials"
else
  opcional "token da Meta Ads CLI (só para scripts; ver README)"
fi

echo "MCPs (escopo do usuário; aqui só confiro se existem e se estão logados)"
if command -v claude >/dev/null; then
  lista=$(claude mcp list 2>/dev/null)
  mcp(){ # nome, rótulo
    m=$(echo "$lista" | grep "^$1:")
    if [ -z "$m" ]; then falta "$2: registre com claude mcp add -s user (README, \"MCPs\")"
    elif echo "$m" | grep -qi "needs auth"; then falta "$2 sem login: /mcp → $1"
    elif echo "$m" | grep -q "✘"; then falta "$2 não conecta"
    else ok "$2"; fi
  }
  echo "$lista" | grep -qi "hubspot" && ok "MCP HubSpotDev" || falta "hs mcp setup (Claude Code, standalone, $HS_VERSAO)"
  mcp meta-ads "MCP Meta Ads"
  mcp gtm "GTM MCP (Stape)"
  mcp stape "Stape MCP"
  mcp hostinger "MCP da Hostinger"
  mcp cloudflare "MCP da Cloudflare"
  mcp uptimerobot "MCP do UptimeRobot"
else
  falta "Claude Code (comando claude)"
fi

echo "Acesso à VPS"
kh="$HOME/.ssh/known_hosts"
# A chave do servidor vem fixada neste script: a primeira conexão não aceita qualquer servidor.
if ! ssh-keygen -F "$VPS_HOST" -f "$kh" 2>/dev/null | grep -q "ssh-ed25519"; then
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh" && echo "$VPS_HOST $VPS_CHAVE_HOST" >> "$kh" \
    && echo "    chave do servidor $VPS_HOST registrada em known_hosts (impressão digital no README)"
fi
chave=$(ls ~/.ssh/march_vps_* 2>/dev/null | grep -v '\.pub$' | head -1)
if [ -n "$chave" ]; then
  erro=$(ssh -i "$chave" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=8 \
    "deploy@$VPS_HOST" true 2>&1 >/dev/null)
  case "$?:$erro" in
    0:*) ok "ssh deploy@$VPS_HOST ($chave)" ;;
    *"Host key verification failed"*|*"REMOTE HOST IDENTIFICATION HAS CHANGED"*)
      falta "a chave do servidor $VPS_HOST NÃO confere com a fixada: não conecte e avise a March" ;;
    *"Permission denied"*) falta "chave $chave ainda não cadastrada no usuário deploy" ;;
    *) falta "VPS inacessível agora ($erro)" ;;
  esac
else
  falta "chave SSH da VPS (ver ambiente/README.md, passo 4)"
fi

echo
[ $pend = 0 ] && echo "Ambiente completo." || { echo "$pend pendência(s). Veja ambiente/README.md."; exit 1; }
