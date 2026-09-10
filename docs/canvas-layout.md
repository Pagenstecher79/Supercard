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

### Migration runs on Convert, and only there

Migration is one button's job. The renderer takes the new path only for a
config that already carries a `canvas`; nothing migrates on the way in.

This was originally drafted the other way — migrate on read, hand the result
to the renderer, write it back at the user's next save — and `resolveCanvas()`
existed for it. Nothing ever called it. Convert is the better answer to the
same worry: a card that rewrites someone's stored config just for being
displayed can corrupt a dashboard while nobody is watching, and a button
cannot. It also keeps the two paths comparable while both exist, which is the
only way to check that the new one puts things where the old one did.

Keep `layout_rows` in the config after converting. It costs a few hundred
bytes and it is the only way back if the migration turns out to be wrong for a
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

Surfaces are created **only** for cells a colour or fx-glass pattern paints;
migration does not invent elements nobody asked for. `paintedCells` is that
list. Interactions are deliberately not in it - `clickedCells` collects those
apart, because a surface takes no pointer events, so a cell's tap action turned
into one would be a box that looks migrated and never fires. Targets naming a
cell that does not exist keep the target they have: repointing a pattern that
was doing nothing would make the card change appearance for the worse, and an
entry can carry a whole palette, so deleting it throws away work to tidy
something that already costs nothing.

This is the "animated surfaces" feature arriving early, in its smallest form:
a placeable box that colour and fx-glass can address like any other element.
It is here because migration needs it, not because the editor does yet.

### Conversion repoints the patterns, in the same commit

A surface is only half the answer. `migrateLayoutToCanvas` returns the mapping
it made as `cellTargets` (`{ r0c0: 'elm_surface_0' }`), and `repointPatterns`
writes it into the colour and fx-glass lists. Both store an element target as
`elm_<id>`, which is the form the map already carries, so one map serves both.

It has to travel in the **same** commit as the canvas. `_commit` clones the
card config and Home Assistant writes it back asynchronously, so two commits in
one tick silently lose the first - and a card that got its canvas but not its
repointed targets is exactly the card whose background disappeared. That is why
Convert merges `canvas` and the changed lists together, and why only the lists
that changed are in the payload.

The pattern list itself is otherwise untouched: same entries, same order, same
ids, same colours, conditions and names. Only `target` moves, and only where
the cell really existed.

The offer says all of this before it is taken. The convert box counts the cells
whose paint will be carried over, names the dead targets it is leaving alone,
and warns - in bold, because this one loses behaviour - about tap actions on
cells, which have to be pointed at an element by hand afterwards. `npm test`
covers `paintedCells`, `clickedCells`, `deadCellTargets` and `repointPatterns`,
because a wrong answer here is invisible until someone's background is gone.

### Addressing an element on the canvas

A surface is only worth creating if something can paint it, and for a while
nothing could. The canvas renderer names every element it draws as a shadow
part - `part="element-<id>"`, surfaces included - and that box is exactly the
region a cell used to be, so it is what a pattern should paint. But colour
resolved only `main` and `rXcY`, and fx-glass's element selectors all named a
component: a gauge, a bar, a label. A surface has no component. It fell
through to `[slot="surface_0"]`, which matches nothing, because a surface is
not slotted content - it is a div inside the renderer's shadow.

`SC.canvasPartSelector(id)` is that one selector, shared rather than written
out in each module, since the renderer and both consumers have to agree on it.
Colour now resolves an `elm_` target through it, which makes every canvas
element paintable and not just surfaces; fx-glass uses it for the ids that
have no component of their own.

The cell case keeps a foundation the canvas case must not copy. A cell got
`position: relative; z-index: 510` so its `::before` had something solid to
sit on, and cells do not overlap, so lifting one changed nothing. Canvas
element boxes are already positioned, they all share one z-index, and their
array order *is* their stacking order - that is what the editor's forward and
backward buttons move. Forcing one box to 510 would drop a surface on top of
the very elements it was emitted underneath. The `::before` keeps its own
`z-index: -1`, which puts the paint behind the element's content within the
element's own stacking context, and leaves the siblings alone.

### What the target pickers offer

Paintable is not the same as selectable. Colour, fx-glass and interaction each
build their own target list, and all three used to list `layout_rows` - which a
converted card keeps, so a canvas card offered cell ids naming parts that had
stopped existing, and offered no surface at all, because `SC.getAvailableElements`
only knew the gauges, bars and labels the lists contain.

Two rules now decide, and they are the same rule seen twice: a target is offered
only if the card actually draws the box it names.

- On a canvas the cells group is suppressed and the element group takes over,
  surfaces included. On a rows card it is the other way round, unchanged.
- An element the canvas does not place is left out, through `SC.showsElement` -
  the same helper that stops the module creating it. `.sc-content-row` is
  `display: none` under `layout_active`, so an unplaced icon, name or state is
  not on the card either, and a gauge or bar is not created at all. On a rows
  card `showsElement` says yes to everything, so the filter only bites where it
  should.

Interaction deliberately offers no surface. `.sc-canvas .sc-surface` is
`pointer-events: none`, so a decorative box does not eat the clicks meant for
whatever is drawn over it - a surface that could be given a tap action would be
a surface that silently swallows one.

The three lists still format that answer their own way, and one difference is a
stored format, not a style: colour and fx-glass write `elm_gauge_0`, interaction
writes `gauge_0`. Changing that means migrating saved cards, so it stays.

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

Off the canvas the helper reads `gauge_size_responsive`, counting the string
`"true"` as well as the boolean. A hand-written config can carry the string
where the editor's checkbox would have written a boolean, and both editor
controls have always read it that way - the checkbox shows such a card as
switched on, and the pixel field hides itself. Only the renderer disagreed, so
the card offered no size control and still drew at `gauge_size_px`. There is
now one test rather than three, and the editor's field condition calls it.

That does change how such a card is drawn: it becomes responsive, which is
what its config already said and what its editor already showed. Setting
**Responsive size** off writes a real boolean and restores the pixel size.

The one behaviour this changes for an existing card: a canvas card whose gauge
was in fixed-pixel mode now fills its element instead. `gauge_position_mode`
and the two offsets only ever applied in fixed mode, so they stop applying
there too — as they already did for every responsive gauge.

## 7. The canvas takes the card's shape

Conversion used to migrate into `DEFAULT_CANVAS`, a flat 400 × 200. Every card
that was not 2:1 therefore changed shape the moment it was converted — and a
gauge, which fits the smaller side of its box, shrank. That was the visible
symptom: a converted gauge card next to an unconverted one, the same size on
the dashboard, with a much smaller gauge in it.

### The box a card actually occupies

Home Assistant's section is `HA_COLUMN_COUNT` equal columns with a gap; a card
spanning *n* of them is *n* columns plus the *n − 1* gaps between. So both
axes come out of `grid_options`:

```
width  = n × colUnit + (n − 1) × 8      colUnit = (sectionWidth − 11 × 8) / 12
height = rows × 56 + (rows − 1) × 8     = rows × 64 − 8
```

Measured against real cards on a real dashboard, with a section 480px wide:

| columns | width | rows | height |
|---|---|---|---|
| 12 | 480 | 3 | 184 |
| 6 | 236 | 4 | 248 |
| 3 | 114 | 8 | 504 |

`gridColumnsToPx` reproduces all of them. A six-column, four-row card is
236 × 248, which scaled to a longer side of 400 is **381 × 400** — the shape
`canvasFromGrid` now hands Convert.

### Why the section width is a reference, not a measurement

A section's width is a layout result: it changes with the viewport, and it is
not knowable from inside a card at the moment someone presses Convert.
`HA_SECTION_WIDTH` is therefore a fixed reference, measured on a real
dashboard. Only the *ratio* between a column and a row is ever used, so what
the constant decides is how wide a column counts relative to a row — and on a
narrower section the card is narrower and the canvas letterboxes, the same
trade a fixed aspect ratio makes everywhere else.

### One box, set in either place

The canvas editor now sets **both** halves of that box — *Card width* in
columns and *Card height* in rows — through `commitFn('__card__', …)`, so they
are the same `grid_options` the Layout tab writes. Changing either one there
also reshapes the canvas to match, via `rescaleCanvas`, which scales the
element coordinates by the same two factors and re-squares the gauges (a
square scaled by two different numbers stops being one).

Both writes go out as a single `commitFn('__batch__', …)`. Two commits in one
tick would lose the first: `_commit` clones `this.config`, and Home Assistant
writes that back asynchronously, so the second clone is still the pre-edit one.

The reshape is deliberately **not** done on render. A change made in the Layout
tab instead surfaces as a *Match the card* button, shown only while the two
shapes actually differ. A card that rewrites its own config for being displayed
can corrupt a dashboard while nobody is watching; the editor asking once is the
version of that which cannot.

With the height on *Fit the canvas* there is no row count to match, and the
button does not appear: the canvas is the height in that mode, and deriving one
from the other in both directions is a circle.

## 8. The preview draws the real thing

The canvas editor renders the actual `sc-gauge` and `sc-progressbar` for every
element it can resolve, in the box that element occupies, instead of a blue
rectangle with an id in it. A *Live preview* switch turns that off again and
gives back the plain boxes, which stay the easier thing to see and to grab
when elements overlap.

Three facts make this cost almost nothing:

- **Both renderers are already `pointer-events: none`** on their host, because
  the card puts them behind its own interaction layer. So a live element
  inside a draggable box cannot swallow the drag: hit-testing at the centre of
  a rendered gauge lands on the editor's own `.el` div.
- **A gauge element is square**, so the box it is dropped into is the size the
  gauge wants, and `onCanvas` already exists as a property to say so - see §6.
- **The id is the index.** `gauge_0` is `gauges[0]`, the same convention
  `onAfterRender` slots by, so the preview needs no lookup table of its own.

Each branch mirrors what its module's `update()` does, including the
`gauge_active` / `progressbar_active` flags and a bar's own `active: false`.
Anything that cannot be resolved - a surface, a label, an id pointing past the
end of the list, a missing `hass` - keeps the plain box rather than failing.

### Never live while dragging

Every `pointermove` commits, and a commit clones the config, so the components
would be handed a new `.config` at pointer frequency and re-render completely
on each frame. During a drag the boxes come back. It is also the clearer thing
to drag.

### The text has to be the card's text

An element's typography is not in the element's own config. The Layout tab
sets `font_size` / `font_weight` / `font_color` on the *canvas element*, and
the card turns that into CSS on the slot it renders the element into. Anything
the element then sizes in `em` or `%` resolves against that.

So the preview has to carry the same CSS, or it is not previewing the card: a
bar with `value_font_size: 3em` in an element with `font_size: 6px` drew at
18px on the card and at 39px in the preview - more than twice as large, which
is enough for a value and its label to end up on top of each other.
`itemTypography` builds those rules for both, taking the two selectors as
arguments, because the card puts them on `.sc-item-slot` and the editor on its
own box.

The box's own styling had the same problem from the other side: `.el` draws
the element's id at 10px bold, and everything in the box inherited it,
including the previewed component. Live boxes put the text properties back to
inherited, so a previewed element resolves relative sizes against the same
number the card gives it.

Putting the text properties back to inherited has one trap of its own, and it
took a measurement in a real instance to see it: `font` is a shorthand, so it
resets `line-height` too - to whatever the box inherits. A card on a dashboard
inherits Home Assistant's `1.6`; the card config dialog inherits `normal`. A
circular bar draws its value and its label as two lines that
`circular_value_offset_y` and `circular_label_offset_y` nudge towards each
other, and those offsets are only clear of one another because of the leading
that `1.6` adds. At `normal` the label sat on the value - the same bar, the
same numbers, drawn correctly on the card next to it. Live boxes therefore name
`line-height: var(--ha-line-height-normal, 1.6)` after the shorthand, which is
the token Home Assistant sets it from, so a theme that changes it moves both.

What is still missing is label elements: they are drawn by the layout module
itself rather than by a component, so the preview shows them as plain boxes.

### The list edits, the canvas picks

The list under the canvas used to show every element at once - a second place
to hunt for the thing already under the pointer. It now shows the selected
element alone, with its position, its size and its stacking: the canvas is
how you pick, the list is how you edit.

With nothing selected it shows the whole list again, which is the state where
listing everything is the point. Two things can strand a selection there, and
both fall back to the full list: removing the selected element clears the
selection, and an id that no longer names an element - a gauge deleted in its
own editor - is ignored rather than leaving an empty panel.

### The element's own settings, under the canvas

Picking an element on the canvas and then hunting for it again in the
*Progressbars* or *Gauges* section is two searches for one thing. The
selected element's own settings now sit directly under the list, so the
canvas is where you pick and everything about that element is in one column.

It is a mount point, not a second implementation. Each editor takes an `only`
property - an index into its own list - and then renders that one entry's
fields alone: no section, no module switch, no add button, and none of the
reorder or delete chrome, all of which belong to the list view rather than to
one element. `render()` branches on `only` before it builds the section, and
the panel body each list entry already had became a method the two paths
share. So a change to a bar's fields is a change in the progressbar editor and
shows up here without anything being kept in step.

| id | what appears |
|---|---|
| `progressbar_N` | `sc-progressbar-editor` with `only: N` |
| `gauge_N` | `sc-gauge-editor` with `only: N` |
| `label_N`, `label_N_icon` / `_name` / `_value` | `sc-labels-editor` with `only: N` - a sub-target edits the label it belongs to |
| `surface_N` | nothing to edit: a surface is a box for a colour or glass pattern to paint, and it is those sections that target it |
| `icon`, `name`, `state` | nothing to edit: they come from the card's main entity |

The split was verified against the build before it: with the section rendered
normally, all three editors produce byte-identical DOM once lit's nested-
template comment markers are stripped, and driving every control in each one
commits exactly the same values.

### Copying an element, and removing one

A canvas element is a *reference*, not a definition: the card fills
`<slot name="gauge_0">` with the one gauge of that index, so a second box
carrying the same id draws nothing at all. Duplicating a box therefore cannot
be a copy of the box. `duplicateElement` copies whatever the id names - the
bar, the gauge, the label - appends it to its list, and points the new box at
the new index, offset by one snap step so the copy is visible rather than
exactly under its original.

A surface is the exception, and the easy case: it exists only on the canvas,
so a free `surface_N` is the whole copy. `icon`, `name` and `state` are the
other end - they are parts of the card itself, there is only ever one of each,
and the button is disabled. So is a gauge on a slot that never grew a `gauges`
array, where the gauge *is* the card's config: materialising a list there
would rewrite the gauge rather than copy it.

The new box and the entry it points at go out as one `__merge__`. Two commits
in one tick would lose the first, because `_commit` clones `this.config` and
Home Assistant writes it back asynchronously.

Removing is the older half of the pair and means what it has always meant:
the element leaves the canvas, its definition stays. A bar taken off the
canvas is still a bar, and comes back under *Not on the canvas* in the add
menu - which is also the only tidy way back after a duplicate that was not
wanted, since the copy is a real bar and deleting its box does not delete it.

For that to be *removal* rather than a mess, the canvas has to be the whole
answer to what the card draws. `onAfterRender` moves exactly the elements the
canvas names into the renderer, so anything else the gauge and progressbar
modules created stayed in the card's own flow and drew at its natural size -
a gauge taking half the card, a bar the full width of it, right beside the
canvas it had just been removed from. `SC.showsElement(config, id)` is the
gate: on a canvas card those modules do not create the component at all unless
the canvas has a box for it. Off the canvas model it always answers yes, so a
card on rows and cells, or one with its layout switched off, draws everything
its lists contain exactly as before.

The same move is why `onAfterRender` also clears up after itself. `assignSlot`
takes a node out of the template lit created it in, and lit cannot take it
back once the module stops rendering it - so an element removed from the
canvas would leave its component parked in the renderer for good: invisible,
still bound to `hass`, and still the first thing `resolveElement` finds if
that element is ever placed again. Each pass drops the ones the canvas no
longer names.

### Clicking down through a stack

If the canvas is how you pick, it has to be able to pick anything, including
an element another one covers completely. Clicking the same spot again walks
one step down the stack under the pointer and wraps at the bottom, the way
easy-floorplan does it - so a covered element is a click or two away rather
than unreachable.

The stack is geometry, not the event's target: `_stackAt` asks which element
boxes contain the point and returns them in reverse array order, because later
in `canvas.elements` draws on top. "The same spot" is four pixels, measured
against the press before it - loose enough for the hand's own wobble, tight
enough that aiming at a neighbour never counts.

Two decisions keep the walk out of the way of dragging. The step happens on
release, not on the press, so a press-and-drag moves the element you had
rather than the next one down. And a press at the same spot keeps whatever is
already selected there instead of jumping back to the top of the stack -
without that, an element you clicked your way down to could be selected but
never moved, because the press that starts the drag would re-target the
element covering it. A press that travelled more than those four pixels was a
drag and picks nothing new; a press on a resize handle ends the walk, so the
next click on the box starts from the top again.

### Adding an element, and where its section went

Adding used to be two jobs in two places: a gauge was *created* in the
*Gauges* section and then *placed* from a dropdown under the canvas. One
button does both now. **+ Add element** opens a menu with two groups - what
the card does not have yet (Gauge, Progressbar, Label, Surface) and what it
has that the canvas is not showing (`icon`, `name`, `state`, and any entry
whose box was removed) - and the next click on the canvas is where the
element lands, centred on the pointer and snapped. Escape cancels; so does
the button.

`addElement` is the arithmetic and lives with the rest of it, in
`canvas-model.js`. What it does *not* know is what a new gauge contains: each
module answers that itself through `newEntry`, which its own add button uses
too, so there is one definition of a fresh label rather than two that drift.
The new box, the new list entry and the module switch that has to be on for
it to draw anything go out as one `__merge__`, for the reason duplication
does.

Two refusals, both the ones duplication already makes. An id nothing backs is
not placed - a box that references nothing would draw an empty rectangle for
ever - and a gauge cannot be added to a slot that never grew a `gauges`
array, because there the gauge *is* the card's config and writing a list
would replace it.

The box a new element gets is a fifth of the canvas' shorter side, not a
multiple of the snap step: the step is one unit on a freely-placed canvas,
and a four-unit box is invisible. A gauge is square because it has to be, a
surface is twice as wide as it is tall because a backdrop is, and everything
else is a flat strip, which is the shape of a bar and of a line of text.

With adding on the canvas, the *Gauges*, *Progressbars* and *Labels* sections
have nothing left that the canvas does not do better, and a card with a
`canvas` no longer shows them: the module declares `ownedByCanvas` and the
main editor leaves it out. A card still on rows and cells keeps every one of
them - that is the only editor it has. The sections that remain - colour,
fx-glass, interaction - are not per-element lists; they target elements by id
and are still the card's own settings.

One consequence is worth naming: those sections carried the module switches
(`gauge_active`, `progressbar_active`). Adding an element from the canvas
turns its module on, and taking every element of a kind off the canvas is how
you turn it off, so the switch is no longer a control anyone has to find.

## 9. Build order

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
7. ~~**The canvas takes the card's shape.**~~ Convert derives it from
   `grid_options`, and both halves of that box are settable here - see §7.
8. ~~**A live preview.**~~ The editor draws the real gauges and bars in the
   boxes they occupy, with a switch back to plain boxes - see §8.
9. ~~**The canvas as the element editor.**~~ Click to select, click again to
   walk down the stack, the element's own settings under the canvas, copy and
   remove, and one **+ Add element** button that creates and places - so the
   per-element sections could leave the main editor - see §8.

What is left is the part no amount of arithmetic settles: **switching cards
over**. Today conversion is a button someone presses. Making it automatic
means choosing an aspect ratio for every existing card at once, and that is a
release decision, not a code one - see §4.

### Where the editor goes next

The main editor is down to the card's own settings plus the canvas. What is
left is the sections that are still lists of their own:

- **Colour, fx-glass and interaction.** Each is a list of rules that name an
  element by id, so each is really a *per-element* setting kept somewhere
  else - the same split the gauge and bar sections had. Folding them into the
  selected element's settings under the canvas would finish the move, and
  needs a decision first: a rule can target several elements at once, and one
  that does has no single element to live under.

---

## 10. A new card starts on the canvas

Reaching the canvas used to be four steps of the model it replaces: switch the
layout section on, add a row, add a cell, assign content, then convert. Nothing
about a card added a moment ago justifies that, so `getStubConfig` now returns a
canvas card - `layout_active` plus a `canvas` from `canvasFromCard`, which
places exactly what the stub card draws.

That leaves three kinds of card and one offer each:

| The card has | The layout tab offers |
|---|---|
| `canvas` | the canvas editor |
| `layout_rows` | **Convert** - migration, §3 |
| neither | **Use canvas** - `canvasFromCard`, no migration to do |

Only a rows layout can be *converted*, which is why only that card is offered a
conversion. A card on neither model - every card was, before it had a layout -
has nothing to migrate, so its canvas is built from what it draws.

### The pill was a shape; the canvas has a radius

`layout_shape: 'pill'` is a card shape, and the canvas has no use for one: its
elements are placed in a rectangle, and a stadium outline would cut the corner
boxes off. So the shape control is not offered on a canvas card, and
`SC.cardIsPill` answers no there whatever the key says - a shape nothing in the
editor can change is worse than no shape at all.

Nothing is lost by it. A radius of half the shorter side *is* that stadium, so
Convert and Use canvas write `border_radius: 50` with unit `%` and reference
`min` when the card was a pill, in the same commit as the canvas. A 400 × 60
card goes from a clamped `999px` to a computed `30px` - the same corner, to the
pixel.

`layout_active` is part of the test. A card carrying a stale `canvas` with the
layout switched off draws the plain content row, so it keeps its pill and both
sets of dimension controls - the same reading `SC.showsElement` takes.

### Corner radius in percent, of a side you name

A px radius does not follow a card whose width is a column count and whose
height is an aspect ratio. A percentage does - but `border-radius: 10%` is not
that percentage: CSS resolves the horizontal radius against the width and the
vertical against the height, which draws an elliptical corner, more elliptical
the further the card is from square.

So the reference side is named - width, height, shorter, longer - and the radius
is `calc(<that side> * P / 100)`. The lengths come from the card's own
`ResizeObserver`, which already measured them:

```
--sc-avail-w  --sc-avail-h  --sc-avail-min       max(w, h) for "longer"
```

Those three moved from `#main-container` to the host. lit owns the container's
`style` attribute and rewrites it whole on every render, which dropped them
until the next resize - survivable while nothing read them, not survivable for a
radius. A custom property inherits down, so everything inside still resolves
them. `--sc-scale` moved with them, for the same reason.

An absent `border_radius_unit` still means px. The key predates the unit, so
reading a card that set a radius before it existed as anything else would resize
every such card's corners; the stub writes `'%'` explicitly, and the editor
offers the switch on a canvas card.

`SC.cardRadius(slot)` is the one reading of all of this - `999px` for a pill,
`Npx`, a `calc()`, or `null` when the card set nothing and the caller's own
fallback is the right answer. The renderer, a `main`-targeted colour pattern, a
`main`-targeted fx-glass pattern and a bar's card-edge indent all used to
compute it themselves, and disagreed: the glass ignored `layout_shape`, so a
pill card's full-card glass kept a 12px corner inside a round one.

### The responsive switches are not offered either

**Responsive width** and **Responsive height** exist to set `--sc-scale`, which
scales the plain content row's icon and type. A canvas card does not draw that
row, and its type already scales with each element's own box (§2), so the
switches have nothing to act on there - and the observer no longer honours a
leftover one. **Absolute height** has never had any effect at all (§5), and
`card_width` is read nowhere in rendering, so neither field is a loss.
