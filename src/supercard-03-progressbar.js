import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================
const safeFloat = (v, d) => { const f = parseFloat(v); return isNaN(f) ? d : f; };

const parseDim = (v, fallback, unit = 'px') => {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? `${s}${unit}` : s;
};

const hexToRgb = hex => {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
};

const rgbToHex = (r,g,b) => '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');

function extractHex(c) {
  if (!c) return '#000000';
  c = c.trim();
  if (c.startsWith('var(')) {
    const m = c.match(/var\(([^),]+)/);
    if (m) c = getComputedStyle(document.documentElement).getPropertyValue(m[1].trim()).trim();
  }
  if (c.startsWith('#')) return c;
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g);
    if (m && m.length >= 3) return rgbToHex(parseInt(m[0]), parseInt(m[1]), parseInt(m[2]));
  }
  return '#ffffff';
}

function sampleGradient(stops, pct) {
  const sorted = [...stops].sort((a,b) => a.pos - b.pos);
  const pos = pct * 100;
  if (pos <= sorted[0].pos) return sorted[0].color;
  if (pos >= sorted[sorted.length-1].pos) return sorted[sorted.length-1].color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i], hi = sorted[i+1];
    if (pos >= lo.pos && pos <= hi.pos) {
      const t = (pos - lo.pos) / (hi.pos - lo.pos);
      const [r1,g1,b1] = hexToRgb(lo.color);
      const [r2,g2,b2] = hexToRgb(hi.color);
      return rgbToHex(r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t);
    }
  }
  return sorted[sorted.length-1].color;
}

function solveCubicBezier(x, p1x, p1y, p2x, p2y) {
  const cx = 3*p1x, bx = 3*(p2x-p1x)-cx, ax = 1-cx-bx;
  const cy = 3*p1y, by = 3*(p2y-p1y)-cy, ay = 1-cy-by;
  const sampleX = t => ((ax*t+bx)*t+cx)*t;
  const sampleY = t => ((ay*t+by)*t+cy)*t;
  const derivX  = t => (3*ax*t+2*bx)*t+cx;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const d = sampleX(t) - x;
    if (Math.abs(d) < 1e-6) break;
    t -= d / derivX(t);
  }
  return sampleY(t);
}

function getLuminance(hex) {
  try {
    const [r,g,b] = hexToRgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  } catch { return 0; }
}

function contrastColor(hex) {
  try { return getLuminance(hex) > 0.179 ? '#000000' : '#ffffff'; }
  catch { return '#ffffff'; }
}

function getBounceEase(intensity) {
  if (!intensity || intensity <= 0) return 'cubic-bezier(0.4, 0, 0.2, 1)'; 
  const amount = intensity / 100;
  const points = [];
  for (let i = 0; i <= 100; i += 2) {
    if (i === 100) { points.push(`1 100%`); continue; }
    const t = i / 100;
    const decay = Math.exp(-t * (8 - 4 * amount));
    const wave = Math.cos(t * (10 + 10 * amount));
    const val = 1 - decay * wave;
    points.push(`${val.toFixed(4)} ${i}%`);
  }
  return `linear(${points.join(', ')})`;
}

// ==========================================
// 2. THE COMPONENT
// ==========================================
const ELM_BASE    = 700; 
const ELM_STATIC  = 800; 
const ELM_DYNAMIC = 900; 
const ELM_FLOAT   = 1000; 

class ScProgressbar extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      rootConfig: { type: Object },
      globalEntities: { type: Array },
      _isInitialized: { type: Boolean, state: true },
      _displayPct: { type: Number, state: true },
      _isAtLeftEdge: { type: Boolean, state: true },
      _isAtRightEdge: { type: Boolean, state: true }
    };
  }

  constructor() {
    super();
    this._isInitialized = false;
    this._displayPct = 0;
    this._targetPct  = null;
    this._animFrame  = null;
    this._isAtLeftEdge = false;
    this._isAtRightEdge = false;
  }

  firstUpdated() {
    setTimeout(() => { this._isInitialized = true; }, 50);
    this._checkEdges();
    this._resizeObs = new ResizeObserver(() => this._checkEdges());
    this._resizeObs.observe(this);
  }

  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('config') || changedProps.has('rootConfig')) {
      this._checkEdges();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObs) this._resizeObs.disconnect();
  }

  _checkEdges() {
    requestAnimationFrame(() => {
      try {
        const host = this.getRootNode().host; 
        if (!host) return;
        const myRect = this.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        
        const atLeft = Math.abs(myRect.left - hostRect.left) < 12;
        const atRight = Math.abs(hostRect.right - myRect.right) < 12;

        if (this._isAtLeftEdge !== atLeft) this._isAtLeftEdge = atLeft;
        if (this._isAtRightEdge !== atRight) this._isAtRightEdge = atRight;
      } catch(e) {}
    });
  }

  _get(k, d) { return this.config[k] ?? d; }

  _animatePct(to, durationMs) {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    const from  = this._displayPct;
    const start = performance.now();
    const tick  = (now) => {
      const t     = Math.min((now - start) / durationMs, 1);
      const eased = solveCubicBezier(t, 0.2, 0, 0, 1);
      this._displayPct = from + (to - from) * eased;
      if (t < 1) this._animFrame = requestAnimationFrame(tick);
      else { this._displayPct = to; this._animFrame = null; }
    };
    this._animFrame = requestAnimationFrame(tick);
  }

  static get styles() {
    return css`
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
        z-index: ${ELM_BASE};
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
        z-index: ${ELM_DYNAMIC};
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

      .sc-pb-ticks { position: absolute; inset: 0; pointer-events: none; opacity: var(--pb-tick-opacity, 1); z-index: ${ELM_DYNAMIC + 50}; }
      .sc-pb-labels { position: absolute; inset: 0; pointer-events: none; z-index: ${ELM_FLOAT}; }
    `;
  }

  render() {
    if (!this.config || !this.hass) return html``;

    // --- ALIAS DETECTION ---
    let resolvedEntity = this.config.entity;
    let resolvedAttribute = this.config.attribute;
    let resolvedAliasName = '';
    
    if (this.config.global_id && this.config.global_id !== 'manual') {
      const foundAlias = (this.globalEntities || []).find(g => g.id === this.config.global_id);
      if (foundAlias) {
        resolvedEntity = foundAlias.entity;
        resolvedAttribute = foundAlias.attribute;
        resolvedAliasName = foundAlias.alias || '';
      }
    }

    const stateObj = resolvedEntity ? this.hass.states[resolvedEntity] : null;
    const rawVal = stateObj ? safeFloat((resolvedAttribute ? stateObj.attributes[resolvedAttribute] : stateObj.state), 0) : 0;

    const min = safeFloat(this._get('min', 0), 0);
    const max = safeFloat(this._get('max', 100), 100);
    const originValStr = this._get('origin', '');
    const originVal = originValStr !== '' ? safeFloat(originValStr, min) : min;
    const range = max - min || 1;
    
    const pct = Math.max(0, Math.min(1, (rawVal - min) / range));
    const animDur = safeFloat(this._get('animation_duration', 0.4), 0.4);

    if (this._isInitialized && pct !== this._targetPct) {
      this._targetPct = pct;
      this._animatePct(pct, animDur * 1000);
    }

    const renderPct = this._isInitialized ? this._displayPct : 0;
    const originPct = Math.max(0, Math.min(1, (originVal - min) / range));
    
    const targetPct = this._isInitialized ? pct : originPct;
    
    const p1Target = Math.min(originPct, targetPct);
    const p2Target = Math.max(originPct, targetPct);
    
    const decimals = parseInt(this._get('value_decimals', 0));
    const unit = this._get('value_unit', stateObj?.attributes?.unit_of_measurement || '');
    const activeVal = this._get('value_animated', false) ? (min + renderPct * range) : rawVal;
    
    const displayValue = `${parseFloat(activeVal).toFixed(decimals)}${unit ? ' ' + unit : ''}`;
    const indDisplayValue = `${parseFloat(activeVal).toFixed(parseInt(this._get('indicator_value_decimals', decimals)))}${unit ? ' ' + unit : ''}`;

    const orientation = this._get('orientation', 'horizontal');
    const isHoriz = orientation === 'horizontal';
    const isCirc = String(orientation).startsWith('circular');
    const u = this._get('base_unit', 'auto') === 'auto' ? (isCirc ? 'cqmin' : 'px') : this._get('base_unit');

    let w = parseDim(this._get('width'), isCirc ? '100px' : (isHoriz ? '100%' : '20px')); 
    let h = parseDim(this._get('height'), isCirc ? '100px' : (isHoriz ? '20px' : '100%'));
    const radius = isCirc 
      ? parseDim(this._get('circular_border_radius', 50), '50%', '%') 
      : parseDim(this._get('border_radius', '4'), '4px');

    const bgColorRaw = this._get('bg_color', '#ffffff');
    const bgOpacity = safeFloat(this._get('bg_opacity', 10), 10);
    const bgColor = `color-mix(in srgb, ${bgColorRaw} ${bgOpacity}%, transparent)`;

    const resolvedStops = this._get('gradient_stops', [{ color: this._get('color1', '#2196f3'), pos: 0 }, { color: this._get('color2', '#4caf50'), pos: 100 }]);
    let fillColor = this._get('fill_color', 'var(--primary-color)');
    
    if (this._get('use_gradient', false)) {
      if (this._get('gradient_as_solid', false)) {
        fillColor = sampleGradient(resolvedStops, renderPct);
      } else {
        fillColor = `linear-gradient(${isHoriz ? '90deg' : '0deg'}, ${resolvedStops.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
      }
    }
    const exactHexColor = this._get('use_gradient', false) ? sampleGradient(resolvedStops, renderPct) : extractHex(fillColor);

    const glassShadow = `
      1px -1px 2px rgba(255,255,255,0.5) inset, 0px -1px 2px rgba(255,255,255,0.5) inset, 
      -1px -1px 2px rgba(255,255,255,0.5) inset, 1px 1px 2px rgba(0,0,0,0.3) inset, 
      -8px 4px 10px -6px rgba(0,0,0,0.25) inset, -1px 1px 6px rgba(0,0,0,0.25) inset, 
      -1px -1px 8px rgba(0,0,0,0.15), 1px 1px 2px rgba(0,0,0,0.15), 2px 2px 6px rgba(0,0,0,0.15), 
      -2px -1px 2px rgba(255,255,255,0.25) inset, 3px 6px 16px -6px rgba(0,0,0,0.5)
    `;

    const fillClipPath = isHoriz
      ? `inset(0 calc((1 - ${p2Target}) * 100%) 0 calc(${p1Target} * 100%))`
      : `inset(calc((1 - ${p2Target}) * 100%) 0 calc(${p1Target} * 100%) 0)`;
    
    const fillStyle = `clip-path: ${fillClipPath}; background: ${fillColor}; transition: clip-path var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear;`;
    
    // --- NEW: Hoist global card-edge indent logic ---
    const rc = this.rootConfig || {};
    const hasCardRadius = rc.layout_shape === 'pill' || parseInt(rc.border_radius || '0') > 0;
    let edgeIndentStr = '0px';
    if (hasCardRadius) {
      edgeIndentStr = rc.layout_shape === 'pill' ? '20px' : Math.max(8, parseInt(rc.border_radius || 12) * 0.6) + 'px';
    }
    
    // ==========================================
    // PATCH: GHOST-PILL & TOP-PILL SEPARATION
    // ==========================================
    let indicatorGooeyHtml = '';
    let indicatorTopHtml = '';
    const showInd = this._get('show_indicator', false) && !isCirc;
    
    const oldGlassBool = this._get('indicator_value_glass', false);
    const glassEffect = this._get('indicator_glass_effect', oldGlassBool ? 'glass_gooey' : 'none');
    const isGooey = glassEffect === 'glass_gooey';

    if (showInd) {
      const indColor = this._get('indicator_color', '#ffffff');
      const indThick = parseDim(this._get('indicator_thickness', 2), `2${u}`, u);
      
      const lineStyle = isHoriz 
        ? `position:absolute; top:0; bottom:0; width:${indThick}; background:${indColor}; left:calc(${targetPct} * 100%); transform:translateX(-50%) translateZ(0); z-index:${ELM_FLOAT}; transition: left var(--pb-anim-dur) var(--pb-bounce-ease);`
        : `position:absolute; left:0; right:0; height:${indThick}; background:${indColor}; bottom:calc(${targetPct} * 100%); transform:translateY(50%) translateZ(0); z-index:${ELM_FLOAT}; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease);`;
      
      let realPillHtml = '';
      if (this._get('indicator_value', false)) {
         let pBgRaw = this._get('indicator_value_bg', '#000000');
         let pCol = this._get('indicator_value_color', '#ffffff');
         const adMode = this._get('indicator_value_adaptive_mode', 'none');
         
         if (adMode === 'pill') { pBgRaw = exactHexColor; pCol = contrastColor(exactHexColor); } 
         else if (adMode === 'text') { pCol = exactHexColor; }
         
         const pOp = safeFloat(this._get('indicator_value_opacity', 100), 100);
         const finalBg = `color-mix(in srgb, ${pBgRaw} ${pOp}%, transparent)`;
         
         let glassCSS = '';
         if (glassEffect === 'glass_gooey') {
           glassCSS = `backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); box-shadow: ${glassShadow}; border: 1px solid rgba(255, 255, 255, 0.3);`;
         } else if (glassEffect === 'glass_clear') {
           glassCSS = `box-shadow: ${glassShadow}; border: 1px solid rgba(255, 255, 255, 0.3);`;
         } else if (glassEffect === 'glass_clean') {
           glassCSS = `backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 10px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.4);`;
         } else if (glassEffect === 'glass_lens') {
           glassCSS = `backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.8), 0 4px 12px rgba(0,0,0,0.4);`;
         } else if (glassEffect === 'glass_dark') {
           glassCSS = `backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); background: rgba(0,0,0,${pOp / 100}) !important; border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.5); color: #ffffff !important;`;
         } else {
           glassCSS = `box-shadow: 0 2px 2px rgba(0,0,0,0.25); border: none;`;
         }

         const pSize = parseDim(this._get('indicator_value_font_size', 10), `10${u}`, u);
         const pRot = (this._get('indicator_value_rotation', 'auto') === 'auto') ? (isHoriz ? -90 : 0) : parseInt(this._get('indicator_value_rotation'));
         const isVertRot = Math.abs(pRot) === 90;
         
         // NEW: Dynamic width calculation based on text length so the pill never overflows
         const halfWidth = `calc(${pSize} * (0.8 + ${indDisplayValue.length} * 0.3))`;
         const halfHeight = `calc(${pSize} * 1.1)`;
         const pClampBase = isHoriz ? (isVertRot ? halfHeight : halfWidth) : (isVertRot ? halfWidth : halfHeight);
         
         // NEW: Smart indent add-on for the pill
         let pClampMin = pClampBase;
         let pClampMax = pClampBase;
         if (isHoriz && hasCardRadius) {
           if (this._isAtLeftEdge) pClampMin = `calc(${pClampBase} + ${edgeIndentStr})`;
           if (this._isAtRightEdge) pClampMax = `calc(${pClampBase} + ${edgeIndentStr})`;
         }

         const pPosStyle = isHoriz 
           ? `left: clamp(${pClampMin}, calc(${targetPct} * 100%), calc(100% - ${pClampMax})); top: 50%; transform: translate(-50%, -50%) rotate(${pRot}deg) translateZ(0); will-change: left, transform; transition: left var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear, color 0.1s linear;` 
           : `bottom: clamp(${pClampBase}, calc(${targetPct} * 100%), calc(100% - ${pClampBase})); left: 50%; transform: translate(-50%, 50%) rotate(${pRot}deg) translateZ(0); will-change: bottom, transform; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease), background 0.1s linear, color 0.1s linear;`;

         // 1. The real layer
         realPillHtml = html`
            <div style="position:absolute; z-index:${ELM_FLOAT + 50}; background:${finalBg}; color:${pCol}; font-size:${pSize}; padding:0.3em 0.8em; border-radius:100px; font-weight:bold; display:flex; align-items:center; justify-content:center; ${glassCSS} ${pPosStyle}">
              ${indDisplayValue}
            </div>`;

         // 2. The goo clone
         if (isGooey) {
            indicatorGooeyHtml = html`
              <div style="position:absolute; z-index:${ELM_DYNAMIC}; background:${exactHexColor}; color:transparent; font-size:${pSize}; padding:0.3em 0.8em; border-radius:100px; display:flex; pointer-events:none; ${pPosStyle}">
                ${indDisplayValue}
              </div>`;
         }
      }
      
      indicatorTopHtml = html`<div class="sc-pb-indicator-line" style="${lineStyle}"></div>${realPillHtml}`;
    }

    let circularHtml = ''; 
    if (isCirc) {
      const circScale = safeFloat(this._get('circular_scale', 100), 100) / 100;
      const isSegmented = this._get('circular_segmented', false);
      const showGlow = this._get('circular_glow', true);
      const sw = safeFloat(this._get('circular_stroke_width', 10), 10);
      
      let circArc = 360; 
      const userStart = parseInt(this._get('circular_start_position', 0)); 
      let startAngle = userStart; 
      
      if (orientation === 'circular_speedo') { circArc = 270; startAngle = -135 + userStart; }
      if (orientation === 'circular_half') { circArc = 180; startAngle = -90 + userStart; }
      
      const isReverse = this._get('circular_reverse', false); 
      const dirMult = isReverse ? -1 : 1;
      
      if (isSegmented) {
        const segCount = parseInt(this._get('circular_segment_count', 40)); 
        const activeCount = Math.floor(renderPct * segCount);
        const angleStep = (circArc / (circArc === 360 ? segCount : Math.max(1, segCount - 1))) * dirMult;
        const wThick = safeFloat(this._get('circular_segment_thickness', 2), 2) + '%'; 
        const hLen = sw + '%'; 
        
        const segs = [];
        for (let i = 0; i < segCount; i++) {
          const isActive = i <= activeCount && renderPct > 0; 
          const angle = startAngle + (i * angleStep); 
          const segPct = segCount > 1 ? i / (segCount - 1) : 0;
          
          let activeColor = this._get('use_gradient', false) ? (this._get('gradient_as_solid', false) ? exactHexColor : sampleGradient(resolvedStops, segPct)) : extractHex(fillColor);
          const inactiveColor = `color-mix(in srgb, ${bgColorRaw} ${bgOpacity}%, transparent)`; 
          const segBg = isActive ? activeColor : inactiveColor;
          const glowShadow = (showGlow && isActive) ? `0 0 2px ${activeColor}, 0 0 5px ${activeColor}` : 'none';
          const zIdx = isActive ? ELM_DYNAMIC : ELM_STATIC;
          
          segs.push(html`
            <i class="sc-seg" style="--rot: ${angle}deg; z-index: ${zIdx};">
              <div class="sc-seg-inner" style="background: ${segBg}; box-shadow: ${glowShadow}; width: ${wThick}; height: ${hLen};"></div>
            </i>
          `);
        }
        circularHtml = html`<div class="sc-seg-container" style="${circScale !== 1 ? `transform: translate(-50%, -50%) scale(${circScale});` : ''}">${segs}</div>`;
        
      } else {
        const svgRot = startAngle - 90; 
        const svgTransform = `rotate(${svgRot} 50 50) ${isReverse ? 'scale(1, -1) translate(0, -100)' : ''}`;
        const r = 50 - (sw / 2); 
        const c = 2 * Math.PI * r; 
        const dashLength = (circArc / 360) * c; 
        const gapLength = c - dashLength;
        const progLength = (targetPct * dashLength) > 0 ? Math.max(0.001, targetPct * dashLength) : 0;
        
        if (!this._uniqueId) this._uniqueId = 'grad-' + Math.random().toString(36).substr(2, 9);
        
        circularHtml = html`
          <svg viewBox="0 0 100 100" style="width:100%; height:100%; position:absolute; inset:0; overflow:visible; z-index:${ELM_STATIC}; pointer-events:none; ${circScale !== 1 ? `transform: scale(${circScale}); transform-origin: center;` : ''}">
          <defs>
              ${this._get('use_gradient', false) && !this._get('gradient_as_solid', false) ? html`
                <linearGradient id="${this._uniqueId}" x1="0%" y1="100%" x2="100%" y2="0%">
                  ${resolvedStops.map(s => html`<stop offset="${s.pos}%" stop-color="${s.color}" />`)}
                </linearGradient>
              ` : ''}
              ${showGlow ? html`
                <filter id="glow-${this._uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${exactHexColor}" flood-opacity="0.6"/>
                </filter>
              ` : ''}
            </defs>
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="${bgColorRaw}" stroke-opacity="${bgOpacity/100}" stroke-width="${sw}" stroke-dasharray="${dashLength} ${gapLength}" stroke-dashoffset="0" stroke-linecap="round" style="z-index: ${ELM_STATIC};" transform="${svgTransform}"></circle>
            ${progLength > 0 ? html`
              <circle cx="50" cy="50" r="${r}" fill="none" stroke="${(this._get('use_gradient', false) && !this._get('gradient_as_solid', false)) ? `url(#${this._uniqueId})` : exactHexColor}" stroke-width="${sw}" stroke-dasharray="${progLength} ${c}" stroke-dashoffset="0" stroke-linecap="round" style="transition: stroke-dasharray var(--pb-anim-dur) var(--pb-bounce-ease), stroke 0.1s linear; z-index: ${ELM_DYNAMIC};" transform="${svgTransform}" filter="${showGlow ? `url(#glow-${this._uniqueId})` : 'none'}"></circle>
            ` : ''}
          </svg>
        `;
      }
    }

    let ticksStyle = ''; 
    let tickElementsEmptyArr = []; 
    let tickElementsFilledArr = []; 
    let subtickElementsEmptyArr = [];
    let subtickElementsFilledArr = [];
    let tickLabelsEmptyHtml = ''; 
    let tickLabelsFilledHtml = ''; 
    
    if (this._get('show_ticks', false) && !isCirc) {
      let tCount = parseInt(this._get('tick_count', 10)); 
      const tInterv = safeFloat(this._get('tick_interval', 0), 0); 
      let step = 0;
      
      if (tInterv > 0) { 
        step = (tInterv / range) * 100; 
        tCount = Math.floor((range + 0.0001) / tInterv) + 1; 
      } else if (tCount > 1) { 
        step = 100 / (tCount - 1); 
      }
      
      const getAlignCSS = (align, isHor) => { 
        if (isHor) { 
          if (align === 'start') return `top: 0; transform: translate(-50%, 0);`; 
          if (align === 'end') return `bottom: 0; transform: translate(-50%, 0);`; 
          if (align === 'full') return `top: 0; transform: translate(-50%, 0);`; 
          return `top: 50%; transform: translate(-50%, -50%);`; 
        } else { 
          if (align === 'start') return `left: 0; transform: translate(0, 50%);`; 
          if (align === 'end') return `right: 0; transform: translate(0, 50%);`; 
          if (align === 'full') return `left: 0; transform: translate(0, 50%);`; 
          return `left: 50%; transform: translate(-50%, 50%);`; 
        } 
      };
      
      // NEW: Dual-adaptive colors for main ticks
      const isTickAdaptive = this._get('tick_color_adaptive', false);
      const tColorEmpty = isTickAdaptive ? 'color-mix(in srgb, var(--primary-text-color) 40%, transparent)' : this._get('tick_color', 'rgba(255,255,255,0.3)');
      const tColorFilled = isTickAdaptive ? contrastColor(exactHexColor) : this._get('tick_color', 'rgba(255,255,255,0.3)');
      
      const tWidth = parseDim(this._get('tick_width', 1), `1${u}`, u); 
      const rawTLen = this._get('tick_length', '100%'); 
      const tAlign = this._get('tick_align', 'center'); 
      const hideLast = this._get('tick_hide_last', false); 
      const lStep  = parseInt(this._get('tick_label_step', 1)) || 1; 
      const labExtra = parseDim(this._get('tick_labeled_extralength', 0), `0${u}`, u);
      const tMirror = this._get('tick_mirror_side', false);
      
      const showSubticks = this._get('show_subticks', false); 
      const subCount = parseInt(this._get('subtick_count', 4)); 
      const subPos = this._get('subtick_pos', 'main'); 
      const rawSubLen = this._get('subtick_length', '50%'); 
      const subWidth = parseDim(this._get('subtick_width', 1), `1${u}`, u); 
      
      // NEW: Dual-adaptive colors for subticks
      const isSubtickAdaptive = this._get('subtick_color_adaptive', false);
      const subColorEmpty = isSubtickAdaptive ? 'color-mix(in srgb, var(--primary-text-color) 25%, transparent)' : this._get('subtick_color', 'rgba(255,255,255,0.2)');
      const subColorFilled = isSubtickAdaptive ? contrastColor(exactHexColor) : this._get('subtick_color', 'rgba(255,255,255,0.2)');
      const subMirror = this._get('subtick_mirror_side', false);
      
      const tlPos = this._get('tick_labels_pos', 'end');
      
      if (tCount > 1 && step > 0) {
        for (let i = 0; i < tCount; i++) {
          const p = (i * step) / 100; 
          const isLast = Math.abs((i * step) - 100) < 0.1; 
          const hasLabel = (this._get('show_tick_labels', false) && i % lStep === 0);
          
          let baseLen = rawTLen; 
          if (tAlign === 'full') baseLen = '100%'; 
          let currentLen = baseLen; 
          
          if (hasLabel && labExtra !== '0px' && labExtra !== '0cqmin' && tAlign !== 'full') { 
            currentLen = `calc(${baseLen} + ${labExtra})`; 
          }
          
          if (!(hideLast && isLast)) { 
            let styleBase = `position:absolute; pointer-events:none;`; 
            if (isHoriz) styleBase += `left: ${p * 100}%; width: ${tWidth}; height: ${currentLen}; ${getAlignCSS(tAlign, isHoriz)}`; 
            else styleBase += `bottom: ${p * 100}%; height: ${tWidth}; width: ${currentLen}; ${getAlignCSS(tAlign, isHoriz)}`; 
            
            tickElementsEmptyArr.push(html`<div style="${styleBase} background:${tColorEmpty};"></div>`);
            tickElementsFilledArr.push(html`<div style="${styleBase} background:${tColorFilled};"></div>`);
            
            if (tMirror && (tAlign === 'start' || tAlign === 'end')) {
              let mAlign = tAlign === 'start' ? 'end' : 'start';
              let mStyleBase = `position:absolute; pointer-events:none;`; 
              if (isHoriz) mStyleBase += `left: ${p * 100}%; width: ${tWidth}; height: ${currentLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
              else mStyleBase += `bottom: ${p * 100}%; height: ${tWidth}; width: ${currentLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
              tickElementsEmptyArr.push(html`<div style="${mStyleBase} background:${tColorEmpty};"></div>`);
              tickElementsFilledArr.push(html`<div style="${mStyleBase} background:${tColorFilled};"></div>`);
            }
          }
          
          if (showSubticks && subCount > 0 && !isLast && p < 1) {
            let activeSubAlign = subPos === 'main' ? tAlign : subPos; 
            let activeSubLen = rawSubLen; 
            let activeSubMirror = subPos === 'main' ? tMirror : subMirror;

            if (activeSubAlign === 'full') activeSubLen = '100%'; 
            else if (activeSubLen.includes('%') && subPos === 'main' && baseLen.includes('%')) { 
              activeSubLen = `calc(${baseLen} * (${parseFloat(rawSubLen) / 100}))`; 
            }
            for (let j = 1; j <= subCount; j++) {
              const subP = p + (j / (subCount + 1)) * (step / 100); 
              if (subP > 1.001) continue; 
              let subStyleBase = `position:absolute; pointer-events:none;`; 
              if (isHoriz) subStyleBase += `left: ${subP * 100}%; width: ${subWidth}; height: ${activeSubLen}; ${getAlignCSS(activeSubAlign, isHoriz)}`; 
              else subStyleBase += `bottom: ${subP * 100}%; height: ${subWidth}; width: ${activeSubLen}; ${getAlignCSS(activeSubAlign, isHoriz)}`; 
              
              subtickElementsEmptyArr.push(html`<div style="${subStyleBase} background:${subColorEmpty};"></div>`);
              subtickElementsFilledArr.push(html`<div style="${subStyleBase} background:${subColorFilled};"></div>`);
              
              if (activeSubMirror && (activeSubAlign === 'start' || activeSubAlign === 'end')) { 
                let mAlign = activeSubAlign === 'start' ? 'end' : 'start'; 
                let mStyleBase = `position:absolute; pointer-events:none;`; 
                if (isHoriz) mStyleBase += `left: ${subP * 100}%; width: ${subWidth}; height: ${activeSubLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
                else mStyleBase += `bottom: ${subP * 100}%; height: ${subWidth}; width: ${activeSubLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
                subtickElementsEmptyArr.push(html`<div style="${mStyleBase} background:${subColorEmpty};"></div>`);
                subtickElementsFilledArr.push(html`<div style="${mStyleBase} background:${subColorFilled};"></div>`);
              }
            }
          }
        }
        
        this._get('custom_ticks', []).forEach(ct => {
          const p = (ct.value - min) / range; 
          if (p < 0 || p > 1) return; 
          const cColor = ct.color || '#ff0000'; 
          const cWidth = parseDim(ct.width, `2${u}`, u);
          const cAlign = (ct.align && ct.align !== 'main') ? ct.align : tAlign; 
          const cMirror = (!ct.align || ct.align === 'main') ? tMirror : ct.mirror;

          let cLen = (ct.length !== undefined && ct.length !== '' && String(ct.length).toLowerCase() !== 'main') ? parseDim(ct.length, rawTLen, u) : rawTLen; 
          if (cAlign === 'full') cLen = '100%';
          let ctStyleBase = `position:absolute; pointer-events:none;`; 
          if (isHoriz) ctStyleBase += `left: ${p * 100}%; width: ${cWidth}; height: ${cLen}; ${getAlignCSS(cAlign, isHoriz)}`; 
          else ctStyleBase += `bottom: ${p * 100}%; height: ${cWidth}; width: ${cLen}; ${getAlignCSS(cAlign, isHoriz)}`; 
          
          tickElementsEmptyArr.push(html`<div style="${ctStyleBase} background:${cColor};"></div>`);
          tickElementsFilledArr.push(html`<div style="${ctStyleBase} background:${cColor};"></div>`);
          
          if (cMirror && (cAlign === 'start' || cAlign === 'end')) {
            let mAlign = cAlign === 'start' ? 'end' : 'start';
            let mStyleBase = `position:absolute; pointer-events:none;`; 
            if (isHoriz) mStyleBase += `left: ${p * 100}%; width: ${cWidth}; height: ${cLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
            else mStyleBase += `bottom: ${p * 100}%; height: ${cWidth}; width: ${cLen}; ${getAlignCSS(mAlign, isHoriz)}`; 
            tickElementsEmptyArr.push(html`<div style="${mStyleBase} background:${cColor};"></div>`); 
            tickElementsFilledArr.push(html`<div style="${mStyleBase} background:${cColor};"></div>`); 
          }
        });
        
        if (this._get('show_tick_labels', false)) {
          const tlDec = parseInt(this._get('tick_labels_decimals', 0)); 
          const tlSizeStr = parseDim(this._get('tick_labels_size', 10), `10${u}`, u); 
          const gap = parseDim(this._get('tick_labels_tick_gap', 4), `4${u}`, u); 
          const shift = parseDim(this._get('tick_labels_shift', 0), `0${u}`, u); 
          const centerGapOffset = parseDim(this._get('tick_labels_center_gap_offset', 0), `0${u}`, u);
          
          // NEW: Dual-adaptive colors for labels
          const isTlAdaptive = this._get('tick_labels_color_adaptive', false);
          const tlColorEmpty = isTlAdaptive ? 'var(--primary-text-color)' : this._get('tick_labels_color', 'var(--secondary-text-color)');
          const tlColorFilled = isTlAdaptive ? contrastColor(exactHexColor) : this._get('tick_labels_color', 'var(--secondary-text-color)');

          const tlRot = parseInt(this._get('tick_labels_rotation', 0));
          const tlHideUnit = this._get('tick_labels_hide_unit', false);
          const tlUnitStr = (tlHideUnit || !unit) ? '' : ' ' + unit;
          
          const hideFirstTl = this._get('tick_labels_hide_first', false);
          const hideLastTl = this._get('tick_labels_hide_last', false);
          
          let maxCharLen = 0; 
          if (!isHoriz && tlPos === 'center') { 
            for (let i = 0; i < tCount; i++) { 
              const str = `${parseFloat(min + ((i * step) / 100) * range).toFixed(tlDec)}${tlUnitStr}`; 
              if (str.length > maxCharLen) maxCharLen = str.length; 
            } 
          }
          
          if (tlPos === 'center') { 
            let halfTextExp = isHoriz ? `calc(${tlSizeStr} / 2 + ${gap} + (${centerGapOffset}) / 2)` : `calc(${maxCharLen} * ${tlSizeStr} * 0.3 + ${gap} + (${centerGapOffset}) / 2)`; 
            const maskDir = isHoriz ? 'bottom' : 'right'; 
            const mask = `linear-gradient(to ${maskDir}, black 0%, black calc(50% + ${shift} - ${halfTextExp}), transparent calc(50% + ${shift} - ${halfTextExp}), transparent calc(50% + ${shift} + ${halfTextExp}), black calc(50% + ${shift} + ${halfTextExp}), black 100%)`; 
            ticksStyle += ` -webkit-mask-image: ${mask}; mask-image: ${mask};`; 
          }

          const labelsEmptyArr = [];
          const labelsFilledArr = [];
          
          for (let i = 0; i < tCount; i++) {
            if (i % lStep !== 0) continue; 
            const p = (i * step) / 100; 
            const isFirst = i === 0; 
            const isLast = Math.abs((i * step) - 100) < 0.1;
            
            if (isFirst && hideFirstTl) continue;
            if (isLast && hideLastTl) continue;

            let styleBase = `position:absolute; font-size:${tlSizeStr}; white-space:nowrap; pointer-events:none; `;
            
            if (isHoriz) { 
              styleBase += `top: calc(50% + ${shift}); `; 
              let alignX = '-50%', mLeft = '0px'; 
              if (tlPos === 'start') { alignX = '-100%'; mLeft = `calc(-1 * ${gap})`; } 
              else if (tlPos === 'end') { alignX = '0'; mLeft = gap; } 
              
              if (isFirst) { 
                alignX = '0'; 
                if (tlPos === 'start') mLeft = '0px'; 
                if (hasCardRadius && this._isAtLeftEdge) mLeft = `calc(${mLeft} + ${edgeIndentStr})`;
              } 
              else if (isLast) { 
                alignX = '-100%'; 
                if (tlPos === 'end') mLeft = '0px'; 
                if (hasCardRadius && this._isAtRightEdge) mLeft = `calc(${mLeft} - ${edgeIndentStr})`;
              } 
              styleBase += `left: ${p * 100}%; margin-left: ${mLeft}; transform: translate(${alignX}, -50%) rotate(${tlRot}deg);`; 
            } else { 
              styleBase += `left: calc(50% + ${shift}); `; 
              let alignY = '50%', mBottom = '0px'; 
              if (tlPos === 'start') { alignY = '100%'; mBottom = `calc(-1 * ${gap})`; } 
              else if (tlPos === 'end') { alignY = '0'; mBottom = gap; } 
              
              if (isFirst) { alignY = '0'; if (tlPos === 'start') mBottom = '0px'; } 
              else if (isLast) { alignY = '100%'; if (tlPos === 'end') mBottom = '0px'; } 
              styleBase += `bottom: ${p * 100}%; margin-bottom: ${mBottom}; transform: translate(-50%, ${alignY}) rotate(${tlRot}deg);`; 
            }
            
            const txt = `${parseFloat(min + (p * range)).toFixed(tlDec)}${tlUnitStr}`;
            labelsEmptyArr.push(html`<span style="${styleBase} color:${tlColorEmpty};">${txt}</span>`);
            labelsFilledArr.push(html`<span style="${styleBase} color:${tlColorFilled};">${txt}</span>`);
          }
          tickLabelsEmptyHtml = html`<div class="sc-pb-tick-labels" style="position:absolute; inset:0; pointer-events:none; z-index:${ELM_DYNAMIC + 51};">${labelsEmptyArr}</div>`;
          tickLabelsFilledHtml = html`<div class="sc-pb-tick-labels" style="position:absolute; inset:0; pointer-events:none;">${labelsFilledArr}</div>`;
        }
      }
    }

    let floatingValueHtml = ''; 
    let labelHtml = ''; 
    let valueHtml = ''; 

    if (this._get('show_label', false)) {
      const lSizeStr = parseDim(this._get('label_font_size', 12), `12${u}`, u); 
      const lWeight = this._get('label_bold', false) ? 'bold' : 'normal';
      let lColor = this._get('label_color', 'var(--primary-text-color)'); 
      
      if (this._get('label_color_adaptive_bar', false)) lColor = isCirc ? exactHexColor : contrastColor(exactHexColor); 
      else if (this._get('label_color_adaptive_theme', false)) lColor = contrastColor(extractHex('var(--primary-background-color)'));
      
      const fallbackLabel = stateObj ? (stateObj.attributes?.friendly_name || stateObj.entity_id.split('.')[1]) : (resolvedEntity || '');
      const finalLabelText = (this.config.global_id && this.config.global_id !== 'manual' && this._get('use_alias_name', false)) ? (resolvedAliasName || fallbackLabel) : (this._get('label_text', '') || fallbackLabel);
      
      if (isCirc) {
        labelHtml = html`<span style="color:${lColor}; font-size:${lSizeStr}; font-weight:${lWeight}; text-shadow:0 1px 2px rgba(0,0,0,0.5); opacity: 0.8; transform: translateY(${parseDim(this._get('circular_label_offset_y', 0), `0cqmin`, 'cqmin')}); display: block; transition: color 0.1s linear;">${finalLabelText}</span>`;
      } else {
        const lPos = this._get('label_position', 'center'); 
        let ljc = 'center', lai = 'center'; 
        if (lPos.includes('left')) ljc = 'flex-start'; else if (lPos.includes('right')) ljc = 'flex-end'; 
        if (lPos.includes('top')) lai = 'flex-start'; else if (lPos.includes('bottom')) lai = 'flex-end';
        
        labelHtml = html`
          <div class="sc-pb-labels" style="display:flex; width:100%; height:100%; position:absolute; inset:0; pointer-events:none; z-index:${ELM_FLOAT}; justify-content:${ljc}; align-items:${lai}; padding:4px 8px; box-sizing:border-box;">
            <span style="color:${lColor}; font-size:${lSizeStr}; font-weight:${lWeight}; text-shadow:0 1px 2px rgba(0,0,0,0.5); white-space:nowrap; transform: translate(${parseDim(this._get('label_offset_x', 0), `0${u}`, u)}, ${parseDim(this._get('label_offset_y', 0), `0${u}`, u)}) rotate(${this._get('label_rotation', '0')}deg); display:inline-block; transition: color 0.1s linear;">${finalLabelText}</span>
          </div>`;
      }
    }

    if (this._get('show_value', false)) {
      const vSizeStr = parseDim(this._get('value_font_size', 12), `12${u}`, u); 
      const vWeight = this._get('value_bold', false) ? 'bold' : 'normal';
      let vColor = this._get('value_color', 'var(--primary-text-color)'); 
      
      if (this._get('value_color_adaptive_bar', false)) vColor = isCirc ? exactHexColor : contrastColor(exactHexColor); 
      else if (this._get('value_color_adaptive_theme', false)) vColor = contrastColor(extractHex('var(--primary-background-color)'));
      
      if (isCirc) {
        valueHtml = html`<span style="color:${vColor}; font-size:${vSizeStr}; font-weight:${vWeight}; text-shadow:0 1px 2px rgba(0,0,0,0.5); transform: translateY(${parseDim(this._get('circular_value_offset_y', 0), `0cqmin`, 'cqmin')}); display: block; transition: color 0.1s linear;">${displayValue}</span>`;
      } else {
        const vPos = this._get('value_position', 'center'); 
        const vRot = parseInt(this._get('value_rotation', '0')); 
        const spanStyle = `color:${vColor}; font-size:${vSizeStr}; font-weight:${vWeight}; text-shadow:0 1px 2px rgba(0,0,0,0.5); white-space:nowrap; transform: rotate(${vRot}deg); display: inline-block; transition: color 0.1s linear;`;
        
        if (vPos === 'floating') {
          const fvVertRot = Math.abs(vRot) === 90; 
          const fvHw = `calc(${vSizeStr} * (${displayValue.length} * 0.3 + 0.2) + 4px)`; 
          const fvHh = `calc(${vSizeStr} * 0.6 + 2px)`; 
          const fvClampBase = isHoriz ? (fvVertRot ? fvHh : fvHw) : (fvVertRot ? fvHw : fvHh);
          
          // NEW: Smart indent add-on for the floating text
          let fvClampMin = fvClampBase;
          let fvClampMax = fvClampBase;
          if (isHoriz && hasCardRadius) {
            if (this._isAtLeftEdge) fvClampMin = `calc(${fvClampBase} + ${edgeIndentStr})`;
            if (this._isAtRightEdge) fvClampMax = `calc(${fvClampBase} + ${edgeIndentStr})`;
          }
          
          floatingValueHtml = html`
            <div style="${isHoriz ? `position:absolute; top:50%; left:clamp(${fvClampMin}, calc(${targetPct} * 100%), calc(100% - (${fvClampMax}))); transform: translate(-50%, -50%) translateZ(0); z-index:${ELM_FLOAT}; display:flex; align-items:center; justify-content:center; pointer-events:none; transition: left var(--pb-anim-dur) var(--pb-bounce-ease);` : `position:absolute; left:50%; bottom:clamp(${fvClampBase}, calc(${targetPct} * 100%), calc(100% - (${fvClampBase}))); transform: translate(-50%, 50%) translateZ(0); z-index:${ELM_FLOAT}; display:flex; align-items:center; justify-content:center; pointer-events:none; transition: bottom var(--pb-anim-dur) var(--pb-bounce-ease);`}">
              <span style="${spanStyle}">${displayValue}</span>
            </div>`;
        } else {
          let alignStyles = 'justify-content:center; align-items:center;'; 
          if (vPos === 'start') alignStyles = isHoriz ? 'justify-content:flex-start; padding-left:8px;' : 'align-items:flex-end; padding-bottom:8px; flex-direction:column;'; 
          else if (vPos === 'end') alignStyles = isHoriz ? 'justify-content:flex-end; padding-right:8px;' : 'align-items:flex-start; padding-top:8px; flex-direction:column;';
          
          valueHtml = html`
            <div class="sc-pb-labels" style="display:flex; width:100%; height:100%; position:absolute; inset:0; pointer-events:none; z-index:${ELM_FLOAT}; ${alignStyles}">
              <span style="${spanStyle}">${displayValue}</span>
            </div>`;
        }
      }
    }

    if (isCirc) {
      const circScale = safeFloat(this._get('circular_scale', 100), 100) / 100;
      const circWrapper = html`<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; z-index:${ELM_FLOAT}; gap: 2${u}; transform: scale(${circScale}); transform-origin: center;">${valueHtml}${labelHtml}</div>`;
      labelHtml = ''; 
      valueHtml = circWrapper;
    }

    const bounceInt = safeFloat(this._get('bounce_intensity', 50), 50);
    const bounceEase = getBounceEase(bounceInt);

    const hostCSS = `width: ${w}; height: ${h}; --pb-radius: ${radius}; --pb-bg-color: ${bgColor}; --pb-bounce-ease: ${bounceEase};`;

    return html`
      <style>:host { ${hostCSS} --pb-anim-dur: ${animDur}s; }</style>
      
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
        <div class="sc-liquid-layer ${isGooey ? 'gooey' : ''}">
          ${isCirc ? circularHtml : html`<div class="sc-pb-fill ${orientation}" style="${fillStyle}"></div>`}
          ${indicatorGooeyHtml}
        </div>
        
        ${floatingValueHtml}
        
        ${this._get('show_ticks', false) && !isCirc ? html`
          <div class="sc-pb-subticks" style="position:absolute; inset:0; z-index:${ELM_DYNAMIC + 40};">${subtickElementsEmptyArr}</div>
          <div class="sc-pb-ticks" style="z-index:${ELM_DYNAMIC + 50}; ${ticksStyle}">${tickElementsEmptyArr}</div>
          ${tickLabelsEmptyHtml}
          
          <div style="position:absolute; inset:0; z-index:${ELM_DYNAMIC + 55}; clip-path: ${fillClipPath}; transition: clip-path var(--pb-anim-dur) var(--pb-bounce-ease); pointer-events:none;">
            <div class="sc-pb-subticks" style="position:absolute; inset:0;">${subtickElementsFilledArr}</div>
            <div class="sc-pb-ticks" style="position:absolute; inset:0; ${ticksStyle}">${tickElementsFilledArr}</div>
            ${tickLabelsFilledHtml}
          </div>
        ` : ''}
        
        ${labelHtml}
        ${valueHtml}
        
        ${indicatorTopHtml}
      </div>`;
  }
}
if (!customElements.get('sc-progressbar')) customElements.define('sc-progressbar', ScProgressbar);

// ==========================================
// 3. THE EDITOR COMPONENT
// ==========================================
const isCirc = cfg => String(cfg.orientation).startsWith('circular');
const isLin = cfg => !String(cfg.orientation).startsWith('circular');

const STYLE_FIELDS = [
  { id: '_section_shape',      label: '── Shape & Position',    type: 'section' },
  { id: 'orientation',         label: 'Orientation / Layout',  type: 'select', options: [
    { value: 'horizontal', label: '↔ Linear horizontal' },
    { value: 'vertical', label: '↕ Linear vertical' },
    { value: 'circular_donut', label: '⭕ Circular: Donut (full circle 360°)' },
    { value: 'circular_speedo', label: '⏱️ Circular: Speedo (270°, open at bottom)' },
    { value: 'circular_half', label: '🕳️ Circular: Half circle (180°)' }
  ] },
  { id: 'base_unit',           label: 'Global scaling unit (base unit)', type: 'select', options: [
    { value: 'auto', label: 'Auto (linear: px, circular: cqmin)' },
    { value: 'px', label: 'px (fixed)' },
    { value: 'cqmin', label: 'cqmin (scales with smallest edge)' },
    { value: 'cqw', label: 'cqw (scales with width)' },
    { value: 'cqh', label: 'cqh (scales with height)' }
  ] },
  { id: 'circular_start_position', label: 'Start position (clock)', type: 'select', options: [
    { value: '0', label: '12 o’clock (top)' },
    { value: '90', label: '3 o’clock (right)' },
    { value: '180', label: '6 o’clock (bottom)' },
    { value: '-90', label: '9 o’clock (left)' }
  ], condition: cfg => isCirc(cfg) },
  { id: 'circular_reverse',      label: 'Reverse direction (counter-clockwise)', type: 'checkbox', condition: cfg => isCirc(cfg) },
  { id: 'circular_stroke_width', label: 'Ring thickness / segment height (%)', type: 'range', min: 1, max: 50, step: 1, placeholder: '10', condition: cfg => isCirc(cfg) },
  { id: 'circular_scale',        label: 'Ring scale (%)', type: 'range', min: 10, max: 100, step: 1, placeholder: '100', condition: cfg => isCirc(cfg) },
  { id: 'circular_glow',         label: 'Neon glow effect',      type: 'checkbox', condition: cfg => isCirc(cfg) },
  { id: 'width',               label: 'Width (CSS)',          type: 'text',   placeholder: '100% or 20px' },
  { id: 'height',              label: 'Height (CSS)',            type: 'text',   placeholder: '20px or 100%' },
  { id: 'border_radius',       label: 'Corner radius',           type: 'range',  min: 0, max: 50, step: 0.1,   placeholder: '4px', condition: cfg => isLin(cfg) },
  { id: 'circular_border_radius', label: 'Background corner radius (%)', type: 'range', min: 0, max: 50, step: 1, placeholder: '50', condition: cfg => isCirc(cfg) },
  { id: 'position_mode',       label: 'Anchor point / position', type: '9-sector' },
  { id: 'offset_x',            label: 'X offset (px or %)', type: 'text', placeholder: '0px' },
  { id: 'offset_y',            label: 'Y offset (px or %)', type: 'text', placeholder: '0px' },

  { id: '_section_colors',     label: '── Colors, Gradient & Animation',   type: 'section' },
  { id: 'animation_duration',  label: 'Animation duration (s)',  type: 'range',  min: 0, max: 10, step: 0.1, placeholder: '0.4' },
  { id: 'bounce_intensity', label: 'Bounce intensity (%)', type: 'range', min: 0, max: 30, dynamic_step: true, placeholder: '50' },
  { id: 'bg_color',            label: 'Background color',      type: 'color',  placeholder: '#ffffff' },
  { id: 'bg_opacity',          label: 'Background opacity (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '10' },
  { id: 'fill_color',          label: 'Fill color (solid)',     type: 'color',  placeholder: 'var(--primary-color)' },
  { id: 'use_gradient',        label: 'Use gradient', type: 'checkbox' },
  { id: 'gradient_as_solid',   label: 'Derive color from gradient (dynamic)', type: 'checkbox', condition: cfg => cfg.use_gradient },
  { id: 'gradient_stops',      label: 'Gradient color stops',    type: 'gradient-stops', condition: cfg => cfg.use_gradient },

  { id: '_section_scale',      label: '── Value Range & Main Ticks', type: 'section' },
  { id: 'min',                 label: 'Minimum',               type: 'number', placeholder: '0' },
  { id: 'max',                 label: 'Maximum',               type: 'number', placeholder: '100' },
  { id: 'origin',              label: 'Start point (value, e.g. 0)', type: 'number', placeholder: 'Empty = minimum' },

  { id: 'show_ticks',          label: 'Show ticks',        type: 'checkbox', condition: cfg => isLin(cfg) },
  { id: 'tick_count',          label: 'Number of ticks (when interval is empty)', type: 'range',  min: 0, max: 51, step: 1, placeholder: '10',  condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_interval',       label: 'Tick interval (value step)', type: 'number', placeholder: 'e.g. 10', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_hide_last',      label: 'Hide last tick line', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_align',          label: 'Start point / alignment', type: 'select', options: [{value:'center', label:'Centered'}, {value:'start', label:'At edge (top/left)'}, {value:'end', label:'Opposite (bottom/right)'}, {value:'full', label:'Full width (100%)'}], condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_mirror_side',    label: 'Also mirror on other side', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && (cfg.tick_align === 'start' || cfg.tick_align === 'end') },
  { id: 'tick_length',         label: 'Main tick length (%, px)', type: 'text', placeholder: '100%', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_width',          label: 'Tick width (px or %)', type: 'text', placeholder: '1', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_color_adaptive', label: 'Dual-adaptive color (inverted at fill level)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_color',          label: 'Manual color',        type: 'color',  placeholder: 'rgba(255,255,255,0.3)', condition: cfg => isLin(cfg) && cfg.show_ticks && !cfg.tick_color_adaptive },

  { id: '_section_segments',   label: '── Segments (circle)',   type: 'section', condition: cfg => isCirc(cfg) },
  { id: 'circular_segmented',  label: 'Split circle into pill segments', type: 'checkbox', condition: cfg => isCirc(cfg) },
  { id: 'circular_segment_count', label: 'Number of segments', type: 'range', min: 2, max: 100, step: 1, placeholder: '40', condition: cfg => isCirc(cfg) && cfg.circular_segmented },
  { id: 'circular_segment_thickness', label: 'Pill thickness (%)', type: 'range', min: 0.1, max: 10, step: 0.1, placeholder: '2', condition: cfg => isCirc(cfg) && cfg.circular_segmented },

  { id: '_section_subticks',   label: '── Subticks',           type: 'section', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'show_subticks',       label: 'Show subticks',     type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'subtick_count',       label: 'Count per interval',  type: 'number', placeholder: '4', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks },
  { id: 'subtick_pos',         label: 'Start point / alignment', type: 'select', options: [{value:'main', label:'Same as main ticks'}, {value:'center', label:'Centered'}, {value:'start', label:'At edge (top/left)'}, {value:'end', label:'Opposite (bottom/right)'}, {value:'full', label:'Full width (100%)'}], placeholder: 'main', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks },
  { id: 'subtick_mirror_side', label: 'Also mirror on other side', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks && (cfg.subtick_pos === 'start' || cfg.subtick_pos === 'end') },
  { id: 'subtick_length',      label: 'Subtick length (% or px)',type: 'text', placeholder: '50%', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks && cfg.subtick_pos !== 'full' },
  { id: 'subtick_width',       label: 'Width (px or %)',    type: 'text', placeholder: '1', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks },
  { id: 'subtick_color_adaptive', label: 'Dual-adaptive color (inverted at fill level)', type: 'checkbox', placeholder: 'false', default: false, condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks },
  { id: 'subtick_color',       label: 'Manual color',        type: 'color', placeholder: 'rgba(255,255,255,0.2)', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_subticks && !cfg.subtick_color_adaptive },

  { id: '_section_custom_ticks', label: '── Custom Ticks', type: 'section', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'custom_ticks',        label: 'Insert additional / manual ticks', type: 'custom-ticks', condition: cfg => isLin(cfg) && cfg.show_ticks },

  { id: '_section_tick_labels',label: '── Tick Labels',        type: 'section', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'show_tick_labels',    label: 'Show tick labels (numbers)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks },
  { id: 'tick_labeled_extralength', label: 'Extra length at labels', type: 'text', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_label_step',     label: 'Only every Xth label (1=all)', type: 'number', placeholder: '1', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_decimals',label: 'Decimal places',        type: 'number', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_size',    label: 'Font size (CSS text)', type: 'text', placeholder: '10', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_hide_unit', label: 'Hide unit', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_hide_first', label: 'Hide first label (min)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_hide_last', label: 'Hide last label (max)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_rotation',  label: 'Text rotation', type: 'select', options: [
    { value: '0', label: '0° (horizontal)' },
    { value: '90', label: '90°' },
    { value: '-90', label: '-90°' },
    { value: '180', label: '180° (upside down)' }
  ], condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_color_adaptive', label: 'Dual-adaptive color (inverted at fill level)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_color',   label: 'Custom color',          type: 'color', placeholder: 'var(--secondary-text-color)', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels && !cfg.tick_labels_color_adaptive },
  { id: 'tick_labels_pos',     label: 'Positioning',        type: 'select', options: [{value:'start', label:'Before / above'}, {value:'end', label:'After / below'}, {value:'center', label:'Centered'}], condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_shift',   label: 'Offset from center', type: 'text', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels },
  { id: 'tick_labels_tick_gap',label: 'Gap to tick', type: 'text', placeholder: '4', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels && cfg.tick_labels_pos !== 'center' },
  { id: 'tick_labels_center_gap_offset', label: 'Adjust center gap', type: 'text', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_ticks && cfg.show_tick_labels && cfg.tick_labels_pos === 'center' },

  { id: '_section_label',      label: '── Label (Name/Label)', type: 'section' },
  { id: 'show_label',          label: 'Show name / label', type: 'checkbox' },
  { id: 'label_font_size',     label: 'Font size (e.g. 12 or 12cqw)', type: 'text', placeholder: '12',  condition: cfg => cfg.show_label },
  { id: 'label_bold',          label: 'Bold',   type: 'checkbox', condition: cfg => cfg.show_label },
  { id: 'label_color',         label: 'Text color (manual)',   type: 'color',  placeholder: 'var(--primary-text-color)', condition: cfg => cfg.show_label && !cfg.label_color_adaptive_bar && !cfg.label_color_adaptive_theme },
  { id: 'label_color_adaptive_bar',   label: 'Adaptive: contrast to bar color', type: 'checkbox', condition: cfg => cfg.show_label && isLin(cfg) },
  { id: 'label_color_adaptive_bar',   label: 'Take color from gradient', type: 'checkbox', condition: cfg => cfg.show_label && isCirc(cfg) },
  { id: 'label_color_adaptive_theme', label: 'Adaptive: HA theme (light/dark)',   type: 'checkbox', condition: cfg => cfg.show_label },
  { id: 'label_position',      label: 'Position in the bar',    type: '9-sector', condition: cfg => isLin(cfg) && cfg.show_label },
  { id: 'label_offset_x',      label: 'X offset',  type: 'text', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_label },
  { id: 'label_offset_y',      label: 'Y offset',  type: 'text', placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_label },
  { id: 'circular_label_offset_y', label: 'Y offset in circle (%)', type: 'range', min: -100, max: 100, step: 1, placeholder: '0', condition: cfg => isCirc(cfg) && cfg.show_label },
  { id: 'label_rotation',      label: 'Text rotation',         type: 'select', options: [
    { value: '0', label: '0° (horizontal)' },
    { value: '90', label: '90°' },
    { value: '-90', label: '-90°' }
  ], condition: cfg => isLin(cfg) && cfg.show_label },

  { id: '_section_value',      label: '── Value & Label', type: 'section' },
  { id: 'show_value',          label: 'Show value',         type: 'checkbox' },
  { id: 'value_animated',      label: 'Animate value (follow fill level)', type: 'checkbox', condition: cfg => cfg.show_value },
  { id: 'value_font_size',     label: 'Font size (e.g. 12 or 12cqw)', type: 'text', placeholder: '12', condition: cfg => cfg.show_value },
  { id: 'value_rotation',      label: 'Text rotation',         type: 'select', options: [
    { value: '0', label: '0° (default)' },
    { value: '90', label: '90° (clockwise)' },
    { value: '-90', label: '-90° (counter-clockwise)' }
  ], condition: cfg => isLin(cfg) && cfg.show_value },
  { id: 'value_color',         label: 'Text color (manual)',   type: 'color',  placeholder: 'var(--primary-text-color)', condition: cfg => cfg.show_value && !cfg.value_color_adaptive_bar && !cfg.value_color_adaptive_theme },
  { id: 'value_color_adaptive_bar',   label: 'Adaptive: contrast to bar color', type: 'checkbox', condition: cfg => cfg.show_value && isLin(cfg) },
  { id: 'value_color_adaptive_bar',   label: 'Take color from gradient', type: 'checkbox', condition: cfg => cfg.show_value && isCirc(cfg) },
  { id: 'value_color_adaptive_theme', label: 'Adaptive: HA theme (light/dark)',   type: 'checkbox', condition: cfg => cfg.show_value },
  { id: 'value_bold',          label: 'Bold',   type: 'checkbox', condition: cfg => cfg.show_value },
  { id: 'value_decimals',      label: 'Decimal places',      type: 'range',  min: 0, max: 3, step: 1, placeholder: '0', condition: cfg => cfg.show_value },
  { id: 'value_unit',          label: 'Custom unit (e.g. %)', type: 'text', placeholder: 'Optional', condition: cfg => cfg.show_value },
  { id: 'value_position',      label: 'Text position',         type: 'select', options: [
    { value: 'center',   label: 'Centered in bar' },
    { value: 'start',    label: 'At the start' },
    { value: 'end',      label: 'At the end' },
    { value: 'floating', label: 'Follows the fill level' }
  ], condition: cfg => isLin(cfg) && cfg.show_value },
  { id: 'circular_value_offset_y', label: 'Y offset in circle (%)', type: 'range', min: -100, max: 100, step: 1, placeholder: '0', condition: cfg => isCirc(cfg) && cfg.show_value },

  { id: '_section_indicator',  label: '── Indicator & Pill',  type: 'section', condition: cfg => isLin(cfg) },
  { id: 'show_indicator',      label: 'Show indicator line', type: 'checkbox', condition: cfg => isLin(cfg) },
  { id: 'indicator_color',     label: 'Line color',       type: 'color',  placeholder: '#ffffff', condition: cfg => isLin(cfg) && cfg.show_indicator },
  { id: 'indicator_thickness', label: 'Line thickness (px/%)',type: 'text', placeholder: '2px', condition: cfg => isLin(cfg) && cfg.show_indicator },
  { id: 'indicator_value',     label: 'Show pill with value on line', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_indicator },
  { id: 'value_animated',      label: 'Animate value (follow fill level)', type: 'checkbox', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_value_rotation', label: 'Pill rotation', type: 'select', options: [
    { value: 'auto', label: 'Auto (H ↔ V crossed)' },
    { value: '0', label: '0° (horizontal)' },
    { value: '90', label: '90°' },
    { value: '-90', label: '-90°' },
    { value: '180', label: '180° (upside down)' }
  ], condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_value_decimals', label: 'Pill decimal places', type: 'range', min: 0, max: 3, step: 1, placeholder: '0', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_value_adaptive_mode', label: 'Adaptive behavior', type: 'select', options: [
    { value: 'none', label: 'None (manual colors)' },
    { value: 'pill', label: 'Whole pill (background adaptive, text contrast)' },
    { value: 'text', label: 'Text only (text adaptive, background manual)' }
  ], condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_value_bg',  label: 'Pill background color', type: 'color',  placeholder: '#000000', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value && cfg.indicator_value_adaptive_mode !== 'pill' },
  { id: 'indicator_value_opacity', label: 'Pill opacity (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '100', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_glass_effect', label: 'Glass effect (pill)', type: 'select', options: [
    { value: 'none', label: 'No effect (default)' },
    { value: 'glass_gooey', label: 'Liquid & gooey (3D glass + merging)' },
    { value: 'glass_clean', label: 'Clean frost (Apple style)' },
    { value: 'glass_clear', label: 'Clear 3D glass' },
    { value: 'glass_lens', label: 'Convex lens (magnifier)' },
    { value: 'glass_dark', label: 'Dark tinted glass' }
  ], condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
  { id: 'indicator_value_color', label: 'Pill text color',     type: 'color',  placeholder: '#ffffff', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value && cfg.indicator_value_adaptive_mode === 'none' },
  { id: 'indicator_value_font_size', label: 'Pill font size (CSS text)', type: 'text', placeholder: '10', condition: cfg => isLin(cfg) && cfg.show_indicator && cfg.indicator_value },
];

class ScProgressbarEditor extends LitElement {
  static get properties() {
    return { hass: { type: Object }, slot: { type: Object }, commitFn: { type: Function }, _openStates: { type: Object, state: true } };
  }

  constructor() {
    super();
    this._openStates = {};
  }

  static get styles() {
    return css`
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

  _addProgressbar(bars) {
    const newBars = JSON.parse(JSON.stringify(bars));
    newBars.push({ entity: '', attribute: '', label_text: '' });
    this._openStates[`pb_${newBars.length - 1}`] = true;
    this.commitFn('progressbars', newBars);
  }

  _removeProgressbar(idx, bars) {
    const newBars = JSON.parse(JSON.stringify(bars));
    newBars.splice(idx, 1);
    this.commitFn('progressbars', newBars);
  }

  _renderField(field, cfg, updateDirect, updateDebounced) {
    if (field.condition && !field.condition(cfg)) return html``;
    let content;
    const val = cfg[field.id];

    switch (field.type) {
      case 'section':
        content = html`<div class="section-title">${field.label}</div>`;
        break;
      case 'checkbox':
        content = html`
          <div class="row">
            <label>${field.label}</label>
            <ha-switch .checked=${val === true} @change=${e => updateDirect(e.target.checked)}></ha-switch>
          </div>`;
        break;
      case 'select':
        content = html`
          <div class="row">
            <label>${field.label}</label>
            <select style="width:50%" @change=${e => updateDirect(e.target.value)}>
              ${field.options.map(opt => html`<option value="${opt.value}" ?selected=${val === opt.value}>${opt.label}</option>`)}
            </select>
          </div>`;
        break;
      case '9-sector': {
        const sectors = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'];
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <div class="sector-grid">
              ${sectors.map(s => html`<div class="sector-btn ${val === s ? 'active' : ''}" title="${s}" @click=${() => updateDirect(s)}></div>`)}
            </div>
          </div>`;
        break;
      }
      case 'range':
        content = html`
          <div class="col">
            <label>${field.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;">${val ?? field.placeholder ?? ''}</span></label>
            <input type="range" 
              min=${field.min ?? 0} 
              max=${field.max ?? 100} 
              step=${field.dynamic_step ? ((val ?? field.placeholder ?? 0) < 10 ? "0.1" : "1") : (field.step ?? 1)} 
              .value=${val ?? field.placeholder ?? 0} 
              @input=${e => {
                let v = parseFloat(e.target.value);
                if (field.dynamic_step) e.target.step = v < 10 ? "0.1" : "1";
                updateDirect(v);
              }}>
          </div>`;
        break;
      case 'color':
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <div class="color-row">
              <input type="color" .value=${val || '#000000'} @input=${e => updateDirect(e.target.value)}>
              <input type="text" .value=${val || ''} placeholder="${field.placeholder || ''}" @input=${e => updateDebounced(e.target.value)}>
            </div>
          </div>`;
        break;
      case 'gradient-stops': {
        const stops = Array.isArray(val) && val.length > 0
          ? val : [{ color: '#2196f3', pos: 0 }, { color: '#4caf50', pos: 100 }];
        const previewGrad = stops.map(s => `${s.color} ${s.pos}%`).join(', ');
        const updStop = n => updateDirect(n);
        
        const distributeStops = () => {
          if (stops.length < 2) return;
          const step = 100 / (stops.length - 1);
          updStop(stops.map((s, i) => ({ ...s, pos: Math.round(i * step) })));
        };

        content = html`
          <div class="col">
            <label>${field.label}</label>
            <div class="stops-preview" style="background: linear-gradient(90deg, ${previewGrad})"></div>
            ${stops.map((s, si) => html`
              <div class="stop-row">
                <input type="color" .value=${s.color} @input=${e => updStop(stops.map((x,i) => i===si ? {...x, color: e.target.value} : x))}>
                <input type="text"  .value=${s.color} @input=${e => updStop(stops.map((x,i) => i===si ? {...x, color: e.target.value} : x))}>
                <input type="number" min="0" max="100" .value=${s.pos} @input=${e => updStop(stops.map((x,i) => i===si ? {...x, pos: parseInt(e.target.value)||0} : x))}>
                <span style="font-size:10px;opacity:.6">%</span>
                ${stops.length > 2 ? html`<button class="del-btn" @click=${() => updStop(stops.filter((_,i) => i !== si))}>✕</button>` : ''}
              </div>`)}
            <div style="display:flex; gap:6px; margin-top:4px;">
              <button type="button" class="add-btn" style="flex:1; margin-top:0;" @click=${() => updStop([...stops, { color: '#ffffff', pos: 100 }])}>＋ Stop</button>
              <button type="button" class="add-btn" style="flex:1; margin-top:0; border-color:var(--secondary-text-color); color:var(--secondary-text-color);" @click=${distributeStops}>⇿ Distribute</button>
            </div>
          </div>`;
        break;
      }
      case 'custom-ticks': {
        const ct = Array.isArray(val) ? val : [];
        const updCt = n => updateDirect(n);
        content = html`
          <div class="col">
            <label>${field.label}</label>
            ${ct.map((t, ti) => html`
              <div class="stop-row" style="flex-wrap:wrap; gap:6px; margin-bottom:4px; padding:8px; background:rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-radius:6px;">
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Value</span>
                  <input type="number" placeholder="Value" style="width:40px" .value=${t.value ?? 50} @input=${e => updCt(ct.map((x,i) => i===ti ? {...x, value: parseFloat(e.target.value)||0} : x))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="color" .value=${t.color || '#ff0000'} @input=${e => updCt(ct.map((x,i) => i===ti ? {...x, color: e.target.value} : x))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Width</span>
                  <input type="text" style="width:40px" placeholder="W(px/%)" .value=${t.width || '2px'} @input=${e => updCt(ct.map((x,i) => i===ti ? {...x, width: e.target.value} : x))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:10px; color:var(--secondary-text-color);">Length</span>
                  <input type="text" style="width:45px" placeholder="main" title="Empty or 'main' for main tick length" .value=${t.length || ''} @input=${e => updCt(ct.map((x,i) => i===ti ? {...x, length: e.target.value} : x))}>
                </div>
                <div style="display:flex; align-items:center; gap:4px; flex:1;">
                  <select style="width:100%; font-size:11px; padding:2px;" @change=${e => updCt(ct.map((x,i) => i===ti ? {...x, align: e.target.value} : x))}>
                    <option value="main" ?selected=${!t.align || t.align === 'main'}>Pos: Same as main</option>
                    <option value="center" ?selected=${t.align === 'center'}>Pos: Centered</option>
                    <option value="start" ?selected=${t.align === 'start'}>Pos: Edge 1</option>
                    <option value="end" ?selected=${t.align === 'end'}>Pos: Edge 2</option>
                    <option value="full" ?selected=${t.align === 'full'}>Pos: Full</option>
                  </select>
                </div>
                ${(t.align === 'start' || t.align === 'end') ? html`
                  <div style="display:flex; align-items:center; gap:2px;" title="Mirror to other side">
                    <input type="checkbox" .checked=${!!t.mirror} @change=${e => updCt(ct.map((x,i) => i===ti ? {...x, mirror: e.target.checked} : x))}>
                    <span style="font-size:10px; opacity:0.8;">🪞</span>
                  </div>
                ` : ''}
                <button class="del-btn" @click=${() => updCt(ct.filter((_,i) => i !== ti))}>✕</button>
              </div>`)}
            <button type="button" class="add-btn" style="margin-top:4px; padding:6px;"
              @click=${() => updCt([...ct, { value: 50, color: '#ff0000', width: '2px', length: '', align: 'main', mirror: false }])}>＋ Add custom tick</button>
          </div>`;
        break;
      }
      default:
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <input type=${field.type === 'number' ? 'number' : 'text'} .value=${val ?? ''} placeholder="${field.placeholder || ''}"
              @input=${e => updateDebounced(field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}>
          </div>`;
        break;
    }
    return html`<div class="field-wrapper">${content}</div>`;
  }

  _renderFieldsGroup(fields, cfg, idx, bars) {
    let timeout;
    const updateDirect    = (key, val) => { const n = JSON.parse(JSON.stringify(bars)); n[idx][key] = val; this.commitFn('progressbars', n); };
    const updateDebounced = (key, val) => { clearTimeout(timeout); timeout = setTimeout(() => updateDirect(key, val), 400); };

    const groups = [];
    let cur = null;
    fields.forEach(f => {
      if (f.type === 'section') { if (cur) groups.push(cur); cur = { label: f.label.replace('── ', ''), fields: [] }; }
      else if (cur) cur.fields.push(f);
    });
    if (cur) groups.push(cur);

    return html`
      ${groups.map(g => {
        const visibleFields = g.fields.filter(f => !f.condition || f.condition(cfg));
        if (visibleFields.length === 0) return html``;

        const sKey = `s_${idx}_${g.label}`;
        if (this._openStates[sKey] === undefined) this._openStates[sKey] = false;
        return html`
          <details class="sub-section" ?open=${this._openStates[sKey]}
            @toggle=${e => { this._openStates[sKey] = e.target.open; this.requestUpdate(); }}>
            <summary>${g.label}</summary>
            <div class="sub-content">
              ${g.fields.map(f => this._renderField(f, cfg, v => updateDirect(f.id, v), v => updateDebounced(f.id, v)))}
            </div>
          </details>`;
      })}`;
  }

  _renderBarPanel(entry, idx, bars) {
    let resolvedEntity = entry.entity;
    let isAlias = false;
    let aliasObj = null;

    if (entry.global_id && entry.global_id !== 'manual') {
      const foundAlias = (this.slot?.global_entities || []).find(g => g.id === entry.global_id);
      if (foundAlias) {
        resolvedEntity = foundAlias.entity;
        isAlias = true;
        aliasObj = foundAlias;
      }
    }

    let title = '';
    if (isAlias) {
      const s = resolvedEntity ? this.hass?.states[resolvedEntity] : null;
      const friendly = s ? (s.attributes.friendly_name || resolvedEntity) : (resolvedEntity || 'Unnamed');
      let val = s ? (aliasObj.attribute ? s.attributes[aliasObj.attribute] : s.state) : '-';
      const uom = (s && !aliasObj.attribute && s.attributes.unit_of_measurement) ? ` ${s.attributes.unit_of_measurement}` : '';
      title = `[${aliasObj.alias || 'Alias'}] ${friendly}`;
      if (aliasObj.attribute) title += ` (${aliasObj.attribute})`;
      title += ` ➔ ${val}${uom}`;
    } else {
      title = entry.label_text || '';
      if (!title && resolvedEntity && this.hass?.states[resolvedEntity]) {
        title = this.hass.states[resolvedEntity].attributes.friendly_name || resolvedEntity;
      } else if (!title) {
        title = `Bar ${idx + 1}`;
      }
    }

    const stateKey = `pb_${idx}`;
    if (this._openStates[stateKey] === undefined) this._openStates[stateKey] = false;
    const updateEntry = (key, val) => { const n = JSON.parse(JSON.stringify(bars)); n[idx][key] = val; this.commitFn('progressbars', n); };

    return html`
      <details class="inner-section" ?open=${this._openStates[stateKey]} @toggle=${e => this._openStates[stateKey] = e.target.open}>
        <summary style="opacity: ${entry.active !== false ? '1' : '0.6'};">
          <span>${title}</span>
          <div style="display:flex; gap:12px; align-items:center;" @click=${e => e.stopPropagation()}>
            <ha-switch
              .checked=${entry.active !== false}
              title="Enable / disable bar"
              style="margin-right: 4px;"
              @change=${e => updateEntry('active', e.target.checked)}>
            </ha-switch>
            <button title="Clone"
              style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--primary-color);padding:0;"
              @click=${e => {
                e.preventDefault();
                const n = JSON.parse(JSON.stringify(bars));
                const clone = JSON.parse(JSON.stringify(n[idx]));
                if(clone.label_text) clone.label_text += ' (Copy)';
                n.splice(idx + 1, 0, clone);
                this.commitFn('progressbars', n);
                this._openStates[`pb_${idx + 1}`] = true;
                this.requestUpdate();
              }}>⧉</button>
            <button title="Move up" ?disabled=${idx === 0}
              style="background:none;border:none;cursor:${idx===0?'default':'pointer'};font-size:14px;color:${idx===0?'var(--divider-color,#555)':'var(--primary-text-color)'};padding:0;"
              @click=${e => { e.preventDefault(); if(idx===0) return; const n=JSON.parse(JSON.stringify(bars)); const t=n[idx-1]; n[idx-1]=n[idx]; n[idx]=t; this.commitFn('progressbars',n); }}>▲</button>
            <button title="Move down" ?disabled=${idx === bars.length-1}
              style="background:none;border:none;cursor:${idx===bars.length-1?'default':'pointer'};font-size:14px;color:${idx===bars.length-1?'var(--divider-color,#555)':'var(--primary-text-color)'};padding:0;"
              @click=${e => { e.preventDefault(); if(idx===bars.length-1) return; const n=JSON.parse(JSON.stringify(bars)); const t=n[idx+1]; n[idx+1]=n[idx]; n[idx]=t; this.commitFn('progressbars',n); }}>▼</button>
            <button title="Remove"
              style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;"
              @click=${e => { e.preventDefault(); this._removeProgressbar(idx, bars); }}>🗑</button>
          </div>
        </summary>
        <div class="inner-content">
          <div class="entity-row">
            <label>Internal name / manual label</label>
            <input type="text" .value=${entry.label_text || ''} placeholder="Shown on the bar (if active)"
              ?disabled=${entry.use_alias_name && entry.global_id && entry.global_id !== 'manual'}
              style=${entry.use_alias_name && entry.global_id && entry.global_id !== 'manual' ? 'opacity: 0.5;' : ''}
              @input=${e => updateEntry('label_text', e.target.value)}>
          </div>

          <div class="entity-row" style="margin-top: 4px; margin-bottom: 4px;">
            <label>Data source</label>
            <select style="width: 100%;" @change=${e => updateEntry('global_id', e.target.value)}>
              <option value="manual" ?selected=${entry.global_id === 'manual' || !entry.global_id}>Manual selection</option>
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

                return html`<option value=${ge.id} ?selected=${entry.global_id === ge.id}>${label}</option>`;
              })}
            </select>
          </div>

          ${(entry.global_id && entry.global_id !== 'manual') ? html`
            <div class="row" style="margin-bottom: 8px; background: rgba(3, 169, 244, 0.1); padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(3, 169, 244, 0.2);">
              <label style="color: var(--primary-color);">Use alias name as bar label</label>
              <ha-switch .checked=${!!entry.use_alias_name}
                @change=${e => updateEntry('use_alias_name', e.target.checked)}>
              </ha-switch>
            </div>
          ` : html`
            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
              <div class="entity-row" style="margin-bottom: 8px;">
                <label>Source</label>
                <ha-entity-picker .hass=${this.hass} .allowCustomEntity=${false} .value=${entry.entity || ''} @value-changed=${e => updateEntry('entity', e.detail.value)}></ha-entity-picker>
              </div>
              <div class="entity-row">
                <label>Attribute</label>
                <ha-selector .hass=${this.hass} .selector=${{ attribute: { entity_id: entry.entity || this.slot?.entity || '' } }} .value=${entry.attribute || ''} @value-changed=${e => updateEntry('attribute', e.detail.value || '')}></ha-selector>
              </div>
            </div>
          `}

          ${bars.length > 1 ? html`
            <div class="row" style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--divider-color,#444);">
              <label>Copy style from...</label>
              <select style="width:60%" @change=${e => {
                const srcIdx = parseInt(e.target.value);
                if (isNaN(srcIdx)) return;
                const n = JSON.parse(JSON.stringify(bars));
                const src = n[srcIdx];
                n[idx] = { ...src, entity: n[idx].entity, attribute: n[idx].attribute, label_text: n[idx].label_text, global_id: n[idx].global_id };
                this.commitFn('progressbars', n);
                e.target.value = '';
              }}>
                <option value="" selected disabled>Please select...</option>
                ${bars.map((b,i) => i !== idx ? html`<option value=${i}>Bar ${i+1}${b.label_text?' — '+b.label_text:(b.entity?' — '+b.entity.split('.')[1]:'')}</option>` : '')}
              </select>
            </div>` : ''}
          ${this._renderFieldsGroup(STYLE_FIELDS, entry, idx, bars)}
        </div>
      </details>`;
  }

  render() {
    if (!this.slot) return html``;
    const bars = Array.isArray(this.slot.progressbars) ? this.slot.progressbars : [];
    if (this._openStates['_main'] === undefined) this._openStates['_main'] = false;

    return html`
      <details class="inner-section" ?open=${this._openStates['_main']}
        @toggle=${e => { this._openStates['_main'] = e.target.open; this.requestUpdate(); }}>
        <summary>── Progressbars
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <span style="font-size:10px; opacity:.6; font-weight:400;">
              ${bars.length} Bar${bars.length !== 1 ? 's' : ''}
            </span>
            <ha-switch
              .checked=${!!this.slot.progressbar_active}
              @click=${e => e.stopPropagation()}
              @change=${e => this.commitFn('progressbar_active', e.target.checked)}>
            </ha-switch>
          </div>
        </summary>
        <div class="inner-content">
          ${!this.slot.progressbar_active ? html`
            <div style="font-size:12px; color:var(--secondary-text-color); text-align:center; padding:8px 0;">
              Module disabled
            </div>` : html`
            ${bars.map((entry, idx) => this._renderBarPanel(entry, idx, bars))}
            <button type="button" class="add-btn" @click=${() => this._addProgressbar(bars)}>
              ＋ Add new progressbar
            </button>`}
        </div>
      </details>`;
  }
}
if (!customElements.get('sc-progressbar-editor')) customElements.define('sc-progressbar-editor', ScProgressbarEditor);

// ==========================================
// 4. BRIDGE TO CORE
// ==========================================
window.SupercardModules = window.SupercardModules || {};
window.SupercardModules['progressbar'] = window.SupercardModules['progressbar'] || {};
Object.assign(window.SupercardModules['progressbar'], (() => {
  function update({ config }) {
    if (!config?.progressbar_active) return {};
    const bars = Array.isArray(config.progressbars) && config.progressbars.length > 0 ? config.progressbars : [];
    if (bars.length === 0) return {};
    return {
      litOverlay: html`${bars.map((cfg, idx) => cfg.active !== false ? html`
        <sc-progressbar data-idx="${idx}" .config=${cfg} .rootConfig=${config} .globalEntities=${config.global_entities}></sc-progressbar>
      ` : '')}`
    };
  }

  function onAfterRender(shadow, config) {
    if (!config?.progressbar_active) return;
    const bars = Array.isArray(config.progressbars) ? config.progressbars : [];
    const hass = document.querySelector('home-assistant')?.hass;
    if (!hass) return;
    shadow.querySelectorAll('sc-progressbar').forEach(el => {
      const idx = parseInt(el.getAttribute('data-idx'));
      el.config = bars[idx];
      el.rootConfig = config;
      el.hass = hass;
      el.globalEntities = config.global_entities;
    });
  }

  function editorFields() { return []; }

  let _cachedEditor = null;
  function renderCustomBlock(commitFn, hass, slot) {
    if (!_cachedEditor) _cachedEditor = document.createElement('sc-progressbar-editor');
    _cachedEditor.commitFn = commitFn;
    _cachedEditor.hass = hass;
    _cachedEditor.slot = slot;
    return _cachedEditor;
  }

  return { update, onAfterRender, initCSS: () => '', editorFields, renderCustomBlock };
})());