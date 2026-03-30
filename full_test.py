import paramiko, sys, json, time, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
BASE = "http://127.0.0.1:4000"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd, timeout=30):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace').strip()
    return out

def curl(path, method="GET", data=None, token=None):
    headers = '-H "Content-Type: application/json"'
    if token:
        headers += f' -H "Authorization: Bearer {token}"'
    body = f"-d '{json.dumps(data)}'" if data else ""
    cmd = f'curl -s -w "\\nHTTP_STATUS:%{{http_code}}" -X {method} {headers} {body} "{BASE}{path}"'
    out = run(cmd)
    lines = out.rsplit("\nHTTP_STATUS:", 1)
    raw = lines[0].strip()
    status = lines[1].strip() if len(lines) > 1 else "?"
    try:
        parsed = json.loads(raw)
    except:
        parsed = raw
    return status, parsed

OK = "[OK]"
FAIL = "[!!]"

print("\n" + "="*60)
print(" 星空AI 全功能检测报告")
print("="*60)

# ──────────────────────────────────────────────────────────────
print("\n━━━ 1. 短信服务检测 ━━━")

# 检查环境变量
env_out = run("grep -E 'ALIYUN_SMS|SMS' /var/www/nebula/.env.local 2>/dev/null | grep -v '^#'")
print(f"  .env.local 短信配置:\n    {env_out.replace(chr(10), chr(10)+'    ')}")

# 测试发送（13800138000是虚拟号码，真实SMS会失败但可看错误类型）
status, resp = curl("/api/sms/send", "POST", {"phone": "13812345678"})
print(f"\n  发送验证码接口: HTTP {status}")
if status == "200" and isinstance(resp, dict) and resp.get("success"):
    print(f"  {OK} 短信发送成功！message: {resp.get('message')}")
    sms_result = "正常"
elif status == "500" and isinstance(resp, dict):
    err = resp.get("error", "")
    if "Invalid" in err or "AccessKey" in err or "aliyun" in err.lower() or "签名" in err or "模板" in err:
        print(f"  {FAIL} 阿里云配置有误: {err}")
        sms_result = f"配置错误: {err}"
    elif "未配置" in err or "不可用" in err:
        print(f"  {FAIL} 短信未配置: {err}")
        sms_result = "环境变量未配置"
    else:
        print(f"  {FAIL} 发送失败: {err}")
        sms_result = f"失败: {err}"
elif status == "429":
    print(f"  {OK} 接口正常（频率限制，之前已发过）")
    sms_result = "正常（触发限频）"
else:
    print(f"  响应: {resp}")
    sms_result = f"HTTP {status}"

# ──────────────────────────────────────────────────────────────
print("\n━━━ 2. 注册 / 登录测试 ━━━")
TEST_PHONE = "13999999999"
TEST_PASS  = "Test1234"

# 发送验证码（获取真实code）
s, r = curl("/api/sms/send", "POST", {"phone": TEST_PHONE})
print(f"  发送验证码（{TEST_PHONE}）: HTTP {s} → {r}")

# 从PM2日志里捞验证码
time.sleep(1)
log_out = run("pm2 logs nebula-api --lines 20 --nostream 2>/dev/null | grep -oE 'SMS.*13999999999.*→.*[0-9]{6}|13999999999.*→.*[0-9]{6}' | tail -1")
code_match = re.search(r'→\s*(\d{6})', log_out)
sms_code = code_match.group(1) if code_match else None

if not sms_code:
    # 生产模式不打印，从smsCodes取不到，尝试看error日志
    log_out2 = run("pm2 logs nebula-api --lines 30 --nostream 2>/dev/null | tail -30")
    print(f"  PM2日志片段:\n    {log_out2[:400]}")
    code_m2 = re.search(r'(\d{6})', log_out2)
    sms_code = code_m2.group(1) if code_m2 else "000000"

print(f"  捕获验证码: {sms_code}")

# 先删除测试用户（如果存在）
run(f"python3 -c \"import sqlite3; db=sqlite3.connect('/var/www/nebula/data/app.db'); db.execute(\\\"DELETE FROM users WHERE phone='{TEST_PHONE}'\\\"); db.commit(); db.close()\"")

# 注册
s, r = curl("/api/auth/register", "POST", {"phone": TEST_PHONE, "password": TEST_PASS, "smsCode": sms_code})
print(f"  注册: HTTP {s} → {r}")
token = r.get("token", "") if isinstance(r, dict) else ""

if not token:
    # 尝试不用短信验证登录（如果是旧用户）
    s, r = curl("/api/auth/login", "POST", {"phone": TEST_PHONE, "password": TEST_PASS})
    print(f"  登录: HTTP {s} → {r}")
    token = r.get("token", "") if isinstance(r, dict) else ""

if token:
    print(f"  {OK} 登录成功，token={token[:20]}...")
    # 获取用户信息
    s, r = curl("/api/user/info", token=token)
    print(f"  用户信息: HTTP {s} → {json.dumps(r, ensure_ascii=False)[:150]}")
    if s == "200":
        print(f"  {OK} 用户信息接口正常")
    auth_result = "正常"
else:
    print(f"  {FAIL} 注册/登录失败")
    auth_result = "失败"

# ──────────────────────────────────────────────────────────────
print("\n━━━ 3. 微信支付检测 ━━━")

if token:
    # 检查微信配置
    wx_env = run("grep -E 'WECHAT|MCH|APPID|API_KEY|NOTIFY' /var/www/nebula/.env.local 2>/dev/null | grep -v '^#'")
    print(f"  微信配置:\n    {wx_env.replace(chr(10), chr(10)+'    ')}")

    s, r = curl("/api/pay/create", "POST", {
        "package_id": 1,
        "package_name": "基础版",
        "amount": 1
    }, token=token)
    print(f"\n  创建支付订单: HTTP {s}")
    if isinstance(r, dict):
        print(f"  响应: {json.dumps(r, ensure_ascii=False)[:400]}")

    if s == "200" and isinstance(r, dict) and r.get("code_url"):
        code_url = r["code_url"]
        print(f"\n  {OK} 微信支付二维码生成成功!")
        print(f"  code_url = {code_url}")
        print(f"  order_id = {r.get('order_id')}")
        wechat_result = "正常 - 二维码已生成"
        pay_order_id = r.get("order_id")
    else:
        err = r.get("error", r.get("msg", str(r))) if isinstance(r, dict) else str(r)
        print(f"\n  {FAIL} 支付失败: {err}")
        wechat_result = f"失败: {err[:100]}"
        pay_order_id = None
else:
    print("  跳过（登录失败）")
    wechat_result = "跳过"
    pay_order_id = None

# ──────────────────────────────────────────────────────────────
print("\n━━━ 4. 后台数据统计检测 ━━━")

# 直接查数据库
db_stats = run("""python3 -c "
import sqlite3
db = sqlite3.connect('/var/www/nebula/data/app.db')
c = db.cursor()

c.execute(\"SELECT COUNT(*) FROM users\")
users_count = c.fetchone()[0]

c.execute(\"SELECT COUNT(*) FROM orders\")
orders_total = c.fetchone()[0]

c.execute(\"SELECT COUNT(*) FROM orders WHERE status='paid'\")
orders_paid = c.fetchone()[0]

c.execute(\"SELECT COUNT(*) FROM orders WHERE status='pending'\")
orders_pending = c.fetchone()[0]

c.execute(\"SELECT SUM(amount) FROM orders WHERE status='paid'\")
revenue = c.fetchone()[0] or 0

c.execute(\"SELECT COUNT(*) FROM packages\")
pkg_count = c.fetchone()[0]

c.execute(\"PRAGMA table_info(users)\")
user_cols = [r[1] for r in c.fetchall()]

print(f'users={users_count}')
print(f'orders_total={orders_total}')
print(f'orders_paid={orders_paid}')
print(f'orders_pending={orders_pending}')
print(f'revenue={revenue}')
print(f'packages={pkg_count}')
print(f'user_columns={user_cols}')
db.close()
" 2>&1""")
print(f"  数据库统计:\n    {db_stats.replace(chr(10), chr(10)+'    ')}")

# 检查后台API（需要admin token）
s, r = curl("/api/admin/users", "GET")
print(f"\n  后台用户列表 (未登录): HTTP {s} → {str(r)[:80]}")

s, r = curl("/api/admin/orders", "GET")
print(f"  后台订单列表 (未登录): HTTP {s} → {str(r)[:80]}")

if s in ["401", "403"]:
    print(f"  {OK} 后台API权限保护正常（需要管理员登录）")
    admin_result = "正常（权限保护有效）"
else:
    admin_result = f"HTTP {s}"

# ──────────────────────────────────────────────────────────────
print("\n" + "="*60)
print(" 检测结果汇总")
print("="*60)
print(f"  1. 短信服务:   {sms_result}")
print(f"  2. 微信支付:   {wechat_result}")
print(f"  3. 注册/登录:  {auth_result}")
print(f"  4. 后台/数据库: {admin_result}")
print("="*60)

ssh.close()
