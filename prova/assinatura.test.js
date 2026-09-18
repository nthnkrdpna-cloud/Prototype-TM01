// A assinatura da apuração.
//
// Duas propriedades importam, e uma sem a outra não serve:
//   determinismo  — a mesma apuração sempre dá o mesmo sigilo;
//   sensibilidade — um centavo de diferença dá outro.
//
// Só determinismo seria um carimbo fixo. Só sensibilidade seria ruído.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

import { apurar } from '../src/nucleo/apuracao.js';
import { fechar } from '../src/fiscal/br/apurar.js';
import { emCentavos, emUnidades } from '../src/nucleo/dinheiro.js';
import {
  codigoDe, codigoHex, canonizar, pecaDe, assinar, rodape,
} from '../src/assinatura.js';

const catalogo = readdirSync(new URL('../samples/open-set/', import.meta.url))
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.replace(/\.svg$/, ''))
  .sort();

function mesCom(valorVenda) {
  const ops = [
    { tipo: 'compra', data: '2026-09-01', ativo: 'BTC', custodia: 'nacional',
      quantidade: emUnidades(1), valor: emCentavos(10_000) },
    { tipo: 'venda', data: '2026-09-15', ativo: 'BTC', custodia: 'nacional',
      quantidade: emUnidades(1), valor: valorVenda },
  ];
  return fechar(apurar(ops).eventos).meses[0];
}

test('catálogo: as 100 peças da fatia aberta estão no disco', () => {
  assert.equal(catalogo.length, 100);
  assert.equal(catalogo[0], 'OPEN-A-001');
});

test('determinismo: a mesma apuração, duas vezes, dá o mesmo sigilo', () => {
  const a = assinar(mesCom(emCentavos(30_000)), catalogo);
  const b = assinar(mesCom(emCentavos(30_000)), catalogo);
  assert.deepEqual(a, b);
});

test('sensibilidade: um centavo muda o código', () => {
  const a = codigoDe(mesCom(emCentavos(30_000)));
  const b = codigoDe(mesCom(emCentavos('30000,01')));
  assert.notEqual(a, b, 'se um centavo não mudasse nada, o sigilo não identificaria nada');
});

test('sensibilidade: cruzar o teto da isenção muda o código', () => {
  const dentro = codigoDe(mesCom(emCentavos(35_000)));
  const fora = codigoDe(mesCom(emCentavos('35000,01')));
  assert.notEqual(dentro, fora);
});

test('o texto canônico não depende da ordem em que o objeto foi montado', () => {
  const m = mesCom(emCentavos(30_000));
  const reordenado = {
    operacoes: m.operacoes, decripto: m.decripto,
    exterior: m.exterior, nacional: m.nacional, mes: m.mes,
  };
  assert.equal(canonizar(m), canonizar(reordenado));
});

test('o código sai com oito dígitos hexadecimais, sempre', () => {
  assert.equal(codigoHex(0).length, 8);
  assert.equal(codigoHex(0), '00000000');
  assert.equal(codigoHex(0xffffffff), 'FFFFFFFF');
  assert.match(codigoHex(codigoDe(mesCom(emCentavos(1)))), /^[0-9A-F]{8}$/);
});

test('a peça escolhida existe mesmo — nome de arquivo não é chutado', () => {
  // varre muitos códigos: nenhum pode apontar para fora do catálogo
  for (let i = 0; i < 1000; i += 1) {
    const peca = pecaDe(i * 2_654_435_761 % 0xffffffff, catalogo);
    assert.ok(catalogo.includes(peca), `${peca} não está no catálogo`);
  }
});

test('a escolha usa o catálogo real, e não a divisão por três', () => {
  // os prefixos não são 33/33/33 — são 34/33/33. Chutar prefixo erraria.
  const contagem = {};
  for (const nome of catalogo) {
    const p = nome.slice(0, 6);
    contagem[p] = (contagem[p] ?? 0) + 1;
  }
  assert.deepEqual(contagem, { 'OPEN-A': 34, 'OPEN-B': 33, 'OPEN-C': 33 });
});

test('catálogo vazio para em vez de devolver undefined', () => {
  assert.throws(() => pecaDe(1, []), /catálogo de peças vazio/);
});

test('a assinatura carrega o aviso do que ela não é', () => {
  const a = assinar(mesCom(emCentavos(30_000)), catalogo);
  assert.equal(a.natureza, 'identificacao');
  assert.match(a.aviso, /não é proteção/);
});

test('o rodapé nomeia os dois autores e recusa o papel de orientação', () => {
  const linhas = rodape(assinar(mesCom(emCentavos(30_000)), catalogo));
  const texto = linhas.join('\n');
  assert.match(texto, /Nthnkr "dpna" e AmandaBT/);
  assert.match(texto, /não é orientação tributária/);
});
