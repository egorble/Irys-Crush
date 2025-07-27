// Settings System Module
// Handles all settings-related functionality

// Settings constants
const SETTINGS_KEY = 'match3_settings';

// Settings state
let settings = {
  nickname: 'Гравець'
};

// DOM elements (will be initialized in initializeSettingsSystem)
let settingsModal = null;
let playerNicknameInput = null;
let saveSettingsBtn = null;
let closeSettingsBtn = null;
let settingsBtn = null;

// Initialize settings system
function initializeSettingsSystem() {
  // Initializing settings system
  
  // Get DOM elements
  settingsModal = document.getElementById('settings-modal');
  playerNicknameInput = document.getElementById('player-nickname');
  saveSettingsBtn = document.getElementById('save-settings');
  closeSettingsBtn = document.getElementById('close-settings');
  settingsBtn = document.getElementById('settings-btn');
  
  // Check if required elements exist
  if (!settingsModal || !playerNicknameInput || !saveSettingsBtn || !closeSettingsBtn || !settingsBtn) {
    console.error('❌ Settings elements not found!');
    return;
  }
  
  // Set up event listeners
  settingsBtn.onclick = showSettings;
  saveSettingsBtn.onclick = saveSettings;
  closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
  
  // Add click outside modal to close
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });
  
  // Add keyboard listener for closing settings modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
      settingsModal.classList.add('hidden');
    }
  });
  
  // Settings system initialized
}

// Load settings from localStorage
function loadSettings() {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
  }
  if (playerNicknameInput) {
    playerNicknameInput.value = settings.nickname;
  }
}

// Save settings to blockchain and localStorage
async function saveSettings() {
  // Access global variables from main.js
  const userWallet = window.userWallet;
  const contract = window.contract;
  let userNickname = window.userNickname;
  
  if (!userWallet || !contract) {
    alert('Connect wallet first!');
    return;
  }
  
  const newNick = playerNicknameInput.value.trim();
  if (!newNick) {
    alert('Enter nickname!');
    return;
  }
  
  if (newNick === userNickname) {
    settingsModal.classList.add('hidden');
    return;
  }
  
  // Validate nickname length
  if (newNick.length < 3 || newNick.length > 15) {
    alert('Nickname must be between 3 and 15 characters');
    return;
  }
  
  try {
    // Check if nickname is available
    const isAvailable = await contract.isNicknameAvailable(newNick);
    if (!isAvailable) {
      alert('Nickname already taken!');
      return;
    }
    
    // Change nickname on blockchain
    // Sending transaction to change nickname
    const tx = await contract.changeNickname(newNick);
    
    // Waiting for transaction confirmation
    const receipt = await tx.wait();
    
    // Transaction confirmed
    
    // Update global variables
    window.userNickname = newNick;
    userNickname = newNick;
    
    // Update settings object
    settings.nickname = newNick;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    
    // Update wallet display if function exists
    if (typeof window.updateWalletDisplay === 'function') {
      window.updateWalletDisplay();
    }
    
    alert('Nickname changed successfully!');
    settingsModal.classList.add('hidden');
    
  } catch (error) {
    console.error('❌ Error changing nickname:', error);
    
    if (error.code === 4001) {
      alert('Transaction rejected by user');
    } else if (error.reason) {
      alert('Error: ' + error.reason);
    } else {
      alert('Error changing nickname: ' + error.message);
    }
  }
}

// Show settings modal
function showSettings() {
  // Check wallet connection using global function
  if (typeof window.checkWalletConnection === 'function') {
    if (!window.checkWalletConnection()) return;
  } else {
    if (!window.userWallet) {
      alert('Connect Irys wallet first!');
      return;
    }
  }
  
  playerNicknameInput.value = window.userNickname || '';
  settingsModal.classList.remove('hidden');
}

// Hide settings modal (used in toMenu function)
function hideSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.add('hidden');
  }
}

// Export functions for use in main.js and other modules
window.initializeSettingsSystem = initializeSettingsSystem;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.showSettings = showSettings;
window.hideSettingsModal = hideSettingsModal;
window.SETTINGS_KEY = SETTINGS_KEY;

// Export for CommonJS if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeSettingsSystem,
    loadSettings,
    saveSettings,
    showSettings,
    hideSettingsModal,
    SETTINGS_KEY
  };
}

// Settings system module loaded