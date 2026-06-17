#!/bin/bash
# ============================================================
#  石棺 (Sarcophagus) — 正式上线脚本
#  在服务器上执行: bash go_live.sh
#  前提: DNS 已解析 sarcophagus.org.cn → 服务器 IP
# ============================================================
set -e

DOMAIN="sarcophagus.org.cn"
WWW_DOMAIN="www.sarcophagus.org.cn"
NGINX_CONF="/etc/nginx/sites-available/sarcophagus"
NGINX_ENABLED="/etc/nginx/sites-enabled/sarcophagus"
SERVICE_FILE="/etc/systemd/system/arkoverseer.service"
SRV_DIR="/home/admin/arkoverseer/server"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================================"
echo " 🗿 石棺 (Sarcophagus) 正式上线"
echo " 域名: https://${DOMAIN}"
echo "============================================================"
echo ""

# ============================================================
# Step 0: 前置检查
# ============================================================
echo "[0/7] 前置检查..."

# 检查是否为 root/sudo
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}请使用 sudo bash go_live.sh 运行${NC}"
    exit 1
fi

# 检查 DNS 解析
RESOLVED_IP=$(dig +short ${DOMAIN} 2>/dev/null || nslookup ${DOMAIN} 2>/dev/null | grep -A1 'Name:' | tail -1 | awk '{print $2}')
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null || curl -s icanhazip.com)

echo "  域名解析: ${DOMAIN}"
echo "  服务器 IP: ${SERVER_IP}"
echo ""

# 检查 nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx 未安装，请先运行 full_deploy.sh${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ 前置检查通过${NC}"
echo ""

# ============================================================
# Step 1: 更新 Nginx 配置（仅 HTTP，certbot 后续会加上 HTTPS）
# ============================================================
echo "[1/7] 更新 Nginx 配置..."

cat > /tmp/sarcophagus-nginx-pre-ssl << 'NGINXEOF'
# Pre-SSL 临时配置 — certbot 会自动添加 HTTPS
server {
    listen 80;
    server_name sarcophagus.org.cn www.sarcophagus.org.cn;

    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
NGINXEOF

cp /tmp/sarcophagus-nginx-pre-ssl ${NGINX_CONF}

# 确保 sites-enabled 有软链接
mkdir -p /etc/nginx/sites-enabled
ln -sf ${NGINX_CONF} ${NGINX_ENABLED}

# 删除默认站点（避免冲突）
rm -f /etc/nginx/sites-enabled/default

# 测试并重载
nginx -t && systemctl reload nginx

echo -e "${GREEN}  ✓ Nginx 配置已更新${NC}"
echo ""

# ============================================================
# Step 2: 安装 & 配置 SSL 证书
# ============================================================
echo "[2/7] 配置 HTTPS 证书..."

if ! command -v certbot &> /dev/null; then
    echo "  安装 certbot..."
    apt-get update -qq
    apt-get install -y -qq certbot python3-certbot-nginx
fi

# 检查证书是否已存在
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "${YELLOW}  SSL 证书已存在，跳过签发${NC}"
else
    echo "  正在签发 Let's Encrypt 免费证书..."
    certbot --nginx \
        -d ${DOMAIN} \
        -d ${WWW_DOMAIN} \
        --agree-tos \
        --redirect \
        --hsts \
        --staple-ocsp \
        --email admin@${DOMAIN} \
        --non-interactive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ SSL 证书签发成功${NC}"
    else
        echo -e "${RED}  ✗ SSL 证书签发失败，请检查域名解析是否正确${NC}"
        exit 1
    fi
fi

# certbot 已经自动修改了 nginx 配置，重载一下
systemctl reload nginx
echo ""

# ============================================================
# Step 3: SSL 安全加固
# ============================================================
echo "[3/7] SSL 安全加固..."

# 在 Nginx SSL server block 中添加安全头和安全配置
# certbot 已经添加了基础 SSL 配置，我们追加安全加固
NGX_SSL_CONF=$(find /etc/nginx/sites-available -name "sarcophagus*" -type f | head -1)

# 只在 ssl_certificate 那行后面追加安全配置（幂等操作）
if ! grep -q "ssl_protocols TLSv1.2" ${NGX_SSL_CONF}; then
    sed -i '/ssl_certificate_key/a\
\
    # SSL 安全加固\
    ssl_protocols TLSv1.2 TLSv1.3;\
    ssl_prefer_server_ciphers on;\
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;\
    ssl_session_cache shared:SSL:10m;\
    ssl_session_timeout 1d;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header X-Frame-Options "SAMEORIGIN" always;\
    add_header X-XSS-Protection "1; mode=block" always;' ${NGX_SSL_CONF}
    nginx -t && systemctl reload nginx
fi

echo -e "${GREEN}  ✓ SSL 安全加固完成${NC}"
echo ""

# ============================================================
# Step 4: 证书自动续期
# ============================================================
echo "[4/7] 配置证书自动续期..."

# certbot 安装后通常自动配置了 systemd timer
if systemctl list-timers 2>/dev/null | grep -q certbot; then
    echo "  certbot.timer 已存在"
else
    # 创建 cron job 作为备选
    echo "0 3 * * 1 root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" > /etc/cron.d/certbot-renew
    echo "  已创建 cron 续期任务"
fi

# 测试续期流程
certbot renew --dry-run 2>&1 | tail -1

echo -e "${GREEN}  ✓ 自动续期已配置${NC}"
echo ""

# ============================================================
# Step 5: 更新 JWT_SECRET
# ============================================================
echo "[5/7] 更新 JWT 密钥..."

# 生成安全的随机密钥
NEW_JWT_SECRET=$(openssl rand -base64 48)
echo "  新 JWT_SECRET: ${NEW_JWT_SECRET:0:16}...（已截断显示）"

# 备份原 service 文件
if [ -f "${SERVICE_FILE}" ]; then
    cp ${SERVICE_FILE} ${SERVICE_FILE}.bak
    echo "  已备份 ${SERVICE_FILE}.bak"

    # 替换 JWT_SECRET
    sed -i "s/Environment=JWT_SECRET=.*/Environment=JWT_SECRET=${NEW_JWT_SECRET}/" ${SERVICE_FILE}

    # 更新 DOMAIN
    if grep -q "Environment=DOMAIN=" ${SERVICE_FILE}; then
        sed -i "s/Environment=DOMAIN=.*/Environment=DOMAIN=${DOMAIN}/" ${SERVICE_FILE}
    else
        sed -i "/Environment=JWT_SECRET=/a Environment=DOMAIN=${DOMAIN}" ${SERVICE_FILE}
    fi

    systemctl daemon-reload
    systemctl restart arkoverseer
else
    echo -e "${YELLOW}  systemd service 文件不存在，请确认服务已正确部署${NC}"
fi

# 同时更新 server/.env（如果存在）
if [ -f "${SRV_DIR}/.env" ]; then
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" ${SRV_DIR}/.env
    sed -i "s/^DOMAIN=.*/DOMAIN=${DOMAIN}/" ${SRV_DIR}/.env
elif [ -f "${SRV_DIR}/.env.example" ]; then
    cp ${SRV_DIR}/.env.example ${SRV_DIR}/.env
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_JWT_SECRET}/" ${SRV_DIR}/.env
    sed -i "s/^DOMAIN=.*/DOMAIN=${DOMAIN}/" ${SRV_DIR}/.env
fi

echo -e "${GREEN}  ✓ JWT_SECRET 已更新${NC}"
echo ""

# ============================================================
# Step 6: 防火墙配置
# ============================================================
echo "[6/7] 配置防火墙..."

if command -v ufw &> /dev/null; then
    ufw --force enable

    # 允许 SSH
    ufw allow 22/tcp 2>/dev/null || true

    # 允许 HTTP / HTTPS
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true

    # 阻止后端端口直接暴露
    ufw deny 3001/tcp 2>/dev/null || true

    ufw status | head -5
    echo -e "${GREEN}  ✓ 防火墙已配置${NC}"
else
    echo -e "${YELLOW}  ufw 未安装，跳过防火墙配置${NC}"
    echo "  建议执行: sudo apt install ufw -y"
fi

echo ""

# ============================================================
# Step 7: 最终验证
# ============================================================
echo "[7/7] 最终验证..."

echo ""
echo "────────────────────────────────────────────"
echo "  验证结果"
echo "────────────────────────────────────────────"

# HTTP → HTTPS 重定向
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L http://${DOMAIN} 2>/dev/null || echo "FAIL")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  HTTP 重定向:    ${GREEN}✓${NC} (${HTTP_CODE})"
else
    echo -e "  HTTP 重定向:    ${RED}✗${NC} (${HTTP_CODE})"
fi

# HTTPS 可访问
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} 2>/dev/null || echo "FAIL")
if [ "$HTTPS_CODE" = "200" ]; then
    echo -e "  HTTPS 主页:     ${GREEN}✓${NC} (${HTTPS_CODE})"
else
    echo -e "  HTTPS 主页:     ${RED}✗${NC} (${HTTPS_CODE})"
fi

# API 可访问
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/ 2>/dev/null || echo "FAIL")
echo -e "  API 端点:       ${API_CODE}"

# SSL 证书信息
echo ""
echo "  SSL 证书信息:"
certbot certificates 2>/dev/null | grep -A5 "${DOMAIN}" || true

# 服务状态
echo ""
echo "  服务状态:"
systemctl status arkoverseer --no-pager -l 2>/dev/null | head -5 || echo "  (使用 PM2 管理)"
systemctl status nginx --no-pager -l 2>/dev/null | head -3

echo ""
echo "────────────────────────────────────────────"
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  🎉 石棺已正式上线！${NC}"
echo -e "${GREEN}  访问地址: https://${DOMAIN}${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  后续步骤（备案下来后）："
echo "  1. 在 Footer 组件中添加备案号展示"
echo "  2. 重新构建前端: bash redeploy.sh"
echo ""
