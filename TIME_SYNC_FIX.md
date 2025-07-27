# Виправлення проблеми синхронізації часу між гравцями

## Проблема

**Різні гравці бачать різний час гри** - один гравець бачить 1 хвилину, інший 2 хвилини для тієї ж кімнати.

## Причини проблеми

### 1. Мережеві затримки
- Різні гравці отримують дані з контракту в різний час
- Можливі тимчасові розбіжності через затримки мережі

### 2. Кешування браузера
- Браузери можуть кешувати результати викликів контракту
- Різні браузери/вкладки можуть мати різні кешовані дані

### 3. Fallback логіка
```javascript
gameTimeMinutes: gameTimeMinutes > 0 ? gameTimeMinutes : 2, // Fallback to 2 minutes
```
- Якщо один гравець отримує 0 або невалідні дані, він бачить 2 хвилини
- Інший гравець може отримати правильні дані

### 4. Відсутність централізованої синхронізації
- Кожен гравець обробляє час незалежно
- Немає механізму для забезпечення однакових результатів

## Виправлення

### 1. Детальне логування в `getRoomInfo` (`pvp-core.js`)

```javascript
async getRoomInfo(roomId) {
    console.log('🔍 Fetching room info from contract for room:', roomId);
    const roomData = await this.contract.getPvPRoom(roomId);
    
    // Parse and validate game time with detailed logging
    const rawGameTime = roomData[2];
    const gameTimeSeconds = Number(rawGameTime);
    const gameTimeMinutes = Math.floor(gameTimeSeconds / 60);
    
    console.log('🕐 DETAILED Room time parsing:', {
        roomId,
        rawGameTime: rawGameTime.toString(),
        rawGameTimeType: typeof rawGameTime,
        gameTimeSeconds,
        gameTimeMinutes,
        isValidSeconds: !isNaN(gameTimeSeconds),
        isValidMinutes: !isNaN(gameTimeMinutes),
        calculationCheck: `${gameTimeSeconds} / 60 = ${gameTimeSeconds / 60}`,
        floorResult: Math.floor(gameTimeSeconds / 60)
    });
    
    // КРИТИЧНО: Використовуємо Time Manager для консистентності
    let finalGameTimeMinutes = gameTimeMinutes;
    if (window.pvpTimeManager) {
        const timeData = window.pvpTimeManager.setRoomTime(roomId, gameTimeSeconds, 'contract_fetch', 'seconds');
        finalGameTimeMinutes = timeData.minutes;
        
        console.log('🕐 Time Manager processed contract time:', {
            originalSeconds: gameTimeSeconds,
            originalMinutes: gameTimeMinutes,
            timeManagerResult: timeData
        });
    }
    
    // ... решта коду
}
```

### 2. Подвійна синхронізація в `onGameStarted` (`pvp-core.js`)

```javascript
async onGameStarted(roomId, host) {
    if (this.currentRoomId === roomId) {
        console.log('🎮 Our game started!');
        
        // КРИТИЧНО: Отримуємо свіжі дані з контракту для синхронізації
        console.log('🔄 Fetching fresh room data for game start synchronization...');
        const roomInfo = await this.getRoomInfo(roomId);
        
        if (roomInfo.success && window.startPVPGame) {
            const isHost = roomInfo.room.host.toLowerCase() === (await this.signer.getAddress()).toLowerCase();
            
            // ПОДВІЙНА ПЕРЕВІРКА: Використовуємо Time Manager для гарантії консистентності
            let gameTimeMinutes = 2; // default
            if (window.pvpTimeManager) {
                // Спочатку встановлюємо час з отриманих даних кімнати
                const roomTimeData = window.pvpTimeManager.setRoomTime(roomId, roomInfo.room.gameTimeMinutes, 'game_start_room', 'minutes');
                
                // Потім отримуємо прямо з контракту для подвійної перевірки
                const contractTimeData = await window.pvpTimeManager.fetchAndCacheRoomTimeFromContract(roomId, this.contract);
                
                // Використовуємо час з контракту як найбільш надійний
                gameTimeMinutes = contractTimeData.minutes;
                
                console.log('🕐 GAME START Time synchronization:', {
                    roomId,
                    roomDataTime: roomInfo.room.gameTimeMinutes,
                    roomTimeManagerResult: roomTimeData,
                    contractTimeManagerResult: contractTimeData,
                    finalTime: gameTimeMinutes
                });
            }
            
            console.log('🚀 Starting PVP game with synchronized time:', {
                roomId,
                gameTimeMinutes,
                gameTimeSeconds: gameTimeMinutes * 60,
                isHost,
                timestamp: new Date().toISOString()
            });
            
            window.startPVPGame(roomId, gameTimeMinutes, isHost);
        }
    }
}
```

### 3. Покращена обробка в Time Manager (`pvp-time-manager.js`)

```javascript
async fetchAndCacheRoomTimeFromContract(roomId, contract) {
    try {
        console.log(`🔍 Time Manager: Fetching time for room ${roomId} from contract...`);
        
        const room = await contract.getPvPRoom(roomId);
        const rawGameTime = room.gameDuration || room[2]; // Підтримка різних форматів
        const gameDurationSeconds = Number(rawGameTime);
        
        console.log(`🔍 Time Manager: Contract raw data for room ${roomId}:`, {
            rawGameTime: rawGameTime.toString(),
            rawGameTimeType: typeof rawGameTime,
            gameDurationSeconds,
            isValid: !isNaN(gameDurationSeconds) && gameDurationSeconds > 0
        });
        
        // Додаткова валідація
        if (isNaN(gameDurationSeconds) || gameDurationSeconds <= 0) {
            console.warn(`⚠️ Time Manager: Invalid time from contract for room ${roomId}, using default`);
            const defaultTime = this.setRoomTime(roomId, this.defaultGameTimeMinutes, 'contract_invalid', 'minutes');
            return defaultTime;
        }
        
        const timeData = this.setRoomTime(roomId, gameDurationSeconds, 'contract', 'seconds');
        
        console.log(`✅ Time Manager: Room ${roomId} time fetched and cached:`, {
            roomId,
            contractSeconds: gameDurationSeconds,
            processedMinutes: timeData.minutes,
            processedSeconds: timeData.seconds,
            source: timeData.source
        });
        
        return timeData;
    } catch (error) {
        console.error(`❌ Time Manager: Failed to fetch time for room ${roomId}:`, error);
        
        // Повертаємо дефолтний час у випадку помилки
        const defaultTime = this.setRoomTime(roomId, this.defaultGameTimeMinutes, 'error_fallback', 'minutes');
        return defaultTime;
    }
}
```

## Стратегія синхронізації

### 1. Пріоритет джерел часу
1. **Контракт (прямий виклик)** - найвища пріоритетність
2. **Time Manager кеш** - середня пріоритетність  
3. **Fallback значення** - найнижча пріоритетність

### 2. Подвійна перевірка
- При старті гри робиться два запити:
  1. Через `getRoomInfo` (з кешуванням)
  2. Через `fetchAndCacheRoomTimeFromContract` (прямий запит)
- Використовується результат прямого запиту

### 3. Детальне логування
- Логується кожен крок обробки часу
- Можна відстежити де саме виникає розбіжність
- Timestamp для кожної операції

## Тестування

### Дебаг скрипт `debug-time-sync.js`
```bash
node debug-time-sync.js
```

Скрипт тестує:
- Отримання даних двома "гравцями" одночасно
- Порівняння результатів обробки
- Аналіз множинних кімнат
- Виявлення розбіжностей

### Що перевіряти в логах браузера

1. **При створенні кімнати:**
```
📝 Creating room with params: { gameDurationSeconds: 120 }
```

2. **При отриманні інформації про кімнату:**
```
🕐 DETAILED Room time parsing: { 
  rawGameTime: "120", 
  gameTimeSeconds: 120, 
  gameTimeMinutes: 2 
}
```

3. **При старті гри:**
```
🕐 GAME START Time synchronization: {
  finalTime: 2
}
```

4. **У Time Manager:**
```
✅ Time Manager: Room 123 time fetched and cached: {
  contractSeconds: 120,
  processedMinutes: 2
}
```

## Очікуваний результат

✅ **Обидва гравці бачать однаковий час**
✅ **Детальне логування для відстеження проблем**
✅ **Подвійна перевірка для надійності**
✅ **Централізоване управління часом через Time Manager**
✅ **Fallback механізми для стабільності**

## Якщо проблема залишається

1. **Перевірте логи** - чи обидва гравці отримують однакові `rawGameTime` з контракту
2. **Перевірте мережу** - чи немає затримок або помилок при запитах
3. **Перевірте кеш** - очистіть кеш браузера та перезавантажте сторінку
4. **Запустіть дебаг скрипт** - для аналізу синхронізації на рівні контракту