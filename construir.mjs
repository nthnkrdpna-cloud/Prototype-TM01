// Costura os módulos num `index.html` único, que abre direto do disco.
//
// POR QUÊ. Módulos ES não carregam por `file://` — o navegador bloqueia por
// política de origem. Sem isto, ninguém abre a ferramenta sem hospedar antes, e
// "sem instalar nada" deixa de ser verdade. O código-fonte continua em arquivos
// pequenos; isto só junta.
//
// E POR QUE ELE CONFERE ANTES DE JUNTAR. Achatar tudo num escopo só faz
// aparecer um problema que não existe em módulos separados: **dois arquivos com
// o mesmo nome de topo** viram uma redeclaração, e o navegador recusa a página
// inteira. Já aconteceu duas vezes aqui — `mes` estava em `apurar.js` e em
// `tela.js`, e `SEPARADOR` em `carteira.js` e em `assinatura.js`. Nenhuma das
// duas quebrou teste nenhum, porque em módulo separado as duas são válidas.
//
// Por isso a construção recusa: nome repetido, nome usado antes de ser
// declarado, e import de arquivo que não está na lista.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));

/** Ordem de dependência: cada um só pode usar o que veio antes. */
const MODULOS = [
  'src/ui/proporcao.js',
  'src/nucleo/dinheiro.js',
  'src/nucleo/periodo.js',
  'src/nucleo/carteira.js',
  'src/nucleo/entrada.js',
  'src/nucleo/apuracao.js',
  'src/nucleo/escudo.js',
  'src/fiscal/br/regime.js',
  'src/fiscal/br/ganho.js',
  'src/fiscal/br/isencao.js',
  'src/fiscal/br/escudo-fiscal.js',
  'src/fiscal/br/exterior.js',
  'src/fiscal/br/decripto.js',
  'src/fiscal/br/colateral.js',
  'src/fiscal/br/apurar.js',
  'src/assinatura.js',
  'src/ui/tela.js',
];

/** O que o navegador já dá de graça, e portanto não precisa ser declarado. */
const PERMITIDOS = new Set(['document', 'globalThis', 'URL', 'Blob']);


// ── ler e conferir ───────────────────────────────────────────

const declarados = new Map();   // nome → módulo que o declarou
const pedacos = [];
const problemas = [];

for (const caminho of MODULOS) {
  const bruto = readFileSync(join(RAIZ, caminho), 'utf8');

  for (const nome of importados(bruto)) {
    if (!declarados.has(nome) && !PERMITIDOS.has(nome)) {
      problemas.push(
        `${caminho} usa "${nome}" antes de ele existir. ` +
        'Ou o módulo que o declara vem depois na lista, ou ele não está na lista.',
      );
    }
  }

  for (const nome of declaradosEm(bruto)) {
    if (declarados.has(nome)) {
      problemas.push(
        `"${nome}" é declarado em ${declarados.get(nome)} E em ${caminho}. ` +
        'Juntos num escopo só, isso é redeclaração e a página não abre.',
      );
    }
    declarados.set(nome, caminho);
  }

  pedacos.push(`/* ${caminho} */\n${despir(bruto)}`);
}

if (problemas.length) {
  console.error('Construção recusada:\n');
  for (const p of problemas) console.error(`  · ${p}`);
  process.exit(1);
}

// ── montar ───────────────────────────────────────────────────

const catalogo = readdirSync(join(RAIZ, 'samples', 'open-set'))
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.replace(/\.svg$/, ''))
  .sort();

if (catalogo.length === 0) {
  console.error('Construção recusada: samples/open-set/ está vazio, e a assinatura precisa dele.');
  process.exit(1);
}

const css = readFileSync(join(RAIZ, 'src', 'ui', 'estilo.css'), 'utf8');

const html = readFileSync(join(RAIZ, 'src', 'ui', 'index.html'), 'utf8')
  .replace('<link rel="stylesheet" href="estilo.css">', `<style>\n${css}\n</style>`)
  .replace(
    /<script type="module">[\s\S]*?<\/script>/,
    `<script>\n(function(){\n"use strict";\n` +
    `globalThis.__CATALOGO__ = ${JSON.stringify(catalogo)};\n` +
    `${pedacos.join('\n')}\niniciar();\n})();\n</script>`,
  );

writeFileSync(join(RAIZ, 'index.html'), html);

const kb = (html.length / 1024).toFixed(1);
console.log(`index.html escrito — ${kb} KB, ${MODULOS.length} módulos, ${catalogo.length} peças`);

// ── as ferramentas ───────────────────────────────────────────

/** Tira `import` e a palavra `export`. O corpo fica intacto. */
function despir(js) {
  return js
    .replace(/^import\s+[\s\S]*?from\s+'[^']+';\s*$/gm, '')
    .replace(/^export\s+(?=(function|const|let|class)\s)/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Os nomes que este módulo importa de outros arquivos do projeto. */
function importados(js) {
  const nomes = [];
  const re = /^import\s+\{([\s\S]*?)\}\s+from\s+'(\.[^']+)';/gm;
  let m;
  while ((m = re.exec(js)) !== null) {
    for (const parte of m[1].split(',')) {
      const nome = parte.trim().split(/\s+as\s+/).pop().trim();
      if (nome) nomes.push(nome);
    }
  }
  return nomes;
}

/** Os nomes que este módulo declara no topo — exportados ou não. */
function declaradosEm(js) {
  const nomes = [];
  const re = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(js)) !== null) nomes.push(m[1]);
  return nomes;
}
