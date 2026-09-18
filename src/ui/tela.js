// A tela. Lê o que foi digitado, manda calcular, mostra.
//
// ESTA CAMADA NÃO CALCULA NADA. Ela formata o que `fiscal/br/apurar.js`
// devolveu. Se um número aparecer aqui que não veio de lá, ele diverge do
// exportado — e aí o resumo na tela e o CSV baixado dizem coisas diferentes.
//
// TAMBÉM NÃO FALA COM NINGUÉM. Nenhum `fetch`, nenhum `XMLHttpRequest`, nenhum
// `<img>` remoto, nenhuma fonte externa. Isto é requisito, não preferência: a
// pessoa está colando o histórico financeiro dela. Há um teste que abre a página
// num navegador de verdade e falha se sair uma requisição.

import { variaveis } from './proporcao.js';
import { ler, LinhaIlegivel, EXEMPLO } from '../nucleo/entrada.js';
import { apurar } from '../nucleo/apuracao.js';
import { fechar } from '../fiscal/br/apurar.js';
import { formatarBRL } from '../nucleo/dinheiro.js';
import { assinar, rodape } from '../assinatura.js';

/** Os 100 nomes da fatia aberta. Gerado na construção — ver `construir.mjs`. */
const CATALOGO = globalThis.__CATALOGO__ ?? [];

let ultimo = null;   // o último fechamento, para os botões de exportar

export function iniciar() {
  const estilo = document.createElement('style');
  estilo.textContent = variaveis();
  document.head.appendChild(estilo);

  const campo = document.getElementById('operacoes');
  campo.placeholder = EXEMPLO;

  document.getElementById('calcular').addEventListener('click', calcular);
  document.getElementById('exemplo').addEventListener('click', () => {
    campo.value = EXEMPLO;
    calcular();
  });
  document.getElementById('limpar').addEventListener('click', () => {
    campo.value = '';
    document.getElementById('saida').innerHTML = '';
    ultimo = null;
  });
  document.getElementById('csv').addEventListener('click', () => baixar('csv'));
  document.getElementById('json').addEventListener('click', () => baixar('json'));
}

function calcular() {
  const saida = document.getElementById('saida');
  const texto = document.getElementById('operacoes').value;

  if (texto.trim() === '') {
    saida.innerHTML = '';
    ultimo = null;
    return;
  }

  try {
    const operacoes = ler(texto);
    const { eventos } = apurar(operacoes);
    ultimo = fechar(eventos);
    saida.innerHTML = desenhar(ultimo);
  } catch (e) {
    ultimo = null;
    // O erro é mostrado inteiro, com a linha. Uma mensagem genérica aqui
    // obrigaria a pessoa a caçar o problema em cinquenta linhas de histórico.
    saida.innerHTML =
      `<section><h2>Não deu para ler</h2><div class="erro">${escapar(
        e instanceof LinhaIlegivel ? e.message : String(e.message ?? e),
      )}</div></section>`;
  }
}

function desenhar({ meses, anos, avisos }) {
  const partes = [];

  if (avisos.length) {
    partes.push(`<section><h2>Antes do número</h2>${
      avisos.map((a) => `<div class="aviso"><b>${
        a.certeza === 'interpretacao' ? 'Interpretação' : 'Regra'
      }</b> — ${escapar(a.texto)}</div>`).join('')
    }</section>`);
  }

  partes.push(`<section><h2>Mês a mês</h2>${meses.map(blocoMes).join('')}</section>`);

  if (anos.length) {
    partes.push(`<section><h2>Fechamento anual do exterior</h2>
      <p style="color:var(--fraco);font-size:var(--em1);margin-top:0">
        A Lei 14.754/2023 apura no ano, não no mês. É este número que vai para a
        Declaração de Ajuste — os blocos mensais acima servem para acompanhar.</p>
      ${anos.map(blocoAno).join('')}</section>`);
  }

  return partes.join('');
}

function blocoMes(m) {
  const a = CATALOGO.length ? assinar(m, CATALOGO) : null;

  return `<div class="mes">
    <h2>${m.mes}<small>${m.operacoes} ${m.operacoes === 1 ? 'operação' : 'operações'}</small></h2>
    <table>
      <tr><th>Alienado em regime nacional</th><td>${formatarBRL(m.nacional.alienado)}</td></tr>
      <tr><th>Teto da isenção (Lei 9.250/1995, art. 22)</th><td>${formatarBRL(m.nacional.teto)}</td></tr>
      <tr><th>${m.nacional.isento ? 'Ainda cabe no teto' : 'Passou do teto em'}</th>
          <td>${formatarBRL(m.nacional.isento ? m.nacional.folga : m.nacional.excedente)}</td></tr>
      <tr><th>Situação</th><td>${
        m.nacional.isento
          ? '<span class="selo sim">isento</span>'
          : '<span class="selo nao">tributado</span>'
      }</td></tr>
      ${m.nacional.baseTributavel > 0
        ? `<tr><th>Base tributável no regime nacional</th><td><strong>${
            formatarBRL(m.nacional.baseTributavel)}</strong></td></tr>`
        : ''}
      ${m.nacional.prejuizo < 0
        ? `<tr><th>Prejuízo no mês (não compensa ganho de capital)</th><td>${
            formatarBRL(m.nacional.prejuizo)}</td></tr>`
        : ''}
    </table>

    ${m.exterior.alienado > 0 ? `<h3>Exterior — sem isenção mensal</h3><table>
      <tr><th>Alienado no exterior</th><td>${formatarBRL(m.exterior.alienado)}</td></tr>
      <tr><th>Base no mês</th><td>${formatarBRL(m.exterior.baseTributavel)}</td></tr>
      <tr><th>15% sobre a base (fecha no ano)</th><td>${formatarBRL(m.exterior.imposto)}</td></tr>
    </table>` : ''}

    <h3>DeCripto — obrigação de informar</h3>
    <table>
      <tr><th>Operações fora de exchange nacional</th><td>${formatarBRL(m.decripto.somatorio)}</td></tr>
      <tr><th>Teto da IN RFB 2.291/2025</th><td>${formatarBRL(m.decripto.teto)}</td></tr>
      <tr><th>Precisa declarar?</th><td>${
        m.decripto.obrigado
          ? '<span class="selo nao">sim</span>'
          : '<span class="selo sim">não</span>'
      }</td></tr>
      ${m.decripto.obrigado
        ? `<tr><th>Prazo</th><td>${m.decripto.prazo}, pelo ${m.decripto.canal}</td></tr>`
        : ''}
    </table>

    ${a ? `<div class="assinatura">
      <img src="samples/open-set/${a.peca}.svg" alt="">
      <div>Assinatura desta apuração<br><code>${a.hex}</code> · ${a.peca}</div>
    </div>` : ''}
  </div>`;
}

function blocoAno(y) {
  return `<div class="mes"><h2>${y.ano}</h2><table>
    <tr><th>Alienado no exterior no ano</th><td>${formatarBRL(y.exterior.alienado)}</td></tr>
    <tr><th>Base anual (prejuízo compensa ganho, neste regime)</th>
        <td>${formatarBRL(y.exterior.baseTributavel)}</td></tr>
    <tr><th>Imposto a 15%</th><td><strong>${formatarBRL(y.exterior.imposto)}</strong></td></tr>
    ${y.mesesComDecripto.length
      ? `<tr><th>Meses com DeCripto</th><td>${y.mesesComDecripto.join(', ')}</td></tr>`
      : ''}
  </table></div>`;
}

// ── exportar ─────────────────────────────────────────────────

function baixar(formato) {
  if (!ultimo) return;
  const texto = formato === 'csv' ? comoCsv(ultimo) : comoJson(ultimo);
  const tipo = formato === 'csv' ? 'text/csv' : 'application/json';

  // Blob + object URL: o arquivo é montado na própria máquina e nunca sai dela.
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `apuracao-${ultimo.meses[0]?.mes ?? 'cripto'}.${formato}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function comoCsv({ meses }) {
  const cabecalho = [
    'mes', 'alienado_nacional', 'isento', 'base_nacional',
    'alienado_exterior', 'base_exterior', 'imposto_exterior',
    'decripto_somatorio', 'decripto_obrigado', 'assinatura', 'sigilo',
  ];
  const linhas = meses.map((m) => {
    const a = CATALOGO.length ? assinar(m, CATALOGO) : { hex: '', peca: '' };
    return [
      m.mes, centavos(m.nacional.alienado), m.nacional.isento ? 'sim' : 'nao',
      centavos(m.nacional.baseTributavel), centavos(m.exterior.alienado),
      centavos(m.exterior.baseTributavel), centavos(m.exterior.imposto),
      centavos(m.decripto.somatorio), m.decripto.obrigado ? 'sim' : 'nao',
      a.hex, a.peca,
    ].join(',');
  });
  const assinatura = CATALOGO.length && meses[0]
    ? rodape(assinar(meses[0], CATALOGO)).map((l) => `# ${l}`)
    : [];
  return [...assinatura, cabecalho.join(','), ...linhas].join('\n');
}

export function comoJson({ meses, anos, avisos }) {
  const assinaturas = CATALOGO.length
    ? Object.fromEntries(meses.map((m) => [m.mes, assinar(m, CATALOGO)]))
    : {};
  return JSON.stringify({
    ferramenta: 'Prototype-TM01',
    autoria: 'Nthnkr "dpna" e AmandaBT',
    aviso: 'Não é orientação tributária. Conferência de valores é do contribuinte.',
    fontes: 'FONTES.md',
    meses, anos, avisos, assinaturas,
  }, null, 2);
}

/** Centavos → `1234.56`, com ponto, porque CSV não é para humano ler. */
const centavos = (c) => (c / 100).toFixed(2);

function escapar(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
