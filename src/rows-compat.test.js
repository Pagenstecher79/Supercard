import { describe, it, expect } from 'vitest';
import { needsRowsCompat, rowsAsCanvas } from './rows-compat.js';
import { migrateLayoutToCanvas, canvasFromBox } from './canvas-model.js';
import fixtures from './__fixtures__/real-layouts.json';

const rows = [
  { cells: [{ content: 'icon' }, { content: 'name' }] },
  { cells: [{ content: 'gauge_0' }] },
];

describe('needsRowsCompat', () => {
  it('says yes to a card that has rows and no canvas', () => {
    expect(needsRowsCompat({ layout_rows: rows })).toBe(true);
  });

  it('says no once a canvas has been written', () => {
    expect(needsRowsCompat({ layout_rows: rows, canvas: { w: 400, h: 200, elements: [] } })).toBe(false);
  });

  it('says no to a card that never had a layout', () => {
    expect(needsRowsCompat({})).toBe(false);
    expect(needsRowsCompat(undefined)).toBe(false);
  });

  it('says no to an empty rows list, which describes no layout at all', () => {
    expect(needsRowsCompat({ layout_rows: [] })).toBe(false);
  });
});

describe('rowsAsCanvas', () => {
  it('returns null before the card has been measured', () => {
    expect(rowsAsCanvas({ layout_rows: rows }, 0, 0)).toBe(null);
    expect(rowsAsCanvas({ layout_rows: rows }, 300, undefined)).toBe(null);
  });

  it('returns null when there is nothing to migrate', () => {
    expect(rowsAsCanvas({}, 300, 150)).toBe(null);
  });

  // Both sides are rounded to whole units - they are edited by hand - so the
  // ratio is only as exact as one unit in four hundred allows.
  it('takes its aspect ratio from the measured box, not from the config', () => {
    const { canvas } = rowsAsCanvas({ layout_rows: rows }, 600, 300);
    expect(canvas.w / canvas.h).toBeCloseTo(2, 2);
    const tall = rowsAsCanvas({ layout_rows: rows }, 200, 600).canvas;
    expect(tall.w / tall.h).toBeCloseTo(1 / 3, 2);
  });

  it('places the same elements the migration places', () => {
    const shape = canvasFromBox(600, 300);
    const direct = migrateLayoutToCanvas(rows, shape, { targetedCells: [], slot: { layout_rows: rows } });
    const { canvas } = rowsAsCanvas({ layout_rows: rows }, 600, 300);
    expect(canvas.elements).toEqual(direct.elements);
  });

  it('leaves layout_active alone, so rows that are switched off stay off', () => {
    const out = rowsAsCanvas({ layout_rows: rows, layout_active: false }, 600, 300);
    expect('layout_active' in out).toBe(false);
  });

  it('repoints a cell pattern onto the surface that replaced the cell', () => {
    const slot = {
      layout_rows: rows,
      color_patterns: [{ id: 1, target: 'r0c0', enabled: true }],
    };
    const out = rowsAsCanvas(slot, 600, 300);
    const moved = out.color_patterns[0].target;
    expect(moved).not.toBe('r0c0');
    // Whatever it now points at has to be something the canvas actually places.
    expect(out.canvas.elements.some(el => `elm_${el.id}` === moved || el.id === moved)).toBe(true);
  });

  it('survives every real dashboard layout on record', () => {
    for (const f of fixtures) {
      const out = rowsAsCanvas({ layout_rows: f.layout_rows }, 500, 250);
      // An empty rows list is not a layout; everything else must produce one.
      if (!f.layout_rows.length) { expect(out).toBe(null); continue; }
      expect(Array.isArray(out.canvas.elements)).toBe(true);
      for (const el of out.canvas.elements) {
        expect(Number.isFinite(el.x) && Number.isFinite(el.y)).toBe(true);
        expect(el.w).toBeGreaterThan(0);
        expect(el.h).toBeGreaterThan(0);
      }
    }
  });
});

describe('canvasFromBox', () => {
  it('scales the longer side to 400 and keeps the ratio', () => {
    expect(canvasFromBox(800, 400)).toEqual({ w: 400, h: 200 });
    expect(canvasFromBox(200, 800)).toEqual({ w: 100, h: 400 });
    expect(canvasFromBox(300, 300)).toEqual({ w: 400, h: 400 });
  });

  it('has no ratio to give for a box with no area', () => {
    expect(canvasFromBox(0, 100)).toBe(null);
    expect(canvasFromBox(100, 0)).toBe(null);
    expect(canvasFromBox(undefined, undefined)).toBe(null);
  });
});
