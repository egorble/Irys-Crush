// ==========================================
// PVP GAME MODULE LOADER
// ==========================================

class PVPGameLoader {
    constructor() {
        this.modules = [
            { name: 'PVP Game Styles', path: 'js/pvp/pvp-game-styles.js', global: 'PVPGameStyles' },
            { name: 'PVP Game Logic', path: 'js/pvp/pvp-game-logic.js', global: 'PVPGameLogic' },
            { name: 'PVP Game UI', path: 'js/pvp/pvp-game-ui.js', global: 'PVPGameUI' },
            { name: 'PVP Game Results', path: 'js/pvp/pvp-game-results.js', global: 'PVPGameResults' },
            { name: 'PVP Game Engine', path: 'js/pvp/pvp-game.js', global: 'PVPGameEngine' },
            { name: 'PVP Game Launcher', path: 'js/pvp/pvp-game-launcher.js', global: 'startPVPGame' }
        ];
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    async loadModule(module) {
        // Check if already loaded
        if (this.loadedModules.has(module.name)) {
            return true;
        }

        // Check if already loading
        if (this.loadingPromises.has(module.name)) {
            return await this.loadingPromises.get(module.name);
        }

        // Start loading
        const loadPromise = this._loadScript(module);
        this.loadingPromises.set(module.name, loadPromise);

        try {
            await loadPromise;
            this.loadedModules.add(module.name);
            console.log(`✅ Loaded: ${module.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to load ${module.name}:`, error);
            this.loadingPromises.delete(module.name);
            return false;
        }
    }

    async _loadScript(module) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src="${module.path}"]`);
            if (existingScript) {
                // Wait for it to load if it's still loading
                if (window[module.global]) {
                    resolve();
                } else {
                    existingScript.onload = resolve;
                    existingScript.onerror = reject;
                }
                return;
            }

            const script = document.createElement('script');
            script.src = module.path;
            script.async = true;
            
            script.onload = () => {
                // Verify the module was actually loaded
                if (window[module.global]) {
                    resolve();
                } else {
                    reject(new Error(`Module ${module.name} loaded but global ${module.global} not found`));
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${module.path}`));
            };

            document.head.appendChild(script);
        });
    }

    async loadAllModules() {
        console.log('🔄 Loading PVP Game modules...');
        
        try {
            // Load modules in sequence to maintain dependencies
            for (const module of this.modules) {
                const success = await this.loadModule(module);
                if (!success) {
                    throw new Error(`Failed to load required module: ${module.name}`);
                }
            }

            console.log('✅ All PVP Game modules loaded successfully');
            
            // Verify all modules are available
            if (window.checkPVPGameModules && window.checkPVPGameModules()) {
                return true;
            } else {
                throw new Error('Module verification failed');
            }

        } catch (error) {
            console.error('❌ Failed to load PVP Game modules:', error);
            return false;
        }
    }

    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    getLoadedModules() {
        return Array.from(this.loadedModules);
    }
}

// Create global instance
window.pvpGameLoader = new PVPGameLoader();

// Auto-load modules when this script loads
window.pvpGameLoader.loadAllModules().then(success => {
    if (success) {
        console.log('🎮 PVP Game system ready!');
        
        // Dispatch event to notify other parts of the system
        window.dispatchEvent(new CustomEvent('pvpGameSystemReady'));
    } else {
        console.error('❌ PVP Game system failed to initialize');
    }
});

console.log('📦 PVP Game Loader initialized');