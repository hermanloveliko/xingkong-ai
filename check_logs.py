import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    return (out + "\n" + err).strip()

print("=== 完整错误日志 (最近30行) ===")
print(run("cat /var/www/nebula/logs/error.log 2>/dev/null | tail -30"))

print("\n=== 检查 node_modules 关键包 ===")
print("better-sqlite3:", run("ls /var/www/nebula/node_modules/better-sqlite3/build/Release/ 2>/dev/null || echo MISSING"))
print("express:", run("ls /var/www/nebula/node_modules/express/package.json 2>/dev/null | head -1 || echo MISSING"))
print("xml2js:", run("ls /var/www/nebula/node_modules/xml2js 2>/dev/null | head -1 || echo MISSING"))
print("dotenv:", run("ls /var/www/nebula/node_modules/dotenv 2>/dev/null | head -1 || echo MISSING"))

print("\n=== 手动运行测试（不走PM2）===")
print(run("cd /var/www/nebula && timeout 5 /usr/bin/tsx server/index.ts 2>&1 | head -20"))

ssh.close()
