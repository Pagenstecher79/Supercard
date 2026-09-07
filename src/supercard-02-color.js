import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

// --- HELPER FUNCTIONS ---
function getAvailableElements(slot) {
  const elements = { 'empty': 'Empty', 'icon': 'Icon', 'name': 'Entity name', 'state': 'State (value)' };
  const gaugeCount = Array.isArray(slot.gauges) ? slot.gauges.length : (slot.gauge_active ? 1 : 0);
  for (let i = 0; i < gaugeCount; i++) elements[`gauge_${i}`] = `Gauge ${i + 1}`;
  if (Array.isArray(slot.labels_list)) {
    slot.labels_list.forEach((l, idx) => {
      elements[`label_${idx}`] = `Label: ${l.label_text || l.entity || idx + 1}`;
    });
  }
  return elements;
}

function getTargets(slot) {
  const targets = [
    { id: 'none', label: '— Please select a target —' },
    { id: 'main', label: 'Main card (entire background)' }
  ];
  const els = getAvailableElements(slot);
  if (Array.isArray(slot.layout_rows)) {
    slot.layout_rows.forEach((row, rIdx) => {
      row.cells.forEach((cell, cIdx) => {
        const typeLabel = els[cell.content] || 'Empty';
        targets.push({ id: `r${rIdx}c${cIdx}`, label: `R${rIdx+1}C${cIdx+1} (${typeLabel})` });
      });
    });
  }
  return targets;
}

// --- THE EDITOR ---
class ScColorEditor extends LitElement {
  static get properties() {
    return {
      slot:      { type: Object },
      hass:      { type: Object },
      _expanded: { type: Object, state: true }
    };
  }

  constructor() {
    super();
    this._expanded = {}; // Fresh state per instance
  }

  static get styles() {
    return css`
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

  _commit(newList) {
    this.dispatchEvent(new CustomEvent('color-update', { detail: { color_patterns: newList } }));
  }

  _toggle(id, e) {
    if (e) e.stopPropagation();
    this._expanded = { ...this._expanded, [id]: !this._expanded[id] };
  }

  render() {
    if (!this.slot) return html``;
    const patterns = Array.isArray(this.slot.color_patterns) ? this.slot.color_patterns : [];
    const targets = getTargets(this.slot);
    const usedTargets = patterns.map(p => p.target).filter(t => t !== 'none');

    return html`
      <details class="inner-section">
        <summary>🎨 Colors, Patterns &amp; Animations <span style="font-size:10px">▼</span></summary>
        <div class="inner-content">
          ${patterns.map((pat, idx) => {
            const isExp = !!this._expanded[pat.id];
            const targetLabel = targets.find(t => t.id === pat.target)?.label || 'Unknown target';

            const isWaveOrRipple = ['ripple', 'waves'].includes(pat.animation);
            const isWobble       = ['wobble_radial', 'wobble_linear'].includes(pat.animation);
            const usesWaveColors = isWaveOrRipple || isWobble;

            const needsRadialCenter = pat.bg_type === 'radial' || pat.animation === 'ripple' || pat.animation === 'wobble_radial';
            const needsAngle        = pat.bg_type === 'linear' || pat.animation === 'waves' || pat.animation === 'wobble_linear';

            const isAutoBorder = pat.border_radius_auto === undefined ? (pat.target === 'main') : pat.border_radius_auto;

            return html`
              <div class="pattern-card">
                <div class="pattern-header" @click=${e => this._toggle(pat.id, e)}>
                  <div>
                    <span class="toggle-icon">${isExp ? '▼' : '▶'}</span>
                    <span style="color:${pat.enabled ? 'var(--primary-text-color)' : 'var(--secondary-text-color)'}">${pat.name || 'New pattern'}</span>
                    <span style="font-size:10px;color:${pat.target === 'none' ? '#f44' : 'var(--secondary-text-color)'};margin-left:8px;font-weight:normal">(${targetLabel})</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <ha-switch .checked=${!!pat.enabled}
                      @click=${e => e.stopPropagation()}
                      @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].enabled = e.target.checked; this._commit(n); }}>
                    </ha-switch>

                    <button type="button" title="Clone" @click=${e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const n = JSON.parse(JSON.stringify(patterns));
                      const clone = JSON.parse(JSON.stringify(pat));
                      clone.id = Date.now();
                      clone.target = 'none';
                      clone.name = (clone.name || 'Pattern') + ' (Copy)';
                      n.splice(idx + 1, 0, clone);
                      this._commit(n);
                      this._expanded = { ...this._expanded, [clone.id]: true };
                    }} style="background:none;border:none;color:var(--primary-color);cursor:pointer;padding:4px;font-size:14px;">⧉</button>

                    <button @click=${e => { e.stopPropagation(); const n = [...patterns]; n.splice(idx, 1); this._commit(n); }}
                      style="background:none;border:none;color:#f44;cursor:pointer;padding:4px">✕</button>
                  </div>
                </div>

                ${isExp ? html`
                  <div class="pattern-content" style="display:flex; flex-direction:column; gap:8px;">
                    <div class="col">
                      <label>Name (internal)</label>
                      <input type="text" .value=${pat.name || ''} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].name = e.target.value; this._commit(n); }}>
                    </div>
                    <div class="row">
                      <label>Target container</label>
                      <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].target = e.target.value; this._commit(n); }}>
                        ${targets.map(t => {
                          const isLocked = t.id !== 'none' && t.id !== pat.target && usedTargets.includes(t.id);
                          return html`<option value=${t.id} ?selected=${pat.target === t.id} ?disabled=${isLocked}>
                            ${t.label} ${isLocked ? '(Already in use)' : ''}
                          </option>`;
                        })}
                      </select>
                    </div>

                    <details class="inner-section"  style="margin-top: 4px; margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>🎨 Design &amp; Colors</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="row">
                          <label>Automatic corner radius</label>
                          <ha-switch .checked=${isAutoBorder}
                            @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].border_radius_auto = e.target.checked; this._commit(n); }}>
                          </ha-switch>
                        </div>

                        ${!isAutoBorder ? html`
                          <div class="row">
                            <label>Corner radius (manual)</label>
                            <div style="display:flex;width:60%;gap:4px">
                              <input type="number" style="flex:1" .value=${pat.border_radius ?? ''} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].border_radius = e.target.value; this._commit(n); }}>
                              <select style="width:60px" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].border_radius_unit = e.target.value; this._commit(n); }}>
                                <option value="px" ?selected=${pat.border_radius_unit === 'px'}>px</option>
                                <option value="%" ?selected=${pat.border_radius_unit === '%'}>%</option>
                              </select>
                            </div>
                          </div>
                        ` : ''}

                        ${usesWaveColors ? html`
                          <div class="info-text" style="margin-top:0;">The colors are calculated dynamically by the effect.</div>
                          <div class="row"><label>Count (density)</label>
                            <input type="range" min="1" max="20" style="width:60%" .value=${pat.wave_count ?? 3}
                              @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_count = parseInt(e.target.value); this._commit(n); }}>
                          </div>
                          <div class="row"><label>Balance (peak vs. trough)</label>
                            <input type="range" min="5" max="95" style="width:60%" .value=${pat.wave_balance ?? 50}
                              @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_balance = parseInt(e.target.value); this._commit(n); }}>
                          </div>
                          <div class="col"><label>Line/wave color (peak)</label>
                            <div class="color-row">
                              <input type="color" .value=${pat.wave_c1 || '#03a9f4'} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_c1 = e.target.value; this._commit(n); }}>
                              <input type="text" .value=${pat.wave_c1 || '#03a9f4'} style="flex:1" @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_c1 = e.target.value; this._commit(n); }}>
                            </div>
                          </div>
                          <div class="col"><label>Background color (trough)</label>
                            <div class="color-row">
                              <input type="color" .value=${pat.wave_c2 || '#transparent'} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_c2 = e.target.value; this._commit(n); }}>
                              <input type="text" .value=${pat.wave_c2 || 'transparent'} style="flex:1" @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_c2 = e.target.value; this._commit(n); }}>
                            </div>
                          </div>
                          <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:4px;">Gradient preview</div>
                          <div style="height:10px;border-radius:5px; background:${
                            needsAngle
                            ? `repeating-linear-gradient(${pat.gradient_angle ?? 90}deg, ${pat.wave_c1||'#03a9f4'} 0%, ${pat.wave_c2||'transparent'} 50%, ${pat.wave_c1||'#03a9f4'} 100%)`
                            : `repeating-radial-gradient(circle at ${pat.radial_x??50}% ${pat.radial_y??50}%, ${pat.wave_c1||'#03a9f4'} 0%, ${pat.wave_c2||'transparent'} 50%, ${pat.wave_c1||'#03a9f4'} 100%)`
                          }"></div>
                        ` : html`
                          ${pat.animation !== 'fluid' ? html`
                            <div class="row"><label>Background type</label>
                              <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].bg_type = e.target.value; this._commit(n); }}>
                                <option value="solid"          ?selected=${pat.bg_type === 'solid'}>Solid (static)</option>
                                <option value="solid_gradient" ?selected=${pat.bg_type === 'solid_gradient'}>Solid (dynamic from gradient)</option>
                                <option value="linear"         ?selected=${pat.bg_type === 'linear'}>Gradient (linear)</option>
                                <option value="radial"         ?selected=${pat.bg_type === 'radial'}>Gradient (radial)</option>
                              </select>
                            </div>
                          ` : html`
                            <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:4px;">🌊 Fluid mode (dynamic mesh)</div>
                            <div class="info-text" style="color:var(--secondary-text-color); margin-top:0;">Generates an endless, organically flowing vector animation.</div>
                            <div class="row" style="margin-top:4px;">
                              <label>Fluid style (viscosity)</label>
                              <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].fluid_style = e.target.value; this._commit(n); }}>
                                <option value="aurora" ?selected=${!pat.fluid_style || pat.fluid_style === 'aurora'}>Aurora (gentle mesh, GentleRain)</option>
                                <option value="gooey"  ?selected=${pat.fluid_style === 'gooey'}>Liquid (lava/water, WbONyK)</option>
                                <option value="smoke"     ?selected=${pat.fluid_style === 'smoke'}>Smoke / fog</option>
                                <option value="particles" ?selected=${pat.fluid_style === 'particles'}>Particles / stardust</option>
                                </select>
                            </div>
                          `}

                          <div class="col"><label>Colors</label>
                            <div class="color-list">
                              ${pat.colors.map((c, cIdx) => {
                                const defaultStop = Math.round((100 / (pat.colors.length > 1 ? pat.colors.length - 1 : 1)) * cIdx);
                                const currentStop = pat.stops?.[cIdx] ?? defaultStop;
                                return html`
                                  <div class="color-item">
                                    <div class="color-item-row">
                                      <input type="color" .value=${c} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].colors[cIdx] = e.target.value; this._commit(n); }}>
                                      <input type="text"  .value=${c} style="flex:1" @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].colors[cIdx] = e.target.value; this._commit(n); }}>
                                      ${(pat.colors.length > 1 && (pat.bg_type !== 'solid' || pat.animation === 'fluid')) ? html`<button class="del-color-btn" @click=${() => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].colors.splice(cIdx,1); if (n[idx].stops) n[idx].stops.splice(cIdx,1); this._commit(n); }}>✕</button>` : ''}
                                    </div>
                                    ${(pat.bg_type !== 'solid' || pat.animation === 'fluid') ? html`
                                      <div class="color-item-row" style="padding:2px 4px 0 4px;border-top:1px solid rgba(255,255,255,0.05);margin-top:4px">
                                        <span style="font-size:10px;color:var(--secondary-text-color)">${pat.animation === 'fluid' ? 'Radius (size)' : 'Stop'}</span>
                                        <input type="range" min="0" max="100" style="flex:1" .value=${currentStop}
                                          @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); if (!n[idx].stops) n[idx].stops = n[idx].colors.map((_,i) => Math.round((100/(n[idx].colors.length>1?n[idx].colors.length-1:1))*i)); n[idx].stops[cIdx] = parseInt(e.target.value); this._commit(n); }}>
                                        <span style="font-size:10px;width:24px;text-align:right">${currentStop}%</span>
                                      </div>` : ''}
                                  </div>`;
                              })}
                            </div>
                            ${(pat.bg_type !== 'solid' || pat.animation === 'fluid') ? html`
                              <div style="display:flex;gap:6px">
                                <button class="add-color-btn" @click=${() => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].colors.push('#03a9f4'); if (n[idx].stops) n[idx].stops.push(100); this._commit(n); }}>＋ Add color</button>
                                ${pat.colors.length > 1 ? html`<button class="action-btn" @click=${() => { const n = JSON.parse(JSON.stringify(patterns)); const len = n[idx].colors.length; n[idx].stops = n[idx].colors.map((_,i) => Math.round((100/(len-1))*i)); this._commit(n); }}>⟷ Distribute stops</button>` : ''}
                              </div>
                              ${ (pat.colors.length > 1 && pat.animation !== 'fluid') ? html`
                              <div style="font-size:11px; font-weight:bold; color:var(--primary-color); margin-top:8px;">Gradient preview</div>
                              <div style="height:10px;border-radius:5px;
                                background:linear-gradient(${pat.bg_type==='radial'?`circle at ${pat.radial_x??50}% ${pat.radial_y??50}%`:`${pat.gradient_angle??90}deg`},
                                ${pat.colors.map((c,i)=>`${c} ${pat.stops?.[i]??Math.round((100/(pat.colors.length-1))*i)}%`).join(',')})"></div>` : ''}
                            ` : ''}
                          </div>
                        `}

                        ${needsAngle ? html`
                          <div class="row" style="margin-top:8px;"><label>Angle (degrees)</label>
                            <input type="range" min="0" max="360" style="width:60%" .value=${pat.gradient_angle ?? 90}
                              @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].gradient_angle = parseInt(e.target.value); this._commit(n); }}>
                          </div>` : ''}

                        <div class="row">
                          <label>Opacity (%)</label>
                          <input type="range" min="0" max="100" style="width:60%" .value=${pat.opacity ?? 100}
                            @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].opacity = parseInt(e.target.value); this._commit(n); }}>
                        </div>
                      </div>
                    </details>

                    ${pat.bg_type === 'solid_gradient' && pat.animation !== 'fluid' ? html`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>📊 Data source for color calculation</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">

                          <div class="col" style="margin-bottom: 4px;">
                            <label style="font-size:11px; color:var(--secondary-text-color);">Data source</label>
                            <select style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].global_id = e.target.value; this._commit(n); }}>
                              <option value="manual" ?selected=${pat.global_id === 'manual' || !pat.global_id}>Manual selection</option>
                              ${(this.slot?.global_entities || []).map(ge => {
                                const stateObj = ge.entity ? this.hass.states[ge.entity] : null;
                                const name = ge.alias || stateObj?.attributes?.friendly_name || ge.entity || 'Unnamed';
                                let val = stateObj ? stateObj.state : '-';
                                if (stateObj && ge.attribute && stateObj.attributes[ge.attribute] !== undefined) {
                                  val = stateObj.attributes[ge.attribute];
                                }
                                const uom = (!ge.attribute && stateObj?.attributes?.unit_of_measurement) ? ` ${stateObj.attributes.unit_of_measurement}` : '';
                                const attrLabel = ge.attribute ? ` (${ge.attribute})` : '';
                                const label = `[${ge.alias || 'Alias'}] ${name}${attrLabel}: ${val}${uom}`;

                                return html`<option value=${ge.id} ?selected=${pat.global_id === ge.id}>${label}</option>`;
                              })}
                            </select>
                          </div>

                          ${(!pat.global_id || pat.global_id === 'manual') ? html`
                            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333);">
                              <ha-selector .hass=${this.hass} .selector=${{entity:{}}}
                                .value=${pat.gradient_entity||''} .label=${'Entity (value source)'}
                                @value-changed=${e => { const n=JSON.parse(JSON.stringify(patterns)); n[idx].gradient_entity=e.detail.value; this._commit(n); }}>
                              </ha-selector>
                              <div style="margin-top:8px;">
                                <ha-selector .hass=${this.hass}
                                  .selector=${{attribute:{entity_id: pat.gradient_entity||''}}}
                                  .value=${pat.gradient_entity_attribute||''} .label=${'Attribute (optional)'}
                                  @value-changed=${e => { const n=JSON.parse(JSON.stringify(patterns)); n[idx].gradient_entity_attribute=e.detail.value||undefined; this._commit(n); }}>
                                </ha-selector>
                              </div>
                            </div>
                          ` : ''}

                          <div class="row" style="margin-top:4px; gap:12px;">
                            <div class="col" style="flex:1;">
                              <label style="font-size:11px; color:var(--secondary-text-color);">Min (0%)</label>
                              <input type="number" step="0.1" .value=${pat.gradient_entity_min??0}
                                @input=${e=>{ const n=JSON.parse(JSON.stringify(patterns)); n[idx].gradient_entity_min=parseFloat(e.target.value); this._commit(n); }}>
                            </div>
                            <div class="col" style="flex:1;">
                              <label style="font-size:11px; color:var(--secondary-text-color);">Max (100%)</label>
                              <input type="number" step="0.1" .value=${pat.gradient_entity_max??100}
                                @input=${e=>{ const n=JSON.parse(JSON.stringify(patterns)); n[idx].gradient_entity_max=parseFloat(e.target.value); this._commit(n); }}>
                            </div>
                          </div>
                        </div>
                      </details>
                    ` : ''}

                    ${needsRadialCenter ? html`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>📍 Center / origin</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">
                          <div class="info-text" style="margin-top:0;">Tap or drag inside the box to freely move the origin point.</div>
                          <div class="pos-preview-wrap">
                            <div class="pos-preview"
                              @pointerdown=${e => {
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                const updatePos = (ev) => {
                                  ev.stopPropagation();
                                  const rect = ev.currentTarget.getBoundingClientRect();
                                  let pctX = Math.round((Math.max(0,Math.min(ev.clientX-rect.left,rect.width)) / rect.width) * 100);
                                  let pctY = Math.round((Math.max(0,Math.min(ev.clientY-rect.top,rect.height)) / rect.height) * 100);
                                  if (pctX !== (pat.radial_x ?? 50) || pctY !== (pat.radial_y ?? 50)) {
                                    const n = JSON.parse(JSON.stringify(patterns));
                                    n[idx].radial_x = pctX; n[idx].radial_y = pctY;
                                    this._commit(n);
                                  }
                                };
                                updatePos(e);
                                e.currentTarget.onpointermove = updatePos;
                              }}
                              @pointerup=${e => { e.stopPropagation(); e.currentTarget.onpointermove = null; e.currentTarget.releasePointerCapture(e.pointerId); }}
                              @pointercancel=${e => { e.stopPropagation(); e.currentTarget.onpointermove = null; }}>
                              <div class="pos-dot" style="left:${pat.radial_x ?? 50}%;top:${pat.radial_y ?? 50}%"></div>
                            </div>
                            <button class="icon-btn" title="Center (50/50)"
                              @click=${() => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].radial_x = 50; n[idx].radial_y = 50; this._commit(n); }}>
                              <ha-icon icon="mdi:crosshairs-gps" style="--mdc-icon-size:20px"></ha-icon>
                            </button>
                          </div>
                          <div class="row">
                            <div class="col" style="flex:1;margin-right:8px">
                              <label style="font-size:10px">X-axis (${pat.radial_x ?? 50}%)</label>
                              <input type="range" min="0" max="100" .value=${pat.radial_x ?? 50} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].radial_x = parseInt(e.target.value); this._commit(n); }}>
                            </div>
                            <div class="col" style="flex:1">
                              <label style="font-size:10px">Y-axis (${pat.radial_y ?? 50}%)</label>
                              <input type="range" min="0" max="100" .value=${pat.radial_y ?? 50} @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].radial_y = parseInt(e.target.value); this._commit(n); }}>
                            </div>
                          </div>
                        </div>
                      </details>
                    ` : ''}

                    <details class="inner-section" style="margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>⚙️ Condition: show background</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="info-text" style="margin-top:0;">Without a condition the background is always visible.</div>
                        <ha-selector .hass=${this.hass} .selector=${{ condition: {} }} .value=${pat.bg_condition}
                          @value-changed=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].bg_condition = e.detail.value; this._commit(n); }}>
                        </ha-selector>
                      </div>
                    </details>

                    <details class="inner-section" style="margin-bottom: 0;">
                      <summary style="font-size: 13px; color: var(--primary-color);"><span>🎬 Animation &amp; mode</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                      <div class="inner-content" style="gap: 8px;">
                        <div class="row"><label>Effect</label>
                          <select style="width:60%" @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].animation = e.target.value; this._commit(n); }}>
                            <option value="none"           ?selected=${pat.animation==='none'}>None (background only)</option>
                            <option value="pulse"          ?selected=${pat.animation==='pulse'}>Pulse (opacity)</option>
                            <option value="pump"           ?selected=${pat.animation==='pump'}>Pump (scale in/out)</option>
                            <option value="ripple"         ?selected=${pat.animation==='ripple'}>Rings (concentric)</option>
                            <option value="waves"          ?selected=${pat.animation==='waves'}>Waves (linear traveling)</option>
                            <option value="wobble_radial"  ?selected=${pat.animation==='wobble_radial'}>Water drop (radial fade-out)</option>
                            <option value="wobble_linear"  ?selected=${pat.animation==='wobble_linear'}>Shockwave (linear fade-out)</option>
                            <option value="fluid"          ?selected=${pat.animation==='fluid'}>Liquid (undulating mesh)</option>
                          </select>
                        </div>

                        ${isWobble ? html`
                          <div class="row" style="background:rgba(3,169,244,0.1); padding:8px; border-radius:6px; margin-top:4px;">
                            <div class="col" style="width:100%; gap:12px;">
                              <div class="row" style="margin:0"><label>Start amplitude (contrast)</label>
                                <input type="range" min="1" max="100" style="width:60%" .value=${pat.wobble_amplitude ?? 100}
                                  @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wobble_amplitude = parseInt(e.target.value); this._commit(n); }}>
                              </div>
                              <div class="row" style="margin:0"><label>Range (spread)</label>
                                <input type="range" min="1" max="10" style="width:60%" .value=${pat.wobble_freq ?? 4}
                                  @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wobble_freq = parseInt(e.target.value); this._commit(n); }}>
                              </div>
                              <div class="row" style="margin:0"><label>Pause after effect (sec.)</label>
                                <input type="range" step="0.5" min="0" max="10" style="width:60%" .value=${pat.wobble_pause ?? 2}
                                  @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wobble_pause = parseFloat(e.target.value); this._commit(n); }}>
                              </div>
                            </div>
                          </div>
                        ` : ''}

                        ${pat.animation !== 'none' ? html`
                          <div class="row" style="margin-top:4px"><label>${isWobble ? 'Fade-out time (duration in sec.)' : 'Speed (sec.)'}</label>
                            <input type="range" step="0.1" min="0.5" max="20" style="width:60%" .value=${pat.anim_duration ?? 3}
                              @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].anim_duration = parseFloat(e.target.value); this._commit(n); }}>
                          </div>` : ''}

                        ${pat.animation === 'pump' ? html`
                          <div class="row"><label>Pump expansion</label>
                            <input type="range" step="0.001" min="1.0" max="1.2" style="width:60%" .value=${pat.pump_scale ?? 1.1}
                              @input=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].pump_scale = parseFloat(e.target.value); this._commit(n); }}>
                          </div>` : ''}

                        ${isWaveOrRipple ? html`
                          <div class="row"><label>Reverse direction</label>
                            <ha-switch .checked=${!!pat.wave_invert}
                              @change=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].wave_invert = e.target.checked; this._commit(n); }}>
                            </ha-switch>
                          </div>` : ''}
                      </div>
                    </details>

                    ${pat.animation !== 'none' ? html`
                      <details class="inner-section" style="margin-bottom: 0;">
                        <summary style="font-size: 13px; color: var(--primary-color);"><span>⚙️ Condition: run animation</span><span style="font-size:10px; color:var(--secondary-text-color);">▼</span></summary>
                        <div class="inner-content" style="gap: 8px;">
                          <div class="info-text" style="margin-top:0;">Without a condition the animation is always active.</div>
                          <ha-selector .hass=${this.hass} .selector=${{ condition: {} }} .value=${pat.anim_condition}
                            @value-changed=${e => { const n = JSON.parse(JSON.stringify(patterns)); n[idx].anim_condition = e.detail.value; this._commit(n); }}>
                          </ha-selector>
                        </div>
                      </details>
                    ` : ''}

                  </div>
                ` : ''}
              </div>
            `;
          })}
          <button class="add-btn" @click=${() => {
            const n = [...patterns];
            const newId = Date.now();
            n.push({
              id: newId, enabled: true, name: 'New pattern', target: 'none',
              bg_condition: [], anim_condition: [], bg_type: 'solid',
              colors: ['#ff9800'], stops: [100], opacity: 100, gradient_angle: 90, animation: 'none',
              anim_duration: 3, wave_count: 3, wave_c1: '#03a9f4', wave_c2: 'transparent',
              border_radius: '', border_radius_unit: 'px', wave_invert: false, pump_scale: 1.1,
              radial_x: 50, radial_y: 50, wave_balance: 50,
              wobble_amplitude: 100, wobble_freq: 4, wobble_pause: 2
            });
            this._commit(n);
            this._expanded = { ...this._expanded, [newId]: true };
          }}>＋ Add new pattern</button>
        </div>
      </details>
    `;
  }
}

if (!customElements.get('sc-color-editor')) {
  customElements.define('sc-color-editor', ScColorEditor);
}

class ScColorStyler extends LitElement {
  static get properties() {
    return { cssText: { type: String } };
  }

  createRenderRoot() { return this; }

  render() {
    return html`<style>${this.cssText || ''}</style>`;
  }
}

if (!customElements.get('sc-color-styler')) {
  customElements.define('sc-color-styler', ScColorStyler);
}

// --- THE MODULE ---
window.SupercardModules['color'] = (() => {

  const _hexToRgb = hex => { const h = hex.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
  const _rgbToHex = (r,g,b) => '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');

  function sampleGradient(stops, pct) {
    const sorted = [...stops].sort((a,b)=>a.pos-b.pos);
    const pos = pct*100;
    if (pos<=sorted[0].pos) return sorted[0].color;
    if (pos>=sorted[sorted.length-1].pos) return sorted[sorted.length-1].color;
    for (let i=0;i<sorted.length-1;i++){
      const lo=sorted[i],hi=sorted[i+1];
      if(pos>=lo.pos&&pos<=hi.pos){
        const t=(pos-lo.pos)/(hi.pos-lo.pos);
        const [r1,g1,b1]=_hexToRgb(lo.color),[r2,g2,b2]=_hexToRgb(hi.color);
        return _rgbToHex(r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t);
      }
    }
    return sorted[sorted.length-1].color;
  }

  function evaluateCondition(hass, c) {
    if (!c) return true;
    if (Array.isArray(c)) {
      if (c.length === 0) return true;
      return c.every(cond => evaluateCondition(hass, cond));
    }
    if (!c.condition) return true;
    try {
      if (c.condition === 'state') {
        const s = hass.states[c.entity_id];
        if (!s) return false;
        const val = c.attribute ? s.attributes[c.attribute] : s.state;
        return String(val).toLowerCase() === String(c.state).toLowerCase();
      }
      if (c.condition === 'numeric_state') {
        const s = hass.states[c.entity_id];
        if (!s) return false;
        const val = parseFloat(c.attribute ? s.attributes[c.attribute] : s.state);
        if (isNaN(val)) return false;
        if (c.above !== undefined && c.above !== '' && val <= parseFloat(c.above)) return false;
        if (c.below !== undefined && c.below !== '' && val >= parseFloat(c.below)) return false;
        return true;
      }
      if (c.condition === 'and') return (c.conditions || []).every(x => evaluateCondition(hass, x));
      if (c.condition === 'or')  return (c.conditions || []).some(x => evaluateCondition(hass, x));
      if (c.condition === 'not') {
        const inner = c.conditions && c.conditions.length > 0 ? c.conditions[0] : null;
        return inner ? !evaluateCondition(hass, inner) : true;
      }
    } catch (e) { return false; }
    return true;
  }

  function update({ hass, config }) {
    const patterns = Array.isArray(config.color_patterns) ? config.color_patterns : [];
    let styleStr = '';

    styleStr += `@keyframes sc-pattern-pulse {
      0%, 100% { opacity: var(--pat-op, 1); }
      50%       { opacity: calc(var(--pat-op, 1) * 0.3); }
    }\n`;

    // LAYER SYSTEM: cleanly set up the 500 range
    const hasMain = patterns.some(p => p.enabled && p.target === 'main');
    if (hasMain) {
      styleStr += `
        ha-card { position: relative !important; background: transparent !important; border: none !important; box-shadow: none !important; }
      \n`;
    }

    // Always anchor the base container at 500
    styleStr += `
      .supercard-container { position: relative !important; z-index: 500 !important; background: transparent !important; }
    \n`;

    patterns.forEach((pat, idx) => {
      if (!pat.enabled || pat.target === 'none') return;

      const bgActive   = (pat.bg_condition && Object.keys(pat.bg_condition).length > 0) ? evaluateCondition(hass, pat.bg_condition) : true;
      const animActive = (pat.anim_condition && Object.keys(pat.anim_condition).length > 0) ? evaluateCondition(hass, pat.anim_condition) : true;
      if (!bgActive) return;

      let selector = '';
      const isMain = pat.target === 'main';

      if (isMain) {
        selector = 'ha-card::before';
      } else {
        const match = pat.target.match(/r(\d+)c(\d+)/);
        if (match) {
          const partSel = `sc-layout-renderer::part(cell-${match[1]}-${match[2]})`;
          selector = `${partSel}::before`;

          // CELL: gets z-index 510 as a solid foundation. No isolation hack needed anymore!
          styleStr += `
            ${partSel} {
              position: relative !important;
              z-index: 510 !important;
              background: transparent !important;
            }
          \n`;
        }
      }
      if (!selector) return;

      let bgValue = 'transparent';
      let animValue = 'none';
      const speed = pat.anim_duration || 3;

      const isWaveOrRipple = ['ripple', 'waves'].includes(pat.animation);
      const isWobble       = ['wobble_radial', 'wobble_linear'].includes(pat.animation);
      const usesWaveColors = isWaveOrRipple || isWobble;

      let allowImportantOnBg = !isWaveOrRipple && !isWobble;

      const rx = pat.radial_x ?? 50;
      const ry = pat.radial_y ?? 50;

      if (usesWaveColors) {
        const count    = pat.wave_count || 3;
        const baseStep = 100 / count;
        const balance  = (pat.wave_balance ?? 50) / 100;
        const c1       = pat.wave_c1 || '#03a9f4';
        const c2       = pat.wave_c2 || 'transparent';

        if (isWobble) {
          const startAmp = (pat.wobble_amplitude ?? 100) / 100;
          const freqMod  = pat.wobble_freq ?? 4;
          const pause    = pat.wobble_pause ?? 2;

          const activeDuration = speed;
          const totalDuration  = activeDuration + pause;
          const activePct      = activeDuration / totalDuration;

          bgValue = c2;

          if (animActive) {
            const animName = `sc-anim-wobble-${pat.id}-${idx}`;
            let kf = `@keyframes ${animName} {\n`;

            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const phase = i / steps;
                const kfPercent = (phase * activePct * 100).toFixed(1);

                const dampening = Math.pow(1 - phase, 2);
                const currentAmp = startAmp * dampening;
                const mixPct = (currentAmp * 100).toFixed(1);
                const activeColor = `color-mix(in srgb, ${c1} ${mixPct}%, ${c2})`;

                const currentStep = baseStep * (1 - phase * 0.3);

                const easeOut = 1 - Math.pow(1 - phase, 3);
                const shift = easeOut * freqMod * baseStep;

                const s1 = shift.toFixed(2);
                const s2 = (shift + currentStep * balance).toFixed(2);
                const s3 = (shift + currentStep).toFixed(2);

                const spreadPct = (easeOut * 150).toFixed(1);
                const fadeStart = Math.max(0, spreadPct - 15).toFixed(1);

                let bgStr = '';
                if (pat.animation === 'wobble_linear') {
                    const mask = `linear-gradient(${pat.gradient_angle ?? 90}deg, transparent ${fadeStart}%, ${c2} ${spreadPct}%)`;
                    const wave = `repeating-linear-gradient(${pat.gradient_angle ?? 90}deg, ${activeColor} ${s1}%, ${c2} ${s2}%, ${activeColor} ${s3}%)`;
                    bgStr = `${mask}, ${wave}`;
                } else {
                    const mask = `radial-gradient(circle at ${rx}% ${ry}%, transparent ${fadeStart}%, ${c2} ${spreadPct}%)`;
                    const wave = `repeating-radial-gradient(circle at ${rx}% ${ry}%, ${activeColor} ${s1}%, ${c2} ${s2}%, ${activeColor} ${s3}%)`;
                    bgStr = `${mask}, ${wave}`;
                }

                kf += `  ${kfPercent}% { background: ${bgStr}; }\n`;
            }
            if (pause > 0) { kf += `  100% { background: ${c2}; }\n`; }
            kf += `}\n`;

            styleStr += kf;
            animValue = `${animName} ${totalDuration}s infinite linear`;
          }
        } else {
          if (animActive && pat.animation !== 'none') {
            const animName = `sc-anim-wave-${pat.id}-${idx}`;
            let kf = `@keyframes ${animName} {\n`;
            for (let i = 0; i <= 100; i += (100 / 240)) {
              const phase = pat.wave_invert ? (1 - i / 100) : (i / 100);
              const shift = phase * baseStep;
              const s1 = shift.toFixed(2);
              const s2 = (shift + baseStep * balance).toFixed(2);
              const s3 = (shift + baseStep).toFixed(2);
              const bg = pat.animation === 'waves'
                ? `repeating-linear-gradient(${pat.gradient_angle || 90}deg, ${c1} ${s1}%, ${c2} ${s2}%, ${c1} ${s3}%)`
                : `repeating-radial-gradient(circle at ${rx}% ${ry}%, ${c1} ${s1}%, ${c2} ${s2}%, ${c1} ${s3}%)`;
              kf += `  ${i.toFixed(2)}% { background: ${bg}; }\n`;
            }
            kf += `}\n`;
            styleStr += kf;
            animValue = `${animName} ${speed}s infinite linear`;
          }
          bgValue = pat.animation === 'waves'
            ? `repeating-linear-gradient(${pat.gradient_angle || 90}deg, ${c1} 0%, ${c2} ${baseStep * balance}%, ${c1} ${baseStep}%)`
            : `repeating-radial-gradient(circle at ${rx}% ${ry}%, ${c1} 0%, ${c2} ${baseStep * balance}%, ${c1} ${baseStep}%)`;
        }

      } else {
        const safeColors   = pat.colors && pat.colors.length > 0 ? pat.colors : ['#000000'];
        const stops        = pat.stops || [];
        const colorStopsStr = safeColors.map((c, i) => stops[i] !== undefined ? `${c} ${stops[i]}%` : c).join(', ');

        if (pat.animation === 'fluid') {
          const isGooey = pat.fluid_style === 'gooey';
          const isSmoke = pat.fluid_style === 'smoke';
          const isParticles = pat.fluid_style === 'particles';
          const isAurora = !isGooey && !isSmoke && !isParticles;

          let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' preserveAspectRatio='none'>`;
          svg += `<defs>`;

          if (isGooey) {
            svg += `<filter id='goo_${pat.id}'>
                      <feGaussianBlur in='SourceGraphic' stdDeviation='15' result='blur'/>
                      <feColorMatrix in='blur' mode='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12' result='goo'/>
                    </filter>`;
          } else if (isSmoke) {
            svg += `<filter id='smoke_${pat.id}' x='-20%' y='-20%' width='140%' height='140%'>
                      <feTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' result='noise'/>
                      <feDisplacementMap in='SourceGraphic' in2='noise' scale='40' xChannelSelector='R' yChannelSelector='G'/>
                      <feGaussianBlur stdDeviation='12' result='blur'/>
                      <feComponentTransfer><feFuncA type='linear' slope='0.8'/></feComponentTransfer>
                    </filter>`;
          } else if (isAurora) {
            const actualCount = Math.max(4, safeColors.length);
            for (let i = 0; i < actualCount; i++) {
              const cHex = safeColors[i % safeColors.length];
              svg += `<radialGradient id='gf_${pat.id}_${i}' cx='50%' cy='50%' r='50%'>
                        <stop offset='0%' stop-color='${cHex}' stop-opacity='1'/>
                        <stop offset='100%' stop-color='${cHex}' stop-opacity='0'/>
                      </radialGradient>`;
            }
          }
          svg += `</defs>`;
          svg += `<rect width='100%' height='100%' fill='${safeColors[0]}'/>`;

          const rnd = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

          if (isParticles || isSmoke) {
            const pCount = isSmoke ? 12 : 80;

            if (isSmoke) svg += `<g filter='url(#smoke_${pat.id})'>`;

            for (let i = 0; i < pCount; i++) {
              const cIdx = Math.floor(rnd(i) * safeColors.length);
              const cHex = safeColors[cIdx];

              const startX = rnd(i + 10) * 120 - 10;
              const sway   = isSmoke ? (rnd(i + 20) * 40 - 20) : (rnd(i + 20) * 6 - 3);
              const baseR  = isSmoke ? (20 + rnd(i + 30) * 30) : (0.1 + rnd(i + 30) * 0.4);
              const durY   = (speed * 1.5) + rnd(i + 40) * (speed * 3);
              const durX   = (speed * 2) + rnd(i + 50) * (speed * 2);
              const offset = rnd(i + 60) * -20;
              const baseOp = isSmoke ? (0.4 + rnd(i+70) * 0.6) : (0.6 + rnd(i+70) * 0.4);

              const animOpValues = isParticles
                ? `0; ${baseOp}; ${baseOp*0.2}; ${baseOp}; 0; ${baseOp*0.8}; 0`
                : `0; ${baseOp}; ${baseOp}; 0`;

              if (animActive) {
                svg += `<circle fill='${cHex}' cx='${startX}%' cy='120%' r='${baseR}%' opacity='0'>
                          <animate attributeName='cy' values='120%; -20%' dur='${durY}s' begin='${offset}s' repeatCount='indefinite'/>
                          <animate attributeName='cx' values='${startX}%; ${startX + sway}%; ${startX}%' dur='${durX}s' begin='${offset}s' repeatCount='indefinite'/>
                          <animate attributeName='opacity' values='${animOpValues}' dur='${durY}s' begin='${offset}s' repeatCount='indefinite'/>
                        </circle>`;
              } else {
                svg += `<circle fill='${cHex}' cx='${startX + sway/2}%' cy='${100 - rnd(i)*100}%' r='${baseR}%' opacity='${baseOp}'/>`;
              }
            }

            if (isSmoke) svg += `</g>`;

          } else {
            const actualCount = Math.max(4, safeColors.length);
            if (isGooey) svg += `<g filter='url(#goo_${pat.id})'>`;

            const pX = [11, 13, 17, 19, 23, 29, 31, 37];
            const pY = [13, 17, 19, 23, 29, 31, 37, 41];
            const pR = [17, 19, 23, 29, 31, 37, 41, 43];

            for (let i = 0; i < actualCount; i++) {
              const cIdx = i % safeColors.length;
              const cHex = safeColors[cIdx];
              const rBase = stops[cIdx] !== undefined ? stops[cIdx] : (isGooey ? 25 : 60);

              const durX = pX[i % pX.length] * (speed / 5);
              const durY = pY[i % pY.length] * (speed / 5);
              const durR = pR[i % pR.length] * (speed / 5);

              const x1 = 10 + (i * 15) % 80; const x2 = 80 - (i * 25) % 70; const x3 = 50 + (i * 35) % 40;
              const y1 = 10 + (i * 25) % 80; const y2 = 80 - (i * 15) % 70; const y3 = 50 + (i * 45) % 40;

              const vX = `${x1}%; ${x2}%; ${x3}%; ${x1}%`;
              const vY = `${y1}%; ${y2}%; ${y3}%; ${y1}%`;
              const vR = `${rBase}%; ${rBase * 1.3}%; ${rBase * 0.8}%; ${rBase}%`;

              const fill = isGooey ? cHex : `url(#gf_${pat.id}_${i})`;

              if (animActive) {
                  svg += `<circle fill='${fill}' cx='${x1}%' cy='${y1}%' r='${rBase}%'>
                            <animate attributeName='cx' values='${vX}' dur='${durX}s' repeatCount='indefinite'/>
                            <animate attributeName='cy' values='${vY}' dur='${durY}s' repeatCount='indefinite'/>
                            <animate attributeName='r' values='${vR}' dur='${durR}s' repeatCount='indefinite'/>
                          </circle>`;
              } else {
                  svg += `<circle fill='${fill}' cx='${x1}%' cy='${y1}%' r='${rBase}%'/>`;
              }
            }
            if (isGooey) svg += `</g>`;
          }

          svg += `</svg>`;
          const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
          bgValue = `url("${encodedSvg}")`;

        } else {
          // --- STANDARD / GRADIENT LOGIC ---
          if (pat.bg_type === 'solid' || pat.bg_type === 'solid_gradient') bgValue = safeColors[0];
          else if (pat.bg_type === 'linear') bgValue = `linear-gradient(${pat.gradient_angle || 90}deg, ${colorStopsStr})`;
          else if (pat.bg_type === 'radial') bgValue = `radial-gradient(circle at ${rx}% ${ry}%, ${colorStopsStr})`;

          if (pat.bg_type === 'solid_gradient') {

            // --- ALIAS RESOLVER ---
            let resolvedEntity = pat.gradient_entity;
            let resolvedAttribute = pat.gradient_entity_attribute;

            if (pat.global_id && pat.global_id !== 'manual') {
              const globalEntities = config.global_entities || [];
              const foundAlias = globalEntities.find(g => g.id === pat.global_id);
              if (foundAlias) {
                resolvedEntity = foundAlias.entity;
                resolvedAttribute = foundAlias.attribute;
              }
            }

            if (resolvedEntity) {
              const _ges = hass.states[resolvedEntity];
              if (_ges) {
                const _gattr = resolvedAttribute;
                const _graw = _gattr ? _ges.attributes[_gattr] : _ges.state;
                const _gval = parseFloat(_graw);
                const _gmin = parseFloat(pat.gradient_entity_min ?? 0);
                const _gmax = parseFloat(pat.gradient_entity_max ?? 100);

                if (!isNaN(_gval)) {
                  const _pct = Math.max(0, Math.min(1, (_gval - _gmin) / (_gmax - _gmin || 1)));
                  const _dynStops = safeColors.map((col, i) => ({
                    color: col,
                    pos: stops[i] !== undefined ? stops[i] : Math.round((100 / (safeColors.length - 1 || 1)) * i)
                  }));
                  bgValue = sampleGradient(_dynStops, _pct);
                }
              }
            }
          }

          if (animActive && pat.animation !== 'none') {
            if (pat.animation === 'pulse') {
              animValue = `sc-pattern-pulse ${speed}s infinite ease-in-out`;
            }
            if (pat.animation === 'pump') {
              const pScale   = pat.pump_scale || 1.1;
              const pumpName = `sc-anim-pump-${pat.id}-${idx}`;
              styleStr += `@keyframes ${pumpName} {
  0%, 100% { transform: scale(1); opacity: var(--pat-op, 1); }
  50%       { transform: scale(${pScale}); opacity: calc(var(--pat-op, 1) * 0.6); }
}\n`;
              animValue = `${pumpName} ${speed}s infinite ease-in-out`;
            }
          }
        }
      }

      const op = (pat.opacity ?? 100) / 100;
      let isAutoBorder = pat.border_radius_auto;
      if (isAutoBorder === undefined) isAutoBorder = isMain;

      let borderRadius = 'inherit';
      if (isAutoBorder) {
        if (isMain) {
          const isPill = config.layout_shape !== 'rectangle';
          borderRadius = isPill ? '999px' : (config.border_radius !== undefined ? `${config.border_radius}px` : 'var(--ha-card-border-radius, 12px)');
        } else {
          borderRadius = 'inherit';
        }
      } else if (pat.border_radius !== undefined && pat.border_radius !== '') {
        borderRadius = `${pat.border_radius}${pat.border_radius_unit || 'px'}`;
      }

      // EXACT ASSIGNMENT HERE:
      // 200 = BG_ANIMATED (for the main card)
      // 520 = sub-container background (exactly between 510 and the 700-range texts!)
      const zIndex = isMain ? '200' : '-1';
      const bgImp  = allowImportantOnBg ? ' !important' : '';

      const bgSizeStr = pat.animation === 'fluid' ? 'background-size: 115% 115% !important;' : 'background-size: 100% 100% !important;';
      const bgPosStr  = 'background-position: center !important;';
      const bgRepStr  = 'background-repeat: no-repeat !important;';

      styleStr += `${selector} {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  inset: 0 !important;
  background: ${bgValue}${bgImp};
  ${bgSizeStr}
  ${bgPosStr}
  ${bgRepStr}
  opacity: ${op};
  --pat-op: ${op};
  animation: ${animValue};
  z-index: ${zIndex} !important;
  border-radius: ${borderRadius} !important;
  pointer-events: none !important;
  will-change: transform, opacity;
}\n`;

    });

    return {
      cssVars: {},
      classes: { add: [], remove: ['uc-bg-active', 'uc-frame-active', 'uc-animate'] },
      litOverlay: html`<style>${styleStr}</style>`
    };
  }

  function renderCustomBlock(commitFn, hass, slot) {
    return html`<sc-color-editor .slot=${slot} .hass=${hass} @color-update=${e => commitFn('__merge__', e.detail)}></sc-color-editor>`;
  }

  function editorFields() { return []; }

  return { update, renderCustomBlock, editorFields };
})();
