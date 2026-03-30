import paramiko, sys, json, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
NEW_KEY = "qaz625QAYzxs7542gsASJUYTRFV673ds"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

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

# 1. 更新 .env.local 里的 API Key
print("[1] 更新 WECHAT_API_KEY...")
run(f"sed -i 's/WECHAT_API_KEY=.*/WECHAT_API_KEY={NEW_KEY}/' /var/www/nebula/.env.local")
new_val = run("grep WECHAT_API_KEY /var/www/nebula/.env.local")
print(f"  {new_val}")

# 2. 同步更新本地 .env.local
print("[2] 重启服务...")
run("pm2 restart nebula-api")
time.sleep(5)

# 3. 登录测试用户
print("[3] 登录...")
s, r = curl("/api/auth/login", "POST", {"phone": "13000000001", "password": "test123456"})
token = r.get("token","") if isinstance(r, dict) else ""
print(f"  HTTP {s} → {'OK' if token else r}")

# 4. 测试微信支付
print("\n[4] 测试微信支付...")
if token:
    s, r = curl("/api/pay/create", "POST", {
        "package_type": "VIP1", "months": 1, "amount": 99
    }, token=token)
    print(f"  HTTP {s}")
    if isinstance(r, dict):
        print(f"  响应: {json.dumps(r, ensure_ascii=False)[:500]}")
    if s == "200" and isinstance(r, dict) and r.get("code_url"):
        print(f"\n  [OK] 微信支付二维码生成成功!")
        print(f"  code_url = {r['code_url']}")
        print(f"  order_id = {r.get('order_id')}")
    else:
        # 看微信日志
        time.sleep(1)
        wx_log = run("pm2 logs nebula-api --lines 10 --nostream 2>/dev/null | grep -E 'WechatPay|pay/create' | tail -5")
        print(f"  微信日志: {wx_log}")

ssh.close()
