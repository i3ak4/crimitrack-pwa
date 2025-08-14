// CrimiTrack UI Fantaisie - Micro-interactions & Animations
class UIFantaisie {
  constructor() {
    this.init();
  }

  init() {
    this.setupRippleEffects();
    this.setupCardAnimations();
    this.setupSkeletonScreens();
    this.initConfetti();
    this.enhanceTransitions();
  }

  // Effet Ripple sur tous les boutons
  setupRippleEffects() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('button, .btn, .tab-btn, .btn-icon');
      if (!button) return;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // Animations des cartes
  setupCardAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('card-visible');
          }, index * 50);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.expertise-card').forEach(card => {
      card.classList.add('card-animate');
      observer.observe(card);
    });
  }

  // Skeleton Screens
  showSkeleton(container) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-container';
    skeleton.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-medium"></div>
        <div class="skeleton-line skeleton-long"></div>
      </div>
    `.repeat(3);
    
    container.innerHTML = '';
    container.appendChild(skeleton);
    
    return skeleton;
  }

  hideSkeleton(skeleton, content) {
    skeleton.classList.add('skeleton-fade-out');
    setTimeout(() => {
      skeleton.remove();
      if (content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        tempDiv.childNodes.forEach(child => {
          if (child.nodeType === 1) {
            child.classList.add('content-fade-in');
          }
        });
        skeleton.parentElement.innerHTML = tempDiv.innerHTML;
      }
    }, 300);
  }

  // Confettis pour célébration
  initConfetti() {
    window.celebrateSuccess = () => {
      const colors = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
      const confettiCount = 30;
      
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = Math.random() * 2 + 3 + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
      }
    };
  }

  // Amélioration des transitions entre onglets
  enhanceTransitions() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        // Animation de l'icône
        const icon = this.querySelector('svg');
        if (icon) {
          icon.style.animation = 'iconBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
          setTimeout(() => icon.style.animation = '', 400);
        }
        
        // Animation du contenu
        const targetPane = document.getElementById(this.dataset.tab);
        if (targetPane) {
          targetPane.style.animation = 'slideInTab 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });
    });
  }

  // Loading Overlay élégant
  showLoadingOverlay(element) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
    `;
    element.style.position = 'relative';
    element.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('loading-visible'), 10);
    return overlay;
  }

  hideLoadingOverlay(overlay) {
    overlay.classList.remove('loading-visible');
    setTimeout(() => overlay.remove(), 300);
  }

  // Toast notifications élégantes
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </div>
      <div class="toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    
    // Auto-hide
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Célébration si succès
    if (type === 'success') {
      window.celebrateSuccess();
    }
  }
}

// API Globale
window.uiFantaisie = new UIFantaisie();

// Fonctions utilitaires globales
window.showSuccessToast = (message) => window.uiFantaisie.showToast(message, 'success');
window.showErrorToast = (message) => window.uiFantaisie.showToast(message, 'error');
window.showInfoToast = (message) => window.uiFantaisie.showToast(message, 'info');
window.showSkeleton = (container) => window.uiFantaisie.showSkeleton(container);
window.hideSkeleton = (skeleton, content) => window.uiFantaisie.hideSkeleton(skeleton, content);
window.showLoadingOverlay = (element) => window.uiFantaisie.showLoadingOverlay(element);
window.hideLoadingOverlay = (overlay) => window.uiFantaisie.hideLoadingOverlay(overlay);

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  console.log('✨ UI Fantaisie activé - CrimiTrack Premium Experience');
});