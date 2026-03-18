import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
let isInitialized = false;

export const getDb = async () => {
  if (!db) {
    db = await Database.load('sqlite:madcore.db');
  }
  return db;
};

export const initDb = async () => {
  if (isInitialized) return db!;

  try {
    const sqlite = await getDb();

    // Users table
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Assets table
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        currency TEXT NOT NULL,
        account_number TEXT,
        fund_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrations
    const columns = await sqlite.select<any[]>('PRAGMA table_info(assets)');

    // Migration: fund_code
    if (!columns.some(col => col.name === 'fund_code')) {
      await sqlite.execute('ALTER TABLE assets ADD COLUMN fund_code TEXT');
    }

    isInitialized = true;
    return sqlite;
  } catch (err) {
    console.error("Database initialization failed:", err);
    throw err;
  }
};
