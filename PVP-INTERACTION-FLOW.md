# Детальна взаємодія з PVP смарт-контрактом

## 🔄 Повний цикл взаємодії

Цей документ описує детальну послідовність дій та взаємодію з смарт-контрактом для PVP функціональності.

## 📊 Схема взаємодії

```
Фронтенд (JavaScript) ↔ Смарт-контракт (Solidity) ↔ Blockchain (Irys)
       ↓                        ↓                         ↓
   UI Events              Contract Functions         State Changes
   Callbacks              Event Emissions           Transaction Logs
```

## 🎯 Сценарій 1: Створення PVP кімнати

### Крок 1: Користувач заповнює форму
```javascript
// Користувач вводить:
// - Entry Fee: 0.1 IRYS
// - Game Duration: 5 minutes (300 seconds)
// - Max Players: 4

const entryFee = "0.1"; // IRYS
const gameDuration = 300; // seconds
const maxPlayers = 4;
```

### Крок 2: Валідація на фронтенді
```javascript
function validateCreateRoomInput(entryFee, gameDuration, maxPlayers) {
    // Перевірка entry fee
    if (parseFloat(entryFee) < 0.01 || parseFloat(entryFee) > 10) {
        throw new Error('Entry fee must be between 0.01 and 10 IRYS');
    }
    
    // Перевірка тривалості гри
    if (gameDuration < 60 || gameDuration > 1800) {
        throw new Error('Game duration must be between 1 and 30 minutes');
    }
    
    // Перевірка кількості гравців
    if (maxPlayers < 2 || maxPlayers > 10) {
        throw new Error('Max players must be between 2 and 10');
    }
    
    return true;
}
```

### Крок 3: Підготовка транзакції
```javascript
async function createPVPRoom(entryFee, gameDuration, maxPlayers) {
    try {
        // Валідація
        validateCreateRoomInput(entryFee, gameDuration, maxPlayers);
        
        // Конвертація entry fee в Wei
        const entryFeeWei = ethers.utils.parseEther(entryFee);
        
        // Показати індикатор завантаження
        showLoadingIndicator('Creating room...');
        
        // Виклик смарт-контракту
        const tx = await contract.createPVPRoom(
            entryFeeWei,
            gameDuration,
            maxPlayers,
            { 
                value: entryFeeWei, // Оплата entry fee
                gasLimit: 300000    // Встановити ліміт газу
            }
        );
        
        // Показати хеш транзакції
        showTransactionHash(tx.hash);
        
        // Чекати підтвердження
        const receipt = await tx.wait();
        
        // Обробити результат
        return handleRoomCreated(receipt);
        
    } catch (error) {
        hideLoadingIndicator();
        handleTransactionError(error, 'create room');
        throw error;
    }
}
```

### Крок 4: Обробка події створення кімнати
```javascript
function handleRoomCreated(receipt) {
    // Знайти подію RoomCreated
    const roomCreatedEvent = receipt.events.find(
        event => event.event === 'RoomCreated'
    );
    
    if (roomCreatedEvent) {
        const roomId = roomCreatedEvent.args.roomId.toNumber();
        const host = roomCreatedEvent.args.host;
        const entryFee = ethers.utils.formatEther(roomCreatedEvent.args.entryFee);
        const gameDuration = roomCreatedEvent.args.gameDuration.toNumber();
        const maxPlayers = roomCreatedEvent.args.maxPlayers.toNumber();
        
        // Зберегти поточну кімнату
        currentRoomId = roomId;
        isHost = true;
        
        // Оновити UI
        showSuccessMessage(`Room #${roomId} created successfully!`);
        switchToMyRoomTab();
        updateRoomInfo({
            roomId,
            host,
            entryFee,
            gameDuration,
            maxPlayers,
            currentPlayers: 1,
            state: 'WaitingForPlayers'
        });
        
        // Почати слухати події кімнати
        startListeningToRoomEvents(roomId);
        
        hideLoadingIndicator();
        return roomId;
    } else {
        throw new Error('Room creation event not found');
    }
}
```

## 🚪 Сценарій 2: Приєднання до кімнати

### Крок 1: Отримання списку доступних кімнат
```javascript
async function loadAvailableRooms() {
    try {
        showLoadingIndicator('Loading rooms...');
        
        // Отримати дані з контракту
        const roomsData = await contract.getJoinableRooms();
        
        // Розпакувати дані
        const rooms = roomsData.roomIds.map((roomId, index) => ({
            roomId: roomId.toNumber(),
            host: roomsData.hosts[index],
            entryFee: ethers.utils.formatEther(roomsData.entryFees[index]),
            gameDuration: roomsData.gameDurations[index].toNumber(),
            currentPlayers: roomsData.currentPlayers[index].toNumber(),
            maxPlayers: roomsData.maxPlayers[index].toNumber()
        }));
        
        // Відобразити кімнати
        displayRoomsList(rooms);
        hideLoadingIndicator();
        
        return rooms;
        
    } catch (error) {
        hideLoadingIndicator();
        showErrorMessage('Failed to load rooms');
        console.error('Error loading rooms:', error);
        return [];
    }
}
```

### Крок 2: Відображення кімнат
```javascript
function displayRoomsList(rooms) {
    const roomsList = document.getElementById('rooms-list');
    
    if (rooms.length === 0) {
        roomsList.innerHTML = `
            <div class="no-rooms">
                <p>No available rooms</p>
                <p>Create your own room to start playing!</p>
            </div>
        `;
        return;
    }
    
    roomsList.innerHTML = rooms.map(room => `
        <div class="room-card" data-room-id="${room.roomId}">
            <div class="room-header">
                <h3>Room #${room.roomId}</h3>
                <span class="room-status">Waiting for players</span>
            </div>
            
            <div class="room-info">
                <div class="info-item">
                    <span class="label">Host:</span>
                    <span class="value">${room.host.slice(0, 6)}...${room.host.slice(-4)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Entry Fee:</span>
                    <span class="value">${room.entryFee} IRYS</span>
                </div>
                <div class="info-item">
                    <span class="label">Duration:</span>
                    <span class="value">${Math.floor(room.gameDuration / 60)} min</span>
                </div>
                <div class="info-item">
                    <span class="label">Players:</span>
                    <span class="value">${room.currentPlayers}/${room.maxPlayers}</span>
                </div>
            </div>
            
            <div class="room-actions">
                <button class="join-room-btn" onclick="joinRoom(${room.roomId})">
                    Join Room (${room.entryFee} IRYS)
                </button>
            </div>
        </div>
    `).join('');
}
```

### Крок 3: Приєднання до кімнати
```javascript
async function joinRoom(roomId) {
    try {
        // Отримати інформацію про кімнату
        const roomInfo = await contract.getRoomInfo(roomId);
        const entryFee = roomInfo.entryFee;
        
        // Перевірити чи кімната доступна
        if (roomInfo.state !== 0) { // 0 = WaitingForPlayers
            throw new Error('Room is not available for joining');
        }
        
        if (roomInfo.currentPlayers >= roomInfo.maxPlayers) {
            throw new Error('Room is full');
        }
        
        // Показати підтвердження
        const confirmed = await showConfirmDialog(
            `Join room #${roomId}?`,
            `Entry fee: ${ethers.utils.formatEther(entryFee)} IRYS`
        );
        
        if (!confirmed) return;
        
        showLoadingIndicator('Joining room...');
        
        // Виклик смарт-контракту
        const tx = await contract.joinPVPRoom(roomId, {
            value: entryFee,
            gasLimit: 200000
        });
        
        showTransactionHash(tx.hash);
        
        // Чекати підтвердження
        const receipt = await tx.wait();
        
        // Обробити результат
        return handleRoomJoined(receipt, roomId);
        
    } catch (error) {
        hideLoadingIndicator();
        handleTransactionError(error, 'join room');
        throw error;
    }
}
```

### Крок 4: Обробка приєднання
```javascript
function handleRoomJoined(receipt, roomId) {
    // Знайти подію PlayerJoinedRoom
    const joinEvent = receipt.events.find(
        event => event.event === 'PlayerJoinedRoom'
    );
    
    if (joinEvent) {
        currentRoomId = roomId;
        isHost = false;
        
        // Оновити UI
        showSuccessMessage(`Successfully joined room #${roomId}!`);
        switchToMyRoomTab();
        
        // Завантажити інформацію про кімнату
        loadRoomInfo(roomId);
        
        // Почати слухати події кімнати
        startListeningToRoomEvents(roomId);
        
        hideLoadingIndicator();
        return true;
    } else {
        throw new Error('Join room event not found');
    }
}
```

## 🎮 Сценарій 3: Початок гри

### Крок 1: Хост запускає гру
```javascript
async function startGame(roomId) {
    try {
        // Перевірити чи користувач є хостом
        if (!isHost) {
            throw new Error('Only room host can start the game');
        }
        
        // Отримати інформацію про кімнату
        const roomInfo = await contract.getRoomInfo(roomId);
        
        // Перевірити чи є достатньо гравців
        if (roomInfo.currentPlayers < 2) {
            throw new Error('Need at least 2 players to start the game');
        }
        
        showLoadingIndicator('Starting game...');
        
        // Виклик смарт-контракту
        const tx = await contract.startGame(roomId, {
            gasLimit: 150000
        });
        
        showTransactionHash(tx.hash);
        
        // Чекати підтвердження
        const receipt = await tx.wait();
        
        // Обробити результат
        return handleGameStarted(receipt, roomId);
        
    } catch (error) {
        hideLoadingIndicator();
        handleTransactionError(error, 'start game');
        throw error;
    }
}
```

### Крок 2: Обробка початку гри
```javascript
function handleGameStarted(receipt, roomId) {
    // Знайти подію GameStarted
    const gameStartedEvent = receipt.events.find(
        event => event.event === 'GameStarted'
    );
    
    if (gameStartedEvent) {
        const startTime = gameStartedEvent.args.startTime.toNumber();
        
        // Перейти в ігровий режим
        switchToPVPGameMode(roomId);
        
        // Запустити таймер гри
        startPVPGameTimer(roomId, startTime);
        
        // Почати живе оновлення лідерборду
        startLiveLeaderboardUpdates(roomId);
        
        hideLoadingIndicator();
        showSuccessMessage('Game started! Good luck!');
        
        return true;
    } else {
        throw new Error('Game start event not found');
    }
}
```

## 📊 Сценарій 4: Подача результату

### Крок 1: Гравець завершує гру
```javascript
// Викликається коли гравець завершує гру
function onGameCompleted(score) {
    if (isPVPMode && currentRoomId) {
        submitScoreToPVPRoom(currentRoomId, score);
    } else {
        // Звичайна подача результату
        submitRegularScore(score);
    }
}
```

### Крок 2: Подача результату в PVP кімнату
```javascript
async function submitScoreToPVPRoom(roomId, score) {
    try {
        // Перевірити чи гра ще триває
        const roomInfo = await contract.getRoomInfo(roomId);
        if (roomInfo.state !== 1) { // 1 = InProgress
            throw new Error('Game is not in progress');
        }
        
        // Перевірити чи гравець вже подав результат
        const [playerScore, hasSubmitted] = await contract.getPlayerScoreInRoom(roomId, userWallet);
        if (hasSubmitted) {
            throw new Error('Score already submitted');
        }
        
        showLoadingIndicator('Submitting score...');
        
        // Виклик смарт-контракту
        const tx = await contract.submitScoreToRoom(roomId, score, {
            gasLimit: 150000
        });
        
        showTransactionHash(tx.hash);
        
        // Чекати підтвердження
        const receipt = await tx.wait();
        
        // Обробити результат
        return handleScoreSubmitted(receipt, roomId, score);
        
    } catch (error) {
        hideLoadingIndicator();
        handleTransactionError(error, 'submit score');
        throw error;
    }
}
```

### Крок 3: Обробка поданого результату
```javascript
function handleScoreSubmitted(receipt, roomId, score) {
    // Знайти подію ScoreSubmittedToRoom
    const scoreEvent = receipt.events.find(
        event => event.event === 'ScoreSubmittedToRoom'
    );
    
    if (scoreEvent) {
        // Оновити UI
        showSuccessMessage(`Score ${score} submitted successfully!`);
        
        // Оновити лідерборд
        updateLiveLeaderboard(roomId);
        
        // Показати статус очікування
        showWaitingForOthersMessage();
        
        hideLoadingIndicator();
        return true;
    } else {
        throw new Error('Score submission event not found');
    }
}
```

## 🏆 Сценарій 5: Завершення гри

### Крок 1: Автоматичне завершення по таймеру
```javascript
function startPVPGameTimer(roomId, startTime) {
    const gameTimer = setInterval(async () => {
        try {
            const remainingTime = await contract.getRemainingTime(roomId);
            const timeLeft = remainingTime.toNumber();
            
            // Оновити відображення таймера
            updateTimerDisplay(timeLeft);
            
            // Якщо час закінчився
            if (timeLeft === 0) {
                clearInterval(gameTimer);
                
                // Автоматично завершити гру
                await finishGame(roomId);
            }
            
        } catch (error) {
            console.error('Timer error:', error);
            clearInterval(gameTimer);
        }
    }, 1000);
    
    // Зберегти таймер для можливості зупинки
    gameTimers.set(roomId, gameTimer);
}
```

### Крок 2: Ручне завершення гри
```javascript
async function finishGame(roomId) {
    try {
        showLoadingIndicator('Finishing game...');
        
        // Виклик смарт-контракту
        const tx = await contract.finishGame(roomId, {
            gasLimit: 200000
        });
        
        showTransactionHash(tx.hash);
        
        // Чекати підтвердження
        const receipt = await tx.wait();
        
        // Обробити результат
        return handleGameFinished(receipt, roomId);
        
    } catch (error) {
        hideLoadingIndicator();
        handleTransactionError(error, 'finish game');
        throw error;
    }
}
```

### Крок 3: Обробка завершення гри
```javascript
function handleGameFinished(receipt, roomId) {
    // Знайти подію GameFinished
    const gameFinishedEvent = receipt.events.find(
        event => event.event === 'GameFinished'
    );
    
    if (gameFinishedEvent) {
        const winner = gameFinishedEvent.args.winner;
        const prizeAmount = ethers.utils.formatEther(gameFinishedEvent.args.prizeAmount);
        
        // Зупинити таймер
        stopGameTimer(roomId);
        
        // Показати результати
        showGameResults({
            roomId,
            winner,
            prizeAmount,
            isWinner: winner.toLowerCase() === userWallet.toLowerCase()
        });
        
        // Завантажити фінальний лідерборд
        loadFinalLeaderboard(roomId);
        
        hideLoadingIndicator();
        return true;
    } else {
        throw new Error('Game finish event not found');
    }
}
```

## 🔄 Живе оновлення даних

### Слухання подій контракту
```javascript
function startListeningToRoomEvents(roomId) {
    // Подія приєднання гравця
    contract.on('PlayerJoinedRoom', (eventRoomId, player) => {
        if (eventRoomId.toNumber() === roomId) {
            onPlayerJoined(roomId, player);
        }
    });
    
    // Подія початку гри
    contract.on('GameStarted', (eventRoomId, startTime) => {
        if (eventRoomId.toNumber() === roomId) {
            onGameStarted(roomId, startTime.toNumber());
        }
    });
    
    // Подія подання результату
    contract.on('ScoreSubmittedToRoom', (eventRoomId, player, score) => {
        if (eventRoomId.toNumber() === roomId) {
            onScoreSubmitted(roomId, player, score.toNumber());
        }
    });
    
    // Подія завершення гри
    contract.on('GameFinished', (eventRoomId, winner, prizeAmount) => {
        if (eventRoomId.toNumber() === roomId) {
            onGameFinished(roomId, winner, ethers.utils.formatEther(prizeAmount));
        }
    });
}
```

### Оновлення живого лідерборду
```javascript
function startLiveLeaderboardUpdates(roomId) {
    const updateInterval = setInterval(async () => {
        try {
            const leaderboard = await contract.getRoomLeaderboard(roomId);
            updateLiveLeaderboardDisplay(leaderboard);
        } catch (error) {
            console.error('Leaderboard update error:', error);
        }
    }, 3000); // Оновлювати кожні 3 секунди
    
    leaderboardUpdaters.set(roomId, updateInterval);
}
```

## ⚠️ Обробка помилок

### Типи помилок та їх обробка
```javascript
function handleTransactionError(error, action) {
    let userMessage = 'Transaction failed';
    let technicalMessage = error.message;
    
    // Аналіз типу помилки
    if (error.code === 4001 || error.message.includes('user rejected')) {
        userMessage = 'Transaction cancelled by user';
    } else if (error.message.includes('insufficient funds')) {
        userMessage = 'Insufficient IRYS tokens in wallet';
    } else if (error.message.includes('RoomNotFound')) {
        userMessage = 'Room not found';
    } else if (error.message.includes('GameNotInProgress')) {
        userMessage = 'Game is not in progress';
    } else if (error.message.includes('OnlyHost')) {
        userMessage = 'Only room host can perform this action';
    } else if (error.message.includes('RoomFull')) {
        userMessage = 'Room is full';
    } else if (error.message.includes('AlreadySubmitted')) {
        userMessage = 'Score already submitted';
    } else if (error.message.includes('InsufficientEntryFee')) {
        userMessage = 'Insufficient entry fee';
    }
    
    // Показати помилку користувачу
    showErrorMessage(userMessage);
    
    // Логувати технічну інформацію
    console.error(`Error during ${action}:`, {
        userMessage,
        technicalMessage,
        error
    });
}
```

## 📱 UI Helper функції

### Індикатори завантаження
```javascript
function showLoadingIndicator(message) {
    const loader = document.getElementById('loading-indicator');
    const loaderText = document.getElementById('loading-text');
    
    loaderText.textContent = message;
    loader.classList.remove('hidden');
}

function hideLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    loader.classList.add('hidden');
}

function showTransactionHash(hash) {
    const hashDisplay = document.getElementById('transaction-hash');
    hashDisplay.innerHTML = `
        <p>Transaction submitted:</p>
        <a href="https://testnet-explorer.irys.xyz/tx/${hash}" target="_blank">
            ${hash.slice(0, 10)}...${hash.slice(-8)}
        </a>
    `;
    hashDisplay.classList.remove('hidden');
}
```

### Повідомлення
```javascript
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

function showErrorMessage(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматично приховати через 5 секунд
    setTimeout(() => {
        notification.remove();
    }, 5000);
}
```

---

**Цей документ описує повний цикл взаємодії з PVP смарт-контрактом, включаючи всі можливі сценарії, обробку помилок та оновлення UI.**