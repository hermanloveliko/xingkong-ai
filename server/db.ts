import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_FILE);

// Initialize basic tables for orders and content blocks
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      contact TEXT NOT NULL,
      plan TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sales_id TEXT,
      amount REAL,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      company_name TEXT,
      license_file TEXT,
      activation_code TEXT,
      package_type TEXT,
      expire_date TEXT,
      is_activated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      sales_id TEXT,
      package_type TEXT NOT NULL,
      months INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      used_at TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code_prefix TEXT UNIQUE NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      months INTEGER NOT NULL,
      features TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();

  // Seed default packages if empty
  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get() as { count: number };
  if (packageCount.count === 0) {
    const insert = db.prepare('INSERT INTO packages (name, type, price, months, features, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run('月卡', 'VIP1', 49, 1, '基础功能', now);
    insert.run('季卡', 'VIP2', 129, 3, '基础功能+AI生成', now);
    insert.run('年卡', 'VIP3', 399, 12, '全部功能', now);
    insert.run('终身', 'VIP_MAX', 999, 999, '全部功能+永久更新', now);
  }

  // Seed default sales if empty
  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
  if (salesCount.count === 0) {
    const insert = db.prepare('INSERT INTO sales (name, code_prefix, phone, created_at) VALUES (?, ?, ?, ?)');
    insert.run('直销', 'A001', '', now);
  }

  // Seed some default content if table is empty
  const row = db.prepare('SELECT COUNT(*) as count FROM content_blocks').get() as { count: number };
  if (row.count === 0) {
    const insert = db.prepare('INSERT INTO content_blocks (key, value) VALUES (?, ?)');
    const defaults: Record<string, string> = {
      hero_title: '星空AI - 让开店变得更简单',
      hero_subtitle: '星空AI是一款专门为街边门店打造的智能经营助手，帮你整理数据、分析问题、想营销主意、算工资。',
      pricing_starter_price: '￥49',
      pricing_pro_price: '￥199',
      pricing_enterprise_price: '联系我们',
      download_windows_label: 'Windows 客户端',
      download_macos_label: 'macOS 版本',
      download_linux_label: 'Linux 命令行版',
    };
    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(defaults)) {
        insert.run(key, value);
      }
    });
    transaction();
  }
}

export function getAllContentBlocks(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM content_blocks').all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function upsertContentBlocks(items: { key: string; value: string }[]) {
  const stmt = db.prepare(`
    INSERT INTO content_blocks (key, value)
    VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const tx = db.transaction((blocks: { key: string; value: string }[]) => {
    for (const block of blocks) {
      stmt.run(block);
    }
  });
  tx(items);
}


