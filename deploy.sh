#!/bin/bash
# ============================================================
#  石棺 (arkoverseer) — 一键部署脚本
#  用法: bash deploy.sh
#  要求: Node 22 LTS, Nginx (可选), PM2 (可选)
# ============================================================
set -e

echo "🗿 石棺部署脚本"
echo "============================================"

echo "[1/4] 构建前端..."
cd "$(dirname "$0")/app"
npm install --production=false
npm run build

echo "[2/4] 安装后端依赖..."
cd ../server
npm install --production

echo "[3/4] 初始化数据库和种子数据..."
npx tsx src/seed.ts

echo "[4/4] 启动服务..."
if command -v pm2 &> /dev/null; then
  pm2 delete arkoverseer 2>/dev/null || true
  pm2 start src/index.ts --name arkoverseer --interpreter npx --interpreter-args "tsx" --cwd "$(pwd)"
  pm2 save
  echo "✅ 已通过 PM2 启动"
else
  npx tsx src/index.ts &
  echo "✅ 服务已在后台启动 (端口 3001)"
  echo "💡 建议安装 PM2: npm install -g pm2"
fi

echo ""
echo "部署完成！请配置 Nginx 反向代理 3001→80"
