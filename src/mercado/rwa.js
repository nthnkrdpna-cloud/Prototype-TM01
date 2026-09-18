// Ativo do mundo real tokenizado: as perguntas que decidem se o lastro existe.
//
// Página 14 do Blueprint do Arquiteto.
//
// A PROMESSA DO RWA é que um token represente uma coisa que existe — um imóvel,
// um recebível, uma safra. O que muda tudo é onde a promessa se sustenta:
//
//   **Blockchain garante que o token é seu. Não garante que o lastro existe.**
//
// A rede prova que a transferência aconteceu e que ninguém gastou duas vezes.
// Ela não sai a campo conferir se o imóvel foi registrado, se o recebível foi
// cedido, nem se o emissor é solvente. Isso continua sendo problema de papel,
// de cartório e de auditor — exatamente como antes.
//
// Por isso este módulo NÃO pontua "qualidade" de um RWA. Ele faz as perguntas
// cuja resposta em branco é a informação: um lastro sem custodiante nomeado,
// sem auditoria e sem caminho de execução não é um ativo mal avaliado — é um
// ativo cuja avaliação não foi possível.
//
// SEM REDE. Nada aqui consulta blockchain, oráculo ou emissor.

/**
 * As perguntas, na ordem em que derrubam a tese mais rápido.
 *
 * `peso` não é nota: é o tamanho do buraco que a resposta em branco deixa.
 */
export const PERGUNTAS = [
  {
    chave: 'custodiante',
    pergunta: 'Quem guarda o ativo físico, e isso está registrado onde?',
    porque: 'sem custodiante nomeado, o token aponta para nada verificável',
    peso: 'estrutural',
  },
  {
    chave: 'auditoria',
    pergunta: 'Quem audita a existência do lastro, e com que frequência?',
    porque: 'lastro auditado uma vez na emissão não é lastro auditado',
    peso: 'estrutural',
  },
  {
    chave: 'execucao',
    pergunta: 'Se o emissor quebrar, como o detentor do token executa a garantia?',
    porque: 'é a pergunta que separa propriedade de promessa — e a que menos se faz',
    peso: 'estrutural',
  },
  {
    chave: 'jurisdicao',
    pergunta: 'Sob que jurisdição o lastro é disputado?',
    porque: 'token global, tribunal local: a execução acontece onde o bem está',
    peso: 'estrutural',
  },
  {
    chave: 'liquidez',
    pergunta: 'Existe mercado secundário, ou só a promessa de que haverá?',
    porque: 'iliquidez não é defeito, mas precificar como líquido o que não é, sim',
    peso: 'material',
  },
  {
    chave: 'oraculo',
    pergunta: 'Quem informa o preço do lastro na cadeia, e quem o fiscaliza?',
    porque: 'o oráculo é um ponto único de confiança dentro de um sistema que se '
      + 'vende como sem confiança',
    peso: 'material',
  },
];

/**
 * Avalia o que foi respondido — e, sobretudo, o que não foi.
 *
 * Devolve `avaliavel: false` quando falta qualquer pergunta estrutural. **Isso
 * não é uma nota baixa**, e a distinção é o ponto inteiro do módulo: nota baixa
 * diz "ruim"; não avaliável diz "não dá para saber", que é outra informação e
 * costuma ser a verdadeira.
 */
export function avaliar(respostas = {}) {
  const respondidas = PERGUNTAS.filter((p) => preenchida(respostas[p.chave]));
  const faltando = PERGUNTAS.filter((p) => !preenchida(respostas[p.chave]));
  const estruturaisFaltando = faltando.filter((p) => p.peso === 'estrutural');

  return {
    respondidas: respondidas.map((p) => p.chave),
    faltando: faltando.map((p) => ({ chave: p.chave, pergunta: p.pergunta, porque: p.porque })),
    avaliavel: estruturaisFaltando.length === 0,
    // sem nota: o módulo não pontua, e o campo explica a ausência
    nota: null,
    porqueSemNota: 'Este módulo não pontua RWA. Um número resumiria em uma escala '
      + 'coisas que não se somam — custódia, auditoria, execução e jurisdição são '
      + 'perguntas de sim ou não, e uma resposta em branco não vale "meio ponto".',
    leitura: estruturaisFaltando.length === 0
      ? 'As perguntas estruturais têm resposta. Conferir se as respostas são '
        + 'verdadeiras continua sendo trabalho de quem investe.'
      : `Faltam ${estruturaisFaltando.length} resposta(s) estrutural(is). Isto não `
        + 'é avaliação ruim: é avaliação impossível com o que há.',
    aviso: 'Blockchain garante que o token é seu. Não garante que o lastro existe.',
  };
}

const preenchida = (v) => typeof v === 'string' && v.trim() !== '';
