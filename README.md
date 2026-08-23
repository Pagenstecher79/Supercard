Supercard Core (supercard-core)
A high-performance, GPU-optimized, and modular custom card for the Home Assistant Dashboard built on LitElement. supercard-core combines dynamic vector animations, gauges, progress indicators, and flexible grid layouts within a performant rendering pipeline.
🏗️ System Architecture & Rendering Pipeline
supercard-core uses a strict z-index layer hierarchy to prevent DOM overlay issues and rendering collisions inside the Shadow DOM:
Z-Index Level	Constant ID	Description
0	BG_NATIVE	Native base card container
100	BG_STATIC	Dynamic background layer via pseudo-elements (.bubble-container::before)
500	LAYOUT_GRID	Primary grid system and slot containers
700	ELM_BASE	Base vector elements and SVG render targets
800	ELM_STATIC	Static interaction elements (icons, ticks, sub-buttons)
900	ELM_DYNAMIC	High-priority overlays, gauges, indicators, and animations
DOM & Event Rules for Stable Operation
Pseudo-Element Rendering: Backgrounds are strictly rendered using CSS pseudo-elements (.bubble-container::before). No extra background DIV elements are inserted into the DOM.
Native Background Suppression: The original .bubble-background element is hidden (display: none), giving the custom layer pipeline full control.
Sub-Button Transparency: Sub-buttons and icon containers use explicit transparency (rgba(255, 255, 255, 0.1)) so pulsating warning and alarm backgrounds shine through everywhere.
Explicit State Styling: Text and icon colors are set explicitly via CSS variables for each state (Normal, Warning, Alarm) rather than relying on automatic colors.
Isolated Touch Handling: To prevent overlay bugs, every touch and click event handler calls e.stopPropagation() immediately at the start of the function. This prevents parent containers ("mother cards") from receiving the event and accidentally toggling card states.
⚡ GPU Acceleration Strategy
The rendering engine prioritizes GPU acceleration across all intensive processes while maintaining system stability:
Prioritized Hardware Execution: Shaders, filter operations, and layout transformations are dispatched to the GPU by default rather than forced recklessly.
Layer Isolation: Employs GPU-promoting properties (transform: translate3d(0,0,0) and will-change: transform, opacity) for heavy animations (e.g., Aurora, Mesh, and Fluid effects).
DOM Efficiency: Decouples heavy visual rendering from DOM updates to avoid layout thrashing.
🧩 Module Ecosystem Breakdown
1. Core Module (core)
Entity & Attribute Observer: Real-time monitoring of main entities and specific attributes.
Global Alias Entities (global_entities): Register arbitrary secondary entities referenced across gauges, progress bars, and color triggers.
Responsive Scaling Engine: Utilizes a ResizeObserver to continuously measure component dimensions and calculate the scaling factor (--sc-scale).
2. Color & Animation Module (color)
Background Modes: Solid, Linear Gradient, Radial Gradient, State-Calculated Dynamic Gradient, and Vector Fluid Engine (Aurora, Gooey, Smoke, Particles).
Animation Effects: pulse, pump, ripple, waves, wobble_radial, wobble_linear, and fluid.
3. Progressbar Module (progressbar)
Orientations: Linear (Horizontal / Vertical) and Circular (Donut, Speedo, Half-circle).
Features: Dynamic ticks/subticks, glassmorphism indicator pills (Liquid, Gooey, Clean Frost, Lens), cubic-bezier easing, and rotatable value labels.
4. Gauge Engine Module (gauge)
SVG Dials (360° / 270°): Scalable SVG gauges with spring physics for pointer movement (spring, overshoot, elastic).
Dynamic Range: Auto-scaling (k,M,G), multi-stop threshold gradients, custom sectors, and threshold alert pulsing.
5. Interactive Layout Module (layout)
Multi-Cell Grid System: Includes an inline trackpad canvas with grid-snapping capabilities for precise element placing in slots.
Debug Visualizer: Overlays visual slot borders and element boundaries for real-time layout alignment.
6. Dynamic Labels Module (labels)
Conditional status pills, unit badges, and dynamic icons with customizable alignment and visibility triggers matching entity states (on, off, warning).
📝 YAML Configuration Example
YAML
type: custom:supercard-core
entity: sensor.living_room_temperature
supercard:
  layout_shape: pill
  border_radius: 16
  enable_click: true
  card_height_responsive: true

  # Global Alias Entities
  global_entities:
    - id: ge_humidity
      alias: Humidity
      entity: sensor.living_room_humidity
    - id: ge_power
      alias: Power Usage
      entity: sensor.current_power_usage

  # Color & Background Configuration
  color_active: true
  color_mode: fluid
  fluid_effect: aurora
  gpu_accelerated: true

  # Progressbar Configuration
  progressbar_active: true
  progressbars:
    - global_id: ge_humidity
      orientation: horizontal
      height: "12px"
      fill_color: "var(--sc-state-normal)"
      show_indicator: true
      indicator_glass_effect: glass_gooey

  # Gauge Configuration
  gauge_active: true
  gauges:
    - global_id: ge_power
      type: semi_270
      physics: spring
      min: 0
      max: 3500
      ticks: 5
💻 Developer API: Custom Module Registration
Attach custom modules to the global SupercardModules window object:
JavaScript
window.SupercardModules = window.SupercardModules || {};

window.SupercardModules.customModule = {
  // Triggered on card update cycle
  update({ stateObj, stateVal, val, isNum, config, hass }) {
    return {
      cssVars: {
        "--sc-custom-color": "rgba(255, 255, 255, 0.1)"
      },
      litHtml: html`<div class="custom-slot">Value: ${stateVal}</div>`
    };
  },

  // Event binding with event propagation prevention
  bindEvents(element) {
    element.addEventListener('touchstart', (e) => {
      e.stopPropagation(); // Prevents touch event bubbling to parent card
      // Module touch logic
    }, { passive: true });
  },

  // Called after DOM rendering completes
  onAfterRender(root, config, options) {
    // Shadow DOM interactions
  },

  // Custom CSS injection
  initCSS() {
    return css`
      .custom-slot {
        background: var(--sc-custom-color);
        color: var(--sc-state-normal);
      }
    `;
  },

  // UI Editor configuration controls
  renderCustomBlock(commitFn, hass, slot) {
    return html`<!-- Custom Editor Controls -->`;
  }
};
