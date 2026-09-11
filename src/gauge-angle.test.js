import { describe, it, expect } from 'vitest';
import { dialFromStartAngle, startAngleFromDial } from './gauge-angle.js';

describe('dialFromStartAngle', () => {
  it('reads the four positions the editor used to offer', () => {
    // The select wrote these four strings, so every gauge configured before
    // the slider carries one of them and has to land on the right mark.
    expect(dialFromStartAngle('-90')).toBe(0);    // top
    expect(dialFromStartAngle('0')).toBe(90);     // right
    expect(dialFromStartAngle('90')).toBe(180);   // bottom
    expect(dialFromStartAngle('180')).toBe(270);  // left
  });

  it('falls back to the top for anything unreadable', () => {
    expect(dialFromStartAngle(undefined)).toBe(0);
    expect(dialFromStartAngle(null)).toBe(0);
    expect(dialFromStartAngle('')).toBe(0);
    expect(dialFromStartAngle('abc')).toBe(0);
  });

  it('wraps a hand-written angle into the dial', () => {
    expect(dialFromStartAngle(270)).toBe(0);
    expect(dialFromStartAngle(-450)).toBe(0);
    expect(dialFromStartAngle(359)).toBe(89);
  });

  it('rounds to the whole degree the slider steps in', () => {
    expect(dialFromStartAngle(-89.6)).toBe(0);
    expect(dialFromStartAngle(0.4)).toBe(90);
  });
});

describe('startAngleFromDial', () => {
  it('keeps the top at the -90 it has always been', () => {
    // Not an equivalent 270: a gauge at the default must not start writing a
    // different number for the same position the first time the slider moves.
    expect(startAngleFromDial(0)).toBe(-90);
  });

  it('covers the dial without leaving its own range', () => {
    expect(startAngleFromDial(90)).toBe(0);
    expect(startAngleFromDial(180)).toBe(90);
    expect(startAngleFromDial(270)).toBe(180);
    expect(startAngleFromDial(359)).toBe(269);
  });

  it('is unreadable-safe, like the reading direction', () => {
    expect(startAngleFromDial(undefined)).toBe(-90);
    expect(startAngleFromDial('')).toBe(-90);
  });
});

describe('the two directions together', () => {
  it('round-trips every degree of the dial', () => {
    for (let d = 0; d < 360; d++) {
      expect(dialFromStartAngle(startAngleFromDial(d))).toBe(d);
    }
  });

  it('leaves a stored angle where it was when nothing is dragged', () => {
    for (const stored of ['-90', '0', '90', '180']) {
      expect(startAngleFromDial(dialFromStartAngle(stored))).toBe(Number(stored));
    }
  });
});
