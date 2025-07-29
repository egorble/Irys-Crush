// ==========================================
// PVP HTML TEMPLATES
// ==========================================

const PVP_TEMPLATES = {
    
    // Main PVP Interface
    mainInterface: (userNickname, userWallet) => `
        <h2>🎯 PVP Mode</h2>
        <div class="pvp-main-menu">
            <button id="create-room-btn" class="pvp-btn primary">🏗️ Create Room</button>
            <button id="join-room-btn" class="pvp-btn secondary">🚪 Join Room</button>
            <button id="browse-rooms-btn" class="pvp-btn secondary">📋 Browse Rooms</button>
        </div>
        <div class="pvp-status">
            <p>Connected as: <strong>${userNickname || 'Unknown'}</strong></p>
            <p>Wallet: <strong>${userWallet.slice(0,6)}...${userWallet.slice(-4)}</strong></p>
        </div>
        <button id="close-pvp" class="close-btn">Close</button>
    `,
    
    // Create Room Form
    createRoomForm: (constants) => `
        <h2>🏗️ Create PVP Room</h2>
        <div class="create-room-form">
            <div class="form-group">
                <label for="entry-fee">Entry Fee (IRYS):</label>
                <input type="number" id="entry-fee" step="0.01" min="${constants.MIN_ENTRY_FEE}" max="${constants.MAX_ENTRY_FEE}" value="0.1">
                <small>Min: ${constants.MIN_ENTRY_FEE} IRYS, Max: ${constants.MAX_ENTRY_FEE} IRYS</small>
            </div>
            
            <div class="form-group">
                <label for="game-duration">Game Duration (minutes):</label>
                <input type="number" id="game-duration" min="${constants.MIN_GAME_DURATION}" max="${constants.MAX_GAME_DURATION}" value="1">
                <small>Min: ${constants.MIN_GAME_DURATION} min, Max: ${constants.MAX_GAME_DURATION} min</small>
            </div>
            
            <div class="form-group">
                <label for="max-players">Max Players:</label>
                <select id="max-players">
                    <option value="2" selected>2 Players</option>
                    <option value="3">3 Players</option>
                    <option value="4">4 Players</option>
                    <option value="5">5 Players</option>
                    <option value="6">6 Players</option>
                    <option value="7">7 Players</option>
                    <option value="8">8 Players</option>
                </select>
            </div>
            
            <div class="prize-info">
                <h3>💰 Prize Distribution</h3>
                <div id="prize-breakdown">
                    <p>Total Prize Pool: <span id="total-prize">0.4 IRYS</span></p>
                    <p>Winner Prize (95%): <span id="winner-prize">0.38 IRYS</span></p>
                    <p>Host Fee (5%): <span id="host-fee">0.02 IRYS</span></p>
                </div>
            </div>
            
            <div class="form-actions">
                <button id="create-room-submit" class="pvp-btn primary">Create Room</button>
                <button id="back-to-pvp-menu" class="pvp-btn secondary">Back</button>
            </div>
        </div>
    `,
    
    // Join Room Form
    joinRoomForm: () => `
        <h2>🚪 Join PVP Room</h2>
        <div class="join-room-form">
            <div class="form-group">
                <label for="room-id">Room ID:</label>
                <input type="number" id="room-id" placeholder="Enter room ID" min="1">
                <small>Enter the room ID provided by the host</small>
            </div>
            
            <div id="room-info" class="room-info" style="display: none;">
                <h3>Room Information</h3>
                <div id="room-details"></div>
            </div>
            
            <div class="form-actions">
                <button id="check-room-btn" class="pvp-btn secondary">Check Room</button>
                <button id="join-room-submit" class="pvp-btn primary" disabled>Join Room</button>
                <button id="back-to-menu" class="pvp-btn secondary">Back</button>
            </div>
        </div>
    `,
    
    // Browse Rooms
    browseRooms: () => `
        <h2>📋 Browse PVP Rooms</h2>
        <div class="browse-rooms">
            <div class="rooms-header">
                <button id="refresh-rooms" class="pvp-btn secondary">🔄 Refresh</button>
                <span id="rooms-count">Loading...</span>
            </div>
            
            <div id="rooms-container" class="rooms-container">
                <div class="loading">
                    <p>Loading available rooms...</p>
                </div>
            </div>
            
            <div class="form-actions">
                <button id="back-to-menu" class="pvp-btn secondary">Back</button>
            </div>
        </div>
    `,
    
    // Room Waiting Screen
    roomWaitingScreen: (roomId, isHost) => `
        <h2>🏠 Room #${roomId}</h2>
        <div class="room-waiting">
            <div class="room-status-info">
                <p><strong>Status:</strong> <span id="room-status">Loading...</span></p>
                <p><strong>Your Role:</strong> ${isHost ? '👑 Host' : '👤 Player'}</p>
            </div>
            
            <div class="room-info-display" id="room-info-display">
                <p>Loading room information...</p>
            </div>
            
            <div class="room-players">
                <h3>Players in room:</h3>
                <div id="players-list">
                    <p>Loading players...</p>
                </div>
            </div>
            
            <div class="room-actions">
                <button id="join-room-btn" class="pvp-btn primary" style="display: none;">💰 Join Room (Pay Entry Fee)</button>
                ${isHost ? `
                    <button id="start-game-btn" class="pvp-btn primary" disabled>Start Game</button>
                ` : ''}
                <button id="leave-room-btn" class="pvp-btn danger" style="display: none;">🚪 Leave Room</button>
                <button id="refresh-room-btn" class="pvp-btn secondary">🔄 Refresh</button>
                <button id="back-to-pvp-btn" class="pvp-btn secondary">Back to PVP</button>
            </div>
        </div>
    `,
    
    // Room Card for Browse
    roomCard: (room) => {
        let statusText = 'Available';
        let statusClass = 'status-waiting';
        let canJoin = true;
        
        if (!room.isActive) {
            statusText = 'Inactive';
            statusClass = 'status-full';
            canJoin = false;
        } else if (room.gameStarted) {
            statusText = 'Started';
            statusClass = 'status-started';
            canJoin = false;
        } else if (room.currentPlayers >= Number(room.maxPlayers)) {
            statusText = 'Full';
            statusClass = 'status-full';
            canJoin = false;
        }
        
        const totalPrize = (parseFloat(room.entryFeeFormatted) * Number(room.maxPlayers)).toFixed(3);
        
        return `
            <div class="room-card">
                <div class="room-header">
                    <span class="room-id">Room #${room.id}</span>
                    <span class="room-status ${statusClass}">${statusText}</span>
                </div>
                <div class="room-details">
                    <div class="room-detail">
                        <strong>Entry Fee:</strong> ${room.entryFeeFormatted} IRYS
                    </div>
                    <div class="room-detail">
                        <strong>Duration:</strong> ${room.gameTimeMinutes} min
                    </div>
                    <div class="room-detail">
                        <strong>Players:</strong> ${room.currentPlayers}/${Number(room.maxPlayers)}
                    </div>
                    <div class="room-detail">
                        <strong>Prize Pool:</strong> ${totalPrize} IRYS
                    </div>
                </div>
                <div class="room-actions">
                    <button class="join-btn" data-room-id="${room.id}" ${!canJoin ? 'disabled' : ''}>
                        ${canJoin ? 'Join Room' : 'Cannot Join'}
                    </button>
                </div>
            </div>
        `;
    },
    
    // Player Item
    playerItem: (playerAddress, hostAddress, userWallet) => {
        const isHost = playerAddress.toLowerCase() === hostAddress.toLowerCase();
        const isCurrentUser = userWallet && playerAddress.toLowerCase() === userWallet.toLowerCase();
        
        let playerName = `${playerAddress.slice(0,6)}...${playerAddress.slice(-4)}`;
        if (isCurrentUser) {
            playerName += ' (You)';
        }
        
        return `
            <div class="player-item ${isHost ? 'host' : ''}">
                <span>${isHost ? '👑 ' : '👤 '}${playerName}</span>
                <span class="player-address">${playerAddress}</span>
            </div>
        `;
    },
    
    // Error Screen
    errorScreen: (message) => `
        <h2>❌ PVP Error</h2>
        <div class="pvp-error">
            <p style="color: #f44336; margin: 20px 0;">${message}</p>
            <button id="close-pvp" class="pvp-btn primary">Close</button>
        </div>
    `,
    
    // Registration Required Screen
    registrationRequired: () => `
        <h2>📝 Registration Required</h2>
        <div class="pvp-registration">
            <p>You need to register a nickname before using PVP mode.</p>
            <p>Please go to Settings and set your nickname first.</p>
            <div style="margin: 20px 0;">
                <button id="open-settings" class="pvp-btn primary">Open Settings</button>
                <button id="close-pvp" class="pvp-btn secondary">Close</button>
            </div>
        </div>
    `,
    
    // No Rooms Available
    noRooms: () => `
        <div class="no-rooms">
            <p>No active rooms available</p>
            <p>Be the first to create a room!</p>
        </div>
    `,
    
    // Loading State
    loading: (message = 'Loading...') => `
        <div class="loading">
            <p>${message}</p>
        </div>
    `,
    
    // Room Info for Join Form
    roomInfo: (room) => {
        let statusText = 'Waiting for players';
        let statusColor = '#4CAF50';
        
        if (!room.isActive) {
            statusText = 'Room inactive';
            statusColor = '#f44336';
        } else if (room.gameStarted) {
            statusText = 'Game in progress';
            statusColor = '#FF9800';
        } else if (room.currentPlayers >= room.maxPlayers) {
            statusText = 'Room full';
            statusColor = '#f44336';
        }
        
        return `
            <p><strong>Host:</strong> ${room.host.slice(0,6)}...${room.host.slice(-4)}</p>
            <p><strong>Entry Fee:</strong> ${room.entryFeeFormatted} IRYS</p>
            <p><strong>Game Duration:</strong> ${room.gameTimeMinutes} minutes</p>
            <p><strong>Players:</strong> ${room.currentPlayers}/${room.maxPlayers}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
            <p><strong>Total Prize Pool:</strong> ${(parseFloat(room.entryFeeFormatted) * Number(room.maxPlayers)).toFixed(3)} IRYS</p>
        `;
    }
};

// Export templates
window.PVP_TEMPLATES = PVP_TEMPLATES;

console.log('📦 PVP Templates module loaded');