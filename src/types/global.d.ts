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
    /** Custom LitElement editor block rendered in the main modular editor. */
    renderCustomBlock?: (
      commitFn: (key: string, value: any) => void,
      hass: any,
      slot: any
    ) => any;
    /** Extra <style> text injected once per render. */
    initCSS?: () => string;
  }

  /** Shared number/color/target helpers, set up once by supercard-01-core.js. */
  interface SupercardUtilsApi {
    safeFloat: (v: any, d: number) => number;
    hexToRgb: (hex: string) => [number, number, number] | null;
    rgbToHex: (r: number, g: number, b: number) => string;
    sampleGradient: (stops: { pos: number; color: string }[], pct: number) => string;
    getAvailableElements: (slot: any) => Record<string, string>;
  }

  interface Window {
    SupercardModules: Record<string, SupercardModule>;
    SupercardUtils: SupercardUtilsApi;
  }
}
