# Налаштування домену для IrysGame

Цей набір скриптів дозволяє автоматично налаштувати домен з SSL сертифікатом та Nginx для вашого IrysGame додатку.

## Файли

- `setup-domain.sh` - Основний скрипт для налаштування сервера
- `deploy-irysgame.sh` - Скрипт для деплою додатку
- `DOMAIN-SETUP-README.md` - Цей файл з інструкціями

## Передумови

1. **VPS/Сервер** з Ubuntu 18.04+ або Debian 10+
2. **Root доступ** до сервера
3. **Домен**, який вказує на IP вашого сервера (A-записи)
4. **Email** для SSL сертифіката

## Крок 1: Підготовка сервера

### Налаштування DNS записів

Перед запуском скриптів переконайтесь, що DNS записи вказують на ваш сервер:

```
yourdomain.com     A     YOUR_SERVER_IP
www.yourdomain.com A     YOUR_SERVER_IP
```

### Завантаження скриптів на сервер

```bash
# Завантажте скрипти на ваш сервер
scp setup-domain.sh deploy-irysgame.sh root@YOUR_SERVER_IP:/root/

# Або створіть їх прямо на сервері
nano /root/setup-domain.sh
nano /root/deploy-irysgame.sh
```

## Крок 2: Налаштування домену

### Запуск основного скрипту

```bash
# Зробіть скрипт виконуваним
chmod +x /root/setup-domain.sh

# Запустіть налаштування (замініть на ваші дані)
./setup-domain.sh yourdomain.com admin@yourdomain.com
```

### Що робить скрипт:

1. ✅ Оновлює систему
2. ✅ Встановлює Nginx, Certbot, Node.js, PM2
3. ✅ Налаштовує firewall (UFW)
4. ✅ Створює конфігурацію Nginx з проксуванням
5. ✅ Отримує SSL сертифікат від Let's Encrypt
6. ✅ Налаштовує автоматичне оновлення сертифікатів
7. ✅ Створює systemd сервіс для додатку
8. ✅ Створює корисні скрипти для моніторингу та деплою

## Крок 3: Деплой додатку

### Підготовка файлів

```bash
# Зробіть скрипт виконуваним
chmod +x /root/deploy-irysgame.sh

# Запустіть деплой (замініть шляхи на ваші)
./deploy-irysgame.sh /path/to/your/testcrush yourdomain.com
```

### Альтернативний спосіб - ручне копіювання

```bash
# Скопіюйте файли вашого проекту
rsync -av --exclude='node_modules' /local/path/to/testcrush/ /var/www/yourdomain.com/

# Налаштуйте права доступу
chown -R www-data:www-data /var/www/yourdomain.com
chmod -R 755 /var/www/yourdomain.com

# Встановіть залежності
cd /var/www/yourdomain.com
sudo -u www-data npm install --production

# Запустіть сервіс
systemctl start irysgame
systemctl enable irysgame
```

## Крок 4: Перевірка

### Перевірка статусу сервісів

```bash
# Статус Nginx
systemctl status nginx

# Статус вашого додатку
systemctl status irysgame

# Статус SSL сертифіката
certbot certificates

# Перевірка портів
netstat -tlnp | grep :80
netstat -tlnp | grep :443
netstat -tlnp | grep :3000
```

### Перевірка сайту

```bash
# Перевірка HTTP редіректу
curl -I http://yourdomain.com

# Перевірка HTTPS
curl -I https://yourdomain.com

# Перевірка SSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

## Управління додатком

### Systemd команди

```bash
# Запуск
systemctl start irysgame

# Зупинка
systemctl stop irysgame

# Перезапуск
systemctl restart irysgame

# Статус
systemctl status irysgame

# Автозапуск
systemctl enable irysgame

# Відключити автозапуск
systemctl disable irysgame
```

### Логи

```bash
# Логи додатку
journalctl -u irysgame -f

# Логи Nginx
tail -f /var/log/nginx/yourdomain.com.access.log
tail -f /var/log/nginx/yourdomain.com.error.log

# Системні логи
tail -f /var/log/syslog
```

## Корисні скрипти

Після налаштування у вас будуть доступні:

### Моніторинг
```bash
/root/monitor-yourdomain.com.sh
```

### Деплой
```bash
/root/deploy-yourdomain.com.sh
```

## PM2 (альтернатива systemd)

Якщо ви хочете використовувати PM2 замість systemd:

```bash
# Зупинити systemd сервіс
systemctl stop irysgame
systemctl disable irysgame

# Запустити через PM2
cd /var/www/yourdomain.com
pm2 start ecosystem.config.js --env production

# Зберегти конфігурацію PM2
pm2 save

# Налаштувати автозапуск PM2
pm2 startup
```

### PM2 команди

```bash
# Статус
pm2 status

# Логи
pm2 logs irysgame

# Перезапуск
pm2 restart irysgame

# Зупинка
pm2 stop irysgame

# Моніторинг
pm2 monit
```

## Налаштування середовища

### Файл .env

Створіть або відредагуйте файл `/var/www/yourdomain.com/.env`:

```bash
NODE_ENV=production
PORT=3000

# Blockchain settings
IRYS_NETWORK=testnet
IRYS_RPC_URL=https://testnet-rpc.irys.xyz/v1/execution-rpc
IRYS_CHAIN_ID=1270

# Add your other environment variables here
```

### Безпека

```bash
# Налаштуйте права доступу для .env
chown www-data:www-data /var/www/yourdomain.com/.env
chmod 600 /var/www/yourdomain.com/.env
```

## Оновлення SSL сертифіката

SSL сертифікати автоматично оновлюються, але ви можете перевірити:

```bash
# Перевірка статусу
certbot certificates

# Тестове оновлення
certbot renew --dry-run

# Примусове оновлення
certbot renew --force-renewal
```

## Резервне копіювання

### Автоматичне резервне копіювання

Додайте до crontab:

```bash
crontab -e

# Додайте рядок для щоденного бекапу о 2:00
0 2 * * * /root/backup-script.sh
```

### Створення backup скрипту

```bash
cat > /root/backup-script.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/irysgame"
DOMAIN="yourdomain.com"

mkdir -p $BACKUP_DIR

# Backup файлів додатку
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /var/www/$DOMAIN .

# Backup конфігурації Nginx
tar -czf $BACKUP_DIR/nginx_backup_$DATE.tar.gz -C /etc/nginx .

# Видалення старих бекапів (старше 7 днів)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /root/backup-script.sh
```

## Налагодження проблем

### Додаток не запускається

```bash
# Перевірте логи
journalctl -u irysgame -n 50

# Перевірте порт
netstat -tlnp | grep :3000

# Перевірте права доступу
ls -la /var/www/yourdomain.com/

# Перевірте Node.js версію
node --version
npm --version
```

### Nginx помилки

```bash
# Перевірте конфігурацію
nginx -t

# Перевірте логи
tail -f /var/log/nginx/error.log

# Перевірте статус
systemctl status nginx
```

### SSL проблеми

```bash
# Перевірте сертифікат
certbot certificates

# Перевірте доступність домену
dig yourdomain.com

# Тест SSL
curl -I https://yourdomain.com
```

## Підтримка

Якщо у вас виникли проблеми:

1. Перевірте логи: `journalctl -u irysgame -f`
2. Перевірте статус: `systemctl status irysgame nginx`
3. Запустіть моніторинг: `/root/monitor-yourdomain.com.sh`
4. Перевірте firewall: `ufw status`
5. Перевірте DNS: `dig yourdomain.com`

## Безпека

### Рекомендації

1. **Змініть SSH порт** (не 22)
2. **Відключіть root SSH** (використовуйте sudo користувача)
3. **Налаштуйте fail2ban**
4. **Регулярно оновлюйте систему**
5. **Використовуйте сильні паролі**

### Додаткові налаштування безпеки

```bash
# Встановлення fail2ban
apt install fail2ban

# Налаштування SSH
nano /etc/ssh/sshd_config
# Port 2222
# PermitRootLogin no
# PasswordAuthentication no

# Перезапуск SSH
systemctl restart ssh
```

## Моніторинг

### Встановлення htop

```bash
apt install htop
```

### Простий моніторинг ресурсів

```bash
# Використання диску
df -h

# Використання пам'яті
free -h

# Процеси
htop

# Мережа
netstat -tulnp
```

Успіхів з налаштуванням вашого домену! 🚀 