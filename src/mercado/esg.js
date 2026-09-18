// ESG: a pontuação só vale se o critério estiver à vista.
//
// Página 15 do Blueprint do Arquiteto — "não é apenas marketing, é dado
// quantificável".
//
// ⚠️ ESSA FRASE SÓ É VERDADE SOB UMA CONDIÇÃO, e ela é o módulo inteiro:
// **pontuação de sustentabilidade sem critério visível é marketing.** Um número
// de 0 a 100 chamado "ESG Score" não diz nada sozinho — agências diferentes dão
// notas diferentes à mesma empresa, com pesos que raramente publicam. Consumir
// esse número como se fosse medida é o oposto do que a página propõe.
//
// Então aqui não existe pontuação embutida. O módulo recebe **os critérios de
// quem está avaliando**, com os pesos, e faz a aritmética à vista. Quem define
// o que importa é quem vai investir — e o resultado carrega os critérios usados,
// para que outra pessoa possa discordar de forma específica.
//
// IFRS S1 e S2 (ISSB) entram como o que são: normas de **divulgação**. Elas
// padronizam o que a empresa conta, não estabelecem nota. A diferença entre
// "divulga conforme S1/S2" e "é sustentável" é a diferença entre ter a
// informação e ter o juízo.
//
// SEM REDE. Nada é buscado em agência de rating.

/** As normas de divulgação, com o que cada uma cobre — e o que não é. */
export const DIVULGACAO = [
  {
    norma: 'IFRS S1',
    oque: 'divulgação de riscos e oportunidades de sustentabilidade em geral',
    naoE: 'não é nota, não é selo, não classifica a empresa',
  },
  {
    norma: 'IFRS S2',
    oque: 'divulgação específica de clima, incluindo emissões',
    naoE: 'não é nota, não é selo, não classifica a empresa',
  },
];

/**
 * Pontua segundo os critérios de quem avalia — nunca segundo critérios meus.
 *
 * `criterios` é uma lista de `{ nome, peso, valor }`, com `valor` de 0 a 1.
 * Sem critérios, não há nota, e o motivo vem junto.
 */
export function pontuar(criterios) {
  if (!Array.isArray(criterios) || criterios.length === 0) {
    return {
      nota: null,
      criterios: [],
      porqueSemNota: 'Nenhum critério informado. Este módulo não traz pontuação '
        + 'embutida: pontuação sem critério visível é marketing, e é exatamente '
        + 'o que a ferramenta recusa ser.',
      divulgacao: DIVULGACAO,
    };
  }

  for (const c of criterios) {
    if (!c?.nome) throw new TypeError('critério sem nome');
    if (!Number.isFinite(c.peso) || c.peso <= 0) {
      throw new RangeError(`critério "${c.nome}" com peso não positivo`);
    }
    if (!Number.isFinite(c.valor) || c.valor < 0 || c.valor > 1) {
      throw new RangeError(`critério "${c.nome}" com valor fora de 0 a 1`);
    }
  }

  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0);
  const soma = criterios.reduce((s, c) => s + c.valor * c.peso, 0);

  return {
    nota: Math.round((soma / pesoTotal) * 1000) / 1000,
    // os critérios voltam INTEIROS no resultado: é o que permite outra pessoa
    // discordar de forma específica, em vez de discordar do número
    criterios: criterios.map((c) => ({
      nome: c.nome,
      peso: c.peso,
      valor: c.valor,
      participacao: Math.round((c.peso / pesoTotal) * 1000) / 1000,
    })),
    pesoTotal,
    divulgacao: DIVULGACAO,
    leitura: 'Nota calculada com os critérios acima, que são de quem avalia. '
      + 'Outra pessoa com outros pesos chega a outro número, e isso não é '
      + 'defeito — é o que torna a nota discutível em vez de oracular.',
  };
}

/**
 * Se a empresa divulga conforme S1 e S2 — que é fato, e não juízo.
 *
 * Existe separado de `pontuar` de propósito: divulgar é verificável, ser
 * sustentável é avaliação. Misturar os dois num campo só é como a informação
 * vira selo.
 */
export function divulga({ s1 = false, s2 = false } = {}) {
  return {
    s1,
    s2,
    completa: s1 && s2,
    oqueSignifica: 'Divulgar conforme IFRS S1 e S2 significa que a empresa CONTA '
      + 'certas coisas de um jeito padronizado. Não significa que essas coisas '
      + 'sejam boas.',
  };
}
