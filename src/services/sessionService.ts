import { TurboModuleRegistry } from 'react-native';
import { GfmUser } from '../types/gfm';

const CURRENT_USER_KEY = '@gfm_current_user';

let memorySession: GfmUser | null = null;
let asyncStorageChecked = false;
let asyncStorageAvailable = false;

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function isNativeAsyncStorageLinked(): boolean {
  if (asyncStorageChecked) {
    return asyncStorageAvailable;
  }

  asyncStorageChecked = true;

  try {
    asyncStorageAvailable = Boolean(
      TurboModuleRegistry.get('RNCAsyncStorage') ??
        TurboModuleRegistry.get('RNC_AsyncSQLiteDBStorage') ??
        TurboModuleRegistry.get('PlatformLocalStorage'),
    );
  } catch {
    asyncStorageAvailable = false;
  }

  return asyncStorageAvailable;
}

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

  if (!isNativeAsyncStorageLinked()) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('@react-native-async-storage/async-storage');
    return module.default as AsyncStorageLike;
  } catch {
    return null;
  }
}

async function readFromStorage(): Promise<string | null> {
  const storage = loadAsyncStorage();
  if (!storage) {
    return null;
  }

  try {
    return await storage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

async function writeToStorage(value: string): Promise<void> {
  const storage = loadAsyncStorage();
  if (!storage) {
    return;
  }

  try {
    await storage.setItem(CURRENT_USER_KEY, value);
  } catch {
    // ignore — memory session is still active
  }
}

async function removeFromStorage(): Promise<void> {
  const storage = loadAsyncStorage();
  if (!storage) {
    return;
  }

  try {
    await storage.removeItem(CURRENT_USER_KEY);
  } catch {
    // ignore
  }
}

export async function saveCurrentUser(user: GfmUser): Promise<void> {
  memorySession = user;
  await writeToStorage(JSON.stringify(user));
}

export async function getCurrentUser(): Promise<GfmUser | null> {
  if (memorySession) {
    return memorySession;
  }

  const raw = await readFromStorage();
  if (!raw) {
    return null;
  }

  try {
    memorySession = JSON.parse(raw) as GfmUser;
    return memorySession;
  } catch {
    return null;
  }
}

export async function clearCurrentUser(): Promise<void> {
  memorySession = null;
  await removeFromStorage();
}
