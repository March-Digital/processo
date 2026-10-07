# PRD · [Nome do projeto]

**Versão:** 1 · **Data:** [DD/MM/AAAA] · **Autor:** [nome] · **Status:** em revisão

> **Fonte da verdade:** este arquivo. O PRD responde **por que** e **o quê**. O **como** está no
> TRD, os **dados** no Schema do Backend, os **caminhos** no App Flow, a **aparência** no Brief de
> Design e o **quando** no Plano de implementação.

## 1. Contexto e problema

[2 a 4 parágrafos curtos: o que existe hoje, o que dá errado e para quem. Números quando houver.]

**O problema tem [N] partes:**

1. **[Parte 1].** [Uma ou duas frases.]
2. **[Parte 2].** [Uma ou duas frases.]

## 2. Objetivos

| # | Objetivo | Como sabemos que deu certo |
| --- | --- | --- |
| O1 | [Objetivo] | [Critério medível] |

**Não objetivos desta versão**

- [O que fica de fora de propósito, e por quê em meia frase.]

## 3. Público

| Quem | O que precisa | Onde aparece |
| --- | --- | --- |
| [Pessoa ou papel] | [Necessidade concreta] | [Tela, ferramenta ou canal] |

## 4. Escopo

**Entra**

- [Capacidade, em linguagem de produto, sem tecnologia.]

**Fica fora:** ver não objetivos na seção 2.

## 5. Requisitos funcionais

Prioridade: **M** = obrigatório para publicar; **S** = obrigatório para fechar a versão; **C** = desejável.

### [Área]

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF-01 | [O sistema faz X para Y.] | M |

[IDs por área em dezenas (RF-01–09, RF-10–19…) para caber requisitos novos sem renumerar.]

## 6. Métricas de sucesso

A versão está pronta quando estas metas forem medidas em produção por [N] dias seguidos.

| Métrica | Meta | Objetivo |
| --- | --- | --- |
| [Métrica] | [Valor] | O1 |

## 7. Premissas e decisões

[As decisões que afetam o produto, cada uma com o link do ADR.]

## 8. Riscos de produto e pontos em aberto

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| [Risco] | [Efeito] | [Resposta] |

**Pontos em aberto de produto**

- [ ] [Pergunta, com quem responde.]

## Documentos do projeto

| Documento | Responde | Arquivo | Status |
| --- | --- | --- | --- |
| PRD | Por que e o quê | [`docs/prd.md`](prd.md) | Em revisão |
| TRD | Como, tecnicamente | `docs/trd.md` | A escrever |
| Schema do Backend | Dados e contratos | `docs/schema.md` | A escrever |
| App Flow | Caminhos de pessoas e do sistema | `docs/app-flow.md` | A escrever |
| Brief de Design | Aparência e comportamento | `docs/brief-design.md` | A escrever |
| Plano de implementação | Quando e em que ordem | `docs/plano-implementacao.md` | A escrever |
| ADRs | Decisões e alternativas | [`docs/adr/`](adr/) | [N] aceitos |
