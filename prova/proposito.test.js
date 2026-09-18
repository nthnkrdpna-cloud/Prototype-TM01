// RWA e ESG — o Pilar IV.
//
// Os dois módulos têm a mesma espinha, e ela é o que os torna honestos:
// **nenhum dos dois inventa nota.** O RWA recusa pontuar coisas que não se
// somam; o ESG só pontua com os critérios de quem avalia, à vista.
//
// Um "ESG Score" de 0 a 100 sem critério publicado é exatamente o marketing
// que a página 15 do Blueprint diz recusar. Há teste para isso.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avaliar, PERGUNTAS } from '../src/mercado/rwa.js';
import { pontuar, divulga, DIVULGACAO } from '../src/mercado/esg.js';

// ── RWA ──────────────────────────────────────────────────────

const completo = {
  custodiante: 'Banco X, registrado na CVM sob nº 000',
  auditoria: 'Auditoria Y, trimestral',
  execucao: 'Alienação fiduciária com execução extrajudicial',
  jurisdicao: 'Brasil, foro de São Paulo',
};

test('com as estruturais respondidas, o ativo é avaliável', () => {
  const a = avaliar(completo);
  assert.equal(a.avaliavel, true);
  assert.equal(a.faltando.filter((f) => f.chave === 'custodiante').length, 0);
  assert.match(a.leitura, /Conferir se as respostas são verdadeiras/);
});

test('NÃO AVALIÁVEL não é o mesmo que nota baixa, e o texto separa os dois', () => {
  const a = avaliar({ custodiante: 'Banco X' });
  assert.equal(a.avaliavel, false);
  assert.match(a.leitura, /não é avaliação ruim: é avaliação impossível/);
});

test('o módulo NÃO pontua RWA, e explica a ausência da nota', () => {
  const a = avaliar(completo);
  assert.equal(a.nota, null);
  assert.match(a.porqueSemNota, /não pontua RWA/);
  assert.match(a.porqueSemNota, /não vale "meio ponto"/);
});

test('resposta em branco ou só espaço conta como não respondida', () => {
  assert.equal(avaliar({ ...completo, execucao: '' }).avaliavel, false);
  assert.equal(avaliar({ ...completo, execucao: '   ' }).avaliavel, false);
  assert.equal(avaliar({ ...completo, execucao: null }).avaliavel, false);
});

test('liquidez e oráculo faltando não impedem avaliar — são materiais, não estruturais', () => {
  const a = avaliar(completo);
  assert.equal(a.avaliavel, true, 'faltam liquidez e oráculo, e ainda assim avalia');
  assert.equal(a.faltando.length, 2);
  assert.deepEqual(a.faltando.map((f) => f.chave).sort(), ['liquidez', 'oraculo']);
});

test('toda pergunta diz por que existe', () => {
  for (const p of PERGUNTAS) {
    assert.ok(p.porque && p.porque.length > 10, `${p.chave} sem motivo`);
    assert.ok(['estrutural', 'material'].includes(p.peso));
  }
});

test('o aviso central acompanha toda avaliação', () => {
  assert.match(avaliar({}).aviso, /Blockchain garante que o token é seu/);
  assert.match(avaliar(completo).aviso, /Não garante que o lastro existe/);
});

// ── ESG ──────────────────────────────────────────────────────

test('SEM CRITÉRIO NÃO HÁ NOTA — e o motivo é o argumento do módulo', () => {
  const p = pontuar([]);
  assert.equal(p.nota, null);
  assert.match(p.porqueSemNota, /pontuação sem critério visível é marketing/);
  assert.equal(pontuar(null).nota, null);
});

test('com os critérios de quem avalia, faz a aritmética à vista', () => {
  const p = pontuar([
    { nome: 'emissões', peso: 2, valor: 0.5 },
    { nome: 'governança', peso: 1, valor: 1 },
  ]);
  // (0,5×2 + 1×1) / 3 = 2/3
  assert.equal(p.nota, 0.667);
  assert.equal(p.pesoTotal, 3);
});

test('os critérios voltam inteiros, para dar no que discordar', () => {
  const p = pontuar([
    { nome: 'emissões', peso: 3, valor: 0.2 },
    { nome: 'água', peso: 1, valor: 0.9 },
  ]);
  assert.equal(p.criterios.length, 2);
  assert.equal(p.criterios[0].participacao, 0.75, 'peso 3 de 4');
  assert.match(p.leitura, /Outra pessoa com outros pesos chega a outro número/);
});

test('recusa critério malformado em vez de pontuar sobre lixo', () => {
  assert.throws(() => pontuar([{ peso: 1, valor: 0.5 }]), /sem nome/);
  assert.throws(() => pontuar([{ nome: 'x', peso: 0, valor: 0.5 }]), /peso não positivo/);
  assert.throws(() => pontuar([{ nome: 'x', peso: 1, valor: 1.5 }]), /fora de 0 a 1/);
  assert.throws(() => pontuar([{ nome: 'x', peso: 1, valor: -0.1 }]), /fora de 0 a 1/);
});

test('DIVULGAR não é SER, e os dois ficam em campos separados', () => {
  const d = divulga({ s1: true, s2: true });
  assert.equal(d.completa, true);
  assert.match(d.oqueSignifica, /CONTA certas coisas de um jeito padronizado/);
  assert.match(d.oqueSignifica, /Não significa que essas coisas sejam boas/);
});

test('as normas de divulgação declaram o que NÃO são', () => {
  for (const n of DIVULGACAO) {
    assert.match(n.naoE, /não é nota/);
    assert.match(n.naoE, /não classifica a empresa/);
  }
  assert.deepEqual(DIVULGACAO.map((n) => n.norma), ['IFRS S1', 'IFRS S2']);
});

test('a divulgação acompanha a pontuação, sem se misturar com ela', () => {
  const p = pontuar([{ nome: 'x', peso: 1, valor: 1 }]);
  assert.equal(p.divulgacao.length, 2, 'as normas vêm junto');
  assert.equal(p.nota, 1, 'mas a nota é dos critérios, não das normas');
});
