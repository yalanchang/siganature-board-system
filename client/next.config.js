// client/next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 如果你遇到 Turbopack 無法解析路徑的錯誤，
  // 可用下面這行指定根目錄為當前 client 資料夾：
  turbopack: {
    root: path.resolve(__dirname),
  },

  // 你可以把其他 Next.js 設定也加在這裡
  // 例如：reactStrictMode、images domains、env 等
  reactStrictMode: true,
  // basePath: '/你的子路徑',  如果你網站有用子路由
};

module.exports = nextConfig;
