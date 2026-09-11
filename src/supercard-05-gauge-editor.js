import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { dialFromStartAngle, startAngleFromDial } from "./gauge-angle.js";

const SC = window.SupercardUtils;

window.SupercardModules = window.SupercardModules || {};
window.SupercardModules['gauge'] = window.SupercardModules['gauge'] || {};

Object.assign(window.SupercardModules['gauge'], (() => {

function editorFields() {}

/**
 * What a gauge is before anyone configures it.
 *
 * The canvas adds gauges too, and it has no business knowing what one
 * contains - that is this module's, so both add buttons ask here.
 */
function newEntry() { return { entity: '', gauge_attribute: '' }; }

/**
 * Whether the gauge is drawn at a size and a place of its own.
 *
 * The renderer lays a responsive gauge out with width and height at 100% and
 * skips the anchor map entirely, so the size, the anchor and the two offsets
 * do nothing whenever this is false - on a canvas always, because there the
 * element's box is both the size and the position. Asking the same helper the
 * renderer asks is what keeps the two answers from drifting apart.
 */
const hasOwnBox = (cfg, slot) => !SC.gaugeIsResponsive(cfg, !!slot?.canvas);

const STYLE_FIELDS = [
  { id: '_section_shape',      label: '── Shape & Position',    type: 'section' },
  { id: 'gauge_type',          label: 'Gauge type',             type: 'select', options: [ { value: 'full', label: 'Full 360°' }, { value: 'semi', label: 'Semi 270°' } ] },
  // Four positions used to be the whole offer here, on a dial that has 360 of
  // them. The slider reads clockwise from the top and `gauge-angle.js` turns
  // that into the angle the renderer draws with - see there for why the stored
  // unit is not the shown one. A semi gauge has no say in this: its 270 degree
  // arc is anchored where the gap looks right.
  //
  // The fallback is the renderer's own: a gauge nobody has switched is a full
  // one, the select above shows it as such, and the control must not be missing
  // on the very gauge that has just been added.
  { id: 'gauge_start_angle',   label: 'Start position (° clockwise from the top)', type: 'range', min: 0, max: 359, step: 1, placeholder: '0',
                               fromStored: dialFromStartAngle, toStored: startAngleFromDial,
                               condition: cfg => (cfg.gauge_type ?? 'full') === 'full' },
  { id: 'gauge_scale',         label: 'Scale',            type: 'range',    min: 0, max: 1, step: 0.01,  placeholder: '1'  },

  // The anchor and the two offsets below place a gauge inside a box it does not
  // fill. A canvas element's box is that place - you drag it - so the renderer
  // ignores all three there, and a control that does nothing is worse than a
  // missing one: it reads like a second, contradicting answer to a question the
  // box has already settled.
  { id: 'gauge_position_mode', label: 'Anchor point / position', type: '9-sector', condition: hasOwnBox },
  // The switch itself is the exception. It is how a card off the canvas gives
  // the gauge its own box back, so it has to stay visible once it is on -
  // hiding it would lock whoever ticked it out of unticking it.
  { id: 'gauge_size_responsive', label: 'Responsive size (auto scaling)', type: 'checkbox', condition: (cfg, slot) => !slot?.canvas },
  { id: 'gauge_size_px',         label: 'Size (px)',            type: 'range',    min: 0, max: 600, step: 1, placeholder: '60', condition: hasOwnBox },
  { id: 'gauge_offset_x',      label: 'Offset X (px)',         type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', condition: hasOwnBox },
  { id: 'gauge_offset_y',      label: 'Offset Y (px)',         type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', condition: hasOwnBox },

  { id: '_section_frame',           label: '── Frame Ring',               type: 'section'  },
  { id: 'frame_ring_active',        label: 'Frame active',                 type: 'checkbox' },
  { id: 'frame_ring_closed',        label: 'Closed circle',          type: 'checkbox', condition: cfg => !!cfg.frame_ring_active },
  { id: 'frame_ring_width',         label: 'Width',                       type: 'range',    min: 0, max: 3, step: 0.1,  placeholder: '1.5', condition: cfg => !!cfg.frame_ring_active },
  { id: 'frame_ring_gap',           label: 'Gap to gradient ring',   type: 'range',    min: 0, max: 3, step: 0.1,  placeholder: '1.5', condition: cfg => !!cfg.frame_ring_active },
  { id: 'frame_ring_color_type',    label: 'Color mode',                   type: 'select',   options: [ { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ], condition: cfg => !!cfg.frame_ring_active },
  { id: 'frame_ring_color',         label: 'Color (fixed)',                  type: 'color',    condition: cfg => !!cfg.frame_ring_active && cfg.frame_ring_color_type !== 'adaptive' },
  { id: 'frame_ring_opacity',       label: 'Opacity',                    type: 'range',    min: 0, max: 1, step: 0.01,  placeholder: '1.0', condition: cfg => !!cfg.frame_ring_active },

  { id: '_section_bg',           label: '── Background',             type: 'section' },
  { id: 'bg_mode',               label: 'Background mode',          type: 'select', options: [ { value: 'none', label: 'None' }, { value: 'adaptive', label: 'Adaptive (theme)' }, { value: 'solid', label: 'Solid color' }, { value: 'linear', label: 'Linear gradient' }, { value: 'radial', label: 'Radial gradient' } ] },
  { id: 'bg_gradient_preset',    label: 'Gradient type',                type: 'select', options: [ { value: 'classic', label: 'Classic (2 colors)' }, { value: 'manual', label: 'Manual (list)' } ], condition: cfg => ['linear', 'radial'].includes(cfg.bg_mode) },
  { id: 'bg_threshold_unit',     label: 'Threshold unit',          type: 'select', options: [ { value: 'percent', label: 'Percent (%)' }, { value: 'absolute', label: 'Absolute' } ], condition: cfg => ['linear', 'radial'].includes(cfg.bg_mode) && cfg.bg_gradient_preset === 'manual' },
  { id: 'bg_opacity',            label: 'Opacity',                  type: 'range',    min: 0, max: 1, step: 0.01, placeholder: '1.0' },
  { id: 'bg_color1',             label: 'Color 1 (inner / start)',    type: 'color',  condition: cfg => ['solid', 'linear', 'radial'].includes(cfg.bg_mode) && cfg.bg_gradient_preset !== 'manual' },
  { id: 'bg_color2',             label: 'Color 2 (outer / end)',     type: 'color',  condition: cfg => ['linear', 'radial'].includes(cfg.bg_mode) && cfg.bg_gradient_preset !== 'manual' },
  { id: 'bg_balance',            label: 'Balance (%)',                type: 'range',    min: 0, max: 100, step: 0.1, placeholder: '50', condition: cfg => ['linear', 'radial'].includes(cfg.bg_mode) && cfg.bg_gradient_preset !== 'manual' },
  { id: 'bg_gradient_angle',     label: 'Angle (° linear only)',      type: 'range',    min: 0, max: 360, step: 1, placeholder: '135', condition: cfg => cfg.bg_mode === 'linear' },
  { id: 'bg_manual_stops',       type: 'bg_manual_stops', condition: cfg => ['linear', 'radial'].includes(cfg.bg_mode) && cfg.bg_gradient_preset === 'manual' },

  { id: '_section_bg_threshold',          label: '── Background Color (Threshold)', type: 'subsection' },
  { id: 'bg_color_threshold_active',      label: 'Threshold active',            type: 'checkbox' },
  { id: 'bg_color_threshold_operator',    label: 'Operator',                     type: 'select', options: [ { value: '>', label: '> Greater than' }, { value: '<', label: '< Less than' }, { value: '>=', label: '>= Greater or equal' }, { value: '<=', label: '<= Less or equal' }, { value: '==', label: '== Equal' } ], condition: cfg => !!cfg.bg_color_threshold_active },
  { id: 'bg_color_threshold_value',       label: 'Threshold',                  type: 'number',  placeholder: '80', condition: cfg => !!cfg.bg_color_threshold_active },
  { id: 'bg_color_threshold_hysteresis',  label: 'Hysteresis (%)',                type: 'range', min: 0, max: 10, step: 0.1, placeholder: '5', condition: cfg => !!cfg.bg_color_threshold_active },
  { id: 'bg_color_threshold_color',       label: 'New background color',        type: 'color', condition: cfg => !!cfg.bg_color_threshold_active },

  { id: '_section_threshold_anim',          label: '── Threshold Animation',           type: 'subsection'  },
  { id: 'bg_threshold_anim_active',         label: 'Animation active',                  type: 'checkbox' },
  { id: 'bg_threshold_anim_operator',       label: 'Operator',                         type: 'select',   options: [ { value: '>', label: '> Greater than' }, { value: '<', label: '< Less than' }, { value: '>=', label: '>= Greater or equal' }, { value: '<=', label: '<= Less or equal' }, { value: '==', label: '== Equal' } ], condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_anim_value',          label: 'Threshold',                      type: 'number',   placeholder: '80',  condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_anim_hysteresis',     label: 'Hysteresis (%)',                    type: 'range',    min: 0, max: 10, step: 0.5, placeholder: '5', condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_anim_type',           label: 'Animation type',                    type: 'select',   options: [ { value: 'pulse_bg', label: 'Pulse — background' }, { value: 'pulse_frame', label: 'Pulse — frame ring' }, { value: 'ripple', label: 'Ripple — water wave' }, { value: 'waves', label: 'Waves (linear traveling)' }, { value: 'wobble_radial', label: 'Water drop (radial fade-out)' }, { value: 'wobble_linear', label: 'Shockwave (linear fade-out)' } ], condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_anim_color',          label: 'Animation color (C1)',             type: 'color',    condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_anim_color2',         label: 'Animation color 2 (trough)',          type: 'color',    condition: cfg => !!cfg.bg_threshold_anim_active && ['waves', 'wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_anim_duration',       label: 'Duration (s)',                        type: 'number',   step: 0.1, placeholder: '1.5', condition: cfg => !!cfg.bg_threshold_anim_active },
  { id: 'bg_threshold_wave_count',          label: 'Count (density)',                  type: 'range',    min: 1, max: 20, step: 1, placeholder: '3', condition: cfg => !!cfg.bg_threshold_anim_active && ['waves', 'wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_wave_balance',        label: 'Balance (peak vs. trough)',           type: 'range',    min: 5, max: 95, step: 1, placeholder: '50', condition: cfg => !!cfg.bg_threshold_anim_active && ['waves', 'wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_gradient_angle',      label: 'Angle (°)',                       type: 'range',    min: 0, max: 360, step: 1, placeholder: '90', condition: cfg => !!cfg.bg_threshold_anim_active && ['waves', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_wobble_amplitude',    label: 'Start amplitude (contrast)',       type: 'range',    min: 1, max: 100, step: 1, placeholder: '100', condition: cfg => !!cfg.bg_threshold_anim_active && ['wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_wobble_freq',         label: 'Range (spread)',         type: 'range',    min: 1, max: 10, step: 1, placeholder: '4', condition: cfg => !!cfg.bg_threshold_anim_active && ['wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_wobble_pause',        label: 'Pause after effect (sec.)',         type: 'range',    min: 0, max: 10, step: 0.5, placeholder: '2', condition: cfg => !!cfg.bg_threshold_anim_active && ['wobble_radial', 'wobble_linear'].includes(cfg.bg_threshold_anim_type) },
  { id: 'bg_threshold_anim_ripple_multi',   label: 'Multiple ripple rings (3×)',        type: 'checkbox', condition: cfg => !!cfg.bg_threshold_anim_active && cfg.bg_threshold_anim_type === 'ripple' },
  { id: 'bg_threshold_anim_ripple_inv',     label: 'Implosion (reverse direction)',    type: 'checkbox', condition: cfg => !!cfg.bg_threshold_anim_active && ['ripple', 'waves'].includes(cfg.bg_threshold_anim_type) },

  { id: '_section_data',        label: '── Data & Scaling',  type: 'section' },
  { id: 'min',                  label: 'Min value',               type: 'number', placeholder: '0'   },
  { id: 'max',                  label: 'Max value',               type: 'number', placeholder: '100' },
  { id: 'value_autorange',      label: 'Auto-range',             type: 'checkbox' },
  { id: 'value_autoscale',      label: 'Auto-scale k/M/G',       type: 'checkbox' },
  { id: 'dynamic_max_scale',    label: 'Dynamic max',        type: 'checkbox' },
  { id: 'autoscale_hysteresis', label: 'Hysteresis (%)',          type: 'number', placeholder: '10'  },

  { id: '_section_color',    label: '── Color & Gradient',   type: 'section' },
  { id: 'stroke_width',        label: 'Ring thickness',            type: 'range',    min: 0, max: 5, step: 0.01,  placeholder: '3'    },
  { id: 'gradient_preset',   label: 'Color mode',             type: 'select', options: [ { value: 'manual', label: 'Manual (list)' }, { value: 'symmetriccustom', label: 'Symmetric (custom)' }, { value: 'symmetric', label: 'Symmetric (default)' }, { value: 'linear', label: 'Linear traffic light' } ] },

  { id: 'gradient_mode',     label: 'Gradient type',           type: 'select', options: [ { value: 'smooth', label: 'Smooth' }, { value: 'stepped', label: 'Stepped' } ], condition: cfg => ['manual', undefined].includes(cfg.gradient_preset) },
  { id: 'gradient_resolution', label: 'Gradient resolution', type: 'select', options: [ { value: 'auto', label: 'Automatic (size-dependent)' }, { value: 'coarse', label: 'Coarse (1× color zones)' }, { value: 'medium', label: 'Medium (12× color zones)' }, { value: 'fine', label: 'Fine (24×) — default' }, { value: 'superfine', label: 'Superfine (48×)' }, { value: 'ultrafine', label: 'Ultrafine (96×)' }, { value: 'megafine', label: 'Megafine (192×)' }  ]},

  { id: 'threshold_unit',    label: 'Threshold unit',     type: 'select', options: [ { value: 'percent', label: 'Percent (%)' }, { value: 'absolute', label: 'Absolute' } ], condition: cfg => ['manual', undefined].includes(cfg.gradient_preset) },
  { id: 'gradient_start',    label: 'Gradient start',        type: 'number', placeholder: 'auto', condition: cfg => ['manual', undefined].includes(cfg.gradient_preset) },
  { id: 'gradient_end',      label: 'Gradient end',         type: 'number', placeholder: 'auto', condition: cfg => ['manual', undefined].includes(cfg.gradient_preset) },

  { id: 'manual_stops',      type: 'manual_stops', condition: cfg => ['manual', undefined].includes(cfg.gradient_preset) },

  { id: 'color1',     label: 'Outer color',    type: 'color',  condition: cfg => ['symmetric', 'symmetriccustom'].includes(cfg.gradient_preset) },
  { id: 'color2',     label: 'Middle color',    type: 'color',  condition: cfg => ['symmetric', 'symmetriccustom'].includes(cfg.gradient_preset) },
  { id: 'color3',     label: 'Center color',  type: 'color',  condition: cfg => ['symmetric', 'symmetriccustom'].includes(cfg.gradient_preset) },
  { id: 'threshold1', label: 'Transition center→middle (%)', type: 'range', min: 0, max: 98, step: 1, placeholder: '40', condition: cfg => cfg.gradient_preset === 'symmetriccustom' },
  { id: 'threshold2', label: 'Transition middle→outer (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '75', condition: cfg => cfg.gradient_preset === 'symmetriccustom' },
  { id: 'threshold3', label: 'Gradient width transition 1 (%)', type: 'range', min: 0.5, max: 30, step: 0.5, placeholder: '8', condition: cfg => cfg.gradient_preset === 'symmetriccustom' },
  { id: 'threshold4', label: 'Gradient width transition 2 (%)', type: 'range', min: 0.5, max: 30, step: 0.5, placeholder: '8', condition: cfg => cfg.gradient_preset === 'symmetriccustom' },

  { id: 'color1',     label: 'Start color',    type: 'color',  condition: cfg => cfg.gradient_preset === 'linear' },
  { id: 'color2',     label: 'Middle color',    type: 'color',  condition: cfg => cfg.gradient_preset === 'linear' },
  { id: 'color3',     label: 'End color',     type: 'color',  condition: cfg => cfg.gradient_preset === 'linear' },
  { id: 'threshold1', label: 'Start spread (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '20', condition: cfg => cfg.gradient_preset === 'linear' },
  { id: 'threshold2', label: 'Mid spread (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '60', condition: cfg => cfg.gradient_preset === 'linear' },

  { id: '_section_pointer',       label: '── Pointer',                  type: 'section' },
  { id: 'pointer_type',           label: 'Pointer shape',                type: 'select',  options: [ { value: 'needle', label: 'Needle' }, { value: 'triangle', label: 'Triangle' } ] },
  { id: 'pointer_width',          label: 'Pointer width',              type: 'range',    min: 0, max: 5, step: 0.1,   placeholder: '2'   },
  { id: 'pointer_length',         label: 'Pointer length',               type: 'range',    min: 0, max: 50, step: 0.1,  placeholder: '10'  },
  { id: 'pointer_offset',         label: 'Pointer offset from ring',     type: 'range',    min: -10, max: 10, step: 0.1,  placeholder: '2'   },
  { id: 'pointer_center_radius',  label: 'Center point size',          type: 'range',    min: 0, max: 10, step: 0.1, placeholder: '2'   },
  { id: 'pivot_offset_x',         label: 'Pivot offset X',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'   },
  { id: 'pivot_offset_y',         label: 'Pivot offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'  },
  { id: 'pointer_color_type',     label: 'Pointer color mode',          type: 'select',  options: [ { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ] },
  { id: 'pointer_color',          label: 'Pointer color (fixed)',         type: 'color',   condition: cfg => cfg.pointer_color_type !== 'adaptive' },
  { id: 'pointer_3d_effect',      label: '3D effect (plastic)',      type: 'checkbox' },
  { id: 'pointer_dot_color_type', label: 'Dot color mode',           type: 'select',  options: [ { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ] },
  { id: 'pointer_dot_color',      label: 'Dot color (fixed)',          type: 'color',   condition: cfg => cfg.pointer_dot_color_type !== 'adaptive' },
  { id: 'pointer_shadow_type',    label: 'Pointer shadow',            type: 'select',  options: [ { value: 'none', label: 'None' }, { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ] },
  { id: 'pointer_shadow_color',   label: 'Shadow color',             type: 'color',   condition: cfg => cfg.pointer_shadow_type === 'fixed' },
  { id: 'pointer_shadow_blur',     label: 'Shadow blur',   type: 'range', min: 0,  max: 1, step: 0.01,  placeholder: '0.8', condition: cfg => cfg.pointer_shadow_type !== 'none' },
  { id: 'pointer_shadow_offset_y', label: 'Shadow offset Y',        type: 'range', min: -5, max: 5, step: 0.1,  placeholder: '0.3', condition: cfg => cfg.pointer_shadow_type !== 'none' },
  { id: 'pointer_shadow_opacity',  label: 'Shadow opacity',        type: 'range', min: 0,  max: 1, step: 0.05, placeholder: '0.4', condition: cfg => cfg.pointer_shadow_type !== 'none' },
  { id: 'animation_duration',     label: 'Animation duration (s)',       type: 'range',    min: 0, max: 10, step: 0.1, placeholder: '0.8', condition: cfg => cfg.animation_easing !== 'spring' },
  { id: 'animation_spring_duration', label: 'Spring animation duration (s)', type: 'range', min: 0.1, max: 10, step: 0.1, placeholder: '1.5', condition: cfg => cfg.animation_easing === 'spring' },
  { id: 'animation_dynamic_speed',label: 'Dynamic pointer acceleration', type: 'checkbox' },
  { id: 'animation_dynamic_speed_invert', label: 'Invert acceleration (long paths fast)', type: 'checkbox', condition: cfg => !!cfg.animation_dynamic_speed },
  { id: 'animation_easing',       label: 'Pointer settling (easing)', type: 'select', options: [
    { value: 'smooth', label: 'Smooth (default)' },
    { value: 'overshoot_light', label: 'Light overshoot' },
    { value: 'overshoot_medium', label: 'Medium overshoot' },
    { value: 'overshoot_heavy', label: 'Heavy overshoot' },
    { value: 'elastic', label: 'Elastic (rubber band)' },
    { value: 'spring', label: 'Physical spring (multi-bounce)' }
  ] },
  { id: 'animation_spring_bounces', label: 'Number of overshoots', type: 'range', min: 1, max: 10, step: 1, placeholder: '3', condition: cfg => cfg.animation_easing === 'spring' },
  { id: 'animation_spring_amplitude', label: 'Spring amplitude (intensity %)', type: 'range', min: 0, max: 100, step: 1, placeholder: '50', condition: cfg => cfg.animation_easing === 'spring' },

  { id: '_section_ticks',           label: '── Ticks',                    type: 'section' },
  { id: 'tick_count',               label: 'Tick count',                 type: 'range',    min: 0, max: 50, step: 1,   placeholder: '0'   },
  { id: 'tick_length',              label: 'Tick length',                  type: 'range',    min: 0, max: 6, step: 0.1,   placeholder: '3'   },
  { id: 'tick_width',               label: 'Tick width',                 type: 'range',    min: 0, max: 5, step: 0.1,   placeholder: '1'   },
  { id: 'tick_offset',              label: 'Tick offset from ring',        type: 'range',    min: -10, max: 10, step: 0.1,   placeholder: '0'   },
  { id: 'tick_color_type',          label: 'Tick color mode',             type: 'select',   options: [ { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ] },
  { id: 'tick_color',               label: 'Tick color (fixed)',            type: 'color',   condition: cfg => cfg.tick_color_type !== 'adaptive' },

  { id: '_section_sub_ticks',       label: '── SubTicks',                 type: 'subsection' },
  { id: 'sub_tick_count',           label: 'Sub-tick count (between)',type: 'range',    min: 0, max: 10, step: 1,   placeholder: '0'   },
  { id: 'sub_tick_length',          label: 'Sub-tick length',              type: 'range',    min: 0, max: 3, step: 0.1,   placeholder: '1.5' },
  { id: 'sub_tick_width',           label: 'Sub-tick width',             type: 'range',    min: 0, max: 3, step: 0.1,   placeholder: '0.5' },
  { id: 'sub_tick_offset',          label: 'Sub-tick offset from ring',    type: 'range',    min: -10, max: 10, step: 0.1,   placeholder: '0'   },
  { id: 'sub_tick_color_type',      label: 'Sub-tick color mode',         type: 'select',   options: [ { value: 'fixed', label: 'Fixed' }, { value: 'adaptive', label: 'Adaptive' } ] },
  { id: 'sub_tick_color',           label: 'Sub-tick color (fixed)',        type: 'color',    condition: cfg => cfg.sub_tick_color_type !== 'adaptive' },

  { id: '_section_ticks_label',     label: '── Tick Label',               type: 'subsection'},
  { id: 'show_tick_labels',         label: 'Show tick labels',        type: 'checkbox' },
  { id: 'tick_label_step',          label: 'Label interval',             type: 'range',    min: 0, max: 10, step: 1,   placeholder: '1',  condition: cfg => !!cfg.show_tick_labels },
  { id: 'multiplier_divide_ticks',  label: 'Divide tick labels by multiplier', type: 'checkbox', condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_decimals',      label: 'Label decimal places',        type: 'range',    min: 0, max: 6, step: 1,   placeholder: '0',  condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_font_size',     label: 'Label font size',          type: 'range',    min: 0, max: 20, step: 0.5, placeholder: '7',  condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_offset',        label: 'Label distance from ring',      type: 'range',    min: -15, max: 15, step: 0.1,  placeholder: '-8', condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_spread',        label: 'Spread (collision protection)', type: 'range',    min: 0, max: 10, step: 0.1,  placeholder: '0'   },
  { id: 'tick_label_extra_length',  label: 'Label tick extra length',      type: 'range',    min: 0, max: 4, step: 0.1,   placeholder: '0',  condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_color_type',    label: 'Label color mode',            type: 'select',   options: [ { value: 'adaptive', label: 'Adaptive' }, { value: 'fixed', label: 'Fixed' } ], condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_color',         label: 'Label color (fixed)',           type: 'color',    condition: cfg => !!cfg.show_tick_labels && cfg.tick_label_color_type !== 'adaptive' },
  { id: 'tick_label_inherit_color', label: 'Inherit color from tick',        type: 'checkbox', condition: cfg => !!cfg.show_tick_labels },
  { id: 'tick_label_crossfade_dur', label: 'Crossfade duration (s)',     type: 'range',    min: 0, max: 3, step: 0.1, placeholder: '0.4', condition: cfg => !!cfg.show_tick_labels },

  { id: '_section_custom_ticks',    label: '── Custom Ticks (Fixed Points)', type: 'subsection' },
  { id: 'custom_ticks',             type: 'custom_ticks' },

  { id: '_section_sectors',         label: '── Sectors (Areas)',       type: 'section' },
  { id: 'sectors',                  type: 'sectors' },

  { id: '_section_labels',        label: '── Value & Labels',           type: 'section' },
  { id: 'show_value',             label: 'Show value',              type: 'checkbox' },
  { id: 'value_font_size',        label: 'Value font size',          type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '12',  condition: cfg => !!cfg.show_value },
  { id: 'value_offset_y',         label: 'Value offset Y',              type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  condition: cfg => !!cfg.show_value },
  { id: 'value_color_type',       label: 'Value color mode',            type: 'select',  options: [ { value: 'adaptive', label: 'Adaptive' }, { value: 'fixed', label: 'Fixed' } ], condition: cfg => !!cfg.show_value },
  { id: 'value_color',            label: 'Value color (fixed)',           type: 'color',   condition: cfg => !!cfg.show_value && cfg.value_color_type !== 'adaptive' },
  { id: 'value_decimals',         label: 'Decimal places',             type: 'range',    min: 0, max: 6, step: 1, placeholder: '0',   condition: cfg => !!cfg.show_value },
  { id: 'value_show_raw_unit',    label: 'Show unit',           type: 'checkbox', condition: cfg => !!cfg.show_value },
  { id: 'value_replace_unit',     label: 'Replace original unit',  type: 'checkbox', condition: cfg => !!cfg.show_value && !!cfg.value_show_raw_unit },
  { id: 'value_custom_unit',      label: 'Custom unit (suffix)',    type: 'text',     placeholder: 'e.g. W', condition: cfg => !!cfg.show_value && !!cfg.value_show_raw_unit && !!cfg.value_replace_unit },

  { id: 'show_scale_label',       label: 'Show scale label', type: 'checkbox' },
  { id: 'scale_label_font_size',  label: 'Label font size',         type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '10',  condition: cfg => !!cfg.show_scale_label },
  { id: 'scale_label_offset_y',   label: 'Label offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', condition: cfg => !!cfg.show_scale_label },
  { id: 'scale_label_color_type', label: 'Label color mode',           type: 'select',  options: [ { value: 'adaptive', label: 'Adaptive' }, { value: 'fixed', label: 'Fixed' } ], condition: cfg => !!cfg.show_scale_label },
  { id: 'scale_label_color',      label: 'Label color (fixed)',          type: 'color',   condition: cfg => !!cfg.show_scale_label && cfg.scale_label_color_type !== 'adaptive' },
  { id: 'show_multiplier_label',  label: 'Show multiplier',     type: 'checkbox' },
  { id: 'multiplier_divide_ticks',  label: 'Divide tick labels by multiplier', type: 'checkbox', condition: cfg => !!cfg.show_tick_labels },

  { id: 'multiplier_prepend',     label: 'Prefix (e.g. x)',            type: 'text',    placeholder: 'x',   condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_decimals',    label: 'Decimal places',             type: 'number',  placeholder: '0',   condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_font_size',   label: 'Font size',               type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '10',  condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_offset_x',    label: 'Offset X',                   type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',   condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_offset_y',    label: 'Offset Y',                   type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_color_type',  label: 'Color mode',                 type: 'select',  options: [ { value: 'adaptive', label: 'Adaptive' }, { value: 'fixed', label: 'Fixed' } ], condition: cfg => !!cfg.show_multiplier_label },
  { id: 'multiplier_color',       label: 'Color (fixed)',                type: 'color',   condition: cfg => !!cfg.show_multiplier_label && cfg.multiplier_color_type !== 'adaptive' },

  { id: '_section_gauge_label',    label: '── Gauge Label',       type: 'section' },
  { id: 'gauge_label_active',      label: 'Label active',          type: 'checkbox' },
  { id: 'gauge_label_text',        label: 'Label text',           type: 'text',     placeholder: 'Gauge',  condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_font_size',   label: 'Font size',         type: 'range',    min: 0, max: 20, step: 0.1,   placeholder: '8',   condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_font_weight', label: 'Weight',           type: 'select',   options: [ { value: '400', label: 'Normal' }, { value: '600', label: 'Semi-Bold' }, { value: '700', label: 'Bold' } ], condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_offset_x',    label: 'Offset X',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_offset_y',    label: 'Offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_color_type',  label: 'Color mode',           type: 'select',   options: [ { value: 'adaptive', label: 'Adaptive' }, { value: 'fixed', label: 'Fixed' } ], condition: cfg => !!cfg.gauge_label_active },
  { id: 'gauge_label_color',       label: 'Color (fixed)',            type: 'color',    condition: cfg => cfg.gauge_label_color_type === 'fixed' }
];

class ScGaugeEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      slot: { type: Object },
      commitFn: { type: Object },
      only: { type: Number }
    };
  }

  constructor() {
    super();
    this._expanded = {};
    this._timeouts = {};
  }

  static get styles() {
    return [SC.formStyles, css`
      input[type="text"], input[type="number"], select { transition: border-color 0.2s; }
      .fx-slot { margin: 8px 0; padding: 8px; border-radius: 6px;
                 background: rgba(255,255,255,0.03); border: 1px solid var(--divider-color,#555); }
      details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
      ha-entity-picker, ha-selector { display: block; width: 100%; }
      .entity-row { display: flex; flex-direction: column; gap: 4px; }
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
    `];
  }

  /**
   * The gauges to edit. A slot that never grew a `gauges` array still has one
   * gauge - the card's own config - and editing it materialises the array,
   * which is why the fallback is a shape rather than an empty list.
   */
  get _gauges() {
    return Array.isArray(this.slot.gauges) && this.slot.gauges.length > 0
      ? this.slot.gauges
      : [{
          entity: this.slot.gauge_entity_0 || this.slot.entity || '',
          gauge_attribute: this.slot.gauge_attribute_0 || this.slot.gauge_attribute || '',
          inherit: false
        }];
  }

  render() {
    if (!this.slot) return html``;

    const isActive = !!this.slot.gauge_active;
    const gauges = this._gauges;

    // One entry alone, for the canvas editor: no section, no switch, no add
    // button - the canvas has already chosen which gauge is being edited.
    if (typeof this.only === 'number') {
      return gauges[this.only] ? this._renderGaugeBody(gauges[this.only], this.only, gauges) : html``;
    }

    return html`
      <details class="inner-section">
        <summary>── Gauges
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <span style="font-size:10px; opacity:.6; font-weight:400;">
              ${gauges.length} Gauge${gauges.length !== 1 ? 's' : ''}
            </span>
            <ha-switch
              .checked=${isActive}
              @click=${e => e.stopPropagation()}
              @change=${e => this.commitFn('gauge_active', e.target.checked)}>
            </ha-switch>
          </div>
        </summary>
        <div class="inner-content">
          ${isActive ? html`
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${gauges.map((entry, idx) => this._renderGaugePanel(entry, idx, gauges))}
              <button class="add-btn" @click=${() => this._addGauge(gauges)}>
                ＋ Add gauge
              </button>
            </div>
          ` : ''}
        </div>
      </details>`;
  }

  _addGauge(gauges) {
    const newGauges = structuredClone(gauges);
    newGauges.push(newEntry());
    this._expanded[`gauge_${newGauges.length - 1}`] = true;
    this.commitFn('gauges', newGauges);
  }

  _removeGauge(idx, gauges) {
    const newGauges = structuredClone(gauges);
    newGauges.splice(idx, 1);
    this.commitFn('gauges', newGauges);
  }

  _cloneSection(targetIdx, sourceIdx, sec, gauges, selectEl) {
    if(isNaN(sourceIdx)) return;
    const n = structuredClone(gauges);
    const src = n[sourceIdx];
    const tgt = n[targetIdx];
    
    const fieldsToCopy = [];
    const collectFields = (items) => {
       items.forEach(f => { if (f.id) fieldsToCopy.push(f.id); });
    };
    
    collectFields(sec.items);
    if (sec.subsections) sec.subsections.forEach(sub => collectFields(sub.items));
    
    fieldsToCopy.forEach(fid => {
       if (src[fid] !== undefined) {
           tgt[fid] = structuredClone(src[fid]); 
       } else {
           delete tgt[fid]; 
       }
    });
    
    this.commitFn('gauges', n);
    selectEl.value = ""; 
  }

  _renderGaugePanel(entry, idx, gauges) {
    // --- ALIAS TITLE PREVIEW ---
    let title = entry.name || '';
    const { entity: resolvedEntity, match: aliasObj } = SC.resolveAlias(this.slot?.global_entities, entry);
    const isAlias = !!aliasObj;

    if (!title && resolvedEntity && this.hass?.states[resolvedEntity]) {
      const s = this.hass.states[resolvedEntity];
      if (isAlias) {
        title = `[${aliasObj.alias || 'Alias'}] ${s.attributes.friendly_name || resolvedEntity}`;
        if (aliasObj.attribute) title += ` (${aliasObj.attribute})`;
      } else {
        title = s.attributes.friendly_name || resolvedEntity;
      }
    } else if (!title) {
      title = isAlias ? `[${aliasObj.alias || 'Alias'}] ${resolvedEntity || 'Unnamed'}` : `Gauge ${idx + 1}`;
    }
    
    const stateKey = `gauge_${idx}`;
    if (this._expanded[stateKey] === undefined) this._expanded[stateKey] = false;

    return html`
      <details class="inner-section" 
        ?open=${this._expanded[stateKey]} 
        @toggle=${e => this._expanded[stateKey] = e.target.open}
        @dragstart=${(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', idx);
          setTimeout(() => e.target.style.opacity = '0.3', 0);
        }}
        @dragover=${(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.style.borderTop = '3px dashed var(--primary-color, #03a9f4)';
        }}
        @dragleave=${(e) => { e.currentTarget.style.borderTop = ''; }}
        @drop=${(e) => {
          e.preventDefault();
          e.currentTarget.style.borderTop = '';
          const draggedIdx = parseInt(e.dataTransfer.getData('text/plain'));
          if (draggedIdx !== idx && !isNaN(draggedIdx)) {
            const n = structuredClone(gauges);
            const [movedItem] = n.splice(draggedIdx, 1);
            n.splice(idx, 0, movedItem);
            this.commitFn('gauges', n);
          }
          e.currentTarget.removeAttribute('draggable');
        }}
        @dragend=${(e) => {
          e.target.style.opacity = '1';
          e.target.removeAttribute('draggable');
        }}
      >
        <summary>
          <span style="display:flex;align-items:center;">
            <span 
              style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px; user-select: none;"
              title="Move gauge"
              @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
              @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
            >⋮⋮</span>
            ${title}
          </span>

          ${gauges.length > 1 ? html`
            <div style="display:flex; gap:12px; align-items:center;" @click=${e => e.stopPropagation()}>
              <button title="Move up" ?disabled=${idx === 0} style="background:none;border:none;cursor:${idx === 0 ? 'default' : 'pointer'};font-size:14px;color:${idx === 0 ? 'var(--divider-color,#555)' : 'var(--primary-text-color)'};padding:0;" @click=${(e) => {
                e.preventDefault();
                if (idx === 0) return;
                const n = structuredClone(gauges);
                const temp = n[idx-1]; n[idx-1] = n[idx]; n[idx] = temp;
                this.commitFn('gauges', n);
              }}>▲</button>
              <button title="Move down" ?disabled=${idx === gauges.length - 1} style="background:none;border:none;cursor:${idx === gauges.length - 1 ? 'default' : 'pointer'};font-size:14px;color:${idx === gauges.length - 1 ? 'var(--divider-color,#555)' : 'var(--primary-text-color)'};padding:0;" @click=${(e) => {
                e.preventDefault();
                if (idx === gauges.length - 1) return;
                const n = structuredClone(gauges);
                const temp = n[idx+1]; n[idx+1] = n[idx]; n[idx] = temp;
                this.commitFn('gauges', n);
              }}>▼</button>
              <button title="Remove" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(e) => { e.preventDefault(); this._removeGauge(idx, gauges); }}>🗑</button>
            </div>
          ` : ''}
        </summary>
        ${this._renderGaugeBody(entry, idx, gauges)}
      </details>
    `;
  }

  /**
   * One gauge's fields, without the panel around them.
   *
   * Its own section renders it inside a `<details>` that names the entry; the
   * canvas editor renders it alone, under the element the user has selected,
   * where the element list above it has already said which gauge this is.
   */
  _renderGaugeBody(entry, idx, gauges) {
    const updateEntry = (key, val) => {
      this.commitFn('gauges', SC.withPatch(gauges, idx, key, val));
    };
    return html`
        <div class="inner-content">
          <div class="fx-slot">
            <sc-fx-glass-panel .hass=${this.hass} .slot=${this.slot} .commitFn=${this.commitFn}
                               .target=${'elm_gauge_' + idx}></sc-fx-glass-panel>
          </div>
          <div class="entity-row" style="margin-bottom: 8px;">
            <label>Data source</label>
            <select style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);" @change=${e => updateEntry('global_id', e.target.value)}>
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

          ${(!entry.global_id || entry.global_id === 'manual') ? html`
            <div style="background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; border:1px solid var(--divider-color,#333); margin-bottom:8px;">
              <div class="entity-row" style="margin-bottom: 8px;">
                <label>Source</label>
                <ha-entity-picker
                  .hass=${this.hass}
                  .allowCustomEntity=${false}
                  .value=${entry.entity || ''}
                  @value-changed=${e => updateEntry('entity', e.detail.value)}
                ></ha-entity-picker>
              </div>

              <div class="entity-row">
                <label>Attribute</label>
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ attribute: { entity_id: entry.entity || this.slot?.entity || '' } }}
                  .value=${entry.gauge_attribute || ''}
                  @value-changed=${e => updateEntry('gauge_attribute', e.detail.value || '')}
                ></ha-selector>
              </div>
            </div>
          ` : ''}

          ${gauges.length > 1 ? html`
            <div class="row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--divider-color,#444);">
              <label>Copy everything from...</label>
              <select style="width: 60%" @change=${e => {
                const srcIdx = parseInt(e.target.value);
                if (isNaN(srcIdx)) return;
                const n = structuredClone(gauges);
                const src = n[srcIdx];
                const currentEntity = n[idx].entity;
                const currentAttr = n[idx].gauge_attribute;
                const currentLabel = n[idx].gauge_label_text;
                n[idx] = { ...src, entity: currentEntity, gauge_attribute: currentAttr, gauge_label_text: currentLabel };
                this.commitFn('gauges', n);
                e.target.value = "";
              }}>
                <option value="" selected disabled>Please select...</option>
                ${gauges.map((g, i) => {
                  if (i === idx) return '';
                  const gName = g.gauge_label_text ? g.gauge_label_text : (g.entity ? g.entity.split('.')[1] : '');
                  return html`<option value=${i}>Gauge ${i+1}${gName ? ' — ' + gName : ''}</option>`;
                })}
              </select>
            </div>
          ` : ''}

          ${this._renderFieldsGroup(STYLE_FIELDS, entry, idx, gauges)}
        </div>`;
  }


  _renderStopsEditor(stopsArray, isAbsolute, onUpdate, resolution) {
    const mStops = Array.isArray(stopsArray) ? stopsArray : [];
    return html`
      <div class="col" style="gap:8px; margin-top:4px;">
        
        <div style="display:flex; gap:8px; margin-bottom:4px;">
          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--primary-color,#03a9f4); background:none; color:var(--primary-color,#03a9f4); cursor:pointer; font-size:12px;" @click=${(e) => {
            e.preventDefault();
            const n = structuredClone(mStops);
            n.forEach(t => t._isOpen = false);

            // Dynamic default color (safe palette)
            const palette = ['#4caf50', '#fdd835', '#fb8c00', '#f44336', '#9c27b0', '#03a9f4'];
            const newColor = palette[n.length % palette.length];

            // Value logic
            let newVal = 0;
            if (n.length > 0) {
              newVal = isAbsolute ? Math.max(...n.map(s => parseFloat(s.value) || 0)) : 100;
            }
            n.push({ value: newVal, color: newColor, _isOpen: true });
            onUpdate(n);
          }}>＋ Add color stop</button>

          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--divider-color,#555); background:none; color:var(--primary-text-color); cursor:pointer; font-size:12px; opacity: ${mStops.length > 1 ? '1' : '0.4'};"
            ?disabled=${mStops.length < 2}
            title="Distributes the colors (for coarse: blocks, for others: gradient points)"
            @click=${(e) => {
            e.preventDefault();
            if (mStops.length < 2) return;
            const n = structuredClone(mStops);
            
            
            const isCoarse = resolution === 'coarse';

            if (!isAbsolute) {
              if (isCoarse) {
                // FORMULA FOR "COARSE": Each block gets equal space (100 / count)
                // Example with 5 colors: 0, 20, 40, 60, 80
                const step = 100 / n.length;
                n.forEach((st, i) => {
                  st.value = Math.round((i * step) * 10) / 10;
                });
              } else {
                // FORMULA FOR EVERYTHING ELSE: start 0, end 100 (100 / (count - 1))
                // Example with 5 colors: 0, 25, 50, 75, 100
                const step = 100 / (n.length - 1);
                n.forEach((st, i) => {
                  st.value = Math.round((i * step) * 10) / 10;
                });
              }
            } else {
              // Absolute mode keeps distributing between the current extreme values
              n.sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0));
              const start = parseFloat(n[0].value) || 0;
              const end = parseFloat(n[n.length - 1].value) || 0;
              if (start !== end) {
                const step = (end - start) / (n.length - 1);
                n.forEach((st, i) => {
                  st.value = Math.round((start + (i * step)) * 10) / 10;
                });
              }
            }
            onUpdate(n);
          }}>⬌ Distribute evenly</button>
        </div>

        ${mStops.map((st, sIdx) => {
          const isOpen = st._isOpen !== false;
          return html`
            <details class="inner-section" style="margin-bottom:0;" 
              ?open=${isOpen} 
              @toggle=${e => {
                if (st._isOpen !== e.target.open) {
                  const n = structuredClone(mStops);
                  n[sIdx]._isOpen = e.target.open;
                  onUpdate(n);
                }
              }}
              @dragstart=${(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('stopIdx', sIdx);
                setTimeout(() => e.target.style.opacity = '0.3', 0);
              }}
              @dragover=${(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                e.currentTarget.style.borderTop = '3px dashed var(--primary-color, #03a9f4)';
              }}
              @dragleave=${(e) => { e.currentTarget.style.borderTop = ''; }}
              @drop=${(e) => {
                e.preventDefault();
                e.currentTarget.style.borderTop = '';
                const draggedIdx = parseInt(e.dataTransfer.getData('stopIdx'));
                if (draggedIdx !== sIdx && !isNaN(draggedIdx)) {
                  const n = structuredClone(mStops);
                  const [movedItem] = n.splice(draggedIdx, 1);
                  n.splice(sIdx, 0, movedItem);
                  onUpdate(n);
                }
              }}
              @dragend=${(e) => {
                e.target.style.opacity = '1';
                e.target.removeAttribute('draggable');
              }}
            >
              <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                  <span
                    style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px; user-select: none;"
                    title="Move stop"
                    @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
                    @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
                  >⋮⋮</span>
                  Stop ${sIdx+1}
                  <span style="font-weight:normal;color:var(--secondary-text-color,#aaa);font-size:11px; margin-left:6px;">[Value: ${st.value ?? 0}]</span>
                  <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${st.color ?? '#03a9f4'}; margin-left:8px; box-shadow: 0 0 2px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2);"></span>
                </div>
                <div style="display:flex; gap:12px; align-items:center;" @click=${e => e.stopPropagation()}>
                  <button title="Remove" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(e) => {
                    e.preventDefault();
                    const n = structuredClone(mStops);
                    n.splice(sIdx, 1);
                    onUpdate(n);
                  }}>🗑</button>
                </div>
              </summary>
              <div class="inner-content" style="padding-top:4px; gap:8px;">
                ${isAbsolute ? html`
                  <div class="row">
                    <label>Threshold (absolute)</label>
                    <input type="number" step="any" style="width:50%" .value=${st.value ?? ''} @input=${e => { const n = structuredClone(mStops); n[sIdx].value = parseFloat(e.target.value); onUpdate(n); }}>
                  </div>
                ` : html`
                  <div class="col">
                    <label>Threshold (%) <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${st.value ?? 0}</span></label>
                    <input type="range" min="0" max="100" step="1" .value=${st.value ?? 0} @input=${e => { const n = structuredClone(mStops); n[sIdx].value = parseFloat(e.target.value); onUpdate(n); }}>
                  </div>
                `}
                <div class="col"><label>Color</label>
                  <div class="color-row">
                    <input type="color" .value=${st.color ?? '#03a9f4'} @input=${e => { const n = structuredClone(mStops); n[sIdx].color = e.target.value; onUpdate(n); }}>
                    <input type="text" .value=${st.color ?? '#03a9f4'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = structuredClone(mStops); n[sIdx].color = e.target.value; onUpdate(n); } }}>
                  </div>
                </div>
              </div>
            </details>
          `;
        })}
      </div>
    `;
  }
  _renderFieldsGroup(fields, entry, idx, gauges) {
    const rootSections = [];
    let currentSection = { isRoot: true, items: [], subsections: [] };
    rootSections.push(currentSection);
    let currentSubsection = null;

    fields.forEach(f => {
      if (f.type === 'section') {
        currentSection = { isRoot: false, title: f.label.replace('── ', ''), items: [], subsections: [] };
        rootSections.push(currentSection);
        currentSubsection = null; 
      } else if (f.type === 'subsection') {
        currentSubsection = { title: f.label.replace('── ', ''), items: [] };
        currentSection.subsections.push(currentSubsection);
      } else {
        if (currentSubsection) {
          currentSubsection.items.push(f);
        } else {
          currentSection.items.push(f);
        }
      }
    });

    const renderItems = (items) => items.map(f => this._renderLitField(f, entry, idx, gauges));
    const cloneableSections = ['Background', 'Color & Gradient', 'Pointer', 'Ticks', 'Sectors (Areas)', 'Value & Labels'];

    return rootSections.map(sec => {
      if (sec.isRoot) {
        return renderItems(sec.items);
      } else {
        const detailKey = `g_${idx}_${sec.title}`;
        if (this._expanded[detailKey] === undefined) this._expanded[detailKey] = false;
        
        return html`
          <details class="inner-section" ?open=${this._expanded[detailKey]} @toggle=${e => this._expanded[detailKey] = e.target.open}>
            <summary style="display:flex; justify-content:space-between; align-items:center;">
              <span style="flex: 1;">${sec.title}</span>
              ${cloneableSections.includes(sec.title) && gauges.length > 1 ? html`
                <select style="width: auto; max-width: 140px; padding: 2px 4px; font-size: 11px; margin-right: 8px; border: 1px solid var(--divider-color, #444); border-radius: 4px; background: rgba(0,0,0,0.2); color: var(--primary-text-color);" @click=${e => e.stopPropagation()} @change=${e => this._cloneSection(idx, parseInt(e.target.value), sec, gauges, e.target)}>
                  <option value="" disabled selected>Copy from...</option>
                  ${gauges.map((g, i) => i !== idx ? html`<option value="${i}">Gauge ${i+1}</option>` : '')}
                </select>
              ` : ''}
              <span style="font-size:10px;">▼</span>
            </summary>
            
            <div class="inner-content">
              ${renderItems(sec.items)}
              
              ${sec.subsections.map(subsec => {
                const subDetailKey = `g_${idx}_${sec.title}_${subsec.title}`;
                if (this._expanded[subDetailKey] === undefined) this._expanded[subDetailKey] = false;
                return html`
                  <details class="inner-section" style="margin-top: 8px; border-color: var(--divider-color, #444); background: rgba(0,0,0,0.15);" ?open=${this._expanded[subDetailKey]} @toggle=${e => this._expanded[subDetailKey] = e.target.open}>
                    <summary style="font-size: 13px; font-weight: 500;">
                      ↳ ${subsec.title}
                      <span style="font-size:10px;">▼</span>
                    </summary>
                    <div class="inner-content">
                      ${renderItems(subsec.items)}
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

  _renderLitField(field, entry, idx, gauges) {
    if (!field) return html``;
    if (field.condition && !field.condition(entry, this.slot)) return html``;

    let content;
    const val = entry[field.id];
    
    const updateDirect = (newVal) => {
      this.commitFn('gauges', SC.withPatch(gauges, idx, field.id, newVal));
    };

    const updateDebounced = (newVal) => {
      const tKey = `${idx}_${field.id}`;
      clearTimeout(this._timeouts[tKey]);
      this._timeouts[tKey] = setTimeout(() => updateDirect(newVal), 250);
    };

    switch (field.type) {
      case 'manual_stops': {
        const isAbsolute = entry.threshold_unit === 'absolute';
        content = html`
          <div class="col" style="gap:8px;">
            <div style="font-size:12px;color:var(--secondary-text-color,#aaa);margin-bottom:4px;line-height:1.3;">
              Tip: thresholds can be given as absolute values or in %.
            </div>
            ${this._renderStopsEditor(val, isAbsolute, (newStops) => {
              this.commitFn('gauges', SC.withPatch(gauges, idx, 'manual_stops', newStops));
            }, entry.gradient_resolution)} </div>
        `;
        break;
      }
      case 'bg_manual_stops': {
        const isAbsolute = entry.bg_threshold_unit === 'absolute';
        content = html`
          <div class="col" style="gap:8px;">
            ${this._renderStopsEditor(val, isAbsolute, (newStops) => {
              this.commitFn('gauges', SC.withPatch(gauges, idx, 'bg_manual_stops', newStops));
            }, entry.gradient_resolution)} </div>
        `;
        break;
      }
      case 'custom_ticks': {
        const cTicks = Array.isArray(val) ? val : [];
        content = html`
          <div class="col" style="gap:8px;">
            ${cTicks.map((ct, ctIdx) => {
              const isOpen = ct._isOpen !== false;
              return html`
                <details class="inner-section" style="margin-bottom:0;" 
                  ?open=${isOpen} 
                  @toggle=${e => {
                    if (ct._isOpen !== e.target.open) {
                      const n = structuredClone(gauges);
                      n[idx].custom_ticks[ctIdx]._isOpen = e.target.open;
                      this.commitFn('gauges', n);
                    }
                  }}
                  @dragstart=${(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('tickIdx', ctIdx);
                    setTimeout(() => e.target.style.opacity = '0.3', 0);
                  }}
                  @dragover=${(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '3px dashed var(--primary-color, #03a9f4)';
                  }}
                  @dragleave=${(e) => e.currentTarget.style.borderTop = ''}
                  @drop=${(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '';
                    const dIdx = parseInt(e.dataTransfer.getData('tickIdx'));
                    if (dIdx !== ctIdx && !isNaN(dIdx)) {
                      const n = structuredClone(gauges);
                      const [moved] = n[idx].custom_ticks.splice(dIdx, 1);
                      n[idx].custom_ticks.splice(ctIdx, 0, moved);
                      this.commitFn('gauges', n);
                    }
                  }}
                  @dragend=${(e) => { e.target.style.opacity = '1'; e.target.removeAttribute('draggable'); }}
                >
                  <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                      <span 
                        style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px;" 
                        @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
                        @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
                      >⋮⋮</span>
                      Tick ${ctIdx+1}
                    </div>
                    <div @click=${e => e.stopPropagation()}>
                      <button title="Remove" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
                        const n = structuredClone(gauges);
                        n[idx].custom_ticks.splice(ctIdx, 1);
                        this.commitFn('gauges', n);
                      }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                  <div class="row">
                    <label>Value on scale</label>
                    <input type="text" style="width:50%" .value=${ct.value ?? ''} @input=${e => {
                        const val = e.target.value.replace(',', '.'); 
                        clearTimeout(this._timeouts['ct_' + idx + '_' + ctIdx]);
                        this._timeouts['ct_' + idx + '_' + ctIdx] = setTimeout(() => {
                        const n = structuredClone(gauges);
                        n[idx].custom_ticks[ctIdx].value = val !== '' ? parseFloat(val) : '';
                        this.commitFn('gauges', n);
                        }, 500);
                    }}>
                  </div>
                    <div class="row"><label>Length</label><input type="range" min="0" max="10" step="0.1" style="width:50%" .value=${ct.length ?? 4} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].length = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Width</label><input type="range" min="0" max="2" step="0.1" style="width:50%" .value=${ct.width ?? 1} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].width = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Offset from ring</label><input type="range" min="-15" max="0" step="0.1" style="width:50%" .value=${ct.offset ?? 0} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].offset = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="col"><label>Color</label>
                      <div class="color-row">
                        <input type="color" .value=${ct.color ?? '#ff0000'} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].color = e.target.value; this.commitFn('gauges', n); }}>
                        <input type="text" .value=${ct.color ?? '#ff0000'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].color = e.target.value; this.commitFn('gauges', n); } }}>
                      </div>
                    </div>
                    <div class="row"><label>Label text</label><input type="text" style="width:50%" .value=${ct.label ?? ''} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].label = e.target.value; this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Label offset</label><input type="range" min="-15" max="4" step="0.1" style="width:50%" .value=${ct.label_offset ?? 10} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].label_offset = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Label size</label><input type="range" min="1" max="20" step="0.1" style="width:50%" .value=${ct.label_font_size ?? 7} @input=${e => { const n = structuredClone(gauges); n[idx].custom_ticks[ctIdx].label_font_size = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                  </div>
                </details>
              `;
            })}
            <button class="add-btn" @click=${() => {
              const n = structuredClone(gauges);
              if (!n[idx].custom_ticks) n[idx].custom_ticks = [];
              n[idx].custom_ticks.push({ value: 0, length: 4, width: 1, offset: 0, color: '#ff0000', label: '', _isOpen: true });
              this.commitFn('gauges', n);
            }}>＋ Add custom tick</button>
          </div>
        `;
        break;
      }
      case 'sectors': {
        const sects = Array.isArray(val) ? val : [];
        content = html`
          <div class="col" style="gap:8px;">
            ${sects.map((sec, sIdx) => {
              const isOpen = sec._isOpen !== false;
              const secPreset = sec.gradient_preset || (sec.use_gradient ? 'classic' : 'none');

              return html`
                <details class="inner-section" style="margin-bottom:0;" 
                  ?open=${isOpen} 
                  @toggle=${e => {
                    if (sec._isOpen !== e.target.open) {
                      const n = structuredClone(gauges);
                      n[idx].sectors[sIdx]._isOpen = e.target.open;
                      this.commitFn('gauges', n);
                    }
                  }}
                  @dragstart=${(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('secIdx', sIdx);
                    setTimeout(() => e.target.style.opacity = '0.3', 0);
                  }}
                  @dragover=${(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '3px dashed var(--primary-color, #03a9f4)';
                  }}
                  @dragleave=${(e) => e.currentTarget.style.borderTop = ''}
                  @drop=${(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderTop = '';
                    const dIdx = parseInt(e.dataTransfer.getData('secIdx'));
                    if (dIdx !== sIdx && !isNaN(dIdx)) {
                      const n = structuredClone(gauges);
                      const [moved] = n[idx].sectors.splice(dIdx, 1);
                      n[idx].sectors.splice(sIdx, 0, moved);
                      this.commitFn('gauges', n);
                    }
                  }}
                  @dragend=${(e) => { e.target.style.opacity = '1'; e.target.removeAttribute('draggable'); }}
                >
                  <summary style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:600;color:var(--primary-color,#03a9f4); flex:1; display:flex; align-items:center;">
                      <span 
                        style="cursor: grab; padding: 0 12px 0 0; color: var(--secondary-text-color, #aaa); font-size: 16px;" 
                        @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
                        @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
                      >⋮⋮</span>
                      Sector ${sIdx+1}
                    </div>
                    <div @click=${e => e.stopPropagation()}>
                      <button title="Remove" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
                        const n = structuredClone(gauges);
                        n[idx].sectors.splice(sIdx, 1);
                        this.commitFn('gauges', n);
                      }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                    <div class="row"><label>Start (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${sec.start_percent ?? 75} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].start_percent = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Length (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${sec.length_percent ?? 25} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].length_percent = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Inner radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${sec.inner_radius ?? 12} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].inner_radius = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Outer radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${sec.outer_radius ?? 22} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].outer_radius = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Opacity</label><input type="range" min="0" max="1" step="0.05" style="width:50%" .value=${sec.opacity ?? 0.85} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].opacity = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>

                    <div style="border-top:1px dashed var(--divider-color,#444); margin:4px 0;"></div>

                    <div class="col"><label>Color (start)</label>
                      <div class="color-row">
                        <input type="color" .value=${sec.color ?? '#dc3232'} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].color = e.target.value; this.commitFn('gauges', n); }}>
                        <input type="text" .value=${sec.color ?? '#dc3232'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = structuredClone(gauges); n[idx].sectors[sIdx].color = e.target.value; this.commitFn('gauges', n); } }}>
                      </div>
                    </div>

                    <div class="row">
                      <label>Gradient</label>
                      <select @change=${e => {
                        const n = structuredClone(gauges);
                        n[idx].sectors[sIdx].gradient_preset = e.target.value;
                        n[idx].sectors[sIdx].use_gradient = (e.target.value === 'classic');
                        this.commitFn('gauges', n);
                      }}>
                        <option value="none" ?selected=${secPreset === 'none'}>Single color</option>
                        <option value="classic" ?selected=${secPreset === 'classic'}>Classic (2 colors)</option>
                        <option value="manual" ?selected=${secPreset === 'manual'}>Manual (list)</option>
                      </select>
                    </div>

                    ${secPreset === 'classic' ? html`
                      <div class="col"><label>Color (end)</label>
                        <div class="color-row">
                          <input type="color" .value=${sec.color_end ?? '#ffeb3b'} @input=${e => { const n = structuredClone(gauges); n[idx].sectors[sIdx].color_end = e.target.value; this.commitFn('gauges', n); }}>
                          <input type="text" .value=${sec.color_end ?? '#ffeb3b'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = structuredClone(gauges); n[idx].sectors[sIdx].color_end = e.target.value; this.commitFn('gauges', n); } }}>
                        </div>
                      </div>
                    ` : ''}

                    ${secPreset !== 'none' ? html`
                      <div class="row" style="margin-top:4px;">
                        <label>Auto resolution (dynamic)</label>
                        <label class="toggle">
                          <input type="checkbox" .checked=${sec.resolution_auto !== false} @change=${e => {
                            const n = structuredClone(gauges);
                            n[idx].sectors[sIdx].resolution_auto = e.target.checked;
                            this.commitFn('gauges', n);
                          }}>
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      ${sec.resolution_auto === false ? html`
                        <div class="row">
                          <label>Manual precision (degrees)</label>
                          <input type="range" min="0.1" max="5" step="0.1" style="width:50%"
                            .value=${sec.resolution ?? 1.5}
                            @input=${e => {
                              const n = structuredClone(gauges);
                              n[idx].sectors[sIdx].resolution = parseFloat(e.target.value);
                              this.commitFn('gauges', n);
                            }}>
                        </div>
                      ` : ''}
                    ` : ''}

                    ${secPreset === 'manual' ? html`
                      <div class="row">
                        <label>Threshold unit</label>
                        <select @change=${e => {
                          const n = structuredClone(gauges);
                          n[idx].sectors[sIdx].threshold_unit = e.target.value;
                          this.commitFn('gauges', n);
                        }}>
                          <option value="percent" ?selected=${(sec.threshold_unit || 'percent') === 'percent'}>Percent (%)</option>
                          <option value="absolute" ?selected=${(sec.threshold_unit || 'percent') === 'absolute'}>Absolute</option>
                        </select>
                      </div>
                      ${this._renderStopsEditor(sec.manual_stops, (sec.threshold_unit || 'percent') === 'absolute', (newStops) => {
                        const n = structuredClone(gauges);
                        n[idx].sectors[sIdx].manual_stops = newStops;
                        this.commitFn('gauges', n);
                      })}
                    ` : ''}

                  </div>
                </details>
              `;
            })}
            <button class="add-btn" @click=${() => {
              const n = structuredClone(gauges);
              if (!n[idx].sectors) n[idx].sectors = [];
              n[idx].sectors.push({ start_percent: 75, length_percent: 25, inner_radius: 12, outer_radius: 22, opacity: 0.85, color: '#dc3232', _isOpen: true });
              this.commitFn('gauges', n);
            }}>＋ Add sector</button>
          </div>
        `;
        break;
      }
      case 'checkbox':
        content = html`
          <div class="row">
            <label>${field.label}</label>
            <label class="toggle">
              <input type="checkbox" .checked=${!!val} @change=${e => updateDirect(e.target.checked)}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        `;
        break;
      case 'color': {
        const hex = val ? (Array.isArray(val) ? '#' + val.map(x => x.toString(16).padStart(2,'0')).join('') : val) : '';
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <div class="color-row">
              <input type="color" .value=${hex} @input=${e => updateDirect(e.target.value)}>
              <input type="text" placeholder=${field.placeholder || '#ffffff'} .value=${hex} @input=${e => {
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateDirect(e.target.value);
              }}>
            </div>
          </div>
        `;
        break;
      }
      case 'select':
        content = html`
          <div class="row">
            <label>${field.label}</label>
            <select @change=${e => updateDirect(e.target.value)}>
              ${(field.options || []).map(o => html`<option value=${o.value} ?selected=${String(val ?? '') === String(o.value)}>${o.label}</option>`)}
            </select>
          </div>
        `;
        break;
      case 'range': {
        // A field's stored unit and the one its slider shows are usually the
        // same, and a field says so by leaving both hooks off. The gauge's zero
        // point is the exception: dial degrees to a person, SVG degrees to the
        // renderer.
        const shown = field.fromStored ? field.fromStored(val) : val;
        const store = v => updateDirect(field.toStored ? field.toStored(v) : v);
        content = html`
          <div class="col">
            <label>${field.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${shown ?? field.placeholder ?? ''}</span></label>
            <input type="range" min=${field.min ?? 0} max=${field.max ?? 100} step=${field.step ?? 1} .value=${shown ?? field.placeholder ?? 0} @input=${e => store(parseFloat(e.target.value))}>
          </div>
        `;
        break;
      }

      case '9-sector':
        const sectors = [
          'top-left',    'top-center',    'top-right',
          'center-left', 'center',        'center-right',
          'bottom-left', 'bottom-center', 'bottom-right'
        ];
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <div class="sector-grid">
              ${sectors.map(s => html`
                <div 
                  class="sector-btn ${val === s ? 'active' : ''}" 
                  title="${s.replace('-', ' ')}"
                  @click=${() => updateDirect(s)}
                ></div>
              `)}
            </div>
          </div>
        `;
        break;

      default:
        content = html`
          <div class="col">
            <label>${field.label}</label>
            <input 
              type=${field.type === 'number' ? 'number' : 'text'} 
              .value=${val ?? ''} 
              placeholder=${field.placeholder || ''} 
              step=${field.step ?? ''} 
              min=${field.min ?? ''} 
              max=${field.max ?? ''} 
              @input=${e => updateDebounced(field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            >
          </div>
        `;
        break;
      
    }

    return html`<div class="field-wrapper">${content}</div>`;
  }
}

if (!customElements.get('sc-gauge-editor')) {
  customElements.define('sc-gauge-editor', ScGaugeEditor);
}

function renderCustomBlock(commitFn, hass, slot) {
    return html`<sc-gauge-editor .commitFn=${commitFn} .hass=${hass} .slot=${slot}></sc-gauge-editor>`;
  }

return /** @type {SupercardModule} */ ({ editorFields, renderCustomBlock, newEntry,
                                        ownedByCanvas: true });

})());