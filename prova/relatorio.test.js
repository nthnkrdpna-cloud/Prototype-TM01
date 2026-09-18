// CVM/IFRS e o compilado da DeCripto.
//
// Dois cuidados que valem mais que a aritmética:
//   · indicador NÃO é veredito, e o objeto tem de dizer isso;
//   · o compilado NÃO é o arquivo oficial do e-CAC, e o objeto tem de dizer
//     isso — gerar um arquivo que a Receita recusa custa um prazo.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { indicadores, fecha, NORMAS } from '../src/fiscal/br/cvm.js';
import { compilar, comoTexto } from '../src/relatorio/ecac.js';
import { apurar } from '../src/nucleo/apuracao.js';
import { emCentavos, emUnidades } from '../src/nucleo/dinheiro.js';

const reais = emCentavos;
const qtd = emUnidades;

// ── CVM / IFRS ───────────────────────────────────────────────

test('os indicadores saem das razões declaradas', () => {
  const i = indicadores({
    ativoTotal: reais(1_000_000),
    passivoTotal: reais(600_000),
    patrimonioLiquido: reais(400_000),
    receitaLiquida: reais(500_000),
    resultadoOperacional: reais(75_000),
  });
  assert.equal(i.alavancagem.valor, 1.5, '600 de passivo para 400 de patrimônio');
  assert.equal(i.margemOperacional.valor, 0.15);
  assert.equal(i.participacaoDoPatrimonio.valor, 0.4);
});

test('divisão por zero devolve null e o motivo, nunca Infinity', () => {
  const i = indicadores({
    ativoTotal: 0, passivoTotal: reais(100), patrimonioLiquido: 0,
    receitaLiquida: 0, resultadoOperacional: reais(10),
  });
  assert.equal(i.alavancagem.valor, null);
  assert.match(i.alavancagem.semValor, /patrimônio líquido zero/);
  assert.equal(i.margemOperacional.valor, null);
  assert.match(i.margemOperacional.semValor, /sem receita/);
  assert.equal(JSON.stringify(i).includes('Infinity'), false);
});

test('caixa maior que dívida aparece como caixa líquido, não como defeito', () => {
  const i = indicadores({
    ativoTotal: reais(100), passivoTotal: reais(50), patrimonioLiquido: reais(50),
    receitaLiquida: reais(100), resultadoOperacional: reais(10),
    dividaBruta: reais(1_000), caixa: reais(3_000),
  });
  assert.equal(i.dividaLiquida.valor, -reais(2_000));
  assert.equal(i.dividaLiquida.caixaLiquido, true);
});

test('INDICADOR NÃO É VEREDITO, e o objeto diz isso', () => {
  const i = indicadores({
    ativoTotal: reais(100), passivoTotal: reais(50), patrimonioLiquido: reais(50),
    receitaLiquida: reais(100), resultadoOperacional: reais(10),
  });
  assert.match(i.leitura, /resumem, não julgam/);
  assert.match(i.leitura, /aperto ou captação para crescer/);
});

test('as normas declaram o que cada uma alcança — e a CVM 242 é de companhia aberta', () => {
  const cvm = NORMAS.find((n) => n.norma === 'Resolução CVM 242');
  assert.equal(cvm.alcanca, 'companhia aberta');
  assert.match(cvm.vigencia, /1º\/01\/2026/, "exercícios a partir de 1º de janeiro de 2026");
  for (const n of NORMAS) assert.ok(n.alcanca, `${n.norma} sem alcance declarado`);
});

test('balanço que não fecha é apontado antes de virar indicador', () => {
  const bom = { ativoTotal: reais(1_000), passivoTotal: reais(600), patrimonioLiquido: reais(400) };
  assert.equal(fecha(bom).fecha, true);

  const ruim = { ativoTotal: reais(1_000), passivoTotal: reais(600), patrimonioLiquido: reais(300) };
  const r = fecha(ruim);
  assert.equal(r.fecha, false);
  assert.equal(r.diferenca, reais(100));
  assert.match(r.porque, /calculável e falso/);
});

// ── o compilado da DeCripto ──────────────────────────────────

const ops = [
  { tipo: 'compra', data: '2026-09-01', ativo: 'BTC', custodia: 'nacional',
    quantidade: qtd(1), valor: reais(100_000) },
  { tipo: 'transferencia', data: '2026-09-05', ativo: 'BTC',
    quantidade: qtd(0.5), de: 'nacional', para: 'autocustodia' },
  { tipo: 'venda', data: '2026-09-20', ativo: 'BTC', custodia: 'autocustodia',
    quantidade: qtd(0.5), valor: reais(80_000) },
  { tipo: 'compra', data: '2026-09-10', ativo: 'ETH', custodia: 'exterior',
    quantidade: qtd(2), valor: reais(30_000) },
];

test('o compilado conta só o que está fora de exchange nacional', () => {
  const { eventos } = apurar(ops);
  const c = compilar(eventos, '2026-09');

  // transferência (custo 50.000) + venda em autocustódia (80.000) + compra no
  // exterior (30.000) = 160.000. A compra na exchange nacional fica de fora.
  assert.equal(c.somatorio, reais(160_000));
  assert.equal(c.obrigado, true);
  assert.deepEqual(Object.keys(c.porCustodia).sort(), ['autocustodia', 'exterior']);
  assert.equal(c.operacoes.length, 3, 'a compra nacional não entra');
});

test('agrupa por ativo somando o que conta', () => {
  const { eventos } = apurar(ops);
  const c = compilar(eventos, '2026-09');
  assert.equal(c.porAtivo.BTC.valor, reais(130_000), '50.000 da transferência + 80.000 da venda');
  assert.equal(c.porAtivo.ETH.valor, reais(30_000));
  assert.equal(c.porAtivo.BTC.quantos, 2);
});

test('mês sem operação contável não obriga', () => {
  const { eventos } = apurar([
    { tipo: 'compra', data: '2026-10-01', ativo: 'BTC', custodia: 'nacional',
      quantidade: qtd(1), valor: reais(500_000) },
  ]);
  const c = compilar(eventos, '2026-10');
  assert.equal(c.somatorio, 0);
  assert.equal(c.obrigado, false, 'meio milhão em exchange nacional não dispara DeCripto');
});

test('NÃO gera o arquivo oficial, e diz por quê', () => {
  const { eventos } = apurar(ops);
  const c = compilar(eventos, '2026-09');
  assert.equal(c.geraArquivoOficial, false);
  assert.match(c.aviso, /não o arquivo de entrega/);
  assert.match(c.aviso, /custaria um prazo/);
});

test('o texto sai legível e leva o aviso junto', () => {
  const { eventos } = apurar(ops);
  const t = comoTexto(compilar(eventos, '2026-09'));
  assert.match(t, /DeCripto — 2026-09/);
  assert.match(t, /Obrigado a declarar: SIM/);
  assert.match(t, /R\$ 160\.000,00/);
  assert.match(t, /Por ativo:/);
  assert.match(t, /não o arquivo de entrega/);
});

test('o compilado não recalcula — usa o que a apuração já decidiu', () => {
  const { eventos } = apurar(ops);
  const c = compilar(eventos, '2026-09');
  const transf = c.operacoes.find((o) => o.tipo === 'transferencia');
  // o valor da transferência é o CUSTO que a carteira calculou, não um preço
  assert.equal(transf.valor, reais(50_000), 'metade do custo de 100.000');
});
