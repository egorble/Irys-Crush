# 🔄 Вирішення проблем з кешуванням

## Проблема
Після оновлення файлів на сервері зміни не відображаються в браузері через кешування nginx та браузера.

## ✅ Рішення реалізовано

### 1. Покращена nginx конфігурація
**Файл:** `nginx-config-fix.sh`

**Що робить:**
- ❌ HTML файли **НЕ кешуються** (завжди оновлюються)
- ⏰ CSS/JS кешуються лише **5 хвилин**
- 🌅 Зображення кешуються **1 день**
- 📝 API ендпоінти **ніколи не кешуються**

**Використання:**
```bash
sudo ./nginx-config-fix.sh yourdomain.com
```

### 2. Покращений деплой скрипт
**Файл:** `deploy-irysgame.sh`

**Що додано:**
- 🧹 Автоматичне очищення nginx кешу після деплою
- 🔄 Перезапуск сервісів для оновлення
- 📋 Інструкції для примусового оновлення браузера

### 3. Швидке очищення кешу
**Файл:** `clear-cache.sh`

**Використання:**
```bash
sudo ./clear-cache.sh yourdomain.com
```

**Що робить:**
- 🔄 Перезавантажує nginx
- 🔄 Перезапускає Node.js додаток
- 🧹 Очищає DNS кеш
- 📋 Показує інструкції для браузера

### 4. Server-side cache headers
**Файл:** `server.js`

**Що додано:**
- ❌ HTML та API: `no-cache, no-store, must-revalidate`
- ⏰ CSS/JS: `max-age=300` (5 хвилин)
- 🌅 Зображення: `max-age=86400` (1 день)

## 🚀 Як використовувати

### Для нового сайту:
```bash
# 1. Налаштуйте домен
sudo ./setup-domain.sh yourdomain.com admin@yourdomain.com

# 2. Виправте nginx конфігурацію
sudo ./nginx-config-fix.sh yourdomain.com

# 3. Деплойте гру
sudo ./deploy-irysgame.sh /path/to/testcrush yourdomain.com
```

### Для існуючого сайту:
```bash
# 1. Виправте nginx конфігурацію
sudo ./nginx-config-fix.sh yourdomain.com

# 2. Деплойте оновлення
sudo ./deploy-irysgame.sh /path/to/testcrush yourdomain.com

# 3. Очистіть кеші
sudo ./clear-cache.sh yourdomain.com
```

### Для швидкого оновлення файлів:
```bash
# Просто скопіюйте файли і очистіть кеш
sudo cp -r /path/to/updated/files/* /var/www/yourdomain.com/
sudo ./clear-cache.sh yourdomain.com
```

## 🔧 Ручне очищення кешу

### На сервері:
```bash
# Перезавантажити nginx
sudo systemctl reload nginx

# Перезапустити додаток
sudo systemctl restart irysgame

# Очистити DNS кеш
sudo systemd-resolve --flush-caches
```

### В браузері:

#### Chrome/Edge:
1. **Ctrl+F5** (Windows) або **Cmd+Shift+R** (Mac)
2. Або:
   - F12 → Network tab
   - ✅ Disable cache
   - Звичайне оновлення

#### Firefox:
1. **Ctrl+Shift+R** (Windows) або **Cmd+Shift+R** (Mac)
2. Або:
   - F12 → Network tab
   - Налаштування → Disable HTTP Cache

#### Safari:
1. **Cmd+Option+E** (очистити кеш)
2. Потім **Cmd+R** (оновити)

## 📊 Перевірка кешування

### Перевірити заголовки відповіді:
```bash
# Перевірити HTML
curl -I https://yourdomain.com/

# Перевірити CSS
curl -I https://yourdomain.com/style.css

# Перевірити JS
curl -I https://yourdomain.com/main.js
```

### Очікувані заголовки:

**HTML:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**CSS/JS:**
```
Cache-Control: public, max-age=300, must-revalidate
Last-Modified: [current date]
```

**Зображення:**
```
Cache-Control: public, max-age=86400
```

## 🎯 Результат

Після застосування цих виправлень:

✅ **HTML файли** завжди завантажуються свіжі  
✅ **CSS/JS файли** оновлюються через 5 хвилин  
✅ **API запити** ніколи не кешуються  
✅ **Зображення** кешуються розумно (1 день)  
✅ **Деплой** автоматично очищає кеші  
✅ **Швидке очищення** одною командою  

## 🚨 Якщо проблема залишається

1. **Перевірте nginx конфігурацію:**
   ```bash
   sudo nginx -t
   cat /etc/nginx/sites-available/yourdomain.com
   ```

2. **Перевірте логи nginx:**
   ```bash
   sudo tail -f /var/log/nginx/yourdomain.com.access.log
   sudo tail -f /var/log/nginx/yourdomain.com.error.log
   ```

3. **Перевірте статус сервісів:**
   ```bash
   sudo systemctl status nginx
   sudo systemctl status irysgame
   ```

4. **Примусово очистіть все:**
   ```bash
   sudo ./clear-cache.sh yourdomain.com
   # Потім в браузері Ctrl+Shift+Delete (очистити все)
   ```

## 🎉 Готово!

Тепер ваші файли будуть оновлюватися автоматично без потреби в повному передеплої кожного разу! 