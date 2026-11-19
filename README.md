# Modelos do processo da March

## Papel

Repositório `processo`: os modelos em branco dos seis documentos de todo projeto da March e o
`CLAUDE.md` que vai na raiz de cada repositório.

## Objetivo

Todo projeto da March começa dos mesmos modelos e confere os descritivos e as notas com a mesma
ferramenta, `ferramentas/conferir.mjs`.

## Quando usar

- Ao começar um projeto novo: copiar os modelos e o `CLAUDE.md`.
- Ao escrever um descritivo lido por agente: README, CLAUDE.md, rotina, agente, skill, regra e
  método.
- No teste de cada repositório, que chama a conferência.
- Não use para as regras do processo nem para o ambiente de trabalho: saíram daqui em 30/10/2026
  (D2 do PRD do motor, P2-03); o ambiente está no cérebro desde 04/11/2026.

## Fontes

1. **Regras do processo:** [`cerebro/operacao/processo.md`](https://github.com/March-Digital/cerebro/blob/main/operacao/processo.md).
   É a fonte única; o `CLAUDE.md` de cada projeto importa a nota.
2. **Ambiente de trabalho:** `cerebro/ferramentas/ambiente.sh` e o guia `ambiente.md`, ao lado,
   no repositório privado `March-Digital/cerebro`.
3. O que tem aqui:

| Arquivo | Uso |
| --- | --- |
| [`modelos/`](modelos/) | Copiar para `docs/` do projeto novo: PRD, TRD, Schema, App Flow, Brief de Design, Plano e o modelo de ADR |
| [`CLAUDE.md`](CLAUDE.md) | Copiar para a raiz do projeto novo e preencher "Neste projeto" |
| [`modelos/ci.yml`](modelos/ci.yml) | Copiar para `.github/workflows/ci.yml` do projeto e trocar cada `<...>`: o padrão "CI por PR, deploy por merge" (regra 15 do processo): o PR roda tudo, a imagem se constrói uma vez com cache no GHCR e a `main` só põe a tag e implanta |
| [`modelos/pre-commit`](modelos/pre-commit) | Copiar para `.githooks/pre-commit` do projeto e ligar pelo `prepare` do `package.json`: o gancho de commit da regra 15 (gitleaks e o script `gancho`, com descritivos, lint e unidade, em menos de 30 segundos; nunca `--no-verify`) |
| [`modelos/descritivo.md`](modelos/descritivo.md) | Modelo de todo descritivo lido por agente: README, CLAUDE.md, rotina, agente, skill, regra e método. Sete seções; o trecho executável em tags XML |
| [`ferramentas/conferir.mjs`](ferramentas/conferir.mjs) | Conferência sem dependência: `descritivos` (as sete seções e as tags e, com `--cerebro <pasta>`, toda nota citada como `../cerebro/<caminho>` existe) `notas` (as facetas, a ligação de ida e de volta dentro do texto e, com `--modelos`, as seções do modelo de cada tipo, nenhum travessão e nenhuma instrução do modelo que sobrou; com `acesso` e `fonte` no `facetas.json`, a faceta de acesso e o cabeçalho `fontes:` com tipo, data e localizador; sempre a natureza do número em análise, oferta e modelo de negócio, `substitui` nos dois sentidos e dado sensível, com `--clientes <arquivo fora do Git>` e `--emails-permitidos`) e `perguntas` (as perguntas de conferência: o fato está na nota e o proibido em nenhuma; `--agente` pergunta ao Claude Code e fica fora do teste padrão). As regras novas vêm do ADR 0017 do cérebro. Cada repositório chama no próprio teste. `npm test` testa a conferência |

## Passos

1. Projeto novo: copie [`modelos/`](modelos/) para `docs/` do projeto.
2. Copie o [`CLAUDE.md`](CLAUDE.md) para a raiz do projeto novo e preencha cada "Neste projeto".
3. Descritivo novo: siga [`modelos/descritivo.md`](modelos/descritivo.md).
4. CI do projeto: copie [`modelos/ci.yml`](modelos/ci.yml) para `.github/workflows/ci.yml`, troque cada
   `<...>` e confira as versões das actions antes do primeiro run. Gancho de commit: copie
   [`modelos/pre-commit`](modelos/pre-commit) para `.githooks/pre-commit`, defina o script `gancho` no
   `package.json` e ligue pelo `prepare`: `git rev-parse --git-dir >/dev/null 2>&1 && git config
   core.hooksPath .githooks || exit 0`. O `npm ci` do Docker e do CI roda fora de um repositório git e o
   `git config` sozinho barra a instalação (site-march#172).
5. No repositório, ponha o processo como dependência de desenvolvimento, presa a um commit:
   `"processo": "https://codeload.github.com/March-Digital/processo/tar.gz/<commit>"`. O
   repositório é público, então o `npm ci` baixa sem credencial, até no Docker e no CI.
6. No `npm test` do repositório, chame `conferir descritivos` e, onde houver notas, `conferir notas`.
7. Mudou a conferência: rode `npm test` aqui e, depois do merge, troque o commit em cada repositório.

## Saída

Os modelos copiados para `docs/` e para a raiz de cada projeto. A conferência sai com 0 quando está
tudo certo e com 1 quando acha problema, com uma linha por problema.

## Limites

- Os modelos mudam por PR, com o motivo na mensagem, depois que o projeto que pediu a mudança for
  aprovado.
