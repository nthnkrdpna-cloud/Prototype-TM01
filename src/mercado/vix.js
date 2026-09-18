// Volatilidade: a leitura do termômetro, e o que ela não diz.
//
// Página 8 do Blueprint do Arquiteto, "o Índice do Medo".
//
// O QUE O VIX É: a volatilidade **implícita** esperada para os trinta dias
// seguintes, extraída dos preços de opções do S&P 500. Ou seja — é o quanto o
// mercado está PAGANDO por proteção agora, não uma previsão de queda.
//
// ⚠️ ALTO NÃO QUER DIZER "VAI CAIR". Quer dizer que opções estão caras porque
// muita gente quer proteção ao mesmo tempo. Historicamente esses momentos
// coincidem com quedas já em curso — a leitura é **concomitante, não
// antecedente**. Um módulo que tratasse VIX alto como sinal de venda estaria
// lendo o termômetro como se fosse o remédio.
//
// ⚠️ E ELE MEDE O MERCADO AMERICANO. Aplicar a leitura a uma carteira de
// criptoativo ou de ação brasileira é analogia, não medida. A correlação
// existe e não é um. Está dito no resultado.
//
// SEM REDE. A página 8 fala em conexão à Cboe; aqui o valor é digitado ou
// importado. Nenhuma requisição sai desta ferramenta.

/**
 * As faixas, e de onde elas vêm.
 *
 * ⚠️ Estes cortes são **convenção de mercado, não derivação** — não descendem
 * de φ nem de norma nenhuma. Ficam nomeados e visíveis exatamente para não
 * parecerem calculados: a Ordem deste projeto proíbe número escolhido a olho
 * que se disfarce de número derivado. Este é escolhido, e diz que é.
 */
export const FAIXAS_VIX = [
  { ate: 12, nome: 'muito baixa', leitura: 'complacência — proteção barata, poucos a querendo' },
  { ate: 20, nome: 'normal', leitura: 'faixa em que o índice passa a maior parte do tempo' },
  { ate: 30, nome: 'elevada', leitura: 'tensão — o custo de proteção subiu' },
  { ate: Infinity, nome: 'extrema', leitura: 'pânico em curso, com proteção cara' },
];

/**
 * Lê um valor de volatilidade e devolve a faixa, com as ressalvas juntas.
 *
 * As ressalvas vão **no objeto**, não num rodapé: quem consumir isto numa tela
 * ou num CSV leva o aviso junto do número, que é onde ele serve.
 */
export function lerVolatilidade(valor) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new RangeError('a volatilidade tem de ser um número não negativo');
  }
  const faixa = FAIXAS_VIX.find((f) => valor <= f.ate);

  return {
    valor,
    faixa: faixa.nome,
    leitura: faixa.leitura,
    ressalvas: [
      'Volatilidade implícita não é previsão: mede o preço da proteção agora, '
        + 'não a direção do preço depois.',
      'A leitura é concomitante, não antecedente — o índice sobe junto com a '
        + 'queda, raramente antes dela.',
      'O VIX mede o mercado americano. Aplicar a carteira brasileira ou a '
        + 'criptoativo é analogia, não medida.',
    ],
    origemDasFaixas: 'convenção de mercado, não derivação',
  };
}

/**
 * Quanto reduzir de exposição conforme a volatilidade sobe.
 *
 * ⚠️ ISTO NÃO É RECOMENDAÇÃO DE ALOCAÇÃO. É a aritmética de uma regra que a
 * própria pessoa define: ela diz qual fração quer manter em cada faixa, e o
 * módulo faz a conta. Sem regra informada, não devolve número nenhum — porque
 * inventar a fração seria a ferramenta escolhendo risco por alguém.
 */
export function porFaixa(valor, regra) {
  const { faixa } = lerVolatilidade(valor);
  if (!regra || !(faixa in regra)) {
    return {
      faixa,
      fracao: null,
      porque: 'nenhuma regra informada para esta faixa — a ferramenta não '
        + 'inventa fração de exposição, porque isso seria escolher risco por você',
    };
  }
  const fracao = regra[faixa];
  if (!(fracao >= 0 && fracao <= 1)) throw new RangeError('a fração tem de ficar entre 0 e 1');
  return { faixa, fracao, porque: 'regra sua, aplicada à faixa lida' };
}
