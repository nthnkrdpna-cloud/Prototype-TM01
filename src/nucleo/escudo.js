// O Escudo: a reserva de emergência, e quanto falta para ela existir.
//
// POR QUE ISTO NÃO MORA EM `fiscal/`. Não tem país. "Quantos meses de despesa
// você consegue atravessar sem renda" é a mesma pergunta em qualquer lugar do
// mundo, e a resposta não depende de norma nenhuma. É por isso que este módulo
// atravessa fronteira de graça, enquanto tudo em `fiscal/br/` precisaria de uma
// pasta nova por país.
//
// E é, de longe, a parte desta ferramenta que serve a mais gente: não exige ter
// criptoativo, não exige entender custódia, e não tem uma única citação legal
// que possa envelhecer. É aritmética.
//
// ⚠️ O QUE ELE NÃO FAZ, e a linha é a mesma do resto do projeto: **não diz onde
// guardar o dinheiro.** Calcula a meta, o quanto falta e em quanto tempo você
// chega no ritmo atual. Recomendar aplicação é assessoria de investimento, tem
// responsabilidade própria, e não é isto aqui.

import { proporcao } from './dinheiro.js';

/**
 * A faixa usual, e o motivo de ser faixa e não número.
 *
 * Seis meses é o piso que a maior parte da orientação financeira repete; doze
 * é o teto para quem tem renda variável ou instável. O número certo depende de
 * quão previsível é a renda de cada um — e isso quem sabe é a pessoa, não a
 * ferramenta. Por isso os dois extremos são mostrados, e o meio também.
 */
export const MESES_MINIMO = 6;
export const MESES_MAXIMO = 12;

/**
 * O alvo, o que falta, e o prazo no ritmo atual.
 *
 * Tudo em centavos inteiros, como o resto do projeto. `custoMensal` é o custo
 * de vida **vital** — o que não dá para cortar num mês ruim, não o gasto total.
 * A distinção é da pessoa, e a tela pergunta assim.
 */
export function escudo({ custoMensal, guardado = 0, ritmoMensal = 0, meses = MESES_MINIMO }) {
  exigirPositivo(custoMensal, 'custo mensal');
  exigirNaoNegativo(guardado, 'valor guardado');
  exigirNaoNegativo(ritmoMensal, 'ritmo mensal');
  if (!Number.isInteger(meses) || meses < 1) {
    throw new RangeError('meses de reserva tem de ser inteiro e ao menos 1');
  }

  const alvo = custoMensal * meses;
  const falta = Math.max(0, alvo - guardado);
  const completo = falta === 0;

  return {
    meses,
    custoMensal,
    alvo,
    guardado,
    falta,
    completo,
    // quanto do alvo já existe, em pontos percentuais inteiros
    percentual: alvo === 0 ? 100 : Math.min(100, Math.floor((guardado * 100) / alvo)),
    // quantos meses de despesa o que já existe cobre — é o número que a pessoa
    // realmente quer saber, e é diferente do percentual do alvo
    mesesCobertos: mesesCobertos(guardado, custoMensal),
    ...prazo(falta, ritmoMensal),
    aviso: 'Calcula a meta e o prazo. Onde guardar é decisão sua — isto não é '
      + 'recomendação de investimento.',
  };
}

/**
 * Em quanto tempo o que falta é alcançado, no ritmo informado.
 *
 * ⚠️ RITMO ZERO NÃO DEVOLVE `Infinity`. Dividir por zero em JavaScript devolve
 * `Infinity`, que numa tela vira "∞ meses" e num CSV vira a palavra `Infinity`
 * — e quem abrir a planilha não sabe se é erro do programa ou resposta. Aqui o
 * caso é tratado por inteiro e nomeado: sem aporte, não há prazo, e o campo diz
 * exatamente isso.
 */
function prazo(falta, ritmoMensal) {
  if (falta === 0) return { mesesParaCompletar: 0, semAporte: false };
  if (ritmoMensal <= 0) return { mesesParaCompletar: null, semAporte: true };
  return { mesesParaCompletar: Math.ceil(falta / ritmoMensal), semAporte: false };
}

/** Quantos meses de despesa o guardado cobre, com uma casa decimal. */
export function mesesCobertos(guardado, custoMensal) {
  if (custoMensal <= 0) return 0;
  return Math.floor((guardado * 10) / custoMensal) / 10;
}

/**
 * A faixa inteira — 6, 9 e 12 meses de uma vez.
 *
 * Existe porque ver os três lado a lado é o que faz a pessoa escolher com
 * critério, em vez de aceitar o primeiro número que apareceu na tela.
 */
export function faixa(entrada) {
  return [MESES_MINIMO, 9, MESES_MAXIMO].map((meses) => escudo({ ...entrada, meses }));
}

/**
 * Quanto guardar por mês para fechar num prazo escolhido.
 *
 * É a pergunta invertida, e é a que mais aparece: não "quando chego" mas
 * "quanto preciso separar para chegar em um ano".
 */
export function ritmoPara({ custoMensal, guardado = 0, meses = MESES_MINIMO, emQuantosMeses }) {
  if (!Number.isInteger(emQuantosMeses) || emQuantosMeses < 1) {
    throw new RangeError('o prazo tem de ser inteiro e ao menos 1 mês');
  }
  const { falta } = escudo({ custoMensal, guardado, meses });
  return proporcao(falta, 1, emQuantosMeses);
}

function exigirPositivo(v, nome) {
  if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${nome} tem de ser maior que zero`);
}

function exigirNaoNegativo(v, nome) {
  if (!Number.isFinite(v) || v < 0) throw new RangeError(`${nome} não pode ser negativo`);
}
