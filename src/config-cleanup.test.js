import { describe, it, expect } from 'vitest';
import { stripDeadKeys, DEAD_ENTRY_KEYS } from './config-cleanup.js';

describe('stripDeadKeys', () => {
  it('takes the dead keys out of the entry that carries them', () => {
    const slot = { progressbars: [
      { entity: 'sensor.a', position_mode: 'center', offset_x: '10px', offset_y: '0', width: 80 },
    ] };
    const out = stripDeadKeys(slot);
    expect(out.progressbars[0]).toEqual({ entity: 'sensor.a', width: 80 });
  });

  it('strips the glass editor\'s two escape hatches from a pattern', () => {
    const slot = { fx_glass_patterns: [
      { target: 'elm_gauge_0', enabled: true, blur: 6, manual_override: true, debug_mask: false },
      { target: 'main', enabled: true, blur: 6 },
    ] };
    const out = stripDeadKeys(slot);
    expect(out.fx_glass_patterns[0]).toEqual({ target: 'elm_gauge_0', enabled: true, blur: 6 });
    expect(out.fx_glass_patterns[1]).toBe(slot.fx_glass_patterns[1]);
  });

  it('is null when there is nothing to strip', () => {
    expect(stripDeadKeys({ progressbars: [{ entity: 'sensor.a' }] })).toBeNull();
    expect(stripDeadKeys({ gauges: [{ position_mode: 'center' }] })).toBeNull();
    expect(stripDeadKeys({})).toBeNull();
    expect(stripDeadKeys(null)).toBeNull();
  });

  it('leaves the slot it was given alone', () => {
    const slot = { progressbars: [{ entity: 'sensor.a', offset_x: '10px' }] };
    const before = structuredClone(slot);
    stripDeadKeys(slot);
    expect(slot).toEqual(before);
  });

  it('keeps every other key and list untouched, by identity', () => {
    const gauges = [{ entity: 'sensor.g' }];
    const clean = { entity: 'sensor.b' };
    const slot = { canvas: { w: 400, h: 200 }, gauges,
                   progressbars: [clean, { entity: 'sensor.c', offset_y: '4px' }] };
    const out = stripDeadKeys(slot);
    expect(out.canvas).toBe(slot.canvas);
    expect(out.gauges).toBe(gauges);
    // the entry that lost nothing is the same object, not a copy
    expect(out.progressbars[0]).toBe(clean);
    expect(out.progressbars[1]).toEqual({ entity: 'sensor.c' });
  });

  it('strips a key even when its value is falsy', () => {
    // `offset_x: 0` is exactly the leftover most likely to be read as "unset"
    // and skipped by a sloppier check.
    const out = stripDeadKeys({ progressbars: [{ entity: 'sensor.a', offset_x: 0, position_mode: '' }] });
    expect(out.progressbars[0]).toEqual({ entity: 'sensor.a' });
  });

  it('survives a list that is not one, and entries that are not objects', () => {
    expect(stripDeadKeys({ progressbars: 'nonsense' })).toBeNull();
    expect(stripDeadKeys({ progressbars: [null, undefined, 5] })).toBeNull();
    const out = stripDeadKeys({ progressbars: [null, { offset_x: '1px' }] });
    expect(out.progressbars).toEqual([null, {}]);
  });

  it('names only keys nothing reads', () => {
    // A guard on the list itself: adding a key here removes it from people's
    // dashboards, so it has to be one the code genuinely never looks at.
    expect(DEAD_ENTRY_KEYS.progressbars).toEqual(['position_mode', 'offset_x', 'offset_y']);
  });
});
