import { LitElement, html, svg, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { resolveSnap, gridToUnits, unitsToGrid, applyDrag, applyGroupDrag, distributeElements,
         elementsInRect, duplicateElements,
         isSquareLocked, isPinned, DEFAULT_CANVAS, DEFAULT_GRID,
         gridRowsToPx, gridColumnsToPx, gridSize, canvasFromGrid, canvasFromCard,
         pinnedToShape, rescaleCanvas, rowsForShape, defaultShapeRows,
         sectionColumns, sectionWidthPx,
         canDuplicate, reorderElement, overlappingElements,
         alignElements, restorePatch,
         NEW_ELEMENT_KINDS, canAddKind, addElement, newElementPreview } from "./canvas-model.js";
import { needsRowsCompat, rowsAsCanvas } from "./rows-compat.js";
import { templatesFor, templateEntry, previewFor } from "./element-templates.js";
import { labelFontSize, labelIconSize, DENSITY, FIT_DENSITY } from "./label-typography.js";

const SC = window.SupercardUtils;

/**
 * The cell a template's miniature is drawn into, in CSS pixels.
 *
 * Here rather than in the stylesheet because `_previewBox` has to fit the
 * element's own shape inside it, and a cell size that lived in both places
 * would eventually disagree - the miniature would then be laid out to one
 * size and clipped to another.
 *
 * 3:2, because a 270-degree gauge face is wider than it is tall and a bar of
 * any orientation fits inside one.
 */
const TPL_CELL = Object.freeze({ w: 100, h: 66 });

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

    // A density that only caps a chosen size may be optimistic; one that
    // decides the size may not - see FIT_DENSITY.
    const density = layoutItem?.font_fit ? FIT_DENSITY : DENSITY;
    const factorN = layoutItem?.font_factor || density;
    const factorV = layoutItem?.font_factor || density;

    const shadowCSS = item.text?.shadow ? 'text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5);' : '';
    const iconShadow = item.text?.shadow ? 'filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.8));' : '';

    /*
     * A box drawn large on the canvas is usually asking for text that fills
     * it, and until now it got text at the card's own size that only shrank
     * when the box became too small. `font_fit` is that second reading, asked
     * for per element: the size the element was given drops out of the min()
     * and the box decides. Both lines of a label that shows a name over a
     * value then share the height, or the two of them together are taller
     * than the box they are in.
     */
    const fit = !!layoutItem?.font_fit;
    const stacked = fit && part === undefined && item.text?.showName !== false && !!tValue ? 2 : 1;
    // The icon sits on the name's line, so only that line pays for it.
    const besideName = fit && item.icon?.enabled && item.icon.position !== 'only' && part !== 'value';
    const nameSize = labelFontSize({ chars: lenName, factor: factorN, lines: stacked,
                                     base: fit ? null : 'var(--sc-fs-n, inherit)',
                                     iconGap: besideName ? (item.icon.gap ?? 4) : null });
    const valueSize = labelFontSize({ chars: lenValue, factor: factorV, lines: stacked,
                                      base: fit ? null : 'var(--sc-fs-v, inherit)' });

    const nameStyle = `font-size: ${nameSize}; font-weight:var(--sc-fw-n, inherit); color:var(--sc-fc-n, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${overflowCSS} ${shadowCSS}`;
    const valueStyle = `font-size: ${valueSize}; font-weight:var(--sc-fw-v, inherit); color:var(--sc-fc-v, inherit); line-height:1.1; margin:0; padding:0; display:block; min-width:0; ${overflowCSS} ${shadowCSS}`;

    // An icon beside text is text-sized; an icon alone has the whole box.
    const iconSizeVar = labelIconSize(fit
      ? { lines: stacked }
      : { base: `var(--sc-fs-n, ${item.icon.size || '20px'})` });
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
    // One model reaches this point. A card still carrying `layout_rows` is
    // answered with the canvas that layout describes before the renderer ever
    // sees it - see rows-compat.js - so there is nothing here to fall back to.
    if (this.config?.canvas) return this._renderCanvas(this.config.canvas);
    return html``;
  }
}
if (!customElements.get('sc-layout-renderer')) customElements.define('sc-layout-renderer', ScLayoutRenderer);



// --- CANVAS EDITOR -------------------------------------------------------
// One canvas, elements placed on it directly. The rows/cells/items model it
// replaced is gone; what is left of it is rows-compat.js, which reads an old
// card's `layout_rows` as the canvas it describes.
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

/**
 * The icon on an alignment button.
 *
 * Two bars and the line they are pulled to. Unicode has arrows and brackets
 * but nothing that reads as "line these up on their left edges", and six
 * buttons that all look like arrows are six buttons nobody can tell apart.
 *
 * @param {'left'|'hcenter'|'right'|'top'|'vcenter'|'bottom'} edge
 */
function alignIcon(edge) {
  const vertical = edge === 'top' || edge === 'vcenter' || edge === 'bottom';
  // Where the line is, and where the two bars start from.
  const line = edge === 'left' || edge === 'top' ? 3 : (edge === 'right' || edge === 'bottom' ? 21 : 12);
  const bars = vertical
    ? [{ x: 5, w: 5 }, { x: 14, w: 5 }]
    : [{ y: 5, h: 5 }, { y: 14, h: 5 }];
  return svg`
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <line x1=${vertical ? 2 : line} y1=${vertical ? line : 2}
            x2=${vertical ? 22 : line} y2=${vertical ? line : 22}
            stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
      ${bars.map(b => {
        const long = 8;
        if (vertical) {
          const y = edge === 'top' ? line : (edge === 'bottom' ? line - long : line - long / 2);
          return svg`<rect x=${b.x} y=${y} width=${b.w} height=${long} rx="1" fill="currentColor"></rect>`;
        }
        const x = edge === 'left' ? line : (edge === 'right' ? line - long : line - long / 2);
        return svg`<rect x=${x} y=${b.y} width=${long} height=${b.h} rx="1" fill="currentColor"></rect>`;
      })}
    </svg>`;
}

/**
 * How many steps back the canvas editor remembers.
 *
 * A snapshot is the canvas and the element lists, so a card with sixteen
 * gauges is a few kilobytes of it; thirty of those is nothing next to what
 * the editor already holds, and further back than anybody reaches by hand.
 */
const HISTORY_DEPTH = 30;

/**
 * What the arrows put back.
 *
 * The canvas, the elements on it, and the box the card asks Home Assistant
 * for - not the colour rules, the glass patterns or the interactions, which
 * are edited in their own sections of the same dialog and are nobody's idea
 * of "the last thing I did on the canvas".
 */
const HISTORY_KEYS = Object.freeze(['canvas', 'gauges', 'progressbars', 'labels_list']);

/**
 * Whether a commit changes anything an undo snapshot holds - the slot keys
 * above, or Home Assistant's `grid_options`. Everything else travels through
 * the same editor (the element settings commit through it, so their steps sit
 * in the right order) but is not its to put back.
 *
 * @param {string} key @param {any} value
 */
function touchesHistory(key, value) {
  if (key === '__batch__') {
    return Array.isArray(value) && value.some(([k, v]) => touchesHistory(k, v));
  }
  if (key === '__card__') return !!value && Object.keys(value).includes('grid_options');
  if (key === '__merge__') return !!value && Object.keys(value).some(k => HISTORY_KEYS.includes(k));
  return HISTORY_KEYS.includes(key);
}

/**
 * The zoom levels the - and + buttons walk through.
 *
 * Zoom is a property of the view, never of the card: it scales the pixels the
 * canvas is drawn at and nothing else. Every pointer position is read against
 * the canvas' own rect and divided by its width (`_bandPoint`, `_atPointer`,
 * `_onMove`), so an element's coordinates stay the whole canvas units they
 * were - which is the point, since the snapping work rests on them being
 * whole. Nothing here is ever committed.
 *
 * 1 is the level at which the canvas fits its frame exactly; the two below it
 * are for a tall canvas whose whole shape no longer fits the editor.
 *
 * @type {readonly number[]}
 */
const ZOOM_STEPS = Object.freeze([0.5, 0.75, 1, 1.5, 2, 3, 4]);
const ZOOM_MIN = ZOOM_STEPS[0];
const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

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
      _dragCanvas: { type: Object, state: true },
      _configOpen: { type: Boolean, state: true },
      _menu: { type: Boolean, state: true },
      _menuKind: { type: String, state: true },
      _placing: { type: String, state: true },
      _ghost: { type: Object, state: true },
      _zoom: { type: Number, state: true },
      _names: { type: Boolean, state: true },
      _layers: { type: Boolean, state: true },
      _undoStack: { type: Array, state: true },
      _redoStack: { type: Array, state: true },
    };
  }

  constructor() {
    super();
    this._sel = null;
    this._extra = [];
    this._band = null;
    this._drag = null;
    // Where a drag in progress has put the canvas, before it is committed.
    this._dragCanvas = null;
    // Set while an undo or redo is putting a column span back, so `updated`
    // knows the change it is about to see is not a user's edit.
    this._restoredGrid = false;
    this._configOpen = true;
    this._menu = false;
    // Which kind's template page the menu is showing, null for its front
    // page. State, because the menu is drawn from it.
    this._menuKind = null;
    this._placing = null;
    // The template the next placement lays down and the config it copied out
    // of it, or null for whatever the module makes. Not reactive - the hint
    // reads the label, and the hint re-renders with `_placing` anyway.
    this._placingTemplate = null;
    this._placingEntry = null;
    this._ghost = null;
    this._zoom = 1;
    // On: a name under a box is what somebody recognises their element by.
    // The box itself still says the id, which is what the rest of the editor
    // calls it - the list, the glass targets, the colour rules - so the two
    // languages are both on screen rather than one replacing the other. Like
    // the zoom, it belongs to the open editor and is never committed.
    this._names = true;
    // The layer panel, folded away until somebody has elements stacked and
    // goes looking for them. Editor state like the zoom, never committed.
    this._layers = false;
    // Which row a layer drag started on. Not reactive: the row it lands on
    // renders the drop, and the list re-renders from the commit anyway.
    this._layerFrom = null;
    // The way back, and the way forward again. They live as long as the open
    // editor does: what came before it is Home Assistant's own undo.
    this._undoStack = [];
    this._redoStack = [];
    // Set while a snapshot is being put back, so restoring is not itself
    // remembered as a change to undo.
    this._travelling = false;
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
        this._menuKind = null;
      }
    };
  }

  /**
   * Whether the canvas draws the real gauges or plain boxes. Kept in the card
   * rather than in this element, because the switch now sits in another menu -
   * two elements cannot share a field, and they do share the card.
   */
  get _live() { return this.slot?.live_preview !== false; }

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
   * button still offers that one.
   *
   * Both directions: a row count reshapes to it, and clearing one goes back to
   * the shape the canvas had before any row count was set. `_reshapedFor` is
   * null when there is nothing to do, which is what stops the commit this
   * causes from causing another.
   */
  updated(changed) {
    super.updated(changed);
    if (!changed.has('cardConfig')) return;
    const was = changed.get('cardConfig');
    if (!was) return;
    const grid = this.cardConfig?.grid_options || {};
    const before = was.grid_options || {};
    if (grid.columns === before.columns && grid.rows === before.rows) return;
    // A column span put back by the arrows arrives here looking like an edit,
    // and reshaping for it would both undo the canvas the same snapshot just
    // restored and put a step on the stack the user never took - so the press
    // after it would walk back through a change of ours instead of theirs.
    if (this._restoredGrid) { this._restoredGrid = false; return; }
    // `was` is the config before Home Assistant's own tab changed it, so this
    // is the row count the canvas was worth under the old column span.
    const shaped = this._reshapedFor();
    if (shaped) this._commit(shaped);
  }

  static get styles() {
    return [SC.editorStyles, css`
      .row { gap: 8px; }
      .canvas-wrap { position: relative; background: rgba(0,0,0,0.15); border: 1px dashed var(--divider-color,#444); border-radius: 4px; padding: 0; display: flex; justify-content: center; }
      /* The canvas' own breathing room, moved onto a strip that takes pointer
         events. A selection frame has to be able to start and end *outside*
         the canvas, or an element lying flush against an edge can never be
         wholly inside a frame - the press that draws it would already have to
         be past the edge. The strip is also where a drag that overshoots the
         canvas keeps being tracked. */
      .canvas-pad { flex: 1; min-width: 0; padding: 24px 16px; touch-action: none;
                    display: flex; justify-content: center; }
      /* The window the canvas is zoomed inside. It keeps the footprint the
         canvas has at 100% - width of the strip, shape of the canvas - so
         zooming in makes the drawing bigger and the editor no taller: the
         part that no longer fits is reached by scrolling, not by pushing
         everything below the canvas down the page.
         The canvas centres itself with an auto margin rather than with
         justify-content or place-content, because content centred by those
         is clipped on the side it overflows, where there is no scroll to
         reach it - an auto margin collapses to 0 instead. Both axes need it,
         which is why the window is a flex container: an auto margin only
         centres vertically inside one. */
      .canvas-view { position: relative; width: 100%; overflow: auto;
                     scrollbar-width: thin; display: flex; }
      /* flex: none, or a canvas drawn wider than the window would be shrunk
         back to fit by flex-shrink and there would be nothing to scroll. */
      .canvas-view > .canvas { margin: auto; flex: none; }
      .names { display: flex; align-items: center; gap: 2px; }
      .names.history button { font-size: 18px; line-height: 1; padding: 3px 8px; }
      .names button { background: var(--card-background-color, #1c1c1c); border: 1px solid var(--divider-color,#444); color: var(--primary-text-color); border-radius: 4px; padding: 4px 7px; font-size: 13px; line-height: 1.1; cursor: pointer; }
      .names button[disabled] { opacity: 0.4; cursor: default; }
      /* A press on a zoom button is over the moment it happens, so those may
         light up under the pointer in the accent colour. Names stays pressed,
         and a hover that borrowed the same colour would hide which way it
         stands - exactly while the pointer is still on the button that was
         just clicked. So the accent means on here, and hovering only lifts. */
      .names button:hover:not([disabled]) { background: var(--divider-color, #444); }
      .names button.on, .names button.on:hover { background: var(--primary-color); border-color: var(--primary-color); color: #fff; }
      /* The tools under the canvas: what is done to a selection on the left,
         what is done to the view on the right. They are always here and grey
         out instead of appearing, so the row does not change height and the
         buttons stay where the hand left them. */
      .tools { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
      /* Centred rather than stretched: the zoom level is a line of text among
         buttons, and in a stretched box it sits at the top of its own height
         while the buttons beside it are tall. */
      .tools .group { display: flex; align-items: center; gap: 4px; }
      /* One square for every tool, whether it holds a glyph or a drawing:
         a row of buttons that are each as wide as their symbol reads as a row
         of different things. Centred by the button itself, so nothing depends
         on how much side bearing a particular character happens to carry. */
      .tools button { width: 30px; height: 30px; min-width: 30px; box-sizing: border-box;
                      display: flex; align-items: center; justify-content: center;
                      background: var(--card-background-color, #1c1c1c); border: 1px solid var(--divider-color,#444); color: var(--primary-text-color); border-radius: 4px; padding: 0; font-size: 17px; line-height: 1; cursor: pointer; }
      .tools button:hover:not([disabled]) { background: var(--primary-color); color: #fff; }
      .tools button[disabled] { opacity: 0.4; cursor: default; }
      .tools .level { min-width: 46px; display: flex; align-items: center; justify-content: center; align-self: stretch; font-variant-numeric: tabular-nums; }
      .tools button.icon svg { display: block; width: 16px; height: 16px; }
      .tools button.danger { color: var(--error-color, #f44336); }
      .tools button.danger:hover:not([disabled]) { background: var(--error-color, #f44336); color: #fff; }
      .tools .spacer { flex: 1; }

      /* The stack, front at the top - the way a layer list reads everywhere
         else, and the other way round from the elements array, where the last
         one is the one drawn last. */
      .layers { border: 1px solid var(--divider-color,#444); border-radius: 6px; margin-top: 6px; background: rgba(255,255,255,0.02); }
      .layers > summary { padding: 6px 10px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--primary-color,#03a9f4); list-style: none; user-select: none; }
      .layers > summary::-webkit-details-marker { display: none; }
      .layer-list { display: flex; flex-direction: column; gap: 2px; padding: 0 6px 6px; }
      .layer { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 3px 6px; border-radius: 4px; background: rgba(255,255,255,0.03); }
      .layer.sel { background: rgba(3,169,244,0.18); box-shadow: inset 0 0 0 1px var(--primary-color,#03a9f4); }
      .layer .grip { color: var(--secondary-text-color); cursor: grab; font-size: 11px; letter-spacing: -1px; }
      .layer.dragging { opacity: 0.4; }
      .layer.drop { outline: 2px dashed var(--primary-color,#03a9f4); outline-offset: -2px; }
      .layer .who { flex: 1; min-width: 0; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .layer .who .id { color: var(--secondary-text-color); font-size: 11px; margin-left: 4px; }
      .layer .over { color: var(--warning-color,#ffc107); cursor: help; }
      .layer button { background: none; border: none; color: var(--secondary-text-color); cursor: pointer; font-size: 13px; padding: 1px 3px; border-radius: 3px; }
      .layer button:hover:not([disabled]) { color: var(--primary-text-color); background: rgba(255,255,255,0.08); }
      .layer button[disabled] { opacity: 0.3; cursor: default; }
      /* border-box, so the 1px border is inside the width the zoom sets: as
         content-box it made the canvas 2px wider than the window it is drawn
         in, which is two scrollbars at 100% for a border. */
      .canvas { position: relative; width: 100%; box-sizing: border-box; background: #1a1a1a; border: 1px solid #555; border-radius: 4px; overflow: hidden; touch-action: none; user-select: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
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
      /* Which boxes answer a push, and so take that click away from the card
         underneath them. Top right, opposite the lock, and out of the way of
         the resize handle. The card's own badge sits on the canvas frame. */
      .el.pushed::after, .canvas.pushed::after {
        content: '👆'; position: absolute; top: 2px; right: 3px; z-index: 5;
        font-size: 15px; line-height: 1; pointer-events: none;
        text-shadow: 0 1px 3px #000, 0 0 4px #000;
        /* Read right to left: the glyph is mirrored first, then turned a
           quarter and an eighth to the left, so the finger points down into
           the box it belongs to instead of away from it. */
        transform: rotate(-135deg) scaleX(-1); transform-origin: center; }
      .canvas.pushed::after { top: 4px; right: 5px; font-size: 20px; }
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
      /* Names ride above the boxes rather than inside them. A 20-unit gauge is
         barely wider than one letter, and a caption clipped to a W says less
         than the id it would have replaced - so a tag is allowed to run past
         the edge of the element it belongs to, and is stopped only by the edge
         of the canvas. An element with nothing assigned yet has no name to
         show and falls back to its id, so every box keeps a tag - a gap in the
         row would only read as an element that had gone missing. The layer
         never takes the pointer: every press on it belongs to whatever lies
         underneath. Being outside the box also keeps the card's own
         typography, which the live preview injects at the box, away from a
         label that is the editor's rather than the card's. */
      .tags { position: absolute; inset: 0; pointer-events: none; z-index: 4; }
      .tag {
        position: absolute; transform: translateY(-100%); width: max-content;
        padding: 0 3px; border-radius: 0 4px 0 0;
        background: rgba(0,0,0,0.72); color: #fff;
        font-size: 9px; font-weight: normal; line-height: 1.6;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        text-shadow: none;
      }
      .handle { position: absolute; right: 0; bottom: 0; width: 12px; height: 12px; background: rgba(255,255,255,0.85); border-radius: 100% 0 0 0; cursor: nwse-resize; touch-action: none; }
      .handle::after { content: ''; position: absolute; right: -10px; bottom: -10px; width: 22px; height: 22px; }
      .num { width: 68px; }
      /* The card's box controls read as one column: the mode first, always the
         same width, then the number it needs - which several of them do not,
         so an inline width would leave the rows out of step with each other. */
      .ctl {
        display: grid; grid-template-columns: 126px 76px 64px;
        gap: 10px; align-items: center; justify-items: start;
      }
      .ctl > select { width: 126px; }
      /* Its own column, so the unit beside it cannot end up on top of it. */
      .ctl > .num { width: 76px; box-sizing: border-box; }
      /* Third column whether or not the second is filled: a row without a
         number would otherwise slide its unit under the number of the row
         above it. */
      .ctl > .hint { grid-column: 3; }
      /* Only the selected row wraps, and it has to: its number inputs and four
         buttons need more than 500px, and Home Assistant's card editor is
         nowhere near that wide - unwrapped, the remove button sat outside the
         dialog. There the name takes a line of its own so the controls below
         it line up. Every other row is a name and four buttons and fits on one
         line, which is what makes a long list readable. */
      .el-row .lock { font-size: 11px; opacity: 0.8; }
      .el-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; padding: 4px 6px; border-radius: 4px; background: rgba(255,255,255,0.03); }
      .el-row.sel { background: rgba(3,169,244,0.18); }
      .el-row.co { background: rgba(3,169,244,0.09); }
      .el-name { flex: 1; cursor: pointer; }
      /* The id stays visible next to the name, quietly: it is what every
         other list in this editor calls the element - a glass pattern, a
         colour rule, an interaction all name gauge_0 - so a row that showed
         only the friendly name would leave nothing to match them against. */
      .el-name .id { font-family: monospace; color: var(--secondary-text-color); font-size: 11px; margin-left: 6px; }
      /* Alone, the id is the name, and it reads as the row's own text. */
      .el-name .id.only { color: inherit; font-size: 12px; margin-left: 0; }
      .el-row.sel .el-name { flex: 1 0 100%; }
      .icon-btn { background: none; border: none; color: var(--secondary-text-color); cursor: pointer; padding: 2px 4px; font-size: 13px; }
      .icon-btn:hover { color: var(--primary-color); }
      .icon-btn[disabled] { opacity: 0.3; cursor: default; }
      .icon-btn[disabled]:hover { color: var(--secondary-text-color); }
      .hint { font-size: 11px; color: var(--secondary-text-color); }
      /* "Hide tips" sets --sc-tip-display on the editor's container; a
         readout wearing .hint is not a tip and keeps its place. */
      .tip { display: var(--sc-tip-display, revert); }
      .el-config { border: 1px solid var(--divider-color,#444); border-radius: 6px; background: rgba(0,0,0,0.15); }
      .el-config > summary { padding: 7px 10px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--primary-color,#03a9f4); list-style: none; display: flex; align-items: center; gap: 6px; user-select: none; }
      .el-config > summary::-webkit-details-marker { display: none; }
      .el-config > summary::before { content: '▶'; font-size: 9px; transition: transform 0.15s; }
      .el-config[open] > summary::before { transform: rotate(90deg); }
      .el-config-body { padding: 0 6px 6px; }
      /* The editor stacks against itself, not against the card SC_LAYERS
         orders: 2 and 3 are the resize handle and the selected element, so
         the placing overlay and the menu sit just above those. */
      .tool-row { display: flex; align-items: center; gap: 8px; margin: 2px 0 6px; flex-wrap: wrap; }
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
      /* The template page is two columns wide rather than one, so the
         miniature is big enough to tell a temperature from a humidity. Still
         bounded by the max-height above and scrolling, because seven of these
         are taller than any menu should be allowed to grow. */
      .menu.wide { min-width: 340px; max-height: 420px; }
      .menu-item .chev { float: right; color: var(--secondary-text-color); }
      .menu-item .chev.back { float: none; margin-right: 6px; }
      .menu-item.back { color: var(--secondary-text-color); font-size: 11px; }
      .menu-item.tpl { display: flex; align-items: center; gap: 10px; padding: 6px; }
      /* The box the element is rendered into is the element's size - a gauge
         on the canvas is the size of its box - so the miniature's proportions
         are the cell's and not the template's. The cell's own size is written
         inline from TPL_CELL, which is where _previewBox reads it. */
      .tpl-pv { flex: 0 0 auto; border-radius: 4px;
                overflow: hidden; background: rgba(255,255,255,0.04);
                display: flex; align-items: center; justify-content: center; }
      .tpl-fit { display: block; position: relative; }
      .tpl-pv.empty { display: flex; align-items: center; justify-content: center;
                      font-size: 18px; color: var(--secondary-text-color); }
      .tpl-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .tpl-text b { font-size: 12px; font-weight: 600; }
      .tpl-text em { font-style: normal; font-size: 10px; line-height: 1.3;
                     color: var(--secondary-text-color); }
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

  /**
   * The canvas as it is right now - mid-drag, that is where the pointer has
   * put it rather than what is saved.
   */
  get _canvas() {
    return this._dragCanvas || this.slot?.canvas || { ...DEFAULT_CANVAS, elements: [] };
  }

  _commit(canvas) { this._send('__merge__', { canvas }); }

  /**
   * Where a change to the canvas goes: into the drag, or into the config.
   *
   * A drag used to commit on every pointermove. Home Assistant wrote the card
   * config back for each of them, which handed every gauge and bar on the
   * canvas a new `config` object at pointer frequency - so the editor had to
   * drop the live previews to plain boxes for the duration, and one drag left
   * thirty entries in the undo history for a single gesture.
   *
   * A drag is one change, so it is one commit, made when the pointer is let
   * go. Until then the moved canvas lives here and the getter above hands it
   * out, which is all the drawing needs.
   */
  _put(canvas) {
    if (this._drag) this._dragCanvas = canvas;
    else this._commit(canvas);
  }

  /**
   * Commit, remembering what it is being changed from.
   *
   * Every change this editor makes goes through here, including the ones its
   * sub-editors make, so that the arrows above the canvas can walk back
   * through them one at a time. The snapshot is taken before the commit
   * because `this.slot` still holds the old config then - Home Assistant
   * hands the new one back asynchronously, a render later.
   */
  _send(key, value) {
    if (!this.commitFn) return;
    // A write that touches nothing the snapshot holds cannot be undone by
    // putting one back - a push, a colour or a glass pattern from an element's
    // settings is such a write. Recording it anyway would leave an entry on
    // the stack whose restore changes nothing, so the arrow would be enabled
    // and do nothing when pressed.
    if (!this._travelling && touchesHistory(key, value)) {
      this._undoStack = [...this._undoStack, this._snapshot()].slice(-HISTORY_DEPTH);
      // A new change is a new future, so whatever was undone is not it.
      this._redoStack = [];
    }
    this.commitFn(key, value);
  }

  /** What this editor's undo is responsible for putting back. */
  _snapshot() {
    /** @type {Record<string, any>} */
    const slot = {};
    for (const key of HISTORY_KEYS) {
      if (this.slot?.[key] !== undefined) slot[key] = structuredClone(this.slot[key]);
    }
    return { slot, grid: structuredClone(this.cardConfig?.grid_options ?? null) };
  }

  /** Put one snapshot back, as one commit. */
  _restore(snap) {
    const patch = restorePatch(this.slot || {}, snap.slot, HISTORY_KEYS);
    const gridNow = this.cardConfig?.grid_options ?? null;
    const gridDiffers = JSON.stringify(gridNow) !== JSON.stringify(snap.grid);
    if (!patch && !gridDiffers) return false;

    /** @type {[string, any][]} */
    const writes = [];
    if (gridDiffers) {
      writes.push(['__card__', { grid_options: snap.grid || undefined }]);
      this._restoredGrid = true;
    }
    if (patch) writes.push(['__merge__', patch]);
    this._travelling = true;
    try { this.commitFn('__batch__', writes); } finally { this._travelling = false; }
    return true;
  }

  _undo() {
    const snap = this._undoStack[this._undoStack.length - 1];
    if (!snap) return;
    const now = this._snapshot();
    this._undoStack = this._undoStack.slice(0, -1);
    if (this._restore(snap)) this._redoStack = [...this._redoStack, now].slice(-HISTORY_DEPTH);
  }

  _redo() {
    const snap = this._redoStack[this._redoStack.length - 1];
    if (!snap) return;
    const now = this._snapshot();
    this._redoStack = this._redoStack.slice(0, -1);
    if (this._restore(snap)) this._undoStack = [...this._undoStack, now].slice(-HISTORY_DEPTH);
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
   * How wide the card's section really is, read the same way and for the same
   * reason: the dashboard behind the dialog is where the number lives, and it
   * changes while this editor stays mounted.
   */
  get _sectionPx() { return sectionWidthPx(this); }

  /**
   * Writes HA's own `grid_options` rather than fields of our own, so these
   * controls and the layout tab are two views of one value instead of two
   * settings that have to be kept in step.
   *
   * Changing the card's box here also reshapes the canvas to match: the user
   * is setting the card's size, and a canvas that then letterboxed inside it
   * would be answering a question they did not ask. Clearing the row count
   * again puts the canvas back in the shape it had before, so the trip there
   * and back leaves nothing behind. It is not done on render - a card that
   * rewrites its own config for being displayed can corrupt a dashboard while
   * nobody is watching - so a shape that never matched in the first place is
   * offered as the Match button instead.
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
    const shaped = this._reshapedFor({ ...this.cardConfig, grid_options: grid });
    if (shaped) writes.push(['__merge__', { canvas: shaped }]);
    this._send('__batch__', writes);
  }

  /**
   * Full width is not the number that happens to equal it today: a section made
   * wider later takes a `full` card with it, and leaves a numbered one behind.
   */
  _setFullWidth(full) {
    this._setGrid({ columns: full ? 'full' : this._maxColumns });
  }

  /**
   * Home Assistant's own switch, mirrored: on, the card reports `rows: "auto"`
   * and its height is whatever the canvas' shape makes of its width; off, the
   * height is pinned to a row count and the canvas is reshaped to that box.
   *
   * Turning it off pins the row count the card is already worth *here*, at the
   * width this section really has - so the card does not change height at the
   * moment the switch is thrown.
   */
  _setAutoHeight(auto) {
    if (auto) { this._setGrid({ rows: null }); return; }
    this._setGrid({ rows: rowsForShape(this._canvas, this._columns, this._maxColumns, this._sectionPx) });
  }

  /** A pinned height in rows. Under auto height the shape sets it instead. */
  _setShapeRows(rows) { this._setGrid({ rows }); }

  /**
   * The canvas as a card box wants it, or null when it is already that.
   *
   * Two readings of the same arithmetic, and the difference is whether the row
   * count is the card's *height* or the canvas' *shape*.
   *
   * Pinned - a number in `grid_options.rows` - it is the height, and the shape
   * is made to match the box so the canvas does not letterbox inside it. The
   * shape it had before is remembered, because the pin is a state to come back
   * from.
   *
   * With auto height the shape *is* the width: a third of the columns, rounded
   * up, which is the same proportion at every card width. There is nothing to
   * come back from, so the canvas is rescaled and any remembered shape dropped.
   *
   * Null when there is nothing to do, which is what stops the commit this
   * causes from causing another.
   *
   * @param {any} cardConfig
   */
  _reshapedFor(cardConfig = this.cardConfig) {
    const c = structuredClone(this._canvas);
    const rows = cardConfig?.grid_options?.rows;
    // The measured section width belongs to the pinned case alone, where a real
    // height in pixels has to be met by a real width. Under auto height the row
    // count is a *shape*, and a shape read off this viewport would be a
    // different one on the next: there the reference width is the whole point.
    const shape = canvasFromGrid({ ...cardConfig, grid_options: {
      ...(cardConfig?.grid_options || {}),
      rows: typeof rows === 'number' ? rows
        : defaultShapeRows(gridSize(cardConfig, this.slot).columns, this._maxColumns),
    } }, this.slot, 400, this._maxColumns, typeof rows === 'number' ? this._sectionPx : 0);

    if (typeof rows === 'number') return pinnedToShape(c, shape);

    const { free, ...rest } = c;
    if (rest.w === shape.w && rest.h === shape.h) return free ? rest : null;
    return rescaleCanvas(rest, shape);
  }

  /** Reshape the canvas to the card's grid box, carrying the layout with it. */
  _matchGrid() {
    const shaped = this._reshapedFor();
    if (shaped) this._commit(shaped);
  }

  /** Whether the canvas is a different shape from the box the card occupies. */
  get _gridMismatch() {
    if (typeof this.cardConfig?.grid_options?.rows !== 'number') return false;
    const shape = canvasFromGrid(this.cardConfig, this.slot, 400, this._maxColumns, this._sectionPx);
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
    this._put(c);
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
    this._put(c);
  }

  /**
   * Typing the canvas' own width or height forgets the shape a row count was
   * going to put back. It was a note about where the canvas came from, and
   * this is the user saying where it is now.
   */
  _setCanvas(key, value) {
    const c = structuredClone(this._canvas);
    c[key] = value;
    if (key === 'w' || key === 'h') delete c.free;
    this._commit(c);
  }

  /**
   * Switch the unit `grid` and `snap` are written in, carrying both numbers
   * over so the grid on screen does not move. The unit is a way of writing
   * the step down, not a different step - someone picking per cent wants
   * their grid to survive a reshape, not to lose it on the way there.
   */
  /**
   * The grid and its snap step, written as proportions of the canvas.
   *
   * A canvas still carrying them in units is converted on the way past: one
   * commit, because the conversion and the edit are the same edit, and two
   * commits in a tick would lose the first.
   */
  _setGridPct(patch) {
    const c = structuredClone(this._canvas);
    if (c.grid_unit !== 'pct') {
      if (typeof c.grid === 'number' && c.grid > 0) c.grid = unitsToGrid(c, c.grid);
      if (typeof c.snap === 'number' && c.snap > 0) c.snap = unitsToGrid(c, c.snap);
      c.grid_unit = 'pct';
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete c[k]; else c[k] = v;
    }
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
    this._send('__merge__', { canvas: made.canvas, ...made.patch });
  }

  /**
   * Take every selected element off the canvas, in one commit.
   *
   * One commit rather than one per element, because the config is cloned on
   * each and Home Assistant writes it back asynchronously - three deletes in
   * a tick would keep only the last.
   */
  _removeSelection() {
    const selected = new Set(this._selection);
    if (!selected.size) return;
    const c = structuredClone(this._canvas);
    c.elements = c.elements.filter(el => !selected.has(el.id));
    if (c.elements.length === this._canvas.elements.length) return;
    // The list below the canvas follows the selection, so ids that no longer
    // exist would leave it empty with nothing left to click.
    this._sel = null;
    this._extra = [];
    this._commit(c);
  }

  /**
   * Lock or unlock the whole selection.
   *
   * One press has to mean one thing for all of them, so a selection that is
   * not all locked locks, and only a selection that is entirely locked
   * unlocks. Half a selection changing state per press is the behaviour
   * nobody can predict.
   */
  _lockSelection() {
    const selected = new Set(this._selection);
    if (!selected.size) return;
    const lock = !this._allLocked;
    const c = structuredClone(this._canvas);
    for (const el of c.elements) {
      if (!selected.has(el.id)) continue;
      // Not locked carries no key at all, or every canvas ever unlocked keeps
      // one saying so.
      if (lock) el.locked = true; else delete el.locked;
    }
    this._commit(c);
  }

  /** Whether every selected element is locked, which is what unlocks them. */
  get _allLocked() {
    const els = this._canvas.elements;
    const sel = this._selection;
    return sel.length > 0 && sel.every(id => {
      const el = els.find(e => e.id === id);
      return el && isPinned(el);
    });
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
  /**
   * Line the selection up on one edge, or through one middle.
   *
   * Beside the distribute buttons, because both are the same kind of thing:
   * an arrangement of the elements that are selected, done to all of them at
   * once.
   *
   * @param {'left'|'hcenter'|'right'|'top'|'vcenter'|'bottom'} edge
   */
  _align(edge) {
    const out = alignElements(this._canvas, this._selection, edge);
    if (out) this._commit(out);
  }

  _distribute(axis) {
    const out = distributeElements(this._canvas, this._selection, axis);
    if (out) this._commit(out);
  }

  /** How many of the selected elements an arrangement could actually move. */
  get _distributable() {
    const els = this._canvas.elements;
    return this._selection.filter(id => {
      const el = els.find(e => e.id === id);
      return el && !isPinned(el);
    }).length;
  }

  /**
   * What this element is called, or '' when only its id says anything.
   *
   * The card's own entity is Home Assistant's field on the Lovelace config,
   * not one of ours, which is why it is handed over separately - `icon`,
   * `name` and `state` draw it rather than an entity of their own.
   */
  _label(id) {
    return SC.elementLabel(this.slot, this.hass, id, this.cardConfig?.entity);
  }

  /** The tooltip on a box: what it is, what it is called, and whether it is pinned. */
  _title(el, pinned) {
    const name = this._label(el.id);
    return `${name ? `${name} (${el.id})` : el.id}${pinned ? ' - locked' : ''}`;
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
    else this._setEl(idx, applyDrag(c, origin, mode, delta, this.slot));
  }

  /**
   * Draw the canvas at `z` times the size it fits its frame at.
   *
   * What is in the middle of the view stays in the middle of it. Left alone,
   * the scroll position is a number of pixels, so zooming in would keep the
   * top-left corner and walk away from whatever was being looked at; keeping
   * the centre is what every canvas editor does and what the hand expects.
   */
  _applyZoom(z) {
    const view = this.shadowRoot?.querySelector('.canvas-view');
    const mid = view && view.scrollWidth && view.scrollHeight ? {
      x: (view.scrollLeft + view.clientWidth / 2) / view.scrollWidth,
      y: (view.scrollTop + view.clientHeight / 2) / view.scrollHeight,
    } : null;
    this._zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    if (!mid) return;
    this.updateComplete.then(() => {
      view.scrollLeft = mid.x * view.scrollWidth - view.clientWidth / 2;
      view.scrollTop = mid.y * view.scrollHeight - view.clientHeight / 2;
    });
  }

  /** The next step up (`dir > 0`) or down from wherever the zoom is now. */
  _stepZoom(dir) {
    // Against the current value rather than an index into the list, because
    // the wheel sets values that are not in it.
    const next = dir > 0
      ? ZOOM_STEPS.find(z => z > this._zoom + 0.001)
      : ZOOM_STEPS.filter(z => z < this._zoom - 0.001).pop();
    if (next) this._applyZoom(next);
  }

  /**
   * Ctrl or Cmd and the wheel zooms; the wheel alone scrolls the view.
   *
   * The modifier is what a trackpad's pinch arrives as, so pinching zooms
   * too. Without `preventDefault` the same gesture is the browser's own page
   * zoom, which would take the whole dialog with it.
   */
  _onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this._applyZoom(Math.round(this._zoom * factor * 100) / 100);
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
    // Placing puts its own layer over the canvas; a press on the strip beside
    // it is not a selection frame, and must not cancel the selection either.
    if (this._placing) return;
    const view = e.currentTarget.querySelector('.canvas-view');
    // A press on the zoomed view's own scrollbar is a scroll. Only the view
    // itself can be the target there - anywhere else the canvas is - and only
    // past its client box, which is the scrollbar's own strip.
    if (view && e.target === view
        && (e.offsetX >= view.clientWidth || e.offsetY >= view.clientHeight)) return;
    const canvas = e.currentTarget.querySelector('.canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Capture, so a frame dragged past the strip keeps being tracked instead
    // of stopping the moment the pointer leaves the editor. Synthetic events
    // have no live pointer to capture, which is not a reason to fail.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no live pointer */ }
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
    // One gesture, one commit - and one step to undo.
    const moved = this._dragCanvas;
    this._dragCanvas = null;
    if (moved) this._commit(moved);
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

  /**
   * What the menu picked, ready for the next click on the canvas to land.
   *
   * `template` is the one the submenu offered, or null for an empty element.
   * Its config is taken here rather than at the click, because by then the
   * menu that knew which template it was is gone - and taken as a copy, so the
   * element the click makes is the person's own from the start.
   *
   * @param {string} what
   * @param {{ id: string, label: string, aspect?: number } | null} [template]
   */
  _startPlacing(what, template = null) {
    this._menu = false;
    this._menuKind = null;
    this._placing = what;
    this._placingTemplate = template;
    this._placingEntry = template ? templateEntry(what, template.id) : null;
    // No ghost until the pointer says where. Drawing one at the last position
    // would put a box under a crosshair that has since moved on.
    this._ghost = null;
  }

  _closeMenu() {
    this._menu = false;
    this._menuKind = null;
    this._placing = null;
    this._placingTemplate = null;
    this._placingEntry = null;
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
    this._ghost = newElementPreview(this.slot, this._canvas, this._placing,
                                    this._atPointer(e), this._placingTemplate?.aspect);
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
    if (kind) return this._placingTemplate
      ? `${this._placingTemplate.label.toLowerCase()} ${kind.label.toLowerCase()}`
      : kind.label.toLowerCase();
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
    const chosen = this._placingEntry;
    const aspect = this._placingTemplate?.aspect;
    this._placing = null;
    this._placingTemplate = null;
    this._placingEntry = null;
    this._ghost = null;
    if (!what || !this.commitFn) return;

    const c = this._canvas;
    const at = this._atPointer(e);

    const kind = NEW_ELEMENT_KINDS.find(k => k.kind === what);
    const entry = chosen ?? (kind?.module
      ? window.SupercardModules[kind.module]?.newEntry?.()
      : undefined);

    const made = addElement(this.slot, c, what, entry, at, aspect);
    if (!made) return;
    this._sel = made.id;
    this._send('__merge__', { canvas: made.canvas, ...made.patch });
  }

  /**
   * What can be added, in two groups: something the card does not have yet,
   * and something it has that the canvas is not showing.
   *
   * A kind that has templates opens a second page rather than a flyout beside
   * this one: the menu is `overflow-y: auto` because it has to be - the list
   * of unplaced targets can be longer than the editor - and anything that
   * flew out of it would be clipped by exactly that.
   */
  _renderAddMenu() {
    if (this._menuKind) return this._renderTemplateMenu(this._menuKind);
    const unplaced = this._unplaced();
    return html`
      <div class="menu">
        <div class="menu-group">New</div>
        ${NEW_ELEMENT_KINDS.map(k => {
          const ok = canAddKind(this.slot, k.kind);
          const hasTemplates = ok && templatesFor(k.kind).length > 0;
          return html`
            <button class="menu-item" ?disabled=${!ok}
                    title=${ok ? '' : "This card's gauge is the card itself, from before a card could have more than one - a second one would replace it."}
                    @click=${() => hasTemplates ? (this._menuKind = k.kind) : this._startPlacing(k.kind)}>
              ${k.label}${hasTemplates ? html`<span class="chev">›</span>` : ''}
            </button>`;
        })}
        ${unplaced.length ? html`
          <div class="menu-group">Not on the canvas</div>
          ${unplaced.map(t => html`
            <button class="menu-item" @click=${() => this._startPlacing(t.id)}>${
              t.group === 'Basic' ? t.label : `${t.group} - ${t.label}`}</button>`)}` : ''}
      </div>`;
  }

  /**
   * The templates for one kind, each shown as the thing it makes.
   *
   * The miniature is the element itself, rendered from the template with a
   * sample reading - not a picture of one. A screenshot would have to be taken
   * again every time a default moves, would be wrong in the meantime without
   * saying so, and would be lit in whichever theme the person taking it had.
   * This one is right by construction and follows the theme, because it is the
   * same component the canvas is about to put down.
   *
   * @param {string} kind
   */
  _renderTemplateMenu(kind) {
    const k = NEW_ELEMENT_KINDS.find(n => n.kind === kind);
    const cell = `width:${TPL_CELL.w}px; height:${TPL_CELL.h}px;`;
    return html`
      <div class="menu wide">
        <button class="menu-item back" @click=${() => { this._menuKind = null; }}>
          <span class="chev back">‹</span>Back
        </button>
        <div class="menu-group">New ${(k?.label || kind).toLowerCase()}</div>
        <button class="menu-item tpl" @click=${() => this._startPlacing(kind)}>
          <span class="tpl-pv empty" style=${cell}>＋</span>
          <span class="tpl-text"><b>Empty</b><em>Nothing set, the way Add has always made one.</em></span>
        </button>
        ${templatesFor(kind).map(t => html`
          <button class="menu-item tpl" @click=${() => this._startPlacing(kind, t)}>
            <span class="tpl-pv" style=${cell}>${this._renderTemplatePreview(kind, t)}</span>
            <span class="tpl-text"><b>${t.label}</b><em>${t.hint}</em></span>
          </button>`)}
      </div>`;
  }

  /**
   * The largest box of the template's own shape that fits in a preview cell.
   *
   * The shape is the one `newBox` will give the element: a gauge is square
   * because it is locked square, and everything else is the strip unless the
   * template asked for something.
   *
   * @param {string} kind
   * @param {{ aspect?: number }} t
   */
  _previewBox(kind, t) {
    // Clamped, because past about 1:2 a miniature stops being a small picture
    // of the element and becomes a line: the vertical bar's own 1:3 would
    // leave it a third of the cell's height across, too narrow to show that it
    // has a scale down one side. The shape still reads as upright, which is
    // the whole question this row is answering.
    const want = kind === 'gauge' ? 1 : (t.aspect || 3);
    const aspect = Math.min(3, Math.max(0.5, want));
    const w = Math.min(TPL_CELL.w, TPL_CELL.h * aspect);
    return { w: Math.round(w), h: Math.round(w / aspect) };
  }

  /**
   * One miniature, or nothing at all where the renderer is not on the page.
   *
   * `previewFor` lends the element a synthetic entity so the needle stands at
   * a plausible reading instead of against the left stop, which is the only
   * position at which all seven gauges look identical. The `hass` it builds
   * carries that one state and nothing else - the renderers read nothing else
   * off it - so the preview cannot show, or leak, anything of the person's.
   *
   * @param {string} kind
   * @param {{ id: string }} t
   */
  _renderTemplatePreview(kind, t) {
    const pv = previewFor(kind, t.id);
    if (!pv) return '';
    // The miniature is the shape the click will make, not the cell it sits in:
    // a ring shown in a 3:2 cell is an ellipse, and a vertical bar is a
    // horizontal one. The cell stays one size so the rows keep their rhythm,
    // and the element is fitted inside it.
    const box = this._previewBox(kind, t);
    const el = kind === 'gauge'
      ? html`<sc-gauge .hass=${pv.hass} .config=${pv.config}
                       .globalEntities=${[]} .onCanvas=${true}></sc-gauge>`
      : kind === 'progressbar'
        ? html`<sc-progressbar .hass=${pv.hass} .config=${pv.config}
                               .globalEntities=${[]} .rootConfig=${{}}></sc-progressbar>`
        : '';
    if (!el) return '';
    return html`<span class="tpl-fit"
                      style="width:${box.w}px; height:${box.h}px;">${el}</span>`;
  }

  /**
   * Move one element in the paint order - a step, or all the way.
   *
   * @param {number} idx
   * @param {number|'front'|'back'} to a step is passed as an index
   */
  _reorder(idx, to) {
    const next = reorderElement(this._canvas, idx, to);
    if (next) this._commit(next);
  }

  _move(idx, dir) { this._reorder(idx, idx + dir); }

  /**
   * The stack, front at the top.
   *
   * The canvas draws its elements in array order, so the one at the end is
   * the one on top - which makes this list the same array read backwards. It
   * exists because a canvas with things lying over each other is exactly the
   * canvas where clicking the one you mean is hardest: here they are all
   * named, the ones sharing a place are marked, and each can be sent a step
   * or all the way in either direction.
   */
  _renderLayers(els, selected) {
    if (!els.length) return '';
    const last = els.length - 1;
    const rows = els.map((el, idx) => ({ el, idx })).reverse();
    return html`
      <details class="layers" ?open=${this._layers} @toggle=${e => { this._layers = e.target.open; }}>
        <summary>▤ Layers (${els.length}) - the top of the list is drawn on top</summary>
        <div class="layer-list">
          ${rows.map(({ el, idx }) => {
            const over = overlappingElements(this._canvas, el.id);
            const name = this._label(el.id);
            return html`
              <div class="layer ${selected.includes(el.id) ? 'sel' : ''}" draggable="true"
                   @dragstart=${e => {
                     e.dataTransfer.effectAllowed = 'move';
                     // A drag inside one list needs no payload, but a drag with
                     // nothing on it never starts in Firefox.
                     e.dataTransfer.setData('text/plain', String(idx));
                     this._layerFrom = idx;
                     e.currentTarget.classList.add('dragging');
                   }}
                   @dragover=${e => {
                     if (this._layerFrom === null || this._layerFrom === idx) return;
                     e.preventDefault();
                     e.dataTransfer.dropEffect = 'move';
                     e.currentTarget.classList.add('drop');
                   }}
                   @dragleave=${e => e.currentTarget.classList.remove('drop')}
                   @drop=${e => {
                     e.preventDefault();
                     e.currentTarget.classList.remove('drop');
                     // The row it was dropped on is the place it takes, which
                     // is what dropping something on a list means.
                     if (this._layerFrom !== null) this._reorder(this._layerFrom, idx);
                     this._layerFrom = null;
                   }}
                   @dragend=${e => {
                     e.currentTarget.classList.remove('dragging');
                     this._layerFrom = null;
                   }}>
                <span class="grip" title="Drag to move it through the stack">⋮⋮</span>
                <span class="who" title=${el.id} @click=${e => {
                        if (e.shiftKey || e.ctrlKey || e.metaKey) this._toggleSel(el.id);
                        else this._selectOnly(el.id);
                      }}>${name || el.id}${name ? html`<span class="id">${el.id}</span>` : ''}</span>
                ${over.length ? html`<span class="over"
                  title="Shares its place with ${over.join(', ')}">⧉</span>` : ''}
                <button title="All the way to the front" ?disabled=${idx === last}
                        @click=${() => this._reorder(idx, 'front')}>⤒</button>
                <button title="One step forward" ?disabled=${idx === last}
                        @click=${() => this._reorder(idx, idx + 1)}>↑</button>
                <button title="One step back" ?disabled=${idx === 0}
                        @click=${() => this._reorder(idx, idx - 1)}>↓</button>
                <button title="All the way to the back" ?disabled=${idx === 0}
                        @click=${() => this._reorder(idx, 'back')}>⤓</button>
              </div>`;
          })}
        </div>
      </details>`;
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
  /**
   * The two settings that belong to the label's box rather than to the label.
   *
   * A label can sit on the canvas more than once - as a whole, and as its
   * icon, name and value on their own - and each of those boxes is a size of
   * its own. So how the text answers that size is a property of the box, and
   * it is edited here rather than in the label's own editor, which has no
   * idea which box is being looked at.
   */
  _renderLabelBoxTypo(id) {
    const idx = this._canvas.elements.findIndex(e => e.id === id);
    if (idx < 0) return '';
    const el = this._canvas.elements[idx];
    const fit = !!el.font_fit;
    return html`
      <div class="row" style="padding:4px 4px 0;">
        <label>Fill the box<br><span class="hint tip">Text and icon take the size of the box they are in, instead of the card's own font size. Drag the box bigger and they grow with it.</span></label>
        <ha-switch .checked=${fit} @change=${e => this._setEl(idx, { font_fit: e.target.checked || undefined })}></ha-switch>
      </div>
      ${fit ? html`
        <div class="row" style="padding:0 4px 4px;">
          <label title="Lower it when the text leaves too much room to the sides - narrow characters like 1 or . need less width than an average one">Text density</label>
          <div style="display:flex; align-items:center; width:60%; gap:8px;">
            ${SC.slider(el.font_factor || FIT_DENSITY, v => this._setEl(idx, { font_factor: v }),
                        { min: 0.2, max: 0.9, step: 0.05, style: 'flex:1' })}
            <span class="hint" style="width:26px; text-align:right;">${el.font_factor || FIT_DENSITY}</span>
          </div>
        </div>` : ''}`;
  }

  _renderElementConfig(id) {
    const wrap = (title, body) => html`
      <details class="el-config" ?open=${this._configOpen}
               @toggle=${e => { this._configOpen = e.target.open; }}>
        <summary>${title}</summary>
        <div class="el-config-body">${body}</div>
      </details>`;
    // The sub-editor commits through this editor, so a gauge's own settings
    // are steps the arrows above the canvas can walk back through too.
    const props = { hass: this.hass, slot: this.slot, commitFn: (k, v) => this._send(k, v) };

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
      const box = this._canvas.elements.find(e => e.id === id);
      return wrap('Label settings', html`
        ${this._renderLabelBoxTypo(id)}
        <sc-labels-editor .hass=${props.hass} .slot=${props.slot} .commitFn=${props.commitFn}
                          .only=${Number(m[1])} .boxSized=${!!box?.font_fit}></sc-labels-editor>`);
    }

    const el = this._canvas.elements.find(e => e.id === id);
    // Neither a surface nor the three elements the main entity draws has an
    // editor of its own, so what is theirs rather than the card's is offered
    // here: how they answer a push, and the glass they are seen through.
    // Name and state are left out of the glass - config-cleanup deletes a
    // pattern pointed at either, so offering one would be offering a setting
    // that deletes itself.
    const glassable = el?.surface || id === 'icon';
    return wrap(el?.surface ? 'Surface settings' : 'Element settings', html`
      <div class="hint tip" style="padding:4px 4px 8px;">${el?.surface
        ? html`A surface draws nothing of its own - it is a box for a colour or
               glass pattern to paint, and for a push to land on.`
        : html`<code>${id}</code> comes from the card's main entity, so what it
               shows is the card's. What it does when pushed is its own.`}</div>
      ${el?.surface ? html`
        <div style="padding:0 4px 8px;">
          <sc-color-panel .hass=${props.hass} .slot=${props.slot} .switchless=${true}
                          .commitFn=${props.commitFn} .target=${'elm_' + id}></sc-color-panel>
        </div>` : ''}
      <div style="padding:0 4px 8px;">
        <sc-push-panel .hass=${props.hass} .slot=${props.slot}
                       .commitFn=${props.commitFn} .target=${id}></sc-push-panel>
      </div>
      ${glassable ? html`
        <div style="padding:0 4px 8px;">
          <sc-fx-glass-panel .hass=${props.hass} .slot=${props.slot}
                             .commitFn=${props.commitFn} .target=${'elm_' + id}></sc-fx-glass-panel>
        </div>` : ''}`);
  }

  /**
   * Whether an element answers a push, which is what the badge on its box
   * says. A switched-on panel counts even with every action still on "none":
   * the press itself is an answer, and the badge is there to say which boxes
   * take a click away from the card underneath.
   *
   * @param {string} id
   */
  _pushed(id) {
    const list = Array.isArray(this.slot?.interactions) ? this.slot.interactions : [];
    return list.some(p => p?.enabled && p.target === id);
  }

  /**
   * The card's box and the canvas' grid. Rendered by `sc-canvas-dimensions`
   * in the core editor's Card & Dimensions menu rather than here, so that
   * everything above the canvas is the canvas.
   */
  /**
   * The snap grid and the live preview, drawn over the canvas rather than in
   * Card & Dimensions: both describe this picture and nothing else, and both
   * are read while looking at what they change.
   *
   * The grid is a proportion of the canvas, never a number of units: a unit
   * grid survives only until the canvas is reshaped, and then every element
   * sits between two lines. A canvas still carrying a unit grid is shown its
   * own value as a proportion, and the first edit writes it down that way.
   */
  _renderCanvasSettings() {
    const c = this._canvas;
    const pctGrid = c.grid_unit === 'pct';
    const gridValue = pctGrid ? (c.grid ?? unitsToGrid(c, DEFAULT_GRID))
                              : unitsToGrid(c, c.grid ?? DEFAULT_GRID);
    const snapValue = typeof c.snap === 'number' && c.snap > 0
      ? (pctGrid ? c.snap : unitsToGrid(c, c.snap)) : c.snap;
    // A step the canvas already carries is rarely one of the offered ones, and
    // a select with nothing selected shows its first option instead - the step
    // in force has to be in the list for the field to read true. The list runs
    // up to a half canvas because at that size the step is the layout: 50
    // divides the canvas in two, 33.3 in three, 25 in four.
    const snapSteps = [...new Set([1, 2, 5, 10, 20, 25, 33.3, 50,
                                   ...(typeof snapValue === 'number' && snapValue > 0 ? [snapValue] : [])])]
      .sort((a, b) => a - b);

    return html`
      <div class="row">
        <label>Grid / snap</label>
        <div class="ctl">
          <select @change=${e => {
            const v = e.target.value;
            this._setGridPct({ snap: v === 'grid' ? undefined : (v === 'free' ? 0 : parseFloat(v)) });
          }}>
            <option value="grid" ?selected=${snapValue === undefined}>Snap to grid</option>
            <option value="free" ?selected=${snapValue === 0}>Free</option>
            ${snapSteps.map(n => html`
              <option value=${n} ?selected=${snapValue === n}>Step ${n}%</option>`)}
          </select>
          <input class="num" type="number" min="0" step="any" .value=${gridValue}
                 @change=${e => this._setGridPct({ grid: Math.max(0, parseFloat(e.target.value) || 0) })}>
          <span class="hint">% grid</span>
        </div>
      </div>
      <div class="hint tip" style="margin:-4px 0 4px 0;">
        Per cent of the canvas width, so the grid keeps its proportions when the canvas is
        reshaped. ${gridValue > 0 ? html`Currently ${gridToUnits({ ...c, grid_unit: 'pct' }, gridValue)} of ${c.w} units.` : ''}
      </div>

      <div class="row">
        <label>Live preview</label>
        <ha-switch .checked=${this._live}
                   @change=${e => this._send('live_preview', e.target.checked ? undefined : false)}></ha-switch>
      </div>
      <div class="hint tip" style="margin:-4px 0 4px 0;">${this._live
        ? html`The real gauges and bars. Text sizes are the card's, not this preview's.`
        : html`Plain boxes - easier to see and to grab.`}</div>`;
  }

  _renderDimensions() {
    const rows = this._rows;
    const columns = this._columns;
    const maxColumns = this._maxColumns;
    const mismatch = this._gridMismatch;
    const full = columns === 'full';

    return html`
      <div class="col">
        <div class="row">
          <label>Card width</label>
          <div class="ctl">
            <select @change=${e => this._setFullWidth(e.target.value === 'full')}>
              <option value="columns" ?selected=${!full}>of ${maxColumns} columns</option>
              <option value="full" ?selected=${full}>Full width</option>
            </select>
            ${full ? '' : html`
              <input class="num" type="number" min="1" max=${maxColumns} step="1" .value=${columns}
                     @change=${e => {
                       const n = Math.max(1, Math.min(maxColumns, parseInt(e.target.value) || 1));
                       // lit writes .value only when the bound value changes, so a
                       // number that clamps back to the one already set would leave
                       // the field showing what was typed instead.
                       e.target.value = String(n);
                       this._setGrid({ columns: n });
                     }}>`}
            <span class="hint">${Math.round(gridColumnsToPx(columns, maxColumns))} px</span>
          </div>
        </div>
        <div class="hint tip" style="margin:-4px 0 4px 0;">
          A width here is one column of the section. The <b>Layout</b> tab
          counts in cells of three columns unless its <b>Precise mode</b> is
          on - so this field is like that switch already on.
        </div>
        <div class="row">
          <label>Card height</label>
          <div class="ctl">
            <select @change=${e => this._setAutoHeight(e.target.value === 'auto')}>
              <option value="auto" ?selected=${rows === null}>Auto height</option>
              <option value="rows" ?selected=${rows !== null}>rows, fixed</option>
            </select>
            ${rows === null ? '' : html`
              <input class="num" type="number" min="1" max="50" .value=${rows}
                     @change=${e => this._setShapeRows(Math.max(1, parseInt(e.target.value) || 1))}>
              <span class="hint">${gridRowsToPx(rows)} px</span>`}
          </div>
        </div>
        <div class="hint tip" style="margin:-4px 0 4px 0;">
          ${rows === null
            ? html`The canvas is as wide as its columns and a third of that
                   tall, at any width - so the card keeps its proportions and
                   nothing letterboxes. For a shape of your own, set a fixed
                   height in rows.`
            : html`Auto height is off, so the card's height is pinned in the
                   <b>Layout</b> tab and the canvas is reshaped to match it.
                   Turn it back on to let the shape decide the height again.`}
        </div>
        ${mismatch ? html`
          <div class="hint" style="margin:-4px 0 4px 0; display:flex; gap:8px; align-items:center;">
            <span style="flex:1">The canvas is a different shape from the card, so it letterboxes inside it.</span>
            <button class="add-btn" style="width:auto; padding:5px 10px;" @click=${() => this._matchGrid()}>
              Match the card
            </button>
          </div>` : ''}
        <div class="row">
          <label>Hide tips</label>
          <ha-switch .checked=${!!this.slot.hide_tips}
                     @change=${e => this.commitFn('hide_tips', e.target.checked || undefined)}></ha-switch>
        </div>
        <div class="hint tip" style="margin:-4px 0 4px 0;">
          Takes the explanatory lines out of every menu of this card, which makes
          the editors a good deal shorter once you know your way around.
        </div>
      </div>
    `;
  }

  render() {
    if (!this.slot?.canvas) return html``;
    const c = this._canvas;
    const els = Array.isArray(c.elements) ? c.elements : [];
    const step = resolveSnap(c);
    const gridPct = (c.grid > 0 ? gridToUnits(c, c.grid) : step) / c.w * 100;
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
        <style>${this._live ? els.filter(e => !e.surface).map(el => itemTypography(el,
          `.el.live[data-item-id="${el.id}"]`,
          `.el.live[data-item-id="${el.id}"] > :not(.handle)`)).join('\n') : ''}</style>

        <div class="tool-row">
          <div class="menu-wrap">
            <button class="add-btn" style="width:auto; padding:6px 12px;"
                    @click=${() => { this._menu = !this._menu; this._menuKind = null;
                                     this._placing = null; this._placingTemplate = null;
                                     this._placingEntry = null; }}>
              ＋ Add element
            </button>
            ${this._menu ? this._renderAddMenu() : ''}
          </div>
          <span class="hint tip" style="flex:1">${this._placing
            ? html`Click on the canvas to place the ${this._placingLabel}. Escape cancels.`
            : html`Later in the list draws on top. A gauge and a round bar stay square and fill their box.`}</span>
          <div class="names history">
            <button title=${this._undoStack.length
                      ? 'Undo the last change to the canvas or its elements'
                      : 'Nothing to undo yet'}
                    ?disabled=${!this._undoStack.length}
                    @click=${() => this._undo()}>↶</button>
            <button title=${this._redoStack.length
                      ? 'Do it again'
                      : 'Nothing to redo'}
                    ?disabled=${!this._redoStack.length}
                    @click=${() => this._redo()}>↷</button>
          </div>
          <div class="names">
            <button class=${this._names ? 'on' : ''}
                    title="Put each element's name on its box. Off, a box says its id - which is what the lists, the glass targets and the colour rules call it."
                    @click=${() => { this._names = !this._names; }}>Names</button>
          </div>
        </div>

        ${this._renderCanvasSettings()}

        <div class="canvas-wrap">
          <div class="canvas-pad"
               @pointermove=${this._onMove}
               @pointerup=${this._onUp}
               @pointercancel=${this._onUp}
               @pointerdown=${this._onCanvasDown}
               @wheel=${this._onWheel}>
          <div class="canvas-view" style="aspect-ratio:${c.w} / ${c.h};">
          <div class="canvas ${this._pushed('main') ? 'pushed' : ''}" style="aspect-ratio:${c.w} / ${c.h}; width:${this._zoom * 100}%;">
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
              // Live through a drag as well: it moves boxes and commits
              // nothing until the pointer is let go, so no element is handed
              // a new config in the meantime and nothing re-renders that the
              // drag did not move.
              const live = this._live ? this._liveContent(el) : null;
              const pinned = isPinned(el);
              return html`
              <div class="el ${el.surface ? 'surface' : ''} ${live ? 'live' : ''} ${this._isSel(el.id) ? 'sel' : ''} ${pinned ? 'pinned' : ''} ${this._pushed(el.id) ? 'pushed' : ''}"
                   style="left:${pct(el.x, c.w)}; top:${pct(el.y, c.h)}; width:${pct(el.w, c.w)}; height:${pct(el.h, c.h)};"
                   data-item-id=${el.id} title=${this._title(el, pinned)}
                   @pointerdown=${e => this._onDown(e, idx, 'move')}>
                ${live ?? el.id}
                ${pinned || selected.length > 1 ? '' : html`
                <div class="handle" @pointerdown=${e => this._onDown(e, idx, 'resize')}></div>`}
              </div>`;
            })}
            ${this._names ? html`
              <div class="tags">
                ${els.map(el => html`
                  <div class="tag" style="left:${pct(el.x, c.w)}; top:${pct(el.y + el.h, c.h)}; max-width:${(1 - el.x / c.w) * 100}%;">${this._label(el.id) || el.id}</div>`)}
              </div>` : ''}
          </div>
          </div>
          </div>
        </div>

        <div class="tools">
          <div class="group">
            ${[['left', 'Line up their left edges'],
               ['hcenter', 'Line them up through one vertical middle'],
               ['right', 'Line up their right edges'],
               ['top', 'Line up their top edges'],
               ['vcenter', 'Line them up through one horizontal middle'],
               ['bottom', 'Line up their bottom edges']].map(([edge, what]) => html`
              <button class="icon" title=${movers < 2
                        ? 'Two selected elements that can move are needed to line anything up'
                        : `${what}. The outermost of them stays where it is.`}
                      ?disabled=${movers < 2}
                      @click=${() => this._align(/** @type {any} */ (edge))}>${alignIcon(/** @type {any} */ (edge))}</button>`)}
          </div>
          <div class="group">
            <button title=${movers < 3
                      ? 'Three selected elements that can move are needed to even out the gaps between them'
                      : 'Even gaps left to right. The outermost two stay where they are.'}
                    ?disabled=${movers < 3}
                    @click=${() => this._distribute('x')}>⇔</button>
            <button title=${movers < 3
                      ? 'Three selected elements that can move are needed to even out the gaps between them'
                      : 'Even gaps top to bottom. The outermost two stay where they are.'}
                    ?disabled=${movers < 3}
                    @click=${() => this._distribute('y')}>⇕</button>
          </div>
          <span class="spacer"></span>
          <div class="group">
            <button title=${!selected.length
                      ? 'Select an element to lock it in place'
                      : (this._allLocked
                          ? `Let ${selected.length === 1 ? 'it' : 'them'} be dragged again`
                          : 'Lock in place, so a stray drag cannot move it')}
                    ?disabled=${!selected.length}
                    @click=${() => this._lockSelection()}>${this._allLocked ? '🔒' : '🔓'}</button>
            <button title=${!selected.length
                      ? 'Select an element to copy it'
                      : (this._copyable === selected.length
                          ? `Copy ${selected.length === 1 ? 'it' : `all ${selected.length}`}`
                          : (this._copyable
                              ? `Copy the ${this._copyable} of them that can be copied`
                              : 'The card has only one of these, so there is nothing to copy'))}
                    ?disabled=${!this._copyable}
                    @click=${() => this._duplicateSelection()}>⧉</button>
            <button class="danger" title=${!selected.length
                      ? 'Select an element to take it off the canvas'
                      : `Take ${selected.length === 1 ? 'it' : `all ${selected.length}`} off the canvas`}
                    ?disabled=${!selected.length}
                    @click=${() => this._removeSelection()}>🗑</button>
          </div>
          <div class="group">
            <button title="Zoom out" ?disabled=${this._zoom <= ZOOM_MIN}
                    @click=${() => this._stepZoom(-1)}>−</button>
            <span class="hint level">${Math.round(this._zoom * 100)}%</span>
            <button title="Zoom in" ?disabled=${this._zoom >= ZOOM_MAX}
                    @click=${() => this._stepZoom(1)}>＋</button>
            <button title="Back to 100%, the size at which the whole canvas fits"
                    ?disabled=${this._zoom === 1} @click=${() => this._applyZoom(1)}>⟲</button>
          </div>
        </div>

        ${this._renderLayers(els, selected)}

        <div class="col" style="gap:4px;">
          ${els.map((el, idx) => [el, idx])
               .filter(([el]) => !selected.length || selected.includes(el.id))
               .map(([el, idx]) => {
                 const name = this._label(el.id);
                 return html`
            <div class="el-row ${selected.length > 1 ? 'co' : (this._sel === el.id ? 'sel' : '')}">
              <span class="el-name" @click=${e => {
                      // The same modifiers as on the canvas, so a selection can
                      // be built from either place.
                      if (e.shiftKey || e.ctrlKey || e.metaKey) this._toggleSel(el.id);
                      else this._selectOnly(el.id);
                    }}>${name ? html`<span class="named">${name}</span>` : ''}<span
                        class="id ${name ? '' : 'only'}">${el.id}</span></span>
              ${selected.length === 1 && this._sel === el.id ? html`
                ${(isSquareLocked(el, this.slot) ? ['x', 'y', 'size'] : ['x', 'y', 'w', 'h']).map(k => html`
                  <input class="num" type="number" step=${step}
                         .value=${Math.round(k === 'size' ? Math.min(el.w, el.h) : el[k])}
                         title=${k === 'size' ? 'size - this one is always square' : k}
                         @change=${e => {
                           const v = parseFloat(e.target.value) || 0;
                           this._setEl(idx, k === 'size' ? { w: v, h: v } : { [k]: v });
                         }}>`)}
              ` : ''}
              ${isPinned(el) ? html`<span class="lock" title="Locked - unlock it with the lock under the canvas">🔒</span>` : ''}
              <button class="icon-btn" title="Backward" @click=${() => this._move(idx, -1)}>↑</button>
              <button class="icon-btn" title="Forward" @click=${() => this._move(idx, 1)}>↓</button>
            </div>`;
               })}
        </div>
        <div class="hint tip">${selected.length > 1
          ? html`${selected.length} selected - dragging one moves them all, and the buttons under the canvas copy them or even out the gaps. An element's own settings are back when it is the only one selected.`
          : (sel
            ? html`Click the canvas background to list every element again. Shift-click a second element to move them together.`
            : html`Click an element on the canvas to work on it here, or drag a frame on the background to take several.`)}</div>

        ${sel && selected.length === 1 ? this._renderElementConfig(sel) : ''}

      </div>`;
  }
}
if (!customElements.get('sc-canvas-editor')) customElements.define('sc-canvas-editor', ScCanvasEditor);

/**
 * The card's box, the canvas' grid and the two view switches, rendered inside
 * the core editor's Card & Dimensions menu so that nothing but the canvas sits
 * above the canvas.
 *
 * It is the canvas editor itself, drawing one part of itself: every getter
 * these controls read - the section's width, the row count, the reshaping - is
 * already written there, and a second copy of that arithmetic is the last
 * thing this card needs. What it must not inherit is the canvas editor's
 * *behaviour*: the document-wide keys and the reshape-on-cardConfig-change
 * would then happen twice per edit.
 */
class ScCanvasDimensions extends ScCanvasEditor {
  static get styles() { return [SC.formStyles, ScCanvasEditor.styles[1]]; }
  connectedCallback() { LitElement.prototype.connectedCallback.call(this); }
  disconnectedCallback() { LitElement.prototype.disconnectedCallback.call(this); }
  updated() {}

  /**
   * These controls sit in another menu but write the same `canvas` and
   * `grid_options` the canvas editor's arrows walk back through, so the step
   * belongs on that editor's stack. Kept here, it would be on a stack with no
   * arrows - and the editor's own last snapshot, still holding the size the
   * user has since changed, would quietly revert it on the next undo.
   */
  _send(key, value) {
    // Card & Dimensions is a shadow root of its own, one level in from the one
    // the canvas editor sits in, so the search climbs out through the hosts.
    let root = /** @type {any} */ (this.getRootNode());
    for (let hops = 0; root && hops < 5; hops++) {
      const editor = root.querySelector?.('sc-canvas-editor');
      if (editor && editor !== this) { editor._send(key, value); return; }
      root = root.host ? root.host.getRootNode() : null;
    }
    super._send(key, value);
  }
  render() { return this.slot?.canvas ? this._renderDimensions() : html``; }
}

if (!customElements.get('sc-canvas-dimensions')) customElements.define('sc-canvas-dimensions', ScCanvasDimensions);


/**
 * Writes down the canvas a rows layout describes, once, when the editor opens.
 *
 * The card is already drawing that canvas - rows-compat.js builds it in memory
 * on every load - so this changes the model and not the picture, which is what
 * makes doing it without asking defensible. `layout_rows` is left in the config,
 * so a migration that lands badly is undone by deleting `canvas` in the YAML
 * editor. A card that never had a layout is not touched here; it gets the offer
 * instead, because the canvas built from a content row is a new arrangement.
 *
 * The write happens on open rather than at render because a Lovelace card
 * cannot persist its own config outside the editor. This is the only place that
 * can. It is staged in the dialog like any other edit, so Cancel discards it.
 *
 * The shape is measured the way Convert measured it: the section's column count
 * and width are read from this element, which sits inside the edit dialog where
 * both are to be had. `canvasFromBox` is not used, because the card itself is
 * not this element and cannot be measured through it.
 *
 * It renders nothing. The commit replaces it with the canvas editor on the next
 * update, and a card whose commit has not come back yet has nothing to say.
 */
class ScCanvasAdopt extends LitElement {
  static get properties() { return { slot: { type: Object }, cardConfig: { type: Object } }; }

  firstUpdated() {
    // One write per element, however often lit updates it: a second commit in
    // the same dialog would be built from the same rows and overwrite whatever
    // the first one has since been edited into.
    if (this._done) return;
    this._done = true;

    const slot = this.slot || {};
    const shape = canvasFromGrid(this.cardConfig, slot, 400,
                                 sectionColumns(this), sectionWidthPx(this));
    const migrated = rowsAsCanvas(slot, shape.w, shape.h);
    if (migrated) this.commitFn('__merge__', migrated);
  }

  render() { return html``; }
}
if (!customElements.get('sc-canvas-adopt')) customElements.define('sc-canvas-adopt', ScCanvasAdopt);

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

    // Which elements exist is the canvas's answer and nothing else's.
    if (!Array.isArray(config.canvas?.elements)) return;

    const placed = new Set(config.canvas.elements.map(el => el.id));
    // assignSlot moved these out of the template lit created them in, so lit
    // cannot take them back when the module stops rendering them. One whose
    // element has been removed from the canvas would stay here for good -
    // invisible, still bound to hass, and still the first thing
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
  }

  /**
   * A card with a canvas gets the canvas editor; a card still on rows is given
   * the canvas its rows describe and then gets the same editor; a card on
   * neither is offered one.
   *
   * The difference between migrating and offering is whether the picture
   * survives it. A rows layout migrates position for position - it is already
   * being drawn as a canvas on the dashboard, rows-compat.js does that in
   * memory on every load, so writing it down changes the model and nothing
   * else. A card that never had a layout draws the content row, and the
   * canvas built from it arranges the same contents as bands, top to bottom.
   * That is a new arrangement, however faithful the contents - so it stays an
   * offer, with the button that says what it will do.
   */
  function renderCustomBlock(commitFn, hass, slot, cardConfig) {
    if (slot?.canvas) {
      return html`<sc-canvas-editor style="display:block; margin-bottom:16px;"
                                    .slot=${slot} .hass=${hass} .cardConfig=${cardConfig}
                                    .commitFn=${commitFn}></sc-canvas-editor>`;
    }
    if (needsRowsCompat(slot)) {
      return html`<sc-canvas-adopt .slot=${slot} .cardConfig=${cardConfig}
                                   .commitFn=${commitFn}></sc-canvas-adopt>`;
    }
    return html`
      <div style="margin: 0 16px 16px 16px; padding: 10px 12px; border: 1px dashed var(--primary-color,#03a9f4); border-radius: 6px; font-size: 12px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 12px;">
        <span style="flex:1">
          <b style="color:var(--primary-text-color)">Start on the canvas.</b>
          Everything the card shows comes along - laid out top to bottom as a
          starting point, then dragged and sized wherever you want it. You can
          switch back by deleting <code>canvas</code> in the YAML editor.
        </span>
        <button type="button" style="background: var(--primary-color,#03a9f4); border: none; color: #fff; padding: 7px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;"
          @click=${e => {
            // Pill was a card *shape*, and the canvas has only a corner radius.
            // Half the shorter side is the same stadium, so a round card stays
            // round instead of being squared off by a change of model. It
            // travels in this commit; a second one in the same tick is lost.
            const pillAsRadius = SC.cardIsPill(slot)
              ? { border_radius: 50, border_radius_unit: '%', border_radius_ref: 'min' }
              : {};
            // layout_active gates the renderer, so a canvas without it is a
            // canvas nobody sees.
            commitFn('__merge__', {
              canvas: canvasFromCard(cardConfig, slot,
                sectionColumns(e.currentTarget), sectionWidthPx(e.currentTarget)),
              layout_active: true, ...pillAsRadius });
          }}>
          Use canvas
        </button>
      </div>`;
  }

  return /** @type {SupercardModule} */ ({ update, onAfterRender, editorFields: () => [], renderCustomBlock });
})());