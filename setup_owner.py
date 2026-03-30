#!/usr/bin/env python3
import paramiko, hashlib, re
from io import StringIO

HOST     = '59.110.10.226'
USER     = 'root'
PASSWORD = 'yanis0814YY'

OWNER_PHONE = '18018844437'
OWNER_PASSWORD = '123qweasd'
OWNER_LICENSE_KEY = 'OWNER-LIFETIME-001'
SALT = 'xK9mPq2nL5vR8tY7uW4jH3cB6fD1eA0'

hashed_pw = hashlib.sha256((OWNER_PASSWORD + SALT).encode()).hexdigest()

# 在服务器上运行的脚本内容
remote_script = '''#!/usr/bin/env python3
import sqlite3, re

OWNER_PHONE = "18018844437"
HASHED_PW   = "''' + hashed_pw + '''"
LICENSE_KEY = "OWNER-LIFETIME-001"

# 1. 更新/插入数据库
db_path = "/var/www/nebula/data/app.db"
conn = sqlite3.connect(db_path)
cur  = conn.cursor()

# 先删除使用相同 license_key 的旧记录（避免 UNIQUE 冲突）
cur.execute("DELETE FROM users WHERE license_key = ? AND phone != ?", (LICENSE_KEY, OWNER_PHONE))

cur.execute("""
    INSERT INTO users (phone, password, package_type, license_key, expire_date, is_activated, created_at, updated_at)
    VALUES (?, ?, 'VIP3', ?, '2099-12-31T00:00:00.000Z', 1, datetime('now'), datetime('now'))
    ON CONFLICT(phone) DO UPDATE SET
      password     = excluded.password,
      package_type = 'VIP3',
      license_key  = excluded.license_key,
      expire_date  = '2099-12-31T00:00:00.000Z',
      is_activated = 1,
      updated_at   = datetime('now')
""", (OWNER_PHONE, HASHED_PW, LICENSE_KEY))
conn.commit()

row = cur.execute(
    "SELECT phone, package_type, license_key, expire_date FROM users WHERE phone=?",
    (OWNER_PHONE,)
).fetchone()
conn.close()

if row:
    print(f"[DB OK] phone={row[0]} package={row[1]} key={row[2]} expire={row[3]}")
else:
    print("[DB ERR] 记录未找到!")

# 2. 更新 ADMIN_PHONE
env_path = "/var/www/nebula/.env.local"
with open(env_path) as f:
    content = f.read()

if "ADMIN_PHONE" in content:
    content = re.sub(r"^ADMIN_PHONE=.*$", f"ADMIN_PHONE={OWNER_PHONE}", content, flags=re.MULTILINE)
else:
    content += f"\\nADMIN_PHONE={OWNER_PHONE}\\n"

with open(env_path, "w") as f:
    f.write(content)
print(f"[ENV OK] ADMIN_PHONE 已设为 {OWNER_PHONE}")
'''

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    print("[1/4] 已连接服务器")

    # 上传脚本
    sftp = ssh.open_sftp()
    with sftp.open('/tmp/setup_owner_remote.py', 'w') as f:
        f.write(remote_script)
    sftp.close()
    print("[2/4] 脚本已上传")

    # 执行
    _, stdout, stderr = ssh.exec_command('python3 /tmp/setup_owner_remote.py')
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(f"[3/4] {out}")
    if err: print(f"[3/4] ERR: {err}")

    # 重启服务
    _, stdout, _ = ssh.exec_command('pm2 restart nebula-api 2>&1 | tail -2')
    print(f"[4/4] 重启: {stdout.read().decode(errors='replace').strip()[:80]}")

    ssh.close()
    print("\n=== 完成 ===")
    print(f"手机号: {OWNER_PHONE}")
    print(f"密码:   {OWNER_PASSWORD}")
    print(f"套餐:   VIP3（2099年到期）")
    print(f"激活码: {OWNER_LICENSE_KEY}")
except Exception as e:
    print(f"错误: {e}")
