/**
 * Reading a rows-and-cells layout as a canvas.
 *
 * The card had two layout models: rows holding cells holding items, and the
 * canvas. The rows model is gone - its renderer, its editor and the Convert
 * button that bridged them - but the configurations it wrote are on people's
 * dashboards, and a card that draws nothing because its model was retired is
 * not an acceptable upgrade. So `layout_rows` is still read, once per render,
 * and answered with the canvas it describes.
 *
 * This is the same migration Convert performed, with one difference that makes
 * it better rather than worse: Convert ran inside the edit dialog, where the
 * card is not on screen, so it inferred the card's shape from `grid_options`
 * and a reference section width. Here the card has measured itself, so the
 * aspect ratio is the one the card really has.
 *
 * Nothing is written back. A Lovelace card cannot persist its own config
 * outside the editor, so this stays in memory and runs again next load; the
 * editor writes the canvas out the first time it is opened. `layout_rows` is
 * therefore left alone on disk, and a card migrated by mistake is still
 * recoverable exactly as it was.
 */
import {
  migrateLayoutToCanvas, repointPatterns, canvasFromBox,
  paintedCells, colouredCells, glassedCells, soleElementTargets, deadCellTargets,
} from "./canvas-model.js";

/**
 * Whether a slot carries a rows layout and no canvas to draw instead.
 *
 * @param {any} slot
 * @returns {boolean}
 */
export function needsRowsCompat(slot) {
  return !slot?.canvas && Array.isArray(slot?.layout_rows) && slot.layout_rows.length > 0;
}

/**
 * The canvas a rows layout describes, plus the pattern lists repointed onto it.
 *
 * Returns null when there is nothing to migrate, or when the card has not been
 * measured yet - the caller renders as before and asks again once it has a box.
 *
 * `layout_active` is deliberately not set here. This answer is also the one the
 * card renders from in memory on every load, where turning the switch on would
 * put a layout on screen that nobody has seen since they switched it off. The
 * one place that does set it is `ScCanvasAdopt`, which writes the migration
 * down - a canvas without that switch is a canvas nobody sees.
 *
 * @param {any} slot
 * @param {number} boxW the card's measured width in px
 * @param {number} boxH the card's measured height in px
 * @returns {any} a partial slot to render with, or null
 */
export function rowsAsCanvas(slot, boxW, boxH) {
  if (!needsRowsCompat(slot)) return null;
  const shape = canvasFromBox(boxW, boxH);
  if (!shape) return null;

  // Patterns pointing at a cell this layout does not have are already doing
  // nothing; carrying them into the migration would invent a surface for them.
  const dead = deadCellTargets(slot);
  const live = (/** @type {string[]} */ keys) => keys.filter(k => !dead.includes(k));

  // Glass on a cell that holds exactly one element follows that element, so
  // that cell needs no surface painted behind it - unless it is coloured too.
  const follows = soleElementTargets(slot.layout_rows);
  const coloured = live(colouredCells(slot));
  const onElement = live(glassedCells(slot)).filter(k => k in follows);
  const surfaced = live(paintedCells(slot)).filter(k => !onElement.includes(k) || coloured.includes(k));

  const { elements, cellTargets } =
    migrateLayoutToCanvas(slot.layout_rows, shape, { targetedCells: surfaced, slot });
  const { lists } = repointPatterns(slot, cellTargets, follows);

  return { canvas: { ...shape, elements }, ...lists };
}
