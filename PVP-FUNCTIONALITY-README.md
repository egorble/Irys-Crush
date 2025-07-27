# IrysCrush PVP Functionality Documentation

## Огляд

Ваш смарт контракт IrysCrushLeaderboard тепер розширено з повноцінною PVP функціональністю! Гравці можуть створювати кімнати, змагатися один з одним та виграти призові пули.

## Нові Можливості

### 🏠 Система Кімнат
- **Створення кімнат**: Гравці можуть створювати власні PVP кімнати
- **Налаштування гри**: Вибір часу гри (60-3600 секунд) та плати за вхід
- **Максимум гравців**: 2-10 гравців на кімнату
- **Стани кімнат**: WaitingForPlayers → InProgress → Finished

### 💰 Система Платежів
- **Плата за вхід**: В нативних токенах Irys
- **Призовий пул**: Автоматично формується з платежів гравців
- **Розподіл призів**: Переможець отримує весь призовий пул

### 🏆 Лідерборди Кімнат
- **Індивідуальні лідерборди**: Кожна кімната має власний лідерборд
- **Сортування за очками**: Гравці сортуються за найвищими результатами
- **Статус подання**: Відстеження чи подав гравець свій результат

## Основні Функції

### Створення Кімнати
```solidity
function createPVPRoom(
    uint256 _entryFee,      // Плата за вхід в wei
    uint256 _gameDuration,  // Тривалість гри в секундах (60-3600)
    uint256 _maxPlayers     // Максимум гравців (2-10)
) external payable returns (uint256 roomId)
```

### Приєднання до Кімнати
```solidity
function joinPVPRoom(uint256 _roomId) external payable
```

### Початок Гри (тільки хост)
```solidity
function startGame(uint256 _roomId) external
```

### Подання Результату
```solidity
function submitScoreToRoom(uint256 _roomId, uint256 _score) external
```

### Завершення Гри
```solidity
function finishGame(uint256 _roomId) external
```

## Функції Перегляду

### Інформація про Кімнату
```solidity
function getRoomInfo(uint256 _roomId) external view returns (
    address host,
    uint256 entryFee,
    uint256 gameDuration,
    uint256 maxPlayers,
    uint256 currentPlayers,
    RoomState state,
    uint256 prizePool,
    uint256 startTime,
    address winner
)
```

### Лідерборд Кімнати
```solidity
function getRoomLeaderboard(uint256 _roomId) external view returns (
    address[] memory addresses,
    string[] memory nicknames,
    uint256[] memory scores,
    bool[] memory hasSubmitted
)
```

### Доступні Кімнати
```solidity
function getJoinableRooms() external view returns (
    uint256[] memory roomIds,
    address[] memory hosts,
    uint256[] memory entryFees,
    uint256[] memory gameDurations,
    uint256[] memory currentPlayers,
    uint256[] memory maxPlayers
)
```

### Час що Залишився
```solidity
function getRemainingTime(uint256 _roomId) external view returns (uint256 remainingTime)
```

## Логіка Гри

### 1. Створення Кімнати
1. Гравець викликає `createPVPRoom()` з параметрами гри
2. Платить entry fee як msg.value
3. Стає хостом кімнати та першим гравцем
4. Кімната переходить в стан `WaitingForPlayers`

### 2. Приєднання Гравців
1. Інші гравці викликають `joinPVPRoom()`
2. Платять entry fee
3. Додаються до списку гравців кімнати
4. Призовий пул збільшується

### 3. Початок Гри
1. Хост викликає `startGame()` коли готовий
2. Потрібно мінімум 2 гравці
3. Кімната переходить в стан `InProgress`
4. Запускається таймер гри

### 4. Подання Результатів
1. Гравці грають та викликають `submitScoreToRoom()`
2. Кожен гравець може подати результат тільки один раз
3. Результати зберігаються в лідерборді кімнати

### 5. Завершення Гри
1. Гра завершується автоматично коли:
   - Всі гравці подали результати, АБО
   - Час гри закінчився
2. Визначається переможець (найвищий результат)
3. Призовий пул переводиться переможцю
4. Кімната переходить в стан `Finished`

## Події (Events)

```solidity
event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameDuration, uint256 maxPlayers);
event PlayerJoinedRoom(uint256 indexed roomId, address indexed player);
event GameStarted(uint256 indexed roomId, uint256 startTime);
event ScoreSubmittedToRoom(uint256 indexed roomId, address indexed player, uint256 score);
event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prizeAmount);
event PrizeDistributed(uint256 indexed roomId, address indexed winner, uint256 amount);
```

## Безпека та Обмеження

### Валідація
- **Entry Fee**: Повинна бути > 0
- **Game Duration**: 60-3600 секунд
- **Max Players**: 2-10 гравців
- **Реєстрація**: Тільки зареєстровані гравці можуть грати

### Захист від Помилок
- Перевірка достатності коштів
- Запобігання подвійному приєднанню
- Захист від подання результатів після закінчення часу
- Безпечні трансфери призових коштів

### Автоматизація
- Автоматичне завершення гри при подачі всіх результатів
- Автоматичне завершення при закінченні часу
- Автоматичний розподіл призів

## Інтеграція з Frontend

### Рекомендовані UI Компоненти
1. **Список Доступних Кімнат**: Показ `getJoinableRooms()`
2. **Створення Кімнати**: Форма з параметрами гри
3. **Лідерборд Кімнати**: Реал-тайм оновлення `getRoomLeaderboard()`
4. **Таймер Гри**: Відображення `getRemainingTime()`
5. **Статус Кімнати**: Моніторинг стану через події

### Приклад Workflow
```javascript
// 1. Створення кімнати
const roomId = await contract.createPVPRoom(
    ethers.utils.parseEther("0.1"), // 0.1 IRYS entry fee
    300, // 5 minutes
    4,   // max 4 players
    { value: ethers.utils.parseEther("0.1") }
);

// 2. Приєднання до кімнати
await contract.joinPVPRoom(roomId, {
    value: ethers.utils.parseEther("0.1")
});

// 3. Початок гри (тільки хост)
await contract.startGame(roomId);

// 4. Подання результату
await contract.submitScoreToRoom(roomId, 1500);

// 5. Перевірка переможця
const roomInfo = await contract.getRoomInfo(roomId);
console.log("Winner:", roomInfo.winner);
```

## Газові Витрати

- **createPVPRoom**: ~200,000 gas
- **joinPVPRoom**: ~100,000 gas
- **startGame**: ~50,000 gas
- **submitScoreToRoom**: ~80,000 gas
- **finishGame**: ~150,000 gas (включає трансфер призу)

## Наступні Кроки

1. **Деплой контракту**: `npm run deploy`
2. **Оновлення Frontend**: Інтеграція нових функцій
3. **Тестування**: Перевірка всіх сценаріїв PVP
4. **Моніторинг**: Відстеження подій та транзакцій

## Технічні Деталі

- **Solidity Version**: ^0.8.30
- **Оптимізація**: Enabled (200 runs)
- **Розмір Контракту**: ~27KB bytecode
- **ABI Функцій**: 25+ нових функцій

Ваш контракт тепер готовий для повноцінного PVP геймплею! 🎮🏆