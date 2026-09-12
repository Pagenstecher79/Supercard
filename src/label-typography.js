/**
 * How big the text and the icon of a label are drawn.
 *
 * A label on the canvas is a box somebody dragged to a size, and the text in
 * it has two ways to answer that: keep the size it was given and shrink only
 * when the box is too small for it, or take the box as the instruction and
 * fill it. The first is what a label has always done; the second is what a
 * box drawn large is usually asking for.
 *
 * Both answers are the same `min()` of three terms - the size asked for, the
 * height of the box, and the width the characters have to share - with the
 * first term simply absent when the box is in charge. That is the whole
 * difference, and it is why this is one function rather than two.
 *
 * Pure, so both the card and its editor can ask.
 */

/** The share of the box's height one line of a stacked label may take. */
const STACKED = 92;

/**
 * The `font-size` of one line of a label.
 *
 * @param {object} opts
 * @param {number} opts.chars how many characters the line has to fit
 * @param {number} [opts.factor] how wide a character is, as a share of the
 *   size - narrow digits need less than the 0.55 an average glyph does
 * @param {string|null} [opts.base] the size asked for, or null to fit the box
 * @param {number} [opts.lines] how many lines share the box's height
 * @returns {string} a CSS `font-size` value
 */
export function labelFontSize({ chars, factor = 0.55, base = null, lines = 1 }) {
  const width = `calc(100cqi / (${Math.max(1, chars)} * ${factor}))`;
  const height = lines > 1 ? `${Math.round(STACKED / lines)}cqh` : '100cqh';
  return base ? `min(${base}, ${height}, ${width})` : `min(${height}, ${width})`;
}

/**
 * The `--mdc-icon-size` of a label's icon.
 *
 * An icon is square, so the box's shorter side is what it has to fit - and it
 * follows the text when there is text, because an icon beside a word that is
 * twice its height reads as two elements rather than one label.
 *
 * @param {object} opts
 * @param {string|null} [opts.base] the size asked for, or null to fit the box
 * @param {number} [opts.lines] how many lines share the box's height
 * @returns {string} a CSS length
 */
export function labelIconSize({ base = null, lines = 1 }) {
  if (base) return base;
  const height = lines > 1 ? `${Math.round(STACKED / lines)}cqh` : '100cqh';
  return `min(${height}, 100cqi)`;
}
