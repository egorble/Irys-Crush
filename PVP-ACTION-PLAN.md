# План дій для реалізації PVP функціональності

## 🎯 Мета
Інтегрувати повноцінну PVP систему в IrysCrush з можливістю створення кімнат, мультиплеєрних ігор та розподілу призів.

## 📅 Етапи реалізації

### 🔥 ЕТАП 1: Підготовка інфраструктури (День 1)
**Пріоритет: КРИТИЧНИЙ**

#### 1.1 Оновлення смарт-контракту ABI
**Файл:** `main.js`
**Час:** 30 хвилин

```javascript
// Додати до CONTRACT_ABI:
const PVP_FUNCTIONS = [
  // Room Management
  "function createPVPRoom(uint256 _entryFee, uint256 _gameDuration, uint256 _maxPlayers) payable returns (uint256)",
  "function joinPVPRoom(uint256 _roomId) payable",
  "function startGame(uint256 _roomId)",
  "function submitScoreToRoom(uint256 _roomId, uint256 _score)",
  "function finishGame(uint256 _roomId)",
  
  // View Functions
  "function getRoomInfo(uint256 _roomId) view returns (address host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers, uint256 currentPlayers, uint8 state, uint256 prizePool, uint256 startTime, address winner)",
  "function getRoomLeaderboard(uint256 _roomId) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores, bool[] memory hasSubmitted)",
  "function getJoinableRooms() view returns (uint256[] memory roomIds, address[] memory hosts, uint256[] memory entryFees, uint256[] memory gameDurations, uint256[] memory currentPlayers, uint256[] memory maxPlayers)",
  "function getRemainingTime(uint256 _roomId) view returns (uint256)",
  
  // Events
  "event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers)",
  "event PlayerJoinedRoom(uint256 indexed roomId, address indexed player)",
  "event GameStarted(uint256 indexed roomId, uint256 startTime)",
  "event ScoreSubmittedToRoom(uint256 indexed roomId, address indexed player, uint256 score)",
  "event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prizeAmount)"
];

// Об'єднати з існуючим ABI
const CONTRACT_ABI = [...EXISTING_ABI, ...PVP_FUNCTIONS];
```

#### 1.2 Створення базової структури PVP модуля
**Файл:** `public/js/pvp-system.js`
**Час:** 45 хвилин

```javascript
// Базова структура модуля
class IrysCrushPVP {
    constructor(contract, signer) {
        this.contract = contract;
        this.signer = signer;
        this.currentRoomId = null;
        this.isHost = false;
        this.gameTimer = null;
        this.leaderboardUpdater = null;
    }
    
    // Заглушки для основних методів
    async createRoom(entryFee, gameDuration, maxPlayers) {
        // TODO: Реалізувати
    }
    
    async joinRoom(roomId) {
        // TODO: Реалізувати
    }
    
    async startGame(roomId) {
        // TODO: Реалізувати
    }
    
    async submitScore(score, roomId) {
        // TODO: Реалізувати
    }
}

// Глобальні змінні
let pvpInstance = null;
let isPVPMode = false;

// Експорт
window.IrysCrushPVP = IrysCrushPVP;
window.pvpInstance = null;
window.isPVPMode = false;
```

#### 1.3 Додавання базових UI елементів
**Файл:** `public/index.html`
**Час:** 30 хвилин

```html
<!-- Додати кнопку PVP в головне меню -->
<button id="pvp-btn">🎯 PVP Mode</button>

<!-- Базове модальне вікно PVP -->
<div id="pvp-modal" class="modal hidden">
  <div class="modal-content">
    <h2>🎯 PVP Mode</h2>
    <p>PVP functionality coming soon...</p>
    <button id="close-pvp">Close</button>
  </div>
</div>
```

**Результат Етапу 1:** Базова інфраструктура готова, PVP кнопка працює

---

### 🚀 ЕТАП 2: Створення та приєднання до кімнат (День 2)
**Пріоритет: ВИСОКИЙ**

#### 2.1 Реалізація створення кімнат
**Час:** 2 години

```javascript
// В pvp-system.js
async createRoom(entryFee, gameDuration, maxPlayers) {
    try {
        // Валідація
        this.validateRoomParams(entryFee, gameDuration, maxPlayers);
        
        // Конвертація
        const entryFeeWei = ethers.utils.parseEther(entryFee.toString());
        
        // UI
        showLoadingIndicator('Creating room...');
        
        // Транзакція
        const tx = await this.contract.createPVPRoom(
            entryFeeWei,
            gameDuration,
            maxPlayers,
            { value: entryFeeWei, gasLimit: 300000 }
        );
        
        // Очікування
        const receipt = await tx.wait();
        
        // Обробка
        return this.handleRoomCreated(receipt);
        
    } catch (error) {
        this.handleError(error, 'create room');
        throw error;
    }
}
```

#### 2.2 UI для створення кімнат
**Час:** 1 година

```html
<!-- Форма створення кімнати -->
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
```

#### 2.3 Список доступних кімнат
**Час:** 1.5 години

```javascript
// Завантаження кімнат
async loadAvailableRooms() {
    try {
        const roomsData = await this.contract.getJoinableRooms();
        const rooms = this.parseRoomsData(roomsData);
        this.displayRoomsList(rooms);
        return rooms;
    } catch (error) {
        console.error('Error loading rooms:', error);
        return [];
    }
}

// Відображення кімнат
displayRoomsList(rooms) {
    const container = document.getElementById('rooms-list');
    container.innerHTML = rooms.map(room => this.createRoomCard(room)).join('');
}
```

#### 2.4 Приєднання до кімнат
**Час:** 1 година

```javascript
async joinRoom(roomId) {
    try {
        const roomInfo = await this.contract.getRoomInfo(roomId);
        
        // Перевірки
        if (roomInfo.state !== 0) throw new Error('Room not available');
        if (roomInfo.currentPlayers >= roomInfo.maxPlayers) throw new Error('Room full');
        
        // Підтвердження
        const confirmed = await this.showJoinConfirmation(roomInfo);
        if (!confirmed) return;
        
        // Транзакція
        const tx = await this.contract.joinPVPRoom(roomId, {
            value: roomInfo.entryFee,
            gasLimit: 200000
        });
        
        const receipt = await tx.wait();
        return this.handleRoomJoined(receipt, roomId);
        
    } catch (error) {
        this.handleError(error, 'join room');
        throw error;
    }
}
```

**Результат Етапу 2:** Користувачі можуть створювати та приєднуватися до кімнат

---

### 🎮 ЕТАП 3: Ігрова механіка (День 3)
**Пріоритет: ВИСОКИЙ**

#### 3.1 Запуск гри хостом
**Час:** 1 година

```javascript
async startGame(roomId) {
    try {
        if (!this.isHost) throw new Error('Only host can start game');
        
        const roomInfo = await this.contract.getRoomInfo(roomId);
        if (roomInfo.currentPlayers < 2) throw new Error('Need at least 2 players');
        
        const tx = await this.contract.startGame(roomId, { gasLimit: 150000 });
        const receipt = await tx.wait();
        
        return this.handleGameStarted(receipt, roomId);
    } catch (error) {
        this.handleError(error, 'start game');
        throw error;
    }
}
```

#### 3.2 Інтеграція з ігровою системою
**Файл:** `public/js/game-system.js`
**Час:** 2 години

```javascript
// Модифікація існуючих функцій
function startGame(isPVP = false) {
    if (isPVP) {
        // PVP режим
        isPVPMode = true;
        initializePVPGame();
    } else {
        // Звичайний режим
        isPVPMode = false;
        initializeRegularGame();
    }
    
    // Спільна логіка
    initializeGameBoard();
    startGameTimer();
}

function submitScore(score) {
    if (isPVPMode && window.pvpInstance) {
        // Подати в PVP кімнату
        window.pvpInstance.submitScore(score, window.pvpInstance.currentRoomId);
    } else {
        // Звичайна подача
        submitRegularScore(score);
    }
}
```

#### 3.3 PVP ігровий інтерфейс
**Час:** 1.5 години

```html
<!-- PVP ігровий UI -->
<div id="pvp-game-ui" class="hidden">
    <div class="pvp-top-bar">
        <div class="pvp-info">
            <span>Room #<span id="pvp-room-id"></span></span>
            <span>Prize: <span id="pvp-prize"></span> IRYS</span>
        </div>
        <div class="pvp-timer">
            <span id="pvp-timer">05:00</span>
        </div>
    </div>
    
    <div class="pvp-leaderboard-live">
        <h3>Live Scores</h3>
        <div id="pvp-live-scores"></div>
    </div>
</div>
```

#### 3.4 Подача результатів
**Час:** 1 година

```javascript
async submitScore(score, roomId) {
    try {
        // Перевірки
        const roomInfo = await this.contract.getRoomInfo(roomId);
        if (roomInfo.state !== 1) throw new Error('Game not in progress');
        
        const [, hasSubmitted] = await this.contract.getPlayerScoreInRoom(roomId, userWallet);
        if (hasSubmitted) throw new Error('Score already submitted');
        
        // Транзакція
        const tx = await this.contract.submitScoreToRoom(roomId, score, { gasLimit: 150000 });
        const receipt = await tx.wait();
        
        return this.handleScoreSubmitted(receipt, roomId, score);
    } catch (error) {
        this.handleError(error, 'submit score');
        throw error;
    }
}
```

**Результат Етапу 3:** Повноцінна ігрова механіка PVP

---

### 📊 ЕТАП 4: Лідерборди та завершення (День 4)
**Пріоритет: СЕРЕДНІЙ**

#### 4.1 Живий лідерборд
**Час:** 1.5 години

```javascript
// Живе оновлення лідерборду
startLiveLeaderboardUpdates(roomId) {
    this.leaderboardUpdater = setInterval(async () => {
        try {
            const leaderboard = await this.contract.getRoomLeaderboard(roomId);
            this.updateLiveLeaderboardDisplay(leaderboard);
        } catch (error) {
            console.error('Leaderboard update error:', error);
        }
    }, 3000);
}

updateLiveLeaderboardDisplay(leaderboard) {
    const container = document.getElementById('pvp-live-scores');
    const players = this.parseLeaderboardData(leaderboard);
    
    container.innerHTML = players.map((player, index) => `
        <div class="pvp-player-score ${player.hasSubmitted ? 'submitted' : 'pending'}">
            <span class="rank">${index + 1}.</span>
            <span class="nickname">${player.nickname}</span>
            <span class="score">${player.hasSubmitted ? player.score : 'Playing...'}</span>
        </div>
    `).join('');
}
```

#### 4.2 Завершення гри та розподіл призів
**Час:** 1 година

```javascript
async finishGame(roomId) {
    try {
        const tx = await this.contract.finishGame(roomId, { gasLimit: 200000 });
        const receipt = await tx.wait();
        return this.handleGameFinished(receipt, roomId);
    } catch (error) {
        this.handleError(error, 'finish game');
        throw error;
    }
}

handleGameFinished(receipt, roomId) {
    const gameFinishedEvent = receipt.events.find(e => e.event === 'GameFinished');
    
    if (gameFinishedEvent) {
        const winner = gameFinishedEvent.args.winner;
        const prizeAmount = ethers.utils.formatEther(gameFinishedEvent.args.prizeAmount);
        
        this.stopGameTimer();
        this.showGameResults({ roomId, winner, prizeAmount });
        
        return true;
    }
}
```

#### 4.3 Результати гри
**Час:** 1 година

```html
<!-- Модальне вікно результатів -->
<div id="pvp-results-modal" class="modal hidden">
    <div class="modal-content">
        <h2>🏆 Game Results</h2>
        
        <div class="winner-announcement">
            <div id="winner-info"></div>
            <div id="prize-info"></div>
        </div>
        
        <div class="final-leaderboard">
            <h3>Final Leaderboard</h3>
            <div id="final-scores"></div>
        </div>
        
        <div class="game-actions">
            <button id="play-again-pvp">Play Again</button>
            <button id="back-to-menu">Back to Menu</button>
        </div>
    </div>
</div>
```

**Результат Етапу 4:** Повний цикл PVP гри з результатами

---

### 🎨 ЕТАП 5: UX та поліровка (День 5)
**Пріоритет: НИЗЬКИЙ**

#### 5.1 Стилізація CSS
**Файл:** `public/style.css`
**Час:** 2 години

```css
/* PVP Modal */
.pvp-content {
    max-width: 800px;
    width: 90%;
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

/* Live Leaderboard */
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

/* Animations */
@keyframes scoreUpdate {
    0% { background-color: rgba(76, 175, 80, 0.3); }
    100% { background-color: transparent; }
}

.score-updated {
    animation: scoreUpdate 1s ease-out;
}
```

#### 5.2 Анімації та переходи
**Час:** 1 година

```javascript
// Анімації для UI
function animateScoreUpdate(element) {
    element.classList.add('score-updated');
    setTimeout(() => element.classList.remove('score-updated'), 1000);
}

function smoothTransition(fromElement, toElement) {
    fromElement.style.opacity = '0';
    setTimeout(() => {
        fromElement.classList.add('hidden');
        toElement.classList.remove('hidden');
        toElement.style.opacity = '1';
    }, 300);
}
```

#### 5.3 Звукові ефекти
**Час:** 30 хвилин

```javascript
// Звуки для PVP подій
const PVP_SOUNDS = {
    roomCreated: new Audio('/sounds/room-created.mp3'),
    playerJoined: new Audio('/sounds/player-joined.mp3'),
    gameStarted: new Audio('/sounds/game-started.mp3'),
    scoreSubmitted: new Audio('/sounds/score-submitted.mp3'),
    gameFinished: new Audio('/sounds/game-finished.mp3')
};

function playPVPSound(soundName) {
    if (PVP_SOUNDS[soundName] && !settings.muteSound) {
        PVP_SOUNDS[soundName].play().catch(e => console.log('Sound play failed:', e));
    }
}
```

**Результат Етапу 5:** Поліровані UX та візуальні ефекти

---

## 🧪 ЕТАП 6: Тестування (День 6)
**Пріоритет: КРИТИЧНИЙ**

### 6.1 Функціональне тестування
**Час:** 3 години

#### Тест-кейси:
1. **Створення кімнати**
   - ✅ Валідні параметри
   - ❌ Невалідні параметри
   - ❌ Недостатньо IRYS

2. **Приєднання до кімнати**
   - ✅ Успішне приєднання
   - ❌ Кімната повна
   - ❌ Кімната не існує
   - ❌ Недостатньо IRYS

3. **Ігровий процес**
   - ✅ Запуск гри хостом
   - ✅ Подача результатів
   - ✅ Живий лідерборд
   - ✅ Таймер гри

4. **Завершення гри**
   - ✅ Автоматичне завершення
   - ✅ Ручне завершення
   - ✅ Розподіл призів

### 6.2 Тестування з декількома користувачами
**Час:** 2 години

```javascript
// Скрипт для тестування
const testScenarios = {
    async testFullGameCycle() {
        // 1. Створити кімнату
        const roomId = await pvpInstance.createRoom(0.1, 300, 4);
        
        // 2. Приєднати гравців (симуляція)
        // 3. Запустити гру
        // 4. Подати результати
        // 5. Завершити гру
        // 6. Перевірити розподіл призів
    }
};
```

---

## 📋 Чекліст готовності

### ✅ Обов'язкові функції
- [ ] Створення PVP кімнат
- [ ] Приєднання до кімнат
- [ ] Список доступних кімнат
- [ ] Запуск гри хостом
- [ ] Подача результатів
- [ ] Живий лідерборд
- [ ] Таймер гри
- [ ] Завершення гри
- [ ] Розподіл призів
- [ ] Обробка помилок

### 🎨 Додаткові функції
- [ ] Анімації UI
- [ ] Звукові ефекти
- [ ] Мобільна адаптація
- [ ] Кешування даних
- [ ] Офлайн режим

### 🔒 Безпека
- [ ] Валідація всіх вводів
- [ ] Захист від спаму
- [ ] Перевірка прав доступу
- [ ] Обробка мережевих помилок

---

## 🚀 План розгортання

### День 7: Деплой
1. **Тестування на тестнеті** (2 години)
2. **Виправлення критичних багів** (2 години)
3. **Деплой на продакшн** (1 година)
4. **Моніторинг та підтримка** (постійно)

---

## 📊 Метрики успіху

### Технічні метрики
- ✅ Всі транзакції виконуються успішно
- ✅ UI відгукується за < 2 секунди
- ✅ Живий лідерборд оновлюється кожні 3 секунди
- ✅ Помилки обробляються коректно

### Користувацькі метрики
- 🎯 Користувачі можуть створити кімнату за < 1 хвилину
- 🎯 Приєднання до кімнати займає < 30 секунд
- 🎯 Ігровий процес інтуїтивно зрозумілий
- 🎯 Результати відображаються миттєво

---

**Цей план забезпечує поетапну реалізацію PVP функціональності з мінімальними ризиками та максимальною якістю.**