#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# 星空AI 网站 · 服务器一键部署脚本
# 
# 【首次部署】在服务器上运行：
#   chmod +x deploy.sh && ./deploy.sh --init
#
# 【更新代码】：
#   ./deploy.sh --update
#
# 【仅重启服务】：
#   ./deploy.sh --restart
# ══════════════════════════════════════════════════════════════════════════════

set -e  # 任意命令失败立即退出

APP_DIR="/var/www/nebula"
LOG_DIR="$APP_DIR/logs"

# ─────────────────────────── 颜色输出 ────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ═════════════════════════════ 初始化部署 ════════════════════════════════════
init_deploy() {
  info "═══ 开始首次部署 ═══"

  # 1. 检查必要工具
  command -v node  >/dev/null 2>&1 || error "未安装 Node.js，请先安装：curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
  command -v pm2   >/dev/null 2>&1 || { info "安装 PM2..."; npm install -g pm2; }
  command -v nginx >/dev/null 2>&1 || { info "安装 Nginx..."; sudo apt install -y nginx; }

  # 2. 创建目录
  info "创建目录结构..."
  sudo mkdir -p $APP_DIR
  sudo mkdir -p $LOG_DIR
  sudo mkdir -p $APP_DIR/data
  sudo mkdir -p $APP_DIR/downloads   # 存放桌面端 .exe 供下载
  sudo chown -R $USER:$USER $APP_DIR

  # 3. 拉取代码（如果当前目录有代码就直接复制）
  if [ -f "package.json" ]; then
    info "从当前目录复制代码到 $APP_DIR..."
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' . $APP_DIR/
  else
    error "请在项目根目录运行此脚本"
  fi

  cd $APP_DIR

  # 4. 检查 .env.local 是否存在
  if [ ! -f ".env.local" ]; then
    warn ".env.local 不存在！正在从模板创建..."
    cp env.example .env.local
    warn "══════════════════════════════════════════════════════"
    warn "⚠️  请立即编辑 $APP_DIR/.env.local 填写真实配置！"
    warn "   nano $APP_DIR/.env.local"
    warn "══════════════════════════════════════════════════════"
    exit 1
  fi

  # 5. 安装依赖
  info "安装 npm 依赖..."
  npm install --production=false

  # 6. 构建前端
  info "构建前端..."
  npm run build
  info "前端构建完成，dist/ 目录已生成"

  # 7. 启动服务
  info "启动 PM2 服务..."
  pm2 start ecosystem.config.cjs --env production
  pm2 save

  # 8. 设置开机自启
  info "设置开机自启..."
  pm2 startup systemd -u $USER --hp $HOME | tail -1 | bash || true

  info "═══ 首次部署完成！═══"
  info "服务运行在 http://127.0.0.1:4000"
  info "请继续配置 Nginx 和 SSL，参考 deploy-nginx.conf"
  pm2 status
}

# ═════════════════════════════ 更新部署 ══════════════════════════════════════
update_deploy() {
  info "═══ 开始更新部署 ═══"

  if [ ! -d "$APP_DIR" ]; then
    error "$APP_DIR 不存在，请先运行 ./deploy.sh --init"
  fi

  # 复制新代码
  if [ -f "package.json" ]; then
    info "同步代码到 $APP_DIR..."
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.env.local' --exclude='data' . $APP_DIR/
  fi

  cd $APP_DIR

  # 安装新依赖（如有变化）
  info "更新 npm 依赖..."
  npm install --production=false

  # 重新构建前端
  info "重新构建前端..."
  npm run build

  # 重启服务
  info "重启 PM2 服务..."
  pm2 restart nebula-api

  info "═══ 更新完成！═══"
  pm2 status
}

# ═════════════════════════════ 仅重启 ════════════════════════════════════════
restart_only() {
  info "重启 nebula-api..."
  pm2 restart nebula-api
  pm2 status
}

# ═════════════════════════════ 主入口 ════════════════════════════════════════
case "$1" in
  --init)    init_deploy ;;
  --update)  update_deploy ;;
  --restart) restart_only ;;
  *)
    echo "用法："
    echo "  ./deploy.sh --init     首次部署"
    echo "  ./deploy.sh --update   更新代码"
    echo "  ./deploy.sh --restart  仅重启服务"
    ;;
esac






