// Developers System Module
// Функції для роботи з модальним вікном розробників

// --- Показати модальне вікно розробників ---
function showDevelopers() {
  // showDevelopers() called
  const developersModal = document.getElementById('developers-modal');
  // developersModal element checked
  
  if (developersModal) {
    developersModal.classList.remove('hidden');
    // Modal shown
    // Update URL without page reload
    if (window.location.pathname !== '/devs') {
      window.history.pushState({}, '', '/devs');
    }
  } else {
    console.error('❌ developersModal element not found!');
  }
}

// Global inline function for emergency fallback
function showDevelopersInline() {
  // Emergency inline function called
  const modal = document.getElementById('developers-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Modal shown via inline function
  } else {
    console.error('❌ Modal not found via inline function');
  }
}

// Initialize developers system
function initializeDevelopersSystem() {
  // Initializing developers system
  
  // Check if required elements exist
  const developersBtn = document.getElementById('developers-btn');
  const closeDevelopersBtn = document.getElementById('close-developers');
  const developersModal = document.getElementById('developers-modal');
  
  if (developersBtn) {
    developersBtn.onclick = function() {
      // Developers button clicked
      showDevelopers();
    };
  }
  
  if (closeDevelopersBtn) {
    closeDevelopersBtn.onclick = () => {
      if (developersModal) {
        developersModal.classList.add('hidden');
      }
      // Return to main page URL
      if (window.location.pathname === '/devs') {
        window.history.pushState({}, '', '/');
      }
    };
  }
  
  // Add click outside modal to close
  if (developersModal) {
    developersModal.addEventListener('click', (e) => {
      if (e.target === developersModal) {
        developersModal.classList.add('hidden');
        // Return to main page URL
        if (window.location.pathname === '/devs') {
          window.history.pushState({}, '', '/');
        }
      }
    });
  }
  
  // Add keyboard listener for closing developers modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && developersModal && !developersModal.classList.contains('hidden')) {
      developersModal.classList.add('hidden');
      // Return to main page URL
      if (window.location.pathname === '/devs') {
        window.history.pushState({}, '', '/');
      }
    }
  });
  
  // Event delegation for developers button
  document.body.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'developers-btn') {
      // Event delegation - developers button clicked
      e.preventDefault();
      showDevelopers();
    }
  });
  
  // Check if URL contains /devs and show developers modal
  if (window.location.pathname === '/devs') {
    // URL is /devs, showing developers modal
    showDevelopers();
  }
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    if (window.location.pathname === '/devs') {
      showDevelopers();
    } else {
      if (developersModal) {
        developersModal.classList.add('hidden');
      }
    }
  });
  
  // Additional check for button after DOM is loaded
  setTimeout(() => {
    const btn = document.getElementById('developers-btn');
    // Delayed check - developers button
    if (btn) {
      // Adding event listener to developers button
      btn.addEventListener('click', function() {
        // Developers button clicked (addEventListener)
        showDevelopers();
      });
    }
  }, 1000);
  
  // Developers system initialized
}

// --- Приховати модальне вікно розробників ---
function hideDevelopersModal() {
  const developersModal = document.getElementById('developers-modal');
  if (developersModal) {
    developersModal.classList.add('hidden');
    // Return to main page URL if needed
    if (window.location.pathname === '/devs') {
      window.history.pushState({}, '', '/');
    }
  }
}

// Export functions for use in main.js
window.showDevelopers = showDevelopers;
window.showDevelopersInline = showDevelopersInline;
window.initializeDevelopersSystem = initializeDevelopersSystem;
window.hideDevelopersModal = hideDevelopersModal;

// Експорт функцій для використання в main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showDevelopers,
    showDevelopersInline,
    initializeDevelopersSystem,
    hideDevelopersModal
  };
}