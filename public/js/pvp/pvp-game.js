// ==========================================
// PVP GAME ENGINE - MODULAR ARCHITECTURE
// ==========================================

class PVPGameEngine {
    constructor(roomId, gameTimeMinutes, isHost) {
        this.roomId = roomId;
        
        // Use Time Manager for validation if available
        if (window.pvpTimeManager) {
            const timeData = window.pvpTimeManager.setRoomTime(roomId, gameTimeMinutes, 'constructor', 'minutes');
            this.gameTimeMinutes = timeData.minutes;
            this.gameTimeSeconds = timeData.seconds;
            
            console.log('🕐 PVP Game using Time Manager:', timeData);
        } else {
            // Fallback validation
            const validGameTimeMinutes = Number(gameTimeMinutes);
            if (isNaN(validGameTimeMinutes) || validGameTimeMinutes <= 0) {
                console.warn('⚠️ Invalid gameTimeMinutes received:', gameTimeMinutes, 'using default 2 minutes');
                this.gameTimeMinutes = 2;
            } else {
                this.gameTimeMinutes = validGameTimeMinutes;
            }
            this.gameTimeSeconds = this.gameTimeMinutes * 60;
            
            console.log('🕐 PVP Game fallback validation:', {
                input: gameTimeMinutes,
                validated: this.gameTimeMinutes,
                seconds: this.gameTimeSeconds
            });
        }
        
        this.isHost = isHost;
        this.gameStartTime = null;
        this.gameEndTime = null;
        this.resultSubmitted = false;
        this.submissionInProgress = false;

        // Game State
        this.board = [];
        this.score = 0;
        this.timer = this.gameTimeSeconds;
        this.timerInterval = null;
        this.selectedCell = null;
        this.isAnimating = false;
        this.gameActive = false;

        // Additional validation for timer after initialization
        console.log('🔍 PVP Game constructor final state:', {
            gameTimeMinutes: this.gameTimeMinutes,
            gameTimeSeconds: this.gameTimeSeconds,
            timer: this.timer,
            roomId: this.roomId,
            isHost: this.isHost
        });
        
        if (isNaN(this.timer) || this.timer <= 0) {
            console.warn('⚠️ Invalid timer value detected after initialization, resetting to 120 seconds');
            this.timer = 120;
            this.gameTimeSeconds = 120;
            this.gameTimeMinutes = 2;
        }

        // Initialize modules
        this.logic = new window.PVPGameLogic(this);
        this.ui = new window.PVPGameUI(this);
        this.results = new window.PVPGameResults(this);

        console.log('🎮 PVP Game Engine initialized for room:', roomId, 'time:', this.gameTimeMinutes, 'min', 'timer:', this.timer);
    }

    // ==========================================
    // GAME INITIALIZATION
    // ==========================================

    async startGame() {
        try {
            console.log('🚀 Starting PVP game...');

            // Звичайний старт гри
            this.gameStartTime = Date.now();
            this.gameEndTime = this.gameStartTime + (this.gameTimeSeconds * 1000);
            this.gameActive = true;
            this.score = 0;
            this.timer = this.gameTimeSeconds;
            
            // Final validation before starting timer
            if (isNaN(this.timer) || this.timer <= 0) {
                console.warn('⚠️ Invalid timer at game start, resetting to 120 seconds');
                this.timer = 120;
                this.gameTimeSeconds = 120;
                this.gameTimeMinutes = 2;
            }
            
            console.log('🕐 Game starting fresh with timer:', this.timer, 'seconds');

            // Show game interface
            this.ui.showGameInterface();
            
            this.logic.generateBoard();
            this.logic.renderBoard();
            this.startTimer();



            console.log('✅ PVP game started successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to start PVP game:', error);
            return { success: false, error: error.message };
        }
    }



    // ==========================================
    // GAME TIMER AND UPDATES
    // ==========================================

    startTimer() {
        // БЕЗПЕЧНА очистка тільки власних таймерів
        this.stopTimer();
        
        // Перевіряємо чи немає інших таймерів для цієї кімнати
        if (window.activeTimers) {
            for (const [timerId, timerData] of Object.entries(window.activeTimers)) {
                if (timerData.roomId === this.roomId) {
                    console.warn('⚠️ Found existing timer for room', this.roomId, '- clearing it');
                    clearInterval(timerData.interval);
                    delete window.activeTimers[timerId];
                }
            }
        }
        
        // Валідація таймера перед стартом
        if (isNaN(this.timer) || this.timer <= 0) {
            console.warn('⚠️ Invalid timer value at start, resetting to default');
            this.timer = this.gameTimeSeconds || 120;
        }
        
        // Додаткова валідація gameTimeSeconds
        if (isNaN(this.gameTimeSeconds) || this.gameTimeSeconds <= 0) {
            console.warn('⚠️ Invalid gameTimeSeconds, resetting to 120');
            this.gameTimeSeconds = 120;
            this.timer = 120;
        }
        
        this.ui.updateTimerDisplay();
        
        console.log('⏰ Starting PVP timer with', this.timer, 'seconds (validated)', {
            gameTimeSeconds: this.gameTimeSeconds,
            gameTimeMinutes: this.gameTimeMinutes,
            gameStartTime: this.gameStartTime,
            expectedEndTime: this.gameStartTime + (this.gameTimeSeconds * 1000)
        });
        
        // Створюємо новий інтервал з додатковими перевірками
        this.timerInterval = setInterval(() => {
            // Множинні перевірки для стабільності
            if (!this.gameActive || this.resultSubmitted || !this.timerInterval) {
                console.log('🛑 Game state changed, stopping timer', {
                    gameActive: this.gameActive,
                    resultSubmitted: this.resultSubmitted,
                    hasInterval: !!this.timerInterval
                });
                this.stopTimer();
                return;
            }
            
            // Валідація таймера на кожному кроці
            if (isNaN(this.timer)) {
                console.error('❌ Timer became NaN, stopping game', {
                    timer: this.timer,
                    gameTimeSeconds: this.gameTimeSeconds,
                    gameStartTime: this.gameStartTime,
                    currentTime: Date.now(),
                    gameRunTime: Date.now() - this.gameStartTime,
                    score: this.score
                });
                this.stopTimer();
                this.endGame();
                return;
            }
            
            this.timer--;
            this.ui.updateTimerDisplay();
            
            if (this.timer <= 0) {
                console.log('🚨 Timer reached 0, ending game', {
                    timer: this.timer,
                    gameActive: this.gameActive,
                    resultSubmitted: this.resultSubmitted,
                    currentScore: this.score,
                    gameStartTime: this.gameStartTime,
                    currentTime: Date.now(),
                    gameRunTime: Date.now() - this.gameStartTime
                });
                this.stopTimer();
                this.endGame();
            }
        }, 1000);
        
        // Зберігаємо унікальний ідентифікатор для цієї гри
        this.timerInstanceId = `pvp_timer_${this.roomId}_${Date.now()}`;
        
        // Реєструємо таймер глобально для безпеки
        if (!window.activeTimers) {
            window.activeTimers = {};
        }
        window.activeTimers[this.timerInstanceId] = {
            interval: this.timerInterval,
            roomId: this.roomId,
            startTime: Date.now()
        };
        
        console.log('✅ PVP timer started with ID:', this.timerInstanceId);
    }

    stopTimer() {
        // БЕЗПЕЧНА очистка тільки власного таймера
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('🛑 PVP timer stopped for room:', this.roomId);
            
            // Видаляємо з глобального реєстру
            if (window.activeTimers && this.timerInstanceId) {
                delete window.activeTimers[this.timerInstanceId];
                console.log('🛑 Timer removed from global registry:', this.timerInstanceId);
            }
        }
        
        // Очищаємо ідентифікатор
        if (this.timerInstanceId) {
            console.log('🛑 Timer instance cleared:', this.timerInstanceId);
            this.timerInstanceId = null;
        }
        
        console.log('🛑 Timer safely cleared for this game instance only');
    }

    formatTime(seconds) {
        // Use Time Manager if available
        if (window.pvpTimeManager) {
            return window.pvpTimeManager.formatTime(seconds);
        }
        
        // Fallback formatting with validation
        const validSeconds = isNaN(seconds) || seconds < 0 ? 0 : Math.floor(seconds);
        const minutes = Math.floor(validSeconds / 60);
        const secs = validSeconds % 60;
        const formattedMinutes = isNaN(minutes) ? 0 : minutes;
        const formattedSeconds = isNaN(secs) ? 0 : secs;
        
        return `${formattedMinutes}:${formattedSeconds.toString().padStart(2, '0')}`;
    }

    // ==========================================
    // GAME END
    // ==========================================

    async endGame() {
        console.log('🚨 END GAME DEBUG: Function called', {
            gameActive: this.gameActive,
            resultSubmitted: this.resultSubmitted,
            submissionInProgress: this.submissionInProgress,
            stackTrace: new Error().stack
        });
        
        if (!this.gameActive) {
            console.log('🏁 Game already ended, skipping...');
            return;
        }
        
        if (this.resultSubmitted) {
            console.log('🏁 Results already submitted, skipping endGame...');
            return;
        }

        console.log('🏁 PVP Game ended (Server-Controlled)');
        this.gameActive = false;
        this.finalScore = this.score;

        // Clear timers
        this.stopTimer();

        // Додаткова перевірка: чи гра закінчилася природно
        const gameRunTime = Date.now() - this.gameStartTime;
        const expectedGameTime = this.gameTimeSeconds * 1000;
        const timeDifference = Math.abs(gameRunTime - expectedGameTime);
        
        console.log('🕐 Game timing analysis:', {
            gameRunTime: gameRunTime,
            expectedGameTime: expectedGameTime,
            timeDifference: timeDifference,
            finalScore: this.finalScore,
            isPrematureEnd: timeDifference > 5000 && this.finalScore === 0
        });

        // Якщо гра закінчилася передчасно з нульовим результатом, не надсилати
        if (timeDifference > 5000 && this.finalScore === 0) {
            console.warn('⚠️ Game ended prematurely with 0 score - not submitting result');
            if (window.showNotification) {
                window.showNotification('Game ended unexpectedly. Please try again.', 'warning');
            }
            return;
        }

        // Submit result to server (server-controlled system)
        await this.submitResultToServer();

        // Show new PVP results manager instead of old game over screen
        if (window.showPVPResults) {
            window.showPVPResults(this.roomId, this.finalScore);
        } else {
            // Fallback to old system
            this.ui.showGameOverScreen();
            this.startResultsPolling();
        }
    }

    // Submit results to server for processing
    async submitResultToServer() {
        try {
            if (this.resultSubmitted) {
                console.log('📤 Result already submitted, skipping...');
                return;
            }
            
            if (this.submissionInProgress) {
                console.log('📤 Submission already in progress, skipping...');
                return;
            }

            console.log('📤 Submitting result to server:', {
                roomId: this.roomId,
                score: this.finalScore,
                gameRunTime: Date.now() - this.gameStartTime,
                expectedGameTime: this.gameTimeSeconds * 1000
            });

            // Додаткова перевірка: не надсилати підозрілі нульові результати
            if (this.finalScore === 0) {
                const gameRunTime = Date.now() - this.gameStartTime;
                const expectedGameTime = this.gameTimeSeconds * 1000;
                
                if (gameRunTime < expectedGameTime * 0.1) { // Менше 10% від очікуваного часу
                    console.warn('⚠️ Suspicious 0 score submission - game too short', {
                        gameRunTime,
                        expectedGameTime,
                        percentage: (gameRunTime / expectedGameTime) * 100
                    });
                    
                    if (window.showNotification) {
                        window.showNotification('Game ended too quickly. Please try again.', 'warning');
                    }
                    return;
                }
            }

            this.submissionInProgress = true;

            // Use PvP core function to send results
            if (window.pvpInstance && window.pvpInstance.sendGameResultsToServer) {
                const result = await window.pvpInstance.sendGameResultsToServer(this.roomId, this.finalScore);
                
                if (result.success) {
                    console.log('✅ Results sent to server successfully');
                    this.resultSubmitted = true;
                    
                    if (window.showNotification) {
                        window.showNotification('Results submitted! Waiting for other players...', 'success');
                    }
                } else {
                    throw new Error(result.error || 'Failed to send results');
                }
            } else {
                throw new Error('PvP system not available');
            }

        } catch (error) {
            console.error('❌ Error submitting result to server:', error);
            
            if (window.showNotification) {
                window.showNotification('Failed to submit results. Please try again.', 'error');
            }
        } finally {
            this.submissionInProgress = false;
        }
    }

    // Results polling is now handled by PVP Results Manager

    // Show final game results using new results manager
    showFinalResults(gameResult) {
        try {
            console.log('🎉 Showing final results via results manager:', gameResult);
            
            // Use new PVP results manager instead of old system
            if (window.showPVPResults) {
                window.showPVPResults(this.roomId, this.finalScore);
            } else {
                console.error('❌ PVP Results Manager not available');
                
                // Fallback notification
                const userAddress = window.signer ? window.signer.getAddress() : null;
                const isWinner = gameResult.winner && userAddress && 
                               gameResult.winner.toLowerCase() === userAddress.toLowerCase();
                
                const message = isWinner ? 
                    `🏆 You won! Final score: ${this.finalScore}` :
                    `Game finished. Your score: ${this.finalScore}`;
                
                if (window.showNotification) {
                    window.showNotification(message, isWinner ? 'success' : 'info');
                }
            }

        } catch (error) {
            console.error('❌ Error showing final results:', error);
        }
    }

    async forfeitGame() {
        if (!confirm('Are you sure you want to forfeit the game? You will lose your entry fee.')) {
            return;
        }

        // Check if result already submitted
        if (this.resultSubmitted) {
            console.log('🏳️ Cannot forfeit - result already submitted');
            if (window.showNotification) {
                window.showNotification('Cannot forfeit - result already submitted!', 'warning');
            }
            return;
        }

        if (this.submissionInProgress) {
            console.log('🏳️ Cannot forfeit - submission in progress');
            if (window.showNotification) {
                window.showNotification('Cannot forfeit - submission in progress!', 'warning');
            }
            return;
        }

        // Check blockchain before forfeit
        try {
            if (window.signer && window.pvpInstance) {
                const userAddress = await window.signer.getAddress();
                const currentScore = await window.pvpInstance.contract.getPlayerRoomScore(this.roomId, userAddress);
                
                if (currentScore > 0) {
                    console.log('🏳️ Cannot forfeit - score already submitted to blockchain:', currentScore.toString());
                    this.resultSubmitted = true;
                    if (window.showNotification) {
                        window.showNotification('Cannot forfeit - result already submitted to blockchain!', 'warning');
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error checking blockchain before forfeit:', error);
        }

        console.log('🏳️ Player forfeited the game');
        this.gameActive = false;
        this.finalScore = 0; // Forfeit = 0 score
        this.submissionInProgress = true;

        // Stop timer immediately
        this.stopTimer();

        // Submit forfeit result to blockchain
        try {
            console.log('📤 Submitting forfeit result...');

            if (window.pvpInstance && window.pvpInstance.contract) {
                const tx = await window.pvpInstance.contract.submitRoomScore(
                    this.roomId,
                    this.finalScore
                );

                console.log('📝 Forfeit submission transaction:', tx.hash);

                if (window.showNotification) {
                    window.showNotification('Submitting forfeit...', 'info');
                }

                await tx.wait();

                this.resultSubmitted = true;
                console.log('✅ Forfeit result submitted successfully');

                if (window.showNotification) {
                    window.showNotification('Forfeit submitted!', 'success');
                }
            }
        } catch (error) {
            console.error('❌ Failed to submit forfeit result:', error);

            if (window.showNotification) {
                window.showNotification(`Failed to submit forfeit: ${error.message}`, 'error');
            }
        } finally {
            this.submissionInProgress = false;
        }

        // Show forfeit screen
        this.ui.showForfeitScreen();
    }

    clearCurrentRoom() {
        // Clear current room data to allow joining other rooms
        if (window.currentPVPRoom) {
            console.log('🧹 Clearing current PVP room:', window.currentPVPRoom.id);
            window.currentPVPRoom = null;
        }

        if (window.currentPVPGame) {
            console.log('🧹 Clearing current PVP game instance');
            window.currentPVPGame = null;
        }

        console.log('✅ Player unbound from room, can join other games');
    }

    returnToPVPMenu() {
        this.ui.returnToPVPMenu();
    }

    cleanup() {
        console.log('🧹 Cleaning up PVP game...');
        
        // Stop timer
        this.stopTimer();
        
        // Mark game as inactive
        this.gameActive = false;
        
        // Clear global reference
        if (window.currentPVPGame === this) {
            window.currentPVPGame = null;
            console.log('🧹 Cleared global PVP game reference');
        }

        // Clean up UI
        this.ui.cleanup();

        // Clear room data
        this.clearCurrentRoom();

        console.log('🧹 PVP Game cleaned up');
    }
}

// Export for global access
window.PVPGameEngine = PVPGameEngine;

console.log('📦 PVP Game Engine loaded');