import { LitElement as Be, css as Xe, html as _, svg as q } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
const vt = {
  BG_NATIVE: 0,
  BG_STATIC: 100,
  LAYOUT_GRID: 500,
  ELM_BASE: 700,
  ELM_STATIC: 800,
  ELM_DYNAMIC: 900
};
window.SupercardModules = window.SupercardModules || {};
class Dt extends Be {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }
  static getLayoutOptions() {
    return { grid_columns: 3, grid_rows: 3, grid_min_columns: 1, grid_min_rows: 1 };
  }
  getGridOptions() {
    var o;
    const e = ((o = this.config) == null ? void 0 : o.supercard) || {};
    return {
      columns: e.grid_columns || 3,
      rows: e.grid_rows || 3,
      min_columns: 1,
      min_rows: 1
    };
  }
  setConfig(e) {
    this.config = e;
  }
  getCardSize() {
    return 3;
  }
  static getConfigElement() {
    return document.createElement("supercard-modular-editor");
  }
  static getStubConfig() {
    return { entity: "", supercard: { layout_shape: "pill", border_radius: 12 } };
  }
  static get styles() {
    return Xe`
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
        z-index: ${vt.BG_NATIVE}; 
      }

      .supercard-container::before {
        content: "";
        grid-area: stack;
        position: absolute;
        inset: 0;
        background-color: var(--uc-color, transparent);
        z-index: ${vt.BG_STATIC}; 
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
        z-index: ${vt.LAYOUT_GRID};
      }

      #module-overlay-slot {
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: ${vt.ELM_BASE};
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
        z-index: ${vt.ELM_STATIC}; 
        position: relative;
      }

     .layer-elm-dynamic {
        z-index: ${vt.ELM_DYNAMIC};
        position: relative;
        will-change: opacity, transform;
      }

      ha-icon { --mdc-icon-size: calc(24px * var(--sc-scale, 1)); }
      .text-container { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
    `;
  }
  firstUpdated() {
    this._container = this.renderRoot.querySelector("#main-container"), this._resizeObserver || (this._resizeObserver = new ResizeObserver((e) => {
      var o, p;
      for (const t of e) {
        const i = t.contentRect.width, r = t.contentRect.height;
        if (i > 0 && r > 0 && this._container) {
          const u = Math.min(i, r);
          this._container.style.setProperty("--sc-avail-w", i + "px"), this._container.style.setProperty("--sc-avail-h", r + "px"), this._container.style.setProperty("--sc-avail-min", u + "px");
          const n = ((o = this.config) == null ? void 0 : o.supercard) || {};
          if (n.card_height_responsive || n.card_width_responsive) {
            const l = Math.max(0.3, u / 70);
            this._container.style.setProperty("--sc-scale", l.toFixed(3));
          } else
            this._container.style.setProperty("--sc-scale", "1");
        }
      }
      window.SupercardLayout && window.SupercardLayout.arrange(this.renderRoot.querySelector("#module-overlay-slot"), ((p = this.config) == null ? void 0 : p.supercard) || {});
    }), this._resizeObserver.observe(this));
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._resizeObserver && (this._resizeObserver.disconnect(), this._resizeObserver = null);
  }
  updated(e) {
    var o;
    super.updated(e), Object.values(window.SupercardModules).forEach((p) => {
      var t;
      typeof p.onAfterRender == "function" && p.onAfterRender(this.renderRoot, ((t = this.config) == null ? void 0 : t.supercard) || {}, { overlayChanged: !0 });
    }), window.SupercardLayout && window.SupercardLayout.arrange(this.renderRoot.querySelector("#module-overlay-slot"), ((o = this.config) == null ? void 0 : o.supercard) || {});
  }
  render() {
    var f, y, $;
    if (!this.config || !this.hass) return _``;
    const e = this.config.supercard || {}, o = e.entity || this.config.entity, p = o ? this.hass.states[o] : null;
    if (o && !p)
      return _`<ha-card style="padding: 16px; color: red;">Entität nicht gefunden: ${o}</ha-card>`;
    let t = p ? p.state : "";
    p && e.entity_attribute && p.attributes[e.entity_attribute] !== void 0 && (t = p.attributes[e.entity_attribute]);
    const i = parseFloat(t), r = !isNaN(i);
    let u = "", n = [], l = [], d = {};
    const a = { ...e, __moduleData: d };
    Object.entries(window.SupercardModules).forEach(([w, S]) => {
      if (typeof S.update != "function") return;
      const x = S.update({ stateObj: p, stateVal: t, val: i, isNum: r, config: a, hass: this.hass });
      if (x != null && x.moduleData && (d[w] = x.moduleData), x != null && x.cssVars)
        for (const [k, J] of Object.entries(x.cssVars))
          J && (u += `${k}: ${J}; `);
      (x == null ? void 0 : x.html) !== void 0 ? n.push(_`<div class="sc-html-wrap-${w}" style="display:contents" .innerHTML=${x.html}></div>`) : (x == null ? void 0 : x.litHtml) !== void 0 && n.push(_`<div class="sc-html-wrap-${w}" style="display:contents">${x.litHtml}</div>`), (x == null ? void 0 : x.litOverlay) !== void 0 ? l.push(_`<div class="sc-overlay-wrap-${w}" style="display:contents">${x.litOverlay}</div>`) : (x == null ? void 0 : x.htmlOverlay) !== void 0 && l.push(_`<div class="sc-overlay-wrap-${w}" style="display:contents" .innerHTML=${x.htmlOverlay}></div>`);
    });
    let c = "";
    Object.values(window.SupercardModules).forEach((w) => {
      typeof w.initCSS == "function" && (c += w.initCSS());
    });
    const h = (f = p == null ? void 0 : p.attributes) != null && f.unit_of_measurement ? " " + p.attributes.unit_of_measurement : "", v = e.entity_name_override || ((y = p == null ? void 0 : p.attributes) == null ? void 0 : y.friendly_name) || o || "Supercard", b = (($ = p == null ? void 0 : p.attributes) == null ? void 0 : $.icon) || "mdi:bookmark", g = e.layout_shape !== "rectangle";
    u += `border-radius: ${g ? "999px" : (e.border_radius ?? 12) + "px"}; `, e.card_height_responsive !== !0 && e.card_height ? u += `--sc-explicit-height: ${e.card_height}px; ` : u += "--sc-explicit-height: 100%; ";
    const m = (w) => {
      if (!w.composedPath().some((k) => k.classList && (k.classList.contains("sub-button") || k.classList.contains("supercard-icon-container"))) && (w.stopPropagation(), !!e.enable_click && this.config)) {
        const k = new Event("hass-action", { bubbles: !0, composed: !0 });
        k.detail = {
          config: this.config,
          action: "tap"
        }, this.dispatchEvent(k);
      }
    };
    return _`
      <style>${c}</style>
      <ha-card>
        <div class="supercard-container" id="main-container" style="${u}" @click=${m} @touchstart=${m}>

          <div class="sc-content-row">
            <div class="supercard-icon-container" id="icon" style="display: ${e.hide_icon ? "none" : ""}">
              <ha-icon icon="${b}"></ha-icon>
            </div>

            <div class="text-container">
              <div class="supercard-header" id="header" style="display: ${e.hide_entity_name ? "none" : ""}">${v}</div>
              <div class="supercard-state" id="state" style="display: ${e.hide_entity_state ? "none" : ""}">${t}${h}</div>
              <div id="module-html-slot">${n}</div>
            </div>
          </div>

          <div id="module-overlay-slot">${l}</div>

        </div>
      </ha-card>
    `;
  }
}
customElements.get("supercard-core") || customElements.define("supercard-core", Dt);
window.customCards = window.customCards || [];
window.customCards.find((s) => s.type === "supercard-core") || window.customCards.push({
  type: "supercard-core",
  name: "Supercard",
  description: "Modulare LitElement Supercard für Home Assistant",
  preview: !1,
  documentationURL: ""
});
class Mt extends Be {
  static get properties() {
    return { slot: { type: Object }, fields: { type: Array }, title: { type: String }, commitFn: { type: Object }, _isOpen: { state: !0 } };
  }
  constructor() {
    super(), this._timeouts = {};
  }
  static get styles() {
    return Xe`
      * { box-sizing: border-box; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
      .col { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
      label { font-size: 13px; color: var(--primary-text-color); }
      input[type="text"], input[type="number"], select { padding: 7px 10px; border: 1px solid var(--divider-color,#444); background: var(--secondary-background-color,#2a2a2a); color: var(--primary-text-color); border-radius: 6px; width: 100%; font-size: 13px; }
      input:focus { border-color: var(--primary-color); outline: none; }
      input[type="range"] { width: 100%; accent-color: var(--primary-color,#03a9f4); }
      .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: var(--divider-color,#555); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
      .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; }
      .toggle input:checked + .toggle-slider { background: var(--primary-color,#03a9f4); }
      .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
      details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-bottom: 8px; }
      details.inner-section summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      details.inner-section summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
      .color-row { display: flex; align-items: center; gap: 8px; }
      .color-row input[type="text"] { flex: 1; }
      input[type="color"] { width: 42px; height: 32px; padding: 2px; border-radius: 6px; border: 1px solid var(--divider-color,#444); background: none; cursor: pointer; }
    `;
  }
  static evalShowIf(e, o) {
    return e ? (Array.isArray(e) ? e : [e]).every((t) => {
      const i = o[t.field], r = t.value;
      return Array.isArray(r) ? r.includes(i) : typeof r == "boolean" ? (i === void 0 ? !1 : !!i) === r : String(i) === String(r);
    }) : !0;
  }
  render() {
    return !this.slot || !this.fields ? _`` : _`
      <div style="padding: 0 16px 16px 16px;">
        <details class="inner-section" ?open=${this._isOpen} @toggle=${(e) => this._isOpen = e.target.open}>
          <summary>── ${this.title} <span style="font-size:10px;">▼</span></summary>
          <div class="inner-content">
            ${this.fields.map((e) => this._renderField(e))}
          </div>
        </details>
      </div>
    `;
  }
  _renderField(e) {
    if (e.type === "section") return _`<div style="font-weight:600; margin-top:12px; border-bottom:1px dashed var(--divider-color,#444); padding-bottom:4px; margin-bottom:8px; color:var(--primary-color,#03a9f4);">${e.label.replace("── ", "")}</div>`;
    if (e.showIf && !Mt.evalShowIf(e.showIf, this.slot)) return _``;
    const o = this.slot[e.id], p = (i) => this.commitFn(e.id, i), t = (i) => {
      clearTimeout(this._timeouts[e.id]), this._timeouts[e.id] = setTimeout(() => p(i), 250);
    };
    if (e.type === "checkbox") return _`<div class="row"><label>${e.label}</label><label class="toggle"><input type="checkbox" .checked=${!!o} @change=${(i) => p(i.target.checked)}><span class="toggle-slider"></span></label></div>`;
    if (e.type === "select") return _`<div class="row"><label>${e.label}</label><select @change=${(i) => p(i.target.value)}>${(e.options || []).map((i) => _`<option value=${i.value} ?selected=${String(o ?? "") == String(i.value)}>${i.label}</option>`)}</select></div>`;
    if (e.type === "range") return _`<div class="col"><label>${e.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;">${o ?? e.placeholder ?? 0}</span></label><input type="range" min=${e.min || 0} max=${e.max || 100} step=${e.step || 1} .value=${o ?? e.placeholder ?? 0} @input=${(i) => p(parseFloat(i.target.value))}></div>`;
    if (e.type === "color") {
      const i = o ? Array.isArray(o) ? "#" + o.map((r) => r.toString(16).padStart(2, "0")).join("") : o : "";
      return _`<div class="col"><label>${e.label}</label><div class="color-row"><input type="color" .value=${i} @input=${(r) => p(r.target.value)}><input type="text" placeholder="#ffffff" .value=${i} @input=${(r) => {
        /^#[0-9a-fA-F]{6}$/.test(r.target.value) && p(r.target.value);
      }}></div></div>`;
    }
    return _`<div class="col"><label>${e.label}</label><input type="${e.type === "number" ? "number" : "text"}" placeholder=${e.placeholder || ""} step=${e.step || "any"} .value=${o ?? ""} @input=${(i) => t(e.type === "number" ? parseFloat(i.target.value) : i.target.value)}></div>`;
  }
}
customElements.define("sc-generic-module-editor", Mt);
class It extends Be {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }
  setConfig(e) {
    this.config = e;
  }
  _commit(e, o) {
    if (!this.config) return;
    const p = JSON.parse(JSON.stringify(this.config));
    p.supercard || (p.supercard = {}), e === "__merge__" ? Object.assign(p.supercard, o) : (p.supercard[e] = o, e === "entity" && (p.entity = o));
    const t = new Event("config-changed", { bubbles: !0, composed: !0 });
    t.detail = { config: p }, this.dispatchEvent(t);
  }
  render() {
    if (!this.config || !this.hass) return _``;
    const e = this.config.supercard || {}, o = ["core", "layout", "labels", "color", "gauge", "progressbar", "debug"], p = Object.keys(window.SupercardModules);
    return p.sort((t, i) => {
      let r = o.indexOf(t), u = o.indexOf(i);
      return r === -1 && (r = 999), u === -1 && (u = 999), r - u;
    }), _`
      <div id="modules-container" style="display:flex; flex-direction:column; gap:16px; padding-top: 8px;">
        ${p.map((t) => {
      var u;
      const i = window.SupercardModules[t], r = [];
      if (typeof i.editorFields == "function") {
        const n = ((u = i.editorFields) == null ? void 0 : u.call(i)) ?? [];
        n.length > 0 && r.push(_`
                <sc-generic-module-editor
                  .title=${t.charAt(0).toUpperCase() + t.slice(1)}
                  .fields=${n}
                  .slot=${e}
                  .commitFn=${(l, d) => this._commit(l, d)}>
                </sc-generic-module-editor>
              `);
      }
      if (typeof i.renderCustomBlock == "function") {
        const n = i.renderCustomBlock((l, d) => this._commit(l, d), this.hass, e);
        n && r.push(n);
      }
      return r;
    })}
      </div>
    `;
  }
}
customElements.define("supercard-modular-editor", It);
window.SupercardModules.core = window.SupercardModules.core || {};
Object.assign(window.SupercardModules.core, (() => {
  class s extends Be {
    static get properties() {
      return { hass: { type: Object }, slot: { type: Object }, commitFn: { type: Object }, _expanded: { state: !0 } };
    }
    constructor() {
      super(), this._expanded = {};
    }
    static get styles() {
      return Xe`
        * { box-sizing: border-box; }
        .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .col { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        label { font-size: 13px; color: var(--primary-text-color); }
        input[type="text"], input[type="number"], select { padding: 7px 10px; border: 1px solid var(--divider-color,#444); background: var(--secondary-background-color,#2a2a2a); color: var(--primary-text-color); border-radius: 6px; width: 100%; font-size: 13px; }
        input:focus { border-color: var(--primary-color); outline: none; }
        .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; inset: 0; background: var(--divider-color,#555); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
        .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; }
        .toggle input:checked + .toggle-slider { background: var(--primary-color,#03a9f4); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
        details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-bottom: 8px; }
        details.inner-section summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
        details.inner-section summary::-webkit-details-marker { display: none; }
        .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
        ha-entity-picker { display: block; width: 100%; }
      `;
    }
    // --- NEUE METHODEN FÜR GLOBAL ENTITIES ---
    _addGlobalEntity() {
      const p = [...this.slot.global_entities || []], t = typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "ge_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      p.push({
        id: t,
        alias: "",
        entity: this.slot.entity || "",
        attribute: ""
      }), this.commitFn("global_entities", p);
    }
    _updateGlobalEntity(p, t, i) {
      const r = [...this.slot.global_entities || []];
      r[p] = { ...r[p], [t]: i }, this.commitFn("global_entities", r);
    }
    _deleteGlobalEntity(p) {
      const t = [...this.slot.global_entities || []];
      t.splice(p, 1), this.commitFn("global_entities", t);
    }
    _handleSort(p) {
      const { oldIndex: t, newIndex: i } = p.detail;
      if (t === i) return;
      const r = [...this.slot.global_entities || []], [u] = r.splice(t, 1);
      r.splice(i, 0, u), this.commitFn("global_entities", r);
    }
    render() {
      if (!this.slot) return _``;
      const p = (t, i) => this.commitFn(t, i);
      return _`
        <div style="display:flex;flex-direction:column;gap:8px;padding:0 16px 16px 16px;">
          <details class="inner-section" ?open=${this._expanded.basis} @toggle=${(t) => this._expanded = { ...this._expanded, basis: t.target.open }}>
            <summary>── Basis & Entität(en) <span style="font-size:10px;">▼</span></summary>
            <div class="inner-content"> 

              <div class="col">
                <label>Haupt-Entität</label>
                <ha-selector 
                  .hass=${this.hass} 
                  .selector=${{ entity: {} }} 
                  .value=${this.slot.entity || ""} 
                  @value-changed=${(t) => p("entity", t.detail.value)}>
                </ha-selector>
              </div>

              <div class="col">
                <label>Attribut (optional)</label>
                <ha-selector 
                  .hass=${this.hass} 
                  .selector=${{ attribute: { entity_id: this.slot.entity || "" } }} 
                  .value=${this.slot.entity_attribute || ""} 
                  @value-changed=${(t) => p("entity_attribute", t.detail.value)}>
                </ha-selector>
              </div>

              <div class="row" style="margin-top: 12px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <label>Klick-Aktion (Detailansicht) aktivieren</label>
                <label class="toggle">
                  <input type="checkbox" .checked=${!!this.slot.enable_click} @change=${(t) => p("enable_click", t.target.checked)}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <!-- === NEUER BLOCK: GLOBAL ENTITIES === -->
              <div class="col" style="margin-top: 12px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <div class="row" style="margin-bottom: 12px;">
                  <label style="font-weight: 600;">Globale Entitäten (Alias)</label>
                  <div style="cursor: pointer; background: var(--primary-color, #03a9f4); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;" @click="${() => this._addGlobalEntity()}">
                    + Hinzufügen
                  </div>
                </div>
                
                <ha-sortable handle-selector=".handle" @item-moved=${this._handleSort}>
                  <div class="global-entities-list" style="display: flex; flex-direction: column; gap: 8px;">
                    ${(this.slot.global_entities || []).map((t, i) => _`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="display: flex; justify-content: space-between; align-items: center; padding: 8px;">
                          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <ha-icon class="handle" icon="mdi:drag" style="cursor: grab; color: var(--secondary-text-color);"></ha-icon>
                            <span style="font-weight: normal; font-size: 13px; line-height: 1.2;">
                              ${(() => {
        var a, c;
        const r = t.entity ? this.hass.states[t.entity] : null, u = t.alias || ((a = r == null ? void 0 : r.attributes) == null ? void 0 : a.friendly_name) || t.entity || "Neuer Alias";
        if (!r) return u;
        let n = r.state;
        t.attribute && r.attributes[t.attribute] !== void 0 && (n = r.attributes[t.attribute]);
        const l = !t.attribute && ((c = r.attributes) != null && c.unit_of_measurement) ? ` ${r.attributes.unit_of_measurement}` : "", d = t.attribute ? ` (${t.attribute})` : "";
        return _`<strong>${u}</strong>${d}: ${n}${l}`;
      })()}
                            </span>
                          </div>
                          <ha-icon icon="mdi:delete" style="cursor: pointer; color: var(--error-color, #db4437); --mdc-icon-size: 18px;" @click=${(r) => {
        r.preventDefault(), this._deleteGlobalEntity(i);
      }}></ha-icon>
                        </summary>
                        <div class="inner-content" style="padding-top: 8px;">
                          <div class="col">
                            <label>Alias Name</label>
                            <input type="text" .value=${t.alias || ""} @input=${(r) => this._updateGlobalEntity(i, "alias", r.target.value)}>
                          </div>
                          <div class="col" style="margin-top: 8px;">
                            <label>Entität</label>
                            <ha-selector
                              .hass=${this.hass}
                              .selector=${{ entity: {} }}
                              .value=${t.entity}
                              @value-changed=${(r) => this._updateGlobalEntity(i, "entity", r.detail.value)}>
                            </ha-selector>
                          </div>
                          <div class="col" style="margin-top: 8px;">
                            <label>Attribut (optional)</label>
                            <div style="display: flex; align-items: center; gap: 8px;">
                              
                              <ha-selector
                                style="flex: 1; width: 100%;"
                                .hass=${this.hass}
                                .selector=${{ attribute: { entity_id: t.entity } }}
                                .value=${t.attribute}
                                @value-changed=${(r) => this._updateGlobalEntity(i, "attribute", r.detail.value)}>
                              </ha-selector>
                              
                              ${t.attribute ? _`
                                <ha-icon 
                                  icon="mdi:close-circle" 
                                  title="Attribut leeren"
                                  @click=${() => this._updateGlobalEntity(i, "attribute", "")}
                                  style="cursor: pointer; color: var(--secondary-text-color); --mdc-icon-size: 24px; padding: 4px;">
                                </ha-icon>
                              ` : ""}
                              
                            </div>
                          </div>

                        </div>
                      </details>
                    `)}
                  </div>
                </ha-sortable>
              </div>
              <!-- === ENDE NEUER BLOCK === -->

            </div>
          </details>
            
          <details class="inner-section" ?open=${this._expanded.dim} @toggle=${(t) => this._expanded = { ...this._expanded, dim: t.target.open }}>
            <summary>── Karte & Dimensionen <span style="font-size:10px;">▼</span></summary>
            <div class="inner-content">
              <div class="row">
                <label>Karten-Form</label>
                <select @change=${(t) => p("layout_shape", t.target.value)}>
                  <option value="rectangle" ?selected=${this.slot.layout_shape === "rectangle"}>Rechteckig</option>
                  <option value="pill" ?selected=${this.slot.layout_shape === "pill"}>Pille (Rund)</option>
                </select>
              </div>
              <div class="col">
                <label>Ecken-Radius (px)</label>
                <div style="display:flex; gap:8px; align-items:center;">
                  <input type="range" min="0" max="100" step="1" style="flex:1;" .value=${this.slot.border_radius ?? 12} @input=${(t) => p("border_radius", parseInt(t.target.value))}>
                  <input type="number" min="0" max="100" style="width:64px;" .value=${this.slot.border_radius ?? 12} @input=${(t) => p("border_radius", parseInt(t.target.value))}>
                </div>
              </div>

              <div class="row" style="margin-top: 8px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <label>Breite responsiv (HA Layout)</label>
                <label class="toggle"><input type="checkbox" .checked=${this.slot.card_width_responsive !== !1} @change=${(t) => p("card_width_responsive", t.target.checked)}><span class="toggle-slider"></span></label>
              </div>
              ${this.slot.card_width_responsive === !1 ? _`
                <div class="col">
                  <label>Breite absolut (px oder %)</label>
                  <input type="text" placeholder="z.B. 200px" .value=${this.slot.card_width || ""} @input=${(t) => p("card_width", t.target.value)}>
                </div>
              ` : ""}

              <div class="row" style="margin-top: 8px; border-top: 1px dashed var(--divider-color,#444); padding-top: 12px;">
                <label>Höhe responsiv (HA Layout)</label>
                <label class="toggle"><input type="checkbox" .checked=${this.slot.card_height_responsive === !0} @change=${(t) => p("card_height_responsive", t.target.checked)}><span class="toggle-slider"></span></label>
              </div>
              ${this.slot.card_height_responsive !== !0 ? _`
                <div class="col">
                  <label>Höhe absolut (px)</label>
                  <input type="number" placeholder="z.B. 80" .value=${this.slot.card_height || ""} @input=${(t) => p("card_height", parseInt(t.target.value))}>
                </div>
              ` : ""}
            </div>
          </details>

        </div>
      `;
    }
  }
  customElements.get("sc-core-editor") || customElements.define("sc-core-editor", s);
  function e(o, p, t) {
    return _`<sc-core-editor .commitFn=${o} .hass=${p} .slot=${t}></sc-core-editor>`;
  }
  return { renderCustomBlock: e };
})());
function Bt(s) {
  const e = { empty: "Leer", icon: "Icon", name: "Entitäts-Name", state: "Zustand (Wert)" }, o = Array.isArray(s.gauges) ? s.gauges.length : s.gauge_active ? 1 : 0;
  for (let p = 0; p < o; p++) e[`gauge_${p}`] = `Gauge ${p + 1}`;
  return Array.isArray(s.labels_list) && s.labels_list.forEach((p, t) => {
    e[`label_${t}`] = `Label: ${p.label_text || p.entity || t + 1}`;
  }), e;
}
function Gt(s) {
  const e = [
    { id: "none", label: "— Bitte Ziel wählen —" },
    { id: "main", label: "Hauptkarte (Gesamter Hintergrund)" }
  ], o = Bt(s);
  return Array.isArray(s.layout_rows) && s.layout_rows.forEach((p, t) => {
    p.cells.forEach((i, r) => {
      const u = o[i.content] || "Leer";
      e.push({ id: `r${t}c${r}`, label: `Z${t + 1}C${r + 1} (${u})` });
    });
  }), e;
}
class jt extends Be {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      _expanded: { type: Object, state: !0 }
    };
  }
  constructor() {
    super(), this._expanded = {};
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
      .pattern-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 10px; position: relative; }
      .pattern-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; }
      .pattern-content { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; margin-top: 8px; border-top: 1px dashed var(--divider-color, #333); }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
      .col { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
      select, input[type="text"], input[type="number"], input[type="range"] { background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; }
      ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
      .toggle-icon { font-size: 10px; margin-right: 8px; display: inline-block; width: 12px; text-align: center; }
      .color-list { display: flex; flex-direction: column; gap: 6px; background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color, #333); }
      .color-item { display: flex; flex-direction: column; gap: 4px; padding: 6px; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; background: rgba(255,255,255,0.02); }
      .color-item-row { display: flex; align-items: center; gap: 8px; }
      .color-item-row input[type="color"], .color-row input[type="color"] { width: 40px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; }
      .del-color-btn { background: none; border: none; color: #f44; cursor: pointer; font-size: 16px; padding: 0 4px; }
      .add-color-btn { background: rgba(3,169,244,0.1); border: 1px solid var(--primary-color); color: var(--primary-color); padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; font-weight: bold; flex: 1; }
      .action-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--divider-color,#555); color: var(--primary-text-color); padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; flex: 1; font-weight: bold; }
      .action-btn:hover { background: rgba(255,255,255,0.1); }
      .color-row { display: flex; gap: 6px; align-items: center; }
      .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; margin-bottom: -4px; margin-top: 8px; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
      .info-text { font-size: 11px; color: var(--secondary-text-color); margin-top: -8px; margin-bottom: 4px; }
      ha-selector { width: 100%; }
      .pos-preview-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; width: 100%; margin: 8px 0; }
      .pos-preview { width: 140px; height: 140px; background: #111; border: 1px solid var(--divider-color,#555); border-radius: 8px; position: relative; overflow: hidden; cursor: crosshair; touch-action: none; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
      .pos-dot { position: absolute; width: 12px; height: 12px; background: var(--primary-color,#03a9f4); border-radius: 50%; transform: translate(-50%,-50%); box-shadow: 0 0 10px var(--primary-color), inset 0 0 4px rgba(255,255,255,0.8); pointer-events: none; }
      .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--divider-color,#555); color: var(--secondary-text-color); width: 36px; height: 36px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .icon-btn:hover { background: rgba(255,255,255,0.1); color: var(--primary-color); border-color: var(--primary-color); }
      option:disabled { color: rgba(255,255,255,0.3); font-style: italic; }
    `;
  }
  _commit(e) {
    this.dispatchEvent(new CustomEvent("color-update", { detail: { color_patterns: e } }));
  }
  _toggle(e, o) {
    o && o.stopPropagation(), this._expanded = { ...this._expanded, [e]: !this._expanded[e] };
  }
  render() {
    if (!this.slot) return _``;
    const e = Array.isArray(this.slot.color_patterns) ? this.slot.color_patterns : [], o = Gt(this.slot), p = e.map((t) => t.target).filter((t) => t !== "none");
    return _`
      <details class="inner-section">
        <summary>🎨 Farben, Pattern &amp; Animationen <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${e.map((t, i) => {
      var v, b;
      const r = !!this._expanded[t.id], u = ((v = o.find((g) => g.id === t.target)) == null ? void 0 : v.label) || "Unbekanntes Ziel", n = ["ripple", "waves"].includes(t.animation), l = ["wobble_radial", "wobble_linear"].includes(t.animation), d = n || l, a = t.bg_type === "radial" || t.animation === "ripple" || t.animation === "wobble_radial", c = t.bg_type === "linear" || t.animation === "waves" || t.animation === "wobble_linear", h = t.border_radius_auto === void 0 ? t.target === "main" : t.border_radius_auto;
      return _`
              <div class="pattern-card">
                <div class="pattern-header" @click=${(g) => this._toggle(t.id, g)}>
                  <div>
                    <span class="toggle-icon">${r ? "▼" : "▶"}</span>
                    <span style="color:${t.enabled ? "var(--primary-text-color)" : "var(--secondary-text-color)"}">${t.name || "Neues Pattern"}</span>
                    <span style="font-size:10px;color:${t.target === "none" ? "#f44" : "var(--secondary-text-color)"};margin-left:8px;font-weight:normal">(${u})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!t.enabled}
                      @click=${(g) => g.stopPropagation()}
                      @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].enabled = g.target.checked, this._commit(m);
      }}>
                    </ha-switch>
                    
                    <button type="button" title="Klonen" @click=${(g) => {
        g.preventDefault(), g.stopPropagation();
        const m = JSON.parse(JSON.stringify(e)), f = JSON.parse(JSON.stringify(t));
        f.id = Date.now(), f.target = "none", f.name = (f.name || "Pattern") + " (Kopie)", m.splice(i + 1, 0, f), this._commit(m), this._expanded = { ...this._expanded, [f.id]: !0 };
      }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>

                    <button @click=${(g) => {
        g.stopPropagation();
        const m = [...e];
        m.splice(i, 1), this._commit(m);
      }}
                      style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${r ? _`
                  <div class="pattern-content" style="display:flex; flex-direction:column; gap:8px;">
                    <div class="col">
                      <label>Name (Intern)</label>
                      <input type="text" .value=${t.name || ""} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].name = g.target.value, this._commit(m);
      }}>
                    </div>
                    <div class="row">
                      <label>Ziel-Container</label>
                      <select style="width:60%" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].target = g.target.value, this._commit(m);
      }}>
                        ${o.map((g) => {
        const m = g.id !== "none" && g.id !== t.target && p.includes(g.id);
        return _`<option value=${g.id} ?selected=${t.target === g.id} ?disabled=${m}>
                            ${g.label} ${m ? "(Bereits belegt)" : ""}
                          </option>`;
      })}
                      </select>
                    </div>

                    <details class="inner-section"  style="margin-top: 4px; margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>🎨 Design &amp; Farben</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="row">
                          <label>Automatischer Eckradius</label>
                          <ha-switch .checked=${h}
                            @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].border_radius_auto = g.target.checked, this._commit(m);
      }}>
                          </ha-switch>
                        </div>

                        ${h ? "" : _`
                          <div class="row">
                            <label>Eckradius (Manuell)</label>
                            <div style="display:flex;width:60%;gap:4px">
                              <input type="number" style="flex:1" .value=${t.border_radius ?? ""} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].border_radius = g.target.value, this._commit(m);
      }}>
                              <select style="width:60px" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].border_radius_unit = g.target.value, this._commit(m);
      }}>
                                <option value="px" ?selected=${t.border_radius_unit === "px"}>px</option>
                                <option value="%" ?selected=${t.border_radius_unit === "%"}>%</option>
                              </select>
                            </div>
                          </div>
                        `}

                        ${d ? _`
                          <div class="info-text" style="margin-top:0;">Die Farben werden dynamisch durch den Effekt berechnet.</div>
                          <div class="row"><label>Anzahl (Dichte)</label>
                            <input type="range" min="1" max="20" style="width:60%" .value=${t.wave_count ?? 3}
                              @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_count = parseInt(g.target.value), this._commit(m);
      }}>
                          </div>
                          <div class="row"><label>Balance (Hügel vs. Tal)</label>
                            <input type="range" min="5" max="95" style="width:60%" .value=${t.wave_balance ?? 50}
                              @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_balance = parseInt(g.target.value), this._commit(m);
      }}>
                          </div>
                          <div class="col"><label>Farbe Linie/Welle (Hügel)</label>
                            <div class="color-row">
                              <input type="color" .value=${t.wave_c1 || "#03a9f4"} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_c1 = g.target.value, this._commit(m);
      }}>
                              <input type="text" .value=${t.wave_c1 || "#03a9f4"} style="flex:1" @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_c1 = g.target.value, this._commit(m);
      }}>
                            </div>
                          </div>
                          <div class="col"><label>Farbe Hintergrund (Tal)</label>
                            <div class="color-row">
                              <input type="color" .value=${t.wave_c2 || "#transparent"} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_c2 = g.target.value, this._commit(m);
      }}>
                              <input type="text" .value=${t.wave_c2 || "transparent"} style="flex:1" @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_c2 = g.target.value, this._commit(m);
      }}>
                            </div>
                          </div>
                          <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:4px;">Vorschau Gradient</div>
                          <div style="height:10px;border-radius:5px; background:${c ? `repeating-linear-gradient(${t.gradient_angle ?? 90}deg, ${t.wave_c1 || "#03a9f4"} 0%, ${t.wave_c2 || "transparent"} 50%, ${t.wave_c1 || "#03a9f4"} 100%)` : `repeating-radial-gradient(circle at ${t.radial_x ?? 50}% ${t.radial_y ?? 50}%, ${t.wave_c1 || "#03a9f4"} 0%, ${t.wave_c2 || "transparent"} 50%, ${t.wave_c1 || "#03a9f4"} 100%)`}"></div>
                        ` : _`
                          ${t.animation !== "fluid" ? _`
                            <div class="row"><label>Hintergrund-Typ</label>
                              <select style="width:60%" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].bg_type = g.target.value, this._commit(m);
      }}>
                                <option value="solid"          ?selected=${t.bg_type === "solid"}>Einfarbig (Statisch)</option>
                                <option value="solid_gradient" ?selected=${t.bg_type === "solid_gradient"}>Einfarbig (Dynamisch aus Verlauf)</option>
                                <option value="linear"         ?selected=${t.bg_type === "linear"}>Verlauf (Linear)</option>
                                <option value="radial"         ?selected=${t.bg_type === "radial"}>Verlauf (Radial)</option>
                              </select>
                            </div>
                          ` : _`
                            <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:4px;">🌊 Fluid Modus (Dynamisches Mesh)</div>
                            <div class="info-text" style="color:var(--secondary-text-color); margin-top:0;">Generiert eine endlose, organisch fließende Vektor-Animation.</div>
                            <div class="row" style="margin-top:4px;">
                              <label>Fluid-Stil (Viskosität)</label>
                              <select style="width:60%" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].fluid_style = g.target.value, this._commit(m);
      }}>
                                <option value="aurora" ?selected=${!t.fluid_style || t.fluid_style === "aurora"}>Aurora (Sanftes Mesh, GentleRain)</option>
                                <option value="gooey"  ?selected=${t.fluid_style === "gooey"}>Flüssigkeit (Lava/Wasser, WbONyK)</option>
                                <option value="smoke"     ?selected=${t.fluid_style === "smoke"}>Rauch / Nebel</option>
                                <option value="particles" ?selected=${t.fluid_style === "particles"}>Partikel / Sternenstaub</option>
                                </select>
                            </div>
                          `}

                          <div class="col"><label>Farben</label>
                            <div class="color-list">
                              ${t.colors.map((g, m) => {
        var $;
        const f = Math.round(100 / (t.colors.length > 1 ? t.colors.length - 1 : 1) * m), y = (($ = t.stops) == null ? void 0 : $[m]) ?? f;
        return _`
                                  <div class="color-item">
                                    <div class="color-item-row">
                                      <input type="color" .value=${g} @input=${(w) => {
          const S = JSON.parse(JSON.stringify(e));
          S[i].colors[m] = w.target.value, this._commit(S);
        }}>
                                      <input type="text"  .value=${g} style="flex:1" @input=${(w) => {
          const S = JSON.parse(JSON.stringify(e));
          S[i].colors[m] = w.target.value, this._commit(S);
        }}>
                                      ${t.colors.length > 1 && (t.bg_type !== "solid" || t.animation === "fluid") ? _`<button class="del-color-btn" @click=${() => {
          const w = JSON.parse(JSON.stringify(e));
          w[i].colors.splice(m, 1), w[i].stops && w[i].stops.splice(m, 1), this._commit(w);
        }}>✕</button>` : ""}
                                    </div>
                                    ${t.bg_type !== "solid" || t.animation === "fluid" ? _`
                                      <div class="color-item-row" style="padding:2px 4px 0 4px;border-top:1px solid rgba(255,255,255,0.05);margin-top:4px">
                                        <span style="font-size:10px;color:var(--secondary-text-color)">${t.animation === "fluid" ? "Radius (Größe)" : "Stopp"}</span>
                                        <input type="range" min="0" max="100" style="flex:1" .value=${y}
                                          @input=${(w) => {
          const S = JSON.parse(JSON.stringify(e));
          S[i].stops || (S[i].stops = S[i].colors.map((x, k) => Math.round(100 / (S[i].colors.length > 1 ? S[i].colors.length - 1 : 1) * k))), S[i].stops[m] = parseInt(w.target.value), this._commit(S);
        }}>
                                        <span style="font-size:10px;width:24px;text-align:right">${y}%</span>
                                      </div>` : ""}
                                  </div>`;
      })}
                            </div>
                            ${t.bg_type !== "solid" || t.animation === "fluid" ? _`
                              <div style="display:flex;gap:6px">
                                <button class="add-color-btn" @click=${() => {
        const g = JSON.parse(JSON.stringify(e));
        g[i].colors.push("#03a9f4"), g[i].stops && g[i].stops.push(100), this._commit(g);
      }}>＋ Weitere Farbe</button>
                                ${t.colors.length > 1 ? _`<button class="action-btn" @click=${() => {
        const g = JSON.parse(JSON.stringify(e)), m = g[i].colors.length;
        g[i].stops = g[i].colors.map((f, y) => Math.round(100 / (m - 1) * y)), this._commit(g);
      }}>⟷ Stopps verteilen</button>` : ""}
                              </div>
                              ${t.colors.length > 1 && t.animation !== "fluid" ? _`
                              <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:8px;">Vorschau Gradient</div>
                              <div style="height:10px;border-radius:5px;
                                background:linear-gradient(${t.bg_type === "radial" ? `circle at ${t.radial_x ?? 50}% ${t.radial_y ?? 50}%` : `${t.gradient_angle ?? 90}deg`},
                                ${t.colors.map((g, m) => {
        var f;
        return `${g} ${((f = t.stops) == null ? void 0 : f[m]) ?? Math.round(100 / (t.colors.length - 1) * m)}%`;
      }).join(",")})"></div>` : ""}
                            ` : ""}
                          </div>
                        `}

                        ${c ? _`
                          <div class="row" style="margin-top:8px;"><label>Winkel (Grad)</label>
                            <input type="range" min="0" max="360" style="width:60%" .value=${t.gradient_angle ?? 90}
                              @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].gradient_angle = parseInt(g.target.value), this._commit(m);
      }}>
                          </div>` : ""}

                        <div class="row">
                          <label>Deckkraft (%)</label>
                          <input type="range" min="0" max="100" style="width:60%" .value=${t.opacity ?? 100}
                            @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].opacity = parseInt(g.target.value), this._commit(m);
      }}>
                        </div>
                      </div>
                    </details>

                    ${t.bg_type === "solid_gradient" && t.animation !== "fluid" ? _`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>📊 Datenquelle für Farbberechnung</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">

                          <div class="col" style="margin-bottom: 4px;">
                            <label style="font-size:11px; color:var(--secondary-text-color);">Datenquelle</label>
                            <select style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].global_id = g.target.value, this._commit(m);
      }}>
                              <option value="manual" ?selected=${t.global_id === "manual" || !t.global_id}>Manuelle Auswahl</option>
                              ${(((b = this.slot) == null ? void 0 : b.global_entities) || []).map((g) => {
        var x, k;
        const m = g.entity ? this.hass.states[g.entity] : null, f = g.alias || ((x = m == null ? void 0 : m.attributes) == null ? void 0 : x.friendly_name) || g.entity || "Unbenannt";
        let y = m ? m.state : "-";
        m && g.attribute && m.attributes[g.attribute] !== void 0 && (y = m.attributes[g.attribute]);
        const $ = !g.attribute && ((k = m == null ? void 0 : m.attributes) != null && k.unit_of_measurement) ? ` ${m.attributes.unit_of_measurement}` : "", w = g.attribute ? ` (${g.attribute})` : "", S = `[${g.alias || "Alias"}] ${f}${w}: ${y}${$}`;
        return _`<option value=${g.id} ?selected=${t.global_id === g.id}>${S}</option>`;
      })}
                            </select>
                          </div>

                          ${!t.global_id || t.global_id === "manual" ? _`
                            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333);">
                              <ha-selector .hass=${this.hass} .selector=${{ entity: {} }}
                                .value=${t.gradient_entity || ""} .label=${"Entität (Wertquelle)"}
                                @value-changed=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].gradient_entity = g.detail.value, this._commit(m);
      }}>
                              </ha-selector>
                              <div style="margin-top:8px;">
                                <ha-selector .hass=${this.hass}
                                  .selector=${{ attribute: { entity_id: t.gradient_entity || "" } }}
                                  .value=${t.gradient_entity_attribute || ""} .label=${"Attribut (optional)"}
                                  @value-changed=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].gradient_entity_attribute = g.detail.value || void 0, this._commit(m);
      }}>
                                </ha-selector>
                              </div>
                            </div>
                          ` : ""}

                          <div class="row" style="margin-top:4px; gap:12px;">
                            <div class="col" style="flex:1;">
                              <label style="font-size:11px; color:var(--secondary-text-color);">Min (0%)</label>
                              <input type="number" step="0.1" .value=${t.gradient_entity_min ?? 0}
                                @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].gradient_entity_min = parseFloat(g.target.value), this._commit(m);
      }}>
                            </div>
                            <div class="col" style="flex:1;">
                              <label style="font-size:11px; color:var(--secondary-text-color);">Max (100%)</label>
                              <input type="number" step="0.1" .value=${t.gradient_entity_max ?? 100}
                                @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].gradient_entity_max = parseFloat(g.target.value), this._commit(m);
      }}>
                            </div>
                          </div>
                        </div>
                      </details>
                    ` : ""}

                    ${a ? _`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>📍 Zentrum / Ursprung</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">
                          <div class="info-text" style="margin-top:0;">Tippe oder ziehe in der Box, um den Startpunkt frei zu verschieben.</div>
                          <div class="pos-preview-wrap">
                            <div class="pos-preview"
                              @pointerdown=${(g) => {
        g.stopPropagation(), g.currentTarget.setPointerCapture(g.pointerId);
        const m = (f) => {
          f.stopPropagation();
          const y = f.currentTarget.getBoundingClientRect();
          let $ = Math.round(Math.max(0, Math.min(f.clientX - y.left, y.width)) / y.width * 100), w = Math.round(Math.max(0, Math.min(f.clientY - y.top, y.height)) / y.height * 100);
          if ($ !== (t.radial_x ?? 50) || w !== (t.radial_y ?? 50)) {
            const S = JSON.parse(JSON.stringify(e));
            S[i].radial_x = $, S[i].radial_y = w, this._commit(S);
          }
        };
        m(g), g.currentTarget.onpointermove = m;
      }}
                              @pointerup=${(g) => {
        g.stopPropagation(), g.currentTarget.onpointermove = null, g.currentTarget.releasePointerCapture(g.pointerId);
      }}
                              @pointercancel=${(g) => {
        g.stopPropagation(), g.currentTarget.onpointermove = null;
      }}>
                              <div class="pos-dot" style="left:${t.radial_x ?? 50}%;top:${t.radial_y ?? 50}%"></div>
                            </div>
                            <button class="icon-btn" title="Mitte zentrieren (50/50)"
                              @click=${() => {
        const g = JSON.parse(JSON.stringify(e));
        g[i].radial_x = 50, g[i].radial_y = 50, this._commit(g);
      }}>
                              <ha-icon icon="mdi:crosshairs-gps" style="--mdc-icon-size:20px"></ha-icon>
                            </button>
                          </div>
                          <div class="row">
                            <div class="col" style="flex:1;margin-right:8px">
                              <label style="font-size:10px">X-Achse (${t.radial_x ?? 50}%)</label>
                              <input type="range" min="0" max="100" .value=${t.radial_x ?? 50} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].radial_x = parseInt(g.target.value), this._commit(m);
      }}>
                            </div>
                            <div class="col" style="flex:1">
                              <label style="font-size:10px">Y-Achse (${t.radial_y ?? 50}%)</label>
                              <input type="range" min="0" max="100" .value=${t.radial_y ?? 50} @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].radial_y = parseInt(g.target.value), this._commit(m);
      }}>
                            </div>
                          </div>
                        </div>
                      </details>
                    ` : ""}

                    <details class="inner-section" style="margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>⚙️ Bedingung: Hintergrund anzeigen</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="info-text" style="margin-top:0;">Ohne Bedingung ist der Hintergrund permanent sichtbar.</div>
                        <ha-selector .hass=${this.hass} .selector=${{ condition: {} }} .value=${t.bg_condition}
                          @value-changed=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].bg_condition = g.detail.value, this._commit(m);
      }}>
                        </ha-selector>
                      </div>
                    </details>

                    <details class="inner-section" style="margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>🎬 Animation &amp; Modus</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="row"><label>Effekt</label>
                          <select style="width:60%" @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].animation = g.target.value, this._commit(m);
      }}>
                            <option value="none"           ?selected=${t.animation === "none"}>Keine (Nur Hintergrund)</option>
                            <option value="pulse"          ?selected=${t.animation === "pulse"}>Pulsieren (Opacity)</option>
                            <option value="pump"           ?selected=${t.animation === "pump"}>Pumpen (Scale In/Out)</option>
                            <option value="ripple"         ?selected=${t.animation === "ripple"}>Ringe (Konzentrisch)</option>
                            <option value="waves"          ?selected=${t.animation === "waves"}>Wellen (Linear wandernd)</option>
                            <option value="wobble_radial"  ?selected=${t.animation === "wobble_radial"}>Wassertropfen (Radial ausklingend)</option>
                            <option value="wobble_linear"  ?selected=${t.animation === "wobble_linear"}>Schockwelle (Linear ausklingend)</option>
                            <option value="fluid"          ?selected=${t.animation === "fluid"}>Flüssigkeit (Waberndes Mesh)</option>
                          </select>
                        </div>
                        
                        ${l ? _`
                          <div class="row" style="background:rgba(3,169,244,0.1); padding:8px; border-radius:6px; margin-top:4px;">
                            <div class="col" style="width:100%; gap:12px;">
                              <div class="row" style="margin:0"><label>Start-Amplitude (Kontrast)</label>
                                <input type="range" min="1" max="100" style="width:60%" .value=${t.wobble_amplitude ?? 100}
                                  @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wobble_amplitude = parseInt(g.target.value), this._commit(m);
      }}>
                              </div>
                              <div class="row" style="margin:0"><label>Reichweite (Ausbreitung)</label>
                                <input type="range" min="1" max="10" style="width:60%" .value=${t.wobble_freq ?? 4}
                                  @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wobble_freq = parseInt(g.target.value), this._commit(m);
      }}>
                              </div>
                              <div class="row" style="margin:0"><label>Pause nach Effekt (Sek.)</label>
                                <input type="range" step="0.5" min="0" max="10" style="width:60%" .value=${t.wobble_pause ?? 2}
                                  @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wobble_pause = parseFloat(g.target.value), this._commit(m);
      }}>
                              </div>
                            </div>
                          </div>
                        ` : ""}

                        ${t.animation !== "none" ? _`
                          <div class="row" style="margin-top:4px"><label>${l ? "Ausklingzeit (Dauer in Sek.)" : "Geschwindigkeit (Sek.)"}</label>
                            <input type="range" step="0.1" min="0.5" max="20" style="width:60%" .value=${t.anim_duration ?? 3}
                              @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].anim_duration = parseFloat(g.target.value), this._commit(m);
      }}>
                          </div>` : ""}

                        ${t.animation === "pump" ? _`
                          <div class="row"><label>Pump-Ausdehnung</label>
                            <input type="range" step="0.001" min="1.0" max="1.2" style="width:60%" .value=${t.pump_scale ?? 1.1}
                              @input=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].pump_scale = parseFloat(g.target.value), this._commit(m);
      }}>
                          </div>` : ""}

                        ${n ? _`
                          <div class="row"><label>Richtung umkehren</label>
                            <ha-switch .checked=${!!t.wave_invert}
                              @change=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].wave_invert = g.target.checked, this._commit(m);
      }}>
                            </ha-switch>
                          </div>` : ""}
                      </div>
                    </details>

                    ${t.animation !== "none" ? _`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>⚙️ Bedingung: Animation ausführen</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">
                          <div class="info-text" style="margin-top:0;">Ohne Bedingung ist die Animation permanent aktiv.</div>
                          <ha-selector .hass=${this.hass} .selector=${{ condition: {} }} .value=${t.anim_condition}
                            @value-changed=${(g) => {
        const m = JSON.parse(JSON.stringify(e));
        m[i].anim_condition = g.detail.value, this._commit(m);
      }}>
                          </ha-selector>
                        </div>
                      </details>
                    ` : ""}

                  </div>
                ` : ""}
              </div>
            `;
    })}
          <button class="add-btn" @click=${() => {
      const t = [...e], i = Date.now();
      t.push({
        id: i,
        enabled: !0,
        name: "Neues Pattern",
        target: "none",
        bg_condition: [],
        anim_condition: [],
        bg_type: "solid",
        colors: ["#ff9800"],
        stops: [100],
        opacity: 100,
        gradient_angle: 90,
        animation: "none",
        anim_duration: 3,
        wave_count: 3,
        wave_c1: "#03a9f4",
        wave_c2: "transparent",
        border_radius: "",
        border_radius_unit: "px",
        wave_invert: !1,
        pump_scale: 1.1,
        radial_x: 50,
        radial_y: 50,
        wave_balance: 50,
        wobble_amplitude: 100,
        wobble_freq: 4,
        wobble_pause: 2
      }), this._commit(t), this._expanded = { ...this._expanded, [i]: !0 };
    }}>＋ Neues Pattern hinzufügen</button>
        </div>
      </details>
    `;
  }
}
customElements.get("sc-color-editor") || customElements.define("sc-color-editor", jt);
class qt extends Be {
  static get properties() {
    return { cssText: { type: String } };
  }
  createRenderRoot() {
    return this;
  }
  render() {
    return _`<style>${this.cssText || ""}</style>`;
  }
}
customElements.get("sc-color-styler") || customElements.define("sc-color-styler", qt);
window.SupercardModules.color = /* @__PURE__ */ (() => {
  const s = (u) => {
    const n = u.replace("#", "");
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }, e = (u, n, l) => "#" + [u, n, l].map((d) => Math.round(d).toString(16).padStart(2, "0")).join("");
  function o(u, n) {
    const l = [...u].sort((a, c) => a.pos - c.pos), d = n * 100;
    if (d <= l[0].pos) return l[0].color;
    if (d >= l[l.length - 1].pos) return l[l.length - 1].color;
    for (let a = 0; a < l.length - 1; a++) {
      const c = l[a], h = l[a + 1];
      if (d >= c.pos && d <= h.pos) {
        const v = (d - c.pos) / (h.pos - c.pos), [b, g, m] = s(c.color), [f, y, $] = s(h.color);
        return e(b + (f - b) * v, g + (y - g) * v, m + ($ - m) * v);
      }
    }
    return l[l.length - 1].color;
  }
  function p(u, n) {
    if (!n) return !0;
    if (Array.isArray(n))
      return n.length === 0 ? !0 : n.every((l) => p(u, l));
    if (!n.condition) return !0;
    try {
      if (n.condition === "state") {
        const l = u.states[n.entity_id];
        if (!l) return !1;
        const d = n.attribute ? l.attributes[n.attribute] : l.state;
        return String(d).toLowerCase() === String(n.state).toLowerCase();
      }
      if (n.condition === "numeric_state") {
        const l = u.states[n.entity_id];
        if (!l) return !1;
        const d = parseFloat(n.attribute ? l.attributes[n.attribute] : l.state);
        return !(isNaN(d) || n.above !== void 0 && n.above !== "" && d <= parseFloat(n.above) || n.below !== void 0 && n.below !== "" && d >= parseFloat(n.below));
      }
      if (n.condition === "and") return (n.conditions || []).every((l) => p(u, l));
      if (n.condition === "or") return (n.conditions || []).some((l) => p(u, l));
      if (n.condition === "not") {
        const l = n.conditions && n.conditions.length > 0 ? n.conditions[0] : null;
        return l ? !p(u, l) : !0;
      }
    } catch {
      return !1;
    }
    return !0;
  }
  function t({ hass: u, config: n }) {
    const l = Array.isArray(n.color_patterns) ? n.color_patterns : [];
    let d = "";
    return d += `@keyframes sc-pattern-pulse {
      0%, 100% { opacity: var(--pat-op, 1); }
      50%       { opacity: calc(var(--pat-op, 1) * 0.3); }
    }
`, l.some((c) => c.enabled && c.target === "main") && (d += `
        ha-card { position: relative !important; background: transparent !important; border: none !important; box-shadow: none !important; }
      
`), d += `
      .supercard-container { position: relative !important; z-index: 500 !important; background: transparent !important; }
    
`, l.forEach((c, h) => {
      if (!c.enabled || c.target === "none") return;
      const v = c.bg_condition && Object.keys(c.bg_condition).length > 0 ? p(u, c.bg_condition) : !0, b = c.anim_condition && Object.keys(c.anim_condition).length > 0 ? p(u, c.anim_condition) : !0;
      if (!v) return;
      let g = "";
      const m = c.target === "main";
      if (m)
        g = "ha-card::before";
      else {
        const L = c.target.match(/r(\d+)c(\d+)/);
        if (L) {
          const z = `sc-layout-renderer::part(cell-${L[1]}-${L[2]})`;
          g = `${z}::before`, d += `
            ${z} {
              position: relative !important;
              z-index: 510 !important; 
              background: transparent !important;
            }
          
`;
        }
      }
      if (!g) return;
      let f = "transparent", y = "none";
      const $ = c.anim_duration || 3, w = ["ripple", "waves"].includes(c.animation), S = ["wobble_radial", "wobble_linear"].includes(c.animation), x = w || S;
      let k = !w && !S;
      const J = c.radial_x ?? 50, A = c.radial_y ?? 50;
      if (x) {
        const z = 100 / (c.wave_count || 3), Ee = (c.wave_balance ?? 50) / 100, X = c.wave_c1 || "#03a9f4", G = c.wave_c2 || "transparent";
        if (S) {
          const xe = (c.wobble_amplitude ?? 100) / 100, Z = c.wobble_freq ?? 4, C = c.wobble_pause ?? 2, se = $, Re = se + C, re = se / Re;
          if (f = G, b) {
            const T = `sc-anim-wobble-${c.id}-${h}`;
            let pe = `@keyframes ${T} {
`;
            const Ne = 60;
            for (let W = 0; W <= Ne; W++) {
              const fe = W / Ne, we = (fe * re * 100).toFixed(1), Ae = Math.pow(1 - fe, 2), Ze = (xe * Ae * 100).toFixed(1), be = `color-mix(in srgb, ${X} ${Ze}%, ${G})`, De = z * (1 - fe * 0.3), B = 1 - Math.pow(1 - fe, 3), K = B * Z * z, ve = K.toFixed(2), Ce = (K + De * Ee).toFixed(2), nt = (K + De).toFixed(2), at = (B * 150).toFixed(1), bt = Math.max(0, at - 15).toFixed(1);
              let R = "";
              if (c.animation === "wobble_linear") {
                const ue = `linear-gradient(${c.gradient_angle ?? 90}deg, transparent ${bt}%, ${G} ${at}%)`, D = `repeating-linear-gradient(${c.gradient_angle ?? 90}deg, ${be} ${ve}%, ${G} ${Ce}%, ${be} ${nt}%)`;
                R = `${ue}, ${D}`;
              } else {
                const ue = `radial-gradient(circle at ${J}% ${A}%, transparent ${bt}%, ${G} ${at}%)`, D = `repeating-radial-gradient(circle at ${J}% ${A}%, ${be} ${ve}%, ${G} ${Ce}%, ${be} ${nt}%)`;
                R = `${ue}, ${D}`;
              }
              pe += `  ${we}% { background: ${R}; }
`;
            }
            C > 0 && (pe += `  100% { background: ${G}; }
`), pe += `}
`, d += pe, y = `${T} ${Re}s infinite linear`;
          }
        } else {
          if (b && c.animation !== "none") {
            const xe = `sc-anim-wave-${c.id}-${h}`;
            let Z = `@keyframes ${xe} {
`;
            for (let C = 0; C <= 100; C += 100 / 240) {
              const Re = (c.wave_invert ? 1 - C / 100 : C / 100) * z, re = Re.toFixed(2), T = (Re + z * Ee).toFixed(2), pe = (Re + z).toFixed(2), Ne = c.animation === "waves" ? `repeating-linear-gradient(${c.gradient_angle || 90}deg, ${X} ${re}%, ${G} ${T}%, ${X} ${pe}%)` : `repeating-radial-gradient(circle at ${J}% ${A}%, ${X} ${re}%, ${G} ${T}%, ${X} ${pe}%)`;
              Z += `  ${C.toFixed(2)}% { background: ${Ne}; }
`;
            }
            Z += `}
`, d += Z, y = `${xe} ${$}s infinite linear`;
          }
          f = c.animation === "waves" ? `repeating-linear-gradient(${c.gradient_angle || 90}deg, ${X} 0%, ${G} ${z * Ee}%, ${X} ${z}%)` : `repeating-radial-gradient(circle at ${J}% ${A}%, ${X} 0%, ${G} ${z * Ee}%, ${X} ${z}%)`;
        }
      } else {
        const L = c.colors && c.colors.length > 0 ? c.colors : ["#000000"], z = c.stops || [], Ee = L.map((X, G) => z[G] !== void 0 ? `${X} ${z[G]}%` : X).join(", ");
        if (c.animation === "fluid") {
          const X = c.fluid_style === "gooey", G = c.fluid_style === "smoke", xe = c.fluid_style === "particles", Z = !X && !G && !xe;
          let C = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' preserveAspectRatio='none'>";
          if (C += "<defs>", X)
            C += `<filter id='goo_${c.id}'>
                      <feGaussianBlur in='SourceGraphic' stdDeviation='15' result='blur'/>
                      <feColorMatrix in='blur' mode='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12' result='goo'/>
                    </filter>`;
          else if (G)
            C += `<filter id='smoke_${c.id}' x='-20%' y='-20%' width='140%' height='140%'>
                      <feTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' result='noise'/>
                      <feDisplacementMap in='SourceGraphic' in2='noise' scale='40' xChannelSelector='R' yChannelSelector='G'/>
                      <feGaussianBlur stdDeviation='12' result='blur'/>
                      <feComponentTransfer><feFuncA type='linear' slope='0.8'/></feComponentTransfer>
                    </filter>`;
          else if (Z) {
            const re = Math.max(4, L.length);
            for (let T = 0; T < re; T++) {
              const pe = L[T % L.length];
              C += `<radialGradient id='gf_${c.id}_${T}' cx='50%' cy='50%' r='50%'>
                        <stop offset='0%' stop-color='${pe}' stop-opacity='1'/>
                        <stop offset='100%' stop-color='${pe}' stop-opacity='0'/>
                      </radialGradient>`;
            }
          }
          C += "</defs>", C += `<rect width='100%' height='100%' fill='${L[0]}'/>`;
          const se = (re) => {
            let T = Math.sin(re) * 1e4;
            return T - Math.floor(T);
          };
          if (xe || G) {
            const re = G ? 12 : 80;
            G && (C += `<g filter='url(#smoke_${c.id})'>`);
            for (let T = 0; T < re; T++) {
              const pe = Math.floor(se(T) * L.length), Ne = L[pe], W = se(T + 10) * 120 - 10, fe = G ? se(T + 20) * 40 - 20 : se(T + 20) * 6 - 3, we = G ? 20 + se(T + 30) * 30 : 0.1 + se(T + 30) * 0.4, Ae = $ * 1.5 + se(T + 40) * ($ * 3), et = $ * 2 + se(T + 50) * ($ * 2), Ze = se(T + 60) * -20, be = G ? 0.4 + se(T + 70) * 0.6 : 0.6 + se(T + 70) * 0.4, De = xe ? `0; ${be}; ${be * 0.2}; ${be}; 0; ${be * 0.8}; 0` : `0; ${be}; ${be}; 0`;
              b ? C += `<circle fill='${Ne}' cx='${W}%' cy='120%' r='${we}%' opacity='0'>
                          <animate attributeName='cy' values='120%; -20%' dur='${Ae}s' begin='${Ze}s' repeatCount='indefinite'/>
                          <animate attributeName='cx' values='${W}%; ${W + fe}%; ${W}%' dur='${et}s' begin='${Ze}s' repeatCount='indefinite'/>
                          <animate attributeName='opacity' values='${De}' dur='${Ae}s' begin='${Ze}s' repeatCount='indefinite'/>
                        </circle>` : C += `<circle fill='${Ne}' cx='${W + fe / 2}%' cy='${100 - se(T) * 100}%' r='${we}%' opacity='${be}'/>`;
            }
            G && (C += "</g>");
          } else {
            const re = Math.max(4, L.length);
            X && (C += `<g filter='url(#goo_${c.id})'>`);
            const T = [11, 13, 17, 19, 23, 29, 31, 37], pe = [13, 17, 19, 23, 29, 31, 37, 41], Ne = [17, 19, 23, 29, 31, 37, 41, 43];
            for (let W = 0; W < re; W++) {
              const fe = W % L.length, we = L[fe], Ae = z[fe] !== void 0 ? z[fe] : X ? 25 : 60, et = T[W % T.length] * ($ / 5), Ze = pe[W % pe.length] * ($ / 5), be = Ne[W % Ne.length] * ($ / 5), De = 10 + W * 15 % 80, B = 80 - W * 25 % 70, K = 50 + W * 35 % 40, ve = 10 + W * 25 % 80, Ce = 80 - W * 15 % 70, nt = 50 + W * 45 % 40, at = `${De}%; ${B}%; ${K}%; ${De}%`, bt = `${ve}%; ${Ce}%; ${nt}%; ${ve}%`, R = `${Ae}%; ${Ae * 1.3}%; ${Ae * 0.8}%; ${Ae}%`, ue = X ? we : `url(#gf_${c.id}_${W})`;
              b ? C += `<circle fill='${ue}' cx='${De}%' cy='${ve}%' r='${Ae}%'>
                            <animate attributeName='cx' values='${at}' dur='${et}s' repeatCount='indefinite'/>
                            <animate attributeName='cy' values='${bt}' dur='${Ze}s' repeatCount='indefinite'/>
                            <animate attributeName='r' values='${R}' dur='${be}s' repeatCount='indefinite'/>
                          </circle>` : C += `<circle fill='${ue}' cx='${De}%' cy='${ve}%' r='${Ae}%'/>`;
            }
            X && (C += "</g>");
          }
          C += "</svg>", f = `url("${`data:image/svg+xml;utf8,${encodeURIComponent(C)}`}")`;
        } else {
          if (c.bg_type === "solid" || c.bg_type === "solid_gradient" ? f = L[0] : c.bg_type === "linear" ? f = `linear-gradient(${c.gradient_angle || 90}deg, ${Ee})` : c.bg_type === "radial" && (f = `radial-gradient(circle at ${J}% ${A}%, ${Ee})`), c.bg_type === "solid_gradient") {
            let X = c.gradient_entity, G = c.gradient_entity_attribute;
            if (c.global_id && c.global_id !== "manual") {
              const Z = (n.global_entities || []).find((C) => C.id === c.global_id);
              Z && (X = Z.entity, G = Z.attribute);
            }
            if (X) {
              const xe = u.states[X];
              if (xe) {
                const Z = G, C = Z ? xe.attributes[Z] : xe.state, se = parseFloat(C), Re = parseFloat(c.gradient_entity_min ?? 0), re = parseFloat(c.gradient_entity_max ?? 100);
                if (!isNaN(se)) {
                  const T = Math.max(0, Math.min(1, (se - Re) / (re - Re || 1))), pe = L.map((Ne, W) => ({
                    color: Ne,
                    pos: z[W] !== void 0 ? z[W] : Math.round(100 / (L.length - 1 || 1) * W)
                  }));
                  f = o(pe, T);
                }
              }
            }
          }
          if (b && c.animation !== "none" && (c.animation === "pulse" && (y = `sc-pattern-pulse ${$}s infinite ease-in-out`), c.animation === "pump")) {
            const X = c.pump_scale || 1.1, G = `sc-anim-pump-${c.id}-${h}`;
            d += `@keyframes ${G} {
  0%, 100% { transform: scale(1); opacity: var(--pat-op, 1); }
  50%       { transform: scale(${X}); opacity: calc(var(--pat-op, 1) * 0.6); }
}
`, y = `${G} ${$}s infinite ease-in-out`;
          }
        }
      }
      const _e = (c.opacity ?? 100) / 100;
      let Pe = c.border_radius_auto;
      Pe === void 0 && (Pe = m);
      let We = "inherit";
      Pe ? m ? We = n.layout_shape !== "rectangle" ? "999px" : n.border_radius !== void 0 ? `${n.border_radius}px` : "var(--ha-card-border-radius, 12px)" : We = "inherit" : c.border_radius !== void 0 && c.border_radius !== "" && (We = `${c.border_radius}${c.border_radius_unit || "px"}`);
      const He = m ? "200" : "-1", rt = k ? " !important" : "", Ve = c.animation === "fluid" ? "background-size: 115% 115% !important;" : "background-size: 100% 100% !important;";
      d += `${g} {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: 0 !important;
  background: ${f}${rt}; 
  ${Ve}
  background-position: center !important;
  background-repeat: no-repeat !important;
  opacity: ${_e}; 
  --pat-op: ${_e};
  animation: ${y};
  z-index: ${He} !important; 
  border-radius: ${We} !important;
  pointer-events: none !important;
  will-change: transform, opacity;
}
`;
    }), {
      cssVars: {},
      classes: { add: [], remove: ["uc-bg-active", "uc-frame-active", "uc-animate"] },
      litOverlay: _`<style>${d}</style>`
    };
  }
  function i(u, n, l) {
    return _`<sc-color-editor .slot=${l} .hass=${n} @color-update=${(d) => u("__merge__", d.detail)}></sc-color-editor>`;
  }
  function r() {
    return [];
  }
  return { update: t, renderCustomBlock: i, editorFields: r };
})();
const ot = (s, e) => {
  const o = parseFloat(s);
  return isNaN(o) ? e : o;
}, Fe = (s, e, o = "px") => {
  if (s == null || s === "") return e;
  const p = String(s).trim();
  return /^-?\d+(\.\d+)?$/.test(p) ? `${p}${o}` : p;
}, Jt = (s) => {
  const e = s.replace("#", "");
  return [parseInt(e.slice(0, 2), 16), parseInt(e.slice(2, 4), 16), parseInt(e.slice(4, 6), 16)];
}, Lt = (s, e, o) => "#" + [s, e, o].map((p) => Math.round(p).toString(16).padStart(2, "0")).join("");
function kt(s) {
  if (!s) return "#000000";
  if (s = s.trim(), s.startsWith("var(")) {
    const e = s.match(/var\(([^),]+)/);
    e && (s = getComputedStyle(document.documentElement).getPropertyValue(e[1].trim()).trim());
  }
  if (s.startsWith("#")) return s;
  if (s.startsWith("rgb")) {
    const e = s.match(/\d+/g);
    if (e && e.length >= 3) return Lt(parseInt(e[0]), parseInt(e[1]), parseInt(e[2]));
  }
  return "#ffffff";
}
function Et(s, e) {
  const o = [...s].sort((t, i) => t.pos - i.pos), p = e * 100;
  if (p <= o[0].pos) return o[0].color;
  if (p >= o[o.length - 1].pos) return o[o.length - 1].color;
  for (let t = 0; t < o.length - 1; t++) {
    const i = o[t], r = o[t + 1];
    if (p >= i.pos && p <= r.pos) {
      const u = (p - i.pos) / (r.pos - i.pos), [n, l, d] = Jt(i.color), [a, c, h] = Jt(r.color);
      return Lt(n + (a - n) * u, l + (c - l) * u, d + (h - d) * u);
    }
  }
  return o[o.length - 1].color;
}
function Wt(s, e, o, p, t) {
  const i = 3 * e, r = 3 * (p - e) - i, u = 1 - i - r, n = 3 * o, l = 3 * (t - o) - n, d = 1 - n - l, a = (b) => ((u * b + r) * b + i) * b, c = (b) => ((d * b + l) * b + n) * b, h = (b) => (3 * u * b + 2 * r) * b + i;
  let v = s;
  for (let b = 0; b < 8; b++) {
    const g = a(v) - s;
    if (Math.abs(g) < 1e-6) break;
    v -= g / h(v);
  }
  return c(v);
}
function Ht(s) {
  try {
    const [e, o, p] = Jt(s).map((t) => (t /= 255, t <= 0.03928 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4)));
    return 0.2126 * e + 0.7152 * o + 0.0722 * p;
  } catch {
    return 0;
  }
}
function mt(s) {
  try {
    return Ht(s) > 0.179 ? "#000000" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}
function Vt(s) {
  if (!s || s <= 0) return "cubic-bezier(0.4, 0, 0.2, 1)";
  const e = s / 100, o = [];
  for (let p = 0; p <= 100; p += 2) {
    if (p === 100) {
      o.push("1 100%");
      continue;
    }
    const t = p / 100, i = Math.exp(-t * (8 - 4 * e)), r = Math.cos(t * (10 + 10 * e)), u = 1 - i * r;
    o.push(`${u.toFixed(4)} ${p}%`);
  }
  return `linear(${o.join(", ")})`;
}
const Zt = 700, At = 800, gt = 900, ht = 1e3;
class Kt extends Be {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      rootConfig: { type: Object },
      globalEntities: { type: Array },
      _isInitialized: { type: Boolean, state: !0 },
      _displayPct: { type: Number, state: !0 },
      _isAtLeftEdge: { type: Boolean, state: !0 },
      _isAtRightEdge: { type: Boolean, state: !0 }
    };
  }
  constructor() {
    super(), this._isInitialized = !1, this._displayPct = 0, this._targetPct = null, this._animFrame = null, this._isAtLeftEdge = !1, this._isAtRightEdge = !1;
  }
  firstUpdated() {
    setTimeout(() => {
      this._isInitialized = !0;
    }, 50), this._checkEdges(), this._resizeObs = new ResizeObserver(() => this._checkEdges()), this._resizeObs.observe(this);
  }
  updated(e) {
    super.updated(e), (e.has("config") || e.has("rootConfig")) && this._checkEdges();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._resizeObs && this._resizeObs.disconnect();
  }
  _checkEdges() {
    requestAnimationFrame(() => {
      try {
        const e = this.getRootNode().host;
        if (!e) return;
        const o = this.getBoundingClientRect(), p = e.getBoundingClientRect(), t = Math.abs(o.left - p.left) < 12, i = Math.abs(p.right - o.right) < 12;
        this._isAtLeftEdge !== t && (this._isAtLeftEdge = t), this._isAtRightEdge !== i && (this._isAtRightEdge = i);
      } catch {
      }
    });
  }
  _get(e, o) {
    return this.config[e] ?? o;
  }
  _animatePct(e, o) {
    this._animFrame && cancelAnimationFrame(this._animFrame);
    const p = this._displayPct, t = performance.now(), i = (r) => {
      const u = Math.min((r - t) / o, 1), n = Wt(u, 0.2, 0, 0, 1);
      this._displayPct = p + (e - p) * n, u < 1 ? this._animFrame = requestAnimationFrame(i) : (this._displayPct = e, this._animFrame = null);
    };
    this._animFrame = requestAnimationFrame(i);
  }
  static get styles() {
    return Xe`
      :host {
        display: block; position: absolute; width: 100%; height: 100%;
        pointer-events: none; contain: layout style;
      }
      .sc-pb-wrap {
        position: relative; width: 100%; height: 100%;
        border-radius: var(--pb-radius, 4px);
        background: var(--pb-bg-color, rgba(255,255,255,0.1));
        overflow: hidden;
        box-shadow: var(--pb-shadow, inset 0 1px 3px rgba(0,0,0,0.3));
        contain: strict;
        z-index: ${Zt};
        container-type: size;
      }
      .sc-liquid-layer {
        position: absolute; inset: 0; filter: none; border-radius: inherit;
      }
      .sc-liquid-layer.gooey {
        filter: url(#sc-goo-filter);
      }
      .sc-pb-fill {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        border-radius: var(--pb-radius, 4px);
        will-change: clip-path, background; 
        z-index: ${gt};
      }
      
      .sc-seg-container {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 100cqmin; height: 100cqmin;
        pointer-events: none;
      }
      .sc-seg {
        position: absolute; inset: 0; pointer-events: none;
        transform: rotate(var(--rot)); transform-origin: center;
        will-change: transform;
      }
      .sc-seg-inner {
        position: absolute; top: 0; left: 50%; transform: translateX(-50%);
        border-radius: 999rem;
        transition: background 150ms ease, box-shadow 150ms ease;
      }

      .sc-pb-ticks { position: absolute; inset: 0; pointer-events: none; opacity: var(--pb-tick-opacity, 1); z-index: ${gt + 50}; }
      .sc-pb-labels { position: absolute; inset: 0; pointer-events: none; z-index: ${ht}; }
    `;
  }
  render() {
    var at, bt;
    if (!this.config || !this.hass) return _``;
    let e = this.config.entity, o = this.config.attribute, p = "";
    if (this.config.global_id && this.config.global_id !== "manual") {
      const R = (this.globalEntities || []).find((ue) => ue.id === this.config.global_id);
      R && (e = R.entity, o = R.attribute, p = R.alias || "");
    }
    const t = e ? this.hass.states[e] : null, i = t ? ot(o ? t.attributes[o] : t.state, 0) : 0, r = ot(this._get("min", 0), 0), u = ot(this._get("max", 100), 100), n = this._get("origin", ""), l = n !== "" ? ot(n, r) : r, d = u - r || 1, a = Math.max(0, Math.min(1, (i - r) / d)), c = ot(this._get("animation_duration", 0.4), 0.4);
    this._isInitialized && a !== this._targetPct && (this._targetPct = a, this._animatePct(a, c * 1e3));
    const h = this._isInitialized ? this._displayPct : 0, v = Math.max(0, Math.min(1, (l - r) / d)), b = this._isInitialized ? a : v, g = Math.min(v, b), m = Math.max(v, b), f = parseInt(this._get("value_decimals", 0)), y = this._get("value_unit", ((at = t == null ? void 0 : t.attributes) == null ? void 0 : at.unit_of_measurement) || ""), $ = this._get("value_animated", !1) ? r + h * d : i, w = `${parseFloat($).toFixed(f)}${y ? " " + y : ""}`, S = `${parseFloat($).toFixed(parseInt(this._get("indicator_value_decimals", f)))}${y ? " " + y : ""}`, x = this._get("orientation", "horizontal"), k = x === "horizontal", J = String(x).startsWith("circular"), A = this._get("base_unit", "auto") === "auto" ? J ? "cqmin" : "px" : this._get("base_unit");
    let _e = Fe(this._get("width"), J ? "100px" : k ? "100%" : "20px"), Pe = Fe(this._get("height"), J ? "100px" : k ? "20px" : "100%");
    const We = J ? Fe(this._get("circular_border_radius", 50), "50%", "%") : Fe(this._get("border_radius", "4"), "4px"), He = this._get("bg_color", "#ffffff"), rt = ot(this._get("bg_opacity", 10), 10), Ve = `color-mix(in srgb, ${He} ${rt}%, transparent)`, Me = this._get("gradient_stops", [{ color: this._get("color1", "#2196f3"), pos: 0 }, { color: this._get("color2", "#4caf50"), pos: 100 }]);
    let Qe = this._get("fill_color", "var(--primary-color)");
    this._get("use_gradient", !1) && (this._get("gradient_as_solid", !1) ? Qe = Et(Me, h) : Qe = `linear-gradient(${k ? "90deg" : "0deg"}, ${Me.map((R) => `${R.color} ${R.pos}%`).join(", ")})`);
    const L = this._get("use_gradient", !1) ? Et(Me, h) : kt(Qe), z = `
      1px -1px 2px rgba(255,255,255,0.5) inset, 0px -1px 2px rgba(255,255,255,0.5) inset, 
      -1px -1px 2px rgba(255,255,255,0.5) inset, 1px 1px 2px rgba(0,0,0,0.3) inset, 
      -8px 4px 10px -6px rgba(0,0,0,0.25) inset, -1px 1px 6px rgba(0,0,0,0.25) inset, 
      -1px -1px 8px rgba(0,0,0,0.15), 1px 1px 2px rgba(0,0,0,0.15), 2px 2px 6px rgba(0,0,0,0.15), 
      -2px -1px 2px rgba(255,255,255,0.25) inset, 3px 6px 16px -6px rgba(0,0,0,0.5)
    `, Ee = k ? `inset(0 calc((1 - ${m}) * 100%) 0 calc(${g} * 100%))` : `inset(calc((1 - ${m}) * 100%) 0 calc(${g} * 100%) 0)`, X = `clip-path: ${Ee}; background: ${Qe}; transition: clip-path var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear;`, G = this.rootConfig || {}, xe = G.layout_shape === "pill" || parseInt(G.border_radius || "0") > 0;
    let Z = "0px";
    xe && (Z = G.layout_shape === "pill" ? "20px" : Math.max(8, parseInt(G.border_radius || 12) * 0.6) + "px");
    let C = "", se = "";
    const Re = this._get("show_indicator", !1) && !J, re = this._get("indicator_value_glass", !1), T = this._get("indicator_glass_effect", re ? "glass_gooey" : "none"), pe = T === "glass_gooey";
    if (Re) {
      const R = this._get("indicator_color", "#ffffff"), ue = Fe(this._get("indicator_thickness", 2), `2${A}`, A), D = k ? `position:absolute; top:0; bottom:0; width:${ue}; background:${R}; left:calc(${b} * 100%); transform:translateX(-50%) translateZ(0); z-index:${ht}; transition: left var(--pb-anim-dur) var(--pb-bounce-ease);` : `position:absolute; left:0; right:0; height:${ue}; background:${R}; bottom:calc(${b} * 100%); transform:translateY(50%) translateZ(0); z-index:${ht}; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease);`;
      let ne = "";
      if (this._get("indicator_value", !1)) {
        let me = this._get("indicator_value_bg", "#000000"), ae = this._get("indicator_value_color", "#ffffff");
        const ke = this._get("indicator_value_adaptive_mode", "none");
        ke === "pill" ? (me = L, ae = mt(L)) : ke === "text" && (ae = L);
        const Oe = ot(this._get("indicator_value_opacity", 100), 100), tt = `color-mix(in srgb, ${me} ${Oe}%, transparent)`;
        let H = "";
        T === "glass_gooey" ? H = `backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); box-shadow: ${z}; border: 1px solid rgba(255, 255, 255, 0.3);` : T === "glass_clear" ? H = `box-shadow: ${z}; border: 1px solid rgba(255, 255, 255, 0.3);` : T === "glass_clean" ? H = "backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 10px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.4);" : T === "glass_lens" ? H = "backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.4);" : T === "glass_dark" ? H = `backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); background: rgba(0,0,0,${Oe / 100}) !important; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.5); color: #ffffff !important;` : H = "box-shadow: 0 2px 2px rgba(0,0,0,0.25); border: none;";
        const Ke = Fe(this._get("indicator_value_font_size", 10), `10${A}`, A), Ie = this._get("indicator_value_rotation", "auto") === "auto" ? k ? -90 : 0 : parseInt(this._get("indicator_value_rotation")), Ue = Math.abs(Ie) === 90, Ge = `calc(${Ke} * (0.8 + ${S.length} * 0.3))`, lt = `calc(${Ke} * 1.1)`, N = k ? Ue ? lt : Ge : Ue ? Ge : lt;
        let E = N, U = N;
        k && xe && (this._isAtLeftEdge && (E = `calc(${N} + ${Z})`), this._isAtRightEdge && (U = `calc(${N} + ${Z})`));
        const M = k ? `left: clamp(${E}, calc(${b} * 100%), calc(100% - ${U})); top: 50%; transform: translate(-50%, -50%) rotate(${Ie}deg) translateZ(0); will-change: left, transform; transition: left var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear, color 0.1s linear;` : `bottom: clamp(${N}, calc(${b} * 100%), calc(100% - ${N})); left: 50%; transform: translate(-50%, 50%) rotate(${Ie}deg) translateZ(0); will-change: bottom, transform; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear, color 0.1s linear;`;
        ne = _`
            <div style="position:absolute; z-index:${ht + 50}; background:${tt}; color:${ae}; font-size:${Ke}; padding:0.3em 0.8em; border-radius:100px; font-weight:bold; display:flex; align-items:center; justify-content:center; ${H} ${M}">
              ${S}
            </div>`, pe && (C = _`
              <div style="position:absolute; z-index:${gt}; background:${L}; color:transparent; font-size:${Ke}; padding:0.3em 0.8em; border-radius:100px; display:flex; pointer-events:none; ${M}">
                ${S}
              </div>`);
      }
      se = _`<div class="sc-pb-indicator-line" style="${D}"></div>${ne}`;
    }
    let Ne = "";
    if (J) {
      const R = ot(this._get("circular_scale", 100), 100) / 100, ue = this._get("circular_segmented", !1), D = this._get("circular_glow", !0), ne = ot(this._get("circular_stroke_width", 10), 10);
      let me = 360;
      const ae = parseInt(this._get("circular_start_position", 0));
      let ke = ae;
      x === "circular_speedo" && (me = 270, ke = -135 + ae), x === "circular_half" && (me = 180, ke = -90 + ae);
      const Oe = this._get("circular_reverse", !1), tt = Oe ? -1 : 1;
      if (ue) {
        const H = parseInt(this._get("circular_segment_count", 40)), Ke = Math.floor(h * H), Ie = me / (me === 360 ? H : Math.max(1, H - 1)) * tt, Ue = ot(this._get("circular_segment_thickness", 2), 2) + "%", Ge = ne + "%", lt = [];
        for (let N = 0; N < H; N++) {
          const E = N <= Ke && h > 0, U = ke + N * Ie, M = H > 1 ? N / (H - 1) : 0;
          let P = this._get("use_gradient", !1) ? this._get("gradient_as_solid", !1) ? L : Et(Me, M) : kt(Qe);
          const le = `color-mix(in srgb, ${He} ${rt}%, transparent)`, ge = E ? P : le, ye = D && E ? `0 0 2px ${P}, 0 0 5px ${P}` : "none", oe = E ? gt : At;
          lt.push(_`
            <i class="sc-seg" style="--rot: ${U}deg; z-index: ${oe};">
              <div class="sc-seg-inner" style="background: ${ge}; box-shadow: ${ye}; width: ${Ue}; height: ${Ge};"></div>
            </i>
          `);
        }
        Ne = _`<div class="sc-seg-container" style="${R !== 1 ? `transform: translate(-50%, -50%) scale(${R});` : ""}">${lt}</div>`;
      } else {
        const Ke = `rotate(${ke - 90} 50 50) ${Oe ? "scale(1, -1) translate(0, -100)" : ""}`, Ie = 50 - ne / 2, Ue = 2 * Math.PI * Ie, Ge = me / 360 * Ue, lt = Ue - Ge, N = b * Ge > 0 ? Math.max(1e-3, b * Ge) : 0;
        this._uniqueId || (this._uniqueId = "grad-" + Math.random().toString(36).substr(2, 9)), Ne = _`
          <svg viewBox="0 0 100 100" style="width:100%; height:100%; position:absolute; inset:0; overflow:visible; z-index:${At}; pointer-events:none; ${R !== 1 ? `transform: scale(${R}); transform-origin: center;` : ""}">
          <defs>
              ${this._get("use_gradient", !1) && !this._get("gradient_as_solid", !1) ? _`
                <linearGradient id="${this._uniqueId}" x1="0%" y1="100%" x2="100%" y2="0%">
                  ${Me.map((E) => _`<stop offset="${E.pos}%" stop-color="${E.color}" />`)}
                </linearGradient>
              ` : ""}
              ${D ? _`
                <filter id="glow-${this._uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${L}" flood-opacity="0.6"/>
                </filter>
              ` : ""}
            </defs>
            <circle cx="50" cy="50" r="${Ie}" fill="none" stroke="${He}" stroke-opacity="${rt / 100}" stroke-width="${ne}" stroke-dasharray="${Ge} ${lt}" stroke-dashoffset="0" stroke-linecap="round" style="z-index: ${At};" transform="${Ke}"></circle>
            ${N > 0 ? _`
              <circle cx="50" cy="50" r="${Ie}" fill="none" stroke="${this._get("use_gradient", !1) && !this._get("gradient_as_solid", !1) ? `url(#${this._uniqueId})` : L}" stroke-width="${ne}" stroke-dasharray="${N} ${Ue}" stroke-dashoffset="0" stroke-linecap="round" style="transition: stroke-dasharray var(--pb-anim-dur) var(--pb-bounce-ease), stroke 0.1s linear; z-index: ${gt};" transform="${Ke}" filter="${D ? `url(#glow-${this._uniqueId})` : "none"}"></circle>
            ` : ""}
          </svg>
        `;
      }
    }
    let W = "", fe = [], we = [], Ae = [], et = [], Ze = "", be = "";
    if (this._get("show_ticks", !1) && !J) {
      let R = parseInt(this._get("tick_count", 10));
      const ue = ot(this._get("tick_interval", 0), 0);
      let D = 0;
      ue > 0 ? (D = ue / d * 100, R = Math.floor((d + 1e-4) / ue) + 1) : R > 1 && (D = 100 / (R - 1));
      const ne = (j, ee) => ee ? j === "start" ? "top: 0; transform: translate(-50%, 0);" : j === "end" ? "bottom: 0; transform: translate(-50%, 0);" : j === "full" ? "top: 0; transform: translate(-50%, 0);" : "top: 50%; transform: translate(-50%, -50%);" : j === "start" ? "left: 0; transform: translate(0, 50%);" : j === "end" ? "right: 0; transform: translate(0, 50%);" : j === "full" ? "left: 0; transform: translate(0, 50%);" : "left: 50%; transform: translate(-50%, 50%);", me = this._get("tick_color_adaptive", !1), ae = me ? "color-mix(in srgb, var(--primary-text-color) 40%, transparent)" : this._get("tick_color", "rgba(255,255,255,0.3)"), ke = me ? mt(L) : this._get("tick_color", "rgba(255,255,255,0.3)"), Oe = Fe(this._get("tick_width", 1), `1${A}`, A), tt = this._get("tick_length", "100%"), H = this._get("tick_align", "center"), Ke = this._get("tick_hide_last", !1), Ie = parseInt(this._get("tick_label_step", 1)) || 1, Ue = Fe(this._get("tick_labeled_extralength", 0), `0${A}`, A), Ge = this._get("tick_mirror_side", !1), lt = this._get("show_subticks", !1), N = parseInt(this._get("subtick_count", 4)), E = this._get("subtick_pos", "main"), U = this._get("subtick_length", "50%"), M = Fe(this._get("subtick_width", 1), `1${A}`, A), P = this._get("subtick_color_adaptive", !1), le = P ? "color-mix(in srgb, var(--primary-text-color) 25%, transparent)" : this._get("subtick_color", "rgba(255,255,255,0.2)"), ge = P ? mt(L) : this._get("subtick_color", "rgba(255,255,255,0.2)"), ye = this._get("subtick_mirror_side", !1), oe = this._get("tick_labels_pos", "end");
      if (R > 1 && D > 0) {
        for (let j = 0; j < R; j++) {
          const ee = j * D / 100, ce = Math.abs(j * D - 100) < 0.1, V = this._get("show_tick_labels", !1) && j % Ie === 0;
          let te = tt;
          H === "full" && (te = "100%");
          let Q = te;
          if (V && Ue !== "0px" && Ue !== "0cqmin" && H !== "full" && (Q = `calc(${te} + ${Ue})`), !(Ke && ce)) {
            let Y = "position:absolute; pointer-events:none;";
            if (k ? Y += `left: ${ee * 100}%; width: ${Oe}; height: ${Q}; ${ne(H, k)}` : Y += `bottom: ${ee * 100}%; height: ${Oe}; width: ${Q}; ${ne(H, k)}`, fe.push(_`<div style="${Y} background:${ae};"></div>`), we.push(_`<div style="${Y} background:${ke};"></div>`), Ge && (H === "start" || H === "end")) {
              let I = H === "start" ? "end" : "start", de = "position:absolute; pointer-events:none;";
              k ? de += `left: ${ee * 100}%; width: ${Oe}; height: ${Q}; ${ne(I, k)}` : de += `bottom: ${ee * 100}%; height: ${Oe}; width: ${Q}; ${ne(I, k)}`, fe.push(_`<div style="${de} background:${ae};"></div>`), we.push(_`<div style="${de} background:${ke};"></div>`);
            }
          }
          if (lt && N > 0 && !ce && ee < 1) {
            let Y = E === "main" ? H : E, I = U, de = E === "main" ? Ge : ye;
            Y === "full" ? I = "100%" : I.includes("%") && E === "main" && te.includes("%") && (I = `calc(${te} * (${parseFloat(U) / 100}))`);
            for (let ie = 1; ie <= N; ie++) {
              const he = ee + ie / (N + 1) * (D / 100);
              if (he > 1.001) continue;
              let $e = "position:absolute; pointer-events:none;";
              if (k ? $e += `left: ${he * 100}%; width: ${M}; height: ${I}; ${ne(Y, k)}` : $e += `bottom: ${he * 100}%; height: ${M}; width: ${I}; ${ne(Y, k)}`, Ae.push(_`<div style="${$e} background:${le};"></div>`), et.push(_`<div style="${$e} background:${ge};"></div>`), de && (Y === "start" || Y === "end")) {
                let Te = Y === "start" ? "end" : "start", ze = "position:absolute; pointer-events:none;";
                k ? ze += `left: ${he * 100}%; width: ${M}; height: ${I}; ${ne(Te, k)}` : ze += `bottom: ${he * 100}%; height: ${M}; width: ${I}; ${ne(Te, k)}`, Ae.push(_`<div style="${ze} background:${le};"></div>`), et.push(_`<div style="${ze} background:${ge};"></div>`);
              }
            }
          }
        }
        if (this._get("custom_ticks", []).forEach((j) => {
          const ee = (j.value - r) / d;
          if (ee < 0 || ee > 1) return;
          const ce = j.color || "#ff0000", V = Fe(j.width, `2${A}`, A), te = j.align && j.align !== "main" ? j.align : H, Q = !j.align || j.align === "main" ? Ge : j.mirror;
          let Y = j.length !== void 0 && j.length !== "" && String(j.length).toLowerCase() !== "main" ? Fe(j.length, tt, A) : tt;
          te === "full" && (Y = "100%");
          let I = "position:absolute; pointer-events:none;";
          if (k ? I += `left: ${ee * 100}%; width: ${V}; height: ${Y}; ${ne(te, k)}` : I += `bottom: ${ee * 100}%; height: ${V}; width: ${Y}; ${ne(te, k)}`, fe.push(_`<div style="${I} background:${ce};"></div>`), we.push(_`<div style="${I} background:${ce};"></div>`), Q && (te === "start" || te === "end")) {
            let de = te === "start" ? "end" : "start", ie = "position:absolute; pointer-events:none;";
            k ? ie += `left: ${ee * 100}%; width: ${V}; height: ${Y}; ${ne(de, k)}` : ie += `bottom: ${ee * 100}%; height: ${V}; width: ${Y}; ${ne(de, k)}`, fe.push(_`<div style="${ie} background:${ce};"></div>`), we.push(_`<div style="${ie} background:${ce};"></div>`);
          }
        }), this._get("show_tick_labels", !1)) {
          const j = parseInt(this._get("tick_labels_decimals", 0)), ee = Fe(this._get("tick_labels_size", 10), `10${A}`, A), ce = Fe(this._get("tick_labels_tick_gap", 4), `4${A}`, A), V = Fe(this._get("tick_labels_shift", 0), `0${A}`, A), te = Fe(this._get("tick_labels_center_gap_offset", 0), `0${A}`, A), Q = this._get("tick_labels_color_adaptive", !1), Y = Q ? "var(--primary-text-color)" : this._get("tick_labels_color", "var(--secondary-text-color)"), I = Q ? mt(L) : this._get("tick_labels_color", "var(--secondary-text-color)"), de = parseInt(this._get("tick_labels_rotation", 0)), he = this._get("tick_labels_hide_unit", !1) || !y ? "" : " " + y, $e = this._get("tick_labels_hide_first", !1), Te = this._get("tick_labels_hide_last", !1);
          let ze = 0;
          if (!k && oe === "center")
            for (let Se = 0; Se < R; Se++) {
              const ct = `${parseFloat(r + Se * D / 100 * d).toFixed(j)}${he}`;
              ct.length > ze && (ze = ct.length);
            }
          if (oe === "center") {
            let Se = k ? `calc(${ee} / 2 + ${ce} + (${te}) / 2)` : `calc(${ze} * ${ee} * 0.3 + ${ce} + (${te}) / 2)`;
            const ut = `linear-gradient(to ${k ? "bottom" : "right"}, black 0%, black calc(50% + ${V} - ${Se}), transparent calc(50% + ${V} - ${Se}), transparent calc(50% + ${V} + ${Se}), black calc(50% + ${V} + ${Se}), black 100%)`;
            W += ` -webkit-mask-image: ${ut}; mask-image: ${ut};`;
          }
          const je = [], st = [];
          for (let Se = 0; Se < R; Se++) {
            if (Se % Ie !== 0) continue;
            const ct = Se * D / 100, ut = Se === 0, dt = Math.abs(Se * D - 100) < 0.1;
            if (ut && $e || dt && Te) continue;
            let pt = `position:absolute; font-size:${ee}; white-space:nowrap; pointer-events:none; `;
            if (k) {
              pt += `top: calc(50% + ${V}); `;
              let Ye = "-50%", Le = "0px";
              oe === "start" ? (Ye = "-100%", Le = `calc(-1 * ${ce})`) : oe === "end" && (Ye = "0", Le = ce), ut ? (Ye = "0", oe === "start" && (Le = "0px"), xe && this._isAtLeftEdge && (Le = `calc(${Le} + ${Z})`)) : dt && (Ye = "-100%", oe === "end" && (Le = "0px"), xe && this._isAtRightEdge && (Le = `calc(${Le} - ${Z})`)), pt += `left: ${ct * 100}%; margin-left: ${Le}; transform: translate(${Ye}, -50%) rotate(${de}deg);`;
            } else {
              pt += `left: calc(50% + ${V}); `;
              let Ye = "50%", Le = "0px";
              oe === "start" ? (Ye = "100%", Le = `calc(-1 * ${ce})`) : oe === "end" && (Ye = "0", Le = ce), ut ? (Ye = "0", oe === "start" && (Le = "0px")) : dt && (Ye = "100%", oe === "end" && (Le = "0px")), pt += `bottom: ${ct * 100}%; margin-bottom: ${Le}; transform: translate(-50%, ${Ye}) rotate(${de}deg);`;
            }
            const yt = `${parseFloat(r + ct * d).toFixed(j)}${he}`;
            je.push(_`<span style="${pt} color:${Y};">${yt}</span>`), st.push(_`<span style="${pt} color:${I};">${yt}</span>`);
          }
          Ze = _`<div class="sc-pb-tick-labels" style="position:absolute; inset:0; pointer-events:none; z-index:${gt + 51};">${je}</div>`, be = _`<div class="sc-pb-tick-labels" style="position:absolute; inset:0; pointer-events:none;">${st}</div>`;
        }
      }
    }
    let De = "", B = "", K = "";
    if (this._get("show_label", !1)) {
      const R = Fe(this._get("label_font_size", 12), `12${A}`, A), ue = this._get("label_bold", !1) ? "bold" : "normal";
      let D = this._get("label_color", "var(--primary-text-color)");
      this._get("label_color_adaptive_bar", !1) ? D = J ? L : mt(L) : this._get("label_color_adaptive_theme", !1) && (D = mt(kt("var(--primary-background-color)")));
      const ne = t ? ((bt = t.attributes) == null ? void 0 : bt.friendly_name) || t.entity_id.split(".")[1] : e || "", me = this.config.global_id && this.config.global_id !== "manual" && this._get("use_alias_name", !1) ? p || ne : this._get("label_text", "") || ne;
      if (J)
        B = _`<span style="color:${D}; font-size:${R}; font-weight:${ue}; text-shadow:0 1px 2px rgba(0,0,0,0.5); opacity: 0.8; transform: translateY(${Fe(this._get("circular_label_offset_y", 0), "0cqmin", "cqmin")}); display: block; transition: color 0.1s linear;">${me}</span>`;
      else {
        const ae = this._get("label_position", "center");
        let ke = "center", Oe = "center";
        ae.includes("left") ? ke = "flex-start" : ae.includes("right") && (ke = "flex-end"), ae.includes("top") ? Oe = "flex-start" : ae.includes("bottom") && (Oe = "flex-end"), B = _`
          <div class="sc-pb-labels" style="display:flex; width:100%; height:100%; position:absolute; inset:0; pointer-events:none; z-index:${ht}; justify-content:${ke}; align-items:${Oe}; padding:4px 8px; box-sizing:border-box;">
            <span style="color:${D}; font-size:${R}; font-weight:${ue}; text-shadow:0 1px 2px rgba(0,0,0,0.5); white-space:nowrap; transform: translate(${Fe(this._get("label_offset_x", 0), `0${A}`, A)}, ${Fe(this._get("label_offset_y", 0), `0${A}`, A)}) rotate(${this._get("label_rotation", "0")}deg); display:inline-block; transition: color 0.1s linear;">${me}</span>
          </div>`;
      }
    }
    if (this._get("show_value", !1)) {
      const R = Fe(this._get("value_font_size", 12), `12${A}`, A), ue = this._get("value_bold", !1) ? "bold" : "normal";
      let D = this._get("value_color", "var(--primary-text-color)");
      if (this._get("value_color_adaptive_bar", !1) ? D = J ? L : mt(L) : this._get("value_color_adaptive_theme", !1) && (D = mt(kt("var(--primary-background-color)"))), J)
        K = _`<span style="color:${D}; font-size:${R}; font-weight:${ue}; text-shadow:0 1px 2px rgba(0,0,0,0.5); transform: translateY(${Fe(this._get("circular_value_offset_y", 0), "0cqmin", "cqmin")}); display: block; transition: color 0.1s linear;">${w}</span>`;
      else {
        const ne = this._get("value_position", "center"), me = parseInt(this._get("value_rotation", "0")), ae = `color:${D}; font-size:${R}; font-weight:${ue}; text-shadow:0 1px 2px rgba(0,0,0,0.5); white-space:nowrap; transform: rotate(${me}deg); display: inline-block; transition: color 0.1s linear;`;
        if (ne === "floating") {
          const ke = Math.abs(me) === 90, Oe = `calc(${R} * (${w.length} * 0.3 + 0.2) + 4px)`, tt = `calc(${R} * 0.6 + 2px)`, H = k ? ke ? tt : Oe : ke ? Oe : tt;
          let Ke = H, Ie = H;
          k && xe && (this._isAtLeftEdge && (Ke = `calc(${H} + ${Z})`), this._isAtRightEdge && (Ie = `calc(${H} + ${Z})`)), De = _`
            <div style="${k ? `position:absolute; top:50%; left:clamp(${Ke}, calc(${b} * 100%), calc(100% - (${Ie}))); transform: translate(-50%, -50%) translateZ(0); z-index:${ht}; display:flex; align-items:center; justify-content:center; pointer-events:none; transition: left var(--pb-anim-dur) var(--pb-bounce-ease);` : `position:absolute; left:50%; bottom:clamp(${H}, calc(${b} * 100%), calc(100% - (${H}))); transform: translate(-50%, 50%) translateZ(0); z-index:${ht}; display:flex; align-items:center; justify-content:center; pointer-events:none; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease);`}">
              <span style="${ae}">${w}</span>
            </div>`;
        } else {
          let ke = "justify-content:center; align-items:center;";
          ne === "start" ? ke = k ? "justify-content:flex-start; padding-left:8px;" : "align-items:flex-end; padding-bottom:8px; flex-direction:column;" : ne === "end" && (ke = k ? "justify-content:flex-end; padding-right:8px;" : "align-items:flex-start; padding-top:8px; flex-direction:column;"), K = _`
            <div class="sc-pb-labels" style="display:flex; width:100%; height:100%; position:absolute; inset:0; pointer-events:none; z-index:${ht}; ${ke}">
              <span style="${ae}">${w}</span>
            </div>`;
        }
      }
    }
    if (J) {
      const R = ot(this._get("circular_scale", 100), 100) / 100, ue = _`<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; z-index:${ht}; gap: 2${A}; transform: scale(${R}); transform-origin: center;">${K}${B}</div>`;
      B = "", K = ue;
    }
    const ve = ot(this._get("bounce_intensity", 50), 50), Ce = Vt(ve), nt = `width: ${_e}; height: ${Pe}; --pb-radius: ${We}; --pb-bg-color: ${Ve}; --pb-bounce-ease: ${Ce};`;
    return _`
      <style>:host { ${nt} --pb-anim-dur: ${c}s; }</style>
      
      <svg style="position: absolute; width: 0; height: 0;" aria-hidden="true">
        <defs>
          <filter id="sc-goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>
      </svg>
      
      <div class="sc-pb-wrap">
        <div class="sc-liquid-layer ${pe ? "gooey" : ""}">
          ${J ? Ne : _`<div class="sc-pb-fill ${x}" style="${X}"></div>`}
          ${C}
        </div>
        
        ${De}
        
        ${this._get("show_ticks", !1) && !J ? _`
          <div class="sc-pb-subticks" style="position:absolute; inset:0; z-index:${gt + 40};">${Ae}</div>
          <div class="sc-pb-ticks" style="z-index:${gt + 50}; ${W}">${fe}</div>
          ${Ze}
          
          <div style="position:absolute; inset:0; z-index:${gt + 55}; clip-path: ${Ee}; transition: clip-path var(--pb-anim-dur) var(--pb-bounce-ease); pointer-events:none;">
            <div class="sc-pb-subticks" style="position:absolute; inset:0;">${et}</div>
            <div class="sc-pb-ticks" style="position:absolute; inset:0; ${W}">${we}</div>
            ${be}
          </div>
        ` : ""}
        
        ${B}
        ${K}
        
        ${se}
      </div>`;
  }
}
customElements.get("sc-progressbar") || customElements.define("sc-progressbar", Kt);
const it = (s) => String(s.orientation).startsWith("circular"), F = (s) => !String(s.orientation).startsWith("circular"), Ut = [
  { id: "_section_shape", label: "── Form & Position", type: "section" },
  { id: "orientation", label: "Ausrichtung / Layout", type: "select", options: [
    { value: "horizontal", label: "↔ Linear Horizontal" },
    { value: "vertical", label: "↕ Linear Vertikal" },
    { value: "circular_donut", label: "⭕ Zirkular: Donut (Vollkreis 360°)" },
    { value: "circular_speedo", label: "⏱️ Zirkular: Tacho (270° unten offen)" },
    { value: "circular_half", label: "🕳️ Zirkular: Halbkreis (180°)" }
  ] },
  { id: "base_unit", label: "Globale Skalierungs-Einheit (Base Unit)", type: "select", options: [
    { value: "auto", label: "Auto (Linear: px, Zirkular: cqmin)" },
    { value: "px", label: "px (Starr)" },
    { value: "cqmin", label: "cqmin (Skaliert mit kleinster Kante)" },
    { value: "cqw", label: "cqw (Skaliert mit Breite)" },
    { value: "cqh", label: "cqh (Skaliert mit Höhe)" }
  ] },
  { id: "circular_start_position", label: "Startposition (Uhrzeit)", type: "select", options: [
    { value: "0", label: "12 Uhr (Oben)" },
    { value: "90", label: "3 Uhr (Rechts)" },
    { value: "180", label: "6 Uhr (Unten)" },
    { value: "-90", label: "9 Uhr (Links)" }
  ], condition: (s) => it(s) },
  { id: "circular_reverse", label: "Richtung umkehren (Gegen Uhrzeigersinn)", type: "checkbox", condition: (s) => it(s) },
  { id: "circular_stroke_width", label: "Ring-Dicke bzw. Segment-Höhe (%)", type: "range", min: 1, max: 50, step: 1, placeholder: "10", condition: (s) => it(s) },
  { id: "circular_scale", label: "Skalierung des Rings (%)", type: "range", min: 10, max: 100, step: 1, placeholder: "100", condition: (s) => it(s) },
  { id: "circular_glow", label: "Neon-Glow-Effekt", type: "checkbox", condition: (s) => it(s) },
  { id: "width", label: "Breite (CSS)", type: "text", placeholder: "100% oder 20px" },
  { id: "height", label: "Höhe (CSS)", type: "text", placeholder: "20px oder 100%" },
  { id: "border_radius", label: "Eckenradius", type: "range", min: 0, max: 50, step: 0.1, placeholder: "4px", condition: (s) => F(s) },
  { id: "circular_border_radius", label: "Hintergrund-Eckenradius (%)", type: "range", min: 0, max: 50, step: 1, placeholder: "50", condition: (s) => it(s) },
  { id: "position_mode", label: "Ankerpunkt / Position", type: "9-sector" },
  { id: "offset_x", label: "X-Verschiebung (px oder %)", type: "text", placeholder: "0px" },
  { id: "offset_y", label: "Y-Verschiebung (px oder %)", type: "text", placeholder: "0px" },
  { id: "_section_colors", label: "── Farben, Verlauf & Animation", type: "section" },
  { id: "animation_duration", label: "Animationsdauer (s)", type: "range", min: 0, max: 10, step: 0.1, placeholder: "0.4" },
  { id: "bounce_intensity", label: "Bounce-Intensität (%)", type: "range", min: 0, max: 30, dynamic_step: !0, placeholder: "50" },
  { id: "bg_color", label: "Hintergrundfarbe", type: "color", placeholder: "#ffffff" },
  { id: "bg_opacity", label: "Hintergrund Deckkraft (%)", type: "range", min: 0, max: 100, step: 1, placeholder: "10" },
  { id: "fill_color", label: "Füllfarbe (Solid)", type: "color", placeholder: "var(--primary-color)" },
  { id: "use_gradient", label: "Verlauf (Gradient) nutzen", type: "checkbox" },
  { id: "gradient_as_solid", label: "Farbe aus Gradient ableiten (dynamisch)", type: "checkbox", condition: (s) => s.use_gradient },
  { id: "gradient_stops", label: "Verlauf Farbstops", type: "gradient-stops", condition: (s) => s.use_gradient },
  { id: "_section_scale", label: "── Wertebereich & Haupt-Ticks", type: "section" },
  { id: "min", label: "Minimum", type: "number", placeholder: "0" },
  { id: "max", label: "Maximum", type: "number", placeholder: "100" },
  { id: "origin", label: "Startpunkt (Wert, z.B. 0)", type: "number", placeholder: "Leer = Minimum" },
  { id: "show_ticks", label: "Ticks anzeigen", type: "checkbox", condition: (s) => F(s) },
  { id: "tick_count", label: "Anzahl Ticks (wenn Intervall leer)", type: "range", min: 0, max: 51, step: 1, placeholder: "10", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_interval", label: "Tick-Intervall (Wert-Schrittweite)", type: "number", placeholder: "z.B. 10", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_hide_last", label: "Letzte Tick-Linie ausblenden", type: "checkbox", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_align", label: "Startpunkt / Ausrichtung", type: "select", options: [{ value: "center", label: "Mittig" }, { value: "start", label: "Am Rand (Oben/Links)" }, { value: "end", label: "Gegenüber (Unten/Rechts)" }, { value: "full", label: "Volle Breite (100%)" }], condition: (s) => F(s) && s.show_ticks },
  { id: "tick_mirror_side", label: "Zusätzlich auf andere Seite spiegeln", type: "checkbox", condition: (s) => F(s) && s.show_ticks && (s.tick_align === "start" || s.tick_align === "end") },
  { id: "tick_length", label: "Länge Hauptticks (%, px)", type: "text", placeholder: "100%", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_width", label: "Tick-Breite (px oder %)", type: "text", placeholder: "1", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_color_adaptive", label: "Doppelt-Adaptive Farbe (Invertiert am Füllstand)", type: "checkbox", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_color", label: "Manuelle Farbe", type: "color", placeholder: "rgba(255,255,255,0.3)", condition: (s) => F(s) && s.show_ticks && !s.tick_color_adaptive },
  { id: "_section_segments", label: "── Segmente (Kreis)", type: "section", condition: (s) => it(s) },
  { id: "circular_segmented", label: "Kreis in Pillen-Segmente unterteilen", type: "checkbox", condition: (s) => it(s) },
  { id: "circular_segment_count", label: "Anzahl Segmente", type: "range", min: 2, max: 100, step: 1, placeholder: "40", condition: (s) => it(s) && s.circular_segmented },
  { id: "circular_segment_thickness", label: "Dicke der Pillen (%)", type: "range", min: 0.1, max: 10, step: 0.1, placeholder: "2", condition: (s) => it(s) && s.circular_segmented },
  { id: "_section_subticks", label: "── Subticks", type: "section", condition: (s) => F(s) && s.show_ticks },
  { id: "show_subticks", label: "Subticks anzeigen", type: "checkbox", condition: (s) => F(s) && s.show_ticks },
  { id: "subtick_count", label: "Anzahl pro Intervall", type: "number", placeholder: "4", condition: (s) => F(s) && s.show_ticks && s.show_subticks },
  { id: "subtick_pos", label: "Startpunkt / Ausrichtung", type: "select", options: [{ value: "main", label: "Wie Hauptticks" }, { value: "center", label: "Mittig" }, { value: "start", label: "Am Rand (Oben/Links)" }, { value: "end", label: "Gegenüber (Unten/Rechts)" }, { value: "full", label: "Volle Breite (100%)" }], placeholder: "main", condition: (s) => F(s) && s.show_ticks && s.show_subticks },
  { id: "subtick_mirror_side", label: "Zusätzlich auf andere Seite spiegeln", type: "checkbox", condition: (s) => F(s) && s.show_ticks && s.show_subticks && (s.subtick_pos === "start" || s.subtick_pos === "end") },
  { id: "subtick_length", label: "Länge Subticks (% oder px)", type: "text", placeholder: "50%", condition: (s) => F(s) && s.show_ticks && s.show_subticks && s.subtick_pos !== "full" },
  { id: "subtick_width", label: "Breite (px oder %)", type: "text", placeholder: "1", condition: (s) => F(s) && s.show_ticks && s.show_subticks },
  { id: "subtick_color_adaptive", label: "Doppelt-Adaptive Farbe (Invertiert am Füllstand)", type: "checkbox", placeholder: "false", default: !1, condition: (s) => F(s) && s.show_ticks && s.show_subticks },
  { id: "subtick_color", label: "Manuelle Farbe", type: "color", placeholder: "rgba(255,255,255,0.2)", condition: (s) => F(s) && s.show_ticks && s.show_subticks && !s.subtick_color_adaptive },
  { id: "_section_custom_ticks", label: "── Eigene Ticks (Custom)", type: "section", condition: (s) => F(s) && s.show_ticks },
  { id: "custom_ticks", label: "Zusätzliche / Manuelle Ticks einfügen", type: "custom-ticks", condition: (s) => F(s) && s.show_ticks },
  { id: "_section_tick_labels", label: "── Tick-Labels", type: "section", condition: (s) => F(s) && s.show_ticks },
  { id: "show_tick_labels", label: "Tick-Labels (Zahlen) anzeigen", type: "checkbox", condition: (s) => F(s) && s.show_ticks },
  { id: "tick_labeled_extralength", label: "Extra-Länge bei Labels", type: "text", placeholder: "0", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_label_step", label: "Nur jedes X-te Label (1=alle)", type: "number", placeholder: "1", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_decimals", label: "Dezimalstellen", type: "number", placeholder: "0", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_size", label: "Schriftgröße (CSS Text)", type: "text", placeholder: "10", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_hide_unit", label: "Einheit ausblenden", type: "checkbox", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_hide_first", label: "Erstes Label (Min) ausblenden", type: "checkbox", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_hide_last", label: "Letztes Label (Max) ausblenden", type: "checkbox", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_rotation", label: "Text-Rotation", type: "select", options: [
    { value: "0", label: "0° (Horizontal)" },
    { value: "90", label: "90°" },
    { value: "-90", label: "-90°" },
    { value: "180", label: "180° (Kopf)" }
  ], condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_color_adaptive", label: "Doppelt-Adaptive Farbe (Invertiert am Füllstand)", type: "checkbox", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_color", label: "Eigene Farbe", type: "color", placeholder: "var(--secondary-text-color)", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels && !s.tick_labels_color_adaptive },
  { id: "tick_labels_pos", label: "Positionierung", type: "select", options: [{ value: "start", label: "Davor / Darüber" }, { value: "end", label: "Dahinter / Darunter" }, { value: "center", label: "Mittig" }], condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_shift", label: "Verschiebung aus Mitte", type: "text", placeholder: "0", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels },
  { id: "tick_labels_tick_gap", label: "Abstand zum Tick", type: "text", placeholder: "4", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels && s.tick_labels_pos !== "center" },
  { id: "tick_labels_center_gap_offset", label: "Mittige Lücke anpassen", type: "text", placeholder: "0", condition: (s) => F(s) && s.show_ticks && s.show_tick_labels && s.tick_labels_pos === "center" },
  { id: "_section_label", label: "── Beschriftung (Name/Label)", type: "section" },
  { id: "show_label", label: "Name / Label anzeigen", type: "checkbox" },
  { id: "label_font_size", label: "Schriftgröße (z.B. 12 oder 12cqw)", type: "text", placeholder: "12", condition: (s) => s.show_label },
  { id: "label_bold", label: "Fettgedruckt (Bold)", type: "checkbox", condition: (s) => s.show_label },
  { id: "label_color", label: "Textfarbe (manuell)", type: "color", placeholder: "var(--primary-text-color)", condition: (s) => s.show_label && !s.label_color_adaptive_bar && !s.label_color_adaptive_theme },
  { id: "label_color_adaptive_bar", label: "Adaptiv: Kontrast zur Balkenfarbe", type: "checkbox", condition: (s) => s.show_label && F(s) },
  { id: "label_color_adaptive_bar", label: "Farbe vom Gradienten übernehmen", type: "checkbox", condition: (s) => s.show_label && it(s) },
  { id: "label_color_adaptive_theme", label: "Adaptiv: HA Theme (Hell/Dunkel)", type: "checkbox", condition: (s) => s.show_label },
  { id: "label_position", label: "Position im Balken", type: "9-sector", condition: (s) => F(s) && s.show_label },
  { id: "label_offset_x", label: "X-Offset", type: "text", placeholder: "0", condition: (s) => F(s) && s.show_label },
  { id: "label_offset_y", label: "Y-Offset", type: "text", placeholder: "0", condition: (s) => F(s) && s.show_label },
  { id: "circular_label_offset_y", label: "Y-Verschiebung im Kreis (%)", type: "range", min: -100, max: 100, step: 1, placeholder: "0", condition: (s) => it(s) && s.show_label },
  { id: "label_rotation", label: "Text-Rotation", type: "select", options: [
    { value: "0", label: "0° (Horizontal)" },
    { value: "90", label: "90°" },
    { value: "-90", label: "-90°" }
  ], condition: (s) => F(s) && s.show_label },
  { id: "_section_value", label: "── Wert & Beschriftung", type: "section" },
  { id: "show_value", label: "Wert anzeigen", type: "checkbox" },
  { id: "value_animated", label: "Wert animieren (Füllstand folgen)", type: "checkbox", condition: (s) => s.show_value },
  { id: "value_font_size", label: "Schriftgröße (z.B. 12 oder 12cqw)", type: "text", placeholder: "12", condition: (s) => s.show_value },
  { id: "value_rotation", label: "Text-Rotation", type: "select", options: [
    { value: "0", label: "0° (Standard)" },
    { value: "90", label: "90° (Im Uhrzeigersinn)" },
    { value: "-90", label: "-90° (Gegen Uhrzeigersinn)" }
  ], condition: (s) => F(s) && s.show_value },
  { id: "value_color", label: "Textfarbe (manuell)", type: "color", placeholder: "var(--primary-text-color)", condition: (s) => s.show_value && !s.value_color_adaptive_bar && !s.value_color_adaptive_theme },
  { id: "value_color_adaptive_bar", label: "Adaptiv: Kontrast zur Balkenfarbe", type: "checkbox", condition: (s) => s.show_value && F(s) },
  { id: "value_color_adaptive_bar", label: "Farbe vom Gradienten übernehmen", type: "checkbox", condition: (s) => s.show_value && it(s) },
  { id: "value_color_adaptive_theme", label: "Adaptiv: HA Theme (Hell/Dunkel)", type: "checkbox", condition: (s) => s.show_value },
  { id: "value_bold", label: "Fettgedruckt (Bold)", type: "checkbox", condition: (s) => s.show_value },
  { id: "value_decimals", label: "Nachkommastellen", type: "range", min: 0, max: 3, step: 1, placeholder: "0", condition: (s) => s.show_value },
  { id: "value_unit", label: "Eigene Einheit (z.B. %)", type: "text", placeholder: "Optional", condition: (s) => s.show_value },
  { id: "value_position", label: "Text-Position", type: "select", options: [
    { value: "center", label: "Mittig im Balken" },
    { value: "start", label: "Am Anfang" },
    { value: "end", label: "Am Ende" },
    { value: "floating", label: "Wandert mit dem Füllstand" }
  ], condition: (s) => F(s) && s.show_value },
  { id: "circular_value_offset_y", label: "Y-Verschiebung im Kreis (%)", type: "range", min: -100, max: 100, step: 1, placeholder: "0", condition: (s) => it(s) && s.show_value },
  { id: "_section_indicator", label: "── Indikator & Pille", type: "section", condition: (s) => F(s) },
  { id: "show_indicator", label: "Indikator-Linie anzeigen", type: "checkbox", condition: (s) => F(s) },
  { id: "indicator_color", label: "Farbe der Linie", type: "color", placeholder: "#ffffff", condition: (s) => F(s) && s.show_indicator },
  { id: "indicator_thickness", label: "Dicke der Linie (px/%)", type: "text", placeholder: "2px", condition: (s) => F(s) && s.show_indicator },
  { id: "indicator_value", label: "Pille mit Wert auf Linie anzeigen", type: "checkbox", condition: (s) => F(s) && s.show_indicator },
  { id: "value_animated", label: "Wert animieren (Füllstand folgen)", type: "checkbox", condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_value_rotation", label: "Rotation der Pille", type: "select", options: [
    { value: "auto", label: "Auto (H ↔ V gekreuzt)" },
    { value: "0", label: "0° (Horizontal)" },
    { value: "90", label: "90°" },
    { value: "-90", label: "-90°" },
    { value: "180", label: "180° (Kopf)" }
  ], condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_value_decimals", label: "Nachkommastellen Pille", type: "range", min: 0, max: 3, step: 1, placeholder: "0", condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_value_adaptive_mode", label: "Adaptives Verhalten", type: "select", options: [
    { value: "none", label: "Kein (Manuelle Farben)" },
    { value: "pill", label: "Ganze Pille (Hintergrund adaptiv, Text Kontrast)" },
    { value: "text", label: "Nur Text (Text adaptiv, Hintergrund manuell)" }
  ], condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_value_bg", label: "Hintergrundfarbe Pille", type: "color", placeholder: "#000000", condition: (s) => F(s) && s.show_indicator && s.indicator_value && s.indicator_value_adaptive_mode !== "pill" },
  { id: "indicator_value_opacity", label: "Deckkraft Pille (%)", type: "range", min: 0, max: 100, step: 1, placeholder: "100", condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_glass_effect", label: "Glass Effekt (Pille)", type: "select", options: [
    { value: "none", label: "Kein Effekt (Standard)" },
    { value: "glass_gooey", label: "Liquid & Gooey (3D Glas + Verschmelzen)" },
    { value: "glass_clean", label: "Clean Frost (Apple Style)" },
    { value: "glass_clear", label: "Clear 3D Glass (Klares Glas)" },
    { value: "glass_lens", label: "Convex Lens (Lupe)" },
    { value: "glass_dark", label: "Dark Tinted Glass (Getönt)" }
  ], condition: (s) => F(s) && s.show_indicator && s.indicator_value },
  { id: "indicator_value_color", label: "Textfarbe Pille", type: "color", placeholder: "#ffffff", condition: (s) => F(s) && s.show_indicator && s.indicator_value && s.indicator_value_adaptive_mode === "none" },
  { id: "indicator_value_font_size", label: "Schriftgröße Pille (CSS Text)", type: "text", placeholder: "10", condition: (s) => F(s) && s.show_indicator && s.indicator_value }
];
class Yt extends Be {
  static get properties() {
    return { hass: { type: Object }, slot: { type: Object }, commitFn: { type: Function }, _openStates: { type: Object, state: !0 } };
  }
  constructor() {
    super(), this._openStates = {};
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; color: var(--primary-text-color); display: flex; justify-content: space-between; align-items: center; }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
      .col { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
      .entity-row { display: flex; flex-direction: column; gap: 4px; font-size: 13px; margin-bottom: 8px; }
      select, input[type="text"], input[type="number"], input[type="range"] { background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; margin-top: 8px; }
      .sub-section { border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-top: 6px; }
      .sub-section > summary { padding: 7px 10px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--primary-color,#03a9f4); list-style: none; display: flex; align-items: center; gap: 6px; user-select: none; background: rgba(255,255,255,0.03); }
      .sub-section > summary::before { content: '▶'; font-size: 9px; transition: transform 0.15s; }
      .sub-section[open] > summary::before { transform: rotate(90deg); }
      .sub-content { padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
      .color-row { display: flex; align-items: center; gap: 6px; width: 100%; }
      .color-row input[type="color"] { width: 36px; height: 28px; padding: 0; border: none; background: none; cursor: pointer; flex-shrink: 0; }
      .color-row input[type="text"] { flex: 1; }
      .stop-row { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.04); padding: 4px 6px; border-radius: 4px; }
      .stop-row input[type="color"] { width: 32px; height: 26px; padding: 0; border: none; background: none; cursor: pointer; flex-shrink: 0; }
      .stop-row input[type="text"] { flex: 1; min-width: 0; font-size: 11px; }
      .stop-row input[type="number"] { width: 50px; font-size: 11px; }
      .stop-row .del-btn { background: none; border: none; color: #f44; cursor: pointer; font-size: 14px; padding: 0; }
      .stops-preview { height: 8px; border-radius: 4px; margin: 4px 0; }
      ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
      .field-wrapper { display: flex; flex-direction: column; gap: 4px; }
      .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; margin-top: 8px; margin-bottom: -4px; }
      .sector-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; width: 90px; margin: 4px 0; }
      .sector-btn { aspect-ratio: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--divider-color, #444); border-radius: 3px; cursor: pointer; transition: all 0.2s ease; }
      .sector-btn:hover { background: rgba(255,255,255,0.1); border-color: var(--primary-color); }
      .sector-btn.active { background: var(--primary-color, #03a9f4); border-color: var(--primary-color, #03a9f4); box-shadow: 0 0 8px var(--primary-color); }
      `;
  }
  _addProgressbar(e) {
    const o = JSON.parse(JSON.stringify(e));
    o.push({ entity: "", attribute: "", label_text: "" }), this._openStates[`pb_${o.length - 1}`] = !0, this.commitFn("progressbars", o);
  }
  _removeProgressbar(e, o) {
    const p = JSON.parse(JSON.stringify(o));
    p.splice(e, 1), this.commitFn("progressbars", p);
  }
  _renderField(e, o, p, t) {
    if (e.condition && !e.condition(o)) return _``;
    let i;
    const r = o[e.id];
    switch (e.type) {
      case "section":
        i = _`<div class="section-title">${e.label}</div>`;
        break;
      case "checkbox":
        i = _`
          <div class="row">
            <label>${e.label}</label>
            <ha-switch .checked=${r === !0} @change=${(u) => p(u.target.checked)}></ha-switch>
          </div>`;
        break;
      case "select":
        i = _`
          <div class="row">
            <label>${e.label}</label>
            <select style="width:50%" @change=${(u) => p(u.target.value)}>
              ${e.options.map((u) => _`<option value="${u.value}" ?selected=${r === u.value}>${u.label}</option>`)}
            </select>
          </div>`;
        break;
      case "9-sector": {
        const u = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"];
        i = _`
          <div class="col">
            <label>${e.label}</label>
            <div class="sector-grid">
              ${u.map((n) => _`<div class="sector-btn ${r === n ? "active" : ""}" title="${n}" @click=${() => p(n)}></div>`)}
            </div>
          </div>`;
        break;
      }
      case "range":
        i = _`
          <div class="col">
            <label>${e.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;">${r ?? e.placeholder ?? ""}</span></label>
            <input type="range" 
              min=${e.min ?? 0} 
              max=${e.max ?? 100} 
              step=${e.dynamic_step ? (r ?? e.placeholder ?? 0) < 10 ? "0.1" : "1" : e.step ?? 1} 
              .value=${r ?? e.placeholder ?? 0} 
              @input=${(u) => {
          let n = parseFloat(u.target.value);
          e.dynamic_step && (u.target.step = n < 10 ? "0.1" : "1"), p(n);
        }}>
          </div>`;
        break;
      case "color":
        i = _`
          <div class="col">
            <label>${e.label}</label>
            <div class="color-row">
              <input type="color" .value=${r || "#000000"} @input=${(u) => p(u.target.value)}>
              <input type="text" .value=${r || ""} placeholder="${e.placeholder || ""}" @input=${(u) => t(u.target.value)}>
            </div>
          </div>`;
        break;
      case "gradient-stops": {
        const u = Array.isArray(r) && r.length > 0 ? r : [{ color: "#2196f3", pos: 0 }, { color: "#4caf50", pos: 100 }], n = u.map((a) => `${a.color} ${a.pos}%`).join(", "), l = (a) => p(a), d = () => {
          if (u.length < 2) return;
          const a = 100 / (u.length - 1);
          l(u.map((c, h) => ({ ...c, pos: Math.round(h * a) })));
        };
        i = _`
          <div class="col">
            <label>${e.label}</label>
            <div class="stops-preview" style="background: linear-gradient(90deg, ${n})"></div>
            ${u.map((a, c) => _`
              <div class="stop-row">
                <input type="color" .value=${a.color} @input=${(h) => l(u.map((v, b) => b === c ? { ...v, color: h.target.value } : v))}>
                <input type="text"  .value=${a.color} @input=${(h) => l(u.map((v, b) => b === c ? { ...v, color: h.target.value } : v))}>
                <input type="number" min="0" max="100" .value=${a.pos} @input=${(h) => l(u.map((v, b) => b === c ? { ...v, pos: parseInt(h.target.value) || 0 } : v))}>
                <span style="font-size:10px;opacity:.6">%</span>
                ${u.length > 2 ? _`<button class="del-btn" @click=${() => l(u.filter((h, v) => v !== c))}>✕</button>` : ""}
              </div>`)}
            <div style="display:flex; gap:6px; margin-top:4px;">
              <button type="button" class="add-btn" style="flex:1; margin-top:0;" @click=${() => l([...u, { color: "#ffffff", pos: 100 }])}>＋ Stop</button>
              <button type="button" class="add-btn" style="flex:1; margin-top:0; border-color:var(--secondary-text-color); color:var(--secondary-text-color);" @click=${d}>⇿ Aufteilen</button>
            </div>
          </div>`;
        break;
      }
      case "custom-ticks": {
        const u = Array.isArray(r) ? r : [], n = (l) => p(l);
        i = _`
          <div class="col">
            <label>${e.label}</label>
            ${u.map((l, d) => _`
              <div class="stop-row" style="flex-wrap:wrap; gap:6px; margin-bottom:4px; padding:8px; background:rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-radius:6px;">
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Wert</span>
                  <input type="number" placeholder="Wert" style="width:40px" .value=${l.value ?? 50} @input=${(a) => n(u.map((c, h) => h === d ? { ...c, value: parseFloat(a.target.value) || 0 } : c))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="color" .value=${l.color || "#ff0000"} @input=${(a) => n(u.map((c, h) => h === d ? { ...c, color: a.target.value } : c))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Breite</span>
                  <input type="text" style="width:40px" placeholder="B(px/%)" .value=${l.width || "2px"} @input=${(a) => n(u.map((c, h) => h === d ? { ...c, width: a.target.value } : c))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Länge</span>
                  <input type="text" style="width:45px" placeholder="main" title="Leer oder 'main' für Haupttick-Länge" .value=${l.length || ""} @input=${(a) => n(u.map((c, h) => h === d ? { ...c, length: a.target.value } : c))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px; flex:1;">
                  <select style="width:100%; font-size:11px; padding:2px;" @change=${(a) => n(u.map((c, h) => h === d ? { ...c, align: a.target.value } : c))}>
                    <option value="main" ?selected=${!l.align || l.align === "main"}>Pos: Wie Haupt</option>
                    <option value="center" ?selected=${l.align === "center"}>Pos: Mittig</option>
                    <option value="start" ?selected=${l.align === "start"}>Pos: Rand 1</option>
                    <option value="end" ?selected=${l.align === "end"}>Pos: Rand 2</option>
                    <option value="full" ?selected=${l.align === "full"}>Pos: Voll</option>
                  </select>
                </div>
                ${l.align === "start" || l.align === "end" ? _`
                  <div style="display:flex; align-items:center; gap:2px;" title="Auf andere Seite spiegeln">
                    <input type="checkbox" .checked=${!!l.mirror} @change=${(a) => n(u.map((c, h) => h === d ? { ...c, mirror: a.target.checked } : c))}>
                    <span style="font-size:10px; opacity:0.8;">🪞</span>
                  </div>
                ` : ""}
                <button class="del-btn" @click=${() => n(u.filter((a, c) => c !== d))}>✕</button>
              </div>`)}
            <button type="button" class="add-btn" style="margin-top:4px; padding:6px;"
              @click=${() => n([...u, { value: 50, color: "#ff0000", width: "2px", length: "", align: "main", mirror: !1 }])}>＋ Custom Tick hinzufügen</button>
          </div>`;
        break;
      }
      default:
        i = _`
          <div class="col">
            <label>${e.label}</label>
            <input type=${e.type === "number" ? "number" : "text"} .value=${r ?? ""} placeholder="${e.placeholder || ""}"
              @input=${(u) => t(e.type === "number" ? parseFloat(u.target.value) : u.target.value)}>
          </div>`;
        break;
    }
    return _`<div class="field-wrapper">${i}</div>`;
  }
  _renderFieldsGroup(e, o, p, t) {
    let i;
    const r = (d, a) => {
      const c = JSON.parse(JSON.stringify(t));
      c[p][d] = a, this.commitFn("progressbars", c);
    }, u = (d, a) => {
      clearTimeout(i), i = setTimeout(() => r(d, a), 400);
    }, n = [];
    let l = null;
    return e.forEach((d) => {
      d.type === "section" ? (l && n.push(l), l = { label: d.label.replace("── ", ""), fields: [] }) : l && l.fields.push(d);
    }), l && n.push(l), _`
      ${n.map((d) => {
      if (d.fields.filter((h) => !h.condition || h.condition(o)).length === 0) return _``;
      const c = `s_${p}_${d.label}`;
      return this._openStates[c] === void 0 && (this._openStates[c] = !1), _`
          <details class="sub-section" ?open=${this._openStates[c]}
            @toggle=${(h) => {
        this._openStates[c] = h.target.open, this.requestUpdate();
      }}>
            <summary>${d.label}</summary>
            <div class="sub-content">
              ${d.fields.map((h) => this._renderField(h, o, (v) => r(h.id, v), (v) => u(h.id, v)))}
            </div>
          </details>`;
    })}`;
  }
  _renderBarPanel(e, o, p) {
    var d, a, c, h, v;
    let t = e.entity, i = !1, r = null;
    if (e.global_id && e.global_id !== "manual") {
      const b = (((d = this.slot) == null ? void 0 : d.global_entities) || []).find((g) => g.id === e.global_id);
      b && (t = b.entity, i = !0, r = b);
    }
    let u = "";
    if (i) {
      const b = t ? (a = this.hass) == null ? void 0 : a.states[t] : null, g = b ? b.attributes.friendly_name || t : t || "Unbenannt";
      let m = b ? r.attribute ? b.attributes[r.attribute] : b.state : "-";
      const f = b && !r.attribute && b.attributes.unit_of_measurement ? ` ${b.attributes.unit_of_measurement}` : "";
      u = `[${r.alias || "Alias"}] ${g}`, r.attribute && (u += ` (${r.attribute})`), u += ` ➔ ${m}${f}`;
    } else
      u = e.label_text || "", !u && t && ((c = this.hass) != null && c.states[t]) ? u = this.hass.states[t].attributes.friendly_name || t : u || (u = `Balken ${o + 1}`);
    const n = `pb_${o}`;
    this._openStates[n] === void 0 && (this._openStates[n] = !1);
    const l = (b, g) => {
      const m = JSON.parse(JSON.stringify(p));
      m[o][b] = g, this.commitFn("progressbars", m);
    };
    return _`
      <details class="inner-section" ?open=${this._openStates[n]} @toggle=${(b) => this._openStates[n] = b.target.open}>
        <summary style="opacity: ${e.active !== !1 ? "1" : "0.6"};">
          <span>${u}</span>
          <div style="display:flex; gap:12px; align-items:center;" @click=${(b) => b.stopPropagation()}>
            <ha-switch
              .checked=${e.active !== !1}
              title="Balken aktivieren / deaktivieren"
              style="margin-right: 4px;"
              @change=${(b) => l("active", b.target.checked)}>
            </ha-switch>
            <button title="Klonen"
              style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--primary-color);padding:0;"
              @click=${(b) => {
      b.preventDefault();
      const g = JSON.parse(JSON.stringify(p)), m = JSON.parse(JSON.stringify(g[o]));
      m.label_text && (m.label_text += " (Kopie)"), g.splice(o + 1, 0, m), this.commitFn("progressbars", g), this._openStates[`pb_${o + 1}`] = !0, this.requestUpdate();
    }}>⧉</button>
            <button title="Nach oben" ?disabled=${o === 0}
              style="background:none;border:none;cursor:${o === 0 ? "default" : "pointer"};font-size:14px;color:${o === 0 ? "var(--divider-color,#555)" : "var(--primary-text-color)"};padding:0;"
              @click=${(b) => {
      if (b.preventDefault(), o === 0) return;
      const g = JSON.parse(JSON.stringify(p)), m = g[o - 1];
      g[o - 1] = g[o], g[o] = m, this.commitFn("progressbars", g);
    }}>▲</button>
            <button title="Nach unten" ?disabled=${o === p.length - 1}
              style="background:none;border:none;cursor:${o === p.length - 1 ? "default" : "pointer"};font-size:14px;color:${o === p.length - 1 ? "var(--divider-color,#555)" : "var(--primary-text-color)"};padding:0;"
              @click=${(b) => {
      if (b.preventDefault(), o === p.length - 1) return;
      const g = JSON.parse(JSON.stringify(p)), m = g[o + 1];
      g[o + 1] = g[o], g[o] = m, this.commitFn("progressbars", g);
    }}>▼</button>
            <button title="Entfernen"
              style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;"
              @click=${(b) => {
      b.preventDefault(), this._removeProgressbar(o, p);
    }}>🗑</button>
          </div>
        </summary>
        <div class="inner-content">
          <div class="entity-row">
            <label>Interner Name / Manuelles Label</label>
            <input type="text" .value=${e.label_text || ""} placeholder="Wird auf Balken angezeigt (falls aktiv)" 
              ?disabled=${e.use_alias_name && e.global_id && e.global_id !== "manual"}
              style=${e.use_alias_name && e.global_id && e.global_id !== "manual" ? "opacity: 0.5;" : ""}
              @input=${(b) => l("label_text", b.target.value)}>
          </div>

          <div class="entity-row" style="margin-top: 4px; margin-bottom: 4px;">
            <label>Datenquelle</label>
            <select style="width: 100%;" @change=${(b) => l("global_id", b.target.value)}>
              <option value="manual" ?selected=${e.global_id === "manual" || !e.global_id}>Manuelle Auswahl</option>
              ${(((h = this.slot) == null ? void 0 : h.global_entities) || []).map((b) => {
      var S, x;
      const g = b.entity ? this.hass.states[b.entity] : null, m = b.alias || ((S = g == null ? void 0 : g.attributes) == null ? void 0 : S.friendly_name) || b.entity || "Unbenannt";
      let f = g ? g.state : "-";
      g && b.attribute && g.attributes[b.attribute] !== void 0 && (f = g.attributes[b.attribute]);
      const y = !b.attribute && ((x = g == null ? void 0 : g.attributes) != null && x.unit_of_measurement) ? ` ${g.attributes.unit_of_measurement}` : "", $ = b.attribute ? ` (${b.attribute})` : "", w = `[${b.alias || "Alias"}] ${m}${$}: ${f}${y}`;
      return _`<option value=${b.id} ?selected=${e.global_id === b.id}>${w}</option>`;
    })}
            </select>
          </div>
          
          ${e.global_id && e.global_id !== "manual" ? _`
            <div class="row" style="margin-bottom: 8px; background: rgba(3, 169, 244, 0.1); padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(3, 169, 244, 0.2);">
              <label style="color: var(--primary-color);">Alias-Namen als Balken-Beschriftung nutzen</label>
              <ha-switch .checked=${!!e.use_alias_name}
                @change=${(b) => l("use_alias_name", b.target.checked)}>
              </ha-switch>
            </div>
          ` : _`
            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
              <div class="entity-row" style="margin-bottom: 8px;">
                <label>Quelle</label>
                <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${!1} .value=${e.entity || ""} @value-changed=${(b) => l("entity", b.detail.value)}></ha-entity-picker>
              </div>
              <div class="entity-row">
                <label>Attribut</label>
                <ha-selector .hass=${this.hass} .selector=${{ attribute: { entity_id: e.entity || ((v = this.slot) == null ? void 0 : v.entity) || "" } }} .value=${e.attribute || ""} @value-changed=${(b) => l("attribute", b.detail.value || "")}></ha-selector>
              </div>
            </div>
          `}

          ${p.length > 1 ? _`
            <div class="row" style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--divider-color,#444);">
              <label>Style kopieren von...</label>
              <select style="width:60%" @change=${(b) => {
      const g = parseInt(b.target.value);
      if (isNaN(g)) return;
      const m = JSON.parse(JSON.stringify(p)), f = m[g];
      m[o] = { ...f, entity: m[o].entity, attribute: m[o].attribute, label_text: m[o].label_text, global_id: m[o].global_id }, this.commitFn("progressbars", m), b.target.value = "";
    }}>
                <option value="" selected disabled>Bitte wählen...</option>
                ${p.map((b, g) => g !== o ? _`<option value=${g}>Bar ${g + 1}${b.label_text ? " — " + b.label_text : b.entity ? " — " + b.entity.split(".")[1] : ""}</option>` : "")}
              </select>
            </div>` : ""}
          ${this._renderFieldsGroup(Ut, e, o, p)}
        </div>
      </details>`;
  }
  render() {
    if (!this.slot) return _``;
    const e = Array.isArray(this.slot.progressbars) ? this.slot.progressbars : [];
    return this._openStates._main === void 0 && (this._openStates._main = !1), _`
      <details class="inner-section" ?open=${this._openStates._main}
        @toggle=${(o) => {
      this._openStates._main = o.target.open, this.requestUpdate();
    }}>
        <summary>── Progressbars
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <span style="font-size:10px; opacity:.6; font-weight:400;">
              ${e.length} Bar${e.length !== 1 ? "s" : ""}
            </span>
            <ha-switch
              .checked=${!!this.slot.progressbar_active}
              @click=${(o) => o.stopPropagation()}
              @change=${(o) => this.commitFn("progressbar_active", o.target.checked)}>
            </ha-switch>
          </div>
        </summary>
        <div class="inner-content">
          ${this.slot.progressbar_active ? _`
            ${e.map((o, p) => this._renderBarPanel(o, p, e))}
            <button type="button" class="add-btn" @click=${() => this._addProgressbar(e)}>
              ＋ Neue Progressbar hinzufügen
            </button>` : _`
            <div style="font-size:12px; color:var(--secondary-text-color); text-align:center; padding:8px 0;">
              Modul deaktiviert
            </div>`}
        </div>
      </details>`;
  }
}
customElements.get("sc-progressbar-editor") || customElements.define("sc-progressbar-editor", Yt);
window.SupercardModules = window.SupercardModules || {};
window.SupercardModules.progressbar = /* @__PURE__ */ (() => {
  function s({ config: i }) {
    if (!(i != null && i.progressbar_active)) return {};
    const r = Array.isArray(i.progressbars) && i.progressbars.length > 0 ? i.progressbars : [];
    return r.length === 0 ? {} : {
      litOverlay: _`${r.map((u, n) => u.active !== !1 ? _`
        <sc-progressbar data-idx="${n}" .config=${u} .rootConfig=${i} .globalEntities=${i.global_entities}></sc-progressbar>
      ` : "")}`
    };
  }
  function e(i, r) {
    var l;
    if (!(r != null && r.progressbar_active)) return;
    const u = Array.isArray(r.progressbars) ? r.progressbars : [], n = (l = document.querySelector("home-assistant")) == null ? void 0 : l.hass;
    n && i.querySelectorAll("sc-progressbar").forEach((d) => {
      const a = parseInt(d.getAttribute("data-idx"));
      d.config = u[a], d.rootConfig = r, d.hass = n, d.globalEntities = r.global_entities;
    });
  }
  function o() {
    return [];
  }
  let p = null;
  function t(i, r, u) {
    return p || (p = document.createElement("sc-progressbar-editor")), p.commitFn = i, p.hass = r, p.slot = u, p;
  }
  return { update: s, onAfterRender: e, initCSS: () => "", editorFields: o, renderCustomBlock: t };
})();
function Xt(s) {
  const e = [
    { id: "empty", label: "Leer", group: "Basis" },
    { id: "icon", label: "Icon (Haupt-Entität)", group: "Basis" },
    { id: "name", label: "Name (Haupt-Entität)", group: "Basis" },
    { id: "state", label: "Zustand / Wert", group: "Basis" }
  ], o = Array.isArray(s.gauges) ? s.gauges.length : s.gauge_active ? 1 : 0;
  for (let t = 0; t < o; t++)
    e.push({ id: `gauge_${t}`, label: `Gauge ${t + 1}`, group: "Gauges" });
  const p = Array.isArray(s.progressbars) ? s.progressbars.length : 0;
  for (let t = 0; t < p; t++) {
    const i = s.progressbars[t];
    e.push({ id: `progressbar_${t}`, label: (i == null ? void 0 : i.label) || `Progressbar ${t + 1}`, group: "Progressbars" });
  }
  return Array.isArray(s.labels_list) && s.labels_list.forEach((t, i) => {
    const r = t.label_text || `Label ${i + 1}`, u = t.enabled ? "" : " (deaktiviert)", n = `Label ${i + 1} - ${r}${u}`;
    e.push({ id: `label_${i}`, label: "Komplett (Container/Indikator)", group: n }), e.push({ id: `label_${i}_icon`, label: "Nur Icon", group: n }), e.push({ id: `label_${i}_name`, label: "Nur Name", group: n }), e.push({ id: `label_${i}_value`, label: "Nur Wert", group: n });
  }), e;
}
function ft(s) {
  if (Array.isArray(s.items))
    return s.items.map((e) => {
      let o = e.x !== void 0 ? e.x : e.c ? (e.c - 1) * 33.333 : 0, p = e.y !== void 0 ? e.y : e.r ? (e.r - 1) * 33.333 : 0, t = e.w !== void 0 ? e.w : e.c2 && e.c ? (e.c2 - e.c + 1) * 33.333 : 33.333, i = e.h !== void 0 ? e.h : e.r2 && e.r ? (e.r2 - e.r + 1) * 33.333 : 33.333;
      return {
        ...e,
        x: o,
        y: p,
        w: t,
        h: i,
        inner: e.inner || "cc",
        font_size: e.size_n || e.size_v || e.font_size || null,
        font_weight: e.weight_n || e.weight_v || e.font_weight || null,
        font_color: e.color_n || e.color_v || e.font_color || null,
        font_unit: e.unit_n || e.font_unit || "px",
        overflow: e.overflow !== !1
      };
    });
  if (s.content && s.content !== "empty") {
    const e = s.span_c ?? s.content.startsWith("gauge_");
    return [{
      id: s.content,
      x: 0,
      y: 0,
      w: e ? 100 : 33.333,
      h: e ? 100 : 33.333,
      inner: s.inner_c || "cc",
      font_size: s.size_n || s.size_v || s.font_size || null,
      font_weight: s.weight_n || s.weight_v || s.font_weight || null,
      font_color: s.color_n || s.color_v || s.color || null,
      font_unit: s.unit_n || s.font_unit || "px",
      overflow: s.overflow !== !1
    }];
  }
  return [];
}
class Qt extends Be {
  static get properties() {
    return { config: { type: Object } };
  }
  static get styles() {
    return Xe`
      :host {
        display: block; width: 100%; height: 100%; min-height: 60px;
        animation: fadeIn 0.15s ease-in-out;
      }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      
      .sc-layout-master { 
        display:flex; flex-direction:column; width:100%; height:100%; min-width:0; min-height:0; 
      }
      .sc-layout-row { display:flex; flex-direction:row; width:100%; min-height:0; min-width:0; }
      
      .sc-layout-cell {
        position: relative; 
        height: 100%; min-width: 0; min-height: 0; max-width: 100%; width: 100%;
        container-type: size; 
        container-name: cell;
      }
      
      .sc-layout-cell.overflow-hidden { overflow: hidden; }
      .sc-layout-cell.overflow-visible { overflow: visible; }
      
      .sc-item-slot {
        position: absolute; 
        display: flex; box-sizing: border-box;
        pointer-events: auto; z-index: 2;
        overflow: hidden; 
        container-type: size;
        container-name: item;
      }
      
      .sc-item-slot.overflow-visible { overflow: visible !important; }
      
      .sc-lbl-n, .sc-lbl-v {
        line-height: 1.1; white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; max-width: 100%; min-width: 0; display: block;
      }
      
      ::slotted(*) { pointer-events:auto !important; }
      ::slotted(sc-gauge) { width:100cqmin !important; height:100cqmin !important; max-width:100% !important; max-height:100% !important; }
      ::slotted(sc-progressbar) { width:100% !important; max-height:100% !important; }
      ::slotted([slot^="label_"]) {
        display:flex !important; flex-direction:column !important;
        align-items:center; justify-content:center; width:100%; height:100%;
        overflow: hidden; min-width: 0;
      }
      
      /* --- DEBUG MODE --- */
      .debug-mode .sc-layout-cell { outline: 1px solid rgba(0,255,0,0.5); background: rgba(0,255,0,0.05); }
      .debug-mode .sc-item-slot { outline: 1px solid rgba(255,0,255,0.6) !important; background: rgba(255,0,255,0.1) !important; }
      .debug-mode .sc-lbl-n, .debug-mode .sc-lbl-v, .debug-mode ::slotted(*) {
        outline: 1px dashed rgba(0,255,255,0.8) !important; background: rgba(0,255,255,0.1) !important;
      }
      .dbg-label { position:absolute; top:0; left:0; font-size:10px; color:#000; background:#0f0; padding:2px 4px; z-index:999; border-radius:0 0 4px 0; font-weight:bold; pointer-events:none; }
      .debug-flexbox .sc-item-slot { 
        outline: 1px dotted rgba(255, 255, 0, 0.8) !important; 
        background: rgba(255, 255, 0, 0.1) !important; 
      }
    `;
  }
  _innerStyle(e) {
    const o = {
      tl: "start,flex-start,left",
      tc: "start,center,center",
      tr: "start,flex-end,right",
      cl: "center,flex-start,left",
      cc: "center,center,center",
      cr: "center,flex-end,right",
      bl: "end,flex-start,left",
      bc: "end,center,center",
      br: "end,flex-end,right"
    }, [p, t, i] = (o[e] || o.cc).split(",");
    return `align-items:${p}; justify-content:${t}; text-align:${i};`;
  }
  _getResolvedLabel(e) {
    var p, t, i;
    const o = (i = (t = (p = this.config) == null ? void 0 : p.__moduleData) == null ? void 0 : t.labels) == null ? void 0 : i.labelsResolved;
    return Array.isArray(o) && o.find((r) => r.id === e) || null;
  }
  _renderResolvedLabel(e, o) {
    var k, J, A, _e, Pe, We, He, rt, Ve, Me, Qe, L, z, Ee;
    const p = e.match(/^label_(\d+)(?:_(icon|name|value))?$/);
    if (!p) return _``;
    const t = p[1], i = p[2], r = this._getResolvedLabel(`label_${t}`);
    if (!r || !r.enabled) return _``;
    const u = o && o.overflow, n = u ? "overflow:visible; white-space:nowrap; max-width:none;" : "overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;", l = u ? "overflow:visible; max-width:none;" : "max-width:100%; overflow:hidden;", d = ((k = r.text) == null ? void 0 : k.name) || "", a = ((J = r.text) == null ? void 0 : J.value) || "", c = Math.max(1, d.length) + 1, h = Math.max(1, a.length) + 1, v = (o == null ? void 0 : o.font_factor) || 0.55, b = (o == null ? void 0 : o.font_factor) || 0.55, g = (A = r.text) != null && A.shadow ? "text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5);" : "", m = (_e = r.text) != null && _e.shadow ? "filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.8));" : "", f = `font-size: min(var(--sc-fs-n, inherit), 100cqh, calc(100cqi / (${c} * ${v}))); font-weight:var(--sc-fw-n, inherit); color:var(--sc-fc-n, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${n} ${g}`, y = `font-size: min(var(--sc-fs-v, inherit), 100cqh, calc(100cqi / (${h} * ${b}))); font-weight:var(--sc-fw-v, inherit); color:var(--sc-fc-v, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${n} ${g}`, $ = `var(--sc-fs-n, ${r.icon.size || "20px"})`, w = (Pe = r.icon) != null && Pe.enabled ? _`<ha-icon icon=${r.icon.name} style="--mdc-icon-size:${$}; color:${r.icon.color || "inherit"}; ${m} vertical-align:middle; display:inline-flex; align-items:center; flex-shrink:0;"></ha-icon>` : null;
    if (i === "icon") return w ? _`<div style="display:flex;align-items:center;justify-content:center;min-width:0;${l}">${w}</div>` : _``;
    if (i === "name") return _`<span class="sc-lbl-n" style="${f}">${((We = r.text) == null ? void 0 : We.name) || ""}</span>`;
    if (i === "value") return _`<span class="sc-lbl-v" style="${y}">${((He = r.text) == null ? void 0 : He.value) || ""}</span>`;
    if (r.mode === "icon-only") return _`<div style="display:flex;align-items:center;justify-content:center;min-width:0;${l}">${w}</div>`;
    const S = (rt = r.icon) != null && rt.enabled && r.icon.position === "before" ? _`<span style="margin-right:${r.icon.gap ?? 4}px;display:inline-flex;flex-shrink:0;">${w}</span>` : null, x = (Ve = r.icon) != null && Ve.enabled && r.icon.position === "after" ? _`<span style="margin-left:${r.icon.gap ?? 4}px;display:inline-flex;flex-shrink:0;">${w}</span>` : null;
    return ((Me = r.text) == null ? void 0 : Me.showName) !== !1 ? _`
        <div style="display:flex; flex-direction:column; align-items:inherit; justify-content:inherit; min-width:0; ${l}">
          <div style="display:flex; align-items:center; min-width:0; ${l}">
            ${S}<span class="sc-lbl-n" style="${f}">${((Qe = r.text) == null ? void 0 : Qe.name) || ""}</span>${x}
          </div>
          ${(L = r.text) != null && L.value ? _`<span class="sc-lbl-v" style="${y} margin-top:2px;">${r.text.value}</span>` : ""}
        </div>` : _`<div style="display:flex; align-items:center; min-width:0; ${l}">${S}<span class="sc-lbl-n" style="${f}">${((z = r.text) == null ? void 0 : z.value) || ((Ee = r.text) == null ? void 0 : Ee.name) || ""}</span>${x}</div>`;
  }
  render() {
    var r;
    if (!((r = this.config) != null && r.layout_rows)) return _``;
    const e = this.config.layout_rows, o = this.config.layout_debug, p = Math.min(100, e.reduce((u, n) => u + (parseFloat(n.flex) || 0), 0)), t = e.filter((u) => !(parseFloat(u.flex) > 0)).length, i = e.flatMap(
      (u) => u.cells.flatMap(
        (n) => ft(n).map((l) => {
          let d = "";
          const a = (c, h) => h ? "var(--primary-text-color)" : c || "";
          if (l.font_size || l.font_weight || l.font_color || l.font_adaptive) {
            const c = l.font_size ? "font-size: inherit !important;" : "", h = l.font_weight ? `font-weight:${l.font_weight}!important;` : "", v = a(l.font_color, l.font_adaptive), b = v ? `color:${v}!important;` : "";
            d += `::slotted([slot="${l.id}"]) { ${c}${h}${b} }
`;
            let g = "";
            if (l.font_size) {
              const f = `min(${`${l.font_size}${l.font_unit || "px"}`}, 100cqh, 100cqi)`;
              g += `font-size: ${f} !important; --sc-fs-n:${f}; --sc-fs-v:${f}; `;
            }
            l.font_weight && (g += `--sc-fw-n:${l.font_weight}; --sc-fw-v:${l.font_weight}; `), v && (g += `--sc-fc-n:${v}; --sc-fc-v:${v}; `), g && (d += `.sc-item-slot[data-item-id="${l.id}"] { ${g} }
`);
          }
          return l.overflow && (d += `.sc-item-slot[data-item-id="${l.id}"] { overflow: visible !important; }
               .sc-item-slot[data-item-id="${l.id}"] .sc-lbl-n, .sc-item-slot[data-item-id="${l.id}"] .sc-lbl-v,
               ::slotted([slot="${l.id}"]) { overflow: visible !important; max-width: none !important; text-overflow: clip !important; }
`), d;
        }).filter(Boolean)
      )
    ).join(`
`);
    return _`
      <style>${i}</style>
      <div class="sc-layout-master ${o ? "debug-mode" : ""}">
        ${e.map((u, n) => {
      let l = 0;
      const d = parseFloat(u.flex) || 0;
      d > 0 ? l = d : l = t > 0 ? (100 - p) / t : 0;
      const a = `flex: 0 0 ${l}%; height: ${l}%;`;
      return _`
            <div class="sc-layout-row" style="${a}">
              ${u.cells.map((c, h) => {
        const v = u.auto_width ? 100 / u.cells.length : c.width || 100, b = ft(c), g = !!c.overflow_visible;
        return _`
                  <div part="cell-${n}-${h}" class="sc-layout-cell ${g ? "overflow-visible" : "overflow-hidden"} ${c.debug_grid ? "debug-flexbox" : ""}" style="flex-basis:${v}%;">
                    ${o ? _`<div class="dbg-label">Z${n + 1}C${h + 1} (${Math.round(v * 10) / 10}%)</div>` : ""}
                    
                    ${b.map((m, f) => {
          var $, w;
          let y = "";
          if (($ = m.id) != null && $.startsWith("label_")) {
            const S = m.id.match(/^label_(\d+)/);
            if (S) {
              const x = this._getResolvedLabel(`label_${S[1]}`);
              if (x && x.container && x.container.isIndicator) {
                const k = x.container;
                y = `background: ${k.bgColor} !important; border-radius: ${k.radius} !important; color: ${k.color} !important; transition: background 0.3s ease, color 0.3s ease, border-radius 0.3s ease; box-sizing: border-box;`;
              }
            }
          }
          return _`
                      <div class="sc-item-slot ${m.overflow ? "overflow-visible" : ""}" 
                           data-item-id="${m.id}" 
                           style="left:${m.x}%; top:${m.y}%; width:${m.w}%; height:${m.h}%; ${this._innerStyle(m.inner || "cc")} ${y}">
                        
                        ${o ? _`<div class="dbg-id" style="position:absolute; bottom:0; right:0; font-size:9px; color:#fff; background:rgba(244,67,54,0.9); padding:1px 3px; z-index:999; border-radius:3px 0 0 0; font-weight:bold; white-space:nowrap; pointer-events:none;">${m.id}</div>` : ""}

                        ${(w = m.id) != null && w.startsWith("label_") ? this._renderResolvedLabel(m.id, m) : _`<slot name="${m.id}"></slot>`}
                      </div>`;
        })}
                  </div>`;
      })}
            </div>`;
    })}
      </div>`;
  }
}
customElements.get("sc-layout-renderer") || customElements.define("sc-layout-renderer", Qt);
class $t extends Be {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      _expanded: { type: Object, state: !0 },
      _dragState: { type: Object, state: !0 }
    };
  }
  constructor() {
    super(), this._expanded = $t._expandedCache ?? {}, this._dragState = null, this._dndSource = null;
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }

      .row-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 8px; transition: border-color 0.2s, background-color 0.2s; }
      .row-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; user-select: none; }
      .cell-list { display: flex; flex-direction: column; gap: 8px; min-height: 40px; padding: 8px 0; }
      .cell-card { background: var(--card-background-color, #2b2b2b); border: 1px dashed var(--divider-color, #555); border-radius: 6px; padding: 8px; transition: border-color 0.2s, background-color 0.2s; }
      .cell-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; cursor: pointer; }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
      
      select, input[type="range"], input[type="number"], input[type="text"] { background: var(--secondary-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 4px; }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; margin-top: 4px; }
      
      /* --- DRAG & DROP STYLES --- */
      .drag-handle-wrap { cursor: grab; margin-right: 8px; color: var(--secondary-text-color); display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s, color 0.2s; }
      .drag-handle-wrap:hover { background: rgba(255,255,255,0.1); color: var(--primary-text-color); }
      .drag-handle-wrap:active { cursor: grabbing; }
      
      .row-card.drag-over, .cell-card.drag-over {
        border-color: var(--primary-color, #03a9f4) !important;
        background: rgba(3, 169, 244, 0.1) !important;
        border-style: dashed !important;
      }
      
      /* HIER WAR DER FEHLER: Wir ignorieren NICHT die cell-list! So bleibt sie greifbar. */
      .is-dragging .row-card > :not(.cell-list), .is-dragging .cell-card > * { pointer-events: none !important; }
      
      .dragging-ghost { opacity: 0.4; filter: grayscale(1); border: 1px dashed var(--primary-color) !important; }

      /* --- TRACKPAD STYLES --- */
      .trackpad-wrap { display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; margin-top: 8px; border: 1px solid var(--divider-color); }
      .trackpad-canvas-container { display: flex; justify-content: center; align-items: center; width: 100%; background: rgba(0,0,0,0.15); border-radius: 4px; padding: 12px 8px; box-sizing: border-box; border: 1px dashed var(--divider-color, #444); }
      .trackpad-canvas { position: relative; width: 100%; background: #1a1a1a; border-radius: 4px; border: 1px solid #555; overflow: hidden; touch-action: none; user-select: none; transition: aspect-ratio 0.3s ease, max-width 0.3s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      .tp-grid-lines { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px); }
      .tp-item { position: absolute; background: rgba(3,169,244,0.3); border: 1px solid var(--primary-color); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #fff; text-shadow: 0 1px 2px #000; cursor: grab; box-sizing: border-box; transition: background 0.2s; }
      .tp-item:hover { background: rgba(3,169,244,0.5); }
      .tp-item:active { cursor: grabbing; }
      .tp-resize-handle { position: absolute; right: 0; bottom: 0; width: 12px; height: 12px; background: rgba(255,255,255,0.8); border-radius: 100% 0 0 0; cursor: nwse-resize; touch-action: none; }
      .tp-resize-handle:hover { background: var(--warning-color); }
      .tp-resize-handle::after { content: ''; position: absolute; right: -10px; bottom: -10px; width: 20px; height: 20px; }
      .grid-picker { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px; width: 54px; height: 54px; }
      .grid-dot { background: var(--divider-color, #555); border-radius: 2px; cursor: pointer; }
      .grid-dot.active { background: var(--primary-color); }
    `;
  }
  _commit(e) {
    this.dispatchEvent(new CustomEvent("layout-update", { detail: { layout_rows: e } }));
  }
  _toggleExpand(e, o) {
    o && o.stopPropagation(), this._expanded = { ...this._expanded, [e]: !this._expanded[e] }, $t._expandedCache = this._expanded;
  }
  // --- HTML5 DRAG AND DROP (Sortierung) ---
  _handleDragStart(e, o, p, t = null) {
    e.stopPropagation(), this._dndSource = { type: o, rIdx: p, cIdx: t }, e.dataTransfer && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("application/json", JSON.stringify({ type: o, rIdx: p, cIdx: t })), setTimeout(() => {
      e.target.classList.add("dragging-ghost");
      const i = this.shadowRoot.querySelector(".inner-content");
      i && i.classList.add("is-dragging");
    }, 0));
  }
  _handleDragOver(e, o) {
    this._dndSource && this._dndSource.type === o && (e.preventDefault(), e.stopPropagation(), e.currentTarget.classList.add("drag-over"), e.dataTransfer && (e.dataTransfer.dropEffect = "move"));
  }
  _handleDragLeave(e, o) {
    this._dndSource && this._dndSource.type === o && e.currentTarget.classList.remove("drag-over");
  }
  _handleDrop(e, o, p, t, i) {
    if (!this._dndSource || this._dndSource.type !== o) return;
    e.preventDefault(), e.stopPropagation(), e.currentTarget.classList.remove("drag-over");
    const r = this._dndSource, u = JSON.parse(JSON.stringify(i));
    if (o === "row") {
      if (r.rIdx === p) return;
      const [n] = u.splice(r.rIdx, 1);
      u.splice(p, 0, n);
    } else if (o === "cell") {
      if (r.rIdx === p && r.cIdx === t) return;
      const [n] = u[r.rIdx].cells.splice(r.cIdx, 1);
      u[p].cells.splice(t, 0, n), [r.rIdx, p].forEach((l) => {
        const d = u[l];
        if (!(!d || d.cells.length === 0) && (d.auto_width || d.sync_widths)) {
          const a = Math.floor(100 / d.cells.length);
          d.cells.forEach((c, h) => c.width = h === d.cells.length - 1 ? 100 - a * h : a);
        }
      });
    }
    this._commit(u), e.currentTarget.removeAttribute("draggable"), this._dndSource = null;
  }
  _handleDragEnd(e) {
    e.target.classList.remove("dragging-ghost"), e.target.removeAttribute("draggable"), this._dndSource = null;
    const o = this.shadowRoot;
    if (o) {
      const p = o.querySelector(".inner-content");
      p && p.classList.remove("is-dragging"), o.querySelectorAll(".drag-over").forEach((t) => t.classList.remove("drag-over"));
    }
  }
  // --- TRACKPAD LOGIK ---
  _handlePointerDown(e, o, p, t, i, r) {
    e.stopPropagation();
    const u = Date.now(), n = this._lastClickTime && u - this._lastClickTime < 300;
    this._lastClickTime = u;
    const l = r[o].cells[p].items[t], d = parseFloat(r[o].cells[p]._gridSnap || 5);
    if (n && d > 0 && i === "move") {
      const h = JSON.parse(JSON.stringify(r)), v = h[o].cells[p].items[t];
      v.w = Math.max(d, Math.min(d, 100 - v.x)), v.h = Math.max(d, Math.min(d, 100 - v.y)), this._commit(h);
      return;
    }
    const c = e.currentTarget.closest(".trackpad-canvas").getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId), this._dragState = {
      rIdx: o,
      cIdx: p,
      iIdx: t,
      type: i,
      rect: c,
      startX: e.clientX,
      startY: e.clientY,
      startItemX: Number(l.x) || 0,
      startItemY: Number(l.y) || 0,
      startItemW: Number(l.w) || 33.333,
      startItemH: Number(l.h) || 33.333
    };
  }
  _handlePointerMove(e, o) {
    if (!this._dragState) return;
    const { rIdx: p, cIdx: t, iIdx: i, type: r, rect: u, startX: n, startY: l, startItemX: d, startItemY: a, startItemW: c, startItemH: h } = this._dragState, v = o[p].cells[t]._gridSnap, b = parseFloat(v !== void 0 ? v : 5), g = b > 0 ? b : 1, m = (e.clientX - n) / u.width * 100, f = (e.clientY - l) / u.height * 100, y = JSON.parse(JSON.stringify(o)), $ = y[p].cells[t].items[i];
    if (r === "move") {
      let w = d + m, S = a + f;
      w = Math.round(w / g) * g, S = Math.round(S / g) * g, $.x = Math.max(0, Math.min(w, 100 - c)), $.y = Math.max(0, Math.min(S, 100 - h)), $.w = c, $.h = h;
    } else if (r === "resize") {
      let w = c + m, S = h + f;
      w = Math.round(w / g) * g, S = Math.round(S / g) * g, $.w = Math.max(1, Math.min(w, 100 - d)), $.h = Math.max(1, Math.min(S, 100 - a)), $.x = d, $.y = a;
    }
    this._commit(y);
  }
  _handlePointerUp(e) {
    if (this._dragState) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
      }
      this._dragState = null;
    }
  }
  _renderTrackpad(e, o, p, t) {
    const i = ft(e), r = e._gridSnap !== void 0 ? e._gridSnap : 5, u = Math.min(100, t.reduce((f, y) => f + (parseFloat(y.flex) || 0), 0)), n = t.filter((f) => !(parseFloat(f.flex) > 0)).length;
    let l = 1, d = parseFloat(t[o].flex) || 0;
    if (d > 0)
      l = d / 100;
    else {
      const f = 100 - u;
      l = (n > 0 ? f / n : 0) / 100;
    }
    l <= 0 && (l = 0.01);
    let a = e.width || 100;
    t[o].auto_width && t[o].cells.length > 0 && (a = 100 / t[o].cells.length);
    let c = a / 100, h = c / l, v = Math.round(h * 1e3) / 1e3;
    const b = e._editorAspectRatio || v, g = e._editorAspectRatio !== void 0, m = r > 0 ? `${r}% ${r}%` : "10px 10px";
    return _`
      <div class="trackpad-wrap">
        <div class="row" style="margin-bottom: 4px;">
          <label style="font-weight:bold; color:var(--primary-color);">📐 Freifläche (Canvas)</label>
        </div>
        
        <div style="font-size: 10px; color: var(--secondary-text-color); margin-bottom: 8px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 4px; border-left: 2px solid var(--primary-color);">
          <strong>Mathe:</strong> Zelle (${Math.round(c * 100)}% B / ${Math.round(l * 100)}% H) = <strong>${v}</strong>
        </div>

        <div class="row" style="margin-bottom: 8px;">
          <div style="display:flex; gap:4px; align-items:center;">
            <label style="font-size:10px;">Helfer-Grid:</label>
            <select style="font-size:11px; padding:2px;" @change=${(f) => {
      const y = JSON.parse(JSON.stringify(t));
      y[o].cells[p]._gridSnap = parseFloat(f.target.value), this._commit(y);
    }}>
              <option value="0" ?selected=${r === 0}>Aus (1%)</option>
              <option value="5" ?selected=${r === 5}>5%</option>
              <option value="10" ?selected=${r === 10}>10%</option>
              <option value="20" ?selected=${r === 20}>20%</option>
              <option value="25" ?selected=${r === 25}>25%</option>
              <option value="33.333" ?selected=${r === 33.333}>33.3%</option>
              <option value="50" ?selected=${r === 50}>50%</option>
            </select>
          </div>
          
          <div style="display:flex; gap:4px; align-items:center;">
            <label style="font-size:10px;">Ratio Override:</label>
            <input type="range" min="0.2" max="6.0" step="0.1" style="width:50px;" .value=${b} @input=${(f) => {
      const y = JSON.parse(JSON.stringify(t));
      y[o].cells[p]._editorAspectRatio = parseFloat(f.target.value), this._commit(y);
    }}>
            <button title="Auf exakte Mathematik (${v}) zurücksetzen" 
              style="background:none;border:none;cursor:pointer;font-size:12px;padding:0; margin-left:2px; ${g ? "filter:none; opacity:1;" : "filter:grayscale(1); opacity:0.4;"}" 
              @click=${() => {
      const f = JSON.parse(JSON.stringify(t));
      delete f[o].cells[p]._editorAspectRatio, this._commit(f);
    }}>🔄</button>
          </div>
        </div>
        
        <div class="trackpad-canvas-container">
          <div class="trackpad-canvas" 
               style="aspect-ratio: ${b}; max-height: 320px; max-width: calc(320px * ${b});"
               @pointermove=${(f) => this._handlePointerMove(f, t)}
               @pointerup=${this._handlePointerUp}
               @pointercancel=${this._handlePointerUp}
               @pointerleave=${this._handlePointerUp}>
            
            <div class="tp-grid-lines" style="background-size: ${m}; opacity: ${r > 0 ? 1 : 0.2};"></div>
            
            ${i.map((f, y) => _`
              <div class="tp-item" 
                   style="left:${f.x}%; top:${f.y}%; width:${f.w}%; height:${f.h}%;"
                   @pointerdown=${($) => this._handlePointerDown($, o, p, y, "move", t)}
                   
                   @dblclick=${($) => {
      $.stopPropagation();
      const w = parseFloat(e._gridSnap || 5);
      if (w <= 0) return;
      const S = JSON.parse(JSON.stringify(t)), x = S[o].cells[p].items[y];
      x.w = Math.max(w, Math.min(w, 100 - x.x)), x.h = Math.max(w, Math.min(w, 100 - x.y)), this._commit(S);
    }}>
                E${y + 1}
                <div class="tp-resize-handle" 
                     @pointerdown=${($) => this._handlePointerDown($, o, p, y, "resize", t)}></div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
  // --- ITEM EDITOR (Werte & Typo) ---
  _renderItemEditor(e, o, p, t, i, r, u) {
    var c;
    const n = ["name", "state"].includes(e.id) || ((c = e.id) == null ? void 0 : c.startsWith("label_")), l = (h, v) => {
      const b = JSON.parse(JSON.stringify(i));
      b[o].cells[p].items[t][h] = v, this._commit(b);
    }, d = `r${o}c${p}i${t}`, a = this._expanded[d] !== !1;
    return _`
      <div style="background:rgba(0,0,0,0.2);border:1px solid var(--divider-color,#555);border-radius:6px;padding:8px;margin-top:8px;">
        
        <div class="row" style="cursor:pointer; user-select:none; margin-bottom:${a ? "8px" : "0"};" @click=${(h) => this._toggleExpand(d, h)}>
          <label style="font-weight:bold;color:var(--primary-color);cursor:pointer; display:flex; align-items:center;">
            <span style="margin-right:8px">${a ? "▼" : "▶"}</span> Element ${t + 1} <span style="font-size:10px; color:var(--secondary-text-color); margin-left:6px; font-weight:normal;">(${e.id})</span>
          </label>
          <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;font-size:12px;"
            @click=${(h) => {
      h.stopPropagation();
      const v = JSON.parse(JSON.stringify(i));
      v[o].cells[p].items.splice(t, 1), this._commit(v);
    }}>✕ Entfernen</button>
        </div>
        
        ${a ? _`
        <div style="border-top:1px dashed var(--divider-color,#444); padding-top:8px;">
          <div class="row" style="margin-bottom:8px;">
            <select style="width:100%" @change=${(h) => l("id", h.target.value)}>
              ${(() => {
      const h = {};
      return r.filter((v) => v.id !== "empty").forEach((v) => {
        const b = v.group || "Allgemein";
        h[b] || (h[b] = []), h[b].push(v);
      }), Object.entries(h).map(([v, b]) => _`
                  <optgroup label="${v}">
                    ${b.map((g) => _`
                      <option value="${g.id}" ?selected=${e.id === g.id} ?disabled=${g.id !== e.id && u.includes(g.id)}>
                        ${g.label}
                      </option>`)}
                  </optgroup>
                `);
    })()}
            </select>
          </div>
          
          <div class="row" style="gap:4px; margin-bottom: 8px;">
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">X (%)</label>
              <input type="number" step="1" .value=${Math.round(e.x)} @change=${(h) => l("x", parseFloat(h.target.value))}>
            </div>
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Y (%)</label>
              <input type="number" step="1" .value=${Math.round(e.y)} @change=${(h) => l("y", parseFloat(h.target.value))}>
            </div>
          </div>
          <div class="row" style="gap:4px; margin-bottom: 8px;">
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Breite (%)</label>
              <input type="number" step="1" .value=${Math.round(e.w)} @change=${(h) => l("w", parseFloat(h.target.value))}>
            </div>
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Höhe (%)</label>
              <input type="number" step="1" .value=${Math.round(e.h)} @change=${(h) => l("h", parseFloat(h.target.value))}>
            </div>
          </div>

          <div class="row" style="margin-top:4px;">
            <label style="font-size:11px;">Innere Ausrichtung</label>
            <div class="grid-picker" style="width:40px; height:40px;">
              ${["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"].map((h) => _`
                <div class="grid-dot ${e.inner === h ? "active" : ""}" title="${h}" @click=${() => l("inner", h)}></div>`)}
            </div>
          </div>
          
          ${n ? _`
            <div style="border-top:1px dashed var(--divider-color); margin-top:8px; padding-top:8px;">
              <div class="row" style="margin-top:4px;">
                <label>Größe</label>
                <div style="display:flex;width:60%;gap:4px;">
                  <input type="number" step="0.1" style="flex:1" placeholder="Auto" .value=${e.font_size ?? ""} @input=${(h) => l("font_size", h.target.value !== "" ? parseFloat(h.target.value) : null)}>
                  <select style="width:75px" @change=${(h) => l("font_unit", h.target.value)}>
                    <option value="px" ?selected=${(e.font_unit || "px") === "px"}>px</option>
                    <option value="em" ?selected=${e.font_unit === "em"}>em</option>
                    <option value="cqw" ?selected=${e.font_unit === "cqw"}>cqw</option>
                    <option value="cqh" ?selected=${e.font_unit === "cqh"}>cqh</option>
                    <option value="cqmin" ?selected=${e.font_unit === "cqmin"}>cqmin</option>
                  </select>
                </div>
              </div>
              <div class="row" style="margin-top:6px; margin-bottom:4px;">
                <label style="font-size:11px;" title="Verringern, wenn der Text zu viel freien Rand lässt (z.B. bei schmalen Zahlen wie 1 oder .)">Text-Dichte (Faktor)</label>
                <div style="display:flex; align-items:center; width:60%; gap:8px;">
                  <input type="range" min="0.2" max="0.9" step="0.05" style="flex:1" .value=${e.font_factor || 0.55} @input=${(h) => l("font_factor", parseFloat(h.target.value))}>
                  <span style="font-size:10px; width:24px; text-align:right;">${e.font_factor || 0.55}</span>
                </div>
              </div>
              <div class="row" style="margin-top:4px;">
                <label>Schriftstil</label>
                <select style="width:60%" @change=${(h) => l("font_weight", h.target.value || null)}>
                  <option value="" ?selected=${!e.font_weight}>Standard</option>
                  <option value="bold" ?selected=${e.font_weight === "bold"}>Fett</option>
                  <option value="normal" ?selected=${e.font_weight === "normal"}>Normal</option>
                  <option value="100" ?selected=${e.font_weight === "100"}>Dünn</option>
                </select>
              </div>
            </div>` : ""}
        </div>
        ` : ""}
      </div>`;
  }
  render() {
    if (!this.slot) return _``;
    const e = Array.isArray(this.slot.layout_rows) ? this.slot.layout_rows : [], o = Xt(this.slot), p = e.flatMap((t) => t.cells.flatMap((i) => ft(i).map((r) => r.id))).filter(Boolean);
    return _`
      <details class="inner-section">
        <summary>── Layout & Freifläche <div style="display:flex; align-items:center; gap:8px;">
          <ha-switch .checked=${!!this.slot.layout_active} @click=${(t) => t.stopPropagation()} @change=${(t) => this.dispatchEvent(new CustomEvent("layout-update", { detail: { layout_active: t.target.checked } }))}></ha-switch>
          <span>▼</span>
        </summary>
        <div class="inner-content">

        <div class="row-card" style="margin-bottom: 12px; border-color: var(--primary-color); background: rgba(3, 169, 244, 0.05);">
            <div class="row" style="margin-bottom: 8px;">
              <label style="font-weight: bold; color: var(--primary-color);">👁 Standard-Elemente anzeigen</label>
            </div>
            <div class="row">
              <label>Icon</label>
              <ha-switch .checked=${this.slot.hide_icon !== !0} @change=${(t) => {
      this.dispatchEvent(new CustomEvent("layout-update", { detail: { hide_icon: !t.target.checked } }));
    }}></ha-switch>
            </div>
            <div class="row" style="margin-top: 8px;">
              <label>Name (Entität)</label>
              <ha-switch .checked=${this.slot.hide_entity_name !== !0} @change=${(t) => {
      this.dispatchEvent(new CustomEvent("layout-update", { detail: { hide_entity_name: !t.target.checked } }));
    }}></ha-switch>
            </div>
            <div class="row" style="margin-top: 8px;">
              <label>Zustand (Wert)</label>
              <ha-switch .checked=${this.slot.hide_entity_state !== !0} @change=${(t) => {
      this.dispatchEvent(new CustomEvent("layout-update", { detail: { hide_entity_state: !t.target.checked } }));
    }}></ha-switch>
            </div>
          </div>

          <div class="layout-wrap" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
            <div class="row-card" style="border-color: var(--warning-color, #ff9800); background: rgba(255, 152, 0, 0.05);">
              <div class="row">
                <label style="color: var(--warning-color, #ff9800); font-weight: bold;">🛠 Show Grid (Global)</label>
                <ha-switch .checked=${!!this.slot.layout_debug} @change=${(t) => {
      this.dispatchEvent(new CustomEvent("layout-update", { detail: { layout_debug: t.target.checked } }));
    }}></ha-switch>
              </div>
              <div style="font-size:11px; color:var(--secondary-text-color); margin-top:4px;">
                Zeigt im Dashboard grüne (Inhalt/Breite) und rote (ID) Indikatoren an.
              </div>
            </div>
          </div>

          ${e.map((t, i) => {
      const r = `r${i}`, u = !!this._expanded[r];
      return _`
            <div class="row-card"
                 @dragstart=${(n) => this._handleDragStart(n, "row", i)}
                 @dragend=${this._handleDragEnd}
                 @dragover=${(n) => this._handleDragOver(n, "row")}
                 @dragleave=${(n) => this._handleDragLeave(n, "row")}
                 @drop=${(n) => this._handleDrop(n, "row", i, null, e)}>

              <div class="row-header" @click=${(n) => this._toggleExpand(r, n)}>
                <div style="display:flex; align-items:center;">
                  <div class="drag-handle-wrap"
                       @mouseenter=${(n) => n.currentTarget.closest(".row-card").setAttribute("draggable", "true")}
                       @mouseleave=${(n) => n.currentTarget.closest(".row-card").removeAttribute("draggable")}
                       @mousedown=${(n) => {
        n.stopPropagation(), n.currentTarget.closest(".row-card").setAttribute("draggable", "true");
      }}
                       @click=${(n) => n.stopPropagation()}>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                    </svg>
                  </div>
                  <span style="margin-right:8px">${u ? "▼" : "▶"}</span>Zeile ${i + 1}
                </div>
                <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;" @click=${(n) => {
        n.stopPropagation();
        const l = [...e];
        l.splice(i, 1), this._commit(l);
      }}>🗑</button>
              </div>

              ${u ? _`
                <div class="row" style="margin-top: 8px;">
                  <label>Zeilen-Höhe (%)</label>
                  <div style="display:flex; align-items:center; width:60%; gap:8px;">
                    <input type="range" min="0" max="100" step="1" style="flex:1" .value=${t.flex ?? 0} @input=${(n) => {
        const l = JSON.parse(JSON.stringify(e));
        l[i].flex = parseInt(n.target.value), this._commit(l);
      }}>
                    <span style="font-size:11px; width:30px; text-align:right;">${t.flex > 0 ? t.flex + "%" : "Auto"}</span>
                  </div>
                </div>

                <div class="row" style="margin-top:12px; margin-bottom:8px;">
                    <label>Breite automatisch aufteilen</label>
                    <ha-switch .checked=${!!t.auto_width} @change=${(n) => {
        const l = JSON.parse(JSON.stringify(e));
        if (l[i].auto_width = n.target.checked, !n.target.checked && l[i].cells.length > 0) {
          const d = Math.floor(100 / l[i].cells.length);
          l[i].cells.forEach((a, c) => {
            a.width = c === l[i].cells.length - 1 ? 100 - d * c : d;
          });
        }
        this._commit(l);
      }}></ha-switch>
                  </div>

                  ${t.auto_width ? "" : _`
                    <div class="row" style="margin-bottom:8px;">
                      <label style="color: var(--secondary-text-color);">Breiten verketten (Ergibt immer 100%)</label>
                      <ha-switch .checked=${!!t.sync_widths} @change=${(n) => {
        const l = JSON.parse(JSON.stringify(e));
        if (l[i].sync_widths = n.target.checked, n.target.checked && l[i].cells.length > 0) {
          const d = Math.floor(100 / l[i].cells.length);
          l[i].cells.forEach((a, c) => {
            a.width = c === l[i].cells.length - 1 ? 100 - d * c : d;
          });
        }
        this._commit(l);
      }}></ha-switch>
                    </div>
                    
                    <div class="row" style="margin-bottom:12px;">
                      <button type="button" class="add-btn" style="border: 1px solid var(--divider-color); color: var(--primary-text-color); margin-top: 0; font-weight: normal; font-size: 12px;" @click=${() => {
        const n = JSON.parse(JSON.stringify(e));
        if (n[i].cells.length > 0) {
          const l = Math.floor(100 / n[i].cells.length);
          n[i].cells.forEach((d, a) => {
            d.width = a === n[i].cells.length - 1 ? 100 - l * a : l;
          }), this._commit(n);
        }
      }}>⚖️ Alle Container gleich breit</button>
                    </div>
                  `}
                <div class="cell-list">
                  ${t.cells.map((n, l) => {
        const d = `r${i}c${l}`, a = !!this._expanded[d];
        return _`
                    <div class="cell-card"
                         @dragstart=${(c) => this._handleDragStart(c, "cell", i, l)}
                         @dragend=${this._handleDragEnd}
                         @dragover=${(c) => this._handleDragOver(c, "cell")}
                         @dragleave=${(c) => this._handleDragLeave(c, "cell")}
                         @drop=${(c) => this._handleDrop(c, "cell", i, l, e)}>
                         
                      <div class="cell-header" @click=${(c) => this._toggleExpand(d, c)}>
                        <div style="display:flex; align-items:center;">
                          <div class="drag-handle-wrap"
                               @mouseenter=${(c) => c.currentTarget.closest(".cell-card").setAttribute("draggable", "true")}
                               @mouseleave=${(c) => c.currentTarget.closest(".cell-card").removeAttribute("draggable")}
                               @mousedown=${(c) => {
          c.stopPropagation(), c.currentTarget.closest(".cell-card").setAttribute("draggable", "true");
        }}
                               @click=${(c) => c.stopPropagation()}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                            </svg>
                          </div>
                          <span style="margin-right:8px">${a ? "▼" : "▶"}</span>Zelle ${l + 1}
                        </div>
                        <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;" @click=${(c) => {
          c.stopPropagation();
          const h = JSON.parse(JSON.stringify(e));
          h[i].cells.splice(l, 1), this._commit(h);
        }}>✕</button>
                      </div>
                      
                      ${a ? _`
                        ${t.auto_width ? "" : _`
                        <div class="row" style="margin-top: 6px; margin-bottom: 8px;">
                          <label>Breite (%)</label>
                          <div style="display:flex; align-items:center; width:60%; gap:8px;">
                            <input type="range" min="1" max="100" step="1" style="flex:1;" .value=${n.width || 100} @input=${(c) => {
          const h = JSON.parse(JSON.stringify(e));
          let v = parseInt(c.target.value);
          if (t.sync_widths) {
            const b = (h[i].cells.length - 1) * 10;
            v > 100 - b && (v = 100 - b), v < 10 && (v = 10);
            const g = h[i].cells[l].width || 100;
            if (h[i].cells[l].width = v, h[i].cells.length > 1) {
              let m = v - g, f = h[i].cells.filter((S, x) => x !== l), y = 0;
              for (; Math.abs(m) > 0 && f.length > 0 && y < 100; ) {
                y++;
                let S = Math.round(m / f.length);
                S === 0 && (S = m > 0 ? 1 : -1);
                let x = [];
                for (let k of f) {
                  if (m === 0) break;
                  let J = k.width || 0, A = J - S;
                  if (A < 10) {
                    let _e = J - 10;
                    k.width = 10, m -= _e;
                  } else
                    k.width = A, m -= J - A, x.push(k);
                }
                f = x;
              }
              let w = 100 - h[i].cells.reduce((S, x) => S + (x.width || 0), 0);
              if (w !== 0) {
                let S = h[i].cells.filter((x, k) => k !== l);
                S.length > 0 && (S.sort((x, k) => (k.width || 0) - (x.width || 0)), S[0].width += w);
              }
            }
          } else
            v < 1 && (v = 1), v > 100 && (v = 100), h[i].cells[l].width = v;
          this._commit(h);
        }}>
                            <span style="font-size:11px; width:30px; text-align:right;">${n.width || 100}%</span>
                          </div>
                        </div>`}
                        
                        ${this._renderTrackpad(n, i, l, e)}

                        <div class="row" style="margin-top:12px; border-top:1px dashed var(--divider-color,#555); padding-top:12px;">
                          <label style="color:var(--primary-color,#03a9f4); font-weight:bold;">🎛 Show Element Flexbox</label>
                          <input type="checkbox" .checked=${!!n.debug_grid} @change=${(c) => {
          const h = JSON.parse(JSON.stringify(e));
          h[i].cells[l].debug_grid = c.target.checked, this._commit(h);
        }}>
                        </div>

                        <div style="margin-top:12px;">
                          ${ft(n).map((c, h) => this._renderItemEditor(c, i, l, h, e, o, p))}
                        </div>
                        <button type="button" class="add-btn" @click=${() => {
          const c = JSON.parse(JSON.stringify(e));
          Array.isArray(c[i].cells[l].items) || (c[i].cells[l].items = ft(c[i].cells[l]));
          const h = o.find((v) => v.id !== "empty" && !p.includes(v.id));
          c[i].cells[l].items.push({ id: (h == null ? void 0 : h.id) || "name", x: 0, y: 0, w: 33.333, h: 33.333, inner: "cc" }), this._commit(c);
        }}>＋ Element hinzufügen</button>
                      ` : ""}
                    </div>`;
      })}
                </div>
                <button type="button" class="add-btn" style="border-style: solid;" @click=${() => {
        const n = JSON.parse(JSON.stringify(e));
        n[i].cells.push({ id: "c" + Date.now(), width: 100, items: [] }), this._commit(n), this._expanded = { ...this._expanded, [`r${i}c${n[i].cells.length - 1}`]: !0 };
      }}>＋ Zelle hinzufügen</button>
              ` : ""}
            </div>`;
    })}
          
          <button type="button" class="add-btn" @click=${() => {
      const t = JSON.parse(JSON.stringify(e));
      t.push({ id: "r" + Date.now(), flex: 0, cells: [{ id: "c" + Date.now(), width: 100, items: [] }] }), this._commit(t), this._expanded = { ...this._expanded, [`r${t.length - 1}`]: !0 };
    }}>＋ Neue Zeile hinzufügen</button>
        </div>
      </details>
    `;
  }
}
customElements.get("sc-layout-editor") || ($t._expandedCache = {});
customElements.define("sc-layout-editor", $t);
window.SupercardModules.layout = /* @__PURE__ */ (() => {
  function s(p, t) {
    return t === "icon" ? p.querySelector("#icon") : t === "name" ? p.querySelector("#header") : t === "state" ? p.querySelector("#state") : t.startsWith("gauge_") ? p.querySelector(`sc-gauge[data-idx="${t.split("_")[1]}"]`) : t.startsWith("progressbar_") ? p.querySelector(`sc-progressbar[data-idx="${t.split("_")[1]}"]`) : null;
  }
  function e({ config: p }) {
    return p != null && p.layout_active ? { litOverlay: _`<sc-layout-renderer .config=${p}></sc-layout-renderer>` } : {};
  }
  function o(p, t) {
    const i = p.querySelector(".sc-content-row");
    if (!(t != null && t.layout_active)) {
      i && (i.style.display = "flex");
      return;
    }
    const r = p.querySelector("sc-layout-renderer");
    if (!r) return;
    i && (i.style.display = "none");
    const u = (l, d) => {
      l && (d === "icon" && l.classList.add("sc-primary-icon"), d === "name" && l.classList.add("sc-lbl-n"), d === "state" && l.classList.add("sc-lbl-v"), l.slot !== d && (l.slot = d), l.parentElement !== r && r.appendChild(l));
    };
    (Array.isArray(t.layout_rows) ? t.layout_rows : []).forEach((l) => {
      l.cells.forEach((d) => {
        ft(d).forEach((a) => {
          var c;
          (c = a.id) != null && c.startsWith("label_") || u(s(p, a.id), a.id);
        });
      });
    });
  }
  return { update: e, onAfterRender: o, initCSS: () => "", editorFields: () => [], renderCustomBlock: (p, t, i) => _`<sc-layout-editor .slot=${i} .hass=${t} @layout-update=${(r) => {
    r.detail && p("__merge__", r.detail);
  }}></sc-layout-editor>` };
})();
window.SupercardModules = window.SupercardModules || {};
window.SupercardModules.gauge = window.SupercardModules.gauge || {};
Object.assign(window.SupercardModules.gauge, (() => {
  function s() {
  }
  const e = [
    { id: "_section_shape", label: "── Form & Position", type: "section" },
    { id: "gauge_type", label: "Gauge-Typ", type: "select", options: [{ value: "full", label: "Full 360°" }, { value: "semi", label: "Semi 270°" }] },
    { id: "gauge_start_angle", label: "Start-Position (0-Punkt)", type: "select", options: [{ value: "-90", label: "Oben (12 Uhr)" }, { value: "90", label: "Unten (6 Uhr)" }, { value: "180", label: "Links (9 Uhr)" }, { value: "0", label: "Rechts (3 Uhr)" }], showIf: { field: "gauge_type", value: "full" } },
    { id: "gauge_scale", label: "Skalierung", type: "range", min: 0, max: 1, step: 0.01, placeholder: "1" },
    { id: "gauge_position_mode", label: "Ankerpunkt / Position", type: "9-sector" },
    { id: "gauge_size_responsive", label: "Responsive Größe (Auto-Skalierung)", type: "checkbox" },
    { id: "gauge_size_px", label: "Größe (px)", type: "range", min: 0, max: 600, step: 1, placeholder: "60", showIf: { field: "gauge_size_responsive", notValue: !0 } },
    { id: "gauge_offset_x", label: "Offset X (px)", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0" },
    { id: "gauge_offset_y", label: "Offset Y (px)", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0" },
    { id: "_section_frame", label: "── Rahmen-Ring", type: "section" },
    { id: "frame_ring_active", label: "Rahmen aktiv", type: "checkbox" },
    { id: "frame_ring_closed", label: "Geschlossener Kreis", type: "checkbox", showIf: { field: "frame_ring_active", value: !0 } },
    { id: "frame_ring_width", label: "Breite", type: "range", min: 0, max: 3, step: 0.1, placeholder: "1.5", showIf: { field: "frame_ring_active", value: !0 } },
    { id: "frame_ring_gap", label: "Abstand zum Gradientenring", type: "range", min: 0, max: 3, step: 0.1, placeholder: "1.5", showIf: { field: "frame_ring_active", value: !0 } },
    { id: "frame_ring_color_type", label: "Farb-Modus", type: "select", options: [{ value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }], showIf: { field: "frame_ring_active", value: !0 } },
    { id: "frame_ring_color", label: "Farbe (Fix)", type: "color", showIf: [{ field: "frame_ring_active", value: !0 }, { field: "frame_ring_color_type", notValue: "adaptive" }] },
    { id: "frame_ring_opacity", label: "Deckkraft", type: "range", min: 0, max: 1, step: 0.01, placeholder: "1.0", showIf: { field: "frame_ring_active", value: !0 } },
    { id: "_section_bg", label: "── Hintergrund", type: "section" },
    { id: "bg_mode", label: "Hintergrund-Modus", type: "select", options: [{ value: "none", label: "Keiner" }, { value: "adaptive", label: "Adaptiv (Theme)" }, { value: "solid", label: "Einfarbig" }, { value: "linear", label: "Linearer Verlauf" }, { value: "radial", label: "Radialer Verlauf" }] },
    { id: "bg_gradient_preset", label: "Verlaufstyp", type: "select", options: [{ value: "classic", label: "Klassisch (2 Farben)" }, { value: "manual", label: "Manuell (Liste)" }], showIf: { field: "bg_mode", value: ["linear", "radial"] } },
    { id: "bg_threshold_unit", label: "Schwellen-Einheit", type: "select", options: [{ value: "percent", label: "Prozent (%)" }, { value: "absolute", label: "Absolut" }], showIf: [{ field: "bg_mode", value: ["linear", "radial"] }, { field: "bg_gradient_preset", value: "manual" }] },
    { id: "bg_opacity", label: "Deckkraft", type: "range", min: 0, max: 1, step: 0.01, placeholder: "1.0" },
    { id: "bg_color1", label: "Farbe 1 (Innen / Start)", type: "color", showIf: [{ field: "bg_mode", value: ["solid", "linear", "radial"] }, { field: "bg_gradient_preset", notValue: "manual" }] },
    { id: "bg_color2", label: "Farbe 2 (Außen / Ende)", type: "color", showIf: [{ field: "bg_mode", value: ["linear", "radial"] }, { field: "bg_gradient_preset", notValue: "manual" }] },
    { id: "bg_balance", label: "Balance (%)", type: "range", min: 0, max: 100, step: 0.1, placeholder: "50", showIf: [{ field: "bg_mode", value: ["linear", "radial"] }, { field: "bg_gradient_preset", notValue: "manual" }] },
    { id: "bg_gradient_angle", label: "Winkel (° nur Linear)", type: "range", min: 0, max: 360, step: 1, placeholder: "135", showIf: { field: "bg_mode", value: "linear" } },
    { id: "bg_manual_stops", type: "bg_manual_stops", showIf: [{ field: "bg_mode", value: ["linear", "radial"] }, { field: "bg_gradient_preset", value: "manual" }] },
    { id: "_section_bg_threshold", label: "── Hintergrund-Farbe (Schwellwert)", type: "subsection" },
    { id: "bg_color_threshold_active", label: "Schwellwert aktiv", type: "checkbox" },
    { id: "bg_color_threshold_operator", label: "Operator", type: "select", options: [{ value: ">", label: "> Größer" }, { value: "<", label: "< Kleiner" }, { value: ">=", label: ">= Größer gleich" }, { value: "<=", label: "<= Kleiner gleich" }, { value: "==", label: "== Gleich" }], showIf: { field: "bg_color_threshold_active", value: !0 } },
    { id: "bg_color_threshold_value", label: "Schwellwert", type: "number", placeholder: "80", showIf: { field: "bg_color_threshold_active", value: !0 } },
    { id: "bg_color_threshold_hysteresis", label: "Hysterese (%)", type: "range", min: 0, max: 10, step: 0.1, placeholder: "5", showIf: { field: "bg_color_threshold_active", value: !0 } },
    { id: "bg_color_threshold_color", label: "Neue Hintergrundfarbe", type: "color", showIf: { field: "bg_color_threshold_active", value: !0 } },
    { id: "_section_threshold_anim", label: "── Threshold-Animation", type: "subsection" },
    { id: "bg_threshold_anim_active", label: "Animation aktiv", type: "checkbox" },
    { id: "bg_threshold_anim_operator", label: "Operator", type: "select", options: [{ value: ">", label: "> Größer" }, { value: "<", label: "< Kleiner" }, { value: ">=", label: ">= Größer gleich" }, { value: "<=", label: "<= Kleiner gleich" }, { value: "==", label: "== Gleich" }], showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_anim_value", label: "Schwellwert", type: "number", placeholder: "80", showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_anim_hysteresis", label: "Hysterese (%)", type: "range", min: 0, max: 10, step: 0.5, placeholder: "5", showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_anim_type", label: "Animationstyp", type: "select", options: [{ value: "pulse_bg", label: "Puls — Hintergrund" }, { value: "pulse_frame", label: "Puls — Rahmenring" }, { value: "ripple", label: "Ripple — Wasserwelle" }, { value: "waves", label: "Wellen (Linear wandernd)" }, { value: "wobble_radial", label: "Wassertropfen (Radial ausklingend)" }, { value: "wobble_linear", label: "Schockwelle (Linear ausklingend)" }], showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_anim_color", label: "Animationsfarbe (C1)", type: "color", showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_anim_color2", label: "Animationsfarbe 2 (Tal)", type: "color", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["waves", "wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_anim_duration", label: "Dauer (s)", type: "number", step: 0.1, placeholder: "1.5", showIf: { field: "bg_threshold_anim_active", value: !0 } },
    { id: "bg_threshold_wave_count", label: "Anzahl (Dichte)", type: "range", min: 1, max: 20, step: 1, placeholder: "3", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["waves", "wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_wave_balance", label: "Balance (Hügel vs Tal)", type: "range", min: 5, max: 95, step: 1, placeholder: "50", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["waves", "wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_gradient_angle", label: "Winkel (°)", type: "range", min: 0, max: 360, step: 1, placeholder: "90", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["waves", "wobble_linear"] }] },
    { id: "bg_threshold_wobble_amplitude", label: "Start-Amplitude (Kontrast)", type: "range", min: 1, max: 100, step: 1, placeholder: "100", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_wobble_freq", label: "Reichweite (Ausbreitung)", type: "range", min: 1, max: 10, step: 1, placeholder: "4", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_wobble_pause", label: "Pause nach Effekt (Sek.)", type: "range", min: 0, max: 10, step: 0.5, placeholder: "2", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["wobble_radial", "wobble_linear"] }] },
    { id: "bg_threshold_anim_ripple_multi", label: "Mehrere Ripple-Ringe (3×)", type: "checkbox", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: "ripple" }] },
    { id: "bg_threshold_anim_ripple_inv", label: "Implosion (Richtung umkehren)", type: "checkbox", showIf: [{ field: "bg_threshold_anim_active", value: !0 }, { field: "bg_threshold_anim_type", value: ["ripple", "waves"] }] },
    { id: "_section_data", label: "── Daten & Skalierung", type: "section" },
    { id: "min", label: "Min-Wert", type: "number", placeholder: "0" },
    { id: "max", label: "Max-Wert", type: "number", placeholder: "100" },
    { id: "value_autorange", label: "Auto-Range", type: "checkbox" },
    { id: "value_autoscale", label: "Auto-Scale k/M/G", type: "checkbox" },
    { id: "dynamic_max_scale", label: "Dynamischer Max", type: "checkbox" },
    { id: "autoscale_hysteresis", label: "Hysterese (%)", type: "number", placeholder: "10" },
    { id: "_section_color", label: "── Farbe & Gradient", type: "section" },
    { id: "stroke_width", label: "Ring-Dicke", type: "range", min: 0, max: 5, step: 0.01, placeholder: "3" },
    { id: "gradient_preset", label: "Farbmodus", type: "select", options: [{ value: "manual", label: "Manuell (Liste)" }, { value: "symmetriccustom", label: "Symmetrisch (Custom)" }, { value: "symmetric", label: "Symmetrisch (Standard)" }, { value: "linear", label: "Linear Ampel" }] },
    { id: "gradient_mode", label: "Verlaufstyp", type: "select", options: [{ value: "smooth", label: "Smooth" }, { value: "stepped", label: "Stepped" }], showIf: { field: "gradient_preset", value: ["manual", void 0] } },
    { id: "gradient_resolution", label: "Gradientenauflösung", type: "select", options: [{ value: "auto", label: "Automatisch (Größenabhängig)" }, { value: "coarse", label: "Grob (1× Farbzonen)" }, { value: "medium", label: "Mittel (12× Farbzonen)" }, { value: "fine", label: "Fein (24×) — Standard" }, { value: "superfine", label: "Superfein (48×)" }, { value: "ultrafine", label: "Ultrafein (96×)" }, { value: "megafine", label: "Megafein (192×)" }] },
    { id: "threshold_unit", label: "Schwellen-Einheit", type: "select", options: [{ value: "percent", label: "Prozent (%)" }, { value: "absolute", label: "Absolut" }], showIf: { field: "gradient_preset", value: ["manual", void 0] } },
    { id: "gradient_start", label: "Gradient-Start", type: "number", placeholder: "auto", showIf: { field: "gradient_preset", value: ["manual", void 0] } },
    { id: "gradient_end", label: "Gradient-Ende", type: "number", placeholder: "auto", showIf: { field: "gradient_preset", value: ["manual", void 0] } },
    { id: "manual_stops", type: "manual_stops", showIf: { field: "gradient_preset", value: ["manual", void 0] } },
    { id: "color1", label: "Farbe Außen", type: "color", showIf: { field: "gradient_preset", value: ["symmetric", "symmetriccustom"] } },
    { id: "color2", label: "Farbe Mitte", type: "color", showIf: { field: "gradient_preset", value: ["symmetric", "symmetriccustom"] } },
    { id: "color3", label: "Farbe Zentrum", type: "color", showIf: { field: "gradient_preset", value: ["symmetric", "symmetriccustom"] } },
    { id: "threshold1", label: "Übergang Zentrum→Mitte (%)", type: "range", min: 0, max: 98, step: 1, placeholder: "40", showIf: { field: "gradient_preset", value: "symmetriccustom" } },
    { id: "threshold2", label: "Übergang Mitte→Außen (%)", type: "range", min: 0, max: 100, step: 1, placeholder: "75", showIf: { field: "gradient_preset", value: "symmetriccustom" } },
    { id: "threshold3", label: "Gradient-Breite Übergang 1 (%)", type: "range", min: 0.5, max: 30, step: 0.5, placeholder: "8", showIf: { field: "gradient_preset", value: "symmetriccustom" } },
    { id: "threshold4", label: "Gradient-Breite Übergang 2 (%)", type: "range", min: 0.5, max: 30, step: 0.5, placeholder: "8", showIf: { field: "gradient_preset", value: "symmetriccustom" } },
    { id: "color1", label: "Farbe Start", type: "color", showIf: { field: "gradient_preset", value: "linear" } },
    { id: "color2", label: "Farbe Mitte", type: "color", showIf: { field: "gradient_preset", value: "linear" } },
    { id: "color3", label: "Farbe Ende", type: "color", showIf: { field: "gradient_preset", value: "linear" } },
    { id: "threshold1", label: "Start-Spread (%)", type: "range", min: 0, max: 100, step: 1, placeholder: "20", showIf: { field: "gradient_preset", value: "linear" } },
    { id: "threshold2", label: "Mid-Spread (%)", type: "range", min: 0, max: 100, step: 1, placeholder: "60", showIf: { field: "gradient_preset", value: "linear" } },
    { id: "_section_pointer", label: "── Zeiger", type: "section" },
    { id: "pointer_type", label: "Zeiger-Form", type: "select", options: [{ value: "needle", label: "Nadel" }, { value: "triangle", label: "Dreieck" }] },
    { id: "pointer_width", label: "Zeiger-Breite", type: "range", min: 0, max: 5, step: 0.1, placeholder: "2" },
    { id: "pointer_length", label: "Zeiger-Länge", type: "range", min: 0, max: 50, step: 0.1, placeholder: "10" },
    { id: "pointer_offset", label: "Zeiger-Offset vom Ring", type: "range", min: -10, max: 10, step: 0.1, placeholder: "2" },
    { id: "pointer_center_radius", label: "Mittelpunkt-Größe", type: "range", min: 0, max: 10, step: 0.1, placeholder: "2" },
    { id: "pivot_offset_x", label: "Pivot Offset X", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0" },
    { id: "pivot_offset_y", label: "Pivot Offset Y", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0" },
    { id: "pointer_color_type", label: "Zeiger-Farb-Modus", type: "select", options: [{ value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }] },
    { id: "pointer_color", label: "Zeiger-Farbe (Fix)", type: "color", showIf: { field: "pointer_color_type", notValue: "adaptive" } },
    { id: "pointer_3d_effect", label: "3D-Effekt (Plastisch)", type: "checkbox" },
    { id: "pointer_dot_color_type", label: "Punkt-Farb-Modus", type: "select", options: [{ value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }] },
    { id: "pointer_dot_color", label: "Punkt-Farbe (Fix)", type: "color", showIf: { field: "pointer_dot_color_type", notValue: "adaptive" } },
    { id: "pointer_shadow_type", label: "Zeiger-Schatten", type: "select", options: [{ value: "none", label: "Kein" }, { value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }] },
    { id: "pointer_shadow_color", label: "Schatten-Farbe", type: "color", showIf: { field: "pointer_shadow_type", value: "fixed" } },
    { id: "pointer_shadow_blur", label: "Schatten-Weichzeichnung", type: "range", min: 0, max: 1, step: 0.01, placeholder: "0.8", showIf: { field: "pointer_shadow_type", notValue: "none" } },
    { id: "pointer_shadow_offset_y", label: "Schatten-Abstand Y", type: "range", min: -5, max: 5, step: 0.1, placeholder: "0.3", showIf: { field: "pointer_shadow_type", notValue: "none" } },
    { id: "pointer_shadow_opacity", label: "Schatten-Deckkraft", type: "range", min: 0, max: 1, step: 0.05, placeholder: "0.4", showIf: { field: "pointer_shadow_type", notValue: "none" } },
    { id: "animation_duration", label: "Animations-Dauer (s)", type: "range", min: 0, max: 10, step: 0.1, placeholder: "0.8", showIf: { field: "animation_easing", notValue: "spring" } },
    { id: "animation_spring_duration", label: "Feder-Animations-Dauer (s)", type: "range", min: 0.1, max: 10, step: 0.1, placeholder: "1.5", showIf: { field: "animation_easing", value: "spring" } },
    { id: "animation_dynamic_speed", label: "Dynamische Zeigerbeschleunigung", type: "checkbox" },
    { id: "animation_dynamic_speed_invert", label: "Beschleunigung invertieren (Lange Wege schnell)", type: "checkbox", showIf: { field: "animation_dynamic_speed", value: !0 } },
    { id: "animation_easing", label: "Zeiger-Einpendeln (Easing)", type: "select", options: [
      { value: "smooth", label: "Weich (Standard)" },
      { value: "overshoot_light", label: "Leichtes Überschwingen" },
      { value: "overshoot_medium", label: "Mittleres Überschwingen" },
      { value: "overshoot_heavy", label: "Starkes Überschwingen" },
      { value: "elastic", label: "Elastisch (Gummiband)" },
      { value: "spring", label: "Physikalische Feder (Multi-Bounce)" }
    ] },
    { id: "animation_spring_bounces", label: "Anzahl der Überschwinger", type: "range", min: 1, max: 10, step: 1, placeholder: "3", showIf: { field: "animation_easing", value: "spring" } },
    { id: "animation_spring_amplitude", label: "Feder-Amplitude (Intensität %)", type: "range", min: 0, max: 100, step: 1, placeholder: "50", showIf: { field: "animation_easing", value: "spring" } },
    { id: "_section_ticks", label: "── Ticks", type: "section" },
    { id: "tick_count", label: "Tick-Anzahl", type: "range", min: 0, max: 50, step: 1, placeholder: "0" },
    { id: "tick_length", label: "Tick-Länge", type: "range", min: 0, max: 6, step: 0.1, placeholder: "3" },
    { id: "tick_width", label: "Tick-Breite", type: "range", min: 0, max: 5, step: 0.1, placeholder: "1" },
    { id: "tick_offset", label: "Tick-Offset vom Ring", type: "range", min: -10, max: 10, step: 0.1, placeholder: "0" },
    { id: "tick_color_type", label: "Tick-Farb-Modus", type: "select", options: [{ value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }] },
    { id: "tick_color", label: "Tick-Farbe (Fix)", type: "color", showIf: { field: "tick_color_type", notValue: "adaptive" } },
    { id: "_section_sub_ticks", label: "── SubTicks", type: "subsection" },
    { id: "sub_tick_count", label: "Sub-Tick Anzahl (dazwischen)", type: "range", min: 0, max: 10, step: 1, placeholder: "0" },
    { id: "sub_tick_length", label: "Sub-Tick Länge", type: "range", min: 0, max: 3, step: 0.1, placeholder: "1.5" },
    { id: "sub_tick_width", label: "Sub-Tick Breite", type: "range", min: 0, max: 3, step: 0.1, placeholder: "0.5" },
    { id: "sub_tick_offset", label: "Sub-Tick Offset vom Ring", type: "range", min: -10, max: 10, step: 0.1, placeholder: "0" },
    { id: "sub_tick_color_type", label: "Sub-Tick Farb-Modus", type: "select", options: [{ value: "fixed", label: "Fix" }, { value: "adaptive", label: "Adaptiv" }] },
    { id: "sub_tick_color", label: "Sub-Tick Farbe (Fix)", type: "color", showIf: { field: "sub_tick_color_type", notValue: "adaptive" } },
    { id: "_section_ticks_label", label: "── Tick Label", type: "subsection" },
    { id: "show_tick_labels", label: "Tick-Labels anzeigen", type: "checkbox" },
    { id: "tick_label_step", label: "Label-Intervall", type: "range", min: 0, max: 10, step: 1, placeholder: "1", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "multiplier_divide_ticks", label: "Tick-Labels durch Multiplikator teilen", type: "checkbox", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_decimals", label: "Label-Dezimalstellen", type: "range", min: 0, max: 6, step: 1, placeholder: "0", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_font_size", label: "Label-Schriftgröße", type: "range", min: 0, max: 20, step: 0.5, placeholder: "7", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_offset", label: "Label-Abstand vom Ring", type: "range", min: -15, max: 15, step: 0.1, placeholder: "-8", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_spread", label: "Spreizung (Kollisionsschutz)", type: "range", min: 0, max: 10, step: 0.1, placeholder: "0" },
    { id: "tick_label_extra_length", label: "Label-Tick Extra-Länge", type: "range", min: 0, max: 4, step: 0.1, placeholder: "0", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_color_type", label: "Label-Farb-Modus", type: "select", options: [{ value: "adaptive", label: "Adaptiv" }, { value: "fixed", label: "Fix" }], showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_color", label: "Label-Farbe (Fix)", type: "color", showIf: [{ field: "show_tick_labels", value: !0 }, { field: "tick_label_color_type", notValue: "adaptive" }] },
    { id: "tick_label_inherit_color", label: "Farbe von Tick erben", type: "checkbox", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "tick_label_crossfade_dur", label: "Überblendungs-Dauer (s)", type: "range", min: 0, max: 3, step: 0.1, placeholder: "0.4", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "_section_custom_ticks", label: "── Eigene Ticks (Fixpunkte)", type: "subsection" },
    { id: "custom_ticks", type: "custom_ticks" },
    { id: "_section_sectors", label: "── Sektoren (Flächen)", type: "section" },
    { id: "sectors", type: "sectors" },
    { id: "_section_labels", label: "── Wert & Labels", type: "section" },
    { id: "show_value", label: "Wert anzeigen", type: "checkbox" },
    { id: "value_font_size", label: "Wert-Schriftgröße", type: "range", min: 0, max: 20, step: 0.1, placeholder: "12", showIf: { field: "show_value", value: !0 } },
    { id: "value_offset_y", label: "Wert-Offset Y", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "show_value", value: !0 } },
    { id: "value_color_type", label: "Wert-Farb-Modus", type: "select", options: [{ value: "adaptive", label: "Adaptiv" }, { value: "fixed", label: "Fix" }], showIf: { field: "show_value", value: !0 } },
    { id: "value_color", label: "Wert-Farbe (Fix)", type: "color", showIf: [{ field: "show_value", value: !0 }, { field: "value_color_type", notValue: "adaptive" }] },
    { id: "value_decimals", label: "Dezimalstellen", type: "range", min: 0, max: 6, step: 1, placeholder: "0", showIf: { field: "show_value", value: !0 } },
    { id: "value_show_raw_unit", label: "Einheit anzeigen", type: "checkbox", showIf: { field: "show_value", value: !0 } },
    { id: "value_replace_unit", label: "Original-Einheit ersetzen", type: "checkbox", showIf: [{ field: "show_value", value: !0 }, { field: "value_show_raw_unit", value: !0 }] },
    { id: "value_custom_unit", label: "Eigene Einheit (Suffix)", type: "text", placeholder: "z.B. W", showIf: [{ field: "show_value", value: !0 }, { field: "value_show_raw_unit", value: !0 }, { field: "value_replace_unit", value: !0 }] },
    { id: "show_scale_label", label: "Skalierungs-Label anzeigen", type: "checkbox" },
    { id: "scale_label_font_size", label: "Label-Schriftgröße", type: "range", min: 0, max: 20, step: 0.1, placeholder: "10", showIf: { field: "show_scale_label", value: !0 } },
    { id: "scale_label_offset_y", label: "Label-Offset Y", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "show_scale_label", value: !0 } },
    { id: "scale_label_color_type", label: "Label-Farb-Modus", type: "select", options: [{ value: "adaptive", label: "Adaptiv" }, { value: "fixed", label: "Fix" }], showIf: { field: "show_scale_label", value: !0 } },
    { id: "scale_label_color", label: "Label-Farbe (Fix)", type: "color", showIf: [{ field: "show_scale_label", value: !0 }, { field: "scale_label_color_type", notValue: "adaptive" }] },
    { id: "show_multiplier_label", label: "Multiplikator anzeigen", type: "checkbox" },
    { id: "multiplier_divide_ticks", label: "Tick-Labels durch Multiplikator teilen", type: "checkbox", showIf: { field: "show_tick_labels", value: !0 } },
    { id: "multiplier_prepend", label: "Prefix (z.B. x)", type: "text", placeholder: "x", showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_decimals", label: "Dezimalstellen", type: "number", placeholder: "0", showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_font_size", label: "Schriftgröße", type: "range", min: 0, max: 20, step: 0.1, placeholder: "10", showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_offset_x", label: "Offset X", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_offset_y", label: "Offset Y", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_color_type", label: "Farb-Modus", type: "select", options: [{ value: "adaptive", label: "Adaptiv" }, { value: "fixed", label: "Fix" }], showIf: { field: "show_multiplier_label", value: !0 } },
    { id: "multiplier_color", label: "Farbe (Fix)", type: "color", showIf: [{ field: "show_multiplier_label", value: !0 }, { field: "multiplier_color_type", notValue: "adaptive" }] },
    { id: "_section_gauge_label", label: "── Gauge Label", type: "section" },
    { id: "gauge_label_active", label: "Label aktiv", type: "checkbox" },
    { id: "gauge_label_text", label: "Label Text", type: "text", placeholder: "Gauge", showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_font_size", label: "Schriftgröße", type: "range", min: 0, max: 20, step: 0.1, placeholder: "8", showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_font_weight", label: "Gewichtung", type: "select", options: [{ value: "400", label: "Normal" }, { value: "600", label: "Semi-Bold" }, { value: "700", label: "Bold" }], showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_offset_x", label: "Offset X", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_offset_y", label: "Offset Y", type: "range", min: -25, max: 25, step: 0.1, placeholder: "0", showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_color_type", label: "Farb-Modus", type: "select", options: [{ value: "adaptive", label: "Adaptiv" }, { value: "fixed", label: "Fix" }], showIf: { field: "gauge_label_active", value: !0 } },
    { id: "gauge_label_color", label: "Farbe Fix", type: "color", showIf: { field: "gauge_label_color_type", value: "fixed" } }
  ];
  class o extends Be {
    static get properties() {
      return {
        hass: { type: Object },
        slot: { type: Object },
        commitFn: { type: Object }
      };
    }
    constructor() {
      super(), this._openStates = {}, this._timeouts = {};
    }
    static get styles() {
      return Xe`
      * { box-sizing: border-box; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .col { display: flex; flex-direction: column; gap: 4px; }
      label { font-size: 13px; color: var(--primary-text-color); }
      input[type="text"], input[type="number"], select { padding: 7px 10px; border: 1px solid var(--divider-color,#444); background: var(--secondary-background-color,#2a2a2a); color: var(--primary-text-color); border-radius: 6px; width: 100%; font-size: 13px; transition: border-color 0.2s; }
      input:focus { border-color: var(--primary-color); outline: none; }
      input[type="color"] { width: 42px; height: 32px; padding: 2px; border-radius: 6px; border: 1px solid var(--divider-color,#444); background: none; cursor: pointer; }
      .color-row { display: flex; align-items: center; gap: 8px; }
      .color-row input[type="text"] { flex: 1; }
      .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: var(--divider-color,#555); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
      .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; }
      .toggle input:checked + .toggle-slider { background: var(--primary-color,#03a9f4); }
      .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
      details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      details.inner-section summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      details.inner-section summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
      ha-entity-picker, ha-selector { display: block; width: 100%; }
      .entity-row { display: flex; flex-direction: column; gap: 4px; }
      input[type="range"] { width: 100%; accent-color: var(--primary-color,#03a9f4); }
      .field-wrapper { display: block; }
      button.add-btn { margin-top:4px; padding:8px; border-radius:8px; border:1px dashed var(--primary-color,#03a9f4); background:none; color:var(--primary-color,#03a9f4); cursor:pointer; font-size:13px; width:100%; }
      .sector-grid { 
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 2px; 
        width: 54px; 
        height: 54px; 
        margin-top: 4px; 
      }
      .sector-btn { 
        background: var(--divider-color, #555); 
        border-radius: 2px; 
        cursor: pointer; 
        transition: all 0.2s; 
      }
      .sector-btn:hover { 
        background: var(--primary-color, #03a9f4); 
        opacity: 0.7; 
      }
      .sector-btn.active { 
        background: var(--primary-color, #03a9f4); 
        box-shadow: 0 0 4px rgba(3,169,244,0.5); 
      }
    `;
    }
    render() {
      if (!this.slot) return _``;
      const i = !!this.slot.gauge_active, r = Array.isArray(this.slot.gauges) && this.slot.gauges.length > 0 ? this.slot.gauges : [{
        entity: this.slot.gauge_entity_0 || this.slot.entity || "",
        gauge_attribute: this.slot.gauge_attribute_0 || this.slot.gauge_attribute || "",
        inherit: !1
      }];
      return _`
      <details class="inner-section">
        <summary>── Gauges
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <span style="font-size:10px; opacity:.6; font-weight:400;">
              ${r.length} Gauge${r.length !== 1 ? "s" : ""}
            </span>
            <ha-switch
              .checked=${i}
              @click=${(u) => u.stopPropagation()}
              @change=${(u) => this.commitFn("gauge_active", u.target.checked)}>
            </ha-switch>
          </div>
        </summary>
        <div class="inner-content">
          ${i ? _`
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${r.map((u, n) => this._renderGaugePanel(u, n, r))}
              <button class="add-btn" @click=${() => this._addGauge(r)}>
                ＋ Gauge hinzufügen
              </button>
            </div>
          ` : ""}
        </div>
      </details>`;
    }
    _addGauge(i) {
      const r = JSON.parse(JSON.stringify(i));
      r.push({ entity: "", gauge_attribute: "" }), this._openStates[`gauge_${r.length - 1}`] = !0, this.commitFn("gauges", r);
    }
    _removeGauge(i, r) {
      const u = JSON.parse(JSON.stringify(r));
      u.splice(i, 1), this.commitFn("gauges", u);
    }
    _cloneSection(i, r, u, n, l) {
      if (isNaN(r)) return;
      const d = JSON.parse(JSON.stringify(n)), a = d[r], c = d[i], h = [], v = (b) => {
        b.forEach((g) => {
          g.id && h.push(g.id);
        });
      };
      v(u.items), u.subsections && u.subsections.forEach((b) => v(b.items)), h.forEach((b) => {
        a[b] !== void 0 ? c[b] = JSON.parse(JSON.stringify(a[b])) : delete c[b];
      }), this.commitFn("gauges", d), l.value = "";
    }
    _renderGaugePanel(i, r, u) {
      var v, b, g, m;
      let n = i.name || "", l = i.entity, d = !1, a = null;
      if (i.global_id && i.global_id !== "manual") {
        const f = (((v = this.slot) == null ? void 0 : v.global_entities) || []).find((y) => y.id === i.global_id);
        f && (l = f.entity, d = !0, a = f);
      }
      if (!n && l && ((b = this.hass) != null && b.states[l])) {
        const f = this.hass.states[l];
        d ? (n = `[${a.alias || "Alias"}] ${f.attributes.friendly_name || l}`, a.attribute && (n += ` (${a.attribute})`)) : n = f.attributes.friendly_name || l;
      } else n || (n = d ? `[${a.alias || "Alias"}] ${l || "Unbenannt"}` : `Gauge ${r + 1}`);
      const c = `gauge_${r}`;
      this._openStates[c] === void 0 && (this._openStates[c] = !1);
      const h = (f, y) => {
        const $ = JSON.parse(JSON.stringify(u));
        $[r][f] = y, this.commitFn("gauges", $);
      };
      return _`
      <details class="inner-section" 
        ?open=${this._openStates[c]} 
        @toggle=${(f) => this._openStates[c] = f.target.open}
        @dragstart=${(f) => {
        f.dataTransfer.effectAllowed = "move", f.dataTransfer.setData("text/plain", r), setTimeout(() => f.target.style.opacity = "0.3", 0);
      }}
        @dragover=${(f) => {
        f.preventDefault(), f.dataTransfer.dropEffect = "move", f.currentTarget.style.borderTop = "3px dashed var(--primary-color, #03a9f4)";
      }}
        @dragleave=${(f) => {
        f.currentTarget.style.borderTop = "";
      }}
        @drop=${(f) => {
        f.preventDefault(), f.currentTarget.style.borderTop = "";
        const y = parseInt(f.dataTransfer.getData("text/plain"));
        if (y !== r && !isNaN(y)) {
          const $ = JSON.parse(JSON.stringify(u)), [w] = $.splice(y, 1);
          $.splice(r, 0, w), this.commitFn("gauges", $);
        }
        f.currentTarget.removeAttribute("draggable");
      }}
        @dragend=${(f) => {
        f.target.style.opacity = "1", f.target.removeAttribute("draggable");
      }}
      >
        <summary>
          <span style="display:flex;align-items:center;">
            <span 
              style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px; user-select: none;" 
              title="Gauge verschieben"
              @mousedown=${(f) => f.target.closest("details").setAttribute("draggable", "true")}
              @mouseup=${(f) => f.target.closest("details").removeAttribute("draggable")}
            >⋮⋮</span>
            ${n}
          </span>

          ${u.length > 1 ? _`
            <div style="display:flex; gap:12px; align-items:center;" @click=${(f) => f.stopPropagation()}>
              <button title="Nach oben" ?disabled=${r === 0} style="background:none;border:none;cursor:${r === 0 ? "default" : "pointer"};font-size:14px;color:${r === 0 ? "var(--divider-color,#555)" : "var(--primary-text-color)"};padding:0;" @click=${(f) => {
        if (f.preventDefault(), r === 0) return;
        const y = JSON.parse(JSON.stringify(u)), $ = y[r - 1];
        y[r - 1] = y[r], y[r] = $, this.commitFn("gauges", y);
      }}>▲</button>
              <button title="Nach unten" ?disabled=${r === u.length - 1} style="background:none;border:none;cursor:${r === u.length - 1 ? "default" : "pointer"};font-size:14px;color:${r === u.length - 1 ? "var(--divider-color,#555)" : "var(--primary-text-color)"};padding:0;" @click=${(f) => {
        if (f.preventDefault(), r === u.length - 1) return;
        const y = JSON.parse(JSON.stringify(u)), $ = y[r + 1];
        y[r + 1] = y[r], y[r] = $, this.commitFn("gauges", y);
      }}>▼</button>
              <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(f) => {
        f.preventDefault(), this._removeGauge(r, u);
      }}>🗑</button>
            </div>
          ` : ""}
        </summary>
        
        <div class="inner-content">
          <div class="entity-row" style="margin-bottom: 8px;">
            <label>Datenquelle</label>
            <select style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);" @change=${(f) => h("global_id", f.target.value)}>
              <option value="manual" ?selected=${i.global_id === "manual" || !i.global_id}>Manuelle Auswahl</option>
              ${(((g = this.slot) == null ? void 0 : g.global_entities) || []).map((f) => {
        var J, A;
        const y = f.entity ? this.hass.states[f.entity] : null, $ = f.alias || ((J = y == null ? void 0 : y.attributes) == null ? void 0 : J.friendly_name) || f.entity || "Unbenannt";
        let w = y ? y.state : "-";
        y && f.attribute && y.attributes[f.attribute] !== void 0 && (w = y.attributes[f.attribute]);
        const S = !f.attribute && ((A = y == null ? void 0 : y.attributes) != null && A.unit_of_measurement) ? ` ${y.attributes.unit_of_measurement}` : "", x = f.attribute ? ` (${f.attribute})` : "", k = `[${f.alias || "Alias"}] ${$}${x}: ${w}${S}`;
        return _`<option value=${f.id} ?selected=${i.global_id === f.id}>${k}</option>`;
      })}
            </select>
          </div>

          ${!i.global_id || i.global_id === "manual" ? _`
            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
              <div class="entity-row" style="margin-bottom: 8px;">
                <label>Quelle</label>
                <ha-entity-picker
                  .hass=${this.hass}
                  .allowCustomEntity=${!1}
                  .value=${i.entity || ""}
                  @value-changed=${(f) => h("entity", f.detail.value)}
                ></ha-entity-picker>
              </div>

              <div class="entity-row">
                <label>Attribut</label>
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ attribute: { entity_id: i.entity || ((m = this.slot) == null ? void 0 : m.entity) || "" } }}
                  .value=${i.gauge_attribute || ""}
                  @value-changed=${(f) => h("gauge_attribute", f.detail.value || "")}
                ></ha-selector>
              </div>
            </div>
          ` : ""}

          ${u.length > 1 ? _`
            <div class="row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--divider-color,#444);">
              <label>Alles kopieren von...</label>
              <select style="width: 60%" @change=${(f) => {
        const y = parseInt(f.target.value);
        if (isNaN(y)) return;
        const $ = JSON.parse(JSON.stringify(u)), w = $[y], S = $[r].entity, x = $[r].gauge_attribute, k = $[r].gauge_label_text;
        $[r] = { ...w, entity: S, gauge_attribute: x, gauge_label_text: k }, this.commitFn("gauges", $), f.target.value = "";
      }}>
                <option value="" selected disabled>Bitte wählen...</option>
                ${u.map((f, y) => {
        if (y === r) return "";
        const $ = f.gauge_label_text ? f.gauge_label_text : f.entity ? f.entity.split(".")[1] : "";
        return _`<option value=${y}>Gauge ${y + 1}${$ ? " — " + $ : ""}</option>`;
      })}
              </select>
            </div>
          ` : ""}

          ${this._renderFieldsGroup(e, i, r, u)}
        </div>
      </details>
    `;
    }
    static evalShowIf(i, r) {
      return i ? (Array.isArray(i) ? i : [i]).every((n) => {
        const l = r[n.field];
        if (n.notValue !== void 0) {
          const a = n.notValue;
          return Array.isArray(a) ? !a.includes(l) : String(l) !== String(a);
        }
        const d = n.value;
        return Array.isArray(d) ? d.includes(l) : typeof d == "boolean" ? (l === void 0 ? !1 : !!l) === d : String(l) === String(d);
      }) : !0;
    }
    _renderStopsEditor(i, r, u, n) {
      const l = Array.isArray(i) ? i : [];
      return _`
      <div class="col" style="gap:8px; margin-top:4px;">
        
        <div style="display:flex; gap:8px; margin-bottom:4px;">
          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--primary-color,#03a9f4); background:none; color:var(--primary-color,#03a9f4); cursor:pointer; font-size:12px;" @click=${(d) => {
        d.preventDefault();
        const a = JSON.parse(JSON.stringify(l));
        a.forEach((b) => b._isOpen = !1);
        const c = ["#4caf50", "#fdd835", "#fb8c00", "#f44336", "#9c27b0", "#03a9f4"], h = c[a.length % c.length];
        let v = 0;
        a.length > 0 && (v = r ? Math.max(...a.map((b) => parseFloat(b.value) || 0)) : 100), a.push({ value: v, color: h, _isOpen: !0 }), u(a);
      }}>＋ Farbsprung hinzufügen</button>
          
          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--divider-color,#555); background:none; color:var(--primary-text-color); cursor:pointer; font-size:12px; opacity: ${l.length > 1 ? "1" : "0.4"};" 
            ?disabled=${l.length < 2}
            title="Verteilt die Farben (für Grob: Blöcke, für andere: Verlaufspunkte)"
            @click=${(d) => {
        if (d.preventDefault(), l.length < 2) return;
        const a = JSON.parse(JSON.stringify(l)), c = n === "coarse";
        if (r) {
          a.sort((b, g) => (parseFloat(b.value) || 0) - (parseFloat(g.value) || 0));
          const h = parseFloat(a[0].value) || 0, v = parseFloat(a[a.length - 1].value) || 0;
          if (h !== v) {
            const b = (v - h) / (a.length - 1);
            a.forEach((g, m) => {
              g.value = Math.round((h + m * b) * 10) / 10;
            });
          }
        } else if (c) {
          const h = 100 / a.length;
          a.forEach((v, b) => {
            v.value = Math.round(b * h * 10) / 10;
          });
        } else {
          const h = 100 / (a.length - 1);
          a.forEach((v, b) => {
            v.value = Math.round(b * h * 10) / 10;
          });
        }
        u(a);
      }}>⬌ Gleichmäßig verteilen</button>
        </div>

        ${l.map((d, a) => {
        const c = d._isOpen !== !1;
        return _`
            <details class="inner-section" style="margin-bottom:0;" 
              ?open=${c} 
              @toggle=${(h) => {
          if (d._isOpen !== h.target.open) {
            const v = JSON.parse(JSON.stringify(l));
            v[a]._isOpen = h.target.open, u(v);
          }
        }}
              @dragstart=${(h) => {
          h.dataTransfer.effectAllowed = "move", h.dataTransfer.setData("stopIdx", a), setTimeout(() => h.target.style.opacity = "0.3", 0);
        }}
              @dragover=${(h) => {
          h.preventDefault(), h.dataTransfer.dropEffect = "move", h.currentTarget.style.borderTop = "3px dashed var(--primary-color, #03a9f4)";
        }}
              @dragleave=${(h) => {
          h.currentTarget.style.borderTop = "";
        }}
              @drop=${(h) => {
          h.preventDefault(), h.currentTarget.style.borderTop = "";
          const v = parseInt(h.dataTransfer.getData("stopIdx"));
          if (v !== a && !isNaN(v)) {
            const b = JSON.parse(JSON.stringify(l)), [g] = b.splice(v, 1);
            b.splice(a, 0, g), u(b);
          }
        }}
              @dragend=${(h) => {
          h.target.style.opacity = "1", h.target.removeAttribute("draggable");
        }}
            >
              <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                  <span 
                    style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px; user-select: none;" 
                    title="Stop verschieben"
                    @mousedown=${(h) => h.target.closest("details").setAttribute("draggable", "true")}
                    @mouseup=${(h) => h.target.closest("details").removeAttribute("draggable")}
                  >⋮⋮</span>
                  Stop ${a + 1} 
                  <span style="font-weight:normal;color:var(--secondary-text-color,#aaa);font-size:11px; margin-left:6px;">[Wert: ${d.value ?? 0}]</span>
                  <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${d.color ?? "#03a9f4"}; margin-left:8px; box-shadow: 0 0 2px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2);"></span>
                </div>
                <div style="display:flex; gap:12px; align-items:center;" @click=${(h) => h.stopPropagation()}>
                  <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(h) => {
          h.preventDefault();
          const v = JSON.parse(JSON.stringify(l));
          v.splice(a, 1), u(v);
        }}>🗑</button>
                </div>
              </summary>
              <div class="inner-content" style="padding-top:4px; gap:8px;">
                ${r ? _`
                  <div class="row">
                    <label>Schwellwert (Absolut)</label>
                    <input type="number" step="any" style="width:50%" .value=${d.value ?? ""} @input=${(h) => {
          const v = JSON.parse(JSON.stringify(l));
          v[a].value = parseFloat(h.target.value), u(v);
        }}>
                  </div>
                ` : _`
                  <div class="col">
                    <label>Schwellwert (%) <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${d.value ?? 0}</span></label>
                    <input type="range" min="0" max="100" step="1" .value=${d.value ?? 0} @input=${(h) => {
          const v = JSON.parse(JSON.stringify(l));
          v[a].value = parseFloat(h.target.value), u(v);
        }}>
                  </div>
                `}
                <div class="col"><label>Farbe</label>
                  <div class="color-row">
                    <input type="color" .value=${d.color ?? "#03a9f4"} @input=${(h) => {
          const v = JSON.parse(JSON.stringify(l));
          v[a].color = h.target.value, u(v);
        }}>
                    <input type="text" .value=${d.color ?? "#03a9f4"} @input=${(h) => {
          if (/^#[0-9a-fA-F]{6}$/.test(h.target.value)) {
            const v = JSON.parse(JSON.stringify(l));
            v[a].color = h.target.value, u(v);
          }
        }}>
                  </div>
                </div>
              </div>
            </details>
          `;
      })}
      </div>
    `;
    }
    _renderFieldsGroup(i, r, u, n) {
      const l = [];
      let d = { isRoot: !0, items: [], subsections: [] };
      l.push(d);
      let a = null;
      i.forEach((v) => {
        v.type === "section" ? (d = { isRoot: !1, title: v.label.replace("── ", ""), items: [], subsections: [] }, l.push(d), a = null) : v.type === "subsection" ? (a = { title: v.label.replace("── ", ""), items: [] }, d.subsections.push(a)) : a ? a.items.push(v) : d.items.push(v);
      });
      const c = (v) => v.map((b) => this._renderLitField(b, r, u, n)), h = ["Hintergrund", "Farbe & Gradient", "Zeiger", "Ticks", "Sektoren (Flächen)", "Wert & Labels"];
      return l.map((v) => {
        if (v.isRoot)
          return c(v.items);
        {
          const b = `g_${u}_${v.title}`;
          return this._openStates[b] === void 0 && (this._openStates[b] = !1), _`
          <details class="inner-section" ?open=${this._openStates[b]} @toggle=${(g) => this._openStates[b] = g.target.open}>
            <summary style="display:flex; justify-content:space-between; align-items:center;">
              <span style="flex: 1;">${v.title}</span>
              ${h.includes(v.title) && n.length > 1 ? _`
                <select style="width: auto; max-width: 140px; padding: 2px 4px; font-size: 11px; margin-right: 8px; border: 1px solid var(--divider-color, #444); border-radius: 4px; background: rgba(0,0,0,0.2); color: var(--primary-text-color);" @click=${(g) => g.stopPropagation()} @change=${(g) => this._cloneSection(u, parseInt(g.target.value), v, n, g.target)}>
                  <option value="" disabled selected>Kopieren von...</option>
                  ${n.map((g, m) => m !== u ? _`<option value="${m}">Gauge ${m + 1}</option>` : "")}
                </select>
              ` : ""}
              <span style="font-size:10px;">▼</span>
            </summary>
            
            <div class="inner-content">
              ${c(v.items)}
              
              ${v.subsections.map((g) => {
            const m = `g_${u}_${v.title}_${g.title}`;
            return this._openStates[m] === void 0 && (this._openStates[m] = !1), _`
                  <details class="inner-section" style="margin-top: 8px; border-color: var(--divider-color, #444); background: rgba(0,0,0,0.15);" ?open=${this._openStates[m]} @toggle=${(f) => this._openStates[m] = f.target.open}>
                    <summary style="font-size: 13px; font-weight: 500;">
                      ↳ ${g.title}
                      <span style="font-size:10px;">▼</span>
                    </summary>
                    <div class="inner-content">
                      ${c(g.items)}
                    </div>
                  </details>
                `;
          })}
            </div>
          </details>
        `;
        }
      });
    }
    _renderLitField(i, r, u, n) {
      if (!i) return _``;
      if (i.showIf && !o.evalShowIf(i.showIf, r)) return _``;
      let l;
      const d = r[i.id], a = (h) => {
        const v = JSON.parse(JSON.stringify(n));
        v[u][i.id] = h, this.commitFn("gauges", v);
      }, c = (h) => {
        const v = `${u}_${i.id}`;
        clearTimeout(this._timeouts[v]), this._timeouts[v] = setTimeout(() => a(h), 250);
      };
      switch (i.type) {
        case "manual_stops": {
          const v = r.threshold_unit === "absolute";
          l = _`
          <div class="col" style="gap:8px;">
            <div style="font-size:12px;color:var(--secondary-text-color,#aaa);margin-bottom:4px;line-height:1.3;">
              Tipp: Die Schwellwerte können absolut oder in % angegeben werden.
            </div>
            ${this._renderStopsEditor(d, v, (b) => {
            const g = JSON.parse(JSON.stringify(n));
            g[u].manual_stops = b, this.commitFn("gauges", g);
          }, r.gradient_resolution)} </div>
        `;
          break;
        }
        case "bg_manual_stops": {
          const v = r.bg_threshold_unit === "absolute";
          l = _`
          <div class="col" style="gap:8px;">
            ${this._renderStopsEditor(d, v, (b) => {
            const g = JSON.parse(JSON.stringify(n));
            g[u].bg_manual_stops = b, this.commitFn("gauges", g);
          }, r.gradient_resolution)} </div>
        `;
          break;
        }
        case "custom_ticks": {
          const v = Array.isArray(d) ? d : [];
          l = _`
          <div class="col" style="gap:8px;">
            ${v.map((b, g) => {
            const m = b._isOpen !== !1;
            return _`
                <details class="inner-section" style="margin-bottom:0;" 
                  ?open=${m} 
                  @toggle=${(f) => {
              if (b._isOpen !== f.target.open) {
                const y = JSON.parse(JSON.stringify(n));
                y[u].custom_ticks[g]._isOpen = f.target.open, this.commitFn("gauges", y);
              }
            }}
                  @dragstart=${(f) => {
              f.dataTransfer.effectAllowed = "move", f.dataTransfer.setData("tickIdx", g), setTimeout(() => f.target.style.opacity = "0.3", 0);
            }}
                  @dragover=${(f) => {
              f.preventDefault(), f.currentTarget.style.borderTop = "3px dashed var(--primary-color, #03a9f4)";
            }}
                  @dragleave=${(f) => f.currentTarget.style.borderTop = ""}
                  @drop=${(f) => {
              f.preventDefault(), f.currentTarget.style.borderTop = "";
              const y = parseInt(f.dataTransfer.getData("tickIdx"));
              if (y !== g && !isNaN(y)) {
                const $ = JSON.parse(JSON.stringify(n)), [w] = $[u].custom_ticks.splice(y, 1);
                $[u].custom_ticks.splice(g, 0, w), this.commitFn("gauges", $);
              }
            }}
                  @dragend=${(f) => {
              f.target.style.opacity = "1", f.target.removeAttribute("draggable");
            }}
                >
                  <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                      <span 
                        style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px;" 
                        @mousedown=${(f) => f.target.closest("details").setAttribute("draggable", "true")}
                        @mouseup=${(f) => f.target.closest("details").removeAttribute("draggable")}
                      >⋮⋮</span>
                      Tick ${g + 1}
                    </div>
                    <div @click=${(f) => f.stopPropagation()}>
                      <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
              const f = JSON.parse(JSON.stringify(n));
              f[u].custom_ticks.splice(g, 1), this.commitFn("gauges", f);
            }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                  <div class="row">
                    <label>Wert auf Skala</label>
                    <input type="text" style="width:50%" .value=${b.value ?? ""} @input=${(f) => {
              const y = f.target.value.replace(",", ".");
              clearTimeout(this._timeouts["ct_" + u + "_" + g]), this._timeouts["ct_" + u + "_" + g] = setTimeout(() => {
                const $ = JSON.parse(JSON.stringify(n));
                $[u].custom_ticks[g].value = y !== "" ? parseFloat(y) : "", this.commitFn("gauges", $);
              }, 500);
            }}>
                  </div>
                    <div class="row"><label>Länge</label><input type="range" min="0" max="10" step="0.1" style="width:50%" .value=${b.length ?? 4} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].length = parseFloat(f.target.value), this.commitFn("gauges", y);
            }}></div>
                    <div class="row"><label>Breite</label><input type="range" min="0" max="2" step="0.1" style="width:50%" .value=${b.width ?? 1} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].width = parseFloat(f.target.value), this.commitFn("gauges", y);
            }}></div>
                    <div class="row"><label>Offset vom Ring</label><input type="range" min="-15" max="0" step="0.1" style="width:50%" .value=${b.offset ?? 0} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].offset = parseFloat(f.target.value), this.commitFn("gauges", y);
            }}></div>
                    <div class="col"><label>Farbe</label>
                      <div class="color-row">
                        <input type="color" .value=${b.color ?? "#ff0000"} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].color = f.target.value, this.commitFn("gauges", y);
            }}>
                        <input type="text" .value=${b.color ?? "#ff0000"} @input=${(f) => {
              if (/^#[0-9a-fA-F]{6}$/.test(f.target.value)) {
                const y = JSON.parse(JSON.stringify(n));
                y[u].custom_ticks[g].color = f.target.value, this.commitFn("gauges", y);
              }
            }}>
                      </div>
                    </div>
                    <div class="row"><label>Label Text</label><input type="text" style="width:50%" .value=${b.label ?? ""} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].label = f.target.value, this.commitFn("gauges", y);
            }}></div>
                    <div class="row"><label>Label Offset</label><input type="range" min="-15" max="4" step="0.1" style="width:50%" .value=${b.label_offset ?? 10} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].label_offset = parseFloat(f.target.value), this.commitFn("gauges", y);
            }}></div>
                    <div class="row"><label>Label Größe</label><input type="range" min="1" max="20" step="0.1" style="width:50%" .value=${b.label_font_size ?? 7} @input=${(f) => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].custom_ticks[g].label_font_size = parseFloat(f.target.value), this.commitFn("gauges", y);
            }}></div>
                  </div>
                </details>
              `;
          })}
            <button class="add-btn" @click=${() => {
            const b = JSON.parse(JSON.stringify(n));
            b[u].custom_ticks || (b[u].custom_ticks = []), b[u].custom_ticks.push({ value: 0, length: 4, width: 1, offset: 0, color: "#ff0000", label: "", _isOpen: !0 }), this.commitFn("gauges", b);
          }}>＋ Custom Tick hinzufügen</button>
          </div>
        `;
          break;
        }
        case "sectors": {
          const v = Array.isArray(d) ? d : [];
          l = _`
          <div class="col" style="gap:8px;">
            ${v.map((b, g) => {
            const m = b._isOpen !== !1, f = b.gradient_preset || (b.use_gradient ? "classic" : "none");
            return _`
                <details class="inner-section" style="margin-bottom:0;" 
                  ?open=${m} 
                  @toggle=${(y) => {
              if (b._isOpen !== y.target.open) {
                const $ = JSON.parse(JSON.stringify(n));
                $[u].sectors[g]._isOpen = y.target.open, this.commitFn("gauges", $);
              }
            }}
                  @dragstart=${(y) => {
              y.dataTransfer.effectAllowed = "move", y.dataTransfer.setData("secIdx", g), setTimeout(() => y.target.style.opacity = "0.3", 0);
            }}
                  @dragover=${(y) => {
              y.preventDefault(), y.currentTarget.style.borderTop = "3px dashed var(--primary-color, #03a9f4)";
            }}
                  @dragleave=${(y) => y.currentTarget.style.borderTop = ""}
                  @drop=${(y) => {
              y.preventDefault(), y.currentTarget.style.borderTop = "";
              const $ = parseInt(y.dataTransfer.getData("secIdx"));
              if ($ !== g && !isNaN($)) {
                const w = JSON.parse(JSON.stringify(n)), [S] = w[u].sectors.splice($, 1);
                w[u].sectors.splice(g, 0, S), this.commitFn("gauges", w);
              }
            }}
                  @dragend=${(y) => {
              y.target.style.opacity = "1", y.target.removeAttribute("draggable");
            }}
                >
                  <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                      <span 
                        style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px;" 
                        @mousedown=${(y) => y.target.closest("details").setAttribute("draggable", "true")}
                        @mouseup=${(y) => y.target.closest("details").removeAttribute("draggable")}
                      >⋮⋮</span>
                      Sektor ${g + 1}
                    </div>
                    <div @click=${(y) => y.stopPropagation()}>
                      <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
              const y = JSON.parse(JSON.stringify(n));
              y[u].sectors.splice(g, 1), this.commitFn("gauges", y);
            }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                    <div class="row"><label>Start (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${b.start_percent ?? 75} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].start_percent = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}></div>
                    <div class="row"><label>Länge (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${b.length_percent ?? 25} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].length_percent = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}></div>
                    <div class="row"><label>Innen-Radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${b.inner_radius ?? 12} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].inner_radius = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}></div>
                    <div class="row"><label>Außen-Radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${b.outer_radius ?? 22} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].outer_radius = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}></div>
                    <div class="row"><label>Deckkraft</label><input type="range" min="0" max="1" step="0.05" style="width:50%" .value=${b.opacity ?? 0.85} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].opacity = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}></div>
                    
                    <div style="border-top:1px dashed var(--divider-color,#444); margin:4px 0;"></div>
                    
                    <div class="col"><label>Farbe (Start)</label>
                      <div class="color-row">
                        <input type="color" .value=${b.color ?? "#dc3232"} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].color = y.target.value, this.commitFn("gauges", $);
            }}>
                        <input type="text" .value=${b.color ?? "#dc3232"} @input=${(y) => {
              if (/^#[0-9a-fA-F]{6}$/.test(y.target.value)) {
                const $ = JSON.parse(JSON.stringify(n));
                $[u].sectors[g].color = y.target.value, this.commitFn("gauges", $);
              }
            }}>
                      </div>
                    </div>

                    <div class="row">
                      <label>Verlauf (Gradient)</label>
                      <select @change=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].gradient_preset = y.target.value, $[u].sectors[g].use_gradient = y.target.value === "classic", this.commitFn("gauges", $);
            }}>
                        <option value="none" ?selected=${f === "none"}>Einzelne Farbe</option>
                        <option value="classic" ?selected=${f === "classic"}>Klassisch (2 Farben)</option>
                        <option value="manual" ?selected=${f === "manual"}>Manuell (Liste)</option>
                      </select>
                    </div>

                    ${f === "classic" ? _`
                      <div class="col"><label>Farbe (Ende)</label>
                        <div class="color-row">
                          <input type="color" .value=${b.color_end ?? "#ffeb3b"} @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].color_end = y.target.value, this.commitFn("gauges", $);
            }}>
                          <input type="text" .value=${b.color_end ?? "#ffeb3b"} @input=${(y) => {
              if (/^#[0-9a-fA-F]{6}$/.test(y.target.value)) {
                const $ = JSON.parse(JSON.stringify(n));
                $[u].sectors[g].color_end = y.target.value, this.commitFn("gauges", $);
              }
            }}>
                        </div>
                      </div>
                    ` : ""}

                    ${f !== "none" ? _`
                      <div class="row" style="margin-top:4px;">
                        <label>Auto-Auflösung (dynamisch)</label>
                        <label class="toggle">
                          <input type="checkbox" .checked=${b.resolution_auto !== !1} @change=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].resolution_auto = y.target.checked, this.commitFn("gauges", $);
            }}>
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      ${b.resolution_auto === !1 ? _`
                        <div class="row">
                          <label>Manuelle Feinheit (Grad)</label>
                          <input type="range" min="0.1" max="5" step="0.1" style="width:50%" 
                            .value=${b.resolution ?? 1.5} 
                            @input=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].resolution = parseFloat(y.target.value), this.commitFn("gauges", $);
            }}>
                        </div>
                      ` : ""}
                    ` : ""}

                    ${f === "manual" ? _`
                      <div class="row">
                        <label>Schwellen-Einheit</label>
                        <select @change=${(y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].threshold_unit = y.target.value, this.commitFn("gauges", $);
            }}>
                          <option value="percent" ?selected=${(b.threshold_unit || "percent") === "percent"}>Prozent (%)</option>
                          <option value="absolute" ?selected=${(b.threshold_unit || "percent") === "absolute"}>Absolut</option>
                        </select>
                      </div>
                      ${this._renderStopsEditor(b.manual_stops, (b.threshold_unit || "percent") === "absolute", (y) => {
              const $ = JSON.parse(JSON.stringify(n));
              $[u].sectors[g].manual_stops = y, this.commitFn("gauges", $);
            })}
                    ` : ""}

                  </div>
                </details>
              `;
          })}
            <button class="add-btn" @click=${() => {
            const b = JSON.parse(JSON.stringify(n));
            b[u].sectors || (b[u].sectors = []), b[u].sectors.push({ start_percent: 75, length_percent: 25, inner_radius: 12, outer_radius: 22, opacity: 0.85, color: "#dc3232", _isOpen: !0 }), this.commitFn("gauges", b);
          }}>＋ Sektor hinzufügen</button>
          </div>
        `;
          break;
        }
        case "checkbox":
          l = _`
          <div class="row">
            <label>${i.label}</label>
            <label class="toggle">
              <input type="checkbox" .checked=${!!d} @change=${(v) => a(v.target.checked)}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        `;
          break;
        case "color": {
          const v = d ? Array.isArray(d) ? "#" + d.map((b) => b.toString(16).padStart(2, "0")).join("") : d : "";
          l = _`
          <div class="col">
            <label>${i.label}</label>
            <div class="color-row">
              <input type="color" .value=${v} @input=${(b) => a(b.target.value)}>
              <input type="text" placeholder=${i.placeholder || "#ffffff"} .value=${v} @input=${(b) => {
            /^#[0-9a-fA-F]{6}$/.test(b.target.value) && a(b.target.value);
          }}>
            </div>
          </div>
        `;
          break;
        }
        case "select":
          l = _`
          <div class="row">
            <label>${i.label}</label>
            <select @change=${(v) => a(v.target.value)}>
              ${(i.options || []).map((v) => _`<option value=${v.value} ?selected=${String(d ?? "") === String(v.value)}>${v.label}</option>`)}
            </select>
          </div>
        `;
          break;
        case "range":
          l = _`
          <div class="col">
            <label>${i.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${d ?? i.placeholder ?? ""}</span></label>
            <input type="range" min=${i.min ?? 0} max=${i.max ?? 100} step=${i.step ?? 1} .value=${d ?? i.placeholder ?? 0} @input=${(v) => a(parseFloat(v.target.value))}>
          </div>
        `;
          break;
        case "9-sector":
          const h = [
            "top-left",
            "top-center",
            "top-right",
            "center-left",
            "center",
            "center-right",
            "bottom-left",
            "bottom-center",
            "bottom-right"
          ];
          l = _`
          <div class="col">
            <label>${i.label}</label>
            <div class="sector-grid">
              ${h.map((v) => _`
                <div 
                  class="sector-btn ${d === v ? "active" : ""}" 
                  title="${v.replace("-", " ")}"
                  @click=${() => a(v)}
                ></div>
              `)}
            </div>
          </div>
        `;
          break;
        default:
          l = _`
          <div class="col">
            <label>${i.label}</label>
            <input 
              type=${i.type === "number" ? "number" : "text"} 
              .value=${d ?? ""} 
              placeholder=${i.placeholder || ""} 
              step=${i.step ?? ""} 
              min=${i.min ?? ""} 
              max=${i.max ?? ""} 
              @input=${(v) => c(i.type === "number" ? parseFloat(v.target.value) : v.target.value)}
            >
          </div>
        `;
          break;
      }
      return _`<div class="field-wrapper">${l}</div>`;
    }
  }
  customElements.get("sc-gauge-editor") || customElements.define("sc-gauge-editor", o);
  function p(t, i, r) {
    return _`<sc-gauge-editor .commitFn=${t} .hass=${i} .slot=${r}></sc-gauge-editor>`;
  }
  return { editorFields: s, renderCustomBlock: p };
})());
const O = (s, e) => {
  const o = parseFloat(s);
  return isNaN(o) ? e : o;
}, qe = (s, e, o, p) => {
  const t = p * Math.PI / 180;
  return { x: s + o * Math.cos(t), y: e + o * Math.sin(t) };
}, ei = (s) => {
  if (!s || typeof s != "string") return null;
  const e = s.replace("#", "");
  return e.length === 3 ? [parseInt(e[0] + e[0], 16), parseInt(e[1] + e[1], 16), parseInt(e[2] + e[2], 16)] : e.length === 6 ? [parseInt(e.slice(0, 2), 16), parseInt(e.slice(2, 4), 16), parseInt(e.slice(4, 6), 16)] : null;
}, _t = (s) => {
  if (Array.isArray(s)) return s;
  if (typeof s == "string") {
    if (s.startsWith("#")) return ei(s);
    if (s.startsWith("rgb")) {
      const e = s.match(/\d+/g);
      if (e && e.length >= 3) return [parseInt(e[0]), parseInt(e[1]), parseInt(e[2])];
    }
  }
  return null;
}, Rt = (s, e, o) => {
  const p = _t(s) || [128, 128, 128], t = _t(e) || [128, 128, 128];
  return [Math.round(p[0] + o * (t[0] - p[0])), Math.round(p[1] + o * (t[1] - p[1])), Math.round(p[2] + o * (t[2] - p[2]))];
}, Je = (s, e) => {
  if (s === "adaptive") return "var(--primary-text-color)";
  const o = _t(e);
  return o ? `rgb(${o.join(",")})` : typeof e == "string" && e.startsWith("rgb") ? e : e || "var(--primary-text-color)";
}, Ft = (s, e, o, p, t, i) => {
  Math.abs(i - t) >= 360 && (i = t + 359.99);
  const r = qe(s, e, p, t), u = qe(s, e, p, i), n = qe(s, e, o, i), l = qe(s, e, o, t), d = Math.abs(i - t) > 180 ? 1 : 0;
  return `M${r.x.toFixed(3)},${r.y.toFixed(3)} A${p},${p},0,${d},1,${u.x.toFixed(3)},${u.y.toFixed(3)} L${n.x.toFixed(3)},${n.y.toFixed(3)} A${o},${o},0,${d},0,${l.x.toFixed(3)},${l.y.toFixed(3)}Z`;
};
class ti extends Be {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      globalEntities: { type: Array },
      _isInitialized: { type: Boolean, state: !0 }
    };
  }
  static get styles() {
    return Xe`
      :host { display: block; position: relative; width: 100%; height: 100%; pointer-events: none; }
      
      .text-container      { position: static !important; }
      .supercard-container { position: relative !important; }
      
      @keyframes sc-pulse-bg   { 0%,100%{opacity:0.15;transform:translateZ(0)} 50%{opacity:0.65;transform:translateZ(0)} }
      @keyframes sc-pulse-frame{ 0%,100%{opacity:0.2;transform:translateZ(0)}  50%{opacity:1.0;transform:translateZ(0)} }
      @keyframes sc-ripple-expand {
        0%   { transform: scale(0.08) translateZ(0); opacity: 0.9; }
        85%  { opacity: 0; }
        100% { transform: scale(var(--sc-ripple-scale,8)) translateZ(0); opacity: 0; }
      }
      @keyframes sc-ripple-implode {
        0%   { transform: scale(var(--sc-ripple-scale,8)) translateZ(0); opacity: 0; }
        15%  { opacity: 0; }
        30%  { opacity: 0.8; }
        100% { transform: scale(0.08) translateZ(0); opacity: 0; }
      }
      @keyframes sc-tick-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }

      .sc-anim-pulse-bg    { animation: sc-pulse-bg    var(--sc-anim-dur,1.5s) ease-in-out infinite; will-change:transform,opacity; }
      .sc-anim-pulse-frame { animation: sc-pulse-frame var(--sc-anim-dur,1.5s) ease-in-out infinite; will-change:transform,opacity; }
      .sc-anim-ripple      { animation: sc-ripple-expand var(--sc-anim-dur,1.5s) cubic-bezier(0.1, 0.4, 0.4, 1) infinite; will-change:transform,opacity; }
      .sc-anim-ripple-inv  { animation: sc-ripple-implode var(--sc-anim-dur,1.5s) cubic-bezier(0.3, 0, 0.8, 0.8) infinite; will-change:transform,opacity; }
      
      .sc-anim-ripple-d1   { animation-delay: calc(var(--sc-anim-dur,1.5s) * 0.33); }
      .sc-anim-ripple-d2   { animation-delay: calc(var(--sc-anim-dur,1.5s) * 0.66); }
      
      .g-tick-labels.fade-in { animation: sc-tick-fade-in var(--sc-fade-dur, 0.4s) cubic-bezier(0.4, 0, 0.2, 1) forwards; }

      /* --- SUPERCARD LAYER MAPPING --- */
      .layer-elm-base    { z-index: 700; }
      .layer-elm-static  { z-index: 800; }
      .layer-elm-dynamic { z-index: 900; }
      .layer-elm-float   { z-index: 1000; }
    `;
  }
  constructor() {
    super(), this.SIZE = 50, this.CENTER = 25, this._tierState = null, this._thresholdActive = !1, this._bgColorThresholdActive = !1, this._isInitialized = !1, this._lastRenderAngle = null;
  }
  firstUpdated() {
    setTimeout(() => {
      this._isInitialized = !0;
    }, 50);
  }
  _get(e, o) {
    return this.config[e] ?? o;
  }
  _handleTouch(e) {
    e.stopPropagation();
  }
  _checkThreshold(e, o, p, t, i) {
    const r = O(t, 0) / 100, u = parseFloat(p);
    if (isNaN(u)) return !1;
    const n = u * (1 - r), l = u * (1 + r);
    switch (o) {
      case ">":
        return i ? e > n : e > l;
      case "<":
        return i ? e < l : e < n;
      case ">=":
        return i ? e >= n : e >= l;
      case "<=":
        return i ? e <= l : e <= n;
      case "==":
        return Math.abs(e - u) <= Math.abs(u * r);
      default:
        return !1;
    }
  }
  _calculateGaugeData(e) {
    const o = this._get("value_autoscale", !1) === !0, p = this._get("value_autorange", !1) === !0, t = this._get("dynamic_max_scale", !1) === !0, i = parseFloat(this._get("autoscale_hysteresis", 10)), r = this._get("min", ""), u = this._get("max", "");
    let n = r === "" || r === null ? 0 : parseFloat(r), l = u === "" || u === null ? 100 : parseFloat(u);
    isNaN(n) && (n = 0), isNaN(l) && (l = 100);
    let d = n, a = l, c = e, h = "", v = 1, b = 0;
    if (p) {
      const g = isFinite(e) ? Math.abs(e) : 0, m = Math.abs(l) || 1, f = [];
      let y = 10;
      for (; y < m; )
        f.push(y), y *= 10;
      f.push(m);
      let $ = f.findIndex((w) => g <= w);
      $ === -1 && ($ = f.length - 1), this._tierState !== null && ($ > this._tierState ? g <= f[this._tierState] * (1 + i / 100) && ($ = this._tierState) : $ < this._tierState && g > f[$] * (1 - i / 100) && ($ = this._tierState)), b = Math.min($, f.length - 1), d = n < 0 ? -f[b] : 0, a = f[b], c = e;
    }
    if (t && !p) {
      const g = isFinite(e) ? Math.abs(e) : 0, m = Math.max(g, Math.abs(l));
      d = n < 0 ? -m : 0, a = m, c = e;
    }
    if (o) {
      const g = isFinite(e) ? Math.abs(e) : 0;
      let m = 0;
      g >= 1e3 && (m = Math.floor(Math.log10(g) / 3)), this._tierState !== null && !p && (m > this._tierState ? g < Math.pow(1e3, this._tierState + 1) * (1 + i / 100) && (m = this._tierState) : m < this._tierState && g > Math.pow(1e3, m) * (1 - i / 100) && (m = this._tierState));
      const f = ["", "k", "M", "G", "T", "P"];
      b = Math.min(m, f.length - 1), v = Math.pow(1e3, b), a /= v, d /= v, c = e / v, h = f[b];
    }
    return this._tierState = b, { min: d, max: a, val: c, unitPrefix: h, tierBase: v, resultTier: b };
  }
  _getParsedManualStops(e, o, p, t = "percent", i = o, r = p) {
    if (!e || !Array.isArray(e) || e.length === 0) return null;
    const u = r - i, n = t === "percent", l = (a) => {
      if (a == null || a === "") return null;
      const c = parseFloat(a);
      return isNaN(c) ? null : n ? i + c / 100 * u : c;
    }, d = e.map((a) => ({ limit: l(a.value), c: _t(a.color) || [128, 128, 128] })).filter((a) => a.limit !== null);
    return d.length === 0 ? null : (d.sort((a, c) => a.limit - c.limit), d.length === 1 && d.push({ limit: d[0].limit + 1e-3, c: d[0].c }), d);
  }
  _getColorAt(e, o) {
    if (!o || o.length === 0) return [128, 128, 128];
    if (e <= o[0].limit) return o[0].c;
    if (e >= o[o.length - 1].limit) return o[o.length - 1].c;
    for (let p = 0; p < o.length - 1; p++)
      if (e >= o[p].limit && e <= o[p + 1].limit)
        return Rt(o[p].c, o[p + 1].c, (e - o[p].limit) / (o[p + 1].limit - o[p].limit));
    return o[0].c;
  }
  _getSmartStops(e, o) {
    var v;
    const p = this._get("gradient_preset", "manual"), t = o - e, i = e + t / 2, r = (b, g) => ({ limit: b, c: g }), u = O(this._get("gradient_start", e), e), n = O(this._get("gradient_end", o), o);
    if (p === "manual") {
      const b = this._getParsedManualStops(this._get("manual_stops", []), e, o, this._get("threshold_unit", "percent"), u, n);
      if (b) return b;
    }
    const l = n - u, d = this._get("threshold_unit", "percent") === "percent", a = (b) => {
      if (b == null || b === "") return null;
      const g = parseFloat(b);
      return isNaN(g) ? null : d ? u + g / 100 * l : g;
    };
    if (p === "symmetriccustom") {
      const b = this._get("color1", [76, 175, 80]), g = this._get("color2", [255, 235, 59]), m = this._get("color3", [244, 67, 54]), f = t / 2;
      let y = Math.max(0, Math.min(98, O(this._get("threshold1", 40), 40))) / 100, $ = Math.max(y, Math.min(100, O(this._get("threshold2", 75), 75))) / 100, w = Math.max(0.5, Math.min(30, O(this._get("threshold3", 8), 8))) / 100, S = Math.max(0.5, Math.min(30, O(this._get("threshold4", 8), 8))) / 100;
      return $ <= y + w && ($ = y + w + 0.01), [
        r(e, b),
        r(i - f * ($ + S / 2), b),
        r(i - f * ($ - S / 2), g),
        r(i - f * (y + w / 2), g),
        r(i - f * (y - w / 2), m),
        r(i, m),
        r(i + f * (y - w / 2), m),
        r(i + f * (y + w / 2), g),
        r(i + f * ($ - S / 2), g),
        r(i + f * ($ + S / 2), b),
        r(o, b)
      ];
    }
    if (p === "symmetric") {
      const b = this._get("color1", [76, 175, 80]), g = this._get("color2", [255, 235, 59]), m = this._get("color3", [244, 67, 54]);
      return [r(e, b), r(e + t * 0.25, g), r(e + t * 0.5, m), r(e + t * 0.75, g), r(o, b)];
    }
    if (p === "linear") {
      const b = this._get("color1", [76, 175, 80]), g = this._get("color2", [255, 235, 59]), m = this._get("color3", [244, 67, 54]), f = O(this._get("threshold1", 20), 20) / 100, y = O(this._get("threshold2", 60), 60) / 100;
      return [r(e, b), r(e + t * f, b), r(e + t * f + (t - t * f) * y, g), r(o, m)];
    }
    const c = [], h = a(this._get("threshold1", null));
    return c.push(r(h !== null ? h : u, this._get("color1", [33, 150, 243]))), [[this._get("threshold2", null), this._get("color2", [76, 175, 80])], [this._get("threshold3", null), this._get("color3", [255, 152, 0])], [this._get("threshold4", null), this._get("color4", [244, 67, 54])]].forEach(([b, g]) => {
      const m = a(b);
      m !== null && c.push(r(m, g));
    }), c.push(r(n, this._get("color5", [156, 39, 176]))), c.sort((b, g) => b.limit - g.limit), c.length < 2 && c.push({ limit: n, c: ((v = c[0]) == null ? void 0 : v.c) || [128, 128, 128] }), c;
  }
  _buildRingTemplate(e, o, p, t, i) {
    const r = this._getSmartStops(e.min, e.max), u = e.max - e.min, n = this._get("gradient_mode", "smooth") === "stepped", l = this._get("gradient_resolution", "auto");
    let d = 1;
    if (l === "auto") {
      const c = Math.max(0.4, 25 / (t + 1));
      d = Math.max(1, Math.floor(Math.abs(p) / c));
    } else {
      const c = { coarse: 1, medium: 12, fine: 24, superfine: 48, ultrafine: 96, megafine: 192 }, h = l === "coarse" ? r.length : Math.max(1, r.length - 1);
      d = Math.max(1, h * (c[l] ?? 24));
    }
    const a = [];
    for (let c = 0; c < d; c++) {
      const h = c / d, v = (c + 1) / d, b = e.min + h * u;
      let g;
      const m = [];
      if (n && l === "coarse")
        for (let x = 0; x < r.length; x++) {
          const k = r[x], J = k.limit, A = x < r.length - 1 ? r[x + 1].limit : e.min + u, _e = Math.max(0, Math.min(1, (J - e.min) / u)), Pe = Math.max(0, Math.min(1, (A - e.min) / u));
          Pe > _e && m.push({ p1: _e, p2: Pe, color: k.c });
        }
      else
        g = this._getColorAt(b, r);
      const f = _t(g) || g, y = o + h * p, $ = o + v * p, w = qe(this.CENTER, this.CENTER, t, y), S = qe(this.CENTER, this.CENTER, t, $);
      a.push(q`<path class="layer-elm-base" d="M${w.x.toFixed(3)},${w.y.toFixed(3)} A${t},${t},0,0,1,${S.x.toFixed(3)},${S.y.toFixed(3)}" stroke="rgb(${f.join(",")})" stroke-width="${i}" fill="none" stroke-linecap="butt"/>`);
    }
    return q`<g class="g-ring">${a}</g>`;
  }
  render() {
    var Ue, Ge, lt;
    if (!this.config || !this.hass) return _``;
    let e = this.config.entity || "", o = this.config.gauge_attribute || null;
    if (this.config.global_id && this.config.global_id !== "manual") {
      const N = (this.globalEntities || []).find((E) => E.id === this.config.global_id);
      N && (e = N.entity, o = N.attribute);
    }
    const p = e ? this.hass.states[e] : null, t = this._get("min", ""), i = t === "" || t === null ? 0 : parseFloat(t) || 0, r = p ? o ? p.attributes[o] : p.state : null, u = O(r, i), n = this._calculateGaugeData(u), l = this._get("gauge_type", "full") === "semi", d = parseFloat(this._get("gauge_start_angle", "-90")), a = l ? 135 : d, c = l ? 270 : 360, h = O(this._get("gauge_scale", 0.9), 0.9), v = O(this._get("stroke_width", 3), 3), b = (this.CENTER - v / 2 - 1) * h, g = n.max - n.min, m = Math.max(0, Math.min(1, (n.val - n.min) / (g || 1))), f = a + m * c, y = this._isInitialized ? f : a;
    this._lastRenderAngle === null && (this._lastRenderAngle = a);
    const $ = Math.abs(f - this._lastRenderAngle);
    this._isInitialized && (this._lastRenderAngle = f);
    const w = this._get("animation_easing", "smooth");
    let S = O(this._get("animation_duration", 0.8), 0.8);
    if (w === "spring" && (S = O(this._get("animation_spring_duration", 1.5), 1.5)), this._get("animation_dynamic_speed", !1) && this._isInitialized && $ > 0) {
      const N = Math.min(1, $ / c);
      this._get("animation_dynamic_speed_invert", !1) ? S = S * Math.max(0.3, 1 - Math.sqrt(N) + 0.3) : S = S * Math.max(0.3, Math.sqrt(N));
    }
    let x = "cubic-bezier(0.2, 0, 0, 1)";
    if (w === "overshoot_light" && (x = "cubic-bezier(0.25, 1.15, 0.5, 1)"), w === "overshoot_medium" && (x = "cubic-bezier(0.34, 1.4, 0.64, 1)"), w === "overshoot_heavy" && (x = "cubic-bezier(0.5, 1.6, 0.4, 1)"), w === "elastic" && (x = "cubic-bezier(0.68, -0.2, 0.265, 1.55)"), w === "spring") {
      const N = parseInt(this._get("animation_spring_bounces", 3)), U = 8 - O(this._get("animation_spring_amplitude", 50), 50) / 100 * 7, M = [], P = 60, le = N * Math.PI + Math.PI / 2;
      for (let ge = 0; ge <= P; ge++) {
        const ye = ge / P;
        if (ye === 1) {
          M.push("1");
          continue;
        }
        const oe = 1 - Math.exp(-U * ye) * Math.cos(le * ye);
        M.push(oe.toFixed(3));
      }
      x = `linear(${M.join(", ")})`;
    }
    this._thresholdActive = this._checkThreshold(n.val, this._get("bg_threshold_anim_operator", ">"), this._get("bg_threshold_anim_value", 80), this._get("bg_threshold_anim_hysteresis", 5), this._thresholdActive), this._bgColorThresholdActive = this._checkThreshold(n.val, this._get("bg_color_threshold_operator", ">"), this._get("bg_color_threshold_value", 80), this._get("bg_color_threshold_hysteresis", 5), this._bgColorThresholdActive);
    const k = this._get("bg_threshold_anim_active", !1) === !0, J = this._get("bg_threshold_anim_type", "pulse_bg"), A = O(this._get("bg_threshold_anim_duration", 1.5), 1.5), _e = Je("fixed", this._get("bg_threshold_anim_color", [255, 50, 50])), Pe = this._get("bg_threshold_anim_ripple_inv", !1) === !0, We = ((b + v / 2) / (b * 0.15)).toFixed(1), He = this._get("bg_color_threshold_active", !1) === !0, rt = Je("fixed", this._get("bg_color_threshold_color", [255, 50, 50])), Ve = k && this._thresholdActive && J === "pulse_bg" ? "sc-anim-pulse-bg" : "", Me = k && this._thresholdActive && J === "pulse_frame" ? "sc-anim-pulse-frame" : "", Qe = Pe ? "sc-anim-ripple-inv" : "sc-anim-ripple", L = k && this._thresholdActive && J === "ripple" ? Qe : "";
    let z = "", Ee = O(this._get("bg_opacity", 1), 1);
    He && this._bgColorThresholdActive ? z = rt : k && this._thresholdActive && J === "pulse_bg" && (z = _e);
    const X = this._get("gauge_size_responsive", !1) === !0, G = O(this._get("gauge_size_px", 60), 60), xe = this._get("gauge_position_mode", "center"), Z = O(this._get("gauge_offset_x", 0), 0), C = O(this._get("gauge_offset_y", 0), 0), se = {
      "top-left": `top:0; left:0; transform:translate(${Z}px,${C}px)`,
      "top-center": `top:0; left:50%; transform:translate(calc(-50% + ${Z}px),${C}px)`,
      "top-right": `top:0; right:0; transform:translate(${-Z}px,${C}px)`,
      "center-left": `top:50%; left:0; transform:translate(${Z}px,calc(-50% + ${C}px))`,
      center: `top:50%; left:50%; transform:translate(calc(-50% + ${Z}px),calc(-50% + ${C}px))`,
      "center-right": `top:50%; right:0; transform:translate(${-Z}px,calc(-50% + ${C}px))`,
      "bottom-left": `bottom:0; left:0; transform:translate(${Z}px,${-C}px)`,
      "bottom-center": `bottom:0; left:50%; transform:translate(calc(-50% + ${Z}px),${-C}px)`,
      "bottom-right": `bottom:0; right:0; transform:translate(${-Z}px,${-C}px)`
    }, Re = `
      position: absolute;
      pointer-events: none;
      z-index: 700;
      width: ${X ? "100%" : `${G}px`};
      height: ${X ? "100%" : `${G}px`};
      ${X ? "" : se[xe] || se.center}; 
      --sc-anim-dur: ${A}s;
      --sc-ripple-scale: ${We};
      ${Me ? `--sc-frame-anim-color:${_e};` : ""}
      --sc-fade-dur: ${O(this._get("tick_label_crossfade_dur", 0.4), 0.4)}s;
    `, re = (this.CENTER - 0.5) * h;
    let T = !1, pe = "", Ne = "";
    const W = ["waves", "wobble_radial", "wobble_linear"].includes(J);
    if (k && this._thresholdActive && W) {
      T = !0;
      const E = 100 / O(this._get("bg_threshold_wave_count", 3), 3), U = O(this._get("bg_threshold_wave_balance", 50), 50) / 100, M = _e, P = Je("fixed", this._get("bg_threshold_anim_color2", "transparent")), le = A, ge = O(this._get("bg_threshold_gradient_angle", 90), 90), ye = 50, oe = 50, j = ["wobble_radial", "wobble_linear"].includes(J), ee = `sc-gauge-wave-${this.dataset.idx}`;
      let ce = "none", V = P;
      if (j) {
        const Q = O(this._get("bg_threshold_wobble_amplitude", 100), 100) / 100, Y = O(this._get("bg_threshold_wobble_freq", 4), 4), I = O(this._get("bg_threshold_wobble_pause", 2), 2), de = le, ie = de + I, he = de / ie;
        let $e = `@keyframes ${ee} {
`;
        const Te = 60;
        for (let ze = 0; ze <= Te; ze++) {
          const je = ze / Te, st = (je * he * 100).toFixed(1), Se = Math.pow(1 - je, 2), ut = (Q * Se * 100).toFixed(1), dt = `color-mix(in srgb, ${M} ${ut}%, ${P})`, pt = E * (1 - je * 0.3), yt = 1 - Math.pow(1 - je, 3), Ye = yt * Y * E, Le = Ye.toFixed(2), Ct = (Ye + pt * U).toFixed(2), Tt = (Ye + pt).toFixed(2), St = (yt * 150).toFixed(1), Pt = Math.max(0, St - 15).toFixed(1);
          let Nt = "";
          if (J === "wobble_linear") {
            const Ot = `linear-gradient(${ge}deg, transparent ${Pt}%, ${P} ${St}%)`, zt = `repeating-linear-gradient(${ge}deg, ${dt} ${Le}%, ${P} ${Ct}%, ${dt} ${Tt}%)`;
            Nt = `${Ot}, ${zt}`;
          } else {
            const Ot = `radial-gradient(circle at ${ye}% ${oe}%, transparent ${Pt}%, ${P} ${St}%)`, zt = `repeating-radial-gradient(circle at ${ye}% ${oe}%, ${dt} ${Le}%, ${P} ${Ct}%, ${dt} ${Tt}%)`;
            Nt = `${Ot}, ${zt}`;
          }
          $e += `  ${st}% { background: ${Nt}; }
`;
        }
        I > 0 && ($e += `  100% { background: ${P}; }
`), $e += `}
`, pe = _`<style>${$e}</style>`, ce = `${ee} ${ie}s infinite linear`;
      } else {
        let Q = `@keyframes ${ee} {
`;
        const Y = this._get("bg_threshold_anim_ripple_inv", !1);
        for (let I = 0; I <= 100; I += 100 / 60) {
          const ie = (Y ? 1 - I / 100 : I / 100) * E, he = ie.toFixed(2), $e = (ie + E * U).toFixed(2), Te = (ie + E).toFixed(2), ze = J === "waves" ? `repeating-linear-gradient(${ge}deg, ${M} ${he}%, ${P} ${$e}%, ${M} ${Te}%)` : `repeating-radial-gradient(circle at ${ye}% ${oe}%, ${M} ${he}%, ${P} ${$e}%, ${M} ${Te}%)`;
          Q += `  ${I.toFixed(2)}% { background: ${ze}; }
`;
        }
        Q += `}
`, pe = _`<style>${Q}</style>`, ce = `${ee} ${le}s infinite linear`, V = J === "waves" ? `repeating-linear-gradient(${ge}deg, ${M} 0%, ${P} ${E * U}%, ${M} ${E}%)` : `repeating-radial-gradient(circle at ${ye}% ${oe}%, ${M} 0%, ${P} ${E * U}%, ${M} ${E}%)`;
      }
      const te = re * 4;
      Ne = _`
        <div style="position:absolute; top:50%; left:50%; width:${te}%; height:${te}%; transform:translate(-50%,-50%); border-radius:50%; background:${V}; animation:${ce}; z-index:690; pointer-events:none; opacity:${Ee};"></div>
      `;
    }
    const fe = this._get("bg_mode", "none"), we = `scBg_${this.config.entity ? this.config.entity.replace(/[^a-zA-Z0-9]/g, "_") : "x"}_${this.dataset.idx || 0}`, Ae = Je("fixed", this._get("bg_color1", [30, 30, 30])), et = Je("fixed", this._get("bg_color2", [60, 60, 60])), Ze = Math.max(0, Math.min(100, O(this._get("bg_balance", 50), 50)));
    let be = "";
    if (!T)
      if (fe === "adaptive")
        be = q`<circle class="layer-elm-base ${Ve}" cx="${this.CENTER}" cy="${this.CENTER}" r="${re}" fill="var(--card-background-color,#1c1c1c)" opacity="${Ee}" style="transition: fill 0.4s ease; ${z ? `fill:${z};` : ""}"/>`;
      else if (fe === "solid")
        be = q`<circle class="layer-elm-base ${Ve}" cx="${this.CENTER}" cy="${this.CENTER}" r="${re}" fill="${Ae}" opacity="${Ee}" style="transition: fill 0.4s ease; ${z ? `fill:${z};` : ""}"/>`;
      else if (fe === "linear" || fe === "radial") {
        const N = this._get("bg_gradient_preset", "classic");
        let E = "";
        if (N === "manual") {
          const U = this._getParsedManualStops(this._get("bg_manual_stops", []), n.min, n.max, this._get("bg_threshold_unit", "percent"));
          if (U) {
            const M = n.max - n.min || 1;
            E = U.map((P) => {
              const le = Math.max(0, Math.min(100, (P.limit - n.min) / M * 100));
              return q`<stop offset="${le.toFixed(1)}%" stop-color="rgb(${P.c.join(",")})"/>`;
            });
          }
        }
        if (E || (E = q`<stop offset="0%" stop-color="${Ae}"/><stop offset="${Ze.toFixed(1)}%" stop-color="${Ae}"/><stop offset="100%" stop-color="${et}"/>`), fe === "linear") {
          const U = O(this._get("bg_gradient_angle", 135), 135), M = U * Math.PI / 180, P = (50 - Math.cos(M) * 50).toFixed(1), le = (50 - Math.sin(M) * 50).toFixed(1), ge = (50 + Math.cos(M) * 50).toFixed(1), ye = (50 + Math.sin(M) * 50).toFixed(1);
          be = q`<defs><linearGradient id="${we}" x1="${P}%" y1="${le}%" x2="${ge}%" y2="${ye}%">${E}</linearGradient><clipPath id="${we}clip"><circle cx="${this.CENTER}" cy="${this.CENTER}" r="${re}"/></clipPath></defs><circle class="layer-elm-base ${Ve}" cx="${this.CENTER}" cy="${this.CENTER}" r="${re}" fill="url(#${we})" opacity="${Ee}" clip-path="url(#${we}clip)" style="transition: fill 0.4s ease; ${z ? `fill:${z};` : ""}"/>`;
        } else fe === "radial" && (be = q`<defs><radialGradient id="${we}" cx="50%" cy="50%" r="50%">${E}</radialGradient><clipPath id="${we}clip"><circle cx="${this.CENTER}" cy="${this.CENTER}" r="${re}"/></clipPath></defs><circle class="layer-elm-base ${Ve}" cx="${this.CENTER}" cy="${this.CENTER}" r="${re}" fill="url(#${we})" opacity="${Ee}" clip-path="url(#${we}clip)" style="transition: fill 0.4s ease; ${z ? `fill:${z};` : ""}"/>`);
      } else
        be = q`<circle class="layer-elm-base ${Ve}" cx="${this.CENTER}" cy="${this.CENTER}" r="${re}" fill="transparent" opacity="0" style="pointer-events:none; transition: fill 0.4s ease; opacity: ${z ? Ee : 0}; ${z ? `fill:${z};` : ""}"/>`;
    const De = this._get("frame_ring_active", !1) === !0;
    let B = "";
    if (De) {
      const N = O(this._get("frame_ring_width", 1.5), 1.5) * h, E = O(this._get("frame_ring_gap", 1.5), 1.5) * h, U = O(this._get("frame_ring_opacity", 1), 1), M = Je(this._get("frame_ring_color_type", "fixed"), this._get("frame_ring_color", [80, 80, 80])), P = b + v / 2 + E + N / 2, le = this._get("frame_ring_closed", !1) === !0, ge = Me ? `stroke: ${_e};` : `stroke: ${M};`;
      if (le || c >= 360)
        B = q`<circle class="layer-elm-base ${Me}" cx="${this.CENTER}" cy="${this.CENTER}" r="${P}" stroke-width="${N}" fill="none" opacity="${U}" style="${ge} transition: stroke 0.4s ease;"/>`;
      else {
        const ye = qe(this.CENTER, this.CENTER, P, a), oe = qe(this.CENTER, this.CENTER, P, a + c - 0.01), j = c > 180 ? 1 : 0;
        B = q`<path class="layer-elm-base ${Me}" d="M${ye.x.toFixed(3)},${ye.y.toFixed(3)} A${P},${P},0,${j},1,${oe.x.toFixed(3)},${oe.y.toFixed(3)}" stroke-width="${N}" fill="none" stroke-linecap="round" opacity="${U}" style="${ge} transition: stroke 0.4s ease;"/>`;
      }
    }
    const K = parseInt(this._get("tick_count", 0)), ve = K > 1 ? K - 1 : 1;
    let Ce = 1;
    g !== 0 && (Ce = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(g) / 5, 1e-6)))));
    const nt = [], at = [];
    if (K > 0) {
      const N = O(this._get("tick_length", 3), 3) * h, E = O(this._get("tick_width", 1), 1) * h, U = O(this._get("tick_offset", 0), 0) * h, M = b + U, P = M - N, le = Je(this._get("tick_color_type", "fixed"), this._get("tick_color", [128, 128, 128])), ge = Je(this._get("tick_label_color_type", "adaptive"), this._get("tick_label_color", null)), ye = this._get("tick_label_tick_color", null) ? Je("fixed", this._get("tick_label_tick_color", null)) : ge, oe = O(this._get("tick_label_font_size", 7), 7) * h, j = O(this._get("tick_label_offset", 10), 10) * h, ee = O(this._get("tick_label_spread", 0), 0) * h, ce = parseInt(this._get("sub_tick_count", 0));
      if (ce > 0 && K > 1) {
        const V = O(this._get("sub_tick_length", 1.5), 1.5) * h, te = O(this._get("sub_tick_width", 0.5), 0.5) * h, Q = O(this._get("sub_tick_offset", 0), 0) * h, Y = Je(this._get("sub_tick_color_type", "fixed"), this._get("sub_tick_color", [100, 100, 100])), I = b + Q, de = I - V;
        for (let ie = 0; ie < K - 1; ie++) {
          const he = a + ie / ve * c, Te = (a + (ie + 1) / ve * c - he) / (ce + 1);
          for (let ze = 1; ze <= ce; ze++) {
            const je = he + ze * Te, st = qe(this.CENTER, this.CENTER, de, je), Se = qe(this.CENTER, this.CENTER, I, je);
            nt.push(q`<line class="layer-elm-static" x1="${st.x.toFixed(3)}" y1="${st.y.toFixed(3)}" x2="${Se.x.toFixed(3)}" y2="${Se.y.toFixed(3)}" stroke="${Y}" stroke-width="${te}" stroke-linecap="round"/>`);
          }
        }
      }
      for (let V = 0; V < K; V++) {
        const te = a + V / ve * c, Q = this._get("show_tick_labels", !1) && V % Math.max(1, parseInt(this._get("tick_label_step", 1))) === 0, Y = Q ? M - N - O(this._get("tick_label_extra_length", 0), 0) * h : P, I = qe(this.CENTER, this.CENTER, Y, te), de = qe(this.CENTER, this.CENTER, M, te), ie = Q ? this._get("tick_label_inherit_color", !1) ? ge : ye : le;
        if (nt.push(q`<line class="layer-elm-static" x1="${I.x.toFixed(3)}" y1="${I.y.toFixed(3)}" x2="${de.x.toFixed(3)}" y2="${de.y.toFixed(3)}" stroke="${ie}" stroke-width="${E}" stroke-linecap="round"/>`), Q) {
          let he = n.min + V / ve * g;
          this._get("show_multiplier_label", !1) && this._get("multiplier_divide_ticks", !1) && (he /= Ce);
          const $e = parseInt(this._get("tick_label_decimals", 0)) > 0 ? parseFloat(he.toFixed(parseInt(this._get("tick_label_decimals", 0)))).toString() : he.toFixed(0), Te = te * Math.PI / 180, ze = Math.cos(Te), je = Math.sin(Te), st = j >= 0;
          let Se = "middle";
          ze > 0.3 ? Se = st ? "start" : "end" : ze < -0.3 && (Se = st ? "end" : "start");
          let ct = "central";
          je > 0.5 ? ct = st ? "hanging" : "baseline" : je < -0.5 && (ct = st ? "baseline" : "hanging");
          const ut = st ? Math.abs(je) * (oe * 0.25) : 0, dt = qe(this.CENTER, this.CENTER, b + j + ut, te);
          if (je < -0.75 && Math.abs(ze) > 0.02) {
            const pt = (je + 0.75) / -0.25;
            dt.x += (ze > 0 ? 1 : -1) * ee * pt;
          }
          at.push(q`<text class="layer-elm-static" x="${dt.x.toFixed(3)}" y="${dt.y.toFixed(3)}" fill="${ge}" font-size="${oe}px" text-anchor="${Se}" dominant-baseline="${ct}">${$e}</text>`);
        }
      }
    }
    this._get("custom_ticks", []).forEach((N) => {
      if (N.value === void 0 || N.value === "") return;
      const E = parseFloat(N.value);
      if (isNaN(E)) return;
      const U = Math.max(0, Math.min(1, (E - n.min) / (g || 1))), M = a + U * c, P = O(N.length, 4) * h, le = O(N.width, 1) * h, ge = O(N.offset, 0) * h, ye = Je("fixed", N.color || "#ff0000"), oe = b + ge, j = oe - P, ee = qe(this.CENTER, this.CENTER, j, M), ce = qe(this.CENTER, this.CENTER, oe, M);
      if (nt.push(q`<line class="layer-elm-static" x1="${ee.x.toFixed(3)}" y1="${ee.y.toFixed(3)}" x2="${ce.x.toFixed(3)}" y2="${ce.y.toFixed(3)}" stroke="${ye}" stroke-width="${le}" stroke-linecap="round"/>`), N.label) {
        const V = O(N.label_offset, 10) * h, te = qe(this.CENTER, this.CENTER, b + V, M), Q = O(N.label_font_size, 7) * h, Y = M * Math.PI / 180, I = Math.cos(Y), de = Math.sin(Y), ie = V >= 0;
        let he = "middle";
        I > 0.05 ? he = ie ? "start" : "end" : I < -0.05 && (he = ie ? "end" : "start");
        let $e = "central";
        de > 0.05 ? $e = ie ? "hanging" : "baseline" : de < -0.05 && ($e = ie ? "baseline" : "hanging"), at.push(q`<text class="layer-elm-static" x="${te.x.toFixed(3)}" y="${te.y.toFixed(3)}" fill="${ye}" font-size="${Q}px" text-anchor="${he}" dominant-baseline="${$e}" style="pointer-events:none">${N.label}</text>`);
      }
    });
    const R = [];
    if (this._get("show_scale_label", !1)) {
      const N = n.unitPrefix + (this._get("scale_label_show_raw_unit", !1) ? this._get("scale_label_custom_unit", ((Ue = p == null ? void 0 : p.attributes) == null ? void 0 : Ue.unit_of_measurement) || "") : ""), E = Je(this._get("scale_label_color_type", "adaptive"), this._get("scale_label_color", null));
      R.push(q`<text class="layer-elm-dynamic" x="${this.CENTER}" y="${this.CENTER + O(this._get("scale_label_offset_y", -18), -18) * h}" fill="${E}" font-size="${O(this._get("scale_label_font_size", 10), 10) * h}px" text-anchor="middle" font-weight="500" style="pointer-events:none">${N}</text>`);
    }
    if (this._get("show_multiplier_label", !1) && K > 1) {
      let N = this._get("multiplier_divide_ticks", !1) ? Ce : g / ve;
      const E = `${this._get("multiplier_prepend", "x")}${parseFloat(N.toFixed(parseInt(this._get("multiplier_decimals", 0))))}${n.unitPrefix}`, U = Je(this._get("multiplier_color_type", "adaptive"), this._get("multiplier_color", null));
      R.push(q`<text class="layer-elm-dynamic" x="${this.CENTER + O(this._get("multiplier_offset_x", 0), 0) * h}" y="${this.CENTER + O(this._get("multiplier_offset_y", -30), -30) * h}" fill="${U}" font-size="${O(this._get("multiplier_font_size", 10), 10) * h}px" text-anchor="middle" font-weight="500" style="pointer-events:none">${E}</text>`);
    }
    if (this._get("gauge_label_text", "") && this._get("gauge_label_active", !0)) {
      const N = this._get("gauge_label_text", ""), E = O(this._get("gauge_label_font_size", 8), 8) * h, U = this._get("gauge_label_font_weight", 600), M = this.CENTER + O(this._get("gauge_label_offset_x", 0), 0) * h, P = this.CENTER + O(this._get("gauge_label_offset_y", -8), -8) * h, le = Je(this._get("gauge_label_color_type", "adaptive"), this._get("gauge_label_color", null));
      R.push(q`<text class="layer-elm-static" x="${M.toFixed(2)}" y="${P.toFixed(2)}" fill="${le}" font-size="${E}px" font-weight="${U}" text-anchor="middle" dominant-baseline="middle" style="pointer-events:none">${N}</text>`);
    }
    const ue = Je(this._get("pointer_color_type", "fixed"), this._get("pointer_color", [255, 255, 255])), D = O(this._get("pointer_width", 2), 2) * h, ne = O(this._get("pointer_length", 10), 10) * h, me = b - O(this._get("pointer_offset", 2), 2) * h, ae = me - ne;
    let ke = "", Oe = "", tt = 0, H = 0;
    if (this._get("pointer_shadow_type", "none") !== "none") {
      const N = O(this._get("pointer_shadow_blur", 0.8), 0.8), E = O(this._get("pointer_shadow_distance", this._get("pointer_shadow_offset_y", 0.5)), 0.5), M = O(this._get("pointer_shadow_angle", 90), 90) * Math.PI / 180;
      tt = E * Math.cos(M), H = E * Math.sin(M);
      const P = `p-shadow-${this.config.entity ? this.config.entity.replace(/[^a-zA-Z0-9]/g, "_") : "x"}_${this.dataset.idx || 0}`;
      ke = q`
        <defs>
          <filter id="${P}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="${N}" />
          </filter>
        </defs>
      `, Oe = `url(#${P})`;
    }
    const Ie = `${n.unitPrefix}_${n.resultTier}_${n.max}`;
    return _`
      <div class="sc-gauge-wrap" @touchstart=${this._handleTouch} style="${Re}">
        ${pe}
        ${Ne}
        
        <svg viewBox="0 0 ${this.SIZE} ${this.SIZE}" style="width:100%;height:100%;overflow:visible;display:block;">
          
          ${ke}
          ${be}

          ${J === "ripple" ? [...Array(this._get("bg_threshold_anim_ripple_multi", !1) ? 3 : 1)].map((N, E) => q`
            <g transform="translate(${this.CENTER},${this.CENTER})">
              <circle class="layer-elm-float ${L} ${E === 1 ? "sc-anim-ripple-d1" : E === 2 ? "sc-anim-ripple-d2" : ""}" 
                      cx="0" cy="0" r="${(b * 0.15).toFixed(2)}" fill="none" stroke="${_e}" 
                      stroke-width="${(v * 0.5).toFixed(2)}" opacity="0" style="will-change:transform,opacity;"/>
            </g>
          `) : ""}

          ${B}

          ${this._buildRingTemplate(n, a, c, b, v)}
          
          ${this._get("sectors", []).map((N) => {
      const E = a + O(N.start_percent, 75) / 100 * c, U = E + O(N.length_percent, 25) / 100 * c;
      if (Math.abs(U - E) < 0.01) return "";
      const M = O(N.outer_radius, 22) * h, P = O(N.inner_radius, 12) * h, le = U - E, ge = n.min + O(N.start_percent, 75) / 100 * g, ye = n.min + (O(N.start_percent, 75) + O(N.length_percent, 25)) / 100 * g, oe = ye - ge, ee = (N.gradient_preset || (N.use_gradient ? "classic" : "none")) === "manual" ? this._getParsedManualStops(N.manual_stops, ge, ye, N.threshold_unit || "percent") : null;
      if (ee || N.use_gradient && N.color_end) {
        let ce;
        if (N.resolution_auto)
          ce = Math.max(0.2, 15 / (M + 1));
        else {
          const Q = O(N.resolution, 3.6);
          ce = 5.1 - Math.max(0.1, Math.min(5, Q));
        }
        const V = Math.max(4, Math.floor(Math.abs(le) / ce)), te = [];
        if (ee)
          for (let Q = 0; Q < V; Q++) {
            const Y = Q / V, I = (Q + 1) / V, de = E + Y * le, ie = E + I * le + (le > 0 ? 0.2 : -0.2), he = Y + 0.5 / V, $e = ge + he * oe, Te = this._getColorAt($e, ee);
            te.push(q`<path class="layer-elm-base" d="${Ft(this.CENTER, this.CENTER, P, M, de, ie)}" fill="rgb(${Te.join(",")})" opacity="${O(N.opacity, 0.85)}"/>`);
          }
        else {
          const Q = _t(Je("fixed", N.color || "#dc3232")) || [220, 50, 50], Y = _t(Je("fixed", N.color_end)) || [0, 255, 0];
          for (let I = 0; I < V; I++) {
            const de = I / V, ie = (I + 1) / V, he = E + de * le, $e = E + ie * le + (le > 0 ? 0.2 : -0.2), Te = Rt(Q, Y, de + 0.5 / V);
            te.push(q`<path class="layer-elm-base" d="${Ft(this.CENTER, this.CENTER, P, M, he, $e)}" fill="rgb(${Te.join(",")})" opacity="${O(N.opacity, 0.85)}"/>`);
          }
        }
        return te;
      } else
        return q`<path class="layer-elm-base" d="${Ft(this.CENTER, this.CENTER, P, M, E, U)}" fill="${Je("fixed", N.color || "#dc3232")}" opacity="${O(N.opacity, 0.85)}"/>`;
    })}

          ${nt.length > 0 ? q`<g>${nt}</g>` : ""}
          ${at.length > 0 ? q`<g class="g-tick-labels fade-in" key="${Ie}">${at}</g>` : ""}

          ${R}

          <g class="layer-elm-float">
            ${this._get("pointer_3d_effect", !1) ? q`
              <defs>
                <linearGradient id="sc-3d-pointer-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="white" stop-opacity="0.8"/>
                  <stop offset="35%" stop-color="white" stop-opacity="0.0"/>
                  <stop offset="65%" stop-color="black" stop-opacity="0.0"/>
                  <stop offset="100%" stop-color="black" stop-opacity="0.6"/>
                </linearGradient>
              </defs>
            ` : ""}

            <g transform="translate(${this.CENTER + O(this._get("pivot_offset_x", 0), 0)}, ${this.CENTER + O(this._get("pivot_offset_y", 0), 0)})">
              
              ${Oe ? q`
                <g transform="translate(${tt.toFixed(2)}, ${H.toFixed(2)})" filter="${Oe}">
                  <circle cx="0" cy="0" r="${O(this._get("pointer_center_radius", 2), 2) * h}" fill="rgba(0,0,0,0.35)"/>
                  
                  ${this._get("pointer_3d_effect", !1) ? "" : q`
                    <g style="transform-origin:0 0; transform: rotate(${y}deg); transition: transform ${this._isInitialized ? S : 0}s ${x};">
                      ${this._get("pointer_type", "needle") === "triangle" ? q`<polygon points="${me},0 ${ae},${(-D / 2).toFixed(2)} ${ae},${(D / 2).toFixed(2)}" fill="rgba(0,0,0,0.35)"/>` : q`<line x1="${ae}" y1="0" x2="${me}" y2="0" stroke="rgba(0,0,0,0.35)" stroke-width="${D.toFixed(2)}" stroke-linecap="round"/>`}
                    </g>
                  `}
                </g>
              ` : ""}

              <circle cx="0" cy="0"
                      r="${O(this._get("pointer_center_radius", 2), 2) * h}"
                      fill="${Je(this._get("pointer_dot_color_type", "fixed"), this._get("pointer_dot_color", [255, 255, 255]))}"/>

              ${Oe && this._get("pointer_3d_effect", !1) ? q`
                <g transform="translate(${tt.toFixed(2)}, ${H.toFixed(2)})" filter="${Oe}">
                  <g style="transform-origin:0 0; transform: rotate(${y}deg); transition: transform ${this._isInitialized ? S : 0}s ${x};">
                    ${this._get("pointer_type", "needle") === "triangle" ? q`<polygon points="${me},0 ${ae},${(-D / 2).toFixed(2)} ${ae},${(D / 2).toFixed(2)}" fill="rgba(0,0,0,0.45)"/>` : q`<line x1="${ae}" y1="0" x2="${me}" y2="0" stroke="rgba(0,0,0,0.45)" stroke-width="${D.toFixed(2)}" stroke-linecap="round"/>`}
                  </g>
                </g>
              ` : ""}

              <g style="transform-origin:0 0;
                        transform: rotate(${y}deg);
                        transition: transform ${this._isInitialized ? S : 0}s ${x};
                        will-change: transform;">
                
                ${this._get("pointer_type", "needle") === "triangle" ? q`
                      <polygon points="${me},0 ${ae},${(-D / 2).toFixed(2)} ${ae},${(D / 2).toFixed(2)}" fill="${ue}"/>
                      ${this._get("pointer_3d_effect", !1) ? q`<polygon points="${me},0 ${ae},${(-D / 2).toFixed(2)} ${ae},${(D / 2).toFixed(2)}" fill="url(#sc-3d-pointer-grad)"/>` : ""}
                    ` : q`
                      <line x1="${ae}" y1="0" x2="${me}" y2="0" stroke="${ue}" stroke-width="${D}" stroke-linecap="round"/>
                      ${this._get("pointer_3d_effect", !1) ? q`<line x1="${ae}" y1="0" x2="${me}" y2="0" stroke="url(#sc-3d-pointer-grad)" stroke-width="${D}" stroke-linecap="round"/>` : ""}
                    `}
              </g>
            </g>
          </g>

          ${this._get("show_value", !1) ? q`
            <text class="layer-elm-dynamic"
                  x="${this.CENTER}"
                  y="${this.CENTER + O(this._get("value_offset_y", 15), 15) * h}"
                  fill="${Je(this._get("value_color_type", "adaptive"), this._get("value_color", null))}"
                  font-size="${O(this._get("value_font_size", 12), 12) * h}px"
                  text-anchor="middle" font-weight="700">
              ${n.val.toFixed(parseInt(this._get("value_decimals", 0)))}${n.unitPrefix}${this._get("value_show_raw_unit", !1) ? this._get("value_replace_unit", !1) ? this._get("value_custom_unit", ((Ge = p == null ? void 0 : p.attributes) == null ? void 0 : Ge.unit_of_measurement) || "") : ((lt = p == null ? void 0 : p.attributes) == null ? void 0 : lt.unit_of_measurement) || "" : ""}
            </text>
          ` : ""}

        </svg>
      </div>
    `;
  }
}
customElements.get("sc-gauge") || customElements.define("sc-gauge", ti);
window.SupercardModules.gauge = /* @__PURE__ */ (() => {
  function s({ config: o }) {
    if (!(o != null && o.gauge_active)) return {};
    const p = Array.isArray(o.gauges) && o.gauges.length > 0 ? o.gauges : [o];
    return {
      litOverlay: _`${p.map((t, i) => _`
        <sc-gauge data-idx="${i}" .config=${t} .globalEntities=${o.global_entities}></sc-gauge>
      `)}`
    };
  }
  function e(o, p) {
    var r;
    if (!(p != null && p.gauge_active)) return;
    const t = Array.isArray(p.gauges) && p.gauges.length > 0 ? p.gauges : [p], i = (r = document.querySelector("home-assistant")) == null ? void 0 : r.hass;
    i && o.querySelectorAll("sc-gauge").forEach((u) => {
      const n = parseInt(u.getAttribute("data-idx"));
      u.config = t[n] || p, u.hass = i;
    });
  }
  return { update: s, onAfterRender: e, initCSS: () => "" };
})();
class ii extends Be {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      _expanded: { type: Object, state: !0 },
      _outerOpen: { state: !0 }
    };
  }
  constructor() {
    super(), this._expanded = {};
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
      .label-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 8px; margin-bottom: 8px; }
      .label-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; }
      .label-content { display: flex; flex-direction: column; gap: 10px; padding-top: 10px; margin-top: 8px; border-top: 1px solid var(--divider-color, #333); }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
      .col { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
      input[type="text"], input[type="number"], select {
        background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);
        border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; box-sizing: border-box;
      }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; }
      ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
      .toggle-icon { font-size: 10px; margin-right: 6px; display: inline-block; width: 12px; }
      .header-val { color: var(--primary-color, #03a9f4); font-family: monospace; font-weight: bold; margin-left: 8px; background: rgba(3,169,244,0.1); padding: 2px 4px; border-radius: 3px; }
      .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; margin-top: 4px; }
      ha-icon-picker { width: 100%; }
      .color-row { display: flex; gap: 6px; align-items: center; }
      .color-row input[type="color"] { width: 36px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; }
      .color-row input[type="text"] { flex: 1; }
      .icon-preview { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
      .clear-btn { background: rgba(255, 50, 50, 0.1); border: 1px solid rgba(255, 50, 50, 0.3); color: #f44; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; transition: all 0.2s; }
      .clear-btn:hover { background: rgba(255, 50, 50, 0.2); }
    `;
  }
  _commit(e) {
    this.dispatchEvent(new CustomEvent("labels-update", { detail: { labels_list: e } }));
  }
  _getLabelTitle(e) {
    var l, d;
    let o = e.label_text || "", p = "", t = e.entity, i = e.attribute, r = !1, u = null;
    if (e.global_id && e.global_id !== "manual") {
      const a = (((l = this.slot) == null ? void 0 : l.global_entities) || []).find((c) => c.id === e.global_id);
      a && (t = a.entity, i = a.attribute, r = !0, u = a);
    }
    if (e.use_entity && t && ((d = this.hass) != null && d.states[t])) {
      const a = this.hass.states[t];
      let c = i ? a.attributes[i] : a.state;
      if (e.decimals !== void 0 && e.decimals !== null && c !== void 0 && c !== null && c !== "") {
        const v = parseFloat(c);
        isNaN(v) || (c = v.toFixed(e.decimals));
      }
      const h = !i && a.attributes.unit_of_measurement ? ` ${a.attributes.unit_of_measurement}` : "";
      p = `${c}${h}`, o || (r ? (o = `[${u.alias || "Alias"}] ${a.attributes.friendly_name || t}`, i && (o += ` (${i})`)) : e.use_override || (o = a.attributes.friendly_name || t));
    } else o || (r ? o = `[${u.alias || "Alias"}] ${t || "Unbenannt"}` : o = `Label ${e.id.toString().slice(-3)}`);
    const n = e.use_icon && e.icon ? _`<ha-icon icon=${e.icon} style="--mdc-icon-size:14px;opacity:0.7;margin-right:4px;"></ha-icon>` : "";
    return _`
      <span class="toggle-icon">${this._expanded[e.id] ? "▼" : "▶"}</span>
      <div style="display:flex;align-items:center;">
        ${n}
        ${o}
        ${p ? _`<span class="header-val">${p}</span>` : ""}
      </div>
    `;
  }
  render() {
    if (!this.slot) return _``;
    const e = Array.isArray(this.slot.labels_list) ? this.slot.labels_list : [];
    return _`
      <details class="inner-section" ?open=${this._outerOpen} @toggle=${(o) => this._outerOpen = o.target.open}>
        <summary>── Labels &amp; Zusatztexte <span style="font-size:10px;">▼</span></summary>
        <div class="inner-content">
          ${e.map((o, p) => {
      var u, n, l;
      let t = o.entity;
      if (o.global_id && o.global_id !== "manual") {
        const d = (((u = this.slot) == null ? void 0 : u.global_entities) || []).find((a) => a.id === o.global_id);
        d && (t = d.entity);
      }
      let i = ["on", "off", "open", "closed", "true", "false", "home", "not_home"];
      if (t && ((n = this.hass) != null && n.states[t])) {
        const d = this.hass.states[t];
        d.attributes && Array.isArray(d.attributes.options) && (i = [.../* @__PURE__ */ new Set([...i, ...d.attributes.options])]);
      }
      const r = `states_${o.id}`;
      return _`
            <div class="label-card">
              <div class="label-header" @click=${() => this._expanded = { ...this._expanded, [o.id]: !this._expanded[o.id] }}>
                ${this._getLabelTitle(o)}
                <div style="display:flex;align-items:center;gap:8px">
                  <ha-switch .checked=${!!o.enabled}
                    @click=${(d) => d.stopPropagation()}
                    @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].enabled = d.target.checked, this._commit(a);
      }}>
                  </ha-switch>
                  <button @click=${(d) => {
        d.stopPropagation();
        const a = [...e];
        a.splice(p, 1), this._commit(a);
      }}
                    style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                </div>
              </div>

              ${this._expanded[o.id] ? _`
                <div class="label-content">

                  <div class="col">
                    <label>Manueller Text / Label</label>
                    <input type="text" .value=${o.label_text || ""} placeholder="z.B. Temperatur"
                      @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].label_text = d.target.value, this._commit(a);
      }}>
                  </div>

                  <div class="row">
                    <label>Entität verknüpfen</label>
                    <ha-switch .checked=${!!o.use_entity}
                      @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].use_entity = d.target.checked, this._commit(a);
      }}>
                    </ha-switch>
                  </div>

                  ${o.use_entity ? _`
                    <div class="col" style="margin-top: 4px; margin-bottom: 4px;">
                      <label>Datenquelle</label>
                      <select style="width: 100%;" @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].global_id = d.target.value, this._commit(a);
      }}>
                        <option value="manual" ?selected=${o.global_id === "manual" || !o.global_id}>Manuelle Auswahl</option>
                        ${(this.slot.global_entities || []).map((d) => {
        var m, f;
        const a = d.entity ? this.hass.states[d.entity] : null, c = d.alias || ((m = a == null ? void 0 : a.attributes) == null ? void 0 : m.friendly_name) || d.entity || "Unbenannt";
        let h = a ? a.state : "-";
        a && d.attribute && a.attributes[d.attribute] !== void 0 && (h = a.attributes[d.attribute]);
        const v = !d.attribute && ((f = a == null ? void 0 : a.attributes) != null && f.unit_of_measurement) ? ` ${a.attributes.unit_of_measurement}` : "", b = d.attribute ? ` (${d.attribute})` : "", g = `[${d.alias || "Alias"}] ${c}${b}: ${h}${v}`;
        return _`<option value=${d.id} ?selected=${o.global_id === d.id}>${g}</option>`;
      })}
                      </select>
                    </div>

                    ${!o.global_id || o.global_id === "manual" ? _`
                      <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
                        <div class="col" style="margin-bottom:8px;">
                          <label>Entität</label>
                          <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${!1} .value=${o.entity || ""}
                            @value-changed=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].entity = d.detail.value, this._commit(a);
      }}>
                          </ha-entity-picker>
                        </div>
                        <div class="col">
                          <label>Attribut</label>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <ha-selector style="flex:1;" .hass=${this.hass} .selector=${{ attribute: { entity_id: o.entity || ((l = this.slot) == null ? void 0 : l.entity) } }} .value=${o.attribute || ""}
                              @value-changed=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].attribute = d.detail.value, this._commit(a);
      }}>
                            </ha-selector>
                            <button title="Leeren" class="clear-btn" @click=${() => {
        const d = JSON.parse(JSON.stringify(e));
        d[p].attribute = "", this._commit(d);
      }}>✕</button>
                          </div>
                        </div>
                      </div>
                    ` : ""}
                    
                    <div class="row">
                      <label>Nachkommastellen</label>
                      <input type="number" min="0" max="5" style="width:60px" placeholder="Auto"
                        .value=${o.decimals ?? ""}
                        @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].decimals = d.target.value === "" ? null : parseInt(d.target.value), this._commit(a);
      }}>
                    </div>

                    <div class="row">
                      <label>Label / Entityname einblenden</label>
                      <ha-switch .checked=${o.show_name !== !1}
                        @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].show_name = d.target.checked, this._commit(a);
      }}>
                      </ha-switch>
                    </div>
                    ${o.show_name !== !1 ? _`
                      <div class="row">
                        <label>Manuellen Text als Name nutzen (Override)</label>
                        <ha-switch .checked=${!!o.use_override}
                          @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].use_override = d.target.checked, this._commit(a);
      }}>
                        </ha-switch>
                      </div>
                    ` : ""}
                  ` : ""}

                  <div class="row">
                    <label>Text-Schatten (Glow/Shadow)</label>
                    <ha-switch .checked=${!!o.text_shadow}
                      @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].text_shadow = d.target.checked, this._commit(a);
      }}>
                    </ha-switch>
                  </div>

                  <div class="section-title">Icon</div>
                  <div class="row">
                    <label>Icon anzeigen</label>
                    <ha-switch .checked=${!!o.use_icon}
                      @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].use_icon = d.target.checked, this._commit(a);
      }}>
                    </ha-switch>
                  </div>

                  ${o.use_icon ? _`
                    <div class="col">
                      <label>Icon auswählen</label>
                      <ha-icon-picker .hass=${this.hass} .value=${o.icon || ""}
                        @value-changed=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon = d.detail.value, this._commit(a);
      }}>
                      </ha-icon-picker>
                      ${o.icon ? _`
                        <div class="icon-preview">
                          <ha-icon icon=${o.icon} style="--mdc-icon-size:20px;color:${o.icon_color || "var(--primary-text-color)"}"></ha-icon>
                          <span>${o.icon}</span>
                        </div>` : ""}
                    </div>

                    <div class="row">
                      <label>Position</label>
                      <select style="width:55%" @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon_position = d.target.value, this._commit(a);
      }}>
                        <option value="before" ?selected=${(o.icon_position || "before") === "before"}>Vor Text</option>
                        <option value="after"  ?selected=${o.icon_position === "after"}>Nach Text</option>
                        <option value="only"   ?selected=${o.icon_position === "only"}>Nur Icon (kein Text)</option>
                      </select>
                    </div>

                    <div class="col">
                      <label>Icon Farbe</label>
                      <div class="color-row">
                        <input type="color" .value=${o.icon_color || "#ffffff"}
                          @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon_color = d.target.value, this._commit(a);
      }}>
                        <input type="text" .value=${o.icon_color || ""} placeholder="Leer = inherit"
                          @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon_color = d.target.value, this._commit(a);
      }}>
                      </div>
                    </div>

                    <div class="row">
                      <label>Icon Größe (CSS)</label>
                      <input type="text" style="width:80px" placeholder="20px, 50cqmin"
                        .value=${o.icon_size || ""}
                        @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon_size = d.target.value, this._commit(a);
      }}>
                    </div>

                    <div class="row">
                      <label>Abstand zum Text (px)</label>
                      <input type="number" style="width:60px" placeholder="4"
                        .value=${o.icon_gap || ""}
                        @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].icon_gap = parseInt(d.target.value) || null, this._commit(a);
      }}>
                    </div>
                  ` : ""}

                  <div class="section-title">Indikator & Container</div>
                  <div class="row">
                    <label>Als Indikator (Container) nutzen</label>
                    <ha-switch .checked=${!!o.use_indicator}
                      @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].use_indicator = d.target.checked, this._commit(a);
      }}>
                    </ha-switch>
                  </div>

                  ${o.use_indicator ? _`
                    <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-top: 4px;">
                      
                      <div style="font-size: 11px; color: var(--secondary-text-color); margin-bottom: 12px; font-style: italic;">
                        💡 Der Indikator nutzt automatisch die oben festgelegte Datenquelle als Trigger.
                      </div>

                      <div class="row" style="margin-bottom: 8px;">
                        <div class="col" style="flex:1; margin-right:8px;">
                          <label>Hintergrund-Form</label>
                          <select style="width: 100%; height:32px;" @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_shape = d.target.value, this._commit(a);
      }}>
                            <option value="rect" ?selected=${o.indicator_shape !== "circle"}>Rechteck</option>
                            <option value="circle" ?selected=${o.indicator_shape === "circle"}>Kreis</option>
                          </select>
                        </div>
                        ${o.indicator_shape !== "circle" ? _`
                          <div class="col" style="width:80px;">
                            <label>Radius</label>
                            <input type="text" style="height:32px;" .value=${o.indicator_radius || ""} placeholder="8px"
                              @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_radius = d.target.value, this._commit(a);
      }}>
                          </div>
                        ` : ""}
                      </div>

                      <div class="row" style="margin-bottom: 8px;">
                        <div class="col" style="flex:1;">
                          <label>Aktiv-Zustand (Trigger)</label>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <input type="text" list=${r} style="flex:1; height:32px;" .value=${o.indicator_state || ""} placeholder="z.B. on, open"
                              @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_state = d.target.value, this._commit(a);
      }}>
                            <datalist id=${r}>
                              ${i.map((d) => _`<option value="${d}"></option>`)}
                            </datalist>
                            <button title="Leeren" class="clear-btn" @click=${() => {
        const d = JSON.parse(JSON.stringify(e));
        d[p].indicator_state = "", this._commit(d);
      }}>✕</button>
                          </div>
                        </div>
                      </div>

                      <div class="row">
                        <div class="col" style="flex:1;">
                          <label>Sichtbarkeit</label>
                          <select style="width: 100%; height:32px;" @change=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_visibility = d.target.value, this._commit(a);
      }}>
                            <option value="always" ?selected=${!o.indicator_visibility || o.indicator_visibility === "always"}>Immer anzeigen</option>
                            <option value="active_only" ?selected=${o.indicator_visibility === "active_only"}>Nur anzeigen, wenn Zustand übereinstimmt</option>
                            <option value="inactive_only" ?selected=${o.indicator_visibility === "inactive_only"}>Ausblenden, wenn Zustand übereinstimmt</option>
                          </select>
                        </div>
                      </div>

                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                      <div style="background:rgba(255,255,255,0.02); padding:8px; border-radius:8px; border:1px solid var(--divider-color,#333);">
                        <div style="font-size: 11px; font-weight: bold; color: var(--secondary-text-color); margin-bottom: 8px; text-transform: uppercase;">Standard (Aus)</div>
                        
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Icon</label>
                          <ha-icon-picker .hass=${this.hass} .value=${o.indicator_icon_default || ""}
                            @value-changed=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_icon_default = d.detail.value, this._commit(a);
      }}>
                          </ha-icon-picker>
                        </div>
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Hintergrundfarbe</label>
                          <div class="color-row">
                            <input type="color" .value=${o.indicator_bg_default || "#333333"} @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_bg_default = d.target.value, this._commit(a);
      }}>
                            <input type="text" .value=${o.indicator_bg_default || ""} placeholder="transparent" @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_bg_default = d.target.value, this._commit(a);
      }}>
                          </div>
                        </div>
                        <div class="col">
                          <label>Icon-/Textfarbe</label>
                          <div class="color-row">
                            <input type="color" .value=${o.indicator_color_default || "#ffffff"} @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_color_default = d.target.value, this._commit(a);
      }}>
                            <input type="text" .value=${o.indicator_color_default || ""} placeholder="inherit" @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_color_default = d.target.value, this._commit(a);
      }}>
                          </div>
                        </div>
                      </div>

                      <div style="background:rgba(3, 169, 244, 0.05); padding:8px; border-radius:8px; border:1px solid rgba(3, 169, 244, 0.2);">
                        <div style="font-size: 11px; font-weight: bold; color: var(--primary-color); margin-bottom: 8px; text-transform: uppercase;">Aktiv (An)</div>
                        
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Icon</label>
                          <ha-icon-picker .hass=${this.hass} .value=${o.indicator_icon_active || ""}
                            @value-changed=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_icon_active = d.detail.value, this._commit(a);
      }}>
                          </ha-icon-picker>
                        </div>
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Hintergrundfarbe</label>
                          <div class="color-row">
                            <input type="color" .value=${o.indicator_bg_active || "#03a9f4"} @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_bg_active = d.target.value, this._commit(a);
      }}>
                            <input type="text" .value=${o.indicator_bg_active || ""} placeholder="transparent" @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_bg_active = d.target.value, this._commit(a);
      }}>
                          </div>
                        </div>
                        <div class="col">
                          <label>Icon-/Textfarbe</label>
                          <div class="color-row">
                            <input type="color" .value=${o.indicator_color_active || "#ffffff"} @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_color_active = d.target.value, this._commit(a);
      }}>
                            <input type="text" .value=${o.indicator_color_active || ""} placeholder="inherit" @input=${(d) => {
        const a = JSON.parse(JSON.stringify(e));
        a[p].indicator_color_active = d.target.value, this._commit(a);
      }}>
                          </div>
                        </div>
                      </div>
                    </div>
                  ` : ""}

                </div>
              ` : ""}
            </div>
            `;
    })}

          <button class="add-btn" @click=${() => {
      const o = [...e], p = Date.now();
      o.push({
        id: p,
        label_text: "",
        enabled: !0,
        use_entity: !1,
        show_name: !0,
        use_override: !1,
        use_icon: !1,
        icon: "",
        icon_position: "before",
        icon_color: "",
        icon_size: "",
        icon_gap: null,
        decimals: null,
        text_shadow: !1,
        use_indicator: !1,
        indicator_shape: "rect",
        indicator_visibility: "always"
      }), this._commit(o), this._expanded = { ...this._expanded, [p]: !0 };
    }}>＋ Label hinzufügen</button>
        </div>
      </details>
    `;
  }
}
customElements.define("sc-labels-editor", ii);
window.SupercardModules.labels = /* @__PURE__ */ (() => {
  function s({ hass: o, config: p }) {
    return {
      moduleData: { labelsResolved: (Array.isArray(p.labels_list) ? p.labels_list : []).map((r, u) => {
        var c, h, v, b, g;
        let n = r.entity || "", l = r.attribute || null;
        if (r.global_id && r.global_id !== "manual") {
          const f = (p.global_entities || []).find((y) => y.id === r.global_id);
          f && (n = f.entity, l = f.attribute);
        }
        let d = r.icon_size || "20px";
        /^\d+$/.test(d) && (d += "px");
        const a = {
          id: `label_${u}`,
          enabled: !!r.enabled,
          source: {
            entity: n,
            attribute: l
          },
          text: {
            name: r.label_text || "",
            value: "",
            showName: r.show_name !== !1,
            shadow: !!r.text_shadow
          },
          icon: {
            enabled: !!(r.use_icon && r.icon),
            name: r.icon || "",
            position: r.icon_position || "before",
            color: r.icon_color || "inherit",
            size: d,
            gap: r.icon_gap != null ? r.icon_gap : 4
          }
        };
        if (!r.enabled) return a;
        if (r.use_entity && n && ((c = o == null ? void 0 : o.states) != null && c[n])) {
          const m = o.states[n];
          let f = l ? (h = m.attributes) == null ? void 0 : h[l] : m.state;
          if (r.decimals !== void 0 && r.decimals !== null && f !== void 0 && f !== null && f !== "") {
            const $ = parseFloat(f);
            isNaN($) || (f = $.toFixed(r.decimals));
          }
          const y = !l && ((v = m.attributes) != null && v.unit_of_measurement) ? ` ${m.attributes.unit_of_measurement}` : "";
          a.text.value = `${f ?? ""}${y}`, r.use_override || (a.text.name = ((b = m.attributes) == null ? void 0 : b.friendly_name) || n);
        }
        if (a.mode = a.icon.enabled && a.icon.position === "only" ? "icon-only" : a.text.showName && a.text.value ? "both" : a.text.showName ? "name" : a.text.value ? "value" : "name", r.use_indicator) {
          let m = !1;
          if (n && ((g = o == null ? void 0 : o.states) != null && g[n])) {
            const _e = o.states[n], Pe = l ? _e.attributes[l] : _e.state;
            m = (r.indicator_state || "").split(",").map((He) => He.trim()).includes(String(Pe));
          }
          const f = r.indicator_visibility || "always";
          (f === "active_only" && !m || f === "inactive_only" && m) && (a.enabled = !1);
          const y = r.indicator_bg_active || "rgba(3, 169, 244, 0.2)", $ = r.indicator_bg_default || "transparent", w = r.indicator_color_active || "var(--primary-color)", S = r.indicator_color_default || "inherit", x = r.indicator_icon_active || r.icon || "", k = r.indicator_icon_default || r.icon || "", J = r.indicator_shape || "rect", A = J === "circle" ? "50%" : r.indicator_radius || "8px";
          a.container = {
            isIndicator: !0,
            active: m,
            shape: J,
            radius: A,
            bgColor: m ? y : $,
            color: m ? w : S
          }, a.icon.enabled = !0, a.icon.name = m ? x : k, a.icon.color = m ? w : S, a.text.color = m ? w : S;
        }
        return a;
      }) },
      staticKey: `labels-v2-${JSON.stringify(p.labels_list)}`
    };
  }
  function e(o, p, t) {
    return _`<sc-labels-editor .slot=${t} .hass=${p}
      @labels-update=${(i) => o("__merge__", i.detail)}>
    </sc-labels-editor>`;
  }
  return { update: s, renderCustomBlock: e };
})();
class ai extends Be {
  static get properties() {
    return {
      angle: { type: Number },
      distance: { type: Number },
      maxDistance: { type: Number }
    };
  }
  constructor() {
    super(), this.angle = 90, this.distance = 1, this.maxDistance = 5, this._isDragging = !1;
  }
  static get styles() {
    return Xe`
      :host { display: block; width: 100%; max-width: 120px; aspect-ratio: 1 / 1; margin: 0 auto; touch-action: none; }
      .pad-container {
        position: relative; width: 100%; height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%);
        border: 2px solid var(--divider-color, #444);
        border-radius: 50%; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
        cursor: pointer; overflow: hidden;
      }
      .pad-container::before, .pad-container::after { content: ''; position: absolute; background: rgba(255,255,255,0.1); }
      .pad-container::before { top: 0; bottom: 0; left: 50%; width: 1px; transform: translateX(-50%); }
      .pad-container::after { left: 0; right: 0; top: 50%; height: 1px; transform: translateY(-50%); }
      .thumb {
        position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%;
        transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5);
        pointer-events: none; z-index: 2; display: flex; align-items: center; justify-content: center; transition: box-shadow 0.2s;
      }
      .pad-container:active .thumb { box-shadow: 0 0 15px var(--warning-color, #ff9800), 0 2px 4px rgba(0,0,0,0.5); }
      .sun-icon { font-size: 10px; line-height: 1; margin-top: -1px; }
    `;
  }
  _handlePointerDown(e) {
    this._isDragging = !0, this.shadowRoot.querySelector(".pad-container").setPointerCapture(e.pointerId), this._updatePosition(e);
  }
  _handlePointerMove(e) {
    this._isDragging && this._updatePosition(e);
  }
  _handlePointerUp(e) {
    this._isDragging = !1, this.shadowRoot.querySelector(".pad-container").releasePointerCapture(e.pointerId);
  }
  _updatePosition(e) {
    const o = this.shadowRoot.querySelector(".pad-container").getBoundingClientRect(), p = o.left + o.width / 2, t = o.top + o.height / 2, i = o.width / 2, r = e.clientX - p, u = e.clientY - t;
    let l = (Math.atan2(u, r) * 180 / Math.PI + 180) % 360;
    l < 0 && (l += 360);
    let d = Math.sqrt(r * r + u * u);
    d > i && (d = i);
    let a = d / i * this.maxDistance;
    a < this.maxDistance * 0.05 && (a = 0, l = this.angle), this.angle = Math.round(l), this.distance = parseFloat(a.toFixed(2)), this.dispatchEvent(new CustomEvent("pad-change", { detail: { angle: this.angle, distance: this.distance }, bubbles: !0, composed: !0 }));
  }
  render() {
    const e = (this.angle + 180) * Math.PI / 180, o = this.distance / this.maxDistance * 50, p = 50 + Math.cos(e) * o, t = 50 + Math.sin(e) * o;
    return _`
      <div class="pad-container" @pointerdown=${this._handlePointerDown} @pointermove=${this._handlePointerMove} @pointerup=${this._handlePointerUp} @pointercancel=${this._handlePointerUp}>
        <div class="thumb" style="left: ${p}%; top: ${t}%;"><div class="sun-icon">☀️</div></div>
      </div>
    `;
  }
}
customElements.get("sc-shadow-pad") || customElements.define("sc-shadow-pad", ai);
function si(s) {
  const e = { empty: "Leer", icon: "Icon", name: "Entitäts-Name", state: "Zustand (Wert)" }, o = Array.isArray(s.gauges) ? s.gauges.length : s.gauge_active ? 1 : 0;
  for (let t = 0; t < o; t++) e[`gauge_${t}`] = `Gauge ${t + 1}`;
  const p = Array.isArray(s.progressbars) ? s.progressbars.length : 0;
  for (let t = 0; t < p; t++) {
    const i = s.progressbars[t];
    e[`progressbar_${t}`] = (i == null ? void 0 : i.label_text) || `Progressbar ${t + 1}`;
  }
  return Array.isArray(s.labels_list) && s.labels_list.forEach((t, i) => {
    e[`label_${i}`] = `Label: ${t.label_text || t.entity || i + 1}`;
  }), e;
}
function oi(s) {
  const e = {
    general: { label: "Allgemein", items: [{ id: "none", label: "— Bitte Ziel wählen —" }, { id: "main", label: "Hauptkarte (Gesamter Hintergrund)" }] },
    cells: { label: "Layout-Zellen (Container)", items: [] },
    elements: { label: "Direkte Elemente (Passgenau)", items: [] }
  }, o = si(s);
  return Array.isArray(s.layout_rows) && s.layout_rows.forEach((p, t) => {
    p.cells.forEach((i, r) => {
      const u = o[i.content] || "Leer";
      e.cells.items.push({ id: `r${t}c${r}`, label: `Zelle Z${t + 1}C${r + 1} (${u})` });
    });
  }), Object.entries(o).forEach(([p, t]) => {
    p !== "empty" && e.elements.items.push({ id: `elm_${p}`, label: `Element: ${t}` });
  }), e;
}
class xt extends Be {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      commitFn: { type: Function },
      _expanded: { type: Object, state: !0 }
    };
  }
  constructor() {
    super(), this._expanded = xt._expandedCache ?? {};
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
      .pattern-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 10px; position: relative; transition: opacity 0.2s; }
      .pattern-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; user-select: none; }
      .pattern-content { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; margin-top: 8px; border-top: 1px dashed var(--divider-color, #333); }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
      .col { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
      select, input[type="text"], input[type="number"], input[type="range"] { background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; }
      select optgroup { background: var(--secondary-background-color, #1e1e1e); color: var(--primary-color); font-weight: bold; font-style: normal; }
      select option { color: var(--primary-text-color); font-weight: normal; }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; }
      ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
      .toggle-icon { font-size: 10px; margin-right: 8px; display: inline-block; width: 12px; text-align: center; }
      .drag-handle { cursor: grab; padding-right: 8px; color: var(--secondary-text-color); }
      .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; margin-bottom: -4px; margin-top: 8px; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; }
      input[type="color"] { padding: 0; width: 60%; height: 32px; cursor: pointer; border: 1px solid var(--divider-color); }
      input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
      input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }
      option:disabled { color: rgba(255,255,255,0.3); font-style: italic; }
      .auto-magic-box { background: rgba(3,169,244,0.1); padding: 8px 10px; border-radius: 6px; font-size: 11px; color: var(--primary-color); display: flex; flex-direction: column; gap: 8px; border: 1px dashed rgba(3,169,244,0.3); }
    `;
  }
  _commit(e) {
    this.commitFn && this.commitFn("__merge__", { fx_glass_patterns: e });
  }
  _toggle(e, o) {
    o && o.stopPropagation(), this._expanded = { ...this._expanded, [e]: !this._expanded[e] }, xt._expandedCache = this._expanded;
  }
  render() {
    if (!this.slot) return _``;
    let e = Array.isArray(this.slot.fx_glass_patterns) ? this.slot.fx_glass_patterns : [];
    e.length === 0 && this.slot.fx_glass && this.slot.fx_glass.enabled && (e = [{ id: Date.now(), target: "main", padding_unit: "px", ...this.slot.fx_glass }]);
    const o = oi(this.slot), p = e.map((i) => i.target).filter((i) => i !== "none"), t = (i) => {
      for (const r of Object.values(o)) {
        const u = r.items.find((n) => n.id === i);
        if (u) return u.label;
      }
      return "Unbekanntes Ziel";
    };
    return _`
      <details class="inner-section">
        <summary>✨ FX: Frosted & Liquid Glass <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${e.map((i, r) => {
      const u = !!this._expanded[i.id];
      let n = t(i.target);
      i.target === "none" && (n = "Nicht zugewiesen");
      const l = i.target && i.target.startsWith("elm_"), d = !l || i.manual_override;
      return _`
              <div class="pattern-card"
                @dragstart=${(a) => {
        a.stopPropagation(), a.dataTransfer.setData("application/json", JSON.stringify({ idx: r })), a.target.style.opacity = "0.4";
      }}
                @dragover=${(a) => {
        a.preventDefault(), a.stopPropagation(), a.currentTarget.style.borderTop = "3px dashed var(--primary-color)";
      }}
                @dragleave=${(a) => a.currentTarget.style.borderTop = ""}
                @drop=${(a) => {
        a.preventDefault(), a.stopPropagation(), a.currentTarget.style.borderTop = "";
        const c = JSON.parse(a.dataTransfer.getData("application/json") || "{}");
        if (c.idx !== void 0 && c.idx !== r) {
          const h = JSON.parse(JSON.stringify(e)), [v] = h.splice(c.idx, 1);
          h.splice(r, 0, v), this._commit(h);
        }
      }}
                @dragend=${(a) => a.target.style.opacity = "1"}
              >
                <div class="pattern-header" @click=${(a) => this._toggle(i.id, a)}>
                  <div>
                    <span class="drag-handle" @mousedown=${(a) => {
        a.stopPropagation(), a.target.closest(".pattern-card").setAttribute("draggable", "true");
      }} @mouseup=${(a) => {
        a.stopPropagation(), a.target.closest(".pattern-card").removeAttribute("draggable");
      }} @mouseleave=${(a) => a.target.closest(".pattern-card").removeAttribute("draggable")}>⋮⋮</span>
                    <span class="toggle-icon">${u ? "▼" : "▶"}</span>
                    <span style="color:${i.enabled ? "var(--primary-text-color)" : "var(--secondary-text-color)"}">Glass Effekt ${r + 1}</span>
                    <span style="font-size:10px;color:${i.target === "none" ? "#f44" : "var(--secondary-text-color)"};margin-left:8px;font-weight:normal;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom;">(${n})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!i.enabled} @click=${(a) => a.stopPropagation()} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].enabled = a.target.checked, this._commit(c);
      }}></ha-switch>
                    <button type="button" title="Klonen" @click=${(a) => {
        a.preventDefault(), a.stopPropagation();
        const c = JSON.parse(JSON.stringify(e)), h = JSON.parse(JSON.stringify(i));
        h.id = Date.now(), h.target = "none", c.splice(r + 1, 0, h), this._commit(c), this.requestUpdate();
      }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>
                    <button type="button" title="Löschen" @click=${(a) => {
        a.preventDefault(), a.stopPropagation();
        const c = [...e];
        c.splice(r, 1), this._commit(c);
      }} style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${u ? _`
                  <div class="pattern-content">
                    <div class="row">
                      <label>Ziel / Element</label>
                      <select style="width:60%" @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].target = a.target.value, this._commit(c);
      }}>
                        ${Object.values(o).map((a) => _`
                          <optgroup label="${a.label}">
                            ${a.items.map((c) => {
        const h = c.id !== "none" && c.id !== i.target && p.includes(c.id);
        return _`<option value=${c.id} ?selected=${i.target === c.id} ?disabled=${h}>${c.label} ${h ? "(Belegt)" : ""}</option>`;
      })}
                          </optgroup>
                        `)}
                      </select>
                    </div>

                    <div class="section-title">📏 Dimensionen & Form</div>
                    
                    ${l ? _`
                      <div class="auto-magic-box">
                        <div style="display:flex; gap:8px; align-items:center;">
                          <span style="font-size:16px">🪄</span>
                          <div><b>Auto-Maskierung (Container Queries aktiv):</b> Der Effekt passt sich unverzerrt an die kleinste Containerseite (cqmin) an.</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(3,169,244,0.3); padding-top:8px;">
                          <label>Manuelle Korrektur (Regler anzeigen)</label>
                          <ha-switch .checked=${i.manual_override ?? !1} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].manual_override = a.target.checked, this._commit(c);
      }}></ha-switch>
                        </div>
                      </div>
                    ` : ""}

                    <div class="row" style="background: rgba(244,67,54,0.1); padding: 8px; border-radius: 6px; border: 1px dashed rgba(244,67,54,0.3);">
                      <label style="color:#f44336; font-weight:bold;">🛠 Debug-Modus (Boxen anzeigen)<br><span style="font-size:10px; font-weight:normal;">Zeigt den Container grün und das Glas pink gestrichelt.</span></label>
                      <ha-switch style="--switch-checked-button-color: #f44336; --switch-checked-track-color: rgba(244,67,54,0.5);" .checked=${i.debug_mask ?? !1} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].debug_mask = a.target.checked, this._commit(c);
      }}></ha-switch>
                    </div>

                    ${d ? _`
                      <div class="row" style="background:rgba(3,169,244,0.1); padding:8px; border-radius:6px;">
                        <label style="color:var(--primary-color)">Form sperren (1:1 Aspect Ratio)<br><span style="font-size:10px;color:var(--secondary-text-color)">Erzwingt ein perfektes Quadrat/Kreis (cqmin).</span></label>
                        <ha-switch .checked=${i.force_square ?? !1} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].force_square = a.target.checked, this._commit(c);
      }}></ha-switch>
                      </div>
                      <div class="row">
                        <label>Randabstand (Inset / Padding)<br><span style="font-size:10px;color:var(--secondary-text-color)">Negativer Wert macht Glas größer</span></label>
                        <div style="display:flex; align-items:center; width:60%; gap:8px">
                          <input type="range" 
                            min=${(i.padding_unit || "px") === "%" ? "-100" : "-50"} 
                            max=${(i.padding_unit || "px") === "%" ? "100" : "50"} 
                            step="1" 
                            style="flex:1" 
                            .value=${i.padding ?? 0} 
                            @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].padding = parseInt(a.target.value), this._commit(c);
      }}>
                          <span style="font-size:11px; min-width:24px; text-align:right;">${i.padding ?? 0}</span>
                          <select style="width:60px" @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].padding_unit = a.target.value, this._commit(c);
      }}>
                            <option value="px" ?selected=${i.padding_unit === "px" || !i.padding_unit}>px</option>
                            <option value="%" ?selected=${i.padding_unit === "%"}>%</option>
                          </select>
                        </div>
                      </div>
                      <div class="row">
                        <label>Eckradius (Border-Radius)</label>
                        <div style="display:flex;width:60%;gap:4px">
                          <input type="number" style="flex:1" .value=${i.border_radius ?? ""} placeholder="Auto" @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].border_radius = a.target.value, this._commit(c);
      }}>
                          <select style="width:60px" @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].border_radius_unit = a.target.value, this._commit(c);
      }}>
                            <option value="px" ?selected=${i.border_radius_unit === "px"}>px</option>
                            <option value="%" ?selected=${i.border_radius_unit === "%"}>%</option>
                          </select>
                        </div>
                      </div>
                    ` : ""}

                    <div class="section-title">🍩 Ring- / Donut-Maske</div>
                    <div class="row">
                      <label style="color:var(--primary-color)">Zentrum ausblenden (Harte Kante)<br><span style="font-size:10px;color:var(--secondary-text-color)">Blur & Farbe wirken exakt nur auf dem Rand.</span></label>
                      <ha-switch .checked=${i.ring_effect ?? !1} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].ring_effect = a.target.checked, this._commit(c);
      }}></ha-switch>
                    </div>
                    ${i.ring_effect ? _`
                      <div class="row" style="padding-top: 4px;">
                        <label>Eigene Masken-Dicke verwenden<br><span style="font-size:10px;color:var(--secondary-text-color)">Aus = Dicke entspricht exakt der Fasen-Breite (${i.bevel_width ?? i.bevel_size ?? 2}px)</span></label>
                        <ha-switch .checked=${i.use_custom_ring_width ?? !1} @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].use_custom_ring_width = a.target.checked, this._commit(c);
      }}></ha-switch>
                      </div>
                      ${i.use_custom_ring_width ? _`
                        <div class="row"><label>Masken-Dicke (px)</label>
                          <input type="range" min="1" max="50" step="0.5" style="width:60%" .value=${i.ring_width ?? 5} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].ring_width = parseFloat(a.target.value), this._commit(c);
      }}>
                        </div>
                      ` : ""}
                      <div class="row"><label>Effekt-Stärke im Zentrum (%)<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Blur & Farbe komplett hohl</span></label>
                        <input type="range" min="0" max="100" style="width:60%" .value=${i.ring_center_opacity ?? 0} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].ring_center_opacity = parseInt(a.target.value), this._commit(c);
      }}>
                      </div>
                    ` : ""}
                    
                    <div class="section-title">🔍 Optik (Lupe & Wölbung)</div>
                    <div class="row"><label>Inhalt Vergrößern (Zoom)</label>
                      <input type="range" step="0.01" min="1" max="1.5" style="width:60%" .value=${i.zoom ?? 1} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].zoom = parseFloat(a.target.value), this._commit(c);
      }}>
                    </div>
                    <div class="row"><label>Konvexer 3D-Glanz (%)</label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${i.glare ?? 0} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].glare = parseInt(a.target.value), this._commit(c);
      }}>
                    </div>

                    <div class="section-title">💧 Glas & Blur</div>
                    <div class="row"><label>Blur-Stärke (px)</label>
                      <input type="range" step="0.01" min="0" max="2" style="width:60%" .value=${i.blur ?? 10} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].blur = parseFloat(a.target.value), this._commit(c);
      }}>
                    </div>
                    <div class="row"><label>Hintergrund-Deckkraft (%)</label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${i.opacity ?? 10} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].opacity = parseInt(a.target.value), this._commit(c);
      }}>
                    </div>
                    <div class="row"><label>Farbe (Hex-Picker)</label>
                      <input type="color" .value=${i.bg_rgb || "#ffffff"} @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].bg_rgb = a.target.value, this._commit(c);
      }}>
                    </div>

                    <div class="section-title">🌒 Lichtbrechung & Fase (Physik)</div>
                    <div class="row"><label>Glas-Stil</label>
                      <select style="width:60%" @change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].shadow_style = a.target.value, this._commit(c);
      }}>
                        <option value="none" ?selected=${i.shadow_style === "none"}>Flach (Keine Kanten)</option>
                        <option value="frosted" ?selected=${i.shadow_style === "frosted"}>Frosted (Weiche Kanten)</option>
                        <option value="liquid" ?selected=${i.shadow_style === "liquid"}>Liquid (Physikalische Brechung)</option>
                      </select>
                    </div>

                    ${i.shadow_style !== "none" ? _`
                      <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px dashed var(--divider-color, #444); display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 8px 0;">
                        <label style="align-self: flex-start; margin-bottom: -4px;">Lichtquelle (Sonne)</label>
                        <sc-shadow-pad
                          .angle=${i.shadow_angle ?? 90}
                          .distance=${i.shadow_distance ?? 1}
                          .maxDistance=${5}
                          @pad-change=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].shadow_angle = a.detail.angle, c[r].shadow_distance = a.detail.distance, this._commit(c);
      }}
                        ></sc-shadow-pad>
                        <div style="display: flex; gap: 16px; font-size: 11px; color: var(--secondary-text-color);">
                          <span>Winkel: <b style="color:var(--primary-color)">${i.shadow_angle ?? 90}°</b></span>
                          <span>Distanz-Offset: <b style="color:var(--primary-color)">${i.shadow_distance ?? 1}x</b></span>
                        </div>
                      </div>

                      <div class="row"><label>Fasen-Breite (px)<br><span style="font-size:10px;color:var(--secondary-text-color)">Ausdehnung der Kante nach innen</span></label>
                        <input type="range" step="0.1" min="0" max="30" style="width:60%" .value=${i.bevel_width ?? i.bevel_size ?? 2}
                          @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].bevel_width = parseFloat(a.target.value), this._commit(c);
      }}>
                      </div>
                      
                      <div class="row"><label>Glas-Dicke (Tiefe)<br><span style="font-size:10px;color:var(--secondary-text-color)">Kontrolliert die Steilheit & Refraktion</span></label>
                        <input type="range" step="0.5" min="0" max="20" style="width:60%" .value=${i.glass_thickness ?? 5}
                          @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].glass_thickness = parseFloat(a.target.value), this._commit(c);
      }}>
                      </div>

                      <div class="row"><label>Basis-Helligkeit (Licht)</label>
                        <input type="range" step="0.001" min="0" max="1" style="width:60%" .value=${i.light_brightness ?? 0.4}
                          @input=${(a) => {
        const c = JSON.parse(JSON.stringify(e));
        c[r].light_brightness = parseFloat(a.target.value), this._commit(c);
      }}>
                      </div>
                    ` : ""}
                  </div>
                ` : ""}
              </div>
            `;
    })}
          
          <button type="button" class="add-btn" @click=${(i) => {
      i.preventDefault(), i.stopPropagation();
      const r = JSON.parse(JSON.stringify(e)), u = Date.now();
      r.push({
        id: u,
        enabled: !0,
        target: "none",
        blur: 10,
        opacity: 10,
        padding: 0,
        padding_unit: "px",
        border_radius: "",
        border_radius_unit: "px",
        force_square: !1,
        zoom: 1,
        glare: 0,
        bg_rgb: "#ffffff",
        shadow_style: "liquid",
        light_brightness: 0.4,
        bevel_width: 2,
        glass_thickness: 5,
        shadow_angle: 90,
        shadow_distance: 1,
        manual_override: !1,
        ring_effect: !1,
        use_custom_ring_width: !1,
        ring_width: 5,
        ring_center_opacity: 0,
        debug_mask: !1
      }), this._commit(r), this._expanded = { ...this._expanded, [u]: !0 }, this.requestUpdate();
    }}>＋ Neuen Glas-Effekt hinzufügen</button>
        </div>
      </details>
    `;
  }
}
customElements.get("sc-fx-glass-editor") || customElements.define("sc-fx-glass-editor", xt);
xt._expandedCache = {};
window.SupercardModules.fx_glass = /* @__PURE__ */ (() => {
  function s(t) {
    const i = t.replace("elm_", "");
    return i === "icon" ? "ha-state-icon, .sc-primary-icon" : i === "name" ? ".sc-lbl-n" : i === "state" ? ".sc-lbl-v" : i.startsWith("gauge_") ? `sc-gauge[data-idx="${i.split("_")[1]}"]` : i.startsWith("progressbar_") ? `sc-progressbar[data-idx="${i.split("_")[1]}"]` : i.startsWith("label_") ? `sc-label-${i.split("_")[1]}` : `[slot="${i}"]`;
  }
  function e({ hass: t, config: i }) {
    let r = Array.isArray(i.fx_glass_patterns) ? i.fx_glass_patterns : [];
    if (r.length === 0 && i.fx_glass && i.fx_glass.enabled && (r = [{ target: "main", padding_unit: "px", ...i.fx_glass }]), r.length === 0) return {};
    let u = "";
    return r.forEach((n) => {
      var be, De;
      if (!n.enabled || n.target === "none") return;
      const l = n.target === "main", d = n.target.startsWith("elm_");
      let a = "";
      l ? a = "ha-card" : d ? a = s(n.target) : a = `sc-layout-renderer::part(cell-${n.target.replace("r", "").replace("c", "-")})`;
      const c = l ? 300 : 1400;
      let h = 0, v = "px", b = "", g = "px";
      (!d || n.manual_override) && (h = n.padding ?? 0, v = n.padding_unit ?? "px", b = n.border_radius ?? "", g = n.border_radius_unit ?? "px");
      let m = "inherit", f = n.force_square ?? !1, y = 100, $ = !1, w = 60;
      if (l) {
        let B = ((be = i.supercard) == null ? void 0 : be.border_radius) ?? i.border_radius;
        m = B !== void 0 && B !== "" ? `${B}px` : "var(--sc-border-radius, var(--ha-card-border-radius, 12px))";
      } else if (d && !n.manual_override)
        if (n.target.startsWith("elm_progressbar_")) {
          const B = parseInt(n.target.split("_")[2]), K = (De = i.progressbars) == null ? void 0 : De[B];
          if (K && K.border_radius !== void 0) {
            let ve = String(K.border_radius).trim();
            m = /^\d+(\.\d+)?$/.test(ve) ? `${ve}px` : ve;
          } else m = "var(--pb-radius, 4px)";
          f = !1;
        } else if (n.target.startsWith("elm_gauge_")) {
          m = "50%", f = !0;
          const B = parseInt(n.target.split("_")[2]), K = Array.isArray(i.gauges) && i.gauges[B] ? i.gauges[B] : i;
          $ = !!K.gauge_size_responsive, w = K.gauge_size_px ?? 60;
          let ve = K.gauge_scale ?? K.scale;
          if (ve !== void 0) {
            let Ce = parseFloat(String(ve).replace("%", "").trim());
            y = !isNaN(Ce) && Ce > 0 && Ce <= 5 ? Ce * 100 : Ce;
          } else
            y = 90;
        } else n.target === "elm_icon" && (m = "50%", f = !0, $ = !0);
      else d && n.manual_override && (f = n.force_square ?? !1, (n.target.startsWith("elm_gauge_") || n.target === "elm_icon") && (m = "50%"), $ = !0);
      const S = y / 100, x = (B, K = "px") => B === 0 ? "0px" : K === "%" ? `${B}%` : $ ? `calc(${B * S} * 1cqmin)` : `${B * S}px`, k = x(h, v), J = b !== "" ? x(parseFloat(b), g) : m;
      let A = "", _e = "";
      if (f) {
        let B = h !== 0 ? ` - (${x(h, v)} * 2)` : "";
        $ ? (A = `
            inset: 0 !important; 
            margin: auto !important; 
            width: calc((100cqmin * ${S})${B}) !important; 
            height: calc((100cqmin * ${S})${B}) !important;
          `, _e = "container-type: size !important;") : A = `
            inset: 0 !important; 
            margin: auto !important; 
            width: calc((${w}px * ${S})${B}) !important; 
            height: calc((${w}px * ${S})${B}) !important;
          `;
      } else
        A = `
          inset: ${k} !important; 
          margin: auto !important; 
          width: calc(100% - (${k} * 2)) !important; 
          height: calc(100% - (${k} * 2)) !important;
        `;
      let Pe = "";
      n.debug_mask && (_e += " outline: 2px solid #00ff00 !important; background-color: rgba(0, 255, 0, 0.15) !important;", Pe = "outline: 2px dashed #ff00ff !important; outline-offset: 2px; background-color: rgba(255, 0, 255, 0.25) !important;");
      const We = n.blur !== void 0 ? parseFloat(n.blur) : 10, He = (n.opacity ?? 10) / 100, rt = n.zoom !== void 0 ? parseFloat(n.zoom) : 1, Ve = (n.glare ?? 0) / 100;
      let Me = "255, 255, 255";
      if (n.bg_rgb)
        if (n.bg_rgb.startsWith("#")) {
          const B = n.bg_rgb.replace("#", "");
          Me = `${parseInt(B.substring(0, 2), 16)}, ${parseInt(B.substring(2, 4), 16)}, ${parseInt(B.substring(4, 6), 16)}`;
        } else Me = n.bg_rgb;
      let Qe = `rgba(${Me}, ${He})`;
      Ve > 0 && (Qe = `radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, ${Ve}) 0%, rgba(${Me}, ${He}) 60%)`);
      const L = n.shadow_style || "frosted", z = n.bevel_width ?? n.bevel_size ?? 2, Ee = n.glass_thickness ?? 5, X = n.light_brightness ?? 0.4, G = n.shadow_angle ?? 90, xe = n.shadow_distance ?? 1, Z = G * Math.PI / 180, C = xe * Math.cos(Z), se = xe * Math.sin(Z), Re = -C, re = -se, T = Ee / (z > 0 ? z : 1), pe = Math.min(1, X * (1 + T * 0.4)), Ne = Math.min(1, X * 0.5 * (1 + T * 0.4));
      let W = "none";
      if (L === "frosted") {
        const B = z - 0.5 < 0 ? 0 : z - 0.5;
        W = `
          inset ${x(Re * B)} ${x(re * B)} ${x(z)} 0px rgba(255, 255, 255, ${pe}), 
          inset ${x(C * z)} ${x(se * z)} ${x(z + 1)} 0px rgba(0, 0, 0, ${Ne * 0.5}),
          inset 0 0 0 ${x(z)} rgba(255, 255, 255, 0.05)
        `;
      } else L === "liquid" && (W = `
          inset ${x(Re * z)} ${x(re * z)} ${x(z)} rgba(255,255,255,${pe * 0.6}),
          inset ${x(C * z)} ${x(se * z)} ${x(z)} rgba(0,0,0,${Ne * 0.4}),
          inset ${x(Re * (z + 1))} ${x(re * (z + 1))} ${x(1)} rgba(255,255,255,${pe}),
          inset ${x(C * (z + 1))} ${x(se * (z + 1))} ${x(1)} rgba(0,0,0,${Ne})
        `);
      const fe = "border: none !important;";
      let we = "";
      if (n.ring_effect) {
        const K = n.use_custom_ring_width ?? !1 ? n.ring_width ?? 5 : z > 0 ? z : 2, ve = (n.ring_center_opacity ?? 0) / 100, Ce = ve === 0 ? "transparent" : `rgba(0,0,0,${ve})`;
        we = `
          -webkit-mask-image: radial-gradient(circle closest-side, ${Ce} calc(100% - ${x(K + 1)}), black calc(100% - ${x(K)})) !important;
          mask-image: radial-gradient(circle closest-side, ${Ce} calc(100% - ${x(K + 1)}), black calc(100% - ${x(K)})) !important;
        `;
      }
      const Ae = !d || !n.target.startsWith("elm_gauge_") && !n.target.startsWith("elm_progressbar_") && n.target !== "elm_icon";
      let et = "";
      l ? et = `
          ha-card .supercard-container {
            position: relative !important;
            z-index: 500 !important;
          }
        ` : et = `
          ${a} > * {
            position: relative;
            z-index: 700 !important;
            -webkit-backface-visibility: hidden !important;
            backface-visibility: hidden !important;
            ${Ae ? `
              transform: scale(${rt}) translateZ(0) !important;
              transform-origin: center center !important;
              transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
            ` : `
              transform: translateZ(0) !important;
            `}
          }
        `;
      const Ze = `sc-glass-awake-${n.id}-${Math.random().toString(36).substring(2, 7)}`;
      u += `
        @keyframes ${Ze} {
          0% { opacity: 0.99; }
          100% { opacity: 1; }
        }

        ${l ? "ha-card { position: relative !important; background: transparent !important; border: none !important; box-shadow: none !important; isolation: isolate !important; }" : ""}

        ${l ? "" : `
        ${a} {
          position: relative ${d ? "!important" : ""};
          isolation: isolate !important; 
          ${_e}
        }
        `}

        ${et}

        ${a}::after {
          content: '' !important;
          position: absolute !important;
          ${A}
          box-sizing: border-box !important;
          z-index: ${c} !important;
          pointer-events: none !important;
          border-radius: ${J} !important;
          background: ${Qe} !important;
          box-shadow: ${W} !important;
          ${fe}
          ${Pe}
          
          animation: ${Ze} 0.5s infinite alternate !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          
          -webkit-backdrop-filter: blur(${x(We)}) !important;
          backdrop-filter: blur(${x(We)}) !important;
          ${we}
        }
      `;
    }), { htmlOverlay: `<style>${u}</style>` };
  }
  function o(t, i, r) {
    return _`<sc-fx-glass-editor .commitFn=${t} .hass=${i} .slot=${r}></sc-fx-glass-editor>`;
  }
  function p() {
    return [];
  }
  return { update: e, renderCustomBlock: o, editorFields: p };
})();
function ri(s) {
  const e = { empty: "Leer", icon: "Icon", name: "Entitäts-Name", state: "Zustand (Wert)" }, o = Array.isArray(s.gauges) ? s.gauges.length : s.gauge_active ? 1 : 0;
  for (let p = 0; p < o; p++) e[`gauge_${p}`] = `Gauge ${p + 1}`;
  return Array.isArray(s.labels_list) && s.labels_list.forEach((p, t) => {
    e[`label_${t}`] = `Label: ${p.label_text || p.entity || t + 1}`;
  }), e;
}
function ni(s) {
  const e = [
    { id: "none", label: "— Bitte Ziel wählen —", group: "Allgemein" },
    { id: "main", label: "Hauptkarte (Gesamter Hintergrund)", group: "Allgemein" }
  ];
  e.push({ id: "icon", label: "Icon (Haupt-Entität)", group: "Elemente (Basis)" }), e.push({ id: "name", label: "Name (Haupt-Entität)", group: "Elemente (Basis)" }), e.push({ id: "state", label: "Zustand / Wert", group: "Elemente (Basis)" });
  const o = Array.isArray(s.gauges) ? s.gauges.length : s.gauge_active ? 1 : 0;
  for (let t = 0; t < o; t++) e.push({ id: `gauge_${t}`, label: `Gauge ${t + 1}`, group: "Elemente (Gauges)" });
  const p = Array.isArray(s.progressbars) ? s.progressbars.length : 0;
  for (let t = 0; t < p; t++) e.push({ id: `progressbar_${t}`, label: `Progressbar ${t + 1}`, group: "Elemente (Progressbars)" });
  if (Array.isArray(s.labels_list) && s.labels_list.forEach((t, i) => {
    e.push({ id: `label_${i}`, label: `Label ${i + 1}: ${t.label_text || t.entity || ""}`, group: "Elemente (Labels)" });
  }), Array.isArray(s.layout_rows)) {
    const t = ri(s);
    s.layout_rows.forEach((i, r) => {
      i.cells.forEach((u, n) => {
        let l = t[u.content] || "Leer";
        u.content !== "empty" && (l = l.split(":")[0]), e.push({ id: `r${r}c${n}`, label: `Z${r + 1}C${n + 1} (${l})`, group: "Layout Raster (Zellen)" });
      });
    });
  }
  return e;
}
class wt extends Be {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      commitFn: { type: Function },
      _expanded: { type: Object, state: !0 }
    };
  }
  constructor() {
    super(), this._expanded = wt._expandedCache ?? {};
  }
  static get styles() {
    return Xe`
      .inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); }
      .pattern-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 10px; position: relative; transition: opacity 0.2s; }
      .pattern-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; user-select: none; }
      .pattern-content { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; margin-top: 8px; border-top: 1px dashed var(--divider-color, #333); }
      .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; gap: 8px; }
      .col { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
      select, input[type="text"], input[type="number"], input[type="range"] { background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 4px; padding: 6px; }
      .add-btn { background: transparent; border: 1px dashed var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; text-align: center; }
      ha-switch { --switch-checked-button-color: var(--primary-color); scale: 0.8; }
      .toggle-icon { font-size: 10px; margin-right: 8px; display: inline-block; width: 12px; text-align: center; }
      .drag-handle { cursor: grab; padding-right: 8px; color: var(--secondary-text-color); }
      .section-title { font-size: 11px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; margin-bottom: -4px; margin-top: 8px; border-bottom: 1px solid var(--divider-color,#333); padding-bottom: 4px; }
      option:disabled { color: rgba(255,255,255,0.3); font-style: italic; }
      optgroup { color: var(--primary-color); font-weight: bold; font-style: normal; }
      optgroup option { color: var(--primary-text-color); font-weight: normal; }
      .action-box { background: rgba(0,0,0,0.15); border: 1px dashed var(--divider-color); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
      
      .action-icon-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 4px; }
      .action-icon-btn {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        background: rgba(255,255,255,0.03); border: 1px solid var(--divider-color, #444); border-radius: 6px;
        cursor: pointer; padding: 8px 4px; color: var(--secondary-text-color); transition: all 0.2s;
      }
      .action-icon-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--primary-color); color: var(--primary-text-color); }
      .action-icon-btn.active { background: rgba(3,169,244,0.1); border-color: var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); }
      .action-icon-btn ha-icon { --mdc-icon-size: 22px; }
      .action-icon-label { font-size: 10px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      ha-entity-picker { width: 100%; }
    `;
  }
  _commit(e) {
    this.commitFn && this.commitFn("__merge__", { interactions: e });
  }
  _toggle(e, o) {
    o && o.stopPropagation(), this._expanded = { ...this._expanded, [e]: !this._expanded[e] }, wt._expandedCache = this._expanded;
  }
  _renderActionBlock(e, o, p, t, i) {
    const r = e[`${t}_action`] || "none", u = (n) => {
      const l = JSON.parse(JSON.stringify(p));
      l[o][`${t}_action`] = n, this._commit(l);
    };
    return _`
      <div class="action-box">
        <label style="font-weight:bold; color:var(--primary-text-color);">${i}</label>
        
        <div class="action-icon-grid">
          <div class="action-icon-btn ${r === "none" ? "active" : ""}" title="Keine Aktion" @click=${() => u("none")}>
            <ha-icon icon="mdi:cancel"></ha-icon><span class="action-icon-label">Keine</span>
          </div>
          <div class="action-icon-btn ${r === "toggle" ? "active" : ""}" title="Umschalten (Toggle)" @click=${() => u("toggle")}>
            <ha-icon icon="mdi:toggle-switch-outline"></ha-icon><span class="action-icon-label">Toggle</span>
          </div>
          <div class="action-icon-btn ${r === "more-info" ? "active" : ""}" title="Mehr Infos (More-Info)" @click=${() => u("more-info")}>
            <ha-icon icon="mdi:information-outline"></ha-icon><span class="action-icon-label">Infos</span>
          </div>
          <div class="action-icon-btn ${r === "call-service" ? "active" : ""}" title="Dienst ausführen (Call Service)" @click=${() => u("call-service")}>
            <ha-icon icon="mdi:lightning-bolt"></ha-icon><span class="action-icon-label">Service</span>
          </div>
          <div class="action-icon-btn ${r === "navigate" ? "active" : ""}" title="Navigieren" @click=${() => u("navigate")}>
            <ha-icon icon="mdi:arrow-right-top"></ha-icon><span class="action-icon-label">Pfad</span>
          </div>
        </div>
        
        ${["toggle", "more-info", "call-service"].includes(r) ? _`
          <div class="col" style="margin-top:8px;">
            <label>Ziel-Entität (Entity ID)</label>
            <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${!0} .value=${e[`${t}_entity`] || ""}
              @value-changed=${(n) => {
      const l = JSON.parse(JSON.stringify(p));
      l[o][`${t}_entity`] = n.detail.value, this._commit(l);
    }}>
            </ha-entity-picker>
          </div>
        ` : ""}

        ${r === "call-service" ? _`
          <div class="col" style="margin-top:8px;">
            <label>Dienst (Service)</label>
            <input type="text" placeholder="light.turn_on" .value=${e[`${t}_service`] || ""}
              @input=${(n) => {
      const l = JSON.parse(JSON.stringify(p));
      l[o][`${t}_service`] = n.target.value, this._commit(l);
    }}>
          </div>
          <div class="col" style="margin-top:8px;">
            <label>Daten (JSON Optional)</label>
            <input type="text" placeholder='{"brightness": 255}' .value=${e[`${t}_data`] || ""}
              @input=${(n) => {
      const l = JSON.parse(JSON.stringify(p));
      l[o][`${t}_data`] = n.target.value, this._commit(l);
    }}>
          </div>
        ` : ""}

        ${r === "navigate" ? _`
          <div class="col" style="margin-top:8px;">
            <label>Pfad</label>
            <input type="text" placeholder="/lovelace/dashboard" .value=${e[`${t}_nav`] || ""}
              @input=${(n) => {
      const l = JSON.parse(JSON.stringify(p));
      l[o][`${t}_nav`] = n.target.value, this._commit(l);
    }}>
          </div>
        ` : ""}
      </div>
    `;
  }
  render() {
    if (!this.slot) return _``;
    let e = Array.isArray(this.slot.interactions) ? this.slot.interactions : [];
    const o = ni(this.slot), p = e.map((t) => t.target).filter((t) => t !== "none");
    return _`
      <details class="inner-section">
        <summary>👆 Interaktionen & Aktionen <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${e.map((t, i) => {
      var n;
      const r = !!this._expanded[t.id];
      let u = ((n = o.find((l) => l.id === t.target)) == null ? void 0 : n.label) || "Unbekanntes Ziel";
      return t.target === "none" && (u = "Nicht zugewiesen"), _`
              <div class="pattern-card"
                @dragstart=${(l) => {
        l.stopPropagation(), l.dataTransfer.setData("application/json", JSON.stringify({ idx: i })), l.target.style.opacity = "0.4";
      }}
                @dragover=${(l) => {
        l.preventDefault(), l.stopPropagation(), l.currentTarget.style.borderTop = "3px dashed var(--primary-color)";
      }}
                @dragleave=${(l) => l.currentTarget.style.borderTop = ""}
                @drop=${(l) => {
        l.preventDefault(), l.stopPropagation(), l.currentTarget.style.borderTop = "";
        const d = JSON.parse(l.dataTransfer.getData("application/json") || "{}");
        if (d.idx !== void 0 && d.idx !== i) {
          const a = JSON.parse(JSON.stringify(e)), [c] = a.splice(d.idx, 1);
          a.splice(i, 0, c), this._commit(a);
        }
      }}
                @dragend=${(l) => l.target.style.opacity = "1"}
              >
                <div class="pattern-header" @click=${(l) => this._toggle(t.id, l)}>
                  <div>
                    <span class="drag-handle"
                      @mousedown=${(l) => {
        l.stopPropagation(), l.target.closest(".pattern-card").setAttribute("draggable", "true");
      }}
                      @mouseup=${(l) => {
        l.stopPropagation(), l.target.closest(".pattern-card").removeAttribute("draggable");
      }}
                      @mouseleave=${(l) => l.target.closest(".pattern-card").removeAttribute("draggable")}
                    >⋮⋮</span>
                    <span class="toggle-icon">${r ? "▼" : "▶"}</span>
                    <span style="color:${t.enabled ? "var(--primary-text-color)" : "var(--secondary-text-color)"}">
                      Interaktion ${i + 1}
                    </span>
                    <span style="font-size:10px;color:${t.target === "none" ? "#f44" : "var(--secondary-text-color)"};margin-left:8px;font-weight:normal">(${u})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!t.enabled}
                      @click=${(l) => l.stopPropagation()}
                      @change=${(l) => {
        const d = JSON.parse(JSON.stringify(e));
        d[i].enabled = l.target.checked, this._commit(d);
      }}>
                    </ha-switch>
                    
                    <button type="button" title="Klonen" @click=${(l) => {
        l.preventDefault(), l.stopPropagation();
        const d = JSON.parse(JSON.stringify(e)), a = JSON.parse(JSON.stringify(t));
        a.id = Date.now(), a.target = "none", d.splice(i + 1, 0, a), this._commit(d), this._expanded = { ...this._expanded, [a.id]: !0 };
      }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>

                    <button type="button" title="Löschen" @click=${(l) => {
        l.preventDefault(), l.stopPropagation();
        const d = [...e];
        d.splice(i, 1), this._commit(d);
      }} style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${r ? _`
                  <div class="pattern-content">
                    <div class="row">
                      <label>Ziel-Element</label>
                      <select style="width:60%" @change=${(l) => {
        const d = JSON.parse(JSON.stringify(e));
        d[i].target = l.target.value, this._commit(d);
      }}>
                        ${(() => {
        const l = {};
        return o.forEach((d) => {
          const a = d.group || "Allgemein";
          l[a] || (l[a] = []), l[a].push(d);
        }), Object.entries(l).map(([d, a]) => _`
                            <optgroup label="${d}">
                              ${a.map((c) => {
          const h = c.id !== "none" && c.id !== t.target && p.includes(c.id);
          return _`<option value=${c.id} ?selected=${t.target === c.id} ?disabled=${h}>
                                  ${c.label} ${h ? "(Belegt)" : ""}
                                </option>`;
        })}
                            </optgroup>
                          `);
      })()}
                      </select>
                    </div>

                    <div class="section-title">⚡ Home Assistant Aktionen</div>
                    ${this._renderActionBlock(t, i, e, "tap", "Einfacher Klick (Tap)")}
                    ${this._renderActionBlock(t, i, e, "double_tap", "Doppelklick (Double Tap)")}
                    ${this._renderActionBlock(t, i, e, "hold", "Gedrückt halten (Hold)")}

                    <div class="section-title">🎬 Optische Animationen (GPU)</div>
                    <div class="row">
                      <label>Klick-Tiefe (Scale)<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Aus, 100 = Max. Einpresstiefe</span></label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${t.scale_depth ?? 50}
                        @input=${(l) => {
        const d = JSON.parse(JSON.stringify(e));
        d[i].scale_depth = parseInt(l.target.value), this._commit(d);
      }}>
                    </div>
                    <div class="row">
                      <label>Dauerhafte Rotation<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Aus, 100 = Sehr schnell</span></label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${t.rotate_speed ?? 0}
                        @input=${(l) => {
        const d = JSON.parse(JSON.stringify(e));
        d[i].rotate_speed = parseInt(l.target.value), this._commit(d);
      }}>
                    </div>
                  </div>
                ` : ""}
              </div>
            `;
    })}
          
          <button type="button" class="add-btn" @click=${(t) => {
      t.preventDefault(), t.stopPropagation();
      const i = JSON.parse(JSON.stringify(e)), r = Date.now();
      i.push({
        id: r,
        enabled: !0,
        target: "none",
        tap_action: "none",
        double_tap_action: "none",
        hold_action: "none",
        scale_depth: 50,
        rotate_speed: 0
      }), this._commit(i), this._expanded = { ...this._expanded, [r]: !0 };
    }}>＋ Neue Interaktion hinzufügen</button>
        </div>
      </details>
    `;
  }
}
customElements.get("sc-interaction-editor") || customElements.define("sc-interaction-editor", wt);
wt._expandedCache = {};
window.SupercardModules.interaction = /* @__PURE__ */ (() => {
  function s(u) {
    return u === "main" ? "ha-card .supercard-container" : u.match(/^r\d+c\d+$/) ? `sc-layout-renderer::part(cell-${u.replace("r", "").replace("c", "-")})` : u === "icon" ? "#icon" : u === "name" ? "#header" : u === "state" ? "#state" : u.startsWith("gauge_") ? `sc-gauge[data-idx="${u.split("_")[1]}"]` : u.startsWith("progressbar_") ? `sc-progressbar[data-idx="${u.split("_")[1]}"]` : u.startsWith("label_") ? `.sc-item-slot[data-item-id="${u}"], #${u}` : "";
  }
  function e({ config: u }) {
    let n = Array.isArray(u.interactions) ? u.interactions : [];
    if (n.length === 0) return {};
    let l = "";
    return n.forEach((d) => {
      if (!d.enabled || d.target === "none") return;
      const a = s(d.target);
      if (!a) return;
      const c = d.target === "main", h = d.scale_depth !== void 0 ? d.scale_depth : 50, v = d.rotate_speed || 0;
      if (l += `${a} { pointer-events: auto !important; cursor: pointer !important; -webkit-tap-highlight-color: transparent !important; }
`, h > 0) {
        const b = 1 - h * 15e-4;
        c ? l += `
            ha-card ha-ripple { display: none !important; }
            ${a} { transition: scale 0.2s cubic-bezier(0.2, 0, 0, 1) !important; }
            ${a}:active:not(:has(select:active)):not(:has(ha-select:active)):not(:has([id^="sc-cell-"]:active)) { scale: ${b} !important; }
          ` : l += `
            ${a} { transition: scale 0.15s cubic-bezier(0.2, 0, 0, 1) !important; }
            ${a}:active { scale: ${b} !important; }
          `;
      }
      if (v > 0) {
        const b = 200 / v;
        l += `
          @keyframes sc-rot-${d.id} { to { rotate: 360deg; } }
          ${a} { animation: sc-rot-${d.id} ${b}s linear infinite !important; }
        `;
      }
    }), { htmlOverlay: `<style>${l}</style>` };
  }
  function o(u, n, l, d, a, c) {
    const h = n[`${u}_action`] || "none";
    let v = n[`${u}_entity`];
    if (h !== "none") {
      if (!v && (d != null && d.entity) && (v = d.entity), h === "toggle" && v && l) {
        const b = v.split(".")[0];
        ["light", "switch", "input_boolean", "fan", "cover", "lock"].includes(b) ? l.callService(b, "toggle", { entity_id: v }) : l.callService("homeassistant", "toggle", { entity_id: v });
      } else if (h === "more-info" && v) {
        const b = new CustomEvent("hass-more-info", { composed: !0, bubbles: !0, detail: { entityId: v } });
        (c || a).dispatchEvent(b);
      } else if (h === "navigate") {
        const b = n[`${u}_nav`];
        b && (history.pushState(null, "", b), window.dispatchEvent(new CustomEvent("location-changed")));
      } else if (h === "call-service" && l) {
        const b = n[`${u}_service`];
        if (b && b.includes(".")) {
          const [g, m] = b.split(".");
          let f = {};
          try {
            f = JSON.parse(n[`${u}_data`] || "{}");
          } catch {
          }
          v && !f.entity_id && (f.entity_id = v), l.callService(g, m, f);
        }
      }
    }
  }
  function p(u, n) {
    var a;
    if (!Array.isArray(n.interactions)) return;
    const l = u.querySelector("sc-layout-renderer"), d = u.host.hass || ((a = document.querySelector("home-assistant")) == null ? void 0 : a.hass);
    n.interactions.forEach((c) => {
      if (!c.enabled || c.target === "none") return;
      let h = null;
      if (c.target === "main")
        h = u.querySelector(".supercard-container") || u.host;
      else if (c.target.match(/^r\d+c\d+$/)) {
        if (l && l.shadowRoot) {
          const x = c.target.match(/r(\d+)c(\d+)/);
          h = l.shadowRoot.querySelector(`#sc-cell-${x[1]}-${x[2]}`);
        }
      } else c.target === "icon" ? h = u.querySelector("#icon") : c.target === "name" ? h = u.querySelector("#header") : c.target === "state" ? h = u.querySelector("#state") : c.target.startsWith("gauge_") ? h = u.querySelector(`sc-gauge[data-idx="${c.target.split("_")[1]}"]`) : c.target.startsWith("progressbar_") ? h = u.querySelector(`sc-progressbar[data-idx="${c.target.split("_")[1]}"]`) : c.target.startsWith("label_") && (l && l.shadowRoot && (h = l.shadowRoot.querySelector(`.sc-item-slot[data-item-id="${c.target}"]`), h || (h = l.shadowRoot.querySelector(`#${c.target}`))), h || (h = u.querySelector(`#${c.target}`)));
      if (!h) return;
      h.style.cursor = "pointer", h.style.pointerEvents = "auto", h.style.webkitTapHighlightColor = "transparent";
      const v = getComputedStyle(h);
      if ((v.display === "inline" || v.display === "contents") && (h.style.display = "inline-block"), h._sc_interactions_attached) return;
      h._sc_interactions_attached = !0;
      let b = null, g = null, m = !1;
      const f = (x) => {
        x.stopPropagation();
      }, y = () => {
        h.style.scale && (h.style.scale = "1");
      }, $ = (x) => {
        f(x), m = !1;
        const k = n.interactions.find((J) => J.id === c.id);
        k && k.scale_depth > 0 && k.target !== "main" && (h.style.transition = "scale 0.15s cubic-bezier(0.2, 0, 0, 1)", h.style.scale = 1 - k.scale_depth * 15e-4), g = setTimeout(() => {
          m = !0, k && o("hold", k, d, n, h, u.host);
        }, 500);
      }, w = (x) => {
        if (f(x), clearTimeout(g), y(), m) return;
        const k = n.interactions.find((A) => A.id === c.id);
        if (!k) return;
        k.double_tap_action && k.double_tap_action !== "none" ? b ? (clearTimeout(b), b = null, o("double_tap", k, d, n, h, u.host)) : b = setTimeout(() => {
          b = null, o("tap", k, d, n, h, u.host);
        }, 250) : o("tap", k, d, n, h, u.host);
      }, S = (x) => {
        clearTimeout(g), y();
      };
      h.addEventListener("pointerdown", $), h.addEventListener("pointerup", w), h.addEventListener("pointerleave", S), h.addEventListener("pointercancel", S), h.addEventListener("click", f);
    });
  }
  let t = null;
  function i(u, n, l) {
    return t || (t = document.createElement("sc-interaction-editor")), t.commitFn = u, t.slot = l, t.hass = n, t;
  }
  function r() {
    return [];
  }
  return { update: e, onAfterRender: p, renderCustomBlock: i, editorFields: r };
})();
class li extends Be {
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
    const e = this.getAttribute("data-uid");
    if (e && window[`_sc_debug_${e}`]) {
      const o = window[`_sc_debug_${e}`];
      this.config = o.config, this.stateObj = o.stateObj, this.stateVal = o.stateVal, delete window[`_sc_debug_${e}`];
    }
  }
  static get styles() {
    return Xe`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        z-index: 9999;
      }

      /* INSIDE (Overlay) - Float über der Karte, blockiert keine Klicks auf darunterliegende Buttons */
      :host([pos="inside"]) {
        position: absolute;
        inset: 0;
        pointer-events: none; /* Klicks auf leeren Raum gehen durch zur Karte! */
        display: flex;
        flex-direction: column;
        justify-content: flex-end; /* Klebt das Panel an den unteren Rand */
      }

      /* ABOVE / BELOW - Normaler Block im Layout-Fluss */
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
        
        /* WICHTIG FÜR SCROLLEN: Nur das Panel selbst fängt Klicks und Swipes ab */
        pointer-events: auto; 
        overflow-y: auto;
        max-height: 100%;
        
        border: 1px solid rgba(0, 255, 153, 0.3);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      }

      /* Ecken je nach Position anpassen */
      :host([pos="inside"]) .panel { border-radius: 8px 8px 0 0; border-bottom: none; }
      :host([pos="above"]) .panel  { border-radius: 8px 8px 0 0; border-bottom: none; }
      :host([pos="below"]) .panel  { border-radius: 0 0 8px 8px; border-top: none; }

      /* Schicke Custom-Scrollbars */
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
      
      /* Native Einklapp-Sektionen */
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
      
      /* Mehrspaltiges Layout */
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
    if (!this.config) return _``;
    const e = this.stateObj || {}, o = e.attributes || {}, p = [], t = {}, i = { ...this.config };
    for (const n in this.config)
      if (n.endsWith("_active") && this.config[n] === !0) {
        const l = n.replace("_active", "");
        p.push(l), t[l] = {};
      }
    for (const n in i)
      for (const l of p)
        if (n.startsWith(l + "_") || n === l + "s" || n === l) {
          t[l][n] = i[n], delete i[n];
          break;
        }
    const r = (n) => typeof n == "object" && n !== null ? JSON.stringify(n) : n === "" ? '""' : String(n), u = (n) => _`
      <div class="grid">
        ${Object.entries(n).map(([l, d]) => _`
          <div class="row">
            <span class="key">${l}</span>
            <span class="val">${r(d)}</span>
          </div>
        `)}
      </div>
    `;
    return _`
      <div class="panel">
        <div class="title">🛠 Supercard Debug Pipeline</div>
        
        <details open>
          <summary>Entity Core & State</summary>
          <div class="grid">
            <div class="row"><span class="key">entity_id</span><span class="val">${e.entity_id || "—"}</span></div>
            <div class="row"><span class="key">state (raw)</span><span class="val">${this.stateVal || "—"}</span></div>
            <div class="row"><span class="key">last_changed</span><span class="val">${e.last_changed || "—"}</span></div>
          </div>
        </details>

        <details>
          <summary>Attributes <span class="badge badge-inactive">${Object.keys(o).length}</span></summary>
          ${u(o)}
        </details>

        ${p.map((n) => _`
          <details>
            <summary>Modul: ${n.toUpperCase()} <span class="badge">Aktiv</span></summary>
            ${u(t[n])}
          </details>
        `)}

        <details>
          <summary>General Config / Inaktive Module <span class="badge badge-inactive">${Object.keys(i).length}</span></summary>
          ${u(i)}
        </details>
      </div>
    `;
  }
}
customElements.get("sc-debug-panel") || customElements.define("sc-debug-panel", li);
window.SupercardModules = window.SupercardModules || {};
window.SupercardModules.debug = /* @__PURE__ */ (() => {
  function s({ config: o, stateObj: p, stateVal: t }) {
    if (!(o != null && o.debug)) return {};
    const i = o.debug_position || "inside", r = _`<sc-debug-panel pos="${i}" .config=${o} .stateObj=${p} .stateVal=${t}></sc-debug-panel>`, u = Math.random().toString(36).substr(2, 9);
    window[`_sc_debug_${u}`] = { config: o, stateObj: p, stateVal: t };
    const n = `<sc-debug-panel pos="${i}" data-uid="${u}"></sc-debug-panel>`;
    return {
      litOverlay: i === "inside" ? r : "",
      debugAbove: i === "above" ? n : "",
      debugBelow: i === "below" ? n : ""
    };
  }
  function e() {
    return [
      { id: "debug", label: "Debug-Panel aktiv", type: "checkbox" },
      {
        id: "debug_position",
        label: "Position",
        type: "select",
        options: [
          { value: "inside", label: "Innerhalb (als Overlay scrollbar)" },
          { value: "below", label: "Unterhalb der Karte" },
          { value: "above", label: "Oberhalb der Karte" }
        ]
      }
    ];
  }
  return { update: s, editorFields: e, initCSS: () => "" };
})();
