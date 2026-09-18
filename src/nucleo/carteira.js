// A carteira: custo médio por ativo, por lugar onde o ativo está.
//
// POR QUE O CUSTO É POR (ATIVO, CUSTÓDIA), e não só por ativo. Os dois regimes
// tributários — o nacional e o do exterior — são apurados separados. Se o custo
// fosse um só, uma compra no exterior rebaixaria o custo médio do que está aqui,
// e a apuração nacional sairia com ganho inflado. São caixas diferentes porque
// a lei os trata como caixas diferentes.
//
// E POR QUE TRANSFERÊNCIA NÃO É VENDA. Tirar da exchange e mandar para a
// carteira própria não realiza ganho nenhum — não houve alienação. Mas o custo
// tem de ir junto com a moeda, senão o custo fica onde a moeda não está e a
// venda futura apura errado. Por isso `transferir` move quantidade E custo, na
// proporção exata, e devolve ganho zero.
//
// O que este módulo NÃO faz: não sabe de imposto, não sabe de isenção, não sabe
// de país. Ele responde "quanto custou o que você vendeu". O resto é `fiscal/`.

import { proporcao } from './dinheiro.js';

/** Onde o ativo está. A custódia é estrutura, não etiqueta — ver FONTES.md §2. */
export const CUSTODIAS = ['nacional', 'exterior', 'autocustodia'];

// Byte zero como separador da chave: o código do ativo vem do que a pessoa
// digitou e pode conter quase qualquer coisa, então um separador comum ('|',
// ':') poderia aparecer dentro dele e colar duas posições diferentes numa só.
// Escrito por código, não como caractere literal, para o arquivo não virar
// binário aos olhos do git e do grep.
const SEPARADOR_DE_CHAVE = String.fromCharCode(0);
const chave = (ativo, custodia) => ativo + SEPARADOR_DE_CHAVE + custodia;

export function novaCarteira() {
  return { posicoes: new Map() };
}

function posicao(carteira, ativo, custodia) {
  const k = chave(ativo, custodia);
  let p = carteira.posicoes.get(k);
  if (!p) {
    p = { ativo, custodia, quantidade: 0, custoTotal: 0 };
    carteira.posicoes.set(k, p);
  }
  return p;
}

/**
 * Compra: soma quantidade e soma custo.
 *
 * A taxa entra no custo, e isso não é escolha estética: a taxa paga para
 * adquirir faz parte do custo de aquisição, então ela reduz o ganho lá na
 * frente. Quem não somar a taxa paga imposto sobre ela.
 */
export function comprar(carteira, { ativo, custodia, quantidade, valor, taxa = 0 }) {
  exigirCustodia(custodia);
  if (quantidade <= 0) throw new RangeError('compra com quantidade não positiva');
  const p = posicao(carteira, ativo, custodia);
  p.quantidade += quantidade;
  p.custoTotal += valor + taxa;
  return p;
}

/**
 * Venda: devolve o custo da parte vendida e o ganho.
 *
 * A taxa de venda sai do valor recebido — também não é escolha: o ganho é o
 * que entrou no bolso, e a corretora ficou com a taxa.
 */
export function vender(carteira, { ativo, custodia, quantidade, valor, taxa = 0 }) {
  exigirCustodia(custodia);
  if (quantidade <= 0) throw new RangeError('venda com quantidade não positiva');
  const p = posicao(carteira, ativo, custodia);
  if (quantidade > p.quantidade) {
    throw new RangeError(
      `venda de ${ativo} maior que a posição em ${custodia}: ` +
      `${quantidade} pedidos, ${p.quantidade} disponíveis`,
    );
  }

  const custo = proporcao(p.custoTotal, quantidade, p.quantidade);
  p.quantidade -= quantidade;
  p.custoTotal -= custo;
  // zera resíduo: sem isto, sobra um centavo de custo numa posição vazia, e ele
  // reaparece como prejuízo fantasma na próxima compra do mesmo ativo
  if (p.quantidade === 0) p.custoTotal = 0;

  const liquido = valor - taxa;
  return { custo, liquido, ganho: liquido - custo };
}

/**
 * Transferência entre custódias. Move moeda e custo juntos. Ganho: nenhum.
 *
 * Isto existe porque o caso é comum e o erro é caro: quem compra na exchange
 * nacional, manda para a carteira fria e vende lá na frente teria, sem isto,
 * uma venda sem custo — ou seja, ganho igual ao valor inteiro.
 */
export function transferir(carteira, { ativo, de, para, quantidade }) {
  exigirCustodia(de);
  exigirCustodia(para);
  if (de === para) throw new RangeError('transferência para a mesma custódia');
  if (quantidade <= 0) throw new RangeError('transferência com quantidade não positiva');

  const origem = posicao(carteira, ativo, de);
  if (quantidade > origem.quantidade) {
    throw new RangeError(
      `transferência de ${ativo} maior que a posição em ${de}: ` +
      `${quantidade} pedidos, ${origem.quantidade} disponíveis`,
    );
  }
  const custo = proporcao(origem.custoTotal, quantidade, origem.quantidade);
  origem.quantidade -= quantidade;
  origem.custoTotal -= custo;
  if (origem.quantidade === 0) origem.custoTotal = 0;

  const destino = posicao(carteira, ativo, para);
  destino.quantidade += quantidade;
  destino.custoTotal += custo;
  return { custo, ganho: 0 };
}

/** A posição de um ativo num lugar. Só leitura. */
export function saldo(carteira, ativo, custodia) {
  const p = carteira.posicoes.get(chave(ativo, custodia));
  return p
    ? { ativo, custodia, quantidade: p.quantidade, custoTotal: p.custoTotal }
    : { ativo, custodia, quantidade: 0, custoTotal: 0 };
}

/** Tudo que a carteira tem, sem as posições zeradas. */
export function posicoes(carteira) {
  return [...carteira.posicoes.values()]
    .filter((p) => p.quantidade > 0)
    .map((p) => ({ ...p }));
}

function exigirCustodia(c) {
  if (!CUSTODIAS.includes(c)) {
    throw new RangeError(`custódia desconhecida: ${c}. Use uma de ${CUSTODIAS.join(', ')}`);
  }
}
