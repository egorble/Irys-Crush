// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IrysCrushLeaderboard (Server-Controlled Version - FIXED)
 * @dev Smart contract for managing IrysCrush game leaderboard with server-controlled PvP
 */
contract IrysCrushLeaderboard {
    
    struct Player {
        string nickname;
        uint256 highScore;
        uint256 gamesPlayed;
        uint256 lastPlayed;
        bool exists;
    }
    
    struct PvPRoom {
        uint256 roomId;
        address host;
        uint256 entryFee;
        uint256 gameTime;
        address[] players;
        bool isActive;
        bool gameStarted;
        bool gameFinished;
        uint256 createdAt;
        uint256 maxPlayers;
        mapping(address => bool) hasJoined;
        address winner;
        mapping(address => uint256) finalScores;
    }
    
    // Mapping from wallet address to player data
    mapping(address => Player) public players;
    
    // Mapping from nickname to wallet address (for uniqueness)
    mapping(string => address) public nicknameToAddress;
    
    // Array to store all player addresses for leaderboard iteration
    address[] public playerAddresses;
    
    // PvP Room mappings
    mapping(uint256 => PvPRoom) public pvpRooms;
    mapping(address => uint256) public playerCurrentRoom;
    uint256 public nextRoomId = 1;
    uint256[] public activeRoomIds;
    
    // Game server (головний гаманець з .env)
    address public gameServer;
    address public owner;
    
    // Events
    event PlayerRegistered(address indexed player, string nickname);
    event NicknameChanged(address indexed player, string oldNickname, string newNickname);
    event ScoreUpdated(address indexed player, uint256 newScore, uint256 oldScore);
    
    // PvP Events
    event RoomCreated(uint256 indexed roomId, address indexed host, uint256 entryFee, uint256 gameTime);
    event PlayerJoinedRoom(uint256 indexed roomId, address indexed player);
    event GameStarted(uint256 indexed roomId, address indexed host);
    event GameFinished(uint256 indexed roomId, address indexed winner, uint256 prize);
    event PvPGameFinished(uint256 indexed roomId, address indexed winner);
    
    // Errors
    error NicknameAlreadyTaken();
    error PlayerNotRegistered();
    error InvalidNickname();
    error ScoreNotBetter();
    error SameNickname();
    
    // PvP Errors
    error RoomNotFound();
    error RoomFull();
    error InsufficientFee();
    error AlreadyInRoom();
    error NotRoomHost();
    error GameAlreadyStarted();
    error NotEnoughPlayers();
    error RoomNotActive();
    error InvalidGameTime();
    error InvalidEntryFee();
    error InvalidMaxPlayers();
    error GameAlreadyFinished();
    error ArrayLengthMismatch();
    error EmptyPlayersArray();
    error TooManyPlayers();
    error DuplicatePlayer();
    error WinnerNotInPlayers();
    
    modifier onlyRegistered() {
        if (!players[msg.sender].exists) {
            revert PlayerNotRegistered();
        }
        _;
    }
    
    modifier validNickname(string memory _nickname) {
        bytes memory nicknameBytes = bytes(_nickname);
        if (nicknameBytes.length < 3 || nicknameBytes.length > 15) {
            revert InvalidNickname();
        }
        _;
    }
    
    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Only game server can call this");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor(address _gameServer) {
        owner = msg.sender;
        gameServer = _gameServer;
    }

    // ... (інші функції залишаються без змін до submitGameResults)

    /**
     * @dev Submit game results from server (ONLY GAME SERVER) - FIXED VERSION
     * @param _roomId Room ID
     * @param _players Array of player addresses
     * @param _scores Array of corresponding scores
     * @param _winner Address of the winner
     */
    function submitGameResults(
        uint256 _roomId,
        address[] memory _players,
        uint256[] memory _scores,
        address _winner
    ) external onlyGameServer {
        PvPRoom storage room = pvpRooms[_roomId];
        
        // Basic validations
        if (room.roomId == 0) revert RoomNotFound();
        if (!room.gameStarted) revert RoomNotActive();
        if (room.gameFinished) revert GameAlreadyFinished();
        if (_players.length != _scores.length) revert ArrayLengthMismatch();
        if (_players.length == 0) revert EmptyPlayersArray();
        if (_players.length > room.maxPlayers) revert TooManyPlayers();
        
        // ✅ FIX 1: Check for duplicate players in array
        for (uint256 i = 0; i < _players.length; i++) {
            for (uint256 j = i + 1; j < _players.length; j++) {
                if (_players[i] == _players[j]) {
                    revert DuplicatePlayer();
                }
            }
        }
        
        // Перевіряємо, що всі гравці дійсно в кімнаті
        for (uint256 i = 0; i < _players.length; i++) {
            if (!room.hasJoined[_players[i]]) revert PlayerNotRegistered();
        }
        
        // Перевіряємо, що переможець в списку гравців
        bool winnerFound = false;
        for (uint256 i = 0; i < _players.length; i++) {
            if (_players[i] == _winner) {
                winnerFound = true;
                break;
            }
        }
        if (!winnerFound) revert WinnerNotInPlayers();
        
        // ✅ FIX 2: Correctly update global scores with proper event emission
        for (uint256 i = 0; i < _players.length; i++) {
            room.finalScores[_players[i]] = _scores[i];
            
            // Оновлюємо глобальний рахунок якщо кращий
            uint256 oldScore = players[_players[i]].highScore;
            if (_scores[i] > oldScore) {
                players[_players[i]].highScore = _scores[i];
                players[_players[i]].gamesPlayed++;
                players[_players[i]].lastPlayed = block.timestamp;
                emit ScoreUpdated(_players[i], _scores[i], oldScore); // ✅ FIXED: correct old score
            }
        }
        
        // Встановлюємо переможця та завершуємо гру
        room.winner = _winner;
        room.gameFinished = true;
        room.isActive = false;
        room.gameStarted = false;
        
        // Розподіляємо призи
        _distributeServerRewards(_roomId);
        
        emit PvPGameFinished(_roomId, _winner);
    }
    
    /**
     * @dev Internal function to distribute rewards when server finishes game - FIXED VERSION
     * @param _roomId The room ID
     */
    function _distributeServerRewards(uint256 _roomId) internal {
        PvPRoom storage room = pvpRooms[_roomId];
        
        address winner = room.winner;
        
        // If no winner set, host gets the prize
        if (winner == address(0)) {
            winner = room.host;
        }
        
        // Calculate prizes based on total players
        uint256 totalPrize = room.entryFee * room.players.length;
        
        // ✅ FIX 3: Handle case where host is winner
        if (winner == room.host) {
            // Host wins everything (no separate host fee)
            if (totalPrize > 0) {
                payable(winner).transfer(totalPrize);
            }
        } else {
            // Normal case: separate host fee and winner prize
            uint256 hostFee = totalPrize * 5 / 100; // 5% for host
            uint256 winnerPrize = totalPrize - hostFee;
            
            // Transfer prizes
            if (winnerPrize > 0) {
                payable(winner).transfer(winnerPrize);
            }
            if (hostFee > 0) {
                payable(room.host).transfer(hostFee);
            }
        }
        
        // Clear player states for all players
        for (uint256 i = 0; i < room.players.length; i++) {
            address player = room.players[i];
            playerCurrentRoom[player] = 0;
            room.hasJoined[player] = false;
        }
        
        // Remove from active rooms
        _removeFromActiveRooms(_roomId);
        
        emit GameFinished(_roomId, winner, winner == room.host ? totalPrize : totalPrize - (totalPrize * 5 / 100));
    }

    // ... (решта функцій залишаються без змін)
}