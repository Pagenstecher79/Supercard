import { describe, it, expect } from 'vitest';
import { lensField, lensScaleFraction, lensFilterMarkup, lensGeometry, applyLensGeometry } from './glass-lens.js';

/** The map is square; this reads one pixel out of it. */
const at = (field, size, i, j) => {
  const k = (i + j * size) * 4;
  return { r: field[k], g: field[k + 1], b: field[k + 2], a: field[k + 3] };
};

describe('lensField', () => {
  const SIZE = 64;

  it('leaves the middle of a pane alone, so what is under it stays readable', () => {
    const f = lensField('dome', SIZE);
    const mid = at(f, SIZE, SIZE / 2, SIZE / 2);
    expect(Math.abs(mid.r - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(mid.g - 128)).toBeLessThanOrEqual(1);
  });

  it('points the shift inward, which is what magnifies', () => {
    // A pixel near the left rim has to fetch its backdrop from further right.
    const f = lensField('dome', SIZE);
    expect(at(f, SIZE, 0, SIZE / 2).r).toBeGreaterThan(200);
    expect(at(f, SIZE, SIZE - 1, SIZE / 2).r).toBeLessThan(56);
    expect(at(f, SIZE, SIZE / 2, 0).g).toBeGreaterThan(200);
    expect(at(f, SIZE, SIZE / 2, SIZE - 1).g).toBeLessThan(56);
  });

  it('rises late, the way a thick rim does', () => {
    // Half way out, a sixth power is still almost nothing.
    const f = lensField('dome', SIZE);
    const quarter = at(f, SIZE, SIZE / 4, SIZE / 2);
    expect(Math.abs(quarter.r - 128)).toBeLessThan(6);
  });

  it('keeps a disc flat inside its ring and bends it outside', () => {
    const f = lensField('disc', SIZE);
    expect(Math.abs(at(f, SIZE, SIZE / 2 + 4, SIZE / 2).r - 128)).toBeLessThanOrEqual(1);
    expect(at(f, SIZE, 1, SIZE / 2).r).toBeGreaterThan(180);
  });

  it('samples pixel centres, so the rim itself is in the map', () => {
    // Sampling corners instead would leave the strongest half-pixel unmapped.
    const f = lensField('dome', 2);
    expect(at(f, 2, 0, 0).r).toBeGreaterThan(128);
    expect(at(f, 2, 1, 1).r).toBeLessThan(128);
  });

  it('is opaque, and leaves blue out of it', () => {
    const f = lensField('dome', 8);
    for (let k = 0; k < 8 * 8; k++) {
      expect(f[k * 4 + 2]).toBe(0);
      expect(f[k * 4 + 3]).toBe(255);
    }
  });

  it('fills exactly the buffer it promises', () => {
    expect(lensField('dome', 16).length).toBe(16 * 16 * 4);
    expect(lensField('disc', 16).length).toBe(16 * 16 * 4);
  });

  it('falls back to the pane profile rather than throwing on a name it does not know', () => {
    expect(Array.from(lensField('nonsense', 8))).toEqual(Array.from(lensField('dome', 8)));
  });

  it('differs by profile', () => {
    expect(Array.from(lensField('dome', 16))).not.toEqual(Array.from(lensField('disc', 16)));
  });
});

describe('lensFilterMarkup', () => {
  it('is empty when there is nothing to bend', () => {
    expect(lensFilterMarkup('id', 'dome', 0, 'ha-card')).toBe('');
  });

  it('names a pseudo-element only where the pane is one', () => {
    // The filter itself cannot tell; whoever draws the pane can.
    expect(lensFilterMarkup('id', 'dome', 0.06, '.pill', '')).not.toContain('data-sc-lens-pseudo');
  });

  it('is empty where there is no canvas to draw the map on', () => {
    // Node has none. A filter referencing a map that failed to draw would
    // leave `backdrop-filter: url(#...)` pointing at nothing.
    expect(lensFilterMarkup('id', 'dome', 0.06, 'ha-card')).toBe('');
  });
});

describe('lensGeometry', () => {
  it('takes the share off the short side, so aspect ratio does not change the look', () => {
    expect(lensGeometry(0.12, 492, 69)).toEqual({ width: 492, height: 69, scale: 8.28 });
    expect(lensGeometry(0.12, 54, 54)).toEqual({ width: 54, height: 54, scale: 6.48 });
  });

  it('refuses a pane that has not been laid out', () => {
    for (const [w, h] of [[0, 10], [10, 0], [NaN, 10], [undefined, 10]]) {
      expect(lensGeometry(0.1, w, h)).toBeNull();
    }
  });

  it('pins the maps of a pill that declares its own shift, and leaves it declared', () => {
    expect(lensGeometry(0, 100, 20)).toEqual({ width: 100, height: 20, scale: null });
  });
});

describe('applyLensGeometry', () => {
  const fakeRoot = (selector, w, h) => {
    const img = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
    const images = [img(), img()];
    const disp = { attrs: { scale: '0' }, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } };
    const filter = {
      getAttribute: (k) => ({ 'data-sc-lens': '0.12', 'data-sc-lens-for': selector, 'data-sc-lens-pseudo': '::after' }[k] ?? null),
      querySelectorAll: () => images,
      querySelector: () => disp,
    };
    const host = {};
    return {
      images, disp, host,
      querySelectorAll: (sel) => (sel === 'filter[data-sc-lens-for]' ? [filter] : []),
      querySelector: (sel) => (sel === selector ? host : null),
    };
  };

  it('writes the measured pane onto the maps and the shift', () => {
    const root = fakeRoot('ha-card', 200, 80);
    applyLensGeometry(root, () => ({ width: '200px', height: '80px' }));
    expect(root.images[0].attrs).toEqual({ x: '0', y: '0', width: '200', height: '80' });
    expect(root.disp.attrs.scale).toBe('9.6');
  });

  it('measures the pane, not the element it sits on', () => {
    const root = fakeRoot('ha-card', 0, 0);
    const seen = [];
    applyLensGeometry(root, (el, pseudo) => { seen.push(pseudo); return { width: '10px', height: '10px' }; });
    expect(seen).toEqual(['::after']);
  });

  it('leaves a pane alone that has no box yet', () => {
    const root = fakeRoot('ha-card', 0, 0);
    applyLensGeometry(root, () => ({ width: 'auto', height: 'auto' }));
    expect(root.disp.attrs.scale).toBe('0');
  });

  it('survives a root with nothing in it', () => {
    expect(() => applyLensGeometry(null)).not.toThrow();
    expect(() => applyLensGeometry({})).not.toThrow();
  });
});
