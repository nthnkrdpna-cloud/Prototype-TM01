# The engine, from the outside

What it takes, what it returns, and what it guarantees. **No implementation is published here** —
this describes the interface and the properties you can verify from the output alone.

---

## The recipe

A piece is a recipe, not a drawing. The recipe is short and fully determines the result.

```
piece := { seed, family, strokes[5] }
stroke := { type, x, y, size, rotation, mirrored }
```

- **`seed`** — integer. The same seed always yields the same set, in the same order.
- **`family`** — one of four symmetry schemes: *mirrored, radial, column, crossed*.
- **`strokes`** — exactly 5. Five is where the containing ring closes, so every piece is finished;
  there is no half-state in the output.
- **`x`, `y`** — positions on a 64 × 64 lattice, never floating coordinates.

Storing the recipe rather than the drawing is what makes a catalogue cost almost nothing: the
asset is the instruction that produces it.

---

## The semantic layer

Every stroke type carries fixed weights on six axes. A piece's axes are the **sum** of its
strokes' weights, scaled by size. Nothing here is written by hand per piece.

| Axis | Reads as |
|---|---|
| `power` | mass, weight, force |
| `bond` | connection, binding |
| `shelter` | enclosure, protection |
| `motion` | movement, direction |
| `disclosure` | revealing, opening |
| `cost` | expenditure, loss |

Two consequences that matter, and both are checkable from the output:

1. **Colour is derived, never chosen.** The dominant axes determine hue; a piece's colour is a
   function of its own composition.
2. **A finished piece has exactly one colour.** Earlier versions coloured each stroke by the
   moment it was added. That was replaced — the record of how a piece was built belongs beside
   the piece, not inside it.

---

## Sound

The audio path takes the same axis values and returns a list of events — it does not produce
audio itself, and it knows nothing about any audio API.

```
event := { t, hz, timbre, attack, decay, gain, cutoff, detune, noise }
```

One stroke, one event. The rule after the rebuild is the whole design:

> **Each axis owns exactly one sonic dimension, and only that one.**

| Axis | Dimension it owns |
|---|---|
| `power` | register — the only axis that moves pitch |
| `motion` | tempo **and** contour direction, signed |
| `bond` | articulation and interval width |
| `disclosure` | timbre, and the filter opening across the phrase |
| `shelter` | base brightness — never register |
| `cost` | decay, friction, beating |

This rule exists because its absence is what caused the failure documented in the README: when
two axes share a dimension they cancel, and the meaning disappears from the sound.

---

## Invariants you can check from the output

Nothing below requires the source.

| Invariant | How to check it |
|---|---|
| **Determinism** | Regenerate from the published seed; compare bytes |
| **One colour per finished piece** | `grep -o 'stroke="#[0-9a-f]*"' samples/sigils/TM01-001.svg \| sort -u \| wc -l` → **1** |
| **Exactly 5 strokes, always closed** | `grep -o '<path' samples/sigils/TM01-001.svg \| wc -l` → **6**: the five strokes plus the containing ring that closes the piece. (`grep -c` would report 1 — each file is a single line.) |
| **No external dependencies at runtime** | `grep -o 'http[^"]*' samples/sigils/TM01-001.svg \| sort -u` → only `http://www.w3.org/2000/svg`, the required XML namespace. No scripts, no external references. The contact sheet is the one exception: its labels name a system font |
| **Audio reproduces** | Render twice, compare bytes — the noise component is seeded, not random |

**On φ:** every measurement in the engine descends from the golden ratio, but that is a property
of the generator, not something you can confirm from a single SVG — a finished piece is a sum of
derived values, and the derivation is not recoverable from the result. Listed here as a design
rule, and **not** presented as externally verifiable. Claiming otherwise would be the kind of
unfalsifiable statement this document exists to avoid.

---

## Declared limits

Stated because a specification that only lists strengths is advertising.

- **The shape↔sound claim is unproven.** It failed its first test and the rebuild has not been
  re-tested. See the README.
- **Curves are polygonal.** Arcs and spirals are emitted as many short segments. At large sizes
  this is visible; the answer is more samples, not a claim of true curves.
- **Quality gates are heuristics.** They reject loose composition, excessive darkness and
  directionless colour. They do not measure whether a piece is good — that has already been
  demonstrated the hard way.
- **The lattice is 64 × 64.** Fine detail below one cell is not expressible by design.
