# 🚀 IrysCrush Blockchain Deployment Instructions

This guide provides step-by-step instructions for deploying the IrysCrush blockchain game.

## 📋 Prerequisites

Before deployment, ensure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **MetaMask** browser extension
- **Irys testnet tokens** for deployment
- **Basic knowledge** of smart contracts and blockchain

## 🔧 Local Development Setup

### 1. Environment Setup

Create and configure your environment file:

```bash
cp env.example .env
```

Configure the `.env` file:

```env
# Required: Private key for deployment (DO NOT COMMIT THIS)
PRIVATE_KEY=your_private_key_here

# Will be set after contract deployment
CONTRACT_ADDRESS=

# Server configuration
PORT=3000

# Irys network configuration
IRYS_NETWORK=testnet
IRYS_RPC_URL=https://testnet-rpc.irys.xyz
IRYS_CHAIN_ID=1338
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get Testnet Tokens

Before deploying, you need Irys testnet tokens:

1. Visit [Irys Testnet Faucet](https://faucet.irys.xyz)
2. Enter your wallet address
3. Request testnet tokens
4. Wait for tokens to arrive in your wallet

## 📄 Smart Contract Deployment

### Option 1: Using Remix IDE (Recommended for beginners)

1. **Open Remix IDE**
   - Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)

2. **Upload Contract**
   - Create new file: `IrysCrushLeaderboard.sol`
   - Copy contents from `contracts/IrysCrushLeaderboard.sol`

3. **Compile Contract**
   - Go to "Solidity Compiler" tab
   - Select compiler version: ^0.8.19
   - Click "Compile IrysCrushLeaderboard.sol"

4. **Deploy Contract**
   - Go to "Deploy & Run Transactions" tab
   - Select Environment: "Injected Provider - MetaMask"
   - Make sure you're connected to Irys testnet
   - Click "Deploy"
   - Confirm transaction in MetaMask

5. **Copy Contract Address**
   - After deployment, copy the contract address
   - Add it to your `.env` file:
   ```env
   CONTRACT_ADDRESS=0xYourContractAddressHere
   ```

### Option 2: Using Deployment Script

1. **Prepare deployment script** (requires contract compilation):
   ```bash
   npm run deploy
   ```

2. **Follow the instructions** in the console output

### Option 3: Using Hardhat (Advanced)

If you prefer using Hardhat:

1. **Install Hardhat**:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   ```

2. **Initialize Hardhat**:
   ```bash
   npx hardhat init
   ```

3. **Configure Hardhat** for Irys testnet in `hardhat.config.js`:
   ```javascript
   require("@nomicfoundation/hardhat-toolbox");
   require('dotenv').config();

   module.exports = {
     solidity: "0.8.19",
     networks: {
       irysTestnet: {
         url: "https://testnet-rpc.irys.xyz",
         accounts: [process.env.PRIVATE_KEY],
         chainId: 1338
       }
     }
   };
   ```

4. **Deploy**:
   ```bash
   npx hardhat run scripts/deploy.js --network irysTestnet
   ```

## 🌐 Server Deployment

### Local Development

```bash
npm run dev
```

Access the game at: `http://localhost:3000`

### Production Deployment

#### Option 1: Simple Server Deployment

1. **Start production server**:
   ```bash
   npm start
   ```

2. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "iryscrush"
   pm2 save
   pm2 startup
   ```

#### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t iryscrush .
docker run -p 3000:3000 --env-file .env iryscrush
```

#### Option 3: Cloud Platform Deployment

**Heroku:**
```bash
heroku create your-app-name
heroku config:set CONTRACT_ADDRESS=your_contract_address
heroku config:set PRIVATE_KEY=your_private_key
git push heroku main
```

**Vercel:**
```bash
npm install -g vercel
vercel --env CONTRACT_ADDRESS=your_contract_address
```

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

## 🔒 Security Considerations

### Environment Variables

**NEVER commit sensitive data to Git:**

1. Add to `.gitignore`:
   ```
   .env
   .env.local
   .env.production
   ```

2. Use environment variables on production platforms

3. For private keys, consider using:
   - Hardware wallets (for mainnet)
   - Key management services
   - Encrypted environment variables

### Smart Contract Security

1. **Audit your contract** before mainnet deployment
2. **Test thoroughly** on testnet
3. **Use established patterns** from OpenZeppelin
4. **Implement proper access controls**

## 🧪 Testing Your Deployment

### 1. Test Smart Contract

```bash
# Check contract is deployed and working
curl http://localhost:3000/blockchain-info
```

### 2. Test Game Functionality

1. Open your deployed application
2. Connect MetaMask wallet
3. Register a nickname
4. Play a game
5. Submit a score
6. Check leaderboard

### 3. Monitor Transactions

- Use [Irys Testnet Explorer](https://testnet-explorer.irys.xyz) to view transactions
- Check contract events and function calls
- Verify all data is stored correctly

## 🐛 Troubleshooting

### Common Issues

**Contract deployment failed:**
- Check if you have enough testnet tokens
- Verify network configuration in MetaMask
- Ensure contract compiles without errors

**MetaMask connection issues:**
- Clear MetaMask cache
- Re-import account if necessary
- Check network settings

**Server won't start:**
- Check if PORT is available
- Verify all environment variables are set
- Check Node.js version compatibility

**Transactions failing:**
- Insufficient gas/tokens
- Contract address incorrect
- Network mismatch

### Debug Steps

1. **Check server logs**:
   ```bash
   pm2 logs iryscrush
   ```

2. **Test contract calls**:
   ```bash
   node -e "
   const { ethers } = require('ethers');
   // Test contract connection
   "
   ```

3. **Browser console** - check for JavaScript errors

4. **Network tab** - monitor API calls and responses

## 🚀 Going to Mainnet

When ready for mainnet deployment:

1. **Update environment variables**:
   ```env
   IRYS_NETWORK=mainnet
   IRYS_RPC_URL=https://rpc.irys.xyz
   IRYS_CHAIN_ID=1337
   ```

2. **Get mainnet tokens** from official sources

3. **Deploy contract** to mainnet using same process

4. **Update frontend** to use mainnet configuration

5. **Test thoroughly** with small amounts first

## 📊 Monitoring and Analytics

### Basic Monitoring

Track key metrics:
- Active players
- Transactions per day
- Gas usage
- Error rates

### Tools

- **Irys Explorer** for blockchain data
- **Server monitoring** (PM2, New Relic, etc.)
- **Application monitoring** (Sentry, LogRocket)

## 🎯 Next Steps

After successful deployment:

1. **Test all functionality** thoroughly
2. **Set up monitoring** and alerts
3. **Create backup strategies**
4. **Plan for scaling**
5. **Consider security audits**

## 📞 Support

If you encounter issues:

1. Check this documentation first
2. Review the troubleshooting section
3. Check the project's GitHub issues
4. Join the community Discord
5. Create a detailed bug report

---

**Happy deploying! 🎮⛓️**

*Remember: Always test on testnet first, and never share your private keys!* 