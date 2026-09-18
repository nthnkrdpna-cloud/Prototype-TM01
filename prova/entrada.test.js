// Leitura da entrada.
//
// O teste que mais importa aqui é o de linha ilegível: ela tem de PARAR a
// importação. Uma calculadora de imposto que pula a linha que não entendeu
// devolve um total menor, e igualmente convincente.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ler, lerLinha, LinhaIlegivel, EXEMPLO } from '../src/nucleo/entrada.js';
import { emCentavos, emUnidades } from '../src/nucleo/dinheiro.js';
import { apurar } from '../src/nucleo/apuracao.js';

test('lê uma linha separada por espaço', () => {
  const op = lerLinha('2026-09-15 venda BTC 0,5 30.000,00 nacional');
  assert.deepEqual(op, {
    tipo: 'venda', data: '2026-09-15', ativo: 'BTC',
    quantidade: emUnidades('0,5'), valor: emCentavos('30.000,00'), custodia: 'nacional',
  });
});

test('lê a mesma linha em CSV', () => {
  const a = lerLinha('2026-09-15 venda BTC 0,5 30000 nacional');
  const b = lerLinha('2026-09-15,venda,BTC,0.5,30000,nacional');
  assert.deepEqual(a, b);
});

test('aceita a taxa como sétimo campo, quando houver', () => {
  const op = lerLinha('2026-09-15 venda BTC 0,5 30000 nacional 50,00');
  assert.equal(op.taxa, emCentavos('50,00'));
  assert.equal(lerLinha('2026-09-15 venda BTC 0,5 30000 nacional').taxa, undefined);
});

test('entende os apelidos que uma pessoa real escreve', () => {
  assert.equal(lerLinha('2026-09-15 comprar BTC 1 100 br').tipo, 'compra');
  assert.equal(lerLinha('2026-09-15 sell BTC 1 100 fora').custodia, 'exterior');
  assert.equal(lerLinha('2026-09-15 v BTC 1 100 carteira').custodia, 'autocustodia');
  assert.equal(lerLinha('2026-09-15 venda btc 1 100 nacional').ativo, 'BTC', 'ativo sobe de caixa');
});

test('lê transferência com origem e destino', () => {
  const op = lerLinha('2026-09-20 transferencia BTC 0,25 nacional autocustodia');
  assert.deepEqual(op, {
    tipo: 'transferencia', data: '2026-09-20', ativo: 'BTC',
    quantidade: emUnidades('0,25'), de: 'nacional', para: 'autocustodia',
  });
});

test('pula linha vazia, comentário e cabeçalho — e nada mais', () => {
  const ops = ler([
    'data,tipo,ativo,quantidade,valor,custodia',
    '# isto é um comentário',
    '',
    '2026-09-15,venda,BTC,1,100,nacional',
  ].join('\n'));
  assert.equal(ops.length, 1);
});

test('linha ilegível PARA a importação e diz o número da linha', () => {
  const texto = [
    '2026-09-01 compra BTC 1 100 nacional',
    '2026-09-02 venda BTC uma 100 nacional',
    '2026-09-03 venda BTC 1 100 nacional',
  ].join('\n');

  assert.throws(() => ler(texto), (e) => {
    assert.ok(e instanceof LinhaIlegivel);
    assert.equal(e.numero, 2, 'aponta a linha errada, não "algo deu errado"');
    assert.match(e.motivo, /quantidade/);
    return true;
  });
});

test('a vírgula decimal sobrevive ao separador — o bug que os testes pegaram', () => {
  // `0,5` não pode virar dois campos. Espaço manda, vírgula fica sendo decimal.
  assert.equal(lerLinha('2026-09-15 venda BTC 0,5 30000 nacional').quantidade, emUnidades('0,5'));
  // com ponto-e-vírgula, a vírgula decimal também sobrevive
  assert.equal(lerLinha('2026-09-15;venda;BTC;0,5;30000;nacional').quantidade, emUnidades('0,5'));
});

test('CSV por vírgula COM decimal por vírgula é recusado, não adivinhado', () => {
  // `BTC,0,5,30000` não tem leitura certa nem para uma pessoa.
  // Sai com campo a mais e cai numa recusa nomeada — melhor que um número errado.
  assert.throws(() => lerLinha('2026-09-15,venda,BTC,0,5,30000,nacional'), LinhaIlegivel);
});

test('recusa custódia que não existe em vez de escolher uma', () => {
  assert.throws(
    () => lerLinha('2026-09-15 venda BTC 1 100 binance'),
    /custódia desconhecida/,
  );
});

test('recusa tipo que não existe — staking não é venda', () => {
  assert.throws(() => lerLinha('2026-09-15 staking BTC 1 100 nacional'), /tipo desconhecido/);
});

test('recusa campos de menos', () => {
  assert.throws(() => lerLinha('2026-09-15 venda BTC 1'), /esperava ao menos 5 campos/);
});

test('recusa transferência sem destino', () => {
  assert.throws(
    () => lerLinha('2026-09-20 transferencia BTC 0,25 nacional'),
    /precisa de origem e destino/,
  );
});

test('recusa quantidade zero ou negativa', () => {
  assert.throws(() => lerLinha('2026-09-15 venda BTC 0 100 nacional'), /maior que zero/);
  assert.throws(() => lerLinha('2026-09-15 venda BTC -1 100 nacional'), /maior que zero/);
});

test('recusa valor negativo', () => {
  assert.throws(() => lerLinha('2026-09-15 venda BTC 1 -100 nacional'), /não pode ser negativo/);
});

test('o exemplo da página é lido e apurado sem erro', () => {
  const ops = ler(EXEMPLO);
  assert.equal(ops.length, 5);
  const { eventos } = apurar(ops);
  assert.equal(eventos.length, 5);
  // e cobre os três regimes, que é o motivo de ele existir
  const custodias = new Set(eventos.map((e) => e.custodia ?? e.para));
  assert.deepEqual([...custodias].sort(), ['autocustodia', 'exterior', 'nacional']);
});
