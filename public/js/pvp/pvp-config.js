// ==========================================
// PVP CONFIGURATION MODULE
// ==========================================

// Load configuration from server (since frontend can't access .env directly)
async function loadPVPConfig() {
    console.log('📋 Loading PVP configuration from server...');

    try {
        const response = await fetch('/blockchain-info');
        if (response.ok) {
            const data = await response.json();
            
            const config = {
                CONTRACT_ADDRESS: data.contractAddress,
                CHAIN_ID: 1270,
                RPC_URL: data.rpcUrl || 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
                NETWORK_NAME: 'Irys Testnet'
            };

            console.log('✅ PVP config loaded from server:', config);
            return config;
        } else {
            throw new Error('Failed to load config from server');
        }
    } catch (error) {
        console.error('❌ Error loading config from server:', error);
        
        // Fallback to environment variable if available
        const fallbackConfig = {
            CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '0x632Ee035D90256bdD85b344a1c4F6284e8503306',
            CHAIN_ID: 1270,
            RPC_URL: 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
            NETWORK_NAME: 'Irys Testnet'
        };
        
        console.log('⚠️ Using fallback config:', fallbackConfig);
        return fallbackConfig;
    }
}

// Contract ABI (Server-Controlled Version - відповідає IrysCrushLeaderboardServerControlled.sol)
const PVP_CONTRACT_ABI = [
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
    // PVP ROOM MANAGEMENT FUNCTIONS (Server-Controlled)
    // ==========================================
    "function createPvPRoom(uint256 _entryFee, uint256 _gameTime, uint256 _maxPlayers)",
    "function joinPvPRoom(uint256 _roomId) payable",
    "function startPvPGame(uint256 _roomId)",
    "function leavePvPRoom(uint256 _roomId)",
    "function cancelPvPRoom(uint256 _roomId)",

    // ==========================================
    // SERVER GAME RESULT FUNCTIONS (КРИТИЧНО!)
    // ==========================================
    "function submitGameResults(uint256 _roomId, address[] memory _players, uint256[] memory _scores, address _winner)",

    // ==========================================
    // ROOM QUERY FUNCTIONS
    // ==========================================
    "function getActiveRooms() view returns (uint256[] memory)",
    "function getActiveRoomsCount() view returns (uint256)",
    "function isRoomActive(uint256 _roomId) view returns (bool)",
    "function nextRoomId() view returns (uint256)",
    "function getPvPRoom(uint256 _roomId) view returns (address host, uint256 entryFee, uint256 gameTime, address[] memory roomPlayers, bool isActive, bool gameStarted, uint256 maxPlayers)",
    "function playerCurrentRoom(address) view returns (uint256)",

    // ==========================================
    // ROOM RESULTS FUNCTIONS (Server-Controlled)
    // ==========================================
    "function getRoomFinalScore(uint256 _roomId, address _player) view returns (uint256)",
    "function getRoomWinner(uint256 _roomId) view returns (address)",
    "function isGameFinished(uint256 _roomId) view returns (bool)",

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================
    "function cleanupInactiveRooms()",

    // ==========================================
    // OWNER/SERVER FUNCTIONS
    // ==========================================
    "function setGameServer(address _newGameServer)",
    "function gameServer() view returns (address)",
    "function owner() view returns (address)",

    // ==========================================
    // EVENTS (КРИТИЧНО для правильної роботи!)
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

// PVP Constants (based on smart contract limits)
const PVP_CONSTANTS = {
    MIN_ENTRY_FEE: 0.01,
    MAX_ENTRY_FEE: 10,
    MIN_GAME_DURATION: 1, // minutes (converted to 60s in contract)
    MAX_GAME_DURATION: 60, // minutes (converted to 3600s in contract)
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8, // contract allows up to 8
    CACHE_DURATION: 30000, // 30 seconds
    LEADERBOARD_UPDATE_INTERVAL: 5000, // 5 seconds
    ROOMS_UPDATE_INTERVAL: 10000, // 10 seconds
    HOST_FEE_PERCENT: 5 // 5% host fee from contract
};

// Export to global scope
window.loadPVPConfig = loadPVPConfig;
window.PVP_CONTRACT_ABI = PVP_CONTRACT_ABI;
window.PVP_CONSTANTS = PVP_CONSTANTS;

console.log('📦 PVP Config module loaded');