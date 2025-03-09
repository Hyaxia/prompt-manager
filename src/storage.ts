// Storage wrapper for Chrome extension
const storage = {
  get: async (keys: string[]) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (result) => {
          resolve(result);
        });
      });
    }
    // Fallback to localStorage during development
    const result: any = {};
    keys.forEach((key) => {
      const item = localStorage.getItem(key);
      if (item) {
        result[key] = JSON.parse(item);
      }
    });
    return result;
  },

  set: async (items: object) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.sync.set(items, resolve);
      });
    }
    // Fallback to localStorage during development
    Object.entries(items).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  },
};

export default storage;