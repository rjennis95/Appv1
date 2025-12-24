import { openDB, DBSchema } from 'idb';

interface BreadthDB extends DBSchema {
  breadth: {
    key: string; // date string YYYY-MM-DD
    value: {
      date: string;
      value: number; // percentage
    };
  };
  metadata: {
    key: string;
    value: {
        lastUpdated: string;
    }
  }
}

const DB_NAME = 'market-breadth-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<BreadthDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('breadth')) {
        db.createObjectStore('breadth', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });
};

export const getBreadthData = async () => {
  const db = await initDB();
  return db.getAll('breadth');
};

export const saveBreadthData = async (data: { date: string; value: number }[]) => {
  const db = await initDB();
  const tx = db.transaction('breadth', 'readwrite');
  await Promise.all([
    ...data.map(item => tx.store.put(item)),
    tx.done
  ]);
};

export const getLastUpdated = async () => {
    const db = await initDB();
    return db.get('metadata', 'lastUpdated');
};

export const setLastUpdated = async (date: string) => {
    const db = await initDB();
    await db.put('metadata', { key: 'lastUpdated', lastUpdated: date });
};
