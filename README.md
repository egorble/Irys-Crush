# 🎮 IrysCrush - Blockchain Match-3 Game

## 🚨 ВАЖЛИВЕ ПОПЕРЕДЖЕННЯ ПРО БЕЗПЕКУ

**НІКОЛИ НЕ ВВОДЬТЕ ПРИВАТНИЙ КЛЮЧ ГАМАНЦЯ!**

Ваш приватний ключ - це доступ до всіх ваших коштів. Якщо хтось просить ввести приватний ключ:
- ❌ Це може бути шахрайство
- ❌ Це може бути вірус або шкідливий сайт
- ❌ Це може бути фішинг

**Правильний процес підключення:**
1. Натисніть "Connect Wallet" 
2. MetaMask відкриється автоматично
3. Підтвердіть підключення в MetaMask
4. Введіть нікнейм коли попросять
5. Підтвердіть транзакцію реєстрації в MetaMask

**Якщо вас просять приватний ключ:**
1. Закрийте сайт негайно
2. Перевірте URL - чи це справжній сайт
3. Очистіть кеш браузера
4. Перезавантажте сторінку

IrysCrush is a decentralized Match-3 puzzle game built on the Irys blockchain. Connect your wallet, play the classic match-3 game, and compete with players worldwide on an immutable leaderboard!

## 🚀 Features

- **🔗 Blockchain Integration**: Built on Irys blockchain with smart contract functionality
- **🏆 Decentralized Leaderboard**: All scores stored on-chain for transparency
- **💎 Unique Nicknames**: Register unique nicknames linked to your wallet
- **🎯 Score Management**: Only new high scores are saved to the blockchain
- **⚡ Real-time Gaming**: Classic match-3 gameplay with modern blockchain benefits

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Blockchain**: Irys (EVM-compatible)
- **Smart Contracts**: Solidity ^0.8.30
- **Web3 Integration**: Ethers.js v6
- **Backend**: Node.js with Express (for API support)

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher)
- **MetaMask** browser extension
- **Irys testnet tokens** (for transactions)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd iryscrush-blockchain
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Edit `.env` file:

```env
# Irys Blockchain Configuration
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=deployed_contract_address_here

# Server Configuration
PORT=3000

# Irys Network Settings
IRYS_NETWORK=testnet
IRYS_RPC_URL=https://testnet-rpc.irys.xyz/v1/execution-rpc
IRYS_CHAIN_ID=1270
```

### 4. Deploy Smart Contract

First, compile your smart contract using Remix IDE or Hardhat:

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Upload `contracts/IrysCrushLeaderboard.sol`
3. Compile with Solidity ^0.8.30
4. Deploy to Irys testnet
5. Copy the contract address to your `.env` file

Alternative deployment using script:
```bash
npm run deploy
```

### 5. Start the Server

```bash
npm start
```

For development with auto-reload:
   ```bash
npm run dev
```

## 🎮 How to Play

### 1. Connect Your Wallet

- Install MetaMask browser extension
- Click "Connect Wallet" button
- Approve connection to your wallet
- The app will automatically switch to Irys testnet

### 2. Register Your Nickname

- On first connection, you'll be prompted to register a nickname
- Choose a unique nickname (3-15 characters)
- Confirm the transaction in MetaMask
- Your nickname is now permanently linked to your wallet

### 3. Play the Game

- Click "Play" to start a new game
- Match 3 or more identical items by swapping adjacent pieces
- Score points and try to beat your high score
- Game lasts 60 seconds

### 4. Save Your Score

- When you achieve a new high score, you'll be prompted to save it
- Confirm the transaction to store your score on the blockchain
- Your score will appear on the global leaderboard

### 5. View Leaderboard

- Click "Leaderboard" to see all players and their scores
- Leaderboard data is fetched directly from the blockchain
- All scores are permanent and tamper-proof

## 🔐 Smart Contract Functions

### Player Functions

- `registerPlayer(string nickname)` - Register with a unique nickname
- `changeNickname(string newNickname)` - Change your nickname
- `submitScore(uint256 score)` - Submit a new high score

### View Functions

- `getPlayer(address player)` - Get player data
- `getLeaderboard(uint256 limit)` - Get top players
- `isPlayerRegistered(address player)` - Check if player exists
- `isNicknameAvailable(string nickname)` - Check nickname availability
- `getTotalPlayers()` - Get total registered players

## 🌐 API Endpoints

The server provides fallback API endpoints:

- `GET /leaderboard` - Get leaderboard data
- `GET /player/:address` - Get player info
- `GET /blockchain-info` - Get blockchain connection info
- `GET /health` - Health check

## 🧪 Testing

### Local Development

1. Start local development server:
```bash
npm run dev
```

2. Open http://localhost:3000 in your browser

3. Connect MetaMask and switch to Irys testnet

### Get Testnet Tokens

Visit testnet faucets to get free test tokens for Irys:
- [Sepolia Faucet](https://sepoliafaucet.com/) - for ETH testnet tokens
- [Solana Faucet](https://faucet.solana.com/) - for SOL testnet tokens
- Check [Irys Docs](https://docs.irys.xyz/build/d/troubleshooting) for current faucet recommendations

## 🏗️ Project Structure

```
iryscrush-blockchain/
├── contracts/
│   └── IrysCrushLeaderboard.sol    # Smart contract
├── public/
│   ├── images/                     # Game assets
│   ├── index.html                  # Main HTML file
│   ├── main.js                     # Game logic & Web3 integration
│   └── style.css                   # Styles
├── deploy.js                       # Contract deployment script
├── server.js                       # Express server
├── package.json                    # Dependencies
├── env.example                     # Environment template
└── README.md                       # This file
```

## 🔄 Game Logic

The game implements classic match-3 mechanics with blockchain integration:

1. **Board Generation**: 8x8 grid with random fruits
2. **Matching**: Horizontal and vertical matches of 3+ items
3. **Scoring**: Points based on match length and special combinations
4. **Bomb System**: Special bombs created from larger matches
5. **Blockchain Integration**: High scores saved on-chain with user confirmation

## 🔧 Troubleshooting

### Common Issues

**MetaMask not connecting:**
- Ensure MetaMask is installed and unlocked
- Check if you're on the correct network (Irys testnet)

**Transaction failing:**
- Ensure you have enough testnet tokens for gas
- Check if contract address is correctly set in .env

**Game not loading:**
- Check browser console for errors
- Ensure server is running on correct port

**Nickname already taken:**
- Nicknames are unique across the entire blockchain
- Try a different nickname

### Network Configuration

If MetaMask doesn't automatically add Irys testnet, add manually:

- **Network Name**: Irys Testnet
- **RPC URL**: https://testnet-rpc.irys.xyz/v1/execution-rpc
- **Chain ID**: 1270
- **Currency Symbol**: IRYS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Developers

- **Egorble** - Vibe Coder & Game Developer
- **WanFar** - UI/UX Designer

## 🔗 Links

- [Irys Website](https://irys.xyz)
- [Irys Documentation](https://docs.irys.xyz)
- [Irys Testnet Explorer](https://testnet-explorer.irys.xyz)
- [Irys Wallet](https://wallet.irys.xyz)
- [MetaMask](https://metamask.io)

## 📚 Additional Resources

- [Solidity Documentation](https://docs.soliditylang.org)
- [Ethers.js Documentation](https://docs.ethers.io)
- [Web3 Game Development Guide](https://ethereum.org/en/developers/docs/gaming/)

---

**Enjoy playing IrysCrush and competing on the blockchain! 🎮⛓️** 