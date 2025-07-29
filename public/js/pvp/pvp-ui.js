// ==========================================
// PVP UI MANAGEMENT
// ==========================================

// Global variables
let pvpInstance = null;
let isPVPMode = false;
let currentRoomId = null;
let roomUpdateInterval = null;

// ==========================================
// MAIN UI FUNCTIONS
// ==========================================

function showPVPModal() {
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) {
        pvpModal.classList.remove('hidden');
        loadPVPContent();
    }
}

function hidePVPModal() {
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) {
        pvpModal.classList.add('hidden');
    }

    // Cleanup intervals
    if (roomUpdateInterval) {
        clearInterval(roomUpdateInterval);
        roomUpdateInterval = null;
    }
}

async function loadPVPContent() {
    console.log('📋 Loading PVP content...');

    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    // Check wallet connection
    if (!window.userWallet || !window.signer) {
        showPVPError('Please connect your wallet first!');
        return;
    }

    // Initialize PVP if needed
    if (!pvpInstance) {
        await initializePVPSystem();
    }

    // Check if PVP is ready
    if (!pvpInstance || !pvpInstance.contract) {
        const result = await pvpInstance.initialize();

        if (!result.success) {
            if (result.needsRegistration) {
                showPVPRegistrationRequired();
            } else {
                showPVPError(result.error || 'Failed to initialize PVP system');
            }
            return;
        }
    }

    // Check if user is currently in any active room on blockchain
    const activeRoomResult = await pvpInstance.findUserActiveRoom();
    if (activeRoomResult.success) {
        console.log('🔄 Found user in active room:', activeRoomResult.roomId);
        showNotification(`Rejoining active room: ${activeRoomResult.roomId}`, 'info');
        showRoomWaitingScreen(activeRoomResult.roomId, activeRoomResult.isHost);
        return;
    } else if (activeRoomResult.reason !== 'User not in any active room') {
        console.log('⚠️ Error checking active rooms:', activeRoomResult.reason);
    }

    // Show main PVP interface
    showPVPMainInterface();
}

function showPVPMainInterface() {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.mainInterface(
        window.userNickname,
        window.userWallet
    );

    // Add event listeners
    document.getElementById('create-room-btn').onclick = showCreateRoomForm;
    document.getElementById('join-room-btn').onclick = showJoinRoomForm;
    document.getElementById('browse-rooms-btn').onclick = showBrowseRooms;
    document.getElementById('close-pvp').onclick = hidePVPModal;
}

// ==========================================
// CREATE ROOM INTERFACE
// ==========================================

function showCreateRoomForm() {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.createRoomForm(window.PVP_CONSTANTS);

    // Add event listeners
    document.getElementById('create-room-submit').onclick = handleCreateRoom;
    document.getElementById('back-to-pvp-menu').onclick = showPVPMainInterface;

    // Update prize calculation
    const entryFeeInput = document.getElementById('entry-fee');
    const maxPlayersSelect = document.getElementById('max-players');

    function updatePrizeBreakdown() {
        const entryFee = parseFloat(entryFeeInput.value) || 0;
        const maxPlayers = parseInt(maxPlayersSelect.value) || 2;

        const totalPrize = entryFee * maxPlayers;
        const hostFee = totalPrize * (window.PVP_CONSTANTS.HOST_FEE_PERCENT / 100);
        const winnerPrize = totalPrize - hostFee;

        document.getElementById('total-prize').textContent = totalPrize.toFixed(3) + ' IRYS';
        document.getElementById('winner-prize').textContent = winnerPrize.toFixed(3) + ' IRYS';
        document.getElementById('host-fee').textContent = hostFee.toFixed(3) + ' IRYS';
    }

    entryFeeInput.addEventListener('input', updatePrizeBreakdown);
    maxPlayersSelect.addEventListener('change', updatePrizeBreakdown);

    // Initial calculation
    updatePrizeBreakdown();
}

async function handleCreateRoom() {
    try {
        const entryFee = parseFloat(document.getElementById('entry-fee').value);
        const gameDuration = parseInt(document.getElementById('game-duration').value);
        const maxPlayers = parseInt(document.getElementById('max-players').value);

        // Initialize PVP instance if needed
        if (!pvpInstance) {
            await initializePVPSystem();
        }

        if (!pvpInstance || !pvpInstance.contract) {
            throw new Error('PVP system not initialized');
        }

        // Create room
        const result = await pvpInstance.createRoom(entryFee, gameDuration, maxPlayers);

        if (result.success) {
            showNotification(`Room ${result.roomId} created successfully!`, 'success');
            showRoomWaitingScreen(result.roomId, true);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Create room error:', error);
        showNotification(error.message, 'error');
    }
}

// ==========================================
// JOIN ROOM INTERFACE
// ==========================================

function showJoinRoomForm() {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.joinRoomForm();

    // Add event listeners
    document.getElementById('check-room-btn').onclick = checkRoomInfo;
    document.getElementById('join-room-submit').onclick = handleJoinRoom;
    document.getElementById('back-to-menu').onclick = showPVPMainInterface;
}

async function checkRoomInfo() {
    const roomIdInput = document.getElementById('room-id');
    const roomId = roomIdInput.value.trim();

    if (!roomId) {
        showNotification('Please enter a room ID', 'error');
        return;
    }

    try {
        // Initialize PVP instance if needed
        if (!pvpInstance) {
            await initializePVPSystem();
        }

        if (!pvpInstance || !pvpInstance.contract) {
            throw new Error('PVP system not initialized');
        }

        // Check if pvpInstance is available
        if (!pvpInstance) {
            throw new Error('PVP system not initialized. Please refresh the page.');
        }

        // Get room info
        const result = await pvpInstance.getRoomInfo(roomId);

        if (!result.success) {
            throw new Error(result.error);
        }

        const room = result.room;

        // Display room info
        const roomInfoDiv = document.getElementById('room-info');
        const roomDetailsDiv = document.getElementById('room-details');

        roomDetailsDiv.innerHTML = window.PVP_TEMPLATES.roomInfo(room);
        roomInfoDiv.style.display = 'block';

        // Enable/disable join button
        const joinButton = document.getElementById('join-room-submit');
        const canJoin = room.isActive && !room.gameStarted && room.currentPlayers < room.maxPlayers;

        joinButton.disabled = !canJoin;

        if (canJoin) {
            showNotification('Room found! You can join this room.', 'success');
        } else {
            let statusText = 'Cannot join this room';
            if (!room.isActive) statusText += ': Room inactive';
            else if (room.gameStarted) statusText += ': Game already started';
            else if (room.currentPlayers >= room.maxPlayers) statusText += ': Room full';

            showNotification(statusText, 'warning');
        }

    } catch (error) {
        console.error('❌ Check room error:', error);
        showNotification(error.message, 'error');

        // Hide room info
        document.getElementById('room-info').style.display = 'none';
        document.getElementById('join-room-submit').disabled = true;
    }
}

async function handleJoinRoom() {
    const roomId = document.getElementById('room-id').value.trim();

    if (!roomId) {
        showNotification('Please enter a room ID', 'error');
        return;
    }

    try {
        if (!pvpInstance) {
            await initializePVPSystem();
        }

        if (!pvpInstance || !pvpInstance.contract) {
            throw new Error('PVP system not initialized');
        }

        const result = await pvpInstance.joinRoom(roomId);

        if (result.success) {
            showNotification(`Successfully joined room ${roomId}!`, 'success');
            console.log('🚨 DEBUG: About to show room waiting screen after join');
            console.log('🚨 DEBUG: Current DOM state:', document.querySelector('#pvp-modal .modal-content'));
            showRoomWaitingScreen(roomId, false);
            console.log('🚨 DEBUG: Room waiting screen should be visible now');
            console.log('🚨 DEBUG: New DOM state:', document.querySelector('#pvp-modal .modal-content').innerHTML.substring(0, 200));
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Join room error:', error);
        showNotification(error.message, 'error');
    }
}

// ==========================================
// BROWSE ROOMS INTERFACE
// ==========================================

function showBrowseRooms() {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.browseRooms();

    // Add event listeners
    document.getElementById('refresh-rooms').onclick = loadAvailableRooms;
    document.getElementById('back-to-menu').onclick = showPVPMainInterface;

    // Load rooms automatically
    loadAvailableRooms();
}

async function loadAvailableRooms() {
    const roomsContainer = document.getElementById('rooms-container');
    const roomsCount = document.getElementById('rooms-count');

    if (!roomsContainer) return;

    roomsContainer.innerHTML = window.PVP_TEMPLATES.loading('Loading available rooms...');
    roomsCount.textContent = 'Loading...';

    try {
        if (!pvpInstance) {
            await initializePVPSystem();
        }

        if (!pvpInstance || !pvpInstance.contract) {
            throw new Error('PVP system not initialized');
        }

        const result = await pvpInstance.getActiveRooms();

        if (!result.success) {
            throw new Error(result.error);
        }

        const rooms = result.rooms;
        roomsCount.textContent = `${rooms.length} active room${rooms.length !== 1 ? 's' : ''}`;

        if (rooms.length === 0) {
            roomsContainer.innerHTML = window.PVP_TEMPLATES.noRooms();
            return;
        }

        // Display rooms
        let roomsHTML = '';
        for (const room of rooms) {
            roomsHTML += window.PVP_TEMPLATES.roomCard(room);
        }

        roomsContainer.innerHTML = roomsHTML;

        // Add event listeners to join buttons
        document.querySelectorAll('.join-btn:not([disabled])').forEach(btn => {
            btn.onclick = async () => {
                const roomId = btn.getAttribute('data-room-id');

                try {
                    // Check if pvpInstance is available
                    if (!pvpInstance) {
                        throw new Error('PVP system not initialized. Please refresh the page.');
                    }

                    const result = await pvpInstance.joinRoom(roomId);

                    if (result.success) {
                        showNotification(`Successfully joined room ${roomId}!`, 'success');
                        showRoomWaitingScreen(roomId, false);
                    } else {
                        throw new Error(result.error);
                    }

                } catch (error) {
                    console.error('❌ Join room error:', error);
                    showNotification(error.message, 'error');
                }
            };
        });

    } catch (error) {
        console.error('❌ Load rooms error:', error);
        roomsContainer.innerHTML = `
            <div class="no-rooms">
                <p>Error loading rooms: ${error.message}</p>
                <button onclick="loadAvailableRooms()" class="join-btn">Try Again</button>
            </div>
        `;
        roomsCount.textContent = 'Error';
    }
}

// ==========================================
// ROOM WAITING SCREEN
// ==========================================

function showRoomWaitingScreen(roomId, isHost) {
    console.log('🚨 DEBUG: showRoomWaitingScreen called', { roomId, isHost });

    // Ensure PVP modal is visible
    const pvpModal = document.getElementById('pvp-modal');
    if (pvpModal) {
        pvpModal.style.display = 'block';
        console.log('🚨 DEBUG: PVP modal made visible');
    }

    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) {
        console.error('🚨 DEBUG: pvpContent not found!');
        return;
    }

    console.log('🚨 DEBUG: Setting room waiting screen HTML');
    pvpContent.innerHTML = window.PVP_TEMPLATES.roomWaitingScreen(roomId, isHost);
    console.log('🚨 DEBUG: Room waiting screen HTML set');

    // Store room info
    window.currentPVPRoom = { id: roomId, isHost };

    // Add event listeners
    document.getElementById('join-room-btn').onclick = () => handleJoinRoomFromWaiting(roomId);

    // Leave room button - available for all players (including host after joining)
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    if (leaveRoomBtn) {
        leaveRoomBtn.onclick = () => handleLeaveRoom(roomId);
    }

    if (isHost) {
        document.getElementById('start-game-btn').onclick = () => handleStartGame(roomId);
    }

    document.getElementById('refresh-room-btn').onclick = () => refreshRoomInfo(roomId);
    document.getElementById('back-to-pvp-btn').onclick = showPVPMainInterface;

    // Load initial room info with small delay to ensure UI is ready
    setTimeout(() => {
        console.log('🚨 DEBUG: Loading initial room info after delay');
        refreshRoomInfo(roomId);
    }, 500);

    // Set up auto-refresh
    if (roomUpdateInterval) {
        clearInterval(roomUpdateInterval);
    }

    roomUpdateInterval = setInterval(() => {
        refreshRoomInfo(roomId);
    }, 10000); // 10 seconds
}

async function refreshRoomInfo(roomId) {
    console.log('🚨 DEBUG: refreshRoomInfo called for room', roomId);
    try {
        if (!pvpInstance || !pvpInstance.contract) {
            console.log('🚨 DEBUG: pvpInstance not available, returning');
            return;
        }

        // Safety check for getRoomInfo method
        if (typeof pvpInstance.getRoomInfo !== 'function') {
            console.error('🚨 DEBUG: getRoomInfo method not available');
            return;
        }

        const result = await pvpInstance.getRoomInfo(roomId);

        if (!result.success) {
            console.error('Failed to get room info:', result.error);
            return;
        }

        const room = result.room;
        const userAddress = window.userWallet;
        const isUserInRoom = room.players.some(player => player.toLowerCase() === userAddress.toLowerCase());
        const isHost = room.host.toLowerCase() === userAddress.toLowerCase();

        // Update room status
        const statusElement = document.getElementById('room-status');
        if (statusElement) {
            let statusText = 'Waiting for players';

            if (!room.isActive) {
                statusText = 'Room inactive';
            } else if (room.gameStarted) {
                statusText = 'Game in progress';
            } else if (room.currentPlayers >= Number(room.maxPlayers)) {
                statusText = 'Room full - ready to start';
            }

            statusElement.textContent = statusText;
        }

        // Update room info display
        const roomInfoElement = document.getElementById('room-info-display');
        if (roomInfoElement) {
            const totalPrize = (parseFloat(room.entryFeeFormatted) * Number(room.maxPlayers)).toFixed(3);
            const winnerPrize = (totalPrize * 0.95).toFixed(3);
            const hostFee = (totalPrize * 0.05).toFixed(3);

            roomInfoElement.innerHTML = `
                <p><strong>Entry Fee:</strong> ${room.entryFeeFormatted} IRYS</p>
                <p><strong>Game Duration:</strong> ${room.gameTimeMinutes} minutes</p>
                <p><strong>Max Players:</strong> ${Number(room.maxPlayers)}</p>
                <p><strong>Total Prize Pool:</strong> ${totalPrize} IRYS</p>
                <p><strong>Winner Prize:</strong> ${winnerPrize} IRYS (95%)</p>
                <p><strong>Host Fee:</strong> ${hostFee} IRYS (5%)</p>
            `;
        }

        // Update join/leave buttons
        const joinRoomBtn = document.getElementById('join-room-btn');
        const leaveRoomBtn = document.getElementById('leave-room-btn');

        if (isHost && !isUserInRoom && joinRoomBtn) {
            // Host hasn't joined yet - show join button and cancel option
            joinRoomBtn.style.display = 'block';
            joinRoomBtn.textContent = `💰 Join Room (${room.entryFeeFormatted} IRYS)`;
            // Host can also cancel room before joining
            if (leaveRoomBtn) {
                leaveRoomBtn.style.display = 'block';
                leaveRoomBtn.textContent = '❌ Cancel Room';
            }
        } else if (isUserInRoom && leaveRoomBtn) {
            // User is in room - show leave button
            if (joinRoomBtn) joinRoomBtn.style.display = 'none';
            leaveRoomBtn.style.display = 'block';
            leaveRoomBtn.textContent = isHost ? '🚪 Leave Room (Host)' : '🚪 Leave Room';
        } else {
            // Default state - hide both buttons
            if (joinRoomBtn) joinRoomBtn.style.display = 'none';
            if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
        }

        // Update players list
        const playersListElement = document.getElementById('players-list');
        if (playersListElement && room.players) {
            if (room.players.length === 0) {
                playersListElement.innerHTML = '<p>No players in room yet</p>';
            } else {
                let playersHTML = '';

                for (const playerAddress of room.players) {
                    playersHTML += window.PVP_TEMPLATES.playerItem(
                        playerAddress,
                        room.host,
                        userAddress
                    );
                }

                playersListElement.innerHTML = playersHTML;
            }
        }

        // Update start game button (for hosts)
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn && isHost) {
            const canStart = room.isActive && !room.gameStarted && room.currentPlayers >= 2 && isUserInRoom;
            startGameBtn.disabled = !canStart;

            if (!isUserInRoom) {
                startGameBtn.style.display = 'none';
            } else if (canStart) {
                startGameBtn.style.display = 'block';
                startGameBtn.textContent = `🎮 Start Game (${room.currentPlayers} players)`;
                startGameBtn.style.background = '#4CAF50';
            } else if (room.gameStarted) {
                startGameBtn.style.display = 'block';
                startGameBtn.textContent = '✅ Game Started';
                startGameBtn.style.background = '#4CAF50';
            } else if (room.currentPlayers < 2) {
                startGameBtn.style.display = 'block';
                startGameBtn.textContent = `⏳ Need ${2 - room.currentPlayers} more player${2 - room.currentPlayers !== 1 ? 's' : ''}`;
                startGameBtn.style.background = '#ccc';
            } else {
                startGameBtn.style.display = 'block';
                startGameBtn.textContent = '❌ Cannot Start';
                startGameBtn.style.background = '#ccc';
            }
        }

        // If game started, launch PVP game
        if (room.gameStarted && window.currentPVPRoom && !window.currentPVPGame) {
            console.log('🎮 Game started! Launching PVP game...');
            showNotification('Game started! Loading PVP game...', 'info');

            // Launch PVP game with better loading check
            let attempts = 0;
            const maxAttempts = 10; // 5 seconds max wait

            const launchGame = () => {
                attempts++;

                if (window.startPVPGame && window.PVPGameEngine) {
                    console.log('✅ PVP Game Engine loaded, starting game...');

                    // Use Time Manager for validation if available
                    let gameTimeMinutes = room.gameTimeMinutes;
                    if (window.pvpTimeManager) {
                        const timeData = window.pvpTimeManager.setRoomTime(roomId, room.gameTimeMinutes, 'ui_launch', 'minutes');
                        gameTimeMinutes = timeData.minutes;
                        console.log('🕐 Time Manager validated time:', timeData);
                    }

                    window.startPVPGame(roomId, gameTimeMinutes, isHost);
                } else if (attempts < maxAttempts) {
                    console.log(`⏳ Waiting for PVP Game Engine to load... (${attempts}/${maxAttempts})`);
                    setTimeout(launchGame, 500);
                } else {
                    console.error('❌ PVP Game Engine failed to load after 5 seconds');
                    showNotification('Failed to load PVP game engine. Please refresh the page.', 'error');
                }
            };

            setTimeout(launchGame, 500);
        }

        // If game finished, check if we should show results
        if (!room.isActive && window.currentPVPRoom && window.currentPVPRoom.id === roomId) {
            console.log('🏁 Game finished! Checking if results should be shown...');

            // Only show results if we haven't already started the results process
            if (!window.pvpResultsManager || !window.pvpResultsManager.isActive) {
                console.log('🎮 Starting results process...');
                showGameFinishedResults(roomId);
            } else {
                console.log('🎮 Results process already active, skipping...');
            }
        }

    } catch (error) {
        console.error('❌ Refresh room info error:', error);
    }
}

// ==========================================
// ROOM MANAGEMENT FUNCTIONS
// ==========================================

async function handleJoinRoomFromWaiting(roomId) {
    try {
        if (!pvpInstance) {
            throw new Error('PVP system not initialized');
        }

        const result = await pvpInstance.joinRoom(roomId);

        if (result.success) {
            showNotification('Successfully joined the room!', 'success');
            // Refresh room info to update UI
            refreshRoomInfo(roomId);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Join room from waiting error:', error);
        showNotification(error.message, 'error');
    }
}

async function handleLeaveRoom(roomId) {
    // Check if user is the host
    const isHost = window.currentPVPRoom?.isHost;

    let confirmMessage = 'Are you sure you want to leave this room? Your entry fee will be refunded.';
    if (isHost) {
        confirmMessage = 'Are you sure you want to leave this room? As the host, leaving will cancel the room and refund all players.';
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        if (!pvpInstance) {
            throw new Error('PVP system not initialized');
        }

        const result = await pvpInstance.leaveRoom(roomId);

        if (result.success) {
            if (isHost) {
                showNotification('Room cancelled and all players refunded!', 'success');
            } else {
                showNotification('Successfully left the room!', 'success');
            }
            showPVPMainInterface();
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Leave room error:', error);
        showNotification(error.message, 'error');
    }
}

// handleCancelRoom function removed - functionality merged into handleLeaveRoom

async function handleStartGame(roomId) {
    try {
        if (!pvpInstance) {
            throw new Error('PVP system not initialized');
        }

        const result = await pvpInstance.startGame(roomId);

        if (result.success) {
            showNotification('Game started successfully!', 'success');
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('❌ Start game error:', error);
        showNotification(error.message, 'error');
    }
}

// ==========================================
// GAME FINISHED RESULTS
// ==========================================

async function showGameFinishedResults(roomId) {
    try {
        console.log('🏆 Game finished for room:', roomId);

        // Don't show results immediately - let PVP Results Manager handle it
        // This function should only be called when game is confirmed finished on blockchain

        if (!pvpInstance || !pvpInstance.contract) {
            console.error('❌ PVP system not available');
            return;
        }

        // Get user's final score from the game
        const userAddress = await pvpInstance.signer.getAddress();
        let userScore = 0;

        try {
            userScore = await pvpInstance.contract.getRoomFinalScore(roomId, userAddress);
            userScore = parseInt(userScore.toString());
        } catch (error) {
            console.warn('⚠️ Could not get user final score:', error.message);
        }

        console.log(`🎮 User final score: ${userScore}`);

        // Use PVP Results Manager to show staged results
        if (window.showPVPResults) {
            console.log('🎉 Showing PVP results via Results Manager');
            window.showPVPResults(roomId, userScore);
        } else {
            console.error('❌ PVP Results Manager not available');
            showNotification('Game finished! Results will be available shortly.', 'success');
        }

    } catch (error) {
        console.error('❌ Show game finished results error:', error);
        showNotification('Game finished but error loading results: ' + error.message, 'warning');
    }
}

// ==========================================
// ERROR SCREENS
// ==========================================

function showPVPError(message) {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.errorScreen(message);

    document.getElementById('close-pvp').onclick = hidePVPModal;
}

function showPVPRegistrationRequired() {
    const pvpContent = document.querySelector('#pvp-modal .modal-content');
    if (!pvpContent) return;

    pvpContent.innerHTML = window.PVP_TEMPLATES.registrationRequired();

    document.getElementById('open-settings').onclick = () => {
        hidePVPModal();
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    };

    document.getElementById('close-pvp').onclick = hidePVPModal;
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initializePVPSystem() {
    console.log('🎯 Initializing PVP System...');

    try {
        // Create PVP instance
        pvpInstance = new window.IrysCrushPVP();
        window.pvpInstance = pvpInstance;

        // Initialize if wallet is connected
        if (window.userWallet && window.signer) {
            const result = await pvpInstance.initialize();

            if (result.success) {
                console.log('✅ PVP System ready');
            } else if (result.needsRegistration) {
                console.log('⚠️ Player registration required');
            } else {
                console.error('❌ PVP initialization failed:', result.error);
            }
        } else {
            console.log('⏳ Waiting for wallet connection...');
        }

    } catch (error) {
        console.error('❌ PVP System initialization failed:', error);
    }
}

// Auto-initialize when wallet connects
function onWalletConnected() {
    if (pvpInstance && !pvpInstance.contract) {
        initializePVPSystem();
    }
}

// Helper function for notifications
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ==========================================
// EXPORTS
// ==========================================

// Export functions for global access
window.showPVPModal = showPVPModal;
window.hidePVPModal = hidePVPModal;
window.initializePVPSystem = initializePVPSystem;
window.onWalletConnected = onWalletConnected;
window.showGameFinishedResults = showGameFinishedResults;
window.pvpInstance = null;
window.isPVPMode = false;

console.log('📦 PVP UI module loaded');