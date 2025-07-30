#!/usr/bin/env node

const fetch = require('node-fetch');

async function clearDatabase() {
    try {
        console.log('🧹 Clearing database...');
        
        const response = await fetch('http://localhost:3000/api/pvp/debug/clear-database', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Success:', result.message);
            console.log('🕒 Timestamp:', result.timestamp);
        } else {
            console.error('❌ Error:', result.error);
            if (result.details) {
                console.error('📝 Details:', result.details);
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to clear database:', error.message);
        console.error('💡 Make sure the server is running on http://localhost:3000');
    }
}

// Run the function
clearDatabase();