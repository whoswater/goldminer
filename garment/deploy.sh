#!/bin/bash
# =============================================================
# 潘记制衣厂管理系统 - 阿里云服务器一键部署脚本
# 使用方式:
#   1. 将整个项目上传到服务器 (scp / git clone)
#   2. ssh 登录服务器
#   3. chmod +x deploy.sh && sudo ./deploy.sh
#
# 部署完成后访问: http://<服务器公网IP>
# 默认管理员: 15026841070 / 841070
#             13851234080 / 234080
# =============================================================

set -e

# ---------- 配置区（按需修改）----------
APP_NAME="garment"
APP_DIR="/opt/garment"
DATA_DIR="/opt/garment-data"
APP_PORT=5001
DOMAIN=""  # 如有域名填这里，如 "pj.example.com"，留空用IP访问
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
# ----------------------------------------

echo "=========================================="
echo "  潘记制衣厂管理系统 - 开始部署"
echo "=========================================="

# ---------- 1. 系统依赖 ----------
echo "[1/6] 安装系统依赖..."
if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq python3 python3-pip python3-venv nginx >/dev/null
elif command -v yum &>/dev/null; then
    yum install -y -q python3 python3-pip nginx >/dev/null
elif command -v dnf &>/dev/null; then
    dnf install -y -q python3 python3-pip nginx >/dev/null
else
    echo "不支持的系统包管理器，请手动安装 python3 python3-pip python3-venv nginx"
    exit 1
fi

# ---------- 2. 项目文件 ----------
echo "[2/6] 部署项目文件..."
mkdir -p "$APP_DIR" "$DATA_DIR"

# 复制项目文件（排除部署脚本本身和临时文件）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
rsync -a --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' \
         --exclude='data/' --exclude='.idea' \
         "$SCRIPT_DIR/" "$APP_DIR/"

# ---------- 3. Python 虚拟环境 ----------
echo "[3/6] 创建 Python 虚拟环境并安装依赖..."
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q

# ---------- 4. Systemd 服务 ----------
echo "[4/6] 配置系统服务..."
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=潘记制衣厂管理系统
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment="FLASK_ENV=production"
Environment="SECRET_KEY=${SECRET_KEY}"
Environment="DB_PATH=${DATA_DIR}/garment.db"
ExecStart=${APP_DIR}/venv/bin/gunicorn -b 127.0.0.1:${APP_PORT} -w 2 --timeout 120 run:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

# ---------- 5. Nginx 反向代理 ----------
echo "[5/6] 配置 Nginx..."
SERVER_NAME="${DOMAIN:-_}"
cat > /etc/nginx/conf.d/${APP_NAME}.conf <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60;
        proxy_read_timeout 120;
    }
}
EOF

# 如果默认 default.conf 会冲突就移走
[ -f /etc/nginx/conf.d/default.conf ] && mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true

nginx -t && systemctl enable nginx && systemctl restart nginx

# ---------- 6. 防火墙 ----------
echo "[6/6] 配置防火墙..."
if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
elif command -v ufw &>/dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
fi

# ---------- 完成 ----------
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "  访问地址: http://$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo '<服务器公网IP>')"
if [ -n "$DOMAIN" ]; then
    echo "  域名访问: http://${DOMAIN}"
fi
echo ""
echo "  默认管理员账号:"
echo "    手机号: 15026841070  密码: 841070"
echo "    手机号: 13851234080  密码: 234080"
echo ""
echo "  数据目录: ${DATA_DIR}"
echo "  日志查看: journalctl -u ${APP_NAME} -f"
echo "  服务管理: systemctl {start|stop|restart|status} ${APP_NAME}"
echo ""
echo "  提示: 请在阿里云安全组中放行 80 端口"
echo "=========================================="
