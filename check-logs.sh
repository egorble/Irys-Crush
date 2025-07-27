#!/bin/bash

# Скрипт для перевірки логів IrysCrush гри на сервері
echo "📋 ПЕРЕВІРКА ЛОГІВ IRYСCRUSH ГРИ"
echo "================================"

# Функція для красивого виводу
print_section() {
    echo ""
    echo "🔍 $1"
    echo "$(printf '%.0s-' {1..50})"
}

# ============================================
# СИСТЕМНІ ЛОГИ ДОДАТКУ
# ============================================
print_section "СИСТЕМНІ ЛОГИ ДОДАТКУ (PM2/SYSTEMD)"

# Перевірка PM2 логів
if command -v pm2 &> /dev/null; then
    echo "📊 PM2 статус:"
    pm2 list 2>/dev/null || echo "❌ PM2 не запущено або немає процесів"
    
    echo ""
    echo "📋 PM2 логи (останні 50 рядків):"
    pm2 logs --lines 50 2>/dev/null || echo "❌ Немає PM2 логів"
    
    echo ""
    echo "❌ PM2 помилки (останні 20 рядків):"
    pm2 logs --err --lines 20 2>/dev/null || echo "❌ Немає PM2 помилок"
else
    echo "ℹ️  PM2 не встановлено"
fi

# Перевірка systemd логів
echo ""
echo "📋 Systemd логи (journalctl):"
if systemctl is-active --quiet irysgame 2>/dev/null; then
    echo "✅ Сервіс irysgame активний"
    journalctl -u irysgame --lines=30 --no-pager 2>/dev/null || echo "❌ Немає systemd логів"
else
    echo "❌ Сервіс irysgame не активний"
    # Пошук можливих назв сервісу
    for service in irysgame iryscrush testcrush node-app; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            echo "✅ Знайдено активний сервіс: $service"
            journalctl -u $service --lines=20 --no-pager 2>/dev/null
            break
        fi
    done
fi

# ============================================
# ЛОГИ NODE.JS ДОДАТКУ
# ============================================
print_section "ЛОГИ NODE.JS ДОДАТКУ"

# Пошук логів у різних місцях
LOG_LOCATIONS=(
    "/var/log/irysgame.log"
    "/var/log/iryscrush.log"
    "/var/log/testcrush.log"
    "/var/log/node-app.log"
    "./server.log"
    "./app.log"
    "./logs/server.log"
    "./logs/app.log"
    "/home/*/testcrush/server.log"
    "/opt/irysgame/server.log"
)

echo "🔍 Пошук логів додатку:"
for log_file in "${LOG_LOCATIONS[@]}"; do
    if [ -f "$log_file" ]; then
        echo "✅ Знайдено: $log_file"
        echo "📋 Останні 20 рядків:"
        tail -20 "$log_file" 2>/dev/null
        echo ""
    fi
done

# ============================================
# ЛОГИ NGINX
# ============================================
print_section "ЛОГИ NGINX"

if command -v nginx &> /dev/null; then
    echo "📋 Nginx access логи (останні 20 рядків):"
    tail -20 /var/log/nginx/access.log 2>/dev/null || echo "❌ Немає access логів"
    
    echo ""
    echo "❌ Nginx error логи (останні 20 рядків):"
    tail -20 /var/log/nginx/error.log 2>/dev/null || echo "❌ Немає error логів"
    
    # Специфічні логи для домену
    for domain_log in /var/log/nginx/*irys* /var/log/nginx/*crush*; do
        if [ -f "$domain_log" ]; then
            echo ""
            echo "📋 Лог домену: $(basename "$domain_log")"
            tail -10 "$domain_log" 2>/dev/null
        fi
    done
else
    echo "ℹ️  Nginx не встановлено"
fi

# ============================================
# ЛОГИ SSL/CERTBOT
# ============================================
print_section "ЛОГИ SSL/CERTBOT"

if command -v certbot &> /dev/null; then
    echo "📋 Certbot логи (останні 20 рядків):"
    tail -20 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo "❌ Немає certbot логів"
else
    echo "ℹ️  Certbot не встановлено"
fi

# ============================================
# ЛОГИ СИСТЕМИ
# ============================================
print_section "СИСТЕМНІ ЛОГИ"

echo "📋 Системні помилки (останні 10 рядків):"
tail -10 /var/log/syslog 2>/dev/null | grep -i error || echo "❌ Немає системних помилок"

echo ""
echo "📋 Авторизація (останні 10 рядків):"
tail -10 /var/log/auth.log 2>/dev/null || echo "❌ Немає логів авторизації"

# ============================================
# СТАТУС ПОРТІВ ТА ПРОЦЕСІВ
# ============================================
print_section "СТАТУС ПОРТІВ ТА ПРОЦЕСІВ"

echo "🌐 Відкриті порти:"
netstat -tlnp 2>/dev/null | grep -E ":80 |:443 |:3000 " || echo "❌ Основні порти не відкриті"

echo ""
echo "⚙️  Node.js процеси:"
ps aux | grep node | grep -v grep || echo "❌ Node.js процеси не знайдені"

echo ""
echo "🌐 Nginx процеси:"
ps aux | grep nginx | grep -v grep || echo "❌ Nginx процеси не знайдені"

# ============================================
# ПЕРЕВІРКА ДОСТУПНОСТІ
# ============================================
print_section "ПЕРЕВІРКА ДОСТУПНОСТІ"

# Локальна перевірка
echo "🔍 Локальна перевірка портів:"
for port in 3000 80 443; do
    if curl -s -o /dev/null -w "%{http_code}" "localhost:$port" 2>/dev/null | grep -q "200\|301\|302"; then
        echo "✅ Порт $port відповідає"
    else
        echo "❌ Порт $port не відповідає"
    fi
done

# Перевірка домену (якщо є)
if [ -f "/etc/nginx/sites-enabled/irysgame" ] || [ -f "/etc/nginx/sites-enabled/iryscrush" ]; then
    DOMAIN=$(grep -h "server_name" /etc/nginx/sites-enabled/* 2>/dev/null | head -1 | awk '{print $2}' | sed 's/;//')
    if [ ! -z "$DOMAIN" ]; then
        echo ""
        echo "🌍 Перевірка домену: $DOMAIN"
        if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null | grep -q "200\|301\|302"; then
            echo "✅ Домен $DOMAIN доступний"
        else
            echo "❌ Домен $DOMAIN недоступний"
        fi
    fi
fi

# ============================================
# КОРИСНІ КОМАНДИ
# ============================================
print_section "КОРИСНІ КОМАНДИ ДЛЯ МОНІТОРИНГУ"

echo "📋 Команди для моніторингу в реальному часі:"
echo ""
echo "   # Слідкування за логами PM2:"
echo "   pm2 logs --follow"
echo ""
echo "   # Слідкування за systemd логами:"
echo "   journalctl -u irysgame -f"
echo ""
echo "   # Слідкування за nginx логами:"
echo "   tail -f /var/log/nginx/error.log"
echo "   tail -f /var/log/nginx/access.log"
echo ""
echo "   # Перевірка статусу сервісів:"
echo "   systemctl status irysgame"
echo "   systemctl status nginx"
echo ""
echo "   # Перевірка використання ресурсів:"
echo "   htop"
echo "   free -h"
echo "   df -h"

echo ""
echo "✅ ПЕРЕВІРКА ЛОГІВ ЗАВЕРШЕНА!" 