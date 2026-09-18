// Roda a lista de operações pela carteira e devolve o que aconteceu.
//
// Puro e sem país: aqui não existe isenção, alíquota nem declaração. Este
// módulo responde "o que foi vendido, quanto custou e quanto sobrou". Quem
// transforma isso em imposto é `fiscal/`.
//
// ORDEM IMPORTA, e importa muito. Custo médio é histórico: vender antes de
// comprar não é a mesma coisa que comprar antes de vender. Por isso as
// operações são ordenadas por data antes de rodar, e por isso o empate de data
// mantém a ordem em que a pessoa digitou — se ela listou a compra antes da
// venda no mesmo dia, foi isso que aconteceu, e inverter por conta própria
// inventaria um estouro de posição que não existiu.

import { novaCarteira, comprar, vender, transferir } from './carteira.js';

/**
 * Executa as operações e devolve um evento por operação.
 *
 * Cada evento carrega o que a operação realizou, para que nada depois precise
 * recalcular custo — recalcular é onde dois números divergem.
 */
export function apurar(operacoes) {
  const carteira = novaCarteira();
  const eventos = [];

  for (const op of ordenar(operacoes)) {
    switch (op.tipo) {
      case 'compra': {
        comprar(carteira, op);
        eventos.push({ ...op, custo: op.valor + (op.taxa ?? 0), ganho: 0 });
        break;
      }
      case 'venda': {
        const r = vender(carteira, op);
        eventos.push({ ...op, custo: r.custo, liquido: r.liquido, ganho: r.ganho });
        break;
      }
      case 'transferencia': {
        const r = transferir(carteira, op);
        // custo vai junto porque a DeCripto conta transferência pelo valor
        // movimentado, e o custo é o único valor real que ela tem
        eventos.push({ ...op, custo: r.custo, ganho: 0 });
        break;
      }
      default:
        throw new RangeError(`tipo de operação desconhecido: ${op.tipo}`);
    }
  }

  return { eventos, carteira };
}

/**
 * Por data, e estável no empate.
 *
 * `Array.prototype.sort` já é estável desde o ES2019, mas a estabilidade aqui
 * é requisito, não detalhe de implementação — então está escrita.
 */
export function ordenar(operacoes) {
  return operacoes
    .map((op, i) => ({ op, i }))
    .sort((a, b) => (a.op.data < b.op.data ? -1 : a.op.data > b.op.data ? 1 : a.i - b.i))
    .map(({ op }) => op);
}

/** Só as vendas. É o que a apuração de imposto olha. */
export const vendas = (eventos) => eventos.filter((e) => e.tipo === 'venda');
