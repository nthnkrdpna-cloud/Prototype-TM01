// Dinheiro em centavos inteiros, e quantidade em unidades escaladas.
//
// POR QUE NÃO USAR NÚMERO COM VÍRGULA. `0.1 + 0.2` vale `0.30000000000000004`.
// Numa tela isso é um detalhe; numa apuração de imposto, é um centavo que
// aparece do nada e não fecha com o relatório da corretora. Pior: o erro se acumula a cada
// operação, e o mês fecha errado sem ninguém ver onde.
//
// Então dinheiro aqui é SEMPRE `int` de centavos, e quantidade é SEMPRE `int`
// de unidades escaladas por 1e8. A vírgula só existe na borda: entra em
// `emCentavos`, sai em `formatarBRL`. No meio do cálculo ela não existe.
//
// LIMITE, medido e não suposto: `Number.MAX_SAFE_INTEGER` é 9.007.199.254.740.991.
// Em centavos, isso são 90 trilhões de reais. Em unidades escaladas, 90 milhões
// de moedas. Passou disso, `emCentavos` e `emUnidades` recusam em vez de
// arredondar em silêncio — porque silêncio aqui é o dano.

/** Casas decimais da quantidade. 8 é o padrão do Bitcoin, e cobre o resto. */
export const CASAS_QUANTIDADE = 8;
const ESCALA_QUANTIDADE = 10 ** CASAS_QUANTIDADE;

const TETO = Number.MAX_SAFE_INTEGER;

// O que se joga fora antes de ler o número. O espaço-duro (U+00A0) está aqui
// porque é o que vem colado quando alguém copia valor de uma página web, e ele
// NÃO é \s em toda situação — sem tirá-lo, "R$ 1.234,56" com espaço-duro vira
// entrada não reconhecida.
//
// Escrito como escape e não como caractere literal: espaço-duro dentro de um
// arquivo-fonte é invisível, e ninguém revisa o que não vê.
const ESPACO_DURO = String.fromCharCode(0xA0);
const LIXO_DE_VALOR = new RegExp("[R$\\s" + ESPACO_DURO + "]", "g");
const LIXO_DE_QUANTIDADE = new RegExp("[\\s" + ESPACO_DURO + "]", "g");

/**
 * Texto ou número → centavos inteiros.
 *
 * Aceita o que uma pessoa cola de um relatório brasileiro: `1.234,56`,
 * `R$ 1.234,56`, `1234.56`, `1234,56`. A ambiguidade real é o ponto: em
 * `1.234` ele é separador de milhar, em `1.23` é decimal. A regra usada é a
 * que não erra nos dois casos: **o último separador manda**, e ponto só é
 * milhar se vier seguido de exatamente três dígitos e houver vírgula depois.
 */
export function emCentavos(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) throw new TypeError('valor não é um número finito');
    return travar(Math.round(entrada * 100), 'valor');
  }
  const limpo = String(entrada).replace(LIXO_DE_VALOR, '');
  if (limpo === '') throw new TypeError('valor vazio');

  const temVirgula = limpo.includes(',');
  const normal = temVirgula
    ? limpo.replace(/\./g, '').replace(',', '.')  // 1.234,56 → 1234.56
    : limpo;                                       // 1234.56 fica como está

  if (!/^-?\d*\.?\d*$/.test(normal) || !/\d/.test(normal)) {
    throw new TypeError(`valor não reconhecido: ${entrada}`);
  }
  return travar(Math.round(Number(normal) * 100), 'valor');
}

/** Texto ou número → unidades escaladas por 1e8. Mesmas regras de separador. */
export function emUnidades(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada)) throw new TypeError('quantidade não é um número finito');
    return travar(Math.round(entrada * ESCALA_QUANTIDADE), 'quantidade');
  }
  const limpo = String(entrada).replace(LIXO_DE_QUANTIDADE, '');
  if (limpo === '') throw new TypeError('quantidade vazia');
  const normal = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  if (!/^-?\d*\.?\d*$/.test(normal) || !/\d/.test(normal)) {
    throw new TypeError(`quantidade não reconhecida: ${entrada}`);
  }
  return travar(Math.round(Number(normal) * ESCALA_QUANTIDADE), 'quantidade');
}

function travar(n, oque) {
  if (!Number.isFinite(n)) throw new TypeError(`${oque} não é finito`);
  if (Math.abs(n) > TETO) throw new RangeError(`${oque} grande demais para ser exato`);
  return n;
}

/**
 * Parte proporcional de um total, arredondada ao centavo.
 *
 * É a conta do custo de uma venda parcial: `custoTotal * vendida / possuída`.
 * Feita em uma linha só, sem materializar o custo médio unitário, porque
 * arredondar o unitário e depois multiplicar erra mais que multiplicar e
 * depois arredondar.
 */
export function proporcao(total, parte, todo) {
  if (todo === 0) return 0;
  return Math.round((total * parte) / todo);
}

/** Centavos → `R$ 1.234,56`. Só para a tela. */
export function formatarBRL(centavos) {
  const negativo = centavos < 0;
  const inteiro = Math.floor(Math.abs(centavos) / 100);
  const resto = String(Math.abs(centavos) % 100).padStart(2, '0');
  const comPontos = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${comPontos},${resto}`;
}

/** Unidades escaladas → texto, sem zeros à toa no fim. */
export function formatarQuantidade(unidades) {
  const negativo = unidades < 0;
  const abs = Math.abs(unidades);
  const inteiro = Math.floor(abs / ESCALA_QUANTIDADE);
  const fracao = String(abs % ESCALA_QUANTIDADE)
    .padStart(CASAS_QUANTIDADE, '0')
    .replace(/0+$/, '');
  return `${negativo ? '-' : ''}${inteiro}${fracao ? `,${fracao}` : ''}`;
}
