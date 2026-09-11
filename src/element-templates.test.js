import { describe, it, expect } from 'vitest';
import {
  GAUGE_TEMPLATES, PROGRESSBAR_TEMPLATES, PREVIEW_ENTITY,
  templatesFor, templateEntry, previewFor,
} from './element-templates.js';
import { DEAD_ENTRY_KEYS } from './config-cleanup.js';

const ALL = [...GAUGE_TEMPLATES, ...PROGRESSBAR_TEMPLATES];

/** Every value reachable from an object, however deeply nested. */
function* walk(value) {
  if (Array.isArray(value)) { for (const v of value) yield* walk(v); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { yield [k, v]; yield* walk(v); }
    return;
  }
}

describe('the catalogue', () => {
  it('gives every template a unique id within its kind', () => {
    for (const list of [GAUGE_TEMPLATES, PROGRESSBAR_TEMPLATES]) {
      const ids = list.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('gives every template a label, a hint and a sample reading', () => {
    for (const t of ALL) {
      expect(t.label, t.id).toBeTruthy();
      expect(t.hint, t.id).toBeTruthy();
      expect(Number.isFinite(t.sample), t.id).toBe(true);
    }
  });

  it('puts every sample inside the range its own template sets', () => {
    for (const t of ALL) {
      expect(t.sample, t.id).toBeGreaterThanOrEqual(t.entry.min);
      expect(t.sample, t.id).toBeLessThanOrEqual(t.entry.max);
    }
  });

  it('leaves room between min and max', () => {
    for (const t of ALL) expect(t.entry.max, t.id).toBeGreaterThan(t.entry.min);
  });
});

describe('what a template must not ship', () => {
  // The one rule this module exists to keep: entity ids belong to the
  // dashboard, not to the card's own code.
  it('names no entity anywhere in an entry', () => {
    for (const t of ALL) {
      for (const [k, v] of walk(t.entry)) {
        expect(k, `${t.id}.${k}`).not.toMatch(/entity|alias/i);
        if (typeof v === 'string') {
          expect(v, `${t.id}.${k}`).not.toMatch(/^[a-z_]+\.[a-z0-9_]+$/);
        }
      }
    }
  });

  it('carries no identity of its own', () => {
    // `global_id` ties an entry to one card's global-entity list; two elements
    // started from the same template would claim to be the same one.
    for (const t of ALL) {
      for (const [k] of walk(t.entry)) expect(k, t.id).not.toBe('global_id');
    }
  });

  it('carries no key the card has already retired', () => {
    const dead = new Set(Object.values(DEAD_ENTRY_KEYS).flat());
    for (const t of ALL) {
      for (const [k] of walk(t.entry)) expect(dead.has(k), `${t.id}.${k}`).toBe(false);
    }
  });
});

describe('manual stop lists', () => {
  const withStops = ALL.filter(t => Array.isArray(t.entry.manual_stops));

  it('are read as percent, so a change of range keeps their shape', () => {
    for (const t of withStops) expect(t.entry.threshold_unit, t.id).toBe('percent');
  });

  it('stay inside 0..100 and rise', () => {
    for (const t of withStops) {
      let last = -1;
      for (const s of t.entry.manual_stops) {
        expect(s.value, t.id).toBeGreaterThanOrEqual(0);
        expect(s.value, t.id).toBeLessThanOrEqual(100);
        expect(s.value, t.id).toBeGreaterThanOrEqual(last);
        expect(s.color, t.id).toMatch(/^#[0-9a-f]{6}$/i);
        last = s.value;
      }
    }
  });

  it('are only set where the gauge is actually reading them', () => {
    for (const t of withStops) expect(t.entry.gradient_preset, t.id).toBe('manual');
  });
});

describe('templatesFor', () => {
  it('answers for the two kinds that have templates', () => {
    expect(templatesFor('gauge')).toBe(GAUGE_TEMPLATES);
    expect(templatesFor('progressbar')).toBe(PROGRESSBAR_TEMPLATES);
  });

  it('answers with an empty list for anything else', () => {
    for (const kind of ['label', 'surface', '', 'toString', undefined]) {
      expect(templatesFor(/** @type {any} */ (kind))).toEqual([]);
    }
  });
});

describe('templateEntry', () => {
  it('hands back an entry that can be edited in place', () => {
    const entry = templateEntry('gauge', 'temperature');
    expect(() => { entry.min = 15; }).not.toThrow();
    expect(() => { entry.manual_stops[0].color = '#000000'; }).not.toThrow();
  });

  it('hands back a different object every time', () => {
    const a = templateEntry('gauge', 'temperature');
    const b = templateEntry('gauge', 'temperature');
    expect(a).not.toBe(b);
    expect(a.manual_stops).not.toBe(b.manual_stops);
    a.manual_stops[0].color = '#000000';
    expect(b.manual_stops[0].color).not.toBe('#000000');
  });

  it('leaves the catalogue itself untouched after an edit', () => {
    const entry = templateEntry('progressbar', 'horizontal');
    entry.gradient_stops.push({ color: '#ffffff', pos: 50 });
    expect(PROGRESSBAR_TEMPLATES[0].entry.gradient_stops).toHaveLength(3);
  });

  it('is undefined for a template nobody has', () => {
    expect(templateEntry('gauge', 'nope')).toBeUndefined();
    expect(templateEntry('surface', 'horizontal')).toBeUndefined();
    // Ids do not carry across kinds, or the menu could place the wrong thing.
    expect(templateEntry('progressbar', 'temperature')).toBeUndefined();
  });
});

describe('previewFor', () => {
  it('gives every template a state the renderer can read', () => {
    for (const list of [['gauge', GAUGE_TEMPLATES], ['progressbar', PROGRESSBAR_TEMPLATES]]) {
      const [kind, templates] = /** @type {[string, any[]]} */ (list);
      for (const t of templates) {
        const pv = previewFor(kind, t.id);
        expect(pv, t.id).toBeTruthy();
        expect(pv.config.entity).toBe(PREVIEW_ENTITY);
        expect(pv.hass.states[PREVIEW_ENTITY].state).toBe(String(t.sample));
        expect(parseFloat(pv.hass.states[PREVIEW_ENTITY].state)).toBe(t.sample);
      }
    }
  });

  it('shows the sample rather than the minimum', () => {
    for (const t of ALL) {
      const kind = GAUGE_TEMPLATES.includes(t) ? 'gauge' : 'progressbar';
      expect(previewFor(kind, t.id).hass.states[PREVIEW_ENTITY].state,
             t.id).not.toBe(String(t.entry.min));
    }
  });

  it('freezes the animation, so an opened menu is not all needles in flight', () => {
    for (const t of GAUGE_TEMPLATES) {
      expect(previewFor('gauge', t.id).config.animation_duration).toBe(0);
    }
  });

  it('lends the preview the unit the template carries', () => {
    expect(previewFor('gauge', 'temperature').hass.states[PREVIEW_ENTITY]
      .attributes.unit_of_measurement).toBe('°C');
    expect(previewFor('progressbar', 'circular').hass.states[PREVIEW_ENTITY]
      .attributes.unit_of_measurement).toBe('%');
  });

  it('does not put the preview entity into the template itself', () => {
    previewFor('gauge', 'temperature');
    expect(templateEntry('gauge', 'temperature').entity).toBeUndefined();
    expect(GAUGE_TEMPLATES[0].entry.entity).toBeUndefined();
  });

  it('is undefined for a template nobody has', () => {
    expect(previewFor('gauge', 'nope')).toBeUndefined();
  });
});
