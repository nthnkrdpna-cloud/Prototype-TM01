# Roadmap

What exists, what is deliberately not built yet, and why. Written so that "not yet" never has to
be reconstructed from memory.

The rule this list follows: **one tool a person can learn in a minute beats seven modules nobody
finishes configuring.** Everything below is ordered by that, not by how interesting it is to build.

---

## Shipped

| | |
|---|---|
| **Average cost** per asset, per custody, with fees on both sides | `src/nucleo/carteira.js` |
| **Transfers** that carry cost with the coin, and realise no gain | same |
| **R$ 35,000 monthly exemption**, national custody only | `src/fiscal/br/isencao.js` |
| **Foreign custody at 15%**, annual, no exemption | `src/fiscal/br/exterior.js` |
| **DeCripto** reporting trigger, which is a different R$ 35,000 | `src/fiscal/br/decripto.js` |
| **CSV and JSON export**, signed | `src/ui/tela.js` |
| **A golden-ratio scale** driving every measurement on the page | `src/ui/proporcao.js` |

---

## Next, in order

### 1. Exchange statement import

Today the person types or pastes lines. The obvious next step is reading the CSV that Brazilian
exchanges already export, so nothing has to be retyped.

**Why it is not done yet:** each exchange exports a different shape, and a wrong column mapping
produces a complete, plausible, wrong result. It needs one exchange at a time, each with a
fixture file and a test, and each verified against a real statement.

### 2. The DeCripto file itself

The tool tells you whether you must file, and hands you the figures. It does not generate the
file the e-CAC accepts.

**Why it is not done yet:** the official layout belongs to the Receita and changes. A tool that
generates a file the e-CAC rejects is worse than one that generates nothing, because it costs the
person a deadline to find out.

### 3. A second jurisdiction

The calculation core (`src/nucleo/`) knows nothing about Brazil. Every Brazilian number lives in
`src/fiscal/br/`. A second country is a new folder next to it, not a rewrite — that separation
exists precisely so this step stays cheap.

Brazil first was deliberate: it is where the rules are hardest and where the authors can check an
answer against reality.

---

## Not planned, and why

Three things from the original specification are not on this list. They were removed on purpose,
and removing them is the reason the rest exists.

### Order flow, Fibonacci retracements, volatility index

Delta, absorption, POC/VA, 23.6%/38.2%/61.8% retracements, VIX ingestion.

**Not planned** for this tool. These serve an active trader, which is a narrow and very different
audience from "anyone who holds crypto and has to file". Mixing them in would make the first
screen an instrument panel, and the whole point of this phase is that the first screen is one
question.

They are also the part most likely to be mistaken for advice.

### Corporate accounting compliance

Resolução CVM 242, IFRS 9 expected credit loss, IFRS 16 leases, IBGC guidance.

**Not planned.** Verified: CVM 242 approves CPC Technical Pronouncement Revision Document nº 29
and binds **publicly listed companies**, for financial years beginning on or after 1 January 2026.
IFRS 9 and IFRS 16 are corporate accounting standards. None of it applies to an individual
taxpayer, which is who this tool is for. See [`FONTES.md`](FONTES.md) §4.

### Tax planning

Selling inside the exemption window to step up average cost; borrowing against crypto in DeFi to
raise cash without triggering a disposal.

**Not in this repository**, by the authors' decision. Neither is illegal in Brazil — there is no
wash-sale rule for crypto — but a tool that *prompts* them is giving advice, and advice is a
different thing from arithmetic with a different responsibility attached.

The tool shows what happened and how much of the limit remains. It never says what to do next.

---

## How to propose something

Open an issue. Useful ones name the rule, link the norm, and say what the tool currently gets
wrong. A proposal that changes a number must bring the source for it — that is the standing rule
here, and it applies to the authors too.
