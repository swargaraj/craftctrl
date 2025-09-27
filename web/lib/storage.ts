class StorageUtil {
  private memoryStorage = new Map<string, string>();
  private isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
  }

  private checkLocalStorage(): boolean {
    try {
      const testKey = "__storage_test__";
      if (typeof window === "undefined") return false;

      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn("LocalStorage is not available, using memory storage");
      return false;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, value);
      } else {
        this.memoryStorage.set(key, value);
      }
    } catch (error) {
      console.warn("Storage setItem failed, using memory fallback:", error);
      this.memoryStorage.set(key, value);
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.isLocalStorageAvailable) {
        return localStorage.getItem(key);
      } else {
        return this.memoryStorage.get(key) || null;
      }
    } catch (error) {
      console.warn("Storage getItem failed, trying memory:", error);
      return this.memoryStorage.get(key) || null;
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key);
      }
      this.memoryStorage.delete(key);
    } catch (error) {
      console.warn("Storage removeItem failed:", error);
      this.memoryStorage.delete(key);
    }
  }

  clear(): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.clear();
      }
      this.memoryStorage.clear();
    } catch (error) {
      console.warn("Storage clear failed:", error);
      this.memoryStorage.clear();
    }
  }
}

export const storage = new StorageUtil();
