import Dexie, { Table } from 'dexie';

export interface HistoryItem {
  id: string;
  name: string;
  data: ArrayBuffer;
  format: string;
  timestamp: number;
  size: number;
  thumbnail?: string
}

export interface DatabaseConfig {
  name: string;
  version: number;
  stores: {
    history: string;
  };
}

class ModelViewerDatabase extends Dexie {
  history!: Table<HistoryItem>;

  constructor() {
    super('ModelViewerDB');
    
    this.version(1).stores({
      history: 'id, name, format, timestamp, size'
    });
  }
}

class DexieConfig {
  private static instance: DexieConfig;
  private database: ModelViewerDatabase;

  private constructor() {
    this.database = new ModelViewerDatabase();
  }

  public static getInstance(): DexieConfig {
    if (!DexieConfig.instance) {
      DexieConfig.instance = new DexieConfig();
    }
    return DexieConfig.instance;
  }

  public getDatabase(): ModelViewerDatabase {
    return this.database;
  }

  public async isSupported(): Promise<boolean> {
    try {
      console.log('DexieConfig: Checking IndexedDB support...');
      
      if (typeof window === 'undefined') {
        console.log('DexieConfig: Window is undefined');
        return false;
      }
      
      if (!('indexedDB' in window)) {
        console.log('DexieConfig: IndexedDB not in window');
        return false;
      }

      console.log('DexieConfig: Attempting to open database...');
      if (!this.database.isOpen()) {
        await this.database.open();
        console.log('DexieConfig: Database opened successfully');
      } else {
        console.log('DexieConfig: Database already open, testing functionality...');
      }
      
      await this.database.history.limit(0).toArray();
      console.log('DexieConfig: Database functionality test passed');
      
      return true;
    } catch (error) {
      console.warn('DexieConfig: Dexie/IndexedDB is not supported:', error);
      return false;
    }
  }

  public async closeDatabase(): Promise<void> {
    await this.database.close();
  }

  public async deleteDatabase(): Promise<void> {
    await this.database.delete();
  }
}

export const createDexieConfig = (): DexieConfig => {
  return DexieConfig.getInstance();
};

export default DexieConfig;
