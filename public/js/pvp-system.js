// ==========================================
// PVP SYSTEM MAIN MODULE
// ==========================================

// This is the main entry point for the PVP system
// It loads all necessary modules and initializes the system

console.log('📦 Loading PVP System modules...');

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePVPModules);
} else {
    initializePVPModules();
}

function initializePVPModules() {
    console.log('🔄 Initializing PVP modules...');
    
    // Check if all required modules are loaded
    const requiredModules = [
        'loadPVPConfig',
        'PVP_CONTRACT_ABI', 
        'PVP_CONSTANTS',
        'PVP_TEMPLATES',
        'IrysCrushPVP',
        'showPVPModal',
        'initializePVPSystem'
    ];
    
    const missingModules = requiredModules.filter(module => !window[module]);
    
    if (missingModules.length > 0) {
        console.error('❌ Missing PVP modules:', missingModules);
        console.log('⏳ Retrying in 1 second...');
        setTimeout(initializePVPModules, 1000);
        return;
    }
    
    console.log('✅ All PVP modules loaded successfully');
    
    // Initialize the PVP system
    if (typeof window.initializePVPSystem === 'function') {
        window.initializePVPSystem();
    }
}

console.log('📦 PVP System main module loaded');