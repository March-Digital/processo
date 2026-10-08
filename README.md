# Processo de desenvolvimento da March

Todo desenvolvimento da March (site, landing page, sistema, integração, para a March ou para um
cliente) nasce de **seis documentos**. Este repositório guarda os modelos em branco e as regras do
processo. O exemplo completo é o
[`March-Digital/site-march`](https://github.com/March-Digital/site-march/tree/main/docs).

## Os seis documentos

| # | Documento | Responde | Arquivo no projeto | Modelo |
| --- | --- | --- | --- | --- |
| 1 | PRD | Por que e o quê | `docs/prd.md` | [`modelos/prd.md`](modelos/prd.md) |
| 2 | TRD | Como, tecnicamente | `docs/trd.md` | [`modelos/trd.md`](modelos/trd.md) |
| 3 | Schema do Backend | Dados e contratos | `docs/schema.md` | [`modelos/schema.md`](modelos/schema.md) |
| 4 | App Flow | Caminhos de pessoas e do sistema | `docs/app-flow.md` | [`modelos/app-flow.md`](modelos/app-flow.md) |
| 5 | Brief de Design | Aparência e comportamento | `docs/brief-design.md` | [`modelos/brief-design.md`](modelos/brief-design.md) |
| 6 | Plano de implementação | Quando e em que ordem | `docs/plano-implementacao.md` | [`modelos/plano-implementacao.md`](modelos/plano-implementacao.md) |

Mais as decisões de arquitetura, uma por arquivo, em `docs/adr/`
([modelo](modelos/adr/0000-modelo.md)).

Projeto sem back-end: o Schema registra "não se aplica" e o porquê, em uma linha. Nenhum dos seis é
pulado em silêncio.

## Regras

1. **Decisões antes do documento.** As escolhas que mudam o documento são feitas antes de
   escrevê-lo, com quem decide. Cada documento novo traz no topo as decisões que ainda precisam de
   aval (ex.: `T1`, `D1`) e só é aprovado depois que elas forem respondidas.
2. **Um documento por vez, nesta ordem:** PRD → TRD → Schema → App Flow → Brief de Design →
   Plano. Cada um se apoia no anterior já aprovado.
3. **Cada documento tem um papel e não invade o dos outros.** O PRD não traz tecnologia; o TRD não
   traz datas; o Plano não redefine requisitos.
4. **Rastreabilidade.** Requisitos do PRD têm ID (`RF-xx`); requisitos não funcionais do TRD
   também (`RNF-xx`). TRD, App Flow e Plano citam esses IDs.
5. **O repositório do projeto é a fonte da verdade.** Cópias em outras ferramentas (Claude Docs,
   Google Docs) são só para leitura e comentários e dizem isso no topo.
6. **Aprovado = commit.** Cada aprovação vira um commit com a versão e o status atualizados no
   cabeçalho do documento e na tabela "Documentos do projeto" do PRD.
7. **Decisão de arquitetura vira ADR.** Um ADR aceito só muda por outro ADR que o substitui.
8. **Fase 0 é de integrações e acessos.** Contas, permissões, credenciais e textos jurídicos ficam
   com uma pessoa da March. Credenciais nunca passam por chat, e-mail ou repositório.
   Integração antes de tela: CLIs e MCPs oficiais (HubSpot, Google Cloud, Meta, Stape e GTM) vêm antes do
   painel; login e tokens ficam com a pessoa.
9. **Open source por padrão.** Ferramenta fora disso (licença não aprovada pela OSI) precisa de um
   ADR de exceção.
10. **Testes com Playwright.** Tudo o que passa pelo navegador (páginas, consentimento, formulários,
    disparos de tag, acessibilidade, layout) tem teste de ponta a ponta com Playwright, rodando no CI
    e barrando o deploy. O TRD de cada projeto lista os conjuntos de teste por `RF-xx`. Só dados
    falsos; teste nunca envia conversão real.
11. **Escrita:** português do Brasil, frases curtas, número em vez de adjetivo, sem travessão.

## Como começar um projeto

1. Criar o repositório do projeto.
2. Copiar a pasta `modelos/` deste repositório para `docs/` do projeto e renomear
   `modelos/adr/0000-modelo.md` para o primeiro ADR quando houver a primeira decisão.
3. Copiar [`CLAUDE.md`](CLAUDE.md) para a raiz do projeto, para os agentes seguirem o processo.
4. Escrever o PRD e seguir a ordem.

## Ambiente de trabalho

Ferramentas, logins e acessos que cada máquina precisa (HubSpot CLI e MCP, Google Cloud CLI,
chave da VPS), com um script que confere tudo: [`ambiente/`](ambiente/).

## Mudanças no processo

Este repositório muda por commit, com o motivo na mensagem. Ajustes que vierem de um projeto real
(uma seção que sempre sobra, um campo que sempre falta) entram aqui depois que o projeto for
aprovado.
