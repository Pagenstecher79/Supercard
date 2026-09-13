import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUSPEND_VAR,
  suspendable,
  openDialogHosts,
  applySuspend,
  resetSuspendWatcher,
} from './glass-suspend.js';

/** A stand-in element: only what the module actually reads. */
function el(tagName, { children = [], shadow = null, open } = {}) {
  const props = {};
  return {
    tagName,
    open,
    children,
    shadowRoot: shadow ? { children: shadow } : null,
    props,
    style: {
      setProperty: (k, v) => { props[k] = v; },
      removeProperty: (k) => { delete props[k]; },
    },
  };
}

function docWith(dialogHosts) {
  const root = el('HTML');
  const ha = el('HOME-ASSISTANT', { shadow: [el('HOME-ASSISTANT-MAIN'), ...dialogHosts] });
  return {
    documentElement: root,
    body: el('BODY', { children: [ha] }),
    querySelector: (sel) => (sel === 'home-assistant' ? ha : null),
  };
}

/** The nesting Home Assistant actually uses, four shadow roots deep. */
function haDialog(open) {
  return el('HUI-DIALOG-EDIT-CARD', {
    shadow: [el('HA-DIALOG', { shadow: [el('WA-DIALOG', { shadow: [el('DIALOG', { open })] })] })],
  });
}

beforeEach(() => resetSuspendWatcher());

describe('suspendable', () => {
  it('routes a value through the custom property', () => {
    expect(suspendable('blur(3px)')).toBe('var(' + SUSPEND_VAR + ', blur(3px))');
  });

  it('keeps a filter list, url() and all, inside the fallback', () => {
    const v = suspendable('blur(2px) url(#sc-glass-lens-a1)');
    expect(v).toContain('url(#sc-glass-lens-a1)');
    expect(v.startsWith('var(' + SUSPEND_VAR + ', ')).toBe(true);
    expect(v.endsWith(')')).toBe(true);
  });

  it('leaves an empty value empty - there is nothing to suspend', () => {
    expect(suspendable('')).toBe('');
    expect(suspendable(undefined)).toBe('');
  });
});

describe('openDialogHosts', () => {
  it('finds a dialog that is open', () => {
    const host = haDialog(true);
    expect(openDialogHosts(docWith([host]))).toEqual([host]);
  });

  it('ignores a wrapper Home Assistant left behind after closing', () => {
    expect(openDialogHosts(docWith([haDialog(false)]))).toEqual([]);
  });

  it('ignores elements that are not dialogs at all', () => {
    const doc = docWith([el('HA-TOAST', { shadow: [el('DIALOG', { open: true })] })]);
    expect(openDialogHosts(doc)).toEqual([]);
  });

  it('reports every open dialog when two are stacked', () => {
    const a = haDialog(true), b = haDialog(true);
    expect(openDialogHosts(docWith([a, b]))).toEqual([a, b]);
  });
});

describe('applySuspend', () => {
  it('suspends at the root and exempts the dialog that is open', () => {
    const host = haDialog(true);
    const doc = docWith([host]);
    expect(applySuspend(doc)).toBe(true);
    expect(doc.documentElement.props[SUSPEND_VAR]).toBe('none');
    // `initial` is the guaranteed-invalid value, which is what makes var()
    // fall back to the real filter inside the dialog.
    expect(host.props[SUSPEND_VAR]).toBe('initial');
  });

  it('writes nothing while no dialog is open', () => {
    const doc = docWith([haDialog(false)]);
    expect(applySuspend(doc)).toBe(false);
    expect(doc.documentElement.props[SUSPEND_VAR]).toBeUndefined();
  });

  it('clears the root again when the dialog closes', () => {
    const host = haDialog(true);
    const doc = docWith([host]);
    applySuspend(doc);
    host.shadowRoot.children[0].shadowRoot.children[0].shadowRoot.children[0].open = false;
    expect(applySuspend(doc)).toBe(false);
    expect(doc.documentElement.props[SUSPEND_VAR]).toBeUndefined();
    expect(host.props[SUSPEND_VAR]).toBeUndefined();
  });

  it('drops the exemption from a dialog that closed while another stays open', () => {
    const a = haDialog(true), b = haDialog(true);
    const doc = docWith([a, b]);
    applySuspend(doc);
    a.shadowRoot.children[0].shadowRoot.children[0].shadowRoot.children[0].open = false;
    expect(applySuspend(doc)).toBe(true);
    expect(a.props[SUSPEND_VAR]).toBeUndefined();
    expect(b.props[SUSPEND_VAR]).toBe('initial');
    expect(doc.documentElement.props[SUSPEND_VAR]).toBe('none');
  });
});
