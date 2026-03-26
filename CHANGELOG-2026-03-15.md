# 📋 开发日志 · 2026-03-15

## 一、今日修改清单

### 🌐 网站端（nebula-business-ai---intelligent-enterprise-solutions）

| 文件 | 改动说明 |
|------|----------|
| `src/App.tsx` | ① 恢复原始 Tailwind / motion/react 视觉风格；② 新增「下载软件」导航项；③ 新增完整 `DownloadPage` 组件（含版本信息、三步指南、系统要求、授权码引导）；④ 首页 CTA 区加入「下载软件」快捷按钮 |
| `server/index.ts` | 新增 `GET /api/version` 接口，返回最新桌面版版本号、下载链接、更新说明，方便后续自定义版本校验 |
| `package.json` | 新增 `@alicloud/pop-core`；`electron-updater` 在桌面端添加后网站端无需额外依赖 |
| `env.example` | 补充环境变量说明 |

### 🖥️ 桌面端（nebula-business-ai）

| 文件 | 改动说明 |
|------|----------|
| `package.json` | ① 新增 `electron-updater ^6.3.9` 依赖；② `build.publish` 配置指向网站服务器 `/downloads/`（上线前替换域名） |
| `electron/main.cjs` | 新增 `initAutoUpdater()` 函数：启动 30 秒后自动检查更新，每 4 小时轮询一次；注册 `updater:check` / `updater:download` / `updater:install` 三个 IPC 处理器；向渲染进程推送 `updater-event` 事件 |
| `electron/preload.cjs` | 新增 `electronAPI.updater` 命名空间：暴露 `check` / `download` / `install` / `onEvent` / `removeListener` 给渲染进程 |
| `App.tsx` | 新增自动更新 UI：右下角浮动更新横幅，支持「发现更新→立即更新→下载进度条→重启安装」完整流程 |
| `.gitignore` | 新增 `release/` 和 `out/` 忽略规则，防止打包产物入库 |
| `scripts/compile-secure.cjs` | 字节码编译脚本（小幅调整） |

---

## 二、上线前还要做什么

### 🔴 P0 必做（阻塞上线）

- [ ] **配置真实域名** — 把 `package.json → build.publish.url` 的 `your-domain.com` 改为实际域名  
- [ ] **填写阿里云短信密钥** — 在服务器 `.env.local` 里填入 `ALIYUN_SMS_ACCESS_KEY_ID` / `SECRET` / `SIGN_NAME` / `TEMPLATE_CODE`  
- [ ] **接入支付** — 目前等待 ICP 备案，备案通过后接入微信/支付宝支付 SDK  
- [ ] **修改管理员密码** — `.env.local` 里把 `ADMIN_PASSWORD` 改为强密码  
- [ ] **`npm install`** — 服务器首次部署前执行，安装 `electron-updater` 等新依赖  
- [ ] **CORS 白名单** — `server/index.ts` 里的 `ALLOWED_ORIGINS` 改为真实域名  

### 🟡 P1（部署）

- [ ] 购买服务器 + 域名（已购）  
- [ ] 申请 SSL 证书并配置 Nginx（参考 `deploy-nginx.conf`）  
- [ ] 用 PM2 启动后端：`npm run start:prod`  
- [ ] 上传前端产物：`npm run build` → `dist/` 目录  

### 🟡 P2（桌面端打包）

- [ ] 把 `package.json → version` 改为 `1.0.0`（确认）  
- [ ] 把 `server/index.ts → LATEST_DESKTOP_VERSION.downloadUrl` 改为真实域名  
- [ ] 运行 `npm run electron:build:win` 生成安装包  
- [ ] 把 `release/星空AI_Setup_1.0.0.exe` + `release/latest.yml` 上传到服务器 `/downloads/` 目录  

### 🟢 P3（上线后补充）

- [ ] 接入微信/支付宝支付回调  
- [ ] 添加数据统计看板（管理员端）  
- [ ] 自动备份 SQLite 数据库  

---

## 三、后期软件更新流程

### 网站端更新（热更新，约 5 分钟）

```
1. 新分支开发 → 测试
2. git push
3. 服务器：git pull → npm install（如有新依赖）→ npm run build
4. pm2 restart nebula-api
```

### 桌面端更新（需重新打包上传）

```
1. 改代码 → 跑测试（npm run test）
2. 递增版本号：
   - nebula-business-ai/package.json → "version": "1.x.x"
   - 网站 server/index.ts → LATEST_DESKTOP_VERSION.version
3. npm run compile:secure          ← 重编字节码（改了安全模块必须！）
4. npm run electron:build:win      ← 打包 Windows 安装包
5. 上传到服务器：
   release/星空AI_Setup_1.x.x.exe  → /downloads/
   release/latest.yml              → /downloads/        ← 这个文件驱动自动更新
6. 上架成功后通知用户（或等软件自动检测到）
```

> ⚠️ **重要规则**：每次修改了以下任意文件，**必须重新执行 `compile:secure`**，否则防破解保护失效：
> - `electron/services/keyVault.cjs`
> - `electron/services/licenseGuard.cjs`  
> - `electron/services/aiServiceBackend.cjs`
> - `electron/ipcHandlers.cjs`
> - `electron/services/quotaService.cjs`

---

## 四、架构说明

```
用户在网站购买套餐
    ↓
网站后端生成 license_key（唯一，与手机号绑定）
    ↓
用户在桌面软件「激活」页输入 license_key
    ↓
licenseGuard 每 30 分钟向 /api/license/verify 验证
    ↓
根据 package_type(VIP1/VIP3) 决定开放的功能模块
    ↓
到期或检测到篡改 → keyVault.destroy() 销毁 AI 密钥
```

---

*生成时间：2026-03-15*






