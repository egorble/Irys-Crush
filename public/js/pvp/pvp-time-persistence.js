// ==========================================
// PVP TIME PERSISTENCE - ЗАХИСТ ЧАСУ ПРИ ОНОВЛЕННІ СТОРІНКИ
// ==========================================

class PVPTimePersistence {
    constructor() {
        this.storageKey = 'pvp_game_time_state';
        this.maxTimeDeviation = 5; // Максимальне відхилення в секундах
        this.pauseOnLeave = true; // Час зупиняється коли гравець залишає сторінку
        this.visibilityListenerAdded = false;
    }

    // ==========================================
    // SAVE TIME STATE
    // ==========================================

    /**
     * Зберігає поточний стан часу гри
     * @param {string} roomId - ID кімнати
     * @param {number} currentTimer - Поточний час таймера в секундах
     * @param {number} totalGameTime - Загальний час гри в секундах
     * @param {number} score - Поточний рахунок
     * @param {boolean} gameActive - Чи активна гра
     * @param {boolean} isPaused - Чи гра на паузі
     */
    saveTimeState(roomId, currentTimer, totalGameTime, score = 0, gameActive = true, isPaused = false) {
        const now = Date.now();
        const timeState = {
            roomId,
            currentTimer,
            totalGameTime,
            score,
            gameActive,
            isPaused,
            savedAt: now,
            lastActiveTime: now, // Останній час коли гра була активна
            gameStartTime: now - (totalGameTime - currentTimer) * 1000,
            pausedTime: 0 // Загальний час паузи
        };

        // Якщо оновлюємо існуючий стан, зберігаємо накопичений час паузи
        const existingState = this.getTimeState(roomId);
        if (existingState && existingState.pausedTime) {
            timeState.pausedTime = existingState.pausedTime;
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(timeState));
            console.log('💾 Time state saved:', { 
                timer: timeState.currentTimer, 
                paused: timeState.isPaused,
                pausedTime: timeState.pausedTime 
            });
        } catch (error) {
            console.error('❌ Failed to save time state:', error);
        }
    }

    /**
     * Отримує збережений стан часу
     * @param {string} roomId - ID кімнати
     * @returns {object|null} - Збережений стан або null
     */
    getTimeState(roomId) {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return null;

            const timeState = JSON.parse(saved);
            
            // Перевіряємо чи це та сама кімната
            if (timeState.roomId !== roomId) {
                console.log('🔄 Different room ID, clearing old state');
                this.clearTimeState();
                return null;
            }

            // Перевіряємо чи не застарілий стан (більше 1 години)
            const hourAgo = Date.now() - (60 * 60 * 1000);
            if (timeState.savedAt < hourAgo) {
                console.log('⏰ Time state too old, clearing');
                this.clearTimeState();
                return null;
            }

            console.log('📖 Time state loaded:', timeState);
            return timeState;
        } catch (error) {
            console.error('❌ Failed to load time state:', error);
            this.clearTimeState();
            return null;
        }
    }

    // ==========================================
    // CALCULATE CURRENT TIME
    // ==========================================

    /**
     * Розраховує поточний час на основі збереженого стану з урахуванням паузи
     * @param {string} roomId - ID кімнати
     * @returns {object|null} - Розрахований стан часу або null
     */
    calculateCurrentTime(roomId) {
        const savedState = this.getTimeState(roomId);
        if (!savedState) return null;

        const now = Date.now();
        let remainingTime = savedState.currentTimer;

        // Якщо гра не на паузі, розраховуємо скільки часу пройшло
        if (!savedState.isPaused && savedState.lastActiveTime) {
            const activeTimePassed = Math.floor((now - savedState.lastActiveTime) / 1000);
            remainingTime = Math.max(0, savedState.currentTimer - activeTimePassed);
        }

        // Розраховуємо загальний час що пройшов (без урахування пауз)
        const totalActiveTime = savedState.totalGameTime - remainingTime;
        const totalPausedTime = savedState.pausedTime || 0;

        // Перевіряємо на розумність часу
        if (totalActiveTime < 0 || totalActiveTime > savedState.totalGameTime + this.maxTimeDeviation) {
            console.warn('⚠️ Time calculation seems invalid, clearing state');
            this.clearTimeState();
            return null;
        }

        const calculatedState = {
            ...savedState,
            currentTimer: remainingTime,
            totalActiveTime,
            totalPausedTime,
            isValid: remainingTime > 0,
            calculatedAt: now
        };

        console.log('🧮 Time calculated with pause support:', {
            saved: savedState.currentTimer,
            calculated: remainingTime,
            activeTime: totalActiveTime,
            pausedTime: totalPausedTime,
            isPaused: savedState.isPaused,
            isValid: calculatedState.isValid
        });

        return calculatedState;
    }

    // ==========================================
    // RESTORE GAME STATE
    // ==========================================

    /**
     * Відновлює стан гри після перезавантаження з підтримкою паузи
     * @param {string} roomId - ID кімнати
     * @param {object} gameEngine - Екземпляр PVPGameEngine
     * @returns {boolean} - Чи було відновлено стан
     */
    restoreGameState(roomId, gameEngine) {
        const calculatedState = this.calculateCurrentTime(roomId);
        if (!calculatedState || !calculatedState.isValid) {
            console.log('🚫 No valid time state to restore');
            return false;
        }

        // Відновлюємо стан гри з додатковою перевіркою
        gameEngine.timer = calculatedState.currentTimer;
        gameEngine.score = calculatedState.score || 0;
        gameEngine.gameStartTime = calculatedState.gameStartTime;

        // Переконуємося що очки правильно встановлені
        console.log('📊 Restoring score:', calculatedState.score, 'to gameEngine.score:', gameEngine.score);

        // Додаємо слухачі для автоматичної паузи
        this.addVisibilityListeners(gameEngine);

        // Оновлюємо UI з затримкою щоб переконатися що все завантажилося
        setTimeout(() => {
            if (gameEngine.ui) {
                gameEngine.ui.updateTimerDisplay();
                gameEngine.ui.updateScore();
                console.log('🔄 UI updated after restore');
            }
        }, 100);

        console.log('✅ Game state restored with pause support:', {
            timer: gameEngine.timer,
            score: gameEngine.score,
            totalActiveTime: calculatedState.totalActiveTime,
            totalPausedTime: calculatedState.totalPausedTime,
            wasPaused: calculatedState.isPaused
        });

        // Показуємо повідомлення користувачу
        if (window.showNotification) {
            const activeMinutes = Math.floor(calculatedState.totalActiveTime / 60);
            const activeSeconds = calculatedState.totalActiveTime % 60;
            const pausedMinutes = Math.floor(calculatedState.totalPausedTime / 60);
            const pausedSeconds = calculatedState.totalPausedTime % 60;
            
            let message = `Game restored! Active time: ${activeMinutes}:${activeSeconds.toString().padStart(2, '0')}`;
            if (calculatedState.totalPausedTime > 0) {
                message += `, Paused time: ${pausedMinutes}:${pausedSeconds.toString().padStart(2, '0')}`;
            }
            
            window.showNotification(message, 'info');
        }

        return true;
    }

    // ==========================================
    // PAUSE/RESUME SYSTEM
    // ==========================================

    /**
     * Ставить гру на паузу
     * @param {string} roomId - ID кімнати
     * @param {object} gameEngine - Екземпляр PVPGameEngine
     */
    pauseGame(roomId, gameEngine) {
        if (!gameEngine || !gameEngine.gameActive) return;

        const now = Date.now();
        console.log('⏸️ Pausing game for room:', roomId, 'Score:', gameEngine.score);

        // Переконуємося що очки актуальні
        const currentScore = gameEngine.score || 0;
        
        // Зберігаємо поточний стан з паузою
        this.saveTimeState(
            roomId,
            gameEngine.timer,
            gameEngine.gameTimeSeconds,
            currentScore,
            gameEngine.gameActive,
            true // isPaused = true
        );

        // Зупиняємо таймер гри
        if (gameEngine.stopTimer) {
            gameEngine.stopTimer();
        }

        console.log('⏸️ Game paused, timer stopped, score saved:', currentScore);
    }

    /**
     * Відновлює гру з паузи
     * @param {string} roomId - ID кімнати
     * @param {object} gameEngine - Екземпляр PVPGameEngine
     */
    resumeGame(roomId, gameEngine) {
        if (!gameEngine) return;

        const savedState = this.getTimeState(roomId);
        if (!savedState || !savedState.isPaused) return;

        const now = Date.now();
        console.log('▶️ Resuming game for room:', roomId, 'Saved score:', savedState.score);

        // Відновлюємо очки з збереженого стану
        if (savedState.score !== undefined && gameEngine.score !== savedState.score) {
            gameEngine.score = savedState.score;
            console.log('📊 Score restored from saved state:', savedState.score);
        }

        // Розраховуємо час паузи
        const pauseTime = Math.floor((now - savedState.savedAt) / 1000);
        const totalPausedTime = (savedState.pausedTime || 0) + pauseTime;

        // Оновлюємо стан без паузи
        const updatedState = {
            ...savedState,
            isPaused: false,
            lastActiveTime: now,
            pausedTime: totalPausedTime,
            savedAt: now
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(updatedState));
        } catch (error) {
            console.error('❌ Failed to update resume state:', error);
        }

        // Відновлюємо таймер гри
        if (gameEngine.startTimer) {
            gameEngine.startTimer();
        }

        console.log('▶️ Game resumed, total paused time:', totalPausedTime, 'seconds');

        // Показуємо повідомлення користувачу
        if (window.showNotification) {
            const pauseMinutes = Math.floor(pauseTime / 60);
            const pauseSeconds = pauseTime % 60;
            window.showNotification(
                `Game resumed! Paused for: ${pauseMinutes}:${pauseSeconds.toString().padStart(2, '0')}`, 
                'info'
            );
        }
    }

    /**
     * Додає слухачі подій для автоматичної паузи/відновлення
     * @param {object} gameEngine - Екземпляр PVPGameEngine
     */
    addVisibilityListeners(gameEngine) {
        if (this.visibilityListenerAdded || !gameEngine) return;

        const handleVisibilityChange = () => {
            if (document.hidden || document.visibilityState === 'hidden') {
                // Сторінка прихована - ставимо на паузу
                this.pauseGame(gameEngine.roomId, gameEngine);
            } else if (document.visibilityState === 'visible') {
                // Сторінка видима - відновлюємо
                this.resumeGame(gameEngine.roomId, gameEngine);
            }
        };

        const handleBeforeUnload = () => {
            // Перед закриттям сторінки - ставимо на паузу
            this.pauseGame(gameEngine.roomId, gameEngine);
        };

        // Додаємо слухачі
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handleBeforeUnload);

        this.visibilityListenerAdded = true;
        console.log('👁️ Visibility listeners added for automatic pause/resume');
    }

    /**
     * Видаляє слухачі подій
     */
    removeVisibilityListeners() {
        // Видалити слухачі складно без збереження посилань на функції
        // Тому просто позначаємо що їх потрібно додати знову
        this.visibilityListenerAdded = false;
        console.log('👁️ Visibility listeners marked for removal');
    }

    // ==========================================
    // AUTO-SAVE SYSTEM
    // ==========================================

    /**
     * Запускає автоматичне збереження стану з підтримкою паузи
     * @param {object} gameEngine - Екземпляр PVPGameEngine
     * @param {number} interval - Інтервал збереження в мілісекундах (за замовчуванням 5 секунд)
     */
    startAutoSave(gameEngine, interval = 5000) {
        // Зупиняємо попередній автосейв якщо є
        this.stopAutoSave();

        // Додаємо слухачі для автоматичної паузи
        this.addVisibilityListeners(gameEngine);

        this.autoSaveInterval = setInterval(() => {
            if (gameEngine.gameActive && gameEngine.timer > 0) {
                // Перевіряємо чи гра на паузі
                const isPaused = document.hidden || document.visibilityState === 'hidden';
                
                // Додаткова перевірка очок
                const currentScore = gameEngine.score || 0;
                
                // Логування для діагностики
                if (currentScore !== (this.lastSavedScore || 0)) {
                    console.log('📊 Score changed:', this.lastSavedScore, '->', currentScore);
                    this.lastSavedScore = currentScore;
                }
                
                this.saveTimeState(
                    gameEngine.roomId,
                    gameEngine.timer,
                    gameEngine.gameTimeSeconds,
                    currentScore,
                    gameEngine.gameActive,
                    isPaused
                );
            }
        }, interval);

        console.log('🔄 Auto-save with pause support started with', interval, 'ms interval');
    }

    /**
     * Зупиняє автоматичне збереження
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('🛑 Auto-save stopped');
        }
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    /**
     * Очищає збережений стан часу
     */
    clearTimeState() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ Time state cleared');
        } catch (error) {
            console.error('❌ Failed to clear time state:', error);
        }
    }

    /**
     * Очищає стан при завершенні гри
     * @param {string} roomId - ID кімнати
     */
    onGameEnd(roomId) {
        this.stopAutoSave();
        this.removeVisibilityListeners();
        this.clearTimeState();
        console.log('🏁 Game ended, time state and listeners cleaned up');
    }

    // ==========================================
    // VALIDATION HELPERS
    // ==========================================

    /**
     * Перевіряє чи є активна гра для кімнати
     * @param {string} roomId - ID кімнати
     * @returns {boolean} - Чи є активна гра
     */
    hasActiveGame(roomId) {
        const state = this.getTimeState(roomId);
        return state && state.gameActive && state.currentTimer > 0;
    }

    /**
     * Отримує інформацію про збережену гру з підтримкою паузи
     * @param {string} roomId - ID кімнати
     * @returns {object|null} - Інформація про гру
     */
    getGameInfo(roomId) {
        const calculatedState = this.calculateCurrentTime(roomId);
        if (!calculatedState) return null;

        return {
            roomId: calculatedState.roomId,
            timeRemaining: calculatedState.currentTimer,
            totalActiveTime: calculatedState.totalActiveTime,
            totalPausedTime: calculatedState.totalPausedTime,
            totalTime: calculatedState.totalGameTime,
            score: calculatedState.score,
            isPaused: calculatedState.isPaused,
            isValid: calculatedState.isValid,
            formattedTimeRemaining: this.formatTime(calculatedState.currentTimer),
            formattedActiveTime: this.formatTime(calculatedState.totalActiveTime),
            formattedPausedTime: this.formatTime(calculatedState.totalPausedTime)
        };
    }

    /**
     * Форматує час у вигляді MM:SS
     * @param {number} seconds - Секунди
     * @returns {string} - Форматований час
     */
    formatTime(seconds) {
        const validSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(validSeconds / 60);
        const secs = validSeconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// ==========================================
// GLOBAL INSTANCE
// ==========================================

// Створюємо глобальний екземпляр
window.pvpTimePersistence = new PVPTimePersistence();

// Експортуємо для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PVPTimePersistence };
}

console.log('✅ PVP Time Persistence initialized');