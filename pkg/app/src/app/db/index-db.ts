const DB_NAME = 'quizgram-db';
const DB_VERSION = 1;
const STORE_NAME = 'key-value-store';

let dbInstance: IDBDatabase | null = null;

/**
 * Инициализирует IndexedDB и возвращает экземпляр базы данных
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Создаем хранилище объектов, если его еще нет
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: 'key',
        });
        objectStore.createIndex('key', 'key', { unique: true });
      }
    };
  });
}

/**
 * Сохраняет значение по ключу в IndexedDB
 * @param key - Ключ для сохранения
 * @param value - Значение для сохранения (будет сериализовано в JSON)
 * @returns Promise, который разрешается после успешного сохранения
 */
export async function set(key: string, value: unknown): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const item = {
      key,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    };

    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to save value for key: ${key}`));
    };
  });
}

/**
 * Получает значение по ключу из IndexedDB
 * @param key - Ключ для получения значения
 * @returns Promise с десериализованным значением или null, если ключ не найден
 */
export async function get<T = unknown>(key: string): Promise<T | null> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      try {
        const parsedValue = JSON.parse(result.value) as T;
        resolve(parsedValue);
      } catch {
        reject(new Error(`Failed to parse value for key: ${key}`));
      }
    };

    request.onerror = () => {
      reject(new Error(`Failed to get value for key: ${key}`));
    };
  });
}

/**
 * Удаляет значение по ключу из IndexedDB
 * @param key - Ключ для удаления
 * @returns Promise, который разрешается после успешного удаления
 */
export async function remove(key: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete value for key: ${key}`));
    };
  });
}

/**
 * Проверяет, существует ли ключ в IndexedDB
 * @param key - Ключ для проверки
 * @returns Promise с булевым значением, указывающим, существует ли ключ
 */
export async function has(key: string): Promise<boolean> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count(IDBKeyRange.only(key));

    request.onsuccess = () => {
      resolve(request.result > 0);
    };

    request.onerror = () => {
      reject(new Error(`Failed to check key existence: ${key}`));
    };
  });
}

/**
 * Получает все ключи из IndexedDB
 * @returns Promise с массивом всех ключей
 */
export async function keys(): Promise<string[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      resolve(request.result as string[]);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all keys'));
    };
  });
}

/**
 * Очищает все данные из IndexedDB
 * @returns Promise, который разрешается после успешной очистки
 */
export async function clear(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear IndexedDB'));
    };
  });
}
