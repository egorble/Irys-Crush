# 🚀 IrysCrush - Повна Інструкція з Деплою на Сервер

Це детальне керівництво по розгортанню гри IrysCrush на blockchain Irys від початку до кінця.

## 📋 Передумови

### Система
- **Ubuntu 20.04/22.04** або **CentOS 7+**
- **RAM**: мінімум 2GB, рекомендовано 4GB+
- **Storage**: мінімум 20GB вільного місця
- **Network**: стабільне інтернет-з'єднання

### Інструменти
- **Node.js** v18+ 
- **npm** або **yarn**
- **git**
- **PM2** (для управління процесами)
- **nginx** (опционально, для reverse proxy)
- **SSL сертифікат** (Let's Encrypt)

## 🔧 Крок 1: Підготовка Сервера

### 1.1 Оновлення системи
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.2 Встановлення Node.js
```bash
# Встановлення Node.js v18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Перевірка версії
node --version
npm --version
```

### 1.3 Встановлення Git
```bash
sudo apt install git -y
```

### 1.4 Створення користувача для додатку
```bash
# Створення користувача
sudo adduser iryscrush
sudo usermod -aG sudo iryscrush

# Переключення на нового користувача
su - iryscrush
```

## 📦 Крок 2: Завантаження та Налаштування Проекту

### 2.1 Клонування репозиторію
```bash
cd /home/iryscrush
git clone <your-repository-url> iryscrush-app
cd iryscrush-app
```

### 2.2 Встановлення залежностей
```bash
npm install
```

### 2.3 Налаштування оточення
```bash
# Копіювання файлу налаштувань
cp env.example .env

# Редагування налаштувань
nano .env
```

**Конфігурація .env файлу:**
```env
# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key_here
CONTRACT_ADDRESS=will_be_set_after_deployment

# Server Configuration
PORT=3000
NODE_ENV=production

# Irys Network Settings (ПРАВИЛЬНІ значення згідно документації)
IRYS_NETWORK=testnet
IRYS_RPC_URL=https://testnet-rpc.irys.xyz/v1/execution-rpc
IRYS_CHAIN_ID=1270

# Security
SESSION_SECRET=your_random_session_secret_here

# Monitoring (опционально)
LOG_LEVEL=info
```

## 🔐 Крок 3: Безпека та Gаманець

### 3.1 Створення гаманця для деплою
```bash
# Генерація нового гаманця (зберігайте приватний ключ!)
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
"
```

### 3.2 Отримання testnet токенів
Згідно з [документацією Irys](https://docs.irys.xyz/build/d/troubleshooting):

1. **Sepolia Faucet**: https://sepoliafaucet.com/
2. **Solana Faucet**: https://faucet.solana.com/
3. Або інші public faucets

## 📄 Крок 4: Деплой Smart Contract

### 4.1 Деплой через Remix IDE (Рекомендовано)

1. **Відкрийте Remix IDE**: https://remix.ethereum.org/

2. **Створіть файл**: `IrysCrushLeaderboard.sol`

3. **Скопіюйте контракт** з `contracts/IrysCrushLeaderboard.sol`

4. **Компіляція**:
   - Compiler: Solidity ^0.8.30
   - Click "Compile"

5. **Деплой**:
   - Environment: "Injected Provider - MetaMask"
   - Network: Irys Testnet (Chain ID: 1270)
   - Click "Deploy"
   - Confirm в MetaMask

6. **Збережіть адресу контракту**:
   ```bash
   # Додайте до .env файлу
   CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

### 4.2 Перевірка деплою
```bash
# Перевірка підключення до blockchain
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://testnet-rpc.irys.xyz/v1/execution-rpc');

provider.getNetwork().then(network => {
  console.log('Connected to network:', network.name);
  console.log('Chain ID:', network.chainId);
}).catch(console.error);
"
```

## 🚀 Крок 5: Запуск Додатку

### 5.1 Встановлення PM2
```bash
sudo npm install -g pm2
```

### 5.2 Створення PM2 конфігурації
```bash
# Створення ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'iryscrush',
    script: 'server.js',
    cwd: '/home/iryscrush/iryscrush-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/iryscrush/logs/err.log',
    out_file: '/home/iryscrush/logs/out.log',
    log_file: '/home/iryscrush/logs/combined.log',
    time: true
  }]
};
EOF
```

### 5.3 Створення директорії для логів
```bash
mkdir -p /home/iryscrush/logs
```

### 5.4 Запуск додатку
```bash
# Запуск через PM2
pm2 start ecosystem.config.js

# Перевірка статусу
pm2 status

# Перегляд логів
pm2 logs iryscrush

# Автозапуск при перезавантаженні сервера
pm2 startup
pm2 save
```

## 🌐 Крок 6: Налаштування Nginx (Reverse Proxy)

### 6.1 Встановлення Nginx
```bash
sudo apt install nginx -y
```

### 6.2 Створення конфігурації
```bash
sudo nano /etc/nginx/sites-available/iryscrush
```

**Конфігурація Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (після отримання сертифікату)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

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
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.3 Активація конфігурації
```bash
# Активація сайту
sudo ln -s /etc/nginx/sites-available/iryscrush /etc/nginx/sites-enabled/

# Перевірка конфігурації
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Крок 7: SSL Сертифікат (Let's Encrypt)

### 7.1 Встановлення Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Отримання сертифікату
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7.3 Автоматичне оновлення
```bash
# Додавання до crontab
sudo crontab -e

# Додайте цей рядок:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Крок 8: Моніторинг та Логування

### 8.1 Встановлення системи моніторингу
```bash
# Встановлення htop для моніторингу ресурсів
sudo apt install htop -y

# Встановлення logrotate для ротації логів
sudo apt install logrotate -y
```

### 8.2 Конфігурація логів
```bash
# Створення конфігурації logrotate
sudo nano /etc/logrotate.d/iryscrush
```

**Конфігурація logrotate:**
```
/home/iryscrush/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 iryscrush iryscrush
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 8.3 Система алертів
```bash
# Створення скрипту для моніторингу
cat > /home/iryscrush/monitor.sh << 'EOF'
#!/bin/bash

# Перевірка статусу PM2 процесу
if ! pm2 jlist | grep -q '"status":"online"'; then
    echo "Alert: IrysCrush app is down!" | mail -s "IrysCrush Alert" admin@yourdomain.com
    pm2 restart iryscrush
fi

# Перевірка використання диску
DISK_USAGE=$(df -h | grep '/$' | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Alert: Disk usage is above 80%: ${DISK_USAGE}%" | mail -s "Disk Alert" admin@yourdomain.com
fi
EOF

chmod +x /home/iryscrush/monitor.sh

# Додавання до crontab для запуску кожні 5 хвилин
crontab -e
# Додайте:
*/5 * * * * /home/iryscrush/monitor.sh
```

## 🧪 Крок 9: Тестування Деплою

### 9.1 Функціональне тестування
```bash
# Перевірка здоров'я сервера
curl -X GET http://localhost:3000/health

# Перевірка blockchain підключення
curl -X GET http://localhost:3000/blockchain-info

# Перевірка leaderboard
curl -X GET http://localhost:3000/leaderboard
```

### 9.2 Load Testing (опционально)
```bash
# Встановлення Apache Bench
sudo apt install apache2-utils -y

# Тестування навантаження
ab -n 100 -c 10 http://yourdomain.com/
```

## 🔧 Крок 10: Backup та Відновлення

### 10.1 Створення backup скрипту
```bash
cat > /home/iryscrush/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/iryscrush/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Створення директорії backup
mkdir -p $BACKUP_DIR

# Backup коду
tar -czf $BACKUP_DIR/iryscrush_code_$DATE.tar.gz /home/iryscrush/iryscrush-app --exclude=node_modules

# Backup логів
tar -czf $BACKUP_DIR/iryscrush_logs_$DATE.tar.gz /home/iryscrush/logs

# Видалення старих backup (зберігаємо останні 7 днів)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /home/iryscrush/backup.sh

# Додавання до crontab (щоденний backup о 2:00)
crontab -e
# Додайте:
0 2 * * * /home/iryscrush/backup.sh
```

## 🚀 Крок 11: CI/CD (GitHub Actions) - Опционально

### 11.1 Створення GitHub Actions workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /home/iryscrush/iryscrush-app
          git pull origin main
          npm install --production
          pm2 reload iryscrush
```

## 📈 Крок 12: Масштабування

### 12.1 Горизонтальне масштабування
```javascript
// Оновлення ecosystem.config.js для кластера
module.exports = {
  apps: [{
    name: 'iryscrush',
    script: 'server.js',
    instances: 'max', // Використовувати всі CPU cores
    exec_mode: 'cluster',
    // ... інші налаштування
  }]
};
```

### 12.2 Redis для сесій (для кластера)
```bash
# Встановлення Redis
sudo apt install redis-server -y

# Налаштування Redis
sudo nano /etc/redis/redis.conf
# Змініть: bind 127.0.0.1
# Додайте: requirepass your_strong_password

sudo systemctl restart redis-server
```

## 🔍 Крок 13: Troubleshooting

### Загальні проблеми:

**1. Додаток не запускається:**
```bash
# Перевірка логів
pm2 logs iryscrush

# Перевірка портів
sudo netstat -tlnp | grep :3000

# Перевірка .env файлу
cat .env
```

**2. Blockchain підключення не працює:**
```bash
# Тест підключення до Irys
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://testnet-rpc.irys.xyz/v1/execution-rpc
```

**3. Nginx помилки:**
```bash
# Перевірка конфігурації
sudo nginx -t

# Перевірка логів
sudo tail -f /var/log/nginx/error.log
```

## 📞 Підтримка та Ресурси

### Корисні посилання:
- [Irys Documentation](https://docs.irys.xyz/)
- [Irys Testnet Explorer](https://testnet-explorer.irys.xyz/)
- [MetaMask Guide](https://metamask.io/faqs/)

### Команди для діагностики:
```bash
# Статус всіх сервісів
pm2 status
sudo systemctl status nginx
sudo systemctl status redis-server

# Моніторинг ресурсів
htop
df -h
free -h

# Мережевий трафік
sudo netstat -i
```

---

## 🎯 Чек-лист успішного деплою

- [ ] Сервер налаштований та оновлений
- [ ] Node.js та npm встановлені
- [ ] Проект скопійований та налаштований
- [ ] .env файл правильно сконфігурований
- [ ] Smart contract задеплоєний на Irys testnet
- [ ] Додаток запущений через PM2
- [ ] Nginx налаштований з SSL
- [ ] Моніторинг та логування активні
- [ ] Backup система налаштована
- [ ] Функціональні тести проходять
- [ ] Домен правильно налаштований

**Вітаємо! IrysCrush успішно задеплоєний на сервер! 🎮⛓️**

*Пам'ятайте: завжди тестуйте на testnet перед mainnet, та ніколи не діліться приватними ключами!* 