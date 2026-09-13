# Where the CPU goes

Measured 2026-09-13 against a real dashboard (24 Supercards, 73 gauges, 9
progress bars, ~24 800 DOM nodes, 20 glass panes in view) on a 120 Hz display,
Chrome 153, and against a synthetic reproducer on the Docker instance.

CPU numbers are `ps` process-time deltas over 10-14 s of an **idle** page -
nothing hovered, nothing scrolled, no interaction. "GPU" is Chrome's GPU
process, "renderer" the process for that tab. 100 % is one core.

## The measurements

| state of the page | GPU | renderer | total |
|---|---|---|---|
| as shipped | 63 % | 78 % | **141 %** |
| only the fx-glass repaint animation removed | 50 % | 10 % | **60 %** |
| every animation and transition disabled | 49 % | 12 % | 61 % |
| all Supercards hidden (`visibility: hidden`) | 14 % | 33 % | 47 % |

The second row is one line of CSS. It is worth ~80 points of a core, and it
gets nearly all of what disabling *every* animation gets.

## 1. The fx-glass "awake" animation

`supercard-07-fx-glass.js` gives every pattern's `::after` - the pane that
carries `backdrop-filter: blur(...)` - this:

```css
@keyframes sc-glass-awake-<id> { 0% { opacity: 0.99 } 100% { opacity: 1 } }
animation: sc-glass-awake-<id> 0.5s infinite alternate !important;
```

An invisible opacity nudge that exists only to keep the pane repainting. It
came in with the first upload and no commit explains it; the name says it was
meant to keep the backdrop from going stale.

On a backdrop-filtered layer, repainting means re-sampling and re-blurring the
backdrop - the most expensive thing on the page - and `infinite` means every
frame, 120 times a second, for every pattern on the card, forever, whether or
not anything under the glass has changed.

### The fix: nudge on render, not on every frame

The pane only needs a repaint when what is behind it changed - and the card
already knows when that is, because that is when it re-renders. fx-glass now
implements `onAfterRender`, which flips a class on the card host, and the
generated CSS moves the pane's opacity by a thousandth on that class. One
repaint per change; an idle dashboard costs nothing.

Verified on the reproducer: with the animation gone, four glassed gauges show
exactly the same needle as the four unglassed ones beside them after a value
change (`blur: 0.5` so the backdrop is legible), and the bevel, ring and
frosted interior are unchanged.

**`steps(1)` does not help.** Measured on the reproducer: `on` 60 % GPU,
`steps(1)` 60 %, removed 50 %. The compositor keeps the layer live either way,
so the fix has to be removal, with the repaint driven by the change that needs
it if one turns out to be needed at all.

**Is it needed?** In the reproducer, no: with the animation gone, four glassed
gauges track their value exactly like the twelve unglassed ones beside them
(same needle, same arc, `blur: 0.5` so the backdrop is legible). The case the
author hit is not recorded, and may be another engine - verify on iOS/Safari
before removing it for good.

## 2. Box-shadows inside the progress bars

Forcing a full repaint of the viewport and measuring the frame interval
(120 Hz display, so 8.3 ms is the floor):

| | frame |
|---|---|
| as shipped | 33.3 ms |
| the 8 visible progress bars hidden | 9.0 ms |
| the 20 visible gauges hidden | 25.0 ms |
| both hidden | 8.3 ms |
| every `box-shadow` inside the bars off | 16.7 ms |
| only the 60 `sc-seg-inner` shadows off | 17.6 ms |
| only the 7 eleven-layer shadows off | 25.1 ms |
| every `filter: url(#...)` off (65 of them) | 33.3 ms - no change |

So a repaint of eight bars costs ~24 ms, and almost all of it is box-shadow:
~16 ms for the segment shadows (60 segments, 3 to 5 shadow layers each - glow
plus relief) and ~8 ms for seven elements carrying *eleven* shadow layers.
The SVG filters cost nothing measurable; `backdrop-filter` costs nothing when
it is not being animated.

This is what makes scrolling expensive, and it is why the glass animation above
was so costly on this dashboard in particular.

## 3. What an animating card costs

Twelve bars on a canvas, two value changes a second, sensor driven from the
page (reproducer view `perfbars`):

| | GPU | renderer |
|---|---|---|
| 6 segmented circular + 6 gradient linear | 140 % | 50 % |
| only the 6 gradient linear (segmented hidden) | 20 % | 40 % |
| only the 6 segmented circular | 140 % | 50 % |
| the same 6 segmented, segment `box-shadow` off | 80 % | 40 % |

So the animation that costs is the **segmented circular bar**: ~20 % of a core
each while moving, and nearly half of that is the segments' box-shadows -
the same shadows that make a static repaint expensive in §2. Linear and
gradient bars are cheap.

### Frames that draw the same picture

`_animatePct` writes `_displayPct` - reactive state - on every frame, so the
whole component re-renders 120 times a second while a value moves. Twelve bars
at two changes a second: **1 049 component renders a second**.

A bar cannot show more than it can draw: a segmented ring lights whole
segments, a counting value shows so many decimals, a fill edge lands on a
whole pixel. Skipping the writes between those steps takes it to **615/s**.

Honest result: **that did not move the CPU** (140 %/50 % either way), and
neither did capping those writes at 30 a second (259 renders/s, same CPU). The
cost of an animating bar is paint, not JavaScript. Both are kept because they
are provably invisible work - 790 component renders a second of it - which will
matter where the main thread is the bottleneck, but neither is the fix for the
CPU number and neither should be sold as one.

### What it really was: the fade under the sweep

Every `.sc-seg-inner` carried `transition: background 150ms ease, box-shadow
150ms ease`. So each segment that lights does not just change colour - it
animates for 150 ms, and it does that while carrying two blurred halos. During
a sweep segments light continuously, so there is always a transition running,
and the ring repaints at the display's full rate no matter how few writes the
JavaScript makes. That is why neither of the two changes above moved anything.

Six rings, two value changes a second:

| | GPU | renderer |
|---|---|---|
| as shipped | 140-150 % | 40-50 % |
| glow off (transitions still on) | 90 % | 40 % |
| glow at half radius | 140 % | 40 % |
| glow only on the three leading segments | 150 % | 50 % |
| `background` transition only, no `box-shadow` | 120 % | 30 % |
| **no per-segment transition** | **30 %** | **20 %** |

The radius does not matter and the number of glowing segments does not matter,
because the segments that repaint are the ones at the edge of the sweep - and
those are lit in every variant. What matters is whether they are *transitioning*.

**The fix**: the fade is what a segment does when it lights on its own. While
the ring is sweeping, the sequence of segments *is* the motion, and the fade is
a second animation laid over it that nobody can pick out. `_animatePct` sets
`data-sweeping` on the host for the duration, and `:host([data-sweeping])`
drops the transition. Measured on the same twelve bars: **150 % / 40 % ->
40 % / 20 %**. The glow, the colours and the sweep itself are untouched.

## 4. What the glass costs when nothing happens

With the repaint animation gone the GPU process still sat at 50 %, against 10 %
with the glass CSS removed. Measured with the cards **frozen** - `shouldUpdate`
forced to `false`, zero renders, zero running animations, a completely static
page:

| | GPU |
|---|---|
| 16 glass panes | 50 % |
| 8 panes | 30 % |
| 4 panes | 10 % (the floor) |
| 16 panes, `backdrop-filter` removed, everything else kept | 10 % |
| 16 panes, `backdrop-filter: blur(0px)` | 30 % |
| 16 panes, `will-change: auto` forced everywhere | 50 % |
| 16 panes, `translateZ(0)` removed | 50 % |
| 16 panes, masks removed | 50 % |

So it is not the layer hints, not the compositing hacks and not the masks:
**a pane carrying `backdrop-filter` costs the GPU about 2.5 % of a core for as
long as it is on screen, even when the page is frozen.** Twenty panes on a
dashboard is half a core, permanently, for a static picture. That matches the
real dashboard exactly: 20 panes in view, 50 % GPU with every animation off.

A zero blur costs nearly the same as a real one - the property, not the radius,
is what puts the pane on the expensive path.

**The fix**: write `backdrop-filter` only when it shows. A blur of zero is the
property at full price for no picture, and behind a pane that is fully opaque
there is nothing to see blurred. Both are now gated.

What is left is a real cost for a real effect, and it is worth saying plainly
in the editor: every glass pattern on screen costs the GPU whether or not
anything moves, so twenty of them is a different dashboard from four.

## The reproducer

Docker instance, dashboard `supercard-demo`, view `perf`: five cards of sixteen
gauges, four glass patterns each (`elm_gauge_N`). Build carries a temporary
switch - `window.SC_AWAKE = 'on' | 'stepped' | 'off'`, then re-render the cards
- so the three variants can be measured in one build. It is a measuring
instrument, not a setting, and goes away with the fix.

Find the renderer process for a tab by burning 8 s of CPU in it from the
console and diffing `ps -o pid,time` around it; the GPU process is the plain
`Google Chrome Helper`.

## Renders per entity change (gauge level)

The card's `shouldUpdate` already filtered on the entities it draws from, but
below it every `sc-gauge` on the card re-rendered whenever the card did. On a
card with sixteen gauges bound to sixteen different entities, one state change
cost sixteen renders and fifteen of them had nothing to redraw.

`hassInputsChanged(oldHass, newHass, ids)` now lives in core and both levels
use it; `sc-gauge._inputIds()` caches the ids it watches against the identity
of `config`/`globalEntities`.

Measured on a mirror of the stress page - 5 cards, 80 gauges, entities spread
round robin over 28 sensors, 20 s windows, same card update rate:

| | card updates / 20 s | gauge updates / 20 s |
|---|---|---|
| before | 55 | 880 |
| after  | 52 | 119 |

A first attempt measured nothing at all, because every gauge on that page was
bound to the *same* sensor - there the sixteen renders were all genuinely
needed. Spreading the entities is what made the difference visible; a page
where one entity drives everything cannot show this defect.

