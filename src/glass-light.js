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

/**
 * Whether a target is a circular bar, so relief is something it can have.
 *
 * Relief is an edge on the thing the ring is made of, and only a ring has
 * one: a straight bar is already a plate and a gauge is not ours. Which
 * orientation a bar has lives in its own config and not in the pattern's
 * target, so this needs the slot - the way the canvas model needs it to
 * answer for a bar's orientation.
 *
 * Segmented or not is deliberately not asked here. A continuous ring gets the
 * same relief through an SVG filter, because a stroke cannot wear a
 * box-shadow; that is a difference in how it is painted, not in whether it is
 * offered.
 *
 * @param {unknown} target a pattern's `target`
 * @param {any} [slot] the card's own config
 * @returns {boolean}
 */
export function isReliefTarget(target, slot) {
  if (typeof target !== 'string') return false;
  const bar = /^elm_progressbar_(\d+)$/.exec(target);
  if (!bar) return false;
  const conf = slot?.progressbars?.[Number(bar[1])];
  return typeof conf?.orientation === 'string' && conf.orientation.startsWith('circular');
}

/**
 * The glass pattern that puts relief on this bar, if there is one.
 *
 * The bar is asked for by its config object rather than by an index, because
 * a bar on a canvas is rendered without one - the renderer hands it the config
 * it found and nothing else. Identity in the slot's own array is the index,
 * and it is the same array the pattern's target counts against.
 *
 * @param {any} slot the card's own config
 * @param {any} config the bar's config
 * @returns {any|null} the pattern, or null when no enabled one asks for relief
 */
export function reliefPattern(slot, config) {
  const bars = Array.isArray(slot?.progressbars) ? slot.progressbars : [];
  const idx = bars.indexOf(config);
  if (idx < 0) return null;
  const list = Array.isArray(slot?.fx_glass_patterns) ? slot.fx_glass_patterns : [];
  const target = `elm_progressbar_${idx}`;
  return list.find(p => p && p.enabled && p.target === target && p.segment_relief) || null;
}

/**
 * One layer of a relief, as light rather than as CSS.
 *
 * @typedef {object} ReliefLayer
 * @property {boolean} inset whether the layer falls inside the shape
 * @property {number} dx
 * @property {number} dy
 * @property {number} blur
 * @property {number} spread only an inset layer uses one, and only to fill
 * @property {boolean} light white when true, black when false
 * @property {number} alpha
 */

/**
 * The light on a relief, layer by layer, before anything is drawn.
 *
 * Same light as the pattern's own edge, so a segment or a ring is lit from
 * where the sun is on the pad: a raised one carries the highlight on the side
 * facing the light and throws its shadow away from it, and an engraved one is
 * that picture turned inside out - the wall you look into is the dark one. The
 * last layer is what says which: a cast shadow reads as standing off the
 * surface, a lit lip as an opening in it.
 *
 * Depth is a length in the caller's unit, not a multiplier, because a segment
 * has no width worth scaling against - a pill is two percent of a ring. Only
 * the direction is taken from the light, never `shadow_distance`: that one is
 * a multiple of the bevel width, and a bevel is wider than a whole pill, so a
 * relief scaled by it lands its highlight beside the segment instead of on it.
 *
 * Two painters read these layers - `box-shadow` on a pill, an SVG filter on a
 * stroke - which is why they are numbers here and CSS nowhere.
 *
 * @param {ReturnType<lightParams>} light
 * @param {any} pat the pattern carrying the relief settings
 * @returns {ReliefLayer[]} empty when the relief has no depth
 */
export function reliefLayers(light, pat) {
  const depth = pat?.segment_relief_depth ?? 0.6;
  if (!(depth > 0)) return [];

  const { edgeLight, edgeShadow } = light;
  const rad = light.angle * Math.PI / 180;
  // Towards the sun, which is the opposite end of the line the shadow is on.
  const dx = -Math.cos(rad) * depth, dy = -Math.sin(rad) * depth;
  // A pill is a couple of percent of the ring wide, so a blur wider than the
  // offset stops reading as an edge and starts reading as a smudge.
  const blur = depth;

  if (pat?.segment_relief_mode === 'engraved') {
    return [
      { inset: true, dx, dy, blur, spread: 0, light: false, alpha: edgeShadow },
      { inset: true, dx: -dx, dy: -dy, blur, spread: 0, light: true, alpha: edgeLight },
      // A pill is one flat colour, so the walls alone leave it looking painted
      // on. The spread darkens what is between them, which is the floor of the
      // groove, and that is what makes it read as below the surface.
      { inset: true, dx: 0, dy: 0, blur, spread: depth * 0.5, light: false, alpha: edgeShadow * 0.5 },
      { inset: false, dx: dx * 0.5, dy: dy * 0.5, blur, spread: 0, light: true, alpha: edgeLight * 0.4 },
    ];
  }
  return [
    { inset: true, dx, dy, blur, spread: 0, light: true, alpha: edgeLight },
    { inset: true, dx: -dx, dy: -dy, blur, spread: 0, light: false, alpha: edgeShadow },
    { inset: false, dx: -dx, dy: -dy, blur: blur * 1.5, spread: 0, light: false, alpha: edgeShadow * 0.8 },
  ];
}

/**
 * The layers of a relief as a `box-shadow`, for a segment that is an element.
 *
 * @param {ReturnType<lightParams>} light
 * @param {any} pat the pattern carrying the relief settings
 * @param {UnitFn} u how to write a length
 * @returns {string} a `box-shadow` value
 */
export function reliefShadow(light, pat, u = px) {
  const layers = reliefLayers(light, pat);
  if (layers.length === 0) return 'none';
  return layers.map(l => [
    l.inset ? 'inset' : null,
    u(l.dx), u(l.dy), u(l.blur),
    l.spread ? u(l.spread) : null,
    l.light ? `rgba(255, 255, 255, ${l.alpha})` : `rgba(0, 0, 0, ${l.alpha})`,
  ].filter(v => v !== null).join(' ')).join(', ');
}
