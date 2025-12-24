import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MarketDB extends DBSchema {
  marketBreadth: {
    key: string;
    value: {
      date: string;
      percentageAbove: number;
    };
  };
  stockState: {
    key: string;
    value: {
      symbol: string;
      lastEma: number;
      date: string;
    };
  };
}

const DB_NAME = 'market-db';
const BREADTH_STORE = 'marketBreadth';
const STATE_STORE = 'stockState';

export const initDB = async (): Promise<IDBPDatabase<MarketDB>> => {
  return openDB<MarketDB>(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(BREADTH_STORE)) {
        db.createObjectStore(BREADTH_STORE, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'symbol' });
      }
    },
  });
};

export const saveMarketBreadth = async (data: { date: string; percentageAbove: number }[]) => {
  const db = await initDB();
  const tx = db.transaction(BREADTH_STORE, 'readwrite');
  const store = tx.objectStore(BREADTH_STORE);
  await Promise.all(data.map(item => store.put(item)));
  await tx.done;
};

export const getMarketBreadth = async () => {
  const db = await initDB();
  return db.getAll(BREADTH_STORE);
};

export const getLastBreadthDate = async (): Promise<string | null> => {
  const db = await initDB();
  const tx = db.transaction(BREADTH_STORE, 'readonly');
  const store = tx.objectStore(BREADTH_STORE);
  const keys = await store.getAllKeys();
  if (keys.length === 0) return null;
  keys.sort();
  return keys[keys.length - 1];
};

export const saveStockState = async (states: { symbol: string; lastEma: number; date: string }[]) => {
  const db = await initDB();
  const tx = db.transaction(STATE_STORE, 'readwrite');
  const store = tx.objectStore(STATE_STORE);
  await Promise.all(states.map(item => store.put(item)));
  await tx.done;
};

export const getStockState = async (symbol: string) => {
  const db = await initDB();
  return db.get(STATE_STORE, symbol);
};

export const getAllStockStates = async () => {
  const db = await initDB();
  return db.getAll(STATE_STORE);
};
