/// <reference types="vite/client" />

interface Chrome {
  storage: {
    sync: {
      get(keys: string[]): Promise<any>;
      set(items: object): Promise<void>;
    };
  };
}

declare const chrome: Chrome;