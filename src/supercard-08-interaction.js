import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

const SC = window.SupercardUtils;

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

  // A surface is deliberately not offered: .sc-surface is pointer-events: none,
  // so a decorative box does not eat the clicks meant for what is drawn over it.
  //
  // An element the canvas does not place is not on the card at all, so there is
  // nothing there to click.
  return targets.filter(t => !t.group.startsWith('Elements') || SC.showsElement(slot, t.id));
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
    return [SC.editorStyles, css`
      .row { gap: 8px; }
      .toggle-icon { text-align: center; }
      .pattern-card { transition: opacity 0.2s; }
      .pattern-header { user-select: none; }
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
    `];
  }

  _commit(newList) {
    if (this.commitFn) {
      this.commitFn('__merge__', { interactions: newList });
    }
  }

  /** Commit `list` with one field of entry `idx` changed. */
  _set(list, idx, key, value) { this._commit(SC.withPatch(list, idx, key, value)); }

  _toggle(id, e) {
    if (e) e.stopPropagation();
    this._expanded = { ...this._expanded, [id]: !this._expanded[id] };
    ScInteractionEditor._expandedCache = this._expanded;
  }

  /**
   * The fields of one action block - a picker for the kind of action, and
   * whatever that kind needs. Written as a field array like the gauge's and
   * the bar's, so the three blocks are the same definition three times over.
   */
  _actionFields(prefix, label) {
    const key = prefix + '_action';
    const is = (...kinds) => entry => kinds.includes(entry[key] || 'none');
    return {
      type: 'group', class: 'action-box', label,
      labelStyle: 'font-weight:bold; color:var(--primary-text-color);',
      fields: [
        { id: key, type: 'custom', render: ctx => this._actionPicker(key, ctx) },
        { id: prefix + '_entity', label: 'Target entity (Entity ID)', type: 'entity',
          style: 'margin-top:8px;', condition: is('toggle', 'more-info', 'call-service') },
        { id: prefix + '_service', label: 'Service', type: 'text', placeholder: 'light.turn_on',
          style: 'margin-top:8px;', condition: is('call-service') },
        { id: prefix + '_data', label: 'Data (JSON, optional)', type: 'text',
          placeholder: '{"brightness": 255}',
          style: 'margin-top:8px;', condition: is('call-service') },
        { id: prefix + '_nav', label: 'Path', type: 'text', placeholder: '/lovelace/dashboard',
          style: 'margin-top:8px;', condition: is('navigate') },
      ],
    };
  }

  /** The five-button grid that picks the kind of action. */
  _actionPicker(key, ctx) {
    const current = ctx.entry[key] || 'none';
    return html`
      <div class="action-icon-grid">
        ${ScInteractionEditor.ACTION_KINDS.map(a => html`
          <div class="action-icon-btn ${current === a.id ? 'active' : ''}" title=${a.title}
               @click=${() => ctx.set(key, a.id)}>
            <ha-icon icon=${a.icon}></ha-icon><span class="action-icon-label">${a.label}</span>
          </div>`)}
      </div>`;
  }

  /** Everything inside an expanded interaction card. */
  _fields() {
    return [
      { id: 'target', label: 'Target element', type: 'select', width: '60%',
        options: (entry, ctx) => ctx.targets.map(t => {
          const locked = t.id !== 'none' && t.id !== entry.target && ctx.usedTargets.includes(t.id);
          return { value: t.id, group: t.group || 'General', disabled: locked,
                   label: locked ? t.label + ' (In use)' : t.label };
        }) },
      { type: 'heading', label: '⚡ Home Assistant Actions' },
      this._actionFields('tap', 'Tap'),
      this._actionFields('double_tap', 'Double tap'),
      this._actionFields('hold', 'Hold'),
      { type: 'heading', label: '🎬 Visual animations (GPU)' },
      { id: 'scale_depth', label: 'Click depth (scale)', hint: '0 = Off, 100 = Max. press depth',
        type: 'range', min: 0, max: 100, width: '60%', int: true, placeholder: 50 },
      { id: 'rotate_speed', label: 'Continuous rotation', hint: '0 = Off, 100 = Very fast',
        type: 'range', min: 0, max: 100, width: '60%', int: true, placeholder: 0 },
    ];
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
                      @change=${e => { this._set(patterns, idx, 'enabled', e.target.checked); }}>
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
                    }} style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">🗑</button>
                  </div>
                </div>

                ${isExp ? html`
                  <div class="pattern-content">
                    ${SC.renderFields(this._fields(), {
                      entry: pat, slot: this.slot, hass: this.hass, targets, usedTargets,
                      set: (key, value) => this._set(patterns, idx, key, value),
                    })}
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
ScInteractionEditor.ACTION_KINDS = [
  { id: 'none', icon: 'mdi:cancel', label: 'None', title: 'No action' },
  { id: 'toggle', icon: 'mdi:toggle-switch-outline', label: 'Toggle', title: 'Toggle' },
  { id: 'more-info', icon: 'mdi:information-outline', label: 'Info', title: 'More info' },
  { id: 'call-service', icon: 'mdi:lightning-bolt', label: 'Service', title: 'Call service' },
  { id: 'navigate', icon: 'mdi:arrow-right-top', label: 'Path', title: 'Navigate' },
];
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
  // 'ctx' carries the live { hass, config, rootEntity }; 'hostEl' is the main
  // card, so events reliably escape the shadow DOM.
  function executeAction(actionType, pat, ctx, element, hostEl) {
    const { hass, config, rootEntity } = ctx;
    const type = pat[`${actionType}_action`] || 'none';
    let entity = pat[`${actionType}_entity`];

    if (type === 'none') return;

    // Fall back to the card's main entity. render() resolves it as
    // slot.entity || config.entity, so both have to be checked here - YAML
    // written by hand usually only sets the top-level key.
    if (!entity) entity = config?.entity || rootEntity;

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
    // Absolutely safe HASS access via the host element
    const hass = shadow.host.hass || document.querySelector('home-assistant')?.hass;
    const rootEntity = shadow.host?.config?.entity;

    // Refreshed on every render, before any early return: listeners are attached
    // only once, so this is the only thing keeping them from acting on the config
    // and hass that happened to be current when the element was first rendered.
    shadow._sc_ctx = { config, hass, rootEntity };

    if (!Array.isArray(config.interactions)) return;

    const renderer = shadow.querySelector('sc-layout-renderer');

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

      // Re-resolve against the current config on every event. Returns null once
      // the pattern is gone, switched off, or pointed at a different element -
      // this element keeps its listeners, so they have to opt out themselves.
      const currentPattern = () => {
        const cur = shadow._sc_ctx?.config?.interactions?.find(i => i.id === pat.id);
        if (!cur || cur.enabled === false || cur.target !== pat.target) return null;
        return cur;
      };

      let clickTimer = null;
      let holdTimer = null;
      let isHeld = false;

      const preventProp = (e) => { e.stopPropagation(); };
      const resetScale = () => { if (el.style.scale) el.style.scale = '1'; };

      const onPointerDown = (e) => {
        preventProp(e);
        isHeld = false;

        const ctx = shadow._sc_ctx;
        const currentPat = currentPattern();
        if (currentPat && currentPat.scale_depth > 0 && currentPat.target !== 'main') {
           el.style.transition = 'scale 0.15s cubic-bezier(0.2, 0, 0, 1)';
           el.style.scale = 1 - (currentPat.scale_depth * 0.0015);
        }

        holdTimer = setTimeout(() => {
          isHeld = true;
          if (currentPat) executeAction('hold', currentPat, ctx, el, shadow.host);
        }, 500);
      };

      const onPointerUp = (e) => {
        preventProp(e);
        clearTimeout(holdTimer);
        resetScale();

        if (isHeld) return;

        const ctx = shadow._sc_ctx;
        const currentPat = currentPattern();
        if (!currentPat) return;

        const hasDoubleTap = currentPat.double_tap_action && currentPat.double_tap_action !== 'none';

        if (hasDoubleTap) {
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            executeAction('double_tap', currentPat, ctx, el, shadow.host);
          } else {
            clickTimer = setTimeout(() => {
              clickTimer = null;
              executeAction('tap', currentPat, ctx, el, shadow.host);
            }, 250);
          }
        } else {
          executeAction('tap', currentPat, ctx, el, shadow.host);
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
