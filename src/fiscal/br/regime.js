// Onde o ativo estava → qual regime tributário se aplica.
//
// Este arquivo é pequeno e é o mais perigoso do projeto. Ele é o único lugar
// onde "custódia" vira "regime", e um erro aqui não aparece como erro: aparece
// como um número plausível e errado.
//
// Cada linha abaixo diz se é FATO (está na norma) ou INTERPRETAÇÃO (é leitura,
// e existe divergência). A tela mostra qual interpretação usou. Ver FONTES.md.

/** Os dois regimes. Não há um terceiro. */
export const REGIME = {
  NACIONAL: 'nacional',   // Lei 9.250/1995 art. 22 — isenção mensal de R$ 35.000
  EXTERIOR: 'exterior',   // Lei 14.754/2023 — 15%, sem isenção mensal
};

/**
 * O mapa, com a marca de cada linha.
 *
 * `autocustodia` é a única que não é fato. A Lei 14.754/2023 alcança
 * *aplicações financeiras no exterior*; cripto na carteira própria não é
 * aplicação, nem está no exterior por estar fora de exchange. A leitura
 * corrente é que segue o regime geral — e portanto a isenção do art. 22 vale.
 *
 * Há tributarista que discorda. Por isso está marcado, e por isso a tela diz.
 */
export const MAPA = {
  nacional:     { regime: REGIME.NACIONAL, certeza: 'fato' },
  exterior:     { regime: REGIME.EXTERIOR, certeza: 'fato' },
  autocustodia: { regime: REGIME.NACIONAL, certeza: 'interpretacao' },
};

export function regimeDe(custodia) {
  const m = MAPA[custodia];
  if (!m) throw new RangeError(`custódia sem regime definido: ${custodia}`);
  return m.regime;
}

/** `'fato'` ou `'interpretacao'` — para a tela avisar quando for o segundo. */
export function certezaDe(custodia) {
  const m = MAPA[custodia];
  if (!m) throw new RangeError(`custódia sem regime definido: ${custodia}`);
  return m.certeza;
}

/** As custódias cujo regime é interpretação, não fato. A tela lista estas. */
export const INTERPRETADAS = Object.keys(MAPA).filter((c) => MAPA[c].certeza === 'interpretacao');
