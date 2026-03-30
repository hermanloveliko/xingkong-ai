import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace') if hasattr(sys.stdout, 'reconfigure') else None

HOST, PORT, USER, PASSWORD = "59.110.10.226", 22, "root", "yanis0814YY"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)

def run(cmd, timeout=15):
    _, stdout, _ = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode(errors='replace').strip()

# 1. 检查微信配置
print("=== 微信配置 ===")
wx_conf = run("grep -E 'WECHAT' /var/www/nebula/.env.local 2>/dev/null | grep -v '^#'")
print(wx_conf)

# 2. 查PM2日志里的微信响应
print("\n=== 最新微信支付日志 ===")
wx_log = run("pm2 logs nebula-api --lines 50 --nostream 2>/dev/null | grep -A2 -i 'WechatPay\\|wechat\\|pay/create' | tail -20")
print(wx_log)

# 3. 手动验证签名
print("\n=== 手动验签测试 ===")
sign_test = run(r"""node -e "
const crypto = require('crypto');
const fs = require('fs');

// 读取 .env.local
const env = fs.readFileSync('/var/www/nebula/.env.local', 'utf8');
const getVal = (key) => {
  const m = env.match(new RegExp(key + '=(.+)'));
  return m ? m[1].trim().replace(/[\"\']/g,'') : '';
};

const APPID    = getVal('WECHAT_APPID');
const MCH_ID   = getVal('WECHAT_MCH_ID');
const API_KEY  = getVal('WECHAT_API_KEY');
const NOTIFY   = getVal('WECHAT_NOTIFY_URL');

console.log('APPID:', APPID);
console.log('MCH_ID:', MCH_ID);
console.log('API_KEY length:', API_KEY.length);
console.log('API_KEY first10:', API_KEY.substring(0,10) + '...');
console.log('NOTIFY_URL:', NOTIFY);

// 测试签名
const params = {
  appid: APPID,
  mch_id: MCH_ID,
  nonce_str: 'testnonce12345678',
  body: 'test',
  out_trade_no: 'TEST' + Date.now(),
  total_fee: '100',
  spbill_create_ip: '59.110.10.226',
  notify_url: NOTIFY,
  trade_type: 'NATIVE',
};
const sorted = Object.keys(params).sort().map(k => k+'='+params[k]).join('&');
const stringA = sorted + '&key=' + API_KEY;
const sign = crypto.createHash('md5').update(stringA).digest('hex').toUpperCase();
console.log('sign:', sign.substring(0,10) + '...');
console.log('string_a sample:', sorted.substring(0,100) + '...');
" 2>&1""")
print(sign_test)

ssh.close()
