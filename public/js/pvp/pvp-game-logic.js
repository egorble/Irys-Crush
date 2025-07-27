// ==========================================
// PVP GAME LOGIC - MATCH-3 MECHANICS
// ==========================================

class PVPGameLogic {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.GRID_SIZE = 8;
        this.ICONS = [
            { name: 'apple', src: 'images/apple.png' },
            { name: 'bread', src: 'images/bread.png' },
            { name: 'lemon', src: 'images/lemon.png' },
            { name: 'cookie', src: 'images/cookie.png' }
        ];
        this.BOMB_ICON = { name: 'bomb', src: 'images/bomb.png' };
    }

    // ==========================================
    // BOARD GENERATION
    // ==========================================

    generateBoard() {
        this.gameEngine.board = [];
        for (let r = 0; r < this.GRID_SIZE; r++) {
            const row = [];
            for (let c = 0; c < this.GRID_SIZE; c++) {
                row.push(this.randomIcon());
            }
            this.gameEngine.board.push(row);
        }
        // Ensure no starting matches
        while (this.findMatches().length > 0) {
            for (let match of this.findMatches()) {
                for (let { r, c } of match) {
                    this.gameEngine.board[r][c] = this.randomIcon();
                }
            }
        }
    }

    randomIcon() {
        const idx = Math.floor(Math.random() * this.ICONS.length);
        return { ...this.ICONS[idx] };
    }

    // ==========================================
    // BOARD RENDERING
    // ==========================================

    renderBoard() {
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        gameBoard.innerHTML = '';
        for (let r = 0; r < this.GRID_SIZE; r++) {
            for (let c = 0; c < this.GRID_SIZE; c++) {
                let cell = document.createElement('div');
                if (!this.gameEngine.board[r][c]) {
                    cell.className = 'cell cell-empty';
                } else {
                    cell.className = 'cell' + (this.gameEngine.board[r][c].name === 'bomb' ? ' bomb' : '');
                    const img = document.createElement('img');
                    img.src = this.gameEngine.board[r][c].src;
                    img.alt = this.gameEngine.board[r][c].name;
                    cell.appendChild(img);
                    cell.onclick = () => this.onCellClick(r, c);
                }
                cell.dataset.r = r;
                cell.dataset.c = c;
                gameBoard.appendChild(cell);
            }
        }
    }

    // ==========================================
    // CELL INTERACTION
    // ==========================================

    onCellClick(r, c) {
        if (!this.gameEngine.gameActive || this.gameEngine.isAnimating) return;
        
        const cell = this.gameEngine.board[r][c];
        if (cell.name === 'bomb') {
            this.activateBomb(r, c);
            return;
        }
        
        if (!this.gameEngine.selectedCell) {
            this.gameEngine.selectedCell = { r, c };
            this.highlightCell(r, c);
        } else {
            if (this.isNeighbor(this.gameEngine.selectedCell, { r, c })) {
                // Check if swap will create match
                this.swapCells(this.gameEngine.selectedCell, { r, c });
                const willMatch = this.findMatches().length > 0;
                this.swapCells(this.gameEngine.selectedCell, { r, c }); // swap back
                
                if (willMatch) {
                    this.swapCells(this.gameEngine.selectedCell, { r, c }); // swap for real
                    this.animateSwap(this.gameEngine.selectedCell, { r, c }, true);
                } else {
                    this.animateSwap(this.gameEngine.selectedCell, { r, c }, false); // animation only
                }
                this.unhighlightAll();
                this.gameEngine.selectedCell = null;
            } else {
                this.unhighlightAll();
                this.gameEngine.selectedCell = { r, c };
                this.highlightCell(r, c);
            }
        }
    }

    highlightCell(r, c) {
        this.unhighlightAll();
        const idx = r * this.GRID_SIZE + c;
        const gameBoard = document.getElementById('game-board');
        if (gameBoard && gameBoard.children[idx]) {
            gameBoard.children[idx].style.boxShadow = '0 0 0 4px #ffb347';
        }
    }

    unhighlightAll() {
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            for (let el of gameBoard.children) {
                el.style.boxShadow = '';
            }
        }
    }

    isNeighbor(a, b) {
        return (
            (Math.abs(a.r - b.r) === 1 && a.c === b.c) ||
            (Math.abs(a.c - b.c) === 1 && a.r === b.r)
        );
    }

    swapCells(a, b) {
        const tmp = this.gameEngine.board[a.r][a.c];
        this.gameEngine.board[a.r][a.c] = this.gameEngine.board[b.r][b.c];
        this.gameEngine.board[b.r][b.c] = tmp;
    }

    // ==========================================
    // ANIMATIONS
    // ==========================================

    showIryspectText() {
        const iryspectText = document.createElement('div');
        iryspectText.textContent = 'IRYSPECT!';
        iryspectText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 
                2px 2px 0px #ff8a00,
                4px 4px 15px rgba(0, 0, 0, 0.8);
            z-index: 2000;
            pointer-events: none;
            background: linear-gradient(135deg, #ffd700, #ff8a00, #ffd700);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: iryspectShine 0.5s ease-in-out;
        `;

        document.body.appendChild(iryspectText);

        if (window.gsap) {
            gsap.fromTo(iryspectText,
                {
                    scale: 0,
                    rotation: -180,
                    opacity: 0
                },
                {
                    scale: 1.2,
                    rotation: 0,
                    opacity: 1,
                    duration: 0.6,
                    ease: "back.out(1.7)",
                    onComplete: () => {
                        setTimeout(() => {
                            gsap.to(iryspectText, {
                                scale: 0,
                                opacity: 0,
                                y: -100,
                                duration: 0.3,
                                ease: "back.in(1.7)",
                                onComplete: () => {
                                    // Safe removal check
                                    if (iryspectText && iryspectText.parentNode === document.body) {
                                        document.body.removeChild(iryspectText);
                                    }
                                }
                            });
                        }, 500);
                    }
                }
            );
        } else {
            setTimeout(() => {
                // Safe removal check
                if (iryspectText && iryspectText.parentNode === document.body) {
                    document.body.removeChild(iryspectText);
                }
            }, 1500);
        }
    }

    animateSwap(a, b, valid) {
        this.gameEngine.isAnimating = true;
        const idxA = a.r * this.GRID_SIZE + a.c;
        const idxB = b.r * this.GRID_SIZE + b.c;
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const elA = gameBoard.children[idxA];
        const elB = gameBoard.children[idxB];

        if (!elA || !elB) {
            this.gameEngine.isAnimating = false;
            return;
        }

        const dx = (b.c - a.c) * elA.offsetWidth;
        const dy = (b.r - a.r) * elA.offsetHeight;

        if (window.gsap) {
            gsap.to(elA, { x: dx, y: dy, duration: 0.25 });
            gsap.to(elB, {
                x: -dx, y: -dy, duration: 0.25, onComplete: () => {
                    if (valid) {
                        gsap.set([elA, elB], { x: 0, y: 0 });
                        this.processMatches();
                    } else {
                        gsap.to(elA, { x: 0, y: 0, duration: 0.25 });
                        gsap.to(elB, {
                            x: 0, y: 0, duration: 0.25, onComplete: () => {
                                this.gameEngine.isAnimating = false;
                                this.renderBoard();
                            }
                        });
                    }
                }
            });
        } else {
            if (valid) {
                this.processMatches();
            } else {
                this.gameEngine.isAnimating = false;
                this.renderBoard();
            }
        }
    }

    // ==========================================
    // MATCH FINDING AND PROCESSING
    // ==========================================

    findMatches() {
        const matches = [];
        
        // Horizontal matches
        for (let r = 0; r < this.GRID_SIZE; r++) {
            let streak = 1;
            for (let c = 1; c < this.GRID_SIZE; c++) {
                if (this.gameEngine.board[r][c].name === this.gameEngine.board[r][c - 1].name && 
                    this.gameEngine.board[r][c].name !== 'bomb') {
                    streak++;
                } else {
                    if (streak >= 3) {
                        const match = [];
                        for (let k = 0; k < streak; k++) match.push({ r, c: c - 1 - k });
                        matches.push(match);
                    }
                    streak = 1;
                }
            }
            if (streak >= 3) {
                const match = [];
                for (let k = 0; k < streak; k++) match.push({ r, c: this.GRID_SIZE - 1 - k });
                matches.push(match);
            }
        }
        
        // Vertical matches
        for (let c = 0; c < this.GRID_SIZE; c++) {
            let streak = 1;
            for (let r = 1; r < this.GRID_SIZE; r++) {
                if (this.gameEngine.board[r][c].name === this.gameEngine.board[r - 1][c].name && 
                    this.gameEngine.board[r][c].name !== 'bomb') {
                    streak++;
                } else {
                    if (streak >= 3) {
                        const match = [];
                        for (let k = 0; k < streak; k++) match.push({ r: r - 1 - k, c });
                        matches.push(match);
                    }
                    streak = 1;
                }
            }
            if (streak >= 3) {
                const match = [];
                for (let k = 0; k < streak; k++) match.push({ r: this.GRID_SIZE - 1 - k, c });
                matches.push(match);
            }
        }
        
        return matches;
    }

    processMatches() {
        this.gameEngine.isAnimating = true;
        let matches = this.findMatches();
        if (matches.length === 0) {
            this.gameEngine.isAnimating = false;
            this.renderBoard();
            return;
        }

        // Create bombs for 5+ matches
        let bombToSet = [];
        let hasIryspect = false;
        for (let match of matches) {
            if (match.length >= 5) {
                const center = match[Math.floor(match.length / 2)];
                bombToSet.push(center);
                hasIryspect = true;
            }
        }

        // Show "Iryspect" text for 5+ matches
        if (hasIryspect) {
            this.showIryspectText();
        }

        // Animate disappearing matches
        let toRemove = new Set();
        for (let match of matches) {
            for (let pos of match) toRemove.add(pos.r + ',' + pos.c);
            this.gameEngine.score += match.length * 10;
        }
        
        // Don't remove cells that will become bombs
        for (let bomb of bombToSet) {
            toRemove.delete(bomb.r + ',' + bomb.c);
        }
        
        this.gameEngine.ui.updateScore();
        this.renderBoard();

        const gameBoard = document.getElementById('game-board');
        if (gameBoard && window.gsap) {
            for (let key of toRemove) {
                const [r, c] = key.split(',').map(Number);
                const idx = r * this.GRID_SIZE + c;
                const el = gameBoard.children[idx];
                if (el) {
                    const img = el.querySelector('img');
                    if (img) gsap.to(img, { scale: 0, duration: 0.3 });
                }
            }
        }

        setTimeout(() => {
            for (let key of toRemove) {
                const [r, c] = key.split(',').map(Number);
                this.gameEngine.board[r][c] = null;
            }
            // Place bombs after disappearing
            for (let bomb of bombToSet) {
                this.gameEngine.board[bomb.r][bomb.c] = { ...this.BOMB_ICON };
            }
            this.dropCells();
        }, 350);
    }

    // ==========================================
    // CELL DROPPING AND FILLING
    // ==========================================

    dropCells() {
        let moved = [];
        
        // For each column from bottom to top
        for (let c = 0; c < this.GRID_SIZE; c++) {
            let pointer = this.GRID_SIZE - 1;
            for (let r = this.GRID_SIZE - 1; r >= 0; r--) {
                if (this.gameEngine.board[r][c]) {
                    if (pointer !== r) {
                        moved.push({ from: { r, c }, to: { r: pointer, c } });
                        this.gameEngine.board[pointer][c] = this.gameEngine.board[r][c];
                        this.gameEngine.board[r][c] = null;
                    }
                    pointer--;
                }
            }
            // Fill empty top cells with new icons
            for (let r = pointer; r >= 0; r--) {
                this.gameEngine.board[r][c] = this.randomIcon();
                moved.push({ from: { r: -1, c }, to: { r, c } });
            }
        }
        this.animateDrop(moved);
    }

    animateDrop(moved) {
        this.renderBoard();
        const gameBoard = document.getElementById('game-board');

        if (gameBoard && window.gsap) {
            for (let move of moved) {
                const idx = move.to.r * this.GRID_SIZE + move.to.c;
                const el = gameBoard.children[idx];
                if (!el) continue;
                const img = el.querySelector('img');
                if (!img) continue;
                let fromY = (move.from.r === -1)
                    ? -80
                    : (move.from.r - move.to.r) * 66;
                gsap.fromTo(img, { y: fromY }, { y: 0, duration: 0.35, delay: move.to.r * 0.03, ease: "bounce.out" });
            }
        }

        setTimeout(() => {
            if (this.findMatches().length > 0) {
                this.processMatches();
            } else {
                // Check if there are still empty cells
                let empty = false;
                for (let c = 0; c < this.GRID_SIZE; c++) {
                    for (let r = 0; r < this.GRID_SIZE; r++) {
                        if (!this.gameEngine.board[r][c]) empty = true;
                    }
                }
                if (empty) {
                    this.dropCells();
                } else {
                    this.gameEngine.isAnimating = false;
                    this.renderBoard();
                }
            }
        }, 400);
    }

    // ==========================================
    // BOMB ACTIVATION
    // ==========================================

    activateBomb(r, c) {
        if (!this.gameEngine.gameActive || this.gameEngine.isAnimating) return;
        this.gameEngine.isAnimating = true;
        const cellsToRemove = [];

        // 3x3 square around bomb
        const dirs = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];

        for (let dir of dirs) {
            const nr = r + dir.dr, nc = c + dir.dc;
            if (nr >= 0 && nr < this.GRID_SIZE && nc >= 0 && nc < this.GRID_SIZE) {
                cellsToRemove.push({ r: nr, c: nc, dir });
            }
        }

        // Bomb explosion animation
        const idx = r * this.GRID_SIZE + c;
        const gameBoard = document.getElementById('game-board');
        if (!gameBoard) return;

        const el = gameBoard.children[idx];
        const img = el ? el.querySelector('img') : null;

        if (img && window.gsap) {
            gsap.to(img, {
                scale: 1.7,
                rotation: 360,
                filter: 'drop-shadow(0 0 32px red) drop-shadow(0 0 64px darkred)',
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    gsap.to(img, { scale: 0, duration: 0.2, filter: 'none' });
                    // Wave animation for neighbors
                    for (let cell of cellsToRemove) {
                        const i = cell.r * this.GRID_SIZE + cell.c;
                        const e = gameBoard.children[i];
                        const img2 = e ? e.querySelector('img') : null;
                        if (img2) {
                            let dx = 0, dy = 0;
                            if (cell.dir.dr !== 0) dy = cell.dir.dr * 40;
                            if (cell.dir.dc !== 0) dx = cell.dir.dc * 40;
                            gsap.to(img2, {
                                x: dx,
                                y: dy,
                                scale: 1.2,
                                filter: 'drop-shadow(0 0 16px red)',
                                duration: 0.18,
                                yoyo: true,
                                repeat: 1,
                                onComplete: () => {
                                    gsap.to(img2, { x: 0, y: 0, scale: 0, filter: 'none', duration: 0.18 });
                                }
                            });
                        }
                        if (this.gameEngine.board[cell.r][cell.c]) this.gameEngine.score += 10;
                        this.gameEngine.board[cell.r][cell.c] = null;
                    }
                    this.gameEngine.board[r][c] = null;
                    this.gameEngine.ui.updateScore();
                    setTimeout(() => {
                        this.dropCells();
                    }, 400);
                }
            });
        } else {
            // Fallback without GSAP
            for (let cell of cellsToRemove) {
                if (this.gameEngine.board[cell.r][cell.c]) this.gameEngine.score += 10;
                this.gameEngine.board[cell.r][cell.c] = null;
            }
            this.gameEngine.board[r][c] = null;
            this.gameEngine.ui.updateScore();
            setTimeout(() => {
                this.dropCells();
            }, 400);
        }
    }
}

// Export for global access
window.PVPGameLogic = PVPGameLogic;

console.log('🎯 PVP Game Logic loaded');