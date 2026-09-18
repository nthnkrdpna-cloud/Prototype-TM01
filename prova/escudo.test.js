// O Escudo do Artesão.
//
// O caso que mais importa aqui não é o feliz: é o **ritmo zero**. Dividir o que
// falta por um aporte de zero devolve `Infinity` em JavaScript, que numa tela
// vira "∞ meses" e num CSV vira a palavra `Infinity` — e quem abrir a planilha
// não sabe se é defeito do programa ou resposta.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  escudo, faixa, ritmoPara, mesesCobertos, MESES_MINIMO, MESES_MAXIMO,
} from '../src/nucleo/escudo.js';
import { emCentavos } from '../src/nucleo/dinheiro.js';

const reais = emCentavos;

test('o alvo é o custo mensal vezes os meses', () => {
  const e = escudo({ custoMensal: reais(3_000), meses: 6 });
  assert.equal(e.alvo, reais(18_000));
  assert.equal(e.falta, reais(18_000), 'sem nada guardado, falta tudo');
  assert.equal(e.completo, false);
  assert.equal(e.percentual, 0);
});

test('o que já está guardado abate a falta', () => {
  const e = escudo({ custoMensal: reais(3_000), guardado: reais(6_000), meses: 6 });
  assert.equal(e.falta, reais(12_000));
  assert.equal(e.percentual, 33, '6.000 de 18.000');
  assert.equal(e.mesesCobertos, 2, 'e são 2 meses de despesa já cobertos');
});

test('meses cobertos é o número que a pessoa realmente quer, e não é o percentual', () => {
  // 33% do alvo de 6 meses e 2 meses cobertos são a mesma situação vista de dois
  // jeitos — e o segundo é o que responde "quanto tempo eu aguento".
  const e = escudo({ custoMensal: reais(3_000), guardado: reais(6_000), meses: 6 });
  assert.notEqual(e.percentual, e.mesesCobertos);
  assert.equal(mesesCobertos(reais(4_500), reais(3_000)), 1.5);
  assert.equal(mesesCobertos(0, reais(3_000)), 0);
  assert.equal(mesesCobertos(reais(1_000), 0), 0, 'custo zero não divide por zero');
});

test('o prazo sai do ritmo, arredondado para cima', () => {
  const e = escudo({ custoMensal: reais(3_000), ritmoMensal: reais(500), meses: 6 });
  // faltam 18.000, a 500 por mês → 36 meses
  assert.equal(e.mesesParaCompletar, 36);
  assert.equal(e.semAporte, false);
  // 18.000 a 700 por mês dá 25,7 — arredonda para 26, nunca para 25
  const f = escudo({ custoMensal: reais(3_000), ritmoMensal: reais(700), meses: 6 });
  assert.equal(f.mesesParaCompletar, 26, 'para cima: 25 meses não fecham a conta');
});

test('RITMO ZERO não devolve Infinity nem NaN — devolve o caso nomeado', () => {
  const e = escudo({ custoMensal: reais(3_000), ritmoMensal: 0, meses: 6 });
  assert.equal(e.mesesParaCompletar, null);
  assert.equal(e.semAporte, true);
  assert.ok(Number.isFinite(e.falta));
  // e o valor não pode virar texto estranho numa exportação
  assert.equal(JSON.stringify(e).includes('Infinity'), false);
  assert.equal(JSON.stringify(e).includes('null,"semAporte":true'), true);
});

test('reserva completa: falta zero, prazo zero, e não fica "sem aporte"', () => {
  const e = escudo({ custoMensal: reais(3_000), guardado: reais(20_000), meses: 6 });
  assert.equal(e.completo, true);
  assert.equal(e.falta, 0);
  assert.equal(e.mesesParaCompletar, 0);
  assert.equal(e.semAporte, false, 'já chegou: a ausência de aporte não é problema');
  assert.equal(e.percentual, 100, 'passou do alvo, mas o percentual não passa de 100');
});

test('a faixa devolve 6, 9 e 12 meses de uma vez', () => {
  const f = faixa({ custoMensal: reais(2_000), guardado: reais(4_000) });
  assert.deepEqual(f.map((e) => e.meses), [MESES_MINIMO, 9, MESES_MAXIMO]);
  assert.deepEqual(f.map((e) => e.alvo), [reais(12_000), reais(18_000), reais(24_000)]);
  // o guardado é o mesmo nos três; o que muda é o quanto falta
  assert.ok(f[0].falta < f[2].falta);
});

test('a pergunta invertida: quanto separar por mês para fechar num prazo', () => {
  // faltam 18.000 e a pessoa quer fechar em 12 meses
  const r = ritmoPara({ custoMensal: reais(3_000), meses: 6, emQuantosMeses: 12 });
  assert.equal(r, reais(1_500));
  // com metade já guardada, o ritmo cai pela metade
  const r2 = ritmoPara({
    custoMensal: reais(3_000), guardado: reais(9_000), meses: 6, emQuantosMeses: 12,
  });
  assert.equal(r2, reais(750));
});

test('recusa entrada impossível em vez de devolver número sem sentido', () => {
  assert.throws(() => escudo({ custoMensal: 0 }), /maior que zero/);
  assert.throws(() => escudo({ custoMensal: -1 }), /maior que zero/);
  assert.throws(() => escudo({ custoMensal: reais(100), guardado: -1 }), /não pode ser negativo/);
  assert.throws(() => escudo({ custoMensal: reais(100), ritmoMensal: -1 }), /não pode ser negativo/);
  assert.throws(() => escudo({ custoMensal: reais(100), meses: 0 }), /ao menos 1/);
  assert.throws(() => escudo({ custoMensal: reais(100), meses: 1.5 }), /inteiro/);
  assert.throws(
    () => ritmoPara({ custoMensal: reais(100), emQuantosMeses: 0 }),
    /ao menos 1 mês/,
  );
});

test('o resultado carrega o aviso de que não recomenda aplicação', () => {
  const e = escudo({ custoMensal: reais(3_000), meses: 6 });
  assert.match(e.aviso, /Onde guardar é decisão sua/);
  assert.match(e.aviso, /não é recomendação de investimento/);
});

test('centavos não viram fração perdida no caminho', () => {
  // custo de R$ 1.234,56 por 7 meses = R$ 8.641,92, exato
  const e = escudo({ custoMensal: reais('1.234,56'), meses: 7 });
  assert.equal(e.alvo, reais('8.641,92'));
});
