# Fontes

*Every number this tool applies is listed here with the norm it comes from and the date it was
last checked against the source. Written in Portuguese because it cites Brazilian legislation
verbatim, and translating a norm's name is how a citation becomes wrong.*

**Última conferência: 18/09/2026.** Quem ler isto depois dessa data precisa reconferir — norma
tributária muda, e um documento que envelhece sozinho é pior que nenhum documento.

---

## Como ler esta página

Cada item diz três coisas separadas, e a separação é o ponto:

| Marca | Significa |
|---|---|
| **fato** | está escrito na norma, e o link vai até ela |
| **inferência** | conclusão minha a partir do texto, sem jurisprudência que feche a questão |
| **em disputa** | especialistas divergem, e o código trata os dois caminhos |

**Nada aqui é orientação tributária.** É a lista do que o código implementa e de onde tirou.
Quem decide o seu caso é o seu contador.

---

## 1. Isenção mensal de R$ 35.000,00

**Base: Lei nº 9.250/1995, art. 22, inciso II.**
<https://www.planalto.gov.br/ccivil_03/leis/l9250.htm>

> *"Fica isento do imposto de renda o ganho de capital auferido na alienação de bens e direitos
> de pequeno valor, cujo preço unitário de alienação, no mês em que esta se realizar, seja igual
> ou inferior a: (…) II - R$ 35.000,00, nos demais casos."*

**fato** — o limite é de R$ 35.000,00, apurado **por mês** e sobre o **valor da alienação**, não
sobre o ganho. Vender R$ 40.000,00 com lucro de R$ 100,00 não é isento.

**fato** — a isenção olha o **total alienado no mês**, somando as operações. Não é por operação.

**inferência** — a aplicação do art. 22 a criptoativos vinha expressa na IN RFB nº 1.888/2019,
que foi **revogada** pela IN RFB nº 2.291/2025 (item 3). A revogação é da norma de **informação**,
não da regra de **isenção**, que continua sendo a lei. O entendimento da RFB nas Perguntas e
Respostas do IRPF segue aplicando o art. 22 aos criptoativos.

### O que aconteceu com a MP 1.303/2025

**fato** — a Medida Provisória 1.303/2025 propunha acabar com esta isenção e instituir alíquota
única de 17,5%. Ela foi retirada de pauta na Câmara em outubro de 2025 e **caducou sem ser
convertida em lei**.

**A isenção continua valendo.** Este parágrafo existe porque a MP circulou muito, e muita gente
acha que ela passou.

---

## 2. Custódia no exterior — a isenção não se aplica

**Base: Lei nº 14.754/2023**, regulamentada pela **IN RFB nº 2.180, de 11/03/2024**.
<https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14754.htm>
<https://www.normaslegais.com.br/legislacao/instrucao-normativa-rfb-2180-2024.htm>

**fato** — a lei equiparou criptoativos custodiados no exterior a aplicações financeiras no
exterior, tributadas à alíquota de **15%** sobre o rendimento, apurados **anualmente** na
Declaração de Ajuste.

**fato** — a IN RFB nº 2.180/2024 é o **regulamento da lei para pessoa física**: dispõe sobre
depósitos não remunerados, moeda em espécie, aplicações financeiras, entidades controladas e
trusts no exterior — os arts. 1º a 15 da Lei 14.754/2023. Duas regras dela entram no cálculo:

- **compensação a valor nominal**, sem correção monetária nem atualização de qualquer natureza
  (art. 11);
- **regime de caixa** — o rendimento entra no ano-calendário em que é **efetivamente percebido**,
  não no de competência.

### ⚠️ A perda compensa dentro do período — e não contra lucro futuro

**fato** — a perda em aplicação financeira no exterior, comprovada por documentação hábil e
idônea, compensa rendimento de aplicação financeira no exterior **no mesmo período de apuração**.
Sobrando perda, o excedente vai contra lucros e dividendos de entidades controladas no exterior
declarados na **mesma** DAA.

**refutado, e registrado por isso** — circula a afirmação de que o sistema poderia rastrear perdas
cambiais em corretoras estrangeiras *"para compensá-las contabilmente contra lucros futuros"*. Um
documento de especificação deste projeto trazia essa frase **com o número da IN ao lado**, o que a
fazia parecer conferida. **Não é o que a norma diz.** A compensação é intra-período.

Implementar a versão afirmada faria a ferramenta apurar **imposto a menos** na declaração de quem
a usasse — que é o dano mais caro que este código pode causar. Há teste em
`prova/armadilhas.test.js` que falha se alguém fizer o prejuízo atravessar o ano.

*O registro fica porque resultado negativo se registra: sem isto, a mesma frase volta daqui a dois
meses com a mesma aparência de conferida.*

**fato** — nesse regime **não existe limite mensal de isenção**. Os R$ 35.000,00 do item 1 não
alcançam alienação em exchange estrangeira.

**em disputa** — há tributaristas que sustentam que o art. 22 da Lei 9.250/1995 não foi revogado
para cripto no exterior e continuaria aplicável. A leitura predominante, e a que a Receita
adota, é a do parágrafo acima.

> **É aqui que uma ferramenta mal feita causa dano.** Aplicar os R$ 35.000,00 aos dois lados diz
> a alguém que não deve nada quando deve. Por isso a custódia é a **estrutura** do cálculo neste
> projeto, não um campo opcional: sem declarar onde o ativo estava, não sai número nenhum.
>
> Diante da divergência, o código segue a leitura da Receita — a mais cara para o usuário — e
> **avisa na tela** que existe a outra. Errar para o lado que gera imposto a menos seria escolher
> o risco alheio.

---

## 3. DeCripto — obrigação de informar

**Base: IN RFB nº 2.291, de 14 de novembro de 2025.**
<https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/criptoativos/decripto>

**fato** — revogou a IN RFB nº 1.888/2019, com efeitos a partir de **1º de julho de 2026**.

**fato** — criou a **DeCripto**, declaração entregue pelo e-CAC, **mensal**, até o **último dia
útil do mês seguinte** ao das operações.

**fato** — para pessoa física, a obrigação é disparada por operações **fora de exchange
nacional** — autocustódia e exchanges estrangeiras — cujo somatório no mês ultrapasse
**R$ 35.000,00**.

**fato** — a IN trata de **informação**. Não alterou como o imposto é calculado.

### ⚠️ Os dois "R$ 35 mil" não são o mesmo número

Coincidem no valor e **divergem em tudo o mais**:

| | Isenção (item 1) | DeCripto (item 3) |
|---|---|---|
| O que faz | dispensa o imposto | obriga a informar |
| Onde vale | alienação em exchange **nacional** | operações **fora** de exchange nacional |
| Sobre o quê | valor alienado no mês | somatório das operações no mês |
| Se ultrapassar | passa a ter imposto | passa a ter de declarar |

São **gatilhos opostos**. Uma venda de R$ 30.000,00 numa exchange nacional é isenta e não
dispara DeCripto. A mesma venda em exchange estrangeira é tributada em 15% e, somada a outras,
pode disparar DeCripto. **A mesma pessoa, o mesmo mês, o mesmo valor, respostas invertidas.**

Existe um teste neste repositório que falha se o código tratar os dois como o mesmo gatilho.

---

## 4. O que não está aqui, e por quê

**Resolução CVM 242** — vigente, publicada no DOU em 14/04/2026, aplicável a exercícios
iniciados em ou após 01/01/2026.
<https://conteudo.cvm.gov.br/legislacao/resolucoes/anexos/200/resol242.htm>

**fato** — aprova o Documento de Revisão de Pronunciamentos Técnicos nº 29 do CPC e vincula
**companhias abertas**.

Não entra nesta ferramenta porque esta ferramenta é de **pessoa física**. O mesmo vale para
IFRS 9 (perda esperada de crédito) e IFRS 16 (arrendamentos): são norma contábil de empresa.
Estão no [`ROADMAP.md`](ROADMAP.md), com o motivo escrito.

---

## 5. O que a ferramenta deliberadamente não faz

- **Não gera o arquivo oficial da DeCripto.** Gera o insumo — o apurado do mês, separado por
  custódia. O leiaute oficial é da Receita e muda; gerar arquivo que o e-CAC recusa é pior que
  não gerar.
- **Não busca cotação.** Nenhuma requisição de rede, nenhuma. O preço é o que você digitar.
- **Não diz quando vender.** Calcula o que aconteceu e o que falta do limite. Sugerir operação é
  aconselhar, e isto não é consultoria.

---

## Como reconferir

```sh
# a isenção ainda é a do art. 22?
#   planalto.gov.br → Lei 9.250/1995 → art. 22, inciso II

# a DeCripto mudou de prazo ou de limite?
#   gov.br/receitafederal → Criptoativos → DeCripto → "Atos referentes"

# saiu MP nova sobre tributação de cripto?
#   in.gov.br → busca por "criptoativo"
```

Achou divergência entre esta página e a fonte? **A fonte ganha.** Abra uma issue.
