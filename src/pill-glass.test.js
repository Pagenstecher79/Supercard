import { describe, it, expect } from 'vitest';
import { isLiquidEffect, lensScale, liquidPillCSS, liquidPadding, LENS_MAP_X, LENS_MAP_Y, LIQUID_EFFECTS } from './pill-glass.js';

describe('isLiquidEffect', () => {
  it('knows the two effects that carry a displacement map', () => {
    expect(LIQUID_EFFECTS.map(isLiquidEffect)).toEqual([true, true]);
  });

  it('is false for every other glass effect, and for nothing at all', () => {
    for (const e of ['none', 'glass_lens', 'glass_gooey', 'glass_clean', 'glass_clear', 'glass_dark'])
      expect(isLiquidEffect(e)).toBe(false);
    expect(isLiquidEffect(undefined)).toBe(false);
    expect(isLiquidEffect(null)).toBe(false);
    expect(isLiquidEffect(12)).toBe(false);
  });
});

describe('lensScale', () => {
  it('follows the font size the pill is built from', () => {
    expect(lensScale('10px', 'glass_liquid')).toBe(16);
    expect(lensScale('13px', 'glass_liquid')).toBe(21);
  });

  it('reads a bare number as pixels, the way the pill does', () => {
    expect(lensScale('10', 'glass_liquid')).toBe(lensScale('10px', 'glass_liquid'));
    expect(lensScale(10, 'glass_liquid')).toBe(lensScale('10px', 'glass_liquid'));
  });

  it('bends further for the thick variant', () => {
    expect(lensScale('13px', 'glass_liquid_heavy')).toBeGreaterThan(lensScale('13px', 'glass_liquid'));
  });

  it('never turns a tiny pill inside out, nor a huge one into a funhouse mirror', () => {
    expect(lensScale('2px', 'glass_liquid')).toBe(8);
    expect(lensScale('200px', 'glass_liquid')).toBe(30);
  });

  it('falls back to a middling scale when the size is not pixels', () => {
    for (const size of ['80%', '2cqmin', '1.2em', '', undefined, null])
      expect(lensScale(size, 'glass_liquid')).toBe(18);
  });
});

describe('liquidPillCSS', () => {
  it('references the filter it is given', () => {
    expect(liquidPillCSS('glass_liquid', 'sc-pill-lens')).toContain('url(#sc-pill-lens)');
  });

  it('leaves the backdrop alone when there is no filter, and still paints the glass', () => {
    const css = liquidPillCSS('glass_liquid', '');
    expect(css).not.toContain('backdrop-filter');
    expect(css).toContain('box-shadow');
    expect(css).toContain('background-image');
  });

  it('paints the colour fringe rather than refracting it', () => {
    // Two tinted rim shadows, cool on one side and warm on the other: the
    // three-pass version that would refract it costs 2.2x the frame time.
    const css = liquidPillCSS('glass_liquid', 'f');
    expect(css).toContain('rgba(120,200,255');
    expect(css).toContain('rgba(255,180,140');
  });

  it('gives the thick variant a deeper rim than the plain one', () => {
    const plain = liquidPillCSS('glass_liquid', 'f');
    const heavy = liquidPillCSS('glass_liquid_heavy', 'f');
    expect(heavy).not.toEqual(plain);
    expect(heavy.split('inset').length).toBeGreaterThan(plain.split('inset').length);
  });
});

describe('liquidPadding', () => {
  it('keeps the flat pill exactly as it was', () => {
    expect(liquidPadding('glass_lens')).toEqual({ padding: '0.3em 0.8em', clampEm: 0 });
    expect(liquidPadding('none')).toEqual({ padding: '0.3em 0.8em', clampEm: 0 });
  });

  it('widens the end-of-bar clamp by whatever it added to the padding', () => {
    for (const e of LIQUID_EFFECTS) expect(liquidPadding(e).clampEm).toBeGreaterThan(0);
    expect(liquidPadding('glass_liquid_heavy').clampEm)
      .toBeGreaterThan(liquidPadding('glass_liquid').clampEm);
  });
});

describe('the displacement maps', () => {
  it('keep to one channel each, so compositing them adds rather than mixes', () => {
    expect(decodeURIComponent(LENS_MAP_X)).toContain('rgb(255,0,0)');
    expect(decodeURIComponent(LENS_MAP_X)).not.toContain('rgb(0,255,0)');
    expect(decodeURIComponent(LENS_MAP_Y)).toContain('rgb(0,255,0)');
    expect(decodeURIComponent(LENS_MAP_Y)).not.toContain('rgb(255,0,0)');
  });

  it('are flat across the middle and steep only at the rim', () => {
    const x = decodeURIComponent(LENS_MAP_X);
    expect(x).toContain('offset="0.22" stop-color="rgb(128,0,0)"');
    expect(x).toContain('offset="0.78" stop-color="rgb(128,0,0)"');
  });

  it('escape the fragment marker, which would otherwise cut the data URI short', () => {
    expect(LENS_MAP_X).not.toContain('#');
    expect(LENS_MAP_X).toContain('%23r');
  });
});
