# PVP Global Leaderboard Separation Fix

## 🎯 Проблема
PVP результати автоматично оновлювали глобальний лідерборд, що було неправильно. PVP і звичайна гра повинні мати окремі лідерборди.

## 🔍 Виявлена проблема

### В контракті:
```solidity
function submitGameResults(...) {
    // ...
    for (uint256 i = 0; i < _players.length; i++) {
        room.finalScores[_players[i]] = _scores[i];
        
        // ❌ ПРОБЛЕМА: Оновлювало глобальний лідерборд
        uint256 oldScore = players[_players[i]].highScore;
        if (_scores[i] > oldScore) {
            players[_players[i]].highScore = _scores[i]; // ← Це оновлювало глобальний лідерборд!
            players[_players[i]].gamesPlayed++;
            players[_players[i]].lastPlayed = block.timestamp;
            emit ScoreUpdated(_players[i], _scores[i], oldScore);
        }
    }
}
```

## ✅ Виправлення

### 1. Контракт (Smart Contract)

**Файли:** 
- `contracts/IrysCrushLeaderboardServerControlled.sol`
- `contracts/IrysCrushLeaderboardServerControlled_Fixed.sol`

**Зміни:**
```solidity
function submitGameResults(...) {
    // ...
    // ✅ ВИПРАВЛЕНО: Store PVP scores separately - DO NOT update global leaderboard
    for (uint256 i = 0; i < _players.length; i++) {
        room.finalScores[_players[i]] = _scores[i];
        
        // ВАЖЛИВО: PVP результати НЕ оновлюють глобальний лідерборд
        // Глобальний лідерборд тільки для звичайної гри (submitScore)
        // PVP має свій окремий лідерборд через finalScores
    }
}
```

### 2. Frontend захист (JavaScript)

**Файл:** `public/js/game-system.js`

**Зміни в autoSaveScore():**
```javascript
async function autoSaveScore() {
  // ВАЖЛИВО: Заборонити оновлення глобального лідерборду з PVP результатами
  if (window.isPVPMode || window.currentPVPGame) {
    console.log('🚫 autoSaveScore blocked - PVP mode active. PVP results should not update global leaderboard.');
    if (scoreStatusP) {
      scoreStatusP.textContent = '🎯 PVP result (not saved to global leaderboard)';
      scoreStatusP.style.color = '#ff9800';
    }
    return;
  }
  // ... решта коду
}
```

**Додано захист submitScore:**
```javascript
// Зберігаємо оригінальну функцію submitScore
let originalSubmitScore = null;

// Обгортаємо функцію submitScore
window.contract.submitScore = async function(score) {
  // Перевіряємо чи активний PVP режим
  if (window.isPVPMode || window.currentPVPGame) {
    console.warn('🚫 submitScore blocked - PVP mode active. PVP results should not update global leaderboard.');
    throw new Error('Cannot update global leaderboard from PVP game. PVP results are separate from global leaderboard.');
  }
  
  // Викликаємо оригінальну функцію
  return await originalSubmitScore.call(this, score);
};
```

## 🎮 Як тепер працює механізм

### Звичайна гра (Single Player):
1. **Гравець грає** звичайну гру
2. **Гра закінчується** → викликається `endGame()`
3. **Автоматичне збереження** → `autoSaveScore()` перевіряє чи результат кращий
4. **Якщо кращий** → користувач підтверджує збереження
5. **Виклик контракту** → `contract.submitScore(score)`
6. **Оновлення глобального лідерборду** → `players[user].highScore = score`

### PVP гра (Multiplayer):
1. **Гравці грають** PVP гру
2. **Гра закінчується** → результати відправляються на сервер
3. **Сервер обробляє** → `processGameResults()` в `server.js`
4. **Виклик контракту** → `contract.submitGameResults(roomId, players, scores, winner)`
5. **Збереження PVP результатів** → `room.finalScores[player] = score`
6. **Глобальний лідерборд НЕ оновлюється** ❌

### Два окремі лідерборди:

#### 🌍 Глобальний лідерборд:
- **Джерело:** `players[address].highScore`
- **Оновлюється:** Тільки через `submitScore()` (звичайна гра)
- **Доступ:** `getLeaderboard()`, `getPlayer()`
- **Призначення:** Найкращі результати в звичайній грі

#### 🏆 PVP лідерборд:
- **Джерело:** `pvpRooms[roomId].finalScores[address]`
- **Оновлюється:** Через `submitGameResults()` (PVP гра)
- **Доступ:** `getRoomFinalScore()`, `getRoomWinner()`
- **Призначення:** Результати конкретних PVP матчів

## 🛡️ Захист від помилок

### 1. Frontend захист:
- `autoSaveScore()` блокується в PVP режимі
- `contract.submitScore()` обгорнуто в перевірку PVP режиму
- Показується повідомлення "PVP result (not saved to global leaderboard)"

### 2. Contract захист:
- `submitGameResults()` більше не оновлює `players[].highScore`
- PVP результати зберігаються тільки в `room.finalScores[]`

### 3. Логічний поділ:
- **Звичайна гра:** Особистий рекорд → глобальний лідерборд
- **PVP гра:** Результат матчу → PVP лідерборд кімнати

## 📊 Приклад роботи

### Сценарій 1: Звичайна гра
```
Гравець А: звичайна гра → 2000 очок
↓
autoSaveScore() → contract.submitScore(2000)
↓
players[A].highScore = 2000 ✅
Глобальний лідерборд оновлено ✅
```

### Сценарій 2: PVP гра
```
Гравець А: PVP гра → 2500 очок (переміг)
Гравець Б: PVP гра → 2000 очок
↓
server.js → contract.submitGameResults([A, B], [2500, 2000], A)
↓
room.finalScores[A] = 2500 ✅
room.finalScores[B] = 2000 ✅
players[A].highScore = БЕЗ ЗМІН ❌
players[B].highScore = БЕЗ ЗМІН ❌
Глобальний лідерборд НЕ оновлено ✅
```

### Сценарій 3: Спроба обійти захист
```
Гравець А: PVP гра → намагається викликати submitScore()
↓
Frontend захист → Error: "Cannot update global leaderboard from PVP game"
↓
Глобальний лідерборд НЕ оновлено ✅
```

## 🚀 Результат

✅ **PVP результати більше НЕ оновлюють глобальний лідерборд**
✅ **Звичайна гра як і раніше оновлює глобальний лідерборд**
✅ **Два окремі лідерборди працюють незалежно**
✅ **Захист на рівні контракту та frontend**
✅ **Зворотна сумісність збережена**

Тепер PVP і звичайна гра мають повністю окремі системи лідербордів, як і повинно бути!