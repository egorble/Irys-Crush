# Виправлення проблеми множинних транзакцій submitRoomScore

## Проблема

Один гравець намагається відправити **кілька транзакцій `submitRoomScore`** одночасно, що призводить до:
- Nonce конфліктів
- Помилок транзакцій
- Втрати газу
- Неконсистентного стану гри

## Причини проблеми

### 1. Race Condition
```javascript
// ПРОБЛЕМА: Дві функції можуть викликатися одночасно
async endGame() {
    await this.submitGameResult(); // Викликається при закінченні таймера
}

async forfeitGame() {
    await contract.submitRoomScore(); // Викликається при здачі
}
```

### 2. Відсутність захисту від повторних викликів
```javascript
// ПРОБЛЕМА: Тільки один флаг
if (this.resultSubmitted) return;
// Але між перевіркою і встановленням флага може пройти час
```

### 3. Множинні точки входу
- `endGame()` → `submitGameResult()` → `submitRoomScore()`
- `forfeitGame()` → `submitRoomScore()` (прямо)
- Можливі інші автоматичні виклики

## Виправлення

### 1. Подвійний захист в `submitGameResult()`

```javascript
async submitGameResult() {
    // КРИТИЧНО: Подвійний захист від множинних викликів
    if (this.resultSubmitted) {
        console.log('📤 Result already submitted, skipping...');
        return;
    }
    
    if (this.submissionInProgress) {
        console.log('📤 Submission already in progress, skipping...');
        return;
    }
    
    // Встановлюємо флаг, що відправлення в процесі
    this.submissionInProgress = true;

    try {
        // ... код відправлення
        
        await tx.wait();
        
        this.resultSubmitted = true;
        this.submissionInProgress = false; // Очищаємо флаг
        
    } catch (error) {
        // ... обробка помилок
    } finally {
        // Завжди очищаємо флаги
        this.submissionInProgress = false;
        if (window.currentPVPGame) {
            window.currentPVPGame.submissionInProgress = false;
        }
    }
}
```

### 2. Захист в `endGame()`

```javascript
async endGame() {
    if (!this.gameActive) {
        console.log('🏁 Game already ended, skipping...');
        return;
    }

    console.log('🏁 PVP Game ended');
    this.gameActive = false;
    // ... решта коду
}
```

### 3. Захист в `forfeitGame()`

```javascript
async forfeitGame() {
    if (!confirm('Are you sure you want to forfeit?')) {
        return;
    }

    // КРИТИЧНО: Перевіряємо чи результат вже відправлений
    if (this.resultSubmitted) {
        console.log('🏳️ Cannot forfeit - result already submitted');
        return;
    }

    if (this.submissionInProgress) {
        console.log('🏳️ Cannot forfeit - submission in progress');
        return;
    }

    this.submissionInProgress = true; // Встановлюємо флаг

    try {
        // ... код відправлення
        
        await tx.wait();
        
        this.resultSubmitted = true; // Позначаємо як відправлений
        
    } catch (error) {
        // ... обробка помилок
    } finally {
        // Завжди очищаємо флаг
        this.submissionInProgress = false;
    }
}
```

## Логіка захисту

### Два флаги для надійності:
1. **`this.resultSubmitted`** - результат успішно відправлений
2. **`this.submissionInProgress`** - відправлення в процесі

### Послідовність перевірок:
```
1. Перевірка this.resultSubmitted → ВИХІД якщо true
2. Перевірка this.submissionInProgress → ВИХІД якщо true  
3. Встановлення this.submissionInProgress = true
4. Відправлення транзакції
5. Встановлення this.resultSubmitted = true
6. Очищення this.submissionInProgress = false (в finally)
```

### Часова діаграма:

```
Виклик 1: submitGameResult()
├─ Перевірка флагів ✅
├─ submissionInProgress = true
├─ Відправлення транзакції...
│
Виклик 2: forfeitGame() (одночасно)
├─ Перевірка resultSubmitted ✅
├─ Перевірка submissionInProgress ❌ → ВИХІД
│
Виклик 1 (продовження):
├─ tx.wait() завершено
├─ resultSubmitted = true
└─ submissionInProgress = false
```

## Додаткові захисти

### 1. Випадкова затримка (вже була)
```javascript
const delay = Math.random() * 2000; // 0-2 seconds
await new Promise(resolve => setTimeout(resolve, delay));
```

### 2. Перевірка на блокчейні перед відправленням
```javascript
const currentScore = await contract.getPlayerRoomScore(roomId, userAddress);
if (currentScore > 0) {
    console.log('📤 Score already submitted to blockchain');
    this.resultSubmitted = true;
    return;
}
```

### 3. Finally блоки для гарантованого очищення
```javascript
} finally {
    this.submissionInProgress = false;
    if (window.currentPVPGame) {
        window.currentPVPGame.submissionInProgress = false;
    }
}
```

## Тестування

### Сценарії для тестування:
1. **Нормальне завершення** - таймер закінчується
2. **Здача гри** - гравець натискає forfeit
3. **Одночасні виклики** - швидке натискання кнопок
4. **Мережеві затримки** - повільне підключення
5. **Помилки транзакцій** - недостатньо газу

### Очікувані результати:
✅ Тільки одна транзакція відправляється
✅ Інші виклики ігноруються з логуванням
✅ Флаги правильно очищаються навіть при помилках
✅ UI показує правильний стан

## Логування для діагностики

```javascript
console.log('📤 Result already submitted, skipping...');
console.log('📤 Submission already in progress, skipping...');
console.log('🏳️ Cannot forfeit - result already submitted');
console.log('🏳️ Cannot forfeit - submission in progress');
```

Ці повідомлення допоможуть відстежити, коли спрацьовує захист від множинних викликів.

## Результат

🎉 **Проблема множинних транзакцій вирішена!**

Тепер кожен гравець відправляє **рівно одну транзакцію** `submitRoomScore`, незалежно від того:
- Скільки разів викликаються функції
- Як швидко гравець натискає кнопки  
- Чи є мережеві затримки
- Чи виникають помилки транзакцій