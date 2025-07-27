// ==========================================
// PVP SYSTEM V2 - OPTIMIZED SINGLE TRANSACTION
// ==========================================

console.log('📦 Loading PVP System V2 modules...');

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePVPV2Modules);
} else {
    initializePVPV2Modules();
}

function initializePVPV2Modules() {
    console.log('🔄 Initializing PVP V2 modules...');
    
    // Check core V2 modules first
    const coreV2Modules = [
        'pvpSubmissionManager',
        'PVPGameEngineV2',
        'startPVPGameV2',
        'PVPGameLogic',
        'PVPGameUI'
    ];
    
    const missingCoreModules = coreV2Modules.filter(module => !window[module]);
    
    if (missingCoreModules.length > 0) {
        console.error('❌ Missing core PVP V2 modules:', missingCoreModules);
        console.log('⏳ Retrying in 1 second...');
        setTimeout(initializePVPV2Modules, 1000);
        return;
    }
    
    console.log('✅ Core PVP V2 modules loaded successfully');
    
    // Check optional legacy modules
    const legacyModules = [
        'loadPVPConfig',
        'PVP_CONTRACT_ABI', 
        'PVP_CONSTANTS',
        'PVP_TEMPLATES',
        'IrysCrushPVP',
        'showPVPModal'
    ];
    
    const missingLegacyModules = legacyModules.filter(module => !window[module]);
    
    if (missingLegacyModules.length > 0) {
        console.warn('⚠️ Some legacy modules missing (may be OK):', missingLegacyModules);
        console.log('⏳ Retrying in 1 second...');
        setTimeout(initializePVPV2Modules, 1000);
        return;
    }
    
    console.log('✅ All PVP modules loaded successfully');
    
    // Initialize the PVP system V2
    if (typeof window.initializePVPSystem === 'function') {
        try {
            window.initializePVPSystem();
            console.log('✅ Legacy PVP system initialized');
        } catch (error) {
            console.warn('⚠️ Legacy PVP system initialization failed:', error.message);
        }
    }
    
    // Migrate to V2 if needed
    if (typeof window.migratePVPToV2 === 'function') {
        try {
            window.migratePVPToV2();
            console.log('✅ Migrated to PVP V2');
        } catch (error) {
            console.warn('⚠️ Migration to V2 failed:', error.message);
        }
    }
    
    console.log('🎉 PVP System V2 ready!');
}

// Export initialization function
window.initializePVPV2Modules = initializePVPV2Modules;

console.log('📦 PVP System V2 main module loaded');