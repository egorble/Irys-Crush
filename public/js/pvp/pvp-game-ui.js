// ==========================================
// PVP GAME UI MANAGER
// ==========================================

class PVPGameUI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    showGameInterface() {
        // Hide main menu and PVP modal, show game UI
        const mainMenu = document.getElementById('main-menu');
        const gameUI = document.getElementById('game-ui');
        const pvpModal = document.getElementById('pvp-modal');

        if (mainMenu) mainMenu.classList.add('hidden');
        if (pvpModal) pvpModal.classList.add('hidden');
        if (gameUI) gameUI.classList.remove('hidden');

        // Update game UI for PVP mode
        this.updateGameUIForPVP();

        // Add forfeit button to existing game UI
        this.addPVPControls();
    }

    updateGameUIForPVP() {
        // Update timer display to show PVP info
        const timerSpan = document.getElementById('timer');
        if (timerSpan) {
            timerSpan.textContent = this.gameEngine.formatTime(this.gameEngine.timer);
        }

        // Update score display
        const scoreSpan = document.getElementById('score');
        if (scoreSpan) {
            scoreSpan.textContent = this.gameEngine.score;
        }

        // Add PVP info to the header
        const gameHeader = document.querySelector('.game-header') || document.querySelector('#game-ui h1');
        if (gameHeader) {
            gameHeader.innerHTML = `
                🎮 PVP Match-3 Battle
                <div class="pvp-room-info">Room: ${this.gameEngine.roomId} | ${this.gameEngine.gameTimeMinutes} min</div>
            `;
        }
    }

    addPVPControls() {
        // Add forfeit button to game UI
        const gameUI = document.getElementById('game-ui');
        if (!gameUI) return;

        // Check if forfeit button already exists
        if (document.getElementById('pvp-forfeit-btn')) return;

        const forfeitBtn = document.createElement('button');
        forfeitBtn.id = 'pvp-forfeit-btn';
        forfeitBtn.className = 'forfeit-btn';
        forfeitBtn.innerHTML = '🏳️ Forfeit Game';
        forfeitBtn.onclick = () => this.gameEngine.forfeitGame();

        // Add elements to game UI
        gameUI.appendChild(forfeitBtn);

        // Add CSS for PVP controls
        if (window.PVPGameStyles) {
            window.PVPGameStyles.addPVPStyles();
        }
    }



    updateTimerDisplay() {
        // Use existing timer element from main game
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const formattedTime = this.gameEngine.formatTime(this.gameEngine.timer);
            
            // Update only if value changed to avoid flickering
            if (timerElement.textContent !== formattedTime) {
                timerElement.textContent = formattedTime;
                console.log('⏰ Timer updated to:', formattedTime);
            }

            // Стилізація залежно від часу
            if (this.gameEngine.timer <= 30) {
                timerElement.style.color = '#ff5722';
                timerElement.style.animation = 'pulse 1s infinite';
                timerElement.title = 'Time is running out!';
            } else {
                timerElement.style.color = '';
                timerElement.style.animation = '';
                timerElement.title = 'Game time remaining';
            }
        }
    }

    updateScore() {
        // Use existing score element from main game
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            const currentScore = this.gameEngine.score || 0;
            
            // Update only if value changed to avoid flickering
            if (scoreElement.textContent !== currentScore.toString()) {
                scoreElement.textContent = currentScore;
                console.log('📊 Score UI updated to:', currentScore);
            }
        }
    }

    showGameOverScreen() {
        // This method is now deprecated for PvP games
        // PvP games should use the new PVP Results Manager instead
        console.log('⚠️ showGameOverScreen called - this should use PVP Results Manager for PvP games');
        
        // For backward compatibility, show a simple notification
        if (window.showNotification) {
            window.showNotification('Game finished! Check results...', 'info');
        }
    }

    showForfeitScreen() {
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content">
                <h3>🏳️ Game Forfeited</h3>
                <div class="final-stats">
                    <div>Final Score: 0 (Forfeit)</div>
                    <div>Room: ${this.gameEngine.roomId}</div>
                </div>
                <p>You have forfeited the game. Your result has been submitted.</p>
                <p>You can now join other PVP games.</p>
                <button id="close-forfeit-btn" class="join-btn">Return to PVP Menu</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('close-forfeit-btn').onclick = () => {
            // Safe removal check
            if (overlay && overlay.parentNode === document.body) {
                document.body.removeChild(overlay);
            }
            this.gameEngine.clearCurrentRoom();
            this.gameEngine.returnToPVPMenu();
        };
    }

    showFinalResults(leaderboard, isWinner, winner = null, userPosition = 0, userScore = 0) {
        // Remove existing overlay if any
        const existingOverlay = document.querySelector('.game-over-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Create results display
        let resultsHTML = '<h4>🏆 Final Results</h4><div class="leaderboard-results">';

        for (let i = 0; i < Math.min(leaderboard[0].length, 5); i++) {
            const address = leaderboard[0][i];
            const nickname = leaderboard[1][i];
            const score = leaderboard[2][i];
            const position = i + 1;

            let medal = '';
            if (position === 1) medal = '🥇';
            else if (position === 2) medal = '🥈';
            else if (position === 3) medal = '🥉';
            else medal = `${position}.`;

            resultsHTML += `
                <div class="result-row ${position === 1 ? 'winner' : ''}">
                    <span class="position">${medal}</span>
                    <span class="nickname">${nickname}</span>
                    <span class="score">${score}</span>
                </div>
            `;
        }

        resultsHTML += '</div>';

        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content">
                <h3>${isWinner ? '🎉 Congratulations!' : '🏁 Game Over!'}</h3>
                <div class="final-stats">
                    <div>Your Score: ${this.gameEngine.finalScore}</div>
                    <div>Room: ${this.gameEngine.roomId}</div>
                </div>
                ${resultsHTML}
                <p>${isWinner ? 'You won the prize!' : 'Better luck next time!'}</p>
                <button id="close-game-btn" class="join-btn">Back to Menu</button>
            </div>
        `;

        // Add styles for results
        if (window.PVPGameStyles) {
            window.PVPGameStyles.addResultsStyles();
        }

        document.body.appendChild(overlay);

        document.getElementById('close-game-btn').onclick = () => {
            // Safe removal check
            if (overlay && overlay.parentNode === document.body) {
                document.body.removeChild(overlay);
            }
            
            // Повна очистка стану гри
            this.cleanupGameState();
            
            // Повертаємося до головного меню замість PVP меню
            this.returnToMainMenu();
        };
    }

    updateWaitingStatus(submittedCount, totalPlayers, minutesLeft) {
        // Update the game over screen with current status
        const statusElement = document.querySelector('.game-over-content p');
        if (statusElement) {
            statusElement.innerHTML = `
                Waiting for other players to finish...<br>
                <strong>${submittedCount}/${totalPlayers}</strong> players submitted results<br>
                <small>Auto-finish in ~${minutesLeft} minutes if not all submit</small>
            `;
        }
    }

    cleanupGameState() {
        console.log('🧹 Cleaning up game state...');
        
        // Clean up game engine
        if (this.gameEngine) {
            if (this.gameEngine.cleanup) {
                this.gameEngine.cleanup();
            }
            if (this.gameEngine.clearCurrentRoom) {
                this.gameEngine.clearCurrentRoom();
            }
            if (this.gameEngine.stopTimer) {
                this.gameEngine.stopTimer();
            }
        }
        
        // Clear all timers
        if (window.clearAllTimers) {
            window.clearAllTimers();
        }
        
        // Clean up UI
        this.cleanup();
        
        console.log('🧹 Game state cleanup completed');
    }
    
    returnToMainMenu() {
        console.log('🏠 Returning to main menu...');
        
        // Hide game UI and PVP modal, show main menu
        const gameUI = document.getElementById('game-ui');
        const mainMenu = document.getElementById('main-menu');
        const pvpModal = document.getElementById('pvp-modal');

        if (gameUI) gameUI.classList.add('hidden');
        if (pvpModal) pvpModal.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');

        // Reset game state if needed
        if (window.resetGameState) {
            window.resetGameState();
        }

        console.log('✅ Successfully returned to main menu');
    }

    returnToPVPMenu() {
        // Clean up and clear room data
        this.gameEngine.cleanup();

        // Ensure player is unbound from room
        this.gameEngine.clearCurrentRoom();

        // Hide game UI and show main menu
        const gameUI = document.getElementById('game-ui');
        const mainMenu = document.getElementById('main-menu');
        const pvpModal = document.getElementById('pvp-modal');

        if (gameUI) gameUI.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');

        // Show PVP modal with main interface
        if (pvpModal && window.showPVPMainInterface) {
            pvpModal.classList.remove('hidden');
            window.showPVPMainInterface();
        }

        console.log('🔄 Returned to PVP menu, player can join new games');
    }

    cleanup() {
        // Remove forfeit button
        const forfeitBtn = document.getElementById('pvp-forfeit-btn');
        if (forfeitBtn) {
            forfeitBtn.remove();
        }



        // Reset game header to original
        const gameHeader = document.querySelector('.game-header') || document.querySelector('#game-ui h1');
        if (gameHeader) {
            gameHeader.innerHTML = 'IrysCrush';
        }

        // Remove PVP styles
        if (window.PVPGameStyles) {
            window.PVPGameStyles.removeStyles();
        }

        console.log('🧹 PVP Game UI cleaned up');
    }
}

// Export for global access
window.PVPGameUI = PVPGameUI;

console.log('🖼️ PVP Game UI loaded');