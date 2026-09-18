<p align="center">
  <img src="samples/sigils/TM01-001.svg" width="90" alt="">
  <img src="samples/sigils/TM01-007.svg" width="90" alt="">
  <img src="samples/sigils/TM01-013.svg" width="90" alt="">
  <img src="samples/sigils/TM01-019.svg" width="90" alt="">
</p>

# Prototype-TM01

**A generative engine that draws abstract sigils and derives their sound from the same
parameters.** This repository is a **research milestone**, not a product and not the full system:
it publishes samples and measurements, so the work can be looked at and judged from outside.

By **Nthnkr "dpna"** and **AmandaBT**.

> **Status: active development.** The engine works and produces finished pieces. Its central
> claim — that shape and sound carry the same meaning — **was tested, failed, and was rebuilt.**
> It has not been re-tested yet. That is stated up front because it is the honest position, and
> because the failure is the most useful thing here.

---

## What the engine does

A piece is not stored as a drawing. It is stored as a **recipe** — a short, deterministic
description — and drawn from that recipe on demand. The same recipe always produces the same
piece, byte for byte.

| | |
|---|---|
| **Composition** | 5 strokes per piece, from 4 symmetry families, closed by a containing ring |
| **Semantic layer** | 6 axes — *power · bond · shelter · motion · disclosure · cost* — summed from the strokes, never written by hand |
| **Colour** | derived from the axes, not chosen. One colour per finished piece |
| **Sound** | the same axes drive the audio: one stroke, one sonic event |
| **Proportion** | every measurement descends from **φ**, the golden ratio. No number is picked by eye |
| **Output** | plain SVG, no dependencies, no runtime |

**Determinism is the point, not a side effect.** A piece is identified by its seed. Ship the seed
and you ship the whole catalogue — which is why the samples below name theirs.

---

## Samples

The 24 pieces below were generated with seed **`1618033988`** (the digits of φ). The open set in
[`GALLERY.md`](GALLERY.md) uses its own seeds, reserved for publication. Every one of them is
**new** — none belongs to any set that exists elsewhere, verified by comparing the artwork itself
against all 2,400 files of the three packs.

| | |
|---|---|
| [**`GALLERY.md`**](GALLERY.md) | **1,200 pieces in one image**, plus 100 SVG files you can take |
| [`samples/sigils/`](samples/sigils/) | 24 pieces, colour |
| [`samples/sigils-black/`](samples/sigils-black/) | the same 24 in pure black, heavier stroke — the variant made for engraving and skin |
| [`samples/contact-sheet.svg`](samples/contact-sheet.svg) | all 24 on one sheet |
| [`samples/audio/`](samples/audio/) | 6 pieces rendered to WAV — the sound of `TM01-001` … `TM01-006` |

**How these 24 were made, with the numbers:** 24 distinct pieces out of **57 attempts**. The
other 33 were rejected by automatic quality gates — 21 for reading as loose strokes rather than a
glyph, 11 for being too dark, 1 for a colour with no direction. Average weight: **1,196 bytes per
piece** (`cat samples/sigils/*.svg | wc -c`, divided by 24). Six families of rejection exist;
three fired on this batch.

**The audio** is the engine's own event list, rendered offline to PCM. Each piece is 5 events,
0.5 s to 1.4 s. Rendering twice produces identical bytes — the noise component is seeded, not
random.

### Scale

[**`GALLERY.md`**](GALLERY.md) shows **1,200 pieces in a single image** — three composition modes,
400 each — and opens a set of **100 SVG files**, generated from seeds reserved for publication and
verified against every existing piece. That is where to look if the question is what the engine
does at volume rather than what one piece looks like.

---

## What was tested, and what failed

This is the part worth reading. The claim under test was: *a single recipe can drive both the
shape and the sound, and a person will hear the connection.*

**The threshold was written down before the test ran** — 27 correct out of 40 forced-choice
trials, the point where the result stops being explainable by chance.

| | |
|---|---|
| **Result** | **24 / 40.** Below the threshold. p = 0.134 — indistinguishable from guessing |
| **Verdict** | The claim is **refuted as implemented**. Not "needs tuning" |
| **Root cause** | Three of the six axes were competing for the same sonic dimension, and two of them **cancelled out**. Six semantic axes had collapsed into roughly **1.5 perceptual dimensions**. Two opposite meanings were coming out as the same sound |
| **The fix** | One rule: **each axis owns one dimension and only that one.** The mapping was rebuilt, not adjusted |
| **Current state** | **Not re-tested.** The rebuild is untested until a new trial runs against a new pre-registered threshold |

### A second failure, of a different kind

An earlier batch of 400 pieces **passed every automated test** and was judged unusable on sight.

Nothing was broken. The tests measured what they were written to measure, and what they were
written to measure was not quality. The cause turned out to be geometric: spreading the strokes
apart grew the containing ring without growing the strokes, so the pieces came out as large rings
with small debris inside — all correct, all alike, none of them reading as a glyph.

**A green test suite is not evidence that the output is good.** That lesson cost 400 pieces, and
it is the reason the sample set above reports its rejection counts instead of only its successes.

---

## What this repository is not

- **Not the full system.** No engine source is published here. What you see is output and
  specification — see [`ENGINE.md`](ENGINE.md) for the interface and the invariants.
- **Not a finished product.** See the status note at the top.
- **Not a catalogue for sale.** These 24 exist to be looked at.

## Support

The engine is in active development and needs support to reach a finished state. **We are
currently aligning how best to begin crowdfunding**; there is nothing to pledge to yet. If the
work is interesting to you, watching this repository is the useful thing for now.

## License

See [`LICENSE`](LICENSE). Short version: the samples are published so the work can be evaluated,
not so it can be reused.
