# Instruções para agentes

Este projeto segue o processo da March (`github.com/March-Digital/processo`).

- O repositório é a fonte da verdade. Todo desenvolvimento tem seis documentos em `docs/`, cada um
  com papel próprio e sem sobreposição: `prd.md` (por que e o quê), `trd.md` (como), `schema.md`
  (dados e contratos), `app-flow.md` (caminhos), `brief-design.md` (aparência) e
  `plano-implementacao.md` (quando).
- Ordem: PRD → TRD → Schema → App Flow → Brief de Design → Plano. Um por vez; o próximo só começa
  depois que o anterior for aprovado por quem decide.
- Decisões antes do documento: escolhas que mudam o documento são perguntadas e respondidas antes
  da aprovação. Nunca escreva um documento sobre uma decisão que ninguém tomou.
- Aprovado = commit, com versão e status atualizados no cabeçalho e na tabela do PRD.
- Requisitos têm ID (`RF-xx`, `RNF-xx`); TRD, App Flow e Plano citam esses IDs.
- Toda decisão de arquitetura tem um ADR em `docs/adr/`; um ADR aceito só muda por outro ADR.
- Open source por padrão; exceções têm ADR.
- Testes de ponta a ponta com Playwright: mudança em página, consentimento, formulário ou tag vem
  com teste, e `npx playwright test` passa antes do PR. Só dados falsos; nunca conversão real.
- Integração antes de tela: use as CLIs e MCPs oficiais (HubSpot, Google Cloud, Meta) antes do
  painel; o login e os tokens são feitos pela pessoa, nunca pelo agente.
- Contas, permissões, DNS, regras de acesso a servidores e textos jurídicos são feitos por uma
  pessoa da March. Credenciais nunca passam por chat, e-mail ou repositório.
- Design existente aprovado pelo cliente é a referência; refinamento estético só se for pedido.
- Texto em português do Brasil, frases curtas, sem travessão.
