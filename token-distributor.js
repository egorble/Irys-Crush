const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
    batchSize: 10, // Кількість транзакцій в одному батчі
    delayBetweenBatches: 5000, // 5 секунд між батчами
};

class TokenDistributor {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.recipients = [];
        this.distributionLog = [];
    }

    // Ініціалізація підключення
    async initialize() {
        try {
            console.log('🔗 Підключення до Irys мережі...');
            
            // Підключення до RPC
            this.provider = new ethers.JsonRpcProvider(IRYS_CONFIG.rpcUrl);
            
            // Перевірка підключення
            const network = await this.provider.getNetwork();
            console.log(`✅ Підключено до мережі: ${network.name} (Chain ID: ${network.chainId})`);
            
            // Ініціалізація гаманця
            if (!process.env.PRIVATE_KEY) {
                throw new Error('❌ PRIVATE_KEY не знайдено в .env файлі!');
            }
            
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            console.log(`👛 Гаманець: ${this.wallet.address}`);
            
            // Перевірка балансу
            const balance = await this.provider.getBalance(this.wallet.address);
            const balanceInIRYS = ethers.formatEther(balance);
            console.log(`💰 Баланс: ${balanceInIRYS} IRYS`);
            
            if (parseFloat(balanceInIRYS) < 1) {
                console.warn('⚠️  Низький баланс! Рекомендується мати мінімум 1 IRYS');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Помилка ініціалізації:', error.message);
            return false;
        }
    }

    // Завантаження списку отримувачів
    loadRecipients(filePath = 'recipients.txt') {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`📝 Створюю файл ${filePath}...`);
                fs.writeFileSync(filePath, '# Додайте адреси гаманців (по одному на рядок)\n# 0x1234567890abcdef...\n');
                console.log(`✅ Файл ${filePath} створено. Додайте адреси отримувачів.`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const addresses = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .filter(line => ethers.isAddress(line));

            this.recipients = addresses;
            console.log(`📋 Завантажено ${this.recipients.length} адрес отримувачів`);
            
            if (this.recipients.length === 0) {
                console.log('⚠️  Немає валідних адрес у файлі!');
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Помилка завантаження отримувачів:', error.message);
            return false;
        }
    }

    // Завантаження списку з файлу верифікацій
    loadFromVerifications(filePath = 'task_verifications.txt') {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Файл ${filePath} не знайдено`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            const addresses = new Set();
            
            lines.forEach(line => {
                try {
                    const data = JSON.parse(line);
                    if (data.wallet && ethers.isAddress(data.wallet) && data.wallet !== 'anonymous') {
                        addresses.add(data.wallet);
                    }
                } catch (e) {
                    // Ігноруємо невалідні рядки
                }
            });

            this.recipients = Array.from(addresses);
            console.log(`📋 Завантажено ${this.recipients.length} унікальних адрес з верифікацій`);
            return this.recipients.length > 0;
        } catch (error) {
            console.error('❌ Помилка завантаження з верифікацій:', error.message);
            return false;
        }
    }

    // Перевірка чи адреса вже отримувала токени
    async checkAlreadyReceived(address) {
        const logFile = 'distribution_log.json';
        
        if (!fs.existsSync(logFile)) {
            return false;
        }

        try {
            const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            return log.some(entry => entry.recipient.toLowerCase() === address.toLowerCase());
        } catch (error) {
            return false;
        }
    }

    // Відправка токенів одному отримувачу
    async sendTokens(recipientAddress, amount) {
        try {
            console.log(`💸 Відправка ${amount} IRYS до ${recipientAddress}...`);

            // Перевірка чи вже отримував
            const alreadyReceived = await this.checkAlreadyReceived(recipientAddress);
            if (alreadyReceived) {
                console.log(`⏭️  ${recipientAddress} вже отримував токени, пропускаємо`);
                return { success: false, reason: 'already_received' };
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
                return { success: false, reason: 'gas_too_high' };
            }

            // Відправка транзакції
            const transaction = await this.wallet.sendTransaction(tx);
            console.log(`📤 Транзакція відправлена: ${transaction.hash}`);

            // Очікування підтвердження
            const receipt = await transaction.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ Успішно відправлено ${amount} IRYS до ${recipientAddress}`);
                
                // Логування
                const logEntry = {
                    recipient: recipientAddress,
                    amount: amount,
                    txHash: transaction.hash,
                    timestamp: new Date().toISOString(),
                    gasUsed: receipt.gasUsed.toString(),
                    gasPrice: tx.gasPrice.toString()
                };
                
                this.distributionLog.push(logEntry);
                this.saveLog();
                
                return { success: true, txHash: transaction.hash };
            } else {
                console.log(`❌ Транзакція не вдалася: ${transaction.hash}`);
                return { success: false, reason: 'transaction_failed' };
            }

        } catch (error) {
            console.error(`❌ Помилка відправки до ${recipientAddress}:`, error.message);
            return { success: false, reason: error.message };
        }
    }

    // Збереження логу
    saveLog() {
        try {
            fs.writeFileSync('distribution_log.json', JSON.stringify(this.distributionLog, null, 2));
        } catch (error) {
            console.error('❌ Помилка збереження логу:', error.message);
        }
    }

    // Завантаження існуючого логу
    loadLog() {
        try {
            if (fs.existsSync('distribution_log.json')) {
                this.distributionLog = JSON.parse(fs.readFileSync('distribution_log.json', 'utf8'));
                console.log(`📜 Завантажено лог з ${this.distributionLog.length} записами`);
            }
        } catch (error) {
            console.error('❌ Помилка завантаження логу:', error.message);
            this.distributionLog = [];
        }
    }

    // Масова розсилка
    async distributeTokens() {
        console.log('🚀 Початок масової розсилки токенів...');
        
        this.loadLog();
        
        let successful = 0;
        let failed = 0;
        let skipped = 0;

        // Розбиваємо на батчі
        for (let i = 0; i < this.recipients.length; i += DISTRIBUTION_CONFIG.batchSize) {
            const batch = this.recipients.slice(i, i + DISTRIBUTION_CONFIG.batchSize);
            
            console.log(`\n📦 Обробка батчу ${Math.floor(i / DISTRIBUTION_CONFIG.batchSize) + 1}/${Math.ceil(this.recipients.length / DISTRIBUTION_CONFIG.batchSize)}`);
            
            for (const recipient of batch) {
                const result = await this.sendTokens(recipient, DISTRIBUTION_CONFIG.tokenAmount);
                
                if (result.success) {
                    successful++;
                } else if (result.reason === 'already_received') {
                    skipped++;
                } else {
                    failed++;
                }

                // Затримка між транзакціями
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Затримка між батчами
            if (i + DISTRIBUTION_CONFIG.batchSize < this.recipients.length) {
                console.log(`⏳ Очікування ${DISTRIBUTION_CONFIG.delayBetweenBatches / 1000} секунд...`);
                await new Promise(resolve => setTimeout(resolve, DISTRIBUTION_CONFIG.delayBetweenBatches));
            }
        }

        console.log('\n🎉 Розсилка завершена!');
        console.log(`✅ Успішно: ${successful}`);
        console.log(`⏭️  Пропущено: ${skipped}`);
        console.log(`❌ Помилки: ${failed}`);
        console.log(`📊 Загалом оброблено: ${this.recipients.length}`);
    }

    // Перевірка балансу отримувача
    async checkRecipientBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            return 'Error';
        }
    }

    // Показати статистику
    async showStats() {
        console.log('\n📊 Статистика розсилки:');
        console.log('═'.repeat(50));
        
        const balance = await this.provider.getBalance(this.wallet.address);
        console.log(`💰 Поточний баланс: ${ethers.formatEther(balance)} IRYS`);
        
        if (this.distributionLog.length > 0) {
            const totalSent = this.distributionLog.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
            console.log(`📤 Відправлено токенів: ${totalSent} IRYS`);
            console.log(`🎯 Кількість транзакцій: ${this.distributionLog.length}`);
            
            const lastTx = this.distributionLog[this.distributionLog.length - 1];
            console.log(`⏰ Остання транзакція: ${lastTx.timestamp}`);
        }
    }
}

// Головна функція
async function main() {
    console.log('🎮 IrysGame Token Distributor');
    console.log('═'.repeat(40));

    const distributor = new TokenDistributor();

    // Ініціалізація
    const initialized = await distributor.initialize();
    if (!initialized) {
        process.exit(1);
    }

    // Вибір джерела отримувачів
    const args = process.argv.slice(2);
    const source = args[0] || 'verifications';

    let loaded = false;
    if (source === 'verifications') {
        loaded = distributor.loadFromVerifications();
    } else if (source === 'file') {
        loaded = distributor.loadRecipients();
    }

    if (!loaded) {
        console.log('❌ Не вдалося завантажити список отримувачів');
        process.exit(1);
    }

    // Показати статистику
    await distributor.showStats();

    // Підтвердження
    console.log(`\n⚠️  Увага! Буде розіслано по ${DISTRIBUTION_CONFIG.tokenAmount} IRYS до ${distributor.recipients.length} адрес`);
    console.log('Натисніть Ctrl+C для скасування або Enter для продовження...');
    
    // Очікування підтвердження
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // Запуск розсилки
    await distributor.distributeTokens();

    // Фінальна статистика
    await distributor.showStats();
}

// Запуск
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TokenDistributor; 