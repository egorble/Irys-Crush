const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Конфігурація Irys мережі
const IRYS_CONFIG = {
    name: 'Irys Testnet',
    chainId: 1270,
    rpcUrl: 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
    symbol: 'IRYS',
    decimals: 18
};

// Конфігурація розсилання
const DISTRIBUTION_CONFIG = {
    tokenAmount: '0.1', // Кількість токенів для розсилання
    gasLimit: '21000',
    maxGasPrice: '20000000000', // 20 Gwei
};

class TokenDistributor {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.isInitialized = false;
    }

    // Ініціалізація підключення
    async initialize() {
        try {
            if (this.isInitialized) {
                return true;
            }

            console.log('🔗 Ініціалізація TokenDistributor...');
            
            // Підключення до RPC
            this.provider = new ethers.JsonRpcProvider(IRYS_CONFIG.rpcUrl);
            
            // Перевірка підключення
            const network = await this.provider.getNetwork();
            console.log(`✅ Підключено до мережі: ${network.name} (Chain ID: ${network.chainId})`);
            
            // Ініціалізація гаманця
            if (!process.env.DISTRIBUTOR_PRIVATE_KEY) {
                console.warn('⚠️  DISTRIBUTOR_PRIVATE_KEY не знайдено в .env файлі! Розсилка токенів буде недоступна.');
                return false;
            }
            
            this.wallet = new ethers.Wallet(process.env.DISTRIBUTOR_PRIVATE_KEY, this.provider);
            console.log(`👛 Гаманець розсилки: ${this.wallet.address}`);
            
            // Перевірка балансу
            const balance = await this.provider.getBalance(this.wallet.address);
            const balanceInIRYS = ethers.formatEther(balance);
            console.log(`💰 Баланс розсилки: ${balanceInIRYS} IRYS`);
            
            if (parseFloat(balanceInIRYS) < 1) {
                console.warn('⚠️  Низький баланс гаманця розсилки! Рекомендується мати мінімум 1 IRYS');
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Помилка ініціалізації TokenDistributor:', error.message);
            return false;
        }
    }

    // Перевірка чи адреса вже отримувала токени
    async checkAlreadyReceived(address) {
        const logFile = path.join(__dirname, '..', 'reward_claims.txt');
        
        if (!fs.existsSync(logFile)) {
            return false;
        }

        try {
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            return lines.some(line => {
                try {
                    const data = JSON.parse(line);
                    return data.wallet && data.wallet.toLowerCase() === address.toLowerCase();
                } catch (e) {
                    return false;
                }
            });
        } catch (error) {
            console.error('❌ Помилка перевірки reward_claims.txt:', error.message);
            return false;
        }
    }

    // Відправка токенів одному отримувачу
    async sendTokens(recipientAddress, amount = DISTRIBUTION_CONFIG.tokenAmount) {
        try {
            if (!this.isInitialized) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('TokenDistributor не ініціалізовано');
                }
            }

            console.log(`💸 Відправка ${amount} IRYS до ${recipientAddress}...`);

            // Перевірка чи вже отримував
            const alreadyReceived = await this.checkAlreadyReceived(recipientAddress);
            if (alreadyReceived) {
                console.log(`⏭️  ${recipientAddress} вже отримував токени`);
                return { 
                    success: false, 
                    error: 'already_received',
                    message: 'Цей гаманець вже отримував винагороду' 
                };
            }

            // Перевірка балансу гаманця розсилки
            const balance = await this.provider.getBalance(this.wallet.address);
            const balanceInIRYS = parseFloat(ethers.formatEther(balance));
            const requiredAmount = parseFloat(amount);

            if (balanceInIRYS < requiredAmount) {
                console.error(`❌ Недостатньо коштів для розсилки: ${balanceInIRYS} < ${requiredAmount}`);
                return { 
                    success: false, 
                    error: 'insufficient_funds',
                    message: 'Недостатньо коштів на гаманці розсилки' 
                };
            }

            // Підготовка транзакції
            const tx = {
                to: recipientAddress,
                value: ethers.parseEther(amount),
                gasLimit: DISTRIBUTION_CONFIG.gasLimit,
            };

            // Отримання поточної ціни газу
            const feeData = await this.provider.getFeeData();
            tx.gasPrice = feeData.gasPrice;

            // Перевірка максимальної ціни газу
            if (tx.gasPrice > BigInt(DISTRIBUTION_CONFIG.maxGasPrice)) {
                console.log(`⚠️  Ціна газу занадто висока: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei`);
                return { 
                    success: false, 
                    error: 'gas_too_high',
                    message: 'Ціна газу занадто висока, спробуйте пізніше' 
                };
            }

            // Відправка транзакції
            const transaction = await this.wallet.sendTransaction(tx);
            console.log(`📤 Транзакція відправлена: ${transaction.hash}`);

            // Очікування підтвердження
            const receipt = await transaction.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ Успішно відправлено ${amount} IRYS до ${recipientAddress}`);
                
                // Логування успішної транзакції
                const logEntry = {
                    wallet: recipientAddress,
                    amount: amount,
                    txHash: transaction.hash,
                    timestamp: new Date().toISOString(),
                    gasUsed: receipt.gasUsed.toString(),
                    gasPrice: tx.gasPrice.toString(),
                    status: 'success'
                };
                
                this.saveTransactionLog(logEntry);
                
                return { 
                    success: true, 
                    txHash: transaction.hash,
                    message: `Успішно відправлено ${amount} IRYS!`,
                    explorerUrl: `https://testnet-explorer.irys.xyz/tx/${transaction.hash}`
                };
            } else {
                console.log(`❌ Транзакція не вдалася: ${transaction.hash}`);
                return { 
                    success: false, 
                    error: 'transaction_failed',
                    message: 'Транзакція не вдалася' 
                };
            }

        } catch (error) {
            console.error(`❌ Помилка відправки до ${recipientAddress}:`, error.message);
            
            // Логування помилки
            const errorLog = {
                wallet: recipientAddress,
                amount: amount,
                error: error.message,
                timestamp: new Date().toISOString(),
                status: 'error'
            };
            this.saveTransactionLog(errorLog);
            
            return { 
                success: false, 
                error: 'send_failed',
                message: `Помилка відправки: ${error.message}` 
            };
        }
    }

    // Збереження логу транзакції
    saveTransactionLog(logEntry) {
        try {
            const logFile = path.join(__dirname, '..', 'distribution_log.txt');
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(logFile, logLine);
        } catch (error) {
            console.error('❌ Помилка збереження логу транзакції:', error.message);
        }
    }

    // Отримання статистики
    async getStats() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const stats = {
                isAvailable: this.isInitialized,
                walletAddress: this.wallet ? this.wallet.address : null,
                balance: '0',
                totalDistributed: 0,
                totalTransactions: 0
            };

            if (this.wallet) {
                const balance = await this.provider.getBalance(this.wallet.address);
                stats.balance = ethers.formatEther(balance);
            }

            // Читаємо статистику з логу
            const logFile = path.join(__dirname, '..', 'distribution_log.txt');
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                let totalDistributed = 0;
                let successfulTransactions = 0;

                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line);
                        if (data.status === 'success' && data.amount) {
                            totalDistributed += parseFloat(data.amount);
                            successfulTransactions++;
                        }
                    } catch (e) {
                        // Ігноруємо невалідні рядки
                    }
                });

                stats.totalDistributed = totalDistributed;
                stats.totalTransactions = successfulTransactions;
            }

            return stats;
        } catch (error) {
            console.error('❌ Помилка отримання статистики:', error.message);
            return {
                isAvailable: false,
                error: error.message
            };
        }
    }

    // Перевірка доступності системи
    async isAvailable() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.isInitialized;
    }
}

// Створюємо глобальний екземпляр
const tokenDistributor = new TokenDistributor();

module.exports = tokenDistributor; 