// O Tax Shield: o que a folga do teto faz com o imposto de uma venda.
//
// Página 11 do Blueprint do Arquiteto, construída como pedida.
//
// O QUE ELE FAZ: a pessoa diz "quero vender tanto". O módulo mostra o que
// acontece se vender tudo agora, e o que aconteceria se a venda fosse partida
// entre este mês e os seguintes. Os dois números lado a lado, sem conselho.
//
// ⚠️ E O QUE ELE NÃO FAZ, que é a linha que separa calculadora de consultoria:
// ele **não bloqueia** venda nenhuma, **não executa** nada e **não recomenda**
// esperar. O Blueprint fala em "o TM01 bloqueia/fraciona a venda"; aqui ele
// CALCULA o efeito de fracionar, e quem fraciona é o Artesão. Software que
// bloqueia a operação de alguém decidiu no lugar dessa pessoa.
//
// A LEGALIDADE, dita por inteiro: não existe regra de *wash sale* para
// criptoativo no Brasil. Vender dentro da isenção e recomprar não é infração, e
// partir uma venda entre meses também não. O que existe é a diferença entre
// mostrar a conta e mandar fazer — e este arquivo faz a primeira.

import { TETO_ISENCAO } from './isencao.js';
import { ALIQUOTA_GANHO_NACIONAL } from './ganho.js';
import { proporcao } from '../../nucleo/dinheiro.js';

/**
 * Simula uma venda no regime nacional, inteira e partida.
 *
 * `jaAlienado` é o que já saiu neste mês — sem isso a folga é fantasia.
 * `custoDaPosicao` e `quantidadePossuida` vêm da carteira; o ganho proporcional
 * sai deles, não de um lucro que a pessoa estime de cabeça.
 */
export function simular({
  jaAlienado = 0,
  valorPretendido,
  custoDaPosicao,
  quantidadePossuida,
  quantidadeVendida,
}) {
  if (valorPretendido <= 0) throw new RangeError('o valor pretendido tem de ser maior que zero');
  if (quantidadeVendida <= 0 || quantidadeVendida > quantidadePossuida) {
    throw new RangeError('quantidade vendida fora da posição');
  }

  const folga = Math.max(0, TETO_ISENCAO - jaAlienado);
  const custo = proporcao(custoDaPosicao, quantidadeVendida, quantidadePossuida);
  const ganho = valorPretendido - custo;

  // De uma vez: se o total do mês passar do teto, o ganho INTEIRO é tributado —
  // não só o que excedeu. É a parte que mais surpreende.
  const totalSeVenderTudo = jaAlienado + valorPretendido;
  const estoura = totalSeVenderTudo > TETO_ISENCAO;
  const impostoDeUmaVez = estoura && ganho > 0
    ? Math.round(ganho * ALIQUOTA_GANHO_NACIONAL)
    : 0;

  return {
    folga,
    valorPretendido,
    custo,
    ganho,
    deUmaVez: {
      alienadoNoMes: totalSeVenderTudo,
      estoura,
      isento: !estoura,
      imposto: impostoDeUmaVez,
    },
    partida: partir({ jaAlienado, valorPretendido, ganho }),
    // dito no objeto para não se perder quando isto virar tela ou CSV
    natureza: 'simulacao',
    aviso: 'Mostra o efeito de duas escolhas. Não bloqueia, não executa e não '
      + 'recomenda nenhuma delas — decidir é seu.',
    fonte: 'Lei 9.250/1995, art. 22, II',
  };
}

/**
 * Como a venda se distribui se for partida para caber na isenção.
 *
 * Devolve as parcelas e em quantos meses-calendário elas caberiam. **Não diz
 * "espere"** — diz "assim caberia", que é outra frase.
 */
export function partir({ jaAlienado = 0, valorPretendido, ganho = 0 }) {
  const parcelas = [];
  let restante = valorPretendido;
  let usadoNoMesAtual = jaAlienado;

  // guarda contra laço infinito: valor pretendido grande com teto pequeno
  while (restante > 0 && parcelas.length < 600) {
    const cabe = Math.max(0, TETO_ISENCAO - usadoNoMesAtual);
    const parcela = Math.min(restante, cabe);
    parcelas.push(parcela);
    restante -= parcela;
    usadoNoMesAtual = 0;   // a partir do segundo mês, a folga é o teto inteiro
  }

  const completa = restante === 0;
  return {
    completa,
    meses: parcelas.length,
    parcelas,
    // partindo assim, toda parcela fica dentro do teto — logo, nada é tributado
    impostoSeIsento: completa ? 0 : null,
    ganhoEnvolvido: ganho,
    // ⚠️ o que a simulação NÃO sabe, e ignorar isso é o erro clássico
    ressalvas: [
      'O preço de um mês não é o preço do outro. A simulação usa o valor de hoje '
        + 'para todas as parcelas, e o mercado não garante nada disso.',
      'Adiar parte da venda é ficar exposto à variação do ativo no período.',
      'A isenção vale por mês-calendário, não por trinta dias.',
    ],
  };
}

/** Quanto ainda cabe no teto deste mês. A pergunta que vem antes de tudo. */
export function folgaDoTeto(jaAlienado = 0) {
  return {
    teto: TETO_ISENCAO,
    jaAlienado,
    folga: Math.max(0, TETO_ISENCAO - jaAlienado),
    estourou: jaAlienado > TETO_ISENCAO,
  };
}
