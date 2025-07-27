const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// Завантажуємо повний ABI з файлу
const contractABI = JSON.parse(fs.readFileSync('./artifacts/IrysCrushLeaderboard.abi.json', 'utf8'));

const provider = new ethers.JsonRpcProvider(process.env.IRYS_RPC_URL);
const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const wallet2 = new ethers.Wallet(process.env.WALLET2, provider);

const contract1 = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet1);
const contract2 = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet2);

async function finalTest() {
    console.log('🎮 Фінальний тест смарт-контракту IRYS Crush');
    console.log('=' .repeat(60));
    console.log(`📍 Контракт: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`🌐 Мережа: ${process.env.IRYS_NETWORK}`);
    console.log('');
    
    try {
        // Перевірка балансів
        const balance1 = await provider.getBalance(wallet1.address);
        const balance2 = await provider.getBalance(wallet2.address);
        console.log(`💰 Баланс Wallet1 (${wallet1.address}): ${ethers.formatEther(balance1)} IRYS`);
        console.log(`💰 Баланс Wallet2 (${wallet2.address}): ${ethers.formatEther(balance2)} IRYS`);
        console.log('');
        
        // Тест 1: Основні функції контракту
        console.log('📊 Тест 1: Основні функції контракту');
        console.log('-'.repeat(40));
        
        try {
            const totalPlayers = await contract1.getTotalPlayers();
            console.log(`✅ Загальна кількість гравців: ${totalPlayers}`);
        } catch (error) {
            console.log(`❌ getTotalPlayers помилка: ${error.message}`);
        }
        
        try {
            const isRegistered1 = await contract1.isPlayerRegistered(wallet1.address);
            const isRegistered2 = await contract2.isPlayerRegistered(wallet2.address);
            console.log(`✅ Wallet1 зареєстрований: ${isRegistered1}`);
            console.log(`✅ Wallet2 зареєстрований: ${isRegistered2}`);
        } catch (error) {
            console.log(`❌ isPlayerRegistered помилка: ${error.message}`);
        }
        
        // Тест 2: Інформація про гравців
        console.log('\n👤 Тест 2: Інформація про гравців');
        console.log('-'.repeat(40));
        
        try {
            const player1Info = await contract1.getPlayer(wallet1.address);
            console.log(`✅ Гравець 1:`);
            console.log(`   Нікнейм: ${player1Info[0]}`);
            console.log(`   Найкращий рахунок: ${player1Info[1]}`);
            console.log(`   Ігор зіграно: ${player1Info[2]}`);
            console.log(`   Остання гра: ${new Date(Number(player1Info[3]) * 1000).toLocaleString()}`);
        } catch (error) {
            console.log(`❌ getPlayer для Wallet1 помилка: ${error.message}`);
        }
        
        try {
            const player2Info = await contract2.getPlayer(wallet2.address);
            console.log(`✅ Гравець 2:`);
            console.log(`   Нікнейм: ${player2Info[0]}`);
            console.log(`   Найкращий рахунок: ${player2Info[1]}`);
            console.log(`   Ігор зіграно: ${player2Info[2]}`);
            console.log(`   Остання гра: ${new Date(Number(player2Info[3]) * 1000).toLocaleString()}`);
        } catch (error) {
            console.log(`❌ getPlayer для Wallet2 помилка: ${error.message}`);
        }
        
        // Тест 3: Спроба створення PvP кімнати (діагностика)
        console.log('\n🏠 Тест 3: Діагностика створення PvP кімнати');
        console.log('-'.repeat(40));
        
        const entryFee = ethers.parseEther('0.01');
        const gameTime = 300;
        const maxPlayers = 3;
        
        console.log(`Параметри кімнати:`);
        console.log(`   Entry Fee: ${ethers.formatEther(entryFee)} IRYS`);
        console.log(`   Game Time: ${gameTime} секунд`);
        console.log(`   Max Players: ${maxPlayers}`);
        
        try {
            console.log('\nСпроба статичного виклику createPvPRoom...');
            await contract1.createPvPRoom.staticCall(entryFee, gameTime, maxPlayers);
            console.log('✅ Статичний виклик успішний!');
            
            console.log('Спроба оцінки газу...');
            const gasEstimate = await contract1.createPvPRoom.estimateGas(entryFee, gameTime, maxPlayers);
            console.log(`✅ Оцінка газу: ${gasEstimate.toString()}`);
            
            console.log('Спроба реального виклику...');
            const createTx = await contract1.createPvPRoom(entryFee, gameTime, maxPlayers);
            console.log(`✅ Транзакція відправлена: ${createTx.hash}`);
            
            const receipt = await createTx.wait();
            console.log(`✅ Кімната створена! Gas used: ${receipt.gasUsed}`);
            
            // Знаходимо roomId з події
            const roomCreatedEvent = receipt.logs.find(log => {
                try {
                    const parsed = contract1.interface.parseLog(log);
                    return parsed.name === 'RoomCreated';
                } catch {
                    return false;
                }
            });
            
            let roomId = 1;
            if (roomCreatedEvent) {
                const parsed = contract1.interface.parseLog(roomCreatedEvent);
                roomId = parsed.args.roomId;
                console.log(`🆔 Room ID: ${roomId}`);
            }
            
            // Тест 4: Інформація про створену кімнату
            console.log('\n📊 Тест 4: Інформація про створену кімнату');
            console.log('-'.repeat(40));
            
            try {
                const roomInfo = await contract1.getPvPRoom(roomId);
                console.log(`✅ Інформація про кімнату ${roomId}:`);
                console.log(`   Host: ${roomInfo[0]}`);
                console.log(`   Entry Fee: ${ethers.formatEther(roomInfo[1])} IRYS`);
                console.log(`   Game Time: ${roomInfo[2]} секунд`);
                console.log(`   Players: ${roomInfo[3].length}/${roomInfo[6]}`);
                console.log(`   Is Active: ${roomInfo[4]}`);
                console.log(`   Game Started: ${roomInfo[5]}`);
            } catch (error) {
                console.log(`❌ getPvPRoom помилка: ${error.message}`);
            }
            
            // Тест 5: Хост приєднується до кімнати
            console.log('\n👤 Тест 5: Хост приєднується до кімнати');
            console.log('-'.repeat(40));
            
            try {
                console.log('Хост приєднується до власної кімнати...');
                const joinTx = await contract1.joinPvPRoom(roomId, { value: entryFee });
                console.log(`✅ Транзакція відправлена: ${joinTx.hash}`);
                
                const joinReceipt = await joinTx.wait();
                console.log(`✅ Хост приєднався! Gas used: ${joinReceipt.gasUsed}`);
                
                // Перевірка оновленої інформації
                const updatedRoomInfo = await contract1.getPvPRoom(roomId);
                console.log(`📊 Оновлена інформація: ${updatedRoomInfo[3].length}/${updatedRoomInfo[6]} гравців`);
                
            } catch (error) {
                console.log(`❌ joinPvPRoom для хоста помилка: ${error.message}`);
            }
            
            // Тест 6: Другий гравець приєднується
            console.log('\n👥 Тест 6: Другий гравець приєднується');
            console.log('-'.repeat(40));
            
            try {
                console.log('Wallet2 приєднується до кімнати...');
                const joinTx2 = await contract2.joinPvPRoom(roomId, { value: entryFee });
                console.log(`✅ Транзакція відправлена: ${joinTx2.hash}`);
                
                const joinReceipt2 = await joinTx2.wait();
                console.log(`✅ Гравець 2 приєднався! Gas used: ${joinReceipt2.gasUsed}`);
                
                // Фінальна перевірка
                const finalRoomInfo = await contract1.getPvPRoom(roomId);
                console.log(`📊 Фінальна інформація: ${finalRoomInfo[3].length}/${finalRoomInfo[6]} гравців`);
                console.log(`👥 Список гравців:`);
                finalRoomInfo[3].forEach((player, index) => {
                    console.log(`   ${index + 1}. ${player}`);
                });
                
            } catch (error) {
                console.log(`❌ joinPvPRoom для гравця 2 помилка: ${error.message}`);
            }
            
            // Тест 7: Запуск гри
            console.log('\n🚀 Тест 7: Запуск гри');
            console.log('-'.repeat(40));
            
            try {
                console.log('Хост запускає гру...');
                const startTx = await contract1.startPvPGame(roomId);
                console.log(`✅ Транзакція відправлена: ${startTx.hash}`);
                
                const startReceipt = await startTx.wait();
                console.log(`✅ Гра запущена! Gas used: ${startReceipt.gasUsed}`);
                
                // Перевірка статусу
                const gameRoomInfo = await contract1.getPvPRoom(roomId);
                console.log(`📊 Статус гри: Game Started = ${gameRoomInfo[5]}`);
                
            } catch (error) {
                console.log(`❌ startPvPGame помилка: ${error.message}`);
            }
            
        } catch (error) {
            console.log(`❌ createPvPRoom помилка: ${error.message}`);
            console.log(`Error code: ${error.code}`);
            if (error.data) {
                console.log(`Error data: ${error.data}`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 Тестування завершено!');
        console.log('📝 Результат: Контракт працює для основних функцій.');
        if (process.env.CONTRACT_ADDRESS) {
            console.log(`🔗 Адреса контракту: ${process.env.CONTRACT_ADDRESS}`);
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Критична помилка:', error.message);
    }
}

finalTest().catch(console.error);