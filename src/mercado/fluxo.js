// Order flow: delta, absorção, POC e área de valor.
//
// Página 9 do Blueprint do Arquiteto.
//
// O QUE ISTO MEDE, e é bem menos do que costuma ser vendido: uma vela comum diz
// abertura, máxima, mínima e fechamento. Ela **não diz a que preço o volume foi
// negociado por dentro**. O footprint diz — e é só isso. O resto é leitura.
//
// ⚠️ ABSORÇÃO NÃO É CERTEZA DE REVERSÃO. Volume alto com preço parado significa
// que houve muita negociação sem o preço andar; a explicação usual é que alguém
// grande absorveu a pressão do outro lado. **É uma explicação plausível, não um
// fato observado** — não dá para ver quem estava do outro lado. A página 9 fala
// em "baleias"; o que os números mostram é volume e imobilidade de preço, e
// quem chama isso de baleia está interpretando.
//
// Por isso `absorcao()` devolve um indício com força medida, nunca um sinal.
//
// SEM REDE. Calcula sobre a série que a pessoa importar.

/**
 * Delta líquido: comprado menos vendido.
 *
 * Positivo quer dizer que mais volume saiu na ponta compradora — agressão de
 * compra. É a medida mais direta do módulo, e a menos interpretativa.
 */
export function delta(niveis) {
  exigirNiveis(niveis);
  const comprado = niveis.reduce((s, n) => s + n.compra, 0);
  const vendido = niveis.reduce((s, n) => s + n.venda, 0);
  const total = comprado + vendido;
  return {
    comprado,
    vendido,
    delta: comprado - vendido,
    total,
    // o delta em proporção do volume, que é o que compara vela com vela
    deltaRelativo: total === 0 ? 0 : Math.round(((comprado - vendido) / total) * 1000) / 1000,
  };
}

/**
 * POC — o preço em que mais volume foi negociado.
 *
 * Empate resolve pelo preço mais baixo, e a escolha é arbitrária: está aqui
 * declarada para o resultado ser determinístico, não porque o preço mais baixo
 * signifique alguma coisa.
 */
export function poc(niveis) {
  exigirNiveis(niveis);
  let melhor = null;
  for (const n of niveis) {
    const v = n.compra + n.venda;
    if (!melhor || v > melhor.volume || (v === melhor.volume && n.preco < melhor.preco)) {
      melhor = { preco: n.preco, volume: v };
    }
  }
  return melhor;
}

/**
 * Área de valor: a faixa que concentra `parte` do volume, ao redor do POC.
 *
 * 70% é o valor usual, herdado do Market Profile — **e é convenção, não
 * derivação**. Está como parâmetro por isso, e o padrão vem declarado.
 */
export const PARTE_PADRAO = 0.70;

export function areaDeValor(niveis, parte = PARTE_PADRAO) {
  exigirNiveis(niveis);
  if (!(parte > 0 && parte <= 1)) throw new RangeError('a parte tem de ficar entre 0 e 1');

  const ordenados = [...niveis].sort((a, b) => a.preco - b.preco);
  const volumeDe = (n) => n.compra + n.venda;
  const total = ordenados.reduce((s, n) => s + volumeDe(n), 0);
  if (total === 0) return { vah: null, val: null, poc: null, volumeIncluido: 0, parte };

  const centro = ordenados.findIndex((n) => n.preco === poc(niveis).preco);
  let baixo = centro;
  let alto = centro;
  let acumulado = volumeDe(ordenados[centro]);

  // cresce para o lado que tiver mais volume, até cobrir a parte pedida
  while (acumulado / total < parte && (baixo > 0 || alto < ordenados.length - 1)) {
    const abaixo = baixo > 0 ? volumeDe(ordenados[baixo - 1]) : -1;
    const acima = alto < ordenados.length - 1 ? volumeDe(ordenados[alto + 1]) : -1;
    if (acima >= abaixo) { alto += 1; acumulado += acima; }
    else { baixo -= 1; acumulado += abaixo; }
  }

  return {
    val: ordenados[baixo].preco,
    vah: ordenados[alto].preco,
    poc: poc(niveis).preco,
    volumeIncluido: acumulado,
    proporcaoReal: Math.round((acumulado / total) * 1000) / 1000,
    parte,
    nota: 'A faixa de 70% é convenção do Market Profile, não derivação.',
  };
}

/**
 * Indício de absorção: volume alto com preço parado.
 *
 * `forca` é o quanto o volume do nível supera a média — e é indício, não sinal.
 * O campo `leitura` diz isso por extenso, para não se perder na tela.
 */
export function absorcao(niveis, { multiplo = 2 } = {}) {
  exigirNiveis(niveis);
  const volumes = niveis.map((n) => n.compra + n.venda);
  const media = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  if (media === 0) return [];

  return niveis
    .map((n, i) => {
      const volume = volumes[i];
      const desequilibrio = Math.abs(n.compra - n.venda) / (volume || 1);
      return {
        preco: n.preco,
        volume,
        forca: Math.round((volume / media) * 100) / 100,
        // muito volume e pouca diferença entre os lados: os dois se encontraram aqui
        equilibrado: desequilibrio < 0.2,
      };
    })
    .filter((n) => n.forca >= multiplo && n.equilibrado)
    .map((n) => ({
      ...n,
      leitura: 'Indício, não sinal: houve muito volume sem o preço andar. A '
        + 'explicação usual é absorção por participante grande, mas quem estava '
        + 'do outro lado não é observável nestes dados.',
    }));
}

function exigirNiveis(niveis) {
  if (!Array.isArray(niveis) || niveis.length === 0) {
    throw new RangeError('é preciso ao menos um nível de preço');
  }
  for (const n of niveis) {
    if (!Number.isFinite(n?.preco)) throw new TypeError('nível sem preço numérico');
    if (!Number.isFinite(n?.compra) || !Number.isFinite(n?.venda)) {
      throw new TypeError(`nível ${n.preco} sem volume de compra e venda`);
    }
    if (n.compra < 0 || n.venda < 0) throw new RangeError('volume não pode ser negativo');
  }
}
