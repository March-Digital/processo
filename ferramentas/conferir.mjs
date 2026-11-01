#!/usr/bin/env node
// Conferência dos descritivos e das notas da March (AJ-01 do Plano do motor; modelo em
// modelos/descritivo.md). Sem dependência: só Node 20 ou mais novo.
//
//   node conferir.mjs descritivos <arquivo ou pasta>... [--executaveis <arquivo ou pasta>...]
//   node conferir.mjs notas <pasta> --facetas <facetas.json> [--ignorar <caminho>...]
//
// Sai com 0 quando está tudo certo e com 1 quando acha problema, com uma linha por problema.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SECOES = ['Papel', 'Objetivo', 'Quando usar', 'Fontes', 'Passos', 'Saída', 'Limites'];
export const TAGS = ['papel', 'objetivo', 'quando_usar', 'fontes', 'passos', 'saida', 'limites'];
export const FACETAS = ['tipo', 'area', 'estado', 'origem'];

/** Arquivos .md de cada caminho: o próprio arquivo ou tudo dentro da pasta, menos .git e node_modules. */
export function arquivosMd(caminhos) {
  const saida = [];
  const andar = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const nome of readdirSync(p).sort()) {
        if (nome === '.git' || nome === 'node_modules' || nome === '.obsidian') continue;
        andar(join(p, nome));
      }
    } else if (p.endsWith('.md')) saida.push(p);
  };
  for (const c of caminhos) andar(c);
  return saida;
}

/** Tira o cabeçalho YAML e os blocos de código, para não contar título que está dentro de exemplo. */
function corpo(texto) {
  return texto.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '').replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Confere um descritivo: as sete seções `## ` na ordem e, se executável, as sete tags abertas e
 * fechadas, na ordem.
 * @returns {string[]} problemas
 */
export function conferirDescritivo(texto, { executavel = false } = {}) {
  const c = corpo(texto);
  const titulos = [...c.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  const problemas = [];
  const achadas = SECOES.filter((s) => titulos.includes(s));
  for (const s of SECOES) if (!titulos.includes(s)) problemas.push(`falta a seção "## ${s}"`);
  const ordem = titulos.filter((t) => SECOES.includes(t));
  if (problemas.length === 0 && ordem.join('|') !== SECOES.join('|')) problemas.push(`seções fora de ordem: ${ordem.join(', ')}`);
  if (achadas.length && executavel) {
    let ultimo = -1;
    for (const t of TAGS) {
      const abre = c.indexOf(`<${t}>`);
      const fecha = c.indexOf(`</${t}>`);
      if (abre < 0 || fecha < 0 || fecha < abre) { problemas.push(`falta a tag <${t}>...</${t}>`); continue; }
      if (abre < ultimo) problemas.push(`tag <${t}> fora de ordem`);
      ultimo = abre;
    }
  }
  return problemas;
}

/** Cabeçalho YAML simples: `chave: valor`, `chave: [a, b]` ou lista com `- item`. */
export function lerCabecalho(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const dados = {};
  let lista = null;
  for (const linha of m[1].split('\n')) {
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && lista) { dados[lista].push(limpar(item[1])); continue; }
    const par = linha.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!par) continue;
    const [, chave, bruto] = par;
    const valor = bruto.replace(/\s+#.*$/, '').trim();
    if (valor === '') { dados[chave] = []; lista = chave; continue; }
    lista = null;
    dados[chave] = valor.startsWith('[') ? valor.slice(1, -1).split(',').map(limpar).filter(Boolean) : limpar(valor);
  }
  return dados;
}
const limpar = (v) => v.trim().replace(/^['"]|['"]$/g, '');

/** Ligações `[[nome]]`, `[[nome|texto]]` e `[[nome#trecho]]`, pelo nome do arquivo sem .md. */
export function ligacoes(texto) {
  return [...corpo(texto).matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

/**
 * Confere as notas de uma pasta: as quatro facetas preenchidas com valores da lista e pelo menos uma
 * ligação de ida ou de volta para outra nota que existe.
 * @param {{ caminho: string, texto: string }[]} notas
 * @param {Record<string, string[]>} facetas valores aceitos de cada faceta
 * @returns {{ arquivo: string, problema: string }[]}
 */
export function conferirNotas(notas, facetas) {
  const nomes = new Map(notas.map((n) => [basename(n.caminho, '.md'), n.caminho]));
  const chegam = new Map(notas.map((n) => [n.caminho, 0]));
  const saem = new Map();
  for (const n of notas) {
    const destinos = [...new Set(ligacoes(n.texto))].filter((d) => nomes.has(d) && nomes.get(d) !== n.caminho);
    saem.set(n.caminho, destinos.length);
    for (const d of destinos) chegam.set(nomes.get(d), chegam.get(nomes.get(d)) + 1);
  }
  const problemas = [];
  for (const n of notas) {
    const cab = lerCabecalho(n.texto);
    if (!cab) { problemas.push({ arquivo: n.caminho, problema: 'sem cabeçalho YAML' }); continue; }
    for (const f of FACETAS) {
      const v = cab[f];
      const valores = Array.isArray(v) ? v : v ? [v] : [];
      if (!valores.length) { problemas.push({ arquivo: n.caminho, problema: `faceta "${f}" vazia` }); continue; }
      const aceitos = facetas[f] ?? [];
      for (const x of valores) if (!aceitos.includes(x)) problemas.push({ arquivo: n.caminho, problema: `"${f}: ${x}" fora da lista` });
    }
    if (!saem.get(n.caminho) && !chegam.get(n.caminho)) problemas.push({ arquivo: n.caminho, problema: 'nota solta: nenhuma ligação de ida nem de volta' });
  }
  return problemas;
}

function argumentos(lista) {
  const grupos = { _: [] };
  let atual = '_';
  for (const a of lista) {
    if (a.startsWith('--')) { atual = a.slice(2); grupos[atual] ??= []; } else grupos[atual].push(a);
  }
  return grupos;
}

export function rodar(argv, { escrever = (l) => process.stdout.write(`${l}\n`) } = {}) {
  const [modo, ...resto] = argv;
  const g = argumentos(resto);
  const problemas = [];
  if (modo === 'descritivos') {
    const executaveis = new Set(arquivosMd(g.executaveis ?? []).map((p) => resolve(p)));
    const todos = [...new Set([...arquivosMd(g._), ...executaveis].map((p) => resolve(p)))];
    for (const p of todos) {
      for (const x of conferirDescritivo(readFileSync(p, 'utf8'), { executavel: executaveis.has(p) })) {
        problemas.push(`${relative(process.cwd(), p)}: ${x}`);
      }
    }
    escrever(problemas.length ? problemas.join('\n') : `ok: ${todos.length} descritivos nas sete seções`);
  } else if (modo === 'notas') {
    const [pasta] = g._;
    const arqFacetas = g.facetas?.[0];
    if (!pasta || !arqFacetas || !existsSync(arqFacetas)) {
      escrever('uso: conferir.mjs notas <pasta> --facetas <facetas.json> [--ignorar <caminho>...]');
      return 2;
    }
    const ignorar = (g.ignorar ?? []).map((p) => resolve(pasta, p));
    const notas = arquivosMd([pasta])
      .filter((p) => !ignorar.some((i) => resolve(p) === i || resolve(p).startsWith(`${i}/`)))
      .map((p) => ({ caminho: relative(pasta, p), texto: readFileSync(p, 'utf8') }));
    for (const x of conferirNotas(notas, JSON.parse(readFileSync(arqFacetas, 'utf8')))) problemas.push(`${x.arquivo}: ${x.problema}`);
    escrever(problemas.length ? problemas.join('\n') : `ok: ${notas.length} notas com as quatro facetas e ligadas`);
  } else {
    escrever('uso: conferir.mjs descritivos|notas ...');
    return 2;
  }
  return problemas.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = rodar(process.argv.slice(2));
}
