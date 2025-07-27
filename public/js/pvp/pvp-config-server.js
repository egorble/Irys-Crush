// ==========================================
// SERVER-CONTROLLED PVP CONFIGURATION MODULE
// ==========================================

// Load configuration for server-controlled system
function loadServerPVPConfig() {
    console.log('📋 Loading Server-Controlled PVP configuration...');

    // Load from deployment file
    let contractAddress = '0xB028878469af81683616F0D0a36eaC30cfeA5bfA'; // Default from deployment
    
    try {
        // Try to load from deployment file if available
        const deploymentInfo = require('../../../deployment-server-controlled.json');
        contractAddress = deploymentInfo.contractAddress;
    } catch (error) {
        console.log('Using default contract address');
    }

    const config = {
        CONTRACT_ADDRESS: contractAddress,
        CHAIN_ID: 1270,
        RPC_URL: 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
        NETWORK_NAME: 'Irys Testnet',
        SERVER_URL: 'http://localhost:3001' // URL сервера PvP
    };

    console.log('✅ Server PVP config loaded:', config);
    return Promise.resolve(config);
}

// Server-Controlled Contract ABI (БЕЗ старих функцій подання результатів)
const SERVER_PVP_CONTRACT_ABI = [
    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    "constructor(address _gameServer)",

    // ==========================================
    // PLAYER REGISTRATION FUNCTIONS
    // ==========================================
    "function registerPlayer(string memory _nickname)",
    "function changeNickname(string memory _newNickname)", 
    "function submitScore(uint256 _score)",
    "function getPlayer(address _player) view returns (string memory nickname, uint256 highScore, uint256 gamesPlayed, uint256 lastPlayed)",
    "function getLeaderboard(uint256 _limit) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores)",
    "function getTotalPlayers() view returns (uint256)",
    "function isNicknameAvailable(string memory _nickname) view returns (bool)",
    "function isPlayerRegistered(address _player) view returns (bool)",

    // ==========================================
    // PVP ROOM MANAGEMENT FUNCTIONS
    // ==========================================
    "function createPvPRoom(uint256 _entryFee, uint256 _gameTime, uint256 _maxPlayers)",
    "function joinPvPRoom(uint256 _roomId) payable",
    "function startPvPGame(uint256 _roomId)",
    "function leavePvPRoom(uint256 _roomId)",
    "function cancelPvPRoom(uint256 _roomId)",

    // ==========================================
    // SERVER-ONLY FUNCTIONS (НОВІ!)
    // ==========================================
    "function submitGameResults(uint256 _roomId, address[] memory _players, uint256[] memory _scores, address _winner)",
    "function setGameServer(address _newGameServer)",

    // ==========================================
    // ROOM QUERY FUNCTIONS
    // ==========================================
    "function getActiveRooms() view returns (uint256[] memory)",
    "function getActiveRoomsCount() view returns (uint256)",
    "function isRoomActive(uint256 _roomId) view returns (bool)",
    "function nextRoomId() view returns (uint256)",
    "function getPvPRoom(uint256 _roomId) view returns (address host, uint256 entryFee, uint256 gameTime, address[] memory roomPlayers, bool isActive, bool gameStarted, uint256 maxPlayers)",

    // ==========================================
    // NEW SERVER-CONTROLLED QUERY FUNCTIONS
    // ==========================================
    "function getRoomFinalScore(uint256 _roomId, address _player) view returns (uint256)",
    "function getRoomWinner(uint256 _roomId) view returns (address)",
    "function isGameFinished(uint256 _roomId) view returns (bool)",
    "function gameServer() view returns (address)",
    "function owner() view returns (address)",

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    "function cleanupInactiveRooms()",

    // ==========================================
    // EVENTS
    // ==========================================
    "event PlayerRegistered(address indexed player, string nickname)",
    "event NicknameChanged(address indexed player, string oldNickname, string newNickname)",
    "event ScoreUpdated(address indexed player, uint256 newScore, uint256 oldScore)",
    "event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameTime)",
    "event PlayerJoinedRoom(uint256 indexed roomId, address indexed player)",
    "event GameStarted(uint256 indexed roomId, address indexed host)",
    "event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prize)",
    "event PvPGameFinished(uint256 indexed roomId, address indexed winner)"
];

// Server API Helper Class
class ServerPVPAPI {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
    }

    async startGame(roomId, players) {
        const response = await fetch(`${this.serverUrl}/api/pvp/start-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, players })
        });
        return await response.json();
    }

    async updateScore(roomId, playerAddress, score) {
        const response = await fetch(`${this.serverUrl}/api/pvp/update-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerAddress, score })
        });
        return await response.json();
    }

    async finishPlayer(roomId, playerAddress, finalScore) {
        const response = await fetch(`${this.serverUrl}/api/pvp/finish-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerAddress, finalScore })
        });
        return await response.json();
    }

    async getGameStatus(roomId) {
        const response = await fetch(`${this.serverUrl}/api/pvp/game-status/${roomId}`);
        return await response.json();
    }

    async getActiveGames() {
        const response = await fetch(`${this.serverUrl}/api/pvp/active-games`);
        return await response.json();
    }

    async forceFinishGame(roomId) {
        const response = await fetch(`${this.serverUrl}/api/pvp/force-finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId })
        });
        return await response.json();
    }

    async emergencyStop(roomId) {
        const response = await fetch(`${this.serverUrl}/api/pvp/emergency-stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId })
        });
        return await response.json();
    }

    async healthCheck() {
        const response = await fetch(`${this.serverUrl}/api/health`);
        return await response.json();
    }
}

// PVP Constants (same as before but updated for server system)
const SERVER_PVP_CONSTANTS = {
    MIN_ENTRY_FEE: 0.01,
    MAX_ENTRY_FEE: 10,
    MIN_GAME_DURATION: 1, // minutes
    MAX_GAME_DURATION: 60, // minutes
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    CACHE_DURATION: 30000, // 30 seconds
    SCORE_UPDATE_INTERVAL: 1000, // 1 second (більш часто для серверної системи)
    GAME_STATUS_CHECK_INTERVAL: 2000, // 2 seconds
    HOST_FEE_PERCENT: 5 // 5% host fee
};

// Game Flow Helper
class ServerPVPGameFlow {
    constructor(contract, serverAPI, roomId, playerAddress) {
        this.contract = contract;
        this.serverAPI = serverAPI;
        this.roomId = roomId;
        this.playerAddress = playerAddress;
        this.gameStarted = false;
        this.gameFinished = false;
        this.currentScore = 0;
    }

    async startServerSession(players) {
        console.log(`🎮 Starting server session for room ${this.roomId}`);
        const result = await this.serverAPI.startGame(this.roomId, players);
        if (result.success) {
            this.gameStarted = true;
            console.log('✅ Server session started');
        }
        return result;
    }

    async updateScore(score) {
        if (!this.gameStarted || this.gameFinished) return;
        
        if (score > this.currentScore) {
            this.currentScore = score;
            await this.serverAPI.updateScore(this.roomId, this.playerAddress, score);
            console.log(`📊 Score updated: ${score}`);
        }
    }

    async finishGame(finalScore) {
        if (this.gameFinished) return;
        
        this.gameFinished = true;
        const result = await this.serverAPI.finishPlayer(this.roomId, this.playerAddress, finalScore);
        console.log(`🏁 Game finished with score: ${finalScore}`);
        return result;
    }

    async getStatus() {
        return await this.serverAPI.getGameStatus(this.roomId);
    }
}

// Export to global scope
window.loadServerPVPConfig = loadServerPVPConfig;
window.SERVER_PVP_CONTRACT_ABI = SERVER_PVP_CONTRACT_ABI;
window.SERVER_PVP_CONSTANTS = SERVER_PVP_CONSTANTS;
window.ServerPVPAPI = ServerPVPAPI;
window.ServerPVPGameFlow = ServerPVPGameFlow;

console.log('📦 Server-Controlled PVP Config module loaded');

// Auto-initialize API when config is loaded
loadServerPVPConfig().then(config => {
    window.serverPVPAPI = new ServerPVPAPI(config.SERVER_URL);
    console.log('🔗 Server PVP API initialized');
});