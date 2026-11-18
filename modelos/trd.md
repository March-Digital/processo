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

**Domínio e bordas** (regra 16 do processo)

| Módulo | Papel | Importa framework? |
| --- | --- | --- |
| `[pacote/dominio]` | Regra de negócio | Não: um teste barra |
| `[pacote/contratos]` | Modelos de entrada e saída; campo desconhecido é erro | Só a biblioteca de validação |
| `[pacote/adaptadores/...]` | HTTP, banco, arquivo, fila, MCP, clientes de API | Sim |

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

**Rotinas com mais de uma etapa** (regra 18 do processo): cada etapa grava o estado e o hash SHA-256
do que produziu; `[comando] retomar` continua do último estado sem refazer o que já foi feito e
recusa artefato cujo hash mudou. A tabela de estados e o caminho de falha estão no App Flow.

## 6. [Integrações e rastreamento, quando houver]

[Eventos, destinos, normas de envio.]

## 7. Segurança

O mínimo de todo serviço com interface de rede (regra 19 do processo), cada um com teste de ponta a
ponta na seção 10:

| Controle | Detalhe |
| --- | --- |
| Escuta | Só loopback por padrão; interface externa só por variável de ambiente explícita |
| Autenticação | Toda interface externa exige [método]; sem exceção para leitura |
| `Host` e `Origin` | Só os valores da lista; o resto recebe 4xx |
| HTTPS | Só pelo proxy ([Caddy]); o serviço nunca expõe TLS próprio |
| [Controle do projeto] | [Como] |

## 8. Infraestrutura e deploy

[Onde roda, serviços, DNS, deploy, backup.]

## 9. Observabilidade

| O que observar | Fonte | Alerta | Canal |
| --- | --- | --- | --- |
| [Sinal] | [Fonte] | [Limite] | [Canal] |

## 10. Testes

Playwright para tudo o que passa pelo navegador; testes de unidade para regras do back-end. Rodam na
máquina, no CI em todo PR (barram o merge, regra 15) e, o conjunto de fumaça, depois de cada deploy e
como monitor sintético.

**Python** (regra 15): `ruff check`, `ruff format --check` e `mypy --strict` dentro do `npm test`,
configurados no `pyproject.toml` (regras `E, F, I, UP, B, SIM`, linha 100). Marcadores do `pytest`:
`externo` para o que chama serviço pago ou externo; `integracao` para o que exige banco de verdade;
o padrão roda sem os dois (`-m "not externo and not integracao"`). O gancho de commit
(`.githooks/pre-commit`, modelo no `processo`) roda gitleaks, descritivos, lint e unidade em menos
de 30 segundos.

| Conjunto | O que verifica | RF / RNF |
| --- | --- | --- |
| [Conteúdo e navegação] | [O que abre, o que cada botão faz] | RF-xx |
| [Consentimento, quando houver] | [Nenhuma tag antes da escolha; sinais corretos em cada combinação] | RF-xx |
| [Formulário, quando houver] | [Estados, erros, confirmação, duplicidade] | RF-xx |
| [Rastreamento, quando houver] | [Eventos, `event_id`, nenhum dado pessoal em dataLayer e URLs] | RF-xx |
| Acessibilidade | `axe` sem violações A e AA; navegação só com teclado | RNF-xx |
| Visual | Capturas de celular e computador comparadas às de referência do Brief de Design | RF-xx |
| Fumaça | [Caminho mínimo que prova que o sistema está vivo] | RF-xx |
| Bordas | Entrada com campo desconhecido é recusada; arquivo com `versao` futura é recusado; domínio não importa framework | RNF-xx |
| Rede | Os 4 controles da seção 7: loopback, autenticação, `Host` e `Origin`, HTTPS só pelo proxy | RNF-xx |
| Retomada, quando houver rotina | `retomar` não refaz etapa feita e recusa hash que mudou | RF-xx |

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
