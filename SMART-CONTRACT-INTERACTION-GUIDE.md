# Детальний гід взаємодії зі смарт-контрактом PVP

## 🔗 Архітектура взаємодії

```
Frontend (JavaScript) ↔ Web3/Ethers.js ↔ Smart Contract (Solidity)
       ↓                      ↓                    ↓
   UI Events            Transaction Calls      Blockchain State
   User Actions         Event Listeners       Contract Events
   State Management     Error Handling        Data Storage
```

---

## 📡 Налаштування з'єднання

### 1. Ініціалізація контракту
**Файл:** `main.js`

```javascript
// Розширений CONTRACT_ABI з PVP функціями
const CONTRACT_ABI = [
    // Існуючі функції...
    
    // PVP Room Management
    "function createPVPRoom(uint256 _entryFee, uint256 _gameDuration, uint256 _maxPlayers) payable returns (uint256)",
    "function joinPVPRoom(uint256 _roomId) payable",
    "function startGame(uint256 _roomId)",
    "function submitScoreToRoom(uint256 _roomId, uint256 _score)",
    "function finishGame(uint256 _roomId)",
    
    // PVP View Functions
    "function getRoomInfo(uint256 _roomId) view returns (tuple(address host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers, uint256 currentPlayers, uint8 state, uint256 prizePool, uint256 startTime, address winner))",
    "function getRoomLeaderboard(uint256 _roomId) view returns (address[] memory, string[] memory, uint256[] memory, bool[] memory)",
    "function getJoinableRooms() view returns (uint256[] memory, address[] memory, uint256[] memory, uint256[] memory, uint256[] memory, uint256[] memory)",
    "function getActiveRooms() view returns (uint256[] memory)",
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
];

// Ініціалізація після підключення гаманця
async function initializePVPContract() {
    if (!contract || !signer) {
        throw new Error('Contract or signer not initialized');
    }
    
    // Створення PVP інстансу
    window.pvpInstance = new IrysCrushPVP(contract, signer);
    
    // Налаштування слухачів подій
    setupPVPEventListeners();
    
    console.log('PVP contract initialized successfully');
}

// Слухачі подій контракту
function setupPVPEventListeners() {
    // Створення кімнати
    contract.on('RoomCreated', (roomId, host, entryFee, gameDuration, maxPlayers, event) => {
        console.log('Room created:', { roomId: roomId.toString(), host, entryFee: ethers.utils.formatEther(entryFee) });
        
        if (host.toLowerCase() === userWallet.toLowerCase()) {
            showNotification('✅ Room created successfully!', 'success');
            window.pvpInstance.handleRoomCreated(roomId.toString());
        }
        
        // Оновити список кімнат
        if (document.getElementById('rooms-list')) {
            window.pvpInstance.refreshRoomsList();
        }
    });
    
    // Приєднання гравця
    contract.on('PlayerJoinedRoom', (roomId, player, event) => {
        console.log('Player joined room:', { roomId: roomId.toString(), player });
        
        if (player.toLowerCase() === userWallet.toLowerCase()) {
            showNotification('✅ Successfully joined room!', 'success');
            window.pvpInstance.handlePlayerJoined(roomId.toString());
        }
        
        // Оновити інформацію про кімнату
        window.pvpInstance.updateRoomInfo(roomId.toString());
    });
    
    // Початок гри
    contract.on('GameStarted', (roomId, startTime, event) => {
        console.log('Game started:', { roomId: roomId.toString(), startTime: startTime.toString() });
        
        if (window.pvpInstance.currentRoomId === roomId.toString()) {
            showNotification('🎮 Game started!', 'info');
            window.pvpInstance.handleGameStarted(roomId.toString(), startTime.toString());
        }
    });
    
    // Подача результату
    contract.on('ScoreSubmittedToRoom', (roomId, player, score, event) => {
        console.log('Score submitted:', { roomId: roomId.toString(), player, score: score.toString() });
        
        if (window.pvpInstance.currentRoomId === roomId.toString()) {
            window.pvpInstance.handleScoreSubmitted(roomId.toString(), player, score.toString());
        }
    });
    
    // Завершення гри
    contract.on('GameFinished', (roomId, winner, prizeAmount, event) => {
        console.log('Game finished:', { roomId: roomId.toString(), winner, prizeAmount: ethers.utils.formatEther(prizeAmount) });
        
        if (window.pvpInstance.currentRoomId === roomId.toString()) {
            window.pvpInstance.handleGameFinished(roomId.toString(), winner, ethers.utils.formatEther(prizeAmount));
        }
    });
}
```

---

## 🏗️ Основний клас PVP

**Файл:** `public/js/pvp-system.js`

```javascript
class IrysCrushPVP {
    constructor(contract, signer) {
        this.contract = contract;
        this.signer = signer;
        this.currentRoomId = null;
        this.isHost = false;
        this.gameTimer = null;
        this.leaderboardUpdater = null;
        this.roomsCache = new Map();
        this.lastRoomsUpdate = 0;
        
        // Константи
        this.CACHE_DURATION = 30000; // 30 секунд
        this.LEADERBOARD_UPDATE_INTERVAL = 3000; // 3 секунди
        this.ROOMS_UPDATE_INTERVAL = 10000; // 10 секунд
        
        // Ініціалізація
        this.initializeEventHandlers();
    }
    
    // ==========================================
    // СТВОРЕННЯ КІМНАТИ
    // ==========================================
    
    async createRoom(entryFee, gameDuration, maxPlayers) {
        try {
            console.log('Creating PVP room:', { entryFee, gameDuration, maxPlayers });
            
            // 1. Валідація параметрів
            this.validateRoomParams(entryFee, gameDuration, maxPlayers);
            
            // 2. Перевірка балансу
            await this.checkUserBalance(entryFee);
            
            // 3. Конвертація в Wei
            const entryFeeWei = ethers.utils.parseEther(entryFee.toString());
            
            // 4. UI індикатор
            this.showTransactionPending('Creating room...');
            
            // 5. Оцінка газу
            const gasEstimate = await this.contract.estimateGas.createPVPRoom(
                entryFeeWei,
                gameDuration * 60, // конвертація в секунди
                maxPlayers,
                { value: entryFeeWei }
            );
            
            // 6. Виконання транзакції
            const tx = await this.contract.createPVPRoom(
                entryFeeWei,
                gameDuration * 60,
                maxPlayers,
                {
                    value: entryFeeWei,
                    gasLimit: gasEstimate.mul(120).div(100) // +20% запас
                }
            );
            
            // 7. Показати хеш транзакції
            this.showTransactionHash(tx.hash);
            
            // 8. Очікування підтвердження
            const receipt = await tx.wait();
            
            // 9. Обробка результату
            const roomId = this.extractRoomIdFromReceipt(receipt);
            
            // 10. Оновлення стану
            this.currentRoomId = roomId;
            this.isHost = true;
            
            // 11. UI оновлення
            this.hideTransactionPending();
            this.showRoomCreatedSuccess(roomId);
            
            return roomId;
            
        } catch (error) {
            this.hideTransactionPending();
            this.handleTransactionError(error, 'create room');
            throw error;
        }
    }
    
    validateRoomParams(entryFee, gameDuration, maxPlayers) {
        if (!entryFee || entryFee <= 0) {
            throw new Error('Entry fee must be greater than 0');
        }
        
        if (!gameDuration || gameDuration < 1 || gameDuration > 60) {
            throw new Error('Game duration must be between 1 and 60 minutes');
        }
        
        if (!maxPlayers || maxPlayers < 2 || maxPlayers > 10) {
            throw new Error('Max players must be between 2 and 10');
        }
        
        if (entryFee > 10) {
            throw new Error('Entry fee cannot exceed 10 IRYS');
        }
    }
    
    async checkUserBalance(entryFee) {
        const balance = await this.signer.getBalance();
        const entryFeeWei = ethers.utils.parseEther(entryFee.toString());
        
        if (balance.lt(entryFeeWei)) {
            throw new Error(`Insufficient balance. Required: ${entryFee} IRYS, Available: ${ethers.utils.formatEther(balance)} IRYS`);
        }
    }
    
    extractRoomIdFromReceipt(receipt) {
        const roomCreatedEvent = receipt.events?.find(event => event.event === 'RoomCreated');
        
        if (!roomCreatedEvent) {
            throw new Error('Room creation event not found in transaction receipt');
        }
        
        return roomCreatedEvent.args.roomId.toString();
    }
    
    // ==========================================
    // ПРИЄДНАННЯ ДО КІМНАТИ
    // ==========================================
    
    async joinRoom(roomId) {
        try {
            console.log('Joining PVP room:', roomId);
            
            // 1. Перевірка існування кімнати
            const roomInfo = await this.getRoomInfo(roomId);
            
            // 2. Валідація можливості приєднання
            this.validateJoinRoom(roomInfo);
            
            // 3. Перевірка балансу
            await this.checkUserBalance(ethers.utils.formatEther(roomInfo.entryFee));
            
            // 4. Підтвердження від користувача
            const confirmed = await this.showJoinConfirmation(roomInfo);
            if (!confirmed) return false;
            
            // 5. UI індикатор
            this.showTransactionPending('Joining room...');
            
            // 6. Оцінка газу
            const gasEstimate = await this.contract.estimateGas.joinPVPRoom(roomId, {
                value: roomInfo.entryFee
            });
            
            // 7. Виконання транзакції
            const tx = await this.contract.joinPVPRoom(roomId, {
                value: roomInfo.entryFee,
                gasLimit: gasEstimate.mul(120).div(100)
            });
            
            // 8. Показати хеш
            this.showTransactionHash(tx.hash);
            
            // 9. Очікування
            const receipt = await tx.wait();
            
            // 10. Оновлення стану
            this.currentRoomId = roomId;
            this.isHost = false;
            
            // 11. UI оновлення
            this.hideTransactionPending();
            this.showJoinedRoomSuccess(roomId);
            
            return true;
            
        } catch (error) {
            this.hideTransactionPending();
            this.handleTransactionError(error, 'join room');
            throw error;
        }
    }
    
    validateJoinRoom(roomInfo) {
        if (roomInfo.state !== 0) { // 0 = Waiting
            throw new Error('Room is not available for joining');
        }
        
        if (roomInfo.currentPlayers >= roomInfo.maxPlayers) {
            throw new Error('Room is full');
        }
        
        if (roomInfo.host.toLowerCase() === userWallet.toLowerCase()) {
            throw new Error('You cannot join your own room');
        }
    }
    
    async showJoinConfirmation(roomInfo) {
        const entryFeeFormatted = ethers.utils.formatEther(roomInfo.entryFee);
        const gameDurationMinutes = Math.floor(roomInfo.gameDuration / 60);
        
        return confirm(
            `Join PVP Room?\n\n` +
            `Entry Fee: ${entryFeeFormatted} IRYS\n` +
            `Game Duration: ${gameDurationMinutes} minutes\n` +
            `Players: ${roomInfo.currentPlayers}/${roomInfo.maxPlayers}\n\n` +
            `Do you want to join this room?`
        );
    }
    
    // ==========================================
    // ЗАПУСК ГРИ
    // ==========================================
    
    async startGame(roomId) {
        try {
            console.log('Starting game for room:', roomId);
            
            // 1. Перевірка прав
            if (!this.isHost) {
                throw new Error('Only the room host can start the game');
            }
            
            // 2. Перевірка стану кімнати
            const roomInfo = await this.getRoomInfo(roomId);
            this.validateGameStart(roomInfo);
            
            // 3. UI індикатор
            this.showTransactionPending('Starting game...');
            
            // 4. Виконання транзакції
            const tx = await this.contract.startGame(roomId, {
                gasLimit: 150000
            });
            
            // 5. Показати хеш
            this.showTransactionHash(tx.hash);
            
            // 6. Очікування
            const receipt = await tx.wait();
            
            // 7. UI оновлення
            this.hideTransactionPending();
            this.showGameStartedSuccess();
            
            return true;
            
        } catch (error) {
            this.hideTransactionPending();
            this.handleTransactionError(error, 'start game');
            throw error;
        }
    }
    
    validateGameStart(roomInfo) {
        if (roomInfo.state !== 0) {
            throw new Error('Game cannot be started in current room state');
        }
        
        if (roomInfo.currentPlayers < 2) {
            throw new Error('Need at least 2 players to start the game');
        }
    }
    
    // ==========================================
    // ПОДАЧА РЕЗУЛЬТАТУ
    // ==========================================
    
    async submitScore(score, roomId = null) {
        try {
            const targetRoomId = roomId || this.currentRoomId;
            
            if (!targetRoomId) {
                throw new Error('No active room to submit score to');
            }
            
            console.log('Submitting score:', { score, roomId: targetRoomId });
            
            // 1. Валідація
            this.validateScoreSubmission(score);
            
            // 2. Перевірка стану гри
            const roomInfo = await this.getRoomInfo(targetRoomId);
            this.validateGameInProgress(roomInfo);
            
            // 3. Перевірка чи вже подано результат
            const [currentScore, hasSubmitted] = await this.contract.getPlayerScoreInRoom(
                targetRoomId,
                userWallet
            );
            
            if (hasSubmitted) {
                throw new Error('You have already submitted your score for this game');
            }
            
            // 4. UI індикатор
            this.showTransactionPending('Submitting score...');
            
            // 5. Виконання транзакції
            const tx = await this.contract.submitScoreToRoom(targetRoomId, score, {
                gasLimit: 150000
            });
            
            // 6. Показати хеш
            this.showTransactionHash(tx.hash);
            
            // 7. Очікування
            const receipt = await tx.wait();
            
            // 8. UI оновлення
            this.hideTransactionPending();
            this.showScoreSubmittedSuccess(score);
            
            return true;
            
        } catch (error) {
            this.hideTransactionPending();
            this.handleTransactionError(error, 'submit score');
            throw error;
        }
    }
    
    validateScoreSubmission(score) {
        if (!score || score < 0) {
            throw new Error('Score must be a positive number');
        }
        
        if (score > 1000000) {
            throw new Error('Score seems unrealistically high');
        }
    }
    
    validateGameInProgress(roomInfo) {
        if (roomInfo.state !== 1) { // 1 = InProgress
            throw new Error('Game is not in progress');
        }
        
        // Перевірка часу
        const currentTime = Math.floor(Date.now() / 1000);
        const gameEndTime = roomInfo.startTime + roomInfo.gameDuration;
        
        if (currentTime > gameEndTime) {
            throw new Error('Game time has expired');
        }
    }
    
    // ==========================================
    // ЗАВЕРШЕННЯ ГРИ
    // ==========================================
    
    async finishGame(roomId = null) {
        try {
            const targetRoomId = roomId || this.currentRoomId;
            
            if (!targetRoomId) {
                throw new Error('No active room to finish');
            }
            
            console.log('Finishing game for room:', targetRoomId);
            
            // 1. UI індикатор
            this.showTransactionPending('Finishing game...');
            
            // 2. Виконання транзакції
            const tx = await this.contract.finishGame(targetRoomId, {
                gasLimit: 200000
            });
            
            // 3. Показати хеш
            this.showTransactionHash(tx.hash);
            
            // 4. Очікування
            const receipt = await tx.wait();
            
            // 5. UI оновлення
            this.hideTransactionPending();
            
            return true;
            
        } catch (error) {
            this.hideTransactionPending();
            this.handleTransactionError(error, 'finish game');
            throw error;
        }
    }
    
    // ==========================================
    // ОТРИМАННЯ ДАНИХ
    // ==========================================
    
    async getRoomInfo(roomId) {
        try {
            const roomData = await this.contract.getRoomInfo(roomId);
            
            return {
                host: roomData[0],
                entryFee: roomData[1],
                gameDuration: roomData[2].toNumber(),
                maxPlayers: roomData[3].toNumber(),
                currentPlayers: roomData[4].toNumber(),
                state: roomData[5],
                prizePool: roomData[6],
                startTime: roomData[7].toNumber(),
                winner: roomData[8]
            };
        } catch (error) {
            console.error('Error getting room info:', error);
            throw new Error('Failed to get room information');
        }
    }
    
    async getRoomLeaderboard(roomId) {
        try {
            const leaderboardData = await this.contract.getRoomLeaderboard(roomId);
            
            const addresses = leaderboardData[0];
            const nicknames = leaderboardData[1];
            const scores = leaderboardData[2];
            const hasSubmitted = leaderboardData[3];
            
            return addresses.map((address, index) => ({
                address,
                nickname: nicknames[index],
                score: scores[index].toNumber(),
                hasSubmitted: hasSubmitted[index]
            }));
        } catch (error) {
            console.error('Error getting room leaderboard:', error);
            throw new Error('Failed to get room leaderboard');
        }
    }
    
    async getJoinableRooms() {
        try {
            // Перевірка кешу
            const now = Date.now();
            if (this.roomsCache.has('joinable') && 
                (now - this.lastRoomsUpdate) < this.CACHE_DURATION) {
                return this.roomsCache.get('joinable');
            }
            
            const roomsData = await this.contract.getJoinableRooms();
            
            const roomIds = roomsData[0];
            const hosts = roomsData[1];
            const entryFees = roomsData[2];
            const gameDurations = roomsData[3];
            const currentPlayers = roomsData[4];
            const maxPlayers = roomsData[5];
            
            const rooms = roomIds.map((roomId, index) => ({
                roomId: roomId.toString(),
                host: hosts[index],
                entryFee: entryFees[index],
                gameDuration: gameDurations[index].toNumber(),
                currentPlayers: currentPlayers[index].toNumber(),
                maxPlayers: maxPlayers[index].toNumber()
            }));
            
            // Кешування
            this.roomsCache.set('joinable', rooms);
            this.lastRoomsUpdate = now;
            
            return rooms;
        } catch (error) {
            console.error('Error getting joinable rooms:', error);
            return [];
        }
    }
    
    async getRemainingTime(roomId) {
        try {
            const remainingTime = await this.contract.getRemainingTime(roomId);
            return remainingTime.toNumber();
        } catch (error) {
            console.error('Error getting remaining time:', error);
            return 0;
        }
    }
    
    // ==========================================
    // ОБРОБНИКИ ПОДІЙ
    // ==========================================
    
    handleRoomCreated(roomId) {
        this.currentRoomId = roomId;
        this.isHost = true;
        
        // Перехід до кімнати
        this.showRoomWaitingScreen(roomId);
        
        // Запуск оновлення інформації про кімнату
        this.startRoomInfoUpdates(roomId);
    }
    
    handlePlayerJoined(roomId) {
        if (this.currentRoomId === roomId) {
            // Оновити інформацію про кімнату
            this.updateRoomDisplay(roomId);
        }
    }
    
    handleGameStarted(roomId, startTime) {
        if (this.currentRoomId === roomId) {
            // Запустити ігровий таймер
            this.startGameTimer(startTime);
            
            // Запустити оновлення лідерборду
            this.startLiveLeaderboardUpdates(roomId);
            
            // Перехід до ігрового режиму
            this.switchToPVPGameMode();
        }
    }
    
    handleScoreSubmitted(roomId, player, score) {
        if (this.currentRoomId === roomId) {
            // Оновити лідерборд
            this.updateLiveLeaderboard(roomId);
            
            // Показати повідомлення
            if (player.toLowerCase() === userWallet.toLowerCase()) {
                this.showScoreSubmittedNotification(score);
            } else {
                this.showPlayerScoreNotification(player, score);
            }
        }
    }
    
    handleGameFinished(roomId, winner, prizeAmount) {
        if (this.currentRoomId === roomId) {
            // Зупинити таймери
            this.stopGameTimer();
            this.stopLiveLeaderboardUpdates();
            
            // Показати результати
            this.showGameResults({
                roomId,
                winner,
                prizeAmount,
                isWinner: winner.toLowerCase() === userWallet.toLowerCase()
            });
            
            // Скинути стан
            this.resetPVPState();
        }
    }
    
    // ==========================================
    // UI МЕТОДИ
    // ==========================================
    
    showTransactionPending(message) {
        // Показати індикатор завантаження
        const loader = document.getElementById('transaction-loader');
        const loaderText = document.getElementById('loader-text');
        
        if (loader && loaderText) {
            loaderText.textContent = message;
            loader.classList.remove('hidden');
        }
    }
    
    hideTransactionPending() {
        const loader = document.getElementById('transaction-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
    
    showTransactionHash(hash) {
        const hashElement = document.getElementById('transaction-hash');
        if (hashElement) {
            hashElement.textContent = `Transaction: ${hash.substring(0, 10)}...`;
            hashElement.href = `https://explorer.irys.xyz/tx/${hash}`;
            hashElement.classList.remove('hidden');
        }
    }
    
    handleTransactionError(error, action) {
        console.error(`Error during ${action}:`, error);
        
        let errorMessage = `Failed to ${action}`;
        
        if (error.code === 4001) {
            errorMessage = 'Transaction was rejected by user';
        } else if (error.code === -32603) {
            errorMessage = 'Transaction failed - please try again';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    }
    
    // ==========================================
    // УТИЛІТИ
    // ==========================================
    
    resetPVPState() {
        this.currentRoomId = null;
        this.isHost = false;
        this.stopGameTimer();
        this.stopLiveLeaderboardUpdates();
        this.clearRoomsCache();
    }
    
    clearRoomsCache() {
        this.roomsCache.clear();
        this.lastRoomsUpdate = 0;
    }
    
    formatTimeRemaining(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    formatIRYS(wei) {
        return parseFloat(ethers.utils.formatEther(wei)).toFixed(4);
    }
}

// Експорт
window.IrysCrushPVP = IrysCrushPVP;
```

---

## 🔄 Послідовність дій

### 1. Створення кімнати
```
User Input → Validation → Balance Check → Gas Estimation → Transaction → Event Listener → UI Update
```

### 2. Приєднання до кімнати
```
Room Selection → Room Info → Validation → Confirmation → Transaction → Event Listener → UI Update
```

### 3. Ігровий процес
```
Game Start → Timer Start → Score Submission → Live Updates → Game End → Results Display
```

### 4. Обробка помилок
```
Error Detection → Error Classification → User Notification → State Recovery → Retry Option
```

---

## 📊 Моніторинг та логування

```javascript
// Система логування для PVP
class PVPLogger {
    static log(action, data) {
        console.log(`[PVP] ${action}:`, data);
        
        // Відправка аналітики (опціонально)
        if (window.analytics) {
            window.analytics.track(`PVP_${action}`, data);
        }
    }
    
    static error(action, error) {
        console.error(`[PVP ERROR] ${action}:`, error);
        
        // Відправка помилки в систему моніторингу
        if (window.errorReporting) {
            window.errorReporting.captureException(error, {
                tags: { action: `pvp_${action}` }
            });
        }
    }
}
```

---

**Цей гід забезпечує повну інтеграцію PVP функціональності з детальною обробкою всіх сценаріїв взаємодії.**