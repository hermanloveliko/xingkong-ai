import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd):
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    return out + ("\n" + err if err else "")

print("=== PM2 进程端口 ===")
print(run("pm2 list"))

print("\n=== Nginx 配置 ===")
print(run("cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/*.conf 2>/dev/null || nginx -T 2>/dev/null | grep -A5 'server_name\\|proxy_pass\\|listen'"))

print("\n=== 各进程监听端口 ===")
print(run("ss -tlnp | grep -E 'node|tsx'"))

ssh.close()
