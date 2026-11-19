import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { citacoesDoCerebro, conferirDescritivo, conferirNotas, conferirPerguntas, dadoSensivel, historicoNaNota, lerCabecalho, lerFonte, ligacoes, ligacoesNoTexto, numerosSemNatureza, perguntarAoAgente, temTravessao, textoDoModelo, rodar, SECOES, TAGS } from '../ferramentas/conferir.mjs';

const secoes = (comTags = false) => SECOES.map((s, i) => `## ${s}\n\n${comTags ? `<${TAGS[i]}>\ntexto\n</${TAGS[i]}>` : 'texto'}\n`).join('\n');

test('descritivo: as sete seções na ordem passam; o modelo do processo passa', () => {
  assert.deepEqual(conferirDescritivo(`# Nome\n\n${secoes()}`), []);
  assert.deepEqual(conferirDescritivo(readFileSync(new URL('../modelos/descritivo.md', import.meta.url), 'utf8')), []);
});

test('descritivo: seção faltando, fora de ordem e título dentro de bloco de código', () => {
  assert.deepEqual(conferirDescritivo('# X\n## Papel\n## Objetivo\n'), SECOES.slice(2).map((s) => `falta a seção "## ${s}"`));
  const trocado = secoes().replace('## Fontes', '## TEMP').replace('## Passos', '## Fontes').replace('## TEMP', '## Passos');
  assert.match(conferirDescritivo(trocado)[0], /fora de ordem/);
  assert.equal(conferirDescritivo('```\n## Papel\n```\n').length, 7);
});

test('executável: exige as sete tags; cabeçalho YAML de agente não atrapalha', () => {
  assert.deepEqual(conferirDescritivo(`---\nname: x\ndescription: y\n---\n${secoes(true)}`, { executavel: true }), []);
  const semPassos = secoes(true).replace('<passos>', '').replace('</passos>', '');
  assert.deepEqual(conferirDescritivo(semPassos, { executavel: true }), ['falta a tag <passos>...</passos>']);
  assert.deepEqual(conferirDescritivo(secoes(), { executavel: false }), []);
});

test('cabeçalho: valor simples, lista entre colchetes, lista com traço e comentário', () => {
  const cab = lerCabecalho("---\ntipo: analise   # comentário\narea: [seo, geo]\norigem:\n  - concorrente\nestado: 'validado'\n---\n# T\n");
  assert.deepEqual(cab, { tipo: 'analise', area: ['seo', 'geo'], origem: ['concorrente'], estado: 'validado' });
  assert.equal(lerCabecalho('# sem cabeçalho'), null);
});

test('ligações: nome, apelido e trecho; nada dentro de bloco de código', () => {
  assert.deepEqual(ligacoes('Ver [[voz]], [[oferta|a oferta]] e [[dna#Promessa]].\n```\n[[fora]]\n```'), ['voz', 'oferta', 'dna']);
});

const FAC = { tipo: ['analise', 'oferta'], area: ['seo', 'comercial'], estado: ['validado', 'ideia'], origem: ['interna', 'concorrente'] };
const nota = (caminho, cab, corpoTexto = '') => ({ caminho, texto: `---\n${cab}\n---\n# T\n${corpoTexto}\n` });
const ok = 'tipo: analise\narea: seo\nestado: validado\norigem: interna';

const ida = (x) => `Os números de [[${x}]] mostram o mesmo padrão.`;

test('notas: facetas e ligação de ida e de volta, dentro do texto', () => {
  const notas = [nota('a.md', ok, ida('b')), nota('b.md', ok, ida('a')), nota('c.md', ok, ida('inexistente'))];
  assert.deepEqual(conferirNotas(notas, FAC), [
    { arquivo: 'c.md', problema: 'sem ligação no texto para outra nota' },
    { arquivo: 'c.md', problema: 'nenhuma nota liga para esta no texto' },
  ]);
  const ruins = [nota('d.md', 'tipo: analise\narea: marketing\nestado: validado\norigem: ', ida('g')), nota('g.md', ok, ida('d'))];
  assert.deepEqual(conferirNotas(ruins, FAC).map((p) => p.problema), ['"area: marketing" fora da lista', 'faceta "origem" vazia']);
  assert.equal(conferirNotas([{ caminho: 'e.md', texto: '# sem cabeçalho' }], FAC)[0].problema, 'sem cabeçalho YAML');
  // Ligação só para si mesma não conta.
  assert.equal(conferirNotas([nota('f.md', ok, ida('f'))], FAC)[0].problema, 'sem ligação no texto para outra nota');
});

test('ligação no texto: linha só de ligações não conta; frase com o porquê conta', () => {
  assert.deepEqual(ligacoesNoTexto('> Veio de x. Ligada a: [[a]], [[b]].'), []); // a linha automática do AJ-01c
  assert.deepEqual(ligacoesNoTexto('Ligada a: [[a]], [[b]].'), []);
  assert.deepEqual(ligacoesNoTexto('- [[a]]'), []);
  assert.deepEqual(ligacoesNoTexto('1. [[a]]: o tom de cada peça.'), ['a']);
  assert.deepEqual(ligacoesNoTexto('```\nO tom vem de [[a]] sempre.\n```'), []);
  assert.deepEqual(ligacoesNoTexto('Para quem gera leads e tem vendedor\n(ver [[dna]]).'), ['dna']); // parágrafo quebrado
  assert.deepEqual(ligacoesNoTexto('> Veio de `x/y.md` em 01/11/2026. Caminhos entre crases são do x. Ligada a: [[a]], [[b]].'), []);
  assert.deepEqual(ligacoesNoTexto('- [[a]]\n- [[b]]'), []);
});

test('modelo do tipo: seções na ordem; marca fica de fora; travessão fora de citação', () => {
  const modelos = { analise: ['Resposta', 'Fontes'], marca: [] };
  const fac = { ...FAC, tipo: [...FAC.tipo, 'marca'], area: [...FAC.area, 'marca'] };
  const a = nota('a.md', ok, `## Resposta\n\n${ida('b')}\n\n## Fontes\n\nA fala de [[m]] dá o tom do texto.`);
  const b = nota('b.md', ok, `## Fontes\n\n${ida('a')}\n\n## Resposta\n\nx — y`);
  const m = nota('m.md', 'tipo: marca\narea: marca\nestado: validado\norigem: interna', `${ida('a')} Fala — livre.`);
  assert.deepEqual(conferirNotas([a, b, m], fac, { modelos }).map((p) => `${p.arquivo}: ${p.problema}`), [
    'b.md: seções fora da ordem do modelo de analise',
    'b.md: travessão no texto',
  ]);
  const c = nota('c.md', 'tipo: ideia\narea: seo\nestado: ideia\norigem: interna', ida('a'));
  assert.match(conferirNotas([a, c], FAC, { modelos }).at(-1).problema, /sem modelo para o tipo "ideia"/);
  assert.equal(temTravessao('Ele disse "ou de igual ←——→ para igual?" e `a — b`.'), false);
});

test('linha de comando: notas com --ignorar e descritivos com --executaveis', () => {
  const dir = mkdtempSync(join(tmpdir(), 'conferir-'));
  mkdirSync(join(dir, 'modelos'));
  writeFileSync(join(dir, 'a.md'), nota('a.md', ok, ida('b')).texto);
  writeFileSync(join(dir, 'b.md'), nota('b.md', ok, ida('a')).texto);
  writeFileSync(join(dir, 'README.md'), '# Sem cabeçalho');
  writeFileSync(join(dir, 'modelos', 'nota.md'), '# modelo');
  writeFileSync(join(dir, 'facetas.json'), JSON.stringify(FAC));
  const linhas = [];
  const escrever = (l) => linhas.push(l);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json'), '--ignorar', 'README.md', 'modelos'], { escrever }), 0);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json')], { escrever }), 1);
  writeFileSync(join(dir, 'modelos', 'analise.md'), '# Modelo\n\n## Resposta\n');
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json'), '--modelos', join(dir, 'modelos'), '--ignorar', 'README.md', 'modelos'], { escrever }), 1);
  assert.match(linhas.at(-1), /falta a seção "## Resposta" do modelo de analise/);
  writeFileSync(join(dir, 'rotina.md'), `# R\n${secoes()}`);
  assert.equal(rodar(['descritivos', '--executaveis', join(dir, 'rotina.md')], { escrever }), 1);
  assert.match(linhas.at(-1), /falta a tag <papel>/);
  assert.equal(rodar(['nada'], { escrever }), 2);
});

test('citações do cérebro: caminho com ou sem crase, pasta, pontuação no fim; nada em bloco de código', () => {
  const texto = '1. `../cerebro/marca/dna.md`: a marca.\n2. Pasta ../cerebro/comercial/voz-do-cliente/, e ../cerebro/marca/voz.md.\n```\n../cerebro/fora.md\n```\n';
  assert.deepEqual(citacoesDoCerebro(texto), ['marca/dna.md', 'comercial/voz-do-cliente/', 'marca/voz.md']);
});

test('linha de comando: descritivos com --cerebro acusam nota citada que não existe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'conferir-cerebro-'));
  mkdirSync(join(dir, 'cerebro', 'marca'), { recursive: true });
  writeFileSync(join(dir, 'cerebro', 'marca', 'dna.md'), '# DNA');
  writeFileSync(join(dir, 'agente.md'), `# A\n${secoes()}\nLeia \`../cerebro/marca/dna.md\` e \`../cerebro/marca/sumiu.md\`.\n`);
  const linhas = [];
  const escrever = (l) => linhas.push(l);
  assert.equal(rodar(['descritivos', join(dir, 'agente.md')], { escrever }), 0);
  assert.equal(rodar(['descritivos', join(dir, 'agente.md'), '--cerebro', join(dir, 'cerebro')], { escrever }), 1);
  assert.match(linhas.at(-1), /cita \.\.\/cerebro\/marca\/sumiu\.md, que não existe/);
  assert.doesNotMatch(linhas.at(-1), /dna/);
});

test('linha de comando: chamada por atalho (symlink) confere de verdade', () => {
  const dir = mkdtempSync(join(tmpdir(), 'conferir-atalho-'));
  symlinkSync(fileURLToPath(new URL('../ferramentas', import.meta.url)), join(dir, 'ferramentas'));
  const r = spawnSync(process.execPath, [join(dir, 'ferramentas', 'conferir.mjs'), 'nada'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /uso:/);
});

// ADR 0017 do cérebro: a organização do EIP do CPQD.
const FAC17 = { ...FAC, acesso: ['publico', 'equipe'], fonte: ['decisao', 'dado', 'documento', 'mercado', 'concorrente'] };
const ok17 = `${ok}\nacesso: equipe\nfontes:\n  - 'F1 | decisao | 2026-11-18 | Emerson, 18/11/2026: "todas as 10"'`;
const problemas17 = (notas, opcoes) => conferirNotas(notas, FAC17, opcoes).map((p) => `${p.arquivo}: ${p.problema}`);

test('C7 e C1: acesso vira faceta; fontes com tipo, data e link; citação existe', () => {
  assert.deepEqual(problemas17([nota('a.md', ok17, ida('b')), nota('b.md', ok17, ida('a'))]), []);
  const semAcesso = ok17.replace('acesso: equipe\n', '');
  assert.deepEqual(problemas17([nota('a.md', semAcesso, ida('b')), nota('b.md', ok17, ida('a'))]), ['a.md: faceta "acesso" vazia']);
  const ruim = `${ok}\nacesso: equipe\nfonte: 'antiga'\nfontes:\n  - 'F1 | dado | 2026-13-01 | Planejador'\n  - 'X | blog | 2026-11-01 |  | '`;
  assert.deepEqual(problemas17([nota('a.md', ruim, `${ida('b')} O volume [F3] cresceu.`), nota('b.md', ok17, ida('a'))]), [
    'a.md: cabeçalho "fonte:" saiu: use a lista "fontes:"',
    'a.md: fonte F1: data "2026-13-01" não é AAAA-MM-DD',
    'a.md: fonte F1: sem link com localizador (só a do tipo decisao dispensa)',
    'a.md: fonte "X | blog | 2026-11-01 |  | " sem id F<n> no começo',
    'a.md: fonte X: tipo "blog" fora da lista (decisao, dado, documento, mercado, concorrente)',
    'a.md: fonte X: sem título',
    'a.md: fonte X: sem link com localizador (só a do tipo decisao dispensa)',
    'a.md: cita [F3], que não está em "fontes:"',
    'a.md: fonte F1 não é citada no texto',
  ]);
  const dado = `${ok17}\n  - 'F2 | dado | 2026-10-15 | Planejador de palavras-chave | https://ads.google.com (aba Ideias, linha 4)'`;
  assert.deepEqual(problemas17([nota('a.md', dado, `${ida('b')} O volume [F2] é medido.`), nota('b.md', ok17, ida('a'))]), []);
  assert.deepEqual(lerFonte('F2 | dado | 2026-10-15 | T | https://x.com/a?b=1 | p. 3', FAC17.fonte).link, 'https://x.com/a?b=1 | p. 3');
});

test('C2: número em análise, oferta e modelo de negócio diz a natureza; na tabela basta o cabeçalho', () => {
  const t = 'Cresceu 26% no mês.\n\nO CPC medido foi R$ 14,90.\n\n| Termo | CPC (R$) |\n| --- | --- |\n| crm | R$ 12 |\n\n| Termo | CPC medido (R$) |\n| --- | --- |\n| crm | R$ 12 |\n\n- Meta esperada de 30% em 3 meses.';
  assert.deepEqual(numerosSemNatureza(t), ['| crm | R$ 12 |', 'Cresceu 26% no mês.']);
  const metodo = 'tipo: metodo\narea: seo\nestado: validado\norigem: interna';
  const fac = { ...FAC, tipo: [...FAC.tipo, 'metodo'] };
  assert.deepEqual(conferirNotas([nota('a.md', metodo, `${ida('b')} Cresceu 26%.`), nota('b.md', ok, `${ida('a')} Caiu 3% no mês.`)], fac).map((p) => p.arquivo), ['b.md']);
});

test('C4: substitui e substituida_por nos dois sentidos, a antiga arquivada', () => {
  const nova = `${ok}\nsubstitui: velha`;
  const velha = 'tipo: analise\narea: seo\nestado: arquivado\norigem: interna\nsubstituida_por: nova';
  const facA = { ...FAC, estado: [...FAC.estado, 'arquivado'] };
  assert.deepEqual(conferirNotas([nota('nova.md', nova, ida('velha')), nota('velha.md', velha, ida('nova'))], facA), []);
  const velhaViva = velha.replace('arquivado', 'validado').replace('\nsubstituida_por: nova', '');
  assert.deepEqual(conferirNotas([nota('nova.md', nova, ida('velha')), nota('velha.md', velhaViva, ida('nova'))], facA).map((p) => p.problema), [
    'substitui "velha", mas ela não diz "substituida_por: nova"',
    'substitui "velha", que não está arquivada',
  ]);
  assert.match(conferirNotas([nota('a.md', `${ok}\nsubstitui: sumiu`, ida('b')), nota('b.md', ok, ida('a'))], FAC)[0].problema, /substitui "sumiu", que não existe/);
});

test('C6: dado sensível, domínio permitido, valor de cliente anônimo e lista de clientes', () => {
  const t = 'Fale com joao@cliente.com.br ou (11) 91234-5678; CPF 123.456.789-09, CNPJ 12.345.678/0001-90, CEP 13083-970. Time: contato@marchdigital.com.br. Id 2436688770.';
  assert.deepEqual(dadoSensivel(t, { emailsPermitidos: ['marchdigital.com.br'] }), [
    'dado sensível (e-mail): "joao@cliente.com.br"',
    'dado sensível (telefone): "(11) 91234-5678"',
    'dado sensível (CPF): "123.456.789-09"',
    'dado sensível (CNPJ): "12.345.678/0001-90"',
    'dado sensível (CEP): "13083-970"',
  ]);
  assert.deepEqual(dadoSensivel('---\norigem: x\n---\nA Black Grill faturou R$ 10 mil.', { origem: ['cliente-anonimo'], clientes: ['Black Grill', 'Gri'] }), [
    'valor em reais em nota de cliente anônimo',
    'nome de cliente: "Black Grill"',
  ]);
  assert.deepEqual(dadoSensivel('O grill da praça.', { clientes: ['Grill'] }), ['nome de cliente: "Grill"']);
  assert.deepEqual(dadoSensivel('Os grills da praça.', { clientes: ['Grill'] }), []);
});

test('C10: comentário ou texto do modelo que sobrou na nota', () => {
  const modelo = '---\ntipo: analise\n---\n# T\n\n## Resposta\n\n<!--\nA conclusão em até três frases, com o número que a sustenta.\n-->\n';
  assert.deepEqual(textoDoModelo(modelo), ['A conclusão em até três frases, com o número que a sustenta.']);
  const textosModelo = { analise: textoDoModelo(modelo) };
  const sobrou = `${ida('b')}\n\nA conclusão em até três frases, com o número que a sustenta.\n\n<!-- falta -->`;
  assert.deepEqual(conferirNotas([nota('a.md', ok, sobrou), nota('b.md', ok, ida('a'))], FAC, { textosModelo }).map((p) => p.problema), [
    'comentário de modelo (<!-- -->) sobrou na nota',
    'texto do modelo sobrou: "A conclusão em até três frases, com o número que a sustenta."',
  ]);
  assert.deepEqual(conferirNotas([nota('a.md', ok, `${ida('b')} A instrução fica em \`<!-- -->\` e sai.`), nota('b.md', ok, ida('a'))], FAC, { textosModelo }), []);
});

test('C11: histórico em nota viva; análise e arquivada podem guardar o que valia na data', () => {
  const viva = `${ida('b')}\n\n## 11. Decisões e o que mudou\n\nA regra velha fica como histórico.\n\n### Histórico\n`;
  assert.deepEqual(historicoNaNota(viva), [
    'seção de histórico na nota viva: "11. Decisões e o que mudou" (o que mudou fica no Git)',
    'seção de histórico na nota viva: "Histórico" (o que mudou fica no Git)',
    'frase de histórico na nota viva: "A regra velha fica como histórico."',
  ]);
  assert.deepEqual(historicoNaNota('## Decisão\n\n## Dados reais da conta\n\n```\n## Histórico\n```'), []);
  const oferta = ok.replace('tipo: analise', 'tipo: oferta');
  const fac = { ...FAC, estado: [...FAC.estado, 'arquivado'] };
  assert.equal(conferirNotas([nota('a.md', oferta, viva), nota('b.md', ok, ida('a'))], fac).length, 3);
  assert.deepEqual(conferirNotas([nota('a.md', ok, viva), nota('b.md', ok, ida('a'))], fac), []);
  assert.deepEqual(conferirNotas([nota('a.md', oferta.replace('validado', 'arquivado'), viva), nota('b.md', ok, ida('a'))], fac), []);
});

test('C5: perguntas de conferência, versão, contrato, fato e proibido; agente com executor falso', () => {
  const notas = [nota('comercial/oferta.md', ok, 'O Diagnóstico custa **R$ 2.500**, à vista.'), nota('velha.md', 'estado: arquivado', 'custa R$ 1.900')];
  const conf = { versao: 1, perguntas: [{ id: 'P01', pergunta: 'Quanto custa?', nota: 'comercial/oferta.md', fatos: ['R$ 2.500'], proibidos: ['R$ 1.900'] }] };
  assert.deepEqual(conferirPerguntas(conf, notas), []);
  assert.deepEqual(conferirPerguntas({ versao: 2, perguntas: [] }, notas), ['conferencia.json: versão 2 não é a 1 que esta conferência lê']);
  const ruim = { versao: 1, perguntas: [
    { id: 'P01', pergunta: 'Q', nota: 'comercial/oferta.md', fatos: ['R$ 3.000'], proibidos: ['à vista'], extra: 1 },
    { id: 'P01', pergunta: 'Q', nota: 'sumiu.md', fatos: ['x'] },
  ] };
  assert.deepEqual(conferirPerguntas(ruim, notas), [
    'P01: campo que o contrato não conhece: extra',
    'P01: comercial/oferta.md não diz "R$ 3.000"',
    'P01: comercial/oferta.md diz o proibido "à vista"',
    'P01: id repetido',
    'P01: a nota sumiu.md não existe',
  ]);
  const executar = () => ({ status: 0, stdout: 'Custa R$ 2.500 (comercial/oferta.md).' });
  assert.deepEqual(perguntarAoAgente(conf, '.', { executar }), []);
  assert.deepEqual(perguntarAoAgente(conf, '.', { executar: () => ({ status: 0, stdout: 'Custa R$ 1.900.' }) }), ['P01: a resposta não traz "R$ 2.500"', 'P01: a resposta traz o proibido "R$ 1.900"']);
});

test('linha de comando: perguntas e lista de clientes fora do Git', () => {
  const dir = mkdtempSync(join(tmpdir(), 'conferir-17-'));
  writeFileSync(join(dir, 'a.md'), nota('a.md', ok, `${ida('b')} O Diagnóstico custa R$ 2.500 esperado.`).texto);
  writeFileSync(join(dir, 'b.md'), nota('b.md', ok, `${ida('a')} Atendemos a Padaria Sol.`).texto);
  writeFileSync(join(dir, 'facetas.json'), JSON.stringify(FAC));
  writeFileSync(join(dir, 'conferencia.json'), JSON.stringify({ versao: 1, perguntas: [{ id: 'P01', pergunta: 'Quanto?', nota: 'a.md', fatos: ['R$ 2.500'] }] }));
  writeFileSync(join(dir, 'clientes.txt'), '# um por linha\nPadaria Sol\n');
  const linhas = [];
  const escrever = (l) => linhas.push(l);
  assert.equal(rodar(['perguntas', join(dir, 'conferencia.json'), '--cerebro', dir], { escrever }), 0);
  assert.match(linhas.at(-1), /ok: 1 perguntas/);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json'), '--ignorar', 'clientes.txt', '--clientes', join(dir, 'sem-arquivo.txt')], { escrever }), 0);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json'), '--clientes', join(dir, 'clientes.txt')], { escrever }), 1);
  assert.match(linhas.at(-1), /b\.md: nome de cliente: "Padaria Sol"/);
  assert.equal(rodar(['perguntas'], { escrever }), 2);
});
