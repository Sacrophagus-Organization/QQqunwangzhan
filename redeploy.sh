#!/bin/bash
# 服务器重新部署脚本 (需 sudo 权限)
NP="/home/admin/.local/share/mise/installs/node/22.22.3/bin"

echo "=== [1/3] 种子数据库(迁移) ==="
cd /home/admin/arkoverseer/server
$NP/node node_modules/tsx/dist/cli.mjs src/seed.ts 2>&1 || true
echo "DONE"

echo "=== [2/3] 构建前端 ==="
export PATH="$NP:$PATH"
cd /home/admin/arkoverseer/app
npm run build 2>&1 | tail -3
echo "BUILD_DONE"

echo "=== [3/3] 重启服务 ==="
sudo systemctl restart arkoverseer
sudo systemctl reload nginx
sudo systemctl status arkoverseer 2>&1 | head -4

echo ""
echo "更新完成"
