// O núcleo: dinheiro, carteira, apuração, calendário.
//
// Os casos aqui são os que já quebraram alguma coisa em algum lugar — entrada
// que a pessoa cola do relatório, venda parcial, resíduo de centavo, transferência
// entre custódias, e a data que muda de dia sozinha.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  emCentavos, emUnidades, proporcao, formatarBRL, formatarQuantidade,
} from '../src/nucleo/dinheiro.js';
import {
  novaCarteira, comprar, vender, transferir, saldo, posicoes,
} from '../src/nucleo/carteira.js';
import { apurar, ordenar } from '../src/nucleo/apuracao.js';
import { mesDe, anoDe, porMes, exigirData } from '../src/nucleo/periodo.js';

// ─────────────────────────────────────────────── dinheiro

test('dinheiro: aceita o que uma pessoa cola de um relatório brasileiro', () => {
  assert.equal(emCentavos('1.234,56'), 123_456);
  assert.equal(emCentavos('R$ 1.234,56'), 123_456);
  assert.equal(emCentavos('1234,56'), 123_456);
  assert.equal(emCentavos('1234.56'), 123_456);
  assert.equal(emCentavos('0,01'), 1);
  assert.equal(emCentavos(1234.56), 123_456);
});

test('dinheiro: o ponto é milhar quando há vírgula, e decimal quando não há', () => {
  assert.equal(emCentavos('1.234,00'), 123_400, 'com vírgula: ponto é milhar');
  assert.equal(emCentavos('1.23'), 123, 'sem vírgula: ponto é decimal');
  assert.equal(emCentavos('1.234.567,89'), 123_456_789);
});

test('dinheiro: recusa entrada que não dá para ler, em vez de chutar zero', () => {
  assert.throws(() => emCentavos(''), TypeError);
  assert.throws(() => emCentavos('abc'), TypeError);
  assert.throws(() => emCentavos('R$'), TypeError);
  assert.throws(() => emCentavos(Infinity), TypeError);
});

test('dinheiro: recusa valor grande demais para continuar exato', () => {
  assert.throws(() => emCentavos(1e17), RangeError);
});

test('dinheiro: o erro clássico do ponto flutuante não acontece', () => {
  // 0,1 + 0,2 em centavos é 10 + 20 = 30. Sem surpresa.
  assert.equal(emCentavos('0,10') + emCentavos('0,20'), emCentavos('0,30'));
});

test('dinheiro: proporção arredonda uma vez só, no fim', () => {
  // 1/3 de R$ 10,00 três vezes não pode somar R$ 10,01
  const total = 1000;
  const a = proporcao(total, 1, 3);
  assert.equal(a, 333);
  assert.equal(proporcao(0, 1, 3), 0);
  assert.equal(proporcao(total, 0, 0), 0, 'divisão por zero devolve zero, não NaN');
});

test('dinheiro: formata para a tela do jeito brasileiro', () => {
  assert.equal(formatarBRL(123_456), 'R$ 1.234,56');
  assert.equal(formatarBRL(0), 'R$ 0,00');
  assert.equal(formatarBRL(-500), '-R$ 5,00');
  assert.equal(formatarBRL(100_000_000), 'R$ 1.000.000,00');
});

test('dinheiro: quantidade não arrasta zeros à toa', () => {
  assert.equal(formatarQuantidade(emUnidades('1,5')), '1,5');
  assert.equal(formatarQuantidade(emUnidades('1')), '1');
  assert.equal(formatarQuantidade(emUnidades('0,00000001')), '0,00000001');
});

// ─────────────────────────────────────────────── carteira

test('carteira: custo médio sobe e desce como deve', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 10_000_00 });
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 20_000_00 });

  const s = saldo(c, 'BTC', 'nacional');
  assert.equal(s.quantidade, emUnidades(2));
  assert.equal(s.custoTotal, 30_000_00, 'custo médio de R$ 15.000 por unidade');
});

test('carteira: a taxa de compra entra no custo e reduz o ganho', () => {
  const c = novaCarteira();
  comprar(c, {
    ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1),
    valor: 10_000_00, taxa: 100_00,
  });
  const r = vender(c, {
    ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 12_000_00,
  });
  assert.equal(r.custo, 10_100_00, 'R$ 10.000 + R$ 100 de taxa');
  assert.equal(r.ganho, 1_900_00, 'e não R$ 2.000');
});

test('carteira: a taxa de venda sai do que entrou no bolso', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 10_000_00 });
  const r = vender(c, {
    ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1),
    valor: 12_000_00, taxa: 50_00,
  });
  assert.equal(r.liquido, 11_950_00);
  assert.equal(r.ganho, 1_950_00);
});

test('carteira: venda parcial leva a fração exata do custo', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(3), valor: 3_000_00 });
  const r = vender(c, {
    ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(1), valor: 1_500_00,
  });
  assert.equal(r.custo, 1_000_00);
  assert.equal(saldo(c, 'ETH', 'nacional').custoTotal, 2_000_00);
});

test('carteira: posição zerada não deixa resíduo de centavo', () => {
  const c = novaCarteira();
  // custo que não divide bonito por 3
  comprar(c, { ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(3), valor: 1_000_01 });
  vender(c, { ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(1), valor: 500_00 });
  vender(c, { ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(1), valor: 500_00 });
  vender(c, { ativo: 'ETH', custodia: 'nacional', quantidade: emUnidades(1), valor: 500_00 });

  const s = saldo(c, 'ETH', 'nacional');
  assert.equal(s.quantidade, 0);
  assert.equal(s.custoTotal, 0, 'sem isto, sobra um centavo que vira prejuízo fantasma');
});

test('carteira: não deixa vender o que não tem', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 100_00 });
  assert.throws(
    () => vender(c, {
      ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(2), valor: 100_00,
    }),
    /maior que a posição/,
  );
});

test('carteira: cada custódia tem o seu próprio custo médio', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 10_000_00 });
  comprar(c, { ativo: 'BTC', custodia: 'exterior', quantidade: emUnidades(1), valor: 90_000_00 });

  // a compra cara lá fora não pode baratear o ganho daqui
  const r = vender(c, {
    ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 12_000_00,
  });
  assert.equal(r.custo, 10_000_00);
  assert.equal(r.ganho, 2_000_00);
});

test('carteira: transferência move o custo junto e não gera ganho', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(2), valor: 20_000_00 });
  const t = transferir(c, {
    ativo: 'BTC', de: 'nacional', para: 'autocustodia', quantidade: emUnidades(1),
  });

  assert.equal(t.ganho, 0, 'tirar da exchange não é alienar');
  assert.equal(t.custo, 10_000_00);
  assert.equal(saldo(c, 'BTC', 'nacional').custoTotal, 10_000_00);
  assert.equal(saldo(c, 'BTC', 'autocustodia').custoTotal, 10_000_00);

  // e a venda no destino apura com o custo certo, não com custo zero
  const r = vender(c, {
    ativo: 'BTC', custodia: 'autocustodia', quantidade: emUnidades(1), valor: 15_000_00,
  });
  assert.equal(r.ganho, 5_000_00, 'sem o custo transferido, o ganho seria R$ 15.000');
});

test('carteira: posições zeradas não aparecem na listagem', () => {
  const c = novaCarteira();
  comprar(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 100_00 });
  vender(c, { ativo: 'BTC', custodia: 'nacional', quantidade: emUnidades(1), valor: 200_00 });
  assert.equal(posicoes(c).length, 0);
});

test('carteira: custódia desconhecida é recusada na entrada', () => {
  const c = novaCarteira();
  assert.throws(
    () => comprar(c, {
      ativo: 'BTC', custodia: 'binance', quantidade: emUnidades(1), valor: 100_00,
    }),
    /custódia desconhecida/,
  );
});

// ─────────────────────────────────────────────── apuração

test('apuração: ordena por data e mantém a ordem digitada no empate', () => {
  const ops = [
    { tipo: 'venda', data: '2026-09-10', ativo: 'X' },
    { tipo: 'compra', data: '2026-09-01', ativo: 'X' },
    { tipo: 'compra', data: '2026-09-10', ativo: 'Y' },
  ];
  const r = ordenar(ops);
  assert.equal(r[0].data, '2026-09-01');
  assert.equal(r[1].ativo, 'X', 'empate de data: quem foi digitado antes vem antes');
  assert.equal(r[2].ativo, 'Y');
});

test('apuração: comprar depois de vender no mesmo dia é estouro, não conserto', () => {
  // se a ordem fosse "corrigida" sozinha, isto passaria — e mentiria
  const ops = [
    { tipo: 'venda', data: '2026-09-10', ativo: 'BTC', custodia: 'nacional',
      quantidade: emUnidades(1), valor: 100_00 },
    { tipo: 'compra', data: '2026-09-10', ativo: 'BTC', custodia: 'nacional',
      quantidade: emUnidades(1), valor: 100_00 },
  ];
  assert.throws(() => apurar(ops), /maior que a posição/);
});

test('apuração: tipo desconhecido para a apuração em vez de ser ignorado', () => {
  assert.throws(
    () => apurar([{ tipo: 'staking', data: '2026-09-01' }]),
    /tipo de operação desconhecido/,
  );
});

// ─────────────────────────────────────────────── calendário

test('calendário: mês e ano saem por corte de texto, sem construir Date', () => {
  assert.equal(mesDe('2026-09-18'), '2026-09');
  assert.equal(anoDe('2026-09-18'), '2026');
});

test('calendário: 1º de janeiro continua sendo janeiro', () => {
  // `new Date('2026-01-01')` é meia-noite UTC — no Brasil, 31/12 do ano anterior.
  // Um mês inteiro migraria de lugar na virada se isto usasse Date.
  assert.equal(mesDe('2026-01-01'), '2026-01');
  assert.equal(anoDe('2026-01-01'), '2026');
});

test('calendário: data fora do formato ou impossível é recusada', () => {
  assert.throws(() => exigirData('18/09/2026'), RangeError);
  assert.throws(() => exigirData('2026-13-01'), RangeError);
  assert.throws(() => exigirData('2026-02-30'), RangeError);
  assert.equal(exigirData('2028-02-29'), '2028-02-29', 'ano bissexto é válido');
});

test('calendário: agrupa por mês em ordem crescente', () => {
  const eventos = [
    { data: '2026-10-05' }, { data: '2026-09-01' }, { data: '2026-09-20' },
  ];
  assert.deepEqual([...porMes(eventos).keys()], ['2026-09', '2026-10']);
  assert.equal(porMes(eventos).get('2026-09').length, 2);
});
