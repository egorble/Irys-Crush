const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Irys Testnet configuration
const IRYS_TESTNET_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
const IRYS_TESTNET_CHAIN_ID = 1270;

// Server-Controlled Contract ABI
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
    CONTRACT_BYTECODE = fs.readFileSync('artifacts/IrysCrushLeaderboardServerControlled.bin', 'utf8').trim();
} catch (error) {
    console.error('❌ Contract bytecode file not found. Please compile the contract first.');
    console.error('Run: node compile-server-controlled.js');
    process.exit(1);
}

async function deployContract() {
    try {
        console.log('🚀 Starting Server-Controlled Contract (FIXED VERSION) deployment to Irys Testnet...');
        
        // Check environment variables
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }
        
        if (!process.env.GAME_SERVER_ADDRESS) {
            throw new Error('GAME_SERVER_ADDRESS not found in .env file');
        }
        
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(IRYS_TESTNET_RPC, {
            chainId: IRYS_TESTNET_CHAIN_ID,
            name: 'irys-testnet',
            ensAddress: null // Disable ENS for Irys network
        });
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Network: Irys Testnet');
        console.log('🔗 RPC URL:', IRYS_TESTNET_RPC);
        console.log('⛓️  Chain ID:', IRYS_TESTNET_CHAIN_ID);
        console.log('👤 Deployer:', wallet.address);
        console.log('🎮 Game Server:', process.env.GAME_SERVER_ADDRESS);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            throw new Error('Insufficient balance. Please fund your wallet with Irys testnet tokens.');
        }
        
        // Create contract factory
        const contractFactory = new ethers.ContractFactory(CONTRACT_ABI, CONTRACT_BYTECODE, wallet);
        
        console.log('📦 Deploying Server-Controlled contract with fixes...');
        
        // Deploy contract with game server address
        const contract = await contractFactory.deploy(process.env.GAME_SERVER_ADDRESS, {
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
            gameServer: process.env.GAME_SERVER_ADDRESS,
            gasUsed: contract.deploymentTransaction().gasLimit?.toString() || 'Unknown',
            contractType: 'Server-Controlled PvP (Fixed Version)',
            fixes: [
                'Fixed ScoreUpdated event emission',
                'Added duplicate player validation',
                'Added array length validation',
                'Fixed reward distribution for host winners',
                'Added typed errors instead of string errors'
            ]
        };
        
        fs.writeFileSync('deployment-server-controlled.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('💾 Deployment info saved to deployment-server-controlled.json');
        
        // Test basic contract functionality
        console.log('🧪 Testing contract...');
        const totalPlayers = await contract.getTotalPlayers();
        const gameServer = await contract.gameServer();
        const owner = await contract.owner();
        
        console.log('👥 Total players:', totalPlayers.toString());
        console.log('🎮 Game server:', gameServer);
        console.log('👤 Owner:', owner);
        
        // Verify game server is set correctly
        if (gameServer.toLowerCase() === process.env.GAME_SERVER_ADDRESS.toLowerCase()) {
            console.log('✅ Game server address verified');
        } else {
            console.log('❌ Game server address mismatch');
        }
        
        console.log('🎉 Server-Controlled deployment completed successfully!');
        
        return contractAddress;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('💡 Please fund your wallet with Irys testnet tokens');
        } else if (error.code === 'NETWORK_ERROR') {
            console.error('💡 Check your internet connection and RPC URL');
        } else if (error.message.includes('GAME_SERVER_ADDRESS')) {
            console.error('💡 Add GAME_SERVER_ADDRESS to your .env file');
        }
        
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployContract()
        .then((address) => {
            console.log(`\n🎯 Contract deployed at: ${address}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}

module.exports = { deployContract, CONTRACT_ABI };