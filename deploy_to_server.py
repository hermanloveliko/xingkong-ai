"""
deploy script
"""
import os
import sys
import paramiko
from pathlib import Path

# fix windows GBK terminal
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

# ─── 配置 ───────────────────────────────────────────────
HOST     = "59.110.10.226"
PORT     = 22
USER     = "root"
PASSWORD = "yanis0814YY"
REMOTE   = "/var/www/nebula"

LOCAL    = Path(r"c:\Users\李\Desktop\星空AI\网站\nebula-business-ai---intelligent-enterprise-solutions")

# 要上传的文件列表（相对于项目根目录）
UPLOAD_FILES = [
    "src/App.tsx",
    "server/index.ts",
    "server/db.ts",
    "server/wechat-config.ts",
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "index.html",
    "ecosystem.config.cjs",
    "deploy.sh",
    ".env.local",
]

# dist 目录（整个上传）
UPLOAD_DIST = True

# ─── 工具函数 ────────────────────────────────────────────
def log(msg): print(f"  [OK] {msg}")
def warn(msg): print(f"  [!!] {msg}")

def run(ssh, cmd):
    print(f"  $ {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    if out: print(f"      {out}")
    if err: print(f"      ERR: {err}")
    return out

def upload_file(sftp, local_path, remote_path):
    # 确保远端目录存在
    remote_dir = str(Path(remote_path).parent).replace("\\", "/")
    try:
        sftp.makedirs(remote_dir)
    except Exception:
        pass
    sftp.put(str(local_path), remote_path)
    print(f"  ↑ {local_path.name}  →  {remote_path}")

def sftp_makedirs(sftp, path):
    parts = path.strip("/").split("/")
    current = ""
    for part in parts:
        current += "/" + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)

# ─── 主流程 ──────────────────────────────────────────────
def main():
    print(f"\n{'='*50}")
    print(f" XingkongAI Deploy  ->  {HOST}:{REMOTE}")
    print(f"{'='*50}\n")

    # 1. 连接
    print("[1/5] 连接服务器...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
    sftp = ssh.open_sftp()
    log(f"已连接 {HOST}")

    # 2. 确保目录存在
    print("\n[2/5] 准备目录...")
    run(ssh, f"mkdir -p {REMOTE}/server {REMOTE}/src {REMOTE}/data {REMOTE}/logs")
    log("目录结构已就绪")

    # 3. 上传文件
    print("\n[3/5] 上传代码文件...")
    for rel in UPLOAD_FILES:
        local_f = LOCAL / rel
        if not local_f.exists():
            warn(f"跳过（不存在）: {rel}")
            continue
        remote_f = f"{REMOTE}/{rel}".replace("\\", "/")
        remote_dir = "/".join(remote_f.split("/")[:-1])
        try:
            sftp_makedirs(sftp, remote_dir)
        except Exception:
            pass
        sftp.put(str(local_f), remote_f)
        print(f"  ↑ {rel}")

    # 上传 dist/
    if UPLOAD_DIST:
        dist_local = LOCAL / "dist"
        if dist_local.exists():
            print("\n  上传 dist/ 目录...")
            run(ssh, f"rm -rf {REMOTE}/dist && mkdir -p {REMOTE}/dist/assets")
            # 上传 dist 中的所有文件
            for f in dist_local.rglob("*"):
                if f.is_file():
                    rel_path = f.relative_to(LOCAL)
                    remote_f = f"{REMOTE}/{rel_path}".replace("\\", "/")
                    remote_dir = "/".join(remote_f.split("/")[:-1])
                    try:
                        sftp_makedirs(sftp, remote_dir)
                    except Exception:
                        pass
                    sftp.put(str(f), remote_f)
            log("dist/ 上传完成")
        else:
            warn("dist/ 目录不存在，请先本地 npm run build")

    # 上传 public/ 图片
    public_local = LOCAL / "public"
    if public_local.exists():
        print("\n  上传 public/ 目录...")
        run(ssh, f"mkdir -p {REMOTE}/public")
        for f in public_local.rglob("*"):
            if f.is_file():
                rel_path = f.relative_to(LOCAL)
                remote_f = f"{REMOTE}/{rel_path}".replace("\\", "/")
                remote_dir = "/".join(remote_f.split("/")[:-1])
                try:
                    sftp_makedirs(sftp, remote_dir)
                except Exception:
                    pass
                sftp.put(str(f), remote_f)
        log("public/ 上传完成")

    log("所有文件上传完成")

    # 4. 服务器安装依赖 + 重启
    print("\n[4/5] 服务器安装依赖...")
    run(ssh, f"cd {REMOTE} && npm install --production=false 2>&1 | tail -5")
    log("依赖安装完成")

    print("\n[5/5] 重启服务...")
    # 检查 pm2 是否在跑
    pm2_status = run(ssh, "pm2 list 2>/dev/null | grep nebula-api || echo NOT_RUNNING")
    if "NOT_RUNNING" in pm2_status or pm2_status == "":
        log("首次启动 PM2...")
        run(ssh, f"cd {REMOTE} && pm2 start ecosystem.config.cjs --env production")
        run(ssh, "pm2 save")
    else:
        run(ssh, "pm2 restart nebula-api")

    run(ssh, "pm2 status")

    sftp.close()
    ssh.close()

    print(f"\n{'='*50}")
    print(" Deploy done!")
    print(f" URL: http://xingkongai.top")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    main()
