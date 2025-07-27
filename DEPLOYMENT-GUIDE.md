# 🚀 IrysCrush Smart Contract Deployment Guide

Повне керівництво по деплою смарт-контракту IrysCrushLeaderboard на Irys blockchain.

## ⚠️ Виправлення помилки ETARGET

**Якщо ви отримали помилку:**
```
npm error code ETARGET
npm error notarget No matching version found for @irys/sdk@^0.0.14
```

**Рішення:**
Ця помилка виникає через застарілі пакети Irys SDK. Наш проект був оновлений і більше не використовує ці пакети.

```bash
# 1. Видаліть node_modules та package-lock.json
rm -rf node_modules package-lock.json

# Windows:
rmdir /s /q node_modules
del package-lock.json

# 2. Встановіть залежності заново
npm install

# 3. Якщо все ще є проблеми, очистіть npm cache
npm cache clean --force
npm install
```

## 📋 Підготовка

### 1. Встановіть залежності

```bash
# Встановити всі пакети
npm install

# Або встановити вручну
npm install express cors @irys/sdk @irys/web ethers dotenv
npm install --save-dev nodemon solc rimraf
```

### 2. Створіть файл .env

Створіть файл `.env` в корені проекту:

```bash
# Приватний ключ вашого гаманця (без 0x)
PRIVATE_KEY=your_private_key_here

# Необхідно буде додати після деплою
CONTRACT_ADDRESS=your_contract_address_here

# Опціонально - для production
NODE_ENV=development
PORT=3000
```

⚠️ **ВАЖЛИВО**: Ніколи не коммітьте .env файл в git!

### 3. Отримайте тестові токени

Для деплою на Irys testnet потрібні токени. Згідно з [Irys документацією](https://docs.irys.xyz/build/d/troubleshooting):

- **Sepolia ETH Faucet**: https://sepoliafaucet.com/
- **Solana Faucet**: https://faucet.solana.com/

## 🔧 Доступні команди

### Основні команди

```bash
# Компіляція контракту
npm run compile

# Деплой контракту
npm run deploy

# Повний деплой (компіляція + деплой)
npm run deploy:full

# Перевірка деплоя
npm run verify <contract_address>

# Очистка артефактів
npm run clean

# Допомога
npm run help

# Запуск сервера
npm start

# Розробка з авто-перезавантаженням
npm run dev
```

### Детальні команди

```bash
# Компіляція
node compile.js

# Деплой з параметрами
node deploy.js deploy

# Перевірка контракту
node deploy.js verify 0x123...

# Допомога по скрипту
node deploy.js help
```

## 🚀 Покрокова інструкція деплою

### Крок 1: Перевірте конфігурацію

```bash
# Перевірте наявність файлів
ls -la contracts/IrysCrushLeaderboard.sol
ls -la .env

# Перевірте .env файл
cat .env
```

### Крок 2: Скомпілюйте контракт

```bash
npm run compile
```

**Що відбувається:**
- Читає `contracts/IrysCrushLeaderboard.sol`
- Компілює за допомогою Solidity compiler v0.8.30
- Генерує ABI та bytecode
- Зберігає артефакти в папку `artifacts/`
- Автоматично оновлює `deploy.js`

**Вихід:**
```
🔨 Compiling IrysCrushLeaderboard.sol...
⚙️ Running Solidity compiler...
✅ Compilation successful!
📝 ABI length: 2847 characters
💾 Bytecode length: 4521 characters
📁 Artifacts saved to:
   ABI: artifacts/IrysCrushLeaderboard.abi.json
   Bytecode: artifacts/IrysCrushLeaderboard.bin
   Combined: artifacts/IrysCrushLeaderboard.json
🔄 Updating deploy.js with compiled data...
✅ deploy.js updated successfully
🎉 Ready for deployment!
```

### Крок 3: Деплойте контракт

```bash
npm run deploy
```

**Що відбувається:**
- Підключається до Irys testnet
- Перевіряє баланс гаманця
- Розраховує gas costs
- Деплоїть контракт
- Перевіряє успішність деплою
- Зберігає інформацію про деплой

**Вихід:**
```
🚀 Starting IrysCrush deployment to Irys testnet...
============================================================
🔗 Connecting to Irys testnet...
📡 Network: Unknown (Chain ID: 1270)
📝 Deployer address: 0x123...
💰 Deployer balance: 0.5 IRYS
⛽ Estimating deployment costs...
   Gas price: 20 gwei
============================================================
📄 Deploying IrysCrushLeaderboard contract...
📤 Deployment transaction sent: 0xabc...
⏳ Waiting for confirmation...
============================================================
✅ DEPLOYMENT SUCCESSFUL!
📍 Contract deployed to: 0xdef...
🔗 Transaction hash: 0xabc...
🔍 Validating deployment...
✅ Contract validation passed - Total players: 0
✅ Nickname check works - "TestNickname" available: true
💾 Saving deployment information...
============================================================
📋 DEPLOYMENT SUMMARY:
   Contract: IrysCrushLeaderboard
   Address: 0xdef...
   Network: Irys Testnet (1270)
   Deployer: 0x123...
   Gas used: 3000000
   Timestamp: 2024-01-28T12:00:00.000Z
============================================================
🎯 NEXT STEPS:
1. Add CONTRACT_ADDRESS to your .env file:
   CONTRACT_ADDRESS=0xdef...
2. Update your frontend with the contract address
3. Start your server: npm start
4. Test the application in your browser
============================================================
```

### Крок 4: Додайте адресу контракту в .env

```bash
# Відредагуйте .env файл
echo "CONTRACT_ADDRESS=0xdef..." >> .env
```

### Крок 5: Запустіть сервер

```bash
npm start
```

**Сервер запуститься на http://localhost:3000**

## 📁 Структура файлів після деплою

```
testcrush/
├── artifacts/                          # Артефакти компіляції
│   ├── IrysCrushLeaderboard.abi.json   # ABI контракту
│   ├── IrysCrushLeaderboard.bin        # Bytecode
│   └── IrysCrushLeaderboard.json       # Повний артефакт
├── deployments/                        # Історія деплоїв
│   └── deployment-1640774400000.json   # Деплой з timestamp
├── deployment.json                     # Поточний деплой
├── .env                                # Конфігурація (НЕ коммітити!)
└── ...
```

## 🔍 Перевірка деплою

### Перевірте контракт

```bash
npm run verify 0xdef...
```

### Перевірте файли

```bash
# Перевірте deployment.json
cat deployment.json

# Перевірте артефакти
ls -la artifacts/
```

### Тестування через браузер

1. Відкрийте http://localhost:3000
2. Підключіть MetaMask до Irys testnet:
   - Network Name: `Irys Testnet`
   - RPC URL: `https://testnet-rpc.irys.xyz/v1/execution-rpc`
   - Chain ID: `1270`
   - Currency Symbol: `IRYS`

## 🔄 Команди для розробки

### Повторний деплой

```bash
# Очистити попередні артефакти
npm run clean

# Повний деплой з нуля
npm run deploy:full
```

### Оновлення контракту

```bash
# 1. Відредагуйте contracts/IrysCrushLeaderboard.sol
# 2. Перекомпілюйте
npm run compile

# 3. Деплойте новий контракт
npm run deploy

# 4. Оновіть .env з новою адресою
```

## ❌ Troubleshooting

### Помилка: "PRIVATE_KEY not found"

```bash
# Створіть .env файл
echo "PRIVATE_KEY=your_private_key_here" > .env
```

### Помилка: "Insufficient balance"

```bash
# Отримайте тестові токени з faucets
# Sepolia: https://sepoliafaucet.com/
# Solana: https://faucet.solana.com/
```

### Помилка: "Please compile contract and add bytecode"

```bash
# Спочатку скомпілюйте контракт
npm run compile
```

### Помилка: "Contract validation failed"

```bash
# Перевірте чи правильно деплоїлся контракт
npm run verify <contract_address>

# Або перевірте deployment.json
cat deployment.json
```

### Помилка: "Network error"

```bash
# Перевірте інтернет з'єднання
# Перевірте RPC URL: https://testnet-rpc.irys.xyz/v1/execution-rpc
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://testnet-rpc.irys.xyz/v1/execution-rpc
```

## 🔧 Додаткові команди

### Оновлення залежностей

```bash
# Перевірка застарілих пакетів
npm outdated

# Оновлення всіх пакетів
npm update
```

### Резервне копіювання

```bash
# Створити резервну копію важливих файлів
cp deployment.json deployment-backup.json
cp -r artifacts artifacts-backup/
```

## 🎯 Наступні кроки

1. **Тестування**: Протестуйте всі функції гри
2. **Мониторинг**: Слідкуйте за транзакціями
3. **Mainnet**: Підготуйте деплой на mainnet
4. **Документація**: Оновіть документацію проекту

## 📚 Корисні посилання

- [Irys Documentation](https://docs.irys.xyz/)
- [Irys Testnet Troubleshooting](https://docs.irys.xyz/build/d/troubleshooting)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

---

**Готово! Ваш IrysCrush контракт тепер розгорнутий на Irys blockchain! 🎉** 