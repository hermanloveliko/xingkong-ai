/**
 * PM2 进程管理配置
 * 
 * 服务器上启动命令：
 *   pm2 start ecosystem.config.cjs
 *   pm2 save          # 保存进程列表
 *   pm2 startup       # 设置开机自启
 * 
 * 更新代码后：
 *   pm2 restart nebula-api
 * 
 * 查看日志：
 *   pm2 logs nebula-api
 */
module.exports = {
  apps: [
    {
      name: 'nebula-api',
      // Use tsx/cjs register via wrapper to avoid PM2 ESM import issues on Linux
      script: 'server/start.cjs',
      interpreter: 'node',
      cwd: './',

      // 进程数量：服务器核心数，'max' 表示全部核心
      instances: 1,
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,

      // 崩溃自动重启
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,

      // 内存超过 512MB 自动重启（防内存泄漏）
      max_memory_restart: '512M',

      // 监听文件变化（生产环境关闭，避免误重启）
      watch: false,
    },
  ],
};






