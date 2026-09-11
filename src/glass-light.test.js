import { describe, it, expect } from 'vitest';
import { lightParams, bevelShadow, px, isRoundTarget } from './glass-light.js';

/**
 * The formula exactly as it stood inside fx-glass before it moved here.
 *
 * Kept verbatim rather than rewritten: the point of this test is that the
 * move changed nothing, and a reference tidied up on the way over would only
 * prove that two tidied versions agree.
 */
function before(pat, u) {
  const shadowStyle = pat.shadow_style || 'frosted';
  const bWidth = pat.bevel_width ?? pat.bevel_size ?? 2;
  const gThick = pat.glass_thickness ?? 5;
  const lBright = pat.light_brightness ?? 0.4;
  const sAngle = pat.shadow_angle ?? 90;
  const sDist = pat.shadow_distance ?? 1;
  const sRad = sAngle * Math.PI / 180;
  const shadowX = sDist * Math.cos(sRad);
  const shadowY = sDist * Math.sin(sRad);
  const lightX = -shadowX;
  const lightY = -shadowY;
  const steepness = gThick / (bWidth > 0 ? bWidth : 1);
  const edgeLight = Math.min(1, lBright * (1 + steepness * 0.4));
  const edgeShadow = Math.min(1, (lBright * 0.5) * (1 + steepness * 0.4));

  let mainShadow = 'none';
  if (shadowStyle === 'frosted') {
    const s1 = bWidth - 0.5 < 0 ? 0 : bWidth - 0.5;
    mainShadow = `
      inset ${u(lightX * s1)} ${u(lightY * s1)} ${u(bWidth)} 0px rgba(255, 255, 255, ${edgeLight}),
      inset ${u(shadowX * bWidth)} ${u(shadowY * bWidth)} ${u(bWidth + 1)} 0px rgba(0, 0, 0, ${edgeShadow * 0.5}),
      inset 0 0 0 ${u(bWidth)} rgba(255, 255, 255, 0.05)
    `;
  } else if (shadowStyle === 'liquid') {
    mainShadow = `
      inset ${u(lightX * bWidth)} ${u(lightY * bWidth)} ${u(bWidth)} rgba(255,255,255,${edgeLight * 0.6}),
      inset ${u(shadowX * bWidth)} ${u(shadowY * bWidth)} ${u(bWidth)} rgba(0,0,0,${edgeShadow * 0.4}),
      inset ${u(lightX * (bWidth + 1))} ${u(lightY * (bWidth + 1))} ${u(1)} rgba(255,255,255,${edgeLight}),
      inset ${u(shadowX * (bWidth + 1))} ${u(shadowY * (bWidth + 1))} ${u(1)} rgba(0,0,0,${edgeShadow})
    `;
  }
  return mainShadow;
}

/** Only the whitespace differs by design, and CSS cannot tell. */
const flat = s => s.trim().replace(/\s+/g, ' ');

// Every value a slider can reach at its ends, plus the ones that used to be
// special: a bevel of 0 (the division), a distance of 0 (the dead centre of
// the pad) and an angle past 180 (the sun on the other side).
const STYLES = ['none', 'frosted', 'liquid', undefined];
const NUMBERS = [0, 0.1, 1, 2, 5.5, 30];
const ANGLES = [0, 45, 90, 179, 180, 271, 360];

describe('bevelShadow', () => {
  it('says exactly what the card said before the formula moved out of it', () => {
    for (const shadow_style of STYLES) {
      for (const bevel_width of NUMBERS) {
        for (const glass_thickness of NUMBERS) {
          for (const shadow_angle of ANGLES) {
            for (const light_brightness of [0, 0.4, 1]) {
              for (const shadow_distance of [0, 1, 5]) {
                const pat = { shadow_style, bevel_width, glass_thickness,
                              shadow_angle, light_brightness, shadow_distance };
                expect(flat(bevelShadow(lightParams(pat), px)))
                  .toBe(flat(before(pat, px)));
              }
            }
          }
        }
      }
    }
  });

  it('reads the old name a saved card still carries', () => {
    expect(lightParams({ bevel_size: 7 }).bevelWidth).toBe(7);
    expect(lightParams({ bevel_size: 7, bevel_width: 3 }).bevelWidth).toBe(3);
  });

  it('falls back to the card defaults for an empty pattern', () => {
    expect(flat(bevelShadow(lightParams({}), px)))
      .toBe(flat(before({}, px)));
  });

  it('paints nothing for a flat pattern', () => {
    expect(bevelShadow(lightParams({ shadow_style: 'none' }), px)).toBe('none');
  });

  it('keeps the unit the caller paints in', () => {
    const cq = v => (v === 0 ? '0px' : `calc(${v} * 1cqmin)`);
    expect(bevelShadow(lightParams({ bevel_width: 4 }), cq)).toContain('1cqmin');
  });

  it('puts the light opposite the shadow', () => {
    const l = lightParams({ shadow_angle: 90, shadow_distance: 2 });
    expect(l.lightX).toBeCloseTo(-l.shadowX);
    expect(l.lightY).toBeCloseTo(-l.shadowY);
  });

  it('does not divide by a bevel of zero', () => {
    const l = lightParams({ bevel_width: 0, glass_thickness: 5 });
    expect(Number.isFinite(l.edgeLight)).toBe(true);
    expect(l.edgeLight).toBeLessThanOrEqual(1);
  });
});

describe('isRoundTarget', () => {
  it('calls a gauge and the card icon round', () => {
    expect(isRoundTarget('elm_gauge_0')).toBe(true);
    expect(isRoundTarget('elm_gauge_12')).toBe(true);
    expect(isRoundTarget('elm_icon')).toBe(true);
  });

  it('calls everything the card draws with corners square', () => {
    for (const t of ['elm_progressbar_0', 'elm_label_3', 'elm_name', 'elm_state',
                     'elm_surface_0', 'main', 'r1c2', 'none']) {
      expect(isRoundTarget(t), t).toBe(false);
    }
  });

  // A pattern with no target at all reaches the pad while a new one is being
  // set up, and a missing target is a box, not a crash.
  it('survives a target that is not a string', () => {
    for (const t of [undefined, null, 0, '', {}, ['elm_gauge_0']]) {
      expect(isRoundTarget(/** @type {any} */ (t))).toBe(false);
    }
  });

  // `elm_gauge_` is a prefix, not a word: a target that merely starts with
  // the letters of another one must not borrow its shape.
  it('does not round a target that only looks like one', () => {
    expect(isRoundTarget('elm_gauges')).toBe(false);
    expect(isRoundTarget('elm_icon_ring')).toBe(false);
    expect(isRoundTarget('gauge_0')).toBe(false);
  });
});
