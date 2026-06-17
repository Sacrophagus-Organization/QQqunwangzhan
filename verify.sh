#!/bin/bash
# ============================================================
#  石棺 — 上线后验证脚本
#  用法: bash verify.sh
# ============================================================
DOMAIN="sarcophagus.org.cn"

echo "🗿 石棺上线验证"
echo "============================================"
echo ""

echo "=== Systemd 状态 ==="
sudo systemctl status arkoverseer --no-pager 2>&1 | head -5

echo ""
echo "=== Nginx 状态 ==="
sudo nginx -t 2>&1

echo ""
echo "=== 端口监听 ==="
ss -tlnp 2>/dev/null | grep -E ":(80|443|3001) " || netstat -tlnp 2>/dev/null | grep -E ":(80|443|3001) "

echo ""
echo "=== HTTP → HTTPS 重定向 ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -I http://${DOMAIN})
echo "HTTP 状态码: ${HTTP_CODE} (期望 301)"

echo ""
echo "=== HTTPS 主页 ==="
HTTPS_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN})
echo "HTTPS 状态码: ${HTTPS_CODE} (期望 200)"

echo ""
echo "=== HTTPS API 端点 ==="
API_CODE=$(curl -s -o /dev/null -w '%{http_code}' https://${DOMAIN}/api/)
echo "API 状态码: ${API_CODE}"

echo ""
echo "=== API 登录测试 ==="
curl -s -X POST https://${DOMAIN}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Admin","password":"CHANGE_ME"}' | head -c 200

echo ""
echo "=== SSL 证书 ==="
certbot certificates 2>/dev/null || echo "certbot 未安装"

echo ""
echo "=== 防火墙 ==="
sudo ufw status 2>/dev/null | head -10 || echo "ufw 未安装"

echo ""
echo "============================================"
echo "验证完成"
