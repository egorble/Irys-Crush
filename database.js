const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'pvp_games.db');

class GameDatabase {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        // PvP Rooms table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS pvp_rooms (
                room_id INTEGER NOT NULL,
                contract_address TEXT NOT NULL,
                host_address TEXT NOT NULL,
                entry_fee TEXT NOT NULL,
                game_time INTEGER NOT NULL,
                max_players INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                game_started BOOLEAN DEFAULT 0,
                game_finished BOOLEAN DEFAULT 0,
                blockchain_submitted BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                finished_at DATETIME,
                blockchain_tx_hash TEXT,
                PRIMARY KEY (room_id, contract_address)
            )
        `);

        // Room Players table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS room_players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                player_address TEXT NOT NULL,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_host BOOLEAN DEFAULT 0,
                FOREIGN KEY (room_id) REFERENCES pvp_rooms (room_id),
                UNIQUE(room_id, player_address)
            )
        `);

        // Game Results table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS game_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                player_address TEXT NOT NULL,
                score INTEGER NOT NULL,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES pvp_rooms (room_id),
                UNIQUE(room_id, player_address)
            )
        `);

        console.log('✅ Database tables created/verified');
    }

    // ==========================================
    // ROOM MANAGEMENT
    // ==========================================

    async createRoom(roomId, contractAddress, hostAddress, entryFee, gameTime, maxPlayers) {
        return new Promise((resolve, reject) => {
            console.log('🔍 DATABASE DEBUG: createRoom called with:', {
                roomId,
                contractAddress,
                hostAddress,
                entryFee,
                gameTime,
                maxPlayers
            });
            
            if (!contractAddress) {
                reject(new Error('contractAddress is required but not provided'));
                return;
            }
            
            const stmt = this.db.prepare(`
                INSERT INTO pvp_rooms (room_id, contract_address, host_address, entry_fee, game_time, max_players)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            // Normalize addresses to lowercase
            const normalizedHostAddress = hostAddress.toLowerCase();
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            stmt.run([roomId, normalizedContractAddress, normalizedHostAddress, entryFee, gameTime, maxPlayers], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Room ${roomId} created in database`);
                    resolve({ roomId, success: true });
                }
            });
            
            stmt.finalize();
        });
    }

    async addPlayerToRoom(roomId, contractAddress, playerAddress, isHost = false) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO room_players (room_id, player_address, is_host)
                VALUES (?, ?, ?)
            `);
            
            // Normalize address to lowercase
            const normalizedAddress = playerAddress.toLowerCase();
            
            stmt.run([roomId, normalizedAddress, isHost], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Player ${normalizedAddress} added to room ${roomId}`);
                    resolve({ success: true });
                }
            });
            
            stmt.finalize();
        });
    }

    async startGame(roomId, contractAddress) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE pvp_rooms 
                SET game_started = 1, started_at = CURRENT_TIMESTAMP
                WHERE room_id = ? AND contract_address = ?
            `);
            
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            stmt.run([roomId, normalizedContractAddress], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Game started for room ${roomId}`);
                    resolve({ success: true });
                }
            });
            
            stmt.finalize();
        });
    }

    // ==========================================
    // GAME RESULTS
    // ==========================================

    async submitPlayerScore(roomId, contractAddress, playerAddress, score) {
        return new Promise((resolve, reject) => {
            // First check if score already exists
            this.db.get(`
                SELECT score FROM game_results 
                WHERE room_id = ? AND player_address = ?
            `, [roomId, playerAddress.toLowerCase()], (err, existingRow) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (existingRow) {
                    console.log(`⚠️ Score already exists for player ${playerAddress.toLowerCase()} in room ${roomId}: ${existingRow.score} -> ${score}`);
                    if (existingRow.score === score) {
                        console.log(`🔄 Duplicate score submission ignored for player ${playerAddress.toLowerCase()} in room ${roomId}`);
                        resolve({ success: true, duplicate: true });
                        return;
                    }
                }
                
                const stmt = this.db.prepare(`
                    INSERT OR REPLACE INTO game_results (room_id, player_address, score)
                    VALUES (?, ?, ?)
                `);
                
                // Normalize address to lowercase
                const normalizedAddress = playerAddress.toLowerCase();
                
                stmt.run([roomId, normalizedAddress, score], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        const action = existingRow ? 'updated' : 'submitted';
                        console.log(`✅ Score ${score} ${action} for player ${normalizedAddress} in room ${roomId}`);
                        resolve({ success: true, updated: !!existingRow });
                    }
                });
                
                stmt.finalize();
            });
        });
    }

    async checkAllPlayersSubmitted(roomId, contractAddress) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(rp.player_address) as total_players,
                    COUNT(gr.player_address) as submitted_players
                FROM room_players rp
                LEFT JOIN game_results gr ON rp.room_id = gr.room_id AND rp.player_address = gr.player_address
                WHERE rp.room_id = ?
            `, [roomId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    const allSubmitted = row.total_players === row.submitted_players && row.total_players > 0;
                    resolve({
                        allSubmitted,
                        totalPlayers: row.total_players,
                        submittedPlayers: row.submitted_players
                    });
                }
            });
        });
    }

    async getRoomResults(roomId, contractAddress) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    gr.player_address,
                    gr.score,
                    rp.is_host
                FROM game_results gr
                JOIN room_players rp ON gr.room_id = rp.room_id AND gr.player_address = rp.player_address
                WHERE gr.room_id = ?
                ORDER BY gr.score DESC
            `, [roomId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async finishGame(roomId, contractAddress, winnerAddress) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE pvp_rooms 
                SET game_finished = 1, finished_at = CURRENT_TIMESTAMP
                WHERE room_id = ? AND contract_address = ?
            `);
            
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            stmt.run([roomId, normalizedContractAddress], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Game finished for room ${roomId}, winner: ${winnerAddress}`);
                    resolve({ success: true });
                }
            });
            
            stmt.finalize();
        });
    }

    // ==========================================
    // BLOCKCHAIN INTEGRATION
    // ==========================================

    async markBlockchainSubmitted(roomId, contractAddress, txHash) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE pvp_rooms 
                SET blockchain_submitted = 1, blockchain_tx_hash = ?
                WHERE room_id = ? AND contract_address = ?
            `);
            
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            stmt.run([txHash, roomId, normalizedContractAddress], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Room ${roomId} marked as submitted to blockchain: ${txHash}`);
                    resolve({ success: true });
                }
            });
            
            stmt.finalize();
        });
    }

    async getPendingBlockchainSubmissions(contractAddress) {
        return new Promise((resolve, reject) => {
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            this.db.all(`
                SELECT room_id, host_address, entry_fee, contract_address
                FROM pvp_rooms 
                WHERE game_finished = 1 AND blockchain_submitted = 0 AND contract_address = ?
                ORDER BY finished_at ASC
            `, [normalizedContractAddress], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // ==========================================
    // QUERY FUNCTIONS
    // ==========================================

    async getRoomInfo(roomId, contractAddress) {
        return new Promise((resolve, reject) => {
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            this.db.get(`
                SELECT * FROM pvp_rooms WHERE room_id = ? AND contract_address = ?
            `, [roomId, normalizedContractAddress], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getRoomPlayers(roomId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT player_address, is_host, joined_at
                FROM room_players 
                WHERE room_id = ?
                ORDER BY joined_at ASC
            `, [roomId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getActiveRooms(contractAddress) {
        return new Promise((resolve, reject) => {
            const normalizedContractAddress = contractAddress.toLowerCase();
            
            this.db.all(`
                SELECT 
                    pr.*,
                    COUNT(rp.player_address) as current_players
                FROM pvp_rooms pr
                LEFT JOIN room_players rp ON pr.room_id = rp.room_id
                WHERE pr.is_active = 1 AND pr.game_finished = 0 AND pr.contract_address = ?
                GROUP BY pr.room_id
                ORDER BY pr.created_at DESC
            `, [normalizedContractAddress], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = GameDatabase;