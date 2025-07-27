// IrysCrush Game System
// Handles all game logic, board generation, and game mechanics

// --- Game Constants ---
const GRID_SIZE = 8;
const ICONS = [
  { name: 'apple', src: 'images/apple.png' },
  { name: 'bread', src: 'images/bread.png' },
  { name: 'lemon', src: 'images/lemon.png' },
  { name: 'cookie', src: 'images/cookie.png' }
];
const BOMB_ICON = { name: 'bomb', src: 'images/bomb.png' };
const GAME_TIME = 60;

// --- Game State ---
let board = [];
let score = 0;
let timer = GAME_TIME;
let timerInterval = null;
let selectedCell = null;
let isAnimating = false;
let gameActive = false;

// --- DOM Elements ---
let mainMenu, gameUI, gameBoard, scoreSpan, timerSpan;
let gameOverModal, finalScoreSpan, scoreStatusP;
// settingsModal and leaderboardModal declared in main.js

// Global timer cleanup function
function clearAllTimers() {
    // Clear main game timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log('🧹 Main game timer cleared');
    }
    
    // Clear PVP timer if exists
    if (window.pvpTimerInterval) {
        clearInterval(window.pvpTimerInterval);
        window.pvpTimerInterval = null;
        console.log('🧹 PVP timer cleared');
    }
    
    // Clear any other potential timers
    if (window.currentPVPGame && window.currentPVPGame.timerInterval) {
        clearInterval(window.currentPVPGame.timerInterval);
        window.currentPVPGame.timerInterval = null;
        console.log('🧹 Current PVP game timer cleared');
    }
}

// Call cleanup on page load
window.addEventListener('load', () => {
    clearAllTimers();
    console.log('🧹 Page loaded, all timers cleared');
});

// Call cleanup before page unload
window.addEventListener('beforeunload', () => {
    clearAllTimers();
});

// Initialize game elements
function initializeGameElements() {
  mainMenu = document.getElementById('main-menu');
  gameUI = document.getElementById('game-ui');
  gameBoard = document.getElementById('game-board');
  scoreSpan = document.getElementById('score');
  timerSpan = document.getElementById('timer');
  gameOverModal = document.getElementById('game-over-modal');
  finalScoreSpan = document.getElementById('final-score');
  scoreStatusP = document.getElementById('score-status');
  // leaderboardModal and settingsModal are declared in main.js
}

// --- Game Functions ---
function startGame() {
  if (!checkWalletConnection()) return;
  
  // Закриваємо всі модальні вікна
  gameOverModal.classList.add('hidden');
  const leaderboardModal = document.getElementById('leaderboard-modal');
    const settingsModal = document.getElementById('settings-modal');
    leaderboardModal.classList.add('hidden');
    settingsModal.classList.add('hidden');
  
  mainMenu.classList.add('hidden');
  gameUI.classList.remove('hidden');
  
  // Скидаємо гру
  score = 0;
  scoreSpan.textContent = score;
  timer = GAME_TIME;
  gameActive = true;
  
  generateBoard();
  renderBoard();
  startTimer();
}

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
      // Only end game if not in PVP mode
      if (!window.isPVPMode && !window.currentPVPGame) {
        endGame();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    console.log('🛑 Main game timer stopped');
  }
  timerInterval = null;
}

async function endGame() {
  // Prevent ending game if in PVP mode
  if (window.isPVPMode || window.currentPVPGame) {
    console.log('🚫 Main game endGame() blocked - PVP mode active');
    return;
  }
  
  gameActive = false;
  finalScoreSpan.textContent = score;
  
  // Save best score locally for tasks system
  saveUserBestScore(score);
  
  // Автоматично зберігаємо результат
  await autoSaveScore();
  
  gameOverModal.classList.remove('hidden');
}

// --- Board Generation ---
function generateBoard() {
  board = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(randomIcon());
    }
    board.push(row);
  }
  // Гарантуємо, що немає стартових матчів
  while (findMatches().length > 0) {
    for (let match of findMatches()) {
      for (let { r, c } of match) {
        board[r][c] = randomIcon();
      }
    }
  }
}

function randomIcon() {
  const idx = Math.floor(Math.random() * ICONS.length);
  return { ...ICONS[idx] };
}

// --- Board Rendering ---
function renderBoard() {
  gameBoard.innerHTML = '';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let cell = document.createElement('div');
      if (!board[r][c]) {
        cell.className = 'cell cell-empty';
      } else {
        cell.className = 'cell' + (board[r][c].name === 'bomb' ? ' bomb' : '');
        const img = document.createElement('img');
        img.src = board[r][c].src;
        img.alt = board[r][c].name;
        cell.appendChild(img);
        cell.onclick = () => onCellClick(r, c);
      }
      cell.dataset.r = r;
      cell.dataset.c = c;
      gameBoard.appendChild(cell);
    }
  }
}

// --- Cell Interaction ---
function onCellClick(r, c) {
  if (!gameActive || isAnimating) return;
  const cell = board[r][c];
  if (cell.name === 'bomb') {
    activateBomb(r, c);
    return;
  }
  if (!selectedCell) {
    selectedCell = { r, c };
    highlightCell(r, c);
  } else {
    if (isNeighbor(selectedCell, { r, c })) {
      // Перевіряємо, чи буде матч після свапу
      swapCells(selectedCell, { r, c });
      const willMatch = findMatches().length > 0;
      swapCells(selectedCell, { r, c }); // повертаємо назад
      if (willMatch) {
        swapCells(selectedCell, { r, c }); // міняємо реально
        animateSwap(selectedCell, { r, c }, true);
      } else {
        animateSwap(selectedCell, { r, c }, false); // лише анімація, без зміни board
      }
      unhighlightAll();
      selectedCell = null;
    } else {
      unhighlightAll();
      selectedCell = { r, c };
      highlightCell(r, c);
    }
  }
}

function highlightCell(r, c) {
  unhighlightAll();
  const idx = r * GRID_SIZE + c;
  gameBoard.children[idx].style.boxShadow = '0 0 0 4px #ffb347';
}

function unhighlightAll() {
  for (let el of gameBoard.children) el.style.boxShadow = '';
}

function isNeighbor(a, b) {
  return (
    (Math.abs(a.r - b.r) === 1 && a.c === b.c) ||
    (Math.abs(a.c - b.c) === 1 && a.r === b.r)
  );
}

function swapCells(a, b) {
  const tmp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = tmp;
}

// --- Iryspect Text Display ---
function showIryspectText() {
  // Створюємо елемент надпису
  const iryspectText = document.createElement('div');
  iryspectText.textContent = 'IRYSPECT!';
  iryspectText.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 
      2px 2px 0px #ff8a00,
      4px 4px 15px rgba(0, 0, 0, 0.8);
    z-index: 2000;
    pointer-events: none;
    background: linear-gradient(135deg, #ffd700, #ff8a00, #ffd700);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: iryspectShine 0.5s ease-in-out;
  `;
  
  document.body.appendChild(iryspectText);
  
  // Анімація появи та зникнення
  gsap.fromTo(iryspectText, 
    { 
      scale: 0,
      rotation: -180,
      opacity: 0
    },
    { 
      scale: 1.2,
      rotation: 0,
      opacity: 1,
      duration: 0.6,
      ease: "back.out(1.7)",
      onComplete: () => {
        // Затримка перед зникненням
        setTimeout(() => {
          gsap.to(iryspectText, {
            scale: 0,
            opacity: 0,
            y: -100,
            duration: 0.3,
            ease: "back.in(1.7)",
            onComplete: () => {
              document.body.removeChild(iryspectText);
            }
          });
        }, 500);
      }
    }
  );
}

// --- Swap Animation ---
function animateSwap(a, b, valid) {
  isAnimating = true;
  const idxA = a.r * GRID_SIZE + a.c;
  const idxB = b.r * GRID_SIZE + b.c;
  const elA = gameBoard.children[idxA];
  const elB = gameBoard.children[idxB];
  const dx = (b.c - a.c) * elA.offsetWidth;
  const dy = (b.r - a.r) * elA.offsetHeight;
  gsap.to(elA, { x: dx, y: dy, duration: 0.25 });
  gsap.to(elB, { x: -dx, y: -dy, duration: 0.25, onComplete: () => {
    if (valid) {
      gsap.set([elA, elB], { x: 0, y: 0 });
      processMatches();
    } else {
      // Анімація повернення назад
      gsap.to(elA, { x: 0, y: 0, duration: 0.25 });
      gsap.to(elB, { x: 0, y: 0, duration: 0.25, onComplete: () => {
        isAnimating = false;
        renderBoard();
      }});
    }
  }});
}

// --- Match Finding ---
function findMatches() {
  const matches = [];
  // Горизонтальні
  for (let r = 0; r < GRID_SIZE; r++) {
    let streak = 1;
    for (let c = 1; c < GRID_SIZE; c++) {
      if (board[r][c].name === board[r][c-1].name && board[r][c].name !== 'bomb') {
        streak++;
      } else {
        if (streak >= 3) {
          const match = [];
          for (let k = 0; k < streak; k++) match.push({ r, c: c-1-k });
          matches.push(match);
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      const match = [];
      for (let k = 0; k < streak; k++) match.push({ r, c: GRID_SIZE-1-k });
      matches.push(match);
    }
  }
  // Вертикальні
  for (let c = 0; c < GRID_SIZE; c++) {
    let streak = 1;
    for (let r = 1; r < GRID_SIZE; r++) {
      if (board[r][c].name === board[r-1][c].name && board[r][c].name !== 'bomb') {
        streak++;
      } else {
        if (streak >= 3) {
          const match = [];
          for (let k = 0; k < streak; k++) match.push({ r: r-1-k, c });
          matches.push(match);
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      const match = [];
      for (let k = 0; k < streak; k++) match.push({ r: GRID_SIZE-1-k, c });
      matches.push(match);
    }
  }
  return matches;
}

// --- Match Processing ---
function processMatches() {
  isAnimating = true;
  let matches = findMatches();
  if (matches.length === 0) {
    isAnimating = false;
    renderBoard();
    return;
  }
  
  // Бомба за 5+
  let bombToSet = [];
  let hasIryspect = false;
  for (let match of matches) {
    if (match.length >= 5) {
      const center = match[Math.floor(match.length / 2)];
      bombToSet.push(center);
      hasIryspect = true;
    }
  }
  
  // Показуємо надпис "Iryspect" при 5+ елементах
  if (hasIryspect) {
    showIryspectText();
  }
  // Анімація зникнення
  let toRemove = new Set();
  for (let match of matches) {
    for (let pos of match) toRemove.add(pos.r + ',' + pos.c);
    score += match.length * 10;
  }
  // Не видаляємо клітинку для бомби
  for (let bomb of bombToSet) {
    toRemove.delete(bomb.r + ',' + bomb.c);
  }
  scoreSpan.textContent = score;
  
  // Оновлюємо відображення перед анімацією зникнення
  renderBoard();
  
  for (let key of toRemove) {
    const [r, c] = key.split(',').map(Number);
    const idx = r * GRID_SIZE + c;
    const el = gameBoard.children[idx];
    if (el) gsap.to(el.querySelector('img'), { scale: 0, duration: 0.3 });
  }
  setTimeout(() => {
    for (let key of toRemove) {
      const [r, c] = key.split(',').map(Number);
      board[r][c] = null;
    }
    // Ставимо бомби після зникнення
    for (let bomb of bombToSet) {
      board[bomb.r][bomb.c] = { ...BOMB_ICON };
    }
    dropCells();
  }, 350);
}

// --- Cell Dropping and Filling ---
function dropCells() {
  let moved = [];
  // Для кожного стовпця знизу вгору
  for (let c = 0; c < GRID_SIZE; c++) {
    let pointer = GRID_SIZE - 1;
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (board[r][c]) {
        if (pointer !== r) {
          moved.push({from: {r, c}, to: {r: pointer, c}});
          board[pointer][c] = board[r][c];
          board[r][c] = null;
        }
        pointer--;
      }
    }
    // Заповнюємо верхні порожні новими
    for (let r = pointer; r >= 0; r--) {
      board[r][c] = randomIcon();
      moved.push({from: {r: -1, c}, to: {r, c}});
    }
  }
  animateDrop(moved);
}

// --- Drop Animation ---
function animateDrop(moved) {
  renderBoard();
  for (let move of moved) {
    const idx = move.to.r * GRID_SIZE + move.to.c;
    const el = gameBoard.children[idx];
    const img = el.querySelector('img');
    if (!img) continue;
    let fromY = (move.from.r === -1)
      ? -80
      : (move.from.r - move.to.r) * 66;
    gsap.fromTo(img, { y: fromY }, { y: 0, duration: 0.35, delay: move.to.r * 0.03, ease: "bounce.out" });
  }
  setTimeout(() => {
    if (findMatches().length > 0) {
      processMatches();
    } else {
      // Перевіряємо, чи ще є порожні клітинки
      let empty = false;
      for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = 0; r < GRID_SIZE; r++) {
          if (!board[r][c]) empty = true;
        }
      }
      if (empty) {
        dropCells();
      } else {
        isAnimating = false;
        renderBoard();
      }
    }
  }, 400);
}

// --- Bomb Activation ---
function activateBomb(r, c) {
  if (!gameActive || isAnimating) return;
  isAnimating = true;
  const cellsToRemove = [];
  
  // По квадрату: всі 8 сусідніх клітинок
  const dirs = [
    { dr: -1, dc: -1 }, // верхній лівий
    { dr: -1, dc: 0 },  // верх
    { dr: -1, dc: 1 },  // верхній правий
    { dr: 0, dc: -1 },  // ліво
    { dr: 0, dc: 1 },   // право
    { dr: 1, dc: -1 },  // нижній лівий
    { dr: 1, dc: 0 },   // низ
    { dr: 1, dc: 1 }    // нижній правий
  ];
  
  for (let dir of dirs) {
    const nr = r + dir.dr, nc = c + dir.dc;
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      cellsToRemove.push({ r: nr, c: nc, dir });
    }
  }
  
  // Анімація вибуху бомби
  const idx = r * GRID_SIZE + c;
  const el = gameBoard.children[idx];
  const img = el ? el.querySelector('img') : null;
  
  gsap.to(img, {
    scale: 1.7,
    rotation: 360,
    filter: 'drop-shadow(0 0 32px red) drop-shadow(0 0 64px darkred)',
    duration: 0.3,
    yoyo: true,
    repeat: 1,
    onComplete: () => {
      gsap.to(img, { scale: 0, duration: 0.2, filter: 'none' });
      // Хвільова анімація для сусідніх
      for (let cell of cellsToRemove) {
        const i = cell.r * GRID_SIZE + cell.c;
        const e = gameBoard.children[i];
        const img2 = e ? e.querySelector('img') : null;
        if (img2) {
          let dx = 0, dy = 0;
          if (cell.dir.dr !== 0) dy = cell.dir.dr * 40;
          if (cell.dir.dc !== 0) dx = cell.dir.dc * 40;
          gsap.to(img2, {
            x: dx,
            y: dy,
            scale: 1.2,
            filter: 'drop-shadow(0 0 16px red)',
            duration: 0.18,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              gsap.to(img2, { x: 0, y: 0, scale: 0, filter: 'none', duration: 0.18 });
            }
          });
        }
        if (board[cell.r][cell.c]) score += 10;
        board[cell.r][cell.c] = null;
      }
      board[r][c] = null;
      scoreSpan.textContent = score;
      setTimeout(() => {
        dropCells();
      }, 400);
    }
  });
}

// --- Local Storage Functions ---
// Get user's best score synchronously from localStorage only
function getUserBestScoreLocal() {
  const savedScore = localStorage.getItem('match3_best_score');
  return savedScore ? parseInt(savedScore) : 0;
}

// Save user's best score to localStorage
function saveUserBestScore(score) {
  const currentBest = getUserBestScoreLocal();
  if (score > currentBest) {
    localStorage.setItem('match3_best_score', score.toString());
    // Saved new best score to localStorage
    return true;
  }
  return false;
}

// --- Automatically save best score to blockchain ---
async function autoSaveScore() {
  // Get scoreStatusP from main.js context
  const scoreStatusP = document.getElementById('score-status');
  
  if (!window.userWallet || !window.userNickname || !window.contract) {
    if (scoreStatusP) {
      scoreStatusP.textContent = '❌ Connect wallet!';
      scoreStatusP.style.color = '#f44336';
    }
    return;
  }

  try {
    // Saving result for user
    
    // Get current player data from blockchain
    const [nickname, currentHighScore, gamesPlayed, lastPlayed] = await window.contract.getPlayer(window.userWallet);
    const currentScore = parseInt(currentHighScore.toString());
      
    if (score <= currentScore) {
      // Score is not better
      if (scoreStatusP) {
        scoreStatusP.textContent = `Your best result: ${currentScore}`;
        scoreStatusP.style.color = '#ffd700';
      }
      // Result not better than current score
      return;
    }
    
    // Score is better - ask user to save to blockchain
    const saveToBlockchain = confirm(`🏆 New record! ${currentScore} → ${score}\n\nSave to blockchain? This will require a transaction.`);
    
    if (!saveToBlockchain) {
      if (scoreStatusP) {
        scoreStatusP.textContent = `New record: ${score} (not saved)`;
        scoreStatusP.style.color = '#ffd700';
      }
      return;
    }
    
    if (scoreStatusP) {
      scoreStatusP.textContent = '⏳ Saving to blockchain...';
      scoreStatusP.style.color = '#2196F3';
    }
    
    // Submit score to blockchain
    // Sending transaction to submit score
    const tx = await window.contract.submitScore(score);
    
    // Waiting for transaction confirmation
    const receipt = await tx.wait();
    
    // Transaction confirmed
    
    if (scoreStatusP) {
      scoreStatusP.textContent = `🏆 New record saved! Previous: ${currentScore}`;
      scoreStatusP.style.color = '#4CAF50';
    }
    // Score updated
    
  } catch (error) {
    console.error('❌ Save result error:', error);
    
    if (scoreStatusP) {
      if (error.code === 4001) {
        // User rejected transaction
        scoreStatusP.textContent = '❌ Transaction rejected';
        scoreStatusP.style.color = '#f44336';
      } else if (error.reason && error.reason.includes('ScoreNotBetter')) {
        scoreStatusP.textContent = '❌ Score not better than current record';
        scoreStatusP.style.color = '#f44336';
      } else {
        scoreStatusP.textContent = '❌ Save error';
        scoreStatusP.style.color = '#f44336';
      }
    }
  }
}

// --- Initialize Game System ---
function initializeGameSystem() {
  initializeGameElements();
  // Game system initialized
}

// --- Export Functions ---
window.startGame = startGame;
window.stopTimer = stopTimer;
window.initializeGameSystem = initializeGameSystem;
window.getUserBestScoreLocal = getUserBestScoreLocal;
window.saveUserBestScore = saveUserBestScore;
window.autoSaveScore = autoSaveScore;

// Export game state for external access
window.getGameScore = () => score;
window.isGameActive = () => gameActive;
window.getGameTimer = () => timer;

// Game system loaded