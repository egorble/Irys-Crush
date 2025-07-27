# Server-Controlled PvP System

## Концепція
Замість того, щоб гравці самі подавали результати, сервер контролює весь процес:

### Поточний Flow (проблемний):
1. Гравці створюють кімнату
2. Гравці приєднуються 
3. Хост стартує гру
4. **Гравці самі подають результати** ❌
5. Контракт визначає переможця

### Новий Server-Controlled Flow:
1. Гравці створюють кімнату
2. Гравці приєднуються
3. Хост стартує гру
4. **Сервер зберігає результати локально** ✅
5. **Сервер визначає переможця** ✅
6. **Головний гаманець надсилає фінальні результати** ✅
7. **Контракт розподіляє призи та очищає кімнату** ✅

## Ключові зміни в контракті:

### 1. Нова функція для сервера
```solidity
function submitGameResults(
    uint256 _roomId,
    address[] memory _players,
    uint256[] memory _scores,
    address _winner
) external onlyGameServer
```

### 2. Модифікатор для головного гаманця
```solidity
address public gameServer; // Головний гаманець з .env
modifier onlyGameServer() {
    require(msg.sender == gameServer, "Only game server can call this");
    _;
}
```

### 3. Видалення індивідуальних функцій подання
- Видаляємо `submitPlayer1Score`, `submitPlayer2Score`, etc.
- Видаляємо `submitRoomScore`
- Залишаємо тільки серверну функцію

### 4. Спрощена структура даних
```solidity
struct PvPRoom {
    uint256 roomId;
    address host;
    uint256 entryFee;
    uint256 gameTime;
    address[] players;
    bool isActive;
    bool gameStarted;
    bool gameFinished; // Нове поле
    uint256 createdAt;
    uint256 maxPlayers;
    mapping(address => bool) hasJoined;
    address winner; // Переможець, встановлений сервером
}
```

## Переваги нового підходу:

1. **Немає race conditions** - тільки сервер подає результати
2. **Централізований контроль** - сервер має повну картину гри
3. **Простіша логіка** - один entry point для результатів
4. **Надійність** - головний гаманець гарантує коректність
5. **Автоматичне очищення** - сервер керує життєвим циклом кімнати

## Серверна логіка:

### 1. Збереження результатів
```javascript
// В пам'яті сервера
const gameResults = {
    roomId: 123,
    players: [
        { address: '0x...', score: 1500, nickname: 'Player1' },
        { address: '0x...', score: 1200, nickname: 'Player2' }
    ],
    winner: '0x...', // Адреса переможця
    finished: true
}
```

### 2. Визначення переможця
```javascript
function determineWinner(gameResults) {
    return gameResults.players
        .sort((a, b) => b.score - a.score)[0]; // Найвищий рахунок
}
```

### 3. Надсилання на блокчейн
```javascript
await contract.submitGameResults(
    roomId,
    players.map(p => p.address),
    players.map(p => p.score),
    winner.address
);
```