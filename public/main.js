// --- Константи ---
// SETTINGS_KEY moved to js/settings-system.js

// --- Ігрові константи та стан перенесені до js/game-system.js ---

// settings object moved to js/settings-system.js

// --- Blockchain Configuration ---
const IRYS_TESTNET_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
const IRYS_TESTNET_CHAIN_ID = 1270;
const CONTRACT_ABI = [
  // Read functions
  "function getPlayer(address _player) view returns (string memory nickname, uint256 highScore, uint256 gamesPlayed, uint256 lastPlayed)",
  "function getLeaderboard(uint256 _limit) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores)",
  "function isPlayerRegistered(address _player) view returns (bool)",
  "function isNicknameAvailable(string memory _nickname) view returns (bool)",
  "function getTotalPlayers() view returns (uint256)",
  
  // Write functions
  "function registerPlayer(string memory _nickname)",
  "function changeNickname(string memory _newNickname)", 
  "function submitScore(uint256 _score)",
  
  // PVP Write functions
  "function createPvPRoom(uint256 _entryFee, uint256 _gameTime, uint256 _maxPlayers)",
  "function joinPvPRoom(uint256 _roomId) payable",
  "function startPvPGame(uint256 _roomId)",
  "function finishPvPGame(uint256 _roomId, address _winner)",
  "function leavePvPRoom(uint256 _roomId)",
  "function cancelPvPRoom(uint256 _roomId)",
  "function submitRoomScore(uint256 _roomId, uint256 _score)",
  
  // PVP Read functions
  "function getPvPRoom(uint256 _roomId) view returns (address host, uint256 entryFee, uint256 gameTime, address[] roomPlayers, bool isActive, bool gameStarted, uint256 maxPlayers)",
  "function getActiveRooms() view returns (uint256[])",
  "function getActiveRoomsCount() view returns (uint256)",
  "function isRoomActive(uint256 _roomId) view returns (bool)",
  "function nextRoomId() view returns (uint256)",
  "function playerCurrentRoom(address) view returns (uint256)",
  
  // Server-Controlled PVP functions
  "function submitGameResults(uint256 _roomId, address[] memory _players, uint256[] memory _scores, address _winner)",
  "function isGameFinished(uint256 _roomId) view returns (bool)",
  "function getRoomWinner(uint256 _roomId) view returns (address)",
  "function getRoomFinalScore(uint256 _roomId, address _player) view returns (uint256)",
  
  // Utility functions
  "function cleanupInactiveRooms()",
  
  // Owner/Server functions
  "function setGameServer(address _newGameServer)",
  "function gameServer() view returns (address)",
  "function owner() view returns (address)",
  
  // Events
  "event PlayerRegistered(address indexed player, string nickname)",
  "event NicknameChanged(address indexed player, string oldNickname, string newNickname)",
  "event ScoreUpdated(address indexed player, uint256 newScore, uint256 oldScore)",
  
  // PVP Events
  "event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameTime)",
  "event PlayerJoinedRoom(uint256 indexed roomId, address indexed player)",
  "event GameStarted(uint256 indexed roomId, address indexed host)",
  "event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prize)",
  "event PvPGameFinished(uint256 indexed roomId, address indexed winner)"
];

// --- Web3 Variables ---
let provider = null;
let signer = null;
let contract = null;
let userWallet = null;
let userNickname = null;
let contractAddress = null;
let isConnecting = false; // Захист від повторних викликів

// Export Web3 variables for other modules
window.userWallet = null;
window.userNickname = null;
window.contract = null;
window.signer = null;

// --- DOM ---
const playBtn = document.getElementById('play-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
// settingsBtn moved to js/settings-system.js
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardList = document.getElementById('leaderboard-list');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
// Settings DOM elements moved to js/settings-system.js

const restartBtn = document.getElementById('restart-btn');
const goMenuBtn = document.getElementById('go-menu');

// --- Ігрові DOM елементи перенесені до js/game-system.js ---

const connectWalletBtn = document.getElementById('connect-wallet-btn');
const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
const walletInfoDiv = document.getElementById('wallet-info');

const developersBtn = document.getElementById('developers-btn');
const developersModal = document.getElementById('developers-modal');
const closeDevelopersBtn = document.getElementById('close-developers');

// --- DOM елементи та змінні завдань перенесені до js/reward-system.js ---

// Debug: Check if elements exist
// Debug - Elements check

// --- Всі функції оголошені вище ---

// --- Призначення обробників подій ---
playBtn.onclick = function() {
  if (typeof startGame === 'function') {
    startGame();
  } else {
    console.error('startGame function not found - game-system.js may not be loaded');
  }
};
leaderboardBtn.onclick = function() {
  if (typeof showLeaderboard === 'function') {
    showLeaderboard();
  } else {
    console.error('showLeaderboard function not found - leaderboard-system.js may not be loaded');
  }
};

// PVP button event handler
const pvpBtn = document.getElementById('pvp-btn');
if (pvpBtn) {
  pvpBtn.onclick = function() {
    if (typeof showPVPModal === 'function') {
      showPVPModal();
    } else {
      console.error('showPVPModal function not found - pvp-system.js may not be loaded');
    }
  };
}
// settingsBtn event handler moved to js/settings-system.js
developersBtn.onclick = function() {
  if (typeof showDevelopers === 'function') {
    // Developers button clicked
    showDevelopers();
  } else {
    console.error('showDevelopers function not found - developers-system.js may not be loaded');
  }
};
// closeLeaderboardBtn обробляється в leaderboard-system.js
// Settings event handlers moved to js/settings-system.js
// closeDevelopersBtn обробляється в developers-system.js

// --- Ігрові обробники подій перенесені до js/game-system.js ---
restartBtn.onclick = function() {
  if (typeof startGame === 'function') {
    startGame();
  } else {
    console.error('startGame function not found - game-system.js may not be loaded');
  }
};
goMenuBtn.onclick = toMenu;

// Add event handler for back-menu (Exit) button
const backMenuBtn = document.getElementById('back-menu');
if (backMenuBtn) {
  backMenuBtn.onclick = toMenu;
}

connectWalletBtn.onclick = function() {
  connectToIrys();
};

disconnectWalletBtn.onclick = function() {
  disconnectWallet();
};

// --- Обробники подій для кнопок винагород перенесені до js/reward-system.js ---

// --- Debug функції винагород перенесені до js/reward-system.js ---

document.addEventListener('DOMContentLoaded', () => {
  // DOM Content Loaded
  
  // Initialize game system
  if (typeof initializeGameSystem === 'function') {
    initializeGameSystem();
  }
  
  // Initialize reward system
  if (typeof initializeRewardSystem === 'function') {
    initializeRewardSystem();
  }
  
  // Initialize leaderboard system
  if (typeof initializeLeaderboardSystem === 'function') {
    initializeLeaderboardSystem();
  }
  
  // Initialize developers system
  if (typeof initializeDevelopersSystem === 'function') {
    initializeDevelopersSystem();
  }
  
  // Initialize settings system
  if (typeof initializeSettingsSystem === 'function') {
    initializeSettingsSystem();
  }
  
  // Initialize PVP system
  if (typeof initializePVPSystem === 'function') {
    initializePVPSystem();
  }
  
  // Developers event handling moved to developers-system.js
  
  // Load settings moved to settings-system.js
  if (typeof loadSettings === 'function') {
    loadSettings();
  }
  toMenu();
});

// loadSettings function moved to js/settings-system.js

// saveSettings function moved to js/settings-system.js

// showSettings function moved to js/settings-system.js

// --- Функції розробників перенесені до js/developers-system.js ---

function toMenu() {
  // Використовуємо функції з game-system.js для керування ігровим UI
  const mainMenu = document.getElementById('main-menu');
  const gameUI = document.getElementById('game-ui');
  const gameOverModal = document.getElementById('game-over-modal');
  const developersModal = document.getElementById('developers-modal');
  const pvpModal = document.getElementById('pvp-modal');
  
  gameUI.classList.add('hidden');
  mainMenu.classList.add('active');
  mainMenu.classList.remove('hidden');
  leaderboardModal.classList.add('hidden');
  // Use function from settings-system.js to hide settings modal
  if (typeof window.hideSettingsModal === 'function') {
    window.hideSettingsModal();
  }
  // Використовуємо функцію з developers-system.js для закриття модального вікна
  if (typeof window.hideDevelopersModal === 'function') {
    window.hideDevelopersModal();
  } else {
    developersModal.classList.add('hidden');
  }
  // Hide PVP modal
  if (pvpModal) {
    pvpModal.classList.add('hidden');
  }
  gameOverModal.classList.add('hidden');
  
  // Використовуємо функцію з game-system.js для зупинки таймера
  if (typeof stopTimer === 'function') {
    stopTimer();
  }
}

// --- Функції лідерборда перенесені до js/leaderboard-system.js ---

// --- Перевірка підключення гаманця ---
function checkWalletConnection() {
  if (!userWallet) {
    alert('Connect Irys wallet first!');
    return false;
  }
  return true;
}

// --- Ігрові функції перенесені до js/game-system.js ---

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================

// Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default: // info
            notification.style.backgroundColor = '#2196F3';
    }
    
    document.body.appendChild(notification);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Allow manual close on click
    notification.onclick = () => {
        if (notification.parentNode) {
            notification.remove();
        }
    };
}

// Export showNotification globally
window.showNotification = showNotification;

// Export functions for use in other modules
window.updateWalletDisplay = updateWalletDisplay;
window.checkWalletConnection = checkWalletConnection;

// Global timer management
window.activeTimers = {};
window.clearAllTimers = function() {
    console.log('🧹 Clearing all active timers...');
    let clearedCount = 0;
    
    for (const [timerId, timerData] of Object.entries(window.activeTimers)) {
        if (timerData.interval) {
            clearInterval(timerData.interval);
            clearedCount++;
            console.log('🛑 Cleared timer:', timerId, 'for room:', timerData.roomId);
        }
    }
    
    window.activeTimers = {};
    console.log(`✅ Cleared ${clearedCount} active timers`);
};

// Оновлені глобальні змінні для wallet

// Функція для перевірки існуючого нікнейму
async function checkExistingNickname(wallet) {
    try {
        // Checking existing nickname for wallet
        const response = await fetch(`/wallet/${wallet}`);
        // Server response check
        
        if (response.ok) {
            const data = await response.json();
            // Existing nickname found
            return data.nickname;
        } else if (response.status === 404) {
            // Nickname not found - this is a new wallet
            return null;
        } else {
            console.error('❌ Server error:', response.status);
            return null;
        }
    } catch (error) {
        console.error('❌ Connection error:', error);
        return null;
    }
}

// Connect to Irys blockchain via MetaMask
async function connectToIrys() {
    // Захист від повторних викликів
    if (isConnecting) {
        // Connection already in progress
        return;
    }
    
    // Якщо вже підключено, показуємо інформацію
    if (userWallet && userNickname && contract) {
        // Already connected
        updateWalletDisplay();
        return;
    }
    
    isConnecting = true;
    connectWalletBtn.disabled = true;
    connectWalletBtn.textContent = 'Connecting...';
    
    try {
        // Starting wallet connection
        
        // Check MetaMask availability
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask not installed! Please install MetaMask.');
            return;
        }

        // Check ethers library availability
        let ethersLib = null;
        if (typeof window.ethers !== 'undefined') {
            ethersLib = window.ethers;
        } else if (typeof ethers !== 'undefined') {
            ethersLib = ethers;
            window.ethers = ethers;
        }
        
        if (!ethersLib) {
            alert('Ethers library not loaded! Please refresh the page.');
            console.error('Ethers library not found');
            return;
        }
        
        // Ethers library found

        // Request account access first
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            alert('No accounts found. Please unlock MetaMask.');
            return;
        }

        userWallet = accounts[0];
        window.userWallet = userWallet;
        // Account connected
        
        // Initialize provider
        provider = new ethersLib.BrowserProvider(window.ethereum);
        // Provider initialized
        
        // Check current network BEFORE getting signer
        const network = await provider.getNetwork();
        // Current network logged
        
        // Switch to Irys network if needed
        if (Number(network.chainId) !== IRYS_TESTNET_CHAIN_ID) {
            // Switching to Irys testnet
            try {
                await switchToIrysNetwork();
                // Refresh provider after network switch
                provider = new ethersLib.BrowserProvider(window.ethereum);
                // Provider refreshed after network switch
            } catch (error) {
                console.error('Failed to switch network:', error);
                alert('Please switch to Irys Testnet manually in MetaMask');
                return;
            }
        }
        
        // Get signer AFTER network is correct (CRITICAL for ethers v6)
        signer = await provider.getSigner();
        window.signer = signer;
        const signerAddress = await signer.getAddress();
        // Signer initialized
        
        // Verify signer address matches connected wallet
        if (signerAddress.toLowerCase() !== userWallet.toLowerCase()) {
            console.error('❌ Signer address mismatch!');
            throw new Error('Signer address does not match connected wallet');
        }
        
        // Get contract address from server
        await getContractAddress();
        
        if (!contractAddress) {
            alert('Contract address not found. Please check server configuration.');
            return;
        }
        
        // Initialize contract with signer (IMPORTANT: use signer, not provider)
        contract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, signer);
        window.contract = contract;
        // Contract initialized with signer
        
        // Test contract connection with a simple read call
        try {
            // Testing contract connection
            
            // Додаткова перевірка: чи контракт правильно ініціалізований
            if (!contract || !contract.interface) {
                throw new Error('Contract not properly initialized');
            }
            
            // Перевіряємо чи signer правильно підключений
            if (!signer || typeof signer.getAddress !== 'function') {
                throw new Error('Signer not properly initialized');
            }
            
            const totalPlayers = await contract.getTotalPlayers();
            // Contract connection test successful
        } catch (testError) {
            console.error('❌ Contract connection test failed:', testError);
            
            // Спеціальна обробка для помилки "contract runner does not support calling"
            if (testError.message && testError.message.includes('contract runner does not support calling')) {
                // Contract runner error detected, trying alternative initialization
                
                // Спробуємо створити новий контракт з provider для читання
                try {
                    const readContract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, provider);
                    const totalPlayers = await readContract.getTotalPlayers();
                    // Read-only contract works
                    
                    // Створюємо гібридний підхід: читання через provider, запис через signer
                    contract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, signer);
                    // Hybrid contract approach initialized
                } catch (hybridError) {
                    console.error('❌ Hybrid contract approach failed:', hybridError);
                    alert('Contract initialization failed. Please refresh the page and try again.');
                    return;
                }
            } else {
                // Інші помилки контракту
                alert('Failed to connect to smart contract. Please check network and contract address.');
                return;
            }
        }
        
        // Check if player is registered
        // Checking if player is registered
        const isRegistered = await contract.isPlayerRegistered(userWallet);
        // Player registered status checked
        
        if (isRegistered) {
            // Get existing player data
            // Getting existing player data
            const [nickname, highScore, gamesPlayed, lastPlayed] = await contract.getPlayer(userWallet);
            userNickname = nickname;
            window.userNickname = userNickname;
            
            // Sync blockchain score with localStorage
            const blockchainScore = parseInt(highScore.toString());
            const localScore = getUserBestScoreLocal();
            if (blockchainScore > localScore) {
                localStorage.setItem('match3_best_score', blockchainScore.toString());
                // Synced blockchain score to localStorage
            }
            
            updateWalletDisplay();
            // Connected with existing nickname
        } else {
            // Register new player
            // New wallet detected, asking for nickname
            const success = await registerNickname();
            if (!success) {
                // Registration failed, disconnecting wallet
                disconnectWallet();
                return;
            }
        }
        
        // Wallet connection completed successfully
        
        // Initialize PVP system after successful wallet connection
        if (typeof window.onWalletConnected === 'function') {
            window.onWalletConnected();
        }
        
    } catch (error) {
        console.error('❌ Wallet connection error:', error);
        
        // Handle specific error types
        if (error.code === 4001) {
            alert('Connection rejected by user');
        } else if (error.code === -32002) {
            alert('MetaMask is already processing a request. Please wait.');
        } else if (error.message && error.message.includes('user rejected')) {
            alert('Connection rejected by user');
        } else if (error.message && error.message.includes('contract runner')) {
            alert('Contract connection failed. Please try again in a few seconds.');
        } else {
            alert('Wallet connection failed: ' + (error.message || error));
        }
        
        // Clear state on error
        disconnectWallet();
    } finally {
        // Завжди скидаємо флаг підключення
        isConnecting = false;
        connectWalletBtn.disabled = false;
        connectWalletBtn.textContent = 'Connect Wallet';
    }
}

// Switch to Irys network
async function switchToIrysNetwork() {
    const chainIdHex = `0x${IRYS_TESTNET_CHAIN_ID.toString(16)}`;
    // Switching to Irys network
    
    try {
        // Try to switch to existing network
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });
        // Successfully switched to Irys network
    } catch (switchError) {
        // Switch error occurred
        
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            // Adding Irys network to MetaMask
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: chainIdHex,
                            chainName: 'Irys Testnet',
                            rpcUrls: [IRYS_TESTNET_RPC],
                            nativeCurrency: {
                                name: 'IRYS',
                                symbol: 'IRYS',
                                decimals: 18,
                            },
                            blockExplorerUrls: ['https://testnet-explorer.irys.xyz'],
                        }
                    ],
                });
                // Successfully added and switched to Irys network
            } catch (addError) {
                console.error('❌ Failed to add Irys network:', addError);
                throw new Error('Failed to add Irys network to MetaMask: ' + addError.message);
            }
        } else if (switchError.code === 4001) {
            // User rejected the request
            throw new Error('User rejected network switch');
        } else {
            console.error('❌ Network switch error:', switchError);
            throw switchError;
        }
    }
}

// Get contract address from server
async function getContractAddress() {
    try {
        const response = await fetch('/blockchain-info');
        if (response.ok) {
            const data = await response.json();
            contractAddress = data.contractAddress;
            // Contract address loaded
        } else {
            console.error('Failed to get contract address from server');
        }
    } catch (error) {
        console.error('Error getting contract address:', error);
    }
}

// Register nickname on blockchain
async function registerNickname() {
    if (!userWallet || !contract) {
        alert('First connect wallet and contract');
        return false;
    }

    let nickname = null;
    
    // Loop to enter nickname until correct one is entered
    while (!nickname || nickname.trim() === '') {
        nickname = prompt('Enter your unique nickname (3-15 characters):');
        
        // If user clicked "Cancel"
        if (nickname === null) {
            alert('To continue, you need to enter a nickname');
            return false;
        }
        
        // Check length
        if (nickname.trim().length < 3) {
            alert('Nickname must be at least 3 characters');
            nickname = null;
            continue;
        }
        
        if (nickname.trim().length > 15) {
            alert('Nickname must be at most 15 characters');
            nickname = null;
            continue;
        }
    }

    // Loop for registration until nickname is unique
    while (true) {
        try {
            // Registering nickname for wallet
            
            // Check if nickname is available on blockchain
            const isAvailable = await contract.isNicknameAvailable(nickname.trim());
            
            if (!isAvailable) {
                console.error('❌ Nickname already taken');
                const newNickname = prompt(`Nickname "${nickname.trim()}" is already taken.\nEnter another nickname:`);
                
                if (newNickname === null) {
                    alert('To continue, you need to enter a unique nickname');
                    return false;
                }
                
                if (newNickname.trim().length < 3 || newNickname.trim().length > 15) {
                    alert('Nickname must be between 3 and 15 characters');
                    continue;
                }
                
                nickname = newNickname;
                continue; // Try again with new nickname
            }
            
            // Register player on blockchain
            // Sending transaction to register player
            const tx = await contract.registerPlayer(nickname.trim());
            
            // Waiting for transaction confirmation
            const receipt = await tx.wait();
            
            // Transaction confirmed
            
            userNickname = nickname.trim();
            window.userNickname = userNickname;
            updateWalletDisplay();
            // Nickname registered successfully
            alert('Nickname registered successfully!');
            return true; // Successful registration
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            
            if (error.code === 4001) {
                // User rejected transaction
                alert('Transaction rejected by user');
                return false;
            } else if (error.reason) {
                alert('Registration error: ' + error.reason);
                return false;
            } else {
                alert('Registration error: ' + error.message);
            return false;
            }
        }
    }
}

// Функція відображення інформації про гаманець
function updateWalletDisplay() {
    if (userWallet && userNickname) {
        walletInfoDiv.textContent = `Wallet: ${userWallet.slice(0,6)}...${userWallet.slice(-4)} (${userNickname})`;
        walletInfoDiv.style.display = 'block';
        connectWalletBtn.style.display = 'none';
        disconnectWalletBtn.style.display = 'inline-block';
        // Interface updated for user
    }
}

// Функція для безпечного очищення стану підключення
function clearConnectionState() {
  isConnecting = false;
  connectWalletBtn.disabled = false;
  connectWalletBtn.textContent = 'Connect Wallet';
  
  // Очищуємо часткові дані якщо підключення не завершилося
  if (!userNickname) {
    userWallet = null;
    provider = null;
    signer = null;
    contract = null;
    contractAddress = null;
    
    // Clear window exports
    window.userWallet = null;
    window.userNickname = null;
    window.contract = null;
  }
}

// Покращена функція disconnectWallet
function disconnectWallet() {
  // Disconnecting wallet
  
  // Clear all blockchain state
  userWallet = null;
  userNickname = null;
  provider = null;
  signer = null;
  contract = null;
  contractAddress = null;
  isConnecting = false; // Скидаємо флаг підключення
  
  // Clear window exports
  window.userWallet = null;
  window.userNickname = null;
  window.contract = null;
  
  // Update UI
  walletInfoDiv.style.display = 'none';
  walletInfoDiv.textContent = '';
  connectWalletBtn.style.display = 'inline-block';
  disconnectWalletBtn.style.display = 'none';
  connectWalletBtn.textContent = 'Connect Wallet';
  connectWalletBtn.disabled = false;
  
  // Wallet disconnected successfully
}

// --- Функція autoSaveScore перенесена до js/game-system.js ---

// --- Функції системи завдань перенесені до js/reward-system.js ---

// Get user's best score from blockchain or localStorage
async function getUserBestScore() {
  // Try to get score from blockchain first if user is connected
  if (userWallet && contract) {
    try {
      // Getting best score from blockchain
      const isRegistered = await contract.isPlayerRegistered(userWallet);
      
      if (isRegistered) {
        const [nickname, highScore, gamesPlayed, lastPlayed] = await contract.getPlayer(userWallet);
        const blockchainScore = parseInt(highScore.toString());
        // Blockchain score found
        
        // Also update localStorage with blockchain score
        const localScore = parseInt(localStorage.getItem('match3_best_score') || '0');
        if (blockchainScore > localScore) {
          localStorage.setItem('match3_best_score', blockchainScore.toString());
        }
        
        return blockchainScore;
      }
    } catch (error) {
      console.error('❌ Error getting blockchain score:', error);
      // Fall through to localStorage
    }
  }
  
  // Fallback to localStorage
  const savedScore = localStorage.getItem('match3_best_score');
  const localScore = savedScore ? parseInt(savedScore) : 0;
  // Using localStorage score
  return localScore;
}

// --- Функції getUserBestScoreLocal та saveUserBestScore перенесені до js/game-system.js ---

// Show tasks modal (remove score check here)
// --- Функції завдань та винагород перенесені до js/reward-system.js ---

// --- Ігрові функції перенесені до js/game-system.js ---
