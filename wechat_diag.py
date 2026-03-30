import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
sftp = ssh.open_sftp()

def run(cmd, timeout=20):
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode(errors='replace').strip()

# 读取实际配置
appid    = run("grep WECHAT_APPID    /var/www/nebula/.env.local | head -1").split("=",1)[-1].strip()
mch_id   = run("grep WECHAT_MCH_ID   /var/www/nebula/.env.local | head -1").split("=",1)[-1].strip()
api_key  = run("grep WECHAT_API_KEY  /var/www/nebula/.env.local | head -1").split("=",1)[-1].strip()
notify   = run("grep WECHAT_NOTIFY   /var/www/nebula/.env.local | head -1").split("=",1)[-1].strip()

print(f"APPID: {appid}")
print(f"MCH_ID: {mch_id}")
print(f"API_KEY: {api_key[:6]}...{api_key[-4:]} (len={len(api_key)})")
print(f"NOTIFY: {notify}")

# 写一个独立 Node.js 诊断脚本到服务器
diag_js = f"""
const crypto = require('crypto');
const https = require('https');

const APPID   = '{appid}';
const MCH_ID  = '{mch_id}';
const API_KEY = '{api_key}';
const NOTIFY  = '{notify}';

function sign(params) {{
  const s = Object.keys(params)
    .filter(k => k !== 'sign' && params[k] !== '' && params[k] != null)
    .sort()
    .map(k => k + '=' + params[k])
    .join('&');
  const stringA = s + '&key=' + API_KEY;
  console.log('stringA:', stringA);
  return crypto.createHash('md5').update(stringA, 'utf8').digest('hex').toUpperCase();
}}

const p = {{
  appid:            APPID,
  mch_id:           MCH_ID,
  nonce_str:        'abc123def456ghi789',
  sign_type:        'MD5',
  body:             'test-order',
  out_trade_no:     'NK' + Date.now(),
  total_fee:        '1',
  spbill_create_ip: '59.110.10.226',
  notify_url:       NOTIFY,
  trade_type:       'NATIVE',
}};
p.sign = sign(p);
console.log('sign:', p.sign);

const xml = '<xml>' + Object.entries(p).map(([k,v]) => `<${{k}}><![CDATA[${{v}}]]></${{k}}>`).join('') + '</xml>';
console.log('XML:', xml);

const url = new URL('https://api.mch.weixin.qq.com/pay/unifiedorder');
const req = https.request({{
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {{ 'Content-Type': 'application/xml', 'Content-Length': Buffer.byteLength(xml) }}
}}, res => {{
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('RESPONSE:', data));
}});
req.on('error', e => console.error('REQ ERROR:', e.message));
req.write(xml);
req.end();
"""

with sftp.open('/tmp/wechat_test.js', 'w') as f:
    f.write(diag_js)

print("\n=== 向微信发送测试请求 ===")
out = run("node /tmp/wechat_test.js 2>&1", timeout=30)
print(out)

sftp.close()
ssh.close()
