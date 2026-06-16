#!/bin/bash
# 服务器部署验证脚本
echo "=== Systemd 状态 ==="
sudo systemctl status arkoverseer 2>&1 | head -5

echo ""
echo "=== Nginx 状态 ==="
sudo nginx -t 2>&1

echo ""
echo "=== 端口测试 ==="
echo "Backend (3001): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/)"
echo "Nginx   (80):   $(curl -s -o /dev/null -w '%{http_code}' http://localhost/)"

echo ""
echo "=== API 测试 ==="
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Admin","password":"CHANGE_ME"}' | head -c 200

echo ""
echo "验证完成"
