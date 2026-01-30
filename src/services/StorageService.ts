export type StorageType = 'local' | 'session';

/**
 * Service for handling client-side storage (localStorage and sessionStorage)
 * with automatic JSON parsing/stringifying and type safety.
 */
export class StorageService {
  /**
   * Get an item from storage
   * @param key The key to retrieve
   * @param type Storage type ('local' or 'session'), defaults to 'local'
   * @returns The parsed value or null if not found
   */
  static getItem<T>(key: string, type: StorageType = 'local'): T | null {
    const storage = type === 'local' ? localStorage : sessionStorage;
    const value = storage.getItem(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error parsing storage item "${key}":`, error);
      return null;
    }
  }

  /**
   * Set an item in storage
   * @param key The key to set
   * @param value The value to store (will be JSON stringified)
   * @param type Storage type ('local' or 'session'), defaults to 'local'
   */
  static setItem<T>(key: string, value: T, type: StorageType = 'local'): void {
    const storage = type === 'local' ? localStorage : sessionStorage;

    try {
      const serializedValue = JSON.stringify(value);
      storage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error setting storage item "${key}":`, error);
    }
  }

  /**
   * Remove an item from storage
   * @param key The key to remove
   * @param type Storage type ('local' or 'session'), defaults to 'local'
   */
  static removeItem(key: string, type: StorageType = 'local'): void {
    const storage = type === 'local' ? localStorage : sessionStorage;
    storage.removeItem(key);
  }

  /**
   * Clear all items from storage
   * @param type Storage type ('local' or 'session'), defaults to 'local'
   */
  static clear(type: StorageType = 'local'): void {
    const storage = type === 'local' ? localStorage : sessionStorage;
    storage.clear();
  }
}
