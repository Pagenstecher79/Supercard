import { describe, it, expect } from 'vitest';
import {
  evenPos, normalizeStops, addStop, removeStop, moveStop, withStop,
  distributeStops, stopsToCss, STOP_PALETTE,
} from './gradient-stops.js';

describe('evenPos', () => {
  it('runs a smooth gradient from end to end', () => {
    expect([0, 1, 2, 3, 4].map(i => evenPos(i, 5))).toEqual([0, 25, 50, 75, 100]);
  });

  it('gives each block a band of its own, so the last one starts short of the end', () => {
    expect([0, 1, 2, 3, 4].map(i => evenPos(i, 5, true))).toEqual([0, 20, 40, 60, 80]);
  });

  it('puts a lone stop at the start rather than dividing by zero', () => {
    expect(evenPos(0, 1)).toBe(0);
  });
});

describe('normalizeStops', () => {
  it('reads the progressbar shape unchanged', () => {
    expect(normalizeStops([{ pos: 0, color: '#f00' }, { pos: 100, color: '#0f0' }]))
      .toEqual([{ pos: 0, color: '#f00' }, { pos: 100, color: '#0f0' }]);
  });

  it('reads the gauge shape, where the position is called value', () => {
    expect(normalizeStops([{ value: 10, color: '#f00' }, { value: 90, color: '#0f0' }]))
      .toEqual([{ pos: 10, color: '#f00' }, { pos: 90, color: '#0f0' }]);
  });

  it('reads a colour pattern, whose positions sit in a second array', () => {
    expect(normalizeStops({ colors: ['#f00', '#0f0'], stops: [20, 80] }))
      .toEqual([{ pos: 20, color: '#f00' }, { pos: 80, color: '#0f0' }]);
  });

  it('spreads a colour pattern that never had positions', () => {
    expect(normalizeStops({ colors: ['#f00', '#0f0', '#00f'] }).map(s => s.pos))
      .toEqual([0, 50, 100]);
  });

  // The pair is why the one-array shape exists: a colour deleted from `colors`
  // and not from `stops` leaves the rest of the gradient reading the wrong
  // position, and nothing in the config says so.
  it('takes the positions it has when the two arrays disagree in length', () => {
    expect(normalizeStops({ colors: ['#f00', '#0f0', '#00f'], stops: [10] }).map(s => s.pos))
      .toEqual([10, 50, 100]);
  });

  it('reads a bare colour string as a stop', () => {
    expect(normalizeStops(['#f00', '#0f0'])).toEqual([
      { pos: 0, color: '#f00' }, { pos: 100, color: '#0f0' }]);
  });

  it('keeps a numeric string as a number', () => {
    expect(normalizeStops([{ pos: '25', color: '#f00' }])[0].pos).toBe(25);
  });

  it('keeps a stop whose colour is missing rather than dropping it', () => {
    const [only] = normalizeStops([{ pos: 5 }]);
    expect(only.pos).toBe(5);
    expect(only.color).toMatch(/^#/);
  });

  it('leaves an unwritten position alone when asked not to fill it', () => {
    expect(normalizeStops({ colors: ['#f00', '#0f0'] }, { fill: false }).map(s => s.pos))
      .toEqual([null, null]);
    expect(normalizeStops([{ pos: 7, color: '#f00' }, { color: '#0f0' }], { fill: false })
      .map(s => s.pos)).toEqual([7, null]);
  });

  it('is empty for anything that is not a list', () => {
    for (const v of [undefined, null, '', 0, {}]) expect(normalizeStops(v)).toEqual([]);
  });
});

describe('addStop', () => {
  it('lands at the end of a percentage scale', () => {
    expect(addStop([{ pos: 0, color: '#f00' }]).at(-1).pos).toBe(100);
  });

  it('lands on the largest position of an absolute one, where there is no end', () => {
    expect(addStop([{ pos: 12, color: '#f00' }, { pos: 40, color: '#0f0' }],
                   { absolute: true }).at(-1).pos).toBe(40);
  });

  it('starts at zero when there is nothing to add to', () => {
    expect(addStop([])).toEqual([{ pos: 0, color: STOP_PALETTE[0] }]);
  });

  it('walks the palette, so two stops in a row do not look like one', () => {
    let list = [];
    for (let i = 0; i < 3; i++) list = addStop(list);
    expect(list.map(s => s.color)).toEqual(STOP_PALETTE.slice(0, 3));
  });

  it('does not touch the list it is given', () => {
    const list = [{ pos: 0, color: '#f00' }];
    addStop(list);
    expect(list).toHaveLength(1);
  });
});

describe('removeStop / moveStop / withStop', () => {
  const list = [{ pos: 0, color: '#f00' }, { pos: 50, color: '#0f0' }, { pos: 100, color: '#00f' }];

  it('removes one', () => {
    expect(removeStop(list, 1).map(s => s.color)).toEqual(['#f00', '#00f']);
  });

  it('ignores an index that names no stop', () => {
    expect(removeStop(list, 7)).toHaveLength(3);
    expect(moveStop(list, 0, 9).map(s => s.color)).toEqual(['#f00', '#0f0', '#00f']);
    expect(withStop(list, -1, { color: '#fff' })[0].color).toBe('#f00');
  });

  it('moves one, carrying its position with it', () => {
    expect(moveStop(list, 2, 0)).toEqual([
      { pos: 100, color: '#00f' }, { pos: 0, color: '#f00' }, { pos: 50, color: '#0f0' }]);
  });

  it('changes one field of one stop', () => {
    expect(withStop(list, 1, { color: '#fff' })[1]).toEqual({ pos: 50, color: '#fff' });
  });

  it('leaves the list it is given alone', () => {
    withStop(list, 1, { color: '#fff' });
    moveStop(list, 2, 0);
    expect(list[1].color).toBe('#0f0');
    expect(list[0].color).toBe('#f00');
  });
});

describe('distributeStops', () => {
  it('spreads a percentage scale end to end', () => {
    const out = distributeStops([{ pos: 3, color: 'a' }, { pos: 4, color: 'b' }, { pos: 99, color: 'c' }]);
    expect(out.map(s => s.pos)).toEqual([0, 50, 100]);
    expect(out.map(s => s.color)).toEqual(['a', 'b', 'c']);
  });

  it('gives blocks a band each', () => {
    expect(distributeStops([{ pos: 0, color: 'a' }, { pos: 1, color: 'b' }, { pos: 2, color: 'c' },
                            { pos: 3, color: 'd' }], { blocks: true }).map(s => s.pos))
      .toEqual([0, 25, 50, 75]);
  });

  it('keeps the ends of an absolute scale, because the scale is the entity\'s', () => {
    expect(distributeStops([{ pos: 10, color: 'a' }, { pos: 11, color: 'b' }, { pos: 30, color: 'c' }],
                           { absolute: true }).map(s => s.pos))
      .toEqual([10, 20, 30]);
  });

  it('sorts an absolute list before spreading it', () => {
    expect(distributeStops([{ pos: 30, color: 'c' }, { pos: 10, color: 'a' }],
                           { absolute: true }).map(s => s.color)).toEqual(['a', 'c']);
  });

  it('leaves a list with no room to spread into alone', () => {
    const same = [{ pos: 5, color: 'a' }, { pos: 5, color: 'b' }];
    expect(distributeStops(same, { absolute: true }).map(s => s.pos)).toEqual([5, 5]);
  });

  it('has nothing to do below two stops', () => {
    expect(distributeStops([{ pos: 40, color: 'a' }])).toEqual([{ pos: 40, color: 'a' }]);
  });
});

describe('stopsToCss', () => {
  it('writes the colour list of a CSS gradient', () => {
    expect(stopsToCss([{ pos: 0, color: '#f00' }, { pos: 100, color: '#0f0' }]))
      .toBe('#f00 0%, #0f0 100%');
  });

  it('takes the old shapes too, so a card need not be migrated to be drawn', () => {
    expect(stopsToCss({ colors: ['#f00', '#0f0'], stops: [0, 100] })).toBe('#f00 0%, #0f0 100%');
  });

  // CSS spreads the colours that carry no percentage, so writing one in would
  // be writing down an answer the browser already gives.
  it('leaves a position nobody wrote out of the CSS', () => {
    expect(stopsToCss({ colors: ['#f00', '#0f0', '#00f'] })).toBe('#f00, #0f0, #00f');
    expect(stopsToCss({ colors: ['#f00', '#0f0'], stops: [10] })).toBe('#f00 10%, #0f0');
  });
});
