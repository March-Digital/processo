# TRD · [Nome do projeto]

**Versão:** 1 · **Data:** [DD/MM/AAAA] · **Status:** em revisão

> O TRD responde **como**, tecnicamente, os requisitos do [PRD](prd.md) são atendidos. Cada seção
> cita os `RF-xx` que cobre. Tabelas e contratos ficam no Schema; telas e caminhos, no App Flow;
> datas e ordem, no Plano.

## 1. Decisões técnicas a confirmar nesta revisão

[Escolhas novas propostas aqui. Depois de aprovadas, viram ADR e esta seção passa a se chamar
"Decisões técnicas desta versão", com o link de cada ADR.]

| # | Tema | Proposta | Alternativa | Por que a proposta |
| --- | --- | --- | --- | --- |
| T1 | [Tema] | [Proposta] | [Alternativa] | [Motivo] |

## 2. Arquitetura

[Desenho (Mermaid ou imagem em `docs/img/`) e tabela de componentes.]

| Componente | Onde roda | Responsabilidade | RF |
| --- | --- | --- | --- |
| [Componente] | [Onde] | [O que faz] | RF-xx |

**Caminho principal**

1. [Passo a passo do fluxo mais importante, do início ao fim.]

## 3. Stack

| Camada | Tecnologia | Licença |
| --- | --- | --- |
| [Camada] | [Tecnologia e versão] | [Licença] |

## 4. [Front-end, quando houver]

[Módulos, regras de peso, acessibilidade e segurança no navegador.]

## 5. [Back-end, quando houver]

[Comportamento: validação, idempotência, fila, integrações. Contratos ficam no Schema.]

## 6. [Integrações e rastreamento, quando houver]

[Eventos, destinos, normas de envio.]

## 7. Segurança

| Controle | Detalhe |
| --- | --- |
| [Controle] | [Como] |

## 8. Infraestrutura e deploy

[Onde roda, serviços, DNS, deploy, backup.]

## 9. Observabilidade

| O que observar | Fonte | Alerta | Canal |
| --- | --- | --- | --- |
| [Sinal] | [Fonte] | [Limite] | [Canal] |

## 10. Requisitos não funcionais

| ID | Requisito | Medida |
| --- | --- | --- |
| RNF-01 | [Requisito] | [Medida] |

## 11. Rastreabilidade

| RF | Atendido por (seção) |
| --- | --- |
| RF-01 | [Seção] |

## 12. Pontos em aberto técnicos

- [ ] [Pergunta.]
