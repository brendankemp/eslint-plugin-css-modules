declare module 'gonzales-pe' {
  interface ParseOptions {
    syntax?: string;
  }

  function parse(css: string, options?: ParseOptions): any;

  export = { parse };
}
