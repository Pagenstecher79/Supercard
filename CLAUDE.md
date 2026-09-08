# Supercard

A custom Lovelace card for Home Assistant: gauges and progress bars, arranged in
a grid, configured entirely in the visual card editor.

Vanilla JS + LitElement, no framework, no transpile step beyond Vite's bundling.

## Commands

```bash
npm run build      # src/index.js -> dist/supercard.js (Vite lib mode)
npm run watch      # same, rebuilding on change
npm run typecheck  # tsc -p jsconfig.json --noEmit   (NOT `npx tsc`, see below)
npm run ha         # build + seed + run Home Assistant in Docker
```

There are no unit tests. `npm test` runs vitest, which reports "No test files
found" and exits 1. That is the expected state, not a failure to fix. Verify
changes by building and driving the real components (see *Verifying a change*).

There is no `tsconfig.json` - the project is typed through `jsconfig.json`, so
type-checking must name it explicitly. `npm run typecheck` does. A bare
`tsc --noEmit` or `npx tsc --noEmit` finds no project, prints the CLI help, and
checks nothing.

## Architecture

`src/index.js` imports every module in order; that order matters, because
`supercard-01-core.js` populates `window.SupercardUtils` and every other module
destructures from it at module scope.

**Do not add files to the root `index.js`.** The build entry is `src/index.js`.
The root `index.js` is a stale leftover whose imports do not resolve.

Modules register themselves on `window.SupercardModules[name]` and implement any
subset of the `SupercardModule` contract in `src/types/global.d.ts`:
`update`, `onAfterRender`, `editorFields`, `renderCustomBlock`. The card renders
them in the fixed order in `moduleOrder` (`supercard-01-core.js`).

Stacking is governed by the `SC_LAYERS` dictionary in `supercard-01-core.js`.
Use those constants; never write a bare `z-index` number.

### Component contracts

| Kind | Properties it receives |
|---|---|
| Renderer (`sc-progressbar`, `sc-gauge`) | `hass`, `config`, `globalEntities` (`sc-progressbar` also takes `rootConfig`) |
| Editor (`sc-*-editor`) | `hass`, `slot`, `commitFn` |

`slot` is `config.supercard` - the card's own config sub-object, not the
Lovelace card config.

### Shared helpers - use these, do not re-implement

`window.SupercardUtils` (defined in `supercard-01-core.js`):

- `safeFloat(v, d)`
- `hexToRgb` / `rgbToHex`
- `toRgb(value, { resolveVars })` - **the** colour reader: `[r,g,b]` arrays,
  `#rgb`, `#rrggbb`, `rgb()`/`rgba()`
- `resolveVar(v)` - looks up a `var(--x)` against the document root
- `sampleGradient(stops, pct)`
- `getAvailableElements(slot)` - flat `{id: label}` target map
- `listElements(slot)` - which gauges and bars a slot contains
- `resolveAlias(list, cfg, entityKey?, attrKey?)` - resolves entity/attribute
  through `global_entities`
- `withPatch(list, idx, key, value)` - immutable single-field edit
- `editorStyles` / `formStyles` - the two shared editor stylesheets

Add a helper here as soon as a second module needs it, and extend
`SupercardUtilsApi` in `src/types/global.d.ts` in the same change.

`var()` deserves care: a `var()` handed straight to CSS keeps following the
theme. Only resolve one when you need a concrete number *now* (contrast maths,
gradient sampling). Resolving early freezes the current theme into the markup.

## Conventions

**Config reads.** `this._get(key, default)` in components that define it.
Never read `this.config[key]` directly when `_get` exists.

**Config writes are immutable.** Clone, change, commit - never mutate the live
config. Use `SC.withPatch(list, idx, key, value)`, or the editor's own
`this._set(list, idx, key, value)` where one exists.

**Committing from an editor.** Call `commitFn(key, value)`, or
`commitFn('__merge__', { ...several keys })`. The card's `_commit` merges
`__merge__` payloads into `config.supercard` and fires `config-changed`.

**Editor styles.** Start from a shared stylesheet and add only what differs:

```js
static get styles() {
  return [SC.editorStyles, css`
    .row { gap: 8px; }          /* only the deltas */
  `];
}
```

Use `editorStyles` for pattern/card-list editors (the `ha-switch` look) and
`formStyles` for compact config forms (the hand-rolled `.toggle` look). Do not
paste a full stylesheet into a new module.

**Field visibility.** A predicate on the field definition:

```js
{ id: 'value_color', label: 'Value colour', type: 'color',
  condition: cfg => cfg.show_value && isLin(cfg) }
```

**Custom element registration is global and single-shot.** Always guard:

```js
if (!customElements.get('sc-thing')) customElements.define('sc-thing', ScThing);
```

Two builds of Supercard cannot coexist on one page - the first one loaded wins.
To test a build, repoint the existing Home Assistant resource entry rather than
adding a second one.

**Comments explain why, not what.** The code says what it does. Reserve a
comment for the reason a non-obvious choice was made - a performance
constraint, a browser quirk, an invariant that is not visible locally.

## Where the code still differs from itself

The codebase grew over time and under several hands, so competing patterns for
the same job used to sit side by side. The commit path, the expansion-state
name and the field-visibility mechanism have since been unified - the
*Conventions* above are what the code does, not an aspiration. Do not
reintroduce a second way of doing any of them.

One split remains, and it is intentional: the target lists. `SC.listElements`
answers which gauges and bars exist; each editor formats that answer its own
way, because they genuinely differ - `SC.getAvailableElements` is a flat
`{id: label}` map for colour/fx-glass/interaction, while `getLayoutTargets` in
layout groups them and adds four sub-targets per label.

Two larger things are **deliberately** not unified, because the cost outweighs
the gain:

- **Editor architecture.** progressbar and gauge-editor are built from
  declarative field arrays; the other editors write their markup by hand.
  Converting either direction is a rewrite, not a cleanup.
- **The two editor look-and-feels.** `editorStyles` and `formStyles` are
  genuinely different visual languages. Merging them is a product decision.

## Performance

Progress bars are the hot path: many can animate at once, and the cost is
layout/paint, not JS. Two things dominate and are already gated - keep them
gated:

- `backdrop-filter` re-samples and re-blurs the backdrop every frame. It is only
  visible through a translucent pill; skip it when the pill is opaque.
- `filter: url(#sc-goo-filter)` re-rasterises the whole fill layer every frame.
  Only apply it when there is actually a pill to merge into the fill.

Before claiming a rendering change is faster, measure it. Frame budget is
1000/refresh-rate ms - 8.3 ms on a 120 Hz display, not 16.6.

## Verifying a change

There is no test suite, so behaviour-preserving refactors are verified by
comparing against the previous build:

1. Build the current `HEAD` in a git worktree, and the working tree as usual.
2. Load both bundles in a page that instantiates every editor and renderer with
   a fixed synthetic `hass` and config.
3. Compare `shadowRoot.innerHTML` byte for byte, and compare what each editor
   commits when every control in it is driven.

Normalise the two known sources of nondeterminism first: lit's per-load marker
ids (`lit$<digits>$`) and the per-instance random SVG filter ids. Freeze
animations (`animation_duration: 0`) or the snapshot catches a bar mid-flight.

When you replace one pure mechanism with another - a visibility rule, a
formatter - do not just eyeball the translation. Run both side by side in the
build, over configurations that include the adversarial values (`undefined`,
`null`, `''`, `0`, `1`, `'true'`, `'false'`), and assert they never disagree
before deleting the old one. That is how the `showIf` to `condition` move was
done, and it caught two silent behaviour changes that reading the diff did
not.

## Releasing

**HACS installs from tags, not from `main`.** Pushing a `v*.*.*` tag fires
`.github/workflows/release.yml`, which builds `dist/supercard.js` and publishes
a GitHub release - live, immediately, to everyone who has the card installed.

Never commit, push, or tag on your own initiative. Build locally, report what
you found, and wait for an explicit go-ahead.

`dist/` is gitignored; the release workflow builds it. Never commit build output.
