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
        id              TEXT    PRIMARY KEY,
        user_id         INTEGER NOT NULL,
        username        TEXT    NOT NULL,
        name            TEXT    NOT NULL,
        type            TEXT    NOT NULL,
        balance         REAL    NOT NULL DEFAULT 0,
        currency        TEXT    NOT NULL DEFAULT 'CNY',
        account_number  TEXT,
        fund_code       TEXT,
        shares          REAL,
        cost_price      REAL,
        settlement_days INTEGER DEFAULT 1,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // ── Transactions Table ──────────────────────────────────────────
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id            INTEGER  PRIMARY KEY AUTOINCREMENT,
        asset_id      TEXT     NOT NULL,
        user_id       INTEGER  NOT NULL,
        type          TEXT     NOT NULL,
        amount        REAL     NOT NULL,
        nav           REAL,
        shares_change REAL,
        status        TEXT     NOT NULL DEFAULT 'confirmed',
        confirm_date  TEXT,
        note          TEXT,
        timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        FOREIGN KEY (user_id)  REFERENCES users(id)
      )
    `);

    // ── Watchlist Table ─────────────────────────────────────────────
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id          TEXT    PRIMARY KEY,
        user_id     INTEGER NOT NULL,
        fund_code   TEXT    NOT NULL,
        name        TEXT,
        note        TEXT,
        sim_amount  REAL,
        sim_nav     REAL,
        sim_date    TEXT,
        sim_shares  REAL,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
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
    if (!assetColNames.includes('settlement_days')) {
      await sqlite.execute('ALTER TABLE assets ADD COLUMN settlement_days INTEGER DEFAULT 1');
    }

    const txCols = await sqlite.select<any[]>('PRAGMA table_info(transactions)');
    const txColNames = txCols.map(c => c.name);
    if (!txColNames.includes('nav')) {
      await sqlite.execute('ALTER TABLE transactions ADD COLUMN nav REAL');
    }
    if (!txColNames.includes('shares_change')) {
      await sqlite.execute('ALTER TABLE transactions ADD COLUMN shares_change REAL');
    }
    if (!txColNames.includes('status')) {
      await sqlite.execute('ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT "confirmed"');
    }
    if (!txColNames.includes('confirm_date')) {
      await sqlite.execute('ALTER TABLE transactions ADD COLUMN confirm_date TEXT');
    }

    isInitialized = true;
    return sqlite;
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
};

// Helper: calculate confirm date based on settlement days (skip weekends)
export const calcConfirmDate = (buyDate: string, settlementDays: number): string => {
  const d = new Date(buyDate);
  let added = 0;
  while (added < settlementDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++; // skip weekends
  }
  return d.toISOString().split('T')[0];
};
