// O insumo da DeCripto: o mês compilado para quem vai declarar.
//
// Página 6 do Blueprint do Arquiteto.
//
// ⚠️ ISTO NÃO GERA O ARQUIVO OFICIAL, e a diferença importa mais que o trabalho
// que dá:
//
//   O leiaute que o e-CAC aceita é da Receita, muda, e é validado na entrega.
//   Uma ferramenta que gerasse um arquivo recusado pelo sistema custaria à
//   pessoa **um prazo** para descobrir — e prazo perdido em obrigação mensal
//   vira multa. Gerar nada é melhor que gerar algo que parece pronto e não é.
//
// O que este módulo faz é o trabalho que realmente dá trabalho: separar as
// operações que contam, somar por ativo e por custódia, e entregar isso num
// formato que a pessoa (ou o contador dela) transcreve. A conferência é dela,
// como tudo o mais aqui.

import {
  CONTAM, TETO_DECRIPTO, custodiaContavel, valorDaOperacao,
} from '../fiscal/br/decripto.js';
import { formatarBRL, formatarQuantidade } from '../nucleo/dinheiro.js';

/**
 * Compila um mês para entrega.
 *
 * Recebe os eventos já apurados — não recalcula nada. Recalcular aqui seria o
 * jeito de o relatório divergir da tela, que é o defeito que este projeto
 * combate desde o começo.
 */
export function compilar(eventos, mes) {
  const doMes = eventos.filter((e) => e.data.startsWith(mes));
  const contaveis = doMes.filter((e) => CONTAM.includes(custodiaContavel(e)));

  const somatorio = contaveis.reduce((s, e) => s + valorDaOperacao(e), 0);
  const obrigado = somatorio > TETO_DECRIPTO;

  return {
    mes,
    obrigado,
    somatorio,
    teto: TETO_DECRIPTO,
    prazo: 'último dia útil do mês seguinte ao das operações',
    canal: 'e-CAC',
    fonte: 'IN RFB nº 2.291/2025',

    porAtivo: agruparPor(contaveis, (e) => e.ativo),
    porCustodia: agruparPor(contaveis, custodiaContavel),
    operacoes: contaveis.map((e) => ({
      data: e.data,
      tipo: e.tipo,
      ativo: e.ativo,
      quantidade: e.quantidade,
      valor: valorDaOperacao(e),
      custodia: custodiaContavel(e),
    })),

    // ⚠️ dito no objeto, não só no comentário
    geraArquivoOficial: false,
    aviso: 'Insumo para a declaração, não o arquivo de entrega. O leiaute do '
      + 'e-CAC é da Receita e muda; gerar um arquivo que o sistema recusa '
      + 'custaria um prazo para descobrir.',
  };
}

/** O mesmo compilado, em texto que se lê e se transcreve. */
export function comoTexto(c) {
  const linhas = [
    `DeCripto — ${c.mes}`,
    `Obrigado a declarar: ${c.obrigado ? 'SIM' : 'não'}`,
    `Somatório de operações fora de exchange nacional: ${formatarBRL(c.somatorio)}`,
    `Teto da ${c.fonte}: ${formatarBRL(c.teto)}`,
    '',
  ];

  if (c.obrigado) linhas.push(`Prazo: ${c.prazo}, pelo ${c.canal}`, '');

  linhas.push('Por ativo:');
  for (const [ativo, { valor, quantos }] of Object.entries(c.porAtivo)) {
    linhas.push(`  ${ativo.padEnd(8)} ${formatarBRL(valor).padStart(18)}  (${quantos} ops)`);
  }

  linhas.push('', 'Por custódia:');
  for (const [cust, { valor, quantos }] of Object.entries(c.porCustodia)) {
    linhas.push(`  ${cust.padEnd(14)} ${formatarBRL(valor).padStart(18)}  (${quantos} ops)`);
  }

  linhas.push('', 'Operações:');
  for (const o of c.operacoes) {
    linhas.push(`  ${o.data}  ${o.tipo.padEnd(14)} ${o.ativo.padEnd(6)} `
      + `${formatarQuantidade(o.quantidade).padStart(14)} ${formatarBRL(o.valor).padStart(16)}  ${o.custodia}`);
  }

  linhas.push('', `⚠️ ${c.aviso}`);
  return linhas.join('\n');
}

function agruparPor(eventos, chave) {
  const fora = {};
  for (const e of eventos) {
    const k = chave(e);
    if (!fora[k]) fora[k] = { valor: 0, quantos: 0 };
    fora[k].valor += valorDaOperacao(e);
    fora[k].quantos += 1;
  }
  return fora;
}

// `custodiaContavel` e `valorDaOperacao` vêm de `decripto.js` de propósito: são
// a MESMA regra que decide o gatilho da declaração. Reimplementá-las aqui daria
// dois lugares decidindo o que conta, e dois lugares assim divergem.
