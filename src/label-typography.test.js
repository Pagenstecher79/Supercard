import { describe, it, expect } from 'vitest';
import { labelFontSize, labelIconSize, DENSITY, FIT_DENSITY } from './label-typography.js';

describe('labelFontSize', () => {
  it('is the size asked for, until the box is too small for it', () => {
    expect(labelFontSize({ chars: 5, factor: 0.55, base: 'var(--sc-fs-n, inherit)' }))
      .toBe('min(var(--sc-fs-n, inherit), 100cqh, calc(100cqi / (5 * 0.55)))');
  });

  it('is the box itself when no size is asked for', () => {
    expect(labelFontSize({ chars: 5, factor: 0.55 }))
      .toBe('min(100cqh, calc(100cqi / (5 * 0.55)))');
  });

  it('leaves room for the other line when two share the box', () => {
    expect(labelFontSize({ chars: 4, lines: 2 })).toBe('min(46cqh, calc(100cqi / (4 * 0.55)))');
  });

  it('never divides by a line with nothing on it', () => {
    expect(labelFontSize({ chars: 0 })).toContain('(1 * 0.55)');
    expect(labelFontSize({ chars: -3 })).toContain('(1 * 0.55)');
  });

  it('leaves an icon on the line its own width and gap', () => {
    expect(labelFontSize({ chars: 10, factor: 0.5, iconGap: 6 }))
      .toBe('min(100cqh, calc((100cqi - 6px) / (10 * 0.5 + 1)))');
  });

  it('takes the density it is given', () => {
    expect(labelFontSize({ chars: 6, factor: 0.3 })).toContain('(6 * 0.3)');
  });
});

describe('the two densities', () => {
  it('are what the two jobs need: a ceiling may be optimistic, a size may not', () => {
    expect(DENSITY).toBe(0.55);
    expect(FIT_DENSITY).toBeGreaterThan(DENSITY);
  });

  it('is the capping one that a caller gets by default', () => {
    expect(labelFontSize({ chars: 4 })).toContain(`(4 * ${DENSITY})`);
  });
});

describe('labelIconSize', () => {
  it('is the size asked for when there is one', () => {
    expect(labelIconSize({ base: 'var(--sc-fs-n, 20px)' })).toBe('var(--sc-fs-n, 20px)');
  });

  it('fits the shorter side of the box otherwise', () => {
    expect(labelIconSize({})).toBe('min(100cqh, 100cqi)');
  });

  it('shares the height with a second line, as the text does', () => {
    expect(labelIconSize({ lines: 2 })).toBe('min(46cqh, 100cqi)');
  });
});
