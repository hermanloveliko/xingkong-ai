import express from 'express';
import dotenv from 'dotenv';
import { initDb, getAllContentBlocks, upsertContentBlocks, db } from './db';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const app = express();
const PORT = process.env.PORT || 4000;

// Simple CORS middleware (no额外依赖)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

initDb();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-admin-token';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-admin-token'] || req.headers.authorization || '').toString().replace(/^Bearer\s+/i, '');
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Public: get content for frontend
app.get('/api/public/content', (_req, res) => {
  const content = getAllContentBlocks();
  res.json(content);
});

// Public: create order
app.post('/api/orders', (req, res) => {
  const { customer_name, contact, plan, description } = req.body || {};

  if (!customer_name || !contact || !plan) {
    return res.status(400).json({ error: 'customer_name, contact, plan 为必填项' });
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO orders (customer_name, contact, plan, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `);
  const info = stmt.run(customer_name, contact, plan, description || '', now, now);

  res.json({
    id: info.lastInsertRowid,
    status: 'pending',
  });
});

// Admin: login (just validate token)
app.post('/api/admin/login', (req, res) => {
  const { token } = req.body || {};
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '无效的管理令牌' });
  }
  res.json({ success: true });
});

// Admin: get all content blocks
app.get('/api/admin/content', requireAdmin, (_req, res) => {
  const content = getAllContentBlocks();
  res.json(content);
});

// Admin: update/insert content blocks
app.post('/api/admin/content', requireAdmin, (req, res) => {
  const items = req.body?.items as { key: string; value: string }[] | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items 必须为非空数组' });
  }
  const sanitized = items
    .filter((it) => it && typeof it.key === 'string')
    .map((it) => ({ key: it.key, value: String(it.value ?? '') }));

  if (sanitized.length === 0) {
    return res.status(400).json({ error: '无有效内容项' });
  }

  upsertContentBlocks(sanitized);
  res.json({ success: true });
});

// Admin: list orders
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT id, customer_name, contact, plan, description, status, created_at, updated_at FROM orders ORDER BY created_at DESC')
    .all();
  res.json(rows);
});

// Admin: update order status
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: '无效的订单ID' });
  }
  const { status } = req.body || {};
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status 为必填字符串' });
  }
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(status, now, id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '订单不存在' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});


