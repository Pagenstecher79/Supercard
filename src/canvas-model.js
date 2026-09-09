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
        elements.push({
          ...rest,
          x: (leftPct + x / 100 * cellPct) / 100 * canvas.w,
          y: (topPct + y / 100 * rowPct) / 100 * canvas.h,
          w: (w / 100 * cellPct) / 100 * canvas.w,
          h: (h / 100 * rowPct) / 100 * canvas.h,
        });
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
 * @param {{ x: number, y: number, w: number, h: number }} start element as the drag began
 * @param {'move'|'resize'} mode
 * @param {{ dx: number, dy: number }} delta in virtual units
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function applyDrag(canvas, start, mode, delta) {
  const step = resolveSnap(canvas);
  const snap = v => Math.round(v / step) * step;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  if (mode === 'resize') {
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
