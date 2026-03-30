import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None
from pathlib import Path

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
LOCAL = Path(r"c:\Users\李\Desktop\星空AI\网站\nebula-business-ai---intelligent-enterprise-solutions")
REMOTE = "/var/www/nebula"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
sftp = ssh.open_sftp()

def run(cmd, timeout=120):
    print(f"  $ {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    if out: print(f"    {out}")
    if err and 'warn' not in err.lower(): print(f"    ERR: {err}")
    return out

# 1. 检查tsx版本和可用导出
print("[0] 检查 tsx 版本...")
tsx_version = run("cat /var/www/nebula/node_modules/tsx/package.json | python3 -c \"import sys,json; p=json.load(sys.stdin); print(p.get('version','?'))\"")
print(f"  tsx 版本: {tsx_version}")
tsx_exports = run("cat /var/www/nebula/node_modules/tsx/package.json | python3 -c \"import sys,json; p=json.load(sys.stdin); print(list(p.get('exports',{}).keys()))\" 2>/dev/null")
print(f"  tsx exports: {tsx_exports}")

# 2. 安装 tsx 全局
print("\n[1] 全局安装 tsx...")
run("npm install -g tsx 2>&1 | tail -3", timeout=60)
tsx_path = run("which tsx")
print(f"  tsx 路径: {tsx_path}")

# 3. 更新 ecosystem.config.cjs 使用全局 tsx
print("\n[2] 更新 ecosystem.config.cjs...")
new_config = f"""module.exports = {{
  apps: [
    {{
      name: 'nebula-api',
      script: '{tsx_path or "/usr/local/bin/tsx"}',
      args: 'server/index.ts',
      cwd: '{REMOTE}',
      instances: 1,
      exec_mode: 'fork',
      env: {{
        NODE_ENV: 'development',
        PORT: 4000,
      }},
      env_production: {{
        NODE_ENV: 'production',
        PORT: 4000,
      }},
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      max_memory_restart: '512M',
      watch: false,
    }},
  ],
}};
"""
# 写到服务器上
run(f"cat > {REMOTE}/ecosystem.config.cjs << 'EOFCONFIG'\n{new_config}\nEOFCONFIG")

# 4. 重新启动
print("\n[3] 重新启动 nebula-api...")
run("pm2 delete nebula-api 2>/dev/null || true")
time.sleep(1)
run(f"cd {REMOTE} && pm2 start ecosystem.config.cjs --env production")
run("pm2 save")

time.sleep(6)

# 5. 检查
print("\n[4] 检查状态...")
run("pm2 status")

print("\n[5] 检查端口4000...")
run("ss -tlnp | grep 4000")

print("\n[6] 查看日志...")
run(f"pm2 logs nebula-api --lines 10 --nostream 2>/dev/null")

print("\n[7] 测试接口...")
result = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/")
if result == "200":
    print("  [OK] 服务正常 HTTP 200!")
else:
    print(f"  HTTP 状态码: {result}")

sftp.close()
ssh.close()
print("\nDone!")
