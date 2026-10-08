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
| Testes | Playwright (`@playwright/test`) e `@axe-core/playwright` | Apache 2.0 / MPL 2.0 |

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

## 10. Testes

Playwright para tudo o que passa pelo navegador; testes de unidade para regras do back-end. Rodam na
máquina, no CI em todo push e PR (barram o deploy) e, o conjunto de fumaça, depois de cada deploy e
como monitor sintético.

| Conjunto | O que verifica | RF / RNF |
| --- | --- | --- |
| [Conteúdo e navegação] | [O que abre, o que cada botão faz] | RF-xx |
| [Consentimento, quando houver] | [Nenhuma tag antes da escolha; sinais corretos em cada combinação] | RF-xx |
| [Formulário, quando houver] | [Estados, erros, confirmação, duplicidade] | RF-xx |
| [Rastreamento, quando houver] | [Eventos, `event_id`, nenhum dado pessoal em dataLayer e URLs] | RF-xx |
| Acessibilidade | `axe` sem violações A e AA; navegação só com teclado | RNF-xx |
| Visual | Capturas de celular e computador comparadas às de referência do Brief de Design | RF-xx |
| Fumaça | [Caminho mínimo que prova que o sistema está vivo] | RF-xx |

**Navegadores:** Chromium, WebKit e Firefox; perfis de celular e computador.

**Regras:** só dados falsos; no CI, chamadas às plataformas são interceptadas e verificadas, nunca
repassadas; rastros e vídeos de falha ficam 7 dias como artefato do CI.

## 11. Requisitos não funcionais

| ID | Requisito | Medida |
| --- | --- | --- |
| RNF-01 | [Requisito] | [Medida] |

## 12. Rastreabilidade

| RF | Atendido por (seção) |
| --- | --- |
| RF-01 | [Seção] |

## 13. Pontos em aberto técnicos

- [ ] [Pergunta.]
