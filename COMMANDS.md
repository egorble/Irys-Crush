# 🎮 IrysCrush - Всі команди для запуску

Повний список команд для роботи з проектом IrysCrush.

## 🚀 Швидкий старт

### ⚠️ Якщо отримали помилку ETARGET:

```bash
# Швидке виправлення
npm run fix-deps

# Або використайте спеціальні скрипти:
# Windows: fix-dependencies.bat
# Linux/Mac: ./fix-dependencies.sh
```

### Windows
```cmd
# Запустити автоматичний деплой
quick-deploy.bat

# Або покроково:
npm install
npm run deploy:full
npm start
```

### Linux/Mac
```bash
# Запустити автоматичний деплой
chmod +x quick-deploy.sh
./quick-deploy.sh

# Або покроково:
npm install
npm run deploy:full
npm start
```

## 📦 Встановлення залежностей

```bash
# Встановити всі пакети
npm install

# Встановити production залежності
npm install --production

# Встановити dev залежності
npm install --only=dev

# Оновити пакети
npm update

# Перевірити застарілі пакети
npm outdated
```

## 🔨 Компіляція контракту

```bash
# Компіляція Solidity контракту
npm run compile

# Або напряму
node compile.js

# Результат: створюються файли в папці artifacts/
```

## 🚀 Деплой контракту

### Основні команди деплою

```bash
# Повний деплой (компіляція + деплой)
npm run deploy:full

# Тільки деплой (потрібна попередня компіляція)
npm run deploy

# Або напряму
node deploy.js deploy
```

### Автоматичний деплой

```bash
# Windows
quick-deploy.bat

# Linux/Mac
./quick-deploy.sh
```

## 🔍 Перевірка контракту

```bash
# Перевірити деплойнутий контракт
npm run verify <contract_address>

# Приклад
npm run verify 0x1234567890abcdef...

# Або напряму
node deploy.js verify 0x1234567890abcdef...
```

## 🧹 Очистка файлів

```bash
# Очистити всі артефакти
npm run clean

# Виправити залежності (ETARGET помилка)
npm run fix-deps

# Очистити вручну
rm -rf artifacts deployments deployment.json

# Windows
rmdir /s artifacts deployments
del deployment.json
```

## 🖥️ Запуск сервера

```bash
# Запуск production сервера
npm start

# Запуск development сервера з auto-reload
npm run dev

# Запуск на іншому порту
PORT=8080 npm start

# Запуск в background (Linux/Mac)
nohup npm start &

# Запуск з PM2 (production)
pm2 start server.js --name "iryscrush"
```

## 🔧 Налагодження

### Перевірка конфігурації

```bash
# Перевірити .env файл
cat .env

# Перевірити package.json
cat package.json

# Перевірити структуру проекту
ls -la

# Перевірити наявність контракту
ls -la contracts/
```

### Перевірка мережі

```bash
# Перевірити підключення до Irys RPC
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://testnet-rpc.irys.xyz/v1/execution-rpc

# Перевірити баланс гаманця (потрібен ethers)
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://testnet-rpc.irys.xyz/v1/execution-rpc');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(balance => 
  console.log('Balance:', ethers.formatEther(balance), 'IRYS')
);
"
```

## 📊 Моніторинг

```bash
# Перевірити логи сервера
tail -f server.log

# Перевірити процеси
ps aux | grep node

# Перевірити порти
netstat -tulpn | grep :3000

# Перевірити використання ресурсів
htop
```

## 🛠️ Розробка

### Модифікація контракту

```bash
# 1. Відредагувати contracts/IrysCrushLeaderboard.sol
# 2. Перекомпілювати
npm run compile

# 3. Деплой нового контракту
npm run deploy

# 4. Оновити .env з новою адресою
echo "CONTRACT_ADDRESS=0xNEW_ADDRESS" >> .env
```

### Тестування

```bash
# Запустити тести (коли будуть додані)
npm test

# Тестування через браузер
npm start
# Відкрити http://localhost:3000
```

## 🔐 Безпека

### Управління ключами

```bash
# Генерувати новий приватний ключ
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Отримати адресу з приватного ключа
node -e "
const { ethers } = require('ethers');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY');
console.log('Address:', wallet.address);
"

# Перевірити .env на витоки
grep -r "PRIVATE_KEY" . --exclude-dir=node_modules
```

### Резервне копіювання

```bash
# Створити резервну копію
cp .env .env.backup
cp -r artifacts artifacts-backup/
cp deployment.json deployment-backup.json

# Створити архів
tar -czf iryscrush-backup-$(date +%Y%m%d).tar.gz \
  .env contracts/ artifacts/ deployment.json server.js public/
```

## 🌐 Production деплой

### Підготовка сервера

```bash
# Оновити систему
sudo apt update && sudo apt upgrade -y

# Встановити Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановити PM2
npm install -g pm2

# Клонувати проект
git clone <your-repo>
cd iryscrush
npm install
```

### Запуск в production

```bash
# Встановити production змінні
export NODE_ENV=production
export PORT=3000

# Запустити з PM2
pm2 start server.js --name "iryscrush" --env production

# Налаштувати автозапуск
pm2 startup
pm2 save

# Моніторинг
pm2 monit
pm2 logs iryscrush
```

## 🔄 CI/CD команди

### Git workflow

```bash
# Підготовка до коммітів
git add .
git commit -m "feat: update smart contract"
git push origin main

# Створити release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Автоматичний деплой

```bash
# GitHub Actions (додати в .github/workflows/)
# Автоматично запуститься при push в main

# Ручний деплой на сервері
git pull origin main
npm install
npm run deploy:full
pm2 restart iryscrush
```

## 📚 Корисні команди

### NPM скрипти

```bash
# Показати всі доступні скрипти
npm run

# Показати інформацію про пакет
npm info ethers

# Показати дерево залежностей
npm ls

# Аудит безпеки
npm audit
npm audit fix
```

### Node.js команди

```bash
# Перевірити версію Node.js
node --version

# Запустити REPL
node

# Запустити скрипт з debug
node --inspect server.js

# Перевірити синтаксис
node --check server.js
```

## 🆘 Troubleshooting команди

### Помилка ETARGET (No matching version found)

```bash
# Швидке виправлення через npm скрипт
npm run fix-deps

# Або ручне виправлення:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Використання спеціальних скриптів:
# Linux/Mac:
chmod +x fix-dependencies.sh
./fix-dependencies.sh

# Windows:
fix-dependencies.bat
```

### Загальні проблеми

```bash
# Очистити npm cache
npm cache clean --force

# Перевстановити node_modules
rm -rf node_modules package-lock.json
npm install

# Перевірити права доступу
ls -la .env
chmod 600 .env

# Перевірити процеси на порту
lsof -i :3000
kill -9 <PID>
```

### Проблеми з деплоєм

```bash
# Перевірити RPC підключення
curl -I https://testnet-rpc.irys.xyz/v1/execution-rpc

# Перевірити формат приватного ключа
node -e "
try {
  const { ethers } = require('ethers');
  new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log('✅ Private key is valid');
} catch (e) {
  console.log('❌ Invalid private key:', e.message);
}
"

# Перевірити баланс
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://testnet-rpc.irys.xyz/v1/execution-rpc');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(b => console.log('Balance:', ethers.formatEther(b)));
"
```

---

## 🎯 Рекомендований workflow

1. **Перший запуск:**
   ```bash
   npm install
   # Створити .env з PRIVATE_KEY
   ./quick-deploy.sh  # або quick-deploy.bat
   npm start
   ```

2. **Розробка:**
   ```bash
   npm run dev  # для development
   # Редагувати код
   npm run deploy:full  # при зміні контракту
   ```

3. **Production:**
   ```bash
   npm run deploy:full
   pm2 start server.js --name iryscrush
   ```

**Готово! Тепер у вас є всі команди для роботи з IrysCrush! 🎮** 