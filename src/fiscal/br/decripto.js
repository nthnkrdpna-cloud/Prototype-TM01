// DeCripto: a obrigação de INFORMAR. Não é imposto.
//
// IN RFB nº 2.291, de 14/11/2025 — ver FONTES.md §3.
//
// ⚠️ ESTE R$ 35.000 NÃO É O R$ 35.000 DA ISENÇÃO.
//
// Coincidem no valor e são opostos no gatilho:
//
//   isenção  → alienações em exchange NACIONAL. Passou do teto, PAGA imposto.
//   DeCripto → operações FORA de exchange nacional. Passou do teto, DECLARA.
//
// O mesmo mês pode ser isento e declarável, ou tributado e não declarável.
// Existe um teste em `prova/armadilhas.test.js` que falha se este arquivo e
// `isencao.js` derem a mesma resposta para as entradas em que eles têm de
// divergir. Se alguém um dia "simplificar" os dois num só, o teste cai.

/** IN RFB 2.291/2025. Em centavos. */
export const TETO_DECRIPTO = 3_500_000;

/**
 * As custódias cujas operações contam para o gatilho.
 *
 * É o complemento de `'nacional'`: a IN fala em operações não realizadas por
 * intermédio de exchange nacional. Exchange estrangeira e carteira própria
 * entram; exchange brasileira fica fora, porque ela mesma já reporta.
 */
export const CONTAM = ['exterior', 'autocustodia'];

/**
 * Este mês precisa de DeCripto?
 *
 * Conta TODA operação — compra, venda e transferência — e não só alienação.
 * É "operações", não "alienações", e essa palavra é a diferença entre
 * declarar e não declarar. Quem só somasse venda perderia o mês de quem
 * comprou R$ 50.000 em autocustódia e não vendeu nada.
 */
export function avaliarDecripto(operacoes) {
  const contadas = operacoes.filter((o) => CONTAM.includes(custodiaDe(o)));
  const somatorio = contadas.reduce((s, o) => s + valorDe(o), 0);

  return {
    obrigado: somatorio > TETO_DECRIPTO,
    somatorio,
    teto: TETO_DECRIPTO,
    quantidade: contadas.length,
    custodiasContadas: [...new Set(contadas.map(custodiaDe))],
    prazo: 'último dia útil do mês seguinte ao das operações',
    canal: 'e-CAC',
    fonte: 'IN RFB nº 2.291/2025',
    // dito aqui para não precisar ser lembrado lá na frente:
    alteraImposto: false,
  };
}

/** Transferência tem `de` e `para`; os dois lados contam se forem contáveis. */
function custodiaDe(op) {
  if (op.tipo === 'transferencia') {
    return CONTAM.includes(op.de) ? op.de : op.para;
  }
  return op.custodia;
}

/**
 * O valor que a operação leva para o somatório.
 *
 * Transferência não tem preço — não houve negócio. O que ela movimenta é
 * quantidade, e a IN pede o valor da operação. Usa-se o custo do que foi
 * movido, que é o único valor conhecido e verdadeiro; `avaliar` recebe esse
 * custo já calculado por `apuracao.js`.
 */
function valorDe(op) {
  return op.tipo === 'transferencia' ? (op.custo ?? 0) : op.valor;
}
