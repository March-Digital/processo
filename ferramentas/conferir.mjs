#!/usr/bin/env node
// Conferência dos descritivos e das notas da March (AJ-01 do Plano do motor; modelo em
// modelos/descritivo.md). Sem dependência: só Node 20 ou mais novo.
//
//   node conferir.mjs descritivos <arquivo ou pasta>... [--executaveis <arquivo ou pasta>...] [--cerebro <pasta>]
//   node conferir.mjs notas <pasta> --facetas <facetas.json> [--modelos <pasta>] [--ignorar <caminho>...]
//        [--clientes <arquivo>] [--emails-permitidos <domínio>...]
//   node conferir.mjs perguntas <conferencia.json> --cerebro <pasta> [--ignorar <caminho>...] [--agente]
//
// Fontes, natureza do número, divergência, substituição, perguntas de conferência, dado sensível,
// acesso e texto de modelo que sobrou vêm do ADR 0017 do cérebro (a organização do EIP do CPQD).
//
// Sai com 0 quando está tudo certo e com 1 quando acha problema, com uma linha por problema.
import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

/**
 * Notas do cérebro que um descritivo cita pelo caminho `../cerebro/<caminho>`, fora de bloco de
 * código. ADR 0005 do `cerebro` (AJ-06): o agente cita em "Fontes" as notas que lê, e a conferência
 * acusa a que não existe.
 */
export function citacoesDoCerebro(texto) {
  return [...new Set([...corpo(texto).matchAll(/\.\.\/cerebro\/([^\s`'"()<>\[\]]+)/g)].map((m) => m[1].replace(/[.,;:!?]+$/, '')))];
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

const LIGACAO = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

/**
 * Parágrafos, itens de lista, linhas de tabela e títulos, cada um numa linha só. Um parágrafo que
 * quebra em várias linhas conta como um.
 */
function unidades(c) {
  const saida = [];
  let atual = null;
  for (const linha of c.split('\n')) {
    if (/^\s*(>\s*)*$/.test(linha)) { atual = null; continue; }
    if (atual === null || /^\s*(>\s*)*([-*+]\s|\d+\.\s|\||#)/.test(linha)) { atual = [linha]; saida.push(atual); }
    else atual.push(linha.replace(/^\s*(>\s*)*/, ''));
  }
  return saida.map((u) => u.join(' '));
}

/**
 * Ligações que estão dentro do texto, numa frase que diz o porquê. Trecho que é só ligação (como
 * "Ligada a: [[a]], [[b]].") não conta: tirando as ligações, sobram menos de três palavras. A
 * cláusula "Ligada a: ..." nunca conta. Emerson, 01/11/2026 (AJ-01f): "Ligação no texto e nota de
 * grupo (Recomendado)".
 */
export function ligacoesNoTexto(texto) {
  const saida = [];
  for (const trecho of unidades(corpo(texto))) {
    const semClausula = trecho.replace(/\b(ligada|ligadas) a:\s*(\[\[[^\]]*\]\][,\s]*(e\s+)?)+\.?/gi, ' ');
    const achadas = [...semClausula.matchAll(LIGACAO)].map((m) => m[1].trim());
    if (!achadas.length) continue;
    const resto = semClausula.replace(LIGACAO, ' ').replace(/^[\s>*|-]*(\d+\.)?\s*(ver também|veja também|relacionadas?)?\s*:?/i, '');
    if (resto.split(/\s+/).filter((w) => /\p{L}{3,}/u.test(w)).length < 3) continue;
    saida.push(...achadas);
  }
  return saida;
}

/** Títulos `## ` de um modelo de nota, na ordem. Modelo sem `## ` não exige seção (falas da marca). */
export function secoesDoModelo(texto) {
  return [...corpo(texto).matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
}

/** Travessão fora de código, de citação entre aspas e de endereço. */
export function temTravessao(texto) {
  const limpo = corpo(texto).replace(/`[^`\n]*`/g, '').replace(/"[^"\n]*"/g, '').replace(/“[^”\n]*”/g, '').replace(/https?:\S+/g, '');
  return /[—–]/.test(limpo);
}

/**
 * Uma fonte do cabeçalho `fontes:` (C1 do ADR 0017 do cérebro):
 * `F<n> | <tipo> | <AAAA-MM-DD> | <título ou palavras de quem decidiu> | <link com localizador>`.
 * O link só é opcional na fonte do tipo `decisao`, que vive nas palavras.
 * @returns {{ id: string, tipo: string, data: string, titulo: string, link: string, problemas: string[] }}
 */
export function lerFonte(entrada, tipos) {
  const partes = entrada.split(' | ').map((p) => p.trim());
  const [id = '', tipo = '', data = '', titulo = '', ...resto] = partes;
  const link = resto.join(' | ');
  const problemas = [];
  if (!/^F\d+$/.test(id)) problemas.push(`fonte "${entrada.slice(0, 40)}" sem id F<n> no começo`);
  if (!tipos.includes(tipo)) problemas.push(`fonte ${id}: tipo "${tipo}" fora da lista (${tipos.join(', ')})`);
  const d = new Date(`${data}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== data) {
    problemas.push(`fonte ${id}: data "${data}" não é AAAA-MM-DD`);
  }
  if (!titulo) problemas.push(`fonte ${id}: sem título`);
  if (!link && tipo !== 'decisao') problemas.push(`fonte ${id}: sem link com localizador (só a do tipo decisao dispensa)`);
  return { id, tipo, data, titulo, link, problemas };
}

/** Citações `[F2]` no texto, fora de código e de comentário. */
export function citacoesDeFonte(texto) {
  return [...new Set([...corpo(texto).replace(/`[^`\n]*`/g, '').matchAll(/\[(F\d+)\]/g)].map((m) => m[1]))];
}

/** Tipos cujo número precisa dizer a natureza (C2 do ADR 0017 do cérebro). */
export const TIPOS_COM_NATUREZA = ['analise', 'oferta', 'modelo-de-negocio'];
const NUMERO = /\d\s?%|R\$\s?\d/;
const NATUREZA = /\b(n[ãa]o medid|medid|declarad|esperad|inferid)[oa]s?\b/i;

/**
 * Parágrafos, itens e linhas de tabela que têm porcentagem ou valor em reais e não dizem a natureza
 * do número: medido, declarado, esperado ou inferido. Na tabela, basta o cabeçalho dizer ("CPC
 * medido no Planejador (R$)").
 * @returns {string[]} trechos sem natureza
 */
export function numerosSemNatureza(texto) {
  const saida = [];
  let cabecalho = null;
  let anterior = '';
  const linhas = corpo(texto).split('\n');
  const paragrafos = [];
  for (const linha of linhas) {
    if (/^\s*\|/.test(linha)) {
      if (!/^\s*\|/.test(anterior)) cabecalho = linha;
      else if (!/^\s*\|[\s:|-]+\|\s*$/.test(linha) && NUMERO.test(linha) && !NATUREZA.test(linha) && !NATUREZA.test(cabecalho)) saida.push(linha.trim());
      anterior = linha;
      continue;
    }
    anterior = linha;
    cabecalho = null;
    paragrafos.push(/^#/.test(linha) ? '' : linha);
  }
  for (const u of unidades(paragrafos.join('\n'))) {
    if (NUMERO.test(u) && !NATUREZA.test(u)) saida.push(u.trim());
  }
  return saida;
}

const SENSIVEL = [
  ['e-mail', /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}/g],
  ['telefone', /(\+55\s?)?\(\d{2}\)\s?9?\d{4}-?\d{4}|\+55\s?\d{2}\s?9?\d{4}-?\d{4}|\b9\d{4}-\d{4}\b/g],
  ['CPF', /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g],
  ['CNPJ', /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g],
  ['CEP', /\b\d{5}-\d{3}\b/g],
];

/**
 * Dado sensível numa nota (C6 do ADR 0017 do cérebro): e-mail fora dos domínios permitidos,
 * telefone, CPF, CNPJ e CEP em qualquer nota; em nota de `origem: cliente-anonimo`, também valor em
 * reais; e nome da lista de clientes, que fica fora do Git.
 * @returns {string[]} problemas
 */
export function dadoSensivel(texto, { origem = [], clientes = [], emailsPermitidos = [] } = {}) {
  const limpo = texto.replace(/```[\s\S]*?```/g, '');
  const problemas = [];
  for (const [nome, re] of SENSIVEL) {
    for (const m of limpo.matchAll(re)) {
      if (nome === 'e-mail' && emailsPermitidos.some((d) => m[0].toLowerCase().endsWith(`@${d}`) || m[0].toLowerCase().endsWith(`.${d}`))) continue;
      problemas.push(`dado sensível (${nome}): "${m[0]}"`);
    }
  }
  if (origem.includes('cliente-anonimo') && /R\$\s?\d/.test(corpo(texto))) problemas.push('valor em reais em nota de cliente anônimo');
  const baixo = limpo.toLowerCase();
  for (const c of clientes) {
    const nome = c.trim().toLowerCase();
    if (nome.length < 3) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u');
    if (re.test(baixo)) problemas.push(`nome de cliente: "${c.trim()}"`);
  }
  return problemas;
}

/** Linhas de instrução de um modelo (dentro de comentário ou no corpo), para achar a que sobrou na nota. */
export function textoDoModelo(texto) {
  const semCab = texto.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/```[\s\S]*?```/g, '');
  const linhas = [];
  for (const bruto of semCab.split('\n')) {
    const l = bruto.replace(/<!--|-->/g, '').trim();
    if (l.length < 30 || /^#/.test(l) || /^\|[\s:|-]+\|$/.test(l)) continue;
    linhas.push(l);
  }
  return linhas;
}

/**
 * Confere as notas de uma pasta: as quatro facetas preenchidas com valores da lista; pelo menos uma
 * ligação de ida e uma de volta, dentro do texto, para outra nota que existe; com `modelos`, as seções
 * do modelo do tipo, na ordem; e nenhum travessão fora de citação e de código. Notas do tipo `marca`
 * (falas da marca) não têm seção nem travessão conferidos.
 *
 * Do ADR 0017 do cérebro, quando `facetas.json` traz a chave: `acesso` vira a quinta faceta; com
 * `fonte`, o cabeçalho `fontes:` (C1). Sempre: natureza do número (C2), `substitui` e
 * `substituida_por` (C4), dado sensível (C6), comentário ou texto de modelo que sobrou (C10) e
 * histórico em nota viva (C11).
 * @param {{ caminho: string, texto: string }[]} notas
 * @param {Record<string, string[]>} facetas valores aceitos de cada faceta
 * @param {{ modelos?: Record<string, string[]>, textosModelo?: Record<string, string[]>, clientes?: string[], emailsPermitidos?: string[] }} [opcoes]
 * @returns {{ arquivo: string, problema: string }[]}
 */
export function conferirNotas(notas, facetas, { modelos, textosModelo, clientes = [], emailsPermitidos = [] } = {}) {
  const exigidas = [...FACETAS, ...(facetas.acesso ? ['acesso'] : [])];
  const cabecalhos = new Map(notas.map((n) => [basename(n.caminho, '.md'), lerCabecalho(n.texto) ?? {}]));
  const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const nomes = new Map(notas.map((n) => [basename(n.caminho, '.md'), n.caminho]));
  const chegam = new Map(notas.map((n) => [n.caminho, 0]));
  const saem = new Map();
  for (const n of notas) {
    const destinos = [...new Set(ligacoesNoTexto(n.texto))].filter((d) => nomes.has(d) && nomes.get(d) !== n.caminho);
    saem.set(n.caminho, destinos.length);
    for (const d of destinos) chegam.set(nomes.get(d), chegam.get(nomes.get(d)) + 1);
  }
  const problemas = [];
  for (const n of notas) {
    const cab = lerCabecalho(n.texto);
    if (!cab) { problemas.push({ arquivo: n.caminho, problema: 'sem cabeçalho YAML' }); continue; }
    for (const f of exigidas) {
      const valores = lista(cab[f]);
      if (!valores.length) { problemas.push({ arquivo: n.caminho, problema: `faceta "${f}" vazia` }); continue; }
      const aceitos = facetas[f] ?? [];
      for (const x of valores) if (!aceitos.includes(x)) problemas.push({ arquivo: n.caminho, problema: `"${f}: ${x}" fora da lista` });
    }
    if (!saem.get(n.caminho)) problemas.push({ arquivo: n.caminho, problema: 'sem ligação no texto para outra nota' });
    if (!chegam.get(n.caminho)) problemas.push({ arquivo: n.caminho, problema: 'nenhuma nota liga para esta no texto' });
    if (modelos && cab.tipo !== 'marca') {
      const exigidas = modelos[cab.tipo];
      if (!exigidas) problemas.push({ arquivo: n.caminho, problema: `sem modelo para o tipo "${cab.tipo}"` });
      else {
        const titulos = [...corpo(n.texto).matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
        const faltam = exigidas.filter((s) => !titulos.includes(s));
        for (const s of faltam) problemas.push({ arquivo: n.caminho, problema: `falta a seção "## ${s}" do modelo de ${cab.tipo}` });
        const ordem = titulos.filter((x) => exigidas.includes(x));
        if (!faltam.length && ordem.join('|') !== exigidas.join('|')) problemas.push({ arquivo: n.caminho, problema: `seções fora da ordem do modelo de ${cab.tipo}` });
      }
      if (temTravessao(n.texto)) problemas.push({ arquivo: n.caminho, problema: 'travessão no texto' });
    }
    const p = (problema) => problemas.push({ arquivo: n.caminho, problema });
    // C1: fontes com tipo, data e localizador; toda citação [Fn] existe; fonte que não é decisão é citada.
    if (facetas.fonte) {
      if (cab.fonte !== undefined) p('cabeçalho "fonte:" saiu: use a lista "fontes:"');
      const fontes = lista(cab.fontes);
      if (!fontes.length) p('sem fontes no cabeçalho');
      const lidas = fontes.map((f) => lerFonte(f, facetas.fonte));
      const ids = new Set();
      for (const f of lidas) {
        for (const x of f.problemas) p(x);
        if (ids.has(f.id)) p(`fonte ${f.id} repetida`);
        ids.add(f.id);
      }
      const citadas = citacoesDeFonte(n.texto);
      for (const c of citadas) if (!ids.has(c)) p(`cita [${c}], que não está em "fontes:"`);
      for (const f of lidas) if (f.tipo !== 'decisao' && /^F\d+$/.test(f.id) && !citadas.includes(f.id)) p(`fonte ${f.id} não é citada no texto`);
    }
    // C2: número com natureza.
    if (TIPOS_COM_NATUREZA.includes(cab.tipo)) {
      for (const t of numerosSemNatureza(n.texto)) p(`número sem natureza (medido, declarado, esperado ou inferido): "${t.slice(0, 70)}"`);
    }
    // C4: substituição nos dois sentidos.
    const nome = basename(n.caminho, '.md');
    for (const alvo of lista(cab.substitui)) {
      const outro = cabecalhos.get(alvo);
      if (!outro) { p(`substitui "${alvo}", que não existe`); continue; }
      if (!lista(outro.substituida_por).includes(nome)) p(`substitui "${alvo}", mas ela não diz "substituida_por: ${nome}"`);
      if (outro.estado !== 'arquivado') p(`substitui "${alvo}", que não está arquivada`);
    }
    for (const alvo of lista(cab.substituida_por)) {
      if (!cabecalhos.has(alvo)) p(`substituida_por "${alvo}", que não existe`);
      else if (!lista(cabecalhos.get(alvo).substitui).includes(nome)) p(`substituida_por "${alvo}", mas ela não diz "substitui: ${nome}"`);
      if (cab.estado !== 'arquivado') p('tem substituida_por e não está arquivada');
    }
    // C6: dado sensível.
    for (const x of dadoSensivel(n.texto, { origem: lista(cab.origem), clientes, emailsPermitidos })) p(x);
    // C10: comentário ou texto do modelo que sobrou.
    if (/<!--/.test(n.texto.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, ''))) p('comentário de modelo (<!-- -->) sobrou na nota');
    for (const l of textosModelo?.[cab.tipo] ?? []) if (n.texto.includes(l)) p(`texto do modelo sobrou: "${l.slice(0, 60)}"`);
    // C11: a nota viva diz só o que vale hoje; o que mudou fica no Git (cérebro, 19/11/2026).
    if (cab.estado !== 'arquivado' && !TIPOS_RETRATO.includes(cab.tipo)) for (const x of historicoNaNota(n.texto)) p(x);
  }
  return problemas;
}

/** Tipos que são retrato de uma data (a análise, a ideia, a decisão daquele dia) e podem guardar o que valia nela (C11). */
export const TIPOS_RETRATO = ['analise', 'brainstorm', 'decisao', 'ideia'];

/**
 * Histórico dentro de nota viva (C11): título de seção de decisões ou de histórico, ou frase que deixa
 * a regra velha "como histórico". Fora de código.
 * @param {string} texto
 * @returns {string[]} problemas
 */
export function historicoNaNota(texto) {
  const t = corpo(texto).replace(/```[\s\S]*?```/g, '');
  const achados = [];
  for (const m of t.matchAll(/^#{2,6}\s+(.+?)\s*$/gm)) {
    if (/^(\d+\.\s*)?(hist[óo]rico|decis(õ|o)es)\b/i.test(m[1]) || /o que mudou/i.test(m[1])) achados.push(`seção de histórico na nota viva: "${m[1].slice(0, 60)}" (o que mudou fica no Git)`);
  }
  for (const m of t.matchAll(/[^\n]{0,40}\bficam? como hist[óo]rico[^\n]{0,20}/gi)) achados.push(`frase de histórico na nota viva: "${m[0].trim().slice(0, 70)}"`);
  return achados;
}

const normal = (t) => t.toLowerCase().replace(/[*_`]/g, '').replace(/\s+/g, ' ');

/**
 * Perguntas de conferência (C5 do ADR 0017 do cérebro): para cada pergunta, a nota que responde
 * existe, os fatos estão nela e as afirmações proibidas não estão em nenhuma nota viva. Compara sem
 * caixa, sem negrito e com espaços normalizados.
 * @param {{ versao: number, perguntas: { id: string, pergunta: string, nota: string, fatos: string[], proibidos?: string[] }[] }} conf
 * @param {{ caminho: string, texto: string }[]} notas
 * @returns {string[]} problemas
 */
export function conferirPerguntas(conf, notas) {
  if (conf?.versao !== 1) return [`conferencia.json: versão ${conf?.versao} não é a 1 que esta conferência lê`];
  const problemas = [];
  const porCaminho = new Map(notas.map((n) => [n.caminho, n]));
  const vivas = notas.filter((n) => lerCabecalho(n.texto)?.estado !== 'arquivado');
  const ids = new Set();
  for (const q of conf.perguntas ?? []) {
    const rot = q.id ?? '?';
    if (ids.has(rot)) problemas.push(`${rot}: id repetido`);
    ids.add(rot);
    const desconhecidos = Object.keys(q).filter((k) => !['id', 'pergunta', 'nota', 'fatos', 'proibidos'].includes(k));
    if (desconhecidos.length) problemas.push(`${rot}: campo que o contrato não conhece: ${desconhecidos.join(', ')}`);
    if (!q.pergunta || !q.nota || !Array.isArray(q.fatos) || !q.fatos.length) { problemas.push(`${rot}: precisa de pergunta, nota e pelo menos um fato`); continue; }
    const nota = porCaminho.get(q.nota);
    if (!nota) { problemas.push(`${rot}: a nota ${q.nota} não existe`); continue; }
    const texto = normal(nota.texto);
    for (const f of q.fatos) if (!texto.includes(normal(f))) problemas.push(`${rot}: ${q.nota} não diz "${f}"`);
    for (const x of q.proibidos ?? []) {
      for (const n of vivas) if (normal(n.texto).includes(normal(x))) problemas.push(`${rot}: ${n.caminho} diz o proibido "${x}"`);
    }
  }
  return problemas;
}

/**
 * Pergunta ao agente (marcador `externo`: chama o Claude Code e gasta tokens; fora do `npm test`).
 * A resposta precisa trazer os fatos e não trazer os proibidos.
 */
export function perguntarAoAgente(conf, pasta, { executar = (args, cwd) => spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 300000 }) } = {}) {
  const problemas = [];
  for (const q of conf.perguntas ?? []) {
    const r = executar(['-p', `Responda pelas notas deste repositório, em até 5 frases, citando a nota: ${q.pergunta}`], pasta);
    if (r.status !== 0) { problemas.push(`${q.id}: o agente falhou (${(r.stderr ?? '').trim().slice(0, 80)})`); continue; }
    const resposta = normal(r.stdout ?? '');
    for (const f of q.fatos) if (!resposta.includes(normal(f))) problemas.push(`${q.id}: a resposta não traz "${f}"`);
    for (const x of q.proibidos ?? []) if (resposta.includes(normal(x))) problemas.push(`${q.id}: a resposta traz o proibido "${x}"`);
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
    const cerebro = g.cerebro?.[0];
    for (const p of todos) {
      const texto = readFileSync(p, 'utf8');
      for (const x of conferirDescritivo(texto, { executavel: executaveis.has(p) })) {
        problemas.push(`${relative(process.cwd(), p)}: ${x}`);
      }
      if (cerebro) {
        for (const c of citacoesDoCerebro(texto)) {
          if (!existsSync(join(cerebro, c))) problemas.push(`${relative(process.cwd(), p)}: cita ../cerebro/${c}, que não existe`);
        }
      }
    }
    escrever(problemas.length ? problemas.join('\n') : `ok: ${todos.length} descritivos nas sete seções`);
  } else if (modo === 'notas') {
    const [pasta] = g._;
    const arqFacetas = g.facetas?.[0];
    if (!pasta || !arqFacetas || !existsSync(arqFacetas)) {
      escrever('uso: conferir.mjs notas <pasta> --facetas <facetas.json> [--modelos <pasta>] [--ignorar <caminho>...]');
      return 2;
    }
    const ignorar = (g.ignorar ?? []).map((p) => resolve(pasta, p));
    const notas = arquivosMd([pasta])
      .filter((p) => !ignorar.some((i) => resolve(p) === i || resolve(p).startsWith(`${i}/`)))
      .map((p) => ({ caminho: relative(pasta, p), texto: readFileSync(p, 'utf8') }));
    const pastaModelos = g.modelos?.[0];
    let modelos;
    let textosModelo;
    if (pastaModelos) {
      modelos = {};
      textosModelo = {};
      for (const nome of readdirSync(pastaModelos).filter((x) => x.endsWith('.md'))) {
        const texto = readFileSync(join(pastaModelos, nome), 'utf8');
        modelos[basename(nome, '.md')] = secoesDoModelo(texto);
        textosModelo[basename(nome, '.md')] = textoDoModelo(texto);
      }
    }
    // A lista de clientes fica fora do Git; sem o arquivo, a conferência de nome não roda.
    const arqClientes = g.clientes?.[0];
    const clientes = arqClientes && existsSync(arqClientes) ? readFileSync(arqClientes, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')) : [];
    const opcoes = { modelos, textosModelo, clientes, emailsPermitidos: g['emails-permitidos'] ?? [] };
    for (const x of conferirNotas(notas, JSON.parse(readFileSync(arqFacetas, 'utf8')), opcoes)) problemas.push(`${x.arquivo}: ${x.problema}`);
    escrever(problemas.length ? problemas.join('\n') : `ok: ${notas.length} notas com as facetas, ligadas no texto${modelos ? ' e no modelo do tipo' : ''}${clientes.length ? `, sem os ${clientes.length} clientes da lista` : ''}`);
  } else if (modo === 'perguntas') {
    const [arq] = g._;
    const pasta = g.cerebro?.[0];
    if (!arq || !pasta || !existsSync(arq)) {
      escrever('uso: conferir.mjs perguntas <conferencia.json> --cerebro <pasta> [--ignorar <caminho>...] [--agente]');
      return 2;
    }
    const ignorar = (g.ignorar ?? []).map((p) => resolve(pasta, p));
    const notas = arquivosMd([pasta])
      .filter((p) => !ignorar.some((i) => resolve(p) === i || resolve(p).startsWith(`${i}/`)))
      .map((p) => ({ caminho: relative(pasta, p), texto: readFileSync(p, 'utf8') }));
    const conf = JSON.parse(readFileSync(arq, 'utf8'));
    problemas.push(...conferirPerguntas(conf, notas));
    if (g.agente && !problemas.length) problemas.push(...perguntarAoAgente(conf, pasta));
    escrever(problemas.length ? problemas.join('\n') : `ok: ${(conf.perguntas ?? []).length} perguntas respondidas pelas notas${g.agente ? ' e pelo agente' : ''}`);
  } else {
    escrever('uso: conferir.mjs descritivos|notas|perguntas ...');
    return 2;
  }
  return problemas.length ? 1 : 0;
}

// realpathSync: chamada por atalho (symlink) também roda, em vez de sair com 0 sem conferir nada.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = rodar(process.argv.slice(2));
}
