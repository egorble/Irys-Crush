// ==========================================
// DEPLOY LAZY LEADERBOARD CONTRACT UPDATE
// ==========================================

const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('🚀 Deploying Lazy Leaderboard Contract Update...');
    console.log('================================================');

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('👤 Deploying with account:', deployer.address);

    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'IRYS');

    if (balance < ethers.parseEther('0.01')) {
        console.error('❌ Insufficient balance for deployment');
        process.exit(1);
    }

    try {
        // Deploy the updated contract
        console.log('\n📦 Deploying IrysCrushLeaderboard with Lazy Leaderboard...');
        
        const IrysCrushLeaderboard = await ethers.getContractFactory('IrysCrushLeaderboard');
        
        // Deploy with gas estimation
        const estimatedGas = await IrysCrushLeaderboard.getDeployTransaction().estimateGas();
        console.log('⛽ Estimated gas:', estimatedGas.toString());

        const contract = await IrysCrushLeaderboard.deploy({
            gasLimit: estimatedGas * 120n / 100n // Add 20% buffer
        });

        console.log('⏳ Waiting for deployment...');
        await contract.waitForDeployment();

        const contractAddress = await contract.getAddress();
        console.log('✅ Contract deployed successfully!');
        console.log('📍 Contract address:', contractAddress);

        // Verify deployment
        console.log('\n🔍 Verifying deployment...');
        
        // Test basic functions
        const totalPlayers = await contract.getTotalPlayers();
        console.log('👥 Total players:', totalPlayers.toString());

        const activeRooms = await contract.getActiveRooms();
        console.log('🏠 Active rooms:', activeRooms.length);

        // Save deployment info
        const deploymentInfo = {
            contractAddress: contractAddress,
            deployerAddress: deployer.address,
            deploymentTime: new Date().toISOString(),
            network: 'irys-testnet',
            gasUsed: estimatedGas.toString(),
            features: [
                'Lazy Leaderboard System',
                'Race Condition Protection',
                'Dynamic Leaderboard Building',
                'Optimized Gas Usage'
            ]
        };

        // Write to file
        const fs = require('fs');
        fs.writeFileSync(
            'deployment-lazy-leaderboard.json', 
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log('\n📄 Deployment info saved to deployment-lazy-leaderboard.json');

        // Update .env file
        const envContent = fs.readFileSync('.env', 'utf8');
        const updatedEnv = envContent.replace(
            /CONTRACT_ADDRESS=.*/,
            `CONTRACT_ADDRESS=${contractAddress}`
        );
        fs.writeFileSync('.env', updatedEnv);

        console.log('✅ .env file updated with new contract address');

        console.log('\n🎉 Lazy Leaderboard deployment complete!');
        console.log('=====================================');
        console.log('🔧 Key improvements:');
        console.log('  ✅ No more race conditions');
        console.log('  ✅ Concurrent submissions supported');
        console.log('  ✅ Optimized gas usage');
        console.log('  ✅ Dynamic leaderboard building');
        console.log('\n🧪 Ready for testing with concurrent submissions!');

    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });