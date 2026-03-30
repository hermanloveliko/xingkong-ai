import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
sftp = ssh.open_sftp()

def run(cmd, timeout=15):
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode(errors='replace').strip()

# 检查 .env.local 里有无 PASSWORD_SALT
print("=== 检查 PASSWORD_SALT ===")
out = run("grep PASSWORD_SALT /var/www/nebula/.env.local 2>/dev/null")
print(f"  .env.local: {out or '（未设置，使用默认值）'}")

# 用服务器上真实的盐值计算哈希
check_script = (
    "import hashlib, os, sqlite3\n"
    "salt = os.environ.get('PASSWORD_SALT', 'nebula_xingkong_2026_salt')\n"
    "print('actual salt:', salt)\n"
    "pw = 'test123456'\n"
    "h = hashlib.sha256((pw + salt).encode()).hexdigest()\n"
    "print('hash:', h)\n"
    "db = sqlite3.connect('/var/www/nebula/data/app.db')\n"
    "db.execute('DELETE FROM users WHERE phone=?', ('13000000001',))\n"
    "import time\n"
    "now = time.strftime('%Y-%m-%dT%H:%M:%S')\n"
    "db.execute('INSERT INTO users (phone, password, created_at, updated_at) VALUES (?,?,?,?)', ('13000000001', h, now, now))\n"
    "db.commit()\n"
    "c = db.cursor()\n"
    "c.execute('SELECT id, phone, password FROM users WHERE phone=?', ('13000000001',))\n"
    "row = c.fetchone()\n"
    "print('db row:', row)\n"
    "db.close()\n"
)
with sftp.open('/tmp/fix_user.py', 'wb') as f:
    f.write(check_script.encode('utf-8'))

# 必须在正确环境下运行（带 dotenv 加载）
# 先直接从 .env.local 取 PASSWORD_SALT
salt_line = run("grep PASSWORD_SALT /var/www/nebula/.env.local 2>/dev/null | head -1")
actual_salt = "nebula_xingkong_2026_salt"
if salt_line and "=" in salt_line:
    actual_salt = salt_line.split("=", 1)[1].strip().strip('"').strip("'")
print(f"  实际盐值: {actual_salt}")

out = run(f"PASSWORD_SALT='{actual_salt}' python3 /tmp/fix_user.py 2>&1")
print(f"  脚本输出: {out}")

# 测试登录
import json
def curl(path, data):
    body = json.dumps(data).replace("'", "'\\''")
    cmd = f"curl -s -X POST -H 'Content-Type: application/json' -d '{body}' http://127.0.0.1:4000{path}"
    return run(cmd)

print("\n=== 测试登录 ===")
r = curl("/api/auth/login", {"phone": "13000000001", "password": "test123456"})
print(f"  登录响应: {r}")
try:
    data = json.loads(r)
    if data.get("token"):
        token = data["token"]
        print(f"  [OK] 登录成功！测试微信支付...")
        pay_body = json.dumps({"package_type": "VIP1", "months": 1, "amount": 98}).replace("'", "'\\''")
        pay_r = run(f"curl -s -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer {token}' -d '{pay_body}' http://127.0.0.1:4000/api/pay/create")
        print(f"\n  微信支付响应: {pay_r[:500]}")
        pay_data = json.loads(pay_r)
        if pay_data.get("code_url"):
            print(f"\n  [OK] 微信支付正常!")
            print(f"  code_url = {pay_data['code_url']}")
        else:
            print(f"\n  [!!] 支付失败: {pay_data.get('error', pay_data)}")
except Exception as e:
    print(f"  解析失败: {e}")

ssh.close()
