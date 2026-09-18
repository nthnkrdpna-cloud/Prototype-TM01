// A régua. Nenhuma medida desta interface é escolhida a olho.
//
// φ = (1 + √5) / 2. Toda dimensão sai de `escala(n) = φ^(n/2)`, e o passo é
// meio expoente porque φ inteiro cresce rápido demais para tipografia: de 16px
// para 26px num degrau só não dá sub-título, dá salto. A raiz de φ (≈1,272) dá
// a escada que falta.
//
// É o PASSO 1 da especificação — "layouts, paddings, tipografia, dimensões e
// eixos calculados com base na Proporção Áurea" — e é a única parte dela que
// não precisou ser inventada: a mesma régua já existia no projeto maior.
//
// ⚠️ O QUE ISTO NÃO PROVA. Olhando um número solto — 20,6px — ninguém deduz que
// ele é `16 × φ^(1/2)`. A derivação não é recuperável de fora. Isto é uma regra
// de projeto que nós cumprimos, não uma propriedade verificável por terceiros,
// e dizer o contrário seria vender o que não se entrega.

export const PHI = (1 + Math.sqrt(5)) / 2;   // 1.618033988749895

/** O corpo de texto, em px. Tudo cresce e diminui a partir daqui. */
export const BASE = 16;

/** φ^(n/2). `escala(0) = 1`, `escala(2) = φ`, `escala(-2) = 1/φ`. */
export const escala = (n) => PHI ** (n / 2);

/** Uma medida em px, arredondada ao décimo — abaixo disso a tela não mostra. */
export const px = (n) => Math.round(BASE * escala(n) * 10) / 10;

/** Os degraus que a interface usa. Fora desta lista, não existe medida. */
export const DEGRAUS = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * As variáveis CSS, geradas a partir da régua.
 *
 * O CSS não sabe calcular φ, então quem calcula é isto, e o CSS só consome. É o
 * que torna "toda medida vem de φ" uma afirmação conferível: some esta função,
 * some toda medida da página.
 */
export function variaveis() {
  const linhas = DEGRAUS.map((n) => `  --e${n < 0 ? `m${-n}` : n}: ${px(n)}px;`);
  return `:root{\n${linhas.join('\n')}\n  --phi: ${PHI};\n}`;
}

/** O nome da variável de um degrau, para quem monta estilo em JS. */
export const varDe = (n) => `var(--e${n < 0 ? `m${-n}` : n})`;
