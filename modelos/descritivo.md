# [Nome do descritivo]

<!--
Modelo de descritivo da March (AJ-01 do Plano do motor; Emerson, 01/11/2026: "Sete seções fixas",
"Markdown com tags", "Modelo e conferência").

Vale para: README e CLAUDE.md de repositório, prompt de rotina, agente, SKILL.md, regra e método.
Não vale para: falas da marca (marca/, voz-do-cliente/, fundadores/, falas do orgânico) e skills de
terceiros. Nota de conhecimento do cérebro segue o modelo de nota do cérebro, não este.

Regras:
- As sete seções, nesta ordem, com estes títulos. Seção sem conteúdo diz "Não se aplica." e o porquê.
- Frases curtas, número em vez de adjetivo, sem travessão. Ordem e verbo no imperativo nos Passos.
- Arquivo que um agente executa (rotina, agente, skill): o conteúdo de cada seção fica entre a tag
  da seção, em minúsculas e sem acento: <papel>, <objetivo>, <quando_usar>, <fontes>, <passos>,
  <saida>, <limites>. Os títulos em Markdown ficam para a pessoa que lê.
- README e CLAUDE.md descrevem a aplicação. Não são índice de notas nem guardam regra de outra coisa.
- Cabeçalho YAML que a ferramenta exige (name e description de agente e de skill) vem antes do título.
- A conferência fica em ferramentas/conferir.mjs, no processo.
-->

## Papel

Quem lê este arquivo e o que essa pessoa ou esse agente é aqui. Exemplo: "Rotina `seo` do motor da
March: propõe e revisa artigos do blog."

## Objetivo

O resultado que conta como pronto, em uma ou duas frases, com número quando houver.

## Quando usar

O gatilho: horário, comando, evento ou pedido. Quando não usar, se houver confusão comum.

## Fontes

O que ler, em que ordem, com o caminho de cada arquivo ou sistema. Uma linha por fonte.

1. `caminho/do/arquivo.md`: o que tirar dele.

## Passos

1. Verbo no imperativo e o que fazer.
2. Um passo por linha. Decisão com ramos vira subitem: "Se X, faça Y; se não, Z."

## Saída

O formato, o destino e quem recebe. Exemplo: "`POST /rotinas/seo/resultado` com os tipos `artigo` e
`resposta_fio`."

## Limites

- **Nunca:** o que não se faz, mesmo que pareça ajudar.
- **Escalar quando:** a situação em que se para e se chama uma pessoa, e quem.
