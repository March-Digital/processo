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
  (D2 do PRD do motor, P2-03).

## Fontes

1. **Regras do processo:** [`cerebro/regras/processo.md`](https://github.com/March-Digital/cerebro/blob/main/regras/processo.md).
   É a fonte única; o `CLAUDE.md` de cada projeto importa a nota.
2. **Ambiente de trabalho:** [`motor/scripts/ambiente.sh`](https://github.com/March-Digital/motor/blob/main/scripts/ambiente.sh)
   e o guia [`ambiente.md`](https://github.com/March-Digital/motor/blob/main/scripts/ambiente.md).
3. O que tem aqui:

| Arquivo | Uso |
| --- | --- |
| [`modelos/`](modelos/) | Copiar para `docs/` do projeto novo: PRD, TRD, Schema, App Flow, Brief de Design, Plano e o modelo de ADR |
| [`CLAUDE.md`](CLAUDE.md) | Copiar para a raiz do projeto novo e preencher "Neste projeto" |
| [`modelos/descritivo.md`](modelos/descritivo.md) | Modelo de todo descritivo lido por agente: README, CLAUDE.md, rotina, agente, skill, regra e método. Sete seções; o trecho executável em tags XML |
| [`ferramentas/conferir.mjs`](ferramentas/conferir.mjs) | Conferência sem dependência: `descritivos` (as sete seções e as tags) e `notas` (as quatro facetas e a ligação). Cada repositório chama no próprio teste. `npm test` testa a conferência |

## Passos

1. Projeto novo: copie [`modelos/`](modelos/) para `docs/` do projeto.
2. Copie o [`CLAUDE.md`](CLAUDE.md) para a raiz do projeto novo e preencha cada "Neste projeto".
3. Descritivo novo: siga [`modelos/descritivo.md`](modelos/descritivo.md).
4. No teste do repositório, chame `ferramentas/conferir.mjs descritivos` e
   `ferramentas/conferir.mjs notas`.
5. Mudou a conferência: rode `npm test`.

## Saída

Os modelos copiados para `docs/` e para a raiz de cada projeto. A conferência sai com 0 quando está
tudo certo e com 1 quando acha problema, com uma linha por problema.

## Limites

- Os modelos mudam por PR, com o motivo na mensagem, depois que o projeto que pediu a mudança for
  aprovado.
