// O imposto sobre ganho de capital, no regime nacional.
//
// Lei nº 13.259/2016, art. 1º — em vigor desde 1º/01/2017.
//
// ⚠️ AS FAIXAS SÃO MARGINAIS, E ESTE É O ERRO FÁCIL DE COMETER.
//
// A lei diz "sobre a PARCELA dos ganhos que exceder" — ou seja, cada faixa
// incide só sobre o pedaço do ganho que cai dentro dela, como o imposto de
// renda da folha. Não é um degrau que muda a alíquota do total.
//
// A diferença é enorme e aparece já no primeiro real acima de R$ 5 milhões:
//
//   marginal (certo)  R$ 5.000.001 → 5.000.000 × 15% + 1 × 17,5% = R$ 750.000,18
//   único   (errado)  R$ 5.000.001 → 5.000.001 × 17,5%           = R$ 875.000,18
//
// Cento e vinte e cinco mil reais de diferença por causa de um real a mais. Um
// sistema que aplicasse alíquota única ao total puniria quem cruzou a faixa por
// pouco, e o resultado pareceria plausível na tela.
//
// Há teste que falha se alguém trocar isto por uma alíquota só.

/**
 * Faixa: até `ate` CENTAVOS de ganho, paga `aliquota`. A última é aberta.
 *
 * Os tetos estão em centavos, como todo dinheiro deste projeto — R$ 5 milhões
 * são 500.000.000 de centavos. A primeira versão deste arquivo escreveu
 * `500_000_000_00`, que é R$ 500 milhões: **cem vezes o valor certo**, e o
 * efeito era pôr todo mundo na primeira faixa para sempre. Os separadores de
 * milhar do JavaScript deixam esse erro invisível a olho nu, e foi o teste das
 * faixas somadas que pegou.
 */
export const FAIXAS = [
  { ate: 500_000_000, aliquota: 0.15 },     // até R$ 5 milhões
  { ate: 1_000_000_000, aliquota: 0.175 },  // de R$ 5 a 10 milhões
  { ate: 3_000_000_000, aliquota: 0.20 },   // de R$ 10 a 30 milhões
  { ate: Infinity, aliquota: 0.225 },       // acima de R$ 30 milhões
];

/** A alíquota da primeira faixa, que é a que alcança quase todo mundo. */
export const ALIQUOTA_GANHO_NACIONAL = FAIXAS[0].aliquota;

/**
 * O imposto de um ganho, somando faixa por faixa.
 *
 * Ganho zero ou negativo não gera imposto — prejuízo não tem base negativa, e
 * ganho de capital de bem não compensa prejuízo de mês nenhum.
 */
export function impostoSobreGanho(ganho) {
  if (!Number.isFinite(ganho) || ganho <= 0) return 0;

  let imposto = 0;
  let piso = 0;
  for (const { ate, aliquota } of FAIXAS) {
    if (ganho <= piso) break;
    const parcela = Math.min(ganho, ate) - piso;
    imposto += parcela * aliquota;
    piso = ate;
  }
  return Math.round(imposto);
}

/**
 * O detalhe faixa a faixa, para a tela poder mostrar de onde veio o número.
 *
 * Existe porque um imposto de seis dígitos sem explicação é um número que a
 * pessoa não tem como conferir — e conferir é do contribuinte.
 */
export function detalharGanho(ganho) {
  if (!Number.isFinite(ganho) || ganho <= 0) {
    return { ganho: Math.max(0, ganho || 0), imposto: 0, faixas: [] };
  }
  const faixas = [];
  let piso = 0;
  for (const { ate, aliquota } of FAIXAS) {
    if (ganho <= piso) break;
    const parcela = Math.min(ganho, ate) - piso;
    faixas.push({
      de: piso,
      ate: ate === Infinity ? null : ate,
      parcela,
      aliquota,
      imposto: Math.round(parcela * aliquota),
    });
    piso = ate;
  }
  return {
    ganho,
    imposto: impostoSobreGanho(ganho),
    faixas,
    // a alíquota que a pessoa "sentiu", que não é a da faixa em que ela caiu
    aliquotaEfetiva: Math.round((impostoSobreGanho(ganho) / ganho) * 10000) / 10000,
    fonte: 'Lei 13.259/2016, art. 1º',
  };
}
