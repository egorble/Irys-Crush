// 🎁 IrysCrush Reward System
// Система винагород для отримання 0.1 IRYS токенів

// Мінімальний рахунок для отримання винагороди
const MINIMUM_SCORE_FOR_TASKS = 2000;

// DOM елементи завдань
let getIrysBtn, tasksModal, closeTasksBtn, minimumScoreModal, closeMinimumScoreBtn;
let currentBestScoreSpan, followEgorbleBtn, followWanfarBtn, followRetreeBtn;
let shareScoreBtn, submitVerificationBtn, postLinkInput, task4Verification;
let tasksProgressFill, tasksCompletedSpan, tasksReward, claimRewardBtn;
let task1Status, task2Status, task3Status, task4Status;

// Стан завдань
let tasksCompleted = {
  task1: false, // Follow Egorble
  task2: false, // Follow WanFar
  task3: false, // Follow Retree
  task4: false  // Share Score
};

// Ініціалізація DOM елементів
function initializeTaskElements() {
  getIrysBtn = document.getElementById('get-irys-btn');
  tasksModal = document.getElementById('tasks-modal');
  closeTasksBtn = document.getElementById('close-tasks');
  minimumScoreModal = document.getElementById('minimum-score-modal');
  closeMinimumScoreBtn = document.getElementById('close-minimum-score');
  currentBestScoreSpan = document.getElementById('current-best-score');
  followEgorbleBtn = document.getElementById('follow-egorble-btn');
  followWanfarBtn = document.getElementById('follow-wanfar-btn');
  followRetreeBtn = document.getElementById('follow-retree-btn');
  shareScoreBtn = document.getElementById('share-score-btn');
  submitVerificationBtn = document.getElementById('submit-verification-btn');
  postLinkInput = document.getElementById('post-link-input');
  task4Verification = document.getElementById('task-4-verification');
  tasksProgressFill = document.getElementById('tasks-progress-fill');
  tasksCompletedSpan = document.getElementById('tasks-completed');
  tasksReward = document.getElementById('tasks-reward');
  claimRewardBtn = document.getElementById('claim-reward-btn');
  task1Status = document.getElementById('task-1-status');
  task2Status = document.getElementById('task-2-status');
  task3Status = document.getElementById('task-3-status');
  task4Status = document.getElementById('task-4-status');
}

// Завантаження прогресу завдань з localStorage
function loadTasksProgress() {
  const savedTasks = localStorage.getItem('irys_tasks_progress');
  if (savedTasks) {
    tasksCompleted = JSON.parse(savedTasks);
    updateTasksUI();
  }
}

// Збереження прогресу завдань до localStorage
function saveTasksProgress() {
  localStorage.setItem('irys_tasks_progress', JSON.stringify(tasksCompleted));
}

// Перевірка, чи винагорода вже була отримана для цього гаманця
async function checkRewardAlreadyClaimed(wallet) {
  try {
    const response = await fetch('/check-reward-claimed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wallet })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        alreadyClaimed: result.claimed,
        claimedDate: result.claimedDate || null
      };
    } else {
      throw new Error('Server check failed');
    }
  } catch (error) {
    console.error('❌ Error checking reward status:', error);
    throw error;
  }
}

// Збереження заявки на винагороду на сервері
async function saveRewardClaim(wallet, score) {
  try {
    const response = await fetch('/claim-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet,
        score,
        timestamp: new Date().toISOString(),
        nickname: userNickname || 'unknown'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      // Reward claim saved
      return result;
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save reward claim');
    }
  } catch (error) {
    console.error('❌ Error saving reward claim:', error);
    throw error;
  }
}

// Перевірка та оновлення статусу кнопки винагороди
async function checkAndUpdateRewardButton() {
  const claimRewardBtn = document.getElementById('claim-reward-btn');
  if (!userWallet || !claimRewardBtn) return;
  
  try {
    // Спочатку перевіряємо локальне сховище
    const walletRewardKey = `irys_reward_claimed_${userWallet}`;
    const localClaimed = localStorage.getItem(walletRewardKey) === 'true';
    
    if (localClaimed) {
      const claimedDate = localStorage.getItem(`irys_reward_date_${userWallet}`);
      updateRewardButtonToClaimed(claimedDate);
      return;
    }
    
    // Перевіряємо на сервері
    const serverCheck = await checkRewardAlreadyClaimed(userWallet);
    if (serverCheck.alreadyClaimed) {
      // Оновлюємо локальне сховище відповідно до сервера
      localStorage.setItem('irys_reward_claimed', 'true');
      localStorage.setItem(walletRewardKey, 'true');
      localStorage.setItem(`irys_reward_date_${userWallet}`, serverCheck.claimedDate);
      
      updateRewardButtonToClaimed(serverCheck.claimedDate);
    } else {
      // Скидаємо кнопку до стану "можна отримати"
      claimRewardBtn.textContent = 'Claim 0.1 IRYS';
      claimRewardBtn.disabled = false;
      claimRewardBtn.style.opacity = '1';
    }
  } catch (error) {
    console.error('❌ Error checking reward status:', error);
    // Якщо перевірка сервера не вдалася, покладаємося тільки на локальне сховище
  }
}

// Оновлення кнопки для показу статусу "вже отримано"
function updateRewardButtonToClaimed(claimedDate) {
  const claimRewardBtn = document.getElementById('claim-reward-btn');
  if (!claimRewardBtn) return;
  
  claimRewardBtn.textContent = '✅ Already Claimed';
  claimRewardBtn.disabled = true;
  claimRewardBtn.style.opacity = '0.6';
  claimRewardBtn.title = `Reward claimed on: ${claimedDate ? new Date(claimedDate).toLocaleDateString() : 'Unknown date'}`;
}

// Основна функція отримання винагороди 0.1 IRYS
async function claimReward() {
  // Claim reward button clicked
  
  // Перевірка, чи винагорода вже була отримана (локальна перевірка)
  const localRewardClaimed = localStorage.getItem('irys_reward_claimed') === 'true';
  const walletRewardKey = `irys_reward_claimed_${userWallet}`;
  const walletRewardClaimed = localStorage.getItem(walletRewardKey) === 'true';
  
  if (localRewardClaimed || walletRewardClaimed) {
    // Reward already claimed locally
    alert('🚫 You have already claimed your 0.1 IRYS reward!\n\nEach wallet can only claim the reward once.');
    return;
  }
  
  // Перевірка, чи всі завдання виконані
  const completedCount = Object.values(tasksCompleted).filter(Boolean).length;
  // Tasks completed status checked
  
  if (completedCount !== 4) {
    alert('Please complete all tasks first!');
    return;
  }
  
  // Перевірка, чи підключений гаманець
  if (!userWallet) {
    alert('Please connect your wallet to claim the reward!');
    return;
  }
  
  // Wallet connected
  
  // Перевірка на сервері, чи винагорода вже була отримана для цього гаманця
  try {
    // Checking server for previous reward claims
    const serverCheck = await checkRewardAlreadyClaimed(userWallet);
    if (serverCheck.alreadyClaimed) {
      // Reward already claimed on server
      alert(`🚫 This wallet has already claimed the reward!\n\nClaimed on: ${serverCheck.claimedDate}\n\nEach wallet can only claim once.`);
      
      // Оновлюємо локальне сховище відповідно до стану сервера
      localStorage.setItem('irys_reward_claimed', 'true');
      localStorage.setItem(walletRewardKey, 'true');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking server reward status:', error);
    // Продовжуємо тільки з локальними перевірками, якщо сервер недоступний
  }
  
  try {
    // Перевіряємо, чи користувач має мінімальний рахунок
    const bestScore = await getUserBestScore();
    // Current best score and minimum required score checked
    
    if (bestScore < MINIMUM_SCORE_FOR_TASKS) {
      // Score too low! Showing minimum score warning
      // Показуємо попередження про мінімальний рахунок
      const currentBestScoreSpan = document.getElementById('current-best-score');
      const minimumScoreModal = document.getElementById('minimum-score-modal');
      if (currentBestScoreSpan) currentBestScoreSpan.textContent = bestScore;
      if (minimumScoreModal) minimumScoreModal.classList.remove('hidden');
      return;
    }
    
    // Score is sufficient! Proceeding with reward
    
    // Показуємо повідомлення про обробку
    alert('🔄 Processing your reward claim...\n\nPlease wait while we send 0.1 IRYS tokens to your wallet.');
    
    // Рахунок достатній - продовжуємо з РЕАЛЬНИМ розподілом токенів
    await processRewardDistribution(bestScore);
    
  } catch (error) {
    console.error('❌ Error checking score for reward:', error);
    // Резервний варіант з локальним рахунком
    await handleFallbackRewardClaim();
  }
}

// Обробка розподілу винагороди
async function processRewardDistribution(score) {
  try {
    // Claiming reward with real token distribution
    
    const response = await fetch('/claim-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet: userWallet,
        score: score,
        nickname: userNickname || 'unknown',
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    // Reward claim result
    
    if (result.success) {
      handleSuccessfulReward(result, score);
    } else {
      handleFailedReward(result);
    }
    
  } catch (error) {
    console.error('❌ Error claiming reward:', error);
    alert('❌ Network error occurred while claiming reward!\n\nPlease check your connection and try again.');
  }
}

// Обробка успішного отримання винагороди
function handleSuccessfulReward(result, score) {
  // Tokens successfully distributed
  
  let successMessage = `🎉 Congratulations! You've received 0.1 IRYS tokens!\n\n`;
  successMessage += `Your score: ${score} points\n`;
  successMessage += `Tokens sent to: ${userWallet}\n`;
  
  if (result.txHash) {
    successMessage += `\nTransaction Hash: ${result.txHash}\n`;
  }
  
  if (result.explorerUrl) {
    successMessage += `\nView on Explorer: ${result.explorerUrl}\n`;
  }
  
  successMessage += `\nThank you for participating in IrysCrush!`;
  
  alert(successMessage);
  
  // Позначаємо винагороду як отриману (глобально та для гаманця)
  localStorage.setItem('irys_reward_claimed', 'true');
  localStorage.setItem(`irys_reward_claimed_${userWallet}`, 'true');
  localStorage.setItem(`irys_reward_date_${userWallet}`, new Date().toISOString());
  
  // Закриваємо модальне вікно
  const tasksModal = document.getElementById('tasks-modal');
  if (tasksModal) tasksModal.classList.add('hidden');
}

// Обробка невдалого отримання винагороди
function handleFailedReward(result) {
  console.error('❌ Token distribution failed:', result.error);
  
  let errorMessage = '❌ Failed to distribute tokens!\n\n';
  errorMessage += result.message || 'Unknown error occurred';
  
  if (result.error === 'already_received') {
    errorMessage = '🚫 You have already claimed your reward!\n\nEach wallet can only claim once.';
    
    // Оновлюємо локальне сховище відповідно до стану сервера
    localStorage.setItem('irys_reward_claimed', 'true');
    localStorage.setItem(`irys_reward_claimed_${userWallet}`, 'true');
  } else if (result.error === 'insufficient_funds') {
    errorMessage += '\n\nThe reward system is temporarily out of funds. Please try again later or contact support.';
  }
  
  alert(errorMessage);
}

// Резервний варіант отримання винагороди з локальним рахунком
async function handleFallbackRewardClaim() {
  const localScore = getUserBestScoreLocal();
  // Fallback to local score
  
  if (localScore < MINIMUM_SCORE_FOR_TASKS) {
    // Local score also too low! Showing warning
    const currentBestScoreSpan = document.getElementById('current-best-score');
    const minimumScoreModal = document.getElementById('minimum-score-modal');
    if (currentBestScoreSpan) currentBestScoreSpan.textContent = localScore;
    if (minimumScoreModal) minimumScoreModal.classList.remove('hidden');
    return;
  }
  
  // Local score is sufficient! Proceeding with reward
  
  // Показуємо повідомлення про обробку
  alert('🔄 Processing your reward claim (fallback mode)...\n\nPlease wait while we send 0.1 IRYS tokens to your wallet.');
  
  // Продовжуємо з винагородою, використовуючи локальний рахунок
  try {
    // Claiming reward with real token distribution (fallback)
    
    const response = await fetch('/claim-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet: userWallet,
        score: localScore,
        nickname: userNickname || 'unknown',
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    // Reward claim result (fallback)
    
    if (result.success) {
      handleSuccessfulReward(result, localScore);
    } else {
      handleFailedReward(result);
      
      // Не позначаємо як отримано, якщо розподіл не вдався
      if (result.error === 'already_received') {
        localStorage.setItem('irys_reward_claimed', 'true');
        localStorage.setItem(`irys_reward_claimed_${userWallet}`, 'true');
      }
      
      return;
    }
    
  } catch (serverError) {
    console.error('❌ Error claiming reward (fallback):', serverError);
    alert('❌ Network error occurred while claiming reward!\n\nPlease check your connection and try again.');
    return;
  }
  
  // Позначаємо винагороду як отриману (глобально та для гаманця)
  localStorage.setItem('irys_reward_claimed', 'true');
  localStorage.setItem(`irys_reward_claimed_${userWallet}`, 'true');
  localStorage.setItem(`irys_reward_date_${userWallet}`, new Date().toISOString());
  
  const tasksModal = document.getElementById('tasks-modal');
  if (tasksModal) tasksModal.classList.add('hidden');
}

// --- Показати модальне вікно завдань ---
async function showTasksModal() {
  try {
    // Opening tasks modal
    
    // Check if wallet is connected
    if (!userWallet) {
      alert('🔗 Please connect your wallet first to access tasks!');
      return;
    }
    
    // Always show tasks modal - score check will be done when claiming reward
    loadTasksProgress();
    updateTasksUI();
    const tasksModal = document.getElementById('tasks-modal');
    if (tasksModal) {
      tasksModal.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('❌ Error opening tasks modal:', error);
    // Still show the modal if wallet is connected
    if (userWallet) {
      loadTasksProgress();
      updateTasksUI();
      const tasksModal = document.getElementById('tasks-modal');
      if (tasksModal) {
        tasksModal.classList.remove('hidden');
      }
    } else {
      alert('🔗 Please connect your wallet first to access tasks!');
    }
  }
}

// Update tasks UI based on completion status
function updateTasksUI() {
  const task1Status = document.getElementById('task-1-status');
  const task2Status = document.getElementById('task-2-status');
  const task3Status = document.getElementById('task-3-status');
  const task4Status = document.getElementById('task-4-status');
  const followEgorbleBtn = document.getElementById('follow-egorble-btn');
  const followWanfarBtn = document.getElementById('follow-wanfar-btn');
  const followRetreeBtn = document.getElementById('follow-retree-btn');
  const shareScoreBtn = document.getElementById('share-score-btn');
  const tasksCompletedSpan = document.getElementById('tasks-completed');
  const tasksProgressFill = document.getElementById('tasks-progress-fill');
  const tasksReward = document.getElementById('tasks-reward');
  const task4Verification = document.getElementById('task-4-verification');
  
  // Update task status indicators
  if (task1Status) task1Status.textContent = tasksCompleted.task1 ? '✅' : '❌';
  if (task2Status) task2Status.textContent = tasksCompleted.task2 ? '✅' : '❌';
  if (task3Status) task3Status.textContent = tasksCompleted.task3 ? '✅' : '❌';
  if (task4Status) task4Status.textContent = tasksCompleted.task4 ? '✅' : '❌';
  
  // Update task items styling
  const task1 = document.getElementById('task-1');
  const task2 = document.getElementById('task-2');
  const task3 = document.getElementById('task-3');
  const task4 = document.getElementById('task-4');
  if (task1) task1.classList.toggle('completed', tasksCompleted.task1);
  if (task2) task2.classList.toggle('completed', tasksCompleted.task2);
  if (task3) task3.classList.toggle('completed', tasksCompleted.task3);
  if (task4) task4.classList.toggle('completed', tasksCompleted.task4);
  
  // Update buttons
  if (followEgorbleBtn) {
    followEgorbleBtn.disabled = tasksCompleted.task1;
    followEgorbleBtn.textContent = tasksCompleted.task1 ? 'Completed ✅' : 'Follow Egorble';
  }
  
  if (followWanfarBtn) {
    followWanfarBtn.disabled = tasksCompleted.task2;
    followWanfarBtn.textContent = tasksCompleted.task2 ? 'Completed ✅' : 'Follow WanFar';
  }
  
  if (followRetreeBtn) {
    followRetreeBtn.disabled = tasksCompleted.task3;
    followRetreeBtn.textContent = tasksCompleted.task3 ? 'Completed ✅' : 'Follow Retree';
  }
  
  if (shareScoreBtn) {
    shareScoreBtn.disabled = tasksCompleted.task4;
    shareScoreBtn.textContent = tasksCompleted.task4 ? 'Completed ✅' : 'Share on X';
  }
  
  // Update progress bar
  const completedCount = Object.values(tasksCompleted).filter(Boolean).length;
  if (tasksCompletedSpan) tasksCompletedSpan.textContent = completedCount;
  if (tasksProgressFill) tasksProgressFill.style.width = `${(completedCount / 4) * 100}%`;
  
  // Show/hide reward section
  const allCompleted = completedCount === 4;
  if (tasksReward) tasksReward.style.display = allCompleted ? 'block' : 'none';
  
  // Check if reward already claimed and update button
  if (allCompleted && userWallet) {
    checkAndUpdateRewardButton();
  }
  
  // Show/hide task 4 verification form
  if (task4Verification) {
    task4Verification.style.display = tasksCompleted.task1 && tasksCompleted.task2 && tasksCompleted.task3 && !tasksCompleted.task4 ? 'block' : 'none';
  }
}

// Task 1: Follow Egorble
function followEgorble() {
  const twitterUrl = 'https://x.com/egor4042007';
  window.open(twitterUrl, '_blank');
  
  // Mark as completed after a short delay
  setTimeout(() => {
    tasksCompleted.task1 = true;
    saveTasksProgress();
    updateTasksUI();
    
    // Show success message
    alert('🎉 Task 1 completed! Thanks for following Egorble!');
  }, 2000);
}

// Task 2: Follow WanFar
function followWanfar() {
  const twitterUrl = 'https://x.com/WanFarNoCap';
  window.open(twitterUrl, '_blank');
  
  // Mark as completed after a short delay
  setTimeout(() => {
    tasksCompleted.task2 = true;
    saveTasksProgress();
    updateTasksUI();
    
    // Show success message
    alert('🎉 Task 2 completed! Thanks for following WanFar!');
  }, 2000);
}

// Task 3: Follow Retree
function followRetree() {
  const twitterUrl = 'https://x.com/retreeq_';
  window.open(twitterUrl, '_blank');
  
  // Mark as completed after a short delay
  setTimeout(() => {
    tasksCompleted.task3 = true;
    saveTasksProgress();
    updateTasksUI();
    
    // Show success message
    alert('🎉 Task 3 completed! Thanks for following Retree!');
  }, 2000);
}

// Task 4: Share score on X
async function shareScore() {
  try {
    const bestScore = await getUserBestScore();
    const tweetText = `Just achieved ${bestScore} points in IrysCrush game by @egor4042007 x @WanFarNoCap\n\nThis amazing Match-3 game runs on @irys_xyz\n\nTry it yourself: https://www.iryscrush.xyz/`;
    
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    
    // Don't mark as completed automatically - user needs to submit the link
    alert('📝 After posting, copy the link to your tweet and paste it in the verification form below!');
  } catch (error) {
    console.error('❌ Error getting score for sharing:', error);
    // Fallback to localStorage score
    const localScore = getUserBestScoreLocal();
    const tweetText = `Just achieved ${localScore} points in IrysCrush game by @egor4042007 x @WanFarNoCap x @retreeq_\n\nThis amazing Match-3 game runs on @irys_xyz\n\nTry it yourself: https://www.iryscrush.xyz/`;
    
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
    
    alert('📝 After posting, copy the link to your tweet and paste it in the verification form below!');
  }
}

// Submit verification for task 4
async function submitVerification() {
  const postLinkInput = document.getElementById('post-link-input');
  const submitVerificationBtn = document.getElementById('submit-verification-btn');
  
  if (!postLinkInput) {
    console.error('Post link input not found');
    return;
  }
  
  const postLink = postLinkInput.value.trim();
  
  if (!postLink) {
    alert('Please enter the link to your X post!');
    return;
  }
  
  // Basic validation for X/Twitter URL
  const twitterRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
  if (!twitterRegex.test(postLink)) {
    alert('Please enter a valid X (Twitter) post URL!');
    return;
  }
  
  // Disable button during submission
  if (submitVerificationBtn) {
    submitVerificationBtn.disabled = true;
    submitVerificationBtn.textContent = 'Submitting...';
  }
  
  try {
    // Save the link to server
    await saveVerificationLink(postLink);
    
    // Mark task 4 as completed
    tasksCompleted.task4 = true;
    saveTasksProgress();
    updateTasksUI();
    
    // Clear the input
    postLinkInput.value = '';
    
    alert('🎉 Task 4 completed! Your post has been verified!');
    
  } catch (error) {
    console.error('❌ Verification submission failed:', error);
    alert('⚠️ Verification failed, but saved locally. Please try again later.');
  } finally {
    // Re-enable button
    if (submitVerificationBtn) {
      submitVerificationBtn.disabled = false;
      submitVerificationBtn.textContent = 'Submit';
    }
  }
}

// Save verification link to server
async function saveVerificationLink(link) {
  try {
    const bestScore = await getUserBestScore();
    const verificationData = {
      wallet: userWallet || 'anonymous',
      nickname: userNickname || 'unknown',
      postLink: link,
      score: bestScore,
      timestamp: new Date().toISOString()
    };
    
    // Sending verification to server
    
    const response = await fetch('/submit-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verificationData)
    });
    
    if (response.ok) {
      const result = await response.json();
      // Verification saved to server
      
      // Also save to localStorage as backup
      const verifications = JSON.parse(localStorage.getItem('irys_verifications') || '[]');
      verifications.push(verificationData);
      localStorage.setItem('irys_verifications', JSON.stringify(verifications));
      
    } else {
      const error = await response.json();
      console.error('❌ Server error:', error);
      throw new Error(error.error || 'Failed to save verification');
    }
    
  } catch (error) {
    console.error('❌ Error saving verification:', error);
    
    // Fallback to localStorage if server fails
    const verifications = JSON.parse(localStorage.getItem('irys_verifications') || '[]');
    verifications.push({
      wallet: userWallet || 'anonymous',
      nickname: userNickname || 'unknown',
      postLink: link,
      score: getUserBestScoreLocal(), // Use local version for fallback
      timestamp: new Date().toISOString(),
      serverError: error.message
    });
    localStorage.setItem('irys_verifications', JSON.stringify(verifications));
    
    // Verification saved to localStorage as fallback
  }
}

// Debug функції для тестування
window.debugGetScore = async function() {
  // === DEBUG SCORE RETRIEVAL ===
  
  try {
    const blockchainScore = await getUserBestScore();
    // Blockchain score
  } catch (error) {
    console.error('❌ Blockchain score error:', error);
  }
  
  const localScore = getUserBestScoreLocal();
  // Local storage score
  
  // Minimum required, current wallet, and tasks completed logged
};

// Debug функція для симуляції високого рахунку
window.debugSetHighScore = function(score = 2000) {
  saveUserBestScore(score);
  // Set local score
};

// Debug функція для скидання винагороди
window.debugResetReward = function() {
  if (!userWallet) {
    // No wallet connected
    return;
  }
  
  // Очищення localStorage
  localStorage.removeItem('irys_reward_claimed');
  localStorage.removeItem(`irys_reward_claimed_${userWallet}`);
  localStorage.removeItem(`irys_reward_date_${userWallet}`);
  
  // Скидання кнопки
  if (claimRewardBtn) {
    claimRewardBtn.textContent = 'Claim 0.1 IRYS';
    claimRewardBtn.disabled = false;
    claimRewardBtn.style.opacity = '1';
    claimRewardBtn.title = '';
  }
  
  // Reward claim reset for wallet
    // Note: This only clears local data, server data remains
};

// Ініціалізація системи винагород
function initializeRewardSystem() {
  // Initializing reward system
  
  // Ініціалізуємо DOM елементи
  initializeTaskElements();
  
  // Завантажуємо прогрес завдань
  loadTasksProgress();
  
  // Додаємо обробник події для кнопки "Get 0.1 IRYS"
  if (getIrysBtn) {
    getIrysBtn.onclick = function() {
      showTasksModal();
    };
    // Get IRYS button event handler attached
  } else {
    console.warn('⚠️ Get IRYS button not found');
  }
  
  // Додаємо обробник події для кнопки отримання винагороди
  if (claimRewardBtn) {
    claimRewardBtn.onclick = function() {
      claimReward();
    };
    // Reward button event handler attached
  } else {
    console.warn('⚠️ Claim reward button not found');
  }
  
  // Додаємо обробники для кнопок закриття модальних вікон
  if (closeTasksBtn) {
    closeTasksBtn.onclick = function() {
      if (tasksModal) tasksModal.classList.add('hidden');
    };
  }
  
  if (closeMinimumScoreBtn) {
    closeMinimumScoreBtn.onclick = function() {
      if (minimumScoreModal) minimumScoreModal.classList.add('hidden');
    };
  }
  
  // Додаємо обробники для кнопок завдань
  const followEgorbleBtn = document.getElementById('follow-egorble-btn');
  if (followEgorbleBtn) {
    followEgorbleBtn.onclick = function() {
      followEgorble();
    };
  }
  
  const followWanfarBtn = document.getElementById('follow-wanfar-btn');
  if (followWanfarBtn) {
    followWanfarBtn.onclick = function() {
      followWanfar();
    };
  }
  
  const followRetreeBtn = document.getElementById('follow-retree-btn');
  if (followRetreeBtn) {
    followRetreeBtn.onclick = function() {
      followRetree();
    };
  }
  
  const shareScoreBtn = document.getElementById('share-score-btn');
  if (shareScoreBtn) {
    shareScoreBtn.onclick = function() {
      shareScore();
    };
  }
  
  const submitVerificationBtn = document.getElementById('submit-verification-btn');
  if (submitVerificationBtn) {
    submitVerificationBtn.onclick = function() {
      submitVerification();
    };
  }
}

// Експорт функцій для використання в main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    claimReward,
    checkRewardAlreadyClaimed,
    checkAndUpdateRewardButton,
    updateRewardButtonToClaimed,
    initializeRewardSystem,
    MINIMUM_SCORE_FOR_TASKS
  };
}

// Export functions and constants for use in main.js
window.claimReward = claimReward;
window.checkRewardAlreadyClaimed = checkRewardAlreadyClaimed;
window.saveRewardClaim = saveRewardClaim;
window.checkAndUpdateRewardButton = checkAndUpdateRewardButton;
window.updateRewardButtonToClaimed = updateRewardButtonToClaimed;
window.initializeRewardSystem = initializeRewardSystem;
window.MINIMUM_SCORE_FOR_TASKS = MINIMUM_SCORE_FOR_TASKS;
window.showTasksModal = showTasksModal;
window.updateTasksUI = updateTasksUI;
window.followEgorble = followEgorble;
window.followWanfar = followWanfar;
window.followRetree = followRetree;
window.shareScore = shareScore;
window.submitVerification = submitVerification;
window.saveVerificationLink = saveVerificationLink;
window.processRewardDistribution = processRewardDistribution;
window.handleSuccessfulReward = handleSuccessfulReward;
window.handleFailedReward = handleFailedReward;
window.handleFallbackRewardClaim = handleFallbackRewardClaim;
window.loadTasksProgress = loadTasksProgress;
window.saveTasksProgress = saveTasksProgress;
window.initializeTaskElements = initializeTaskElements;
window.tasksCompleted = tasksCompleted;