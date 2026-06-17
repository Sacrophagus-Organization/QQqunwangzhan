#!/bin/bash
# 石棺 (arkoverseer) — 完整部署脚本（初次部署用）
set -e
NODE="/home/admin/.local/share/mise/installs/node/22.22.3/bin/node"
NPM="/home/admin/.local/share/mise/installs/node/22.22.3/bin/npm"
APP_DIR="/home/admin/arkoverseer/app"
SRV_DIR="/home/admin/arkoverseer/server"

echo "=== [1/5] 种子数据库 ==="
cd "$SRV_DIR"
$NODE node_modules/tsx/dist/cli.mjs src/seed.ts 2>&1

echo "=== [2/5] 安装前端依赖 ==="
cd "$APP_DIR"
$NPM install --prefer-offline 2>&1 | tail -3

echo "=== [3/5] 构建前端 ==="
$NPM run build 2>&1 | tail -5

echo "=== [4/5] 配置 systemd ==="
cat > /tmp/arkoverseer.service << 'SVC'
[Unit]
Description=石棺 arkoverseer
After=network.target
[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/arkoverseer/server
Environment=NODE_VERSION=22.22.3
Environment=PORT=3001
Environment=JWT_SECRET=CHANGE_ME_IN_PRODUCTION
ExecStart=/home/admin/.local/share/mise/installs/node/22.22.3/bin/node /home/admin/arkoverseer/server/node_modules/tsx/dist/cli.mjs src/index.ts
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
SVC
sudo cp /tmp/arkoverseer.service /etc/systemd/system/arkoverseer.service
sudo systemctl daemon-reload
sudo systemctl enable arkoverseer
sudo systemctl restart arkoverseer

echo "=== [5/5] 配置 Nginx ==="
cat > /tmp/arkoverseer-nginx << 'NGX'
server {
    listen 80;
    server_name sarcophagus.org.cn www.sarcophagus.org.cn;
    client_max_body_size 50m;
    location /api/ { proxy_pass http://127.0.0.1:3001; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location / { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; }
}
NGX
sudo cp /tmp/arkoverseer-nginx /etc/nginx/sites-available/arkoverseer
sudo ln -sf /etc/nginx/sites-available/arkoverseer /etc/nginx/sites-enabled/arkoverseer
sudo nginx -t 2>&1
sudo systemctl reload nginx

echo "部署完成。请修改 JWT_SECRET 和 Nginx server_name"
