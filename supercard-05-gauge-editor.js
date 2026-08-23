import { LitElement, html, css } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

window.SupercardModules = window.SupercardModules || {};
window.SupercardModules['gauge'] = window.SupercardModules['gauge'] || {};

Object.assign(window.SupercardModules['gauge'], (() => {

function editorFields() {}

const STYLE_FIELDS = [
  { id: '_section_shape',      label: '── Form & Position',    type: 'section' },
  { id: 'gauge_type',          label: 'Gauge-Typ',             type: 'select', options: [ { value: 'full', label: 'Full 360°' }, { value: 'semi', label: 'Semi 270°' } ] },
  { id: 'gauge_start_angle',   label: 'Start-Position (0-Punkt)', type: 'select', options: [ { value: '-90', label: 'Oben (12 Uhr)' }, { value: '90', label: 'Unten (6 Uhr)' }, { value: '180', label: 'Links (9 Uhr)' }, { value: '0', label: 'Rechts (3 Uhr)' } ], showIf: { field: 'gauge_type', value: 'full' } },
  { id: 'gauge_scale',         label: 'Skalierung',            type: 'range',    min: 0, max: 1, step: 0.01,  placeholder: '1'  },
  
  { id: 'gauge_position_mode', label: 'Ankerpunkt / Position', type: '9-sector' },
  { id: 'gauge_size_responsive', label: 'Responsive Größe (Auto-Skalierung)', type: 'checkbox' },
  { id: 'gauge_size_px',         label: 'Größe (px)',            type: 'range',    min: 0, max: 600, step: 1, placeholder: '60', showIf: { field: 'gauge_size_responsive', notValue: true } },
  { id: 'gauge_offset_x',      label: 'Offset X (px)',         type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'    },
  { id: 'gauge_offset_y',      label: 'Offset Y (px)',         type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'    },
  
  { id: '_section_frame',           label: '── Rahmen-Ring',               type: 'section'  },
  { id: 'frame_ring_active',        label: 'Rahmen aktiv',                 type: 'checkbox' },
  { id: 'frame_ring_closed',        label: 'Geschlossener Kreis',          type: 'checkbox', showIf: { field: 'frame_ring_active', value: true } },
  { id: 'frame_ring_width',         label: 'Breite',                       type: 'range',    min: 0, max: 3, step: 0.1,  placeholder: '1.5', showIf: { field: 'frame_ring_active', value: true } },
  { id: 'frame_ring_gap',           label: 'Abstand zum Gradientenring',   type: 'range',    min: 0, max: 3, step: 0.1,  placeholder: '1.5', showIf: { field: 'frame_ring_active', value: true } },
  { id: 'frame_ring_color_type',    label: 'Farb-Modus',                   type: 'select',   options: [ { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ], showIf: { field: 'frame_ring_active', value: true } },
  { id: 'frame_ring_color',         label: 'Farbe (Fix)',                  type: 'color',    showIf: [{ field: 'frame_ring_active', value: true }, { field: 'frame_ring_color_type', notValue: 'adaptive' }] },
  { id: 'frame_ring_opacity',       label: 'Deckkraft',                    type: 'range',    min: 0, max: 1, step: 0.01,  placeholder: '1.0', showIf: { field: 'frame_ring_active', value: true } },

  { id: '_section_bg',           label: '── Hintergrund',             type: 'section' },
  { id: 'bg_mode',               label: 'Hintergrund-Modus',          type: 'select', options: [ { value: 'none', label: 'Keiner' }, { value: 'adaptive', label: 'Adaptiv (Theme)' }, { value: 'solid', label: 'Einfarbig' }, { value: 'linear', label: 'Linearer Verlauf' }, { value: 'radial', label: 'Radialer Verlauf' } ] },
  { id: 'bg_gradient_preset',    label: 'Verlaufstyp',                type: 'select', options: [ { value: 'classic', label: 'Klassisch (2 Farben)' }, { value: 'manual', label: 'Manuell (Liste)' } ], showIf: { field: 'bg_mode', value: ['linear','radial'] } },
  { id: 'bg_threshold_unit',     label: 'Schwellen-Einheit',          type: 'select', options: [ { value: 'percent', label: 'Prozent (%)' }, { value: 'absolute', label: 'Absolut' } ], showIf: [{ field: 'bg_mode', value: ['linear','radial'] }, { field: 'bg_gradient_preset', value: 'manual' }] },
  { id: 'bg_opacity',            label: 'Deckkraft',                  type: 'range',    min: 0, max: 1, step: 0.01, placeholder: '1.0' },
  { id: 'bg_color1',             label: 'Farbe 1 (Innen / Start)',    type: 'color',  showIf: [{ field: 'bg_mode', value: ['solid','linear','radial'] }, { field: 'bg_gradient_preset', notValue: 'manual' }] },
  { id: 'bg_color2',             label: 'Farbe 2 (Außen / Ende)',     type: 'color',  showIf: [{ field: 'bg_mode', value: ['linear','radial'] }, { field: 'bg_gradient_preset', notValue: 'manual' }] },
  { id: 'bg_balance',            label: 'Balance (%)',                type: 'range',    min: 0, max: 100, step: 0.1, placeholder: '50', showIf: [{ field: 'bg_mode', value: ['linear','radial'] }, { field: 'bg_gradient_preset', notValue: 'manual' }] },
  { id: 'bg_gradient_angle',     label: 'Winkel (° nur Linear)',      type: 'range',    min: 0, max: 360, step: 1, placeholder: '135', showIf: { field: 'bg_mode', value: 'linear' } },
  { id: 'bg_manual_stops',       type: 'bg_manual_stops', showIf: [{ field: 'bg_mode', value: ['linear','radial'] }, { field: 'bg_gradient_preset', value: 'manual' }] },

  { id: '_section_bg_threshold',          label: '── Hintergrund-Farbe (Schwellwert)', type: 'subsection' },
  { id: 'bg_color_threshold_active',      label: 'Schwellwert aktiv',            type: 'checkbox' },
  { id: 'bg_color_threshold_operator',    label: 'Operator',                     type: 'select', options: [ { value: '>', label: '> Größer' }, { value: '<', label: '< Kleiner' }, { value: '>=', label: '>= Größer gleich' }, { value: '<=', label: '<= Kleiner gleich' }, { value: '==', label: '== Gleich' } ], showIf: { field: 'bg_color_threshold_active', value: true } },
  { id: 'bg_color_threshold_value',       label: 'Schwellwert',                  type: 'number',  placeholder: '80', showIf: { field: 'bg_color_threshold_active', value: true } },
  { id: 'bg_color_threshold_hysteresis',  label: 'Hysterese (%)',                type: 'range', min: 0, max: 10, step: 0.1, placeholder: '5', showIf: { field: 'bg_color_threshold_active', value: true } },
  { id: 'bg_color_threshold_color',       label: 'Neue Hintergrundfarbe',        type: 'color', showIf: { field: 'bg_color_threshold_active', value: true } },
  
  { id: '_section_threshold_anim',          label: '── Threshold-Animation',           type: 'subsection'  },
  { id: 'bg_threshold_anim_active',         label: 'Animation aktiv',                  type: 'checkbox' },
  { id: 'bg_threshold_anim_operator',       label: 'Operator',                         type: 'select',   options: [ { value: '>', label: '> Größer' }, { value: '<', label: '< Kleiner' }, { value: '>=', label: '>= Größer gleich' }, { value: '<=', label: '<= Kleiner gleich' }, { value: '==', label: '== Gleich' } ], showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_anim_value',          label: 'Schwellwert',                      type: 'number',   placeholder: '80',  showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_anim_hysteresis',     label: 'Hysterese (%)',                    type: 'range',    min: 0, max: 10, step: 0.5, placeholder: '5', showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_anim_type',           label: 'Animationstyp',                    type: 'select',   options: [ { value: 'pulse_bg', label: 'Puls — Hintergrund' }, { value: 'pulse_frame', label: 'Puls — Rahmenring' }, { value: 'ripple', label: 'Ripple — Wasserwelle' }, { value: 'waves', label: 'Wellen (Linear wandernd)' }, { value: 'wobble_radial', label: 'Wassertropfen (Radial ausklingend)' }, { value: 'wobble_linear', label: 'Schockwelle (Linear ausklingend)' } ], showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_anim_color',          label: 'Animationsfarbe (C1)',             type: 'color',    showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_anim_color2',         label: 'Animationsfarbe 2 (Tal)',          type: 'color',    showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['waves', 'wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_anim_duration',       label: 'Dauer (s)',                        type: 'number',   step: 0.1, placeholder: '1.5', showIf: { field: 'bg_threshold_anim_active', value: true } },
  { id: 'bg_threshold_wave_count',          label: 'Anzahl (Dichte)',                  type: 'range',    min: 1, max: 20, step: 1, placeholder: '3', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['waves', 'wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_wave_balance',        label: 'Balance (Hügel vs Tal)',           type: 'range',    min: 5, max: 95, step: 1, placeholder: '50', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['waves', 'wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_gradient_angle',      label: 'Winkel (°)',                       type: 'range',    min: 0, max: 360, step: 1, placeholder: '90', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['waves', 'wobble_linear'] }] },
  { id: 'bg_threshold_wobble_amplitude',    label: 'Start-Amplitude (Kontrast)',       type: 'range',    min: 1, max: 100, step: 1, placeholder: '100', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_wobble_freq',         label: 'Reichweite (Ausbreitung)',         type: 'range',    min: 1, max: 10, step: 1, placeholder: '4', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_wobble_pause',        label: 'Pause nach Effekt (Sek.)',         type: 'range',    min: 0, max: 10, step: 0.5, placeholder: '2', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['wobble_radial', 'wobble_linear'] }] },
  { id: 'bg_threshold_anim_ripple_multi',   label: 'Mehrere Ripple-Ringe (3×)',        type: 'checkbox', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: 'ripple' }] },
  { id: 'bg_threshold_anim_ripple_inv',     label: 'Implosion (Richtung umkehren)',    type: 'checkbox', showIf: [{ field: 'bg_threshold_anim_active', value: true }, { field: 'bg_threshold_anim_type', value: ['ripple', 'waves'] }] },

  { id: '_section_data',        label: '── Daten & Skalierung',  type: 'section' },
  { id: 'min',                  label: 'Min-Wert',               type: 'number', placeholder: '0'   },
  { id: 'max',                  label: 'Max-Wert',               type: 'number', placeholder: '100' },
  { id: 'value_autorange',      label: 'Auto-Range',             type: 'checkbox' },
  { id: 'value_autoscale',      label: 'Auto-Scale k/M/G',       type: 'checkbox' },
  { id: 'dynamic_max_scale',    label: 'Dynamischer Max',        type: 'checkbox' },
  { id: 'autoscale_hysteresis', label: 'Hysterese (%)',          type: 'number', placeholder: '10'  },

  { id: '_section_color',    label: '── Farbe & Gradient',   type: 'section' },
  { id: 'stroke_width',        label: 'Ring-Dicke',            type: 'range',    min: 0, max: 5, step: 0.01,  placeholder: '3'    },
  { id: 'gradient_preset',   label: 'Farbmodus',             type: 'select', options: [ { value: 'manual', label: 'Manuell (Liste)' }, { value: 'symmetriccustom', label: 'Symmetrisch (Custom)' }, { value: 'symmetric', label: 'Symmetrisch (Standard)' }, { value: 'linear', label: 'Linear Ampel' } ] },

  { id: 'gradient_mode',     label: 'Verlaufstyp',           type: 'select', options: [ { value: 'smooth', label: 'Smooth' }, { value: 'stepped', label: 'Stepped' } ], showIf: { field: 'gradient_preset', value: ['manual', undefined] } },
  { id: 'gradient_resolution', label: 'Gradientenauflösung', type: 'select', options: [ { value: 'auto', label: 'Automatisch (Größenabhängig)' }, { value: 'coarse', label: 'Grob (1× Farbzonen)' }, { value: 'medium', label: 'Mittel (12× Farbzonen)' }, { value: 'fine', label: 'Fein (24×) — Standard' }, { value: 'superfine', label: 'Superfein (48×)' }, { value: 'ultrafine', label: 'Ultrafein (96×)' }, { value: 'megafine', label: 'Megafein (192×)' }  ]},

  { id: 'threshold_unit',    label: 'Schwellen-Einheit',     type: 'select', options: [ { value: 'percent', label: 'Prozent (%)' }, { value: 'absolute', label: 'Absolut' } ], showIf: { field: 'gradient_preset', value: ['manual', undefined] } },
  { id: 'gradient_start',    label: 'Gradient-Start',        type: 'number', placeholder: 'auto', showIf: { field: 'gradient_preset', value: ['manual', undefined] } },
  { id: 'gradient_end',      label: 'Gradient-Ende',         type: 'number', placeholder: 'auto', showIf: { field: 'gradient_preset', value: ['manual', undefined] } },

  { id: 'manual_stops',      type: 'manual_stops', showIf: { field: 'gradient_preset', value: ['manual', undefined] } },

  { id: 'color1',     label: 'Farbe Außen',    type: 'color',  showIf: { field: 'gradient_preset', value: ['symmetric','symmetriccustom'] } },
  { id: 'color2',     label: 'Farbe Mitte',    type: 'color',  showIf: { field: 'gradient_preset', value: ['symmetric','symmetriccustom'] } },
  { id: 'color3',     label: 'Farbe Zentrum',  type: 'color',  showIf: { field: 'gradient_preset', value: ['symmetric','symmetriccustom'] } },
  { id: 'threshold1', label: 'Übergang Zentrum→Mitte (%)', type: 'range', min: 0, max: 98, step: 1, placeholder: '40', showIf: { field: 'gradient_preset', value: 'symmetriccustom' } },
  { id: 'threshold2', label: 'Übergang Mitte→Außen (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '75', showIf: { field: 'gradient_preset', value: 'symmetriccustom' } },
  { id: 'threshold3', label: 'Gradient-Breite Übergang 1 (%)', type: 'range', min: 0.5, max: 30, step: 0.5, placeholder: '8', showIf: { field: 'gradient_preset', value: 'symmetriccustom' } },
  { id: 'threshold4', label: 'Gradient-Breite Übergang 2 (%)', type: 'range', min: 0.5, max: 30, step: 0.5, placeholder: '8', showIf: { field: 'gradient_preset', value: 'symmetriccustom' } },

  { id: 'color1',     label: 'Farbe Start',    type: 'color',  showIf: { field: 'gradient_preset', value: 'linear' } },
  { id: 'color2',     label: 'Farbe Mitte',    type: 'color',  showIf: { field: 'gradient_preset', value: 'linear' } },
  { id: 'color3',     label: 'Farbe Ende',     type: 'color',  showIf: { field: 'gradient_preset', value: 'linear' } },
  { id: 'threshold1', label: 'Start-Spread (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '20', showIf: { field: 'gradient_preset', value: 'linear' } },
  { id: 'threshold2', label: 'Mid-Spread (%)', type: 'range', min: 0, max: 100, step: 1, placeholder: '60', showIf: { field: 'gradient_preset', value: 'linear' } },
  
  { id: '_section_pointer',       label: '── Zeiger',                  type: 'section' },
  { id: 'pointer_type',           label: 'Zeiger-Form',                type: 'select',  options: [ { value: 'needle', label: 'Nadel' }, { value: 'triangle', label: 'Dreieck' } ] },
  { id: 'pointer_width',          label: 'Zeiger-Breite',              type: 'range',    min: 0, max: 5, step: 0.1,   placeholder: '2'   },
  { id: 'pointer_length',         label: 'Zeiger-Länge',               type: 'range',    min: 0, max: 50, step: 0.1,  placeholder: '10'  },
  { id: 'pointer_offset',         label: 'Zeiger-Offset vom Ring',     type: 'range',    min: -10, max: 10, step: 0.1,  placeholder: '2'   },
  { id: 'pointer_center_radius',  label: 'Mittelpunkt-Größe',          type: 'range',    min: 0, max: 10, step: 0.1, placeholder: '2'   },
  { id: 'pivot_offset_x',         label: 'Pivot Offset X',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'   },
  { id: 'pivot_offset_y',         label: 'Pivot Offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0'  },
  { id: 'pointer_color_type',     label: 'Zeiger-Farb-Modus',          type: 'select',  options: [ { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ] },
  { id: 'pointer_color',          label: 'Zeiger-Farbe (Fix)',         type: 'color',   showIf: { field: 'pointer_color_type', notValue: 'adaptive' } },
  { id: 'pointer_3d_effect',      label: '3D-Effekt (Plastisch)',      type: 'checkbox' },
  { id: 'pointer_dot_color_type', label: 'Punkt-Farb-Modus',           type: 'select',  options: [ { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ] },
  { id: 'pointer_dot_color',      label: 'Punkt-Farbe (Fix)',          type: 'color',   showIf: { field: 'pointer_dot_color_type', notValue: 'adaptive' } },
  { id: 'pointer_shadow_type',    label: 'Zeiger-Schatten',            type: 'select',  options: [ { value: 'none', label: 'Kein' }, { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ] },
  { id: 'pointer_shadow_color',   label: 'Schatten-Farbe',             type: 'color',   showIf: { field: 'pointer_shadow_type', value: 'fixed' } },
  { id: 'pointer_shadow_blur',     label: 'Schatten-Weichzeichnung',   type: 'range', min: 0,  max: 1, step: 0.01,  placeholder: '0.8', showIf: { field: 'pointer_shadow_type', notValue: 'none' } },
  { id: 'pointer_shadow_offset_y', label: 'Schatten-Abstand Y',        type: 'range', min: -5, max: 5, step: 0.1,  placeholder: '0.3', showIf: { field: 'pointer_shadow_type', notValue: 'none' } },
  { id: 'pointer_shadow_opacity',  label: 'Schatten-Deckkraft',        type: 'range', min: 0,  max: 1, step: 0.05, placeholder: '0.4', showIf: { field: 'pointer_shadow_type', notValue: 'none' } },
  { id: 'animation_duration',     label: 'Animations-Dauer (s)',       type: 'range',    min: 0, max: 10, step: 0.1, placeholder: '0.8', showIf: { field: 'animation_easing', notValue: 'spring' } },
  { id: 'animation_spring_duration', label: 'Feder-Animations-Dauer (s)', type: 'range', min: 0.1, max: 10, step: 0.1, placeholder: '1.5', showIf: { field: 'animation_easing', value: 'spring' } },
  { id: 'animation_dynamic_speed',label: 'Dynamische Zeigerbeschleunigung', type: 'checkbox' },
  { id: 'animation_dynamic_speed_invert', label: 'Beschleunigung invertieren (Lange Wege schnell)', type: 'checkbox', showIf: { field: 'animation_dynamic_speed', value: true } },
  { id: 'animation_easing',       label: 'Zeiger-Einpendeln (Easing)', type: 'select', options: [
    { value: 'smooth', label: 'Weich (Standard)' },
    { value: 'overshoot_light', label: 'Leichtes Überschwingen' },
    { value: 'overshoot_medium', label: 'Mittleres Überschwingen' },
    { value: 'overshoot_heavy', label: 'Starkes Überschwingen' },
    { value: 'elastic', label: 'Elastisch (Gummiband)' },
    { value: 'spring', label: 'Physikalische Feder (Multi-Bounce)' }
  ] },
  { id: 'animation_spring_bounces', label: 'Anzahl der Überschwinger', type: 'range', min: 1, max: 10, step: 1, placeholder: '3', showIf: { field: 'animation_easing', value: 'spring' } },
  { id: 'animation_spring_amplitude', label: 'Feder-Amplitude (Intensität %)', type: 'range', min: 0, max: 100, step: 1, placeholder: '50', showIf: { field: 'animation_easing', value: 'spring' } },

  { id: '_section_ticks',           label: '── Ticks',                    type: 'section' },
  { id: 'tick_count',               label: 'Tick-Anzahl',                 type: 'range',    min: 0, max: 50, step: 1,   placeholder: '0'   },
  { id: 'tick_length',              label: 'Tick-Länge',                  type: 'range',    min: 0, max: 6, step: 0.1,   placeholder: '3'   },
  { id: 'tick_width',               label: 'Tick-Breite',                 type: 'range',    min: 0, max: 5, step: 0.1,   placeholder: '1'   },
  { id: 'tick_offset',              label: 'Tick-Offset vom Ring',        type: 'range',    min: -10, max: 10, step: 0.1,   placeholder: '0'   },
  { id: 'tick_color_type',          label: 'Tick-Farb-Modus',             type: 'select',   options: [ { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ] },
  { id: 'tick_color',               label: 'Tick-Farbe (Fix)',            type: 'color',   showIf: { field: 'tick_color_type', notValue: 'adaptive' } },
  
  { id: '_section_sub_ticks',       label: '── SubTicks',                 type: 'subsection' },
  { id: 'sub_tick_count',           label: 'Sub-Tick Anzahl (dazwischen)',type: 'range',    min: 0, max: 10, step: 1,   placeholder: '0'   },
  { id: 'sub_tick_length',          label: 'Sub-Tick Länge',              type: 'range',    min: 0, max: 3, step: 0.1,   placeholder: '1.5' },
  { id: 'sub_tick_width',           label: 'Sub-Tick Breite',             type: 'range',    min: 0, max: 3, step: 0.1,   placeholder: '0.5' },
  { id: 'sub_tick_offset',          label: 'Sub-Tick Offset vom Ring',    type: 'range',    min: -10, max: 10, step: 0.1,   placeholder: '0'   },
  { id: 'sub_tick_color_type',      label: 'Sub-Tick Farb-Modus',         type: 'select',   options: [ { value: 'fixed', label: 'Fix' }, { value: 'adaptive', label: 'Adaptiv' } ] },
  { id: 'sub_tick_color',           label: 'Sub-Tick Farbe (Fix)',        type: 'color',    showIf: { field: 'sub_tick_color_type', notValue: 'adaptive' } },
  
  { id: '_section_ticks_label',     label: '── Tick Label',               type: 'subsection'},
  { id: 'show_tick_labels',         label: 'Tick-Labels anzeigen',        type: 'checkbox' },
  { id: 'tick_label_step',          label: 'Label-Intervall',             type: 'range',    min: 0, max: 10, step: 1,   placeholder: '1',  showIf: { field: 'show_tick_labels', value: true } },
  { id: 'multiplier_divide_ticks',  label: 'Tick-Labels durch Multiplikator teilen', type: 'checkbox', showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_decimals',      label: 'Label-Dezimalstellen',        type: 'range',    min: 0, max: 6, step: 1,   placeholder: '0',  showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_font_size',     label: 'Label-Schriftgröße',          type: 'range',    min: 0, max: 20, step: 0.5, placeholder: '7',  showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_offset',        label: 'Label-Abstand vom Ring',      type: 'range',    min: -15, max: 15, step: 0.1,  placeholder: '-8', showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_spread',        label: 'Spreizung (Kollisionsschutz)', type: 'range',    min: 0, max: 10, step: 0.1,  placeholder: '0'   },
  { id: 'tick_label_extra_length',  label: 'Label-Tick Extra-Länge',      type: 'range',    min: 0, max: 4, step: 0.1,   placeholder: '0',  showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_color_type',    label: 'Label-Farb-Modus',            type: 'select',   options: [ { value: 'adaptive', label: 'Adaptiv' }, { value: 'fixed', label: 'Fix' } ], showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_color',         label: 'Label-Farbe (Fix)',           type: 'color',    showIf: [{ field: 'show_tick_labels', value: true }, { field: 'tick_label_color_type', notValue: 'adaptive' }] },
  { id: 'tick_label_inherit_color', label: 'Farbe von Tick erben',        type: 'checkbox', showIf: { field: 'show_tick_labels', value: true } },
  { id: 'tick_label_crossfade_dur', label: 'Überblendungs-Dauer (s)',     type: 'range',    min: 0, max: 3, step: 0.1, placeholder: '0.4', showIf: { field: 'show_tick_labels', value: true } },

  { id: '_section_custom_ticks',    label: '── Eigene Ticks (Fixpunkte)', type: 'subsection' },
  { id: 'custom_ticks',             type: 'custom_ticks' },

  { id: '_section_sectors',         label: '── Sektoren (Flächen)',       type: 'section' },
  { id: 'sectors',                  type: 'sectors' },

  { id: '_section_labels',        label: '── Wert & Labels',           type: 'section' },
  { id: 'show_value',             label: 'Wert anzeigen',              type: 'checkbox' },
  { id: 'value_font_size',        label: 'Wert-Schriftgröße',          type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '12',  showIf: { field: 'show_value', value: true } },
  { id: 'value_offset_y',         label: 'Wert-Offset Y',              type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  showIf: { field: 'show_value', value: true } },
  { id: 'value_color_type',       label: 'Wert-Farb-Modus',            type: 'select',  options: [ { value: 'adaptive', label: 'Adaptiv' }, { value: 'fixed', label: 'Fix' } ], showIf: { field: 'show_value', value: true } },
  { id: 'value_color',            label: 'Wert-Farbe (Fix)',           type: 'color',   showIf: [{ field: 'show_value', value: true }, { field: 'value_color_type', notValue: 'adaptive' }] },
  { id: 'value_decimals',         label: 'Dezimalstellen',             type: 'range',    min: 0, max: 6, step: 1, placeholder: '0',   showIf: { field: 'show_value', value: true } },
  { id: 'value_show_raw_unit',    label: 'Einheit anzeigen',           type: 'checkbox', showIf: { field: 'show_value', value: true } },
  { id: 'value_replace_unit',     label: 'Original-Einheit ersetzen',  type: 'checkbox', showIf: [{ field: 'show_value', value: true }, { field: 'value_show_raw_unit', value: true }] },
  { id: 'value_custom_unit',      label: 'Eigene Einheit (Suffix)',    type: 'text',     placeholder: 'z.B. W', showIf: [{ field: 'show_value', value: true }, { field: 'value_show_raw_unit', value: true }, { field: 'value_replace_unit', value: true }] },
  
  { id: 'show_scale_label',       label: 'Skalierungs-Label anzeigen', type: 'checkbox' },
  { id: 'scale_label_font_size',  label: 'Label-Schriftgröße',         type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '10',  showIf: { field: 'show_scale_label', value: true } },
  { id: 'scale_label_offset_y',   label: 'Label-Offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', showIf: { field: 'show_scale_label', value: true } },
  { id: 'scale_label_color_type', label: 'Label-Farb-Modus',           type: 'select',  options: [ { value: 'adaptive', label: 'Adaptiv' }, { value: 'fixed', label: 'Fix' } ], showIf: { field: 'show_scale_label', value: true } },
  { id: 'scale_label_color',      label: 'Label-Farbe (Fix)',          type: 'color',   showIf: [{ field: 'show_scale_label', value: true }, { field: 'scale_label_color_type', notValue: 'adaptive' }] },
  { id: 'show_multiplier_label',  label: 'Multiplikator anzeigen',     type: 'checkbox' },
  { id: 'multiplier_divide_ticks',  label: 'Tick-Labels durch Multiplikator teilen', type: 'checkbox', showIf: { field: 'show_tick_labels', value: true } },
  
  { id: 'multiplier_prepend',     label: 'Prefix (z.B. x)',            type: 'text',    placeholder: 'x',   showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_decimals',    label: 'Dezimalstellen',             type: 'number',  placeholder: '0',   showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_font_size',   label: 'Schriftgröße',               type: 'range',    min: 0, max: 20, step: 0.1,  placeholder: '10',  showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_offset_x',    label: 'Offset X',                   type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',   showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_offset_y',    label: 'Offset Y',                   type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0', showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_color_type',  label: 'Farb-Modus',                 type: 'select',  options: [ { value: 'adaptive', label: 'Adaptiv' }, { value: 'fixed', label: 'Fix' } ], showIf: { field: 'show_multiplier_label', value: true } },
  { id: 'multiplier_color',       label: 'Farbe (Fix)',                type: 'color',   showIf: [{ field: 'show_multiplier_label', value: true }, { field: 'multiplier_color_type', notValue: 'adaptive' }] },

  { id: '_section_gauge_label',    label: '── Gauge Label',       type: 'section' },
  { id: 'gauge_label_active',      label: 'Label aktiv',          type: 'checkbox' },
  { id: 'gauge_label_text',        label: 'Label Text',           type: 'text',     placeholder: 'Gauge',  showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_font_size',   label: 'Schriftgröße',         type: 'range',    min: 0, max: 20, step: 0.1,   placeholder: '8',   showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_font_weight', label: 'Gewichtung',           type: 'select',   options: [ { value: '400', label: 'Normal' }, { value: '600', label: 'Semi-Bold' }, { value: '700', label: 'Bold' } ], showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_offset_x',    label: 'Offset X',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_offset_y',    label: 'Offset Y',             type: 'range',    min: -25, max: 25, step: 0.1,  placeholder: '0',  showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_color_type',  label: 'Farb-Modus',           type: 'select',   options: [ { value: 'adaptive', label: 'Adaptiv' }, { value: 'fixed', label: 'Fix' } ], showIf: { field: 'gauge_label_active', value: true } },
  { id: 'gauge_label_color',       label: 'Farbe Fix',            type: 'color',    showIf: { field: 'gauge_label_color_type', value: 'fixed' } }
];

class ScGaugeEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      slot: { type: Object },
      commitFn: { type: Object }
    };
  }

  constructor() {
    super();
    this._openStates = {};
    this._timeouts = {};
  }

  static get styles() {
    return css`
      * { box-sizing: border-box; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .col { display: flex; flex-direction: column; gap: 4px; }
      label { font-size: 13px; color: var(--primary-text-color); }
      input[type="text"], input[type="number"], select { padding: 7px 10px; border: 1px solid var(--divider-color,#444); background: var(--secondary-background-color,#2a2a2a); color: var(--primary-text-color); border-radius: 6px; width: 100%; font-size: 13px; transition: border-color 0.2s; }
      input:focus { border-color: var(--primary-color); outline: none; }
      input[type="color"] { width: 42px; height: 32px; padding: 2px; border-radius: 6px; border: 1px solid var(--divider-color,#444); background: none; cursor: pointer; }
      .color-row { display: flex; align-items: center; gap: 8px; }
      .color-row input[type="text"] { flex: 1; }
      .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: var(--divider-color,#555); border-radius: 20px; cursor: pointer; transition: background 0.2s; }
      .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: transform 0.2s; }
      .toggle input:checked + .toggle-slider { background: var(--primary-color,#03a9f4); }
      .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
      details.inner-section { background: rgba(120,120,120,0.05); border: 1px solid var(--divider-color,#444); border-radius: 6px; margin: 0 16px 16px 16px; }
      details.inner-section summary { padding: 10px 12px; font-weight: 600; font-size: 14px; cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; color: var(--primary-text-color); }
      details.inner-section summary::-webkit-details-marker { display: none; }
      .inner-content { padding: 0 12px 12px 12px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--divider-color,#444); margin-top: 4px; padding-top: 12px; }
      ha-entity-picker, ha-selector { display: block; width: 100%; }
      .entity-row { display: flex; flex-direction: column; gap: 4px; }
      input[type="range"] { width: 100%; accent-color: var(--primary-color,#03a9f4); }
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
    `;
  }

  render() {
    if (!this.slot) return html``;

    const isActive = !!this.slot.gauge_active;
    const gauges = Array.isArray(this.slot.gauges) && this.slot.gauges.length > 0
      ? this.slot.gauges
      : [{ 
          entity: this.slot.gauge_entity_0 || this.slot.entity || '',
          gauge_attribute: this.slot.gauge_attribute_0 || this.slot.gauge_attribute || '',
          inherit: false
        }];

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
                ＋ Gauge hinzufügen
              </button>
            </div>
          ` : ''}
        </div>
      </details>`;
  }

  _addGauge(gauges) {
    const newGauges = JSON.parse(JSON.stringify(gauges));
    newGauges.push({ entity: '', gauge_attribute: '' });
    this._openStates[`gauge_${newGauges.length - 1}`] = true;
    this.commitFn('gauges', newGauges);
  }

  _removeGauge(idx, gauges) {
    const newGauges = JSON.parse(JSON.stringify(gauges));
    newGauges.splice(idx, 1);
    this.commitFn('gauges', newGauges);
  }

  _cloneSection(targetIdx, sourceIdx, sec, gauges, selectEl) {
    if(isNaN(sourceIdx)) return;
    const n = JSON.parse(JSON.stringify(gauges));
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
           tgt[fid] = JSON.parse(JSON.stringify(src[fid])); 
       } else {
           delete tgt[fid]; 
       }
    });
    
    this.commitFn('gauges', n);
    selectEl.value = ""; 
  }

  _renderGaugePanel(entry, idx, gauges) {
    // --- ALIAS TITEL VORSCHAU ---
    let title = entry.name || '';
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

    if (!title && resolvedEntity && this.hass?.states[resolvedEntity]) {
      const s = this.hass.states[resolvedEntity];
      if (isAlias) {
        title = `[${aliasObj.alias || 'Alias'}] ${s.attributes.friendly_name || resolvedEntity}`;
        if (aliasObj.attribute) title += ` (${aliasObj.attribute})`;
      } else {
        title = s.attributes.friendly_name || resolvedEntity;
      }
    } else if (!title) {
      title = isAlias ? `[${aliasObj.alias || 'Alias'}] ${resolvedEntity || 'Unbenannt'}` : `Gauge ${idx + 1}`;
    }
    
    const stateKey = `gauge_${idx}`;
    if (this._openStates[stateKey] === undefined) this._openStates[stateKey] = false;

    const updateEntry = (key, val) => {
      const newGauges = JSON.parse(JSON.stringify(gauges));
      newGauges[idx][key] = val;
      this.commitFn('gauges', newGauges);
    };

    return html`
      <details class="inner-section" 
        ?open=${this._openStates[stateKey]} 
        @toggle=${e => this._openStates[stateKey] = e.target.open}
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
            const n = JSON.parse(JSON.stringify(gauges));
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
              title="Gauge verschieben"
              @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
              @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
            >⋮⋮</span>
            ${title}
          </span>

          ${gauges.length > 1 ? html`
            <div style="display:flex; gap:12px; align-items:center;" @click=${e => e.stopPropagation()}>
              <button title="Nach oben" ?disabled=${idx === 0} style="background:none;border:none;cursor:${idx === 0 ? 'default' : 'pointer'};font-size:14px;color:${idx === 0 ? 'var(--divider-color,#555)' : 'var(--primary-text-color)'};padding:0;" @click=${(e) => {
                e.preventDefault();
                if (idx === 0) return;
                const n = JSON.parse(JSON.stringify(gauges));
                const temp = n[idx-1]; n[idx-1] = n[idx]; n[idx] = temp;
                this.commitFn('gauges', n);
              }}>▲</button>
              <button title="Nach unten" ?disabled=${idx === gauges.length - 1} style="background:none;border:none;cursor:${idx === gauges.length - 1 ? 'default' : 'pointer'};font-size:14px;color:${idx === gauges.length - 1 ? 'var(--divider-color,#555)' : 'var(--primary-text-color)'};padding:0;" @click=${(e) => {
                e.preventDefault();
                if (idx === gauges.length - 1) return;
                const n = JSON.parse(JSON.stringify(gauges));
                const temp = n[idx+1]; n[idx+1] = n[idx]; n[idx] = temp;
                this.commitFn('gauges', n);
              }}>▼</button>
              <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(e) => { e.preventDefault(); this._removeGauge(idx, gauges); }}>🗑</button>
            </div>
          ` : ''}
        </summary>
        
        <div class="inner-content">
          <div class="entity-row" style="margin-bottom: 8px;">
            <label>Datenquelle</label>
            <select style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, #2b2b2b); color: var(--primary-text-color);" @change=${e => updateEntry('global_id', e.target.value)}>
              <option value="manual" ?selected=${entry.global_id === 'manual' || !entry.global_id}>Manuelle Auswahl</option>
              ${(this.slot?.global_entities || []).map(ge => {
                const stateObj = ge.entity ? this.hass.states[ge.entity] : null;
                const name = ge.alias || stateObj?.attributes?.friendly_name || ge.entity || 'Unbenannt';
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
                <label>Quelle</label>
                <ha-entity-picker
                  .hass=${this.hass}
                  .allowCustomEntity=${false}
                  .value=${entry.entity || ''}
                  @value-changed=${e => updateEntry('entity', e.detail.value)}
                ></ha-entity-picker>
              </div>

              <div class="entity-row">
                <label>Attribut</label>
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
              <label>Alles kopieren von...</label>
              <select style="width: 60%" @change=${e => {
                const srcIdx = parseInt(e.target.value);
                if (isNaN(srcIdx)) return;
                const n = JSON.parse(JSON.stringify(gauges));
                const src = n[srcIdx];
                const currentEntity = n[idx].entity;
                const currentAttr = n[idx].gauge_attribute;
                const currentLabel = n[idx].gauge_label_text;
                n[idx] = { ...src, entity: currentEntity, gauge_attribute: currentAttr, gauge_label_text: currentLabel };
                this.commitFn('gauges', n);
                e.target.value = ""; 
              }}>
                <option value="" selected disabled>Bitte wählen...</option>
                ${gauges.map((g, i) => {
                  if (i === idx) return '';
                  const gName = g.gauge_label_text ? g.gauge_label_text : (g.entity ? g.entity.split('.')[1] : '');
                  return html`<option value=${i}>Gauge ${i+1}${gName ? ' — ' + gName : ''}</option>`;
                })}
              </select>
            </div>
          ` : ''}

          ${this._renderFieldsGroup(STYLE_FIELDS, entry, idx, gauges)}
        </div>
      </details>
    `;
  }

  static evalShowIf(spec, entry) {
    if (!spec) return true;
    const conditions = Array.isArray(spec) ? spec : [spec];
    return conditions.every(cond => {
      const act = entry[cond.field];
      if (cond.notValue !== undefined) {
        const nv = cond.notValue;
        return Array.isArray(nv) ? !nv.includes(act) : String(act) !== String(nv);
      }
      const exp = cond.value;
      if (Array.isArray(exp)) return exp.includes(act);
      if (typeof exp === 'boolean') return (act === undefined ? false : Boolean(act)) === exp;
      return String(act) === String(exp);
    });
  }

  _renderStopsEditor(stopsArray, isAbsolute, onUpdate, resolution) {
    const mStops = Array.isArray(stopsArray) ? stopsArray : [];
    return html`
      <div class="col" style="gap:8px; margin-top:4px;">
        
        <div style="display:flex; gap:8px; margin-bottom:4px;">
          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--primary-color,#03a9f4); background:none; color:var(--primary-color,#03a9f4); cursor:pointer; font-size:12px;" @click=${(e) => {
            e.preventDefault();
            const n = JSON.parse(JSON.stringify(mStops));
            n.forEach(t => t._isOpen = false);

            // Dynamische Standard-Farbe (Sichere Palette)
            const palette = ['#4caf50', '#fdd835', '#fb8c00', '#f44336', '#9c27b0', '#03a9f4'];
            const newColor = palette[n.length % palette.length];

            // Wert-Logik
            let newVal = 0;
            if (n.length > 0) {
              newVal = isAbsolute ? Math.max(...n.map(s => parseFloat(s.value) || 0)) : 100;
            }
            n.push({ value: newVal, color: newColor, _isOpen: true });
            onUpdate(n);
          }}>＋ Farbsprung hinzufügen</button>
          
          <button type="button" style="flex:1; padding:6px; border-radius:6px; border:1px dashed var(--divider-color,#555); background:none; color:var(--primary-text-color); cursor:pointer; font-size:12px; opacity: ${mStops.length > 1 ? '1' : '0.4'};" 
            ?disabled=${mStops.length < 2}
            title="Verteilt die Farben (für Grob: Blöcke, für andere: Verlaufspunkte)"
            @click=${(e) => {
            e.preventDefault();
            if (mStops.length < 2) return;
            const n = JSON.parse(JSON.stringify(mStops));
            
            
            const isCoarse = resolution === 'coarse';

            if (!isAbsolute) {
              if (isCoarse) {
                // FORMEL FÜR "GROB": Jeder Block bekommt den gleichen Platz (100 / Anzahl)
                // Beispiel 5 Farben: 0, 20, 40, 60, 80
                const step = 100 / n.length;
                n.forEach((st, i) => {
                  st.value = Math.round((i * step) * 10) / 10;
                });
              } else {
                // DEINE FORMEL FÜR ALLES ANDERE: Start 0, Ende 100 (100 / (Anzahl - 1))
                // Beispiel 5 Farben: 0, 25, 50, 75, 100
                const step = 100 / (n.length - 1);
                n.forEach((st, i) => {
                  st.value = Math.round((i * step) * 10) / 10;
                });
              }
            } else {
              // Absolut-Modus bleibt bei der Verteilung zwischen den aktuellen Extremwerten
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
          }}>⬌ Gleichmäßig verteilen</button>
        </div>

        ${mStops.map((st, sIdx) => {
          const isOpen = st._isOpen !== false;
          return html`
            <details class="inner-section" style="margin-bottom:0;" 
              ?open=${isOpen} 
              @toggle=${e => {
                if (st._isOpen !== e.target.open) {
                  const n = JSON.parse(JSON.stringify(mStops));
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
                  const n = JSON.parse(JSON.stringify(mStops));
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
                    title="Stop verschieben"
                    @mousedown=${(e) => e.target.closest('details').setAttribute('draggable', 'true')}
                    @mouseup=${(e) => e.target.closest('details').removeAttribute('draggable')}
                  >⋮⋮</span>
                  Stop ${sIdx+1} 
                  <span style="font-weight:normal;color:var(--secondary-text-color,#aaa);font-size:11px; margin-left:6px;">[Wert: ${st.value ?? 0}]</span>
                  <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${st.color ?? '#03a9f4'}; margin-left:8px; box-shadow: 0 0 2px rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.2);"></span>
                </div>
                <div style="display:flex; gap:12px; align-items:center;" @click=${e => e.stopPropagation()}>
                  <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);padding:0;" @click=${(e) => {
                    e.preventDefault();
                    const n = JSON.parse(JSON.stringify(mStops));
                    n.splice(sIdx, 1);
                    onUpdate(n);
                  }}>🗑</button>
                </div>
              </summary>
              <div class="inner-content" style="padding-top:4px; gap:8px;">
                ${isAbsolute ? html`
                  <div class="row">
                    <label>Schwellwert (Absolut)</label>
                    <input type="number" step="any" style="width:50%" .value=${st.value ?? ''} @input=${e => { const n = JSON.parse(JSON.stringify(mStops)); n[sIdx].value = parseFloat(e.target.value); onUpdate(n); }}>
                  </div>
                ` : html`
                  <div class="col">
                    <label>Schwellwert (%) <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${st.value ?? 0}</span></label>
                    <input type="range" min="0" max="100" step="1" .value=${st.value ?? 0} @input=${e => { const n = JSON.parse(JSON.stringify(mStops)); n[sIdx].value = parseFloat(e.target.value); onUpdate(n); }}>
                  </div>
                `}
                <div class="col"><label>Farbe</label>
                  <div class="color-row">
                    <input type="color" .value=${st.color ?? '#03a9f4'} @input=${e => { const n = JSON.parse(JSON.stringify(mStops)); n[sIdx].color = e.target.value; onUpdate(n); }}>
                    <input type="text" .value=${st.color ?? '#03a9f4'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = JSON.parse(JSON.stringify(mStops)); n[sIdx].color = e.target.value; onUpdate(n); } }}>
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
    const cloneableSections = ['Hintergrund', 'Farbe & Gradient', 'Zeiger', 'Ticks', 'Sektoren (Flächen)', 'Wert & Labels'];

    return rootSections.map(sec => {
      if (sec.isRoot) {
        return renderItems(sec.items);
      } else {
        const detailKey = `g_${idx}_${sec.title}`;
        if (this._openStates[detailKey] === undefined) this._openStates[detailKey] = false;
        
        return html`
          <details class="inner-section" ?open=${this._openStates[detailKey]} @toggle=${e => this._openStates[detailKey] = e.target.open}>
            <summary style="display:flex; justify-content:space-between; align-items:center;">
              <span style="flex: 1;">${sec.title}</span>
              ${cloneableSections.includes(sec.title) && gauges.length > 1 ? html`
                <select style="width: auto; max-width: 140px; padding: 2px 4px; font-size: 11px; margin-right: 8px; border: 1px solid var(--divider-color, #444); border-radius: 4px; background: rgba(0,0,0,0.2); color: var(--primary-text-color);" @click=${e => e.stopPropagation()} @change=${e => this._cloneSection(idx, parseInt(e.target.value), sec, gauges, e.target)}>
                  <option value="" disabled selected>Kopieren von...</option>
                  ${gauges.map((g, i) => i !== idx ? html`<option value="${i}">Gauge ${i+1}</option>` : '')}
                </select>
              ` : ''}
              <span style="font-size:10px;">▼</span>
            </summary>
            
            <div class="inner-content">
              ${renderItems(sec.items)}
              
              ${sec.subsections.map(subsec => {
                const subDetailKey = `g_${idx}_${sec.title}_${subsec.title}`;
                if (this._openStates[subDetailKey] === undefined) this._openStates[subDetailKey] = false;
                return html`
                  <details class="inner-section" style="margin-top: 8px; border-color: var(--divider-color, #444); background: rgba(0,0,0,0.15);" ?open=${this._openStates[subDetailKey]} @toggle=${e => this._openStates[subDetailKey] = e.target.open}>
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
    if (field.showIf && !ScGaugeEditor.evalShowIf(field.showIf, entry)) return html``;

    let content;
    const val = entry[field.id];
    
    const updateDirect = (newVal) => {
      const newGauges = JSON.parse(JSON.stringify(gauges));
      newGauges[idx][field.id] = newVal;
      this.commitFn('gauges', newGauges);
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
              Tipp: Die Schwellwerte können absolut oder in % angegeben werden.
            </div>
            ${this._renderStopsEditor(val, isAbsolute, (newStops) => {
              const n = JSON.parse(JSON.stringify(gauges));
              n[idx].manual_stops = newStops;
              this.commitFn('gauges', n);
            }, entry.gradient_resolution)} </div>
        `;
        break;
      }
      case 'bg_manual_stops': {
        const isAbsolute = entry.bg_threshold_unit === 'absolute';
        content = html`
          <div class="col" style="gap:8px;">
            ${this._renderStopsEditor(val, isAbsolute, (newStops) => {
              const n = JSON.parse(JSON.stringify(gauges));
              n[idx].bg_manual_stops = newStops;
              this.commitFn('gauges', n);
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
                      const n = JSON.parse(JSON.stringify(gauges));
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
                      const n = JSON.parse(JSON.stringify(gauges));
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
                      <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
                        const n = JSON.parse(JSON.stringify(gauges));
                        n[idx].custom_ticks.splice(ctIdx, 1);
                        this.commitFn('gauges', n);
                      }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                  <div class="row">
                    <label>Wert auf Skala</label>
                    <input type="text" style="width:50%" .value=${ct.value ?? ''} @input=${e => {
                        const val = e.target.value.replace(',', '.'); 
                        clearTimeout(this._timeouts['ct_' + idx + '_' + ctIdx]);
                        this._timeouts['ct_' + idx + '_' + ctIdx] = setTimeout(() => {
                        const n = JSON.parse(JSON.stringify(gauges));
                        n[idx].custom_ticks[ctIdx].value = val !== '' ? parseFloat(val) : '';
                        this.commitFn('gauges', n);
                        }, 500);
                    }}>
                  </div>
                    <div class="row"><label>Länge</label><input type="range" min="0" max="10" step="0.1" style="width:50%" .value=${ct.length ?? 4} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].length = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Breite</label><input type="range" min="0" max="2" step="0.1" style="width:50%" .value=${ct.width ?? 1} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].width = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Offset vom Ring</label><input type="range" min="-15" max="0" step="0.1" style="width:50%" .value=${ct.offset ?? 0} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].offset = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="col"><label>Farbe</label>
                      <div class="color-row">
                        <input type="color" .value=${ct.color ?? '#ff0000'} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].color = e.target.value; this.commitFn('gauges', n); }}>
                        <input type="text" .value=${ct.color ?? '#ff0000'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].color = e.target.value; this.commitFn('gauges', n); } }}>
                      </div>
                    </div>
                    <div class="row"><label>Label Text</label><input type="text" style="width:50%" .value=${ct.label ?? ''} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].label = e.target.value; this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Label Offset</label><input type="range" min="-15" max="4" step="0.1" style="width:50%" .value=${ct.label_offset ?? 10} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].label_offset = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Label Größe</label><input type="range" min="1" max="20" step="0.1" style="width:50%" .value=${ct.label_font_size ?? 7} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].custom_ticks[ctIdx].label_font_size = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                  </div>
                </details>
              `;
            })}
            <button class="add-btn" @click=${() => {
              const n = JSON.parse(JSON.stringify(gauges));
              if (!n[idx].custom_ticks) n[idx].custom_ticks = [];
              n[idx].custom_ticks.push({ value: 0, length: 4, width: 1, offset: 0, color: '#ff0000', label: '', _isOpen: true });
              this.commitFn('gauges', n);
            }}>＋ Custom Tick hinzufügen</button>
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
                      const n = JSON.parse(JSON.stringify(gauges));
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
                      const n = JSON.parse(JSON.stringify(gauges));
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
                      Sektor ${sIdx+1}
                    </div>
                    <div @click=${e => e.stopPropagation()}>
                      <button title="Entfernen" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--error-color,#f44);" @click=${() => {
                        const n = JSON.parse(JSON.stringify(gauges));
                        n[idx].sectors.splice(sIdx, 1);
                        this.commitFn('gauges', n);
                      }}>🗑</button>
                    </div>
                  </summary>
                  <div class="inner-content" style="padding-top:4px; gap:8px;">
                    <div class="row"><label>Start (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${sec.start_percent ?? 75} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].start_percent = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Länge (%)</label><input type="range" min="0" max="100" step="1" style="width:50%" .value=${sec.length_percent ?? 25} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].length_percent = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Innen-Radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${sec.inner_radius ?? 12} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].inner_radius = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Außen-Radius</label><input type="range" min="0" max="50" step="0.1" style="width:50%" .value=${sec.outer_radius ?? 22} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].outer_radius = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    <div class="row"><label>Deckkraft</label><input type="range" min="0" max="1" step="0.05" style="width:50%" .value=${sec.opacity ?? 0.85} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].opacity = parseFloat(e.target.value); this.commitFn('gauges', n); }}></div>
                    
                    <div style="border-top:1px dashed var(--divider-color,#444); margin:4px 0;"></div>
                    
                    <div class="col"><label>Farbe (Start)</label>
                      <div class="color-row">
                        <input type="color" .value=${sec.color ?? '#dc3232'} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].color = e.target.value; this.commitFn('gauges', n); }}>
                        <input type="text" .value=${sec.color ?? '#dc3232'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].color = e.target.value; this.commitFn('gauges', n); } }}>
                      </div>
                    </div>

                    <div class="row">
                      <label>Verlauf (Gradient)</label>
                      <select @change=${e => {
                        const n = JSON.parse(JSON.stringify(gauges));
                        n[idx].sectors[sIdx].gradient_preset = e.target.value;
                        n[idx].sectors[sIdx].use_gradient = (e.target.value === 'classic');
                        this.commitFn('gauges', n);
                      }}>
                        <option value="none" ?selected=${secPreset === 'none'}>Einzelne Farbe</option>
                        <option value="classic" ?selected=${secPreset === 'classic'}>Klassisch (2 Farben)</option>
                        <option value="manual" ?selected=${secPreset === 'manual'}>Manuell (Liste)</option>
                      </select>
                    </div>

                    ${secPreset === 'classic' ? html`
                      <div class="col"><label>Farbe (Ende)</label>
                        <div class="color-row">
                          <input type="color" .value=${sec.color_end ?? '#ffeb3b'} @input=${e => { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].color_end = e.target.value; this.commitFn('gauges', n); }}>
                          <input type="text" .value=${sec.color_end ?? '#ffeb3b'} @input=${e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { const n = JSON.parse(JSON.stringify(gauges)); n[idx].sectors[sIdx].color_end = e.target.value; this.commitFn('gauges', n); } }}>
                        </div>
                      </div>
                    ` : ''}

                    ${secPreset !== 'none' ? html`
                      <div class="row" style="margin-top:4px;">
                        <label>Auto-Auflösung (dynamisch)</label>
                        <label class="toggle">
                          <input type="checkbox" .checked=${sec.resolution_auto !== false} @change=${e => {
                            const n = JSON.parse(JSON.stringify(gauges));
                            n[idx].sectors[sIdx].resolution_auto = e.target.checked;
                            this.commitFn('gauges', n);
                          }}>
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      ${sec.resolution_auto === false ? html`
                        <div class="row">
                          <label>Manuelle Feinheit (Grad)</label>
                          <input type="range" min="0.1" max="5" step="0.1" style="width:50%" 
                            .value=${sec.resolution ?? 1.5} 
                            @input=${e => { 
                              const n = JSON.parse(JSON.stringify(gauges)); 
                              n[idx].sectors[sIdx].resolution = parseFloat(e.target.value); 
                              this.commitFn('gauges', n); 
                            }}>
                        </div>
                      ` : ''}
                    ` : ''}

                    ${secPreset === 'manual' ? html`
                      <div class="row">
                        <label>Schwellen-Einheit</label>
                        <select @change=${e => {
                          const n = JSON.parse(JSON.stringify(gauges));
                          n[idx].sectors[sIdx].threshold_unit = e.target.value;
                          this.commitFn('gauges', n);
                        }}>
                          <option value="percent" ?selected=${(sec.threshold_unit || 'percent') === 'percent'}>Prozent (%)</option>
                          <option value="absolute" ?selected=${(sec.threshold_unit || 'percent') === 'absolute'}>Absolut</option>
                        </select>
                      </div>
                      ${this._renderStopsEditor(sec.manual_stops, (sec.threshold_unit || 'percent') === 'absolute', (newStops) => {
                        const n = JSON.parse(JSON.stringify(gauges));
                        n[idx].sectors[sIdx].manual_stops = newStops;
                        this.commitFn('gauges', n);
                      })}
                    ` : ''}

                  </div>
                </details>
              `;
            })}
            <button class="add-btn" @click=${() => {
              const n = JSON.parse(JSON.stringify(gauges));
              if (!n[idx].sectors) n[idx].sectors = [];
              n[idx].sectors.push({ start_percent: 75, length_percent: 25, inner_radius: 12, outer_radius: 22, opacity: 0.85, color: '#dc3232', _isOpen: true });
              this.commitFn('gauges', n);
            }}>＋ Sektor hinzufügen</button>
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
      case 'range':
        content = html`
          <div class="col">
            <label>${field.label} <span style="float:right;color:var(--primary-color,#03a9f4);font-weight:600;min-width:32px;text-align:right;">${val ?? field.placeholder ?? ''}</span></label>
            <input type="range" min=${field.min ?? 0} max=${field.max ?? 100} step=${field.step ?? 1} .value=${val ?? field.placeholder ?? 0} @input=${e => updateDirect(parseFloat(e.target.value))}>
          </div>
        `;
        break;

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

return { editorFields, renderCustomBlock };

})());