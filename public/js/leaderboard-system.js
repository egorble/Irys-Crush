// Leaderboard System Module
// Функції для роботи з лідербордом

// --- Глобальний лідерборд через сервер ---
// Get leaderboard from blockchain
async function getGlobalLeaderboard() {
  try {
    if (!contract) {
      // Fallback to server if blockchain not available
      const res = await fetch('/leaderboard', { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    }
    
    // Get leaderboard from blockchain
    const [addresses, nicknames, scores] = await contract.getLeaderboard(50);
    
    return addresses.map((address, index) => ({
      wallet: address,
      nickname: nicknames[index],
      score: parseInt(scores[index].toString())
    })).filter(player => player.score > 0); // Only show players with scores > 0
    
  } catch (e) {
    console.error('Error loading leaderboard:', e);
    throw e;
  }
}

// Legacy function - not used with blockchain
async function addGlobalScore(name, score) {
  // addGlobalScore is deprecated - use blockchain functions instead
}

// --- Показати глобальний лідерборд ---
async function showLeaderboard() {
  const scrollIndicator = document.getElementById('scroll-indicator');
  const leaderboardList = document.getElementById('leaderboard-list');
  // leaderboardModal declared in main.js
  
  if (!leaderboardList || !leaderboardModal) {
    console.error('Leaderboard elements not found');
    return;
  }
  
  leaderboardList.innerHTML = '<li>⏳ Loading...</li>';
  leaderboardModal.classList.remove('hidden');
  
  try {
    const lb = await getGlobalLeaderboard();
    leaderboardList.innerHTML = '';
    
    if (lb.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No results';
      li.style.textAlign = 'center';
      li.style.color = '#666';
      leaderboardList.appendChild(li);
      if (scrollIndicator) scrollIndicator.classList.add('hidden');
    } else {
      lb.forEach((entry, index) => {
        const li = document.createElement('li');
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        li.innerHTML = `<strong>${medal}</strong> <span style="color:#ffd700">${entry.nickname}</span> <span style="color:#aaa">[${entry.wallet.slice(0,6)}...${entry.wallet.slice(-4)}]</span> - <span style="color: #4CAF50; font-weight: bold;">${entry.score}</span>`;
        leaderboardList.appendChild(li);
      });
      
      // Show scroll indicator if there are more than 5 entries
      if (lb.length > 5 && scrollIndicator) {
        scrollIndicator.classList.remove('hidden');
        
        // Hide indicator when user scrolls
        leaderboardList.addEventListener('scroll', function() {
          if (this.scrollTop > 20) {
            scrollIndicator.classList.add('hidden');
          }
        }, { once: true }); // Remove listener after first scroll
      } else {
        if (scrollIndicator) scrollIndicator.classList.add('hidden');
      }
    }
  } catch (error) {
    leaderboardList.innerHTML = '<li style="color: #f44336;">❌ Error loading</li>';
    if (scrollIndicator) scrollIndicator.classList.add('hidden');
  }
}

// Initialize leaderboard system
function initializeLeaderboardSystem() {
  // Initializing leaderboard system
  
  // Check if required elements exist
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  const closeLeaderboardBtn = document.getElementById('close-leaderboard');
  // leaderboardModal declared in main.js
  
  if (leaderboardBtn) {
    leaderboardBtn.onclick = showLeaderboard;
  }
  
  if (closeLeaderboardBtn) {
    closeLeaderboardBtn.onclick = () => {
      if (leaderboardModal) {
        leaderboardModal.classList.add('hidden');
      }
    };
  }
  
  // Add click outside modal to close
  if (leaderboardModal) {
    leaderboardModal.addEventListener('click', (e) => {
      if (e.target === leaderboardModal) {
        leaderboardModal.classList.add('hidden');
      }
    });
  }
  
  // Add keyboard listener for closing leaderboard modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
      leaderboardModal.classList.add('hidden');
    }
  });
  
  // Leaderboard system initialized
}

// Export functions for use in main.js
window.getGlobalLeaderboard = getGlobalLeaderboard;
window.addGlobalScore = addGlobalScore;
window.showLeaderboard = showLeaderboard;
window.initializeLeaderboardSystem = initializeLeaderboardSystem;

// Експорт функцій для використання в main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getGlobalLeaderboard,
    addGlobalScore,
    showLeaderboard,
    initializeLeaderboardSystem
  };
}