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

    // ── Users Table ──────────────────────────────────────────────────
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        username  TEXT    UNIQUE NOT NULL,
        password  TEXT    NOT NULL,
        email     TEXT,
        avatar    TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Assets Table (accounts) ───────────────────────────────────────
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS assets (
        id           TEXT    PRIMARY KEY,
        user_id      INTEGER NOT NULL,
        username     TEXT    NOT NULL,
        name         TEXT    NOT NULL,
        type         TEXT    NOT NULL,
        balance      REAL    NOT NULL DEFAULT 0,
        currency     TEXT    NOT NULL DEFAULT 'CNY',
        account_number TEXT,
        fund_code    TEXT,
        shares       REAL,
        cost_price   REAL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ── Transactions Table ──────────────────────────────────────────
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER  PRIMARY KEY AUTOINCREMENT,
        asset_id    TEXT     NOT NULL,
        user_id     INTEGER  NOT NULL,
        type        TEXT     NOT NULL,
        amount      REAL     NOT NULL,
        note        TEXT,
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (user_id)  REFERENCES users(id)
      )
    `);

    // ── Migrations (additive, safe) ────────────────────────────────
    const userCols = await sqlite.select<any[]>('PRAGMA table_info(users)');
    const userColNames = userCols.map(c => c.name);

    if (!userColNames.includes('email')) {
      await sqlite.execute('ALTER TABLE users ADD COLUMN email TEXT');
    }

    const assetCols = await sqlite.select<any[]>('PRAGMA table_info(assets)');
    const assetColNames = assetCols.map(c => c.name);

    if (!assetColNames.includes('user_id')) {
      // Add user_id column. For existing rows, try to match by username.
      await sqlite.execute('ALTER TABLE assets ADD COLUMN user_id INTEGER DEFAULT 0');
    }
    if (!assetColNames.includes('shares')) {
      await sqlite.execute('ALTER TABLE assets ADD COLUMN shares REAL');
    }
    if (!assetColNames.includes('cost_price')) {
      await sqlite.execute('ALTER TABLE assets ADD COLUMN cost_price REAL');
    }
    if (!assetColNames.includes('username')) {
      await sqlite.execute('ALTER TABLE assets ADD COLUMN username TEXT NOT NULL DEFAULT ""');
    }

    isInitialized = true;
    return sqlite;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
};
