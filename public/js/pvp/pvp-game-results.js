// ==========================================
// PVP GAME RESULTS MANAGER
// ==========================================

class PVPGameResults {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
    }

    async submitGameResult() {
        console.log('🚨 SUBMIT GAME RESULT DEBUG: Function called', {
            resultSubmitted: this.gameEngine.resultSubmitted,
            submissionInProgress: this.gameEngine.submissionInProgress,
            finalScore: this.gameEngine.finalScore,
            stackTrace: new Error().stack
        });
        
        // Double protection against multiple submissions
        if (this.gameEngine.resultSubmitted) {
            console.log('📤 Result already submitted, skipping...');
            return;
        }
        
        if (this.gameEngine.submissionInProgress) {
            console.log('📤 Submission already in progress, skipping...');
            return;
        }
        
        this.gameEngine.submissionInProgress = true;

        try {
            console.log('📤 Submitting game result to blockchain...');

            if (!window.pvpInstance || !window.pvpInstance.contract) {
                throw new Error('PVP system not available');
            }

            // Check if score already submitted
            if (window.signer) {
                const userAddress = await window.signer.getAddress();
                const currentScore = await window.pvpInstance.contract.getPlayerRoomScore(this.gameEngine.roomId, userAddress);
                
                if (currentScore > 0) {
                    console.log('✅ Score already submitted to blockchain:', currentScore.toString());
                    this.gameEngine.resultSubmitted = true;
                    if (window.showNotification) {
                        window.showNotification('Score already submitted!', 'info');
                    }
                    return;
                }
                
                // Additional check for submission status
                if (!window.pvpInstance) {
                    console.error('❌ PVP instance not available for submission check');
                    return;
                }
                
                const statusResult = await window.pvpInstance.checkAllScoresSubmitted(this.gameEngine.roomId);
                if (statusResult.success) {
                    const roomInfo = await window.pvpInstance.getRoomInfo(this.gameEngine.roomId);
                    if (roomInfo.success) {
                        const playerInRoom = roomInfo.room.players.includes(userAddress);
                        const totalSubmitted = statusResult.submittedCount;
                        const totalPlayers = statusResult.totalPlayers;
                        
                        if (playerInRoom && totalSubmitted === totalPlayers && statusResult.allSubmitted) {
                            console.log('✅ All players submitted, including us - result already sent');
                            this.gameEngine.resultSubmitted = true;
                            if (window.showNotification) {
                                window.showNotification('Result already submitted!', 'info');
                            }
                            return;
                        }
                    }
                }
            }

            // Add random delay to prevent simultaneous submissions
            const delay = Math.random() * 2000;
            console.log(`⏳ Adding ${Math.round(delay)}ms delay before submission to prevent conflicts`);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Submit result to smart contract
            console.log('🚨 SUBMISSION DEBUG: About to call submitRoomScore', {
                roomId: this.gameEngine.roomId,
                finalScore: this.gameEngine.finalScore,
                resultSubmitted: this.gameEngine.resultSubmitted,
                submissionInProgress: this.gameEngine.submissionInProgress
            });
            
            const tx = await window.pvpInstance.contract.submitRoomScore(
                this.gameEngine.roomId,
                this.gameEngine.finalScore
            );

            console.log('📝 Result submission transaction:', tx.hash);

            if (window.showNotification) {
                window.showNotification('Submitting game result...', 'info');
            }

            await tx.wait();

            this.gameEngine.resultSubmitted = true;
            this.gameEngine.submissionInProgress = false;
            console.log('✅ Game result submitted successfully');

            if (window.showNotification) {
                window.showNotification('Game result submitted!', 'success');
            }

            // Check submission status after successful submission
            setTimeout(async () => {
                await this.checkSubmissionStatusReadOnly();
            }, 2000);

            this.gameEngine.clearCurrentRoom();

        } catch (error) {
            console.error('❌ Failed to submit game result:', error);

            // Check if it's a duplicate submission error
            if (error.message && (error.message.includes('execution reverted') || error.message.includes('ScoreAlreadySubmitted'))) {
                console.log('💡 Transaction reverted - score already submitted');
                
                if (window.signer) {
                    try {
                        const userAddress = await window.signer.getAddress();
                        const currentScore = await window.pvpInstance.contract.getPlayerRoomScore(this.gameEngine.roomId, userAddress);
                        
                        if (currentScore > 0) {
                            console.log('✅ Score was actually submitted successfully:', currentScore.toString());
                            this.gameEngine.resultSubmitted = true;
                            
                            if (window.showNotification) {
                                window.showNotification('Score submitted successfully!', 'success');
                            }
                            
                            setTimeout(async () => {
                                await this.checkSubmissionStatusReadOnly();
                            }, 2000);
                            
                            this.gameEngine.clearCurrentRoom();
                            return;
                        }
                    } catch (checkError) {
                        console.error('❌ Error checking submission status:', checkError);
                    }
                }
                
                if (window.showNotification) {
                    window.showNotification('Score may have been submitted already', 'warning');
                }
            } else {
                if (window.showNotification) {
                    window.showNotification(`Failed to submit result: ${error.message}`, 'error');
                }
            }

            this.gameEngine.clearCurrentRoom();
        } finally {
            this.gameEngine.submissionInProgress = false;
            if (window.currentPVPGame) {
                window.currentPVPGame.submissionInProgress = false;
            }
        }
    }

    async checkSubmissionStatusReadOnly() {
        try {
            if (!window.pvpInstance) return;

            console.log('📊 Checking submission status (read-only)...');

            const statusResult = await window.pvpInstance.checkAllScoresSubmitted(this.gameEngine.roomId);
            
            if (statusResult.success) {
                console.log(`📈 Submission status: ${statusResult.submittedCount}/${statusResult.totalPlayers} players submitted`);
                
                if (statusResult.allSubmitted) {
                    console.log('🎉 All players submitted! Game should finish automatically.');
                    
                    const winnerResult = await window.pvpInstance.getRoomWinner(this.gameEngine.roomId);
                    if (winnerResult.success) {
                        console.log(`🏆 Winner: ${winnerResult.winner.nickname} with ${winnerResult.winner.score} points`);
                    }
                    
                    if (window.signer) {
                        const userAddress = await window.signer.getAddress();
                        const positionResult = await window.pvpInstance.getPlayerRoomPosition(this.gameEngine.roomId, userAddress);
                        if (positionResult.success && positionResult.position > 0) {
                            console.log(`📍 Your position: ${positionResult.position} with ${positionResult.score} points`);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error checking submission status:', error);
        }
    }

    async checkGameResults() {
        try {
            console.log('🔄 Starting result checking process...');

            setTimeout(async () => {
                await this.monitorGameCompletion();
            }, 3000);

        } catch (error) {
            console.error('Error in checkGameResults:', error);
        }
    }

    async monitorGameCompletion() {
        try {
            if (!window.pvpInstance || !window.pvpInstance.contract) return;

            console.log('📊 Monitoring game completion...');

            const maxChecks = 60; // 10 minutes / 10 seconds
            let checkCount = 0;

            const checkInterval = setInterval(async () => {
                try {
                    checkCount++;
                    console.log(`🔍 Check ${checkCount}/${maxChecks} - Monitoring submissions...`);

                    if (!window.pvpInstance || !window.pvpInstance.contract) {
                        throw new Error('PVP contract not available');
                    }

                    let allSubmitted = false;
                    let submittedCount = 0;
                    let totalPlayers = 0;

                    if (!window.pvpInstance) {
                        console.error('❌ PVP instance not available for status check');
                        return;
                    }
                    const statusResult = await window.pvpInstance.checkAllScoresSubmitted(this.gameEngine.roomId);
                    if (statusResult.success) {
                        allSubmitted = statusResult.allSubmitted;
                        submittedCount = statusResult.submittedCount;
                        totalPlayers = statusResult.totalPlayers;
                    } else {
                        console.log('⚠️ Using fallback method to check game status');
                        if (!window.pvpInstance) {
                            console.error('❌ PVP instance not available for room info check');
                            return;
                        }
                        const roomInfo = await window.pvpInstance.getRoomInfo(this.gameEngine.roomId);
                        if (roomInfo.success) {
                            totalPlayers = roomInfo.room.players.length;
                            if (!roomInfo.room.isActive) {
                                allSubmitted = true;
                                submittedCount = totalPlayers;
                            }
                        }
                    }

                    console.log(`📈 Submission status: ${submittedCount}/${totalPlayers} players submitted`);

                    if (allSubmitted) {
                        console.log('✅ All players submitted! Finishing game immediately...');
                        clearInterval(checkInterval);

                        if (window.showNotification) {
                            window.showNotification('All players submitted results! Finalizing game...', 'info');
                        }

                        console.log('🎉 Game finished automatically!');
                        await this.showGameResults();

                    } else if (checkCount >= maxChecks) {
                        console.log('⏰ 10-minute timeout reached! Auto-finishing game...');
                        clearInterval(checkInterval);

                        if (window.showNotification) {
                            window.showNotification('Timeout reached! Finalizing game with submitted results...', 'warning');
                        }

                        await this.handleGameTimeout();

                    } else {
                        this.gameEngine.ui.updateWaitingStatus(submittedCount, totalPlayers, 10 - Math.floor(checkCount / 6));
                    }

                } catch (error) {
                    console.error('Error in monitoring check:', error);

                    try {
                        const roomInfo = await window.pvpInstance.getRoomInfo(this.gameEngine.roomId);
                        if (roomInfo.success && !roomInfo.room.isActive) {
                            console.log('🎉 Game completed by someone else');
                            clearInterval(checkInterval);
                            await this.showGameResults();
                            return;
                        }
                    } catch (roomError) {
                        console.error('Error checking room status:', roomError);
                    }

                    if (checkCount >= maxChecks) {
                        console.log('⏰ Max attempts reached, timing out...');
                        clearInterval(checkInterval);
                        await this.handleGameTimeout();
                    }
                }
            }, 10000);

        } catch (error) {
            console.error('Error in monitorGameCompletion:', error);
        }
    }

    async handleGameTimeout() {
        try {
            console.log('⏰ Handling game timeout...');

            console.log('🎉 Game should be auto-finished by smart contract after 10-minute timeout');
            
            if (window.showNotification) {
                window.showNotification('Game finished automatically! Loading results...', 'info');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.showGameResults();

        } catch (error) {
            console.error('Error in handleGameTimeout:', error);

            if (window.showNotification) {
                window.showNotification('Error loading game results. Please try refreshing.', 'error');
            }
        }
    }

    async showGameResults() {
        try {
            console.log('🏆 Showing game results...');

            const winnerResult = await window.pvpInstance.getRoomWinner(this.gameEngine.roomId);
            
            if (winnerResult.success) {
                const winner = winnerResult.winner;
                console.log(`🏆 Winner: ${winner.nickname} (${winner.address}) with ${winner.score} points`);

                const userAddress = await window.pvpInstance.signer.getAddress();
                const isWinner = winner.address.toLowerCase() === userAddress.toLowerCase();

                const positionResult = await window.pvpInstance.getPlayerRoomPosition(this.gameEngine.roomId, userAddress);
                let userPosition = 0;
                let userScore = 0;
                
                if (positionResult.success) {
                    userPosition = positionResult.position;
                    userScore = positionResult.score;
                    console.log(`📍 Your position: ${userPosition} with ${userScore} points`);
                }

                if (window.showNotification) {
                    if (isWinner) {
                        window.showNotification(`🎉 You won! Score: ${winner.score}`, 'success');
                    } else {
                        window.showNotification(`Winner: ${winner.nickname} (${winner.score} points). You finished ${userPosition > 0 ? `#${userPosition}` : 'unranked'}`, 'info');
                    }
                }

                const leaderboard = await window.pvpInstance.contract.getRoomLeaderboard(this.gameEngine.roomId, 10);
                
                this.gameEngine.ui.showFinalResults(leaderboard, isWinner, winner, userPosition, userScore);
            } else {
                console.log('⚠️ Could not get winner data');
                
                const leaderboard = await window.pvpInstance.contract.getRoomLeaderboard(this.gameEngine.roomId, 10);
                
                if (leaderboard && leaderboard[0].length > 0) {
                    const winner = leaderboard[0][0];
                    const winnerScore = leaderboard[2][0];
                    const winnerNickname = leaderboard[1][0];

                    const userAddress = await window.pvpInstance.signer.getAddress();
                    const isWinner = winner.toLowerCase() === userAddress.toLowerCase();

                    this.gameEngine.ui.showFinalResults(leaderboard, isWinner);
                } else {
                    console.log('⚠️ No results available');
                    if (window.showNotification) {
                        window.showNotification('Game completed! No results available.', 'info');
                    }
                }
            }

        } catch (error) {
            console.error('Error showing game results:', error);

            if (window.showNotification) {
                window.showNotification('Error loading game results.', 'error');
            }
        }
    }
}

// Export for global access
window.PVPGameResults = PVPGameResults;

console.log('🏆 PVP Game Results loaded');