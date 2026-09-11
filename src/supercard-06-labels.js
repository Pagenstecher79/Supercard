import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

const SC = window.SupercardUtils;

/**
 * What a label is before anyone configures it.
 *
 * The canvas adds labels too, and it has no business knowing what one
 * contains - that is this module's, so both add buttons ask here. The id is
 * the label's own, used for its name and for remembering which card is open;
 * it is not the `label_N` the canvas and every target list go by, which is
 * the index in `labels_list`.
 */
function newEntry() {
  return {
    id: Date.now(), label_text: '', enabled: true,
    use_entity: false, show_name: true, use_override: false,
    use_icon: false, icon: '', icon_position: 'before',
    icon_color: '', icon_size: '', icon_gap: null,
    decimals: null, text_shadow: false, use_indicator: false,
    indicator_shape: 'rect', indicator_visibility: 'always'
  };
}

class ScLabelsEditor extends LitElement {
  static get properties() {
    return {
      slot:       { type: Object },
      commitFn:   { type: Function },
      hass:       { type: Object },
      only:       { type: Number },
      _expanded:  { type: Object, state: true },
      _outerOpen: { state: true }
    };
  }

  constructor() {
    super();
    this._expanded = {};
  }

  static get styles() {
    return [SC.editorStyles, css`
      .col { gap: 4px; }
      .fx-slot { margin: 8px 0; padding: 8px; border-radius: 6px;
                 background: rgba(255,255,255,0.03); border: 1px solid var(--divider-color,#555); }
      .add-btn { padding: 8px; }
      .toggle-icon { margin-right: 6px; }
      .section-title { margin-top: 4px; margin-bottom: 0; }
      input[type="text"], input[type="number"], select { box-sizing: border-box; }
      .label-card { background: var(--secondary-background-color, #1e1e1e); border: 1px solid var(--divider-color, #444); border-radius: 8px; padding: 8px; margin-bottom: 8px; }
      .label-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; cursor: pointer; }
      .label-content { display: flex; flex-direction: column; gap: 10px; padding-top: 10px; margin-top: 8px; border-top: 1px solid var(--divider-color, #333); }
      .header-val { color: var(--primary-color, #03a9f4); font-family: monospace; font-weight: bold; margin-left: 8px; background: rgba(3,169,244,0.1); padding: 2px 4px; border-radius: 3px; }
      ha-icon-picker { width: 100%; }
      .color-row input[type="color"] { width: 36px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; }
      .icon-preview { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
      .clear-btn { background: rgba(255, 50, 50, 0.1); border: 1px solid rgba(255, 50, 50, 0.3); color: #f44; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex-shrink: 0; transition: all 0.2s; }
      .clear-btn:hover { background: rgba(255, 50, 50, 0.2); }
    `];
  }

  _commit(newList) {
    if (this.commitFn) this.commitFn('__merge__', { labels_list: newList });
  }

  /** Commit `list` with one field of entry `idx` changed. */
  _set(list, idx, key, value) { this._commit(SC.withPatch(list, idx, key, value)); }

  _getLabelTitle(item) {
    let name = item.label_text || '';
    let valStr = '';

    // --- ALIAS DETECTION IN HEADER ---
    const { entity: resolvedEntity, attribute: resolvedAttribute, match: aliasObj } =
      SC.resolveAlias(this.slot?.global_entities, item);
    const isAlias = !!aliasObj;

    if (item.use_entity && resolvedEntity && this.hass?.states[resolvedEntity]) {
      const s = this.hass.states[resolvedEntity];
      let val = resolvedAttribute ? s.attributes[resolvedAttribute] : s.state;

      if (item.decimals !== undefined && item.decimals !== null && val !== undefined && val !== null && val !== '') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) val = parsed.toFixed(item.decimals);
      }

      const uom = (!resolvedAttribute && s.attributes.unit_of_measurement) ? ` ${s.attributes.unit_of_measurement}` : '';
      valStr = `${val}${uom}`;

      if (!name) {
        if (isAlias) {
           name = `[${aliasObj.alias || 'Alias'}] ${s.attributes.friendly_name || resolvedEntity}`;
           if (resolvedAttribute) name += ` (${resolvedAttribute})`;
        } else if (!item.use_override) {
           name = s.attributes.friendly_name || resolvedEntity;
        }
      }
    } else if (!name) {
      if (isAlias) {
        name = `[${aliasObj.alias || 'Alias'}] ${resolvedEntity || 'Unnamed'}`;
      } else {
        name = `Label ${item.id.toString().slice(-3)}`;
      }
    }

    const iconPrev = item.use_icon && item.icon
      ? html`<ha-icon icon=${item.icon} style="--mdc-icon-size:14px;opacity:0.7;margin-right:4px;"></ha-icon>`
      : '';

    return html`
      <span class="toggle-icon">${this._expanded[item.id] ? '▼' : '▶'}</span>
      <div style="display:flex;align-items:center;">
        ${iconPrev}
        ${name}
        ${valStr ? html`<span class="header-val">${valStr}</span>` : ''}
      </div>
    `;
  }

  /**
   * One label, as the card its own section lists.
   */
  _renderLabelCard(item, idx, list) {
    return html`
            <div class="label-card">
              <div class="label-header" @click=${() => this._expanded = {...this._expanded, [item.id]: !this._expanded[item.id]}}>
                ${this._getLabelTitle(item)}
                <div style="display:flex;align-items:center;gap:8px">
                  <ha-switch .checked=${!!item.enabled}
                    @click=${e => e.stopPropagation()}
                    @change=${e => { this._set(list, idx, 'enabled', e.target.checked); }}>
                  </ha-switch>
                  <button @click=${e => { e.stopPropagation(); const n = [...list]; n.splice(idx, 1); this._commit(n); }}
                    style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                </div>
              </div>

              ${this._expanded[item.id] ? this._renderLabelContent(item, idx, list) : ''}
            </div>`;
  }

  /**
   * One label's fields, without the card around them.
   *
   * Its own section renders them under a header that names the label and
   * folds them away; the canvas editor renders them alone, under the element
   * the user has selected, which has already said which label this is.
   */
  _renderLabelContent(item, idx, list) {

            // --- Helper for the indicator state datalist ---
            const mainResolvedEntity = SC.resolveAlias(this.slot?.global_entities, item).entity;

            let availableStates = ['on', 'off', 'open', 'closed', 'true', 'false', 'home', 'not_home'];
            if (mainResolvedEntity && this.hass?.states[mainResolvedEntity]) {
              const sObj = this.hass.states[mainResolvedEntity];
              if (sObj.attributes && Array.isArray(sObj.attributes.options)) {
                availableStates = [...new Set([...availableStates, ...sObj.attributes.options])];
              }
            }
            const datalistId = `states_${item.id}`;

    return html`
                <div class="label-content">
                  <div class="fx-slot">
                    <sc-fx-glass-panel .hass=${this.hass} .slot=${this.slot} .commitFn=${this.commitFn}
                                       .target=${'elm_label_' + idx}></sc-fx-glass-panel>
                  </div>

                  <div class="col">
                    <label>Manual text / label</label>
                    <input type="text" .value=${item.label_text || ''} placeholder="e.g. Temperature"
                      @input=${e => { this._set(list, idx, 'label_text', e.target.value); }}>
                  </div>

                  <div class="row">
                    <label>Link entity</label>
                    <ha-switch .checked=${!!item.use_entity}
                      @change=${e => { this._set(list, idx, 'use_entity', e.target.checked); }}>
                    </ha-switch>
                  </div>

                  ${item.use_entity ? html`
                    <div class="col" style="margin-top: 4px; margin-bottom: 4px;">
                      <label>Data source</label>
                      <select style="width: 100%;" @change=${e => {
                          this._set(list, idx, 'global_id', e.target.value);
                        }}>
                        <option value="manual" ?selected=${item.global_id === 'manual' || !item.global_id}>Manual selection</option>
                        ${(this.slot.global_entities || []).map(ge => {
                          const stateObj = ge.entity ? this.hass.states[ge.entity] : null;
                          const name = ge.alias || stateObj?.attributes?.friendly_name || ge.entity || 'Unnamed';
                          let val = stateObj ? stateObj.state : '-';
                          if (stateObj && ge.attribute && stateObj.attributes[ge.attribute] !== undefined) {
                            val = stateObj.attributes[ge.attribute];
                          }
                          const uom = (!ge.attribute && stateObj?.attributes?.unit_of_measurement) ? ` ${stateObj.attributes.unit_of_measurement}` : '';
                          const attrLabel = ge.attribute ? ` (${ge.attribute})` : '';
                          const label = `[${ge.alias || 'Alias'}] ${name}${attrLabel}: ${val}${uom}`;

                          return html`<option value=${ge.id} ?selected=${item.global_id === ge.id}>${label}</option>`;
                        })}
                      </select>
                    </div>

                    ${(!item.global_id || item.global_id === 'manual') ? html`
                      <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
                        <div class="col" style="margin-bottom:8px;">
                          <label>Entity</label>
                          <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${false} .value=${item.entity || ''}
                            @value-changed=${e => { this._set(list, idx, 'entity', e.detail.value); }}>
                          </ha-entity-picker>
                        </div>
                        <div class="col">
                          <label>Attribute</label>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <ha-selector style="flex:1;" .hass=${this.hass} .selector=${{ attribute: { entity_id: item.entity || this.slot?.entity } }} .value=${item.attribute || ''}
                              @value-changed=${e => { this._set(list, idx, 'attribute', e.detail.value); }}>
                            </ha-selector>
                            <button title="Clear" class="clear-btn" @click=${() => { this._set(list, idx, 'attribute', ''); }}>✕</button>
                          </div>
                        </div>
                      </div>
                    ` : ''}

                    <div class="row">
                      <label>Decimal places</label>
                      <input type="number" min="0" max="5" style="width:60px" placeholder="Auto"
                        .value=${item.decimals ?? ''}
                        @input=${e => { this._set(list, idx, 'decimals', e.target.value === '' ? null : parseInt(e.target.value)); }}>
                    </div>

                    <div class="row">
                      <label>Show label / entity name</label>
                      <ha-switch .checked=${item.show_name !== false}
                        @change=${e => { this._set(list, idx, 'show_name', e.target.checked); }}>
                      </ha-switch>
                    </div>
                    ${item.show_name !== false ? html`
                      <div class="row">
                        <label>Use manual text as name (override)</label>
                        <ha-switch .checked=${!!item.use_override}
                          @change=${e => { this._set(list, idx, 'use_override', e.target.checked); }}>
                        </ha-switch>
                      </div>
                    ` : ''}
                  ` : ''}

                  <div class="row">
                    <label>Text shadow (glow/shadow)</label>
                    <ha-switch .checked=${!!item.text_shadow}
                      @change=${e => { this._set(list, idx, 'text_shadow', e.target.checked); }}>
                    </ha-switch>
                  </div>

                  <div class="section-title">Icon</div>
                  <div class="row">
                    <label>Show icon</label>
                    <ha-switch .checked=${!!item.use_icon}
                      @change=${e => { this._set(list, idx, 'use_icon', e.target.checked); }}>
                    </ha-switch>
                  </div>

                  ${item.use_icon ? html`
                    <div class="col">
                      <label>Select icon</label>
                      <ha-icon-picker .hass=${this.hass} .value=${item.icon || ''}
                        @value-changed=${e => { this._set(list, idx, 'icon', e.detail.value); }}>
                      </ha-icon-picker>
                      ${item.icon ? html`
                        <div class="icon-preview">
                          <ha-icon icon=${item.icon} style="--mdc-icon-size:20px;color:${item.icon_color || 'var(--primary-text-color)'}"></ha-icon>
                          <span>${item.icon}</span>
                        </div>` : ''}
                    </div>

                    <div class="row">
                      <label>Position</label>
                      <select style="width:55%" @change=${e => { this._set(list, idx, 'icon_position', e.target.value); }}>
                        <option value="before" ?selected=${(item.icon_position || 'before') === 'before'}>Before text</option>
                        <option value="after"  ?selected=${item.icon_position === 'after'}>After text</option>
                        <option value="only"   ?selected=${item.icon_position === 'only'}>Icon only (no text)</option>
                      </select>
                    </div>

                    <div class="col">
                      <label>Icon color</label>
                      <div class="color-row">
                        <input type="color" .value=${item.icon_color || '#ffffff'}
                          @input=${e => { this._set(list, idx, 'icon_color', e.target.value); }}>
                        <input type="text" .value=${item.icon_color || ''} placeholder="Empty = inherit"
                          @input=${e => { this._set(list, idx, 'icon_color', e.target.value); }}>
                      </div>
                    </div>

                    <div class="row">
                      <label>Icon size (CSS)</label>
                      <input type="text" style="width:80px" placeholder="20px, 50cqmin"
                        .value=${item.icon_size || ''}
                        @input=${e => { this._set(list, idx, 'icon_size', e.target.value); }}>
                    </div>

                    <div class="row">
                      <label>Gap to text (px)</label>
                      <input type="number" style="width:60px" placeholder="4"
                        .value=${item.icon_gap || ''}
                        @input=${e => { this._set(list, idx, 'icon_gap', parseInt(e.target.value) || null); }}>
                    </div>
                  ` : ''}

                  <div class="section-title">Indicator & Container</div>
                  <div class="row">
                    <label>Use as indicator (container)</label>
                    <ha-switch .checked=${!!item.use_indicator}
                      @change=${e => { this._set(list, idx, 'use_indicator', e.target.checked); }}>
                    </ha-switch>
                  </div>

                  ${item.use_indicator ? html`
                    <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-top: 4px;">

                      <div style="font-size: 11px; color: var(--secondary-text-color); margin-bottom: 12px; font-style: italic;">
                        💡 The indicator automatically uses the data source set above as its trigger.
                      </div>

                      <div class="row" style="margin-bottom: 8px;">
                        <div class="col" style="flex:1; margin-right:8px;">
                          <label>Background shape</label>
                          <select style="width: 100%; height:32px;" @change=${e => { this._set(list, idx, 'indicator_shape', e.target.value); }}>
                            <option value="rect" ?selected=${item.indicator_shape !== 'circle'}>Rectangle</option>
                            <option value="circle" ?selected=${item.indicator_shape === 'circle'}>Circle</option>
                          </select>
                        </div>
                        ${item.indicator_shape !== 'circle' ? html`
                          <div class="col" style="width:80px;">
                            <label>Radius</label>
                            <input type="text" style="height:32px;" .value=${item.indicator_radius || ''} placeholder="8px"
                              @input=${e => { this._set(list, idx, 'indicator_radius', e.target.value); }}>
                          </div>
                        ` : ''}
                      </div>

                      <div class="row" style="margin-bottom: 8px;">
                        <div class="col" style="flex:1;">
                          <label>Active state (trigger)</label>
                          <div style="display:flex; align-items:center; gap:8px;">
                            <input type="text" list=${datalistId} style="flex:1; height:32px;" .value=${item.indicator_state || ''} placeholder="e.g. on, open"
                              @input=${e => { this._set(list, idx, 'indicator_state', e.target.value); }}>
                            <datalist id=${datalistId}>
                              ${availableStates.map(st => html`<option value="${st}"></option>`)}
                            </datalist>
                            <button title="Clear" class="clear-btn" @click=${() => { this._set(list, idx, 'indicator_state', ''); }}>✕</button>
                          </div>
                        </div>
                      </div>

                      <div class="row">
                        <div class="col" style="flex:1;">
                          <label>Visibility</label>
                          <select style="width: 100%; height:32px;" @change=${e => { this._set(list, idx, 'indicator_visibility', e.target.value); }}>
                            <option value="always" ?selected=${!item.indicator_visibility || item.indicator_visibility === 'always'}>Always show</option>
                            <option value="active_only" ?selected=${item.indicator_visibility === 'active_only'}>Show only when state matches</option>
                            <option value="inactive_only" ?selected=${item.indicator_visibility === 'inactive_only'}>Hide when state matches</option>
                          </select>
                        </div>
                      </div>

                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                      <div style="background:rgba(255,255,255,0.02); padding:8px; border-radius:8px; border:1px solid var(--divider-color,#333);">
                        <div style="font-size: 11px; font-weight: bold; color: var(--secondary-text-color); margin-bottom: 8px; text-transform: uppercase;">Default (off)</div>

                        <div class="col" style="margin-bottom: 8px;">
                          <label>Icon</label>
                          <ha-icon-picker .hass=${this.hass} .value=${item.indicator_icon_default || ''}
                            @value-changed=${e => { this._set(list, idx, 'indicator_icon_default', e.detail.value); }}>
                          </ha-icon-picker>
                        </div>
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Background color</label>
                          <div class="color-row">
                            <input type="color" .value=${item.indicator_bg_default || '#333333'} @input=${e => { this._set(list, idx, 'indicator_bg_default', e.target.value); }}>
                            <input type="text" .value=${item.indicator_bg_default || ''} placeholder="transparent" @input=${e => { this._set(list, idx, 'indicator_bg_default', e.target.value); }}>
                          </div>
                        </div>
                        <div class="col">
                          <label>Icon/text color</label>
                          <div class="color-row">
                            <input type="color" .value=${item.indicator_color_default || '#ffffff'} @input=${e => { this._set(list, idx, 'indicator_color_default', e.target.value); }}>
                            <input type="text" .value=${item.indicator_color_default || ''} placeholder="inherit" @input=${e => { this._set(list, idx, 'indicator_color_default', e.target.value); }}>
                          </div>
                        </div>
                      </div>

                      <div style="background:rgba(3, 169, 244, 0.05); padding:8px; border-radius:8px; border:1px solid rgba(3, 169, 244, 0.2);">
                        <div style="font-size: 11px; font-weight: bold; color: var(--primary-color); margin-bottom: 8px; text-transform: uppercase;">Active (on)</div>

                        <div class="col" style="margin-bottom: 8px;">
                          <label>Icon</label>
                          <ha-icon-picker .hass=${this.hass} .value=${item.indicator_icon_active || ''}
                            @value-changed=${e => { this._set(list, idx, 'indicator_icon_active', e.detail.value); }}>
                          </ha-icon-picker>
                        </div>
                        <div class="col" style="margin-bottom: 8px;">
                          <label>Background color</label>
                          <div class="color-row">
                            <input type="color" .value=${item.indicator_bg_active || '#03a9f4'} @input=${e => { this._set(list, idx, 'indicator_bg_active', e.target.value); }}>
                            <input type="text" .value=${item.indicator_bg_active || ''} placeholder="transparent" @input=${e => { this._set(list, idx, 'indicator_bg_active', e.target.value); }}>
                          </div>
                        </div>
                        <div class="col">
                          <label>Icon/text color</label>
                          <div class="color-row">
                            <input type="color" .value=${item.indicator_color_active || '#ffffff'} @input=${e => { this._set(list, idx, 'indicator_color_active', e.target.value); }}>
                            <input type="text" .value=${item.indicator_color_active || ''} placeholder="inherit" @input=${e => { this._set(list, idx, 'indicator_color_active', e.target.value); }}>
                          </div>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                </div>
    `;
  }

  render() {
    if (!this.slot) return html``;
    const list = Array.isArray(this.slot.labels_list) ? this.slot.labels_list : [];

    // One entry alone, for the canvas editor: no section, no header, no add
    // button - the canvas has already chosen which label is being edited.
    if (typeof this.only === 'number') {
      return list[this.only] ? this._renderLabelContent(list[this.only], this.only, list) : html``;
    }

    return html`
      <details class="inner-section" ?open=${this._outerOpen} @toggle=${e => this._outerOpen = e.target.open}>
        <summary>── Labels &amp; Extra Texts <span style="font-size:10px;">▼</span></summary>
        <div class="inner-content">
          ${list.map((item, idx) => this._renderLabelCard(item, idx, list))}

          <button class="add-btn" @click=${() => {
            const entry = newEntry();
            this._commit([...list, entry]);
            this._expanded = { ...this._expanded, [entry.id]: true };
          }}>＋ Add label</button>
        </div>
      </details>
    `;
  }
}
customElements.define('sc-labels-editor', ScLabelsEditor);

// --- ENGINE ---
window.SupercardModules['labels'] = window.SupercardModules['labels'] || {};
Object.assign(window.SupercardModules['labels'], (() => {

  function update({ hass, config }) {
    const list = Array.isArray(config.labels_list) ? config.labels_list : [];

    const labelsResolved = list.map((item, idx) => {
      const _alias = SC.resolveAlias(config.global_entities, item);
      const resolvedEntity = _alias.entity || '';
      const resolvedAttribute = _alias.attribute || null;

      let parsedIconSize = item.icon_size || '20px';
      if (/^\d+$/.test(parsedIconSize)) parsedIconSize += 'px';

      const base = {
        id: `label_${idx}`,
        enabled: !!item.enabled,
        source: {
          entity: resolvedEntity,
          attribute: resolvedAttribute
        },
        text: {
          name: item.label_text || '',
          value: '',
          showName: item.show_name !== false,
          shadow: !!item.text_shadow
        },
        icon: {
          enabled: !!(item.use_icon && item.icon),
          name: item.icon || '',
          position: item.icon_position || 'before',
          color: item.icon_color || 'inherit',
          size: parsedIconSize,
          gap: item.icon_gap != null ? item.icon_gap : 4
        }
      };

      if (!item.enabled) return base;

      if (item.use_entity && resolvedEntity && hass?.states?.[resolvedEntity]) {
        const s = hass.states[resolvedEntity];
        let rawVal = resolvedAttribute ? s.attributes?.[resolvedAttribute] : s.state;

        if (item.decimals !== undefined && item.decimals !== null && rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const parsed = parseFloat(rawVal);
          if (!isNaN(parsed)) {
            rawVal = parsed.toFixed(item.decimals);
          }
        }

        const uom = (!resolvedAttribute && s.attributes?.unit_of_measurement)
          ? ` ${s.attributes.unit_of_measurement}`
          : '';

        base.text.value = `${rawVal ?? ''}${uom}`;

        if (!item.use_override) {
          base.text.name = s.attributes?.friendly_name || resolvedEntity;
        }
      }

      base.mode =
        (base.icon.enabled && base.icon.position === 'only') ? 'icon-only' :
        (base.text.showName && base.text.value) ? 'both' :
        (base.text.showName) ? 'name' :
        (base.text.value) ? 'value' :
        'name';

      // --- INDICATOR LOGIC ---
      if (item.use_indicator) {
        let indActive = false;

        if (resolvedEntity && hass?.states?.[resolvedEntity]) {
          const sObj = hass.states[resolvedEntity];
          const st = resolvedAttribute ? sObj.attributes[resolvedAttribute] : sObj.state;
          const targetStates = (item.indicator_state || '').split(',').map(s => s.trim());
          indActive = targetStates.includes(String(st));
        }

        // --- VISIBILITY ---
        const visMode = item.indicator_visibility || 'always';
        if (visMode === 'active_only' && !indActive) {
          base.enabled = false;
        } else if (visMode === 'inactive_only' && indActive) {
          base.enabled = false;
        }

        const actBg = item.indicator_bg_active || 'rgba(3, 169, 244, 0.2)';
        const defBg = item.indicator_bg_default || 'transparent';
        const actCol = item.indicator_color_active || 'var(--primary-color)';
        const defCol = item.indicator_color_default || 'inherit';

        const actIcon = item.indicator_icon_active || item.icon || '';
        const defIcon = item.indicator_icon_default || item.icon || '';

        const shape = item.indicator_shape || 'rect';
        const radius = shape === 'circle' ? '50%' : (item.indicator_radius || '8px');

        base.container = {
          isIndicator: true,
          active: indActive,
          shape: shape,
          radius: radius,
          bgColor: indActive ? actBg : defBg,
          color: indActive ? actCol : defCol
        };

        base.icon.enabled = true;
        base.icon.name = indActive ? actIcon : defIcon;
        base.icon.color = indActive ? actCol : defCol;
        base.text.color = indActive ? actCol : defCol;
      }

      return base;
    });

    return {
      moduleData: { labelsResolved },
      staticKey: `labels-v2-${JSON.stringify(config.labels_list)}`
    };
  }

  function renderCustomBlock(commitFn, hass, slot) {
    return html`<sc-labels-editor .slot=${slot} .hass=${hass} .commitFn=${commitFn}>
    </sc-labels-editor>`;
  }

  return /** @type {SupercardModule} */ ({ update, renderCustomBlock, newEntry,
                                           ownedByCanvas: true });
})());
