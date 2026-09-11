import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { getCellItems, resolveSnap, applyDrag, applyGroupDrag, distributeElements,
         elementsInRect, duplicateElements,
         isSquareLocked, isPinned, DEFAULT_CANVAS, DEFAULT_GRID,
         gridRowsToPx, gridColumnsToPx, gridSize, canvasFromGrid, rescaleCanvas,
         sectionColumns,
         migrateLayoutToCanvas, paintedCells, clickedCells, deadCellTargets,
         repointPatterns, colouredCells, glassedCells, soleElementTargets,
         canvasFromCard,
         canDuplicate, duplicateElement,
         NEW_ELEMENT_KINDS, canAddKind, addElement, newElementPreview } from "./canvas-model.js";

const SC = window.SupercardUtils;

/**
 * Per-element typography, as CSS text.
 *
 * The card puts this on the slot it renders an element into; the canvas
 * editor puts it on the box it previews that element in. It has to be one
 * function, because a size written in em or % resolves against whichever box
 * the element is sitting in - and a preview whose text is a different size
 * from the card's is not previewing the card.
 *
 * @param {any} item element carrying font_size / font_weight / font_color / overflow
 * @param {string} boxSel selector for the box around the element
 * @param {string} elSel selector for the element inside that box
 * @returns {string}
 */
function itemTypography(item, boxSel, elSel) {
  let styles = '';
  const fc = item.font_adaptive ? 'var(--primary-text-color)' : (item.font_color || '');

  if (item.font_size || item.font_weight || item.font_color || item.font_adaptive) {
    const fsInherit = item.font_size ? `font-size: inherit !important;` : '';
    const fw = item.font_weight ? `font-weight:${item.font_weight}!important;` : '';
    const fccss = fc ? `color:${fc}!important;` : '';

    styles += `${elSel} { ${fsInherit}${fw}${fccss} }\n`;

    let vars = '';
    if (item.font_size) {
      const fsBase = `${item.font_size}${item.font_unit||'px'}`;
      const fsVar = `min(${fsBase}, 100cqh, 100cqi)`;
      vars += `font-size: ${fsVar} !important; --sc-fs-n:${fsVar}; --sc-fs-v:${fsVar}; `;
    }
    if (item.font_weight) { vars += `--sc-fw-n:${item.font_weight}; --sc-fw-v:${item.font_weight}; `; }
    if (fc) { vars += `--sc-fc-n:${fc}; --sc-fc-v:${fc}; `; }

    if (vars) { styles += `${boxSel} { ${vars} }\n`; }
  }

  if (item.overflow) {
    styles += `${boxSel} { overflow: visible !important; }
      ${elSel} { overflow: visible !important; max-width: none !important; text-overflow: clip !important; }\n`;
  }

  return styles;
}

// --- AVAILABLE ELEMENTS ---
// Grouped, and with four sub-targets per label, so this is not the flat
// SC.getAvailableElements the other editors use - but which gauges and bars
// exist comes from the same place.
function getLayoutTargets(slot) {
  const elements = [
    { id: 'empty', label: 'Empty', group: 'Basic' },
    { id: 'icon', label: 'Icon (main entity)', group: 'Basic' },
    { id: 'name', label: 'Name (main entity)', group: 'Basic' },
    { id: 'state', label: 'State / value', group: 'Basic' }
  ];

  const { gauges, bars } = SC.listElements(slot);
  for (const g of gauges) elements.push({ ...g, group: 'Gauges' });
  for (const b of bars) elements.push({ ...b, group: 'Progressbars' });

  if (Array.isArray(slot.labels_list)) {
    slot.labels_list.forEach((lbl, idx) => {
      const lblName = lbl.label_text || `Label ${idx + 1}`;
      const statusStr = !lbl.enabled ? ' (disabled)' : '';
      const gName = `Label ${idx + 1} - ${lblName}${statusStr}`;

      elements.push({ id: `label_${idx}`, label: `Complete (container/indicator)`, group: gName });
      elements.push({ id: `label_${idx}_icon`, label: `Icon only`, group: gName });
      elements.push({ id: `label_${idx}_name`, label: `Name only`, group: gName });
      elements.push({ id: `label_${idx}_value`, label: `Value only`, group: gName });
    });
  }

  return elements;
}


// --- LAYOUT RENDERER (LitElement) ---
class ScLayoutRenderer extends LitElement {
  static get properties() { return { config: { type: Object } }; }

  static get styles() {
    return css`
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
      
      /* The canvas: one coordinate space, a fixed aspect ratio, and children
         placed absolutely in percentages of it. Elements reuse .sc-item-slot
         below rather than getting a class of their own - it already carries
         the size container that sc-gauge's 100cqmin resolves against, and
         every typography rule in this file already addresses it. */
      .sc-canvas {
        position: relative; width: 100%;
        margin: 0 auto;
        container-type: size; container-name: cell;
      }
      .sc-canvas .sc-surface { pointer-events: none; }

      /* Only present when the card's height is pinned - by a row count in
         Home Assistant's layout tab, or by this card's absolute height. The
         canvas then has to fit inside a box it did not choose, so it keeps
         its ratio and is letterboxed rather than stretched: a max-height
         alone would clamp the height and leave the width at 100%, which is
         the one thing a fixed aspect ratio exists to prevent.

         Size containment needs a definite height and only gets one here,
         which is exactly what "pinned" means - hence the wrapper rather than
         a rule on .sc-canvas itself. It is also why the unpinned path emits
         no wrapper at all: container-type size against an indefinite height
         collapses the card to nothing. */
      .sc-canvas-fit {
        position: relative; width: 100%; height: 100%;
        container-type: size; container-name: card;
      }

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
      /* The icon draws itself at a fixed 42px plus its border, scaled by
         --sc-scale - and --sc-scale is pinned to 1 on a canvas, so without
         this the box someone drew is ignored: cropped in a small one, lost in
         a large one. The glyph keeps the proportion it has in the content
         row, 24px inside the 44px the container actually occupies. */
      ::slotted(.sc-primary-icon) {
        box-sizing: border-box !important;
        width: 100cqmin !important; height: 100cqmin !important;
        --sc-icon-glyph: 54.5cqmin;
      }
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

  _innerStyle(pos) {
    const m = {
      tl:'start,flex-start,left', tc:'start,center,center', tr:'start,flex-end,right',
      cl:'center,flex-start,left', cc:'center,center,center', cr:'center,flex-end,right',
      bl:'end,flex-start,left', bc:'end,center,center', br:'end,flex-end,right'
    };
    const [ai, jc, ta] = (m[pos] || m['cc']).split(',');
    return `align-items:${ai}; justify-content:${jc}; text-align:${ta};`;
  }

  _getResolvedLabel(id) {
    const labels = this.config?.__moduleData?.labels?.labelsResolved;
    if (!Array.isArray(labels)) return null;
    return labels.find(lbl => lbl.id === id) || null;
  }

  _renderResolvedLabel(id, layoutItem) {
    const match = id.match(/^label_(\d+)(?:_(icon|name|value))?$/);
    if (!match) return html``;
    const lIdx = match[1];
    const part = match[2];

    const item = this._getResolvedLabel(`label_${lIdx}`);
    if (!item || !item.enabled) return html``;

    const isOverflow = layoutItem && layoutItem.overflow;
    const overflowCSS = isOverflow ? 'overflow:visible; white-space:nowrap; max-width:none;' : 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%;';
    const wrapCSS = isOverflow ? 'overflow:visible; max-width:none;' : 'max-width:100%; overflow:hidden;';

    const tName = item.text?.name || '';
    const tValue = item.text?.value || '';

    const lenName = Math.max(1, tName.length) + 1;
    const lenValue = Math.max(1, tValue.length) + 1;

    const factorN = layoutItem?.font_factor || 0.55;
    const factorV = layoutItem?.font_factor || 0.55;

    const shadowCSS = item.text?.shadow ? 'text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5);' : '';
    const iconShadow = item.text?.shadow ? 'filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.8));' : '';

    const nameStyle = `font-size: min(var(--sc-fs-n, inherit), 100cqh, calc(100cqi / (${lenName} * ${factorN}))); font-weight:var(--sc-fw-n, inherit); color:var(--sc-fc-n, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${overflowCSS} ${shadowCSS}`;
    const valueStyle = `font-size: min(var(--sc-fs-v, inherit), 100cqh, calc(100cqi / (${lenValue} * ${factorV}))); font-weight:var(--sc-fw-v, inherit); color:var(--sc-fc-v, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${overflowCSS} ${shadowCSS}`;
    
    const iconSizeVar = `var(--sc-fs-n, ${item.icon.size || '20px'})`;
    const iconTpl = item.icon?.enabled ? html`<ha-icon icon=${item.icon.name} style="--mdc-icon-size:${iconSizeVar}; color:${item.icon.color || 'inherit'}; ${iconShadow} vertical-align:middle; display:inline-flex; align-items:center; flex-shrink:0;"></ha-icon>` : null;

    if (part === 'icon') return iconTpl ? html`<div style="display:flex;align-items:center;justify-content:center;min-width:0;${wrapCSS}">${iconTpl}</div>` : html``;
    if (part === 'name') return html`<span class="sc-lbl-n" style="${nameStyle}">${item.text?.name || ''}</span>`;
    if (part === 'value') return html`<span class="sc-lbl-v" style="${valueStyle}">${item.text?.value || ''}</span>`;
    if (item.mode === 'icon-only') return html`<div style="display:flex;align-items:center;justify-content:center;min-width:0;${wrapCSS}">${iconTpl}</div>`;

    const pre = item.icon?.enabled && item.icon.position === 'before' ? html`<span style="margin-right:${item.icon.gap ?? 4}px;display:inline-flex;flex-shrink:0;">${iconTpl}</span>` : null;
    const suf = item.icon?.enabled && item.icon.position === 'after' ? html`<span style="margin-left:${item.icon.gap ?? 4}px;display:inline-flex;flex-shrink:0;">${iconTpl}</span>` : null;

    if (item.text?.showName !== false) {
      return html`
        <div style="display:flex; flex-direction:column; align-items:inherit; justify-content:inherit; min-width:0; ${wrapCSS}">
          <div style="display:flex; align-items:center; min-width:0; ${wrapCSS}">
            ${pre}<span class="sc-lbl-n" style="${nameStyle}">${item.text?.name || ''}</span>${suf}
          </div>
          ${item.text?.value ? html`<span class="sc-lbl-v" style="${valueStyle} margin-top:2px;">${item.text.value}</span>` : ''}
        </div>`;
    }

    return html`<div style="display:flex; align-items:center; min-width:0; ${wrapCSS}">${pre}<span class="sc-lbl-n" style="${nameStyle}">${item.text?.value || item.text?.name || ''}</span>${suf}</div>`;
  }

  /**
   * Per-element CSS, keyed on data-item-id. Shared by both render paths: the
   * canvas places the same .sc-item-slot boxes the row/cell layout does, so
   * this addresses them identically either way.
   */
  _itemStyles(items) {
    return items.map(item => {
      const box = `.sc-item-slot[data-item-id="${item.id}"]`;
      let styles = itemTypography(item, box, `::slotted([slot="${item.id}"])`);

      // The label module draws its own spans inside the slot, so they need the
      // same release from clipping. Nothing else renders text in there, which
      // is why this stays here rather than in the shared function.
      if (item.overflow) {
        styles += `${box} .sc-lbl-n, ${box} .sc-lbl-v { overflow: visible !important; max-width: none !important; text-overflow: clip !important; }\n`;
      }
      return styles;
    }).filter(Boolean).join('\n');
  }

  /**
   * The canvas path: one coordinate space, elements placed absolutely.
   *
   * Geometry is stored in virtual units and converted to percentages here, so
   * a fixed aspect ratio makes percentage positioning uniform scaling - no
   * measured scale factor is needed. Font sizes need none either: every one
   * in the wild uses container units (cqw, cqmin), which resolve against the
   * element's own size container, and that box is the same either way.
   *
   * Surfaces carry no slot. They exist to be painted by a colour or fx-glass
   * pattern, so they take no pointer events and get a part to address.
   */
  _renderCanvas(canvas) {
    const debug = this.config.layout_debug;
    const els = Array.isArray(canvas.elements) ? canvas.elements : [];
    const pct = (v, total) => `${(v / total * 100).toFixed(4)}%`;

    // Unpinned, the canvas defines the card's height: full width, and the
    // ratio supplies the rest. Pinned, the height is already decided, so the
    // width comes down from it instead and the canvas centres in what is left.
    const fit = this.config.__heightPinned;
    const box = fit
      ? `aspect-ratio: ${canvas.w} / ${canvas.h}; width: min(100%, calc(100cqh * ${(canvas.w / canvas.h).toFixed(6)}));`
      : `aspect-ratio: ${canvas.w} / ${canvas.h};`;

    const canvasHtml = html`
      <div class="sc-canvas ${debug ? 'debug-mode' : ''}" style="${box}">
        ${els.map(el => {
          const box = `left:${pct(el.x, canvas.w)}; top:${pct(el.y, canvas.h)};` +
                      ` width:${pct(el.w, canvas.w)}; height:${pct(el.h, canvas.h)};`;
          if (el.surface) {
            return html`<div class="sc-item-slot sc-surface" part="element-${el.id}"
                             data-item-id="${el.id}" style="${box}"></div>`;
          }

          let containerCSS = '';
          if (el.id?.startsWith('label_')) {
            const match = el.id.match(/^label_(\d+)/);
            if (match) {
              const lblData = this._getResolvedLabel(`label_${match[1]}`);
              if (lblData && lblData.container && lblData.container.isIndicator) {
                const c = lblData.container;
                containerCSS = `background: ${c.bgColor} !important; border-radius: ${c.radius} !important; color: ${c.color} !important; transition: background 0.3s ease, color 0.3s ease, border-radius 0.3s ease; box-sizing: border-box;`;
              }
            }
          }

          return html`
            <div class="sc-item-slot ${el.overflow ? 'overflow-visible' : ''}"
                 part="element-${el.id}" data-item-id="${el.id}"
                 style="${box} ${this._innerStyle(el.inner || 'cc')} ${containerCSS}">
              ${debug ? html`<div class="dbg-id" style="position:absolute; bottom:0; right:0; font-size:9px; color:#fff; background:rgba(244,67,54,0.9); padding:1px 3px; z-index:999; border-radius:3px 0 0 0; font-weight:bold; white-space:nowrap; pointer-events:none;">${el.id}</div>` : ''}
              ${el.id?.startsWith('label_') ? this._renderResolvedLabel(el.id, el) : html`<slot name="${el.id}"></slot>`}
            </div>`;
        })}
      </div>`;

    return html`
      <style>${this._itemStyles(els.filter(e => !e.surface))}</style>
      ${fit ? html`<div class="sc-canvas-fit">${canvasHtml}</div>` : canvasHtml}`;
  }

  render() {
    // Only an explicit `canvas` takes the new path. Migration is the Convert
    // button's job and nothing else's: while both paths exist they have to
    // stay comparable, and switching every card over silently would remove the
    // only way to check that the new one puts things in the same place.
    if (this.config?.canvas) return this._renderCanvas(this.config.canvas);
    if (!this.config?.layout_rows) return html``;
    const rows = this.config.layout_rows;
    const debug = this.config.layout_debug;

    const explicitSum = Math.min(100, rows.reduce((s, r) => s + (parseFloat(r.flex) || 0), 0));
    const autoRows = rows.filter(r => !(parseFloat(r.flex) > 0)).length;

    const typoStyles = this._itemStyles(
      rows.flatMap(row => row.cells.flatMap(cell => getCellItems(cell))));

    return html`
      <style>${typoStyles}</style>
      <div class="sc-layout-master ${debug ? 'debug-mode' : ''}">
        ${rows.map((row, rIdx) => {
          
          let rowPct = 0;
          const flexVal = parseFloat(row.flex) || 0;
          if (flexVal > 0) {
            rowPct = flexVal;
          } else {
            rowPct = autoRows > 0 ? (100 - explicitSum) / autoRows : 0;
          }
          const flexStyle = `flex: 0 0 ${rowPct}%; height: ${rowPct}%;`;

          return html`
            <div class="sc-layout-row" style="${flexStyle}">
              ${row.cells.map((cell, cIdx) => {
                const width = row.auto_width ? 100/row.cells.length : (cell.width||100);
                const cellItems = getCellItems(cell);
                const hasOverflowVisible = !!cell.overflow_visible;
                return html`
                  <div part="cell-${rIdx}-${cIdx}" class="sc-layout-cell ${hasOverflowVisible ? 'overflow-visible' : 'overflow-hidden'} ${cell.debug_grid ? 'debug-flexbox' : ''}" style="flex-basis:${width}%;">
                    ${debug ? html`<div class="dbg-label">Z${rIdx+1}C${cIdx+1} (${Math.round(width*10)/10}%)</div>` : ''}
                    
                    ${cellItems.map((item, iIdx) => {
                      
                      let containerCSS = '';
                      if (item.id?.startsWith('label_')) {
                        const match = item.id.match(/^label_(\d+)/);
                        if (match) {
                          const lblData = this._getResolvedLabel(`label_${match[1]}`);
                          if (lblData && lblData.container && lblData.container.isIndicator) {
                            const c = lblData.container;
                            containerCSS = `background: ${c.bgColor} !important; border-radius: ${c.radius} !important; color: ${c.color} !important; transition: background 0.3s ease, color 0.3s ease, border-radius 0.3s ease; box-sizing: border-box;`;
                          }
                        }
                      }

                      // Named as a part like a canvas element box, so the one
                      // thing the renderer draws itself rather than slotting -
                      // a label - can be reached by the card's own CSS here too.
                      return html`
                      <div class="sc-item-slot ${item.overflow ? 'overflow-visible' : ''}" 
                           part="element-${item.id}" data-item-id="${item.id}" 
                           style="left:${item.x}%; top:${item.y}%; width:${item.w}%; height:${item.h}%; ${this._innerStyle(item.inner||'cc')} ${containerCSS}">
                        
                        ${debug ? html`<div class="dbg-id" style="position:absolute; bottom:0; right:0; font-size:9px; color:#fff; background:rgba(244,67,54,0.9); padding:1px 3px; z-index:999; border-radius:3px 0 0 0; font-weight:bold; white-space:nowrap; pointer-events:none;">${item.id}</div>` : ''}

                        ${item.id?.startsWith('label_') ? this._renderResolvedLabel(item.id, item) : html`<slot name="${item.id}"></slot>`}
                      </div>`;
                    })}
                  </div>`;
              })}
            </div>`;
        })}
      </div>`;
  }
}
if (!customElements.get('sc-layout-renderer')) customElements.define('sc-layout-renderer', ScLayoutRenderer);

// --- THE EDITOR (INCL. TRACKPAD & DRAG'N'DROP) ---
class ScLayoutEditor extends LitElement {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      commitFn: { type: Function },
      _expanded: { type: Object, state: true },
      _dragState: { type: Object, state: true }
    };
  }

  constructor() {
    super();
    this._expanded = ScLayoutEditor._expandedCache ?? {};
    this._dragState = null; 
    this._dndSource = null; // For drag and drop sorting
  }

  static get styles() {
    return css`
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
      
      /* THIS WAS THE BUG: we do NOT ignore the cell-list! This keeps it grabbable. */
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

  _commit(newLayout) {
    this._merge({ layout_rows: newLayout });
  }

  /** The single write path out of this editor. */
  _merge(patch) {
    if (this.commitFn) this.commitFn('__merge__', patch);
  }

  /** Commit `list` with one field of entry `idx` changed. */
  _set(list, idx, key, value) { this._commit(SC.withPatch(list, idx, key, value)); }

  _toggleExpand(key, e) {
    if (e) e.stopPropagation();
    this._expanded = { ...this._expanded, [key]: !this._expanded[key] };
    ScLayoutEditor._expandedCache = this._expanded;
  }

  // --- HTML5 DRAG AND DROP (sorting) ---
  _handleDragStart(e, type, rIdx, cIdx = null) {
    e.stopPropagation();
    this._dndSource = { type, rIdx, cIdx };
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify({type, rIdx, cIdx}));
      
      setTimeout(() => {
        e.target.classList.add('dragging-ghost');
        const wrap = this.shadowRoot.querySelector('.inner-content');
        if (wrap) wrap.classList.add('is-dragging');
      }, 0);
    }
  }

  _handleDragOver(e, type) {
    if (!this._dndSource) return;
    
    // Only react and intercept when the dragged type matches the container!
    if (this._dndSource.type === type) {
      e.preventDefault(); 
      e.stopPropagation(); 
      e.currentTarget.classList.add('drag-over');
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    }
  }

  _handleDragLeave(e, type) {
    if (!this._dndSource) return;
    if (this._dndSource.type === type) {
      e.currentTarget.classList.remove('drag-over');
    }
  }

  _handleDrop(e, targetType, targetRIdx, targetCIdx, layout) {
    if (!this._dndSource || this._dndSource.type !== targetType) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const source = this._dndSource;
    const n = structuredClone(layout);

    if (targetType === 'row') {
      if (source.rIdx === targetRIdx) return;
      const [movedRow] = n.splice(source.rIdx, 1);
      n.splice(targetRIdx, 0, movedRow);
      
    } else if (targetType === 'cell') {
      if (source.rIdx === targetRIdx && source.cIdx === targetCIdx) return;
      const [movedCell] = n[source.rIdx].cells.splice(source.cIdx, 1);
      n[targetRIdx].cells.splice(targetCIdx, 0, movedCell);
      
      // Update auto widths
      [source.rIdx, targetRIdx].forEach(r => {
        const row = n[r];
        if (!row || row.cells.length === 0) return;
        if (row.auto_width || row.sync_widths) {
          const w = Math.floor(100 / row.cells.length);
          row.cells.forEach((c, i) => c.width = (i === row.cells.length - 1) ? (100 - w * i) : w);
        }
      });
    }

    this._commit(n);
    e.currentTarget.removeAttribute('draggable'); 
    this._dndSource = null;
  }

  _handleDragEnd(e) {
    e.target.classList.remove('dragging-ghost');
    e.target.removeAttribute('draggable');
    this._dndSource = null;
    
    const shadow = this.shadowRoot;
    if (shadow) {
      const wrap = shadow.querySelector('.inner-content');
      if (wrap) wrap.classList.remove('is-dragging');
      shadow.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
  }

  // --- TRACKPAD LOGIC ---
  _handlePointerDown(e, rIdx, cIdx, iIdx, type, layout) {
    // IMPORTANT: NO e.preventDefault() here! Otherwise it blocks dragging on iOS/touch.
    e.stopPropagation();
    
    const now = Date.now();
    const isDoubleClick = this._lastClickTime && (now - this._lastClickTime < 300);
    this._lastClickTime = now;

    const item = layout[rIdx].cells[cIdx].items[iIdx];
    const currentSnap = parseFloat(layout[rIdx].cells[cIdx]._gridSnap || 5);

    if (isDoubleClick && currentSnap > 0 && type === 'move') {
      const n = structuredClone(layout);
      const currentItem = n[rIdx].cells[cIdx].items[iIdx];
      
      currentItem.w = Math.max(currentSnap, Math.min(currentSnap, 100 - currentItem.x));
      currentItem.h = Math.max(currentSnap, Math.min(currentSnap, 100 - currentItem.y));
      
      this._commit(n);
      return; 
    }

    const canvas = e.currentTarget.closest('.trackpad-canvas');
    const rect = canvas.getBoundingClientRect();
    
    // IMPORTANT: capture must go on the touched element (target), not the canvas!
    e.currentTarget.setPointerCapture(e.pointerId);

    this._dragState = {
      rIdx, cIdx, iIdx, type, rect,
      startX: e.clientX, startY: e.clientY,
      startItemX: Number(item.x) || 0,
      startItemY: Number(item.y) || 0,
      startItemW: Number(item.w) || 33.333,
      startItemH: Number(item.h) || 33.333
    };
  }

  _handlePointerMove(e, layout) {
    if (!this._dragState) return;
    const { rIdx, cIdx, iIdx, type, rect, startX, startY, startItemX, startItemY, startItemW, startItemH } = this._dragState;
    
    const snapRaw = layout[rIdx].cells[cIdx]._gridSnap;
    const snapVal = parseFloat(snapRaw !== undefined ? snapRaw : 5);
    const effectiveSnap = snapVal > 0 ? snapVal : 1; 

    const deltaX = ((e.clientX - startX) / rect.width) * 100;
    const deltaY = ((e.clientY - startY) / rect.height) * 100;

    const n = structuredClone(layout);
    const item = n[rIdx].cells[cIdx].items[iIdx];

    if (type === 'move') {
      let newX = startItemX + deltaX;
      let newY = startItemY + deltaY;
      
      newX = Math.round(newX / effectiveSnap) * effectiveSnap;
      newY = Math.round(newY / effectiveSnap) * effectiveSnap;
      
      item.x = Math.max(0, Math.min(newX, 100 - startItemW));
      item.y = Math.max(0, Math.min(newY, 100 - startItemH));
      item.w = startItemW;
      item.h = startItemH;
      
    } else if (type === 'resize') {
      let newW = startItemW + deltaX;
      let newH = startItemH + deltaY;

      newW = Math.round(newW / effectiveSnap) * effectiveSnap;
      newH = Math.round(newH / effectiveSnap) * effectiveSnap;

      item.w = Math.max(1, Math.min(newW, 100 - startItemX)); 
      item.h = Math.max(1, Math.min(newH, 100 - startItemY));
      item.x = startItemX;
      item.y = startItemY;
    }

    this._commit(n);
  }

  _handlePointerUp(e) {
    if (this._dragState) {
      try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
      this._dragState = null;
    }
  }
  _renderTrackpad(cell, rIdx, cIdx, layout) {
    const items = getCellItems(cell);
    const snapVal = cell._gridSnap !== undefined ? cell._gridSnap : 5;
    
    const explicitSum = Math.min(100, layout.reduce((sum, row) => sum + (parseFloat(row.flex) || 0), 0));
    const autoRows = layout.filter(r => !(parseFloat(r.flex) > 0)).length;
    
    let rowFraction = 1;
    let flexVal = parseFloat(layout[rIdx].flex) || 0;
    
    if (flexVal > 0) {
      rowFraction = flexVal / 100;
    } else {
      const rem = 100 - explicitSum;
      rowFraction = (autoRows > 0 ? rem / autoRows : 0) / 100;
    }
    if (rowFraction <= 0) rowFraction = 0.01; 

    let cellWidth = cell.width || 100;
    if (layout[rIdx].auto_width && layout[rIdx].cells.length > 0) {
      cellWidth = 100 / layout[rIdx].cells.length;
    }
    let cellWidthFraction = cellWidth / 100;

    let mathAspect = cellWidthFraction / rowFraction;
    let mathAspectRounded = Math.round(mathAspect * 1000) / 1000;
    
    const tpAspect = cell._editorAspectRatio || mathAspectRounded;
    const isOverride = cell._editorAspectRatio !== undefined;
    const bgSize = snapVal > 0 ? `${snapVal}% ${snapVal}%` : '10px 10px';

    return html`
      <div class="trackpad-wrap">
        <div class="row" style="margin-bottom: 4px;">
          <label style="font-weight:bold; color:var(--primary-color);">📐 Free-form Area (Canvas)</label>
        </div>

        <div style="font-size: 10px; color: var(--secondary-text-color); margin-bottom: 8px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 4px; border-left: 2px solid var(--primary-color);">
          <strong>Math:</strong> Cell (${Math.round(cellWidthFraction*100)}% W / ${Math.round(rowFraction*100)}% H) = <strong>${mathAspectRounded}</strong>
        </div>

        <div class="row" style="margin-bottom: 8px;">
          <div style="display:flex; gap:4px; align-items:center;">
            <label style="font-size:10px;">Helper grid:</label>
            <select style="font-size:11px; padding:2px;" @change=${e => {
              const n = structuredClone(layout);
              n[rIdx].cells[cIdx]._gridSnap = parseFloat(e.target.value);
              this._commit(n);
            }}>
              <option value="0" ?selected=${snapVal === 0}>Off (1%)</option>
              <option value="5" ?selected=${snapVal === 5}>5%</option>
              <option value="10" ?selected=${snapVal === 10}>10%</option>
              <option value="20" ?selected=${snapVal === 20}>20%</option>
              <option value="25" ?selected=${snapVal === 25}>25%</option>
              <option value="33.333" ?selected=${snapVal === 33.333}>33.3%</option>
              <option value="50" ?selected=${snapVal === 50}>50%</option>
            </select>
          </div>
          
          <div style="display:flex; gap:4px; align-items:center;">
            <label style="font-size:10px;">Ratio Override:</label>
            <input type="range" min="0.2" max="6.0" step="0.1" style="width:50px;" .value=${tpAspect} @input=${e => {
              const n = structuredClone(layout);
              n[rIdx].cells[cIdx]._editorAspectRatio = parseFloat(e.target.value);
              this._commit(n);
            }}>
            <button title="Reset to exact math (${mathAspectRounded})"
              style="background:none;border:none;cursor:pointer;font-size:12px;padding:0; margin-left:2px; ${isOverride ? 'filter:none; opacity:1;' : 'filter:grayscale(1); opacity:0.4;'}" 
              @click=${() => {
                const n = structuredClone(layout);
                delete n[rIdx].cells[cIdx]._editorAspectRatio;
                this._commit(n);
            }}>🔄</button>
          </div>
        </div>
        
        <div class="trackpad-canvas-container">
          <div class="trackpad-canvas" 
               style="aspect-ratio: ${tpAspect}; max-height: 320px; max-width: calc(320px * ${tpAspect});"
               @pointermove=${e => this._handlePointerMove(e, layout)}
               @pointerup=${this._handlePointerUp}
               @pointercancel=${this._handlePointerUp}
               @pointerleave=${this._handlePointerUp}>
            
            <div class="tp-grid-lines" style="background-size: ${bgSize}; opacity: ${snapVal > 0 ? 1 : 0.2};"></div>
            
            ${items.map((item, iIdx) => html`
              <div class="tp-item" 
                   style="left:${item.x}%; top:${item.y}%; width:${item.w}%; height:${item.h}%;"
                   @pointerdown=${e => this._handlePointerDown(e, rIdx, cIdx, iIdx, 'move', layout)}
                   
                   @dblclick=${e => {
                      e.stopPropagation(); 
                      const currentSnap = parseFloat(cell._gridSnap || 5);
                      if (currentSnap <= 0) return;

                      const n = structuredClone(layout);
                      const currentItem = n[rIdx].cells[cIdx].items[iIdx];
                      
                      currentItem.w = Math.max(currentSnap, Math.min(currentSnap, 100 - currentItem.x));
                      currentItem.h = Math.max(currentSnap, Math.min(currentSnap, 100 - currentItem.y));
                      
                      this._commit(n);
                   }}>
                E${iIdx + 1}
                <div class="tp-resize-handle" 
                     @pointerdown=${e => this._handlePointerDown(e, rIdx, cIdx, iIdx, 'resize', layout)}></div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  // --- ITEM EDITOR (values & typography) ---
  _renderItemEditor(item, rIdx, cIdx, iIdx, layout, allElements, usedElements) {
    const hasTypo = ['name','state'].includes(item.id) || item.id?.startsWith('label_');
    const updateVal = (key, val) => {
      const n = structuredClone(layout);
      n[rIdx].cells[cIdx].items[iIdx][key] = val;
      this._commit(n);
    };

    const itemKey = `r${rIdx}c${cIdx}i${iIdx}`;
    const isExp = this._expanded[itemKey] !== false; 

    return html`
      <div style="background:rgba(0,0,0,0.2);border:1px solid var(--divider-color,#555);border-radius:6px;padding:8px;margin-top:8px;">
        
        <div class="row" style="cursor:pointer; user-select:none; margin-bottom:${isExp ? '8px' : '0'};" @click=${(e) => this._toggleExpand(itemKey, e)}>
          <label style="font-weight:bold;color:var(--primary-color);cursor:pointer; display:flex; align-items:center;">
            <span style="margin-right:8px">${isExp ? '▼' : '▶'}</span> Element ${iIdx+1} <span style="font-size:10px; color:var(--secondary-text-color); margin-left:6px; font-weight:normal;">(${item.id})</span>
          </label>
          <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;font-size:12px;"
            @click=${(e) => {
              e.stopPropagation();
              const n = structuredClone(layout);
              n[rIdx].cells[cIdx].items.splice(iIdx, 1);
              this._commit(n);
            }}>✕ Remove</button>
        </div>
        
        ${isExp ? html`
        <div style="border-top:1px dashed var(--divider-color,#444); padding-top:8px;">
          <div class="row" style="margin-bottom:8px;">
            <select style="width:100%" @change=${e => updateVal('id', e.target.value)}>
              ${(() => {
                const groups = {};
                allElements.filter(e => e.id !== 'empty').forEach(el => {
                  const g = el.group || 'General';
                  if (!groups[g]) groups[g] = [];
                  groups[g].push(el);
                });
                return Object.entries(groups).map(([gName, els]) => html`
                  <optgroup label="${gName}">
                    ${els.map(el => html`
                      <option value="${el.id}" ?selected=${item.id===el.id} ?disabled=${el.id !== item.id && usedElements.includes(el.id)}>
                        ${el.label}
                      </option>`)}
                  </optgroup>
                `);
              })()}
            </select>
          </div>
          
          <div class="row" style="gap:4px; margin-bottom: 8px;">
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">X (%)</label>
              <input type="number" step="1" .value=${Math.round(item.x)} @change=${e => updateVal('x', parseFloat(e.target.value))}>
            </div>
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Y (%)</label>
              <input type="number" step="1" .value=${Math.round(item.y)} @change=${e => updateVal('y', parseFloat(e.target.value))}>
            </div>
          </div>
          <div class="row" style="gap:4px; margin-bottom: 8px;">
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Width (%)</label>
              <input type="number" step="1" .value=${Math.round(item.w)} @change=${e => updateVal('w', parseFloat(e.target.value))}>
            </div>
            <div style="display:flex; flex-direction:column; flex:1;">
              <label style="font-size:10px;">Height (%)</label>
              <input type="number" step="1" .value=${Math.round(item.h)} @change=${e => updateVal('h', parseFloat(e.target.value))}>
            </div>
          </div>

          <div class="row" style="margin-top:4px;">
            <label style="font-size:11px;">Inner alignment</label>
            <div class="grid-picker" style="width:40px; height:40px;">
              ${['tl','tc','tr','cl','cc','cr','bl','bc','br'].map(pos => html`
                <div class="grid-dot ${item.inner===pos?'active':''}" title="${pos}" @click=${() => updateVal('inner', pos)}></div>`)}
            </div>
          </div>
          
          ${hasTypo ? html`
            <div style="border-top:1px dashed var(--divider-color); margin-top:8px; padding-top:8px;">
              <div class="row" style="margin-top:4px;">
                <label>Size</label>
                <div style="display:flex;width:60%;gap:4px;">
                  <input type="number" step="0.1" style="flex:1" placeholder="Auto" .value=${item.font_size??''} @input=${e => updateVal('font_size', e.target.value !== '' ? parseFloat(e.target.value) : null)}>
                  <select style="width:75px" @change=${e => updateVal('font_unit', e.target.value)}>
                    <option value="px" ?selected=${(item.font_unit||'px')==='px'}>px</option>
                    <option value="em" ?selected=${item.font_unit==='em'}>em</option>
                    <option value="cqw" ?selected=${item.font_unit==='cqw'}>cqw</option>
                    <option value="cqh" ?selected=${item.font_unit==='cqh'}>cqh</option>
                    <option value="cqmin" ?selected=${item.font_unit==='cqmin'}>cqmin</option>
                  </select>
                </div>
              </div>
              <div class="row" style="margin-top:6px; margin-bottom:4px;">
                <label style="font-size:11px;" title="Decrease if the text leaves too much free margin (e.g. with narrow characters like 1 or .)">Text density (factor)</label>
                <div style="display:flex; align-items:center; width:60%; gap:8px;">
                  <input type="range" min="0.2" max="0.9" step="0.05" style="flex:1" .value=${item.font_factor || 0.55} @input=${e => updateVal('font_factor', parseFloat(e.target.value))}>
                  <span style="font-size:10px; width:24px; text-align:right;">${item.font_factor || 0.55}</span>
                </div>
              </div>
              <div class="row" style="margin-top:4px;">
                <label>Font style</label>
                <select style="width:60%" @change=${e => updateVal('font_weight', e.target.value || null)}>
                  <option value="" ?selected=${!item.font_weight}>Default</option>
                  <option value="bold" ?selected=${item.font_weight==='bold'}>Bold</option>
                  <option value="normal" ?selected=${item.font_weight==='normal'}>Normal</option>
                  <option value="100" ?selected=${item.font_weight==='100'}>Thin</option>
                </select>
              </div>
            </div>` : ''}
        </div>
        ` : ''}
      </div>`;
  }

  render() {
    if (!this.slot) return html``;
    const layout = Array.isArray(this.slot.layout_rows) ? this.slot.layout_rows : [];
    const allElements = getLayoutTargets(this.slot);
    const usedElements = layout.flatMap(r => r.cells.flatMap(c => getCellItems(c).map(i => i.id))).filter(Boolean);

    return html`
      <details class="inner-section">
        <summary>── Layout & Free-form Area <div style="display:flex; align-items:center; gap:8px;">
          <ha-switch .checked=${!!this.slot.layout_active} @click=${e => e.stopPropagation()} @change=${e => this._merge({ layout_active: e.target.checked })}></ha-switch>
          <span>▼</span>
        </summary>
        <div class="inner-content">

        <div class="row-card" style="margin-bottom: 12px; border-color: var(--primary-color); background: rgba(3, 169, 244, 0.05);">
            <div class="row" style="margin-bottom: 8px;">
              <label style="font-weight: bold; color: var(--primary-color);">👁 Show default elements</label>
            </div>
            <div class="row">
              <label>Icon</label>
              <ha-switch .checked=${this.slot.hide_icon !== true} @change=${e => {
                this._merge({ hide_icon: !e.target.checked });
              }}></ha-switch>
            </div>
            <div class="row" style="margin-top: 8px;">
              <label>Name (entity)</label>
              <ha-switch .checked=${this.slot.hide_entity_name !== true} @change=${e => {
                this._merge({ hide_entity_name: !e.target.checked });
              }}></ha-switch>
            </div>
            <div class="row" style="margin-top: 8px;">
              <label>State (value)</label>
              <ha-switch .checked=${this.slot.hide_entity_state !== true} @change=${e => {
                this._merge({ hide_entity_state: !e.target.checked });
              }}></ha-switch>
            </div>
          </div>

          <div class="layout-wrap" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
            <div class="row-card" style="border-color: var(--warning-color, #ff9800); background: rgba(255, 152, 0, 0.05);">
              <div class="row">
                <label style="color: var(--warning-color, #ff9800); font-weight: bold;">🛠 Show Grid (Global)</label>
                <ha-switch .checked=${!!this.slot.layout_debug} @change=${e => {
                    this._merge({ layout_debug: e.target.checked });
                }}></ha-switch>
              </div>
              <div style="font-size:11px; color:var(--secondary-text-color); margin-top:4px;">
                Shows green (content/width) and red (ID) indicators in the dashboard.
              </div>
            </div>
          </div>

          ${layout.map((row, rIdx) => {
            const rowKey = `r${rIdx}`;
            const isRowExpanded = !!this._expanded[rowKey];

            return html`
            <div class="row-card"
                 @dragstart=${e => this._handleDragStart(e, 'row', rIdx)}
                 @dragend=${this._handleDragEnd}
                 @dragover=${e => this._handleDragOver(e, 'row')}
                 @dragleave=${e => this._handleDragLeave(e, 'row')}
                 @drop=${e => this._handleDrop(e, 'row', rIdx, null, layout)}>

              <div class="row-header" @click=${(e) => this._toggleExpand(rowKey, e)}>
                <div style="display:flex; align-items:center;">
                  <div class="drag-handle-wrap"
                       @mouseenter=${e => e.currentTarget.closest('.row-card').setAttribute('draggable', 'true')}
                       @mouseleave=${e => e.currentTarget.closest('.row-card').removeAttribute('draggable')}
                       @mousedown=${e => { e.stopPropagation(); e.currentTarget.closest('.row-card').setAttribute('draggable', 'true'); }}
                       @click=${e => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                    </svg>
                  </div>
                  <span style="margin-right:8px">${isRowExpanded ? '▼' : '▶'}</span>Row ${rIdx + 1}
                </div>
                <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;" @click=${(e) => {
                  e.stopPropagation(); const n = [...layout]; n.splice(rIdx, 1); this._commit(n);
                }}>🗑</button>
              </div>

              ${isRowExpanded ? html`
                <div class="row" style="margin-top: 8px;">
                  <label>Row height (%)</label>
                  <div style="display:flex; align-items:center; width:60%; gap:8px;">
                    <input type="range" min="0" max="100" step="1" style="flex:1" .value=${row.flex ?? 0} @input=${e => {
                      this._set(layout, rIdx, 'flex', parseInt(e.target.value));
                    }}>
                    <span style="font-size:11px; width:30px; text-align:right;">${(row.flex > 0) ? row.flex + '%' : 'Auto'}</span>
                  </div>
                </div>

                <div class="row" style="margin-top:12px; margin-bottom:8px;">
                    <label>Auto-split width</label>
                    <ha-switch .checked=${!!row.auto_width} @change=${e => {
                      const n = structuredClone(layout);
                      n[rIdx].auto_width = e.target.checked;
                      if (!e.target.checked && n[rIdx].cells.length > 0) {
                        const w = Math.floor(100 / n[rIdx].cells.length);
                        n[rIdx].cells.forEach((c, i) => { c.width = (i === n[rIdx].cells.length - 1) ? (100 - (w * i)) : w; });
                      }
                      this._commit(n);
                    }}></ha-switch>
                  </div>

                  ${!row.auto_width ? html`
                    <div class="row" style="margin-bottom:8px;">
                      <label style="color: var(--secondary-text-color);">Chain widths (always totals 100%)</label>
                      <ha-switch .checked=${!!row.sync_widths} @change=${e => {
                        const n = structuredClone(layout);
                        n[rIdx].sync_widths = e.target.checked;
                        if (e.target.checked && n[rIdx].cells.length > 0) {
                          const w = Math.floor(100 / n[rIdx].cells.length);
                          n[rIdx].cells.forEach((c, i) => { c.width = (i === n[rIdx].cells.length - 1) ? (100 - (w * i)) : w; });
                        }
                        this._commit(n);
                      }}></ha-switch>
                    </div>
                    
                    <div class="row" style="margin-bottom:12px;">
                      <button type="button" class="add-btn" style="border: 1px solid var(--divider-color); color: var(--primary-text-color); margin-top: 0; font-weight: normal; font-size: 12px;" @click=${() => {
                        const n = structuredClone(layout);
                        if (n[rIdx].cells.length > 0) {
                          const w = Math.floor(100 / n[rIdx].cells.length);
                          n[rIdx].cells.forEach((c, i) => { c.width = (i === n[rIdx].cells.length - 1) ? (100 - (w * i)) : w; });
                          this._commit(n);
                        }
                      }}>⚖️ Equal width for all containers</button>
                    </div>
                  ` : ''}
                <div class="cell-list">
                  ${row.cells.map((cell, cIdx) => {
                    const cellKey = `r${rIdx}c${cIdx}`;
                    const isCellExpanded = !!this._expanded[cellKey];

                    return html`
                    <div class="cell-card"
                         @dragstart=${e => this._handleDragStart(e, 'cell', rIdx, cIdx)}
                         @dragend=${this._handleDragEnd}
                         @dragover=${e => this._handleDragOver(e, 'cell')}
                         @dragleave=${e => this._handleDragLeave(e, 'cell')}
                         @drop=${e => this._handleDrop(e, 'cell', rIdx, cIdx, layout)}>
                         
                      <div class="cell-header" @click=${(e) => this._toggleExpand(cellKey, e)}>
                        <div style="display:flex; align-items:center;">
                          <div class="drag-handle-wrap"
                               @mouseenter=${e => e.currentTarget.closest('.cell-card').setAttribute('draggable', 'true')}
                               @mouseleave=${e => e.currentTarget.closest('.cell-card').removeAttribute('draggable')}
                               @mousedown=${e => { e.stopPropagation(); e.currentTarget.closest('.cell-card').setAttribute('draggable', 'true'); }}
                               @click=${e => e.stopPropagation()}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                            </svg>
                          </div>
                          <span style="margin-right:8px">${isCellExpanded ? '▼' : '▶'}</span>Cell ${cIdx+1}
                        </div>
                        <button type="button" style="background:none;border:none;color:#f44;cursor:pointer;" @click=${(e) => {
                          e.stopPropagation(); const n = structuredClone(layout); n[rIdx].cells.splice(cIdx, 1); this._commit(n);
                        }}>✕</button>
                      </div>
                      
                      ${isCellExpanded ? html`
                        ${!row.auto_width ? html`
                        <div class="row" style="margin-top: 6px; margin-bottom: 8px;">
                          <label>Width (%)</label>
                          <div style="display:flex; align-items:center; width:60%; gap:8px;">
                            <input type="range" min="1" max="100" step="1" style="flex:1;" .value=${cell.width || 100} @input=${e => {
                              const n = structuredClone(layout);
                              let newVal = parseInt(e.target.value);
                              
                              if (row.sync_widths) {
                                const minOther = (n[rIdx].cells.length - 1) * 10;
                                if (newVal > 100 - minOther) newVal = 100 - minOther;
                                if (newVal < 10) newVal = 10;
                                
                                const oldVal = n[rIdx].cells[cIdx].width || 100;
                                n[rIdx].cells[cIdx].width = newVal;

                                if (n[rIdx].cells.length > 1) {
                                  let delta = newVal - oldVal; 
                                  let others = n[rIdx].cells.filter((_, i) => i !== cIdx);
                                  
                                  let safetyCounter = 0;
                                  while (Math.abs(delta) > 0 && others.length > 0 && safetyCounter < 100) {
                                    safetyCounter++;
                                    let share = Math.round(delta / others.length);
                                    if (share === 0) share = delta > 0 ? 1 : -1; 
                                    
                                    let nextOthers = [];
                                    for (let o of others) {
                                      if (delta === 0) break;
                                      let oldCellWidth = o.width || 0;
                                      let newCellWidth = oldCellWidth - share;
                                      
                                      if (newCellWidth < 10) {
                                        let actualChange = oldCellWidth - 10;
                                        o.width = 10;
                                        delta -= actualChange;
                                      } else {
                                        o.width = newCellWidth;
                                        delta -= (oldCellWidth - newCellWidth);
                                        nextOthers.push(o);
                                      }
                                    }
                                    others = nextOthers;
                                  }
                                  
                                  let currentTotal = n[rIdx].cells.reduce((sum, c) => sum + (c.width || 0), 0);
                                  let diff = 100 - currentTotal;
                                  if (diff !== 0) {
                                     let otherCells = n[rIdx].cells.filter((_, i) => i !== cIdx);
                                     if (otherCells.length > 0) {
                                         otherCells.sort((a,b) => (b.width||0) - (a.width||0));
                                         otherCells[0].width += diff;
                                     }
                                  }
                                }
                              } else {
                                if (newVal < 1) newVal = 1;
                                if (newVal > 100) newVal = 100;
                                n[rIdx].cells[cIdx].width = newVal;
                              }
                              this._commit(n);
                            }}>
                            <span style="font-size:11px; width:30px; text-align:right;">${cell.width || 100}%</span>
                          </div>
                        </div>` : ''}
                        
                        ${this._renderTrackpad(cell, rIdx, cIdx, layout)}

                        <div class="row" style="margin-top:12px; border-top:1px dashed var(--divider-color,#555); padding-top:12px;">
                          <label style="color:var(--primary-color,#03a9f4); font-weight:bold;">🎛 Show Element Flexbox</label>
                          <input type="checkbox" .checked=${!!cell.debug_grid} @change=${e => {
                            const n = structuredClone(layout);
                            n[rIdx].cells[cIdx].debug_grid = e.target.checked;
                            this._commit(n);
                          }}>
                        </div>

                        <div style="margin-top:12px;">
                          ${getCellItems(cell).map((item, iIdx) => this._renderItemEditor(item, rIdx, cIdx, iIdx, layout, allElements, usedElements))}
                        </div>
                        <button type="button" class="add-btn" @click=${() => {
                          const n = structuredClone(layout);
                          if (!Array.isArray(n[rIdx].cells[cIdx].items)) n[rIdx].cells[cIdx].items = getCellItems(n[rIdx].cells[cIdx]);
                          const firstFree = allElements.find(e => e.id !== 'empty' && !usedElements.includes(e.id));
                          n[rIdx].cells[cIdx].items.push({ id: firstFree?.id || 'name', x: 0, y: 0, w: 33.333, h: 33.333, inner: 'cc' });
                          this._commit(n);
                        }}>＋ Add element</button>
                      ` : ''}
                    </div>`;
                  })}
                </div>
                <button type="button" class="add-btn" style="border-style: solid;" @click=${() => {
                  const n = structuredClone(layout);
                  n[rIdx].cells.push({ id: 'c'+Date.now(), width: 100, items: [] });
                  this._commit(n); this._expanded = { ...this._expanded, [`r${rIdx}c${n[rIdx].cells.length-1}`]: true };
                }}>＋ Add cell</button>
              ` : ''}
            </div>`;
          })}
          
          <button type="button" class="add-btn" @click=${() => {
            const n = structuredClone(layout);
            n.push({ id: 'r'+Date.now(), flex: 0, cells: [{ id: 'c'+Date.now(), width: 100, items: [] }] });
            this._commit(n); this._expanded = { ...this._expanded, [`r${n.length-1}`]: true };
          }}>＋ Add new row</button>
        </div>
      </details>
    `;
  }
}
if (!customElements.get('sc-layout-editor')) ScLayoutEditor._expandedCache = {};
customElements.define('sc-layout-editor', ScLayoutEditor);


// --- CANVAS EDITOR -------------------------------------------------------
// One canvas, elements placed on it directly. Replaces the rows/cells/items
// nesting of ScLayoutEditor, which stays until every card is migrated.
//
// All geometry maths lives in canvas-model.js and is unit-tested there; this
// component turns pointer positions into a delta in virtual units and draws
// the result. Nothing here decides where an element lands.

/**
 * How far a press may sit from the one before it and still count as the same
 * spot - both for walking down the stack under the pointer and for telling a
 * click from a drag. Small enough that aiming at a different element never
 * counts as the same spot, large enough to absorb the hand's own wobble.
 */
const SAME_SPOT_PX = 4;

class ScCanvasEditor extends LitElement {
  static get properties() {
    return {
      slot: { type: Object },
      hass: { type: Object },
      // The Lovelace card config, for `grid_options` - the card's height is
      // Home Assistant's field, not one of ours.
      cardConfig: { type: Object },
      commitFn: { type: Function },
      _sel: { type: String, state: true },
      _extra: { type: Array, state: true },
      _band: { type: Object, state: true },
      _drag: { type: Object, state: true },
      _live: { type: Boolean, state: true },
      _configOpen: { type: Boolean, state: true },
      _menu: { type: Boolean, state: true },
      _placing: { type: String, state: true },
      _ghost: { type: Object, state: true },
    };
  }

  constructor() {
    super();
    this._sel = null;
    this._extra = [];
    this._band = null;
    this._drag = null;
    this._live = true;
    this._configOpen = true;
    this._menu = false;
    this._placing = null;
    this._ghost = null;
    // The last press: where it was, whether it moved, and what lay under it.
    // Not reactive - nothing renders from it.
    this._lastDown = null;
    // A menu that outlives a click elsewhere, or a placement no key can get
    // out of, is a trap - and the click that closes the menu is not one this
    // element ever sees, so both listeners are the document's.
    this._onKey = e => { if (e.key === 'Escape' && (this._menu || this._placing)) this._closeMenu(); };
    this._onDocDown = e => {
      if (this._menu && !e.composedPath().includes(this.shadowRoot?.querySelector('.menu-wrap'))) {
        this._menu = false;
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._onKey);
    document.addEventListener('pointerdown', this._onDocDown, true);
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this._onKey);
    document.removeEventListener('pointerdown', this._onDocDown, true);
    super.disconnectedCallback();
  }

  /**
   * Follow the card's size when it is changed in Home Assistant's Layout tab.
   *
   * Changing it here reshapes the canvas - see `_setGrid` - and the Layout tab
   * writes the same `grid_options` the same controls do, so it is the same
   * person asking for the same thing. It used to leave the canvas behind: the
   * numbers in this tab updated, the shape did not, until something was typed
   * here again.
   *
   * Only on a change, and never on the first `cardConfig` to arrive. A canvas
   * that has always been a different shape from its card is somebody's
   * decision, and reshaping it for merely opening the editor is the rewrite
   * while nobody is watching that `_matchGrid` exists to avoid - the Match
   * button still offers that one. And only with a row count: under
   * `rows: auto` the card takes its height from the canvas, so there is no
   * shape to match. `_shapedToGrid` is null when the canvas already fits,
   * which is what stops the commit this causes from causing another.
   */
  updated(changed) {
    super.updated(changed);
    if (!changed.has('cardConfig')) return;
    const was = changed.get('cardConfig');
    if (!was) return;
    const grid = this.cardConfig?.grid_options || {};
    const before = was.grid_options || {};
    if (grid.columns === before.columns && grid.rows === before.rows) return;
    if (typeof grid.rows !== 'number') return;
    const shaped = this._shapedToGrid();
    if (shaped) this._commit(shaped);
  }

  static get styles() {
    return [SC.editorStyles, css`
      .row { gap: 8px; }
      .canvas-wrap { position: relative; background: rgba(0,0,0,0.15); border: 1px dashed var(--divider-color,#444); border-radius: 4px; padding: 12px 8px; display: flex; justify-content: center; }
      /* Floated over the canvas' edge rather than given a column of its own:
         the rail comes and goes with the selection, and a column would take
         its width from the canvas permanently - in Home Assistant's card
         editor, which is barely 400px wide, the preview cannot spare it. It
         also means the canvas does not move under the pointer while a
         selection is being shift-clicked together.
         Above .el.sel's 3, or a selected element would paint over it. */
      .rail { position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
              z-index: 4; display: flex; flex-direction: column; gap: 6px; }
      .rail button { width: 28px; background: var(--card-background-color, #1c1c1c); border: 1px solid var(--divider-color,#444); color: var(--primary-text-color); border-radius: 4px; padding: 5px 0; font-size: 15px; line-height: 1.1; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.45); }
      .rail button:hover:not([disabled]) { background: var(--primary-color); color: #fff; }
      .rail button[disabled] { opacity: 0.4; cursor: default; }
      .canvas { position: relative; width: 100%; background: #1a1a1a; border: 1px solid #555; border-radius: 4px; overflow: hidden; touch-action: none; user-select: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      .grid { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px); }
      /* Isolated because the live preview draws real gauges and bars, and
         those stack themselves with SC_LAYERS - numbers in the thousands,
         against the editor's own 2-to-5. Kept inside the box it is drawn in,
         a preview cannot climb over the selection, the placing overlay or the
         add menu. */
      .el { position: absolute; isolation: isolate; box-sizing: border-box; cursor: grab; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #fff; text-shadow: 0 1px 2px #000; border-radius: 2px; background: rgba(3,169,244,0.3); border: 1px solid var(--primary-color); overflow: hidden; }
      .el.surface { background: rgba(255,193,7,0.18); border-style: dashed; border-color: #ffc107; }
      .el.sel { background: rgba(3,169,244,0.55); border-width: 2px; z-index: 3; }
      /* A pinned element says so twice: the cursor, which answers before the
         press, and the badge, which answers from across the canvas. The border
         goes solid-grey so a locked surface stops reading as a dashed one. */
      .el.pinned { cursor: default; border-color: #9e9e9e; border-style: solid; }
      .el.pinned::before { content: '🔒'; position: absolute; top: 1px; left: 2px;
                           font-size: 9px; line-height: 1; text-shadow: 0 1px 2px #000; }
      /* Live, the box is a frame around someone else's drawing rather than a
         block of colour: the fill would hide the very thing being previewed,
         so selection is an inset ring instead. Size containment mirrors
         .sc-canvas in the renderer, which is what the 100cqmin below
         resolves against there.
         The text properties go back to inherited because .el sets 10px bold
         with a shadow for the id it draws, and that would be the font a
         previewed element resolves em and % against - in the card it inherits
         the dashboard's text instead, so the same config rendered smaller
         here than on the card it is previewing.
         line-height has to be named after the shorthand, which resets it: a
         card on a dashboard inherits Home Assistant's 1.6, the config dialog
         inherits normal, and a circular bar whose two lines are nudged
         together by circular_*_offset_y then lands the label on the value. */
      .el.live { background: none; border-color: rgba(3,169,244,0.5); container-type: size;
                 font: inherit; line-height: var(--ha-line-height-normal, 1.6);
                 color: inherit; text-shadow: none; letter-spacing: normal; }
      .el.live.sel { background: none; box-shadow: inset 0 0 0 2px var(--primary-color); }
      .el.live > sc-gauge { width: 100cqmin; height: 100cqmin; max-width: 100%; max-height: 100%; }
      .el.live > sc-progressbar { width: 100%; max-height: 100%; }
      /* Over the selected elements (.el.sel is 3), because the frame is what
         the pointer is doing right now and has to stay readable across one. */
      .band { position: absolute; z-index: 4; pointer-events: none; border: 1px dashed var(--primary-color,#03a9f4); background: rgba(3,169,244,0.12); }
      .handle { position: absolute; right: 0; bottom: 0; width: 12px; height: 12px; background: rgba(255,255,255,0.85); border-radius: 100% 0 0 0; cursor: nwse-resize; touch-action: none; }
      .handle::after { content: ''; position: absolute; right: -10px; bottom: -10px; width: 22px; height: 22px; }
      .num { width: 68px; }
      /* Only the selected row wraps, and it has to: its number inputs and four
         buttons need more than 500px, and Home Assistant's card editor is
         nowhere near that wide - unwrapped, the remove button sat outside the
         dialog. There the name takes a line of its own so the controls below
         it line up. Every other row is a name and four buttons and fits on one
         line, which is what makes a long list readable. */
      .el-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; padding: 4px 6px; border-radius: 4px; background: rgba(255,255,255,0.03); }
      .el-row.sel { background: rgba(3,169,244,0.18); }
      .el-row.co { background: rgba(3,169,244,0.09); }
      .el-name { flex: 1; font-family: monospace; cursor: pointer; }
      .el-row.sel .el-name { flex: 1 0 100%; }
      .icon-btn { background: none; border: none; color: var(--secondary-text-color); cursor: pointer; padding: 2px 4px; font-size: 13px; }
      .icon-btn:hover { color: var(--primary-color); }
      .icon-btn[disabled] { opacity: 0.3; cursor: default; }
      .icon-btn[disabled]:hover { color: var(--secondary-text-color); }
      .hint { font-size: 11px; color: var(--secondary-text-color); }
      .el-config { border: 1px solid var(--divider-color,#444); border-radius: 6px; background: rgba(0,0,0,0.15); }
      .el-config > summary { padding: 7px 10px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--primary-color,#03a9f4); list-style: none; display: flex; align-items: center; gap: 6px; user-select: none; }
      .el-config > summary::-webkit-details-marker { display: none; }
      .el-config > summary::before { content: '▶'; font-size: 9px; transition: transform 0.15s; }
      .el-config[open] > summary::before { transform: rotate(90deg); }
      .el-config-body { padding: 0 6px 6px; }
      /* The editor stacks against itself, not against the card SC_LAYERS
         orders: 2 and 3 are the resize handle and the selected element, so
         the placing overlay and the menu sit just above those. */
      .tool-row { display: flex; align-items: center; gap: 8px; margin: 2px 0 6px; }
      .menu-wrap { position: relative; }
      .menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 5; min-width: 200px;
              max-height: 280px; overflow-y: auto; padding: 4px; border-radius: 6px;
              border: 1px solid var(--divider-color,#444); box-shadow: 0 6px 20px rgba(0,0,0,0.45);
              background: var(--card-background-color, var(--secondary-background-color, #1c1c1c)); }
      .menu-group { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
                    color: var(--secondary-text-color); padding: 6px 8px 2px; }
      .menu-item { display: block; width: 100%; text-align: left; background: none; border: none;
                   color: var(--primary-text-color); font-size: 12px; padding: 6px 8px;
                   border-radius: 4px; cursor: pointer; }
      .menu-item:hover { background: rgba(3,169,244,0.18); }
      .menu-item[disabled] { opacity: 0.4; cursor: default; }
      .menu-item[disabled]:hover { background: none; }
      .place-layer { position: absolute; inset: 0; z-index: 4; cursor: crosshair; }
      /* The box the next click makes, drawn where it would land. Faint and
         dashed so it reads as not-yet-there, and pointer-events:none so the
         crosshair keeps moving it instead of hovering it - it is a child of
         the layer that is tracking the pointer. */
      .ghost { position: absolute; box-sizing: border-box; pointer-events: none;
               border: 1px dashed var(--primary-color); border-radius: 2px;
               background: rgba(3,169,244,0.22); opacity: 0.75;
               display: flex; align-items: center; justify-content: center;
               font-size: 10px; font-weight: bold; color: #fff;
               text-shadow: 0 1px 2px #000; overflow: hidden; }
      .ghost.surface { border-color: #ffc107; background: rgba(255,193,7,0.16); }
    `];
  }

  get _canvas() {
    return this.slot?.canvas || { ...DEFAULT_CANVAS, elements: [] };
  }

  _commit(canvas) {
    if (this.commitFn) this.commitFn('__merge__', { canvas });
  }

  /**
   * The card height in Home Assistant grid rows, or null for "as tall as the
   * canvas". Absent and the literal 'auto' both mean the latter: the card
   * reports `auto` itself, so an untouched config carries no rows at all.
   */
  get _rows() {
    const r = this.cardConfig?.grid_options?.rows;
    return typeof r === 'number' ? r : null;
  }

  /** The card's width in grid columns, from wherever it is currently set. */
  get _columns() { return gridSize(this.cardConfig, this.slot).columns; }

  /**
   * The widest the card can be here. Read from the section being edited on
   * every use rather than kept: the same editor instance stays mounted while
   * the section's width is changed in the tab next to it.
   */
  get _maxColumns() { return sectionColumns(this); }

  /**
   * Writes HA's own `grid_options` rather than fields of our own, so these
   * controls and the layout tab are two views of one value instead of two
   * settings that have to be kept in step.
   *
   * Changing the card's box here also reshapes the canvas to match, when there
   * is a row count to match: the user is setting the card's size, and a canvas
   * that then letterboxed inside it would be answering a question they did not
   * ask. It is not done on render - a card that rewrites its own config for
   * being displayed can corrupt a dashboard while nobody is watching - so a
   * change made in the layout tab instead is offered as the Match button.
   */
  _setGrid(patch) {
    const grid = { ...(this.cardConfig?.grid_options || {}) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete grid[k]; else grid[k] = v;
    }
    if (!this.commitFn) return;
    const writes = [['__card__', {
      grid_options: Object.keys(grid).length ? grid : undefined
    }]];
    if (typeof grid.rows === 'number') {
      const shaped = this._shapedToGrid({ ...this.cardConfig, grid_options: grid });
      if (shaped) writes.push(['__merge__', { canvas: shaped }]);
    }
    this.commitFn('__batch__', writes);
  }

  _setRows(rows) { this._setGrid({ rows }); }

  /** The canvas reshaped to the card's grid box, or null if it already is. */
  _shapedToGrid(cardConfig = this.cardConfig) {
    const shape = canvasFromGrid(cardConfig, this.slot, 400, this._maxColumns);
    const c = this._canvas;
    if (c.w === shape.w && c.h === shape.h) return null;
    return rescaleCanvas(structuredClone(c), shape);
  }

  /** Reshape the canvas to the card's grid box, carrying the layout with it. */
  _matchGrid() {
    const shaped = this._shapedToGrid();
    if (shaped) this._commit(shaped);
  }

  /** Whether the canvas is a different shape from the box the card occupies. */
  get _gridMismatch() {
    if (typeof this.cardConfig?.grid_options?.rows !== 'number') return false;
    const shape = canvasFromGrid(this.cardConfig, this.slot, 400, this._maxColumns);
    const c = this._canvas;
    return Math.abs(c.w / c.h - shape.w / shape.h) > 0.005;
  }

  /** Commit the canvas with one element's fields changed. */
  _setEl(idx, patch) {
    const c = structuredClone(this._canvas);
    const el = c.elements[idx];
    // `undefined` deletes the key, the same as it does in a `__card__` commit.
    // An element that is simply not locked should carry no `locked` at all,
    // or every canvas ever unlocked keeps a key saying so.
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete el[k]; else el[k] = v;
    }
    this._commit(c);
  }

  /**
   * Commit several elements' boxes at once, by id.
   *
   * One commit, not one per element: `_commit` clones `this.config` and Home
   * Assistant writes it back asynchronously, so a second commit in the same
   * tick would be built from a config that does not have the first one yet -
   * dragging four elements would move one.
   */
  _setEls(patches) {
    const c = structuredClone(this._canvas);
    for (const el of c.elements) {
      const patch = patches[el.id];
      if (patch) Object.assign(el, patch);
    }
    this._commit(c);
  }

  _setCanvas(key, value) {
    const c = structuredClone(this._canvas);
    c[key] = value;
    this._commit(c);
  }

  // --- dragging ---------------------------------------------------------

  /**
   * Which elements lie under a pointer position, topmost first.
   *
   * Later in the array draws on top, so reversed is the order a click meets
   * them. Geometry, not the event's target: an element the click cannot
   * reach because another one covers it is exactly what this has to find.
   */
  _stackAt(e, rect) {
    const c = this._canvas;
    const px = (e.clientX - rect.left) / rect.width * c.w;
    const py = (e.clientY - rect.top) / rect.height * c.h;
    const hit = [];
    for (let i = c.elements.length - 1; i >= 0; i--) {
      const el = c.elements[i];
      if (px >= el.x && px <= el.x + el.w && py >= el.y && py <= el.y + el.h) hit.push(i);
    }
    return hit;
  }

  /**
   * Which element this press acts on, and what the release will need to know.
   *
   * Pressing the same spot again keeps whatever is selected there rather than
   * jumping back to the top of the stack - otherwise an element you clicked
   * your way down to could be selected but never dragged. The walking itself
   * happens on release, in `_onUp`, so that a press-and-drag moves what you
   * picked instead of the next one down.
   */
  _pressTarget(e, rect, idx) {
    const stack = this._stackAt(e, rect);
    const prev = this._lastDown;
    const same = !!prev && Math.abs(prev.x - e.clientX) <= SAME_SPOT_PX
                        && Math.abs(prev.y - e.clientY) <= SAME_SPOT_PX;
    this._lastDown = { x: e.clientX, y: e.clientY, moved: false, same, stack };
    if (!stack.length) return idx;
    const at = stack.findIndex(i => this._canvas.elements[i].id === this._sel);
    return same && at >= 0 ? stack[at] : stack[0];
  }

  /** A click on the canvas itself: nothing selected, and the walk starts over. */
  _deselect() { this._sel = null; this._extra = []; this._lastDown = null; }

  /**
   * Everything selected. `_sel` stays the one the settings and the element
   * list follow - a second selected element does not make the question "which
   * one am I configuring" ambiguous, it just adds elements that move together.
   */
  get _selection() { return this._sel ? [this._sel, ...this._extra] : []; }

  _isSel(id) { return this._sel === id || this._extra.includes(id); }

  /** The selection with one element added or taken out. */
  _toggleSel(id) {
    if (this._sel === id) {
      // The anchor leaving promotes the next one, so a selection that still
      // has elements in it never ends up with nothing to show settings for.
      this._sel = this._extra[0] ?? null;
      this._extra = this._extra.slice(1);
    } else if (this._extra.includes(id)) {
      this._extra = this._extra.filter(x => x !== id);
    } else if (this._sel) {
      this._extra = [...this._extra, id];
    } else {
      this._sel = id;
    }
    // Walking down a stack of overlapping elements is a single-selection idea;
    // a press that changed the selection is not a step in one.
    this._lastDown = null;
  }

  /** Select one element and nothing else. */
  _selectOnly(id) { this._sel = id; this._extra = []; }

  /** Select exactly these, the first of them the one the settings follow. */
  _applySelection(ids) { this._sel = ids[0] ?? null; this._extra = ids.slice(1); }

  /**
   * Copy everything selected, and select the copies.
   *
   * One `__merge__`, as `_duplicate` does for one element: the new boxes and
   * the entries they point at are a single edit, and `_commit` clones
   * `this.config`, so a second commit in the same tick would be written from
   * a config that does not have the first one yet.
   */
  _duplicateSelection() {
    const made = duplicateElements(this.slot, this._canvas, this._selection);
    if (!made || !this.commitFn) return;
    // The copies, not the originals: a copy is made to be put somewhere, and
    // what is selected is what the next drag moves.
    this._applySelection(made.ids);
    this.commitFn('__merge__', { canvas: made.canvas, ...made.patch });
  }

  /** How many of the selected elements a copy would actually produce. */
  get _copyable() {
    const els = this._canvas.elements;
    return this._selection.filter(id => {
      const el = els.find(e => e.id === id);
      return el && canDuplicate(this.slot, el);
    }).length;
  }

  /**
   * Even gaps along one axis, for the elements that are selected.
   *
   * Next to the canvas rather than in the row of buttons under it, because it
   * acts on what is drawn there and on nothing else, and because it appears
   * and disappears with the selection - a button that comes and goes in a
   * fixed row moves every other button with it.
   */
  _distribute(axis) {
    const out = distributeElements(this._canvas, this._selection, axis);
    if (out) this._commit(out);
  }

  /** How many of the selected elements a distribute could actually move. */
  get _distributable() {
    const els = this._canvas.elements;
    return this._selection.filter(id => {
      const el = els.find(e => e.id === id);
      return el && !isPinned(el);
    }).length;
  }

  _onDown(e, idx, mode) {
    e.stopPropagation();
    const surface = e.currentTarget.closest('.canvas');
    const rect = surface.getBoundingClientRect();
    // A resize handle names its own element; only a press on the box itself
    // has a stack to choose from. Resizing still ends the walk, so the next
    // click on the box starts from the top again.
    if (mode === 'move') idx = this._pressTarget(e, rect, idx);
    else this._lastDown = null;
    const el = this._canvas.elements[idx];

    // Shift, Ctrl or Cmd adds to the selection instead of replacing it, and
    // starts nothing: a press meant to pick a second element is not a drag,
    // and a hand that moves a pixel while holding a modifier should not
    // shove what it was only pointing at.
    if (mode === 'move' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      this._toggleSel(el.id);
      return;
    }
    // Pressing something already in the selection keeps the selection - that
    // press is how the group is dragged. Anything else selects just itself.
    if (!this._isSel(el.id)) this._selectOnly(el.id);

    // Selected but not dragged. A pinned element still has to be reachable -
    // it is where its settings live, and where the lock is undone - so the
    // press picks it up as any other and simply starts nothing.
    if (isPinned(el)) return;
    const box = e => ({ id: e.id, surface: e.surface, locked: e.locked,
                        x: e.x, y: e.y, w: e.w, h: e.h });
    const group = mode === 'move' && this._selection.length > 1
      ? this._canvas.elements.filter(e => this._isSel(e.id)).map(box)
      : null;
    this._drag = {
      idx, mode, rect, group,
      startX: e.clientX, startY: e.clientY,
      origin: box(el),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  _onMove(e) {
    if (this._band) return this._onBandMove(e);
    if (!this._drag) return;
    const c = this._canvas;
    const { rect, startX, startY, origin, mode, idx } = this._drag;
    // Pointer pixels -> virtual units, so the maths never sees a pixel.
    const delta = {
      dx: (e.clientX - startX) / rect.width * c.w,
      dy: (e.clientY - startY) / rect.height * c.h,
    };
    if (this._lastDown && (Math.abs(e.clientX - startX) > SAME_SPOT_PX
                        || Math.abs(e.clientY - startY) > SAME_SPOT_PX)) {
      this._lastDown.moved = true;
    }
    if (this._drag.group) this._setEls(applyGroupDrag(c, this._drag.group, delta, origin.id));
    else this._setEl(idx, applyDrag(c, origin, mode, delta));
  }

  /**
   * A press on the canvas background: the start of a selection frame.
   *
   * Nothing is selected or cleared yet. That happens on release, so a plain
   * click still clears the selection the way it always has, and the press
   * only becomes a frame once the pointer has actually travelled - otherwise
   * every click would flash a zero-sized box.
   */
  _onCanvasDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const at = this._bandPoint(e, rect);
    this._band = { rect, live: false, startX: e.clientX, startY: e.clientY,
                   // Held down, the frame adds to what is already selected
                   // instead of replacing it - the same modifiers as a click.
                   base: (e.shiftKey || e.ctrlKey || e.metaKey) ? this._selection : [],
                   x0: at.x, y0: at.y, x1: at.x, y1: at.y };
  }

  /** A pointer position in canvas units, clamped to the canvas. */
  _bandPoint(e, rect) {
    const c = this._canvas;
    return { x: Math.max(0, Math.min(c.w, (e.clientX - rect.left) / rect.width * c.w)),
             y: Math.max(0, Math.min(c.h, (e.clientY - rect.top) / rect.height * c.h)) };
  }

  _onBandMove(e) {
    const b = this._band;
    const live = b.live || Math.abs(e.clientX - b.startX) > SAME_SPOT_PX
                        || Math.abs(e.clientY - b.startY) > SAME_SPOT_PX;
    if (!live) return;
    const at = this._bandPoint(e, b.rect);
    this._band = { ...b, live: true, x1: at.x, y1: at.y };
    // Selected as the frame is drawn, not on release: what it holds has to be
    // visible while there is still a chance to make it hold something else.
    const inside = elementsInRect(this._canvas, this._band);
    this._applySelection([...b.base, ...inside.filter(id => !b.base.includes(id))]);
  }

  _onUp() {
    if (this._band) {
      const live = this._band.live;
      this._band = null;
      // A frame is not a step in a walk down a stack of elements.
      this._lastDown = null;
      // A press that never travelled is the plain background click it has
      // always been.
      if (!live) this._deselect();
      return;
    }
    const mode = this._drag?.mode;
    const d = this._lastDown;
    this._drag = null;
    // Clicking the same spot again walks one step down the stack under the
    // pointer, the way easy-floorplan does it: an element another one covers
    // completely can be reached no other way. A press that moved was a drag,
    // and a drag picks nothing new.
    // Not while several are selected: the walk replaces what is selected, and
    // that is the opposite of what a second click is doing there.
    if (mode !== 'move' || !d || d.moved || !d.same || d.stack.length < 2) return;
    if (this._extra.length) return;
    const els = this._canvas.elements;
    const at = d.stack.findIndex(i => els[i]?.id === this._sel);
    const next = els[d.stack[(Math.max(at, 0) + 1) % d.stack.length]];
    if (next) this._sel = next.id;
  }

  /**
   * The real component for an element, or null to keep the plain box.
   *
   * The id *is* the index - the same `gauge_0` / `progressbar_0` convention
   * `onAfterRender` slots by - and the two branches mirror what each module's
   * `update()` does, including its own active flags, so the preview cannot
   * show a card the renderer would not draw. `slot` is what the card passes
   * as `rootConfig`, because it is the same object.
   *
   * Both hosts are `pointer-events: none`, which is why a live element can sit
   * inside a draggable box without swallowing the drag.
   */
  _liveContent(el) {
    const slot = this.slot || {};
    if (el.surface || !this.hass) return null;
    const m = /^(gauge|progressbar)_(\d+)$/.exec(String(el.id || ''));
    if (!m) return null;
    const idx = Number(m[2]);

    if (m[1] === 'gauge') {
      if (!slot.gauge_active) return null;
      const gauges = Array.isArray(slot.gauges) && slot.gauges.length > 0 ? slot.gauges : [slot];
      const cfg = gauges[idx];
      if (!cfg) return null;
      // onCanvas: the element's box is the size here, exactly as on the card.
      return html`<sc-gauge .config=${cfg} .hass=${this.hass}
                            .globalEntities=${slot.global_entities} .onCanvas=${true}></sc-gauge>`;
    }

    if (!slot.progressbar_active) return null;
    const bars = Array.isArray(slot.progressbars) ? slot.progressbars : [];
    const cfg = bars[idx];
    if (!cfg || cfg.active === false) return null;
    return html`<sc-progressbar .config=${cfg} .hass=${this.hass} .rootConfig=${slot}
                                .globalEntities=${slot.global_entities}></sc-progressbar>`;
  }

  // --- element list -----------------------------------------------------
  _unplaced() {
    const placed = new Set(this._canvas.elements.map(e => e.id));
    return getLayoutTargets(this.slot || {})
      .filter(t => t.id !== 'empty' && !placed.has(t.id));
  }

  /** What the menu picked, ready for the next click on the canvas to land. */
  _startPlacing(what) {
    this._menu = false;
    this._placing = what;
    // No ghost until the pointer says where. Drawing one at the last position
    // would put a box under a crosshair that has since moved on.
    this._ghost = null;
  }

  _closeMenu() {
    this._menu = false;
    this._placing = null;
    this._ghost = null;
  }

  /** Where a pointer event is, in canvas units. */
  _atPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const c = this._canvas;
    return { x: (e.clientX - rect.left) / rect.width * c.w,
             y: (e.clientY - rect.top) / rect.height * c.h };
  }

  /**
   * Follow the crosshair with the box the next click would make.
   *
   * The geometry is `newElementPreview`, which is `addElement`'s own working
   * - same id, same size rule, same snap and same clamp at the edges - so the
   * ghost cannot promise a placement the click then does not make. Null where
   * the element could not be added at all, and then nothing is drawn.
   */
  _ghostAt(e) {
    if (!this._placing) return;
    this._ghost = newElementPreview(this.slot, this._canvas, this._placing, this._atPointer(e));
  }

  /**
   * A method rather than an arrow in the template: every pointermove sets the
   * ghost and so re-renders, and a fresh closure there would have lit detach
   * and reattach the listener on every one of those frames.
   */
  _dropGhost() { this._ghost = null; }

  /** The label the menu gave whatever is waiting to be placed. */
  get _placingLabel() {
    const kind = NEW_ELEMENT_KINDS.find(k => k.kind === this._placing);
    if (kind) return kind.label.toLowerCase();
    const t = this._unplaced().find(t => t.id === this._placing);
    return t ? (t.group === 'Basic' ? t.label : `${t.group} - ${t.label}`) : this._placing;
  }

  /**
   * Put the chosen element down where the pointer is.
   *
   * The definition comes from the module that renders it - `newEntry` - so
   * the canvas decides where a new gauge goes without knowing what a gauge
   * contains. One `__merge__` rather than two commits, for the reason
   * `_duplicate` gives.
   */
  _place(e) {
    // The overlay is a child of the canvas, whose own press clears the
    // selection - and the point of placing is to end up with the new element
    // selected.
    e.stopPropagation();
    const what = this._placing;
    this._placing = null;
    this._ghost = null;
    if (!what || !this.commitFn) return;

    const c = this._canvas;
    const at = this._atPointer(e);

    const kind = NEW_ELEMENT_KINDS.find(k => k.kind === what);
    const entry = kind?.module
      ? window.SupercardModules[kind.module]?.newEntry?.()
      : undefined;

    const made = addElement(this.slot, c, what, entry, at);
    if (!made) return;
    this._sel = made.id;
    this.commitFn('__merge__', { canvas: made.canvas, ...made.patch });
  }

  /**
   * What can be added, in two groups: something the card does not have yet,
   * and something it has that the canvas is not showing.
   */
  _renderAddMenu() {
    const unplaced = this._unplaced();
    return html`
      <div class="menu">
        <div class="menu-group">New</div>
        ${NEW_ELEMENT_KINDS.map(k => {
          const ok = canAddKind(this.slot, k.kind);
          return html`
            <button class="menu-item" ?disabled=${!ok}
                    title=${ok ? '' : "This card's gauge is the card itself, from before a card could have more than one - a second one would replace it."}
                    @click=${() => this._startPlacing(k.kind)}>${k.label}</button>`;
        })}
        ${unplaced.length ? html`
          <div class="menu-group">Not on the canvas</div>
          ${unplaced.map(t => html`
            <button class="menu-item" @click=${() => this._startPlacing(t.id)}>${
              t.group === 'Basic' ? t.label : `${t.group} - ${t.label}`}</button>`)}` : ''}
      </div>`;
  }

  /**
   * Copy the element, its definition and all, and select the copy.
   *
   * One `__merge__` rather than two commits: the new box and the entry it
   * points at are one edit, and `_commit` clones `this.config`, so a second
   * commit in the same tick would be written from a config that does not have
   * the first one yet.
   */
  _duplicate(idx) {
    const made = duplicateElement(this.slot, this._canvas, idx);
    if (!made || !this.commitFn) return;
    this._sel = made.id;
    this.commitFn('__merge__', { canvas: made.canvas, ...made.patch });
  }

  _remove(idx) {
    const c = structuredClone(this._canvas);
    const [gone] = c.elements.splice(idx, 1);
    // The list below the canvas follows the selection, so an id that no
    // longer exists would leave it empty with nothing left to click.
    if (this._sel === gone?.id) this._sel = null;
    if (gone) this._extra = this._extra.filter(id => id !== gone.id);
    this._commit(c);
  }

  /** Later in the array draws on top, so this is what "bring forward" means. */
  _move(idx, dir) {
    const c = structuredClone(this._canvas);
    const to = idx + dir;
    if (to < 0 || to >= c.elements.length) return;
    const [el] = c.elements.splice(idx, 1);
    c.elements.splice(to, 0, el);
    this._commit(c);
  }

  /**
   * The selected element's own settings, under the canvas.
   *
   * A mount point, not a second implementation: the editor that owns those
   * fields renders one entry alone when given `only`, so a change to a bar's
   * fields is a change in the progressbar editor and shows up here without
   * anything being kept in step. `.slot` is the config sub-object every
   * editor takes - the property shadows the HTML attribute of that name, the
   * way this editor is itself mounted.
   */
  _renderElementConfig(id) {
    const wrap = (title, body) => html`
      <details class="el-config" ?open=${this._configOpen}
               @toggle=${e => { this._configOpen = e.target.open; }}>
        <summary>${title}</summary>
        <div class="el-config-body">${body}</div>
      </details>`;
    const props = { hass: this.hass, slot: this.slot, commitFn: this.commitFn };

    let m;
    if ((m = id.match(/^progressbar_(\d+)$/))) {
      return wrap('Progressbar settings', html`
        <sc-progressbar-editor .hass=${props.hass} .slot=${props.slot}
                               .commitFn=${props.commitFn} .only=${Number(m[1])}></sc-progressbar-editor>`);
    }
    if ((m = id.match(/^gauge_(\d+)$/))) {
      return wrap('Gauge settings', html`
        <sc-gauge-editor .hass=${props.hass} .slot=${props.slot}
                         .commitFn=${props.commitFn} .only=${Number(m[1])}></sc-gauge-editor>`);
    }
    if ((m = id.match(/^label_(\d+)(?:_(?:icon|name|value))?$/))) {
      return wrap('Label settings', html`
        <sc-labels-editor .hass=${props.hass} .slot=${props.slot}
                          .commitFn=${props.commitFn} .only=${Number(m[1])}></sc-labels-editor>`);
    }

    const el = this._canvas.elements.find(e => e.id === id);
    return wrap('Element settings', html`<div class="hint" style="padding:4px 4px 8px;">${el?.surface
      ? html`A surface has no settings of its own - it is a box for a colour or
             glass pattern to paint. Target <code>${id}</code> in the colour or
             fx-glass section.`
      : html`<code>${id}</code> comes from the card's main entity, so its
             settings are the card's rather than this element's.`}</div>`);
  }

  render() {
    if (!this.slot?.canvas) return html``;
    const c = this._canvas;
    const els = Array.isArray(c.elements) ? c.elements : [];
    const step = resolveSnap(c);
    const rows = this._rows;
    const columns = this._columns;
    const maxColumns = this._maxColumns;
    const mismatch = this._gridMismatch;
    const gridPct = (c.grid > 0 ? c.grid : step) / c.w * 100;
    const pct = (v, total) => `${v / total * 100}%`;
    // The list below the canvas shows the selected elements alone, so an id
    // that no longer names one - a gauge deleted in its own editor, say -
    // would leave it empty. Fall back to the whole list.
    const alive = id => els.some(e => e.id === id);
    const sel = alive(this._sel) ? this._sel : null;
    const selected = this._selection.filter(alive);
    const movers = this._distributable;

    return html`
      <div class="col">
        <div class="row">
          <label>Card width</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <input class="num" type="number" min="1" max=${maxColumns} .value=${columns === 'full' ? maxColumns : columns}
                   @change=${e => {
                     const n = Math.max(1, Math.min(maxColumns, parseInt(e.target.value) || 1));
                     // lit writes .value only when the bound value changes, so a
                     // number that clamps back to the one already set would leave
                     // the field showing what was typed instead.
                     e.target.value = String(n);
                     // The whole width is `full` in HA's own tab, which is not the
                     // same as the number that happens to equal it today: a section
                     // made wider later takes a `full` card with it.
                     this._setGrid({ columns: columns === 'full' && n === maxColumns ? 'full' : n });
                   }}>
            <span class="hint">of ${maxColumns} columns · ${Math.round(gridColumnsToPx(columns, maxColumns))} px</span>
          </div>
        </div>
        <div class="row">
          <label>Card height</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <select style="width:110px" @change=${e => this._setRows(e.target.value === 'auto' ? null : (this._rows ?? 4))}>
              <option value="auto" ?selected=${rows === null}>Fit the canvas</option>
              <option value="rows" ?selected=${rows !== null}>Fixed rows</option>
            </select>
            ${rows !== null ? html`
              <input class="num" type="number" min="1" max="50" .value=${rows}
                     @change=${e => this._setRows(Math.max(1, parseInt(e.target.value) || 1))}>
              <span class="hint">${gridRowsToPx(rows)} px</span>` : ''}
          </div>
        </div>
        <div class="hint" style="margin:-4px 0 4px 0;">
          ${rows === null
            ? html`The card is as wide as its columns and exactly as tall as the canvas shape makes it. Both are the same settings as in the <b>Layout</b> tab.`
            : html`Both are the same settings as in the <b>Layout</b> tab. Changing one here reshapes the canvas to match, so nothing letterboxes.`}
        </div>
        <div class="row">
          <label>Canvas</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <input class="num" type="number" min="1" .value=${c.w}
                   @change=${e => this._setCanvas('w', Math.max(1, parseInt(e.target.value) || DEFAULT_CANVAS.w))}>
            <span class="hint">×</span>
            <input class="num" type="number" min="1" .value=${c.h}
                   @change=${e => this._setCanvas('h', Math.max(1, parseInt(e.target.value) || DEFAULT_CANVAS.h))}>
          </div>
        </div>
        ${mismatch ? html`
          <div class="hint" style="margin:-4px 0 4px 0; display:flex; gap:8px; align-items:center;">
            <span style="flex:1">The canvas is a different shape from the card, so it letterboxes inside it.</span>
            <button class="add-btn" style="width:auto; padding:5px 10px;" @click=${() => this._matchGrid()}>
              Match the card
            </button>
          </div>` : ''}
        <div class="row">
          <label>Grid / snap</label>
          <div style="display:flex; gap:6px; align-items:center;">
            <input class="num" type="number" min="0" .value=${c.grid ?? DEFAULT_GRID}
                   @change=${e => this._setCanvas('grid', Math.max(0, parseInt(e.target.value) || 0))}>
            <select style="width:110px" @change=${e => {
              const v = e.target.value;
              this._setCanvas('snap', v === 'grid' ? undefined : (v === 'free' ? 0 : parseFloat(v)));
            }}>
              <option value="grid" ?selected=${c.snap === undefined}>Snap to grid</option>
              <option value="free" ?selected=${c.snap === 0}>Free</option>
              ${[1, 2, 5, 25].map(n => html`<option value=${n} ?selected=${c.snap === n}>Step ${n}</option>`)}
            </select>
          </div>
        </div>

        <div class="row">
          <label>Live preview</label>
          <ha-switch .checked=${this._live}
                     @change=${e => { this._live = e.target.checked; }}></ha-switch>
        </div>
        <div class="hint" style="margin:-4px 0 4px 0;">${this._live
          ? html`The real gauges and bars. Text sizes are the card's, not this preview's.`
          : html`Plain boxes - easier to see and to grab.`}</div>

        <style>${this._live ? els.filter(e => !e.surface).map(el => itemTypography(el,
          `.el.live[data-item-id="${el.id}"]`,
          `.el.live[data-item-id="${el.id}"] > :not(.handle)`)).join('\n') : ''}</style>

        <div class="tool-row">
          <div class="menu-wrap">
            <button class="add-btn" style="width:auto; padding:6px 12px;"
                    @click=${() => { this._menu = !this._menu; this._placing = null; }}>
              ＋ Add element
            </button>
            ${this._menu ? this._renderAddMenu() : ''}
          </div>
          <span class="hint" style="flex:1">${this._placing
            ? html`Click on the canvas to place the ${this._placingLabel}. Escape cancels.`
            : html`Later in the list draws on top. A gauge stays square and fills its box.`}</span>
        </div>

        <div class="canvas-wrap">
          <div class="canvas" style="aspect-ratio:${c.w} / ${c.h};"
               @pointermove=${this._onMove}
               @pointerup=${this._onUp}
               @pointercancel=${this._onUp}
               @pointerdown=${this._onCanvasDown}>
            <div class="grid" style="background-size:${gridPct}% ${gridPct * c.w / c.h}%;"></div>
            ${this._placing ? html`
              <div class="place-layer" @pointerdown=${this._place}
                   @pointermove=${this._ghostAt}
                   @pointerleave=${this._dropGhost}>
                ${this._ghost ? html`
                <div class="ghost ${this._ghost.surface ? 'surface' : ''}"
                     style="left:${pct(this._ghost.x, c.w)}; top:${pct(this._ghost.y, c.h)}; width:${pct(this._ghost.w, c.w)}; height:${pct(this._ghost.h, c.h)};"
                     >${this._ghost.id}</div>` : ''}
              </div>` : ''}
            ${this._band?.live ? html`
              <div class="band" style="left:${pct(Math.min(this._band.x0, this._band.x1), c.w)}; top:${pct(Math.min(this._band.y0, this._band.y1), c.h)}; width:${pct(Math.abs(this._band.x1 - this._band.x0), c.w)}; height:${pct(Math.abs(this._band.y1 - this._band.y0), c.h)};"></div>` : ''}
            ${els.map((el, idx) => {
              // Never live mid-drag. Every pointermove commits, so the config
              // objects are cloned and the components would be handed a new
              // `.config` at pointer frequency - a full re-render of every
              // gauge on the canvas per frame. The plain box is also the
              // clearer thing to drag.
              const live = this._live && !this._drag ? this._liveContent(el) : null;
              const pinned = isPinned(el);
              return html`
              <div class="el ${el.surface ? 'surface' : ''} ${live ? 'live' : ''} ${this._isSel(el.id) ? 'sel' : ''} ${pinned ? 'pinned' : ''}"
                   style="left:${pct(el.x, c.w)}; top:${pct(el.y, c.h)}; width:${pct(el.w, c.w)}; height:${pct(el.h, c.h)};"
                   data-item-id=${el.id} title=${pinned ? `${el.id} - locked` : el.id}
                   @pointerdown=${e => this._onDown(e, idx, 'move')}>
                ${live ?? el.id}
                ${pinned || selected.length > 1 ? '' : html`
                <div class="handle" @pointerdown=${e => this._onDown(e, idx, 'resize')}></div>`}
              </div>`;
            })}
          </div>
          ${selected.length > 1 ? html`
            <div class="rail">
              <button title=${this._copyable
                        ? `Copy the ${this._copyable} of them that can be copied`
                        : 'None of these can be copied'}
                      ?disabled=${!this._copyable}
                      @click=${() => this._duplicateSelection()}>⧉</button>
              <button title=${movers < 3
                        ? 'Three elements that can move are needed to even out the gaps between them'
                        : 'Even gaps left to right. The outermost two stay where they are.'}
                      ?disabled=${movers < 3}
                      @click=${() => this._distribute('x')}>⇔</button>
              <button title=${movers < 3
                        ? 'Three elements that can move are needed to even out the gaps between them'
                        : 'Even gaps top to bottom. The outermost two stay where they are.'}
                      ?disabled=${movers < 3}
                      @click=${() => this._distribute('y')}>⇕</button>
            </div>` : ''}
        </div>

        <div class="col" style="gap:4px;">
          ${els.map((el, idx) => [el, idx])
               .filter(([el]) => !selected.length || selected.includes(el.id))
               .map(([el, idx]) => html`
            <div class="el-row ${selected.length > 1 ? 'co' : (this._sel === el.id ? 'sel' : '')}">
              <span class="el-name" @click=${e => {
                      // The same modifiers as on the canvas, so a selection can
                      // be built from either place.
                      if (e.shiftKey || e.ctrlKey || e.metaKey) this._toggleSel(el.id);
                      else this._selectOnly(el.id);
                    }}>${el.id}</span>
              ${selected.length === 1 && this._sel === el.id ? html`
                ${(isSquareLocked(el) ? ['x', 'y', 'size'] : ['x', 'y', 'w', 'h']).map(k => html`
                  <input class="num" type="number" step=${step}
                         .value=${Math.round(k === 'size' ? Math.min(el.w, el.h) : el[k])}
                         title=${k === 'size' ? 'size - a gauge is always square' : k}
                         @change=${e => {
                           const v = parseFloat(e.target.value) || 0;
                           this._setEl(idx, k === 'size' ? { w: v, h: v } : { [k]: v });
                         }}>`)}
              ` : ''}
              <button class="icon-btn" title=${isPinned(el)
                        ? 'Locked - click to let it be dragged again'
                        : 'Lock in place, so a stray drag cannot move it'}
                      style=${isPinned(el) ? 'color:var(--warning-color,#ffc107)' : ''}
                      @click=${() => this._setEl(idx, { locked: isPinned(el) ? undefined : true })}>${isPinned(el) ? '🔒' : '🔓'}</button>
              <button class="icon-btn" title="Backward" @click=${() => this._move(idx, -1)}>↑</button>
              <button class="icon-btn" title="Forward" @click=${() => this._move(idx, 1)}>↓</button>
              <button class="icon-btn" ?disabled=${!canDuplicate(this.slot, el)}
                      title=${canDuplicate(this.slot, el)
                        ? 'Duplicate'
                        : 'The card has only one of these, so there is nothing to copy'}
                      @click=${() => this._duplicate(idx)}>⧉</button>
              <button class="icon-btn" style="color:#f44" title="Remove from the canvas"
                      @click=${() => this._remove(idx)}>✕</button>
            </div>`)}
        </div>
        <div class="hint">${selected.length > 1
          ? html`${selected.length} selected - dragging one moves them all, and the buttons beside the canvas copy them or even out the gaps. An element's own settings are back when it is the only one selected.`
          : (sel
            ? html`Click the canvas background to list every element again. Shift-click a second element to move them together.`
            : html`Click an element on the canvas to work on it here, or drag a frame on the background to take several.`)}</div>

        ${sel && selected.length === 1 ? this._renderElementConfig(sel) : ''}

      </div>`;
  }
}
if (!customElements.get('sc-canvas-editor')) customElements.define('sc-canvas-editor', ScCanvasEditor);

// --- BRIDGE TO CORE ---
window.SupercardModules['layout'] = window.SupercardModules['layout'] || {};
Object.assign(window.SupercardModules['layout'], (() => {
  function resolveElement(shadow, id) {
    if (id === 'icon')  return shadow.querySelector('#icon');
    if (id === 'name')  return shadow.querySelector('#header');
    if (id === 'state') return shadow.querySelector('#state');
    if (id.startsWith('gauge_')) return shadow.querySelector(`sc-gauge[data-idx="${id.split('_')[1]}"]`);
    if (id.startsWith('progressbar_')) return shadow.querySelector(`sc-progressbar[data-idx="${id.split('_')[1]}"]`);
    return null;
  }

  function update({ config }) {
    if (!config?.layout_active) return {};
    return { litOverlay: html`<sc-layout-renderer .config=${config}></sc-layout-renderer>` };
  }

  function onAfterRender(shadow, config) {
    const contentRow = shadow.querySelector('.sc-content-row');
    if (!config?.layout_active) {
      if (contentRow) contentRow.style.display = 'flex';
      return;
    }
    const renderer = shadow.querySelector('sc-layout-renderer');
    if (!renderer) return;
    if (contentRow) contentRow.style.display = 'none';

    const assignSlot = (el, slotName) => {
      if (!el) return;
      if (slotName === 'icon') el.classList.add('sc-primary-icon');
      if (slotName === 'name') el.classList.add('sc-lbl-n');
      if (slotName === 'state') el.classList.add('sc-lbl-v');
      if (el.slot !== slotName) el.slot = slotName;
      if (el.parentElement !== renderer) renderer.appendChild(el);
    };

    // Which elements exist is the model's answer, and the canvas is a model of
    // its own - reading layout_rows here would leave anything placed after the
    // conversion unslotted, rendering it outside the canvas at the card's
    // default position. Converted cards keep their rows, which is the only
    // reason this went unnoticed.
    if (Array.isArray(config.canvas?.elements)) {
      const placed = new Set(config.canvas.elements.map(el => el.id));
      // assignSlot moved these out of the template lit created them in, so
      // lit cannot take them back when the module stops rendering them. One
      // whose element has been removed from the canvas would stay here for
      // good - invisible, still bound to hass, and still the first thing
      // resolveElement finds if that element is ever placed again.
      [...renderer.children].forEach(node => {
        const tag = node.tagName;
        if (tag !== 'SC-GAUGE' && tag !== 'SC-PROGRESSBAR') return;
        if (!placed.has(node.slot)) node.remove();
      });
      config.canvas.elements.forEach(el => {
        if (el.surface || el.id?.startsWith('label_')) return;
        assignSlot(resolveElement(shadow, el.id), el.id);
      });
      return;
    }

    const rows = Array.isArray(config.layout_rows) ? config.layout_rows : [];
    rows.forEach(row => {
      row.cells.forEach(cell => {
        getCellItems(cell).forEach(item => {
          if (item.id?.startsWith('label_')) return;
          assignSlot(resolveElement(shadow, item.id), item.id);
        });
      });
    });
  }

  /**
   * A card on the canvas model gets the canvas editor. One still on rows and
   * cells gets the old one plus the button that converts it - and a card on
   * neither, which every card was before it had a layout, is offered a canvas
   * built from what it draws. Only a rows layout can be *converted*, so only
   * that card is offered a conversion; a new card starts on the canvas and
   * never sees either button.
   *
   * The conversion is offered rather than performed: it is one-way, it picks
   * an aspect ratio the old model never stored, and doing that to someone's
   * card because they opened the editor would be indefensible. layout_rows is
   * kept afterwards, so a card converted by mistake can be recovered by
   * deleting `canvas` in the YAML editor.
   */
  function renderCustomBlock(commitFn, hass, slot, cardConfig) {
    if (slot?.canvas) {
      return html`<sc-canvas-editor .slot=${slot} .hass=${hass} .cardConfig=${cardConfig}
                                    .commitFn=${commitFn}></sc-canvas-editor>`;
    }
    const convertible = Array.isArray(slot?.layout_rows) && slot.layout_rows.length > 0;
    const dead = deadCellTargets(slot);
    const live = (/** @type {string[]} */ keys) => keys.filter(k => !dead.includes(k));
    // What each painted cell becomes, so the offer can say it: a surface for
    // the region, or - for glass on a cell holding one element - that element.
    const follows = soleElementTargets(slot?.layout_rows);
    const coloured = live(colouredCells(slot));
    const onElement = live(glassedCells(slot)).filter(k => k in follows);
    const surfaced = live(paintedCells(slot)).filter(k => !onElement.includes(k) || coloured.includes(k));
    const clicked = live(clickedCells(slot));
    // Pill was a card *shape*, and the canvas has only a corner radius - the
    // shape control is not offered there. Half the shorter side is the same
    // stadium, so a round card stays round instead of being squared off by a
    // change of model. It travels in the conversion's own commit; a second one
    // in the same tick would be lost.
    const pillAsRadius = SC.cardIsPill(slot)
      ? { border_radius: 50, border_radius_unit: '%', border_radius_ref: 'min' }
      : {};
    return html`
      <sc-layout-editor .slot=${slot} .hass=${hass} .commitFn=${commitFn}></sc-layout-editor>
      ${convertible ? html`
        <div style="margin: 0 16px 16px 16px; padding: 10px 12px; border: 1px dashed var(--primary-color,#03a9f4); border-radius: 6px; font-size: 12px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 12px;">
          <span style="flex:1">
            <b style="color:var(--primary-text-color)">Try the canvas layout.</b>
            Everything keeps its position; the card takes a fixed shape you can
            then change. Your rows stay in the config, so this is reversible.
            ${surfaced.length ? html`<br>Colour and glass patterns on
              ${surfaced.length === 1 ? 'one cell' : `${surfaced.length} cells`}
              are repointed at a surface covering the same region, so the
              backgrounds stay.` : ''}
            ${onElement.length ? html`<br>Glass on
              ${onElement.length === 1 ? 'a cell that holds' : `${onElement.length} cells that hold`}
              a single element follows that element, so it stays in front of it
              as it is now - it then covers the element's box rather than the
              whole cell.` : ''}
            ${dead.length ? html`<br>${dead.length === 1 ? 'One pattern points' : `${dead.length} patterns point`}
              at a cell this layout does not have (${dead.join(', ')}); already
              doing nothing, and left as they are.` : ''}
            ${clicked.length ? html`<br><b style="color:var(--primary-text-color)">Tap actions on
              ${clicked.length === 1 ? 'a cell' : 'cells'} do not come along</b>
              (${clicked.join(', ')}) - a surface takes no clicks. Point them at
              an element after converting.` : ''}
          </span>
          <button type="button" style="background: var(--primary-color,#03a9f4); border: none; color: #fff; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;"
            @click=${e => {
              // The shape the card already occupies, so converting changes the
              // model and not the picture. A blind default would reshape every
              // card that is not 2:1 and shrink whatever had to fit inside it.
              // e.currentTarget is the one thing in reach that sits inside the
              // edit dialog, which is where the section's width is to be had.
              const shape = canvasFromGrid(cardConfig, slot, 400, sectionColumns(e.currentTarget));
              // Only the cells that still need one get a surface: glass that
              // follows the single element in its cell leaves nothing behind
              // to paint, and migration does not invent elements nobody asked
              // for. A cell that is coloured as well keeps its surface.
              const { elements, cellTargets } = migrateLayoutToCanvas(slot.layout_rows, shape,
                { targetedCells: surfaced });
              // The patterns have to travel with the canvas, in one commit: a
              // card that got its canvas but not its repointed targets is
              // exactly the card whose background disappeared.
              const { lists } = repointPatterns(slot, cellTargets, follows);
              commitFn('__merge__', { canvas: { ...shape, elements }, ...lists, ...pillAsRadius });
            }}>
            Convert
          </button>
        </div>` : html`
        <div style="margin: 0 16px 16px 16px; padding: 10px 12px; border: 1px dashed var(--primary-color,#03a9f4); border-radius: 6px; font-size: 12px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 12px;">
          <span style="flex:1">
            <b style="color:var(--primary-text-color)">Start on the canvas.</b>
            Everything the card shows comes along - laid out top to bottom as a
            starting point, then dragged and sized wherever you want it. You can
            switch back by deleting <code>canvas</code> in the YAML editor.
          </span>
          <button type="button" style="background: var(--primary-color,#03a9f4); border: none; color: #fff; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;"
            @click=${e => {
              // Rows, a cell, content, convert - four steps of the old model to
              // reach the new one. There is nothing to migrate on a card like
              // this, so the canvas is built from what the card draws instead.
              // layout_active gates the renderer, so a canvas without it is a
              // canvas nobody sees - and it travels in the same commit,
              // because a second one in this tick would be lost.
              commitFn('__merge__', {
                canvas: canvasFromCard(cardConfig, slot, sectionColumns(e.currentTarget)),
                layout_active: true, ...pillAsRadius });
            }}>
            Use canvas
          </button>
        </div>`}`;
  }

  return /** @type {SupercardModule} */ ({ update, onAfterRender, editorFields: () => [], renderCustomBlock });
})());