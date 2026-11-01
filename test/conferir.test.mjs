import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { conferirDescritivo, conferirNotas, lerCabecalho, ligacoes, rodar, SECOES, TAGS } from '../ferramentas/conferir.mjs';

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

test('notas: facetas e ligação de ida ou de volta', () => {
  const notas = [nota('a.md', ok, 'Ver [[b]].'), nota('b.md', ok), nota('c.md', ok, 'Ver [[inexistente]].')];
  assert.deepEqual(conferirNotas(notas, FAC), [{ arquivo: 'c.md', problema: 'nota solta: nenhuma ligação de ida nem de volta' }]);
  const ruins = [nota('d.md', 'tipo: analise\narea: marketing\nestado: validado\norigem: ', 'Ver [[d]].'), { caminho: 'e.md', texto: '# sem cabeçalho [[d]]' }];
  assert.deepEqual(conferirNotas(ruins, FAC).map((p) => p.problema),
    ['"area: marketing" fora da lista', 'faceta "origem" vazia', 'sem cabeçalho YAML']); // d recebe a ligação de e
  // Ligação só para si mesma não conta.
  assert.equal(conferirNotas([nota('f.md', ok, '[[f]]')], FAC)[0].problema, 'nota solta: nenhuma ligação de ida nem de volta');
});

test('linha de comando: notas com --ignorar e descritivos com --executaveis', () => {
  const dir = mkdtempSync(join(tmpdir(), 'conferir-'));
  mkdirSync(join(dir, 'modelos'));
  writeFileSync(join(dir, 'a.md'), nota('a.md', ok, '[[b]]').texto);
  writeFileSync(join(dir, 'b.md'), nota('b.md', ok).texto);
  writeFileSync(join(dir, 'README.md'), '# Sem cabeçalho');
  writeFileSync(join(dir, 'modelos', 'nota.md'), '# modelo');
  writeFileSync(join(dir, 'facetas.json'), JSON.stringify(FAC));
  const linhas = [];
  const escrever = (l) => linhas.push(l);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json'), '--ignorar', 'README.md', 'modelos'], { escrever }), 0);
  assert.equal(rodar(['notas', dir, '--facetas', join(dir, 'facetas.json')], { escrever }), 1);
  writeFileSync(join(dir, 'rotina.md'), `# R\n${secoes()}`);
  assert.equal(rodar(['descritivos', '--executaveis', join(dir, 'rotina.md')], { escrever }), 1);
  assert.match(linhas.at(-1), /falta a tag <papel>/);
  assert.equal(rodar(['nada'], { escrever }), 2);
});
