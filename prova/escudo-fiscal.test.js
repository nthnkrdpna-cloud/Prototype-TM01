// Tax Shield, faixas de ganho de capital, e colateral.
//
// A armadilha nova aqui é a das FAIXAS MARGINAIS. A Lei 13.259/2016 diz "sobre
// a PARCELA dos ganhos que exceder" — cada faixa incide só sobre o pedaço que
// cai dentro dela. Quem aplicar alíquota única ao total cobra R$ 125 mil a mais
// de quem passou de R$ 5 milhões por um real, e o número parece plausível.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { impostoSobreGanho, detalharGanho, FAIXAS } from '../src/fiscal/br/ganho.js';
import { simular, partir, folgaDoTeto } from '../src/fiscal/br/escudo-fiscal.js';
import { simularColateral, margemAteLiquidar } from '../src/fiscal/br/colateral.js';
import { emCentavos, emUnidades } from '../src/nucleo/dinheiro.js';

const reais = emCentavos;
const M = (n) => reais(n * 1_000_000);

// ── as faixas marginais ──────────────────────────────────────

test('faixa 1: o caso de quase todo mundo — 15%', () => {
  assert.equal(impostoSobreGanho(reais(10_000)), reais(1_500));
  assert.equal(impostoSobreGanho(reais(100_000)), reais(15_000));
  assert.equal(impostoSobreGanho(M(5)), reais(750_000), 'no teto exato da faixa 1');
});

test('ARMADILHA: um real acima de R$ 5 milhões não muda a alíquota do total', () => {
  const noTeto = impostoSobreGanho(M(5));
  const umAcima = impostoSobreGanho(M(5) + reais(1));

  // marginal: só o real a mais paga 17,5%
  assert.equal(umAcima - noTeto, Math.round(reais(1) * 0.175));

  // e NÃO é 17,5% sobre o total, que seria o erro
  const seFosseUnica = Math.round((M(5) + reais(1)) * 0.175);
  assert.notEqual(umAcima, seFosseUnica);
  assert.ok(seFosseUnica - umAcima > reais(100_000),
    'a diferença entre o certo e o errado passa de R$ 100 mil');
});

test('faixas somadas, uma a uma', () => {
  // R$ 12 milhões: 5M a 15% + 5M a 17,5% + 2M a 20%
  const esperado = Math.round(M(5) * 0.15 + M(5) * 0.175 + M(2) * 0.20);
  assert.equal(impostoSobreGanho(M(12)), esperado);
});

test('a faixa mais alta é aberta e não tem teto', () => {
  const a = impostoSobreGanho(M(50));
  const b = impostoSobreGanho(M(100));
  assert.equal(b - a, Math.round(M(50) * 0.225), 'tudo acima de 30M paga 22,5%');
  assert.equal(FAIXAS[FAIXAS.length - 1].ate, Infinity);
});

test('prejuízo e zero não geram imposto', () => {
  assert.equal(impostoSobreGanho(0), 0);
  assert.equal(impostoSobreGanho(-reais(1_000)), 0);
  assert.equal(impostoSobreGanho(NaN), 0);
});

test('o detalhe mostra de onde veio o número, faixa a faixa', () => {
  const d = detalharGanho(M(12));
  assert.equal(d.faixas.length, 3);
  assert.equal(d.faixas[0].aliquota, 0.15);
  assert.equal(d.faixas[2].aliquota, 0.20);
  assert.equal(d.faixas.reduce((s, f) => s + f.imposto, 0), d.imposto,
    'as faixas somam exatamente o imposto');
  // a alíquota efetiva fica entre a primeira e a da faixa alcançada
  assert.ok(d.aliquotaEfetiva > 0.15 && d.aliquotaEfetiva < 0.20);
});

// ── o tax shield ─────────────────────────────────────────────

test('folga do teto é o que ainda cabe neste mês', () => {
  assert.equal(folgaDoTeto(reais(20_000)).folga, reais(15_000));
  assert.equal(folgaDoTeto(reais(40_000)).folga, 0);
  assert.equal(folgaDoTeto(reais(40_000)).estourou, true);
});

test('vender de uma vez acima do teto tributa o ganho INTEIRO, não só o excedente', () => {
  const s = simular({
    jaAlienado: reais(30_000),
    valorPretendido: reais(10_000),
    custoDaPosicao: reais(4_000),
    quantidadePossuida: emUnidades(1),
    quantidadeVendida: emUnidades(1),
  });
  assert.equal(s.deUmaVez.estoura, true, '30k + 10k passa de 35k');
  assert.equal(s.ganho, reais(6_000));
  // o imposto é sobre os 6.000 inteiros, não sobre os 5.000 que excederam
  assert.equal(s.deUmaVez.imposto, Math.round(reais(6_000) * 0.15));
});

test('abaixo do teto não há imposto, e a simulação diz isso', () => {
  const s = simular({
    jaAlienado: reais(10_000),
    valorPretendido: reais(10_000),
    custoDaPosicao: reais(4_000),
    quantidadePossuida: emUnidades(1),
    quantidadeVendida: emUnidades(1),
  });
  assert.equal(s.deUmaVez.estoura, false);
  assert.equal(s.deUmaVez.isento, true);
  assert.equal(s.deUmaVez.imposto, 0);
});

test('partir a venda distribui até caber, e diz em quantos meses', () => {
  const p = partir({ jaAlienado: reais(30_000), valorPretendido: reais(45_000) });
  assert.equal(p.completa, true);
  assert.equal(p.meses, 3, '5.000 de folga agora, 35.000 no seguinte, 5.000 no terceiro');
  assert.deepEqual(p.parcelas, [reais(5_000), reais(35_000), reais(5_000)]);
  assert.equal(p.parcelas.reduce((a, b) => a + b, 0), reais(45_000), 'as parcelas somam o total');
});

test('partir com o mês já estourado começa a valer só no mês seguinte', () => {
  const p = partir({ jaAlienado: reais(40_000), valorPretendido: reais(10_000) });
  assert.equal(p.parcelas[0], 0, 'não cabe nada neste mês');
  assert.equal(p.parcelas[1], reais(10_000));
});

test('a simulação NÃO bloqueia, NÃO executa e diz isso no objeto', () => {
  const s = simular({
    jaAlienado: 0, valorPretendido: reais(50_000), custoDaPosicao: reais(10_000),
    quantidadePossuida: emUnidades(1), quantidadeVendida: emUnidades(1),
  });
  assert.equal(s.natureza, 'simulacao');
  assert.match(s.aviso, /Não bloqueia, não executa e não recomenda/);
});

test('e carrega as ressalvas que a conta sozinha esconde', () => {
  const p = partir({ jaAlienado: 0, valorPretendido: reais(100_000) });
  const texto = p.ressalvas.join(' ');
  assert.match(texto, /preço de um mês não é o preço do outro/);
  assert.match(texto, /exposto à variação/);
  assert.match(texto, /mês-calendário/);
});

test('recusa entrada impossível', () => {
  const base = {
    jaAlienado: 0, custoDaPosicao: reais(1_000),
    quantidadePossuida: emUnidades(1), quantidadeVendida: emUnidades(1),
  };
  assert.throws(() => simular({ ...base, valorPretendido: 0 }), /maior que zero/);
  assert.throws(
    () => simular({ ...base, valorPretendido: reais(100), quantidadeVendida: emUnidades(2) }),
    /fora da posição/,
  );
});

// ── o colateral ──────────────────────────────────────────────

test('tomar o empréstimo não aliena, e o módulo afirma isso', () => {
  const c = simularColateral({ valorDoColateral: reais(100_000), custoDoColateral: reais(40_000) });
  assert.equal(c.aoTomar.alienou, false);
  assert.equal(c.aoTomar.ganhoRealizado, 0);
  assert.equal(c.aoTomar.imposto, 0);
  assert.equal(c.emprestado, reais(50_000), 'LTV de 0,5 sobre 100.000');
});

test('mas converter a stablecoin para real É alienação — e entra na conta do mês', () => {
  const c = simularColateral({
    valorDoColateral: reais(100_000), custoDoColateral: reais(40_000),
    jaAlienadoNoMes: reais(10_000),
  });
  assert.equal(c.aoConverterParaReal.alienou, true);
  assert.equal(c.aoConverterParaReal.contaNoMes, true);
  assert.equal(c.aoConverterParaReal.somaAoAlienado, reais(60_000), '10.000 que já havia + 50.000');
});

test('a liquidação realiza tudo de uma vez, e o módulo diz quanto precisa cair', () => {
  const c = simularColateral({
    valorDoColateral: reais(100_000), custoDoColateral: reais(40_000),
    ltv: 0.5, ltvLiquidacao: 0.8,
  });
  // liquida quando o colateral cair para 50.000/0,8 = 62.500 → queda de 37,5%
  assert.equal(c.seLiquidar.valorDeLiquidacao, reais(62_500));
  assert.equal(c.seLiquidar.quedaNecessaria, 37.5);
  assert.equal(c.seLiquidar.ganhoRealizado, reais(22_500), '62.500 menos o custo de 40.000');
  assert.equal(c.seLiquidar.alienouTudoDeUmaVez, true);
});

test('LTV maior deixa menos margem até a liquidação', () => {
  assert.equal(margemAteLiquidar(0.5, 0.8), 37.5);
  assert.equal(margemAteLiquidar(0.7, 0.8), 12.5);
  assert.equal(margemAteLiquidar(0.9, 0.8), null, 'LTV acima do de liquidação não faz sentido');
});

test('a operação em DeFi é reportável, e isso vem junto', () => {
  const c = simularColateral({ valorDoColateral: reais(100_000), custoDoColateral: reais(40_000) });
  assert.equal(c.decripto.conta, true);
  assert.match(c.decripto.porque, /2\.291\/2025/);
});

test('o colateral simula e não executa nada', () => {
  const c = simularColateral({ valorDoColateral: reais(100_000), custoDoColateral: reais(40_000) });
  assert.equal(c.executa, false);
  assert.match(c.aviso, /Não conecta em protocolo/);
});

test('recusa LTV impossível', () => {
  const base = { valorDoColateral: reais(100_000), custoDoColateral: reais(40_000) };
  assert.throws(() => simularColateral({ ...base, ltv: 0 }), /entre 0 e 1/);
  assert.throws(() => simularColateral({ ...base, ltv: 1 }), /entre 0 e 1/);
  assert.throws(() => simularColateral({ ...base, ltv: 0.9, ltvLiquidacao: 0.8 }), /maior que o LTV/);
  assert.throws(() => simularColateral({ ...base, valorDoColateral: 0 }), /mais que zero/);
});
