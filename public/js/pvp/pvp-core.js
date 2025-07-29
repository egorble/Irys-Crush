// ==========================================
// PVP CORE CLASS
// ==========================================

class IrysCrushPVP {
    constructor() {
        this.contract = null;
        this.signer = null;
        this.provider = null;
        this.config = null;
        this.currentRoomId = null;
        this.isHost = false;
        this.gameTimer = null;
        this.roomsCache = new Map();
        this.lastRoomsUpdate = 0;
        this.eventListeners = new Map();
        this.instanceId = `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.submissionCache = new Map();
        
        console.log('🎯 PVP System initialized with instance ID:', this.instanceId);
    }
    
    // Clear current room data
    clearCurrentRoom() {
        console.log('🧹 Clearing current room data');
        this.currentRoomId = null;
        this.isHost = false;
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Clear submission cache
        if (this.submissionCache) {
            this.submissionCache.clear();
            console.log('🧹 Submission cache cleared');
        }
    }
    
    // ==========================================
    // BLOCKCHAIN ROOM STATE CHECKING
    // ==========================================
    
    async findUserActiveRoom() {
        try {
            console.log('🔍 Checking if user is in any active room...');
            
            if (!this.contract || !this.signer) {
                return { success: false, reason: 'Contract not initialized' };
            }
            
            const userAddress = await this.signer.getAddress();
            console.log('👤 Checking rooms for user:', userAddress);
            
            // Get all active rooms
            const activeRoomsResult = await this.getActiveRooms();
            if (!activeRoomsResult.success) {
                return { success: false, reason: 'Failed to get active rooms' };
            }
            
            const activeRooms = activeRoomsResult.rooms;
            console.log('🏠 Found', activeRooms.length, 'active rooms to check');
            
            // Check each room to see if user is in it
            for (const room of activeRooms) {
                const isUserHost = room.host.toLowerCase() === userAddress.toLowerCase();
                const isUserInRoom = room.players.some(
                    player => player.toLowerCase() === userAddress.toLowerCase()
                );
                
                if (isUserHost || isUserInRoom) {
                    console.log('✅ Found user in room:', room.id);
                    
                    // Update internal state
                    this.currentRoomId = room.id;
                    this.isHost = isUserHost;
                    
                    return {
                        success: true,
                        roomId: room.id,
                        isHost: isUserHost,
                        room: room,
                        userInRoom: isUserInRoom
                    };
                }
            }
            
            console.log('ℹ️ User is not in any active room');
            return { success: false, reason: 'User not in any active room' };
            
        } catch (error) {
            console.error('❌ Error finding user active room:', error);
            return { success: false, reason: error.message };
        }
    }
    
    async checkUserRoomStatus(roomId) {
        try {
            if (!this.contract || !this.signer) {
                return { success: false, reason: 'Contract not initialized' };
            }
            
            const userAddress = await this.signer.getAddress();
            const roomInfo = await this.getRoomInfo(roomId);
            
            if (!roomInfo.success) {
                return { success: false, reason: 'Room not found' };
            }
            
            const room = roomInfo.room;
            const isUserHost = room.host.toLowerCase() === userAddress.toLowerCase();
            const isUserInRoom = room.players.some(
                player => player.toLowerCase() === userAddress.toLowerCase()
            );
            
            return {
                success: true,
                room: room,
                isUserHost: isUserHost,
                isUserInRoom: isUserInRoom,
                canJoin: room.isActive && !room.gameStarted && room.currentPlayers < room.maxPlayers && !isUserInRoom
            };
            
        } catch (error) {
            console.error('❌ Error checking user room status:', error);
            return { success: false, reason: error.message };
        }
    }
    
    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    async initialize() {
        try {
            // КРИТИЧНО: Захист від множинних ініціалізацій
            if (this.contract && this.signer) {
                console.log('✅ PVP system already initialized, skipping...');
                return { success: true, message: 'Already initialized' };
            }
            
            console.log('🔄 Initializing PVP system...');
            
            // Load configuration
            this.config = await window.loadPVPConfig();
            
            // Check if wallet is connected
            if (!window.userWallet || !window.signer) {
                throw new Error('Wallet not connected');
            }
            
            // Set up provider and signer
            this.provider = window.signer.provider;
            this.signer = window.signer;
            
            // Verify network
            const network = await this.provider.getNetwork();
            if (Number(network.chainId) !== this.config.CHAIN_ID) {
                throw new Error(`Wrong network. Expected ${this.config.NETWORK_NAME} (${this.config.CHAIN_ID}), got ${network.chainId}`);
            }
            
            // Use existing contract from main.js
            this.contract = window.contract;
            
            if (!this.contract) {
                throw new Error('Contract not available');
            }
            
            // Check if player is registered
            const userAddress = await this.signer.getAddress();
            const isRegistered = await this.contract.isPlayerRegistered(userAddress);
            
            if (!isRegistered) {
                console.log('⚠️ Player not registered, registration required');
                return { success: false, needsRegistration: true };
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ PVP system initialized successfully');
            return { success: true };
            
        } catch (error) {
            console.error('❌ PVP initialization failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    setupEventListeners() {
        if (!this.contract) return;
        
        // БЕЗПЕЧНЕ очищення тільки наших event listeners
        if (this.eventListeners.size > 0) {
            console.log('🧹 Clearing previous event listeners for this instance');
            this.eventListeners.forEach((listener, eventName) => {
                this.contract.off(eventName, listener);
            });
            this.eventListeners.clear();
        }
        
        // Listen for room events (only for new events, not historical ones)
        const roomCreatedListener = (roomId, host, entryFee, gameTime, event) => {
            console.log('🏗️ Room created:', { roomId: roomId.toString(), host, entryFee: ethers.formatEther(entryFee) });
            this.onRoomCreated(roomId.toString(), host, entryFee, gameTime);
        };
        this.contract.on('RoomCreated', roomCreatedListener);
        this.eventListeners.set('RoomCreated', roomCreatedListener);
        
        const playerJoinedListener = (roomId, player, event) => {
            console.log('🚪 Player joined room:', { roomId: roomId.toString(), player });
            this.onPlayerJoined(roomId.toString(), player);
        };
        this.contract.on('PlayerJoinedRoom', playerJoinedListener);
        this.eventListeners.set('PlayerJoinedRoom', playerJoinedListener);
        
        const gameStartedListener = (roomId, host, event) => {
            console.log('🎮 Game started:', { roomId: roomId.toString(), host });
            this.onGameStarted(roomId.toString(), host);
        };
        this.contract.on('GameStarted', gameStartedListener);
        this.eventListeners.set('GameStarted', gameStartedListener);
        
        // ВИПРАВЛЕНО: Слухаємо правильний event з контракту
        const gameFinishedListener = (roomId, winner, event) => {
            console.log('🚨 PVP GAME FINISHED EVENT DEBUG:', { 
                roomId: roomId.toString(), 
                winner, 
                currentRoomId: this.currentRoomId,
                eventBlockNumber: event?.blockNumber,
                eventTransactionHash: event?.transactionHash,
                instanceId: this.instanceId
            });
            
            // Only handle if this is our current room or we're actively monitoring this room
            if (this.currentRoomId === roomId.toString()) {
                console.log('🚨 EVENT DEBUG: Calling onGameFinished for our room');
                this.onGameFinished(roomId.toString(), winner, 0); // prize = 0 для сумісності
            } else {
                console.log('🏁 Game finished for different room, ignoring');
            }
        };
        this.contract.on('PvPGameFinished', gameFinishedListener);
        this.eventListeners.set('PvPGameFinished', gameFinishedListener);
        
        console.log('✅ Event listeners set up for PVP contract');
    }
    
    // ==========================================
    // ROOM CREATION
    // ==========================================
    
    async createRoom(entryFee, gameDuration, maxPlayers) {
        try {
            console.log('🏗️ Creating PVP room (Server-Controlled):', { entryFee, gameDuration, maxPlayers });
            
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            // Clear any previous room data
            this.clearCurrentRoom();
            
            // Check if user is already in a room
            const userAddress = await this.signer.getAddress();
            console.log('🔍 Checking if user is in room. Contract functions:', Object.keys(this.contract));
            console.log('🔍 playerCurrentRoom function exists:', typeof this.contract.playerCurrentRoom);
            
            try {
                const currentRoom = await this.contract.playerCurrentRoom(userAddress);
                console.log('🔍 Current room for user:', currentRoom.toString());
                if (currentRoom > 0) {
                    throw new Error('You are already in a room. Please leave it first.');
                }
            } catch (roomCheckError) {
                console.warn('⚠️ Could not check current room, proceeding anyway:', roomCheckError.message);
                // Continue with room creation even if we can't check current room
            }
            
            // Validate parameters
            this.validateRoomParams(entryFee, gameDuration, maxPlayers);
            
            // Convert parameters
            const entryFeeWei = ethers.parseEther(entryFee.toString());
            const gameDurationSeconds = Math.floor(gameDuration * 60);
            const maxPlayersInt = Math.floor(maxPlayers);
            
            // Check balance (need balance for joining, not creating)
            await this.checkUserBalance(entryFee);
            
            console.log('📝 Creating room with params:', {
                entryFeeWei: entryFeeWei.toString(),
                gameDurationSeconds,
                maxPlayersInt
            });
            
            // Show loading
            this.showTransactionPending('Creating room...');
            
            // Create room transaction (no payment required for creation)
            const tx = await this.contract.createPvPRoom(
                entryFeeWei,
                gameDurationSeconds,
                maxPlayersInt
            );
            
            console.log('📝 Room creation transaction sent:', tx.hash);
            this.showTransactionHash(tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('📋 Room creation receipt:', receipt);
            
            // Extract room ID from events
            const roomId = await this.extractRoomIdFromReceipt(receipt);
            
            // Update state
            this.currentRoomId = roomId;
            this.isHost = true;
            
            // Sync with database
            const dbSync = await this.syncRoomWithDatabase(
                roomId, 
                userAddress, 
                entryFeeWei.toString(), 
                gameDurationSeconds, 
                maxPlayersInt
            );
            
            if (!dbSync.success) {
                console.warn('⚠️ Database sync failed, but room created on blockchain:', dbSync.error);
            }
            
            this.hideTransactionPending();
            console.log('✅ Room created successfully:', roomId);
            
            return { success: true, roomId };
            
        } catch (error) {
            this.hideTransactionPending();
            console.error('❌ Create room error:', error);
            this.handleTransactionError(error, 'create room');
            return { success: false, error: error.message };
        }
    }
    
    validateRoomParams(entryFee, gameDuration, maxPlayers) {
        const constants = window.PVP_CONSTANTS;
        
        if (!entryFee || entryFee < constants.MIN_ENTRY_FEE) {
            throw new Error(`Entry fee must be at least ${constants.MIN_ENTRY_FEE} IRYS`);
        }
        
        if (entryFee > constants.MAX_ENTRY_FEE) {
            throw new Error(`Entry fee cannot exceed ${constants.MAX_ENTRY_FEE} IRYS`);
        }
        
        if (!gameDuration || gameDuration < constants.MIN_GAME_DURATION || gameDuration > constants.MAX_GAME_DURATION) {
            throw new Error(`Game duration must be between ${constants.MIN_GAME_DURATION} and ${constants.MAX_GAME_DURATION} minutes`);
        }
        
        if (!maxPlayers || maxPlayers < constants.MIN_PLAYERS || maxPlayers > constants.MAX_PLAYERS) {
            throw new Error(`Max players must be between ${constants.MIN_PLAYERS} and ${constants.MAX_PLAYERS}`);
        }
    }
    
    async checkUserBalance(entryFee) {
        const userAddress = await this.signer.getAddress();
        const balance = await this.provider.getBalance(userAddress);
        const entryFeeWei = ethers.parseEther(entryFee.toString());
        const gasBuffer = ethers.parseEther('0.01'); // Buffer for gas
        
        if (balance < entryFeeWei + gasBuffer) {
            throw new Error(`Insufficient balance. Required: ${entryFee} IRYS + gas, Available: ${ethers.formatEther(balance)} IRYS`);
        }
    }
    
    async extractRoomIdFromReceipt(receipt) {
        console.log('🔍 Extracting room ID from receipt...');
        console.log('📋 Receipt logs:', receipt.logs?.length || 0, 'logs found');
        
        // Try to find RoomCreated event
        let roomCreatedEvent = null;
        let parsed = null;
        
        for (const log of receipt.logs || []) {
            try {
                const parsedLog = this.contract.interface.parseLog(log);
                console.log('📝 Parsed log:', parsedLog?.name);
                
                if (parsedLog?.name === 'RoomCreated') {
                    roomCreatedEvent = log;
                    parsed = parsedLog;
                    break;
                }
            } catch (error) {
                // Skip logs that can't be parsed
                continue;
            }
        }
        
        if (!roomCreatedEvent || !parsed) {
            console.error('❌ Room creation event not found in logs');
            console.log('📋 Available logs:', receipt.logs?.map(log => log.topics[0]) || []);
            
            // Check if transaction was successful
            if (receipt.status === 0) {
                throw new Error('Transaction failed - room was not created');
            }
            
            // Fallback: use nextRoomId - 1 (since nextRoomId increments after creation)
            console.log('🔄 Using fallback method to get room ID...');
            try {
                return await this.getNextRoomIdFallback();
            } catch (fallbackError) {
                console.error('❌ All fallback methods failed:', fallbackError);
                throw new Error('Could not determine room ID from transaction');
            }
        }
        
        const roomId = parsed.args.roomId.toString();
        console.log('✅ Extracted room ID:', roomId);
        return roomId;
    }
    
    async getNextRoomIdFallback() {
        try {
            // Check if nextRoomId function exists in contract
            if (typeof this.contract.nextRoomId === 'function') {
                // Get current nextRoomId and subtract 1 (since it was incremented after creation)
                const nextRoomId = await this.contract.nextRoomId();
                const currentRoomId = (BigInt(nextRoomId) - 1n).toString();
                console.log('🔄 Fallback room ID:', currentRoomId);
                return currentRoomId;
            } else {
                console.log('⚠️ nextRoomId function not available in contract');
                throw new Error('nextRoomId function not available');
            }
        } catch (error) {
            console.error('❌ Fallback method failed:', error);
            
            // Alternative fallback: try to get active rooms and find the highest ID
            try {
                console.log('🔄 Trying alternative fallback...');
                const activeRooms = await this.contract.getActiveRooms();
                if (activeRooms && activeRooms.length > 0) {
                    // Find the highest room ID
                    const highestId = Math.max(...activeRooms.map(id => parseInt(id.toString())));
                    console.log('🔄 Alternative fallback room ID:', highestId.toString());
                    return highestId.toString();
                }
            } catch (altError) {
                console.error('❌ Alternative fallback also failed:', altError);
            }
            
            // Last resort: return "1" for first room
            console.log('🔄 Using last resort room ID: 1');
            return "1";
        }
    }
    
    // ==========================================
    // ROOM JOINING
    // ==========================================
    
    async joinRoom(roomId) {
        try {
            console.log('🚪 Joining room:', roomId);
            
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            // Get room info with safety check
            const roomInfoPromise = this.getRoomInfo(roomId);
            if (!roomInfoPromise || typeof roomInfoPromise.then !== 'function') {
                throw new Error('Failed to get room information - system error');
            }
            
            const roomInfo = await roomInfoPromise;
            if (!roomInfo || !roomInfo.success) {
                throw new Error(roomInfo?.error || 'Failed to get room information');
            }
            
            const room = roomInfo.room;
            
            // Validate room state
            if (!room.isActive) {
                throw new Error('Room is not active');
            }
            
            if (room.gameStarted) {
                throw new Error('Game already started');
            }
            
            if (room.players.length >= Number(room.maxPlayers)) {
                throw new Error('Room is full');
            }
            
            // Check if already in room
            const userAddress = await this.signer.getAddress();
            if (room.players.includes(userAddress)) {
                throw new Error('Already in this room');
            }
            
            // Check balance
            const entryFeeEther = ethers.formatEther(room.entryFee);
            await this.checkUserBalance(entryFeeEther);
            
            console.log('💰 Joining with entry fee:', entryFeeEther, 'IRYS');
            
            // Show loading
            this.showTransactionPending('Joining room...');
            
            // Join room transaction
            const tx = await this.contract.joinPvPRoom(roomId, {
                value: room.entryFee
            });
            
            console.log('📝 Join transaction sent:', tx.hash);
            this.showTransactionHash(tx.hash);
            
            // Wait for confirmation
            await tx.wait();
            
            // Update state
            this.currentRoomId = roomId;
            this.isHost = false;
            
            // Sync with database
            const dbSync = await this.syncPlayerJoinWithDatabase(roomId, userAddress);
            
            if (!dbSync.success) {
                console.warn('⚠️ Database sync failed, but joined on blockchain:', dbSync.error);
            }
            
            this.hideTransactionPending();
            console.log('✅ Successfully joined room:', roomId);
            
            return { success: true, roomId };
            
        } catch (error) {
            this.hideTransactionPending();
            console.error('❌ Join room error:', error);
            this.handleTransactionError(error, 'join room');
            return { success: false, error: error.message };
        }
    }
    
    // ==========================================
    // GAME MANAGEMENT
    // ==========================================
    
    async startGame(roomId) {
        try {
            console.log('🎮 Starting game:', roomId);
            
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            // Show loading
            this.showTransactionPending('Starting game...');
            
            // Start game transaction
            const tx = await this.contract.startPvPGame(roomId);
            
            console.log('📝 Start game transaction sent:', tx.hash);
            this.showTransactionHash(tx.hash);
            
            // Wait for confirmation
            await tx.wait();
            
            this.hideTransactionPending();
            console.log('✅ Game started successfully:', roomId);
            
            return { success: true };
            
        } catch (error) {
            this.hideTransactionPending();
            console.error('❌ Start game error:', error);
            this.handleTransactionError(error, 'start game');
            return { success: false, error: error.message };
        }
    }
    
    async leaveRoom(roomId) {
        try {
            console.log('🚪 Leaving room:', roomId);
            
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            // Check if user is host and hasn't joined yet
            const roomInfo = await this.getRoomInfo(roomId);
            if (roomInfo.success) {
                const userAddress = await this.signer.getAddress();
                const isHost = roomInfo.room.host.toLowerCase() === userAddress.toLowerCase();
                const isUserInRoom = roomInfo.room.players.some(player => player.toLowerCase() === userAddress.toLowerCase());
                
                // If host hasn't joined yet, use cancelRoom instead
                if (isHost && !isUserInRoom) {
                    console.log('🚪 Host leaving before joining - cancelling room instead');
                    return await this.cancelRoom(roomId);
                }
            }
            
            // Show loading
            this.showTransactionPending('Leaving room...');
            
            // Leave room transaction
            const tx = await this.contract.leavePvPRoom(roomId);
            
            console.log('📝 Leave room transaction sent:', tx.hash);
            this.showTransactionHash(tx.hash);
            
            // Wait for confirmation
            await tx.wait();
            
            // Reset state
            this.currentRoomId = null;
            this.isHost = false;
            
            this.hideTransactionPending();
            console.log('✅ Successfully left room');
            
            return { success: true };
            
        } catch (error) {
            this.hideTransactionPending();
            console.error('❌ Leave room error:', error);
            this.handleTransactionError(error, 'leave room');
            return { success: false, error: error.message };
        }
    }
    
    async cancelRoom(roomId) {
        try {
            console.log('❌ Cancelling room:', roomId);
            
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            // Show loading
            this.showTransactionPending('Cancelling room...');
            
            // Cancel room transaction
            const tx = await this.contract.cancelPvPRoom(roomId);
            
            console.log('📝 Cancel room transaction sent:', tx.hash);
            this.showTransactionHash(tx.hash);
            
            // Wait for confirmation
            await tx.wait();
            
            // Reset state
            this.currentRoomId = null;
            this.isHost = false;
            
            this.hideTransactionPending();
            console.log('✅ Room cancelled successfully');
            
            return { success: true };
            
        } catch (error) {
            this.hideTransactionPending();
            console.error('❌ Cancel room error:', error);
            this.handleTransactionError(error, 'cancel room');
            return { success: false, error: error.message };
        }
    }
    
    // ==========================================
    // ROOM INFORMATION
    // ==========================================
    
    async getRoomInfo(roomId) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            console.log('🔍 Fetching room info from contract for room:', roomId);
            const roomData = await this.contract.getPvPRoom(roomId);
            
            // Parse and validate game time with detailed logging
            const rawGameTime = roomData[2];
            const gameTimeSeconds = Number(rawGameTime);
            const gameTimeMinutes = Math.floor(gameTimeSeconds / 60);
            
            console.log('🕐 DETAILED Room time parsing:', {
                roomId,
                rawGameTime: rawGameTime.toString(),
                rawGameTimeType: typeof rawGameTime,
                gameTimeSeconds,
                gameTimeMinutes,
                isValidSeconds: !isNaN(gameTimeSeconds),
                isValidMinutes: !isNaN(gameTimeMinutes),
                calculationCheck: `${gameTimeSeconds} / 60 = ${gameTimeSeconds / 60}`,
                floorResult: Math.floor(gameTimeSeconds / 60)
            });
            
            // КРИТИЧНО: Використовуємо Time Manager для консистентності
            let finalGameTimeMinutes = gameTimeMinutes;
            if (window.pvpTimeManager) {
                const timeData = window.pvpTimeManager.setRoomTime(roomId, gameTimeSeconds, 'contract_fetch', 'seconds');
                finalGameTimeMinutes = timeData.minutes;
                
                console.log('🕐 Time Manager processed contract time:', {
                    originalSeconds: gameTimeSeconds,
                    originalMinutes: gameTimeMinutes,
                    timeManagerResult: timeData
                });
            } else {
                // Fallback validation
                if (gameTimeMinutes <= 0) {
                    console.warn('⚠️ Invalid game time from contract, using fallback 2 minutes');
                    finalGameTimeMinutes = 2;
                }
            }
            
            const room = {
                id: roomId,
                host: roomData[0],
                entryFee: roomData[1],
                gameTime: gameTimeSeconds,
                players: roomData[3],
                isActive: roomData[4],
                gameStarted: roomData[5],
                maxPlayers: roomData[6],
                entryFeeFormatted: ethers.formatEther(roomData[1]),
                gameTimeMinutes: finalGameTimeMinutes,
                currentPlayers: roomData[3].length
            };
            
            console.log('✅ Final room info:', {
                roomId,
                gameTimeMinutes: room.gameTimeMinutes,
                gameTimeSeconds: room.gameTime,
                source: window.pvpTimeManager ? 'time_manager' : 'fallback'
            });
            
            return { success: true, room };
            
        } catch (error) {
            console.error('❌ Get room info error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getActiveRooms() {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            const activeRoomIds = await this.contract.getActiveRooms();
            const rooms = [];
            
            for (const roomId of activeRoomIds) {
                const roomInfo = await this.getRoomInfo(roomId.toString());
                if (roomInfo.success) {
                    rooms.push(roomInfo.room);
                }
            }
            
            return { success: true, rooms };
            
        } catch (error) {
            console.error('❌ Get active rooms error:', error);
            return { success: false, error: error.message };
        }
    }

    // New function to get room winner
    async getRoomWinner(roomId) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            console.log(`🏆 Getting room winner for: ${roomId}`);
            
            const winner = await this.contract.getRoomWinner(roomId);
            
            return {
                success: true,
                winner: {
                    address: winner[0],
                    score: Number(winner[1]),
                    nickname: winner[2]
                }
            };
            
        } catch (error) {
            console.error(`❌ Error getting room winner for ${roomId}:`, error);
            return { success: false, error: error.message };
        }
    }

    // New function to get player position in room
    async getPlayerRoomPosition(roomId, playerAddress) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            console.log(`📍 Getting player position for: ${playerAddress} in room ${roomId}`);
            
            const position = await this.contract.getPlayerRoomPosition(roomId, playerAddress);
            
            return {
                success: true,
                position: Number(position[0]), // 1-based position, 0 if not found
                score: Number(position[1])
            };
            
        } catch (error) {
            console.error(`❌ Error getting player position for ${playerAddress} in room ${roomId}:`, error);
            return { success: false, error: error.message };
        }
    }

    // New function to check submission status
    async checkAllScoresSubmitted(roomId) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            console.log(`📊 Checking submission status for room: ${roomId}`);
            
            const result = await this.contract.checkAllScoresSubmitted(roomId);
            
            return {
                success: true,
                allSubmitted: result[0],
                submittedCount: Number(result[1]),
                totalPlayers: Number(result[2])
            };
            
        } catch (error) {
            console.error(`❌ Error checking submission status for room ${roomId}:`, error);
            return { success: false, error: error.message };
        }
    }

    // New function to get room leaderboard count
    async getRoomLeaderboardCount(roomId) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            console.log(`📊 Getting leaderboard count for room: ${roomId}`);
            
            const count = await this.contract.getRoomLeaderboardCount(roomId);
            
            return {
                success: true,
                count: Number(count)
            };
            
        } catch (error) {
            console.error(`❌ Error getting leaderboard count for room ${roomId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // ==========================================
    // EVENT HANDLERS
    // ==========================================
    
    onRoomCreated(roomId, host, entryFee, gameTime) {
        // Update UI if needed
        if (window.updatePVPRoomsList) {
            window.updatePVPRoomsList();
        }
    }
    
    onPlayerJoined(roomId, player) {
        // Update room display if we're in this room
        if (this.currentRoomId === roomId && window.updateRoomPlayers) {
            window.updateRoomPlayers(roomId);
        }
    }
    
    async onGameStarted(roomId, host) {
        // Handle game start
        if (this.currentRoomId === roomId) {
            console.log('🎮 Our game started!');
            
            // КРИТИЧНО: Отримуємо свіжі дані з контракту для синхронізації
            console.log('🔄 Fetching fresh room data for game start synchronization...');
            const roomInfo = await this.getRoomInfo(roomId);
            
            if (roomInfo.success && window.startPVPGame) {
                const isHost = roomInfo.room.host.toLowerCase() === (await this.signer.getAddress()).toLowerCase();
                
                // ПОДВІЙНА ПЕРЕВІРКА: Використовуємо Time Manager для гарантії консистентності
                let gameTimeMinutes = 2; // default
                if (window.pvpTimeManager) {
                    // Спочатку встановлюємо час з отриманих даних кімнати
                    const roomTimeData = window.pvpTimeManager.setRoomTime(roomId, roomInfo.room.gameTimeMinutes, 'game_start_room', 'minutes');
                    
                    // Потім отримуємо прямо з контракту для подвійної перевірки
                    const contractTimeData = await window.pvpTimeManager.fetchAndCacheRoomTimeFromContract(roomId, this.contract);
                    
                    // Використовуємо час з контракту як найбільш надійний
                    gameTimeMinutes = contractTimeData.minutes;
                    
                    console.log('🕐 GAME START Time synchronization:', {
                        roomId,
                        roomDataTime: roomInfo.room.gameTimeMinutes,
                        roomTimeManagerResult: roomTimeData,
                        contractTimeManagerResult: contractTimeData,
                        finalTime: gameTimeMinutes
                    });
                } else {
                    // Fallback validation
                    const rawTime = roomInfo.room.gameTimeMinutes;
                    gameTimeMinutes = isNaN(rawTime) || rawTime <= 0 ? 2 : rawTime;
                    
                    console.log('🕐 GAME START Fallback validation:', {
                        roomId,
                        rawTime,
                        finalTime: gameTimeMinutes
                    });
                }
                
                console.log('🚀 Starting PVP game with synchronized time:', {
                    roomId,
                    gameTimeMinutes,
                    gameTimeSeconds: gameTimeMinutes * 60,
                    isHost,
                    timestamp: new Date().toISOString()
                });
                
                window.startPVPGame(roomId, gameTimeMinutes, isHost);
            }
        }
    }
    
    onGameFinished(roomId, winner, prize) {
        console.log('🚨 ON GAME FINISHED DEBUG:', {
            roomId,
            winner,
            prize,
            currentRoomId: this.currentRoomId,
            stackTrace: new Error().stack
        });
        
        // Handle game finish
        if (this.currentRoomId === roomId) {
            console.log('🏁 Our game finished!');
            if (window.showPVPGameResults) {
                console.log('🚨 DEBUG: Calling showPVPGameResults');
                window.showPVPGameResults(roomId, winner, prize);
            }
        }
    }
    
    // ==========================================
    // UI HELPER METHODS
    // ==========================================
    
    showTransactionPending(message) {
        console.log('⏳', message);
        if (window.showNotification) {
            window.showNotification(message, 'info');
        }
    }
    
    hideTransactionPending() {
        console.log('✅ Transaction completed');
    }
    
    showTransactionHash(hash) {
        console.log('📝 Transaction hash:', hash);
        if (window.showNotification) {
            window.showNotification(`Transaction: ${hash.substring(0, 10)}...`, 'info');
        }
    }
    
    handleTransactionError(error, action) {
        console.error(`❌ Error during ${action}:`, error);
        
        let errorMessage = `Failed to ${action}`;
        
        if (error.code === 4001) {
            errorMessage = 'Transaction was rejected by user';
        } else if (error.code === -32603) {
            errorMessage = 'Transaction failed - please try again';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        if (window.showNotification) {
            window.showNotification(errorMessage, 'error');
        }
    }
    
    // ==========================================
    // SERVER-CONTROLLED GAME FUNCTIONS
    // ==========================================
    
    // Send game results to server for processing (with database)
    async sendGameResultsToServer(roomId, playerScore) {
        try {
            console.log('📤 Sending game results to server (database):', { roomId, playerScore });
            
            if (!roomId || playerScore === undefined) {
                throw new Error('Invalid parameters for game results');
            }
            
            const userAddress = await this.signer.getAddress();
            const submissionKey = `${roomId}_${userAddress}`;
            
            // Check if already submitted
            if (!this.submissionCache) {
                this.submissionCache = new Map();
            }
            
            if (this.submissionCache.has(submissionKey)) {
                const cached = this.submissionCache.get(submissionKey);
                if (cached.score === playerScore) {
                    console.log('🔄 Result already submitted to server, returning cached response');
                    return cached.result;
                }
            }
            
            // Send to server endpoint (now stores in database)
            const response = await fetch('/api/pvp/submit-results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: roomId,
                    playerAddress: userAddress,
                    score: playerScore,
                    timestamp: Date.now()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Server response (database):', result);
            
            // Cache the successful result
            const finalResult = { success: true, result };
            this.submissionCache.set(submissionKey, {
                score: playerScore,
                result: finalResult,
                timestamp: Date.now()
            });
            
            return finalResult;
            
        } catch (error) {
            console.error('❌ Error sending results to server:', error);
            return { success: false, error: error.message };
        }
    }

    // Sync room creation with database
    async syncRoomWithDatabase(roomId, hostAddress, entryFee, gameTime, maxPlayers) {
        try {
            console.log('🔄 Syncing room with database:', { roomId, hostAddress, entryFee, gameTime, maxPlayers });
            
            const response = await fetch('/api/pvp/create-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId,
                    hostAddress,
                    entryFee,
                    gameTime,
                    maxPlayers
                })
            });
            
            if (!response.ok) {
                throw new Error(`Database sync error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Room synced with database:', result);
            
            return { success: true, result };
            
        } catch (error) {
            console.error('❌ Error syncing room with database:', error);
            return { success: false, error: error.message };
        }
    }

    // Sync player join with database
    async syncPlayerJoinWithDatabase(roomId, playerAddress) {
        try {
            console.log('🔄 Syncing player join with database:', { roomId, playerAddress });
            
            const response = await fetch('/api/pvp/join-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId,
                    playerAddress
                })
            });
            
            if (!response.ok) {
                throw new Error(`Database sync error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Player join synced with database:', result);
            
            return { success: true, result };
            
        } catch (error) {
            console.error('❌ Error syncing player join with database:', error);
            return { success: false, error: error.message };
        }
    }

    // Sync game start with database
    async syncGameStartWithDatabase(roomId) {
        try {
            console.log('🔄 Syncing game start with database:', { roomId });
            
            const response = await fetch('/api/pvp/start-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId
                })
            });
            
            if (!response.ok) {
                throw new Error(`Database sync error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Game start synced with database:', result);
            
            return { success: true, result };
            
        } catch (error) {
            console.error('❌ Error syncing game start with database:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Check if game is finished (database + blockchain)
    async checkGameFinished(roomId) {
        try {
            console.log('🔍 Checking game finished status for room:', roomId);
            
            // First check database status
            const response = await fetch(`/api/pvp/submission-status/${roomId}`);
            if (!response.ok) {
                throw new Error(`Database check error: ${response.status}`);
            }
            
            const dbStatus = await response.json();
            console.log('📊 Database status:', dbStatus);
            
            if (dbStatus.gameFinished) {
                // Game is finished in database, get results
                const resultsResponse = await fetch(`/api/pvp/results/${roomId}`);
                if (resultsResponse.ok) {
                    const resultsData = await resultsResponse.json();
                    
                    const finalScores = {};
                    resultsData.results.forEach(result => {
                        finalScores[result.player_address] = result.score;
                    });
                    
                    const winner = resultsData.results[0]?.player_address; // First result is winner (sorted by score DESC)
                    
                    return {
                        success: true,
                        finished: true,
                        winner,
                        finalScores,
                        blockchainSubmitted: dbStatus.blockchainSubmitted,
                        room: resultsData.room
                    };
                }
            }
            
            // If not finished in database, check blockchain as fallback
            if (this.contract) {
                try {
                    const isFinished = await this.contract.isGameFinished(roomId);
                    
                    if (isFinished) {
                        const winner = await this.contract.getRoomWinner(roomId);
                        const roomInfo = await this.getRoomInfo(roomId);
                        
                        if (roomInfo.success) {
                            const finalScores = {};
                            for (const player of roomInfo.room.players) {
                                try {
                                    const score = await this.contract.getRoomFinalScore(roomId, player);
                                    finalScores[player] = Number(score);
                                } catch (e) {
                                    console.warn(`Could not get final score for ${player}:`, e);
                                    finalScores[player] = 0;
                                }
                            }
                            
                            return {
                                success: true,
                                finished: true,
                                winner,
                                finalScores,
                                blockchainSubmitted: true,
                                room: roomInfo.room
                            };
                        }
                    }
                } catch (blockchainError) {
                    console.warn('⚠️ Blockchain check failed, using database only:', blockchainError.message);
                }
            }
            
            return { success: true, finished: false };
            
        } catch (error) {
            console.error('❌ Error checking game finished:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Get final score for a player in a room
    async getPlayerFinalScore(roomId, playerAddress) {
        try {
            if (!this.contract) {
                throw new Error('PVP system not initialized');
            }
            
            const score = await this.contract.getRoomFinalScore(roomId, playerAddress);
            return { success: true, score: Number(score) };
            
        } catch (error) {
            console.error('❌ Error getting player final score:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ==========================================
    // CLEANUP
    // ==========================================
    
    cleanup() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
        
        this.currentRoomId = null;
        this.isHost = false;
    }
}

// Export for use in other modules
window.IrysCrushPVP = IrysCrushPVP;

console.log('📦 PVP Core module loaded');