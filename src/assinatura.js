// A assinatura: cada apuração fechada ganha o seu próprio sigilo.
//
// O PEDIDO. "A interface deve conter os sigilos e utilizar dos motores
// anteriores, tornando nossa assinatura válida e persistente dentro do uso que
// se for feito." O jeito de fazer isso sem virar enfeite é dar FUNÇÃO ao
// sigilo: ele não decora a apuração, ele a identifica.
//
// COMO. O conteúdo da apuração — mês, ativos, valores, custódias, base
// tributável — vira um código de 32 bits. O mesmo mês fechado devolve sempre o
// mesmo código; um centavo diferente devolve outro. O código escolhe a peça.
//
// O QUE ISSO DÁ, e é útil de verdade: dois resumos do mesmo mês com desenhos
// diferentes são dois cálculos diferentes, e dá para ver isso de relance, sem
// conferir número por número. É uma soma de verificação que uma pessoa
// enxerga.
//
// ⚠️ O QUE ISSO NÃO É. Não é proteção, não impede cópia, não detecta nada e não
// resiste a quem queira forjar: o código é derivado de dados públicos por uma
// função pública. É identidade e procedência, não tranca. A marca de
// procedência real das peças publicadas é outra coisa, mora no repositório
// privado e não vem para cá.

// AS PEÇAS. A fatia aberta tem 100 SVG em `samples/open-set/`, já publicados e
// já licenciados. O sigilo da apuração é escolhido entre eles — nenhum motor de
// desenho roda aqui, e nenhum código de desenho precisa estar aqui.
//
// É a montagem que respeita o voto registrado da Amanda sobre manter o código
// fechado e, ainda assim, põe a assinatura dentro da ferramenta. Se essa decisão
// mudar, troca-se a origem das peças por um gerador e o resto continua igual.

/**
 * Código de 32 bits do conteúdo de uma apuração.
 *
 * FNV-1a de 32 bits: pequeno, sem dependência, e determinístico entre
 * máquinas. Não é criptográfico e não precisa ser — o que se quer é que
 * conteúdos diferentes deem códigos diferentes, não que ninguém consiga
 * construir uma colisão de propósito.
 */
export function codigoDe(apuracao) {
  const texto = canonizar(apuracao);
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Separador dos campos do texto canônico.
 *
 * Escrito assim, e não como caractere literal, porque um byte zero dentro de um
 * arquivo-fonte faz o git tratá-lo como binário e o grep se recusar a lê-lo.
 * Foi o que aconteceu na primeira versão deste arquivo.
 */
const SEPARADOR_CANONICO = String.fromCharCode(0);

/**
 * O texto canônico de uma apuração.
 *
 * "Canônico" aqui tem de ser levado a sério: se a mesma apuração puder gerar
 * dois textos, ela gera dois sigilos, e o sigilo deixa de significar qualquer
 * coisa. Por isso as chaves entram em ordem fixa e os números entram como
 * inteiros — nada de `JSON.stringify` de objeto, cuja ordem depende de como o
 * objeto foi montado.
 */
export function canonizar(a) {
  const partes = [
    `mes=${a.mes}`,
    `alienado=${a.nacional.alienado}`,
    `isento=${a.nacional.isento ? 1 : 0}`,
    `base=${a.nacional.baseTributavel}`,
    `ext.alienado=${a.exterior.alienado}`,
    `ext.base=${a.exterior.baseTributavel}`,
    `ext.imposto=${a.exterior.imposto}`,
    `decripto=${a.decripto.obrigado ? 1 : 0}`,
    `decripto.soma=${a.decripto.somatorio}`,
    `ops=${a.operacoes}`,
  ];
  return partes.join(SEPARADOR_CANONICO);
}

/** O código em hexadecimal, com oito dígitos. É o que vai impresso. */
export const codigoHex = (codigo) => codigo.toString(16).padStart(8, '0').toUpperCase();

/**
 * Qual peça da fatia aberta representa esta apuração.
 *
 * Os 100 arquivos são `OPEN-A-001` … `OPEN-C-0NN`. A distribuição entre os três
 * prefixos não é uniforme no disco, então a escolha usa o índice global e
 * consulta a lista real — chutar o prefixo pelo resto da divisão daria nome de
 * arquivo que não existe.
 */
export function pecaDe(codigo, catalogo) {
  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    throw new RangeError('catálogo de peças vazio');
  }
  return catalogo[codigo % catalogo.length];
}

/**
 * A assinatura completa de uma apuração: o código e a peça.
 *
 * `catalogo` é a lista de nomes de arquivo da fatia aberta. Quem chama passa a
 * lista porque este módulo não lê disco nem rede — é puro, e por isso testável
 * sem montar um ambiente.
 */
export function assinar(apuracao, catalogo) {
  const codigo = codigoDe(apuracao);
  return {
    codigo,
    hex: codigoHex(codigo),
    peca: pecaDe(codigo, catalogo),
    mes: apuracao.mes,
    // dito no próprio objeto, para não se perder quando isto virar CSV:
    natureza: 'identificacao',
    aviso: 'Identifica a apuração. Não é prova, não é proteção, não impede cópia.',
  };
}

/**
 * O rodapé que vai nos arquivos exportados.
 *
 * Existe aqui, e não na camada de tela, porque é assinatura: se cada formato de
 * exportação escrevesse o seu, eles divergiriam, e um documento diria uma coisa
 * e o outro, outra.
 */
export function rodape(assinatura) {
  return [
    `Apuração ${assinatura.mes} · código ${assinatura.hex} · sigilo ${assinatura.peca}`,
    'Prototype-TM01 — Nthnkr "dpna" e AmandaBT',
    'Conferência de valores é do contribuinte. Isto não é orientação tributária.',
  ];
}
