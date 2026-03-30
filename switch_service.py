import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd):
    print(f"  $ {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    if out: print(f"    {out}")
    if err: print(f"    ERR: {err}")
    return out

print("[1] 查看 nebula-api 日志（最近20行）...")
print(run("pm2 logs nebula-api --lines 20 --nostream 2>/dev/null"))

print("\n[2] 停止旧进程 xingkong-server 和 xingkong-web...")
run("pm2 stop xingkong-server xingkong-web")

print("\n[3] 重启 nebula-api（端口4000现在空闲）...")
run("pm2 restart nebula-api")

import time
time.sleep(4)

print("\n[4] 检查状态...")
run("pm2 status")

print("\n[5] 验证端口4000是否正常监听...")
run("ss -tlnp | grep 4000")

print("\n[6] 测试接口是否响应...")
run("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/ 2>/dev/null || echo 'curl failed'")

ssh.close()
print("\n完成！")
