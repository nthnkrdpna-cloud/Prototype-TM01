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
import { faixa, ritmoPara } from '../nucleo/escudo.js';
import { emCentavos } from '../nucleo/dinheiro.js';

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

  ligarAbas();
  ligarEscudo();
}

// ── abas ─────────────────────────────────────────────────────

function ligarAbas() {
  const abas = [
    ['aba-apuracao', 'painel-apuracao'],
    ['aba-escudo', 'painel-escudo'],
  ];
  for (const [botao] of abas) {
    document.getElementById(botao).addEventListener('click', () => {
      for (const [b, painel] of abas) {
        const ativa = b === botao;
        document.getElementById(b).classList.toggle('ativa', ativa);
        document.getElementById(painel).hidden = !ativa;
      }
    });
  }
}

// ── o escudo ─────────────────────────────────────────────────

function ligarEscudo() {
  document.getElementById('calcular-escudo').addEventListener('click', calcularEscudo);
  document.getElementById('limpar-escudo').addEventListener('click', () => {
    for (const id of ['custo', 'guardado', 'ritmo']) document.getElementById(id).value = '';
    document.getElementById('saida-escudo').innerHTML = '';
  });
  // Enter em qualquer campo calcula — três campos e um botão é atrito demais
  for (const id of ['custo', 'guardado', 'ritmo']) {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') calcularEscudo();
    });
  }
}

function calcularEscudo() {
  const saida = document.getElementById('saida-escudo');
  const ler1 = (id, seVazio) => {
    const t = document.getElementById(id).value.trim();
    if (t === '') return seVazio;
    return emCentavos(t);
  };

  try {
    const entrada = {
      custoMensal: ler1('custo', null),
      guardado: ler1('guardado', 0),
      ritmoMensal: ler1('ritmo', 0),
    };
    if (entrada.custoMensal === null) {
      saida.innerHTML = '<section><div class="erro">Falta o custo vital por mês — '
        + 'é dele que sai todo o resto.</div></section>';
      return;
    }
    saida.innerHTML = desenharEscudo(faixa(entrada), entrada);
  } catch (e) {
    saida.innerHTML = `<section><h2>Não deu para ler</h2><div class="erro">${
      escapar(String(e.message ?? e))}</div></section>`;
  }
}

function desenharEscudo(tres, entrada) {
  const base = tres[0];

  return `<section>
    <h2>Onde você está hoje</h2>
    <p class="numerao">${base.mesesCobertos} ${
      base.mesesCobertos === 1 ? 'mês coberto' : 'meses cobertos'}</p>
    <p style="color:var(--fraco);font-size:var(--em1);margin-top:0">
      É quanto tempo o que você já tem cobre o seu custo vital, sem nenhuma renda entrando.
      ${base.guardado === 0 ? 'Começar do zero é começar — o primeiro mês coberto é o mais difícil.' : ''}
    </p>
  </section>

  <section>
    <h2>As três metas</h2>
    <p style="color:var(--fraco);font-size:var(--em1);margin-top:0">
      Seis meses é o piso que a maior parte da orientação repete. Doze é para quem tem renda
      variável ou instável. <strong>Qual dos três serve é você quem sabe</strong> — depende de
      quão previsível é a sua renda, e disso a ferramenta não sabe nada.
    </p>
    ${tres.map((e) => blocoEscudo(e, entrada)).join('')}
  </section>

  <section>
    <h2>Onde guardar</h2>
    <p style="margin-top:0">${escapar(base.aviso)}</p>
    <p style="color:var(--fraco);font-size:var(--em1)">
      O que a reserva precisa é de <strong>resgate rápido</strong> e de não perder valor no
      susto — o resto é escolha sua, e vale conversar com alguém que conheça o seu caso.
    </p>
  </section>`;
}

function blocoEscudo(e, entrada) {
  const prazoTexto = e.completo
    ? '<strong>já alcançada</strong>'
    : e.semAporte
      ? 'sem aporte mensal informado, não dá para estimar prazo'
      : `<strong>${e.mesesParaCompletar} ${
          e.mesesParaCompletar === 1 ? 'mês' : 'meses'}</strong> no ritmo atual`;

  // quanto precisaria por mês para fechar em um ano — só quando ainda falta
  const paraUmAno = e.completo ? null : ritmoPara({ ...entrada, meses: e.meses, emQuantosMeses: 12 });

  return `<div class="mes">
    <h2>${e.meses} meses<small>${formatarBRL(e.alvo)}</small></h2>
    <div class="barra"><span style="width:${e.percentual}%"></span></div>
    <table>
      <tr><th>Já guardado</th><td>${formatarBRL(e.guardado)} · ${e.percentual}%</td></tr>
      ${e.completo
        ? '<tr><th>Situação</th><td><span class="selo sim">reserva completa</span></td></tr>'
        : `<tr><th>Falta</th><td><strong>${formatarBRL(e.falta)}</strong></td></tr>`}
      <tr><th>Prazo</th><td>${prazoTexto}</td></tr>
      ${paraUmAno !== null
        ? `<tr><th>Para fechar em 12 meses</th><td>${formatarBRL(paraUmAno)} por mês</td></tr>`
        : ''}
    </table>
  </div>`;
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
