/**
 * The gauge's zero point, in the two units it has.
 *
 * The renderer draws in SVG angles: zero is three o'clock and the number grows
 * clockwise, which puts the top - where a dial starts - at -90. Nobody thinks
 * of a dial that way, so the editor works in degrees clockwise from the top and
 * this is the one place the two units meet.
 *
 * What is stored stays the renderer's unit. Cards in the wild already carry it,
 * and the four positions the editor used to offer were written in it; changing
 * the meaning of the key would silently rotate every gauge that has one.
 */

/** Degrees from three o'clock to the top, the offset between the two units. */
const TOP = 90;

/** `((n % 360) + 360) % 360`, because `%` keeps the sign of the dividend. */
function wrap(n) {
  return ((n % 360) + 360) % 360;
}

/**
 * What the slider shows: 0 to 359, clockwise from the top.
 *
 * Anything unreadable - unset, empty, a string that is not a number - is the
 * top, which is what the renderer falls back to as well, so a gauge nobody has
 * configured shows 0 rather than an empty slider. Fractions are rounded: the
 * slider steps in whole degrees, and a tenth of one is below what a dial shows.
 *
 * @param {any} stored the value of `gauge_start_angle`
 * @returns {number} 0-359
 */
export function dialFromStartAngle(stored) {
  const n = Number.parseFloat(stored);
  if (!Number.isFinite(n)) return 0;
  return wrap(Math.round(n) + TOP);
}

/**
 * What the renderer draws with, from what the slider shows.
 *
 * The range is -90 to 269 rather than 0 to 359, so that the top - the value
 * a gauge has unless someone moves it - stays the -90 it has always been
 * rather than becoming an equivalent 270 the moment the slider is touched.
 *
 * @param {any} dial 0-359, clockwise from the top
 * @returns {number} the angle for `gauge_start_angle`
 */
export function startAngleFromDial(dial) {
  const n = Number.parseFloat(dial);
  return (Number.isFinite(n) ? wrap(Math.round(n)) : 0) - TOP;
}
