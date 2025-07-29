// ==========================================
// PVP GAME STYLES MANAGER
// ==========================================

class PVPGameStyles {
    static addPVPStyles() {
        if (document.getElementById('pvp-styles')) return;

        const style = document.createElement('style');
        style.id = 'pvp-styles';
        style.textContent = `
            .pvp-room-info {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            
            .forfeit-btn {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #f44336, #d32f2f);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.3s ease;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            
            .forfeit-btn:hover {
                background: linear-gradient(45deg, #d32f2f, #b71c1c);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            }
            
            .forfeit-btn:active {
                transform: translateY(0);
            }
            

            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;

        document.head.appendChild(style);
    }

    static addGameStyles() {
        if (document.getElementById('pvp-game-styles')) return;

        const style = document.createElement('style');
        style.id = 'pvp-game-styles';
        style.textContent = `
            .pvp-game-container {
                padding: 20px;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .pvp-game-header {
                text-align: center;
                margin-bottom: 20px;
            }
            
            .pvp-game-header h2 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .game-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 15px;
                border-radius: 10px;
                font-weight: bold;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .timer-display {
                font-size: 18px;
                color: #ffeb3b;
            }
            
            .timer-warning {
                color: #ff5722 !important;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .pvp-game-board {
                display: grid;
                grid-template-columns: repeat(8, 1fr);
                gap: 2px;
                background: #333;
                padding: 10px;
                border-radius: 10px;
                margin: 20px 0;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .pvp-cell {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(45deg, #f0f0f0, #e0e0e0);
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                position: relative;
                overflow: hidden;
            }
            
            .pvp-cell img {
                width: 80%;
                height: 80%;
                object-fit: contain;
                transition: all 0.2s ease;
            }
            
            .pvp-cell:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            
            .pvp-cell.selected {
                box-shadow: 0 0 0 4px #ffb347;
                transform: scale(1.05);
            }
            
            .pvp-cell.bomb {
                background: linear-gradient(45deg, #ff5722, #d32f2f);
            }
            
            .pvp-cell.bomb img {
                filter: drop-shadow(0 0 8px rgba(255, 87, 34, 0.8));
            }
            
            .pvp-game-footer {
                text-align: center;
                margin-top: 20px;
            }
            
            .game-status {
                margin-bottom: 15px;
                font-size: 16px;
                font-weight: bold;
                color: #333;
            }
            
            .game-over-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .game-over-content {
                background: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 400px;
                width: 90%;
            }
            
            .game-over-content h3 {
                margin: 0 0 20px 0;
                color: #333;
            }
            
            .final-stats {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 10px;
                margin: 15px 0;
            }
            
            .final-stats div {
                margin: 5px 0;
                font-weight: bold;
            }
        `;

        document.head.appendChild(style);
    }

    static addResultsStyles() {
        if (document.getElementById('pvp-results-styles')) return;

        const style = document.createElement('style');
        style.id = 'pvp-results-styles';
        style.textContent = `
            .leaderboard-results {
                background: #f5f5f5;
                border-radius: 10px;
                padding: 15px;
                margin: 15px 0;
            }
            
            .result-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin: 5px 0;
                background: white;
                border-radius: 5px;
                border-left: 3px solid #ddd;
            }
            
            .result-row.winner {
                background: linear-gradient(45deg, #fff3cd, #ffeaa7);
                border-left-color: #ffd700;
                font-weight: bold;
            }
            
            .position {
                font-size: 18px;
                min-width: 30px;
            }
            
            .nickname {
                flex: 1;
                text-align: left;
                margin: 0 10px;
            }
            
            .score {
                font-weight: bold;
                color: #333;
            }
        `;

        document.head.appendChild(style);
    }

    static removeStyles() {
        const stylesToRemove = [
            'pvp-styles',
            'pvp-game-styles',
            'pvp-results-styles'
        ];

        stylesToRemove.forEach(styleId => {
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        });
    }
}

// Export for global access
window.PVPGameStyles = PVPGameStyles;

console.log('🎨 PVP Game Styles loaded');