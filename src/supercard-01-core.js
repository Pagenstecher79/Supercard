import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { reportedRows, isHeightPinned } from "./canvas-model.js";

// --- CENTRAL LAYER DICTIONARY ---
export const SC_LAYERS = {
  BG_NATIVE: 0,
  BG_STATIC: 100,
  BG_ANIMATED: 200,
  LAYOUT_GRID: 500,
  ELM_BASE: 700,
  ELM_STATIC: 800,
  ELM_DYNAMIC: 900,
  ELM_FLOAT: 1000,
  FX_FILTERS: 1300,
  FX_GLASS: 1400,
  INT_BASE: 1700,
  INT_EVENTS: 1800
};

window.SupercardModules = window.SupercardModules || {};

// --- SHARED UTILS (number/color helpers used by multiple modules) ---
window.SupercardUtils = window.SupercardUtils || {};
Object.assign(window.SupercardUtils, (() => {
  /** @type {(v: any, d: number) => number} */
  const safeFloat = (v, d) => { const f = parseFloat(v); return isNaN(f) ? d : f; };

  /** @type {(hex: string) => [number, number, number] | null} */
  const hexToRgb = hex => {
    if (!hex || typeof hex !== 'string') return null;
    const h = hex.replace('#', '');
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    return null;
  };

  /** @type {(r: number, g: number, b: number) => string} */
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

  /**
   * Look up a `var(--x)` against the document root. Anything else is handed
   * back untouched. Split out from toRgb because a var() that stays a var()
   * keeps following the theme, so only callers that need a concrete number
   * right now (contrast maths, gradient sampling) should resolve one.
   * @type {(v: string) => string}
   */
  const resolveVar = v => {
    if (typeof v !== 'string' || !v.startsWith('var(')) return v;
    const m = v.match(/var\(([^),]+)/);
    return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1].trim()).trim() : v;
  };

  /**
   * The one colour reader. Accepts everything the editors can produce - an
   * [r,g,b] array, #rgb / #rrggbb, or an rgb()/rgba() string - and returns
   * [r,g,b], or null when the value is not a colour we can read.
   * @param {any} value
   * @param {{ resolveVars?: boolean }} [opts]
   * @returns {[number, number, number] | null}
   */
  function toRgb(value, opts = {}) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;
    let v = value.trim();
    if (opts.resolveVars) v = resolveVar(v);
    if (v.startsWith('#')) return hexToRgb(v);
    if (v.startsWith('rgb')) {
      const m = v.match(/\d+/g);
      if (m && m.length >= 3) return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
    }
    return null;
  }

  /**
   * A copy of `list` with one field of one entry replaced. The editors are
   * built on immutable commits - clone, change, hand the new list to the
   * commit function - and writing that out by hand at every input meant a
   * hundred chances to forget the clone and mutate the live config instead.
   * @template T
   * @param {T[]} list
   * @param {number} idx
   * @param {string} key
   * @param {any} value
   * @returns {T[]}
   */
  function withPatch(list, idx, key, value) {
    const next = structuredClone(list);
    next[idx][key] = value;
    return next;
  }

  /**
   * Whether a gauge sizes itself from the box it is in rather than from a
   * pixel figure of its own.
   *
   * On a canvas the answer is always yes: the element *is* the size control
   * there, and a second one in the gauge editor could only contradict it. Off
   * the canvas it is the gauge's own setting.
   *
   * Both the renderer and fx-glass have to reach the same answer - fx-glass
   * picks `cqmin` or `px` units from it - so it is decided once, here.
   *
   * The string "true" counts, which a hand-written config can carry where the
   * editor's checkbox would have written a boolean. Both editor controls have
   * always read it that way - the checkbox shows such a card as switched on,
   * and the pixel field hides itself - so only the renderer disagreed, and a
   * card in that state offered no size control while still drawing at
   * `gauge_size_px`. Everything now goes through this one test.
   *
   * @param {any} gaugeConfig one entry of `gauges`
   * @param {boolean} [onCanvas] whether the card renders from a canvas
   * @returns {boolean}
   */
  function gaugeIsResponsive(gaugeConfig, onCanvas) {
    if (onCanvas) return true;
    const v = gaugeConfig?.gauge_size_responsive;
    return v === true || v === 'true';
  }

  /**
   * Resolve a config entry's entity/attribute through the global alias list.
   * Every module that can be pointed at a global entity needs this, so it
   * lives here rather than being re-typed per module. `match` is the alias
   * record itself for callers that also want its name.
   *
   * @param {{ id: string, entity: string, attribute: string, alias?: string }[]} list
   * @param {any} cfg
   * @param {string} [entityKey]
   * @param {string} [attrKey]
   */
  function resolveAlias(list, cfg, entityKey = 'entity', attrKey = 'attribute') {
    const id = cfg?.global_id;
    if (id && id !== 'manual') {
      const found = (list || []).find(g => g.id === id);
      if (found) return { entity: found.entity, attribute: found.attribute, alias: found.alias || '', match: found };
    }
    return { entity: cfg?.[entityKey], attribute: cfg?.[attrKey], alias: '', match: null };
  }

  /**
   * @param {{ pos: number, color: string }[]} stops
   * @param {number} pct
   * @returns {string}
   */
  function sampleGradient(stops, pct) {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const pos = pct * 100;
    if (pos <= sorted[0].pos) return sorted[0].color;
    if (pos >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
    for (let i = 0; i < sorted.length - 1; i++) {
      const lo = sorted[i], hi = sorted[i + 1];
      if (pos >= lo.pos && pos <= hi.pos) {
        const t = (pos - lo.pos) / (hi.pos - lo.pos);
        const [r1, g1, b1] = hexToRgb(lo.color) || [128, 128, 128];
        const [r2, g2, b2] = hexToRgb(hi.color) || [128, 128, 128];
        return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
      }
    }
    return sorted[sorted.length - 1].color;
  }

  /**
   * The gauges and progress bars a slot contains, as {id, label} records.
   * The target lists differ per editor - flat here, grouped in layout, with
   * extra per-label sub-targets there - but *which* gauges and bars exist is
   * one question with one answer, so it is answered once.
   * @param {any} slot
   */
  function listElements(slot) {
    const gaugeCount = Array.isArray(slot.gauges) ? slot.gauges.length : (slot.gauge_active ? 1 : 0);
    const gauges = Array.from({ length: gaugeCount }, (_, i) => ({ id: `gauge_${i}`, label: `Gauge ${i + 1}` }));
    const bars = (Array.isArray(slot.progressbars) ? slot.progressbars : [])
      .map((pb, i) => ({ id: `progressbar_${i}`, label: pb?.label_text || `Progressbar ${i + 1}` }));
    return { gauges, bars };
  }

  /**
   * Whether the card actually shows the element with this id.
   *
   * On the canvas model the canvas is the whole answer. `onAfterRender` moves
   * exactly the elements the canvas names into the renderer, so one that is
   * not on it is never moved - it stays in the card's own flow and draws at
   * its natural size, which for a gauge is most of the card. Removing an
   * element from the canvas is what the editor's remove button does, so this
   * is the difference between "removed" and "still in the list but unplaced".
   *
   * Every other model draws everything the lists contain, and a card whose
   * layout is switched off draws them in the plain content row - so both
   * answer yes regardless of what a leftover `canvas` key says.
   * @param {any} config
   * @param {string} id
   * @returns {boolean}
   */
  function showsElement(config, id) {
    const els = config?.canvas?.elements;
    if (!config?.layout_active || !Array.isArray(els)) return true;
    return els.some(el => el?.id === id);
  }

  /**
   * Flat {id: label} map of elements available for targeting (color patterns,
   * fx-glass, interactions). The layout editor builds its own grouped list
   * from listElements instead, because it also offers per-label sub-targets.
   * @param {any} slot
   * @returns {Record<string, string>}
   */
  function getAvailableElements(slot) {
    const elements = { 'empty': 'Empty', 'icon': 'Icon', 'name': 'Entity name', 'state': 'State (value)' };
    const { gauges, bars } = listElements(slot);
    for (const g of gauges) elements[g.id] = g.label;
    for (const b of bars) elements[b.id] = b.label;
    if (Array.isArray(slot.labels_list)) {
      slot.labels_list.forEach((l, idx) => {
        elements[`label_${idx}`] = `Label: ${l.label_text || l.entity || idx + 1}`;
      });
    }
    return elements;
  }

  // --- SHARED EDITOR CHROME ---------------------------------------------
  // Both blocks below were copy-pasted into every editor module and had
  // started to drift apart. As one CSSResult each, the browser parses a
  // single stylesheet that all the adopting shadow roots share, and a change
  // to the editor look is a change in one place.
  //
  // Modules keep their own block after these in the styles array, so a module
  // that genuinely wants a different value just restates that one property.

  // Used by the module editors that list pattern/label cards (color,
  // progressbar, labels, fx-glass, interaction). Identified by ha-switch.
  const editorStyles = css`
    .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
    summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
    summary::-webkit-details-marker { display: none; }
    .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
    .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .col { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    select, input[type="text"], input[type="number"], input[type="range"] { background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; }
    .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; }
    ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
    .toggle-icon { font-size: 10px; margin-right: 8px; display: inline-block; width: 12px; }
    .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; margin-top: 8px; margin-bottom: -4px; }
    .color-row { display: flex; align-items: center; gap: 6px; }
    .color-row input[type="text"] { flex: 1; }
    .pattern-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 10px; position: relative; }
    .pattern-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; }
    .pattern-content { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; margin-top: 8px; border-top: 1px dashed var(--divider-color, #333); }
    .drag-handle { cursor: grab; padding-right: 8px; color: var(--secondary-text-color); }
    option:disabled { color: rgba(255,255,255,0.3); font-style: italic; }
  `;

  // Used by the compact config forms (core's two editors, the gauge editor).
  // Identified by the hand-rolled .toggle switch instead of ha-switch.
  const formStyles = css`
    * { box-sizing: border-box; }
    label { font-size: 13px; color: var(--primary-text-color); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .col { display: flex; flex-direction: column; gap: 4px; }
    input[type="text"], input[type="number"], select { padding: 7px 10px; border: 1px solid var(--divider-color,#444); background: var(--secondary-background-color,#2a2a2a); color: var(--primary-text-color); border-radius: 6px; width: 100%; font-size: 13px; }
    input:focus { border-color: var(--primary-color); outline: none; }
    input[type="range"] { width: 100%; accent-color: var(--primary-color,#03a9f4); }
    input[type="color"] { width: 42px; height: 32px; padding: 2px; border-radius: 6px; border: 1px solid var(--divider-color,#444); background: none; cursor: pointer; }
    .color-row { display: flex; align-items: center; gap: 8px; }
    .color-row input[type="text"] { flex: 1; }
    .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: var(--divider-color,#555); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
    .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; }
    .toggle input:checked + .toggle-slider { background: var(--primary-color,#03a9f4); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
    details.inner-section summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
    details.inner-section summary::-webkit-details-marker { display: none; }
  `;

  return /** @type {SupercardUtilsApi} */ ({
    safeFloat, hexToRgb, rgbToHex, toRgb, resolveVar, sampleGradient,
    getAvailableElements, listElements, showsElement, resolveAlias, withPatch, gaugeIsResponsive,
    editorStyles, formStyles
  });
})());

const SC_UTILS = window.SupercardUtils;

// Entity ids referenced anywhere in a card config. Used by shouldUpdate to tell
// a relevant hass update apart from the ones HA fires for every other entity.
const SC_ENTITY_ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;
function collectEntityIds(node, out = new Set(), depth = 0) {
  if (node == null || depth > 8) return out;
  if (typeof node === 'string') {
    if (SC_ENTITY_ID_RE.test(node)) out.add(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectEntityIds(v, out, depth + 1);
  } else if (typeof node === 'object') {
    for (const v of Object.values(node)) collectEntityIds(v, out, depth + 1);
  }
  return out;
}

class SupercardCore extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  static getLayoutOptions() {
    return { grid_columns: 3, grid_rows: 3, grid_min_columns: 1, grid_min_rows: 1 };
  }

  // What Home Assistant's sections grid asks the card for. The config's own
  // `grid_options` is spread over this by hui-card, so everything here is a
  // default the layout tab may override - which is the whole point: it is the
  // same value in both places, and the canvas editor writes the same key.
  getGridOptions() {
    const slot = this.config?.supercard || {};
    return {
      columns: slot.grid_columns || 3,
      rows: reportedRows(slot),
      min_columns: 1,
      min_rows: 1
    };
  }

  setConfig(config) {
    // FIX: No longer requires an entity!
    this.config = config;
  }

  // HA replaces the whole hass object on every state change in the instance, so
  // without this the card would re-render - and re-run every module - for entities
  // it never reads. Cached per config object; a new config recollects.
  _relevantEntityIds() {
    if (this._entityIdSource !== this.config) {
      this._entityIdSource = this.config;
      this._entityIds = collectEntityIds(this.config);
    }
    return this._entityIds;
  }

  shouldUpdate(changedProps) {
    if (!this.hasUpdated) return true;
    if (changedProps.size > 1 || !changedProps.has('hass')) return true;
    const oldHass = changedProps.get('hass');
    if (!oldHass || !this.hass) return true;
    for (const id of this._relevantEntityIds()) {
      if (oldHass.states[id] !== this.hass.states[id]) return true;
    }
    return false;
  }

  getCardSize() { return 3; }
  static getConfigElement() { return document.createElement('supercard-modular-editor'); }
  static getStubConfig() { return { entity: '', supercard: { layout_shape: 'pill', border_radius: 12 } }; }

  static get styles() {
    return css`
      :host {
        display: grid !important;
        width: 100% !important;
        height: var(--sc-explicit-height, 100%) !important;
        grid-template-columns: 100% !important;
        grid-template-rows: 100% !important;
        box-sizing: border-box !important;
      }

      ha-card {
        display: grid !important;
        grid-template-columns: 100% !important;
        grid-template-rows: 100% !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: none !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* --- SUPERCARD RENDER PIPELINE --- */
      .supercard-container {
        display: grid !important;
        grid-template-areas: "stack" !important;
        width: 100% !important;
        height: 100% !important;
        background-color: var(--card-background-color, #1c1c1c);
        overflow: hidden !important;
        isolation: isolate;
        cursor: pointer;
        position: relative;
        z-index: ${SC_LAYERS.BG_NATIVE};
      }

      .supercard-container::before {
        content: "";
        grid-area: stack;
        position: absolute;
        inset: 0;
        background-color: var(--uc-color, transparent);
        z-index: ${SC_LAYERS.BG_STATIC};
        pointer-events: none;
        opacity: var(--uc-opacity, 0);
        transition: background-color 0.6s ease, opacity 0.6s ease;
        border-radius: var(--ha-card-border-radius, 12px);
      }

      .supercard-background { display: none !important; }

      .sc-content-row, #module-overlay-slot {
        grid-area: stack;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      .sc-content-row {
        display: flex;
        align-items: center;
        gap: calc(16px * var(--sc-scale, 1));
        padding: calc(12px * var(--sc-scale, 1)) calc(16px * var(--sc-scale, 1));
        z-index: ${SC_LAYERS.LAYOUT_GRID};
      }

      #module-overlay-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: ${SC_LAYERS.ELM_BASE};
        pointer-events: none;
      }

      .supercard-icon-container, .sub-button {
        background-color: rgba(255,255,255,0.1) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
        display: flex;
        align-items: center;
        justify-content: center;
        width: calc(42px * var(--sc-scale, 1));
        height: calc(42px * var(--sc-scale, 1));
        border-radius: 50%;
        flex-shrink: 0;
        z-index: ${SC_LAYERS.ELM_STATIC};
        position: relative;
      }

     .layer-elm-dynamic {
        z-index: ${SC_LAYERS.ELM_DYNAMIC};
        position: relative;
        will-change: opacity, transform;
      }

      ha-icon { --mdc-icon-size: calc(24px * var(--sc-scale, 1)); }
      .text-container { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
    `;
  }

  firstUpdated() {
    this._container = this.renderRoot.querySelector('#main-container');

    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          const h = entry.contentRect.height;
          if (w > 0 && h > 0 && this._container) {
            const minDim = Math.min(w, h);
            this._container.style.setProperty('--sc-avail-w', w + 'px');
            this._container.style.setProperty('--sc-avail-h', h + 'px');
            this._container.style.setProperty('--sc-avail-min', minDim + 'px');

            const slot = this.config?.supercard || {};
            if (slot.card_height_responsive || slot.card_width_responsive) {
              const scale = Math.max(0.3, minDim / 70);
              this._container.style.setProperty('--sc-scale', scale.toFixed(3));
            } else {
              this._container.style.setProperty('--sc-scale', '1');
            }
          }
        }
      });
      this._resizeObserver.observe(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  updated(changedProps) {
    super.updated(changedProps);
    Object.values(window.SupercardModules).forEach(module => {
      if (typeof module.onAfterRender === 'function') {
        module.onAfterRender(this.renderRoot, this.config?.supercard || {}, { overlayChanged: true });
      }
    });
  }

  render() {
    if (!this.config || !this.hass) return html``;

    const slot = this.config.supercard || {};
    const entityId = slot.entity || this.config.entity;

    const stateObj = entityId ? this.hass.states[entityId] : null;

    if (entityId && !stateObj) {
      return html`<ha-card style="padding: 16px; color: red;">Entity not found: ${entityId}</ha-card>`;
    }

    let stateVal = stateObj ? stateObj.state : '';
    if (stateObj && slot.entity_attribute && stateObj.attributes[slot.entity_attribute] !== undefined) {
      stateVal = stateObj.attributes[slot.entity_attribute];
    }

    const val = parseFloat(stateVal);
    const isNum = !isNaN(val);

    let combinedStyles = '';
    let htmlSlots = [];
    let overlaySlots = [];
    let moduleData = {};

    // Modules are handed the slot, not the card config, so the one fact about
    // the card's box that the layout renderer needs travels with it.
    const renderConfig = { ...slot, __moduleData: moduleData,
                           __heightPinned: isHeightPinned(this.config) };

    Object.entries(window.SupercardModules).forEach(([modKey, module]) => {
      if (typeof module.update !== 'function') return;
      const res = module.update({ stateObj, stateVal, val, isNum, config: renderConfig, hass: this.hass });

      if (res?.moduleData) {
        moduleData[modKey] = res.moduleData;
      }

      if (res?.cssVars) {
        for (const [k, v] of Object.entries(res.cssVars)) {
          if(v) combinedStyles += `${k}: ${v}; `;
        }
      }

      if (res?.html !== undefined) htmlSlots.push(html`<div class="sc-html-wrap-${modKey}" style="display:contents" .innerHTML=${res.html}></div>`);
      else if (res?.litHtml !== undefined) htmlSlots.push(html`<div class="sc-html-wrap-${modKey}" style="display:contents">${res.litHtml}</div>`);

      if (res?.litOverlay !== undefined) overlaySlots.push(html`<div class="sc-overlay-wrap-${modKey}" style="display:contents">${res.litOverlay}</div>`);
      else if (res?.htmlOverlay !== undefined) overlaySlots.push(html`<div class="sc-overlay-wrap-${modKey}" style="display:contents" .innerHTML=${res.htmlOverlay}></div>`);
    });

    // FIX: The critical change! Optional chaining (?.) protects against crashes when stateObj is null.
    const uom = stateObj?.attributes?.unit_of_measurement ? ' ' + stateObj.attributes.unit_of_measurement : '';
    const headerText = slot.entity_name_override || stateObj?.attributes?.friendly_name || entityId || 'Supercard';
    const iconId = stateObj?.attributes?.icon || 'mdi:bookmark';

    const isPill = slot.layout_shape !== 'rectangle';
    combinedStyles += `border-radius: ${isPill ? '999px' : (slot.border_radius ?? 12) + 'px'}; `;

    if (slot.card_height_responsive !== true && slot.card_height) {
      combinedStyles += `--sc-explicit-height: ${slot.card_height}px; `;
    } else {
      combinedStyles += `--sc-explicit-height: 100%; `;
    }

    const handleTouchOrClick = (e) => {
      const path = e.composedPath();
      const isSubElement = path.some(el => el.classList && (el.classList.contains('sub-button') || el.classList.contains('supercard-icon-container')));

      if (isSubElement) {
        return;
      }

      e.stopPropagation();

      // No longer exposed in the editor - the interaction module covers this and
      // more, per element rather than for the whole card. The key is still
      // honoured so existing configurations keep their detail view.
      if (!slot.enable_click) return;

      if (this.config) {
        const event = new Event('hass-action', { bubbles: true, composed: true });
        event.detail = {
          config: this.config,
          action: 'tap'
        };
        this.dispatchEvent(event);
      }
    };

    return html`
      <ha-card>
        <div class="supercard-container" id="main-container" style="${combinedStyles}" @click=${handleTouchOrClick} @touchstart=${handleTouchOrClick}>

          <div class="sc-content-row">
            <div class="supercard-icon-container" id="icon" style="display: ${slot.hide_icon ? 'none' : ''}">
              <ha-icon icon="${iconId}"></ha-icon>
            </div>

            <div class="text-container">
              <div class="supercard-header" id="header" style="display: ${slot.hide_entity_name ? 'none' : ''}">${headerText}</div>
              <div class="supercard-state" id="state" style="display: ${slot.hide_entity_state ? 'none' : ''}">${stateVal}${uom}</div>
              <div id="module-html-slot">${htmlSlots}</div>
            </div>
          </div>

          <div id="module-overlay-slot">${overlaySlots}</div>

        </div>
      </ha-card>
    `;
  }
}

if (!customElements.get('supercard-core')) customElements.define('supercard-core', SupercardCore);

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'supercard-core')) {
  window.customCards.push({
    type: 'supercard-core', name: 'Supercard', description: 'Modular LitElement Supercard for Home Assistant', preview: false, documentationURL: ''
  });
}

// --- HELPER FOR MODULE FORMS ---
class ScGenericModuleEditor extends LitElement {
  static get properties() { return { slot: { type: Object }, fields: { type: Array }, title: { type: String }, commitFn: { type: Object }, _isOpen: { state: true } }; }
  constructor() { super(); this._timeouts = {}; }

  static get styles() {
    return [SC_UTILS.formStyles, css`
      .row, .col { margin-bottom: 8px; }
      details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-bottom: 8px; }
      .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
    `];
  }

  static evalShowIf(spec, slot) {
    if (!spec) return true;
    const conditions = Array.isArray(spec) ? spec : [spec];
    return conditions.every(cond => {
      const act = slot[cond.field];
      const exp = cond.value;
      if (Array.isArray(exp)) return exp.includes(act);
      if (typeof exp === 'boolean') return (act === undefined ? false : Boolean(act)) === exp;
      return String(act) === String(exp);
    });
  }

  render() {
    if (!this.slot || !this.fields) return html``;
    return html`
      <div style="padding: 0 16px 16px 16px;">
        <details class="inner-section" ?open=${this._isOpen} @toggle=${e => this._isOpen = e.target.open}>
          <summary>── ${this.title} <span style="font-size:10px;">▼</span></summary>
          <div class="inner-content">
            ${this.fields.map(f => this._renderField(f))}
          </div>
        </details>
      </div>
    `;
  }

  _renderField(field) {
    if (field.type === 'section') return html`<div style="font-weight:600; margin-top:12px; border-bottom:1px dashed var(--divider-color,#444); padding-bottom:4px; margin-bottom:8px; color:var(--primary-color,#03a9f4);">${field.label.replace('── ', '')}</div>`;
    if (field.showIf && !ScGenericModuleEditor.evalShowIf(field.showIf, this.slot)) return html``;

    const val = this.slot[field.id];
    const update = (v) => this.commitFn(field.id, v);
    const updateD = (v) => { clearTimeout(this._timeouts[field.id]); this._timeouts[field.id] = setTimeout(() => update(v), 250); };

    if (field.type === 'checkbox') return html`<div class="row"><label>${field.label}</label><label class="toggle"><input type="checkbox" .checked=${!!val} @change=${e=>update(e.target.checked)}><span class="toggle-slider"></span></label></div>`;
    if (field.type === 'select') return html`<div class="row"><label>${field.label}</label><select @change=${e=>update(e.target.value)}>${(field.options||[]).map(o=>html`<option value=${o.value} ?selected=${String(val??'')==String(o.value)}>${o.label}</option>`)}</select></div>`;
    if (field.type === 'range') return html`<div class="col"><label>${field.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;">${val??field.placeholder??0}</span></label><input type="range" min=${field.min||0} max=${field.max||100} step=${field.step||1} .value=${val??field.placeholder??0} @input=${e=>update(parseFloat(e.target.value))}></div>`;
    if (field.type === 'color') {
       const hex = val ? (Array.isArray(val) ? '#'+val.map(x=>x.toString(16).padStart(2,'0')).join('') : val) : '';
       return html`<div class="col"><label>${field.label}</label><div class="color-row"><input type="color" .value=${hex} @input=${e=>update(e.target.value)}><input type="text" placeholder="#ffffff" .value=${hex} @input=${e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value)) update(e.target.value);}}></div></div>`;
    }
    return html`<div class="col"><label>${field.label}</label><input type="${field.type==='number'?'number':'text'}" placeholder=${field.placeholder||''} step=${field.step||'any'} .value=${val??''} @input=${e=>updateD(field.type==='number'?parseFloat(e.target.value):e.target.value)}></div>`;
  }
}
customElements.define('sc-generic-module-editor', ScGenericModuleEditor);

// --- MAIN EDITOR AS LIT ELEMENT ---
class SupercardModularEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  setConfig(config) {
    this.config = config;
  }

  _applyCommit(newConfig, key, value) {
    if (key === '__card__') {
      // The Lovelace card config itself, not the slot: `grid_options` is HA's
      // own key and lives there, so the canvas editor's height control and the
      // layout tab write the same field rather than two that have to agree.
      for (const [k, v] of Object.entries(value)) {
        if (v === undefined) delete newConfig[k]; else newConfig[k] = v;
      }
    } else if (key === '__merge__') {
      Object.assign(newConfig.supercard, value);
    } else {
      newConfig.supercard[key] = value;
      if (key === 'entity') newConfig.entity = value;
    }
  }

  _commit(key, value) {
    if (!this.config) return;
    const newConfig = structuredClone(this.config);
    if (!newConfig.supercard) newConfig.supercard = {};

    // One edit that has to touch both the card config and the slot arrives as
    // a batch, because two commits in one tick lose the first: this clones
    // `this.config`, and Home Assistant only writes that back asynchronously,
    // so the second clone would still be the pre-edit one.
    if (key === '__batch__') {
      for (const [k, v] of value) this._applyCommit(newConfig, k, v);
    } else {
      this._applyCommit(newConfig, key, value);
    }

    const event = new Event("config-changed", { bubbles: true, composed: true });
    event.detail = { config: newConfig };
    this.dispatchEvent(event);
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const slot = this.config.supercard || {};

    const moduleOrder = ['core', 'layout', 'labels', 'color', 'gauge', 'progressbar', 'debug'];
    const availableModules = Object.keys(window.SupercardModules);

    availableModules.sort((a, b) => {
      let posA = moduleOrder.indexOf(a);
      let posB = moduleOrder.indexOf(b);
      if (posA === -1) posA = 999;
      if (posB === -1) posB = 999;
      return posA - posB;
    });

    return html`
      <div id="modules-container" style="display:flex; flex-direction:column; gap:16px; padding-top: 8px;">
        ${availableModules.map(modKey => {
          const mod = window.SupercardModules[modKey];
          const blocks = [];

          // On a canvas card the elements themselves are added and configured
          // on the canvas, selection by selection, so the module's own list of
          // every gauge or label would be a second way to do the same job. A
          // card still on rows and cells keeps its sections - that is the only
          // editor it has.
          if (slot.canvas && mod.ownedByCanvas) return blocks;

          if (typeof mod.editorFields === 'function') {
            const fields = mod.editorFields?.() ?? [];
            if (fields.length > 0) {
              blocks.push(html`
                <sc-generic-module-editor
                  .title=${modKey.charAt(0).toUpperCase() + modKey.slice(1)}
                  .fields=${fields}
                  .slot=${slot}
                  .commitFn=${(k, v) => this._commit(k, v)}>
                </sc-generic-module-editor>
              `);
            }
          }

          if (typeof mod.renderCustomBlock === 'function') {
            const customBlock = mod.renderCustomBlock((k, v) => this._commit(k, v), this.hass, slot, this.config);
            if (customBlock) blocks.push(customBlock);
          }

          return blocks;
        })}
      </div>
    `;
  }
}
customElements.define('supercard-modular-editor', SupercardModularEditor);

// --- CORE EDITOR MODULE ---
window.SupercardModules['core'] = window.SupercardModules['core'] || {};
Object.assign(window.SupercardModules['core'], (() => {

  class ScCoreEditor extends LitElement {
    static get properties() { return { hass: { type: Object }, slot: { type: Object }, commitFn: { type: Object }, _expanded: { state: true } }; }
    constructor() { super(); this._expanded = {}; }
    static get styles() {
      return [SC_UTILS.formStyles, css`
        .row, .col { margin-bottom: 8px; }
        details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-bottom: 8px; }
        .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
        ha-entity-picker { display: block; width: 100%; }
      `];
    }
    // --- NEW METHODS FOR GLOBAL ENTITIES ---
    _addGlobalEntity() {
      const entities = [...(this.slot.global_entities || [])];

      // Fallback for non-HTTPS environments (local HA instances)
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'ge_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

      entities.push({
        id: newId,
        alias: '',
        entity: this.slot.entity || '',
        attribute: ''
      });

      this.commitFn('global_entities', entities);
    }

    _updateGlobalEntity(index, key, value) {
      const entities = [...(this.slot.global_entities || [])];
      entities[index] = { ...entities[index], [key]: value };
      this.commitFn('global_entities', entities);
    }

    _deleteGlobalEntity(index) {
      const entities = [...(this.slot.global_entities || [])];
      entities.splice(index, 1);
      this.commitFn('global_entities', entities);
    }

    _handleSort(e) {
      const { oldIndex, newIndex } = e.detail;
      if (oldIndex === newIndex) return;
      const entities = [...(this.slot.global_entities || [])];
      const [moved] = entities.splice(oldIndex, 1);
      entities.splice(newIndex, 0, moved);
      this.commitFn('global_entities', entities);
    }

    render() {
      if (!this.slot) return html``;
      const update = (k, v) => this.commitFn(k, v);

      return html`
        <div style="display:flex;flex-direction:column;gap:8px;padding:0 16px 16px 16px;">
          <details class="inner-section" ?open=${this._expanded.basis} @toggle=${e => this._expanded = {...this._expanded, basis: e.target.open}}>
            <summary>── Basics & Entity(ies) <span style="font-size:10px;">▼</span></summary>
            <div class="inner-content">

              <div class="col">
                <label>Main entity</label>
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${this.slot.entity || ''}
                  @value-changed=${e => update('entity', e.detail.value)}>
                </ha-selector>
              </div>

              <div class="col">
                <label>Attribute (optional)</label>
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ attribute: { entity_id: this.slot.entity || '' } }}
                  .value=${this.slot.entity_attribute || ''}
                  @value-changed=${e => update('entity_attribute', e.detail.value)}>
                </ha-selector>
              </div>

              <!-- === NEW BLOCK: GLOBAL ENTITIES === -->
              <div class="col" style="margin-top: 12px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <div class="row" style="margin-bottom: 12px;">
                  <label style="font-weight: 600;">Global entities (alias)</label>
                  <div style="cursor: pointer; background: var(--primary-color, #03a9f4); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;" @click="${() => this._addGlobalEntity()}">
                    + Add
                  </div>
                </div>

                <ha-sortable handle-selector=".handle" @item-moved=${this._handleSort}>
                  <div class="global-entities-list" style="display: flex; flex-direction: column; gap: 8px;">
                    ${(this.slot.global_entities || []).map((ge, index) => html`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
                          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <ha-icon class="handle" icon="mdi:drag" style="cursor: grab; color: var(--secondary-text-color);"></ha-icon>
                            <span style="font-weight: normal; font-size: 13px; line-height: 1.2;">
                              ${(() => {
                                // 1. Get the state object from HA
                                const stateObj = ge.entity ? this.hass.states[ge.entity] : null;

                                // 2. Determine the name (alias or HA friendly name)
                                const name = ge.alias || (stateObj?.attributes?.friendly_name || ge.entity || 'New alias');

                                if (!stateObj) return name; // Fallback if entity doesn't exist

                                // 3. Get the value (state or attribute)
                                let val = stateObj.state;
                                if (ge.attribute && stateObj.attributes[ge.attribute] !== undefined) {
                                  val = stateObj.attributes[ge.attribute];
                                }

                                // 4. Append unit (if present, but only for the main state)
                                const uom = (!ge.attribute && stateObj.attributes?.unit_of_measurement)
                                  ? ` ${stateObj.attributes.unit_of_measurement}`
                                  : '';

                                // 5. Assemble the final string
                                const attrLabel = ge.attribute ? ` (${ge.attribute})` : '';
                                return html`<strong>${name}</strong>${attrLabel}: ${val}${uom}`;
                              })()}
                            </span>
                          </div>
                          <ha-icon icon="mdi:delete" style="cursor: pointer; color: var(--error-color, #db4437); --mdc-icon-size: 18px;" @click=${(e) => { e.preventDefault(); this._deleteGlobalEntity(index); }}></ha-icon>
                        </summary>
                        <div class="inner-content" style="padding-top: 8px;">
                          <div class="col">
                            <label>Alias name</label>
                            <input type="text" .value=${ge.alias || ''} @input=${e => this._updateGlobalEntity(index, 'alias', e.target.value)}>
                          </div>
                          <div class="col" style="margin-top: 8px;">
                            <label>Entity</label>
                            <ha-selector
                              .hass=${this.hass}
                              .selector=${{ entity: {} }}
                              .value=${ge.entity}
                              @value-changed=${e => this._updateGlobalEntity(index, 'entity', e.detail.value)}>
                            </ha-selector>
                          </div>
                          <div class="col" style="margin-top: 8px;">
                            <label>Attribute (optional)</label>
                            <div style="display: flex; align-items: center; gap: 8px;">

                              <ha-selector
                                style="flex: 1; width: 100%;"
                                .hass=${this.hass}
                                .selector=${{ attribute: { entity_id: ge.entity } }}
                                .value=${ge.attribute}
                                @value-changed=${e => this._updateGlobalEntity(index, 'attribute', e.detail.value)}>
                              </ha-selector>

                              ${ge.attribute ? html`
                                <ha-icon
                                  icon="mdi:close-circle"
                                  title="Clear attribute"
                                  @click=${() => this._updateGlobalEntity(index, 'attribute', '')}
                                  style="cursor: pointer; color: var(--secondary-text-color); --mdc-icon-size: 24px; padding: 4px;">
                                </ha-icon>
                              ` : ''}

                            </div>
                          </div>

                        </div>
                      </details>
                    `)}
                  </div>
                </ha-sortable>
              </div>
              <!-- === END NEW BLOCK === -->

            </div>
          </details>

          <details class="inner-section" ?open=${this._expanded.dim} @toggle=${e => this._expanded = {...this._expanded, dim: e.target.open}}>
            <summary>── Card & Dimensions <span style="font-size:10px;">▼</span></summary>
            <div class="inner-content">
              <div class="row">
                <label>Card shape</label>
                <select @change=${e => update('layout_shape', e.target.value)}>
                  <option value="rectangle" ?selected=${this.slot.layout_shape === 'rectangle'}>Rectangular</option>
                  <option value="pill" ?selected=${this.slot.layout_shape === 'pill'}>Pill (rounded)</option>
                </select>
              </div>
              <div class="col">
                <label>Corner radius (px)</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="range" min="0" max="100" step="1" style="flex:1;" .value=${this.slot.border_radius ?? 12} @input=${e => update('border_radius', parseInt(e.target.value))}>
                  <input type="number" min="0" max="100" style="width:64px;" .value=${this.slot.border_radius ?? 12} @input=${e => update('border_radius', parseInt(e.target.value))}>
                </div>
              </div>

              <div class="row" style="margin-top: 8px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <label>Responsive width (HA layout)</label>
                <label class="toggle"><input type="checkbox" .checked=${this.slot.card_width_responsive !== false} @change=${e => update('card_width_responsive', e.target.checked)}><span class="toggle-slider"></span></label>
              </div>
              ${this.slot.card_width_responsive === false ? html`
                <div class="col">
                  <label>Absolute width (px or %)</label>
                  <input type="text" placeholder="e.g. 200px" .value=${this.slot.card_width || ''} @input=${e => update('card_width', e.target.value)}>
                </div>
              ` : ''}

              <div class="row" style="margin-top: 8px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <label>Responsive height (HA layout)</label>
                <label class="toggle"><input type="checkbox" .checked=${this.slot.card_height_responsive === true} @change=${e => update('card_height_responsive', e.target.checked)}><span class="toggle-slider"></span></label>
              </div>
              ${this.slot.card_height_responsive !== true ? html`
                <div class="col">
                  <label>Absolute height (px)</label>
                  <input type="number" placeholder="e.g. 80" .value=${this.slot.card_height || ''} @input=${e => update('card_height', parseInt(e.target.value))}>
                </div>
              ` : ''}
            </div>
          </details>

        </div>
      `;
    }
  }

  if (!customElements.get('sc-core-editor')) customElements.define('sc-core-editor', ScCoreEditor);

  function renderCustomBlock(commitFn, hass, slot) {
    return html`<sc-core-editor .commitFn=${commitFn} .hass=${hass} .slot=${slot}></sc-core-editor>`;
  }

  return /** @type {SupercardModule} */ ({ renderCustomBlock });

})());
