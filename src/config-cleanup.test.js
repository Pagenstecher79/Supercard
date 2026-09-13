import { describe, it, expect } from 'vitest';
import { stripDeadConfig, migrateSlotKey, DEAD_ENTRY_KEYS, DEAD_PATTERN_TARGETS } from './config-cleanup.js';

describe('stripDeadConfig', () => {
  it('takes the dead keys out of the entry that carries them', () => {
    const slot = { progressbars: [
      { entity: 'sensor.a', position_mode: 'center', offset_x: '10px', offset_y: '0', width: 80 },
    ] };
    const out = stripDeadConfig(slot);
    expect(out.progressbars[0]).toEqual({ entity: 'sensor.a', width: 80 });
  });

  it('strips the glass debug switch but keeps manual adjustments', () => {
    const slot = { fx_glass_patterns: [
      { target: 'elm_gauge_0', enabled: true, blur: 6, manual_override: true, debug_mask: false },
      { target: 'main', enabled: true, blur: 6 },
    ] };
    const out = stripDeadConfig(slot);
    expect(out.fx_glass_patterns[0]).toEqual(
      { target: 'elm_gauge_0', enabled: true, blur: 6, manual_override: true });
    expect(out.fx_glass_patterns[1]).toBe(slot.fx_glass_patterns[1]);
  });

  it('drops a pattern aimed at a target the card will not paint', () => {
    const kept = { target: 'elm_gauge_0', enabled: true, blur: 6 };
    const slot = { fx_glass_patterns: [
      { target: 'elm_name', enabled: true, blur: 6 },
      kept,
      { target: 'elm_state', enabled: false, blur: 6 },
    ] };
    const out = stripDeadConfig(slot);
    expect(out.fx_glass_patterns).toEqual([kept]);
    expect(DEAD_PATTERN_TARGETS).toContain('elm_name');
  });

  it('strips a dead key and a dead entry in the same pass', () => {
    const slot = { fx_glass_patterns: [
      { target: 'elm_name', enabled: true },
      { target: 'main', enabled: true, debug_mask: true },
    ] };
    expect(stripDeadConfig(slot).fx_glass_patterns).toEqual([{ target: 'main', enabled: true }]);
  });

  it('is null when there is nothing to strip', () => {
    expect(stripDeadConfig({ progressbars: [{ entity: 'sensor.a' }] })).toBeNull();
    expect(stripDeadConfig({ gauges: [{ position_mode: 'center' }] })).toBeNull();
    expect(stripDeadConfig({})).toBeNull();
    expect(stripDeadConfig(null)).toBeNull();
  });

  it('leaves the slot it was given alone', () => {
    const slot = { progressbars: [{ entity: 'sensor.a', offset_x: '10px' }] };
    const before = structuredClone(slot);
    stripDeadConfig(slot);
    expect(slot).toEqual(before);
  });

  it('keeps every other key and list untouched, by identity', () => {
    const gauges = [{ entity: 'sensor.g' }];
    const clean = { entity: 'sensor.b' };
    const slot = { canvas: { w: 400, h: 200 }, gauges,
                   progressbars: [clean, { entity: 'sensor.c', offset_y: '4px' }] };
    const out = stripDeadConfig(slot);
    expect(out.canvas).toBe(slot.canvas);
    expect(out.gauges).toBe(gauges);
    // the entry that lost nothing is the same object, not a copy
    expect(out.progressbars[0]).toBe(clean);
    expect(out.progressbars[1]).toEqual({ entity: 'sensor.c' });
  });

  it('strips a key even when its value is falsy', () => {
    // `offset_x: 0` is exactly the leftover most likely to be read as "unset"
    // and skipped by a sloppier check.
    const out = stripDeadConfig({ progressbars: [{ entity: 'sensor.a', offset_x: 0, position_mode: '' }] });
    expect(out.progressbars[0]).toEqual({ entity: 'sensor.a' });
  });

  it('survives a list that is not one, and entries that are not objects', () => {
    expect(stripDeadConfig({ progressbars: 'nonsense' })).toBeNull();
    expect(stripDeadConfig({ progressbars: [null, undefined, 5] })).toBeNull();
    const out = stripDeadConfig({ progressbars: [null, { offset_x: '1px' }] });
    expect(out.progressbars).toEqual([null, {}]);
  });

  it('names only keys nothing reads', () => {
    // A guard on the list itself: adding a key here removes it from people's
    // dashboards, so it has to be one the code genuinely never looks at.
    expect(DEAD_ENTRY_KEYS.progressbars).toEqual(['position_mode', 'offset_x', 'offset_y']);
  });
});

describe('the editor fold state saved cards carry', () => {
  it('leaves a gauge, its stops, ticks and sectors without _isOpen', () => {
    const slot = { gauges: [{
      entity: 'x', manual_stops: [{ value: 0, color: '#f00', _isOpen: true }],
      custom_ticks: [{ value: 5, _isOpen: false }],
      sectors: [{ start_percent: 75, _isOpen: true, manual_stops: [{ value: 1, _isOpen: false }] }],
    }] };
    const out = stripDeadConfig(slot);
    expect(out.gauges[0].manual_stops[0]).toEqual({ value: 0, color: '#f00' });
    expect(out.gauges[0].custom_ticks[0]).toEqual({ value: 5 });
    expect(out.gauges[0].sectors[0].manual_stops[0]).toEqual({ value: 1 });
    expect('_isOpen' in out.gauges[0].sectors[0]).toBe(false);
  });

  it('is nothing to do for a gauge that never carried one', () => {
    expect(stripDeadConfig({ gauges: [{ entity: 'x', manual_stops: [{ value: 0 }] }] })).toBe(null);
  });

  it('does not touch the gauges it did not have to rebuild', () => {
    const clean = { entity: 'clean' };
    const slot = { gauges: [clean, { entity: 'dirty', custom_ticks: [{ _isOpen: true }] }] };
    expect(stripDeadConfig(slot).gauges[0]).toBe(clean);
  });

  it('is for the gauge list only', () => {
    expect(stripDeadConfig({ progressbars: [{ _isOpen: true }] })).toBe(null);
  });
});

describe('migrateSlotKey', () => {
  it('moves a pre-rename slot onto the new key', () => {
    const slot = { gauges: [{ entity: 'sensor.a' }] };
    const out = migrateSlotKey({ type: 'custom:gauge-studio-core', entity: '', supercard: slot });
    expect(out).toEqual({ type: 'custom:gauge-studio-core', entity: '', gauge_studio: slot });
    expect(out.gauge_studio).toBe(slot);
  });

  it('leaves a config that already uses the new key alone', () => {
    const config = { gauge_studio: { gauges: [] } };
    expect(migrateSlotKey(config)).toBe(config);
  });

  it('keeps both when a hand-edited config carries both keys', () => {
    const config = { supercard: { gauges: [{ entity: 'old' }] }, gauge_studio: { gauges: [] } };
    expect(migrateSlotKey(config)).toBe(config);
  });

  it('does not modify the config it is given', () => {
    const config = { supercard: { gauges: [] } };
    migrateSlotKey(config);
    expect(config).toEqual({ supercard: { gauges: [] } });
  });

  it('passes anything that is not a config straight through', () => {
    expect(migrateSlotKey(undefined)).toBe(undefined);
    expect(migrateSlotKey(null)).toBe(null);
  });

  it('is nothing to do for a card that has no slot at all', () => {
    const config = { type: 'custom:gauge-studio-core' };
    expect(migrateSlotKey(config)).toBe(config);
  });
});
