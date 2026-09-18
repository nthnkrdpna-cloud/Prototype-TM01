// As duas armadilhas. Estes testes existem para falhar se alguém "simplificar".
//
// Armadilha 1: os dois R$ 35.000 são gatilhos OPOSTOS.
// Armadilha 2: a isenção NUNCA alcança o exterior.
//
// Os dois erros produzem números plausíveis. Nenhum deles quebra nada, nenhum
// deles aparece num log. Aparecem numa multa, meses depois, na conta de quem
// confiou. É por isso que estão aqui em cima, antes dos testes de unidade.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { apurar } from '../src/nucleo/apuracao.js';
import { fechar } from '../src/fiscal/br/apurar.js';
import { TETO_ISENCAO } from '../src/fiscal/br/isencao.js';
import { aplicarExterior } from '../src/fiscal/br/exterior.js';
import { TETO_DECRIPTO } from '../src/fiscal/br/decripto.js';
import { emCentavos, emUnidades } from '../src/nucleo/dinheiro.js';

const reais = emCentavos;
const qtd = emUnidades;

/** Compra barata e venda pelo valor pedido, para isolar o que se quer medir. */
function mesCom(vendasPedidas) {
  const ops = [];
  vendasPedidas.forEach((v, i) => {
    ops.push({
      tipo: 'compra', data: '2026-09-01', ativo: v.ativo ?? `A${i}`,
      custodia: v.custodia, quantidade: qtd(1), valor: reais(1000),
    });
    ops.push({
      tipo: 'venda', data: '2026-09-15', ativo: v.ativo ?? `A${i}`,
      custodia: v.custodia, quantidade: qtd(1), valor: v.valor,
    });
  });
  return fechar(apurar(ops).eventos).meses[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// ARMADILHA 1 — os dois tetos não são o mesmo teto
// ─────────────────────────────────────────────────────────────────────────────

test('armadilha 1: R$ 30.000 na exchange nacional — isento E sem DeCripto', () => {
  const m = mesCom([{ custodia: 'nacional', valor: reais(30_000) }]);
  assert.equal(m.nacional.isento, true, 'abaixo do teto do art. 22: isento');
  assert.equal(m.decripto.obrigado, false, 'exchange nacional não conta para DeCripto');
  assert.equal(m.nacional.baseTributavel, 0);
});

test('armadilha 1: R$ 36.000 na exchange nacional — TRIBUTADO e SEM DeCripto', () => {
  const m = mesCom([{ custodia: 'nacional', valor: reais(36_000) }]);
  assert.equal(m.nacional.isento, false, 'passou do teto: perde a isenção');
  assert.ok(m.nacional.baseTributavel > 0, 'e o ganho inteiro vira base, não só o excedente');
  assert.equal(m.decripto.obrigado, false,
    'DeCripto não olha exchange nacional, por maior que seja o valor');
});

test('armadilha 1: R$ 36.000 em autocustódia — TRIBUTADO e COM DeCripto', () => {
  const m = mesCom([{ custodia: 'autocustodia', valor: reais(36_000) }]);
  assert.equal(m.nacional.isento, false);
  assert.equal(m.decripto.obrigado, true, 'fora de exchange nacional, e acima do teto');
});

test('armadilha 1: o caso misto, que é onde os dois gatilhos discordam de verdade', () => {
  // R$ 20.000 em autocustódia + R$ 20.000 na nacional, no mesmo mês.
  const m = mesCom([
    { custodia: 'autocustodia', valor: reais(20_000) },
    { custodia: 'nacional', valor: reais(20_000) },
  ]);

  // Isenção soma os DOIS (autocustódia segue o regime nacional): R$ 40.000.
  assert.equal(m.nacional.alienado, reais(40_000));
  assert.equal(m.nacional.isento, false, 'somados, passam do teto do art. 22');

  // DeCripto soma só o que está FORA da exchange nacional — e soma TODA
  // operação, não só a venda: a compra de R$ 1.000 em autocustódia entra junto.
  assert.equal(m.decripto.somatorio, reais(21_000),
    'R$ 20.000 da venda + R$ 1.000 da compra, ambos em autocustódia');
  assert.deepEqual(m.decripto.custodiasContadas, ['autocustodia'],
    'o que passou por exchange nacional ficou de fora');
  assert.equal(m.decripto.obrigado, false, 'R$ 21.000 não passa do teto da IN');

  // É este o ponto, dito sem rodeio: mesmo mês, mesmas operações,
  // um gatilho disparou e o outro não.
  assert.equal(m.nacional.isento, false, 'perdeu a isenção');
  assert.equal(m.decripto.obrigado, false, 'e mesmo assim não precisa declarar');
});

test('armadilha 1: os dois tetos valem o mesmo e NÃO significam o mesmo', () => {
  // Os dois têm nomes diferentes no código DE PROPÓSITO. Enquanto se chamavam
  // os dois `TETO_MENSAL`, a única coisa que os distinguia era o arquivo.
  assert.equal(TETO_ISENCAO, TETO_DECRIPTO, 'coincidem no valor — é o que confunde');

  // e divergem no que somam: a isenção soma alienação, a DeCripto soma operação
  const m = mesCom([{ custodia: 'autocustodia', valor: reais(10_000) }]);
  assert.equal(m.nacional.alienado, reais(10_000), 'isenção conta a venda');
  // a DeCripto contou a venda E a compra que a precedeu
  assert.ok(m.decripto.quantidade > 1, 'DeCripto conta operações, não só alienações');
});

// ─────────────────────────────────────────────────────────────────────────────
// ARMADILHA 2 — a isenção não existe no exterior
// ─────────────────────────────────────────────────────────────────────────────

test('armadilha 2: R$ 100 de ganho no exterior já paga 15%', () => {
  const r = aplicarExterior([
    { regime: 'exterior', valor: reais(1_000), ganho: reais(100) },
  ]);
  assert.equal(r.isento, false);
  assert.equal(r.teto, null, 'não existe teto neste regime, e o campo diz isso');
  assert.equal(r.imposto, Math.round(reais(100) * 0.15));
});

test('armadilha 2: nenhum valor, por menor que seja, liga a isenção no exterior', () => {
  // varre valores dos dois lados do teto nacional: nenhum pode isentar
  for (const v of [1, 100, 10_000, 34_999, 35_000, 35_001, 1_000_000]) {
    const r = aplicarExterior([
      { regime: 'exterior', valor: reais(v), ganho: reais(v) },
    ]);
    assert.equal(r.isento, false, `R$ ${v} não pode ser isento no exterior`);
    assert.equal(r.imposto, Math.round(reais(v) * 0.15), `R$ ${v} paga 15%`);
  }
});

test('armadilha 2: venda no exterior não consome a folga da isenção nacional', () => {
  const m = mesCom([
    { custodia: 'exterior', valor: reais(30_000) },
    { custodia: 'nacional', valor: reais(30_000) },
  ]);
  // a nacional continua sozinha dentro do teto
  assert.equal(m.nacional.alienado, reais(30_000), 'a do exterior não entra nesta soma');
  assert.equal(m.nacional.isento, true);
  // e a do exterior é tributada do mesmo jeito
  assert.ok(m.exterior.imposto > 0, 'os R$ 30.000 lá fora pagam, apesar de caberem no teto daqui');
});

test('armadilha 2: o aviso do exterior aparece sempre que houver operação lá', () => {
  const ops = [
    { tipo: 'compra', data: '2026-09-01', ativo: 'BTC', custodia: 'exterior',
      quantidade: qtd(1), valor: reais(1_000) },
    { tipo: 'venda', data: '2026-09-10', ativo: 'BTC', custodia: 'exterior',
      quantidade: qtd(1), valor: reais(2_000) },
  ];
  const { avisos } = fechar(apurar(ops).eventos);
  const aviso = avisos.find((a) => a.custodia === 'exterior');
  assert.ok(aviso, 'sem este aviso, a pessoa não sabe por que o número é diferente');
  assert.match(aviso.texto, /NÃO se aplica/);
});

test('armadilha 2: autocustódia é tratada como interpretação, e admite isso', () => {
  const ops = [
    { tipo: 'compra', data: '2026-09-01', ativo: 'BTC', custodia: 'autocustodia',
      quantidade: qtd(1), valor: reais(1_000) },
    { tipo: 'venda', data: '2026-09-10', ativo: 'BTC', custodia: 'autocustodia',
      quantidade: qtd(1), valor: reais(2_000) },
  ];
  const { avisos } = fechar(apurar(ops).eventos);
  const aviso = avisos.find((a) => a.custodia === 'autocustodia');
  assert.ok(aviso, 'aplicou uma leitura: tem de dizer que foi leitura');
  assert.equal(aviso.certeza, 'interpretacao');
});
