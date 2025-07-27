// ==========================================
// PVP GAME LAUNCHER - GLOBAL FUNCTIONS
// ==========================================

// Function to start PVP game (called from UI)
async function startPVPGame(roomId, gameTimeMinutes, isHost = false) {
    console.log('🎮 Starting PVP game for room:', roomId);
    
    // Use Time Manager for validation
    let validGameTimeMinutes = 2; // Default
    
    if (window.pvpTimeManager) {
        // Use centralized time management
        let timeData;
        
        if (gameTimeMinutes !== undefined && gameTimeMinutes !== null) {
            // Set time from provided parameter
            timeData = window.pvpTimeManager.setRoomTime(roomId, gameTimeMinutes, 'startGame_param', 'minutes');
        } else {
            // Try to get from cache or fetch from contract
            timeData = window.pvpTimeManager.getRoomTime(roomId);
            
            if (timeData.source === 'default_fallback' && window.pvpInstance && window.pvpInstance.contract) {
                try {
                    timeData = await window.pvpTimeManager.fetchAndCacheRoomTimeFromContract(roomId, window.pvpInstance.contract);
                } catch (error) {
                    console.error('❌ Failed to fetch time from contract:', error);
                }
            }
        }
        
        validGameTimeMinutes = timeData.minutes;
        console.log('🕐 Time Manager result:', timeData);
    } else {
        // Fallback validation if Time Manager not available
        console.warn('⚠️ PVP Time Manager not available, using fallback validation');
        
        if (gameTimeMinutes !== undefined && gameTimeMinutes !== null) {
            const parsedTime = Number(gameTimeMinutes);
            if (!isNaN(parsedTime) && parsedTime > 0) {
                validGameTimeMinutes = parsedTime;
            }
        }
    }

    try {
        // Ensure all required modules are loaded
        if (!window.PVPGameEngine) {
            throw new Error('PVP Game Engine not loaded');
        }
        if (!window.PVPGameLogic) {
            throw new Error('PVP Game Logic not loaded');
        }
        if (!window.PVPGameUI) {
            throw new Error('PVP Game UI not loaded');
        }
        if (!window.PVPGameResults) {
            throw new Error('PVP Game Results not loaded');
        }
        if (!window.PVPGameStyles) {
            throw new Error('PVP Game Styles not loaded');
        }

        // Create game instance with validated time
        const gameEngine = new window.PVPGameEngine(roomId, validGameTimeMinutes, isHost);
        window.currentPVPGame = gameEngine;

        // Start the game
        const result = await gameEngine.startGame();

        if (result.success) {
            console.log('✅ PVP game started successfully');
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Failed to start PVP game:', error);

        if (window.showNotification) {
            window.showNotification(`Failed to start game: ${error.message}`, 'error');
        }
    }
}

// Function to check if all PVP game modules are loaded
function checkPVPGameModules() {
    const requiredModules = [
        'PVPGameEngine',
        'PVPGameLogic', 
        'PVPGameUI',
        'PVPGameResults',
        'PVPGameStyles'
    ];

    const missingModules = requiredModules.filter(module => !window[module]);
    
    if (missingModules.length > 0) {
        console.error('❌ Missing PVP Game modules:', missingModules);
        return false;
    }

    console.log('✅ All PVP Game modules loaded successfully');
    return true;
}

// Export for global access
window.startPVPGame = startPVPGame;
window.checkPVPGameModules = checkPVPGameModules;

console.log('🚀 PVP Game Launcher loaded');