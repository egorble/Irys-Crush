const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Irys Testnet configuration
const IRYS_TESTNET_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
const IRYS_TESTNET_CHAIN_ID = 1270;

// Contract ABI and Bytecode (from Remix compilation)
const CONTRACT_ABI = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_gameServer",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "AlreadyInRoom",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "GameAlreadyStarted",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InsufficientFee",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidEntryFee",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidGameTime",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidMaxPlayers",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "InvalidNickname",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NicknameAlreadyTaken",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotEnoughPlayers",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "NotRoomHost",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "PlayerNotRegistered",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "RoomFull",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "RoomNotActive",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "RoomNotFound",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "SameNickname",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "ScoreNotBetter",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "prize",
                    "type": "uint256"
                }
            ],
            "name": "GameFinished",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "host",
                    "type": "address"
                }
            ],
            "name": "GameStarted",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "oldNickname",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "newNickname",
                    "type": "string"
                }
            ],
            "name": "NicknameChanged",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                }
            ],
            "name": "PlayerJoinedRoom",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "nickname",
                    "type": "string"
                }
            ],
            "name": "PlayerRegistered",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                }
            ],
            "name": "PvPGameFinished",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "host",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "entryFee",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "gameTime",
                    "type": "uint256"
                }
            ],
            "name": "RoomCreated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "player",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newScore",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "oldScore",
                    "type": "uint256"
                }
            ],
            "name": "ScoreUpdated",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "activeRoomIds",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "cancelPvPRoom",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_newNickname",
                    "type": "string"
                }
            ],
            "name": "changeNickname",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "cleanupInactiveRooms",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_entryFee",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_gameTime",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_maxPlayers",
                    "type": "uint256"
                }
            ],
            "name": "createPvPRoom",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "gameServer",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getActiveRooms",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getActiveRoomsCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_limit",
                    "type": "uint256"
                }
            ],
            "name": "getLeaderboard",
            "outputs": [
                {
                    "internalType": "address[]",
                    "name": "addresses",
                    "type": "address[]"
                },
                {
                    "internalType": "string[]",
                    "name": "nicknames",
                    "type": "string[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "scores",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_player",
                    "type": "address"
                }
            ],
            "name": "getPlayer",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "nickname",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "highScore",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gamesPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "lastPlayed",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "getPvPRoom",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "host",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "entryFee",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gameTime",
                    "type": "uint256"
                },
                {
                    "internalType": "address[]",
                    "name": "roomPlayers",
                    "type": "address[]"
                },
                {
                    "internalType": "bool",
                    "name": "isActive",
                    "type": "bool"
                },
                {
                    "internalType": "bool",
                    "name": "gameStarted",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "maxPlayers",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "_player",
                    "type": "address"
                }
            ],
            "name": "getRoomFinalScore",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "getRoomWinner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getTotalPlayers",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "isGameFinished",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_nickname",
                    "type": "string"
                }
            ],
            "name": "isNicknameAvailable",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_player",
                    "type": "address"
                }
            ],
            "name": "isPlayerRegistered",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "isRoomActive",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "joinPvPRoom",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "leavePvPRoom",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "nextRoomId",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "name": "nicknameToAddress",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "playerAddresses",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "playerCurrentRoom",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "players",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "nickname",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "highScore",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gamesPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "lastPlayed",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "exists",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "pvpRooms",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "roomId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "host",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "entryFee",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "gameTime",
                    "type": "uint256"
                },
                {
                    "internalType": "bool",
                    "name": "isActive",
                    "type": "bool"
                },
                {
                    "internalType": "bool",
                    "name": "gameStarted",
                    "type": "bool"
                },
                {
                    "internalType": "bool",
                    "name": "gameFinished",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "createdAt",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "maxPlayers",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "winner",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_nickname",
                    "type": "string"
                }
            ],
            "name": "registerPlayer",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_newGameServer",
                    "type": "address"
                }
            ],
            "name": "setGameServer",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                }
            ],
            "name": "startPvPGame",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_roomId",
                    "type": "uint256"
                },
                {
                    "internalType": "address[]",
                    "name": "_players",
                    "type": "address[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "_scores",
                    "type": "uint256[]"
                },
                {
                    "internalType": "address",
                    "name": "_winner",
                    "type": "address"
                }
            ],
            "name": "submitGameResults",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_score",
                    "type": "uint256"
                }
            ],
            "name": "submitScore",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

// Load contract bytecode
let CONTRACT_BYTECODE;
try {
    CONTRACT_BYTECODE = fs.readFileSync('artifacts/IrysCrushLeaderboard.bin', 'utf8').trim();
} catch (error) {
    console.error('❌ Contract bytecode file not found. Please compile the contract first.');
    console.error('Run: node compile.js');
    process.exit(1);
}

async function deployContract() {
    try {
        console.log('🚀 Starting deployment to Irys Testnet...');
        
        // Check environment variables
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(IRYS_TESTNET_RPC);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Network: Irys Testnet');
        console.log('🔗 RPC URL:', IRYS_TESTNET_RPC);
        console.log('⛓️  Chain ID:', IRYS_TESTNET_CHAIN_ID);
        console.log('👤 Deployer:', wallet.address);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('Insufficient balance. Please fund your wallet with Irys testnet tokens.');
        }
        
        // Create contract factory
        const contractFactory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, wallet);
        
        console.log('📦 Deploying contract...');
        
        // Deploy contract
        const contract = await contractFactory.deploy({
            gasLimit: 5000000, // 5M gas limit
            gasPrice: ethers.parseUnits('20', 'gwei')
        });
        
        console.log('⏳ Transaction sent:', contract.deploymentTransaction().hash);
        console.log('⏳ Waiting for confirmation...');
        
        // Wait for deployment
        await contract.waitForDeployment();
        const contractAddress = await contract.getAddress();
        
        console.log('✅ Contract deployed successfully!');
        console.log('📍 Contract Address:', contractAddress);
        console.log('🔗 Transaction Hash:', contract.deploymentTransaction().hash);
        
        // Save deployment info
        const deploymentInfo = {
            contractAddress: contractAddress,
            transactionHash: contract.deploymentTransaction().hash,
            network: 'Irys Testnet',
            chainId: IRYS_TESTNET_CHAIN_ID,
            rpcUrl: IRYS_TESTNET_RPC,
            deployedAt: new Date().toISOString(),
            deployer: wallet.address,
            gasUsed: contract.deploymentTransaction().gasLimit?.toString() || 'Unknown'
        };
        
        fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('💾 Deployment info saved to deployment.json');
        
        // Test basic contract functionality
        console.log('🧪 Testing contract...');
        const totalPlayers = await contract.getTotalPlayers();
        console.log('👥 Total players:', totalPlayers.toString());
        
        console.log('🎉 Deployment completed successfully!');
        
        return contractAddress;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('💡 Please fund your wallet with Irys testnet tokens');
        } else if (error.code === 'NETWORK_ERROR') {
            console.error('💡 Check your internet connection and RPC URL');
        } else if (error.message.includes('gas')) {
            console.error('💡 Try increasing gas limit or gas price');
        }
        
        throw error;
    }
}

async function verifyContract(contractAddress) {
    try {
        console.log('🔍 Verifying contract at:', contractAddress);
        
        const provider = new ethers.JsonRpcProvider(IRYS_TESTNET_RPC);
        const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
        
        // Test contract functions
        console.log('📋 Testing contract functions...');
        
        const totalPlayers = await contract.getTotalPlayers();
        console.log('👥 Total players:', totalPlayers.toString());
        
        const activeRooms = await contract.getActiveRooms();
        console.log('🏠 Active rooms:', activeRooms.length);
        
        const nextRoomId = await contract.nextRoomId();
        console.log('🆔 Next room ID:', nextRoomId.toString());
        
        console.log('✅ Contract verification completed!');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    }
}

async function main() {
    const command = process.argv[2] || 'deploy';
    
    switch (command) {
        case 'deploy':
            await deployContract();
            break;
            
        case 'verify':
            const address = process.argv[3];
            if (!address) {
                console.error('Usage: node deploy.js verify <contract_address>');
                process.exit(1);
            }
            await verifyContract(address);
            break;
            
        case 'help':
        default:
            console.log('📚 IrysCrush Deployment Script');
            console.log('');
            console.log('Commands:');
            console.log('  deploy  - Deploy the contract to Irys testnet');
            console.log('  verify  - Verify an existing contract');
            console.log('  help    - Show this help message');
            console.log('');
            console.log('Examples:');
            console.log('  npm run deploy');
            console.log('  node deploy.js verify 0x123...');
            break;
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { 
    deployContract, 
    verifyContract,
    CONTRACT_ABI,
    IRYS_TESTNET_RPC,
    IRYS_TESTNET_CHAIN_ID
}; 