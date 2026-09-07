import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

// --- HELPER FUNCTIONS FOR TARGET SELECTION ---
const { getAvailableElements } = window.SupercardUtils;

function getTargets(slot) {
  const targets = [
    { id: 'none', label: '— Please select a target —', group: 'General' },
    { id: 'main', label: 'Main card (entire background)', group: 'General' }
  ];

  // Basic elements
  targets.push({ id: 'icon', label: 'Icon (main entity)', group: 'Elements (basic)' });
  targets.push({ id: 'name', label: 'Name (main entity)', group: 'Elements (basic)' });
  targets.push({ id: 'state', label: 'State / value', group: 'Elements (basic)' });

  // Gauges
  const gaugeCount = Array.isArray(slot.gauges) ? slot.gauges.length : (slot.gauge_active ? 1 : 0);
  for (let i = 0; i < gaugeCount; i++) targets.push({ id: `gauge_${i}`, label: `Gauge ${i + 1}`, group: 'Elements (gauges)' });

  // Progressbars
  const pbCount = Array.isArray(slot.progressbars) ? slot.progressbars.length : 0;
  for (let i = 0; i < pbCount; i++) targets.push({ id: `progressbar_${i}`, label: `Progressbar ${i + 1}`, group: 'Elements (progressbars)' });

  // Labels
  if (Array.isArray(slot.labels_list)) {
    slot.labels_list.forEach((l, idx) => {
      targets.push({ id: `label_${idx}`, label: `Label ${idx + 1}: ${l.label_text || l.entity || ''}`, group: 'Elements (labels)' });
    });
  }

  // Layout cells
  if (Array.isArray(slot.layout_rows)) {
    const els = getAvailableElements(slot);
    slot.layout_rows.forEach((row, rIdx) => {
      row.cells.forEach((cell, cIdx) => {
        let typeLabel = els[cell.content] || 'Empty';
        if (cell.content !== 'empty') {
            typeLabel = typeLabel.split(':')[0]; // Shortens "Label: XY" to "Label" in the grid
        }
        targets.push({ id: `r${rIdx}c${cIdx}`, label: `R${rIdx+1}C${cIdx+1} (${typeLabel})`, group: 'Layout grid (cells)' });
      });
    });
  }

  return targets;
}

// --- THE EDITOR ---
class ScInteractionEditor extends LitElement {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      commitFn: { type: Function },
      _expanded: { type: Object, state: true }
    };
  }

  constructor() {
    super();
    this._expanded = ScInteractionEditor._expandedCache ?? {};
  }

  static get styles() {
    return css`
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

  _commit(newList) {
    if (this.commitFn) {
      this.commitFn('__merge__', { interactions: newList });
    }
  }

  _toggle(id, e) {
    if (e) e.stopPropagation();
    this._expanded = { ...this._expanded, [id]: !this._expanded[id] };
    ScInteractionEditor._expandedCache = this._expanded;
  }

  _renderActionBlock(pat, idx, patterns, prefix, label) {
    const actionType = pat[`${prefix}_action`] || 'none';
    const setAction = (val) => { const n = structuredClone(patterns); n[idx][`${prefix}_action`] = val; this._commit(n); };

    return html`
      <div class="action-box">
        <label style="font-weight:bold; color:var(--primary-text-color);">${label}</label>

        <div class="action-icon-grid">
          <div class="action-icon-btn ${actionType === 'none' ? 'active' : ''}" title="No action" @click=${() => setAction('none')}>
            <ha-icon icon="mdi:cancel"></ha-icon><span class="action-icon-label">None</span>
          </div>
          <div class="action-icon-btn ${actionType === 'toggle' ? 'active' : ''}" title="Toggle" @click=${() => setAction('toggle')}>
            <ha-icon icon="mdi:toggle-switch-outline"></ha-icon><span class="action-icon-label">Toggle</span>
          </div>
          <div class="action-icon-btn ${actionType === 'more-info' ? 'active' : ''}" title="More info" @click=${() => setAction('more-info')}>
            <ha-icon icon="mdi:information-outline"></ha-icon><span class="action-icon-label">Info</span>
          </div>
          <div class="action-icon-btn ${actionType === 'call-service' ? 'active' : ''}" title="Call service" @click=${() => setAction('call-service')}>
            <ha-icon icon="mdi:lightning-bolt"></ha-icon><span class="action-icon-label">Service</span>
          </div>
          <div class="action-icon-btn ${actionType === 'navigate' ? 'active' : ''}" title="Navigate" @click=${() => setAction('navigate')}>
            <ha-icon icon="mdi:arrow-right-top"></ha-icon><span class="action-icon-label">Path</span>
          </div>
        </div>

        ${['toggle', 'more-info', 'call-service'].includes(actionType) ? html`
          <div class="col" style="margin-top:8px;">
            <label>Target entity (Entity ID)</label>
            <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${true} .value=${pat[`${prefix}_entity`] || ''}
              @value-changed=${e => { const n = structuredClone(patterns); n[idx][`${prefix}_entity`] = e.detail.value; this._commit(n); }}>
            </ha-entity-picker>
          </div>
        ` : ''}

        ${actionType === 'call-service' ? html`
          <div class="col" style="margin-top:8px;">
            <label>Service</label>
            <input type="text" placeholder="light.turn_on" .value=${pat[`${prefix}_service`] || ''}
              @input=${e => { const n = structuredClone(patterns); n[idx][`${prefix}_service`] = e.target.value; this._commit(n); }}>
          </div>
          <div class="col" style="margin-top:8px;">
            <label>Data (JSON, optional)</label>
            <input type="text" placeholder='{"brightness": 255}' .value=${pat[`${prefix}_data`] || ''}
              @input=${e => { const n = structuredClone(patterns); n[idx][`${prefix}_data`] = e.target.value; this._commit(n); }}>
          </div>
        ` : ''}

        ${actionType === 'navigate' ? html`
          <div class="col" style="margin-top:8px;">
            <label>Path</label>
            <input type="text" placeholder="/lovelace/dashboard" .value=${pat[`${prefix}_nav`] || ''}
              @input=${e => { const n = structuredClone(patterns); n[idx][`${prefix}_nav`] = e.target.value; this._commit(n); }}>
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    if (!this.slot) return html``;

    let patterns = Array.isArray(this.slot.interactions) ? this.slot.interactions : [];
    const targets = getTargets(this.slot);
    const usedTargets = patterns.map(p => p.target).filter(t => t !== 'none');

    return html`
      <details class="inner-section">
        <summary>👆 Interactions & Actions <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${patterns.map((pat, idx) => {
            const isExp = !!this._expanded[pat.id];
            let targetLabel = targets.find(t => t.id === pat.target)?.label || 'Unknown target';
            if (pat.target === 'none') targetLabel = 'Not assigned';

            return html`
              <div class="pattern-card"
                @dragstart=${e => {
                  e.stopPropagation();
                  e.dataTransfer.setData('application/json', JSON.stringify({ idx }));
                  e.target.style.opacity = '0.4';
                }}
                @dragover=${e => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderTop = '3px dashed var(--primary-color)';
                }}
                @dragleave=${e => e.currentTarget.style.borderTop = ''}
                @drop=${e => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderTop = '';
                  const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                  if (data.idx !== undefined && data.idx !== idx) {
                    const n = structuredClone(patterns);
                    const [moved] = n.splice(data.idx, 1);
                    n.splice(idx, 0, moved);
                    this._commit(n);
                  }
                }}
                @dragend=${e => e.target.style.opacity = '1'}
              >
                <div class="pattern-header" @click=${e => this._toggle(pat.id, e)}>
                  <div>
                    <span class="drag-handle"
                      @mousedown=${e => { e.stopPropagation(); e.target.closest('.pattern-card').setAttribute('draggable', 'true'); }}
                      @mouseup=${e => { e.stopPropagation(); e.target.closest('.pattern-card').removeAttribute('draggable'); }}
                      @mouseleave=${e => e.target.closest('.pattern-card').removeAttribute('draggable')}
                    >⋮⋮</span>
                    <span class="toggle-icon">${isExp ? '▼' : '▶'}</span>
                    <span style="color:${pat.enabled ? 'var(--primary-text-color)' : 'var(--secondary-text-color)'}">
                      Interaction ${idx + 1}
                    </span>
                    <span style="font-size:10px;color:${pat.target === 'none' ? '#f44' : 'var(--secondary-text-color)'};margin-left:8px;font-weight:normal">(${targetLabel})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!pat.enabled}
                      @click=${e => e.stopPropagation()}
                      @change=${e => { const n = structuredClone(patterns); n[idx].enabled = e.target.checked; this._commit(n); }}>
                    </ha-switch>

                    <button type="button" title="Clone" @click=${e => {
                      e.preventDefault(); e.stopPropagation();
                      const n = structuredClone(patterns);
                      const clone = structuredClone(pat);
                      clone.id = Date.now(); clone.target = 'none';
                      n.splice(idx + 1, 0, clone);
                      this._commit(n);
                      this._expanded = { ...this._expanded, [clone.id]: true };
                    }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>

                    <button type="button" title="Delete" @click=${e => {
                      e.preventDefault(); e.stopPropagation();
                      const n = [...patterns]; n.splice(idx, 1); this._commit(n);
                    }} style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${isExp ? html`
                  <div class="pattern-content">
                    <div class="row">
                      <label>Target element</label>
                      <select style="width:60%" @change=${e => { const n = structuredClone(patterns); n[idx].target = e.target.value; this._commit(n); }}>
                        ${(() => {
                          const groups = {};
                          targets.forEach(t => {
                            const g = t.group || 'General';
                            if (!groups[g]) groups[g] = [];
                            groups[g].push(t);
                          });
                          return Object.entries(groups).map(([gName, els]) => html`
                            <optgroup label="${gName}">
                              ${els.map(t => {
                                const isLocked = t.id !== 'none' && t.id !== pat.target && usedTargets.includes(t.id);
                                return html`<option value=${t.id} ?selected=${pat.target === t.id} ?disabled=${isLocked}>
                                  ${t.label} ${isLocked ? '(In use)' : ''}
                                </option>`;
                              })}
                            </optgroup>
                          `);
                        })()}
                      </select>
                    </div>

                    <div class="section-title">⚡ Home Assistant Actions</div>
                    ${this._renderActionBlock(pat, idx, patterns, 'tap', 'Tap')}
                    ${this._renderActionBlock(pat, idx, patterns, 'double_tap', 'Double tap')}
                    ${this._renderActionBlock(pat, idx, patterns, 'hold', 'Hold')}

                    <div class="section-title">🎬 Visual animations (GPU)</div>
                    <div class="row">
                      <label>Click depth (scale)<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Off, 100 = Max. press depth</span></label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${pat.scale_depth ?? 50}
                        @input=${e => { const n = structuredClone(patterns); n[idx].scale_depth = parseInt(e.target.value); this._commit(n); }}>
                    </div>
                    <div class="row">
                      <label>Continuous rotation<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Off, 100 = Very fast</span></label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${pat.rotate_speed ?? 0}
                        @input=${e => { const n = structuredClone(patterns); n[idx].rotate_speed = parseInt(e.target.value); this._commit(n); }}>
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          })}

          <button type="button" class="add-btn" @click=${(e) => {
            e.preventDefault(); e.stopPropagation();
            const n = structuredClone(patterns);
            const newId = Date.now();
            n.push({
              id: newId, enabled: true, target: 'none',
              tap_action: 'none', double_tap_action: 'none', hold_action: 'none',
              scale_depth: 50, rotate_speed: 0
            });
            this._commit(n);
            this._expanded = { ...this._expanded, [newId]: true };
          }}>＋ Add new interaction</button>
        </div>
      </details>
    `;
  }
}

if (!customElements.get('sc-interaction-editor')) {
  customElements.define('sc-interaction-editor', ScInteractionEditor);
}
ScInteractionEditor._expandedCache = {};

// --- THE MODULE ---
window.SupercardModules['interaction'] = window.SupercardModules['interaction'] || {};
Object.assign(window.SupercardModules['interaction'], (() => {

  function getCssSelector(target) {
    if (target === 'main') return 'ha-card .supercard-container';
    if (target.match(/^r\d+c\d+$/)) return `sc-layout-renderer::part(cell-${target.replace('r','').replace('c','-')})`;
    if (target === 'icon') return '#icon';
    if (target === 'name') return '#header';
    if (target === 'state') return '#state';
    if (target.startsWith('gauge_')) return `sc-gauge[data-idx="${target.split('_')[1]}"]`;
    if (target.startsWith('progressbar_')) return `sc-progressbar[data-idx="${target.split('_')[1]}"]`;
    if (target.startsWith('label_')) return `.sc-item-slot[data-item-id="${target}"], #${target}`;
    return '';
  }

  function update({ config }) {
    let patterns = Array.isArray(config.interactions) ? config.interactions : [];
    if (patterns.length === 0) return {};

    let styleStr = '';

    patterns.forEach(pat => {
      if (!pat.enabled || pat.target === 'none') return;

      const selector = getCssSelector(pat.target);
      if (!selector) return;

      const isMain = pat.target === 'main';
      const scaleVal = pat.scale_depth !== undefined ? pat.scale_depth : 50;
      const rotSpeed = pat.rotate_speed || 0;

      styleStr += `${selector} { pointer-events: auto !important; cursor: pointer !important; -webkit-tap-highlight-color: transparent !important; }\n`;

      if (scaleVal > 0) {
        const scaleCalc = 1 - (scaleVal * 0.0015);
        if (isMain) {
          styleStr += `
            ha-card ha-ripple { display: none !important; }
            ${selector} { transition: scale 0.2s cubic-bezier(0.2, 0, 0, 1) !important; }
            ${selector}:active:not(:has(select:active)):not(:has(ha-select:active)):not(:has([id^="sc-cell-"]:active)) { scale: ${scaleCalc} !important; }
          `;
        } else {
          styleStr += `
            ${selector} { transition: scale 0.15s cubic-bezier(0.2, 0, 0, 1) !important; }
            ${selector}:active { scale: ${scaleCalc} !important; }
          `;
        }
      }

      if (rotSpeed > 0) {
        const dur = 200 / rotSpeed;
        styleStr += `
          @keyframes sc-rot-${pat.id} { to { rotate: 360deg; } }
          ${selector} { animation: sc-rot-${pat.id} ${dur}s linear infinite !important; }
        `;
      }
    });

    return { htmlOverlay: `<style>${styleStr}</style>` };
  }

  // --- HA ACTION EXECUTOR ---
  // Takes 'hass', 'config' and 'hostEl' (main card) as parameters to trigger 100% reliably.
  function executeAction(actionType, pat, hass, config, element, hostEl) {
    const type = pat[`${actionType}_action`] || 'none';
    let entity = pat[`${actionType}_entity`];

    if (type === 'none') return;

    // Fall back to the card's main entity
    if (!entity && config?.entity) {
      entity = config.entity;
    }

    if (type === 'toggle' && entity && hass) {
      const domain = entity.split('.')[0];
      // Optimize toggle for known switchable domains
      if (['light', 'switch', 'input_boolean', 'fan', 'cover', 'lock'].includes(domain)) {
         hass.callService(domain, 'toggle', { entity_id: entity });
      } else {
         hass.callService('homeassistant', 'toggle', { entity_id: entity });
      }
    } else if (type === 'more-info' && entity) {
      // Always fire the event from the root card so it reliably leaves the Shadow DOM
      const ev = new CustomEvent('hass-more-info', { composed: true, bubbles: true, detail: { entityId: entity } });
      (hostEl || element).dispatchEvent(ev);
    } else if (type === 'navigate') {
      const navPath = pat[`${actionType}_nav`];
      if (navPath) {
        history.pushState(null, '', navPath);
        window.dispatchEvent(new CustomEvent('location-changed'));
      }
    } else if (type === 'call-service' && hass) {
      const servicePath = pat[`${actionType}_service`];
      if (servicePath && servicePath.includes('.')) {
        const [domain, service] = servicePath.split('.');
        let parsedData = {};
        try { parsedData = JSON.parse(pat[`${actionType}_data`] || '{}'); } catch(e) {}
        if (entity && !parsedData.entity_id) parsedData.entity_id = entity;
        hass.callService(domain, service, parsedData);
      }
    }
  }

  // --- EVENT LISTENER INJECTION ---
  function onAfterRender(shadow, config) {
    if (!Array.isArray(config.interactions)) return;

    const renderer = shadow.querySelector('sc-layout-renderer');
    // Absolutely safe HASS access via the host element
    const hass = shadow.host.hass || document.querySelector('home-assistant')?.hass;

    config.interactions.forEach(pat => {
      if (!pat.enabled || pat.target === 'none') return;

      let el = null;
      if (pat.target === 'main') {
        el = shadow.querySelector('.supercard-container') || shadow.host;
      } else if (pat.target.match(/^r\d+c\d+$/)) {
        if (renderer && renderer.shadowRoot) {
          const match = pat.target.match(/r(\d+)c(\d+)/);
          el = renderer.shadowRoot.querySelector(`#sc-cell-${match[1]}-${match[2]}`);
        }
      } else if (pat.target === 'icon') {
        el = shadow.querySelector('#icon');
      } else if (pat.target === 'name') {
        el = shadow.querySelector('#header');
      } else if (pat.target === 'state') {
        el = shadow.querySelector('#state');
      } else if (pat.target.startsWith('gauge_')) {
        el = shadow.querySelector(`sc-gauge[data-idx="${pat.target.split('_')[1]}"]`);
      } else if (pat.target.startsWith('progressbar_')) {
        el = shadow.querySelector(`sc-progressbar[data-idx="${pat.target.split('_')[1]}"]`);
      } else if (pat.target.startsWith('label_')) {
        if (renderer && renderer.shadowRoot) {
          el = renderer.shadowRoot.querySelector(`.sc-item-slot[data-item-id="${pat.target}"]`);
          if (!el) el = renderer.shadowRoot.querySelector(`#${pat.target}`);
        }
        if (!el) el = shadow.querySelector(`#${pat.target}`);
      }

      if (!el) return;

      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'auto';
      el.style.webkitTapHighlightColor = 'transparent';

      const compStyle = getComputedStyle(el);
      if (compStyle.display === 'inline' || compStyle.display === 'contents') {
        el.style.display = 'inline-block';
      }

      if (el._sc_interactions_attached) return;
      el._sc_interactions_attached = true;

      let clickTimer = null;
      let holdTimer = null;
      let isHeld = false;

      const preventProp = (e) => { e.stopPropagation(); };
      const resetScale = () => { if (el.style.scale) el.style.scale = '1'; };

      const onPointerDown = (e) => {
        preventProp(e);
        isHeld = false;

        const currentPat = config.interactions.find(i => i.id === pat.id);
        if (currentPat && currentPat.scale_depth > 0 && currentPat.target !== 'main') {
           el.style.transition = 'scale 0.15s cubic-bezier(0.2, 0, 0, 1)';
           el.style.scale = 1 - (currentPat.scale_depth * 0.0015);
        }

        holdTimer = setTimeout(() => {
          isHeld = true;
          if (currentPat) executeAction('hold', currentPat, hass, config, el, shadow.host);
        }, 500);
      };

      const onPointerUp = (e) => {
        preventProp(e);
        clearTimeout(holdTimer);
        resetScale();

        if (isHeld) return;

        const currentPat = config.interactions.find(i => i.id === pat.id);
        if (!currentPat) return;

        const hasDoubleTap = currentPat.double_tap_action && currentPat.double_tap_action !== 'none';

        if (hasDoubleTap) {
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            executeAction('double_tap', currentPat, hass, config, el, shadow.host);
          } else {
            clickTimer = setTimeout(() => {
              clickTimer = null;
              executeAction('tap', currentPat, hass, config, el, shadow.host);
            }, 250);
          }
        } else {
          executeAction('tap', currentPat, hass, config, el, shadow.host);
        }
      };

      const onPointerCancel = (e) => {
        clearTimeout(holdTimer);
        resetScale();
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointerleave', onPointerCancel);
      el.addEventListener('pointercancel', onPointerCancel);
      el.addEventListener('click', preventProp);
    });
  }

  let _cachedEditor = null;
  function renderCustomBlock(commitFn, hass, slot) {
    if (!_cachedEditor) _cachedEditor = document.createElement('sc-interaction-editor');
    _cachedEditor.commitFn = commitFn;
    _cachedEditor.slot = slot;
    _cachedEditor.hass = hass;
    return _cachedEditor;
  }

  function editorFields() { return []; }

  return /** @type {SupercardModule} */ ({ update, onAfterRender, renderCustomBlock, editorFields });
})());
