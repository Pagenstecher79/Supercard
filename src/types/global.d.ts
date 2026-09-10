import type { CSSResult } from 'lit';

export {};

declare global {
  /**
   * The contract a module registered under window.SupercardModules[name]
   * may implement. Every property is optional because each module only
   * implements the pieces it needs (e.g. the debug module has no
   * renderCustomBlock, the layout module has no editorFields).
   */
  interface SupercardModule {
    /** Called on every card render; returns style/DOM fragments to inject. */
    update?: (ctx: {
      stateObj: any;
      stateVal: any;
      val: number;
      isNum: boolean;
      config: any;
      hass: any;
    }) => Record<string, any>;
    /** Called after the shadow DOM has been (re)rendered. */
    onAfterRender?: (shadow: ShadowRoot, config: any, extra?: any) => void;
    /** Declarative field list rendered by the generic module-editor form. */
    editorFields?: () => any[];
    /**
     * Custom LitElement editor block rendered in the main modular editor.
     * `cardConfig` is the whole Lovelace card config, for the few settings
     * that are Home Assistant's rather than ours (`grid_options`); commit
     * those with the `__card__` key.
     */
    renderCustomBlock?: (
      commitFn: (key: string, value: any) => void,
      hass: any,
      slot: any,
      cardConfig?: any
    ) => any;
    /**
     * A fresh, unconfigured entry for this module's list, so that whoever
     * adds one - the module's own editor, or the canvas - gets the same
     * thing. What an entry contains is the module's business.
     */
    newEntry?: () => any;
    /**
     * The canvas editor is where these elements are added and configured, so
     * the module's own section is left out of the main editor on a card that
     * has a canvas. A card still on rows and cells keeps it.
     */
    ownedByCanvas?: boolean;
    /** Extra <style> text injected once per render. */
  }

  /** Shared number/color/target helpers, set up once by supercard-01-core.js. */
  interface SupercardUtilsApi {
    safeFloat: (v: any, d: number) => number;
    hexToRgb: (hex: string) => [number, number, number] | null;
    rgbToHex: (r: number, g: number, b: number) => string;
    /** Reads [r,g,b] arrays, #rgb/#rrggbb and rgb()/rgba(); var() only with resolveVars. */
    toRgb: (value: any, opts?: { resolveVars?: boolean }) => [number, number, number] | null;
    /** Looks up a var(--x) against the document root; anything else passes through. */
    resolveVar: (v: string) => string;
    sampleGradient: (stops: { pos: number; color: string }[], pct: number) => string;
    getAvailableElements: (slot: any) => Record<string, string>;
    /** The gauges and progress bars a slot contains, as {id, label} records. */
    listElements: (slot: any) => {
      gauges: { id: string; label: string }[];
      bars: { id: string; label: string }[];
    };
    /**
     * Whether the card actually draws this element. False only on a canvas
     * card that has no box for the id - there, being absent from the canvas
     * is what "removed" means.
     */
    showsElement: (config: any, id: string) => boolean;
    /**
     * The selector for the shadow part the canvas draws an element in, for a
     * bare element id. Canvas-only: the rows renderer names cells instead.
     */
    canvasPartSelector: (id: string) => string;
    /** Resolves entity/attribute through the global alias list. */
    resolveAlias: (
      list: { id: string; entity: string; attribute: string; alias?: string }[],
      cfg: any,
      entityKey?: string,
      attrKey?: string
    ) => { entity: string; attribute: string; alias: string; match: any };
    /** A copy of `list` with one field of entry `idx` replaced. */
    withPatch: <T>(list: T[], idx: number, key: string, value: any) => T[];
    /**
     * Whether a gauge takes its size from the box it sits in. Always true on a
     * canvas, where the element is the size control; otherwise the gauge's own
     * `gauge_size_responsive`. The renderer and fx-glass must agree on it.
     */
    gaugeIsResponsive: (gaugeConfig: any, onCanvas?: boolean) => boolean;
    /** Shared chrome for the card-list module editors (ha-switch family). */
    editorStyles: CSSResult;
    /** Shared chrome for the compact config forms (.toggle family). */
    formStyles: CSSResult;
  }

  interface Window {
    SupercardModules: Record<string, SupercardModule>;
    SupercardUtils: SupercardUtilsApi;
  }
}
