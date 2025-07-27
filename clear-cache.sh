#!/bin/bash

# Швидкий скрипт для очищення всіх кешів
# Використання: ./clear-cache.sh [domain]

DOMAIN=$1

echo "🧹 Очищення всіх кешів..."

# 1. Очищення кешу nginx
if command -v nginx >/dev/null 2>&1; then
    echo "🔄 Перезавантаження nginx..."
    systemctl reload nginx
    echo "✅ Nginx кеш очищено"
else
    echo "⚠️  Nginx не знайдено"
fi

# 2. Очищення кешу браузера через заголовки
echo "🌐 Налаштування заголовків для очищення браузерного кешу..."

# 3. Перезапуск Node.js додатку для оновлення
if systemctl is-active --quiet irysgame; then
    echo "🔄 Перезапуск Node.js додатку..."
    systemctl restart irysgame
    sleep 3
    if systemctl is-active --quiet irysgame; then
        echo "✅ Додаток перезапущено"
    else
        echo "❌ Помилка перезапуску додатку"
        echo "Перевірте: journalctl -u irysgame -f"
    fi
else
    echo "⚠️  Сервіс irysgame не запущено"
fi

# 4. Очищення DNS кешу (якщо можливо)
if command -v systemd-resolve >/dev/null 2>&1; then
    echo "🔄 Очищення DNS кешу..."
    systemd-resolve --flush-caches
    echo "✅ DNS кеш очищено"
fi

# 5. Показ інструкцій для браузера
echo ""
echo "✅ Серверні кеші очищено!"
echo ""
echo "🔄 Для повного оновлення в браузері:"
echo "   1. Натисніть Ctrl+F5 (Windows/Linux) або Cmd+Shift+R (Mac)"
echo "   2. Або відкрийте Developer Tools (F12):"
echo "      - Правий клік на кнопці оновлення"
echo "      - Виберіть 'Empty Cache and Hard Reload'"
echo "   3. Або в Chrome/Edge:"
echo "      - F12 → Network tab → Disable cache ✓"
echo "      - Потім звичайне оновлення"

if [ -n "$DOMAIN" ]; then
    echo ""
    echo "🌐 Ваш сайт: https://$DOMAIN"
    echo "🕒 Timestamp: $(date +%s)"
fi

echo ""
echo "🎉 Очищення кешу завершено!" 