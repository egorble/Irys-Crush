# 🚀 Деплой IrysCrush на GitHub

Детальна інструкція для завантаження вашої гри на GitHub з Windows.

## 📋 Перед початком

1. **Встановіть Git** (якщо ще не встановлено):
   - Завантажте з [git-scm.com](https://git-scm.com/download/win)
   - Встановіть з налаштуваннями за замовчуванням

2. **Створіть обліковий запис GitHub** (якщо ще немає):
   - Зареєструйтеся на [github.com](https://github.com)

## 🎯 Швидкий деплой

### Крок 1: Створіть репозиторій на GitHub

1. Перейдіть на [github.com](https://github.com)
2. Натисніть зелену кнопку **"New"** або **"+"** → **"New repository"**
3. Заповніть поля:
   - **Repository name**: `IrysCrush`
   - **Description**: `🎮 Match3 Game with Web3 Integration`
   - Оберіть **Public** (або Private за бажанням)
   - ❗ **НЕ обирайте** "Initialize with README"
4. Натисніть **"Create repository"**
5. **Скопіюйте URL** репозиторію (наприклад: `https://github.com/ваш-username/IrysCrush.git`)

### Крок 2: Ініціалізація Git (PowerShell/Command Prompt)

```powershell
# Перейдіть в папку проекту
cd C:\Users\egor4\Desktop\IrysCrush

# Ініціалізуйте Git репозиторій
git init

# Додайте всі файли
git add .

# Створіть перший коміт
git commit -m "🎮 Initial commit: IrysCrush Match3 Game

✨ Features:
- Match3 game mechanics
- Web3 wallet integration
- Global leaderboard
- SQLite database
- Nginx configuration
- PM2 deployment scripts
- Responsive design

🛠 Tech Stack:
- Node.js + Express
- HTML5 + CSS3 + JavaScript
- SQLite3
- PM2 + Nginx
- SSL/HTTPS ready"
```

### Крок 3: Підключення до GitHub

```powershell
# Додайте віддалений репозиторій (замініть URL на ваш)
git remote add origin https://github.com/ваш-username/IrysCrush.git

# Перейменуйте гілку на main
git branch -M main

# Завантажте код на GitHub
git push -u origin main
```

## 🔧 Альтернативний спосіб через GitHub Desktop

1. **Завантажте GitHub Desktop**: [desktop.github.com](https://desktop.github.com)
2. **Встановіть та увійдіть** в обліковий запис
3. **Створіть репозиторій**:
   - File → New Repository
   - Name: `IrysCrush`
   - Local Path: `C:\Users\egor4\Desktop`
   - Initialize with Git
4. **Скопіюйте файли** в створену папку
5. **Зробіть коміт** та **опублікуйте** репозиторій

## 🌐 Автоматичний деплой на сервер

Після завантаження на GitHub, ви можете налаштувати автоматичний деплой:

### Налаштування GitHub Secrets

1. Перейдіть в ваш репозиторій на GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Додайте наступні secrets:

```
HOST = ваш-сервер.com
USERNAME = ваш-користувач
SSH_KEY = ваш-приватний-ssh-ключ
PORT = 22
```

### Отримання SSH ключа

```powershell
# Генерація SSH ключа (якщо немає)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Копіювання публічного ключа
type ~/.ssh/id_rsa.pub
```

**Публічний ключ** (`id_rsa.pub`) додайте на сервер в `~/.ssh/authorized_keys`  
**Приватний ключ** (`id_rsa`) додайте в GitHub Secrets як `SSH_KEY`

## 📱 GitHub Pages (для статичної версії)

Для демо-версії без бекенду:

1. **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: main
4. **Folder**: / (root)
5. Збережіть - гра буде доступна за адресою: `https://ваш-username.github.io/IrysCrush`

## 🎮 Результат

Після успішного деплою:

- 📁 **Код**: `https://github.com/ваш-username/IrysCrush`
- 🌐 **Демо**: `https://ваш-username.github.io/IrysCrush` (GitHub Pages)
- 🚀 **Продакшн**: ваш-домен.com (після налаштування сервера)

## 🔄 Оновлення проекту

Для подальших оновлень:

```powershell
# Додайте зміни
git add .

# Зробіть коміт
git commit -m "🔄 Update: опис змін"

# Завантажте на GitHub
git push origin main
```

## ❗ Важливо

- ✅ Файл `.gitignore` виключає базу даних та node_modules
- ✅ Конфігурації nginx з прикладами доменів
- ✅ GitHub Actions налаштовано для автодеплою
- ✅ README.md з повною документацією

## 🆘 Якщо щось пішло не так

### Помилка аутентифікації
```powershell
# Налаштуйте Git credentials
git config --global user.name "Ваше Ім'я"
git config --global user.email "your-email@example.com"
```

### Конфлікти при push
```powershell
# Синхронізуйте з віддаленим репозиторієм
git pull origin main --allow-unrelated-histories
git push origin main
```

### Забули URL репозиторію
```powershell
# Перегляньте поточні remote
git remote -v

# Зміна URL
git remote set-url origin https://github.com/ваш-username/IrysCrush.git
```

## 🎉 Готово!

Ваша гра тепер на GitHub і готова до використання! 🚀 