// A prova que só o navegador de verdade dá.
//
// Os testes de `node --test` conferem o cálculo. Eles NÃO conferem que a página
// abre, que o botão funciona, nem que nada sai pela rede — e é justamente onde
// este projeto já se queimou antes: uma marca que verificava 100/100 enquanto o
// desenho estava quebrado, porque ninguém tinha olhado os pixels.
//
// Aqui se confere o que só existe no navegador:
//
//   1. a página abre por `file://`, sem servidor;
//   2. o cálculo roda e aparece na tela;
//   3. NENHUMA requisição sai para fora do disco — é o requisito de privacidade,
//      e ele vale zero enquanto for só uma frase no rodapé;
//   4. o sigilo da apuração é carregado de verdade, não fica quebrado;
//   5. as medidas vêm de φ.
//
// Não roda no `npm test` porque precisa do Chromium. Roda com `npm run prova`.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGINA = `file://${join(RAIZ, 'index.html')}`;

const EXECUTAVEL = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].find((p) => existsSync(p));

let falhas = 0;
const confere = (ok, oque, detalhe = '') => {
  console.log(`${ok ? '  ok  ' : '  NÃO '} ${oque}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!ok) falhas += 1;
};

const navegador = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});
const pagina = await navegador.newPage();

// Tudo que a página tentar buscar fica registrado. `file://` é disco, não rede;
// qualquer outro esquema é vazamento.
const externas = [];
pagina.on('request', (r) => {
  const url = r.url();
  if (!url.startsWith('file://') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    externas.push(`${r.method()} ${url}`);
  }
});

const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

console.log('\nAbrindo a página do disco…\n');
await pagina.goto(PAGINA, { waitUntil: 'networkidle' });

confere(erros.length === 0, 'a página abre sem erro de script', erros.join(' | '));
confere(
  (await pagina.title()).includes('Prototype-TM01'),
  'o título carregou',
);

// ── as medidas vêm de φ ──────────────────────────────────────

const phi = await pagina.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--phi').trim());
confere(phi.startsWith('1.618033988'), 'a variável --phi está na página', phi);

const e1 = await pagina.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--e1').trim());
const esperado = `${Math.round(16 * (1.618033988749895 ** 0.5) * 10) / 10}px`;
confere(e1 === esperado, 'o degrau --e1 é 16 × φ^(1/2)', `${e1} (esperado ${esperado})`);

// ── o cálculo roda ───────────────────────────────────────────

await pagina.click('#exemplo');
await pagina.waitForSelector('.mes', { timeout: 5000 });

const meses = await pagina.locator('.mes').count();
confere(meses > 0, 'o exemplo calculou e apareceu na tela', `${meses} bloco(s)`);

const texto = await pagina.locator('#saida').innerText();
confere(texto.includes('R$'), 'saiu número em real');
confere(
  texto.includes('NÃO se aplica') || texto.includes('não se aplica'),
  'o aviso do exterior aparece na tela, não só no objeto',
);
confere(texto.includes('DeCripto'), 'o bloco da DeCripto aparece');

// ── o sigilo carrega de verdade ──────────────────────────────

const sigilos = await pagina.locator('.assinatura img').count();
confere(sigilos > 0, 'a apuração recebeu um sigilo');

const carregou = await pagina.evaluate(() =>
  [...document.querySelectorAll('.assinatura img, header img')]
    .every((i) => i.complete && i.naturalWidth > 0));
confere(carregou, 'as imagens de sigilo abriram mesmo (não ficaram quebradas)');

const codigo = await pagina.locator('.assinatura code').first().innerText();
confere(/^[0-9A-F]{8}$/.test(codigo), 'o código da assinatura tem 8 dígitos hex', codigo);

// ── determinismo na tela ─────────────────────────────────────

await pagina.click('#limpar');
await pagina.click('#exemplo');
await pagina.waitForSelector('.mes');
const codigo2 = await pagina.locator('.assinatura code').first().innerText();
confere(codigo === codigo2, 'recalcular dá o mesmo código', `${codigo} → ${codigo2}`);

// ── erro de digitação vira mensagem ──────────────────────────

await pagina.fill('#operacoes', '2026-09-15 venda BTC uma 100 nacional');
await pagina.click('#calcular');
await pagina.waitForSelector('.erro');
const erro = await pagina.locator('.erro').innerText();
confere(erro.includes('linha 1'), 'linha ilegível aponta a linha', erro.split('\n')[0]);

// ── o Escudo, na aba de verdade ──────────────────────────────

await pagina.click('#aba-escudo');
confere(
  await pagina.locator('#painel-escudo').isVisible()
  && !(await pagina.locator('#painel-apuracao').isVisible()),
  'a aba do Escudo troca de painel',
);

await pagina.fill('#custo', '3.000,00');
await pagina.fill('#guardado', '6.000,00');
await pagina.fill('#ritmo', '500,00');
await pagina.click('#calcular-escudo');
await pagina.waitForSelector('#saida-escudo .mes');

const esc = await pagina.locator('#saida-escudo').innerText();
confere((await pagina.locator('#saida-escudo .mes').count()) === 3, 'saíram as três metas');
confere(esc.includes('2 meses cobertos'), 'diz quantos meses o guardado já cobre');
confere(esc.includes('R$ 18.000,00'), 'a meta de 6 meses a R$ 3.000 é R$ 18.000');
confere(esc.includes('R$ 12.000,00'), 'e falta R$ 12.000');
confere(esc.includes('24 meses'), 'R$ 12.000 a R$ 500/mês → 24 meses');
confere(/não é recomendação de investimento/.test(esc), 'e diz que não recomenda aplicação');

// o caso que mais importa: ritmo vazio não pode virar "∞"
await pagina.fill('#ritmo', '');
await pagina.click('#calcular-escudo');
await pagina.waitForSelector('#saida-escudo .mes');
const semRitmo = await pagina.locator('#saida-escudo').innerText();
confere(!semRitmo.includes('Infinity') && !semRitmo.includes('∞') && !semRitmo.includes('NaN'),
  'sem aporte, a tela não mostra Infinity, ∞ nem NaN');
confere(semRitmo.includes('não dá para estimar prazo'), 'e explica por que não há prazo');

// custo vazio para, em vez de calcular sobre nada
await pagina.fill('#custo', '');
await pagina.click('#calcular-escudo');
await pagina.waitForSelector('#saida-escudo .erro');
confere(
  (await pagina.locator('#saida-escudo .erro').innerText()).includes('custo vital'),
  'sem custo vital, diz o que falta em vez de calcular',
);

await pagina.click('#aba-apuracao');
confere(await pagina.locator('#painel-apuracao').isVisible(), 'e volta para a apuração');

// ── o requisito de privacidade ───────────────────────────────

confere(
  externas.length === 0,
  'NENHUMA requisição saiu para fora do disco',
  externas.join(' | ') || 'nenhuma',
);

await navegador.close();

console.log(falhas === 0
  ? '\n✓ tudo conferido no navegador\n'
  : `\n✗ ${falhas} falha(s)\n`);
process.exit(falhas === 0 ? 0 : 1);
