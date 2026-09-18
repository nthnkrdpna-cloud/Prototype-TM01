// Geometria de mercado: Fibonacci, fluxo e volatilidade.
//
// O teste que mais importa aqui não é de aritmética — é o de **procedência dos
// números**. A lista de retrações costuma ser apresentada como se as seis
// frações tivessem a mesma origem, e não têm: 0,500 é o retorno à metade de
// Dow, não razão de Fibonacci. Um teste trava isso.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  NIVEIS, PROJECOES, retracoes, extremos, derivadasDePhi,
} from '../src/mercado/fibonacci.js';
import { delta, poc, areaDeValor, absorcao } from '../src/mercado/fluxo.js';
import { lerVolatilidade, porFaixa, FAIXAS_VIX } from '../src/mercado/vix.js';
import { PHI } from '../src/ui/proporcao.js';

// ── fibonacci ────────────────────────────────────────────────

test('as frações que descendem de φ conferem com o cálculo, não com uma lista', () => {
  const d = derivadasDePhi();
  assert.equal(d[0.382], 0.382, '1/φ² = 0,382');
  assert.equal(d[0.618], 0.618, '1/φ = 0,618');
  assert.equal(d[0.786], 0.786, '√(1/φ) = 0,786');
  assert.equal(d[1.618], 1.618, 'φ');
  // e a razão áurea é a que o projeto inteiro usa
  assert.equal(Math.round((1 / PHI) * 1000) / 1000, 0.618);
});

test('O 0,500 NÃO é razão de Fibonacci, e o código diz isso', () => {
  const meio = NIVEIS.find((n) => n.fracao === 0.5);
  assert.equal(meio.origem, 'dow', 'é o retorno à metade, de Dow');
  assert.match(meio.nota, /NÃO é razão de Fibonacci/);

  // e os outros não podem estar marcados como Dow por descuido
  const fib = NIVEIS.filter((n) => n.origem === 'fibonacci').map((n) => n.fracao);
  assert.deepEqual(fib, [0.236, 0.382, 0.618]);
  assert.equal(NIVEIS.find((n) => n.fracao === 0.786).origem, 'derivado');
});

test('toda fração declara de onde veio — nenhuma fica sem procedência', () => {
  for (const n of [...NIVEIS, ...PROJECOES]) {
    assert.ok(['fibonacci', 'dow', 'derivado'].includes(n.origem), `${n.fracao} sem origem`);
    assert.ok(n.nota && n.nota.length > 0, `${n.fracao} sem nota`);
  }
});

test('retração de um movimento de alta desce a partir do topo', () => {
  const r = retracoes(100, 200);
  assert.equal(r.sentido, 'alta');
  assert.equal(r.amplitude, 100);
  const meio = r.niveis.find((n) => n.fracao === 0.5);
  assert.equal(meio.preco, 150, 'metade do movimento de 100 a 200');
  assert.equal(r.niveis.find((n) => n.fracao === 0.618).preco, 138.2);
});

test('retração de um movimento de baixa sobe a partir do fundo', () => {
  const r = retracoes(200, 100);
  assert.equal(r.sentido, 'baixa');
  assert.equal(r.niveis.find((n) => n.fracao === 0.5).preco, 150);
  assert.equal(r.niveis.find((n) => n.fracao === 0.236).preco, 123.6);
});

test('a projeção passa do movimento inteiro', () => {
  const r = retracoes(100, 200);
  assert.equal(r.projecoes.find((p) => p.fracao === 1.618).preco, 261.8);
});

test('movimento nulo é recusado em vez de dividir por nada', () => {
  assert.throws(() => retracoes(100, 100), /não há movimento/);
  assert.throws(() => retracoes(NaN, 100), /não é um número finito/);
});

test('os extremos avisam que são da janela, não da tendência', () => {
  const e = extremos([10, 5, 20, 8]);
  assert.equal(e.minimo.valor, 5);
  assert.equal(e.maximo.valor, 20);
  assert.equal(e.sentidoDaJanela, 'alta', 'o máximo veio depois do mínimo');
  assert.match(e.aviso, /não topo e fundo de tendência/);
  assert.throws(() => extremos([1]), /ao menos dois pontos/);
});

// ── fluxo ────────────────────────────────────────────────────

const niveis = [
  { preco: 100, compra: 10, venda: 5 },
  { preco: 101, compra: 50, venda: 48 },
  { preco: 102, compra: 20, venda: 30 },
];

test('delta é comprado menos vendido, e o relativo compara vela com vela', () => {
  const d = delta(niveis);
  assert.equal(d.comprado, 80);
  assert.equal(d.vendido, 83);
  assert.equal(d.delta, -3);
  assert.equal(d.total, 163);
  assert.equal(d.deltaRelativo, Math.round((-3 / 163) * 1000) / 1000);
});

test('POC é o preço de maior volume', () => {
  assert.deepEqual(poc(niveis), { preco: 101, volume: 98 });
});

test('a área de valor cresce ao redor do POC e declara a convenção', () => {
  const a = areaDeValor(niveis);
  assert.equal(a.poc, 101);
  assert.ok(a.val <= 101 && a.vah >= 101, 'a faixa contém o POC');
  assert.ok(a.proporcaoReal >= 0.7, 'cobre ao menos a parte pedida');
  assert.match(a.nota, /convenção do Market Profile, não derivação/);
});

test('ABSORÇÃO É INDÍCIO, e o objeto diz isso por extenso', () => {
  const a = absorcao(niveis, { multiplo: 1.5 });
  assert.equal(a.length, 1, 'só o nível 101 tem volume alto e lados equilibrados');
  assert.equal(a[0].preco, 101);
  assert.match(a[0].leitura, /Indício, não sinal/);
  assert.match(a[0].leitura, /não é observável nestes dados/);
});

test('volume desequilibrado não conta como absorção', () => {
  // muito volume, mas quase tudo de um lado só: não houve encontro
  const desigual = [
    { preco: 100, compra: 1, venda: 1 },
    { preco: 101, compra: 100, venda: 2 },
  ];
  assert.equal(absorcao(desigual, { multiplo: 1.2 }).length, 0);
});

test('fluxo recusa entrada malformada em vez de calcular sobre lixo', () => {
  assert.throws(() => delta([]), /ao menos um nível/);
  assert.throws(() => delta([{ preco: 1 }]), /sem volume/);
  assert.throws(() => delta([{ preco: 1, compra: -1, venda: 0 }]), /não pode ser negativo/);
  assert.throws(() => areaDeValor(niveis, 0), /entre 0 e 1/);
});

// ── volatilidade ─────────────────────────────────────────────

test('a leitura vem com as ressalvas dentro do objeto, não num rodapé', () => {
  const v = lerVolatilidade(35);
  assert.equal(v.faixa, 'extrema');
  assert.equal(v.ressalvas.length, 3);
  const texto = v.ressalvas.join(' ');
  assert.match(texto, /não é previsão/);
  assert.match(texto, /concomitante, não antecedente/);
  assert.match(texto, /mercado americano/);
});

test('as faixas cobrem toda a reta e admitem ser convenção', () => {
  assert.equal(lerVolatilidade(5).faixa, 'muito baixa');
  assert.equal(lerVolatilidade(15).faixa, 'normal');
  assert.equal(lerVolatilidade(25).faixa, 'elevada');
  assert.equal(lerVolatilidade(80).faixa, 'extrema');
  assert.equal(FAIXAS_VIX[FAIXAS_VIX.length - 1].ate, Infinity, 'a última é aberta');
  assert.equal(lerVolatilidade(15).origemDasFaixas, 'convenção de mercado, não derivação');
});

test('sem regra informada, NÃO inventa fração de exposição', () => {
  const r = porFaixa(35, null);
  assert.equal(r.fracao, null);
  assert.match(r.porque, /não inventa fração/);
  assert.match(r.porque, /escolher risco por você/);
});

test('com regra da própria pessoa, aplica a aritmética dela', () => {
  const r = porFaixa(35, { extrema: 0.3, normal: 1 });
  assert.equal(r.fracao, 0.3);
  assert.equal(porFaixa(15, { extrema: 0.3, normal: 1 }).fracao, 1);
  assert.throws(() => porFaixa(35, { extrema: 1.5 }), /entre 0 e 1/);
});

test('volatilidade negativa é recusada', () => {
  assert.throws(() => lerVolatilidade(-1), /não negativo/);
  assert.throws(() => lerVolatilidade(NaN), /não negativo/);
});
