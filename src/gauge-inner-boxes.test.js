import { describe, it, expect } from 'vitest';
import { offsetsFromDrag, fontFromResize, estimateRect, clamp,
         OFFSET_LIMIT, FONT_MAX, FONT_MIN, GAUGE_CENTER } from './gauge-inner-boxes.js';

describe('offsetsFromDrag', () => {
  it('turns pixels into viewBox units at the measured scale', () => {
    // 4 screen pixels to a viewBox unit, gauge drawn at its full size
    expect(offsetsFromDrag({ x: 0, y: 0 }, 40, -20, 4, 1)).toEqual({ x: 10, y: -5 });
  });

  it('moves twice as far in numbers when the gauge is drawn half size', () => {
    expect(offsetsFromDrag({ x: 0, y: 0 }, 40, 0, 4, 0.5).x).toBe(20);
  });

  it('adds to where the drag began', () => {
    expect(offsetsFromDrag({ x: -3, y: 2 }, 4, 4, 4, 1)).toEqual({ x: -2, y: 3 });
  });

  it('rounds to the tenth the sliders step in', () => {
    expect(offsetsFromDrag({ x: 0, y: 0 }, 1, 0, 3, 1).x).toBe(0.3);
  });

  it('stops where the sliders stop', () => {
    expect(offsetsFromDrag({ x: 20, y: -20 }, 400, -400, 4, 1))
      .toEqual({ x: OFFSET_LIMIT, y: -OFFSET_LIMIT });
  });

  it('survives a scale or a measurement of zero', () => {
    expect(offsetsFromDrag({ x: 1, y: 1 }, 0, 0, 0, 0)).toEqual({ x: 1, y: 1 });
  });
});

describe('fontFromResize', () => {
  it('reads the frame\'s height as the size', () => {
    expect(fontFromResize(8, 8, 4, 1)).toBe(10);
  });

  it('is measured against the gauge\'s own scale', () => {
    expect(fontFromResize(8, 8, 4, 0.5)).toBe(12);
  });

  it('keeps a size the editor would accept', () => {
    expect(fontFromResize(19, 200, 4, 1)).toBe(FONT_MAX);
    expect(fontFromResize(1, -200, 4, 1)).toBe(FONT_MIN);
  });
});

describe('estimateRect', () => {
  it('centres the box on the offset from the gauge\'s centre', () => {
    const r = estimateRect({ x: 0, y: 0, size: 10, chars: 1 }, 1);
    expect(r.x + r.w / 2).toBeCloseTo(GAUGE_CENTER);
    expect(r.y + r.h / 2).toBeCloseTo(GAUGE_CENTER);
    expect(r.h).toBe(10);
  });

  it('grows with the text it stands for', () => {
    const one = estimateRect({ x: 0, y: 0, size: 10, chars: 1 }, 1);
    const five = estimateRect({ x: 0, y: 0, size: 10, chars: 5 }, 1);
    expect(five.w).toBeGreaterThan(one.w);
  });

  it('follows the offsets, scaled the way the gauge draws them', () => {
    const r = estimateRect({ x: 4, y: -4, size: 10, chars: 1 }, 0.5);
    expect(r.x + r.w / 2).toBeCloseTo(GAUGE_CENTER + 2);
    expect(r.y + r.h / 2).toBeCloseTo(GAUGE_CENTER - 2);
  });
});

describe('clamp', () => {
  it('holds a value between its ends', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});
