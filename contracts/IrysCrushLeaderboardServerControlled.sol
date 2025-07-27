// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title IrysCrushLeaderboard (Server-Controlled Version)
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
        bool gameFinished; // Нове поле - чи завершена гра сервером
        uint256 createdAt;
        uint256 maxPlayers;
        mapping(address => bool) hasJoined;
        address winner; // Переможець, встановлений сервером
        mapping(address => uint256) finalScores; // Фінальні рахунки від сервера
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
    
    /**
     * @dev Register a new player with nickname
     * @param _nickname The nickname for the player (3-15 characters)
     */
    function registerPlayer(string memory _nickname) 
        external 
        validNickname(_nickname) 
    {
        // Check if nickname is already taken by another player
        if (nicknameToAddress[_nickname] != address(0) && 
            nicknameToAddress[_nickname] != msg.sender) {
            revert NicknameAlreadyTaken();
        }
        
        // If player doesn't exist, add to playerAddresses array
        if (!players[msg.sender].exists) {
            playerAddresses.push(msg.sender);
        } else {
            // Remove old nickname mapping if changing nickname
            delete nicknameToAddress[players[msg.sender].nickname];
        }
        
        // Update player data
        players[msg.sender] = Player({
            nickname: _nickname,
            highScore: players[msg.sender].exists ? players[msg.sender].highScore : 0,
            gamesPlayed: players[msg.sender].exists ? players[msg.sender].gamesPlayed : 0,
            lastPlayed: players[msg.sender].exists ? players[msg.sender].lastPlayed : 0,
            exists: true
        });
        
        // Update nickname mapping
        nicknameToAddress[_nickname] = msg.sender;
        
        emit PlayerRegistered(msg.sender, _nickname);
    }
    
    /**
     * @dev Change player's nickname
     * @param _newNickname The new nickname (3-15 characters)
     */
    function changeNickname(string memory _newNickname) 
        external 
        onlyRegistered 
        validNickname(_newNickname) 
    {
        string memory currentNickname = players[msg.sender].nickname;
        
        // Check if it's the same nickname
        if (keccak256(bytes(currentNickname)) == keccak256(bytes(_newNickname))) {
            revert SameNickname();
        }
        
        // Check if new nickname is already taken
        if (nicknameToAddress[_newNickname] != address(0)) {
            revert NicknameAlreadyTaken();
        }
        
        // Remove old nickname mapping
        delete nicknameToAddress[currentNickname];
        
        // Update nickname
        players[msg.sender].nickname = _newNickname;
        nicknameToAddress[_newNickname] = msg.sender;
        
        emit NicknameChanged(msg.sender, currentNickname, _newNickname);
    }
    
    /**
     * @dev Submit a new score (only if it's better than current high score)
     * @param _score The new score to submit
     */
    function submitScore(uint256 _score) external onlyRegistered {
        Player storage player = players[msg.sender];
        
        if (_score <= player.highScore) {
            revert ScoreNotBetter();
        }
        
        uint256 oldScore = player.highScore;
        player.highScore = _score;
        player.gamesPlayed++;
        player.lastPlayed = block.timestamp;
        
        emit ScoreUpdated(msg.sender, _score, oldScore);
    }
    
    /**
     * @dev Get player data by address
     * @param _player The player's wallet address
     * @return nickname The player's nickname
     * @return highScore The player's highest score
     * @return gamesPlayed Total games played
     * @return lastPlayed Timestamp of last game
     */
    function getPlayer(address _player) 
        external 
        view 
        returns (
            string memory nickname,
            uint256 highScore,
            uint256 gamesPlayed,
            uint256 lastPlayed
        ) 
    {
        if (!players[_player].exists) {
            revert PlayerNotRegistered();
        }
        
        Player memory player = players[_player];
        return (player.nickname, player.highScore, player.gamesPlayed, player.lastPlayed);
    }
    
    /**
     * @dev Get leaderboard (top players sorted by score)
     * @param _limit Maximum number of players to return
     * @return addresses Array of player addresses
     * @return nicknames Array of player nicknames
     * @return scores Array of player high scores
     */
    function getLeaderboard(uint256 _limit) 
        external 
        view 
        returns (
            address[] memory addresses,
            string[] memory nicknames,
            uint256[] memory scores
        ) 
    {
        uint256 totalPlayers = playerAddresses.length;
        uint256 returnCount = _limit > totalPlayers ? totalPlayers : _limit;
        
        // Create arrays for sorting
        address[] memory sortedAddresses = new address[](totalPlayers);
        uint256[] memory sortedScores = new uint256[](totalPlayers);
        
        // Copy data for sorting
        for (uint256 i = 0; i < totalPlayers; i++) {
            sortedAddresses[i] = playerAddresses[i];
            sortedScores[i] = players[playerAddresses[i]].highScore;
        }
        
        // Simple bubble sort (descending order)
        for (uint256 i = 0; i < totalPlayers - 1; i++) {
            for (uint256 j = 0; j < totalPlayers - i - 1; j++) {
                if (sortedScores[j] < sortedScores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = sortedScores[j];
                    sortedScores[j] = sortedScores[j + 1];
                    sortedScores[j + 1] = tempScore;
                    
                    // Swap addresses
                    address tempAddress = sortedAddresses[j];
                    sortedAddresses[j] = sortedAddresses[j + 1];
                    sortedAddresses[j + 1] = tempAddress;
                }
            }
        }
        
        // Prepare return arrays
        addresses = new address[](returnCount);
        nicknames = new string[](returnCount);
        scores = new uint256[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            addresses[i] = sortedAddresses[i];
            nicknames[i] = players[sortedAddresses[i]].nickname;
            scores[i] = sortedScores[i];
        }
    }
    
    /**
     * @dev Get total number of registered players
     * @return The total number of players
     */
    function getTotalPlayers() external view returns (uint256) {
        return playerAddresses.length;
    }
    
    /**
     * @dev Check if a nickname is available
     * @param _nickname The nickname to check
     * @return true if available, false if taken
     */
    function isNicknameAvailable(string memory _nickname) external view returns (bool) {
        return nicknameToAddress[_nickname] == address(0);
    }
    
    /**
     * @dev Check if a player is registered
     * @param _player The player's address
     * @return true if registered, false otherwise
     */
    function isPlayerRegistered(address _player) external view returns (bool) {
        return players[_player].exists;
    }
    
    // ==================== PvP FUNCTIONS ====================
    
    /**
     * @dev Create a new PvP room (Transaction 1 for host - no payment)
     * @param _entryFee Entry fee in wei for joining the room
     * @param _gameTime Game duration in seconds
     * @param _maxPlayers Maximum number of players (2-8)
     */
    function createPvPRoom(uint256 _entryFee, uint256 _gameTime, uint256 _maxPlayers) 
        external 
        onlyRegistered 
    {
        if (_entryFee == 0) revert InvalidEntryFee();
        if (_gameTime < 60 || _gameTime > 3600) revert InvalidGameTime(); // 1 min to 1 hour
        if (_maxPlayers < 2 || _maxPlayers > 8) revert InvalidMaxPlayers();
        if (playerCurrentRoom[msg.sender] != 0) revert AlreadyInRoom();
        
        uint256 roomId = nextRoomId++;
        
        PvPRoom storage room = pvpRooms[roomId];
        room.roomId = roomId;
        room.host = msg.sender;
        room.entryFee = _entryFee;
        room.gameTime = _gameTime;
        room.isActive = true;
        room.gameStarted = false;
        room.gameFinished = false;
        room.createdAt = block.timestamp;
        room.maxPlayers = _maxPlayers;
        
        activeRoomIds.push(roomId);
        
        emit RoomCreated(roomId, msg.sender, _entryFee, _gameTime);
    }    /**

     * @dev Join an existing PvP room (Transaction 2 for host, Transaction 1 for other players)
     * @param _roomId The ID of the room to join
     */
    function joinPvPRoom(uint256 _roomId) 
        external 
        onlyRegistered 
        payable 
    {
        PvPRoom storage room = pvpRooms[_roomId];
        
        if (room.roomId == 0) revert RoomNotFound();
        if (!room.isActive) revert RoomNotActive();
        if (room.gameStarted) revert GameAlreadyStarted();
        if (room.players.length >= room.maxPlayers) revert RoomFull();
        if (room.hasJoined[msg.sender]) revert AlreadyInRoom();
        if (playerCurrentRoom[msg.sender] != 0) revert AlreadyInRoom();
        if (msg.value != room.entryFee) revert InsufficientFee();
        
        room.players.push(msg.sender);
        room.hasJoined[msg.sender] = true;
        playerCurrentRoom[msg.sender] = _roomId;
        
        emit PlayerJoinedRoom(_roomId, msg.sender);
    }
    
    /**
     * @dev Start the PvP game (Transaction 3 for host only)
     * @param _roomId The ID of the room to start
     */
    function startPvPGame(uint256 _roomId) 
        external 
        onlyRegistered 
    {
        PvPRoom storage room = pvpRooms[_roomId];
        
        if (room.roomId == 0) revert RoomNotFound();
        if (msg.sender != room.host) revert NotRoomHost();
        if (!room.isActive) revert RoomNotActive();
        if (room.gameStarted) revert GameAlreadyStarted();
        if (!room.hasJoined[msg.sender]) revert PlayerNotRegistered(); // Host must join first
        if (room.players.length < 2) revert NotEnoughPlayers();
        
        room.gameStarted = true;
        
        emit GameStarted(_roomId, msg.sender);
    }
    
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
        uint256 actualPrize;
        
        // ✅ FIX 3: Handle case where host is winner
        if (winner == room.host) {
            // Host wins everything (no separate host fee)
            actualPrize = totalPrize;
            if (totalPrize > 0) {
                payable(winner).transfer(totalPrize);
            }
        } else {
            // Normal case: separate host fee and winner prize
            uint256 hostFee = totalPrize * 5 / 100; // 5% for host
            uint256 winnerPrize = totalPrize - hostFee;
            actualPrize = winnerPrize;
            
            // Transfer prizes
            if (winnerPrize > 0) {
                payable(winner).transfer(winnerPrize);
            }
            if (hostFee > 0) {
                payable(room.host).transfer(hostFee);
            }
        }
        
        // Clear player states for all players (автоматичне від'єднання)
        for (uint256 i = 0; i < room.players.length; i++) {
            address player = room.players[i];
            playerCurrentRoom[player] = 0;
            room.hasJoined[player] = false; // Від'єднуємо від кімнати
        }
        
        // Remove from active rooms
        _removeFromActiveRooms(_roomId);
        
        emit GameFinished(_roomId, winner, actualPrize);
    }
    
    /**
     * @dev Leave a PvP room (before game starts)
     * @param _roomId The ID of the room to leave
     */
    function leavePvPRoom(uint256 _roomId) 
        external 
        onlyRegistered 
    {
        PvPRoom storage room = pvpRooms[_roomId];
        
        if (room.roomId == 0) revert RoomNotFound();
        if (!room.hasJoined[msg.sender]) revert PlayerNotRegistered();
        if (room.gameStarted) revert GameAlreadyStarted();
        
        // Refund entry fee
        payable(msg.sender).transfer(room.entryFee);
        
        // Remove player from room mappings
        room.hasJoined[msg.sender] = false;
        playerCurrentRoom[msg.sender] = 0;
        
        // Remove from players array
        for (uint256 i = 0; i < room.players.length; i++) {
            if (room.players[i] == msg.sender) {
                // Move last player to this position
                room.players[i] = room.players[room.players.length - 1];
                room.players.pop();
                break;
            }
        }
        
        // If host leaves, deactivate room
        if (msg.sender == room.host) {
            room.isActive = false;
            _removeFromActiveRooms(_roomId);
            
            // Refund all remaining players
            for (uint256 i = 0; i < room.players.length; i++) {
                address player = room.players[i];
                payable(player).transfer(room.entryFee);
                playerCurrentRoom[player] = 0;
                room.hasJoined[player] = false;
            }
        }
    }
    
    /**
     * @dev Get PvP room information
     * @param _roomId The ID of the room
     * @return host Host address
     * @return entryFee Entry fee in wei
     * @return gameTime Game duration
     * @return roomPlayers Array of player addresses
     * @return isActive Room status
     * @return gameStarted Game status
     * @return maxPlayers Maximum players
     */
    function getPvPRoom(uint256 _roomId) 
        external 
        view 
        returns (
            address host,
            uint256 entryFee,
            uint256 gameTime,
            address[] memory roomPlayers,
            bool isActive,
            bool gameStarted,
            uint256 maxPlayers
        ) 
    {
        PvPRoom storage room = pvpRooms[_roomId];
        if (room.roomId == 0) revert RoomNotFound();
        
        return (
            room.host,
            room.entryFee,
            room.gameTime,
            room.players,
            room.isActive,
            room.gameStarted,
            room.maxPlayers
        );
    }
    
    /**
     * @dev Get all active room IDs (with validation)
     * @return Array of active room IDs
     */
    function getActiveRooms() external view returns (uint256[] memory) {
        uint256[] memory validRooms = new uint256[](activeRoomIds.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < activeRoomIds.length; i++) {
            uint256 roomId = activeRoomIds[i];
            if (roomId != 0 && pvpRooms[roomId].roomId != 0 && pvpRooms[roomId].isActive) {
                validRooms[validCount] = roomId;
                validCount++;
            }
        }
        
        // Create array with exact size
        uint256[] memory result = new uint256[](validCount);
        for (uint256 i = 0; i < validCount; i++) {
            result[i] = validRooms[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get count of active rooms
     * @return Number of active rooms
     */
    function getActiveRoomsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeRoomIds.length; i++) {
            uint256 roomId = activeRoomIds[i];
            if (roomId != 0 && pvpRooms[roomId].roomId != 0 && pvpRooms[roomId].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Check if a room is active
     * @param _roomId Room ID to check
     * @return True if room is active
     */
    function isRoomActive(uint256 _roomId) external view returns (bool) {
        return _roomId != 0 && 
               pvpRooms[_roomId].roomId != 0 && 
               pvpRooms[_roomId].isActive;
    }
    
    /**
     * @dev Set new game server address (only owner)
     * @param _newGameServer New game server address
     */
    function setGameServer(address _newGameServer) external onlyOwner {
        require(_newGameServer != address(0), "Invalid game server address");
        gameServer = _newGameServer;
    }
    
    /**
     * @dev Get room final scores (after game finished)
     * @param _roomId Room ID
     * @param _player Player address
     * @return Final score for the player in this room
     */
    function getRoomFinalScore(uint256 _roomId, address _player) external view returns (uint256) {
        return pvpRooms[_roomId].finalScores[_player];
    }
    
    /**
     * @dev Get room winner (after game finished)
     * @param _roomId Room ID
     * @return Winner address
     */
    function getRoomWinner(uint256 _roomId) external view returns (address) {
        return pvpRooms[_roomId].winner;
    }
    
    /**
     * @dev Check if game is finished
     * @param _roomId Room ID
     * @return True if game is finished
     */
    function isGameFinished(uint256 _roomId) external view returns (bool) {
        return pvpRooms[_roomId].gameFinished;
    }
    
    /**
     * @dev Internal function to remove room from active rooms array
     * @param _roomId Room ID to remove
     */
    function _removeFromActiveRooms(uint256 _roomId) internal {
        for (uint256 i = 0; i < activeRoomIds.length; i++) {
            if (activeRoomIds[i] == _roomId) {
                activeRoomIds[i] = activeRoomIds[activeRoomIds.length - 1];
                activeRoomIds.pop();
                return;
            }
        }
    }
    
    /**
     * @dev Clean up inactive rooms from activeRoomIds array
     */
    function cleanupInactiveRooms() external {
        uint256 writeIndex = 0;
        
        // Compact array by moving active rooms to the front
        for (uint256 readIndex = 0; readIndex < activeRoomIds.length; readIndex++) {
            uint256 roomId = activeRoomIds[readIndex];
            if (roomId != 0 && pvpRooms[roomId].roomId != 0 && pvpRooms[roomId].isActive) {
                if (writeIndex != readIndex) {
                    activeRoomIds[writeIndex] = roomId;
                }
                writeIndex++;
            }
        }
        
        // Remove excess elements
        while (activeRoomIds.length > writeIndex) {
            activeRoomIds.pop();
        }
    }
    
    /**
     * @dev Emergency function to cancel a room (only host)
     * @param _roomId Room ID to cancel
     */
    function cancelPvPRoom(uint256 _roomId) 
        external 
        onlyRegistered 
    {
        PvPRoom storage room = pvpRooms[_roomId];
        
        if (room.roomId == 0) revert RoomNotFound();
        if (msg.sender != room.host) revert NotRoomHost();
        if (room.gameStarted) revert GameAlreadyStarted();
        
        // Refund all players
        for (uint256 i = 0; i < room.players.length; i++) {
            address player = room.players[i];
            payable(player).transfer(room.entryFee);
            playerCurrentRoom[player] = 0;
            room.hasJoined[player] = false;
        }
        
        room.isActive = false;
        _removeFromActiveRooms(_roomId);
    }
}