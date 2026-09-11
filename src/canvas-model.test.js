import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CANVAS,
  DEFAULT_GRID,
  getCellItems,
  rowHeights,
  cellWidths,
  migrateLayoutToCanvas,
  paintedCells,
  colouredCells,
  glassedCells,
  soleElementTargets,
  clickedCells,
  deadCellTargets,
  repointPatterns,
  resolveSnap,
  applyDrag,
  gridRowsToPx,
  reportedRows,
  isHeightPinned,
  isSquareLocked,
  isPinned,
  squareElement,
  gridColumnsToPx,
  sectionColumns,
  gridSize,
  canvasFromGrid,
  canvasFromCard,
  rescaleCanvas,
  canDuplicate,
  canAddKind,
  addElement,
  newElementPreview,
  NEW_ELEMENT_KINDS,
  duplicateElement,
} from './canvas-model.js';
import fixtures from './__fixtures__/real-layouts.json' with { type: 'json' };

// A canvas whose numbers make the arithmetic readable: 1 unit = 1 % of the
// card on both axes, so an expected value can be checked by eye.
const C = { w: 100, h: 100 };

describe('rowHeights', () => {
  it('gives an explicit flex straight back', () => {
    expect(rowHeights([{ flex: 60 }, { flex: 40 }])).toEqual([60, 40]);
  });

  it('shares what is left equally between the rows without one', () => {
    expect(rowHeights([{ flex: 50 }, {}, {}])).toEqual([50, 25, 25]);
  });

  it('treats flex 0 and a missing flex the same', () => {
    expect(rowHeights([{ flex: 0 }, {}])).toEqual([50, 50]);
  });

  it('does not shrink rows that add up to more than 100', () => {
    // Two rows at 60 % really do occupy 120 % and overflow the card today.
    // Normalising here would move every element on such a card.
    expect(rowHeights([{ flex: 60 }, { flex: 60 }])).toEqual([60, 60]);
  });

  it('gives auto rows nothing once the explicit ones fill the card', () => {
    expect(rowHeights([{ flex: 100 }, {}])).toEqual([100, 0]);
  });

  it('reads a flex written as a string', () => {
    expect(rowHeights([{ flex: '70' }, {}])).toEqual([70, 30]);
  });
});

describe('cellWidths', () => {
  it('defaults a cell without a width to the full row', () => {
    expect(cellWidths({ cells: [{}] })).toEqual([100]);
  });

  it('leaves the remainder empty when the cells do not fill the row', () => {
    // 20 % gap on the right, which the card really shows.
    expect(cellWidths({ cells: [{ width: 50 }, { width: 30 }] })).toEqual([50, 30]);
  });

  it('compresses cells proportionally when they overflow', () => {
    // Unlike rows: cells keep the default flex-shrink: 1.
    expect(cellWidths({ cells: [{ width: 100 }, { width: 100 }] })).toEqual([50, 50]);
    expect(cellWidths({ cells: [{ width: 150 }, { width: 50 }] })).toEqual([75, 25]);
  });

  it('splits evenly under auto_width, ignoring the stated widths', () => {
    expect(cellWidths({ auto_width: true, cells: [{ width: 90 }, { width: 10 }, {}] }))
      .toEqual([100 / 3, 100 / 3, 100 / 3]);
  });

  it('treats width 0 as unset, the way the renderer does', () => {
    // `cell.width || 100` - faithful reproduction, quirk included.
    expect(cellWidths({ cells: [{ width: 0 }] })).toEqual([100]);
  });

  it('survives a row with no cells', () => {
    expect(cellWidths({})).toEqual([]);
    expect(cellWidths({ cells: [] })).toEqual([]);
  });
});

describe('getCellItems', () => {
  it('passes a current item through, filling in the defaults', () => {
    const [item] = getCellItems({ items: [{ id: 'gauge_0', x: 10, y: 20, w: 30, h: 40 }] });
    expect(item).toMatchObject({
      id: 'gauge_0', x: 10, y: 20, w: 30, h: 40,
      inner: 'cc', font_unit: 'px', overflow: true,
    });
  });

  it('converts the legacy 3x3 grid coordinates', () => {
    const [item] = getCellItems({ items: [{ id: 'name', r: 2, c: 3 }] });
    expect(item.x).toBeCloseTo(66.666, 3);
    expect(item.y).toBeCloseTo(33.333, 3);
    expect(item.w).toBeCloseTo(33.333, 3);
  });

  it('spans the legacy grid with r2/c2', () => {
    const [item] = getCellItems({ items: [{ id: 'state', r: 1, c: 1, r2: 2, c2: 3 }] });
    expect(item.w).toBeCloseTo(99.999, 3);
    expect(item.h).toBeCloseTo(66.666, 3);
  });

  it('reads the older font field names', () => {
    const [item] = getCellItems({ items: [{ id: 'name', size_n: 18, weight_v: 700, color_n: '#abc', unit_n: 'pt' }] });
    expect(item).toMatchObject({ font_size: 18, font_weight: 700, font_color: '#abc', font_unit: 'pt' });
  });

  it('expands a legacy cell.content into one item', () => {
    expect(getCellItems({ content: 'gauge_0' })[0]).toMatchObject({ id: 'gauge_0', w: 100, h: 100 });
    // Only a gauge spans the cell by default.
    expect(getCellItems({ content: 'name' })[0].w).toBeCloseTo(33.333, 3);
  });

  it('yields nothing for an empty cell', () => {
    expect(getCellItems({})).toEqual([]);
    expect(getCellItems({ content: 'empty' })).toEqual([]);
    expect(getCellItems({ items: [] })).toEqual([]);
  });

  it('prefers items over a leftover content field', () => {
    expect(getCellItems({ content: 'gauge_0', items: [{ id: 'name', x: 0, y: 0, w: 1, h: 1 }] }))
      .toHaveLength(1);
    expect(getCellItems({ content: 'gauge_0', items: [{ id: 'name', x: 0, y: 0, w: 1, h: 1 }] })[0].id)
      .toBe('name');
  });
});

describe('migrateLayoutToCanvas', () => {
  it('places a single full-cell element over the whole canvas', () => {
    const { elements } = migrateLayoutToCanvas(
      [{ cells: [{ items: [{ id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 }] }] }], C);
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 });
  });

  it('offsets by the row above and the cell to the left', () => {
    const { elements } = migrateLayoutToCanvas([
      { flex: 40, cells: [{ items: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }] }] },
      { flex: 60, cells: [
        { width: 30, items: [{ id: 'b', x: 0, y: 0, w: 100, h: 100 }] },
        { width: 70, items: [{ id: 'c', x: 0, y: 0, w: 100, h: 100 }] },
      ] },
    ], C);
    expect(elements.map(e => e.id)).toEqual(['a', 'b', 'c']);
    expect(elements[0]).toMatchObject({ x: 0, y: 0, w: 100, h: 40 });
    expect(elements[1]).toMatchObject({ x: 0, y: 40, w: 30, h: 60 });
    expect(elements[2]).toMatchObject({ x: 30, y: 40, w: 70, h: 60 });
  });

  it('nests an item percentage inside its cell', () => {
    // Half-width cell in the right half of the card; the item sits in the
    // middle quarter of that cell.
    const { elements } = migrateLayoutToCanvas([
      { cells: [
        { width: 50, items: [] },
        { width: 50, items: [{ id: 'x', x: 50, y: 50, w: 50, h: 50 }] },
      ] },
    ], C);
    expect(elements[0]).toMatchObject({ x: 75, y: 50, w: 25, h: 50 });
  });

  it('scales into the canvas units rather than percentages', () => {
    const { elements } = migrateLayoutToCanvas(
      [{ cells: [{ items: [{ id: 'g', x: 50, y: 50, w: 50, h: 50 }] }] }],
      { w: 400, h: 200 });
    expect(elements[0]).toMatchObject({ x: 200, y: 100, w: 200, h: 100 });
  });

  it('carries every other field over untouched', () => {
    const { elements } = migrateLayoutToCanvas([{ cells: [{ items: [{
      id: 'label_0', x: 0, y: 0, w: 100, h: 100,
      inner: 'tl', overflow: false, font_size: 18, font_weight: 700,
      font_color: '#f00', font_unit: 'pt', font_adaptive: true,
    }] }] }], C);
    expect(elements[0]).toMatchObject({
      inner: 'tl', overflow: false, font_size: 18, font_weight: 700,
      font_color: '#f00', font_unit: 'pt', font_adaptive: true,
    });
  });

  it('reproduces an over-full row instead of normalising it', () => {
    // Rows overflow, cells compress - the asymmetry that would move
    // everything if it were applied to the wrong axis.
    const { elements } = migrateLayoutToCanvas([
      { flex: 60, cells: [{ items: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }] }] },
      { flex: 60, cells: [{ items: [{ id: 'b', x: 0, y: 0, w: 100, h: 100 }] }] },
    ], C);
    expect(elements[0]).toMatchObject({ y: 0, h: 60 });
    expect(elements[1]).toMatchObject({ y: 60, h: 60 });   // runs past 100
  });

  it('compresses an over-full row of cells', () => {
    const { elements } = migrateLayoutToCanvas([{ cells: [
      { width: 100, items: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }] },
      { width: 100, items: [{ id: 'b', x: 0, y: 0, w: 100, h: 100 }] },
    ] }], C);
    expect(elements[0]).toMatchObject({ x: 0, w: 50 });
    expect(elements[1]).toMatchObject({ x: 50, w: 50 });
  });

  it('keeps document order, so stacking survives', () => {
    const { elements } = migrateLayoutToCanvas([{ cells: [{ items: [
      { id: 'under', x: 0, y: 0, w: 100, h: 100 },
      { id: 'over', x: 0, y: 0, w: 100, h: 100 },
    ] }] }], C);
    expect(elements.map(e => e.id)).toEqual(['under', 'over']);
  });

  it('invents no surfaces when nothing targets a cell', () => {
    const { elements, cellTargets, warnings } = migrateLayoutToCanvas([
      { cells: [{ items: [{ id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 }] }] },
    ], C);
    expect(elements.map(e => e.id)).toEqual(['gauge_0']);
    expect(cellTargets).toEqual({});
    expect(warnings).toEqual([]);
  });

  it('turns a targeted cell into a surface with the cell geometry', () => {
    const { elements, cellTargets, warnings } = migrateLayoutToCanvas([
      { flex: 40, cells: [
        { width: 30, items: [{ id: 'a', x: 25, y: 25, w: 50, h: 50 }] },
        { width: 70, items: [] },
      ] },
      { flex: 60, cells: [{ items: [] }] },
    ], C, { targetedCells: ['r0c0'] });
    const surface = elements.find(e => e.surface);
    // The cell's box, not the element's: the pattern painted the whole cell.
    expect(surface).toMatchObject({ id: 'surface_0', x: 0, y: 0, w: 30, h: 40 });
    expect(cellTargets).toEqual({ r0c0: 'elm_surface_0' });
    expect(warnings).toEqual([]);
  });

  it('puts the surface behind the elements of its cell', () => {
    const { elements } = migrateLayoutToCanvas([
      { cells: [{ items: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }] }] },
    ], C, { targetedCells: ['r0c0'] });
    // Stacking is array order, so the surface has to come first.
    expect(elements.map(e => e.id)).toEqual(['surface_0', 'a']);
  });

  it('gives a cell holding several elements one surface, exactly', () => {
    // The case that used to fall back to the whole card.
    const { elements, cellTargets, warnings } = migrateLayoutToCanvas([
      { cells: [{ items: [
        { id: 'name', x: 0, y: 0, w: 50, h: 100 },
        { id: 'state', x: 50, y: 0, w: 50, h: 100 },
      ] }] },
    ], C, { targetedCells: ['r0c0'] });
    expect(elements.map(e => e.id)).toEqual(['surface_0', 'name', 'state']);
    expect(cellTargets).toEqual({ r0c0: 'elm_surface_0' });
    expect(warnings).toEqual([]);
  });

  it('gives an empty targeted cell a surface too', () => {
    const { elements, cellTargets } = migrateLayoutToCanvas(
      [{ cells: [{}] }], C, { targetedCells: ['r0c0'] });
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({ id: 'surface_0', surface: true, w: 100, h: 100 });
    expect(cellTargets).toEqual({ r0c0: 'elm_surface_0' });
  });

  it('numbers surfaces across the whole card', () => {
    const { cellTargets } = migrateLayoutToCanvas([
      { cells: [{}, {}] },
      { cells: [{}] },
    ], C, { targetedCells: ['r0c1', 'r1c0'] });
    expect(cellTargets).toEqual({ r0c1: 'elm_surface_0', r1c0: 'elm_surface_1' });
  });

  it('drops a target naming a cell that does not exist, and says why', () => {
    // Real dashboards carry these: a row was deleted and the pattern kept
    // pointing at it, so it has been doing nothing for a while already.
    const { elements, cellTargets, warnings } = migrateLayoutToCanvas([
      { cells: [{ items: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }] }] },
    ], C, { targetedCells: ['r2c0'] });
    expect(elements.map(e => e.id)).toEqual(['a']);
    expect(cellTargets).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('r2c0');
  });

  it('survives configurations that are missing or malformed', () => {
    expect(migrateLayoutToCanvas(undefined).elements).toEqual([]);
    expect(migrateLayoutToCanvas([]).elements).toEqual([]);
    expect(migrateLayoutToCanvas([{}]).elements).toEqual([]);
    expect(migrateLayoutToCanvas([{ cells: [] }]).elements).toEqual([]);
  });

  it('defaults to a 400x200 canvas', () => {
    const { elements } = migrateLayoutToCanvas(
      [{ cells: [{ items: [{ id: 'g', x: 0, y: 0, w: 100, h: 100 }] }] }]);
    expect(elements[0]).toMatchObject({ w: DEFAULT_CANVAS.w, h: DEFAULT_CANVAS.h });
  });

  it('migrates a legacy content-only layout', () => {
    const { elements } = migrateLayoutToCanvas([
      { flex: 50, cells: [{ content: 'gauge_0' }] },
      { flex: 50, cells: [{ content: 'name' }, { content: 'empty' }] },
    ], C);
    expect(elements.map(e => e.id)).toEqual(['gauge_0', 'name']);
    // The cell is 100x50; the gauge is inscribed in it and centred, which is
    // where it was already being drawn. See "migration squares gauges".
    expect(elements[0]).toMatchObject({ x: 25, y: 0, w: 50, h: 50 });
    // `name` does not span, so a third of its cell; the cell is a full row
    // because widths default to 100 and the empty one takes the other 100,
    // so both compress to half.
    expect(elements[1].x).toBe(0);
    expect(elements[1].y).toBe(50);
    expect(elements[1].w).toBeCloseTo(50 * 0.33333, 2);
  });
});

// --- Against real configurations -----------------------------------------
// 23 distinct layouts taken from a live dashboard (they stand for 30 cards;
// duplicates collapsed). Structural only - the file contains no entity ids.
// The geometry these produce was compared against the boxes the current
// renderer actually draws in a browser: worst deviation 0.0023 percentage
// points over 55 element boxes. These tests keep that from regressing.
describe('real dashboard layouts', () => {
  const all = fixtures.map(f => ({
    ...f,
    result: migrateLayoutToCanvas(f.layout_rows, DEFAULT_CANVAS,
      { targetedCells: f.targets }),
  }));

  it('covers the shapes worth having a fixture for', () => {
    const cells = fixtures.flatMap(f => f.layout_rows.flatMap(r => r.cells || []));
    expect(fixtures.length).toBe(23);
    // The legacy `content` form is the majority case in the wild, not a relic.
    expect(cells.filter(c => c.content && c.content !== 'empty').length)
      .toBeGreaterThan(cells.filter(c => (c.items || []).length).length);
    expect(fixtures.some(f => f.layout_rows.some(r => r.auto_width))).toBe(true);
    expect(fixtures.some(f => f.layout_rows.some(r => (r.cells || []).some(c => (c.items || []).some(i => i.r !== undefined))))).toBe(true);
    expect(fixtures.filter(f => f.targets.length).length).toBeGreaterThan(0);
  });

  it('produces usable geometry for every one of them', () => {
    for (const { i, result } of all) {
      for (const e of result.elements) {
        expect(Number.isFinite(e.x), `card ${i} / ${e.id} x`).toBe(true);
        expect(Number.isFinite(e.y), `card ${i} / ${e.id} y`).toBe(true);
        expect(e.w, `card ${i} / ${e.id} w`).toBeGreaterThan(0);
        expect(e.h, `card ${i} / ${e.id} h`).toBeGreaterThan(0);
        expect(e.x, `card ${i} / ${e.id} x`).toBeGreaterThanOrEqual(0);
        expect(e.y, `card ${i} / ${e.id} y`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps every element these cards already had', () => {
    for (const { i, layout_rows, result } of all) {
      const expected = layout_rows.reduce(
        (a, r) => a + (r.cells || []).reduce((b, c) => b + getCellItems(c).length, 0), 0);
      const surfaces = result.elements.filter(e => e.surface).length;
      expect(result.elements.length - surfaces, `card ${i}`).toBe(expected);
    }
  });

  it('resolves every cell target that still points at something', () => {
    let surfaced = 0, dropped = 0;
    for (const { layout_rows, targets, result } of all) {
      for (const t of targets) {
        const [, ri, ci] = /^r(\d+)c(\d+)$/.exec(t);
        const exists = !!((layout_rows[+ri] || {}).cells || [])[+ci];
        if (exists) { expect(result.cellTargets[t]).toMatch(/^elm_surface_\d+$/); surfaced++; }
        else { expect(result.cellTargets[t]).toBeUndefined(); dropped++; }
      }
    }
    // Every live target becomes a surface; the dead ones are dropped, and
    // they are the majority - these are stale references to deleted rows.
    expect(surfaced).toBe(7);
    expect(dropped).toBe(6);
  });

  it('says something about each target it dropped', () => {
    for (const { targets, result } of all) {
      const dead = targets.filter(t => result.cellTargets[t] === undefined);
      expect(result.warnings).toHaveLength(dead.length);
      for (const t of dead) expect(result.warnings.join(' ')).toContain(t);
    }
  });
});

describe('paintedCells / clickedCells', () => {
  it('collects paint targets out of the two paint lists only', () => {
    expect(paintedCells({
      color_patterns: [{ target: 'r0c0' }, { target: 'main' }],
      fx_glass_patterns: [{ target: 'r1c1' }],
      interactions: [{ target: 'r2c2' }],
    }).sort()).toEqual(['r0c0', 'r1c1']);
  });

  it('keeps interaction targets apart, since a surface cannot take a click', () => {
    expect(clickedCells({
      color_patterns: [{ target: 'r0c0' }],
      interactions: [{ target: 'elm_gauge_0' }, { target: 'r2c2' }, { target: 'r2c2' }],
    })).toEqual(['r2c2']);
  });

  it('is quiet about a configuration with no patterns at all', () => {
    expect(paintedCells({})).toEqual([]);
    expect(paintedCells(undefined)).toEqual([]);
    expect(clickedCells(undefined)).toEqual([]);
  });
});

describe('deadCellTargets', () => {
  const rows = [{ cells: [{}, {}] }, { cells: [{}] }];

  it('finds the targets naming a cell the layout does not have', () => {
    expect(deadCellTargets({
      layout_rows: rows,
      color_patterns: [{ target: 'r0c1' }, { target: 'r1c1' }, { target: 'r2c0' }],
      interactions: [{ target: 'r9c9' }],
    }).sort()).toEqual(['r1c1', 'r2c0', 'r9c9']);
  });

  it('calls every cell target dead when there is no layout at all', () => {
    expect(deadCellTargets({ color_patterns: [{ target: 'r0c0' }] })).toEqual(['r0c0']);
  });

  it('says nothing about a card with no cell targets', () => {
    expect(deadCellTargets({ layout_rows: rows, color_patterns: [{ target: 'main' }] })).toEqual([]);
  });
});

describe('repointPatterns', () => {
  const cellTargets = { r0c0: 'elm_surface_0', r1c0: 'elm_surface_1' };

  it('points a mapped cell target at its surface and counts the change', () => {
    const slot = {
      color_patterns: [{ id: 1, target: 'r0c0', colors: ['#f00'] }, { id: 2, target: 'main' }],
      fx_glass_patterns: [{ id: 3, target: 'r1c0' }],
    };
    const { lists, changed } = repointPatterns(slot, cellTargets);
    expect(changed).toBe(2);
    expect(lists.color_patterns[0]).toEqual({ id: 1, target: 'elm_surface_0', colors: ['#f00'] });
    expect(lists.color_patterns[1]).toEqual({ id: 2, target: 'main' });
    expect(lists.fx_glass_patterns[0]).toEqual({ id: 3, target: 'elm_surface_1' });
  });

  it('never mutates the lists it was given', () => {
    const slot = { color_patterns: [{ id: 1, target: 'r0c0' }] };
    repointPatterns(slot, cellTargets);
    expect(slot.color_patterns[0].target).toBe('r0c0');
  });

  it('leaves an unmapped target exactly as it is', () => {
    const slot = { color_patterns: [{ id: 1, target: 'r7c7', colors: ['#0f0'] }] };
    const { lists, changed } = repointPatterns(slot, cellTargets);
    expect(changed).toBe(0);
    expect(lists).toEqual({});
  });

  it('returns only the lists that changed, so the merge stays small', () => {
    const slot = {
      color_patterns: [{ id: 1, target: 'r0c0' }],
      fx_glass_patterns: [{ id: 2, target: 'main' }],
    };
    expect(Object.keys(repointPatterns(slot, cellTargets).lists)).toEqual(['color_patterns']);
  });

  it('does not touch interactions, which cannot use a surface', () => {
    const slot = { interactions: [{ id: 1, target: 'r0c0' }] };
    expect(repointPatterns(slot, cellTargets).lists).toEqual({});
  });

  it('survives a missing list and an empty map', () => {
    expect(repointPatterns({}, cellTargets).lists).toEqual({});
    expect(repointPatterns({ color_patterns: [{ target: 'r0c0' }] }, {}).lists).toEqual({});
    expect(repointPatterns(undefined, cellTargets).changed).toBe(0);
  });
});

describe('canvasFromCard', () => {
  const card = { grid_options: { columns: 6, rows: 4 } };

  it('arranges the card own three the way the content row does', () => {
    const canvas = canvasFromCard(card, {});
    expect(canvas.elements.map(e => e.id)).toEqual(['icon', 'name', 'state']);
    const [icon, name, state] = canvas.elements;
    // icon at the left, the two lines stacked beside it
    expect(icon.x).toBeLessThan(name.x);
    expect(name.x).toBe(state.x);
    expect(name.y).toBeLessThan(state.y);
    expect(icon.w).toBe(icon.h);
    // the icon centres against the two lines, as it does in the content row
    const mid = el => el.y + el.h / 2;
    expect(Math.abs(mid(icon) - (name.y + (state.y + state.h - name.y) / 2))).toBeLessThanOrEqual(1);
  });

  it('keeps the header a row on a tall card, not a block', () => {
    const canvas = canvasFromCard({ grid_options: { columns: 3, rows: 6 } }, {});
    const top = Math.min(...canvas.elements.map(e => e.y));
    const bottom = Math.max(...canvas.elements.map(e => e.y + e.h));
    expect(bottom - top).toBeLessThanOrEqual(canvas.h * 0.25);
  });

  it('centres a header that has nothing under it', () => {
    const canvas = canvasFromCard({ grid_options: { columns: 3, rows: 6 } }, {});
    const top = Math.min(...canvas.elements.map(e => e.y));
    const bottom = Math.max(...canvas.elements.map(e => e.y + e.h));
    // The cap has nothing to make room for here, so the space is shared.
    expect(Math.abs(top - (canvas.h - bottom))).toBeLessThanOrEqual(1);
  });

  it('leaves the header at the top when something is under it', () => {
    const canvas = canvasFromCard({ grid_options: { columns: 3, rows: 6 } },
      { gauge_active: true, gauges: [{}] });
    const gauge = canvas.elements.find(e => e.id === 'gauge_0');
    const header = canvas.elements.filter(e => e.id !== 'gauge_0');
    expect(Math.max(...header.map(e => e.y + e.h))).toBeLessThanOrEqual(gauge.y);
    expect(Math.min(...header.map(e => e.y))).toBeLessThan(canvas.h * 0.1);
  });

  it('gives the two lines the whole band when the icon is hidden', () => {
    const canvas = canvasFromCard(card, { hide_icon: true });
    const [name, state] = canvas.elements;
    expect(name.x).toBe(state.x);
    expect(name.w).toBeGreaterThan(canvas.w * 0.8);
  });

  it('fills the band rather than taking a default box', () => {
    const canvas = canvasFromCard(card, {
      hide_icon: true, hide_entity_name: true, hide_entity_state: true,
      progressbar_active: true, progressbars: [{}],
    });
    const [bar] = canvas.elements;
    expect(bar.w).toBeGreaterThan(canvas.w * 0.8);
    expect(bar.h).toBeGreaterThan(canvas.h * 0.5);
  });

  it('keeps a gauge square and centred in its band', () => {
    const canvas = canvasFromCard(card, {
      hide_icon: true, hide_entity_name: true, hide_entity_state: true,
      gauge_active: true, gauges: [{}],
    });
    const [g] = canvas.elements;
    expect(g.w).toBe(g.h);
    expect(Math.abs((g.x + g.w / 2) - canvas.w / 2)).toBeLessThanOrEqual(1);
  });

  it('leaves out what the card has switched off', () => {
    const canvas = canvasFromCard(card, { hide_icon: true, hide_entity_state: true });
    expect(canvas.elements.map(e => e.id)).toEqual(['name']);
  });

  it('gives every drawn gauge, bar and label a band of its own below', () => {
    const canvas = canvasFromCard(card, {
      hide_icon: true, hide_entity_name: true, hide_entity_state: true,
      gauge_active: true, gauges: [{}, {}],
      progressbar_active: true, progressbars: [{}],
      labels_list: [{ enabled: true }],
    });
    expect(canvas.elements.map(e => e.id))
      .toEqual(['gauge_0', 'gauge_1', 'progressbar_0', 'label_0']);
    const ys = canvas.elements.map(e => e.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('never resurrects what a module switch has switched off', () => {
    const canvas = canvasFromCard(card, {
      hide_icon: true, hide_entity_name: true, hide_entity_state: true,
      gauges: [{}], progressbars: [{}], gauge_active: false, progressbar_active: false,
    });
    expect(canvas.elements).toEqual([]);
  });

  it('honours a bar switched off on its own, and a label not enabled', () => {
    const canvas = canvasFromCard(card, {
      hide_icon: true, hide_entity_name: true, hide_entity_state: true,
      progressbar_active: true, progressbars: [{ active: false }, {}],
      labels_list: [{ enabled: false }, { enabled: true }],
    });
    expect(canvas.elements.map(e => e.id)).toEqual(['progressbar_1', 'label_1']);
  });

  it('carries the legacy single gauge over', () => {
    const canvas = canvasFromCard(card, { gauge_active: true, entity: 'sensor.a' });
    expect(canvas.elements.map(e => e.id)).toContain('gauge_0');
  });

  it('takes the shape of the card box, not a default', () => {
    const wide = canvasFromCard({ grid_options: { columns: 12, rows: 2 } }, {});
    const tall = canvasFromCard({ grid_options: { columns: 3, rows: 8 } }, {});
    expect(wide.w / wide.h).toBeGreaterThan(tall.w / tall.h);
  });

  it('keeps every box on the canvas', () => {
    const canvas = canvasFromCard(card, {
      gauge_active: true, gauges: [{}, {}], labels_list: [{ enabled: true }, { enabled: true }],
    });
    for (const el of canvas.elements) {
      expect(el.x).toBeGreaterThanOrEqual(0);
      expect(el.y).toBeGreaterThanOrEqual(0);
      expect(el.x + el.w).toBeLessThanOrEqual(canvas.w);
      expect(el.y + el.h).toBeLessThanOrEqual(canvas.h);
    }
  });

  it('never returns an empty canvas for a card that draws something', () => {
    expect(canvasFromCard(card, {}).elements.length).toBeGreaterThan(0);
  });

  it('shapes a full-width card to the section it is in', () => {
    // The same trap Convert had: a card filling a section two columns wide is
    // 968px, not 480, and given one section's worth it would take the ratio of
    // a card half its width and letterbox everything on it.
    const full = { grid_options: { columns: 'full', rows: 4 } };
    expect(canvasFromCard(full, {}, 24).h).toBeLessThan(canvasFromCard(full, {}).h);
    expect(canvasFromCard(full, {}, 24)).toMatchObject(
      { w: canvasFromGrid(full, {}, 400, 24).w, h: canvasFromGrid(full, {}, 400, 24).h });
  });

  it('leaves a card narrower than one section alone', () => {
    const six = { grid_options: { columns: 6, rows: 4 } };
    expect(canvasFromCard(six, {}, 24).h).toBe(canvasFromCard(six, {}).h);
  });
});

describe('resolveSnap', () => {
  it('snaps to the visible grid when snap is unset', () => {
    expect(resolveSnap({ grid: 20 })).toBe(20);
  });
  it('reads snap 0 as free placement, one unit at a time', () => {
    expect(resolveSnap({ grid: 20, snap: 0 })).toBe(1);
  });
  it('prefers an explicit step over the grid', () => {
    expect(resolveSnap({ grid: 20, snap: 5 })).toBe(5);
  });
  it('falls back to the default grid with nothing configured', () => {
    expect(resolveSnap({})).toBe(DEFAULT_GRID);
    expect(resolveSnap(undefined)).toBe(DEFAULT_GRID);
  });
  it('keeps free placement distinct from the default grid', () => {
    // The two used to resolve to the same step, so "Free" and "Snap to grid"
    // were one behaviour offered as two.
    expect(resolveSnap({ snap: 0 })).not.toBe(resolveSnap({}));
  });
});

describe('isPinned', () => {
  it('is true only for locked: true', () => {
    expect(isPinned({ locked: true })).toBe(true);
    for (const v of [false, undefined, null, 0, '', 'true', 1, 'yes'])
      expect(isPinned({ locked: v })).toBe(false);
    expect(isPinned({})).toBe(false);
    expect(isPinned(undefined)).toBe(false);
  });

  it('is not the shape lock', () => {
    expect(isPinned({ id: 'gauge_0' })).toBe(false);
    expect(isSquareLocked({ id: 'name', locked: true })).toBe(false);
  });
});

describe('applyDrag', () => {
  const canvas = { w: 400, h: 200, grid: 10 };
  const el = { x: 100, y: 50, w: 80, h: 40 };

  it('moves by the delta, snapped to the grid', () => {
    // 113 -> 110 and 43 -> 40: both snapped, neither merely rounded toward
    // where the pointer was.
    expect(applyDrag(canvas, el, 'move', { dx: 13, dy: -7 }))
      .toEqual({ x: 110, y: 40, w: 80, h: 40 });
  });

  it('keeps a moved element inside the canvas', () => {
    expect(applyDrag(canvas, el, 'move', { dx: 9999, dy: 9999 }))
      .toEqual({ x: 320, y: 160, w: 80, h: 40 });
    expect(applyDrag(canvas, el, 'move', { dx: -9999, dy: -9999 }))
      .toEqual({ x: 0, y: 0, w: 80, h: 40 });
  });

  it('will not move or resize a pinned element, however far the pointer went', () => {
    const pinned = { ...el, locked: true };
    for (const mode of ['move', 'resize']) {
      for (const delta of [{ dx: 13, dy: -7 }, { dx: 9999, dy: 9999 }, { dx: -9999, dy: -9999 }]) {
        expect(applyDrag(canvas, pinned, mode, delta)).toEqual({ x: 100, y: 50, w: 80, h: 40 });
      }
    }
  });

  it('pins a square-locked element just as firmly', () => {
    // The two locks are unrelated, and the shape one must not swallow the
    // other: a gauge's resize branch has its own return, reached first.
    const gauge = { id: 'gauge_0', x: 100, y: 50, w: 80, h: 80, locked: true };
    expect(applyDrag(canvas, gauge, 'resize', { dx: 40, dy: 40 }))
      .toEqual({ x: 100, y: 50, w: 80, h: 80 });
  });

  it('moves an element that only says locked: false', () => {
    // Everything that is not exactly true is unpinned, so a leftover key
    // cannot silently freeze an element someone can still drag.
    for (const v of [false, undefined, null, 0, '', 'true', 1]) {
      expect(applyDrag(canvas, { ...el, locked: v }, 'move', { dx: 13, dy: -7 }))
        .toEqual({ x: 110, y: 40, w: 80, h: 40 });
    }
  });

  it('resizes without moving the origin', () => {
    expect(applyDrag(canvas, el, 'resize', { dx: 24, dy: 11 }))
      .toEqual({ x: 100, y: 50, w: 100, h: 50 });
  });

  it('never resizes past the canvas edge, or below one step', () => {
    expect(applyDrag(canvas, el, 'resize', { dx: 9999, dy: 9999 }))
      .toEqual({ x: 100, y: 50, w: 300, h: 150 });
    expect(applyDrag(canvas, el, 'resize', { dx: -9999, dy: -9999 }))
      .toEqual({ x: 100, y: 50, w: 10, h: 10 });
  });

  it('places freely when snapping is off', () => {
    expect(applyDrag({ ...canvas, snap: 0 }, el, 'move', { dx: 13, dy: -7 }))
      .toEqual({ x: 113, y: 43, w: 80, h: 40 });
  });
});


describe('gridRowsToPx', () => {
  it('matches hui-grid-section: rows * (56 + 8) - 8', () => {
    expect(gridRowsToPx(1)).toBe(56);
    expect(gridRowsToPx(2)).toBe(120);
    expect(gridRowsToPx(4)).toBe(248);
  });

  it('never returns less than one row', () => {
    expect(gridRowsToPx(0)).toBe(56);
    expect(gridRowsToPx(-3)).toBe(56);
    expect(gridRowsToPx(undefined)).toBe(56);
    expect(gridRowsToPx('nonsense')).toBe(56);
  });
});

describe('reportedRows', () => {
  it('lets a canvas card size itself', () => {
    expect(reportedRows({ canvas: { w: 400, h: 200, elements: [] } })).toBe('auto');
  });

  it('keeps the fixed default for a row/cell card, whose rows are percentages', () => {
    expect(reportedRows({})).toBe(3);
    expect(reportedRows(undefined)).toBe(3);
    expect(reportedRows({ layout_rows: [] })).toBe(3);
  });

  it('honours an explicit grid_rows on a row/cell card', () => {
    expect(reportedRows({ grid_rows: 6 })).toBe(6);
    expect(reportedRows({ grid_rows: 0 })).toBe(3);
  });
});

describe('isHeightPinned', () => {
  it('is pinned by a row count from the layout tab', () => {
    expect(isHeightPinned({ grid_options: { rows: 4 } })).toBe(true);
    expect(isHeightPinned({ grid_options: { rows: 1, columns: 6 } })).toBe(true);
  });

  it('is not pinned by auto height, or by no grid_options at all', () => {
    expect(isHeightPinned({ grid_options: { rows: 'auto' } })).toBe(false);
    expect(isHeightPinned({ grid_options: { columns: 6 } })).toBe(false);
    expect(isHeightPinned({ grid_options: {} })).toBe(false);
    expect(isHeightPinned({})).toBe(false);
    expect(isHeightPinned(undefined)).toBe(false);
  });
});

describe('isSquareLocked', () => {
  it('locks gauges, and nothing else', () => {
    expect(isSquareLocked({ id: 'gauge_0' })).toBe(true);
    expect(isSquareLocked({ id: 'gauge_11' })).toBe(true);
    expect(isSquareLocked({ id: 'progressbar_0' })).toBe(false);
    expect(isSquareLocked({ id: 'label_0' })).toBe(false);
    expect(isSquareLocked({ id: 'icon' })).toBe(false);
  });

  it('never locks a surface, even one sitting over a gauge', () => {
    expect(isSquareLocked({ id: 'gauge_0', surface: true })).toBe(false);
    expect(isSquareLocked({ id: 'surface_0' })).toBe(false);
  });

  it('survives an element with no id', () => {
    expect(isSquareLocked({})).toBe(false);
    expect(isSquareLocked(undefined)).toBe(false);
  });
});

describe('squareElement', () => {
  it('centres the square by default, so the picture does not move', () => {
    expect(squareElement({ id: 'gauge_0', x: 0, y: 0, w: 200, h: 100 }))
      .toMatchObject({ x: 50, y: 0, w: 100, h: 100 });
    expect(squareElement({ id: 'gauge_0', x: 10, y: 20, w: 40, h: 100 }))
      .toMatchObject({ x: 10, y: 50, w: 40, h: 40 });
  });

  it('anchors the square the way inner aligns the content', () => {
    const box = { id: 'gauge_0', x: 0, y: 0, w: 200, h: 100 };
    expect(squareElement({ ...box, inner: 'tl' })).toMatchObject({ x: 0, y: 0 });
    expect(squareElement({ ...box, inner: 'br' })).toMatchObject({ x: 100, y: 0 });
    expect(squareElement({ ...box, inner: 'cr' })).toMatchObject({ x: 100, y: 0 });
    expect(squareElement({ id: 'gauge_0', x: 0, y: 0, w: 100, h: 200, inner: 'bl' }))
      .toMatchObject({ x: 0, y: 100, w: 100, h: 100 });
  });

  it('leaves an already square element exactly where it is', () => {
    const el = { id: 'gauge_0', x: 7, y: 9, w: 40, h: 40, inner: 'tl' };
    expect(squareElement(el)).toEqual(el);
  });

  it('carries every other field over untouched', () => {
    const out = squareElement({ id: 'gauge_0', x: 0, y: 0, w: 200, h: 100, overflow: false, font_size: 12 });
    expect(out.overflow).toBe(false);
    expect(out.font_size).toBe(12);
  });
});

describe('applyDrag with a square-locked element', () => {
  const c = { w: 100, h: 100, grid: 10 };

  it('resizes to one side, taken from the axis dragged further', () => {
    const el = { id: 'gauge_0', x: 0, y: 0, w: 20, h: 20 };
    expect(applyDrag(c, el, 'resize', { dx: 30, dy: 2 })).toEqual({ x: 0, y: 0, w: 50, h: 50 });
    expect(applyDrag(c, el, 'resize', { dx: 2, dy: 30 })).toEqual({ x: 0, y: 0, w: 50, h: 50 });
  });

  it('squares an element that was not square as soon as it is resized', () => {
    const el = { id: 'gauge_0', x: 0, y: 0, w: 60, h: 20 };
    const out = applyDrag(c, el, 'resize', { dx: 0, dy: 0 });
    expect(out.w).toBe(out.h);
    expect(out).toEqual({ x: 0, y: 0, w: 60, h: 60 });
  });

  it('stays inside the canvas on both axes at once', () => {
    const el = { id: 'gauge_0', x: 40, y: 70, w: 20, h: 20 };
    expect(applyDrag(c, el, 'resize', { dx: 500, dy: 500 })).toEqual({ x: 40, y: 70, w: 30, h: 30 });
  });

  it('never resizes below one step', () => {
    const el = { id: 'gauge_0', x: 0, y: 0, w: 20, h: 20 };
    expect(applyDrag(c, el, 'resize', { dx: -500, dy: -500 })).toEqual({ x: 0, y: 0, w: 10, h: 10 });
  });

  it('leaves moving alone - a move cannot change the shape', () => {
    const el = { id: 'gauge_0', x: 0, y: 0, w: 60, h: 20 };
    expect(applyDrag(c, el, 'move', { dx: 10, dy: 10 })).toEqual({ x: 10, y: 10, w: 60, h: 20 });
  });

  it('leaves a progressbar free to be any shape', () => {
    const el = { id: 'progressbar_0', x: 0, y: 0, w: 20, h: 20 };
    expect(applyDrag(c, el, 'resize', { dx: 30, dy: 0 })).toEqual({ x: 0, y: 0, w: 50, h: 20 });
  });
});

describe('migration squares gauges', () => {
  it('inscribes the gauge in the cell it came from, centred', () => {
    const rows = [{ cells: [{ width: 100, content: 'gauge_0' }] }];
    const { elements } = migrateLayoutToCanvas(rows, { w: 400, h: 200 });
    expect(elements[0]).toMatchObject({ id: 'gauge_0', x: 100, y: 0, w: 200, h: 200 });
  });

  it('leaves a progressbar filling its cell', () => {
    const rows = [{ cells: [{ width: 100, content: 'progressbar_0' }] }];
    const { elements } = migrateLayoutToCanvas(rows, { w: 400, h: 200 });
    expect(elements[0]).toMatchObject({ w: 33.333 / 100 * 400, h: 33.333 / 100 * 200 });
  });

  it('leaves surfaces alone, so a pattern still paints the whole cell', () => {
    const rows = [{ cells: [{ width: 100, content: 'gauge_0' }] }];
    const { elements } = migrateLayoutToCanvas(rows, { w: 400, h: 200 }, { targetedCells: ['r0c0'] });
    expect(elements[0]).toMatchObject({ id: 'surface_0', x: 0, y: 0, w: 400, h: 200 });
  });

  it('every migrated gauge in a real layout comes out square', () => {
    for (const fx of fixtures) {
      const { elements } = migrateLayoutToCanvas(fx.layout_rows ?? fx.slot?.layout_rows ?? []);
      for (const el of elements) {
        if (isSquareLocked(el)) expect(el.w).toBeCloseTo(el.h, 9);
      }
    }
  });
});

describe('gridColumnsToPx', () => {
  // Measured on a real dashboard, which is where the reference width comes
  // from: a full-width card was 480px and a six-column one 236.
  it('reproduces the widths a real section gives', () => {
    expect(gridColumnsToPx(12)).toBeCloseTo(480, 6);
    expect(gridColumnsToPx(6)).toBeCloseTo(236, 6);
    expect(gridColumnsToPx(3)).toBeCloseTo(114, 6);
  });

  it('treats a full-width card as the whole section', () => {
    expect(gridColumnsToPx('full')).toBeCloseTo(gridColumnsToPx(12), 6);
  });

  it('clamps nonsense into the grid rather than inventing a width', () => {
    expect(gridColumnsToPx(0)).toBeCloseTo(gridColumnsToPx(1), 6);
    expect(gridColumnsToPx(99)).toBeCloseTo(gridColumnsToPx(12), 6);
    expect(gridColumnsToPx(undefined)).toBeCloseTo(gridColumnsToPx(1), 6);
  });
});

describe('gridSize', () => {
  it('prefers what the layout tab set', () => {
    expect(gridSize({ grid_options: { columns: 6, rows: 4 } }, { grid_columns: 9 }))
      .toEqual({ columns: 6, rows: 4 });
  });

  it('falls back to the defaults the card reports', () => {
    expect(gridSize({}, { grid_columns: 9, grid_rows: 5 })).toEqual({ columns: 9, rows: 5 });
    expect(gridSize({}, {})).toEqual({ columns: 3, rows: 3 });
    expect(gridSize(undefined, undefined)).toEqual({ columns: 3, rows: 3 });
  });

  it('does not mistake auto height for a row count', () => {
    expect(gridSize({ grid_options: { rows: 'auto' } }, { grid_rows: 5 }).rows).toBe(5);
  });
});

describe('canvasFromGrid', () => {
  it('gives the six-by-four card the shape worked out by hand', () => {
    // 236 x 248 px, scaled so the longer side is 400.
    expect(canvasFromGrid({ grid_options: { columns: 6, rows: 4 } }, {}))
      .toEqual({ w: 381, h: 400 });
  });

  it('keeps the ratio of the box it came from', () => {
    for (const [columns, rows] of [[12, 4], [3, 2], [6, 8], [1, 1]]) {
      const c = canvasFromGrid({ grid_options: { columns, rows } }, {});
      expect(c.w / c.h).toBeCloseTo(gridColumnsToPx(columns) / gridRowsToPx(rows), 2);
      expect(Math.max(c.w, c.h)).toBe(400);
    }
  });
});

describe('rescaleCanvas', () => {
  it('carries the layout across as the same proportions', () => {
    const canvas = { w: 400, h: 200, elements: [
      { id: 'progressbar_0', x: 100, y: 50, w: 200, h: 100 },
    ] };
    const out = rescaleCanvas(canvas, { w: 200, h: 400 });
    expect(out).toMatchObject({ w: 200, h: 400 });
    expect(out.elements[0]).toMatchObject({ x: 50, y: 100, w: 100, h: 200 });
  });

  it('re-squares gauges, which two different factors would have flattened', () => {
    const canvas = { w: 400, h: 200, elements: [{ id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 }] };
    const out = rescaleCanvas(canvas, { w: 200, h: 400 });
    expect(out.elements[0].w).toBe(out.elements[0].h);
    expect(out.elements[0].w).toBe(50);
  });

  it('leaves everything but the geometry alone', () => {
    const canvas = { w: 400, h: 200, grid: 10, snap: 5,
      elements: [{ id: 'label_0', x: 0, y: 0, w: 10, h: 10, overflow: false }] };
    const out = rescaleCanvas(canvas, { w: 800, h: 400 });
    expect(out.grid).toBe(10);
    expect(out.snap).toBe(5);
    expect(out.elements[0].overflow).toBe(false);
  });

  it('is a no-op when the shape has not changed', () => {
    const canvas = { w: 400, h: 200, elements: [{ id: 'x', x: 1, y: 2, w: 3, h: 4 }] };
    expect(rescaleCanvas(canvas, { w: 400, h: 200 })).toEqual(canvas);
  });
});

describe('duplicateElement', () => {
  const slot = () => ({
    progressbars: [{ entity: 'sensor.a', color_patterns: [{ pct: 50 }] }],
    gauges: [{ entity: 'sensor.b' }, { entity: 'sensor.c' }],
    labels_list: [{ label_text: 'one' }],
  });
  const canvas = () => ({ w: 400, h: 400, grid: 10, elements: [
    { id: 'progressbar_0', x: 20, y: 20, w: 100, h: 40, inner: 'cc' },
    { id: 'gauge_1', x: 0, y: 0, w: 80, h: 80 },
    { id: 'label_0_value', x: 10, y: 10, w: 50, h: 20 },
    { id: 'surface_0', surface: true, x: 5, y: 5, w: 60, h: 30 },
    { id: 'icon', x: 0, y: 300, w: 40, h: 40 },
    { id: 'gauge_0', x: 200, y: 200, w: 80, h: 80 },
  ]});

  it('copies the entry the id points at, under the new index', () => {
    const made = duplicateElement(slot(), canvas(), 0);
    expect(made.id).toBe('progressbar_1');
    expect(made.patch.progressbars).toHaveLength(2);
    expect(made.patch.progressbars[1]).toEqual(slot().progressbars[0]);
    // A deep copy: editing the copy must not reach into the original.
    expect(made.patch.progressbars[1].color_patterns)
      .not.toBe(made.patch.progressbars[0].color_patterns);
  });

  it('keeps the box and offsets the copy by one snap step', () => {
    const made = duplicateElement(slot(), canvas(), 0);
    const copy = made.canvas.elements.at(-1);
    expect(copy).toEqual({ id: 'progressbar_1', x: 30, y: 30, w: 100, h: 40, inner: 'cc' });
  });

  it('keeps the copy on the canvas', () => {
    const c = canvas();
    c.elements[0] = { id: 'progressbar_0', x: 300, y: 395, w: 100, h: 40 };
    const copy = duplicateElement(slot(), c, 0).canvas.elements.at(-1);
    expect(copy.x).toBe(300);   // already flush right
    expect(copy.y).toBe(360);   // pulled back inside
  });

  it('carries a label sub-target across to the copy', () => {
    const made = duplicateElement(slot(), canvas(), 2);
    expect(made.id).toBe('label_1_value');
    expect(made.patch.labels_list).toHaveLength(2);
  });

  it('gives a surface a free id and touches no list', () => {
    const made = duplicateElement(slot(), canvas(), 3);
    expect(made.id).toBe('surface_1');
    expect(made.patch).toEqual({});
  });

  it('leaves the original canvas and slot alone', () => {
    const s = slot(), c = canvas();
    duplicateElement(s, c, 0);
    expect(s).toEqual(slot());
    expect(c).toEqual(canvas());
  });

  it('refuses what the card has only one of', () => {
    expect(duplicateElement(slot(), canvas(), 4)).toBe(null);       // icon
    expect(duplicateElement(slot(), canvas(), 99)).toBe(null);      // gone
    // a gauge on a slot that never grew a `gauges` array is the card's config
    expect(duplicateElement({}, canvas(), 5)).toBe(null);
  });

  it('canDuplicate agrees with it', () => {
    const s = slot(), c = canvas();
    c.elements.forEach((el, i) => {
      expect(canDuplicate(s, el)).toBe(duplicateElement(s, c, i) !== null);
    });
    expect(canDuplicate({}, { id: 'gauge_0' })).toBe(false);
    expect(canDuplicate(s, { id: 'gauge_9' })).toBe(false);
  });
});

describe('addElement', () => {
  const slot = () => ({
    gauges: [{ entity: 'sensor.a' }],
    progressbars: [{ entity: 'sensor.b' }, { entity: 'sensor.c' }],
    labels_list: [{ label_text: 'one' }],
    gauge_active: true,
  });
  const canvas = () => ({ w: 400, h: 400, grid: 25, elements: [
    { id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 },
    { id: 'surface_0', surface: true, x: 200, y: 200, w: 100, h: 50 },
  ]});

  it('appends the entry and names the element after its index', () => {
    const made = addElement(slot(), canvas(), 'progressbar', { entity: '' });
    expect(made.id).toBe('progressbar_2');
    expect(made.patch.progressbars).toHaveLength(3);
    expect(made.canvas.elements.at(-1).id).toBe('progressbar_2');
  });

  it('starts a list the card does not have yet', () => {
    const made = addElement({}, canvas(), 'label', { label_text: '' });
    expect(made.id).toBe('label_0');
    expect(made.patch.labels_list).toEqual([{ label_text: '' }]);
  });

  it('turns the module on, and leaves one that is already on alone', () => {
    expect(addElement({}, canvas(), 'progressbar', {}).patch.progressbar_active).toBe(true);
    expect(addElement(slot(), canvas(), 'gauge', {}).patch)
      .not.toHaveProperty('gauge_active');
  });

  it('gives a surface a free id and no definition', () => {
    const made = addElement(slot(), canvas(), 'surface');
    expect(made.id).toBe('surface_1');
    expect(made.patch).toEqual({});
    expect(made.canvas.elements.at(-1).surface).toBe(true);
  });

  it('centres the box on the point it is placed at, snapped', () => {
    const made = addElement(slot(), canvas(), 'gauge', {}, { x: 210, y: 190 });
    const el = made.canvas.elements.at(-1);
    expect({ w: el.w, h: el.h }).toEqual({ w: 75, h: 75 });   // a fifth of 400, snapped
    expect({ x: el.x, y: el.y }).toEqual({ x: 175, y: 150 }); // 210-37.5 -> 175
  });

  it('keeps the box on the canvas whatever it is aimed at', () => {
    const c = canvas();
    for (const at of [{ x: 0, y: 0 }, { x: 400, y: 400 }, { x: -80, y: 600 }]) {
      const el = addElement(slot(), c, 'surface', undefined, at).canvas.elements.at(-1);
      expect(el.x).toBeGreaterThanOrEqual(0);
      expect(el.y).toBeGreaterThanOrEqual(0);
      expect(el.x + el.w).toBeLessThanOrEqual(c.w);
      expect(el.y + el.h).toBeLessThanOrEqual(c.h);
    }
  });

  it('puts an unplaced element of the card itself on the canvas', () => {
    const made = addElement(slot(), canvas(), 'icon');
    expect(made.id).toBe('icon');
    expect(made.patch).toEqual({});
    expect(made.canvas.elements).toHaveLength(3);
  });

  it('is square for a gauge and an icon, and a flat strip for everything else', () => {
    const c = canvas();
    const box = what => { const e = addElement(slot(), c, what, {}).canvas.elements.at(-1);
                          return [e.w, e.h]; };
    expect(box('gauge')).toEqual([75, 75]);
    // The glyph is drawn across the shorter side of the box, so a strip would
    // be an icon the size of its height with the rest of the box empty.
    expect(box('icon')).toEqual([75, 75]);
    expect(box('surface')).toEqual([150, 75]);
    expect(box('progressbar')).toEqual([125, 50]);
    expect(box('name')).toEqual([125, 50]);
  });

  it('never returns a box smaller than one step, on any canvas', () => {
    for (const c of [{ w: 40, h: 20, snap: 0 }, { w: 400, h: 200 }, { w: 30, h: 30, grid: 25 }]) {
      for (const k of NEW_ELEMENT_KINDS) {
        const el = addElement({}, { ...c, elements: [] }, k.kind, {}).canvas.elements.at(-1);
        expect(el.w).toBeGreaterThan(0);
        expect(el.h).toBeGreaterThan(0);
        expect(el.x + el.w).toBeLessThanOrEqual(c.w);
        expect(el.y + el.h).toBeLessThanOrEqual(c.h);
      }
    }
  });

  it('refuses an unknown kind, and an element the canvas already shows', () => {
    expect(addElement(slot(), canvas(), 'sausage')).toBe(null);
    expect(addElement(slot(), canvas(), 'gauge_0')).toBe(null);
    expect(addElement(slot(), canvas(), '')).toBe(null);
  });

  it('places only ids the card actually backs', () => {
    const s = slot(), c = canvas();
    for (const id of ['icon', 'name', 'state', 'progressbar_1', 'label_0', 'label_0_icon']) {
      expect(addElement(s, c, id)?.id).toBe(id);
    }
    for (const id of ['progressbar_2', 'label_1', 'label_1_value', 'gauge_1', 'surface_9']) {
      expect(addElement(s, c, id)).toBe(null);
    }
    // the single gauge of a slot that never grew an array is still an element
    expect(addElement({ gauge_active: true }, { ...c, elements: [] }, 'gauge_0')?.id).toBe('gauge_0');
  });

  it('refuses a gauge on a slot that is itself the gauge', () => {
    const legacy = { gauge_active: true };
    expect(canAddKind(legacy, 'gauge')).toBe(false);
    expect(addElement(legacy, canvas(), 'gauge', {})).toBe(null);
    // with the module off there is no gauge to lose, so the array may start
    expect(canAddKind({}, 'gauge')).toBe(true);
    expect(addElement({}, canvas(), 'gauge', {}).id).toBe('gauge_0');
  });

  it('leaves the original canvas and slot alone', () => {
    const s = slot(), c = canvas();
    for (const k of NEW_ELEMENT_KINDS) addElement(s, c, k.kind, { entity: '' });
    expect(s).toEqual(slot());
    expect(c).toEqual(canvas());
  });

  it('canAddKind agrees with it', () => {
    for (const s of [slot(), {}, { gauge_active: true }]) {
      for (const k of NEW_ELEMENT_KINDS) {
        expect(canAddKind(s, k.kind)).toBe(addElement(s, canvas(), k.kind, {}) !== null);
      }
    }
  });
});

describe('newElementPreview', () => {
  const slot = () => ({
    gauges: [{ entity: 'sensor.a' }],
    progressbars: [{ entity: 'sensor.b' }, { entity: 'sensor.c' }],
    labels_list: [{ label_text: 'one' }],
    gauge_active: true,
  });
  const canvas = () => ({ w: 400, h: 400, grid: 25, elements: [
    { id: 'gauge_0', x: 0, y: 0, w: 100, h: 100 },
    { id: 'surface_0', surface: true, x: 200, y: 200, w: 100, h: 50 },
  ]});

  // The whole point of the function: the ghost the editor draws under the
  // crosshair has to be the element the click then makes. Asserted against
  // `addElement` itself rather than against numbers, so the day the sizing
  // rule changes the two still have to agree.
  it('is the element addElement would add, over every kind and every corner', () => {
    const s = slot(), c = canvas();
    const wheres = [undefined, { x: 0, y: 0 }, { x: 400, y: 400 }, { x: 210, y: 190 },
                    { x: -80, y: 600 }, { x: 200, y: 200 }];
    const whats = [...NEW_ELEMENT_KINDS.map(k => k.kind),
                   'icon', 'name', 'state', 'progressbar_1', 'label_0', 'label_0_icon'];
    for (const what of whats) {
      for (const at of wheres) {
        const made = addElement(s, c, what, {}, at);
        const el = made.canvas.elements.at(-1);
        expect(newElementPreview(s, c, what, at))
          .toEqual({ id: made.id, surface: el.surface === true,
                     x: el.x, y: el.y, w: el.w, h: el.h });
      }
    }
  });

  it('is null wherever addElement refuses, so nothing is promised', () => {
    for (const s of [slot(), {}, { gauge_active: true }]) {
      for (const what of ['sausage', '', 'gauge_0', 'gauge_1', 'surface_9', 'label_1',
                          ...NEW_ELEMENT_KINDS.map(k => k.kind)]) {
        expect(newElementPreview(s, canvas(), what) === null)
          .toBe(addElement(s, canvas(), what, {}) === null);
      }
    }
  });

  it('changes nothing it is shown', () => {
    const s = slot(), c = canvas();
    for (const k of NEW_ELEMENT_KINDS) newElementPreview(s, c, k.kind, { x: 10, y: 10 });
    expect(s).toEqual(slot());
    expect(c).toEqual(canvas());
  });
});

describe('soleElementTargets', () => {
  const cell = (content, extra = {}) => ({ id: 'c', content, width: 100, ...extra });

  it('names the one element a cell holds, in the form the pattern lists use', () => {
    const rows = [{ id: 'r', cells: [cell('gauge_0'), cell('label_1')] }];
    expect(soleElementTargets(rows)).toEqual({ r0c0: 'elm_gauge_0', r0c1: 'elm_label_1' });
  });

  it('skips a cell with nothing in it', () => {
    const rows = [{ id: 'r', cells: [cell('empty'), cell(undefined), { id: 'c', items: [] }] }];
    expect(soleElementTargets(rows)).toEqual({});
  });

  it('skips a cell holding more than one element - there is nothing single to follow', () => {
    const rows = [{ id: 'r', cells: [{ id: 'c', items: [{ id: 'name' }, { id: 'state' }] }] }];
    expect(soleElementTargets(rows)).toEqual({});
  });

  it('takes the single item of an items cell', () => {
    const rows = [{ id: 'r', cells: [{ id: 'c', items: [{ id: 'progressbar_2' }] }] }];
    expect(soleElementTargets(rows)).toEqual({ r0c0: 'elm_progressbar_2' });
  });

  it('counts rows and cells from zero, like every other cell key', () => {
    const rows = [
      { id: 'a', cells: [cell('empty'), cell('icon')] },
      { id: 'b', cells: [cell('gauge_0')] },
    ];
    expect(soleElementTargets(rows)).toEqual({ r0c1: 'elm_icon', r1c0: 'elm_gauge_0' });
  });

  it('is empty for anything that is not a list of rows', () => {
    expect(soleElementTargets(undefined)).toEqual({});
    expect(soleElementTargets(/** @type {any} */ ({}))).toEqual({});
    expect(soleElementTargets([{ id: 'r' }])).toEqual({});
  });
});

describe('colouredCells and glassedCells', () => {
  const slot = {
    color_patterns: [{ target: 'r0c0' }, { target: 'main' }],
    fx_glass_patterns: [{ target: 'r1c1' }, { target: 'r0c0' }, { target: 'elm_gauge_0' }],
  };

  it('separates the two lists paintedCells unions', () => {
    expect(colouredCells(slot)).toEqual(['r0c0']);
    expect(glassedCells(slot)).toEqual(['r1c1', 'r0c0']);
  });

  it('leaves paintedCells the union of the two, each cell once', () => {
    expect(paintedCells(slot).sort()).toEqual(['r0c0', 'r1c1']);
  });
});

describe('repointPatterns with glass following the element', () => {
  const cellTargets = { r0c0: 'elm_surface_0', r1c0: 'elm_surface_1' };
  const follows = { r0c0: 'elm_gauge_0', r1c0: 'elm_label_0' };

  it('sends the glass to the element and the colour to the surface', () => {
    const slot = {
      color_patterns: [{ id: 1, target: 'r0c0' }],
      fx_glass_patterns: [{ id: 2, target: 'r0c0' }],
    };
    const { lists, changed } = repointPatterns(slot, cellTargets, follows);
    expect(changed).toBe(2);
    expect(lists.color_patterns[0].target).toBe('elm_surface_0');
    expect(lists.fx_glass_patterns[0].target).toBe('elm_gauge_0');
  });

  it('sends the glass to the element even where no surface was made', () => {
    const slot = { fx_glass_patterns: [{ id: 2, target: 'r1c0' }] };
    const { lists } = repointPatterns(slot, {}, follows);
    expect(lists.fx_glass_patterns[0].target).toBe('elm_label_0');
  });

  it('falls back to the surface for a cell with nothing single to follow', () => {
    const slot = { fx_glass_patterns: [{ id: 2, target: 'r1c0' }] };
    const { lists } = repointPatterns(slot, cellTargets, {});
    expect(lists.fx_glass_patterns[0].target).toBe('elm_surface_1');
  });

  it('behaves exactly as before when no glass map is given', () => {
    const slot = {
      color_patterns: [{ id: 1, target: 'r0c0' }],
      fx_glass_patterns: [{ id: 2, target: 'r1c0' }],
    };
    expect(repointPatterns(slot, cellTargets)).toEqual(repointPatterns(slot, cellTargets, {}));
  });

  it('never mutates the lists it was given', () => {
    const slot = { fx_glass_patterns: [{ id: 2, target: 'r0c0' }] };
    repointPatterns(slot, cellTargets, follows);
    expect(slot.fx_glass_patterns[0].target).toBe('r0c0');
  });
});

describe('sectionColumns', () => {
  // A stand-in for the shadow-root chain the editor sits in: each level is a
  // host whose getRootNode() hands back the next one up.
  const chain = (...hosts) => {
    let child = null;
    for (const host of hosts) {
      const node = { host, _child: child };
      host._root = node;
      child = host;
      host.getRootNode = () => node._parentRoot || { host: null };
    }
    return child;
  };
  const nest = (tags) => {
    let inner = null;
    const nodes = tags.map(t => ({ ...t, getRootNode: () => ({ host: null }) }));
    for (let i = nodes.length - 1; i > 0; i--) nodes[i].getRootNode = () => ({ host: nodes[i - 1] });
    inner = nodes[nodes.length - 1];
    return inner;
  };

  it('takes twelve columns per column the section spans', () => {
    const editor = nest([{ _params: { sectionConfig: { column_span: 2 } } }, {}, {}]);
    expect(sectionColumns(editor)).toBe(24);
  });

  it('reads a section that spans one as twelve', () => {
    const editor = nest([{ _params: { sectionConfig: { type: 'grid' } } }, {}]);
    expect(sectionColumns(editor)).toBe(12);
  });

  it('falls back to one section when nothing up the chain knows', () => {
    expect(sectionColumns(nest([{}, {}, {}]))).toBe(12);
    expect(sectionColumns(null)).toBe(12);
    expect(sectionColumns({})).toBe(12);
  });

  it('ignores a span that is not a positive number', () => {
    for (const column_span of [0, -3, 'wide', null, undefined, NaN]) {
      expect(sectionColumns(nest([{ _params: { sectionConfig: { column_span } } }, {}]))).toBe(12);
    }
  });

  it('stops climbing rather than looping on a cycle', () => {
    const a = {}; const b = {};
    a.getRootNode = () => ({ host: b });
    b.getRootNode = () => ({ host: a });
    expect(sectionColumns(a)).toBe(12);
  });

  it('climbs plain parents too, where there is no shadow boundary', () => {
    const top = { _params: { sectionConfig: { column_span: 3 } }, getRootNode: () => ({ host: null }) };
    const mid = { parentElement: top, getRootNode: () => ({}) };
    const leaf = { parentElement: mid, getRootNode: () => ({}) };
    expect(sectionColumns(leaf)).toBe(36);
  });
});

describe('gridColumnsToPx across sections', () => {
  it('is unchanged for a section of the default width', () => {
    expect(Math.round(gridColumnsToPx(6))).toBe(236);
    expect(Math.round(gridColumnsToPx(12))).toBe(480);
    expect(Math.round(gridColumnsToPx('full'))).toBe(480);
  });

  it('keeps the column the same width in a wider section', () => {
    expect(Math.round(gridColumnsToPx(6, 24))).toBe(236);
    expect(Math.round(gridColumnsToPx(24, 24))).toBe(968);
  });

  it('lets a full-width card have the whole of a wide section', () => {
    expect(Math.round(gridColumnsToPx('full', 24))).toBe(968);
    expect(Math.round(gridColumnsToPx('full', 36))).toBe(1456);
  });

  it('still clamps to the columns the section has', () => {
    expect(gridColumnsToPx(99, 24)).toBe(gridColumnsToPx(24, 24));
    expect(gridColumnsToPx(0, 24)).toBe(gridColumnsToPx(1, 24));
  });

  it('treats a nonsense total as one section', () => {
    for (const total of [0, -1, NaN, undefined, null, 'wide']) {
      expect(gridColumnsToPx(99, /** @type {any} */ (total))).toBe(gridColumnsToPx(12));
    }
  });
});

describe('canvasFromGrid in a wide section', () => {
  const slot = { canvas: { w: 400, h: 200, elements: [] } };

  it('shapes a full-width card to the whole wide section', () => {
    // 12 columns are 480px wide and 4 rows 248 tall; 24 columns are 968.
    expect(canvasFromGrid({ grid_options: { columns: 'full', rows: 4 } }, slot))
      .toEqual({ w: 400, h: Math.round(248 * 400 / 480) });
    expect(canvasFromGrid({ grid_options: { columns: 'full', rows: 4 } }, slot, 400, 24))
      .toEqual({ w: 400, h: Math.round(248 * 400 / 968) });
  });

  it('leaves a card narrower than one section alone', () => {
    expect(canvasFromGrid({ grid_options: { columns: 6, rows: 4 } }, slot, 400, 24))
      .toEqual(canvasFromGrid({ grid_options: { columns: 6, rows: 4 } }, slot));
  });
});
