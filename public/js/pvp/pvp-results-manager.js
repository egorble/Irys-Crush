// ==========================================
// PVP RESULTS MANAGER
// ==========================================

class PVPResultsManager {
    constructor() {
        this.modal = null;
        this.currentStage = null;
        this.roomId = null;
        this.playerScore = null;
        this.pollInterval = null;
        this.isActive = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.modal = document.getElementById('pvp-results-modal');
        this.stages = {
            saved: document.getElementById('pvp-stage-saved'),
            blockchain: document.getElementById('pvp-stage-blockchain'),
            results: document.getElementById('pvp-stage-results'),
            error: document.getElementById('pvp-stage-error')
        };
        
        this.elements = {
            title: document.getElementById('pvp-results-title'),
            yourScore: document.getElementById('pvp-your-score'),
            winnerText: document.getElementById('pvp-winner-text'),
            winnerInfo: document.getElementById('pvp-winner-info'),
            leaderboard: document.getElementById('pvp-final-leaderboard'),
            errorMessage: document.getElementById('pvp-error-message')
        };
    }
    
    setupEventListeners() {
        // Action buttons
        document.getElementById('pvp-back-to-menu')?.addEventListener('click', () => {
            this.close();
            this.backToMenu();
        });
        
        document.getElementById('pvp-error-retry')?.addEventListener('click', () => {
            this.retryResultsCheck();
        });
        
        document.getElementById('pvp-error-menu')?.addEventListener('click', () => {
            this.close();
            this.backToMenu();
        });
    }
    
    // ==========================================
    // MAIN FLOW METHODS
    // ==========================================
    
    show(roomId, playerScore) {
        console.log('🎮 Showing PVP results manager:', { roomId, playerScore });
        
        this.roomId = roomId;
        this.playerScore = playerScore;
        this.isActive = true;
        
        // Show modal
        this.modal.classList.remove('hidden');
        
        // Start with stage 1: Result saved
        this.showStage('saved');
        this.elements.yourScore.textContent = playerScore;
        
        // Start polling for results
        this.startResultsPolling();
    }
    
    close() {
        console.log('🎮 Closing PVP results manager');
        
        this.isActive = false;
        this.modal.classList.add('hidden');
        
        // Clear polling
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Clear any timeouts
        if (this.showResultsTimeout) {
            clearTimeout(this.showResultsTimeout);
            this.showResultsTimeout = null;
        }
        
        // Reset state
        this.currentStage = null;
        this.roomId = null;
        this.playerScore = null;
        
        console.log('🎮 PVP results manager closed and cleaned up');
    }
    
    showStage(stageName) {
        console.log(`🎮 Showing stage: ${stageName}`);
        
        // Hide all stages
        Object.values(this.stages).forEach(stage => {
            stage.classList.add('hidden');
        });
        
        // Show target stage
        if (this.stages[stageName]) {
            this.stages[stageName].classList.remove('hidden');
            this.currentStage = stageName;
        }
    }
    
    showError(message) {
        console.error('🎮 PVP Results Error:', message);
        
        this.elements.errorMessage.textContent = message;
        this.showStage('error');
    }
    
    // ==========================================
    // RESULTS POLLING
    // ==========================================
    
    startResultsPolling() {
        console.log('🔄 Starting results polling...');
        
        // Clear any existing interval
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        // Poll every 3 seconds
        this.pollInterval = setInterval(() => {
            this.checkGameResults();
        }, 3000);
        
        // Initial check
        this.checkGameResults();
        
        // Stop polling after 5 minutes
        setTimeout(() => {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
                
                if (this.isActive && this.currentStage !== 'results') {
                    this.showError('Timeout waiting for game results. Please try again later.');
                }
            }
        }, 300000); // 5 minutes
    }
    
    async checkGameResults() {
        if (!this.isActive || !this.roomId) return;
        
        try {
            console.log('🔍 Checking game results for room:', this.roomId);
            
            // Check if game is finished via PVP core
            if (window.pvpInstance && window.pvpInstance.checkGameFinished) {
                const result = await window.pvpInstance.checkGameFinished(this.roomId);
                
                if (result.success) {
                    if (result.finished) {
                        console.log('🏆 Game finished! Results:', result);
                        
                        // Check if blockchain transaction is confirmed
                        if (result.blockchainSubmitted) {
                            console.log('✅ Blockchain transaction confirmed, showing final results');
                            
                            // Stop polling
                            if (this.pollInterval) {
                                clearInterval(this.pollInterval);
                                this.pollInterval = null;
                            }
                            
                            // Show blockchain stage briefly if coming from saved stage
                            if (this.currentStage === 'saved') {
                                this.showStage('blockchain');
                                
                                // Wait 2 seconds then show results
                                setTimeout(() => {
                                    this.showFinalResults(result);
                                }, 2000);
                            } else {
                                this.showFinalResults(result);
                            }
                        } else {
                            console.log('⏳ Game finished but blockchain transaction not yet confirmed');
                            
                            // Show blockchain stage to indicate processing
                            if (this.currentStage !== 'blockchain') {
                                this.showStage('blockchain');
                            }
                            
                            // Continue polling for blockchain confirmation
                            // Don't show final results until blockchain is confirmed
                        }
                    } else {
                        // Still waiting for other players
                        if (this.currentStage !== 'saved') {
                            this.showStage('saved');
                        }
                    }
                } else {
                    console.warn('⚠️ Error checking results:', result.error);
                }
            }
            
        } catch (error) {
            console.error('❌ Error checking game results:', error);
            
            // Don't show error immediately, might be temporary
            if (this.currentStage === 'saved') {
                // Continue waiting
            } else {
                this.showError('Error checking game results: ' + error.message);
            }
        }
    }
    
    retryResultsCheck() {
        console.log('🔄 Retrying results check...');
        this.showStage('saved');
        this.startResultsPolling();
    }
    
    // ==========================================
    // RESULTS DISPLAY
    // ==========================================
    
    async showFinalResults(gameResult) {
        console.log('🎉 Showing final results:', gameResult);
        
        try {
            // Update winner announcement
            await this.updateWinnerAnnouncement(gameResult);
            
            // Update leaderboard
            await this.updateLeaderboard(gameResult);
            
            // Show results stage
            this.showStage('results');
            
        } catch (error) {
            console.error('❌ Error showing final results:', error);
            this.showError('Error displaying results: ' + error.message);
        }
    }
    
    async updateWinnerAnnouncement(gameResult) {
        const winnerSection = document.getElementById('pvp-winner-announcement');
        
        try {
            // Get user address
            const userAddress = window.signer ? await window.signer.getAddress() : null;
            
            // Get winner from gameResult
            const winner = gameResult.winner;
            const isWinner = winner && userAddress && 
                           winner.toLowerCase() === userAddress.toLowerCase();
            
            if (isWinner) {
                this.elements.winnerText.textContent = '🎉 You Won!';
                this.elements.winnerInfo.textContent = `Congratulations! You achieved the highest score!`;
                winnerSection.className = 'pvp-winner-section you-won';
            } else if (winner) {
                this.elements.winnerText.textContent = '🏆 Winner';
                this.elements.winnerInfo.textContent = `Winner: ${this.formatAddress(winner)}`;
                winnerSection.className = 'pvp-winner-section you-lost';
            } else {
                this.elements.winnerText.textContent = '🏁 Game Finished';
                this.elements.winnerInfo.textContent = 'Results are being processed...';
                winnerSection.className = 'pvp-winner-section';
            }
            
        } catch (error) {
            console.error('❌ Error updating winner announcement:', error);
            this.elements.winnerText.textContent = '🏁 Game Finished';
            this.elements.winnerInfo.textContent = 'Error loading winner information';
            winnerSection.className = 'pvp-winner-section';
        }
    }
    
    async updateLeaderboard(gameResult) {
        const leaderboard = this.elements.leaderboard;
        leaderboard.innerHTML = '';
        
        try {
            // Get user address
            const userAddress = window.signer ? await window.signer.getAddress() : null;
            
            // Convert final scores to array and sort
            const players = Object.keys(gameResult.finalScores || {});
            const sortedPlayers = players.sort((a, b) => {
                return (gameResult.finalScores[b] || 0) - (gameResult.finalScores[a] || 0);
            });
            
            // Create leaderboard items
            sortedPlayers.forEach((playerAddress, index) => {
                const score = gameResult.finalScores[playerAddress] || 0;
                const isCurrentUser = userAddress && playerAddress.toLowerCase() === userAddress.toLowerCase();
                const isWinner = playerAddress.toLowerCase() === (gameResult.winner || '').toLowerCase();
                
                const item = document.createElement('div');
                item.className = 'pvp-leaderboard-item';
                
                if (isWinner) item.classList.add('winner');
                if (isCurrentUser) item.classList.add('you');
                
                item.innerHTML = `
                    <div class="pvp-player-info">
                        <span class="pvp-player-rank">#${index + 1}</span>
                        <span class="pvp-player-name">${this.formatAddress(playerAddress)}</span>
                        ${isWinner ? '<span class="pvp-player-badge winner">👑 Winner</span>' : ''}
                        ${isCurrentUser ? '<span class="pvp-player-badge you">You</span>' : ''}
                    </div>
                    <span class="pvp-player-score">${score}</span>
                `;
                
                leaderboard.appendChild(item);
            });
            
            if (sortedPlayers.length === 0) {
                leaderboard.innerHTML = '<p>No results available</p>';
            }
            
        } catch (error) {
            console.error('❌ Error updating leaderboard:', error);
            leaderboard.innerHTML = '<p>Error loading leaderboard</p>';
        }
    }
    
    // ==========================================
    // UTILITY METHODS
    // ==========================================
    
    formatAddress(address) {
        if (!address) return 'Unknown';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    // startNewGame method removed - only "Back to Menu" option available
    
    backToMenu() {
        console.log('🎮 Going back to main menu...');
        
        // Очищаємо всі таймери та стан PVP гри
        this.cleanupPVPState();
        
        // Show main menu and hide game UI
        const mainMenu = document.getElementById('main-menu');
        const gameUI = document.getElementById('game-ui');
        const pvpModal = document.getElementById('pvp-modal');
        
        if (mainMenu) mainMenu.classList.remove('hidden');
        if (gameUI) gameUI.classList.add('hidden');
        if (pvpModal) pvpModal.classList.add('hidden');
        
        // Reset game state if needed
        if (window.resetGameState) {
            window.resetGameState();
        }
        
        console.log('✅ Successfully returned to main menu');
    }
    
    cleanupPVPState() {
        console.log('🧹 Cleaning up PVP state...');
        
        // Clear current PVP game
        if (window.currentPVPGame) {
            if (window.currentPVPGame.stopTimer) {
                window.currentPVPGame.stopTimer();
            }
            if (window.currentPVPGame.cleanup) {
                window.currentPVPGame.cleanup();
            }
            window.currentPVPGame = null;
        }
        
        // Clear all timers
        if (window.clearAllTimers) {
            window.clearAllTimers();
        }
        
        // Clear PVP UI
        if (window.currentPVPGame && window.currentPVPGame.ui && window.currentPVPGame.ui.cleanup) {
            window.currentPVPGame.ui.cleanup();
        }
        
        // Remove any game overlays
        const overlays = document.querySelectorAll('.game-over-overlay');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        
        console.log('🧹 PVP state cleanup completed');
    }
}

// Create global instance
window.pvpResultsManager = new PVPResultsManager();

// Export for use in other modules
window.showPVPResults = function(roomId, playerScore) {
    window.pvpResultsManager.show(roomId, playerScore);
};

console.log('📦 PVP Results Manager loaded');