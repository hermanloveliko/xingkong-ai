import paramiko, sys, json, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None
from pathlib import Path

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
BASE = "http://127.0.0.1:4000"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
sftp = ssh.open_sftp()

def run(cmd, timeout=30):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace').strip()
    return out

def curl(path, method="GET", data=None, token=None):
    headers = '-H "Content-Type: application/json"'
    if token: headers += f' -H "Authorization: Bearer {token}"'
    body = f"-d '{json.dumps(data)}'" if data else ""
    cmd = f'curl -s -w "\\nHTTP_STATUS:%{{http_code}}" -X {method} {headers} {body} "{BASE}{path}"'
    out = run(cmd)
    parts = out.rsplit("\nHTTP_STATUS:", 1)
    raw = parts[0].strip()
    status = parts[1].strip() if len(parts) > 1 else "?"
    try: return status, json.loads(raw)
    except: return status, raw

# 上传 Python 脚本到服务器执行（避免SSH引号转义地狱）
setup_script = (
    "import sqlite3, hashlib, time\n"
    "db = sqlite3.connect('/var/www/nebula/data/app.db')\n"
    "c = db.cursor()\n"
    "c.execute('PRAGMA table_info(users)')\n"
    "print('users cols:', [r[1] for r in c.fetchall()])\n"
    "c.execute('PRAGMA table_info(orders)')\n"
    "print('orders cols:', [r[1] for r in c.fetchall()])\n"
    "phone = '13000000001'\n"
    "pw = 'test123456'\n"
    "now = time.strftime('%Y-%m-%dT%H:%M:%S')\n"
    "h = hashlib.sha256((pw + 'nebula_xingkong_2026_salt').encode()).hexdigest()\n"
    "db.execute('DELETE FROM users WHERE phone=?', (phone,))\n"
    "db.execute('INSERT INTO users (phone, password, created_at, updated_at) VALUES (?,?,?,?)', (phone, h, now, now))\n"
    "db.commit()\n"
    "c.execute('SELECT id, phone FROM users WHERE phone=?', (phone,))\n"
    "print('inserted:', c.fetchone())\n"
    "db.close()\n"
).encode('utf-8')

with sftp.open('/tmp/setup_test.py', 'wb') as f:
    f.write(setup_script)

print("="*60)
print(" 星空AI 精准功能检测")
print("="*60)

# ─── 1. 短信服务 ──────────────────────────────────────────────
print("\n【1】短信服务")
out = run("pm2 logs nebula-api --lines 30 --nostream 2>/dev/null | grep SMS | tail -5")
if "发送成功" in out or "✅" in out:
    print(f"  [OK] 短信正常 - PM2日志确认:")
    for line in out.split("\n"):
        if "SMS" in line:
            print(f"      {line.split('|')[-1].strip()}")
else:
    # 测试发送
    s, r = curl("/api/sms/send", "POST", {"phone": "13812345678"})
    out2 = run("pm2 logs nebula-api --lines 5 --nostream 2>/dev/null | grep SMS | tail -2")
    if "发送成功" in out2:
        print(f"  [OK] 短信正常 - 阿里云发送成功")
    else:
        print(f"  HTTP {s}: {r}")

# ─── 2. 创建测试用户 ─────────────────────────────────────────
print("\n【2】注册/登录")
out = run("python3 /tmp/setup_test.py 2>&1")
print(f"  数据库初始化:\n    {out}")

s, r = curl("/api/auth/login", "POST", {"phone": "13000000001", "password": "test123456"})
print(f"  登录: HTTP {s} → {r}")
token = r.get("token", "") if isinstance(r, dict) else ""
if token:
    print(f"  [OK] 登录成功")
    s2, r2 = curl("/api/user/info", token=token)
    print(f"  用户信息: HTTP {s2} → {json.dumps(r2, ensure_ascii=False)[:200]}")
else:
    print("  [!!] 登录失败，检查密码盐值...")
    # 可能密码盐值不同，查一下
    out2 = run("grep -E 'PASSWORD_SALT|salt' /var/www/nebula/server/index.ts 2>/dev/null | head -3")
    print(f"  密码盐值配置: {out2}")

# ─── 3. 微信支付 ─────────────────────────────────────────────
print("\n【3】微信支付")
if token:
    s, r = curl("/api/pay/create", "POST", {
        "package_type": "VIP1",
        "months": 1,
        "amount": 98
    }, token=token)
    print(f"  创建支付订单: HTTP {s}")
    if isinstance(r, dict):
        print(f"  响应: {json.dumps(r, ensure_ascii=False)[:500]}")
    if s == "200" and isinstance(r, dict) and r.get("code_url"):
        print(f"\n  [OK] 微信支付正常!")
        print(f"  code_url = {r['code_url']}")
        print(f"  order_id = {r.get('order_id')}")
    else:
        err = r.get("error", str(r)) if isinstance(r, dict) else str(r)
        print(f"\n  [!!] 失败: {err}")
else:
    print("  跳过（登录失败）")

# ─── 4. 数据库 & 后台 ────────────────────────────────────────
print("\n【4】数据库 & 后台统计")

stats_script = (
    "import sqlite3\n"
    "db = sqlite3.connect('/var/www/nebula/data/app.db')\n"
    "c = db.cursor()\n"
    "c.execute('SELECT COUNT(*) FROM users'); print('users:', c.fetchone()[0])\n"
    "c.execute('SELECT COUNT(*) FROM orders'); print('orders:', c.fetchone()[0])\n"
    "c.execute(\"SELECT COUNT(*) FROM orders WHERE status='paid'\"); print('paid:', c.fetchone()[0])\n"
    "c.execute(\"SELECT SUM(amount) FROM orders WHERE status='paid'\"); r=c.fetchone()[0] or 0; print('revenue:', r)\n"
    "c.execute('SELECT COUNT(*) FROM packages'); print('packages:', c.fetchone()[0])\n"
    "c.execute('SELECT id, phone, package_type, created_at FROM users ORDER BY id DESC LIMIT 3')\n"
    "rows=c.fetchall()\n"
    "if rows: print('recent users:', rows)\n"
    "c.execute('SELECT id, contact, plan, amount, status FROM orders ORDER BY id DESC LIMIT 3')\n"
    "rows=c.fetchall()\n"
    "if rows: print('recent orders:', rows)\n"
    "db.close()\n"
).encode('utf-8')
with sftp.open('/tmp/stats.py', 'wb') as f:
    f.write(stats_script)
out = run("python3 /tmp/stats.py 2>&1")
print(f"  {out}")

# 后台接口权限
s, r = curl("/api/admin/users")
if s == "401":
    print(f"  [OK] 后台接口权限保护正常（401未授权）")
else:
    print(f"  后台接口: HTTP {s}")

# ─── 5. 汇总 ─────────────────────────────────────────────────
print("\n" + "="*60)
print("  最终结果")
print("="*60)
out_sms = run("pm2 logs nebula-api --lines 50 --nostream 2>/dev/null | grep '阿里云发送成功' | wc -l")
print(f"  1. 短信服务:  {'[OK] 正常（Aliyun已发送' + out_sms + '条）' if int(out_sms or 0) > 0 else '[!!] 未确认'}")

sftp.close()
ssh.close()
