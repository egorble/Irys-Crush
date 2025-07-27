#!/bin/bash

# Скрипт для повного видалення nginx, SSL та всіх пов'язаних компонентів
echo "🗑️  ПОВНЕ ВИДАЛЕННЯ NGINX, SSL ТА ВСІХ КОМПОНЕНТІВ"
echo "⚠️  УВАГА: Це видалить ВСЕ пов'язане з nginx та SSL!"
echo ""

# Перевірка прав root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Цей скрипт потрібно запускати з правами root!"
    echo "Використайте: sudo $0"
    exit 1
fi

echo "🔍 Поточний стан системи:"
echo "   Nginx: $(which nginx 2>/dev/null || echo 'не встановлено')"
echo "   Certbot: $(which certbot 2>/dev/null || echo 'не встановлено')"
echo ""

read -p "⚠️  Продовжити повне видалення? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Скасовано користувачем"
    exit 1
fi

echo ""
echo "🔥 ПОЧИНАЄМО ПОВНЕ ВИДАЛЕННЯ..."
echo ""

# ============================================
# КРОК 1: ЗУПИНКА ВСІХ СЕРВІСІВ
# ============================================
echo "⏸️  КРОК 1: Зупинка всіх сервісів..."

# Зупинка nginx
systemctl stop nginx 2>/dev/null && echo "✅ Nginx зупинено" || echo "ℹ️  Nginx не запущено"
systemctl disable nginx 2>/dev/null && echo "✅ Nginx відключено з автозапуску" || echo "ℹ️  Nginx не в автозапуску"

# Зупинка certbot
systemctl stop certbot.timer 2>/dev/null && echo "✅ Certbot timer зупинено" || echo "ℹ️  Certbot timer не запущено"
systemctl disable certbot.timer 2>/dev/null && echo "✅ Certbot timer відключено" || echo "ℹ️  Certbot timer не в автозапуску"

# Зупинка всіх nginx процесів
pkill -f nginx 2>/dev/null && echo "✅ Всі nginx процеси зупинені" || echo "ℹ️  Nginx процеси не знайдені"

echo "✅ Сервіси зупинені"

# ============================================
# КРОК 2: ВИДАЛЕННЯ NGINX ПАКЕТІВ
# ============================================
echo ""
echo "📦 КРОК 2: Видалення nginx пакетів..."

# Видалення всіх nginx пакетів
apt-get remove --purge nginx nginx-common nginx-core nginx-full nginx-light nginx-extras -y 2>/dev/null
apt-get remove --purge 'nginx*' -y 2>/dev/null

# Видалення залежностей
apt-get autoremove -y 2>/dev/null
apt-get autoclean 2>/dev/null

echo "✅ Nginx пакети видалені"

# ============================================
# КРОК 3: ВИДАЛЕННЯ CERTBOT ТА SSL
# ============================================
echo ""
echo "🔒 КРОК 3: Видалення certbot та SSL..."

# Відкликання всіх сертифікатів (якщо можливо)
if command -v certbot &> /dev/null; then
    echo "🔄 Спроба відкликання сертифікатів..."
    certbot delete --cert-name iryscrush.xyz 2>/dev/null || echo "ℹ️  Сертифікат iryscrush.xyz не знайдено"
    
    # Відкликання всіх інших сертифікатів
    for cert in $(certbot certificates 2>/dev/null | grep "Certificate Name:" | awk '{print $3}'); do
        echo "🗑️  Видалення сертифіката: $cert"
        certbot delete --cert-name "$cert" 2>/dev/null || echo "⚠️  Не вдалося видалити $cert"
    done
fi

# Видалення certbot пакетів
apt-get remove --purge certbot python3-certbot-nginx python3-certbot-apache python3-certbot* -y 2>/dev/null
apt-get remove --purge 'certbot*' -y 2>/dev/null
apt-get remove --purge 'python3-certbot*' -y 2>/dev/null

echo "✅ Certbot видалено"

# ============================================
# КРОК 4: ВИДАЛЕННЯ ВСІХ КОНФІГУРАЦІЙ
# ============================================
echo ""
echo "🗂️  КРОК 4: Видалення всіх конфігурацій..."

# Nginx конфігурації
echo "🗑️  Видалення nginx конфігурацій..."
rm -rf /etc/nginx/
rm -rf /var/lib/nginx/
rm -rf /var/cache/nginx/
rm -rf /var/log/nginx/
rm -rf /usr/share/nginx/
rm -rf /etc/default/nginx
rm -rf /etc/init.d/nginx
rm -rf /etc/logrotate.d/nginx

# SSL сертифікати та конфігурації
echo "🗑️  Видалення SSL сертифікатів..."
rm -rf /etc/letsencrypt/
rm -rf /var/lib/letsencrypt/
rm -rf /var/log/letsencrypt/
rm -rf /etc/ssl/certs/nginx*
rm -rf /etc/ssl/private/nginx*

# Systemd сервіси
echo "🗑️  Видалення systemd сервісів..."
rm -rf /lib/systemd/system/nginx.service
rm -rf /etc/systemd/system/nginx.service
rm -rf /lib/systemd/system/certbot.service
rm -rf /lib/systemd/system/certbot.timer
rm -rf /etc/systemd/system/certbot.service
rm -rf /etc/systemd/system/certbot.timer

# Перезавантаження systemd
systemctl daemon-reload

echo "✅ Конфігурації видалені"

# ============================================
# КРОК 5: ВИДАЛЕННЯ КЕШУ ТА ТИМЧАСОВИХ ФАЙЛІВ
# ============================================
echo ""
echo "🧹 КРОК 5: Очищення кешу та тимчасових файлів..."

# APT кеш
echo "🗑️  Очищення APT кешу..."
apt-get clean
apt-get autoclean

# Кеш nginx
echo "🗑️  Очищення nginx кешу..."
rm -rf /var/cache/nginx/
rm -rf /tmp/nginx*
rm -rf /var/tmp/nginx*

# Логи
echo "🗑️  Очищення логів..."
rm -rf /var/log/nginx*
rm -rf /var/log/letsencrypt*
rm -rf /var/log/certbot*

# PID файли
echo "🗑️  Очищення PID файлів..."
rm -rf /var/run/nginx*
rm -rf /run/nginx*

# Сокети
echo "🗑️  Очищення сокетів..."
rm -rf /var/lib/nginx/
rm -rf /run/nginx/

echo "✅ Кеш та тимчасові файли очищені"

# ============================================
# КРОК 6: ВИДАЛЕННЯ КОРИСТУВАЧІВ ТА ГРУП
# ============================================
echo ""
echo "👥 КРОК 6: Видалення користувачів та груп..."

# Видалення користувача www-data (обережно!)
if id "www-data" &>/dev/null; then
    # Перевіряємо чи не використовується www-data іншими сервісами
    if ! pgrep -u www-data > /dev/null 2>&1; then
        echo "🗑️  Видалення користувача www-data..."
        userdel www-data 2>/dev/null || echo "⚠️  Не вдалося видалити www-data"
    else
        echo "⚠️  www-data використовується іншими процесами, залишаємо"
    fi
else
    echo "ℹ️  Користувач www-data не існує"
fi

# Видалення групи nginx
if getent group nginx > /dev/null 2>&1; then
    echo "🗑️  Видалення групи nginx..."
    groupdel nginx 2>/dev/null || echo "⚠️  Не вдалося видалити групу nginx"
else
    echo "ℹ️  Група nginx не існує"
fi

echo "✅ Користувачі та групи перевірені"

# ============================================
# КРОК 7: ОЧИЩЕННЯ CRON ЗАВДАНЬ
# ============================================
echo ""
echo "⏰ КРОК 7: Очищення cron завдань..."

# Видалення certbot cron завдань
echo "🗑️  Видалення certbot cron завдань..."
crontab -l 2>/dev/null | grep -v certbot | crontab - 2>/dev/null || echo "ℹ️  Cron завдань certbot не знайдено"

# Видалення nginx cron завдань
crontab -l 2>/dev/null | grep -v nginx | crontab - 2>/dev/null || echo "ℹ️  Cron завдань nginx не знайдено"

# Системні cron завдання
rm -f /etc/cron.d/certbot
rm -f /etc/cron.d/nginx*
rm -f /etc/cron.daily/nginx*
rm -f /etc/cron.weekly/nginx*
rm -f /etc/cron.monthly/nginx*

echo "✅ Cron завдання очищені"

# ============================================
# КРОК 8: ВИДАЛЕННЯ FIREWALL ПРАВИЛ
# ============================================
echo ""
echo "🛡️  КРОК 8: Очищення firewall правил..."

# UFW правила
if command -v ufw &> /dev/null; then
    echo "🗑️  Видалення UFW правил для HTTP/HTTPS..."
    ufw delete allow 80/tcp 2>/dev/null || echo "ℹ️  HTTP правило не знайдено"
    ufw delete allow 443/tcp 2>/dev/null || echo "ℹ️  HTTPS правило не знайдено"
    ufw delete allow 'Nginx Full' 2>/dev/null || echo "ℹ️  Nginx Full правило не знайдено"
    ufw delete allow 'Nginx HTTP' 2>/dev/null || echo "ℹ️  Nginx HTTP правило не знайдено"
    ufw delete allow 'Nginx HTTPS' 2>/dev/null || echo "ℹ️  Nginx HTTPS правило не знайдено"
else
    echo "ℹ️  UFW не встановлено"
fi

# iptables правила (обережно!)
echo "⚠️  Firewall правила залишені без змін для безпеки"

echo "✅ Firewall правила перевірені"

# ============================================
# КРОК 9: ФІНАЛЬНА ПЕРЕВІРКА
# ============================================
echo ""
echo "🔍 КРОК 9: Фінальна перевірка..."

# Перевірка залишків
echo "🔍 Пошук залишків nginx..."
find /etc -name "*nginx*" -type f 2>/dev/null | head -5
find /var -name "*nginx*" -type d 2>/dev/null | head -5
find /usr -name "*nginx*" -type f 2>/dev/null | head -5

echo ""
echo "🔍 Пошук залишків SSL..."
find /etc -name "*letsencrypt*" -type d 2>/dev/null | head -5
find /var -name "*letsencrypt*" -type d 2>/dev/null | head -5

# Перевірка процесів
echo ""
echo "🔍 Перевірка процесів..."
if pgrep nginx > /dev/null; then
    echo "⚠️  Знайдені nginx процеси:"
    pgrep -l nginx
else
    echo "✅ Nginx процеси не знайдені"
fi

# Перевірка портів
echo ""
echo "🔍 Перевірка портів 80 та 443..."
if netstat -tlnp 2>/dev/null | grep -E ":80 |:443 "; then
    echo "⚠️  Порти 80/443 все ще використовуються:"
    netstat -tlnp 2>/dev/null | grep -E ":80 |:443 "
else
    echo "✅ Порти 80/443 вільні"
fi

# ============================================
# ЗАВЕРШЕННЯ
# ============================================
echo ""
echo "🎉 ПОВНЕ ВИДАЛЕННЯ ЗАВЕРШЕНО!"
echo ""
echo "📋 Що було видалено:"
echo "   ✅ Всі nginx пакети та залежності"
echo "   ✅ Certbot та всі SSL сертифікати"
echo "   ✅ Всі конфігураційні файли"
echo "   ✅ Кеш, логи та тимчасові файли"
echo "   ✅ Systemd сервіси"
echo "   ✅ Cron завдання"
echo "   ✅ Більшість firewall правил"
echo ""
echo "⚠️  Що НЕ було видалено (для безпеки):"
echo "   - Користувач www-data (якщо використовується)"
echo "   - Основні iptables правила"
echo "   - Системні SSL сертифікати"
echo ""
echo "🔄 Рекомендації:"
echo "   - Перезавантажте систему для повного очищення"
echo "   - Перевірте чи не залишилися інші веб-сервери"
echo "   - Видаліть DNS записи якщо не плануєте відновлення"
echo ""
echo "✅ Система очищена від nginx та SSL компонентів!"

# Пропозиція перезавантаження
echo ""
read -p "🔄 Перезавантажити систему зараз? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Перезавантаження через 5 секунд..."
    sleep 5
    reboot
else
    echo "ℹ️  Рекомендується перезавантажити систему пізніше"
fi 