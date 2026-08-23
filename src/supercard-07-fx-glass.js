import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

// --- NEUES UI ELEMENT: X/Y SHADOW PAD (Lichtquelle) ---
class ScShadowPad extends LitElement {
  static get properties() {
    return {
      angle: { type: Number },
      distance: { type: Number },
      maxDistance: { type: Number }
    };
  }

  constructor() {
    super();
    this.angle = 90;
    this.distance = 1.0;
    this.maxDistance = 5;
    this._isDragging = false;
  }

  static get styles() {
    return css`
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
    this._isDragging = true;
    const container = this.shadowRoot.querySelector('.pad-container');
    container.setPointerCapture(e.pointerId);
    this._updatePosition(e);
  }

  _handlePointerMove(e) { if (!this._isDragging) return; this._updatePosition(e); }

  _handlePointerUp(e) {
    this._isDragging = false;
    const container = this.shadowRoot.querySelector('.pad-container');
    container.releasePointerCapture(e.pointerId);
  }

  _updatePosition(e) {
    const rect = this.shadowRoot.querySelector('.pad-container').getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2;
    const dx = e.clientX - cx; const dy = e.clientY - cy;

    let lightAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    let shadowAngle = (lightAngle + 180) % 360;
    if (shadowAngle < 0) shadowAngle += 360;

    let r = Math.sqrt(dx*dx + dy*dy);
    if (r > maxR) r = maxR;
    let distance = (r / maxR) * this.maxDistance;
    
    if (distance < (this.maxDistance * 0.05)) { distance = 0; shadowAngle = this.angle; }

    this.angle = Math.round(shadowAngle);
    this.distance = parseFloat(distance.toFixed(2));
    this.dispatchEvent(new CustomEvent('pad-change', { detail: { angle: this.angle, distance: this.distance }, bubbles: true, composed: true }));
  }

  render() {
    const lightAngle = (this.angle + 180) * Math.PI / 180;
    const rPct = (this.distance / this.maxDistance) * 50;
    const tx = 50 + Math.cos(lightAngle) * rPct;
    const ty = 50 + Math.sin(lightAngle) * rPct;
    return html`
      <div class="pad-container" @pointerdown=${this._handlePointerDown} @pointermove=${this._handlePointerMove} @pointerup=${this._handlePointerUp} @pointercancel=${this._handlePointerUp}>
        <div class="thumb" style="left: ${tx}%; top: ${ty}%;"><div class="sun-icon">☀️</div></div>
      </div>
    `;
  }
}
if (!customElements.get('sc-shadow-pad')) customElements.define('sc-shadow-pad', ScShadowPad);

// --- HILFSFUNKTIONEN FÜR DIE ZIEL-AUSWAHL ---
function getAvailableElements(slot) {
  const elements = { 'empty': 'Leer', 'icon': 'Icon', 'name': 'Entitäts-Name', 'state': 'Zustand (Wert)' };
  const gaugeCount = Array.isArray(slot.gauges) ? slot.gauges.length : (slot.gauge_active ? 1 : 0);
  for (let i = 0; i < gaugeCount; i++) elements[`gauge_${i}`] = `Gauge ${i + 1}`;
  const pbCount = Array.isArray(slot.progressbars) ? slot.progressbars.length : 0;
  for (let i = 0; i < pbCount; i++) {
    const pb = slot.progressbars[i];
    elements[`progressbar_${i}`] = pb?.label_text || `Progressbar ${i + 1}`;
  }
  if (Array.isArray(slot.labels_list)) {
    slot.labels_list.forEach((l, idx) => {
      elements[`label_${idx}`] = `Label: ${l.label_text || l.entity || idx + 1}`;
    });
  }
  return elements;
}

function getTargets(slot) {
  const groups = {
    general: { label: 'Allgemein', items: [ { id: 'none', label: '— Bitte Ziel wählen —' }, { id: 'main', label: 'Hauptkarte (Gesamter Hintergrund)' } ]},
    cells: { label: 'Layout-Zellen (Container)', items: [] },
    elements: { label: 'Direkte Elemente (Passgenau)', items: [] }
  };
  const els = getAvailableElements(slot);
  if (Array.isArray(slot.layout_rows)) {
    slot.layout_rows.forEach((row, rIdx) => {
      row.cells.forEach((cell, cIdx) => {
        const typeLabel = els[cell.content] || 'Leer';
        groups.cells.items.push({ id: `r${rIdx}c${cIdx}`, label: `Zelle Z${rIdx+1}C${cIdx+1} (${typeLabel})` });
      });
    });
  }
  Object.entries(els).forEach(([key, label]) => {
    if (key !== 'empty') groups.elements.items.push({ id: `elm_${key}`, label: `Element: ${label}` });
  });
  return groups;
}

// --- DER EDITOR ---
class ScFxGlassEditor extends LitElement {
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
    this._expanded = ScFxGlassEditor._expandedCache ?? {};
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

  _commit(newList) {
    if (this.commitFn) this.commitFn('__merge__', { fx_glass_patterns: newList });
  }

  _toggle(id, e) {
    if (e) e.stopPropagation();
    this._expanded = { ...this._expanded, [id]: !this._expanded[id] };
    ScFxGlassEditor._expandedCache = this._expanded;
  }

  render() {
    if (!this.slot) return html``;
    
    let patterns = Array.isArray(this.slot.fx_glass_patterns) ? this.slot.fx_glass_patterns : [];
    if (patterns.length === 0 && this.slot.fx_glass && this.slot.fx_glass.enabled) {
        patterns = [{ id: Date.now(), target: 'main', padding_unit: 'px', ...this.slot.fx_glass }];
    }

    const targetGroups = getTargets(this.slot);
    const usedTargets = patterns.map(p => p.target).filter(t => t !== 'none');

    const getLabelForTarget = (targetId) => {
      for (const group of Object.values(targetGroups)) {
        const found = group.items.find(t => t.id === targetId);
        if (found) return found.label;
      }
      return 'Unbekanntes Ziel';
    };

    return html`
      <details class="inner-section">
        <summary>✨ FX: Frosted & Liquid Glass <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${patterns.map((pat, idx) => {
            const isExp = !!this._expanded[pat.id];
            let targetLabel = getLabelForTarget(pat.target);
            if (pat.target === 'none') targetLabel = 'Nicht zugewiesen';
            
            const isDirectElement = pat.target && pat.target.startsWith('elm_');
            const showManualControls = !isDirectElement || pat.manual_override;

            return html`
              <div class="pattern-card"
                @dragstart=${e => { e.stopPropagation(); e.dataTransfer.setData('application/json', JSON.stringify({ idx })); e.target.style.opacity = '0.4'; }}
                @dragover=${e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderTop = '3px dashed var(--primary-color)'; }}
                @dragleave=${e => e.currentTarget.style.borderTop = ''}
                @drop=${e => {
                  e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderTop = '';
                  const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
                  if (data.idx !== undefined && data.idx !== idx) {
                    const n = JSON.parse(JSON.stringify(patterns));
                    const [moved] = n.splice(data.idx, 1);
                    n.splice(idx, 0, moved);
                    this._commit(n);
                  }
                }}
                @dragend=${e => e.target.style.opacity = '1'}
              >
                <div class="pattern-header" @click=${e => this._toggle(pat.id, e)}>
                  <div>
                    <span class="drag-handle" @mousedown=${e => { e.stopPropagation(); e.target.closest('.pattern-card').setAttribute('draggable', 'true'); }} @mouseup=${e => { e.stopPropagation(); e.target.closest('.pattern-card').removeAttribute('draggable'); }} @mouseleave=${e => e.target.closest('.pattern-card').removeAttribute('draggable')}>⋮⋮</span>
                    <span class="toggle-icon">${isExp ? '▼' : '▶'}</span>
                    <span style="color:${pat.enabled ? 'var(--primary-text-color)' : 'var(--secondary-text-color)'}">Glass Effekt ${idx + 1}</span>
                    <span style="font-size:10px;color:${pat.target === 'none' ? '#f44' : 'var(--secondary-text-color)'};margin-left:8px;font-weight:normal;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom;">(${targetLabel})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!pat.enabled} @click=${e => e.stopPropagation()} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].enabled = e.target.checked; this._commit(n); }}></ha-switch>
                    <button type="button" title="Klonen" @click=${e => { e.preventDefault(); e.stopPropagation(); const n = JSON.parse(JSON.stringify(patterns)); const clone = JSON.parse(JSON.stringify(pat)); clone.id = Date.now(); clone.target = 'none'; n.splice(idx + 1, 0, clone); this._commit(n); this.requestUpdate(); }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>
                    <button type="button" title="Löschen" @click=${e => { e.preventDefault(); e.stopPropagation(); const n = [...patterns]; n.splice(idx, 1); this._commit(n); }} style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${isExp ? html`
                  <div class="pattern-content">
                    <div class="row">
                      <label>Ziel / Element</label>
                      <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].target = e.target.value; this._commit(n); }}>
                        ${Object.values(targetGroups).map(group => html`
                          <optgroup label="${group.label}">
                            ${group.items.map(t => {
                              const isLocked = t.id !== 'none' && t.id !== pat.target && usedTargets.includes(t.id);
                              return html`<option value=${t.id} ?selected=${pat.target === t.id} ?disabled=${isLocked}>${t.label} ${isLocked ? '(Belegt)' : ''}</option>`;
                            })}
                          </optgroup>
                        `)}
                      </select>
                    </div>

                    <div class="section-title">📏 Dimensionen & Form</div>
                    
                    ${isDirectElement ? html`
                      <div class="auto-magic-box">
                        <div style="display:flex; gap:8px; align-items:center;">
                          <span style="font-size:16px">🪄</span>
                          <div><b>Auto-Maskierung (Container Queries aktiv):</b> Der Effekt passt sich unverzerrt an die kleinste Containerseite (cqmin) an.</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(3,169,244,0.3); padding-top:8px;">
                          <label>Manuelle Korrektur (Regler anzeigen)</label>
                          <ha-switch .checked=${pat.manual_override ?? false} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].manual_override = e.target.checked; this._commit(n); }}></ha-switch>
                        </div>
                      </div>
                    ` : ''}

                    <div class="row" style="background: rgba(244,67,54,0.1); padding: 8px; border-radius: 6px; border: 1px dashed rgba(244,67,54,0.3);">
                      <label style="color:#f44336; font-weight:bold;">🛠 Debug-Modus (Boxen anzeigen)<br><span style="font-size:10px; font-weight:normal;">Zeigt den Container grün und das Glas pink gestrichelt.</span></label>
                      <ha-switch style="--switch-checked-button-color: #f44336; --switch-checked-track-color: rgba(244,67,54,0.5);" .checked=${pat.debug_mask ?? false} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].debug_mask = e.target.checked; this._commit(n); }}></ha-switch>
                    </div>

                    ${showManualControls ? html`
                      <div class="row" style="background:rgba(3,169,244,0.1); padding:8px; border-radius:6px;">
                        <label style="color:var(--primary-color)">Form sperren (1:1 Aspect Ratio)<br><span style="font-size:10px;color:var(--secondary-text-color)">Erzwingt ein perfektes Quadrat/Kreis (cqmin).</span></label>
                        <ha-switch .checked=${pat.force_square ?? false} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].force_square = e.target.checked; this._commit(n); }}></ha-switch>
                      </div>
                      <div class="row">
                        <label>Randabstand (Inset / Padding)<br><span style="font-size:10px;color:var(--secondary-text-color)">Negativer Wert macht Glas größer</span></label>
                        <div style="display:flex; align-items:center; width:60%; gap:8px">
                          <input type="range" 
                            min=${(pat.padding_unit || 'px') === '%' ? '-100' : '-50'} 
                            max=${(pat.padding_unit || 'px') === '%' ? '100' : '50'} 
                            step="1" 
                            style="flex:1" 
                            .value=${pat.padding ?? 0} 
                            @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].padding = parseInt(e.target.value); this._commit(n); }}>
                          <span style="font-size:11px; min-width:24px; text-align:right;">${pat.padding ?? 0}</span>
                          <select style="width:60px" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].padding_unit = e.target.value; this._commit(n); }}>
                            <option value="px" ?selected=${pat.padding_unit === 'px' || !pat.padding_unit}>px</option>
                            <option value="%" ?selected=${pat.padding_unit === '%'}>%</option>
                          </select>
                        </div>
                      </div>
                      <div class="row">
                        <label>Eckradius (Border-Radius)</label>
                        <div style="display:flex;width:60%;gap:4px">
                          <input type="number" style="flex:1" .value=${pat.border_radius ?? ''} placeholder="Auto" @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].border_radius = e.target.value; this._commit(n); }}>
                          <select style="width:60px" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].border_radius_unit = e.target.value; this._commit(n); }}>
                            <option value="px" ?selected=${pat.border_radius_unit === 'px'}>px</option>
                            <option value="%" ?selected=${pat.border_radius_unit === '%'}>%</option>
                          </select>
                        </div>
                      </div>
                    ` : ''}

                    <div class="section-title">🍩 Ring- / Donut-Maske</div>
                    <div class="row">
                      <label style="color:var(--primary-color)">Zentrum ausblenden (Harte Kante)<br><span style="font-size:10px;color:var(--secondary-text-color)">Blur & Farbe wirken exakt nur auf dem Rand.</span></label>
                      <ha-switch .checked=${pat.ring_effect ?? false} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].ring_effect = e.target.checked; this._commit(n); }}></ha-switch>
                    </div>
                    ${pat.ring_effect ? html`
                      <div class="row" style="padding-top: 4px;">
                        <label>Eigene Masken-Dicke verwenden<br><span style="font-size:10px;color:var(--secondary-text-color)">Aus = Dicke entspricht exakt der Fasen-Breite (${pat.bevel_width ?? pat.bevel_size ?? 2}px)</span></label>
                        <ha-switch .checked=${pat.use_custom_ring_width ?? false} @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].use_custom_ring_width = e.target.checked; this._commit(n); }}></ha-switch>
                      </div>
                      ${pat.use_custom_ring_width ? html`
                        <div class="row"><label>Masken-Dicke (px)</label>
                          <input type="range" min="1" max="50" step="0.5" style="width:60%" .value=${pat.ring_width ?? 5} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].ring_width = parseFloat(e.target.value); this._commit(n); }}>
                        </div>
                      ` : ''}
                      <div class="row"><label>Effekt-Stärke im Zentrum (%)<br><span style="font-size:10px;color:var(--secondary-text-color)">0 = Blur & Farbe komplett hohl</span></label>
                        <input type="range" min="0" max="100" style="width:60%" .value=${pat.ring_center_opacity ?? 0} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].ring_center_opacity = parseInt(e.target.value); this._commit(n); }}>
                      </div>
                    ` : ''}
                    
                    <div class="section-title">🔍 Optik (Lupe & Wölbung)</div>
                    <div class="row"><label>Inhalt Vergrößern (Zoom)</label>
                      <input type="range" step="0.01" min="1" max="1.5" style="width:60%" .value=${pat.zoom ?? 1} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].zoom = parseFloat(e.target.value); this._commit(n); }}>
                    </div>
                    <div class="row"><label>Konvexer 3D-Glanz (%)</label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${pat.glare ?? 0} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].glare = parseInt(e.target.value); this._commit(n); }}>
                    </div>

                    <div class="section-title">💧 Glas & Blur</div>
                    <div class="row"><label>Blur-Stärke (px)</label>
                      <input type="range" step="0.01" min="0" max="2" style="width:60%" .value=${pat.blur ?? 10} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].blur = parseFloat(e.target.value); this._commit(n); }}>
                    </div>
                    <div class="row"><label>Hintergrund-Deckkraft (%)</label>
                      <input type="range" min="0" max="100" style="width:60%" .value=${pat.opacity ?? 10} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].opacity = parseInt(e.target.value); this._commit(n); }}>
                    </div>
                    <div class="row"><label>Farbe (Hex-Picker)</label>
                      <input type="color" .value=${pat.bg_rgb || '#ffffff'} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].bg_rgb = e.target.value; this._commit(n); }}>
                    </div>

                    <div class="section-title">🌒 Lichtbrechung & Fase (Physik)</div>
                    <div class="row"><label>Glas-Stil</label>
                      <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].shadow_style = e.target.value; this._commit(n); }}>
                        <option value="none" ?selected=${pat.shadow_style === 'none'}>Flach (Keine Kanten)</option>
                        <option value="frosted" ?selected=${pat.shadow_style === 'frosted'}>Frosted (Weiche Kanten)</option>
                        <option value="liquid" ?selected=${pat.shadow_style === 'liquid'}>Liquid (Physikalische Brechung)</option>
                      </select>
                    </div>

                    ${pat.shadow_style !== 'none' ? html`
                      <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px dashed var(--divider-color, #444); display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 8px 0;">
                        <label style="align-self: flex-start; margin-bottom: -4px;">Lichtquelle (Sonne)</label>
                        <sc-shadow-pad
                          .angle=${pat.shadow_angle ?? 90}
                          .distance=${pat.shadow_distance ?? 1}
                          .maxDistance=${5}
                          @pad-change=${e => {
                            const n = JSON.parse(JSON.stringify(patterns));
                            n[idx].shadow_angle = e.detail.angle;
                            n[idx].shadow_distance = e.detail.distance;
                            this._commit(n);
                          }}
                        ></sc-shadow-pad>
                        <div style="display: flex; gap: 16px; font-size: 11px; color: var(--secondary-text-color);">
                          <span>Winkel: <b style="color:var(--primary-color)">${pat.shadow_angle ?? 90}°</b></span>
                          <span>Distanz-Offset: <b style="color:var(--primary-color)">${pat.shadow_distance ?? 1}x</b></span>
                        </div>
                      </div>

                      <div class="row"><label>Fasen-Breite (px)<br><span style="font-size:10px;color:var(--secondary-text-color)">Ausdehnung der Kante nach innen</span></label>
                        <input type="range" step="0.1" min="0" max="30" style="width:60%" .value=${pat.bevel_width ?? pat.bevel_size ?? 2}
                          @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].bevel_width = parseFloat(e.target.value); this._commit(n); }}>
                      </div>
                      
                      <div class="row"><label>Glas-Dicke (Tiefe)<br><span style="font-size:10px;color:var(--secondary-text-color)">Kontrolliert die Steilheit & Refraktion</span></label>
                        <input type="range" step="0.5" min="0" max="20" style="width:60%" .value=${pat.glass_thickness ?? 5}
                          @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].glass_thickness = parseFloat(e.target.value); this._commit(n); }}>
                      </div>

                      <div class="row"><label>Basis-Helligkeit (Licht)</label>
                        <input type="range" step="0.001" min="0" max="1" style="width:60%" .value=${pat.light_brightness ?? 0.4}
                          @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].light_brightness = parseFloat(e.target.value); this._commit(n); }}>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          })}
          
          <button type="button" class="add-btn" @click=${(e) => {
            e.preventDefault(); e.stopPropagation();
            const n = JSON.parse(JSON.stringify(patterns));
            const newId = Date.now();
            n.push({
              id: newId, enabled: true, target: 'none', blur: 10, opacity: 10, padding: 0, padding_unit: 'px',
              border_radius: '', border_radius_unit: 'px', force_square: false, zoom: 1, glare: 0,
              bg_rgb: '#ffffff', shadow_style: 'liquid', light_brightness: 0.4, bevel_width: 2, glass_thickness: 5,
              shadow_angle: 90, shadow_distance: 1,
              manual_override: false, ring_effect: false, use_custom_ring_width: false, ring_width: 5, ring_center_opacity: 0,
              debug_mask: false
            });
            this._commit(n);
            this._expanded = { ...this._expanded, [newId]: true };
            this.requestUpdate();
          }}>＋ Neuen Glas-Effekt hinzufügen</button>
        </div>
      </details>
    `;
  }
}

if (!customElements.get('sc-fx-glass-editor')) customElements.define('sc-fx-glass-editor', ScFxGlassEditor);
ScFxGlassEditor._expandedCache = {};

// --- DAS MODUL ---
window.SupercardModules['fx_glass'] = (() => {

  function getElementSelector(targetId) {
    const id = targetId.replace('elm_', '');
    if (id === 'icon') return 'ha-state-icon, .sc-primary-icon';
    if (id === 'name') return '.sc-lbl-n';
    if (id === 'state') return '.sc-lbl-v';
    if (id.startsWith('gauge_')) return `sc-gauge[data-idx="${id.split('_')[1]}"]`;
    if (id.startsWith('progressbar_')) return `sc-progressbar[data-idx="${id.split('_')[1]}"]`;
    if (id.startsWith('label_')) return `sc-label-${id.split('_')[1]}`;
    return `[slot="${id}"]`;
  }

  function update({ hass, config }) {
    let patterns = Array.isArray(config.fx_glass_patterns) ? config.fx_glass_patterns : [];
    if (patterns.length === 0 && config.fx_glass && config.fx_glass.enabled) {
      patterns = [{ target: 'main', padding_unit: 'px', ...config.fx_glass }];
    }
    if (patterns.length === 0) return {};

    let styleStr = '';

    patterns.forEach(pat => {
      if (!pat.enabled || pat.target === 'none') return;

      const isMain = pat.target === 'main';
      const isDirectElement = pat.target.startsWith('elm_');
      let selector = '';
      if (isMain) selector = 'ha-card';
      else if (isDirectElement) selector = getElementSelector(pat.target);
      else selector = `sc-layout-renderer::part(cell-${pat.target.replace('r', '').replace('c', '-')})`;

      const layerZ = isMain ? 300 : 1400;

      // --- 1. Manuelle Werte auslesen ---
      let padVal = 0, padUnit = 'px';
      let brValue = '', brUnit = 'px';
      
      if (!isDirectElement || pat.manual_override) {
          padVal = pat.padding ?? 0;
          padUnit = pat.padding_unit ?? 'px';
          brValue = pat.border_radius ?? '';
          brUnit = pat.border_radius_unit ?? 'px';
      }

      let autoRadiusFallback = 'inherit';
      let computedForceSquare = pat.force_square ?? false;
      let scaleFactor = 100; 
      
      let isGaugeResponsive = false;
      let gaugeSizePx = 60;

      if (isMain) {
        let cRad = config.supercard?.border_radius ?? config.border_radius;
        autoRadiusFallback = (cRad !== undefined && cRad !== '') ? `${cRad}px` : 'var(--sc-border-radius, var(--ha-card-border-radius, 12px))';
      } else if (isDirectElement && !pat.manual_override) {
        if (pat.target.startsWith('elm_progressbar_')) {
          const pbIdx = parseInt(pat.target.split('_')[2]);
          const pbConf = config.progressbars?.[pbIdx];
          if (pbConf && pbConf.border_radius !== undefined) {
            let val = String(pbConf.border_radius).trim();
            autoRadiusFallback = /^\d+(\.\d+)?$/.test(val) ? `${val}px` : val;
          } else autoRadiusFallback = 'var(--pb-radius, 4px)';
          computedForceSquare = false;
        } else if (pat.target.startsWith('elm_gauge_')) {
          autoRadiusFallback = '50%'; computedForceSquare = true;
          
          const gIdx = parseInt(pat.target.split('_')[2]);
          const gConf = (Array.isArray(config.gauges) && config.gauges[gIdx]) ? config.gauges[gIdx] : config;
          
          isGaugeResponsive = !!gConf.gauge_size_responsive;
          gaugeSizePx = gConf.gauge_size_px ?? 60;
          
          let scaleVal = gConf.gauge_scale ?? gConf.scale;
          if (scaleVal !== undefined) {
            let parsed = parseFloat(String(scaleVal).replace('%', '').trim());
            scaleFactor = (!isNaN(parsed) && parsed > 0 && parsed <= 5) ? parsed * 100 : parsed;
          } else {
            scaleFactor = 90; 
          }
        } else if (pat.target === 'elm_icon') {
          autoRadiusFallback = '50%'; computedForceSquare = true;
          isGaugeResponsive = true; 
        }
      } else if (isDirectElement && pat.manual_override) {
        computedForceSquare = pat.force_square ?? false;
        if (pat.target.startsWith('elm_gauge_') || pat.target === 'elm_icon') autoRadiusFallback = '50%';
        isGaugeResponsive = true;
      }

      // --- DYNAMISCHER EINHEITEN-ÜBERSETZER ---
      const sf = scaleFactor / 100;
      
      const u = (val, unit = 'px') => {
        if (val === 0) return '0px';
        if (unit === '%') return `${val}%`;
        return isGaugeResponsive ? `calc(${val * sf} * 1cqmin)` : `${val * sf}px`;
      };

      const computedInset = u(padVal, padUnit);
      const borderRadius = (brValue !== '') ? u(parseFloat(brValue), brUnit) : autoRadiusFallback;

      // --- 2. Radien & Positionierung ---
      let positioningCSS = '';
      let parentContainerCSS = ''; 

      if (computedForceSquare) {
        let padSubtract = padVal !== 0 ? ` - (${u(padVal, padUnit)} * 2)` : '';
        
        if (isGaugeResponsive) {
          positioningCSS = `
            inset: 0 !important; 
            margin: auto !important; 
            width: calc((100cqmin * ${sf})${padSubtract}) !important; 
            height: calc((100cqmin * ${sf})${padSubtract}) !important;
          `;
          parentContainerCSS = 'container-type: size !important;';
        } else {
          positioningCSS = `
            inset: 0 !important; 
            margin: auto !important; 
            width: calc((${gaugeSizePx}px * ${sf})${padSubtract}) !important; 
            height: calc((${gaugeSizePx}px * ${sf})${padSubtract}) !important;
          `;
        }
      } else {
        positioningCSS = `
          inset: ${computedInset} !important; 
          margin: auto !important; 
          width: calc(100% - (${computedInset} * 2)) !important; 
          height: calc(100% - (${computedInset} * 2)) !important;
        `;
      }

      // --- DEBUG MODUS ---
      let debugPseudoCSS = '';
      if (pat.debug_mask) {
         parentContainerCSS += ` outline: 2px solid #00ff00 !important; background-color: rgba(0, 255, 0, 0.15) !important;`;
         debugPseudoCSS = `outline: 2px dashed #ff00ff !important; outline-offset: 2px; background-color: rgba(255, 0, 255, 0.25) !important;`;
      }

      // --- 3. Styling Werte ---
      const blur = pat.blur !== undefined ? parseFloat(pat.blur) : 10;
      const opacity = (pat.opacity ?? 10) / 100;
      const zoom = pat.zoom !== undefined ? parseFloat(pat.zoom) : 1;
      const glare = (pat.glare ?? 0) / 100;

      let rgbString = '255, 255, 255';
      if (pat.bg_rgb) {
        if (pat.bg_rgb.startsWith('#')) {
          const hex = pat.bg_rgb.replace('#', '');
          rgbString = `${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}`;
        } else rgbString = pat.bg_rgb;
      }

      let backgroundCSS = `rgba(${rgbString}, ${opacity})`;
      if (glare > 0) {
        backgroundCSS = `radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, ${glare}) 0%, rgba(${rgbString}, ${opacity}) 60%)`;
      }

      // --- 4. Physikalische Lichtberechnung & Refraktion-Fake (Komplett ohne Border-Bug!) ---
      const shadowStyle = pat.shadow_style || 'frosted';
      
      const bWidth = pat.bevel_width ?? pat.bevel_size ?? 2;
      const gThick = pat.glass_thickness ?? 5;
      const lBright = pat.light_brightness ?? 0.4;
      
      const sAngle = pat.shadow_angle ?? 90;
      const sDist = pat.shadow_distance ?? 1;
      const sRad = sAngle * Math.PI / 180;
      
      const shadowX = sDist * Math.cos(sRad);
      const shadowY = sDist * Math.sin(sRad);
      const lightX = -shadowX;
      const lightY = -shadowY;

      const steepness = gThick / (bWidth > 0 ? bWidth : 1);
      const edgeLight = Math.min(1, lBright * (1 + steepness * 0.4));
      const edgeShadow = Math.min(1, (lBright * 0.5) * (1 + steepness * 0.4));

      let mainShadow = 'none';
      if (shadowStyle === 'frosted') {
        const s1 = bWidth - 0.5 < 0 ? 0 : bWidth - 0.5;
        // Die harten border-Befehle wurden entfernt und durch ein weiches Inset-Shadowing ersetzt
        mainShadow = `
          inset ${u(lightX * s1)} ${u(lightY * s1)} ${u(bWidth)} 0px rgba(255, 255, 255, ${edgeLight}), 
          inset ${u(shadowX * bWidth)} ${u(shadowY * bWidth)} ${u(bWidth + 1)} 0px rgba(0, 0, 0, ${edgeShadow * 0.5}),
          inset 0 0 0 ${u(bWidth)} rgba(255, 255, 255, 0.05)
        `;
      } else if (shadowStyle === 'liquid') {
        mainShadow = `
          inset ${u(lightX * bWidth)} ${u(lightY * bWidth)} ${u(bWidth)} rgba(255,255,255,${edgeLight * 0.6}),
          inset ${u(shadowX * bWidth)} ${u(shadowY * bWidth)} ${u(bWidth)} rgba(0,0,0,${edgeShadow * 0.4}),
          inset ${u(lightX * (bWidth + 1))} ${u(lightY * (bWidth + 1))} ${u(1)} rgba(255,255,255,${edgeLight}),
          inset ${u(shadowX * (bWidth + 1))} ${u(shadowY * (bWidth + 1))} ${u(1)} rgba(0,0,0,${edgeShadow})
        `;
      }

      // Der Chrome-BugFix: Niemals physische Rahmen verwenden, wenn Blur aktiv ist!
      const faseCSS = 'border: none !important;';

      // --- 5. Maske (Ring-Effekt dynamisch skaliert) ---
      let maskCSS = '';
      if (pat.ring_effect) {
        const useCustom = pat.use_custom_ring_width ?? false;
        const ringSize = useCustom ? (pat.ring_width ?? 5) : (bWidth > 0 ? bWidth : 2);
        const co = (pat.ring_center_opacity ?? 0) / 100;
        const centerColor = co === 0 ? 'transparent' : `rgba(0,0,0,${co})`;
        maskCSS = `
          -webkit-mask-image: radial-gradient(circle closest-side, ${centerColor} calc(100% - ${u(ringSize + 1)}), black calc(100% - ${u(ringSize)})) !important;
          mask-image: radial-gradient(circle closest-side, ${centerColor} calc(100% - ${u(ringSize + 1)}), black calc(100% - ${u(ringSize)})) !important;
        `;
      }

      const applyContentZoom = !isDirectElement || (!pat.target.startsWith('elm_gauge_') && !pat.target.startsWith('elm_progressbar_') && pat.target !== 'elm_icon');

      // --- 6. Content Z-Index Korrektur ---
      let childZIndexCSS = '';
      
      if (isMain) {
        childZIndexCSS = `
          ha-card .supercard-container {
            position: relative !important;
            z-index: 500 !important;
          }
        `;
      } else {
        childZIndexCSS = `
          ${selector} > * {
            position: relative;
            z-index: 700 !important;
            -webkit-backface-visibility: hidden !important;
            backface-visibility: hidden !important;
            ${applyContentZoom ? `
              transform: scale(${zoom}) translateZ(0) !important;
              transform-origin: center center !important;
              transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
            ` : `
              transform: translateZ(0) !important;
            `}
          }
        `;
      }

      // --- 7. CSS Generierung ---
      const repaintAnim = `sc-glass-awake-${pat.id}-${Math.random().toString(36).substring(2,7)}`;
      
      styleStr += `
        @keyframes ${repaintAnim} {
          0% { opacity: 0.99; }
          100% { opacity: 1; }
        }

        ${isMain ? 'ha-card { position: relative !important; background: transparent !important; border: none !important; box-shadow: none !important; isolation: isolate !important; }' : ''}

        ${!isMain ? `
        ${selector} {
          position: relative ${isDirectElement ? '!important' : ''};
          isolation: isolate !important; 
          ${parentContainerCSS}
        }
        ` : ''}

        ${childZIndexCSS}

        ${selector}::after {
          content: '' !important;
          position: absolute !important;
          ${positioningCSS}
          box-sizing: border-box !important;
          z-index: ${layerZ} !important;
          pointer-events: none !important;
          border-radius: ${borderRadius} !important;
          background: ${backgroundCSS} !important;
          box-shadow: ${mainShadow} !important;
          ${faseCSS}
          ${debugPseudoCSS}
          
          animation: ${repaintAnim} 0.5s infinite alternate !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
          
          -webkit-backdrop-filter: blur(${u(blur)}) !important;
          backdrop-filter: blur(${u(blur)}) !important;
          ${maskCSS}
        }
      `;
    });
    return { htmlOverlay: `<style>${styleStr}</style>` };
  }

  function renderCustomBlock(commitFn, hass, slot) {
    return html`<sc-fx-glass-editor .commitFn=${commitFn} .hass=${hass} .slot=${slot}></sc-fx-glass-editor>`;
  }

  function editorFields() { return []; }

  return { update, renderCustomBlock, editorFields };
})();