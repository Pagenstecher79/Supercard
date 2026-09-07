import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

// ==========================================
// THE NEW LIT-ELEMENT COMPONENT
// ==========================================
class ScDebugPanel extends LitElement {
  static get properties() {
    return {
      config: { type: Object },
      stateObj: { type: Object },
      stateVal: { type: String },
      pos: { type: String }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // Read data from the window bridge for Above/Below string renders
    const uid = this.getAttribute('data-uid');
    if (uid && window[`_sc_debug_${uid}`]) {
      const data = window[`_sc_debug_${uid}`];
      this.config = data.config;
      this.stateObj = data.stateObj;
      this.stateVal = data.stateVal;
      // Clean up so memory doesn't fill up
      delete window[`_sc_debug_${uid}`];
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        z-index: 9999;
      }

      /* INSIDE (Overlay) - Floats above the card, doesn't block clicks on underlying buttons */
      :host([pos="inside"]) {
        position: absolute;
        inset: 0;
        pointer-events: none; /* Clicks on empty space pass through to the card! */
        display: flex;
        flex-direction: column;
        justify-content: flex-end; /* Sticks the panel to the bottom edge */
      }

      /* ABOVE / BELOW - Normal block in layout flow */
      :host([pos="above"]), :host([pos="below"]) {
        position: relative;
        pointer-events: auto;
      }

      .panel {
        background: rgba(0, 0, 0, 0.85);
        color: #00ff99;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        padding: 8px;
        backdrop-filter: blur(4px);
        box-sizing: border-box;

        /* IMPORTANT FOR SCROLLING: Only the panel itself captures clicks and swipes */
        pointer-events: auto;
        overflow-y: auto;
        max-height: 100%;

        border: 1px solid rgba(0, 255, 153, 0.3);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }

      /* Adjust corners depending on position */
      :host([pos="inside"]) .panel { border-radius: 8px 8px 0 0; border-bottom: none; }
      :host([pos="above"]) .panel  { border-radius: 8px 8px 0 0; border-bottom: none; }
      :host([pos="below"]) .panel  { border-radius: 0 0 8px 8px; border-top: none; }

      /* Nice custom scrollbars */
      .panel::-webkit-scrollbar { width: 6px; }
      .panel::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
      .panel::-webkit-scrollbar-thumb { background: rgba(0,255,153,0.4); border-radius: 3px; }

      .title {
        color: #fff;
        font-weight: bold;
        font-size: 13px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        margin-bottom: 8px;
        padding-bottom: 4px;
        letter-spacing: 0.05em;
        text-align: center;
      }

      /* Native collapsible sections */
      details {
        margin-bottom: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.02);
      }
      details[open] summary {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      summary {
        padding: 6px 8px;
        cursor: pointer;
        font-weight: bold;
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      summary::before {
        content: '▶';
        font-size: 9px;
        color: #00ff99;
        transition: transform 0.2s;
      }
      details[open] summary::before {
        transform: rotate(90deg);
      }

      /* Multi-column layout */
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 6px 16px;
        padding: 8px;
      }
      .row {
        display: flex;
        flex-direction: column;
        border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
        padding-bottom: 4px;
      }
      .key {
        color: #88cfff;
        font-size: 10px;
        opacity: 0.8;
        margin-bottom: 2px;
      }
      .val {
        color: #00ff99;
        word-break: break-all;
      }
      .badge {
        background: #00ff99;
        color: #000;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 9px;
        margin-left: auto;
      }
      .badge-inactive {
        background: rgba(255,255,255,0.2);
        color: #fff;
      }
    `;
  }

  render() {
    if (!this.config) return html``;

    const stateObj = this.stateObj || {};
    const attrs = stateObj.attributes || {};

    const activeMods = [];
    const modConfigs = {};
    const unassignedCfg = { ...this.config };

    // 1. Identify ACTIVE modules
    for (const key in this.config) {
      if (key.endsWith('_active') && this.config[key] === true) {
        const modName = key.replace('_active', '');
        activeMods.push(modName);
        modConfigs[modName] = {};
      }
    }

    // 2. Assign all config values to their corresponding modules
    for (const key in unassignedCfg) {
      for (const mod of activeMods) {
        if (key.startsWith(mod + '_') || key === mod + 's' || key === mod) {
          modConfigs[mod][key] = unassignedCfg[key];
          delete unassignedCfg[key];
          break;
        }
      }
    }

    const formatVal = (v) => {
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      if (v === '') return '""';
      return String(v);
    };

    const renderGrid = (obj) => html`
      <div class="grid">
        ${Object.entries(obj).map(([k, v]) => html`
          <div class="row">
            <span class="key">${k}</span>
            <span class="val">${formatVal(v)}</span>
          </div>
        `)}
      </div>
    `;

    return html`
      <div class="panel">
        <div class="title">🛠 Supercard Debug Pipeline</div>

        <details open>
          <summary>Entity Core & State</summary>
          <div class="grid">
            <div class="row"><span class="key">entity_id</span><span class="val">${stateObj.entity_id || '—'}</span></div>
            <div class="row"><span class="key">state (raw)</span><span class="val">${this.stateVal || '—'}</span></div>
            <div class="row"><span class="key">last_changed</span><span class="val">${stateObj.last_changed || '—'}</span></div>
          </div>
        </details>

        <details>
          <summary>Attributes <span class="badge badge-inactive">${Object.keys(attrs).length}</span></summary>
          ${renderGrid(attrs)}
        </details>

        ${activeMods.map(mod => html`
          <details>
            <summary>Module: ${mod.toUpperCase()} <span class="badge">Active</span></summary>
            ${renderGrid(modConfigs[mod])}
          </details>
        `)}

        <details>
          <summary>General Config / Inactive Modules <span class="badge badge-inactive">${Object.keys(unassignedCfg).length}</span></summary>
          ${renderGrid(unassignedCfg)}
        </details>
      </div>
    `;
  }
}

if (!customElements.get('sc-debug-panel')) {
  customElements.define('sc-debug-panel', ScDebugPanel);
}

// ==========================================
// BRIDGE TO CORE
// ==========================================
window.SupercardModules = window.SupercardModules || {};
window.SupercardModules['debug'] = window.SupercardModules['debug'] || {};
Object.assign(window.SupercardModules['debug'], (() => {
  function update({ config, stateObj, stateVal }) {
    if (!config?.debug) return {};

    const pos = config.debug_position || 'inside';

    // Lit template (for the modern Overlay/Inside)
    const litTag = html`<sc-debug-panel pos="${pos}" .config=${config} .stateObj=${stateObj} .stateVal=${stateVal}></sc-debug-panel>`;

    // String tag with window bridge (for Above/Below, which the core expects as a string)
    const uid = Math.random().toString(36).substr(2, 9);
    window[`_sc_debug_${uid}`] = { config, stateObj, stateVal };
    const stringTag = `<sc-debug-panel pos="${pos}" data-uid="${uid}"></sc-debug-panel>`;

    return {
      litOverlay: pos === 'inside' ? litTag : '',
      debugAbove: pos === 'above'  ? stringTag : '',
      debugBelow: pos === 'below'  ? stringTag : ''
    };
  }

  function editorFields() {
    return [
      { id: 'debug',          label: 'Debug panel active', type: 'checkbox' },
      { id: 'debug_position', label: 'Position',          type: 'select', options: [
          { value: 'inside', label: 'Inside (scrollable overlay)' },
          { value: 'below',  label: 'Below the card' },
          { value: 'above',  label: 'Above the card' },
        ]
      },
    ];
  }

  return /** @type {SupercardModule} */ ({ update, editorFields, initCSS: () => '' });
})());
