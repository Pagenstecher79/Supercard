/**
 * The light that falls on a glass pattern, as numbers.
 *
 * A glass edge is not drawn, it is lit: everything a bevel looks like follows
 * from where the light is, how far the glass stands off the surface, and how
 * steep its edge is. That arithmetic used to sit in the middle of the module
 * that paints a card, which is also the only place it could be read - and the
 * editor's light-source pad now has to draw the same light on a sample, so
 * the same numbers have to come out in both places or the preview lies.
 *
 * Pure, so it is testable and so a second caller is free.
 */

/**
 * A length in the unit the caller paints in.
 *
 * The card scales its glass with the container (`1cqmin`) or paints plain
 * pixels; the editor's preview is always pixels. Neither is this file's
 * business - it hands out numbers and the caller says what they mean.
 *
 * @callback UnitFn
 * @param {number} value
 * @returns {string}
 */

/** Plain pixels, the unit for anything not scaling with a card. */
export const px = (value) => (value === 0 ? '0px' : `${value}px`);

/**
 * Every number the light of one pattern is made of, defaults resolved.
 *
 * `shadow_distance` is a multiple of the bevel width rather than a length:
 * moving the sun further out has to mean more offset on a thick edge than on
 * a thin one, or the same angle reads differently on every pattern.
 *
 * `bevel_size` is the name `bevel_width` used to have, and saved cards still
 * carry it.
 *
 * @param {any} pat a glass pattern
 */
export function lightParams(pat) {
  const style = pat?.shadow_style || 'frosted';
  const bevelWidth = pat?.bevel_width ?? pat?.bevel_size ?? 2;
  const glassThickness = pat?.glass_thickness ?? 5;
  const brightness = pat?.light_brightness ?? 0.4;
  const angle = pat?.shadow_angle ?? 90;
  const distance = pat?.shadow_distance ?? 1;

  const rad = angle * Math.PI / 180;
  const shadowX = distance * Math.cos(rad);
  const shadowY = distance * Math.sin(rad);

  // A thick glass on a narrow edge is a steep one, and a steep edge catches
  // more light and throws a harder shadow. Division by the bevel width is why
  // a width of 0 falls back to 1 rather than to infinity.
  const steepness = glassThickness / (bevelWidth > 0 ? bevelWidth : 1);

  return {
    style, bevelWidth, glassThickness, brightness, angle, distance,
    shadowX, shadowY,
    // The sun and the shadow are the same line, read from opposite ends.
    lightX: -shadowX, lightY: -shadowY,
    edgeLight: Math.min(1, brightness * (1 + steepness * 0.4)),
    edgeShadow: Math.min(1, (brightness * 0.5) * (1 + steepness * 0.4)),
  };
}

/**
 * The inset shadows that are the lit edge, or `none` for a flat pattern.
 *
 * Inset rather than a border: a real border and a blur are the Chrome bug
 * this code was written around, and an inset shadow also lets the light and
 * the shadow sit on opposite edges of one box.
 *
 * @param {ReturnType<lightParams>} light
 * @param {UnitFn} u how to write a length
 * @returns {string} a `box-shadow` value
 */
export function bevelShadow(light, u = px) {
  const { style, bevelWidth: b, lightX, lightY, shadowX, shadowY,
          edgeLight, edgeShadow } = light;

  if (style === 'frosted') {
    // Half a pixel in from the edge, so the highlight reads as a lit rim
    // rather than as a second border drawn on top of the first.
    const s1 = b - 0.5 < 0 ? 0 : b - 0.5;
    return [
      `inset ${u(lightX * s1)} ${u(lightY * s1)} ${u(b)} 0px rgba(255, 255, 255, ${edgeLight})`,
      `inset ${u(shadowX * b)} ${u(shadowY * b)} ${u(b + 1)} 0px rgba(0, 0, 0, ${edgeShadow * 0.5})`,
      `inset 0 0 0 ${u(b)} rgba(255, 255, 255, 0.05)`,
    ].join(', ');
  }
  if (style === 'liquid') {
    // Two pairs: a wide, soft one for the body of the edge and a tight one a
    // pixel further in for the hard line where the glass actually ends.
    return [
      `inset ${u(lightX * b)} ${u(lightY * b)} ${u(b)} rgba(255,255,255,${edgeLight * 0.6})`,
      `inset ${u(shadowX * b)} ${u(shadowY * b)} ${u(b)} rgba(0,0,0,${edgeShadow * 0.4})`,
      `inset ${u(lightX * (b + 1))} ${u(lightY * (b + 1))} ${u(1)} rgba(255,255,255,${edgeLight})`,
      `inset ${u(shadowX * (b + 1))} ${u(shadowY * (b + 1))} ${u(1)} rgba(0,0,0,${edgeShadow})`,
    ].join(', ');
  }
  return 'none';
}

/**
 * Whether the glass on this target is a circle rather than a rounded box.
 *
 * The card decides an element's glass radius in the renderer, and the editor's
 * light pad draws a sample in the same shape - two places that have to agree
 * about the same three words, so they ask here instead of each spelling out
 * which targets are round.
 *
 * A gauge is a disc and its glass is a `50%` square; the card's icon is drawn
 * in a circle for the same reason. Everything else - bars, labels, cells,
 * surfaces, the card itself - is a box with corners, whether or not those
 * corners are rounded.
 *
 * @param {unknown} target a pattern's `target`
 * @returns {boolean}
 */
export function isRoundTarget(target) {
  if (typeof target !== 'string') return false;
  return target.startsWith('elm_gauge_') || target === 'elm_icon';
}
