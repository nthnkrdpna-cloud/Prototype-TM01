// Criptoativo custodiado no exterior: 15%, e nenhuma isenção mensal.
//
// Lei nº 14.754/2023 — ver FONTES.md §2.
//
// ⚠️ ESTE É O ARQUIVO QUE EXISTE PARA IMPEDIR O ERRO MAIS CARO DA FERRAMENTA.
//
// O teto de R$ 35.000 do regime nacional NÃO alcança o exterior. Uma ferramenta
// que aplicasse os dois juntos diria a alguém que vendeu R$ 30.000 na Binance
// que ele não deve nada — quando ele deve 15% do ganho. O usuário confia, não
// paga, e descobre depois com multa e juros.
//
// Por isso não existe, em lugar nenhum deste arquivo, um caminho que devolva
// isenção. Não é uma condição que pode dar errado: é a ausência da condição.

import { REGIME } from './regime.js';

/** Lei 14.754/2023. 15% sobre o rendimento. */
export const ALIQUOTA_EXTERIOR = 0.15;

/**
 * Aplica o regime do exterior às vendas de um período.
 *
 * Apuração ANUAL, não mensal — a lei manda apurar na Declaração de Ajuste.
 * Por isso o resultado carrega o ano, e o agregado mensal existe só para a
 * pessoa acompanhar; o imposto fecha no ano.
 */
export function aplicarExterior(vendas) {
  const doExterior = vendas.filter((v) => v.regime === REGIME.EXTERIOR);

  const alienado = doExterior.reduce((s, v) => s + v.valor, 0);
  const ganhos = doExterior.filter((v) => v.ganho > 0).reduce((s, v) => s + v.ganho, 0);
  const prejuizos = doExterior.filter((v) => v.ganho < 0).reduce((s, v) => s + v.ganho, 0);

  // No regime do exterior o prejuízo compensa o ganho dentro do mesmo ano —
  // é rendimento de aplicação financeira, não ganho de capital de bem avulso.
  // É a diferença de tratamento que mais surpreende quem vem do regime nacional.
  const base = Math.max(0, ganhos + prejuizos);

  return {
    regime: REGIME.EXTERIOR,
    alienado,
    // dito explicitamente, para ninguém procurar o campo e concluir que sumiu:
    isento: false,
    teto: null,
    ganhoBruto: ganhos,
    prejuizo: prejuizos,
    baseTributavel: base,
    aliquota: ALIQUOTA_EXTERIOR,
    imposto: Math.round(base * ALIQUOTA_EXTERIOR),
    apuracao: 'anual',
    fonte: 'Lei 14.754/2023',
  };
}
