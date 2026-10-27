/* SystemJS module definition */
declare var module: NodeModule;

interface NodeModule {
  id: string;
}

declare var particlesJS: any;

/**
 * ace-builds 未在 package.json 中声明 types 入口（自带的 ace.d.ts 需要 tsconfig paths 映射才能生效，
 * 而 paths 同时会被 webpack 的 TS paths 解析插件读取，把 .d.ts 当模块加载会构建失败），
 * 因此这里只声明编辑器实际用到的 API，替代已停更的 @types/ace。
 */
declare module 'ace-builds' {
  interface AceOptions {
    theme?: string;
    mode?: string;
    fontSize?: string | number;
    showPrintMargin?: boolean;
    tabSize?: number;
    useSoftTabs?: boolean;
    useWorker?: boolean;
    scrollPastEnd?: number;
    readOnly?: boolean;
  }

  interface AceSession {
    setMode(mode: string): void;
    setUseWorker(useWorker: boolean): void;
    getMode(): any;
  }

  interface AceEditor {
    getSession(): AceSession;
    setValue(value: string, cursorPos?: number): void;
    getValue(): string;
    setReadOnly(readOnly: boolean): void;
    setFontSize(size: string | number): void;
    setShowPrintMargin(show: boolean): void;
    setTheme(theme: string): void;
    resize(force?: boolean): void;
    focus(): void;
    destroy(): void;
    [key: string]: any;
  }

  const ace: {
    edit(el: HTMLElement | string | null, options?: AceOptions): AceEditor;
    require(name: string): any;
    define(name: string, deps: string[], factory: (...args: any[]) => any): void;
    config: any;
    version: string;
  };

  export = ace;
}

/* 只有模式文件需要副作用导入，内容由 ace-builds/src-noconflict 提供 */
declare module 'ace-builds/src-noconflict/mode-json';
declare module 'ace-builds/src-noconflict/mode-yaml';
