// Análise fundamentalista: a leitura de uma entidade, não da apuração de alguém.
//
// Páginas 4 e 5 do Blueprint do Arquiteto.
//
// ⚠️ ESTE MÓDULO NÃO SE MISTURA COM A APURAÇÃO DE PESSOA FÍSICA, e a separação
// é de audiência, não de arrumação:
//
//   Resolução CVM 242 vincula **companhia aberta** — ela aprova o Documento de
//   Revisão de Pronunciamentos Técnicos nº 29 do CPC, para exercícios iniciados
//   em ou após 1º/01/2026. IFRS 9 é perda esperada de crédito; IFRS 16 é
//   arrendamento. Nada disso alcança quem declara imposto como pessoa física.
//
// Então o que este arquivo faz é outra coisa: lê os números que uma empresa
// PUBLICA e devolve indicadores. Serve a quem analisa antes de comprar, não a
// quem apura o que já vendeu.
//
// ⚠️ E INDICADOR NÃO É VEREDITO. A página 5 fala em "raio-x" que "separa
// empresas verdadeiras de ilusões de mercado". O que uma razão entre dois
// números do balanço faz é bem menos: ela resume. Um índice de alavancagem alto
// pode ser empresa em apuros ou empresa que acabou de captar para crescer, e o
// número é o mesmo nos dois casos. Por isso cada indicador vem com a faixa e
// **sem julgamento**.
//
// SEM REDE. Os balanços são digitados ou importados; nenhuma requisição sai.

/** As normas que este módulo diz respeitar, com o que cada uma alcança. */
export const NORMAS = [
  {
    norma: 'Resolução CVM 242',
    alcanca: 'companhia aberta',
    oque: 'aprova o Documento de Revisão de Pronunciamentos Técnicos nº 29 do CPC',
    vigencia: 'exercícios iniciados em ou após 1º/01/2026',
  },
  { norma: 'IFRS 9 / CPC 48', alcanca: 'entidade', oque: 'perda esperada de crédito' },
  { norma: 'IFRS 16 / CPC 06 (R2)', alcanca: 'entidade', oque: 'arrendamentos' },
  { norma: 'IFRS S1 e S2 (ISSB)', alcanca: 'entidade', oque: 'divulgação de sustentabilidade' },
];

/**
 * Os indicadores da página 5: alavancagem, margem operacional, patrimônio.
 *
 * Tudo em centavos inteiros, como o resto do projeto. Divisão por zero devolve
 * `null` e o motivo — nunca `Infinity`, que numa tela vira símbolo e num CSV
 * vira a palavra.
 */
export function indicadores({
  ativoTotal,
  passivoTotal,
  patrimonioLiquido,
  receitaLiquida,
  resultadoOperacional,
  dividaBruta = 0,
  caixa = 0,
}) {
  const razao = (a, b) => (b === 0 ? null : Math.round((a / b) * 10000) / 10000);

  const dividaLiquida = dividaBruta - caixa;

  return {
    // quanto de terceiro para cada real próprio
    alavancagem: {
      valor: razao(passivoTotal, patrimonioLiquido),
      formula: 'passivo total ÷ patrimônio líquido',
      semValor: patrimonioLiquido === 0 ? 'patrimônio líquido zero ou negativo' : null,
    },
    margemOperacional: {
      valor: razao(resultadoOperacional, receitaLiquida),
      formula: 'resultado operacional ÷ receita líquida',
      semValor: receitaLiquida === 0 ? 'sem receita no período' : null,
    },
    dividaLiquida: {
      valor: dividaLiquida,
      formula: 'dívida bruta − caixa',
      // negativo quer dizer caixa maior que dívida, e isso não é defeito
      caixaLiquido: dividaLiquida < 0,
    },
    participacaoDoPatrimonio: {
      valor: razao(patrimonioLiquido, ativoTotal),
      formula: 'patrimônio líquido ÷ ativo total',
      semValor: ativoTotal === 0 ? 'ativo total zero' : null,
    },

    // ⚠️ o campo que impede o resto de virar veredito
    leitura: 'Indicadores resumem, não julgam. Alavancagem alta pode ser aperto '
      + 'ou captação para crescer, e o número é o mesmo nos dois casos. O que '
      + 'separa os dois não está no balanço.',
    normas: NORMAS,
  };
}

/**
 * Confere se um conjunto de números fecha: ativo = passivo + patrimônio.
 *
 * É a primeira coisa a fazer com balanço digitado à mão, e a que ninguém faz.
 * Números que não fecham produzem indicadores perfeitamente calculáveis e
 * completamente falsos.
 */
export function fecha({ ativoTotal, passivoTotal, patrimonioLiquido }, tolerancia = 100) {
  const diferenca = ativoTotal - (passivoTotal + patrimonioLiquido);
  return {
    fecha: Math.abs(diferenca) <= tolerancia,
    diferenca,
    tolerancia,
    porque: 'ativo total tem de igualar passivo mais patrimônio líquido. Se não '
      + 'fecha, algum número foi digitado errado — e indicador sobre número '
      + 'errado sai calculável e falso.',
  };
}
