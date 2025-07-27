#!/bin/bash

# Перевірка та запуск irysgame додатку
echo "🔍 Перевірка статусу IrysGame..."

# Перевірка статусу сервісу
echo "1. Статус systemd сервісу:"
systemctl status irysgame --no-pager -l

echo ""
echo "2. Перевірка процесів Node.js:"
ps aux | grep -E "(node|irysgame)" | grep -v grep

echo ""
echo "3. Перевірка порту 3000:"
netstat -tlnp | grep :3000

echo ""
echo "4. Перевірка файлів додатку:"
if [ -d "/var/www/iryscrush.xyz" ]; then
    echo "✅ Директорія додатку існує: /var/www/iryscrush.xyz"
    ls -la /var/www/iryscrush.xyz/server.js 2>/dev/null || echo "❌ server.js не знайдено"
    ls -la /var/www/iryscrush.xyz/package.json 2>/dev/null || echo "❌ package.json не знайдено"
else
    echo "❌ Директорія додатку не існує: /var/www/iryscrush.xyz"
fi

echo ""
echo "5. Перевірка логів:"
if [ -f "/var/log/nginx/iryscrush.xyz.error.log" ]; then
    echo "Останні помилки nginx:"
    tail -n 5 /var/log/nginx/iryscrush.xyz.error.log
else
    echo "❌ Лог файл nginx не знайдено"
fi

echo ""
if journalctl -u irysgame --no-pager -n 5 &>/dev/null; then
    echo "Останні логи irysgame:"
    journalctl -u irysgame --no-pager -n 5
else
    echo "❌ Логи irysgame недоступні"
fi

echo ""
echo "🔧 Рекомендації:"

# Перевірка чи працює сервіс
if ! systemctl is-active --quiet irysgame; then
    echo "❌ Сервіс irysgame не працює"
    echo "   Запустіть: sudo systemctl start irysgame"
    echo "   Автозапуск: sudo systemctl enable irysgame"
fi

# Перевірка чи слухає порт 3000
if ! netstat -tlnp | grep -q :3000; then
    echo "❌ Порт 3000 не слухається"
    echo "   Можливо Node.js додаток не запущено або працює на іншому порту"
fi

# Перевірка файлів
if [ ! -f "/var/www/iryscrush.xyz/server.js" ]; then
    echo "❌ server.js не знайдено"
    echo "   Переконайтеся що файли додатку скопійовано правильно"
fi

echo ""
echo "🚀 Швидкі команди:"
echo "Запуск сервісу:     sudo systemctl start irysgame"
echo "Перезапуск сервісу: sudo systemctl restart irysgame"
echo "Статус сервісу:     sudo systemctl status irysgame"
echo "Логи в реальному часі: sudo journalctl -u irysgame -f"
echo "Ручний запуск:      cd /var/www/iryscrush.xyz && sudo -u www-data node server.js" 