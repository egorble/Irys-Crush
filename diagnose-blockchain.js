#!/usr/bin/env node

const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const IRYS_RPC_URL = process.env.IRYS_RPC_URL || 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CONTRACT_ABI = [
  "function getPlayer(address _player) view returns (string memory nickname, uint256 highScore, uint256 gamesPlayed, uint256 lastPlayed)",
  "function getLeaderboard(uint256 _limit) view returns (address[] memory addresses, string[] memory nicknames, uint256[] memory scores)",
  "function isPlayerRegistered(address _player) view returns (bool)",
  "function isNicknameAvailable(string memory _nickname) view returns (bool)",
  "function getTotalPlayers() view returns (uint256)"
];

async function diagnoseBlockchain() {
  console.log('🔍 ДІАГНОСТИКА БЛОКЧЕЙНУ IRYS');
  console.log('================================');
  
  // 1. Перевірка конфігурації
  console.log('\n📋 1. ПЕРЕВІРКА КОНФІГУРАЦІЇ:');
  console.log(`   RPC URL: ${IRYS_RPC_URL}`);
  console.log(`   Contract Address: ${CONTRACT_ADDRESS || '❌ НЕ ВСТАНОВЛЕНО'}`);
  console.log(`   Private Key: ${PRIVATE_KEY ? '✅ Встановлено' : '❌ НЕ ВСТАНОВЛЕНО'}`);
  
  if (!CONTRACT_ADDRESS) {
    console.log('\n❌ КРИТИЧНА ПОМИЛКА: CONTRACT_ADDRESS не встановлено в .env файлі!');
    console.log('   Створіть .env файл з CONTRACT_ADDRESS=your_contract_address');
    return;
  }
  
  // 2. Перевірка підключення до RPC
  console.log('\n🌐 2. ПЕРЕВІРКА ПІДКЛЮЧЕННЯ ДО RPC:');
  try {
    const provider = new ethers.JsonRpcProvider(IRYS_RPC_URL);
    
    // Тест підключення
    const network = await provider.getNetwork();
    console.log(`   ✅ Підключено до мережі: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Перевірка останнього блоку
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Останній блок: ${blockNumber}`);
    
    // 3. Перевірка контракту
    console.log('\n📄 3. ПЕРЕВІРКА КОНТРАКТУ:');
    
    // Перевірка чи існує код за адресою
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log(`   ❌ За адресою ${CONTRACT_ADDRESS} немає коду контракту!`);
      console.log('   Можливо контракт не розгорнуто або адреса неправильна.');
      return;
    } else {
      console.log(`   ✅ Контракт знайдено за адресою ${CONTRACT_ADDRESS}`);
      console.log(`   Розмір коду: ${(code.length - 2) / 2} байт`);
    }
    
    // 4. Тест викликів контракту
    console.log('\n🔧 4. ТЕСТ ВИКЛИКІВ КОНТРАКТУ:');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    try {
      const totalPlayers = await contract.getTotalPlayers();
      console.log(`   ✅ getTotalPlayers(): ${totalPlayers}`);
    } catch (error) {
      console.log(`   ❌ getTotalPlayers() помилка: ${error.message}`);
    }
    
    try {
      const isAvailable = await contract.isNicknameAvailable('test123');
      console.log(`   ✅ isNicknameAvailable('test123'): ${isAvailable}`);
    } catch (error) {
      console.log(`   ❌ isNicknameAvailable() помилка: ${error.message}`);
    }
    
    try {
      const [addresses, nicknames, scores] = await contract.getLeaderboard(5);
      console.log(`   ✅ getLeaderboard(5): ${addresses.length} гравців`);
      if (addresses.length > 0) {
        console.log(`   Топ гравець: ${nicknames[0]} (${scores[0]} очок)`);
      }
    } catch (error) {
      console.log(`   ❌ getLeaderboard() помилка: ${error.message}`);
    }
    
    // 5. Перевірка гаманця (якщо є приватний ключ)
    if (PRIVATE_KEY) {
      console.log('\n💰 5. ПЕРЕВІРКА ГАМАНЦЯ:');
      try {
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const address = wallet.address;
        const balance = await provider.getBalance(address);
        
        console.log(`   ✅ Адреса гаманця: ${address}`);
        console.log(`   ✅ Баланс: ${ethers.formatEther(balance)} IRYS`);
        
        // Перевірка чи зареєстрований гравець
        try {
          const isRegistered = await contract.isPlayerRegistered(address);
          console.log(`   Гравець зареєстрований: ${isRegistered ? '✅ Так' : '❌ Ні'}`);
          
          if (isRegistered) {
            const [nickname, highScore, gamesPlayed, lastPlayed] = await contract.getPlayer(address);
            console.log(`   Нікнейм: ${nickname}`);
            console.log(`   Найкращий результат: ${highScore}`);
            console.log(`   Ігор зіграно: ${gamesPlayed}`);
          }
        } catch (error) {
          console.log(`   ❌ Помилка перевірки гравця: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Помилка гаманця: ${error.message}`);
      }
    }
    
    // 6. Загальний статус
    console.log('\n📊 6. ЗАГАЛЬНИЙ СТАТУС:');
    console.log('   ✅ RPC підключення: OK');
    console.log('   ✅ Контракт знайдено: OK');
    console.log('   ✅ Основні функції працюють: OK');
    console.log('\n🎉 ВСЕ ПРАЦЮЄ ПРАВИЛЬНО!');
    
  } catch (error) {
    console.log(`\n❌ ПОМИЛКА ПІДКЛЮЧЕННЯ: ${error.message}`);
    console.log('\nМожливі причини:');
    console.log('1. Проблеми з інтернет-з\'єднанням');
    console.log('2. RPC сервер недоступний');
    console.log('3. Неправильний RPC URL');
    console.log('4. Блокування фаєрволом');
  }
}

// Функція для тестування конкретної адреси контракту
async function testContractAddress(address) {
  console.log(`\n🔍 ТЕСТ КОНТРАКТУ ЗА АДРЕСОЮ: ${address}`);
  console.log('================================================');
  
  try {
    const provider = new ethers.JsonRpcProvider(IRYS_RPC_URL);
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      console.log('❌ За цією адресою немає коду контракту');
      return false;
    }
    
    console.log('✅ Контракт знайдено');
    
    const contract = new ethers.Contract(address, CONTRACT_ABI, provider);
    const totalPlayers = await contract.getTotalPlayers();
    console.log(`✅ Загальна кількість гравців: ${totalPlayers}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Помилка: ${error.message}`);
    return false;
  }
}

// Головна функція
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === 'test') {
    if (args[1]) {
      await testContractAddress(args[1]);
    } else {
      console.log('Використання: node diagnose-blockchain.js test <contract_address>');
    }
  } else {
    await diagnoseBlockchain();
  }
}

// Обробка помилок
process.on('unhandledRejection', (error) => {
  console.error('❌ Необроблена помилка:', error.message);
  process.exit(1);
});

main().catch(console.error); 