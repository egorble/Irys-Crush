# План інтеграції PVP функціональності в JavaScript

## 📋 Загальний огляд

Цей документ описує детальний план інтеграції PVP (Player vs Player) функціональності в існуючий IrysCrush проект. План враховує поточну архітектуру з модульною системою JavaScript файлів.

## 🏗️ Архітектура інтеграції

### 1. Структура файлів
```
public/
├── js/
│   ├── pvp-system.js          # Новий модуль PVP системи
│   ├── leaderboard-system.js  # Розширити для PVP лідербордів
│   └── game-system.js         # Розширити для PVP режиму
├── index.html                 # Додати PVP UI елементи
├── style.css                  # Додати PVP стилі
└── main.js                    # Оновити ABI контракту
```

### 2. Оновлення смарт-контракту ABI

**Файл:** `main.js`

**Дії:**
- Додати нові функції PVP до `CONTRACT_ABI`
- Включити всі події PVP
- Оновити глобальні змінні для PVP стану

**Нові функції в ABI:**
```javascript
// PVP Room Management
"function createPVPRoom(uint256 _entryFee, uint256 _gameDuration, uint256 _maxPlayers) payable returns (uint256)",
"function joinPVPRoom(uint256 _roomId) payable",
"function startGame(uint256 _roomId)",
"function submitScoreToRoom(uint256 _roomId, uint256 _score)",
"function finishGame(uint256 _roomId)",

// PVP View Functions
"function getRoomInfo(uint256 _roomId) view returns (address host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers, uint256 currentPlayers, uint8 state, uint256 prizePool, uint256 startTime, address winner)",
"function getRoomLeaderboard(uint256 _roomId) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores, bool[] memory hasSubmitted)",
"function getActiveRooms() view returns (uint256[] memory)",
"function getJoinableRooms() view returns (uint256[] memory roomIds, address[] memory hosts, uint256[] memory entryFees, uint256[] memory gameDurations, uint256[] memory currentPlayers, uint256[] memory maxPlayers)",
"function isPlayerInRoom(uint256 _roomId, address _player) view returns (bool)",
"function getPlayerScoreInRoom(uint256 _roomId, address _player) view returns (uint256, bool)",
"function getRemainingTime(uint256 _roomId) view returns (uint256)",

// PVP Events
"event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers)",
"event PlayerJoinedRoom(uint256 indexed roomId, address indexed player)",
"event GameStarted(uint256 indexed roomId, uint256 startTime)",
"event ScoreSubmittedToRoom(uint256 indexed roomId, address indexed player, uint256 score)",
"event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prizeAmount)",
"event PrizeDistributed(uint256 indexed roomId, address indexed winner, uint256 amount)"
```

## 🎮 Створення PVP системи

### 3. Новий модуль: `js/pvp-system.js`

**Основні компоненти:**

#### A. Клас IrysCrushPVP
```javascript
class IrysCrushPVP {
    constructor(contract, signer) {
        this.contract = contract;
        this.signer = signer;
        this.currentRoomId = null;
        this.gameTimer = null;
        this.isHost = false;
        this.roomPlayers = [];
    }
}
```

#### B. Основні функції
1. **Управління кімнатами:**
   - `createRoom(entryFee, gameDuration, maxPlayers)`
   - `joinRoom(roomId)`
   - `leaveRoom(roomId)`
   - `getRoomsList()`

2. **Управління грою:**
   - `startGame(roomId)`
   - `submitScore(score, roomId)`
   - `finishGame(roomId)`
   - `getRemainingTime(roomId)`

3. **Отримання даних:**
   - `getRoomInfo(roomId)`
   - `getRoomLeaderboard(roomId)`
   - `getPlayerStatus(roomId)`

4. **Події та таймери:**
   - `setupEventListeners()`
   - `startGameTimer(roomId)`
   - `stopGameTimer()`

#### C. Callback функції
```javascript
// Callback функції для UI оновлень
pvp.onRoomCreated = (roomData) => { /* оновити UI */ };
pvp.onPlayerJoined = (roomId, player) => { /* оновити список гравців */ };
pvp.onGameStarted = (roomId, startTime) => { /* почати гру */ };
pvp.onScoreSubmitted = (roomId, player, score) => { /* оновити лідерборд */ };
pvp.onGameFinished = (gameData) => { /* показати результати */ };
pvp.onTimerUpdate = (remainingTime) => { /* оновити таймер */ };
```

## 🖥️ UI інтеграція

### 4. Оновлення `index.html`

**Додати нові елементи:**

#### A. Кнопка PVP в головному меню
```html
<button id="pvp-btn">🎯 PVP Mode</button>
```

#### B. PVP модальне вікно
```html
<div id="pvp-modal" class="modal hidden">
  <div class="modal-content pvp-content">
    <h2>🎯 PVP Mode</h2>
    
    <!-- Вкладки -->
    <div class="pvp-tabs">
      <button class="tab-btn active" data-tab="rooms">Available Rooms</button>
      <button class="tab-btn" data-tab="create">Create Room</button>
      <button class="tab-btn" data-tab="my-room">My Room</button>
    </div>
    
    <!-- Контент вкладок -->
    <div class="tab-content">
      <!-- Доступні кімнати -->
      <div id="rooms-tab" class="tab-pane active">
        <div id="rooms-list"></div>
        <button id="refresh-rooms">🔄 Refresh</button>
      </div>
      
      <!-- Створення кімнати -->
      <div id="create-tab" class="tab-pane hidden">
        <div class="create-room-form">
          <label>Entry Fee (IRYS):</label>
          <input type="number" id="entry-fee" step="0.01" min="0.01" value="0.1">
          
          <label>Game Duration (minutes):</label>
          <input type="number" id="game-duration" min="1" max="30" value="5">
          
          <label>Max Players:</label>
          <select id="max-players">
            <option value="2">2 Players</option>
            <option value="4" selected>4 Players</option>
            <option value="6">6 Players</option>
            <option value="8">8 Players</option>
            <option value="10">10 Players</option>
          </select>
          
          <button id="create-room-btn">Create Room</button>
        </div>
      </div>
      
      <!-- Моя кімната -->
      <div id="my-room-tab" class="tab-pane hidden">
        <div id="room-info"></div>
        <div id="room-players"></div>
        <div id="room-controls"></div>
      </div>
    </div>
    
    <button id="close-pvp">Close</button>
  </div>
</div>
```

#### C. PVP ігровий інтерфейс
```html
<div id="pvp-game-ui" class="hidden">
  <div class="pvp-top-bar">
    <div class="pvp-info">
      <span>Room #<span id="pvp-room-id"></span></span>
      <span>Prize: <span id="pvp-prize"></span> IRYS</span>
    </div>
    <div class="pvp-timer">
      <span id="pvp-timer">05:00</span>
    </div>
    <div class="pvp-players-count">
      <span id="pvp-players">4/4 players</span>
    </div>
  </div>
  
  <div class="pvp-leaderboard-live">
    <h3>Live Leaderboard</h3>
    <div id="pvp-live-scores"></div>
  </div>
  
  <div id="pvp-game-board"></div>
  
  <button id="pvp-exit-game">Exit Game</button>
</div>
```

### 5. Стилізація CSS

**Додати до `style.css`:**

```css
/* PVP Modal Styles */
.pvp-content {
  max-width: 800px;
  width: 90%;
}

.pvp-tabs {
  display: flex;
  border-bottom: 2px solid #333;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: #4CAF50;
  border-bottom: 2px solid #4CAF50;
}

.tab-pane {
  display: none;
}

.tab-pane.active {
  display: block;
}

/* Room Cards */
.room-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  transition: all 0.3s;
}

.room-card:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #4CAF50;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 14px;
}

/* PVP Game UI */
.pvp-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px 20px;
  color: #fff;
}

.pvp-leaderboard-live {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 250px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  padding: 15px;
  color: #fff;
}

.pvp-player-score {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #333;
}

/* Create Room Form */
.create-room-form {
  display: grid;
  gap: 15px;
}

.create-room-form label {
  font-weight: bold;
  color: #ffd700;
}

.create-room-form input,
.create-room-form select {
  padding: 8px;
  border: 1px solid #333;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
```

## 🔄 Інтеграція з існуючими системами

### 6. Оновлення `js/game-system.js`

**Додати PVP режим:**

```javascript
// Глобальні змінні PVP
let isPVPMode = false;
let currentPVPRoom = null;
let pvpInstance = null;

// Функція запуску PVP гри
function startPVPGame(roomId) {
    isPVPMode = true;
    currentPVPRoom = roomId;
    
    // Ініціалізувати PVP UI
    showPVPGameUI();
    
    // Запустити гру з PVP логікою
    startGame(true); // передати PVP флаг
}

// Модифікувати функцію submitScore
function submitScore(score) {
    if (isPVPMode && currentPVPRoom) {
        // Подати результат в PVP кімнату
        pvpInstance.submitScore(score, currentPVPRoom);
    } else {
        // Звичайна подача результату
        // ... існуючий код
    }
}
```

### 7. Оновлення `js/leaderboard-system.js`

**Додати PVP лідерборди:**

```javascript
// Функція показу PVP лідерборду
async function showPVPLeaderboard(roomId) {
    try {
        const leaderboard = await pvpInstance.getRoomLeaderboard(roomId);
        
        // Відобразити лідерборд кімнати
        displayPVPLeaderboard(leaderboard);
    } catch (error) {
        console.error('Error loading PVP leaderboard:', error);
    }
}

// Функція живого оновлення лідерборду
function updateLivePVPLeaderboard(roomId) {
    setInterval(async () => {
        if (isPVPMode && currentPVPRoom === roomId) {
            const leaderboard = await pvpInstance.getRoomLeaderboard(roomId);
            updateLiveScoresDisplay(leaderboard);
        }
    }, 2000); // Оновлювати кожні 2 секунди
}
```

## 📱 Користувацький досвід (UX)

### 8. Потік взаємодії користувача

#### A. Створення кімнати
1. Користувач натискає "PVP Mode"
2. Переходить на вкладку "Create Room"
3. Встановлює параметри (плата, час, гравці)
4. Натискає "Create Room"
5. Система створює кімнату та переводить на вкладку "My Room"
6. Користувач чекає інших гравців
7. Коли кімната заповнена, хост може почати гру

#### B. Приєднання до кімнати
1. Користувач натискає "PVP Mode"
2. Бачить список доступних кімнат
3. Вибирає кімнату та натискає "Join"
4. Система переводить на вкладку "My Room"
5. Користувач чекає початку гри

#### C. Ігровий процес
1. Хост натискає "Start Game"
2. Всі гравці переходять в ігровий режим
3. Запускається таймер
4. Гравці грають та бачать живий лідерборд
5. Після закінчення часу або ручного завершення показуються результати
6. Переможець отримує приз

### 9. Обробка помилок та крайніх випадків

```javascript
// Обробка відключення гравця
function handlePlayerDisconnect(roomId, player) {
    // Оновити список гравців
    // Якщо відключився хост - передати права іншому гравцю
    // Якщо залишився 1 гравець - автоматично завершити гру
}

// Обробка помилок транзакцій
function handleTransactionError(error, action) {
    let message = 'Transaction failed';
    
    if (error.message.includes('insufficient funds')) {
        message = 'Insufficient IRYS tokens';
    } else if (error.message.includes('user rejected')) {
        message = 'Transaction cancelled by user';
    }
    
    showErrorMessage(message);
}

// Обробка мережевих помилок
function handleNetworkError(error) {
    showErrorMessage('Network error. Please check your connection.');
    // Спробувати перепідключитися
    setTimeout(reconnectToNetwork, 5000);
}
```

## 🔧 Технічні деталі

### 10. Оптимізація та продуктивність

#### A. Кешування даних
```javascript
// Кеш для кімнат
const roomsCache = new Map();
const CACHE_DURATION = 30000; // 30 секунд

function getCachedRooms() {
    const cached = roomsCache.get('rooms');
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}
```

#### B. Пакетні запити
```javascript
// Отримати всю інформацію про кімнату одним запитом
async function getRoomFullInfo(roomId) {
    const [roomInfo, leaderboard, remainingTime] = await Promise.all([
        contract.getRoomInfo(roomId),
        contract.getRoomLeaderboard(roomId),
        contract.getRemainingTime(roomId)
    ]);
    
    return { roomInfo, leaderboard, remainingTime };
}
```

### 11. Безпека

#### A. Валідація вводу
```javascript
function validateRoomParams(entryFee, gameDuration, maxPlayers) {
    if (entryFee < 0.01 || entryFee > 10) {
        throw new Error('Entry fee must be between 0.01 and 10 IRYS');
    }
    
    if (gameDuration < 60 || gameDuration > 1800) {
        throw new Error('Game duration must be between 1 and 30 minutes');
    }
    
    if (maxPlayers < 2 || maxPlayers > 10) {
        throw new Error('Max players must be between 2 and 10');
    }
}
```

#### B. Захист від спаму
```javascript
// Обмеження частоти дій
const actionLimits = new Map();

function checkActionLimit(action, limit = 1000) {
    const lastAction = actionLimits.get(action);
    const now = Date.now();
    
    if (lastAction && now - lastAction < limit) {
        throw new Error('Action too frequent. Please wait.');
    }
    
    actionLimits.set(action, now);
}
```

## 📋 Чекліст реалізації

### Фаза 1: Основна інфраструктура
- [ ] Оновити ABI в main.js
- [ ] Створити js/pvp-system.js
- [ ] Додати PVP UI елементи в index.html
- [ ] Додати PVP стилі в style.css

### Фаза 2: Основний функціонал
- [ ] Реалізувати створення кімнат
- [ ] Реалізувати приєднання до кімнат
- [ ] Реалізувати список доступних кімнат
- [ ] Реалізувати управління грою

### Фаза 3: Ігрова інтеграція
- [ ] Інтегрувати PVP режим в game-system.js
- [ ] Реалізувати живий лідерборд
- [ ] Додати PVP таймер
- [ ] Реалізувати подачу результатів

### Фаза 4: UX та поліровка
- [ ] Додати анімації та переходи
- [ ] Реалізувати обробку помилок
- [ ] Додати звукові ефекти
- [ ] Оптимізувати продуктивність

### Фаза 5: Тестування
- [ ] Тестування створення кімнат
- [ ] Тестування мультиплеєрної гри
- [ ] Тестування розподілу призів
- [ ] Тестування крайніх випадків

## 🚀 Наступні кроки

1. **Затвердження плану** - Отримати підтвердження архітектури
2. **Початок реалізації** - Почати з Фази 1
3. **Ітеративна розробка** - Реалізовувати по одній фазі
4. **Тестування** - Тестувати кожну фазу окремо
5. **Деплой** - Розгорнути на продакшн

---

**Примітка:** Цей план забезпечує повну інтеграцію PVP функціональності зі збереженням існуючої архітектури та UX проекту.