# Ambiente de trabalho

Tudo o que uma máquina precisa para trabalhar nos projetos da March. O script
[`verificar.sh`](verificar.sh) confere cada item e diz o que falta.

```
bash ambiente/verificar.sh            # só confere: não baixa nem executa nada da internet
bash ambiente/verificar.sh --instalar # instala o que falta, sempre em versão fixa
```

Regras do `--instalar`: pacotes npm com `--ignore-scripts` (nenhum script de instalação de terceiros
roda), `gcloud` conferido por SHA-256 antes de extrair, nunca `sudo`, nada de mexer em `~/.bashrc`
sem avisar. Ele **não** registra MCPs: o registro é feito por você, uma vez (seção "MCPs").

Logins e chaves são **por máquina e por pessoa**: nunca copie credenciais de uma máquina para outra
nem as cole em chat.

## Ferramentas

| Ferramenta | Versão | Para quê | Login (uma vez por máquina) |
| --- | --- | --- | --- |
| Node.js + npm | 24 LTS | HubSpot CLI, scripts | |
| GitHub CLI (`gh`) | atual | PRs, repositórios | `gh auth login` |
| HubSpot CLI (`hs`) | 8.15.0 | Apps do HubSpot como projeto | `hs init` (chave pessoal; arquivo `hubspot.config.yml` com permissão 600, fora dos repositórios) |
| MCP HubSpotDev | 8.15.0 | Claude Code publica e valida apps do HubSpot | `hs mcp setup` → Claude Code → modo standalone → versão `8.15.0` |
| Google Cloud CLI (`gcloud`) | 588.0.0 | Projeto `site-march`, contas de serviço, federação | `gcloud auth login` e `gcloud config set project site-march` |
| Meta Ads CLI (`meta`) | 1.2.0 | Pixels, públicos e contas de anúncio por script ([ADR 0024 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0024-meta-ads-mcp-e-cli.md)) | **Opcional.** Só para scripts que rodam sem pessoa por perto; no dia a dia o MCP basta. Token de usuário de sistema gerado no Business Suite e gravado **por você** em `~/.config/meta/credentials` (só o token, permissão 600) |
| MCP Meta Ads | hospedado | O Claude Code opera as contas de anúncio da Meta | `claude mcp add --transport http -s user meta-ads https://mcp.facebook.com/ads`, depois `/mcp` → meta-ads → login do Facebook |
| GTM MCP (Stape) | hospedado | O Claude Code edita e publica no GTM web e server ([ADR 0025 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0025-mcps-da-stape.md)) | `claude mcp add --transport http -s user gtm https://gtm-mcp.stape.ai/mcp`, depois `/mcp` → gtm → login do Google com a conta que publica |
| Stape MCP | hospedado | O Claude Code cria e configura contêineres na Stape | Chave de API da conta Stape (Account settings › API), gravada por você **num terminal fora do Claude Code** (passo 3) |
| MCP da Hostinger | hospedado | DNS e VPS na Hostinger ([ADR 0027 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0027-mcp-da-hostinger.md)) | `claude mcp add --transport http -s user hostinger https://mcp.hostinger.com`, depois `/mcp` → hostinger → login |
| MCP da Cloudflare | hospedado | R2 (backup) e demais produtos da Cloudflare ([ADR 0028 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0028-cloudflare-r2-e-mcp.md)) | `claude mcp add --transport http -s user cloudflare https://mcp.cloudflare.com/mcp`, depois `/mcp` → cloudflare → login |
| Chave da API do Healthchecks.io | — | Aplicar os checks como código ([ADR 0030 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0030-healthchecks-como-codigo.md)) | Chave completa criada em Project Settings › API Access e gravada **por você** em `~/.config/healthchecks/api-key` (permissão 600, passo 3) |
| MCP do UptimeRobot | hospedado | Monitor externo do site ([ADR 0031 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0031-uptimerobot-mcp-e-cli.md)) | `claude mcp add --transport http -s user uptimerobot https://mcp.uptimerobot.com/mcp`, depois `/mcp` → uptimerobot → login |
| AWS CLI (`aws`) | 2.38 ou mais nova | SES da newsletter ([ADR 0054 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0054-ses-em-us-east-2.md)) | Instalador oficial no diretório do usuário, sem sudo: `curl -sSfL https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip -o awscliv2.zip && unzip -q awscliv2.zip && ./aws/install -i ~/.local/aws-cli -b ~/.local/bin`. Login pessoal pelo navegador: `aws login --region us-east-2 --profile march` (vale 12 h, renova por 90 dias) e `aws configure set region us-east-2 --profile march` |
| MCP da AWS | `mcp-proxy-for-aws` 1.7.0 | AWS pelas sessões ([ADR 0051 do site-march](https://github.com/March-Digital/site-march/blob/main/docs/adr/0051-mcps-do-listmonk-e-da-aws.md)) | `claude mcp add -s user aws-mcp -e AWS_MCP_PROXY_PROFILES=march -- uvx mcp-proxy-for-aws@1.7.0 https://aws-mcp.us-east-1.api.aws/mcp`. Opcional: `aws configure agent-toolkit --region us-east-1 --profile march` instala as skills da AWS; depois fixe de novo a versão do MCP (o comando grava `@latest`) |
| CLI do UptimeRobot (`uptimerobot`) | 1.0.0 | Monitores por script | **Opcional.** `uptimerobot auth login` com chave de API criada por você em dashboard.uptimerobot.com/integrations |
| Playwright + navegadores | 1.64.0 | Testes de ponta a ponta e monitor sintético | Sem login. CLI no prefixo global do npm; navegadores em `~/.cache/ms-playwright`; bibliotecas do sistema uma vez, com a CLI fixada (passo 2) |
| Chave SSH da VPS | ed25519 | Acesso `deploy@179.197.70.152` | Gerar na máquina; uma pessoa da March cadastra a pública no usuário `deploy` |

## Passo a passo numa máquina nova

1. Instalar Node.js 24 LTS e o `gh`; `gh auth login`.
2. `bash ambiente/verificar.sh --instalar`. Para as bibliotecas de sistema dos navegadores do
   Playwright, uma vez, com a CLI já fixada (sem baixar pacote como root):
   ```
   sudo "$(npm config get prefix)/bin/playwright" install-deps chromium webkit firefox
   ```
3. Num terminal separado (são interativos):
   ```
   hs init
   hs mcp setup
   gcloud auth login
   gcloud config set project site-march
   ```
   Stape MCP, num terminal fora do Claude Code (o `!` do Claude Code não espera digitação). A chave fica alguns segundos visível na lista de processos enquanto o comando
   roda e depois em `~/.claude.json`: use numa máquina só sua e proteja o arquivo (seção abaixo).
   ```
   read -rs -p "Chave da API da Stape: " k; echo; claude mcp add --transport http -s user stape https://mcp.stape.ai/mcp --header "Authorization: $k"; unset k
   ```
   Chave da API do Healthchecks.io, no mesmo terminal (o `umask` só vale dentro dos parênteses):
   ```
   (umask 077; mkdir -p ~/.config/healthchecks; read -rs -p "Chave do Healthchecks: " k; printf %s "$k" > ~/.config/healthchecks/api-key; echo)
   ```
   No Claude Code: `/mcp` → `gtm` → login do Google; `/mcp` → `hostinger` → login da Hostinger; `/mcp` → `cloudflare` → login da Cloudflare; `/mcp` → `uptimerobot` → login do UptimeRobot; `/mcp` → `meta-ads` → login do Facebook. Só se for rodar scripts com a Meta Ads
   CLI, grave o token do usuário de sistema, digitado por você (nunca colado em chat):
   ```
   (umask 077; mkdir -p ~/.config/meta; read -rs -p "Token: " t; printf %s "$t" > ~/.config/meta/credentials; echo)
   ```
4. Chave da VPS, gerada **nesta** máquina:
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/march_vps_<maquina> -C "<pessoa>-<maquina>"
   cat ~/.ssh/march_vps_<maquina>.pub
   ```
   Uma pessoa da March acrescenta a chave pública em `/home/deploy/.ssh/authorized_keys` pelo
   Terminal do navegador do hPanel. O `verificar.sh` registra a chave do servidor, que é fixa:
   `SHA256:oLhRDQgRi/EtJiV0oIrRiR4qm/faCZXzavon/EaX6sI` (ED25519). Se o `ssh` mostrar outra
   impressão digital, **não conecte** e avise a March.

   Permissão no Claude Code (`/permissions`, escopo do usuário), **exatamente** com usuário, host e
   opções fixos, para o agente não poder acrescentar opções do próprio `ssh` (como `-o ProxyCommand`,
   que executaria comandos nesta máquina):
   ```
   Bash(ssh -i ~/.ssh/march_vps_<maquina> -o IdentitiesOnly=yes deploy@179.197.70.152:*)
   ```
   Nunca use a forma curta `Bash(ssh -i ~/.ssh/march_vps_<maquina>:*)`.
5. `bash ambiente/verificar.sh` até não sobrar pendência.

## MCPs

Os MCPs ficam no escopo do usuário (`-s user`): valem para todos os projetos da máquina, com um
login só. Decisão da March em 09/10/2026. Eles dão ao agente poder sobre contas reais (DNS, VPS,
GTM, anúncios); por isso, em repositórios de terceiros, revise o que o agente pede antes de aprovar.
O `verificar.sh` confere se existem e se estão logados.

## Proteger as credenciais do próprio agente

O agente consegue ler arquivos da sua conta. Para ele não ler as credenciais gravadas, acrescente
em `~/.claude/settings.json` (escopo do usuário):

```json
{
  "permissions": {
    "deny": [
      "Read(~/.claude.json)",
      "Read(~/.config/healthchecks/**)",
      "Read(~/.config/meta/**)",
      "Read(~/.config/uptimerobot/**)",
      "Read(~/.config/gcloud/**)",
      "Read(~/.ssh/**)",
      "Read(**/hubspot.config.yml)",
      "Read(**/.env)"
    ]
  }
}
```

Isso bloqueia a ferramenta de leitura; não impede um `cat` pelo terminal, que continua pedindo
permissão. Por isso, nunca aprove comandos que leiam esses arquivos.

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
