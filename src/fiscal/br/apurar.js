// O fechamento: pega os eventos e devolve o mês e o ano, prontos para a tela.
//
// É o único arquivo que junta as três regras, e ele as mantém separadas de
// propósito. A isenção olha o mês nacional; o exterior fecha no ano; a DeCripto
// é obrigação de informar e não é imposto. Misturar os três num número só é
// exatamente o erro que o PDF de especificação cometeu.

import { porMes, porAno, mesDe, anoDe } from '../../nucleo/periodo.js';
import { vendas } from '../../nucleo/apuracao.js';
import { regimeDe, certezaDe, INTERPRETADAS } from './regime.js';
import { aplicarIsencao } from './isencao.js';
import { aplicarExterior } from './exterior.js';
import { avaliarDecripto } from './decripto.js';

/**
 * Fecha tudo.
 *
 * Devolve `{ meses, anos, avisos }`. A tela lê isso e não calcula mais nada —
 * cálculo na camada de tela é como dois números divergem.
 */
export function fechar(eventos) {
  const comRegime = eventos.map((e) => ({ ...e, regime: regimeDe(e.custodia ?? e.de) }));

  const meses = [...porMes(comRegime)].map(([mes, doMes]) => {
    const v = vendas(doMes);
    return {
      mes,
      nacional: aplicarIsencao(v),
      exterior: aplicarExterior(v),
      decripto: avaliarDecripto(doMes),
      operacoes: doMes.length,
    };
  });

  // O exterior fecha no ANO, não no mês: é o que a Lei 14.754/2023 manda.
  // O bloco mensal acima existe para acompanhar; este é o que vira imposto.
  const anos = [...porAno(comRegime)].map(([ano, doAno]) => ({
    ano,
    exterior: aplicarExterior(vendas(doAno)),
    mesesComDecripto: meses.filter((m) => m.mes.startsWith(ano) && m.decripto.obrigado)
      .map((m) => m.mes),
  }));

  return { meses, anos, avisos: avisosDe(comRegime) };
}

/**
 * O que a tela precisa dizer em voz alta.
 *
 * Um aviso aqui não é decoração: é o lugar onde a ferramenta admite que
 * aplicou uma leitura e não um fato. Some daqui, some da tela, e aí a pessoa
 * acha que o número é certo quando ele é defensável.
 */
function avisosDe(eventos) {
  const avisos = [];

  const usadas = new Set(eventos.map((e) => e.custodia ?? e.para));
  for (const c of INTERPRETADAS) {
    if (usadas.has(c)) {
      avisos.push({
        tipo: 'interpretacao',
        custodia: c,
        certeza: certezaDe(c),
        texto:
          `Operações em ${c} foram tratadas pelo regime nacional, com direito à isenção ` +
          `mensal. Isso é leitura da norma, não texto expresso — há tributarista que ` +
          `discorda. Ver FONTES.md §2.`,
      });
    }
  }

  if (usadas.has('exterior')) {
    avisos.push({
      tipo: 'regime',
      custodia: 'exterior',
      certeza: 'fato',
      texto:
        'A isenção mensal de R$ 35.000 NÃO se aplica a operações em exchange estrangeira. ' +
        'Lei 14.754/2023: 15% sobre o ganho, apurado no ano. Ver FONTES.md §2.',
    });
  }

  return avisos;
}

/** Um mês específico, para a tela que mostra um mês por vez. */
export function mesDoFechamento(eventos, aaaaMM) {
  return fechar(eventos).meses.find((m) => m.mes === aaaaMM) ?? null;
}

