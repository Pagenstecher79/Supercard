import { describe, it, expect } from 'vitest';
import { findCardEditDialog, applyCardConfig,
         APPLY_UNAVAILABLE, APPLY_NEW_CARD } from './card-apply.js';

/** A stand-in for HA's edit dialog, with the internals Apply reaches for. */
const makeDialog = (over = {}) => ({
  _cardConfig: { type: 'custom:gauge-studio-card' },
  _params: { saveCardConfig: () => Promise.resolve() },
  ...over,
});

/** An editor two shadow roots down from `dialog`. */
const nest = (dialog) => {
  const host = { parentNode: dialog };
  const root = { host };
  return { parentNode: root };
};

describe('finding the dialog to save through', () => {
  it('walks out through hosts and parents', () => {
    const dialog = makeDialog();
    expect(findCardEditDialog(nest(dialog))).toBe(dialog);
  });

  it('answers null at the top of a chain that never saves', () => {
    expect(findCardEditDialog({ parentNode: { parentNode: null } })).toBeNull();
    expect(findCardEditDialog(null)).toBeNull();
  });

  it('ignores an ancestor whose saveCardConfig is not callable', () => {
    const decoy = { _params: { saveCardConfig: 'yes please' } };
    const dialog = makeDialog();
    decoy.parentNode = dialog;
    expect(findCardEditDialog(decoy)).toBe(dialog);
  });

  it('gives up rather than circling a chain that loops', () => {
    const a = {}; const b = { parentNode: a }; a.parentNode = b;
    expect(findCardEditDialog(a)).toBeNull();
  });
});

describe('applying the card', () => {
  it('hands the dialog its own config, not the editor’s', async () => {
    const seen = [];
    const dialog = makeDialog({
      _cardConfig: { type: 'vertical-stack', cards: [{ type: 'ours' }] },
      _params: { saveCardConfig: (c) => { seen.push(c); return Promise.resolve(); } },
    });
    expect(await applyCardConfig(nest(dialog))).toEqual({ ok: true });
    expect(seen).toEqual([{ type: 'vertical-stack', cards: [{ type: 'ours' }] }]);
  });

  it('marks the dialog clean, whichever way it keeps that', async () => {
    const now = makeDialog({ _markDirtyStateClean() { this.clean = true; } });
    await applyCardConfig(now);
    expect(now.clean).toBe(true);

    const older = makeDialog({ _dirty: true });
    await applyCardConfig(older);
    expect(older._dirty).toBe(false);
  });

  it('says to use Save when there is no dialog, and when it holds no config', async () => {
    expect(await applyCardConfig({ parentNode: null }))
      .toEqual({ ok: false, error: APPLY_UNAVAILABLE });
    expect(await applyCardConfig(makeDialog({ _cardConfig: undefined })))
      .toEqual({ ok: false, error: APPLY_UNAVAILABLE });
  });

  it('refuses a card that is not on the dashboard yet', async () => {
    let calls = 0;
    const dialog = makeDialog({
      _params: { isNew: true, saveCardConfig: () => { calls += 1; } },
    });
    expect(await applyCardConfig(dialog)).toEqual({ ok: false, error: APPLY_NEW_CARD });
    // Because the callback adds rather than replaces until the first save.
    expect(calls).toBe(0);
  });

  it('reports a refused write instead of reading it as a save', async () => {
    const dialog = makeDialog({
      _dirty: true,
      _params: { saveCardConfig: () => Promise.reject(new Error('Config not found')) },
    });
    expect(await applyCardConfig(dialog))
      .toEqual({ ok: false, error: 'Could not save - Config not found' });
    // Still dirty: the dashboard does not have it.
    expect(dialog._dirty).toBe(true);
  });
});
