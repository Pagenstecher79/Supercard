import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CANVAS,
  getCellItems,
  rowHeights,
  cellWidths,
  migrateLayoutToCanvas,
  targetedCells,
  resolveCanvas,
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
    expect(elements[0]).toMatchObject({ x: 0, y: 0, w: 100, h: 50 });
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

describe('targetedCells', () => {
  it('collects cell targets out of all three pattern lists', () => {
    expect(targetedCells({
      color_patterns: [{ target: 'r0c0' }, { target: 'main' }],
      fx_glass_patterns: [{ target: 'r1c1' }],
      interactions: [{ target: 'elm_gauge_0' }, { target: 'r0c0' }],
    }).sort()).toEqual(['r0c0', 'r1c1']);
  });

  it('is quiet about a configuration with no patterns at all', () => {
    expect(targetedCells({})).toEqual([]);
    expect(targetedCells(undefined)).toEqual([]);
  });
});

describe('resolveCanvas', () => {
  it('uses a canvas that is already there, untouched', () => {
    const canvas = { w: 1, h: 2, elements: [] };
    expect(resolveCanvas({ canvas, layout_rows: [{ cells: [{ content: 'gauge_0' }] }] })).toBe(canvas);
  });

  it('migrates a layout_rows configuration on the way in', () => {
    const c = resolveCanvas({ layout_rows: [{ cells: [{ content: 'gauge_0' }] }] });
    expect(c).toMatchObject({ w: DEFAULT_CANVAS.w, h: DEFAULT_CANVAS.h });
    expect(c.elements.map(e => e.id)).toEqual(['gauge_0']);
  });

  it('makes surfaces for the cells the card actually targets', () => {
    const c = resolveCanvas({
      layout_rows: [{ cells: [{ content: 'gauge_0' }] }],
      color_patterns: [{ target: 'r0c0' }],
    });
    expect(c.elements.map(e => e.id)).toEqual(['surface_0', 'gauge_0']);
  });

  it('does not write the migration back into the config', () => {
    const slot = { layout_rows: [{ cells: [{ content: 'gauge_0' }] }] };
    resolveCanvas(slot);
    expect(slot.canvas).toBeUndefined();
  });

  it('migrates the same layout once', () => {
    const slot = { layout_rows: [{ cells: [{ content: 'gauge_0' }] }] };
    expect(resolveCanvas(slot)).toBe(resolveCanvas(slot));
  });

  it('has nothing to render without a layout', () => {
    expect(resolveCanvas({})).toBeNull();
    expect(resolveCanvas({ layout_rows: [] })).toBeNull();
  });
});
