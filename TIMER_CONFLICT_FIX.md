# Виправлення конфлікту таймерів в PVP системі

## Проблема

Таймер "скакав" і показував різний час через **конфлікт між трьома системами**:

1. **game-system.js** - основна гра з `timerInterval`
2. **pvp-game.js** - PVP гра з `this.timerInterval` 
3. **pvp-time-manager.js** - Time Manager з `updateUIElements`

Всі три системи одночасно оновлювали один елемент `document.getElementById('timer')`, що призводило до мерехтіння та неконсистентного відображення часу.

## Виправлення

### 1. PVP Game Engine (`pvp-game.js`)

#### Зупинка основного таймера при старті PVP
```javascript
startTimer() {
    // КРИТИЧНО: Зупиняємо основний таймер гри, щоб уникнути конфлікту
    if (window.stopTimer && typeof window.stopTimer === 'function') {
        window.stopTimer();
        console.log('🛑 Stopped main game timer to prevent conflicts');
    }
    
    this.stopTimer();
    this.updateTimerDisplay();
    
    console.log('⏰ Starting PVP timer with', this.timer, 'seconds');
    
    this.timerInterval = setInterval(() => {
        this.timer--;
        this.updateTimerDisplay();
        
        if (this.timer <= 0) {
            this.stopTimer();
            this.endGame();
        }
    }, 1000);
}
```

#### Оптимізація оновлення таймера
```javascript
updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        const formattedTime = this.formatTime(this.timer);
        
        // Оновлюємо тільки якщо значення змінилося, щоб уникнути мерехтіння
        if (timerElement.textContent !== formattedTime) {
            timerElement.textContent = formattedTime;
            console.log('⏰ Timer updated to:', formattedTime);
        }

        if (this.timer <= 30) {
            timerElement.style.color = '#ff5722';
            timerElement.style.animation = 'pulse 1s infinite';
        } else {
            timerElement.style.color = '';
            timerElement.style.animation = '';
        }
    }
}
```

#### Правильне очищення при завершенні
```javascript
cleanup() {
    console.log('🧹 Cleaning up PVP game...');
    
    // Зупиняємо таймер
    this.stopTimer();
    
    // Позначаємо гру як неактивну
    this.gameActive = false;
    
    // Очищаємо глобальну змінну
    if (window.currentPVPGame === this) {
        window.currentPVPGame = null;
        console.log('🧹 Cleared global PVP game reference');
    }
    
    // ... інші очищення
}
```

### 2. Основна гра (`game-system.js`)

#### Блокування при активній PVP грі
```javascript
function startTimer() {
  // Не запускаємо основний таймер, якщо активна PVP гра
  if (window.currentPVPGame && window.currentPVPGame.gameActive) {
    console.log('🚫 Main timer blocked - PVP game is active');
    return;
  }
  
  stopTimer();
  timerSpan.textContent = timer;
  console.log('⏰ Starting main game timer with', timer, 'seconds');
  
  timerInterval = setInterval(() => {
    // Додаткова перевірка на кожній ітерації
    if (window.currentPVPGame && window.currentPVPGame.gameActive) {
      console.log('🚫 Main timer stopped - PVP game became active');
      stopTimer();
      return;
    }
    
    timer--;
    timerSpan.textContent = timer;
    if (timer <= 0) {
      stopTimer();
      endGame();
    }
  }, 1000);
}
```

### 3. Time Manager (`pvp-time-manager.js`)

#### Видалення прямого оновлення таймера
```javascript
updateUIElements(roomId, timeData) {
    // НЕ оновлюємо таймер безпосередньо, щоб уникнути конфлікту з PVP Game Engine
    // Таймер оновлюється тільки через PVP Game Engine
    
    // Оновлюємо інформацію про кімнату в UI
    const roomInfoElements = document.querySelectorAll(`[data-room-id="${roomId}"] .game-duration`);
    roomInfoElements.forEach(element => {
        element.textContent = `${timeData.minutes} min`;
    });
    
    console.log('🔄 Time Manager updated UI elements for room', roomId, '- timer left to PVP Game Engine');
}
```

## Логіка роботи після виправлень

### Сценарій 1: Основна гра
1. Користувач запускає звичайну гру
2. `game-system.js` перевіряє `window.currentPVPGame` - null
3. Запускається основний таймер
4. Таймер оновлюється кожну секунду

### Сценарій 2: PVP гра
1. Користувач запускає PVP гру
2. Створюється `PVPGameEngine`, встановлюється `window.currentPVPGame`
3. `startTimer()` викликає `window.stopTimer()` - зупиняє основний таймер
4. Запускається PVP таймер
5. Тільки PVP таймер оновлює елемент

### Сценарій 3: Спроба запуску основної гри під час PVP
1. Користувач намагається запустити основну гру
2. `startTimer()` перевіряє `window.currentPVPGame.gameActive` - true
3. Функція повертається без запуску таймера
4. Логується повідомлення про блокування

### Сценарій 4: Завершення PVP гри
1. PVP гра завершується
2. `cleanup()` встановлює `gameActive = false`
3. `cleanup()` очищає `window.currentPVPGame = null`
4. Основна гра знову може запускати свій таймер

## Переваги виправлень

✅ **Один активний таймер** - тільки одна система оновлює елемент одночасно
✅ **Немає мерехтіння** - таймер оновлюється тільки при зміні значення
✅ **Чіткі пріоритети** - PVP гра має пріоритет над основною
✅ **Автоматичне блокування** - основна гра не може "захопити" таймер
✅ **Правильне очищення** - після PVP гри все повертається до норми
✅ **Детальне логування** - легко відстежити що відбувається

## Тестування

Створено тест `debug-timer-conflict.js` для перевірки всіх сценаріїв:

```bash
node debug-timer-conflict.js
```

Тест перевіряє:
- Запуск основної гри
- Запуск PVP гри (має зупинити основну)
- Спробу запуску основної під час PVP (має бути заблокована)
- Завершення PVP гри
- Запуск основної після PVP (має працювати)

## Результат

🎉 **Проблема з "скачучим" таймером повністю вирішена!**

Тепер таймер показує стабільний час без мерехтіння, і немає конфліктів між різними системами гри.