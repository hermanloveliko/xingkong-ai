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
      sales_id INTEGER,
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
      sales_id INTEGER,
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
      password TEXT,
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

  // ── 数据库迁移：为已存在的旧表添加新字段 ──────────────────────────────────
  try { db.exec(`ALTER TABLE sales ADD COLUMN password TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN paid_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN amount REAL`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN sales_id INTEGER`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN months INTEGER DEFAULT 1`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN package_type TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE activation_codes ADD COLUMN user_id INTEGER`); } catch (_) {}
  try { db.exec(`ALTER TABLE activation_codes ADD COLUMN used_at TEXT`); } catch (_) {}
  // users 新字段
  try { db.exec(`ALTER TABLE users ADD COLUMN sales_id INTEGER`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN ai_image_quota INTEGER DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN ai_video_quota INTEGER DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN ai_edit_quota INTEGER DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN quota_reset_date TEXT`); } catch (_) {}
  // 软件授权码：每个用户唯一，首次购买时生成，与手机号绑定
  try { db.exec(`ALTER TABLE users ADD COLUMN license_key TEXT`); } catch (_) {}
  try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_license_key ON users(license_key) WHERE license_key IS NOT NULL`); } catch (_) {}

  const now = new Date().toISOString();

  // Seed default packages if empty
  // 注意：packages.type 有 UNIQUE 约束，每种类型只插一条基础记录
  // 月/季/年付的差异由购买时的 months 字段区分，不在此表区分
  const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get() as { count: number };
  if (packageCount.count === 0) {
    const insert = db.prepare('INSERT INTO packages (name, type, price, months, features, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    // 基础版 VIP1：经营复盘 + 日常管理 + 员工管理（月付基准价）
    insert.run('基础版', 'VIP1',  99,  1, '经营复盘,日常管理,员工管理', now);
    // 专业版 VIP3：全功能解锁（月付基准价；季付¥888，年付¥3388 由前端 months 传递）
    insert.run('专业版', 'VIP3',  299, 1, '经营复盘,日常管理,员工管理,AI营销(生图20/视频15/剪辑15/账号监控),经营分析,财务报税', now);
    // AI 加速包 ADDON：专业版用户叠加购买，+10次/项
    insert.run('AI加速包', 'ADDON', 88, 0, 'AI生图+10次,AI视频+10次,AI剪辑+10次', now);
  }

  // Seed default sales if empty（含默认密码占位，server/index.ts 启动时会补充哈希密码）
  const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
  if (salesCount.count === 0) {
    db.prepare('INSERT INTO sales (name, code_prefix, phone, password, created_at) VALUES (?, ?, ?, ?, ?)').run('直销', 'A001', '', '', now);
  }

  // Seed some default content if table is empty
  const row = db.prepare('SELECT COUNT(*) as count FROM content_blocks').get() as { count: number };
  if (row.count === 0) {
    const insert = db.prepare('INSERT INTO content_blocks (key, value) VALUES (?, ?)');
    const defaults: Record<string, string> = {
      hero_title: '星空AI - 让开店变得更简单',
      hero_subtitle: '星空AI是一款专门为街边门店打造的智能经营助手，帮你整理数据、分析问题、想营销主意、算工资。',
      pricing_basic_price: '99',
      pricing_pro_price: '299',
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
