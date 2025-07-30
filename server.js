const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { ethers } = require('ethers');
require('dotenv').config();

// PvP system now works entirely client-side through smart contract
// No server-side PvP manager needed

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Cache-busting middleware for static files
app.use((req, res, next) => {
  // Додаємо заголовки для запобігання кешуванню HTML та API
  if (req.path.endsWith('.html') || req.path === '/' || req.path.startsWith('/api') ||
    req.path.startsWith('/player') || req.path.startsWith('/leaderboard') ||
    req.path.startsWith('/nickname') || req.path.startsWith('/register') ||
    req.path.startsWith('/submit') || req.path.startsWith('/check') ||
    req.path.startsWith('/claim') || req.path.startsWith('/distribution')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Короткий кеш для CSS/JS файлів
  if (req.path.endsWith('.css') || req.path.endsWith('.js')) {
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate'); // 5 хвилин
    res.setHeader('Last-Modified', new Date().toUTCString());
  }

  // Помірний кеш для зображень
  if (req.path.match(/\.(png|jpg|jpeg|gif|ico|svg|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день
  }

  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Blockchain configuration
const IRYS_RPC_URL = process.env.IRYS_RPC_URL || 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x40fEaf2a414FE87F969490a82050E425F6D033Bc';
console.log('🔍 SERVER STARTUP: CONTRACT_ADDRESS =', CONTRACT_ADDRESS);

// Contract ABI
const CONTRACT_ABI = [
  // Read functions
  "function getPlayer(address _player) view returns (string memory nickname, uint256 highScore, uint256 gamesPlayed, uint256 lastPlayed)",
  "function getLeaderboard(uint256 _limit) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores)",
  "function isPlayerRegistered(address _player) view returns (bool)",
  "function isNicknameAvailable(string memory _nickname) view returns (bool)",
  "function getTotalPlayers() view returns (uint256)",

  // Write functions
  "function registerPlayer(string memory _nickname)",
  "function changeNickname(string memory _newNickname)",
  "function submitScore(uint256 _score)",

  // Events
  "event PlayerRegistered(address indexed player, string nickname)",
  "event NicknameChanged(address indexed player, string oldNickname, string newNickname)",
  "event ScoreUpdated(address indexed player, uint256 newScore, uint256 oldScore)"
];

// Initialize provider
let provider;
let contract;

try {
  provider = new ethers.JsonRpcProvider(IRYS_RPC_URL);
  if (CONTRACT_ADDRESS) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    console.log(`✅ Connected to Irys blockchain at ${IRYS_RPC_URL}`);
    console.log(`📄 Contract address: ${CONTRACT_ADDRESS}`);
  } else {
    console.log('⚠️  CONTRACT_ADDRESS not set in environment variables');
  }
} catch (error) {
  console.error('❌ Failed to connect to Irys blockchain:', error.message);
}

// Utility function to get contract with signer
// ❌ REMOVED: getContractWithSigner function that used private keys
// All contract interactions are now handled client-side through MetaMask

// API Routes

// ============ API ROUTES ============

// Get player info by wallet address
app.get('/player/:address', async (req, res) => {
  try {
    const address = req.params.address;
    console.log(`🔍 Getting player info for: ${address}`);

    if (!contract) {
      return res.status(500).json({ error: 'Contract not initialized' });
    }

    // Check if player is registered
    const isRegistered = await contract.isPlayerRegistered(address);

    if (!isRegistered) {
      return res.status(404).json({ error: 'Player not registered' });
    }

    // Get player data
    const [nickname, highScore, gamesPlayed, lastPlayed] = await contract.getPlayer(address);

    res.json({
      wallet: address,
      nickname: nickname,
      score: highScore.toString(),
      gamesPlayed: gamesPlayed.toString(),
      lastPlayed: lastPlayed.toString()
    });

  } catch (error) {
    console.error('❌ Error getting player:', error.message);
    res.status(500).json({ error: 'Failed to get player data' });
  }
});

// Get leaderboard
app.get('/leaderboard', async (req, res) => {
  try {
    console.log('🏆 Getting leaderboard...');

    if (!contract) {
      return res.status(500).json({ error: 'Contract not initialized' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const [addresses, nicknames, scores] = await contract.getLeaderboard(limit);

    const leaderboard = addresses.map((address, index) => ({
      wallet: address,
      nickname: nicknames[index],
      score: parseInt(scores[index].toString())
    })).filter(player => player.score > 0); // Only show players with scores > 0

    res.json(leaderboard);

  } catch (error) {
    console.error('❌ Error getting leaderboard:', error.message);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Check if nickname is available
app.get('/nickname/available/:nickname', async (req, res) => {
  try {
    const nickname = req.params.nickname;
    console.log(`🔍 Checking nickname availability: ${nickname}`);

    if (!contract) {
      return res.status(500).json({ error: 'Contract not initialized' });
    }

    const isAvailable = await contract.isNicknameAvailable(nickname);

    res.json({ available: isAvailable });

  } catch (error) {
    console.error('❌ Error checking nickname:', error.message);
    res.status(500).json({ error: 'Failed to check nickname availability' });
  }
});

// Get blockchain info
app.get('/blockchain-info', async (req, res) => {
  try {
    if (!provider || !contract) {
      return res.status(500).json({ error: 'Blockchain connection not available' });
    }

    const network = await provider.getNetwork();
    const totalPlayers = await contract.getTotalPlayers();

    res.json({
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      contractAddress: CONTRACT_ADDRESS,
      totalPlayers: totalPlayers.toString(),
      rpcUrl: IRYS_RPC_URL
    });

  } catch (error) {
    console.error('❌ Error getting blockchain info:', error.message);
    res.status(500).json({ error: 'Failed to get blockchain info' });
  }
});

// ==========================================
// DATABASE SETUP
// ==========================================
const GameDatabase = require('./database');
const gameDB = new GameDatabase();

// ==========================================
// SERVER-CONTROLLED PVP ENDPOINTS
// ==========================================

// Cache for preventing duplicate result processing
const processingRooms = new Set();

// Submit game results endpoint (now with database)
app.post('/api/pvp/submit-results', async (req, res) => {
  try {
    const { roomId, playerAddress, score, timestamp } = req.body;
    
    console.log('📤 Received game results:', { roomId, playerAddress, score, timestamp });
    
    // Validate input
    if (!roomId || !playerAddress || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store results in database
    const submitResult = await gameDB.submitPlayerScore(roomId, CONTRACT_ADDRESS, playerAddress.toLowerCase(), Number(score));
    
    if (submitResult.duplicate) {
      console.log('🔄 Duplicate submission detected, returning cached status');
    }
    
    // Check if all players have submitted their scores
    const submissionStatus = await gameDB.checkAllPlayersSubmitted(roomId, CONTRACT_ADDRESS);
    
    console.log('📊 Submission status for room', roomId, ':', submissionStatus);
    
    if (submissionStatus.allSubmitted && !processingRooms.has(roomId)) {
      console.log('🎯 All players submitted! Processing results for room', roomId);
      processingRooms.add(roomId);
      
      // Process results immediately when all players have submitted
      setTimeout(() => {
        processGameResults(roomId).finally(() => {
          processingRooms.delete(roomId);
        });
      }, 2000); // 2 second delay for safety
    } else if (processingRooms.has(roomId)) {
      console.log('🔄 Room', roomId, 'already being processed, skipping...');
    }
    
    res.json({ 
      success: true, 
      message: 'Results received',
      submissionStatus
    });
    
  } catch (error) {
    console.error('❌ Error handling game results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process game results and submit to blockchain
async function processGameResults(roomId) {
  try {
    console.log('🎮 Processing game results for room:', roomId);
    
    // Get results from database
    const results = await gameDB.getRoomResults(roomId, CONTRACT_ADDRESS);
    if (!results || results.length === 0) {
      console.log('❌ No results found for room:', roomId);
      return;
    }
    
    // Convert results to arrays for blockchain
    const players = results.map(r => r.player_address);
    const scores = results.map(r => r.score);
    
    // Winner is already sorted by score DESC, so first player is winner
    const winner = players[0];
    const winnerScore = scores[0];
    
    console.log('🏆 Game results from database:', {
      roomId,
      players,
      scores,
      winner,
      winnerScore
    });
    
    // Mark game as finished in database
    await gameDB.finishGame(roomId, CONTRACT_ADDRESS, winner);
    
    // Submit to blockchain
    const txHash = await submitResultsToBlockchain(roomId, players, scores, winner);
    
    if (txHash) {
      // Mark as submitted to blockchain
      await gameDB.markBlockchainSubmitted(roomId, CONTRACT_ADDRESS, txHash);
    }
    
  } catch (error) {
    console.error('❌ Error processing game results:', error);
  }
}

// Submit results to blockchain
async function submitResultsToBlockchain(roomId, players, scores, winner) {
  try {
    console.log('⛓️ Submitting results to blockchain...');
    console.log(`   Room ID: ${roomId}`);
    console.log(`   Players: ${players.length}`);
    console.log(`   Winner: ${winner}`);
    console.log(`   Scores: ${scores.join(', ')}`);
    
    // Setup blockchain connection
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const gameServerWallet = new ethers.Wallet(process.env.GAME_SERVER_KEY, provider);
    
    console.log(`   Game Server: ${gameServerWallet.address}`);
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS}`);
    
    const contractABI = [
      "function submitGameResults(uint256 _roomId, address[] memory _players, uint256[] memory _scores, address _winner)"
    ];
    
    const contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI,
      gameServerWallet
    );
    
    // Submit transaction with timeout
    console.log('📝 Sending blockchain transaction...');
    const tx = await Promise.race([
      contract.submitGameResults(roomId, players, scores, winner),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout after 30 seconds')), 30000)
      )
    ]);
    
    console.log('📝 Blockchain transaction sent:', tx.hash);
    
    // Wait for confirmation with timeout
    console.log('⏳ Waiting for confirmation...');
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout after 60 seconds')), 60000)
      )
    ]);
    
    console.log('✅ Blockchain transaction confirmed:', receipt.hash);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    return receipt.hash;
    
  } catch (error) {
    console.error('❌ Error submitting to blockchain:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

// ==========================================
// PVP DATABASE API ENDPOINTS
// ==========================================

// Create room in database
app.post('/api/pvp/create-room', async (req, res) => {
  try {
    const { roomId, hostAddress, entryFee, gameTime, maxPlayers } = req.body;
    
    console.log('🔍 DEBUG: CONTRACT_ADDRESS value:', CONTRACT_ADDRESS);
    console.log('🔍 DEBUG: CONTRACT_ADDRESS type:', typeof CONTRACT_ADDRESS);
    console.log('🔍 DEBUG: Request body:', req.body);
    
    if (!CONTRACT_ADDRESS) {
      console.error('❌ CONTRACT_ADDRESS is not set!');
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    console.log('🏗️ Creating room in database:', { roomId, contractAddress: CONTRACT_ADDRESS, hostAddress, entryFee, gameTime, maxPlayers });
    
    await gameDB.createRoom(roomId, CONTRACT_ADDRESS, hostAddress, entryFee, gameTime, maxPlayers);
    await gameDB.addPlayerToRoom(roomId, CONTRACT_ADDRESS, hostAddress, true); // Host joins automatically
    
    res.json({ success: true, message: 'Room created in database' });
    
  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room in database
app.post('/api/pvp/join-room', async (req, res) => {
  try {
    const { roomId, playerAddress } = req.body;
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    console.log('🚪 Player joining room in database:', { roomId, contractAddress: CONTRACT_ADDRESS, playerAddress });
    
    await gameDB.addPlayerToRoom(roomId, CONTRACT_ADDRESS, playerAddress, false);
    
    res.json({ success: true, message: 'Player joined room in database' });
    
  } catch (error) {
    console.error('❌ Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Start game in database
app.post('/api/pvp/start-game', async (req, res) => {
  try {
    const { roomId } = req.body;
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    console.log('🚀 Starting game in database:', { roomId, contractAddress: CONTRACT_ADDRESS });
    
    await gameDB.startGame(roomId, CONTRACT_ADDRESS);
    
    res.json({ success: true, message: 'Game started in database' });
    
  } catch (error) {
    console.error('❌ Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// Get room info from database
app.get('/api/pvp/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const roomInfo = await gameDB.getRoomInfo(roomId, CONTRACT_ADDRESS);
    const players = await gameDB.getRoomPlayers(roomId);
    
    if (!roomInfo) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      success: true,
      room: roomInfo,
      players: players
    });
    
  } catch (error) {
    console.error('❌ Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

// Get active rooms from database
app.get('/api/pvp/active-rooms', async (req, res) => {
  try {
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const activeRooms = await gameDB.getActiveRooms(CONTRACT_ADDRESS);
    
    res.json({
      success: true,
      rooms: activeRooms
    });
    
  } catch (error) {
    console.error('❌ Error getting active rooms:', error);
    res.status(500).json({ error: 'Failed to get active rooms' });
  }
});

// Get game results for a room
app.get('/api/pvp/results/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const results = await gameDB.getRoomResults(roomId, CONTRACT_ADDRESS);
    const roomInfo = await gameDB.getRoomInfo(roomId, CONTRACT_ADDRESS);
    
    res.json({
      success: true,
      results: results,
      room: roomInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting game results:', error);
    res.status(500).json({ error: 'Failed to get game results' });
  }
});

// Check submission status
app.get('/api/pvp/submission-status/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const status = await gameDB.checkAllPlayersSubmitted(roomId, CONTRACT_ADDRESS);
    const roomInfo = await gameDB.getRoomInfo(roomId, CONTRACT_ADDRESS);
    
    res.json({
      success: true,
      submissionStatus: status,
      gameFinished: roomInfo?.game_finished || false,
      blockchainSubmitted: roomInfo?.blockchain_submitted || false
    });
    
  } catch (error) {
    console.error('❌ Error checking submission status:', error);
    res.status(500).json({ error: 'Failed to check submission status' });
  }
});

// Debug endpoint to check database status
app.get('/api/pvp/debug/database', async (req, res) => {
  try {
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const activeRooms = await gameDB.getActiveRooms(CONTRACT_ADDRESS);
    const pendingSubmissions = await gameDB.getPendingBlockchainSubmissions(CONTRACT_ADDRESS);
    
    const roomDetails = [];
    for (const room of activeRooms) {
      const players = await gameDB.getRoomPlayers(room.room_id);
      const submissionStatus = await gameDB.checkAllPlayersSubmitted(room.room_id, CONTRACT_ADDRESS);
      
      roomDetails.push({
        ...room,
        players: players.length,
        playersDetails: players,
        submissionStatus
      });
    }
    
    res.json({
      success: true,
      activeRooms: roomDetails,
      pendingBlockchainSubmissions: pendingSubmissions,
      summary: {
        totalActiveRooms: activeRooms.length,
        totalPendingSubmissions: pendingSubmissions.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting database debug info:', error);
    res.status(500).json({ error: 'Failed to get database info' });
  }
});

// Manual trigger for processing pending results
app.post('/api/pvp/debug/process-pending', async (req, res) => {
  try {
    console.log('🔧 Manual trigger: Processing pending results...');
    
    if (!CONTRACT_ADDRESS) {
      return res.status(500).json({ error: 'Contract address not configured' });
    }
    
    const pendingRooms = await gameDB.getPendingBlockchainSubmissions(CONTRACT_ADDRESS);
    
    if (pendingRooms.length === 0) {
      return res.json({ success: true, message: 'No pending results to process' });
    }
    
    const results = [];
    for (const room of pendingRooms) {
      try {
        console.log(`Processing room ${room.room_id}...`);
        await processGameResults(room.room_id);
        results.push({ roomId: room.room_id, status: 'success' });
      } catch (error) {
        console.error(`Error processing room ${room.room_id}:`, error);
        results.push({ roomId: room.room_id, status: 'error', error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${pendingRooms.length} pending rooms`,
      results
    });
    
  } catch (error) {
    console.error('❌ Error in manual processing:', error);
    res.status(500).json({ error: 'Failed to process pending results' });
  }
});

// Clear all database data (admin endpoint)
app.post('/api/pvp/debug/clear-database', async (req, res) => {
  try {
    console.log('🧹 Admin request: Clearing all database data...');
    
    if (!gameDB) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const result = await gameDB.clearAllData();
    
    console.log('✅ Database cleared successfully');
    res.json({
      success: true,
      message: 'All database data cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    res.status(500).json({ 
      error: 'Failed to clear database',
      details: error.message 
    });
  }
});

// Submit task verification
app.post('/submit-verification', async (req, res) => {
  try {
    const { wallet, nickname, postLink, score, timestamp } = req.body;

    // Validate required fields
    if (!wallet || !postLink) {
      return res.status(400).json({ error: 'wallet and postLink are required' });
    }

    // Validate X/Twitter URL
    const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    if (!twitterRegex.test(postLink)) {
      return res.status(400).json({ error: 'Invalid X (Twitter) post URL' });
    }

    // Create verification record
    const verification = {
      wallet: wallet,
      nickname: nickname || 'unknown',
      postLink: postLink,
      score: score || 0,
      timestamp: timestamp || new Date().toISOString(),
      verified: true
    };

    // Append to verification file
    const verificationLine = `${verification.timestamp} | ${verification.wallet} | ${verification.nickname} | ${verification.score} | ${verification.postLink}\n`;

    try {
      fs.appendFileSync('task_verifications.txt', verificationLine);
      console.log('📝 Verification saved to file:', verification);
    } catch (fileError) {
      console.error('❌ Error writing to verification file:', fileError);
      return res.status(500).json({ error: 'Failed to save verification' });
    }

    res.json({
      success: true,
      message: 'Verification submitted successfully',
      verification: verification
    });

  } catch (error) {
    console.error('❌ Error submitting verification:', error.message);
    res.status(500).json({ error: 'Failed to submit verification' });
  }
});

// Check if reward already claimed for wallet
app.post('/check-reward-claimed', async (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet is required' });
    }

    // Check if reward file exists and search for wallet
    try {
      const rewardData = fs.readFileSync('reward_claims.txt', 'utf8');
      const lines = rewardData.split('\n').filter(line => line.trim());

      // Look for this wallet in the claims
      const walletClaim = lines.find(line => line.includes(wallet));

      if (walletClaim) {
        // Extract date from the line (first part before |)
        const parts = walletClaim.split(' | ');
        const claimedDate = parts[0] || 'Unknown date';

        return res.json({
          claimed: true,
          claimedDate: claimedDate,
          wallet: wallet
        });
      } else {
        return res.json({
          claimed: false,
          wallet: wallet
        });
      }

    } catch (fileError) {
      // File doesn't exist or can't be read - no claims yet
      console.log('📝 No reward claims file found, wallet has not claimed');
      return res.json({
        claimed: false,
        wallet: wallet
      });
    }

  } catch (error) {
    console.error('❌ Error checking reward claim:', error.message);
    res.status(500).json({ error: 'Failed to check reward claim' });
  }
});

// Claim reward with real token distribution
app.post('/claim-reward', async (req, res) => {
  try {
    const { wallet, score, timestamp, nickname } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet is required' });
    }

    console.log(`🎁 Processing reward claim for wallet: ${wallet}`);

    // Fallback to file-only mode for now
    console.log('📝 Saving reward claim to file...');

    // Save reward claim to file
    const rewardClaim = {
      wallet: wallet,
      nickname: nickname || 'unknown',
      score: score || 0,
      timestamp: timestamp || new Date().toISOString(),
      status: 'file_only'
    };

    const rewardLine = `${rewardClaim.timestamp} | ${rewardClaim.wallet} | ${rewardClaim.nickname} | ${rewardClaim.score} | FILE_ONLY\n`;
    fs.appendFileSync('reward_claims.txt', rewardLine);

    res.json({
      success: true,
      message: 'Reward claim saved successfully',
      claim: rewardClaim,
      tokensDistributed: false
    });

  } catch (error) {
    console.error('❌ Error in claim-reward endpoint:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process reward claim'
    });
  }
});

// Get token distribution statistics
app.get('/distribution-stats', async (req, res) => {
  try {
    // Read reward claims file to generate stats
    let totalClaims = 0;
    let totalTokens = 0;
    let recentClaims = [];

    try {
      const rewardData = fs.readFileSync('reward_claims.txt', 'utf8');
      const lines = rewardData.split('\n').filter(line => line.trim());
      
      totalClaims = lines.length;
      
      // Parse recent claims (last 10)
      recentClaims = lines.slice(-10).map(line => {
        const parts = line.split(' | ');
        return {
          timestamp: parts[0] || 'Unknown',
          wallet: parts[1] || 'Unknown',
          nickname: parts[2] || 'Unknown',
          score: parseInt(parts[3]) || 0
        };
      }).reverse();
      
    } catch (fileError) {
      console.log('📝 No reward claims file found');
    }

    const stats = {
      totalClaims,
      totalTokensDistributed: totalTokens,
      recentClaims,
      lastUpdated: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Error getting distribution stats:', error.message);
    res.status(500).json({ error: 'Failed to get distribution statistics' });
  }
});

// ============ PvP SYSTEM ============
// PvP system now works entirely client-side through smart contract
// All PvP functionality is handled by the blockchain

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    blockchain: {
      connected: !!provider && !!contract,
      contractAddress: CONTRACT_ADDRESS,
      network: IRYS_RPC_URL
    },
    pvp: {
      enabled: true,
      type: 'blockchain-based',
      description: 'PvP system works entirely through smart contract'
    }
  });
});

// Catch-all route for React app
app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);

  if (!CONTRACT_ADDRESS) {
    console.log('⚠️  Warning: CONTRACT_ADDRESS not set!');
    console.log('1. Deploy your contract using: npm run deploy');
    console.log('2. Set CONTRACT_ADDRESS in your .env file');
    console.log('3. Restart the server');
  }
});