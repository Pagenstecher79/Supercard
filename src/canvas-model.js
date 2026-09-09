// The canvas layout model, and the migration into it from layout_rows.
//
// Pure: no imports, no side effects, nothing touched at load. That is what
// lets it be unit-tested in Node, which matters more here than anywhere else
// in this codebase - a wrong number in this file moves every element on
// someone's dashboard, quietly, on a version bump they did not read.
//
// See docs/canvas-layout.md for the model and the reasoning.

/** Canvas dimensions used when a configuration has none to convert. */
export const DEFAULT_CANVAS = Object.freeze({ w: 400, h: 200 });

/**
 * The items of a cell, in the current shape, with three generations of older
 * field names resolved.
 *
 * Moved here verbatim from supercard-04-layout.js so there is one definition:
 * the renderer reads it, and the migration consumes its output rather than
 * the raw config, so the old field names are understood in exactly one place
 * - the one already proven against real configurations.
 *
 * @param {any} cell
 * @returns {any[]}
 */
export function getCellItems(cell) {
  if (Array.isArray(cell.items)) {
    return cell.items.map(item => {
      let x = item.x !== undefined ? item.x : (item.c ? (item.c - 1) * 33.333 : 0);
      let y = item.y !== undefined ? item.y : (item.r ? (item.r - 1) * 33.333 : 0);
      let w = item.w !== undefined ? item.w : (item.c2 && item.c ? (item.c2 - item.c + 1) * 33.333 : 33.333);
      let h = item.h !== undefined ? item.h : (item.r2 && item.r ? (item.r2 - item.r + 1) * 33.333 : 33.333);

      return { ...item, x, y, w, h,
        inner: item.inner || 'cc',
        font_size: item.size_n || item.size_v || item.font_size || null,
        font_weight: item.weight_n || item.weight_v || item.font_weight || null,
        font_color: item.color_n || item.color_v || item.font_color || null,
        font_unit: item.unit_n || item.font_unit || 'px',
        overflow: item.overflow !== false
      };
    });
  }

  if (cell.content && cell.content !== 'empty') {
    const span_c = cell.span_c ?? cell.content.startsWith('gauge_');
    return [{
      id: cell.content,
      x: 0, y: 0, w: span_c ? 100 : 33.333, h: span_c ? 100 : 33.333,
      inner: cell.inner_c || 'cc',
      font_size: cell.size_n || cell.size_v || cell.font_size || null,
      font_weight: cell.weight_n || cell.weight_v || cell.font_weight || null,
      font_color: cell.color_n || cell.color_v || cell.color || null,
      font_unit: cell.unit_n || cell.font_unit || 'px',
      overflow: cell.overflow !== false
    }];
  }
  return [];
}

/**
 * Height of every row, as a percentage of the card.
 *
 * Reproduces what the renderer writes as `flex: 0 0 <pct>%`. Rows do **not**
 * shrink: rows adding up to more than 100 really do overflow the card today,
 * and a configuration may be relying on that, so the numbers are reproduced
 * rather than normalised.
 *
 * @param {any[]} rows
 * @returns {number[]}
 */
export function rowHeights(rows) {
  const explicitSum = Math.min(100, rows.reduce((s, r) => s + (parseFloat(r.flex) || 0), 0));
  const autoRows = rows.filter(r => !(parseFloat(r.flex) > 0)).length;
  return rows.map(r => {
    const flexVal = parseFloat(r.flex) || 0;
    if (flexVal > 0) return flexVal;
    return autoRows > 0 ? (100 - explicitSum) / autoRows : 0;
  });
}

/**
 * Width of every cell in a row, as a percentage of the card.
 *
 * Cells, unlike rows, carry only a `flex-basis` and keep the default
 * `flex-shrink: 1`. So they behave differently when they overflow:
 * - basis sums to more than 100 -> they compress proportionally
 * - basis sums to less than 100 -> the remainder stays empty on the right
 *
 * Getting this backwards moves every element in an over-full row, which is
 * why it is a function of its own with tests against both branches.
 *
 * @param {any} row
 * @returns {number[]}
 */
export function cellWidths(row) {
  const cells = Array.isArray(row.cells) ? row.cells : [];
  if (cells.length === 0) return [];
  const basis = cells.map(cell => row.auto_width ? 100 / cells.length : (cell.width || 100));
  const sum = basis.reduce((s, b) => s + b, 0);
  return sum > 100 ? basis.map(b => b / sum * 100) : basis;
}

/**
 * Whether an element has to stay square.
 *
 * A gauge is drawn into a square viewBox whatever its type - a semi gauge is
 * a 270 degree arc in the same box, not half of one - so a non-square slot can
 * only ever letterbox it: `100cqmin` shrinks the gauge to the smaller side and
 * leaves the rest empty. Locking the element to a square instead makes the
 * element's size *be* the gauge's size, which is the one thing a canvas should
 * mean, and removes the only way to draw a box a gauge cannot fill.
 *
 * Surfaces are plain boxes for a pattern to paint and are never locked.
 *
 * @param {any} el
 * @returns {boolean}
 */
export function isSquareLocked(el) {
  return !el?.surface && typeof el?.id === 'string' && el.id.startsWith('gauge_');
}

/**
 * The largest square inside an element, anchored the way its content already
 * sits inside it.
 *
 * `inner` is a two-character code - vertical then horizontal - that the
 * renderer turns into flex alignment. Reusing it here is what makes squaring
 * an element a no-op on screen: the gauge was already being drawn as a
 * centred (or corner-aligned) square of exactly this side length, so only the
 * box around it changes.
 *
 * @param {any} el
 * @returns {any} the element with square geometry
 */
export function squareElement(el) {
  const side = Math.min(el.w, el.h);
  const inner = typeof el.inner === 'string' ? el.inner : 'cc';
  const fy = { t: 0, c: 0.5, b: 1 }[inner[0]] ?? 0.5;
  const fx = { l: 0, c: 0.5, r: 1 }[inner[1]] ?? 0.5;
  return { ...el,
    x: el.x + (el.w - side) * fx,
    y: el.y + (el.h - side) * fy,
    w: side, h: side };
}

/**
 * Flatten layout_rows into absolutely placed canvas elements.
 *
 * Rows top to bottom, cells left to right, items in array order - the same
 * order the renderer emits them in today, so anything that depended on
 * stacking keeps its stacking.
 *
 * Every item field is carried over untouched except the geometry. `font_size`
 * carries over unchanged in *number*, but its meaning shifts from px to
 * virtual units; see docs/canvas-layout.md.
 *
 * A colour, fx-glass or interaction pattern can point at a cell as `r0c0`,
 * which resolves to a shadow part that stops existing once cells do. Pass the
 * cell keys that are actually targeted as `targetedCells` and each one becomes
 * a **surface**: a plain box with the cell's exact geometry and no entity
 * behind it, emitted before that cell's own elements so it sits underneath
 * them. The pattern then targets the surface and paints exactly the region it
 * used to. A target naming a cell that does not exist is reported and left
 * unmapped - it was already inert.
 *
 * Surfaces are only created for cells that are targeted. Migration does not
 * invent elements nobody asked for.
 *
 * @param {any[]} layoutRows
 * @param {{ w: number, h: number }} [canvas]
 * @param {{ targetedCells?: string[] }} [opts]
 * @returns {{ elements: any[], cellTargets: Record<string, string>, warnings: string[] }}
 */
export function migrateLayoutToCanvas(layoutRows, canvas = DEFAULT_CANVAS, opts = {}) {
  const rows = Array.isArray(layoutRows) ? layoutRows : [];
  const targeted = new Set(opts.targetedCells || []);
  const elements = [];
  const cellTargets = /** @type {Record<string, string>} */ ({});
  const warnings = [];
  let surfaceCount = 0;

  const heights = rowHeights(rows);
  let topPct = 0;

  rows.forEach((row, rIdx) => {
    const rowPct = heights[rIdx];
    const widths = cellWidths(row);
    const cells = Array.isArray(row.cells) ? row.cells : [];
    let leftPct = 0;

    cells.forEach((cell, cIdx) => {
      const cellPct = widths[cIdx];
      const key = `r${rIdx}c${cIdx}`;

      if (targeted.has(key)) {
        const id = `surface_${surfaceCount++}`;
        elements.push({
          id, surface: true,
          x: leftPct / 100 * canvas.w,
          y: topPct / 100 * canvas.h,
          w: cellPct / 100 * canvas.w,
          h: rowPct / 100 * canvas.h,
        });
        cellTargets[key] = `elm_${id}`;
      }

      for (const item of getCellItems(cell)) {
        const { x, y, w, h, ...rest } = item;
        const placed = {
          ...rest,
          x: (leftPct + x / 100 * cellPct) / 100 * canvas.w,
          y: (topPct + y / 100 * rowPct) / 100 * canvas.h,
          w: (w / 100 * cellPct) / 100 * canvas.w,
          h: (h / 100 * rowPct) / 100 * canvas.h,
        };
        // Squaring a gauge here changes the box, not the picture: the gauge
        // was already drawn as an aligned square of the smaller side. What it
        // buys is that the element the editor hands you afterwards is the
        // gauge, so dragging it bigger makes the gauge bigger.
        elements.push(isSquareLocked(placed) ? squareElement(placed) : placed);
      }

      leftPct += cellPct;
    });

    topPct += rowPct;
  });

  for (const key of targeted) {
    if (!(key in cellTargets)) {
      warnings.push(
        `${key} does not exist in this layout, so the pattern targeting it was already ` +
        `doing nothing; it is dropped rather than repointed.`,
      );
    }
  }

  return { elements, cellTargets, warnings };
}

/**
 * Every cell a colour, fx-glass or interaction pattern points at.
 *
 * Migration needs these to know which cells to turn into surfaces, and they
 * live in three different lists, so they are collected in one place.
 *
 * @param {any} slot
 * @returns {string[]}
 */
export function targetedCells(slot) {
  const lists = [slot?.color_patterns, slot?.fx_glass_patterns, slot?.interactions];
  const keys = new Set();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const p of list) if (/^r\d+c\d+$/.test(String(p?.target))) keys.add(p.target);
  }
  return [...keys];
}

/**
 * The canvas a card should be rendered from.
 *
 * A configuration that already has one is used as is. One that only has
 * `layout_rows` is migrated on the way in, and **not** written back: a card
 * that rewrites stored config just for being displayed can corrupt a
 * dashboard while nobody is watching. The editor persists the migration when
 * the user next saves.
 *
 * The result is cached against the `layout_rows` array identity, because this
 * runs on every render and the arithmetic is pure.
 *
 * @param {any} slot
 * @returns {{ w: number, h: number, grid?: number, snap?: number, elements: any[] } | null}
 */
const migrationCache = new WeakMap();
export function resolveCanvas(slot) {
  if (slot?.canvas && Array.isArray(slot.canvas.elements)) return slot.canvas;
  const rows = slot?.layout_rows;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const cached = migrationCache.get(rows);
  if (cached) return cached;

  const { elements } = migrateLayoutToCanvas(rows, DEFAULT_CANVAS, { targetedCells: targetedCells(slot) });
  const canvas = { ...DEFAULT_CANVAS, elements };
  migrationCache.set(rows, canvas);
  return canvas;
}

/**
 * The step placement snaps to, in virtual units.
 *
 * Tri-state, so one field cannot contradict another: `snap` unset means snap
 * to the visible grid, `0` means free placement, a positive number is its own
 * step. Free placement still returns a step - 1 unit - because a canvas is a
 * grid of integers underneath and half a unit is not a position anyone means.
 *
 * @param {{ grid?: number, snap?: number }} canvas
 * @returns {number}
 */
export function resolveSnap(canvas) {
  const snap = canvas?.snap;
  if (snap === 0) return 1;
  if (typeof snap === 'number' && snap > 0) return snap;
  const grid = canvas?.grid;
  return typeof grid === 'number' && grid > 0 ? grid : 1;
}

/**
 * Move or resize one element, snapped and kept inside the canvas.
 *
 * Pure, so the drag maths can be tested without a pointer: the editor turns
 * pointer positions into a delta in virtual units and this decides where the
 * element actually lands.
 *
 * @param {{ w: number, h: number, grid?: number, snap?: number }} canvas
 * @param {{ x: number, y: number, w: number, h: number, id?: string, surface?: boolean }} start
 *   element as the drag began; `id` is what decides whether it is square-locked
 * @param {'move'|'resize'} mode
 * @param {{ dx: number, dy: number }} delta in virtual units
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function applyDrag(canvas, start, mode, delta) {
  const step = resolveSnap(canvas);
  const snap = v => Math.round(v / step) * step;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  if (mode === 'resize') {
    if (isSquareLocked(start)) {
      // One side length, taken from whichever axis was dragged further, so a
      // corner drag follows the pointer in both. Units are isotropic on the
      // canvas - the box carries the same w/h ratio the coordinates do, so it
      // cancels - which is why a square on screen is simply w === h, and why
      // both sides can snap to the grid without the shape drifting.
      const side = clamp(
        Math.max(snap(start.w + delta.dx), snap(start.h + delta.dy)),
        step,
        Math.min(canvas.w - start.x, canvas.h - start.y),
      );
      return { x: start.x, y: start.y, w: side, h: side };
    }
    return {
      x: start.x,
      y: start.y,
      w: clamp(snap(start.w + delta.dx), step, canvas.w - start.x),
      h: clamp(snap(start.h + delta.dy), step, canvas.h - start.y),
    };
  }
  return {
    x: clamp(snap(start.x + delta.dx), 0, canvas.w - start.w),
    y: clamp(snap(start.y + delta.dy), 0, canvas.h - start.h),
    w: start.w,
    h: start.h,
  };
}

/**
 * Home Assistant's sections grid, in pixels.
 *
 * A card that reports `rows: N` is given exactly this height by
 * hui-grid-section: `grid-row: span N`, plus an explicit
 * `N * (row-height + row-gap) - row-gap`. Both figures are themable
 * (`--ha-section-grid-row-height`, `--ha-section-grid-row-gap`); these are the
 * defaults. Nothing renders from them - they only turn a row count into the
 * pixel figure the editor prints beside it, so the number means something.
 */
export const HA_ROW_HEIGHT = 56;
export const HA_ROW_GAP = 8;

/**
 * @param {number} rows
 * @returns {number} the card height Home Assistant gives that many rows
 */
export function gridRowsToPx(rows) {
  const n = Math.max(1, Math.round(Number(rows) || 0));
  return n * (HA_ROW_HEIGHT + HA_ROW_GAP) - HA_ROW_GAP;
}

/**
 * The height a Supercard reports to Home Assistant's sections grid.
 *
 * A canvas card has an intrinsic height - its aspect ratio times whatever
 * width the column hands it - and that width is not knowable from inside the
 * card, so no row count can be right. `auto` is what HA has for exactly this
 * case: the card is as tall as it renders, and the layout tab's height
 * control follows it instead of fighting it.
 *
 * A row/cell card has no intrinsic height at all - its rows are percentages
 * of one - so it keeps reporting the fixed default it always has. Reporting
 * `auto` there would collapse every existing card to nothing.
 *
 * @param {any} slot config.supercard
 * @returns {number | 'auto'}
 */
export function reportedRows(slot) {
  if (slot?.canvas) return 'auto';
  const rows = Number(slot?.grid_rows);
  return rows > 0 ? rows : 3;
}

/**
 * The other axis of Home Assistant's sections grid.
 *
 * A section is `HA_COLUMN_COUNT` equal columns with a gap between them, and a
 * card spanning `n` of them is `n` columns plus the `n-1` gaps they close up.
 * The section's own width is a layout result and varies with the viewport, so
 * `HA_SECTION_WIDTH` is a *reference* - measured on a real dashboard, where a
 * full-width card came out at exactly 480px and a six-column one at 236.
 *
 * Only the ratio against `gridRowsToPx` is ever used, so the reference width
 * decides how wide a column counts relative to a row and nothing else. On a
 * narrower section the card is narrower and the canvas letterboxes, which is
 * the same trade a fixed aspect ratio makes everywhere else.
 */
export const HA_COLUMN_COUNT = 12;
export const HA_COLUMN_GAP = 8;
export const HA_SECTION_WIDTH = 480;

/**
 * @param {number | 'full'} columns
 * @returns {number} the card width that many grid columns give
 */
export function gridColumnsToPx(columns) {
  const raw = columns === 'full' ? HA_COLUMN_COUNT : Math.round(Number(columns) || 0);
  const n = Math.max(1, Math.min(HA_COLUMN_COUNT, raw));
  const unit = (HA_SECTION_WIDTH - (HA_COLUMN_COUNT - 1) * HA_COLUMN_GAP) / HA_COLUMN_COUNT;
  return n * unit + (n - 1) * HA_COLUMN_GAP;
}

/**
 * The grid box a card currently occupies, from both places it can be set.
 *
 * `grid_options` is Home Assistant's, written by the layout tab and by our own
 * controls; the `grid_*` keys on the slot are the defaults `getGridOptions`
 * reports when it is not. Reading the same chain here is what makes a derived
 * canvas match the card that is actually on the dashboard rather than a
 * hypothetical one.
 *
 * @param {any} cardConfig the Lovelace card config
 * @param {any} slot config.supercard
 * @returns {{ columns: number | 'full', rows: number }}
 */
export function gridSize(cardConfig, slot) {
  const g = cardConfig?.grid_options || {};
  const columns = (typeof g.columns === 'number' || g.columns === 'full')
    ? g.columns
    : (Number(slot?.grid_columns) > 0 ? Number(slot.grid_columns) : 3);
  const rows = typeof g.rows === 'number'
    ? g.rows
    : (Number(slot?.grid_rows) > 0 ? Number(slot.grid_rows) : 3);
  return { columns, rows };
}

/**
 * A canvas shaped like the card's grid box.
 *
 * Scaled so the longer side is `scale`, because the numbers are edited by
 * hand: only the ratio carries meaning, and 400 x 420 reads better than
 * 236 x 248. Element coordinates are fractions of these, and font sizes in
 * the wild are container units, so the scale itself is free.
 *
 * @param {any} cardConfig
 * @param {any} slot
 * @param {number} [scale]
 * @returns {{ w: number, h: number }}
 */
export function canvasFromGrid(cardConfig, slot, scale = 400) {
  const { columns, rows } = gridSize(cardConfig, slot);
  const w = gridColumnsToPx(columns);
  const h = gridRowsToPx(rows);
  const k = scale / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * The same picture in a differently shaped coordinate space.
 *
 * Every element is a fraction of `w` and `h`, so scaling both the canvas and
 * the coordinates by the same factors leaves the layout where it was - as a
 * proportion of a card that has itself changed shape. Gauges are re-squared
 * afterwards: the two factors differ whenever the shape changes, and a square
 * scaled by two different numbers stops being one.
 *
 * @param {any} canvas
 * @param {{ w: number, h: number }} shape
 * @returns {any} a new canvas
 */
export function rescaleCanvas(canvas, shape) {
  const kx = shape.w / canvas.w, ky = shape.h / canvas.h;
  const elements = (Array.isArray(canvas.elements) ? canvas.elements : []).map(el => {
    const moved = { ...el, x: el.x * kx, y: el.y * ky, w: el.w * kx, h: el.h * ky };
    return isSquareLocked(moved) ? squareElement(moved) : moved;
  });
  return { ...canvas, w: shape.w, h: shape.h, elements };
}

/**
 * Whether something outside the canvas has fixed the card's height, so the
 * canvas has to fit inside a box it did not choose rather than define one.
 *
 * A row count from Home Assistant's layout tab is the only thing that does.
 * The card's own `card_height` looks like a second one and is not: it is
 * published as `--sc-explicit-height` on #main-container while `:host` is
 * what reads it, and a custom property does not travel back up to the host,
 * so the field has never had any effect. Treating it as a pin here would
 * shrink every canvas card that happens to carry a stale value.
 *
 * @param {any} cardConfig the Lovelace card config
 * @returns {boolean}
 */
export function isHeightPinned(cardConfig) {
  return typeof cardConfig?.grid_options?.rows === 'number';
}
