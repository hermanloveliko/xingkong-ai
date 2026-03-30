import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
REMOTE = "/var/www/nebula"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd, timeout=180):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    if out: print(f"    {out}")
    if err and 'warn' not in err.lower() and 'npm' not in err.lower()[:10]:
        print(f"    ERR: {err[:500]}")
    return out

print("[1] 检查当前 node_modules 里有哪些包...")
run(f"ls {REMOTE}/node_modules | head -20")

print("\n[2] 检查 package.json 里的 dependencies...")
run(f"cat {REMOTE}/package.json | python3 -c \"import sys,json; p=json.load(sys.stdin); print('deps:', list(p.get('dependencies',{{}}).keys())); print('devDeps:', list(p.get('devDependencies',{{}}).keys()))\"")

print("\n[3] 删除旧 node_modules 并重新安装...")
run(f"rm -rf {REMOTE}/node_modules", timeout=60)
run(f"cd {REMOTE} && npm install 2>&1 | tail -8", timeout=300)

print("\n[4] 重建 better-sqlite3 原生模块...")
run(f"cd {REMOTE} && npm rebuild better-sqlite3 2>&1", timeout=120)

print("\n[5] 验证关键包...")
run(f"ls {REMOTE}/node_modules/express/package.json")
run(f"ls {REMOTE}/node_modules/better-sqlite3/build/Release/ 2>/dev/null || echo 'No prebuilt - checking addon...'")
run(f"ls {REMOTE}/node_modules/better-sqlite3/addon-build/ 2>/dev/null | head -5 || echo 'No addon-build'")

print("\n[6] 手动测试启动（3秒后自动停止）...")
result = run(f"cd {REMOTE} && timeout 4 /usr/bin/tsx server/index.ts 2>&1 | head -10")
if "listening" in result.lower() or "4000" in result or "started" in result.lower():
    print("  [OK] 服务器可以正常启动!")
else:
    print(f"  输出: {result}")

print("\n[7] 重启 PM2...")
run("pm2 restart nebula-api 2>/dev/null || true")
time.sleep(5)
run("pm2 status")

print("\n[8] 验证端口...")
run("ss -tlnp | grep 4000")

print("\n[9] HTTP测试...")
result = run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/")
print(f"  HTTP: {result}")

ssh.close()
print("\nDone!")
