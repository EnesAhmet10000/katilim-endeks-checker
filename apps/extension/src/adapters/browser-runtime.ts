/**
 * Unified cross-browser runtime abstraction
 */
export class BrowserRuntime {
  public static getAPI(): typeof chrome {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return chrome;
    }
    // @ts-ignore
    if (typeof browser !== 'undefined' && browser.runtime) {
      // @ts-ignore
      return browser;
    }
    throw new Error('No compatible WebExtension runtime found.');
  }

  public static async sendMessageToTab(tabId: number, message: any): Promise<any> {
    const api = this.getAPI();
    return new Promise((resolve) => {
      api.tabs.sendMessage(tabId, message, (response) => {
        if (api.runtime.lastError) {
          resolve({ error: api.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    });
  }

  public static async getStorage(key: string): Promise<any> {
    const api = this.getAPI();
    return new Promise((resolve) => {
      api.storage.local.get([key], (result) => {
        resolve(result ? result[key] : null);
      });
    });
  }

  public static async setStorage(key: string, value: any): Promise<void> {
    const api = this.getAPI();
    return new Promise((resolve) => {
      api.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
}
