// ==========================================
// PVP TIME MANAGER - ЦЕНТРАЛІЗОВАНЕ УПРАВЛІННЯ ЧАСОМ
// ==========================================

class PVPTimeManager {
    constructor() {
        this.roomTimeCache = new Map(); // roomId -> timeData
        this.defaultGameTimeMinutes = 2;
        this.minGameTimeMinutes = 1;
        this.maxGameTimeMinutes = 30;
    }

    // ==========================================
    // TIME VALIDATION AND CONVERSION
    // ==========================================

    /**
     * Валідує та конвертує час гри
     * @param {any} input - Вхідне значення (може бути секунди, хвилини, або невалідне)
     * @param {string} inputType - Тип вхідного значення ('seconds', 'minutes', 'auto')
     * @returns {object} - { minutes, seconds, isValid, source }
     */
    validateAndConvertTime(input, inputType = 'auto') {
        console.log('🕐 Time validation input:', { input, inputType, type: typeof input });

        let timeMinutes = this.defaultGameTimeMinutes;
        let isValid = false;
        let source = 'default';

        try {
            // Перевіряємо чи input є валідним числом
            const numericInput = Number(input);
            
            if (!isNaN(numericInput) && numericInput > 0) {
                if (inputType === 'seconds' || (inputType === 'auto' && numericInput > 30)) {
                    // Вхідне значення в секундах
                    timeMinutes = Math.floor(numericInput / 60);
                    source = 'seconds_converted';
                } else if (inputType === 'minutes' || (inputType === 'auto' && numericInput <= 30)) {
                    // Вхідне значення в хвилинах
                    timeMinutes = Math.floor(numericInput);
                    source = 'minutes_direct';
                }

                // Перевіряємо межі
                if (timeMinutes >= this.minGameTimeMinutes && timeMinutes <= this.maxGameTimeMinutes) {
                    isValid = true;
                } else {
                    console.warn(`⚠️ Time ${timeMinutes} minutes is out of bounds (${this.minGameTimeMinutes}-${this.maxGameTimeMinutes})`);
                    timeMinutes = Math.max(this.minGameTimeMinutes, Math.min(this.maxGameTimeMinutes, timeMinutes));
                    source = 'clamped';
                    isValid = true;
                }
            }
        } catch (error) {
            console.error('❌ Time validation error:', error);
        }

        const result = {
            minutes: timeMinutes,
            seconds: timeMinutes * 60,
            isValid,
            source,
            originalInput: input
        };

        console.log('🕐 Time validation result:', result);
        return result;
    }

    // ==========================================
    // ROOM TIME MANAGEMENT
    // ==========================================

    /**
     * Встановлює час для кімнати
     * @param {string} roomId - ID кімнати
     * @param {any} timeValue - Значення часу
     * @param {string} source - Джерело часу ('contract', 'ui', 'default')
     * @param {string} inputType - Тип вхідного значення
     */
    setRoomTime(roomId, timeValue, source = 'unknown', inputType = 'auto') {
        const timeData = this.validateAndConvertTime(timeValue, inputType);
        timeData.source = source;
        timeData.setAt = Date.now();
        
        this.roomTimeCache.set(roomId, timeData);
        
        console.log(`🕐 Room ${roomId} time set:`, timeData);
        return timeData;
    }

    /**
     * Отримує час для кімнати
     * @param {string} roomId - ID кімнати
     * @returns {object} - Дані про час
     */
    getRoomTime(roomId) {
        const cached = this.roomTimeCache.get(roomId);
        if (cached) {
            console.log(`🕐 Room ${roomId} time retrieved from cache:`, cached);
            return cached;
        }

        // Якщо немає кешованого часу, повертаємо дефолтний
        const defaultTime = this.validateAndConvertTime(this.defaultGameTimeMinutes, 'minutes');
        defaultTime.source = 'default_fallback';
        
        console.log(`🕐 Room ${roomId} using default time:`, defaultTime);
        return defaultTime;
    }

    /**
     * Отримує час з контракту та кешує його
     * @param {string} roomId - ID кімнати
     * @param {object} contract - Контракт
     * @returns {Promise<object>} - Дані про час
     */
    async fetchAndCacheRoomTimeFromContract(roomId, contract) {
        try {
            console.log(`🔍 Time Manager: Fetching time for room ${roomId} from contract...`);
            
            const room = await contract.getPvPRoom(roomId);
            // Контракт повертає: (host, entryFee, gameTime, players, isActive, gameStarted, maxPlayers)
            // gameTime знаходиться на позиції [2]
            const rawGameTime = room[2]; // gameTime з контракту
            const gameDurationSeconds = Number(rawGameTime);
            
            console.log(`🔍 Time Manager: Contract raw data for room ${roomId}:`, {
                rawGameTime: rawGameTime.toString(),
                rawGameTimeType: typeof rawGameTime,
                gameDurationSeconds,
                isValid: !isNaN(gameDurationSeconds) && gameDurationSeconds > 0
            });
            
            // Додаткова валідація
            if (isNaN(gameDurationSeconds) || gameDurationSeconds <= 0) {
                console.warn(`⚠️ Time Manager: Invalid time from contract for room ${roomId}, using default`);
                const defaultTime = this.setRoomTime(roomId, this.defaultGameTimeMinutes, 'contract_invalid', 'minutes');
                return defaultTime;
            }
            
            const timeData = this.setRoomTime(roomId, gameDurationSeconds, 'contract', 'seconds');
            
            console.log(`✅ Time Manager: Room ${roomId} time fetched and cached:`, {
                roomId,
                contractSeconds: gameDurationSeconds,
                processedMinutes: timeData.minutes,
                processedSeconds: timeData.seconds,
                source: timeData.source
            });
            
            return timeData;
        } catch (error) {
            console.error(`❌ Time Manager: Failed to fetch time for room ${roomId}:`, error);
            
            // Повертаємо дефолтний час у випадку помилки
            const defaultTime = this.setRoomTime(roomId, this.defaultGameTimeMinutes, 'error_fallback', 'minutes');
            return defaultTime;
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Форматує час у вигляді MM:SS
     * @param {number} seconds - Секунди
     * @returns {string} - Форматований час
     */
    formatTime(seconds) {
        // Додаткова валідація
        const validSeconds = isNaN(seconds) || seconds < 0 ? 0 : Math.floor(seconds);
        
        const minutes = Math.floor(validSeconds / 60);
        const secs = validSeconds % 60;
        
        // Перевіряємо на NaN після всіх операцій
        const formattedMinutes = isNaN(minutes) ? 0 : minutes;
        const formattedSeconds = isNaN(secs) ? 0 : secs;
        
        return `${formattedMinutes}:${formattedSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Очищає кеш часу для кімнати
     * @param {string} roomId - ID кімнати
     */
    clearRoomTime(roomId) {
        this.roomTimeCache.delete(roomId);
        console.log(`🗑️ Cleared time cache for room ${roomId}`);
    }

    /**
     * Очищає весь кеш часу
     */
    clearAllRoomTimes() {
        this.roomTimeCache.clear();
        console.log('🗑️ Cleared all room time cache');
    }

    /**
     * Отримує статистику кешу
     */
    getCacheStats() {
        const stats = {
            totalRooms: this.roomTimeCache.size,
            rooms: {}
        };

        for (const [roomId, timeData] of this.roomTimeCache.entries()) {
            stats.rooms[roomId] = {
                minutes: timeData.minutes,
                source: timeData.source,
                setAt: new Date(timeData.setAt).toISOString()
            };
        }

        return stats;
    }

    // ==========================================
    // INTEGRATION HELPERS
    // ==========================================

    /**
     * Створює функцію для використання в PVPGameEngine
     * @param {string} roomId - ID кімнати
     * @returns {function} - Функція для отримання часу
     */
    createTimeGetter(roomId) {
        return () => {
            const timeData = this.getRoomTime(roomId);
            return {
                minutes: timeData.minutes,
                seconds: timeData.seconds,
                formatted: this.formatTime(timeData.seconds)
            };
        };
    }

    /**
     * Синхронізує час між всіма компонентами PVP системи
     * @param {string} roomId - ID кімнати
     * @param {any} timeValue - Значення часу
     * @param {string} source - Джерело часу
     */
    syncTimeAcrossComponents(roomId, timeValue, source = 'sync') {
        const timeData = this.setRoomTime(roomId, timeValue, source);
        
        // Оновлюємо UI елементи, якщо вони існують
        this.updateUIElements(roomId, timeData);
        
        // Повідомляємо інші компоненти про зміну часу
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('pvpTimeUpdated', {
                detail: { roomId, timeData }
            }));
        }
        
        return timeData;
    }

    /**
     * Оновлює UI елементи з новим часом
     * @param {string} roomId - ID кімнати
     * @param {object} timeData - Дані про час
     */
    updateUIElements(roomId, timeData) {
        // НЕ оновлюємо таймер безпосередньо, щоб уникнути конфлікту з PVP Game Engine
        // Таймер оновлюється тільки через PVP Game Engine
        
        // Оновлюємо інформацію про кімнату в UI
        const roomInfoElements = document.querySelectorAll(`[data-room-id="${roomId}"] .game-duration`);
        roomInfoElements.forEach(element => {
            element.textContent = `${timeData.minutes} min`;
        });
        
        console.log('🔄 Time Manager updated UI elements for room', roomId, '- timer left to PVP Game Engine');
    }
}

// ==========================================
// GLOBAL INSTANCE
// ==========================================

// Створюємо глобальний екземпляр
window.pvpTimeManager = new PVPTimeManager();

// Експортуємо для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PVPTimeManager };
}

console.log('✅ PVP Time Manager initialized');