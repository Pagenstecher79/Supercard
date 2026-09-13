/**
 * Suspending the glass while a modal dialog stands over it.
 *
 * `backdrop-filter` re-samples its backdrop every frame, and for content in
 * the top layer - a `<dialog>` opened with `showModal`, which is every Home
 * Assistant dialog - the backdrop root is the whole document. Chromium
 * occasionally presents that intermediate render, the one *without* the top
 * layer, and for one to three frames the dialog and its dimming are simply
 * not there: you look straight through the editor at the dashboard.
 *
 * Measured on the demo with a recorder that marked every sighting against a
 * per-frame log. In the second before each one there was not a single DOM
 * mutation anywhere, no long task, and a steady 114-120 fps - the flicker
 * happens below JavaScript, so nothing in this card's own rendering causes
 * or can prevent it. What does prevent it is having no backdrop-filter on
 * the page while a modal is open:
 *
 *   glass everywhere        5 sightings
 *   glass nowhere           0 in 7.0 min
 *   glass only in the modal 0 in 6.2 min
 *
 * That last line is the whole trick. The panes that matter are the ones the
 * user is looking at *inside* the dialog - the editor's live preview. The
 * ones behind it are under a dimming scrim anyway, so dropping their blur
 * for as long as the dialog is open costs nothing anyone can see.
 *
 * The switch is one inherited custom property, so it crosses shadow
 * boundaries on its own and needs no re-render and no per-card JavaScript:
 * `none` on the document root suspends every pane, `initial` on the dialog's
 * host makes `var()` fall back to the real value again inside it.
 */

/** The property every backdrop-filter on a pane is routed through. */
export const SUSPEND_VAR = '--sc-glass-suspend';

/**
 * Wrap a `backdrop-filter` value so it can be suspended from the document
 * root. An empty value stays empty - there is nothing to suspend.
 *
 * @param {string} value
 * @returns {string}
 */
export function suspendable(value) {
  if (!value) return '';
  return 'var(' + SUSPEND_VAR + ', ' + value + ')';
}

/**
 * The open modal `<dialog>` inside `host`, if there is one.
 *
 * Home Assistant nests its dialogs a few shadow roots deep
 * (`hui-dialog-edit-card` > `ha-dialog` > `wa-dialog` > `dialog`), and it
 * leaves the wrapper in the DOM after closing - so presence is not open, and
 * the `open` property is what has to be read.
 *
 * @param {Element} host
 * @param {number} [depth]
 * @returns {boolean}
 */
function hasOpenDialog(host, depth = 0) {
  if (!host || depth > 5) return false;
  if (host.tagName === 'DIALOG') return !!(/** @type {HTMLDialogElement} */ (host).open);
  const root = host.shadowRoot;
  if (root) {
    for (const child of root.children) if (hasOpenDialog(child, depth + 1)) return true;
  }
  for (const child of host.children) if (hasOpenDialog(child, depth + 1)) return true;
  return false;
}

/**
 * The dialog wrappers Home Assistant is currently showing.
 *
 * They live as children of `home-assistant`'s shadow root, so the search is
 * a handful of elements rather than a walk of the document.
 *
 * @param {Document} doc
 * @returns {Element[]}
 */
export function openDialogHosts(doc) {
  const ha = doc.querySelector('home-assistant');
  const scope = (ha && ha.shadowRoot) || doc.body;
  if (!scope) return [];
  const hosts = [];
  for (const el of scope.children) {
    if (/dialog/i.test(el.tagName) && hasOpenDialog(el)) hosts.push(el);
  }
  return hosts;
}

/** The hosts this module has exempted, so they can be cleaned up again. */
const exempted = new Set();

/**
 * Set or clear the suspension for the document's current dialog state.
 *
 * @param {Document} doc
 * @returns {boolean} whether the glass is suspended
 */
export function applySuspend(doc) {
  const hosts = openDialogHosts(doc);
  const root = doc.documentElement;
  for (const host of exempted) {
    if (!hosts.includes(host)) {
      /** @type {HTMLElement} */ (host).style.removeProperty(SUSPEND_VAR);
      exempted.delete(host);
    }
  }
  if (!hosts.length) {
    root.style.removeProperty(SUSPEND_VAR);
    return false;
  }
  root.style.setProperty(SUSPEND_VAR, 'none');
  for (const host of hosts) {
    // `initial` is the guaranteed-invalid value for a custom property, which
    // is exactly what makes `var(--x, real)` fall back to the real value.
    /** @type {HTMLElement} */ (host).style.setProperty(SUSPEND_VAR, 'initial');
    exempted.add(host);
  }
  return true;
}

let watching = false;

/**
 * Watch for dialogs opening and closing, once per page.
 *
 * Two signals, because neither alone covers every case: a dialog wrapper
 * being appended to `home-assistant`'s shadow root catches the first open,
 * and the scroll-lock class the dialog machinery puts on `<html>` catches a
 * wrapper that is still in the DOM being shown again.
 *
 * @param {Document} [doc]
 */
export function watchModalSuspend(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (watching || !d || typeof MutationObserver === 'undefined') return;
  watching = true;
  const apply = () => applySuspend(d);
  new MutationObserver(apply).observe(d.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  const ha = d.querySelector('home-assistant');
  if (ha && ha.shadowRoot) new MutationObserver(apply).observe(ha.shadowRoot, { childList: true });
  apply();
}

/** Test seam: forget that the watcher was installed. */
export function resetSuspendWatcher() {
  watching = false;
  exempted.clear();
}
