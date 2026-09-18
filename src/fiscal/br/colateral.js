// Empréstimo com criptoativo em garantia: liquidez sem alienar.
//
// Página 12 do Blueprint do Arquiteto, construída como pedida.
//
// A PREMISSA CENTRAL É SÓLIDA: empréstimo não é alienação, e sem alienação não
// há ganho de capital a apurar. Dar o ativo em garantia e tomar emprestado não
// realiza ganho nenhum — o ativo continua sendo seu, só está travado.
//
// ⚠️ MAS A FRASE "SEM VENDA, SEM IMPOSTO" É CURTA DEMAIS, e as três coisas que
// faltam nela estão no resultado deste módulo, não num rodapé que ninguém lê:
//
//   1. converter a stablecoin para real É alienação de criptoativo. O ganho
//      costuma ser perto de zero, porque ela foi adquirida no empréstimo e
//      convertida em seguida — mas é operação, e entra na conta do mês;
//   2. liquidação forçada realiza TUDO de uma vez, no pior momento possível e
//      sem caixa para o imposto que ela gera;
//   3. desde 1º/07/2026 a IN RFB nº 2.291/2025 exige detalhar operações em
//      DeFi. O que era opaco à fiscalização deixou de ser.
//
// O módulo simula. **Não conecta em protocolo nenhum, não assina transação e
// não executa nada** — não há requisição de rede em lugar algum desta
// ferramenta, e isso é requisito verificado no navegador.

import { CONTAM } from './decripto.js';
import { proporcao } from '../../nucleo/dinheiro.js';

/**
 * Simula o empréstimo colateralizado.
 *
 * `ltv` é a razão entre o emprestado e a garantia (*loan-to-value*), em fração:
 * 0,5 quer dizer emprestar metade do valor do colateral. `ltvLiquidacao` é o
 * ponto em que o protocolo liquida — acima dele a posição é vendida sozinha.
 */
export function simularColateral({
  valorDoColateral,
  custoDoColateral,
  ltv = 0.5,
  ltvLiquidacao = 0.8,
  jaAlienadoNoMes = 0,
}) {
  if (valorDoColateral <= 0) throw new RangeError('o colateral tem de valer mais que zero');
  if (!(ltv > 0 && ltv < 1)) throw new RangeError('o LTV tem de ficar entre 0 e 1');
  if (!(ltvLiquidacao > ltv && ltvLiquidacao <= 1)) {
    throw new RangeError('o LTV de liquidação tem de ser maior que o LTV tomado');
  }

  const emprestado = Math.round(valorDoColateral * ltv);

  // O preço em que o protocolo liquida: quando a dívida vira `ltvLiquidacao`
  // do colateral, ou seja, quando o colateral cai para `emprestado/ltvLiq`.
  const valorDeLiquidacao = Math.round(emprestado / ltvLiquidacao);
  const quedaAteLiquidar = 1 - valorDeLiquidacao / valorDoColateral;

  // Se liquidar, a venda forçada é do colateral inteiro pelo valor de
  // liquidação — e o ganho sai do custo original, não do que sobrou.
  const ganhoSeLiquidar = valorDeLiquidacao - custoDoColateral;

  return {
    valorDoColateral,
    emprestado,
    ltv,
    ltvLiquidacao,

    // o que a página 12 afirma, e é verdade: tomar o empréstimo não aliena
    aoTomar: {
      alienou: false,
      ganhoRealizado: 0,
      imposto: 0,
      porque: 'empréstimo com garantia não é alienação, e sem alienação não há '
        + 'ganho de capital a apurar',
    },

    // o que a frase curta esquece
    aoConverterParaReal: {
      alienou: true,
      valor: emprestado,
      ganhoEsperado: 'perto de zero — a stablecoin foi adquirida e convertida em seguida',
      contaNoMes: true,
      somaAoAlienado: jaAlienadoNoMes + emprestado,
      porque: 'converter stablecoin em real é alienação de criptoativo: o ganho é '
        + 'pequeno, mas a OPERAÇÃO entra na conta do mês',
    },

    seLiquidar: {
      valorDeLiquidacao,
      quedaNecessaria: Math.round(quedaAteLiquidar * 1000) / 10,   // em %
      ganhoRealizado: ganhoSeLiquidar,
      alienouTudoDeUmaVez: true,
      porque: 'a liquidação é venda forçada: realiza o ganho inteiro, no pior '
        + 'momento, e sem caixa reservado para o imposto que ela gera',
    },

    decripto: {
      conta: CONTAM.includes('exterior') || CONTAM.includes('autocustodia'),
      porque: 'operação em DeFi entra no detalhamento exigido pela IN RFB nº '
        + '2.291/2025, em vigor desde 1º/07/2026',
    },

    natureza: 'simulacao',
    executa: false,
    aviso: 'Simulação. Não conecta em protocolo, não assina transação e não '
      + 'executa nada. Decidir e executar é seu.',
  };
}

/**
 * Quanto o colateral pode cair antes de liquidar, dado um LTV.
 *
 * É a pergunta que decide se a operação é sensata, e é a que menos se faz.
 */
export function margemAteLiquidar(ltv, ltvLiquidacao = 0.8) {
  if (!(ltv > 0 && ltv < ltvLiquidacao)) return null;
  return Math.round((1 - ltv / ltvLiquidacao) * 1000) / 10;
}

/** A parte do colateral que corresponde a um valor emprestado. */
export const colateralPara = (emprestado, ltv) => proporcao(emprestado, 1000, Math.round(ltv * 1000));
