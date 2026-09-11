/**
 * Keys that saved cards still carry and nothing reads any more.
 *
 * A field can be taken out of an editor in one line; the value it already
 * wrote into people's dashboards is the part that outlives it. Leaving those
 * behind is not harmless - the next person to read the YAML has no way to
 * tell a setting that does nothing from one that does, and a key that looks
 * like a setting eventually gets "fixed" by someone wiring it back up to
 * something it never meant.
 *
 * So a dead key is listed here and removed on the next edit the card's editor
 * commits, rather than in a migration of its own: a card nobody opens is not
 * hurt by the key, and a card somebody edits is being rewritten anyway.
 */

/**
 * Dead keys by the slot list whose entries carry them.
 *
 * `position_mode`, `offset_x` and `offset_y` placed a progressbar inside the
 * cell it was drawn in, back when a bar's position was a property of the bar.
 * The canvas replaced that: an element's box *is* where it sits, and you drag
 * it. Nothing has read the three since - not the renderer, not the layout
 * module - and off the canvas they were already only shown, never used.
 *
 * `width` and `height` are deliberately not here: a bar can be a 20px line
 * inside a taller box, which its box cannot say.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const DEAD_ENTRY_KEYS = Object.freeze({
  progressbars: Object.freeze(['position_mode', 'offset_x', 'offset_y']),
});

/**
 * The slot with every dead key gone, or null when it carried none.
 *
 * Null rather than an unchanged copy, so a caller can tell "nothing to do"
 * from "here is your config back" without comparing two objects - almost
 * every commit is the former.
 *
 * Pure: the slot it is given is not touched, and only the entries that
 * actually lose a key are rebuilt.
 *
 * @param {any} slot the card's `config.supercard`
 * @returns {any | null}
 */
export function stripDeadKeys(slot) {
  if (!slot || typeof slot !== 'object') return null;

  /** @type {Record<string, any[]>} */
  const lists = {};
  for (const [key, dead] of Object.entries(DEAD_ENTRY_KEYS)) {
    const list = slot[key];
    if (!Array.isArray(list)) continue;
    let touched = false;
    const next = list.map(entry => {
      if (!entry || typeof entry !== 'object') return entry;
      const gone = dead.filter(k => k in entry);
      if (!gone.length) return entry;
      touched = true;
      const copy = { ...entry };
      for (const k of gone) delete copy[k];
      return copy;
    });
    if (touched) lists[key] = next;
  }

  return Object.keys(lists).length ? { ...slot, ...lists } : null;
}
