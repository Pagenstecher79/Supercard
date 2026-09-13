import { describe, it, expect } from 'vitest';
import { lensMap, lensScaleFraction, lensFilterMarkup, lensGeometry, applyLensGeometry } from './glass-lens.js';

const decoded = (shape, axis) => decodeURIComponent(lensMap(shape, axis));

describe('lensScaleFraction', () => {
  it('is nothing at all for a pattern that does not refract', () => {
    for (const v of [0, '0', undefined, null, '', -5, NaN]) expect(lensScaleFraction(v)).toBe(0);
  });

  it('reads the slider as a share of the pane, not as pixels', () => {
    expect(lensScaleFraction(100)).toBe(0.12);
    expect(lensScaleFraction(50)).toBe(0.06);
    expect(lensScaleFraction('40')).toBe(0.05);
  });

  it('does not let a pane past a lens and into a fisheye', () => {
    expect(lensScaleFraction(500)).toBe(0.12);
  });
});

describe('the maps', () => {
  it('keep one channel each, so compositing adds instead of mixing', () => {
    for (const shape of ['box', 'disc']) {
      expect(decoded(shape, 'x')).toContain('rgb(255,0,0)');
      expect(decoded(shape, 'x')).not.toContain('rgb(0,255,0)');
      expect(decoded(shape, 'y')).toContain('rgb(0,255,0)');
      expect(decoded(shape, 'y')).not.toContain('rgb(255,0,0)');
    }
  });

  it('leave the middle of a box flat, so what is under the pane stays put', () => {
    expect(decoded('box', 'x')).toContain('offset="0.22" stop-color="rgb(128,0,0)"');
    expect(decoded('box', 'x')).toContain('offset="0.78" stop-color="rgb(128,0,0)"');
    expect(decoded('box', 'y')).toContain('offset="0.28" stop-color="rgb(0,128,0)"');
  });

  it('bend a disc only in its outer ring', () => {
    const x = decoded('disc', 'x');
    expect(x).toContain('radialGradient');
    expect(x).toContain('offset="0.55" stop-color="black"');
    expect(x).toContain('mask="url(#ring)"');
  });

  it('lay the disc ramp over a neutral rectangle, or the masked-out pixels shift', () => {
    // A masked-out pixel is transparent, and transparent reads as 0 - half
    // the scale in one direction, which would slide the whole dial sideways.
    const x = decoded('disc', 'x');
    expect(x.indexOf('fill="rgb(128,0,0)"')).toBeLessThan(x.indexOf('mask="url(#ring)"'));
  });

  it('escape the fragment marker that would cut a data URI short', () => {
    for (const shape of ['box', 'disc']) {
      expect(lensMap(shape, 'x')).not.toContain('#');
      expect(lensMap(shape, 'y')).not.toContain('#');
    }
  });

  it('differ by shape', () => {
    expect(lensMap('box', 'x')).not.toEqual(lensMap('disc', 'x'));
  });
});

describe('lensFilterMarkup', () => {
  it('is empty when there is nothing to bend', () => {
    expect(lensFilterMarkup('id', 'box', 0, 'ha-card')).toBe('');
  });

  it('leaves the shift at zero until a pane has been measured', () => {
    const f = lensFilterMarkup('sc-glass-lens-7', 'box', 0.06, 'ha-card');
    expect(f).toContain('scale="0"');
    expect(f).toContain('data-sc-lens="0.06"');
    expect(f).toContain('data-sc-lens-for="ha-card"');
    expect(f).toContain('id="sc-glass-lens-7"');
  });

  it('does not resolve the shift against the box diagonal', () => {
    // `objectBoundingBox` would, and a 492x69 bar and a 54px gauge would then
    // mean five different things by the same slider.
    expect(lensFilterMarkup('id', 'box', 0.06, 'ha-card')).not.toContain('objectBoundingBox');
  });

  it('pins both maps to the pane, or the ramp stretches over the whole region', () => {
    const f = lensFilterMarkup('id', 'box', 0.1, 'ha-card');
    expect(f.match(/<feImage[^>]*>/g).length).toBe(2);
  });

  it('escapes a selector that would break out of the attribute', () => {
    expect(lensFilterMarkup('id', 'box', 0.1, 'sc-x[part~="a"]')).toContain('&quot;a&quot;');
  });

  it('reaches outside the pane, because a bent pixel comes from there', () => {
    const f = lensFilterMarkup('id', 'disc', 0.1, 'ha-card');
    expect(f).toContain('x="-35%"');
    expect(f).toContain('width="170%"');
  });

  it('adds the two axes rather than blending them', () => {
    expect(lensFilterMarkup('id', 'box', 0.1, 'ha-card')).toContain('operator="arithmetic" k2="1" k3="1"');
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
