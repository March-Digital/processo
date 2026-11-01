import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { conferirDescritivo, conferirNotas, lerCabecalho, ligacoes, ligacoesNoTexto, temTravessao, rodar, SECOES, TAGS } from '../ferramentas/conferir.mjs';

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
