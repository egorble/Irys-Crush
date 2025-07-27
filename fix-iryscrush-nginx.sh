#!/bin/bash

# Виправлення nginx конфігурації для iryscrush.xyz
echo "🔧 Виправлення nginx конфігурації для iryscrush.xyz..."

DOMAIN="iryscrush.xyz"
APP_PORT=3000

# Створення правильної конфігурації
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name iryscrush.xyz www.iryscrush.xyz;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name iryscrush.xyz www.iryscrush.xyz;
    
    # SSL configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/iryscrush.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iryscrush.xyz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Disable caching for HTML and API
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
        
        # No caching for HTML
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Short cache for CSS/JS files
    location ~* \.(css|js)$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 5m;
        add_header Cache-Control "public";
    }
    
    # Cache for images
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp)$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # Logs
    access_log /var/log/nginx/iryscrush.xyz.access.log;
    error_log /var/log/nginx/iryscrush.xyz.error.log;
}
EOF

echo "✅ Конфігурація створена!"

# Перевірка SSL сертифікатів
echo "🔍 Перевірка SSL сертифікатів..."
if [ -f "/etc/letsencrypt/live/iryscrush.xyz/fullchain.pem" ]; then
    echo "✅ SSL сертифікат знайдено"
else
    echo "⚠️  SSL сертифікат не знайдено, створюємо конфігурацію без SSL..."
    
    # Конфігурація без SSL для отримання сертифіката
    cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
# HTTP server (for SSL certificate generation)
server {
    listen 80;
    server_name iryscrush.xyz www.iryscrush.xyz;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No caching
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }
    
    # Logs
    access_log /var/log/nginx/iryscrush.xyz.access.log;
    error_log /var/log/nginx/iryscrush.xyz.error.log;
}
EOF
fi

# Перевірка конфігурації
echo "🔍 Перевірка конфігурації nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Конфігурація nginx валідна!"
    
    # Активація конфігурації
    echo "🔗 Активація конфігурації..."
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Перезавантаження nginx
    echo "🔄 Перезавантаження nginx..."
    systemctl reload nginx
    
    echo "✅ Nginx успішно перезавантажено!"
    
    # Перевірка статусу Node.js додатку
    echo "🔍 Перевірка статусу Node.js додатку..."
    if systemctl is-active --quiet irysgame; then
        echo "✅ Node.js додаток працює"
    else
        echo "⚠️  Node.js додаток не працює, запускаємо..."
        systemctl start irysgame
        sleep 3
        if systemctl is-active --quiet irysgame; then
            echo "✅ Node.js додаток запущено"
        else
            echo "❌ Помилка запуску Node.js додатку"
            echo "Перевірте: journalctl -u irysgame -f"
        fi
    fi
    
    echo ""
    echo "🎉 Виправлення завершено!"
    echo ""
    echo "📋 Що було виправлено:"
    echo "   ✅ Виправлено синтаксис nginx конфігурації"
    echo "   ✅ Додано правильні SSL параметри"
    echo "   ✅ Налаштовано кешування"
    echo "   ✅ Перевірено статус Node.js додатку"
    
    # Якщо SSL сертифікат відсутній
    if [ ! -f "/etc/letsencrypt/live/iryscrush.xyz/fullchain.pem" ]; then
        echo ""
        echo "🔒 Для отримання SSL сертифіката виконайте:"
        echo "sudo certbot --nginx -d iryscrush.xyz -d www.iryscrush.xyz"
        echo ""
        echo "Після отримання сертифіката запустіть скрипт знову для HTTPS конфігурації"
    fi
    
else
    echo "❌ Помилка в конфігурації nginx!"
    echo "Деталі помилки:"
    nginx -t
    exit 1
fi 