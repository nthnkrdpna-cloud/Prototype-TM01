// Criptoativo custodiado no exterior: 15%, e nenhuma isenção mensal.
//
// Lei nº 14.754/2023, regulamentada pela **IN RFB nº 2.180, de 11/03/2024**.
// Ver FONTES.md §2.
//
// A IN é o regulamento da lei para pessoa física, e traz duas regras que a lei
// sozinha não dava: a compensação é **a valor nominal**, sem correção monetária
// de nenhuma natureza (art. 11), e o rendimento entra no ano-calendário em que
// é **efetivamente percebido** — regime de caixa, não de competência.
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

  // No regime do exterior o prejuízo compensa o ganho dentro do MESMO PERÍODO
  // DE APURAÇÃO — é rendimento de aplicação financeira, não ganho de capital de
  // bem avulso. É a diferença de tratamento que mais surpreende quem vem do
  // regime nacional.
  //
  // ⚠️ E NÃO ATRAVESSA O ANO. A IN RFB 2.180/2024 manda compensar dentro do
  // período; o que sobrar vai contra lucros de controladas declaradas na MESMA
  // DAA, nunca contra lucro de ano seguinte.
  //
  // Isto está escrito porque a afirmação contrária circula — um documento de
  // especificação deste projeto afirmava, com o número da IN do lado, que o
  // motor compensaria perdas "contra lucros futuros". Não compensa. Quem
  // implementasse assim faria a ferramenta apurar imposto A MENOS na declaração
  // de outra pessoa, que é o dano mais caro que este código pode causar.
  //
  // Há teste em `prova/armadilhas.test.js` que falha se alguém fizer prejuízo
  // atravessar o ano.
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
    // a compensação vale dentro deste período e não passa para o seguinte
    compensacao: 'mesmo periodo de apuracao',
    correcaoDaPerda: 'valor nominal, sem correcao (IN RFB 2.180/2024, art. 11)',
    momento: 'regime de caixa — o ano em que o rendimento é efetivamente percebido',
    fonte: 'Lei 14.754/2023, regulamentada pela IN RFB nº 2.180/2024',
  };
}
