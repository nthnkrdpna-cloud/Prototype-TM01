// Isenção mensal de bens de pequeno valor.
//
// Lei nº 9.250/1995, art. 22, inciso II — ver FONTES.md §1.
//
// TRÊS COISAS QUE ESTA REGRA NÃO É, e que erram quem lê rápido:
//
//   1. Não é sobre o ganho. É sobre o VALOR ALIENADO. Vender R$ 40.000 com
//      R$ 100 de lucro não é isento — passou do teto, e o ganho inteiro é
//      tributado, não só o que excedeu.
//   2. Não é por operação. É o SOMATÓRIO do mês. Três vendas de R$ 15.000 no
//      mesmo mês somam R$ 45.000 e nenhuma delas é isenta.
//   3. Não vale no exterior. Ver `exterior.js`, e FONTES.md §2.
//
// E não é o mesmo R$ 35.000 da DeCripto. Ver `decripto.js`.

import { REGIME } from './regime.js';

/** Lei 9.250/1995, art. 22, II. Em centavos. */
export const TETO_ISENCAO = 3_500_000;

/**
 * Aplica a isenção ao apurado de um mês, no regime nacional.
 *
 * Recebe as vendas já com ganho calculado; devolve o que é isento, o que é
 * tributável, e quanto ainda cabe no teto.
 *
 * O ganho negativo (prejuízo) não vira imposto nem quando o teto estoura —
 * imposto sobre ganho de capital não tem base negativa. O prejuízo aparece
 * separado porque a pessoa precisa vê-lo, mas não compensa ganho de capital de
 * mês nenhum: não existe compensação de prejuízo em ganho de capital de bens.
 */
export function aplicarIsencao(vendas) {
  const nacionais = vendas.filter((v) => v.regime === REGIME.NACIONAL);

  const alienado = nacionais.reduce((s, v) => s + v.valor, 0);
  const isento = alienado <= TETO_ISENCAO;

  const ganhos = nacionais.filter((v) => v.ganho > 0).reduce((s, v) => s + v.ganho, 0);
  const prejuizos = nacionais.filter((v) => v.ganho < 0).reduce((s, v) => s + v.ganho, 0);

  return {
    regime: REGIME.NACIONAL,
    alienado,
    teto: TETO_ISENCAO,
    isento,
    folga: Math.max(0, TETO_ISENCAO - alienado),
    excedente: Math.max(0, alienado - TETO_ISENCAO),
    ganhoBruto: ganhos,
    prejuizo: prejuizos,
    // quando isento, a base é zero mesmo havendo ganho — é esse o benefício
    baseTributavel: isento ? 0 : ganhos,
    fonte: 'Lei 9.250/1995, art. 22, II',
  };
}

/**
 * Quanto ainda cabe no teto deste mês.
 *
 * Existe separado de `aplicar` porque é a pergunta que a pessoa faz ANTES de
 * vender, e responder a ela não exige apurar ganho nenhum.
 *
 * ⚠️ Isto informa, não aconselha: diz quanto falta, nunca o que fazer com a
 * folga. A diferença entre as duas coisas é a diferença entre uma calculadora
 * e uma consultoria tributária, e isto aqui é uma calculadora.
 */
export function folgaDoMes(vendasNacionaisDoMes) {
  const alienado = vendasNacionaisDoMes.reduce((s, v) => s + v.valor, 0);
  return {
    alienado,
    teto: TETO_ISENCAO,
    folga: Math.max(0, TETO_ISENCAO - alienado),
    estourou: alienado > TETO_ISENCAO,
  };
}
