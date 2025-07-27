#!/bin/bash

# Повна переустановка nginx, SSL і всіх компонентів для iryscrush.xyz
echo "🔥 ПОВНА ПЕРЕУСТАНОВКА nginx, SSL та всіх компонентів..."
echo "⚠️  Це видалить ВСЕ і встановить заново!"
echo ""

DOMAIN="iryscrush.xyz"
EMAIL="$1"
APP_PATH="$2"

if [ -z "$EMAIL" ] || [ -z "$APP_PATH" ]; then
    echo "❌ Помилка: Потрібно вказати email і шлях до додатку!"
    echo "Використання: $0 your-email@domain.com /path/to/app"
    echo "Приклад: $0 admin@iryscrush.xyz /home/user/testcrush"
    exit 1
fi

echo "📧 Email: $EMAIL"
echo "🌐 Домен: $DOMAIN"
echo "📁 Шлях до додатку: $APP_PATH"
echo ""

read -p "⚠️  Продовжити? Це видалить ВСЕ! (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Скасовано користувачем"
    exit 1
fi

echo "🔥 ПОЧИНАЄМО ПОВНУ ПЕРЕУСТАНОВКУ..."
echo ""

# ============================================
# КРОК 1: ПОВНЕ ВИДАЛЕННЯ NGINX
# ============================================
echo "🗑️  КРОК 1: Повне видалення nginx..."

# Зупинка nginx
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Видалення nginx пакетів
apt-get remove --purge nginx nginx-common nginx-core nginx-full -y 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

# Видалення конфігурацій nginx
rm -rf /etc/nginx/
rm -rf /var/log/nginx/
rm -rf /var/cache/nginx/
rm -rf /var/lib/nginx/

echo "✅ Nginx повністю видалено"

# ============================================
# КРОК 2: ПОВНЕ ВИДАЛЕННЯ SSL
# ============================================
echo "🗑️  КРОК 2: Повне видалення SSL сертифікатів..."

# Зупинка certbot
systemctl stop certbot.timer 2>/dev/null || true
systemctl disable certbot.timer 2>/dev/null || true

# Видалення certbot
apt-get remove --purge certbot python3-certbot-nginx -y 2>/dev/null || true

# Видалення всіх SSL файлів
rm -rf /etc/letsencrypt/
rm -rf /var/lib/letsencrypt/
rm -rf /var/log/letsencrypt/

echo "✅ SSL сертифікати повністю видалені"

# ============================================
# КРОК 3: ОЧИЩЕННЯ СИСТЕМИ
# ============================================
echo "🧹 КРОК 3: Очищення системи..."

# Видалення залишків конфігурацій
rm -rf /etc/default/nginx
rm -rf /etc/init.d/nginx
rm -rf /etc/logrotate.d/nginx
rm -rf /lib/systemd/system/nginx.service
rm -rf /etc/systemd/system/nginx.service

# Очищення кешу пакетів
apt-get clean
apt-get autoclean

# Перезавантаження systemd
systemctl daemon-reload

echo "✅ Система очищена"

# ============================================
# КРОК 4: ОНОВЛЕННЯ СИСТЕМИ
# ============================================
echo "🔄 КРОК 4: Оновлення системи..."

apt-get update
apt-get upgrade -y

echo "✅ Система оновлена"

# ============================================
# КРОК 5: ВСТАНОВЛЕННЯ NGINX
# ============================================
echo "📦 КРОК 5: Встановлення nginx..."

# Встановлення nginx
apt-get install nginx -y

# Перевірка встановлення
if ! command -v nginx &> /dev/null; then
    echo "❌ Помилка встановлення nginx!"
    exit 1
fi

echo "✅ Nginx встановлено: $(nginx -v 2>&1)"

# ============================================
# КРОК 6: ВСТАНОВЛЕННЯ CERTBOT
# ============================================
echo "🔒 КРОК 6: Встановлення certbot..."

# Встановлення certbot
apt-get install certbot python3-certbot-nginx -y

# Перевірка встановлення
if ! command -v certbot &> /dev/null; then
    echo "❌ Помилка встановлення certbot!"
    exit 1
fi

echo "✅ Certbot встановлено: $(certbot --version 2>&1)"

# ============================================
# КРОК 7: БАЗОВА КОНФІГУРАЦІЯ NGINX
# ============================================
echo "⚙️  КРОК 7: Базова конфігурація nginx..."

# Створення базової конфігурації nginx
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    # Logging Settings
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Virtual Host Configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Створення директорій
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /var/www/html

# Видалення default конфігурації
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default

echo "✅ Базова конфігурація nginx створена"

# ============================================
# КРОК 8: КОНФІГУРАЦІЯ FIREWALL
# ============================================
echo "🛡️  КРОК 8: Конфігурація firewall..."

# Встановлення ufw якщо не встановлено
if ! command -v ufw &> /dev/null; then
    apt-get install ufw -y
fi

# Базові правила firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Дозволити SSH, HTTP, HTTPS
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Активація firewall
ufw --force enable

echo "✅ Firewall налаштовано"

# ============================================
# КРОК 9: СТВОРЕННЯ HTTP КОНФІГУРАЦІЇ
# ============================================
echo "🌐 КРОК 9: Створення HTTP конфігурації..."

# Створення тимчасової HTTP конфігурації
cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Temporary redirect to app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Logs
    access_log /var/log/nginx/${DOMAIN}.access.log;
    error_log /var/log/nginx/${DOMAIN}.error.log;
}
EOF

# Активація конфігурації
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Створення директорії для Let's Encrypt
mkdir -p /var/www/html/.well-known/acme-challenge/
chown -R www-data:www-data /var/www/html/

echo "✅ HTTP конфігурація створена"

# ============================================
# КРОК 10: ТЕСТУВАННЯ NGINX
# ============================================
echo "🔍 КРОК 10: Тестування nginx..."

# Тестування конфігурації
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфігурація nginx валідна"
    
    # Запуск nginx
    systemctl enable nginx
    systemctl start nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx успішно запущено"
        systemctl status nginx --no-pager -l
    else
        echo "❌ Помилка запуску nginx!"
        systemctl status nginx --no-pager -l
        exit 1
    fi
else
    echo "❌ Помилка в конфігурації nginx!"
    nginx -t
    exit 1
fi

# ============================================
# КРОК 11: СТВОРЕННЯ SSL СЕРТИФІКАТА
# ============================================
echo "🔒 КРОК 11: Створення SSL сертифіката..."

# Очікування запуску nginx
sleep 5

# Створення SSL сертифіката
certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL сертифікат успішно створено!"
    
    # Показати інформацію про сертифікат
    echo ""
    echo "📅 Інформація про сертифікат:"
    openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates
    
else
    echo "❌ Помилка створення SSL сертифіката!"
    echo ""
    echo "🔍 Можливі причини:"
    echo "   - Домен не вказує на цей сервер"
    echo "   - DNS записи не налаштовані правильно"
    echo "   - Firewall блокує з'єднання"
    echo ""
    echo "🔧 Перевірте DNS:"
    echo "   dig $DOMAIN"
    echo "   nslookup $DOMAIN"
    echo ""
    echo "🔧 Перевірте доступність:"
    echo "   curl -I http://$DOMAIN"
    echo ""
    echo "⚠️  Продовжуємо без SSL..."
fi

# ============================================
# КРОК 12: СТВОРЕННЯ ПОВНОЇ HTTPS КОНФІГУРАЦІЇ
# ============================================
echo "🔧 КРОК 12: Створення повної HTTPS конфігурації..."

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    # Створення повної HTTPS конфігурації
    cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name iryscrush.xyz www.iryscrush.xyz;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name iryscrush.xyz www.iryscrush.xyz;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/iryscrush.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iryscrush.xyz/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # SSL optimizations
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/iryscrush.xyz/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'self';" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        
        # No caching for dynamic content
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Static files with caching
    location ~* \.(css|js)$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 1h;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 1d;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # Security locations
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Logs
    access_log /var/log/nginx/iryscrush.xyz.access.log;
    error_log /var/log/nginx/iryscrush.xyz.error.log;
}
EOF

    echo "✅ HTTPS конфігурація створена"
else
    echo "⚠️  SSL сертифікат не знайдено, залишаємо HTTP конфігурацію"
fi

# ============================================
# КРОК 13: НАЛАШТУВАННЯ АВТООНОВЛЕННЯ SSL
# ============================================
echo "🔄 КРОК 13: Налаштування автооновлення SSL..."

# Створення cron job для автооновлення
echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx" | crontab -

# Активація certbot timer
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ Автооновлення SSL налаштовано"

# ============================================
# КРОК 14: НАЛАШТУВАННЯ ДОДАТКУ
# ============================================
echo "🚀 КРОК 14: Налаштування додатку..."

# Перевірка існування додатку
if [ -d "$APP_PATH" ]; then
    echo "📁 Додаток знайдено в: $APP_PATH"
    
    # Перевірка Node.js
    if ! command -v node &> /dev/null; then
        echo "📦 Встановлення Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
        apt-get install -y nodejs
    fi
    
    # Перевірка PM2
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Встановлення PM2..."
        npm install -g pm2
    fi
    
    # Перехід до директорії додатку
    cd "$APP_PATH"
    
    # Встановлення залежностей
    if [ -f "package.json" ]; then
        echo "📦 Встановлення залежностей..."
        npm install
    fi
    
    # Запуск додатку через PM2
    if [ -f "server.js" ]; then
        echo "🚀 Запуск додатку..."
        pm2 stop iryscrush 2>/dev/null || true
        pm2 delete iryscrush 2>/dev/null || true
        pm2 start server.js --name iryscrush
        pm2 save
        pm2 startup
        
        echo "✅ Додаток запущено через PM2"
    else
        echo "⚠️  server.js не знайдено, запустіть додаток вручну"
    fi
    
else
    echo "⚠️  Додаток не знайдено в: $APP_PATH"
    echo "   Скопіюйте додаток і запустіть його вручну"
fi

# ============================================
# КРОК 15: ФІНАЛЬНЕ ТЕСТУВАННЯ
# ============================================
echo "🔍 КРОК 15: Фінальне тестування..."

# Перезавантаження nginx
nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "✅ Nginx перезавантажено"
else
    echo "❌ Помилка в конфігурації nginx!"
    nginx -t
fi

# Тестування HTTP
sleep 3
echo "🌐 Тестування HTTP..."
if curl -sI http://$DOMAIN | grep -q "HTTP/"; then
    echo "✅ HTTP працює"
else
    echo "⚠️  HTTP може мати проблеми"
fi

# Тестування HTTPS (якщо SSL є)
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🔒 Тестування HTTPS..."
    if curl -sI https://$DOMAIN | grep -q "HTTP/"; then
        echo "✅ HTTPS працює"
    else
        echo "⚠️  HTTPS може мати проблеми"
    fi
fi

# ============================================
# ЗАВЕРШЕННЯ
# ============================================
echo ""
echo "🎉 ПОВНА ПЕРЕУСТАНОВКА ЗАВЕРШЕНА!"
echo ""
echo "📋 Що було встановлено:"
echo "   ✅ Nginx $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "   ✅ Certbot $(certbot --version 2>&1 | cut -d' ' -f2)"
echo "   ✅ UFW Firewall"
echo "   ✅ HTTP/HTTPS конфігурація"
echo "   ✅ SSL сертифікати (якщо успішно)"
echo "   ✅ Автооновлення SSL"
echo "   ✅ PM2 для додатку"
echo ""
echo "🔍 Команди для моніторингу:"
echo "   sudo systemctl status nginx"
echo "   sudo tail -f /var/log/nginx/${DOMAIN}.error.log"
echo "   curl -I https://$DOMAIN"
echo "   pm2 status"
echo "   pm2 logs iryscrush"
echo ""
echo "🌐 Сайт: https://$DOMAIN"
echo ""

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "🎉 SSL сертифікат активний!"
    echo "📅 Термін дії:"
    openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates
else
    echo "⚠️  SSL сертифікат не створено"
    echo "🔧 Для створення SSL виконайте:"
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "✅ Переустановка завершена успішно!" 