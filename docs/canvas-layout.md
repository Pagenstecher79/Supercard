# The canvas layout model

A design for replacing Supercard's three-level layout with a single canvas on
which gauges, progress bars and labels are placed freely or on a grid.

**Nothing here is built yet.** This is the model and the migration, written
down first because the migration is the part that can silently destroy
someone's dashboard.

Decisions already taken:

- **Existing configurations migrate automatically.** No second model kept
  alongside, no manual conversion step.
- **The canvas has a fixed aspect ratio.** The card scales uniformly into
  whatever space it is given instead of reflowing. Font sizes need no
  conversion: they are already in container units - see below.
- **Animated surfaces stay out of scope** for now. They remain what they are
  today — a colour pattern pointed at a target — and may become placeable
  objects later.

---

## 1. What the model is today

Three nested levels, all in percentages, none of them absolute:

```yaml
supercard:
  layout_rows:
    - id: r1
      flex: 60          # % of card height. 0 or absent = share what's left
      auto_width: false # true = cells split the row equally, ignoring width
      cells:
        - id: c1
          width: 50     # % of row width (default 100)
          overflow_visible: false
          _grid: …      # editor-only state
          _gridSnap: 5  # editor-only: snap step, in % of the cell
          items:
            - id: gauge_0   # the element -> <slot name="gauge_0">
              x: 0          # % of THIS CELL
              y: 0
              w: 100
              h: 100
              inner: cc     # 9-sector alignment inside the box
              overflow: false
              font_size: 14
              font_unit: px
              font_weight: 600
              font_color: "#fff"
              font_adaptive: false
```

`item.id` is the element id — `gauge_0`, `progressbar_1`, `label_2`, `icon`,
`name`, `state` — and becomes a `<slot name>` in `sc-layout-renderer`.

### How the percentages actually resolve

The migration has to reproduce these exactly, so they are worth stating.

**Row height.** Rows with `flex > 0` take that percentage. The rest share what
remains, equally:

```
explicitSum = min(100, Σ flex where flex > 0)
autoRows    = count of rows without flex > 0
rowPct(r)   = flex(r) > 0 ? flex(r) : (autoRows ? (100 - explicitSum) / autoRows : 0)
```

Rows are laid out with `flex: 0 0 <pct>%` — **no shrink**. Two rows at 60 %
each really do occupy 120 % and overflow the card, and a configuration in the
wild may be relying on that. The migration reproduces the numbers as written;
it does not normalise them to 100.

**Cell width.** With `auto_width`, cells split the row evenly. Otherwise each
cell gets `width` (default 100) as a `flex-basis`, with `flex-grow: 0` and
`flex-shrink: 1`:

```
basis(r,c) = row.auto_width ? 100 / cells.length : (cell.width || 100)
sum        = Σ basis over the row
cellPct    = sum > 100 ? basis / sum * 100   # they shrink proportionally
                       : basis               # leftover space stays empty
```

Cells, unlike rows, **do** shrink (`flex-shrink: 1` by default, only
`flex-basis` is set inline). So the two axes behave differently when they
overflow, and the migration has to keep them different: rows overflow, cells
compress. Getting this backwards moves every element in an over-full row.

The other branch matters just as much: a row whose cells sum to 80 has a 20 %
gap on the right, and a migration that normalises to 100 would silently stretch
everything into it.

### Legacy shapes still accepted

`getCellItems()` in `supercard-04-layout.js` is already a migration. Anything
new has to keep reading these, because configurations in the wild contain
them:

| old | meaning |
|---|---|
| `item.r`, `item.c`, `item.r2`, `item.c2` | a 3 × 3 grid; converts at 33.333 % per step |
| `item.size_n` / `size_v`, `weight_n` / `weight_v`, `color_n` / `color_v`, `unit_n` | earlier names for the `font_*` fields |
| `cell.content` with no `items` | one element filling the cell (100 % for a gauge, else 33.333 %), with the cell's own `inner_c` and font fields |

---

## 2. The new model

One level. One coordinate space.

```yaml
supercard:
  canvas:
    w: 400          # virtual units — with h, this IS the aspect ratio
    h: 200
    grid: 10        # visible grid spacing in virtual units
    snap: 10        # unset = snap to grid | 0 = free | n = custom step
    elements:
      # A surface: a plain box with no entity, which colour and fx-glass can
      # target like anything else. See "Cell targets" below.
      - id: surface_0
        surface: true
        x: 0
        y: 0
        w: 400
        h: 60
      - id: gauge_0 # unchanged element ids
        x: 20       # virtual units, absolute on the canvas
        y: 20
        w: 160
        h: 160
        inner: cc         # carried over unchanged
        locked: false     # editor-only: selectable, never moves
        font_size: 14     # all font_* carried over unchanged
        font_unit: px
        font_weight: 600
        font_color: "#fff"
        font_adaptive: false
        overflow: false
```

**`w` and `h` do two jobs at once**, and that is the point of choosing virtual
units over percentages: they define the coordinate space *and* the aspect
ratio, so there is no second place where the shape of the card is configured
and no way for the two to disagree. `grid: 10` on a `400 × 200` canvas means a
40 × 20 grid, which is a thing you can picture; `grid: 2.5` (percent) is not.

**`snap` is tri-state**, following easy-floorplan: unset means snap to the
visible grid (the default, and what most people want), `0` means free
placement, a positive number is a custom step. One field, no separate
"snapping on/off" boolean that can contradict a step value.

**Stacking is array order.** Later elements draw on top. No `z` field until
something needs one — reordering a list is a UI affordance people already
understand, and a z-index field invites two elements claiming the same layer.

### Rendering: HTML, not SVG

easy-floorplan draws its canvas as one SVG with a `viewBox`, because it draws
shapes. Supercard places existing custom elements, so the canvas stays HTML:

```html
<div class="sc-canvas" style="aspect-ratio: 400 / 200; container-type: size">
  <div class="sc-el" style="left: 5%; top: 10%; width: 40%; height: 80%">
    <slot name="gauge_0"></slot>
  </div>
</div>
```

Positions convert to percentages at render time (`x / canvas.w * 100`). With
the aspect ratio fixed, percentage positioning *is* uniform scaling — the SVG
`viewBox` would buy nothing here and would cost the ability to put HTML
custom elements inside.

**Each element wrapper must keep `container-type: size`.** `sc-gauge` sizes
itself with `100cqmin` against the nearest size container, which today is
`.sc-item-slot`. Drop that and gauges collapse. This is the single most
easily-missed detail in the whole change.

### What replaces `--sc-scale`

Today `--sc-scale = max(0.3, min(w, h) / 70)` when either responsive flag is
set, and font sizes, icon sizes and paddings are multiplied by it.

The plan here was to make font sizes virtual units resolved through a measured
`--sc-canvas-scale`. **Looking at real configurations made that unnecessary.**
Every font size in the wild is already written in container units:

| `font_unit` | occurrences in 23 real layouts |
|---|---|
| `cqmin` | 11 |
| `cqw` | 6 |
| `px` | 0 |

The renderer resolves them as `min(<size><unit>, 100cqh, 100cqi)` against the
element's own size container. Since every element wrapper keeps
`container-type: size` — which it must anyway, for `sc-gauge` — an element's
type scales with the element's box, and the box scales with the canvas. Type
therefore scales with the card for free, per element, which is better than one
card-wide factor would have been.

So there is no `--sc-canvas-scale`, and migration does not reinterpret
`font_size` at all: the numbers and their units carry over untouched. `px` and
`em` remain selectable in the editor and remain absolute, exactly as today.

---

## 3. Migration

Deterministic and lossless except for one thing, named in §4.

For every row `r`, cell `c`, item `i`, using `rowPct` and `cellPct` from §1:

```
rowTop(r)     = Σ rowPct(k)   for k < r
cellLeft(r,c) = Σ cellPct(r,k) for k < c

xPct = cellLeft(r,c) + item.x / 100 * cellPct(r,c)
yPct = rowTop(r)     + item.y / 100 * rowPct(r)
wPct =                 item.w / 100 * cellPct(r,c)
hPct =                 item.h / 100 * rowPct(r)

element = { id: item.id,
            x: xPct / 100 * canvas.w,
            y: yPct / 100 * canvas.h,
            w: wPct / 100 * canvas.w,
            h: hPct / 100 * canvas.h,
            …every other item field verbatim }
```

Order: rows top to bottom, cells left to right, items in array order. That
reproduces today's DOM order, so anything that depended on stacking keeps its
stacking.

The legacy shapes in §1 are resolved **first**, by running the existing
`getCellItems()` — the migration consumes its output, not the raw config. That
way there is exactly one place that understands the old field names, and it is
the one already proven against real configurations.

### Migration runs on read, and writes back

Read `layout_rows` → produce `canvas` → hand the canvas to the renderer. Write
the migrated config back only when the user next saves in the editor, not on
load. A card that rewrites someone's stored config just for being displayed is
a card that can corrupt a dashboard while nobody is watching it.

Keep `layout_rows` in the config after migrating. It costs a few hundred bytes
and it is the only way back if the migration turns out to be wrong for a
configuration nobody anticipated.

---

## 4. What migration cannot recover

**The aspect ratio.** The old model has none — it is percentages all the way
down, and the card takes whatever shape the dashboard column gives it. There
is no stored value to convert. So the migration has to *choose* one, and any
choice will be wrong for some cards.

Proposal: default to `400 × 200` (2:1), and where `card_height` is set and
`card_height_responsive` is off, use `w = 400, h = 400 * card_height / 200`…
which is still a guess, because the width was never fixed either.

This is the real cost of the fixed aspect ratio, and it should be stated
plainly in the release notes rather than discovered: **existing cards will
change shape once, and need their canvas dimensions set to taste.** Everything
*inside* the card keeps its relative arrangement exactly.

### Cell targets, and the surface element

The colour, fx-glass and interaction modules can target a layout cell as
`r0c0`, resolved at runtime to `sc-layout-renderer::part(cell-0-0)`. In a flat
canvas there are no cells, so those ids have no referent.

Counting them against 30 real cards settled how to handle it — and corrected
two guesses this document made first:

| | count |
|---|---|
| target a cell holding several elements | 8 |
| **target a row that does not exist** | **8** |
| target a cell holding exactly one element | 1 |
| target an empty cell | 0 |

The second row was the surprise. `r2c0` on a card with two rows: a row was
deleted and the pattern kept pointing at it, so it has been painting nothing
for a while already. Half the cell targets on a real dashboard are dead.
(An earlier draft of this document guessed these were people painting
decorative empty regions. They are not. Nobody in this corpus targets an
empty cell.)

**The answer is a surface element**, and it makes the migration exact rather
than lossy. A targeted cell becomes a `surface`: a plain box with the cell's
geometry and no entity behind it, emitted *before* that cell's own elements so
it sits underneath them. The pattern then targets the surface and paints
precisely the region it painted before — including the case of a cell holding
several elements, which was the one with no faithful answer.

```yaml
- id: surface_0
  surface: true
  x: 0
  y: 0
  w: 400        # the cell's box, not any element's
  h: 150
```

Surfaces are created **only** for cells something actually targets; migration
does not invent elements nobody asked for. Targets naming a cell that does not
exist are dropped and reported, because repointing a pattern that was doing
nothing would make the card change appearance for the worse.

This is the "animated surfaces" feature arriving early, in its smallest form:
a placeable box that colour and fx-glass can address like any other element.
It is here because migration needs it, not because the editor does yet.

### Verified against real configurations

The arithmetic in `src/canvas-model.js` was run against 30 Supercards from a
live dashboard, and its output compared with the boxes the current renderer
actually produced in the browser:

- **14 cards, 55 element boxes, worst deviation 0.0023 percentage points** —
  floating-point noise, no mismatches.
- 127 elements produced across all 30 configs: no non-finite, non-positive or
  negative geometry, nothing outside the canvas.
- Cell shapes in the wild: **68 legacy `cell.content` against 30 modern
  `items`**. The legacy path is not a relic to tolerate, it is the majority
  case.

## 5. The card's height

A fixed aspect ratio and Home Assistant's height control are two answers to
the same question, and the first version of the canvas let them disagree in
silence. This is how they are joined.

### What Home Assistant does

In a sections view every card reports `getGridOptions()`, and the card's own
`grid_options` in the Lovelace config is spread over the result — so anything
the card reports is a *default* the layout tab may override. `hui-grid-section`
then reads the merged value:

- `rows: N` → the card gets `grid-row: span N` **and** an explicit height,
  `N * (row-height + row-gap) - row-gap`, i.e. `N * 64 - 8` px with the default
  theme.
- `rows: "auto"` → no explicit height at all. The card is as tall as it
  renders. This is Home Assistant's own default (`DEFAULT_GRID_SIZE`), and the
  layout tab exposes it as the **auto height** switch.

### Why a canvas card cannot report a row count

The canvas fixes a *ratio*. Turning that into a height needs the card's width,
which is `columns / 12` of the section — and the section width is a layout
result, not something the card can know when `getGridOptions()` is called. No
row count is right.

So a canvas card reports `rows: "auto"` and lets the box it actually gets be
the answer. A row/cell card keeps reporting the fixed `3` it always has: its
rows are percentages *of* a height, so it has no intrinsic height to offer and
`auto` would collapse it to nothing. `reportedRows()` is that one rule.

Supercard reported `rows: 3` for every card before this. That is the whole
reason the layout tab offered nothing but a row count: the card had asked for
a fixed height, and got one.

### When the height is pinned anyway

Someone can still set a row count — that is the point of the control. Then the
card's box is fixed and the canvas has to fit inside it rather than define it.
It is letterboxed: the ratio is kept, the canvas centres, nothing stretches.

A `max-height: 100%` is *not* how to do that. It clamps the height and leaves
the width at 100%, which breaks the ratio — the single thing the fixed ratio
exists to prevent. Instead the width comes down from the height:

```css
width: min(100%, calc(100cqh * <w/h>));
```

against a wrapper that is a size container. That wrapper is emitted **only**
when the height is pinned, because `container-type: size` needs a definite
height; against an indefinite one it would contain the card to nothing. Which
mode applies travels to the renderer as `__heightPinned` on the render config,
next to the existing `__moduleData` — modules are handed the slot, and this is
a fact about the card.

Measured, canvas `400 × 200` in a 300 px column:

| box | canvas | ratio |
|---|---|---|
| 300 × auto | 300 × 150 | 2.0 |
| 300 × 400 (too tall) | 300 × 150 | 2.0 |
| 300 × 100 (too short) | 200 × 100 | 2.0 |
| 300 × 150 (exact) | 300 × 150 | 2.0 |

The previous build put a 300 × 150 canvas into the 300 × 100 box and clipped
50 px off the bottom.

### One value, two places

`grid_options.rows` is Home Assistant's field, so the canvas editor writes
*that* rather than a setting of its own — through a new `__card__` commit key,
since `commitFn` otherwise writes into `config.supercard`. The **Card height**
row in the canvas editor and the layout tab's height control are two views of
one value; there is nothing to keep in step.

### `card_height` is not a second pin

The core editor's **Absolute height (px)** publishes `--sc-explicit-height` on
`#main-container`, while `:host` is what reads it. A custom property does not
travel back up to the host, so the field has never had any effect — in this
build or any before it. It is therefore not treated as pinning the height:
doing so would shrink every canvas card carrying a stale value. Fixing it is a
separate decision, because it would change the size of cards that have quietly
ignored the setting for as long as it has existed.

## 6. Gauges are square

A gauge is drawn into a square viewBox whatever its type. A "semi" gauge is a
270° arc in that same box, not half of one, so there is no gauge shape that
wants a wide or a tall element.

The renderer has always known this: `::slotted(sc-gauge)` sizes the gauge
`100cqmin` — the smaller side of its slot. So a gauge has never been able to
come out oval. What a non-square slot produced instead was a *small* gauge
with empty space beside it, and no way to tell from the editor why: the
element you were dragging was not the thing you saw.

So on the canvas a gauge element is locked to a square, and the lock lives in
the model rather than in the drag handler:

```js
isSquareLocked(el)   // gauge_N, and not a surface
squareElement(el)    // the largest square inside it, anchored by `inner`
```

`applyDrag` consults the first when it resizes, `migrateLayoutToCanvas` applies
the second, and the editor renders one **size** field instead of a `w` and an
`h` that would have to be kept in step. A surface over a gauge is never locked
— it is a plain box for a pattern to paint, and squaring it would repaint a
different region.

### Why `w === h` is the whole test

Canvas units look anisotropic and are not. An element's box is a percentage of
`canvas.w` × `canvas.h`, and the canvas element itself carries
`aspect-ratio: canvas.w / canvas.h`, so with `W/H = canvas.w/canvas.h`:

```
width  px = el.w / canvas.w × W  =  el.w / canvas.h
height px = el.h / canvas.h × H  =  el.h / canvas.h
```

The ratio cancels. One virtual unit is the same number of pixels on both axes,
whatever shape the canvas is, so square on screen is exactly `el.w === el.h` —
and both sides can snap to the grid without the shape drifting off it.

### Squaring on conversion changes the box, not the picture

`squareElement` anchors the square using the element's own `inner` code, the
same two characters the renderer turns into flex alignment. A `cc` gauge was
already being drawn as a centred square of the smaller side; after squaring,
the element *is* that square. Nothing moves. What changes is that the box now
means something: drag it bigger and the gauge gets bigger.

Because migration only runs when someone presses **Convert**, this affects
conversions from here on and never rewrites a card that is already converted.
Existing canvas cards keep their boxes until a gauge in them is resized.

### The size lives in one place

With the element square, `100cqmin` is the element, so the element's size *is*
the gauge's size — but only for a gauge in responsive mode. A gauge in fixed
mode draws itself `gauge_size_px` pixels wide inside the slot and ignores the
box entirely, which on a canvas is a setting that can only contradict the one
next to it.

So `SC.gaugeIsResponsive(gaugeConfig, onCanvas)` answers yes for anything on a
canvas, and the gauge editor hides **Responsive size** and **Size (px)** there.
The helper is shared because fx-glass has to reach the same answer: it picks
`cqmin` or `px` units for the glass ring from it, and a disagreement measures
the ring in pixels against a gauge measured in container units.

Off the canvas the helper reproduces today's test exactly, including its known
mismatch: the editor hides the pixel field when `gauge_size_responsive` is the
*string* `"true"`, while the renderer only accepts the boolean, so such a card
shows no control and still draws at `gauge_size_px`. Widening the test would
resize those cards, so it is left alone and recorded here.

The one behaviour this changes for an existing card: a canvas card whose gauge
was in fixed-pixel mode now fills its element instead. `gauge_position_mode`
and the two offsets only ever applied in fixed mode, so they stop applying
there too — as they already did for every responsive gauge.

## 7. Build order

1. ~~**The migration function alone**, pure.~~ `src/canvas-model.js`.
2. ~~**Verify it against real configurations.**~~ 23 real layouts; migration
   output compared with the boxes the current renderer draws, worst deviation
   0.0023 percentage points over 55 boxes.
3. ~~**The renderer** against the new model, with the old one still present.~~
   Both paths compared over the same 23 layouts, 104 boxes, worst deviation
   0.0013 percentage points.
4. ~~**The editor.**~~ `sc-canvas-editor`, reachable once a card has a
   `canvas`, with a Convert button offered on cards that do not.
5. ~~**The card height.**~~ `rows: "auto"` reported, letterboxing when a row
   count is set, and one height control in both places - see §5.
6. ~~**Gauges sized by their element.**~~ Square-locked gauge elements, and one
   size control rather than two that contradict - see §6.

What is left is the part no amount of arithmetic settles: **switching cards
over**. Today conversion is a button someone presses. Making it automatic
means choosing an aspect ratio for every existing card at once, and that is a
release decision, not a code one - see §4.
