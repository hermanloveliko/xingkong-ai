import paramiko, sys, json, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None
from pathlib import Path

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
LOCAL = Path(r"c:\Users\李\Desktop\星空AI\网站\nebula-business-ai---intelligent-enterprise-solutions")
REMOTE = "/var/www/nebula"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
sftp = ssh.open_sftp()

def run(cmd, timeout=20):
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode(errors='replace').strip()

def curl(path, method="GET", data=None, token=None):
    headers = '-H "Content-Type: application/json"'
    if token: headers += f' -H "Authorization: Bearer {token}"'
    body = f"-d '{json.dumps(data)}'" if data else ""
    cmd = f'curl -s -w "\\nHTTP_STATUS:%{{http_code}}" -X {method} {headers} {body} "http://127.0.0.1:4000{path}"'
    out = run(cmd)
    parts = out.rsplit("\nHTTP_STATUS:", 1)
    raw = parts[0].strip()
    status = parts[1].strip() if len(parts) > 1 else "?"
    try: return status, json.loads(raw)
    except: return status, raw

print("[1] 上传修复的 server/index.ts...")
sftp.put(str(LOCAL / "server/index.ts"), f"{REMOTE}/server/index.ts")
print("  uploaded")

print("\n[2] 重启服务...")
run("pm2 restart nebula-api")
time.sleep(5)

print("\n[3] 重新登录测试用户...")
# 重新插入用户（用正确的盐值）
import hashlib
salt = run("grep PASSWORD_SALT /var/www/nebula/.env.local | head -1").split("=",1)[-1].strip()
h = hashlib.sha256(("test123456" + salt).encode()).hexdigest()
create_cmd = (
    f"python3 -c \""
    f"import sqlite3,time; db=sqlite3.connect('/var/www/nebula/data/app.db'); "
    f"db.execute('DELETE FROM users WHERE phone=\\\"13000000001\\\"'); "
    f"db.execute('INSERT INTO users (phone,password,created_at,updated_at) VALUES (\\\"13000000001\\\",\\\"{h}\\\",\\\"2026-01-01\\\",\\\"2026-01-01\\\")'); "
    f"db.commit(); print('ok'); db.close()\""
)
print(run(create_cmd))

s, r = curl("/api/auth/login", "POST", {"phone": "13000000001", "password": "test123456"})
print(f"  登录: HTTP {s}")
token = r.get("token","") if isinstance(r, dict) else ""
if not token:
    print(f"  {r}")

print("\n[4] 测试微信支付...")
if token:
    s, r = curl("/api/pay/create", "POST", {
        "package_type": "VIP1", "months": 1, "amount": 99
    }, token=token)
    print(f"  HTTP {s}: {json.dumps(r, ensure_ascii=False)[:400]}")

    # 查看微信响应日志
    time.sleep(1)
    wx_log = run("pm2 logs nebula-api --lines 20 --nostream 2>/dev/null | grep -A3 'WechatPay' | tail -10")
    print(f"\n  微信日志:\n  {wx_log}")

    if isinstance(r, dict) and r.get("code_url"):
        print(f"\n  [OK] 微信支付正常! code_url 已生成")
    elif isinstance(r, dict) and r.get("error"):
        print(f"\n  [!!] 失败: {r['error']}")
else:
    print("  跳过（登录失败）")

sftp.close()
ssh.close()
