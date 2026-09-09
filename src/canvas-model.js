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
 * @param {any[]} layoutRows
 * @param {{ w: number, h: number }} [canvas]
 * @returns {{ elements: any[], cellTargets: Record<string, string>, warnings: string[] }}
 */
export function migrateLayoutToCanvas(layoutRows, canvas = DEFAULT_CANVAS) {
  const rows = Array.isArray(layoutRows) ? layoutRows : [];
  const elements = [];
  const cellTargets = /** @type {Record<string, string>} */ ({});
  const warnings = [];

  const heights = rowHeights(rows);
  let topPct = 0;

  rows.forEach((row, rIdx) => {
    const rowPct = heights[rIdx];
    const widths = cellWidths(row);
    const cells = Array.isArray(row.cells) ? row.cells : [];
    let leftPct = 0;

    cells.forEach((cell, cIdx) => {
      const cellPct = widths[cIdx];
      const items = getCellItems(cell);

      // A colour/fx-glass/interaction pattern can point at `r0c0`, which
      // resolves to a shadow part that stops existing once cells do. One
      // element in the cell has an exact replacement; several have none.
      const key = `r${rIdx}c${cIdx}`;
      if (items.length === 1) {
        cellTargets[key] = `elm_${items[0].id}`;
      } else if (items.length > 1) {
        cellTargets[key] = 'main';
        warnings.push(
          `${key} held ${items.length} elements, so a pattern targeting it has no exact ` +
          `replacement; it now targets the whole card.`,
        );
      }

      for (const item of items) {
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

  return { elements, cellTargets, warnings };
}
