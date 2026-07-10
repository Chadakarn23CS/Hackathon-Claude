// Minimal ambient types for the plotly dist bundle (no @types/plotly.js dependency).
declare namespace Plotly {
  type Layout = any;
  type Data = any;
  type Config = any;
}
declare module 'plotly.js-dist-min' {
  const Plotly: {
    newPlot: (el: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
    react: (el: HTMLElement, data: any[], layout?: any, config?: any) => Promise<void>;
    purge: (el: HTMLElement) => void;
    [k: string]: any;
  };
  export default Plotly;
}
