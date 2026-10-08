# Ambiente de trabalho

Tudo o que uma máquina precisa para trabalhar nos projetos da March. O script
[`verificar.sh`](verificar.sh) confere cada item e diz o que falta; com `--instalar`, instala as
ferramentas que não pedem `sudo`.

```
bash ambiente/verificar.sh            # só confere
bash ambiente/verificar.sh --instalar # instala HubSpot CLI, gcloud, Meta Ads CLI, MCP da Meta e navegadores do Playwright se faltarem
```

Logins e chaves são **por máquina e por pessoa**: nunca copie credenciais de uma máquina para outra
nem as cole em chat.

## Ferramentas

| Ferramenta | Versão | Para quê | Login (uma vez por máquina) |
| --- | --- | --- | --- |
| Node.js + npm | 24 LTS | HubSpot CLI, scripts | |
| GitHub CLI (`gh`) | atual | PRs, repositórios | `gh auth login` |
| HubSpot CLI (`hs`) | 8.15.0 | Apps do HubSpot como projeto | `hs init` (chave pessoal; arquivo `hubspot.config.yml` com permissão 600, fora dos repositórios) |
| MCP HubSpotDev | 8.15.0 | Claude Code publica e valida apps do HubSpot | `hs mcp setup` → Claude Code → modo standalone → versão `8.15.0` |
| Google Cloud CLI (`gcloud`) | atual | Projeto `site-march`, contas de serviço, federação | `gcloud auth login` e `gcloud config set project site-march` |
| Meta Ads CLI (`meta`) | 1.2.0 | Pixels, públicos e contas de anúncio por script ([ADR 0024 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0024-meta-ads-mcp-e-cli.md)) | **Opcional.** Só para scripts que rodam sem pessoa por perto; no dia a dia o MCP basta. Token de usuário de sistema gerado no Business Suite e gravado **por você** em `~/.config/meta/credentials` (só o token, permissão 600) |
| MCP Meta Ads | hospedado | O Claude Code opera as contas de anúncio da Meta | `claude mcp add --transport http -s user meta-ads https://mcp.facebook.com/ads`, depois `/mcp` → meta-ads → login do Facebook |
| GTM MCP (Stape) | hospedado | O Claude Code edita e publica no GTM web e server ([ADR 0025 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0025-mcps-da-stape.md)) | `claude mcp add --transport http -s user gtm https://gtm-mcp.stape.ai/mcp`, depois `/mcp` → gtm → login do Google com a conta que publica |
| Stape MCP | hospedado | O Claude Code cria e configura contêineres na Stape | Chave de API da conta Stape (Account settings › API), gravada por você **num terminal fora do Claude Code** (passo 3) |
| MCP da Hostinger | hospedado | DNS e VPS na Hostinger ([ADR 0027 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0027-mcp-da-hostinger.md)) | `claude mcp add --transport http -s user hostinger https://mcp.hostinger.com`, depois `/mcp` → hostinger → login |
| Playwright + navegadores | atual | Testes de ponta a ponta e monitor sintético | Sem login. Navegadores em `~/.cache/ms-playwright`; bibliotecas do sistema com `sudo npx playwright install-deps` (uma vez) |
| Chave SSH da VPS | ed25519 | Acesso `deploy@179.197.70.152` | Gerar na máquina; uma pessoa da March cadastra a pública no usuário `deploy` |

## Passo a passo numa máquina nova

1. Instalar Node.js 24 LTS e o `gh`; `gh auth login`.
2. `bash ambiente/verificar.sh --instalar`. Para as bibliotecas de sistema dos navegadores do
   Playwright, uma vez: `sudo npx playwright install-deps`.
3. Num terminal separado (são interativos):
   ```
   hs init
   hs mcp setup
   gcloud auth login
   gcloud config set project site-march
   ```
   Stape MCP, num terminal fora do Claude Code (o `!` do Claude Code não espera digitação):
   ```
   read -rs -p "Chave da API da Stape: " k; echo; claude mcp add --transport http -s user stape https://mcp.stape.ai/mcp --header "Authorization: $k"; unset k
   ```
   No Claude Code: `/mcp` → `gtm` → login do Google; `/mcp` → `hostinger` → login da Hostinger; `/mcp` → `meta-ads` → login do Facebook. Só se for rodar scripts com a Meta Ads
   CLI, grave o token do usuário de sistema, digitado por você (nunca colado em chat):
   ```
   umask 077; mkdir -p ~/.config/meta; read -rs -p "Token: " t; printf %s "$t" > ~/.config/meta/credentials; unset t; echo
   ```
4. Chave da VPS, gerada **nesta** máquina:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/march_vps_<maquina> -C "<pessoa>-<maquina>"
   cat ~/.ssh/march_vps_<maquina>.pub
   ```
   Uma pessoa da March acrescenta a chave pública em `/home/deploy/.ssh/authorized_keys` pelo
   Terminal do navegador do hPanel. Depois, no Claude Code: `/permissions` → regra
   `Bash(ssh -i ~/.ssh/march_vps_<maquina>:*)`, escopo do usuário.
5. `bash ambiente/verificar.sh` até não sobrar pendência.

## Google Cloud (uma vez por organização, não por máquina)

Já feito para a March em 07/10/2026 (ADR 0022 do `site-march`):

- Projeto `site-march`, APIs `tagmanager.googleapis.com` e `analyticsadmin.googleapis.com`.
- Conta de serviço `claude-tracking@site-march.iam.gserviceaccount.com`, **sem chave** (a
  organização bloqueia chaves com `iam.disableServiceAccountKeyCreation`).
- Federação de identidade: pool `github`, provedor `site-march-repo` (só `March-Digital/site-march`).

Cada pessoa que usa a personificação na própria máquina precisa do papel, concedido uma vez:
```
gcloud iam service-accounts add-iam-policy-binding claude-tracking@site-march.iam.gserviceaccount.com \
  --member="user:<email>@marchdigital.com.br" --role="roles/iam.serviceAccountTokenCreator" --project site-march
```

## Novo cliente

Uma conta de serviço por cliente, sem chave, no projeto da March:
```
gcloud iam service-accounts create tracking-<cliente> --project site-march \
  --display-name "Tracking <Cliente> (leitura GTM e GA4)"
```
O cliente adiciona `tracking-<cliente>@site-march.iam.gserviceaccount.com` como **Ler** no GTM e
**Leitor** no GA4 dele. Para o GitHub Actions do repositório do cliente, criar um provedor no pool
`github` restrito a esse repositório e dar `roles/iam.workloadIdentityUser` a ele nessa conta.
