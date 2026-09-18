// Ler o que a pessoa digitou ou colou.
//
// A ferramenta só é de "absorção rápida" se a entrada for. Então o formato é
// uma linha por operação, separada por vírgula ou por espaço, e o cabeçalho é
// opcional:
//
//   2026-09-15  venda  BTC  0,5  30.000,00  nacional
//   2026-09-01,compra,BTC,0.5,10000,nacional
//   2026-09-20  transferencia  BTC  0,25  nacional  autocustodia
//
// REGRA DE OURO DESTE ARQUIVO: **erro de digitação vira mensagem, nunca
// silêncio.** Uma linha que não dá para ler não é pulada — ela para a
// importação e diz o número da linha. Uma calculadora de imposto que descarta
// a linha que não entendeu produz um total menor e igualmente convincente.

import { emCentavos, emUnidades } from './dinheiro.js';
import { exigirData } from './periodo.js';
import { CUSTODIAS } from './carteira.js';

const TIPOS = ['compra', 'venda', 'transferencia'];

/** Sinônimos que uma pessoa real escreve. O resto é recusado. */
const APELIDOS = {
  compra: 'compra', comprar: 'compra', buy: 'compra', c: 'compra',
  venda: 'venda', vender: 'venda', sell: 'venda', v: 'venda',
  transferencia: 'transferencia', transferência: 'transferencia',
  transfer: 'transferencia', envio: 'transferencia', t: 'transferencia',
};

const CUSTODIA_APELIDOS = {
  nacional: 'nacional', br: 'nacional', brasil: 'nacional', n: 'nacional',
  exterior: 'exterior', estrangeira: 'exterior', fora: 'exterior', e: 'exterior',
  autocustodia: 'autocustodia', autocustódia: 'autocustodia',
  carteira: 'autocustodia', wallet: 'autocustodia', propria: 'autocustodia', a: 'autocustodia',
};

export class LinhaIlegivel extends Error {
  constructor(numero, linha, motivo) {
    super(`linha ${numero}: ${motivo}\n  ${linha}`);
    this.name = 'LinhaIlegivel';
    this.numero = numero;
    this.linha = linha;
    this.motivo = motivo;
  }
}

/** Texto inteiro → lista de operações. Para na primeira linha ilegível. */
export function ler(texto) {
  const operacoes = [];
  const linhas = String(texto).split(/\r?\n/);

  linhas.forEach((bruta, i) => {
    const linha = bruta.trim();
    if (linha === '' || linha.startsWith('#')) return;
    if (/^data[,;\s]/i.test(linha)) return;  // cabeçalho de CSV
    operacoes.push(lerLinha(linha, i + 1));
  });

  return operacoes;
}

/**
 * Separar uma linha em campos — e a vírgula é o problema.
 *
 * No Brasil a vírgula é o separador DECIMAL (`0,5`) e também o separador de
 * CSV. Partir por vírgula sem pensar transforma `0,5` em dois campos, e o
 * resultado é "quantidade zero" numa linha perfeitamente válida. Foi o que
 * aconteceu na primeira versão deste arquivo, e os testes pegaram.
 *
 * A regra, em ordem, e a primeira que der ao menos 5 campos ganha:
 *
 *   1. ponto-e-vírgula ou tabulação — quem usa isso já resolveu a ambiguidade;
 *   2. espaço em branco — aí a vírgula sobrante é decimal, e fica onde está;
 *   3. vírgula — é CSV de verdade, com ponto decimal.
 *
 * ⚠️ O caso que continua ambíguo, e que é ambíguo mesmo: CSV separado por
 * vírgula com decimal por vírgula (`BTC,0,5,30000`). Não existe leitura certa
 * — nem para uma pessoa. Cai na regra 3, sai com um campo a mais, e a linha é
 * recusada com o número dela. Recusar é melhor que adivinhar: use `;` ou
 * espaço.
 */
function separar(linha) {
  for (const re of [/[;\t]/, /\s+/, /,/]) {
    const campos = linha.split(re).map((c) => c.trim()).filter((c) => c !== '');
    if (campos.length >= 5) return campos;
  }
  return linha.split(/[;\t,]|\s+/).map((c) => c.trim()).filter((c) => c !== '');
}

export function lerLinha(linha, numero = 1) {
  const campos = separar(linha);

  if (campos.length < 5) {
    throw new LinhaIlegivel(numero, linha, `esperava ao menos 5 campos, achei ${campos.length}`);
  }

  const [data, tipoBruto, ativo, ...resto] = campos;

  try {
    exigirData(data);
  } catch (e) {
    throw new LinhaIlegivel(numero, linha, `data: ${e.message}`);
  }

  const tipo = APELIDOS[tipoBruto.toLowerCase()];
  if (!tipo) {
    throw new LinhaIlegivel(numero, linha, `tipo desconhecido: "${tipoBruto}". Use ${TIPOS.join(', ')}`);
  }

  if (tipo === 'transferencia') {
    // data tipo ativo quantidade de para
    const [qtd, deBruto, paraBruto] = resto;
    if (!deBruto || !paraBruto) {
      throw new LinhaIlegivel(numero, linha, 'transferência precisa de origem e destino');
    }
    return {
      tipo, data, ativo: ativo.toUpperCase(),
      quantidade: quantidade(qtd, numero, linha),
      de: custodia(deBruto, numero, linha),
      para: custodia(paraBruto, numero, linha),
    };
  }

  // data tipo ativo quantidade valor custodia [taxa]
  const [qtd, valor, custBruta, taxa] = resto;
  if (!custBruta) {
    throw new LinhaIlegivel(numero, linha, 'falta a custódia (nacional, exterior ou autocustodia)');
  }

  return {
    tipo, data, ativo: ativo.toUpperCase(),
    quantidade: quantidade(qtd, numero, linha),
    valor: dinheiro(valor, numero, linha, 'valor'),
    custodia: custodia(custBruta, numero, linha),
    ...(taxa === undefined ? {} : { taxa: dinheiro(taxa, numero, linha, 'taxa') }),
  };
}

function quantidade(texto, numero, linha) {
  let q;
  try {
    q = emUnidades(texto);
  } catch (e) {
    throw new LinhaIlegivel(numero, linha, `quantidade: ${e.message}`);
  }
  if (q <= 0) throw new LinhaIlegivel(numero, linha, 'quantidade tem de ser maior que zero');
  return q;
}

function dinheiro(texto, numero, linha, nome) {
  let v;
  try {
    v = emCentavos(texto);
  } catch (e) {
    throw new LinhaIlegivel(numero, linha, `${nome}: ${e.message}`);
  }
  if (v < 0) throw new LinhaIlegivel(numero, linha, `${nome} não pode ser negativo`);
  return v;
}

function custodia(texto, numero, linha) {
  const c = CUSTODIA_APELIDOS[texto.toLowerCase()];
  if (!c) {
    throw new LinhaIlegivel(
      numero, linha,
      `custódia desconhecida: "${texto}". Use ${CUSTODIAS.join(', ')}`,
    );
  }
  return c;
}

/** O exemplo que a página oferece. Cobre os três regimes e a transferência. */
export const EXEMPLO = [
  '# data        tipo           ativo  quantidade  valor       custódia',
  '2026-09-01    compra         BTC    0,5         150.000,00  nacional',
  '2026-09-05    compra         ETH    2           40.000,00   exterior',
  '2026-09-10    transferencia  BTC    0,2         nacional    autocustodia',
  '2026-09-15    venda          BTC    0,2         70.000,00   autocustodia',
  '2026-09-20    venda          ETH    1           25.000,00   exterior',
].join('\n');
