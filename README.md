<p align="center">
  <img src="samples/open-set/OPEN-A-001.svg" width="78" alt="">
  <img src="samples/open-set/OPEN-B-007.svg" width="78" alt="">
  <img src="samples/open-set/OPEN-C-013.svg" width="78" alt="">
  <img src="samples/open-set/OPEN-A-019.svg" width="78" alt="">
</p>

# Prototype-TM01

**A Brazilian crypto tax calculator that runs entirely in your browser, and a generative engine
whose output signs what it produces.** Open source, no install, no account, no server.

By **Nthnkr "dpna"** and **AmandaBT**.

> **Nothing leaves your machine.** The page makes no network requests at all — no price lookup, no
> analytics, no external fonts. You are pasting a financial statement; that is not a promise to
> take on trust. Open your browser's network panel and watch it calculate.

---

## The tool

Open [`index.html`](index.html). One file, straight off disk. Paste your operations, one per line:

```
2026-09-01    compra         BTC    0,5   150.000,00   nacional
2026-09-05    compra         ETH    2      40.000,00   exterior
2026-09-10    transferencia  BTC    0,2   nacional     autocustodia
2026-09-15    venda          BTC    0,2    70.000,00   autocustodia
2026-09-20    venda          ETH    1      25.000,00   exterior
```

It gives you weighted average cost per asset, the monthly total by custody, how much of the
exemption is left, the tax due under each regime, and whether you have to file DeCripto — plus
CSV and JSON you can hand to an accountant.

**It will not tell you when to sell.** It shows what happened and what remains. Suggesting a
trade is advice, and this is arithmetic.

The interface is in Portuguese because the rules it applies are Brazilian. Everything else here
is in English.

---

## The one thing worth knowing, if you read nothing else

**There are two different R$ 35,000 thresholds in Brazilian crypto tax, and they trigger on
opposite things.**

| | Exemption | DeCripto |
|---|---|---|
| What it does | you owe no tax on the gain | you are required to report |
| Source | Lei 9.250/1995, art. 22, II | IN RFB nº 2.291/2025 |
| Where it applies | disposals on a **Brazilian** exchange | operations **outside** a Brazilian exchange |
| Crossing it means | you start paying | you start filing |

The same month can be exempt and reportable, or taxed and not reportable. And **the exemption
does not exist for foreign custody at all** — Lei 14.754/2023 taxes that at a flat 15% with no
monthly allowance.

Get this wrong and the tool tells a person they owe nothing when they owe. It is the most
expensive mistake available here, so custody is the *structure* of the calculation rather than a
field on a form, and there is a test that fails if the two thresholds ever start agreeing.

Every rule, with its norm and the date it was last checked, is in [`FONTES.md`](FONTES.md).
A number without a source does not ship.

---

## Where this comes from

This repository began as a **research milestone**: a generative engine that draws abstract sigils
and derives their sound from the same parameters. That work is still here, and still the reason
the rest exists.

| | |
|---|---|
| [**`GALLERY.md`**](GALLERY.md) | **1,200 pieces in one image**, plus 100 SVG files you can take |
| [`ENGINE.md`](ENGINE.md) | the engine's interface and invariants |
| [`samples/`](samples/) | 24 sigils in colour and in black, a contact sheet, 6 rendered to WAV |

**The engine was built inside a larger project.** That project's earlier phase — a procedural RPG
— is **paused**. The current phase is this: take one capability, make it a tool a person can use
in a minute, and put it in the open. What you are looking at is that phase, not a detour from it.

### The signature, and what it actually is

Every closed month gets **its own sigil**, chosen deterministically from the 100 published pieces
by a 32-bit code derived from the figures themselves. Same month, same sigil, always. One cent
different, different sigil. It rides along in the CSV and the JSON.

That makes the mark do work instead of decorating: two summaries of the same month with different
drawings are two different calculations, and you can see that at a glance without reading a single
number. It is a checksum a person can look at.

**It runs one way only, and here is the limit stated rather than left to be found.** A different
drawing proves a different calculation. The same drawing proves nothing — there are 100 published
pieces, so by the birthday bound two unrelated months share a drawing about **half the time by the
twelfth statement**. The 8-character hex code beside it is the real identifier; the drawing is the
coarse, human-readable proxy. Compare the codes when it matters.

**It is not protection.** It detects nothing, prevents nothing, and anyone who wants to forge it
can — the code comes from public data through a public function. It is identity and provenance.

**No engine source is published in this repository.** The tool draws nothing; it selects among
files that were already published. The code here — the tax calculation, the golden-ratio scale,
the interface — is open under AGPL-3.0. The engine that made the sigils is not part of it.

### Proportion

Every measurement on the page descends from **φ**, through `escala(n) = φ^(n/2)`. Padding, type
sizes, the lot. The CSS cannot compute φ, so [`src/ui/proporcao.js`](src/ui/proporcao.js) computes
it and the stylesheet only consumes the result — delete that file and the page loses all of its
spacing, which is what makes the claim checkable instead of decorative.

⚠️ **This is a rule we follow, not a property you can verify from outside.** Looking at one
number — 20.4px — nobody can derive that it is `16 × φ^(1/2)`. Saying otherwise would be selling
something we do not deliver.

---

## What was tested, and what failed

The engine's central claim was: *one recipe can drive both the shape and the sound, and a person
will hear the connection.* **The threshold was written down before the test ran** — 27 correct out
of 40 forced-choice trials.

| | |
|---|---|
| **Result** | **24 / 40.** Below threshold. p = 0.134 — indistinguishable from guessing |
| **Verdict** | **Refuted as implemented.** Not "needs tuning" |
| **Root cause** | Three of six axes competed for the same sonic dimension and two cancelled out. Six semantic axes had collapsed into roughly **1.5 perceptual dimensions** |
| **The fix** | One rule: **each axis owns one dimension and only that one.** Rebuilt, not adjusted |
| **Current state** | **Not re-tested.** Untested until a new trial runs against a new pre-registered threshold |

### A second failure, of a different kind

An earlier batch of 400 pieces **passed every automated test** and was unusable on sight. Nothing
was broken — the tests measured what they were written to measure, and that was not quality.
Spreading the strokes apart grew the containing ring without growing the strokes, so the pieces
came out as large rings with small debris inside.

**A green test suite is not evidence that the output is good.** That lesson cost 400 pieces, and
it is why `prova/navegador.mjs` opens a real Chromium and looks at the page instead of trusting
the unit tests.

---

## Running it

```sh
npm test            # unit tests, no dependencies needed
npm run construir   # rebuild index.html from src/
npm run prova       # open it in a real Chromium and check it (needs playwright)
```

The build flattens `src/` into a single `index.html` because ES modules do not load over
`file://`. It refuses to build on a duplicate top-level name — that guard exists because two such
collisions already happened here, and neither broke a single test.

---

## Support

This is free software, built by two people, and it stays free. If it saved you an afternoon or a
fine, support keeps it maintained — tax rules change, and a calculator nobody updates goes wrong
quietly.

**Brazil first: [`APOIO.md`](APOIO.md) has a Pix key**, so supporting this does not require an
international card — which is the difference between "anyone can support it" and "anyone with a
Visa can". GitHub Sponsors follows once the account is approved.

**No tiers, no rewards, no promised features.** Tiers create an obligation to ship on a schedule,
and that is how an honest project turns into a treadmill. The roadmap does not reorder because
someone paid.

If you would rather not pay: keep using it. The tool counts no users, has no analytics and does
not know you exist. **Opening an issue when a number is wrong, with the norm beside it, is worth
more than a month of support** — it fixes the figure for everyone at once.

---

## Not advice

This software applies documented rules to numbers you type. It is not tax advice, the authors are
not your accountant, and responsibility for what you file is yours. Where a norm admits more than
one reading, the tool says so on screen and takes the more conservative one — erring toward less
tax owed would be gambling with somebody else's money.

## License

Code under **AGPL-3.0**; artwork all rights reserved. A commercial licence for the code is held by
the authors. See [`LICENSE`](LICENSE) — the difference between the groups is spelled out there,
and it matters.
