// Retrações e projeções de Fibonacci, sobre uma série que a pessoa importa.
//
// Página 8 do Blueprint do Arquiteto.
//
// ⚠️ O QUE ISTO É, DITO SEM MÍSTICA: são **linhas horizontais em frações de um
// movimento que já aconteceu**. Nada aqui prevê preço. O valor que têm é o de
// marcar, no gráfico, os pontos em que muita gente olha — e comportamento de
// muita gente olhando o mesmo ponto é a única coisa que essas linhas medem.
//
// Escrever mais que isso seria vender adivinhação. A página 7 do Blueprint diz
// a frase certa e ela fica: *"não é magia preditiva; é a prova matemática da
// repetitividade do comportamento humano."*
//
// ⚠️ E O 0,500 NÃO É RAZÃO DE FIBONACCI. É o retorno à metade, de Dow — entrou
// na lista por uso, não por derivação. Isto já está registrado em D53 e é
// repetido aqui porque a lista inteira costuma ser apresentada como se as seis
// frações tivessem a mesma origem, e não têm. Cada nível abaixo carrega de onde
// veio.
//
// SEM REDE. A página 8 fala em API da Cboe. Esta ferramenta não faz requisição
// nenhuma — os níveis são calculados sobre a série que a pessoa colar.

import { PHI } from '../ui/proporcao.js';

/**
 * Os níveis, cada um com a sua procedência.
 *
 * `fracao` é quanto do movimento o nível retrai. `origem` diz de onde a fração
 * vem, e é o campo que impede a lista de virar numerologia uniforme.
 */
export const NIVEIS = [
  { fracao: 0.236, origem: 'fibonacci', nota: 'φ⁻³, aproximadamente' },
  { fracao: 0.382, origem: 'fibonacci', nota: 'φ⁻², aproximadamente' },
  { fracao: 0.500, origem: 'dow', nota: 'retorno à metade — NÃO é razão de Fibonacci' },
  { fracao: 0.618, origem: 'fibonacci', nota: 'φ⁻¹, a razão áurea invertida' },
  { fracao: 0.786, origem: 'derivado', nota: '√0,618 — a raiz da razão áurea invertida' },
];

/** A projeção clássica, além do movimento inteiro. */
export const PROJECOES = [
  { fracao: 1.618, origem: 'fibonacci', nota: 'φ' },
  { fracao: 2.618, origem: 'fibonacci', nota: 'φ²' },
];

/**
 * As frações conferidas contra φ, e não copiadas de uma lista.
 *
 * A Ordem deste projeto proíbe número escolhido a olho. Estas três descendem de
 * φ por construção, e a função existe para que isso seja **conferível** em vez
 * de afirmado — há teste que compara a lista com o cálculo.
 */
export function derivadasDePhi() {
  return {
    0.382: Math.round((1 / PHI ** 2) * 1000) / 1000,
    0.618: Math.round((1 / PHI) * 1000) / 1000,
    0.786: Math.round(Math.sqrt(1 / PHI) * 1000) / 1000,
    1.618: Math.round(PHI * 1000) / 1000,
  };
}

/**
 * Retrações de um movimento de `inicio` a `fim`.
 *
 * Funciona nos dois sentidos: movimento de alta retrai para baixo, de baixa
 * retrai para cima. Quem decide o que é topo e o que é fundo é quem marcou os
 * dois pontos — a ferramenta não adivinha isso na série.
 */
export function retracoes(inicio, fim) {
  exigirNumero(inicio, 'início');
  exigirNumero(fim, 'fim');
  if (inicio === fim) throw new RangeError('início e fim iguais: não há movimento a retrair');

  const amplitude = fim - inicio;
  const alta = amplitude > 0;

  return {
    inicio,
    fim,
    amplitude,
    sentido: alta ? 'alta' : 'baixa',
    niveis: NIVEIS.map(({ fracao, origem, nota }) => ({
      fracao,
      origem,
      nota,
      // retrai a partir do fim, de volta na direção do início
      preco: arredondar(fim - amplitude * fracao),
    })),
    projecoes: PROJECOES.map(({ fracao, origem, nota }) => ({
      fracao,
      origem,
      nota,
      preco: arredondar(inicio + amplitude * fracao),
    })),
    aviso: 'Linhas em frações de um movimento passado. Não preveem preço, e '
      + 'o nível 0,500 não é razão de Fibonacci.',
  };
}

/**
 * O maior e o menor de uma série, com as posições.
 *
 * É o que se usa para sugerir o movimento a marcar — **sugerir**, porque
 * extremo de janela não é topo nem fundo de tendência, e confundir os dois é o
 * jeito mais rápido de traçar retração sobre movimento que não existiu.
 */
export function extremos(serie) {
  if (!Array.isArray(serie) || serie.length < 2) {
    throw new RangeError('a série precisa de ao menos dois pontos');
    }
  let min = { valor: Infinity, i: -1 };
  let max = { valor: -Infinity, i: -1 };
  serie.forEach((v, i) => {
    exigirNumero(v, `ponto ${i}`);
    if (v < min.valor) min = { valor: v, i };
    if (v > max.valor) max = { valor: v, i };
  });
  return {
    minimo: min,
    maximo: max,
    // a ordem em que apareceram diz se a janela subiu ou caiu
    sentidoDaJanela: max.i > min.i ? 'alta' : 'baixa',
    aviso: 'Extremos da janela importada, não topo e fundo de tendência.',
  };
}

const arredondar = (v) => Math.round(v * 100) / 100;

function exigirNumero(v, nome) {
  if (!Number.isFinite(v)) throw new TypeError(`${nome} não é um número finito`);
}
