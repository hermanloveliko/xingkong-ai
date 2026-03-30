import paramiko
import os
import sys

HOST = '59.110.10.226'
USER = 'root'
PASS = 'yanis0814YY'
LOCAL_FILE = r'C:\Users\李\Desktop\星空AI\nebula-business-ai\release\星空AI-1.0.0-x64.exe'
REMOTE_DIR = '/var/www/downloads/'
REMOTE_FILE = REMOTE_DIR + '星空AI-1.0.0-x64.exe'

NGINX_CONF = r"""server {
    listen 80;
    server_name xingkongai.top www.xingkongai.top 59.110.10.226;

    location /downloads/ {
        alias /var/www/downloads/;
        add_header Content-Disposition attachment;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
"""

def run(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()
    return stdout.read().decode('utf-8', errors='replace'), stderr.read().decode('utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print('连接服务器...')
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# 创建下载目录
print('创建 /var/www/downloads/ 目录...')
run(ssh, 'mkdir -p /var/www/downloads && chmod 755 /var/www/downloads')

# 写Nginx配置
print('更新 Nginx 配置...')
sftp = ssh.open_sftp()
with sftp.open('/etc/nginx/conf.d/xingkongai.conf', 'w') as f:
    f.write(NGINX_CONF)

# 测试并重载Nginx
out, err = run(ssh, 'nginx -t 2>&1 && nginx -s reload 2>&1')
print('Nginx测试结果:', out + err)

# 上传exe文件
file_size = os.path.getsize(LOCAL_FILE)
print(f'\n开始上传 {LOCAL_FILE}')
print(f'文件大小: {file_size/1024/1024:.1f} MB，请耐心等待...\n')

uploaded = [0]

def progress(sent, total):
    pct = sent / total * 100
    mb_sent = sent / 1024 / 1024
    mb_total = total / 1024 / 1024
    print(f'\r上传进度: {mb_sent:.1f}/{mb_total:.1f} MB ({pct:.1f}%)', end='', flush=True)

sftp.put(LOCAL_FILE, REMOTE_FILE, callback=progress)
print('\n\n上传完成！')

# 设置权限
run(ssh, f'chmod 644 "{REMOTE_FILE}"')
out, _ = run(ssh, f'ls -lh "{REMOTE_FILE}"')
print('服务器文件信息:', out)

sftp.close()
ssh.close()
print('\n全部完成！下载地址: http://xingkongai.top/downloads/星空AI-1.0.0-x64.exe')
