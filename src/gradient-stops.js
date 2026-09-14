/**
 * One shape for every gradient in the card.
 *
 * Three editors grew their own answer to the same question - which colour sits
 * where - and each wrote it down differently: the gauge as `{value, color}`,
 * the progressbar as `{pos, color}`, and a colour pattern as two parallel
 * arrays, `colors` beside `stops`. The parallel pair is the one that could
 * actually go wrong: a colour deleted from one array and not the other leaves
 * every stop after it pointing at the wrong colour.
 *
 * The shape here is `{pos, color}`. `pos` is a position rather than a per cent
 * because a gauge may be set to absolute thresholds, where the number is a
 * value on the scale and not a percentage of it; what both readings share is
 * that the stops are ordered by it.
 *
 * Reading is tolerant - `normalizeStops` takes all three of the old shapes -
 * so nothing has to be migrated before it can be drawn. Writing is not: the
 * editors commit this shape, and `stripDeadConfig` rewrites the old ones on
 * the next edit.
 */

/** @typedef {{ pos: number | null, color: string }} Stop */

const FALLBACK_COLOR = '#03a9f4';

/**
 * Colours a new stop is given, in order, so two stops added in a row do not
 * come out the same colour and look like one.
 */
export const STOP_PALETTE = Object.freeze(
  ['#4caf50', '#fdd835', '#fb8c00', '#f44336', '#9c27b0', '#03a9f4']);

/**
 * Where the *i*th of *count* stops sits when nobody has said.
 *
 * Two readings, and which one is right depends on what the gradient does with
 * the last stop. A smooth gradient runs from the first colour to the last, so
 * the ends are 0 and 100 and the gaps are `100 / (count - 1)`. Blocks - a
 * stepped gauge, a coarse resolution - give each colour a band of its own, so
 * the last band has to start before the end: `100 / count`.
 *
 * @param {number} i
 * @param {number} count
 * @param {boolean} [blocks]
 */
export function evenPos(i, count, blocks = false) {
  const n = Math.max(1, Math.round(count));
  const step = blocks ? 100 / n : 100 / Math.max(1, n - 1);
  return Math.round(i * step * 10) / 10;
}

/** A number, or null when there is nothing numeric to read. */
function toPos(v) {
  if (v === undefined || v === null || v === '') return null;
  const f = parseFloat(v);
  return Number.isNaN(f) ? null : f;
}

/**
 * Any of the three stored shapes as `[{pos, color}]`.
 *
 * Takes the array shapes - `{pos}`, `{value}`, or a bare colour string - and
 * the colour pattern's `{colors, stops}` pair. A position nobody wrote is
 * filled in by `evenPos`, which is what each of the three did for itself.
 *
 * `fill` is how an unwritten position is read. Filled in - the default - it
 * is `evenPos`, which is what each of the three editors did for itself and
 * what CSS does with a colour that carries no percentage. Left alone, it stays
 * null, because "nobody said" is a state a reader may need to see: a fluid
 * pattern's blobs take their radius from the position, and 60 is not the same
 * default as a spread.
 *
 * @param {any} input
 * @param {{ blocks?: boolean, fill?: boolean }} [opts]
 * @returns {Stop[]}
 */
export function normalizeStops(input, opts = {}) {
  const blocks = !!opts.blocks;
  const fill = opts.fill !== false;
  if (input && !Array.isArray(input) && Array.isArray(input.colors)) {
    return normalizeStops(input.colors.map((color, i) => ({
      color, pos: Array.isArray(input.stops) ? input.stops[i] : undefined,
    })), opts);
  }
  if (!Array.isArray(input)) return [];
  const count = input.length;
  return input.map((raw, i) => {
    const entry = (raw && typeof raw === 'object') ? raw : { color: raw };
    const pos = toPos(entry.pos ?? entry.value);
    return {
      pos: pos === null ? (fill ? evenPos(i, count, blocks) : null) : pos,
      color: typeof entry.color === 'string' && entry.color ? entry.color : FALLBACK_COLOR,
    };
  });
}

/**
 * The list with one stop added at the end.
 *
 * On a percentage scale the new stop lands at 100 - the end of the gradient is
 * where a colour is being added to, and a stop dropped in the middle would
 * move the ones already there. On an absolute scale there is no end to land
 * on, so it takes the largest position in the list.
 *
 * @param {Stop[]} list
 * @param {{ absolute?: boolean }} [opts]
 * @returns {Stop[]}
 */
export function addStop(list, opts = {}) {
  const stops = normalizeStops(list);
  const pos = stops.length === 0 ? 0
    : (opts.absolute ? Math.max(...stops.map(s => s.pos ?? 0)) : 100);
  return [...stops, { pos, color: STOP_PALETTE[stops.length % STOP_PALETTE.length] }];
}

/** The list without the stop at `i`. */
export function removeStop(list, i) {
  const stops = normalizeStops(list);
  if (i < 0 || i >= stops.length) return stops;
  return stops.filter((_, n) => n !== i);
}

/** The list with the stop at `from` sitting where `to` was. */
export function moveStop(list, from, to) {
  const stops = normalizeStops(list);
  if (from === to || from < 0 || to < 0 || from >= stops.length || to >= stops.length) return stops;
  const next = [...stops];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** The list with one field of one stop changed. */
export function withStop(list, i, patch) {
  const stops = normalizeStops(list);
  if (i < 0 || i >= stops.length) return stops;
  return stops.map((s, n) => n === i ? { ...s, ...patch } : s);
}

/**
 * The same colours, spread evenly.
 *
 * On a percentage scale that is `evenPos`. On an absolute one the scale
 * belongs to the entity, so the ends stay where the user put them and only the
 * stops between them move - and a list whose ends coincide has no room to
 * spread into and is left alone.
 *
 * @param {Stop[]} list
 * @param {{ absolute?: boolean, blocks?: boolean }} [opts]
 * @returns {Stop[]}
 */
export function distributeStops(list, opts = {}) {
  const stops = normalizeStops(list);
  if (stops.length < 2) return stops;
  if (!opts.absolute) {
    return stops.map((s, i) => ({ ...s, pos: evenPos(i, stops.length, !!opts.blocks) }));
  }
  const sorted = [...stops].sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const start = sorted[0].pos ?? 0;
  const end = sorted[sorted.length - 1].pos ?? 0;
  if (start === end) return sorted;
  const step = (end - start) / (sorted.length - 1);
  return sorted.map((s, i) => ({ ...s, pos: Math.round((start + i * step) * 10) / 10 }));
}

/**
 * The stops as the colour list of a CSS gradient.
 *
 * @param {Stop[]} list
 * @returns {string}
 */
export function stopsToCss(list) {
  // A stop nobody positioned is written without one: CSS spreads the colours
  // that carry no percentage evenly between the ones that do, which is the
  // same answer `evenPos` gives and one fewer number in the markup.
  return normalizeStops(list, { fill: false })
    .map(s => s.pos === null ? s.color : `${s.color} ${s.pos}%`).join(', ');
}
