/**
 * The displacement maps that make glass bend what is behind it.
 *
 * `backdrop-filter: blur()` softens a backdrop; it does not bend one, and
 * bending is what separates glass from frosted plastic. An SVG
 * `feDisplacementMap` bends it: the filter reads a shift out of two channels
 * of an image, 128 meaning "leave this pixel where it is" and 0 and 255 the
 * extremes either way.
 *
 * One image per axis, because a single gradient cannot carry two independent
 * ramps. Each keeps to its own channel and leaves the other at zero, so an
 * `feComposite` in arithmetic mode adds them back into one map rather than
 * mixing them.
 *
 * Two shapes, because the card has two:
 *
 * - `box` ramps from edge to edge and is flat across the middle. A ramp over
 *   the whole surface magnifies everything behind it, the value and the
 *   labels included; flat in the middle, the content stays readable and only
 *   the rim bends, which is where a lens actually bends light.
 * - `disc` pushes outward from the centre and is masked to the outer ring, so
 *   a gauge's dial reads straight while its edge curls like a watch glass.
 *
 * Pure: every export is a string or a number derived from its arguments.
 */

/** Where the flat middle of a box map starts and ends, per axis. */
const BOX_FLAT = { x: [0.22, 0.78], y: [0.28, 0.72] };

/** Where a disc map starts bending, as a share of the radius. */
const DISC_RING_FROM = 0.55;

const CHANNELS = {
  x: { from: 'rgb(255,0,0)', neutral: 'rgb(128,0,0)', to: 'rgb(0,0,0)', axis: 'x1="0" x2="1"' },
  y: { from: 'rgb(0,255,0)', neutral: 'rgb(0,128,0)', to: 'rgb(0,0,0)', axis: 'x1="0" y1="0" x2="0" y2="1"' },
};

const asDataUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

function boxMap(axis) {
  const c = CHANNELS[axis];
  const [flatFrom, flatTo] = BOX_FLAT[axis];
  return asDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
    + '<defs><linearGradient id="r" ' + c.axis + '>'
    + '<stop offset="0" stop-color="' + c.from + '"/>'
    + '<stop offset="' + flatFrom + '" stop-color="' + c.neutral + '"/>'
    + '<stop offset="' + flatTo + '" stop-color="' + c.neutral + '"/>'
    + '<stop offset="1" stop-color="' + c.to + '"/>'
    + '</linearGradient></defs>'
    + '<rect width="100" height="100" fill="url(#r)"/></svg>');
}

function discMap(axis) {
  const c = CHANNELS[axis];
  // The ramp runs the full width and a radial mask keeps it to the ring, so
  // the shift points away from the centre everywhere on that ring. Masked-out
  // pixels have to fall back to the neutral rectangle underneath rather than
  // to transparency: a transparent pixel reads as zero, which is a shift of
  // half the scale in one direction - the whole dial sliding sideways.
  return asDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
    + '<defs><linearGradient id="r" ' + c.axis + '>'
    + '<stop offset="0" stop-color="' + c.from + '"/>'
    + '<stop offset="1" stop-color="' + c.to + '"/>'
    + '</linearGradient>'
    + '<radialGradient id="m">'
    + '<stop offset="' + DISC_RING_FROM + '" stop-color="black"/>'
    + '<stop offset="1" stop-color="white"/>'
    + '</radialGradient>'
    + '<mask id="ring"><rect width="100" height="100" fill="url(#m)"/></mask></defs>'
    + '<rect width="100" height="100" fill="' + c.neutral + '"/>'
    + '<rect width="100" height="100" fill="url(#r)" mask="url(#ring)"/></svg>');
}

/**
 * The map for one axis of one shape.
 *
 * @param {'box' | 'disc'} shape
 * @param {'x' | 'y'} axis
 * @returns {string} a data URI for `feImage`
 */
export function lensMap(shape, axis) {
  return shape === 'disc' ? discMap(axis) : boxMap(axis);
}

/**
 * How far a pane bends its backdrop, as a share of its own short side.
 *
 * A pane's size is a layout result - a gauge is drawn in `cqmin`, a surface
 * gets whatever the dashboard gives it - so a displacement in pixels is a
 * different effect on every card, and the slider has to mean a *share* of the
 * pane instead. `primitiveUnits="objectBoundingBox"` would express that
 * without measuring anything, but it resolves a scalar against the box's
 * diagonal: on a 492x69 bar that is five times what the same slider does to a
 * 54px gauge, which is not one effect. The share is taken against the short
 * side instead, and `lensGeometry` turns it into pixels once the pane has
 * been measured. (The indicator pill sizes itself from its font rather than
 * from a layout, and scales its lens from that; see `pill-glass.js`.)
 *
 * The ceiling is 12 %: past that the rim stops looking like glass and starts
 * looking like a fisheye lens.
 *
 * @param {unknown} refraction 0-100, as the editor's slider writes it
 * @returns {number} 0 when there is nothing to do
 */
export function lensScaleFraction(refraction) {
  const pct = Number(refraction);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.round(Math.min(100, pct) * 0.12) / 100;
}

/**
 * The filter, as SVG markup ready to drop into the card's overlay.
 *
 * The maps and the displacement are left without geometry on purpose: both
 * need the pane's size in pixels, and a pane is a layout result. The markup
 * carries the share and the selector of the element it belongs to instead,
 * and `lensGeometry` fills the numbers in once that element has been laid
 * out - see `applyLensGeometry`.
 *
 * @param {string} id the filter's id, unique per pattern
 * @param {'box' | 'disc'} shape
 * @param {number} fraction from `lensScaleFraction`
 * @param {string} forSelector the CSS selector of the element the pane sits on
 * @returns {string}
 */
export function lensFilterMarkup(id, shape, fraction, forSelector) {
  if (!fraction) return '';
  // The region is oversized because a displaced pixel can come from outside
  // the pane's own box - at the rim, that is the entire point. The maps
  // themselves must still be pinned to the box: an `feImage` with no
  // geometry fills the whole oversized region instead, which stretches the
  // ramp to 170 % and squeezes the rim - the only part that bends - into the
  // outer 2 % of the pane, where nobody can see it.
  return '<filter id="' + id + '" color-interpolation-filters="sRGB"'
    + ' data-sc-lens="' + fraction + '" data-sc-lens-for="' + escapeAttr(forSelector) + '"'
    + ' data-sc-lens-pseudo="::after"'
    + ' x="-35%" y="-35%" width="170%" height="170%">'
    + '<feImage result="lx" preserveAspectRatio="none" href="' + lensMap(shape, 'x') + '"/>'
    + '<feImage result="ly" preserveAspectRatio="none" href="' + lensMap(shape, 'y') + '"/>'
    + '<feComposite in="lx" in2="ly" operator="arithmetic" k2="1" k3="1" result="lmap"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="lmap" scale="0"'
    + ' xChannelSelector="R" yChannelSelector="G"/>'
    + '</filter>';
}

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The pixel geometry a measured pane needs: where its maps go, and - when the
 * caller wants the shift taken off the pane rather than declared - how far
 * the rim bends.
 *
 * @param {number} fraction from `lensScaleFraction`, or 0 to leave the
 *   declared shift alone
 * @param {number} width the pane's width in px
 * @param {number} height the pane's height in px
 * @returns {{width: number, height: number, scale: number | null} | null}
 *   null when the pane has no box to measure
 */
export function lensGeometry(fraction, width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const scale = fraction ? Math.round(fraction * Math.min(w, h) * 100) / 100 : null;
  return { width: w, height: h, scale };
}

/**
 * The element a pane's selector names.
 *
 * A cell's pane is addressed through `::part()`, which no `querySelector` can
 * match - a pseudo-element is not an element. The part lives one shadow root
 * further in, and that is where it is looked up.
 *
 * @param {ShadowRoot | Element} root
 * @param {string} selector
 * @returns {Element | null}
 */
function resolveTarget(root, selector) {
  const part = selector.match(/^(.*)::part\(([^)]+)\)$/);
  if (!part) return root.querySelector(selector);
  const host = root.querySelector(part[1]);
  return host && host.shadowRoot ? host.shadowRoot.querySelector('[part~="' + part[2] + '"]') : null;
}

/**
 * Fill in every lens filter in a shadow root from the panes they belong to.
 *
 * Both the maps and, where the filter asks for it, the shift are pixel
 * lengths of a box that only exists after layout. A pane drawn as an
 * `::after` has no box to call `getBoundingClientRect` on - but its used
 * width and height are readable off the computed style, and that is the box
 * the filter runs in.
 *
 * @param {ShadowRoot | Element} root
 * @param {(el: Element, pseudo: string | null) => {width: string, height: string}} [readStyle]
 */
export function applyLensGeometry(root, readStyle) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const styleOf = readStyle || ((el, pseudo) => (
    pseudo ? getComputedStyle(el, pseudo) : boxOf(el)
  ));
  root.querySelectorAll('filter[data-sc-lens-for]').forEach((filter) => {
    const fraction = parseFloat(filter.getAttribute('data-sc-lens') || '0') || 0;
    const pseudo = filter.getAttribute('data-sc-lens-pseudo');
    let host = null;
    try { host = resolveTarget(root, filter.getAttribute('data-sc-lens-for') || ''); } catch (_) { return; }
    if (!host) return;
    const cs = styleOf(host, pseudo);
    const geom = lensGeometry(fraction, parseFloat(cs.width), parseFloat(cs.height));
    if (!geom) return;
    filter.querySelectorAll('feImage').forEach((img) => {
      img.setAttribute('x', '0');
      img.setAttribute('y', '0');
      img.setAttribute('width', String(geom.width));
      img.setAttribute('height', String(geom.height));
    });
    const disp = geom.scale === null ? null : filter.querySelector('feDisplacementMap');
    if (disp && disp.getAttribute('scale') !== String(geom.scale)) {
      disp.setAttribute('scale', String(geom.scale));
    }
  });
}

const boxOf = (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width + 'px', height: r.height + 'px' };
};
