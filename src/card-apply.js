/**
 * "Apply" - write the card to the dashboard without closing the editor.
 *
 * Home Assistant's Save closes the edit dialog. Arranging a canvas is a long
 * job and the preview beside the editor is a fraction of the real card, so
 * keeping the work safe meant saving, losing the editor, looking, and opening
 * it again for the next nudge. Apply does what Save does, minus the close.
 *
 * There is no public API for that, so this reaches into the dialog Home
 * Assistant opened around us: `hui-dialog-edit-card` keeps the params it was
 * shown with - `saveCardConfig`, the callback that writes the card back into
 * the view - and the config it holds right now. All of that is internal, so
 * nothing here assumes any of it: every hop is duck-typed and a miss is a
 * message telling the user to use Save, never an exception.
 *
 * The config saved is the *dialog's*, never the editor's own. A card nested
 * in a stack is edited through the stack's editor, and what the view has to
 * be handed back is the whole stack - our own config would replace it with
 * the bare card.
 *
 * Pure and DOM-free on purpose: the walk is over anything with `parentNode`
 * or `host`, which is what makes it testable in Node.
 */

/** Shown when the thing above us is not a dialog we know how to save through. */
export const APPLY_UNAVAILABLE =
  "Apply needs Home Assistant's card editor - use Save instead.";

/**
 * Shown while the card is new. The dialog's callback *adds* a card until the
 * first save, so applying twice would leave two of them on the dashboard.
 */
export const APPLY_NEW_CARD =
  "Save this card once first - it is not on the dashboard yet.";

/** A cycle in the chain, or a pathological one, must not hang the click. */
const MAX_DEPTH = 200;

/**
 * The nearest thing above `start` that can save the card, or null.
 *
 * Found by what it can do rather than by its tag name: the tag is no more of
 * a promise than the method is, and a dialog that is renamed but still saves
 * the same way should go on working.
 *
 * @param {any} start
 * @returns {any}
 */
export function findCardEditDialog(start) {
  let node = start;
  for (let depth = 0; node && depth < MAX_DEPTH; depth++) {
    if (typeof node?._params?.saveCardConfig === 'function') return node;
    // A shadow root has no parent; step through its host instead.
    node = node.parentNode ?? node.host ?? null;
  }
  return null;
}

/**
 * Save whatever the surrounding edit dialog holds, leaving it open.
 *
 * Failures are returned rather than thrown - the button says what went wrong
 * in place, and Home Assistant's own Save still works.
 *
 * @param {any} start the editor element; the dialog is found by walking out
 * @returns {Promise<{ok: true} | {ok: false, error: string}>}
 */
export async function applyCardConfig(start) {
  const dialog = findCardEditDialog(start);
  if (!dialog) return { ok: false, error: APPLY_UNAVAILABLE };
  if (dialog._params?.isNew) return { ok: false, error: APPLY_NEW_CARD };
  const config = dialog._cardConfig;
  if (!config || typeof config !== 'object') {
    return { ok: false, error: APPLY_UNAVAILABLE };
  }
  try {
    // Awaited, or a dashboard that refused the write would read as a save.
    await dialog._params.saveCardConfig(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not save - ${message}` };
  }
  // What the dialog holds is now what is on the dashboard, so closing it must
  // not offer to throw the work away.
  if (typeof dialog._markDirtyStateClean === 'function') dialog._markDirtyStateClean();
  else if (typeof dialog._dirty === 'boolean') dialog._dirty = false;
  return { ok: true };
}
