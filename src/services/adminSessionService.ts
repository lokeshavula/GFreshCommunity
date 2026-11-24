import { AdminUser } from '../types/gfm';

const CURRENT_ADMIN_KEY = '@gfm_current_admin';

let memoryAdmin: AdminUser | null = null;

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function loadAsyncStorage(): AsyncStorageLike | null {
  const webStorage = typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : null;
  if (webStorage) {
    return {
      getItem: async (key: string) => {
        try {
          return webStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          webStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      removeItem: async (key: string) => {
        try {
          webStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  }

  try {
    const { TurboModuleRegistry } = require('react-native');
    const linked = Boolean(
      TurboModuleRegistry.get('RNCAsyncStorage') ??
        TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage'),
    );
    if (!linked) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-async-storage/async-storage');
    return module.default as AsyncStorageLike;
  } catch {
    return null;
  }
}

export async function saveCurrentAdmin(admin: AdminUser): Promise<void> {
  memoryAdmin = admin;
  const storage = loadAsyncStorage();
  if (!storage) {
    return;
  }
  try {
    await storage.setItem(CURRENT_ADMIN_KEY, JSON.stringify(admin));
  } catch {
    // memory session still works
  }
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  if (memoryAdmin) {
    return memoryAdmin;
  }

  const storage = loadAsyncStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = await storage.getItem(CURRENT_ADMIN_KEY);
    if (!raw) {
      return null;
    }
    memoryAdmin = JSON.parse(raw) as AdminUser;
    return memoryAdmin;
  } catch {
    return null;
  }
}

export async function clearCurrentAdmin(): Promise<void> {
  memoryAdmin = null;
  const storage = loadAsyncStorage();
  if (!storage) {
    return;
  }
  try {
    await storage.removeItem(CURRENT_ADMIN_KEY);
  } catch {
    // ignore
  }
}
