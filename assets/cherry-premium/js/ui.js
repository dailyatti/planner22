/**
 * Cherry Planner Premium - UI System
 * Modular UI components (modals, toasts, focus management, accessibility)
 */

let activeModal = null;
let focusStack = [];
let toastQueue = [];
let toastTimeout = null;

/**
 * Initialize UI system
 */
export function initUI() {
  setupGlobalEventListeners();
  setupAccessibility();
  console.log('UI system initialized');
}

/**
 * Setup global event listeners
 */
function setupGlobalEventListeners() {
  // Global escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeModal) {
        closeModal();
      }
    }
  });
  
  // Click outside modal to close
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('cherry-modal-backdrop')) {
      closeModal();
    }
  });
}

/**
 * Setup accessibility features
 */
function setupAccessibility() {
  // Add focus visible indicators
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('using-keyboard');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('using-keyboard');
  });
}

/**
 * Modal Management
 */

/**
 * Open modal by ID or create dynamic modal
 */
export function openModal(idOrConfig, config = {}) {
  if (typeof idOrConfig === 'string') {
    // Open existing modal by ID
    const modal = document.getElementById(idOrConfig);
    if (!modal) {
      console.error(`Modal with ID "${idOrConfig}" not found`);
      return false;
    }
    showModal(modal);
  } else {
    // Create dynamic modal
    config = idOrConfig;
    const modal = createDynamicModal(config);
    showModal(modal);
  }
  
  return true;
}

/**
 * Create dynamic modal from configuration
 */
function createDynamicModal(config) {
  const modalId = config.id || `dynamic-modal-${Date.now()}`;
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'cherry-modal-backdrop';
  backdrop.id = `${modalId}-backdrop`;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'cherry-modal';
  modal.id = modalId;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', `${modalId}-title`);
  
  // Create header
  const header = document.createElement('div');
  header.className = 'cherry-modal-header';
  
  const title = document.createElement('h2');
  title.className = 'cherry-modal-title';
  title.id = `${modalId}-title`;
  title.textContent = config.title || 'Cherry Planner';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cherry-modal-close';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeModal);
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Create body
  const body = document.createElement('div');
  body.className = 'cherry-modal-body';
  
  if (config.content) {
    if (typeof config.content === 'string') {
      body.innerHTML = config.content;
    } else {
      body.appendChild(config.content);
    }
  }
  
  // Create footer if actions provided
  if (config.actions && config.actions.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'cherry-modal-footer';
    
    config.actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = action.primary ? 'btn-primary' : 'btn-ghost';
      btn.textContent = action.text;
      btn.addEventListener('click', () => {
        if (action.handler) {
          action.handler();
        }
        if (action.closeOnClick !== false) {
          closeModal();
        }
      });
      footer.appendChild(btn);
    });
    
    modal.appendChild(footer);
  }
  
  modal.appendChild(header);
  modal.appendChild(body);
  
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  return modal;
}

/**
 * Show modal with proper focus management
 */
function showModal(modal) {
  if (activeModal) {
    closeModal(); // Close any existing modal
  }
  
  const backdrop = modal.closest('.cherry-modal-backdrop') || modal.parentElement;
  
  // Store currently focused element
  focusStack.push(document.activeElement);
  
  // Show modal
  backdrop.classList.add('show');
  modal.classList.add('show');
  activeModal = modal;
  
  // Focus first focusable element in modal
  requestAnimationFrame(() => {
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      focusable.focus();
    }
  });
  
  // Setup focus trap
  setupFocusTrap(modal);
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

/**
 * Close active modal
 */
export function closeModal() {
  if (!activeModal) return;
  
  const backdrop = activeModal.closest('.cherry-modal-backdrop') || activeModal.parentElement;
  
  // Hide modal
  backdrop.classList.remove('show');
  activeModal.classList.remove('show');
  
  // Restore focus
  const previousFocus = focusStack.pop();
  if (previousFocus && previousFocus.focus) {
    previousFocus.focus();
  }
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Clean up dynamic modals
  setTimeout(() => {
    if (backdrop.id.includes('dynamic-modal')) {
      backdrop.remove();
    }
  }, 300);
  
  activeModal = null;
}

/**
 * Setup focus trap for modal
 */
function setupFocusTrap(modal) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  function handleTabKey(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  modal.addEventListener('keydown', handleTabKey);
  
  // Store handler for cleanup
  modal._focusTrapHandler = handleTabKey;
}

/**
 * Toast Management
 */

/**
 * Show toast notification
 */
export function toast(message, options = {}) {
  const config = {
    type: options.type || 'info', // success, info, warning, error
    duration: options.duration || 4000,
    icon: options.icon || getDefaultIcon(options.type || 'info'),
    action: options.action || null,
    ...options
  };
  
  // Create toast element
  const toastEl = createToastElement(message, config);
  
  // Add to queue
  toastQueue.push({ element: toastEl, config });
  
  // Process queue
  processToastQueue();
  
  return toastEl;
}

/**
 * Create toast element
 */
function createToastElement(message, config) {
  const toast = document.createElement('div');
  toast.className = `cherry-toast ${config.type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  
  // Icon
  if (config.icon) {
    const icon = document.createElement('span');
    icon.className = 'cherry-toast-icon';
    icon.textContent = config.icon;
    toast.appendChild(icon);
  }
  
  // Message
  const messageEl = document.createElement('span');
  messageEl.className = 'cherry-toast-message';
  messageEl.textContent = message;
  toast.appendChild(messageEl);
  
  // Action button
  if (config.action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'cherry-toast-action';
    actionBtn.textContent = config.action.text;
    actionBtn.addEventListener('click', () => {
      if (config.action.handler) {
        config.action.handler();
      }
      dismissToast(toast);
    });
    toast.appendChild(actionBtn);
  }
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cherry-toast-close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => dismissToast(toast));
  toast.appendChild(closeBtn);
  
  return toast;
}

/**
 * Process toast queue
 */
function processToastQueue() {
  if (toastQueue.length === 0 || toastTimeout) return;
  
  const { element: toast, config } = toastQueue.shift();
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Show toast
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto dismiss
  toastTimeout = setTimeout(() => {
    dismissToast(toast);
  }, config.duration);
}

/**
 * Dismiss toast
 */
function dismissToast(toast) {
  toast.classList.remove('show');
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
    
    // Clear timeout and process next in queue
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    
    // Process next toast
    if (toastQueue.length > 0) {
      setTimeout(() => processToastQueue(), 200);
    }
  }, 300);
}

/**
 * Get default icon for toast type
 */
function getDefaultIcon(type) {
  const icons = {
    success: '✅',
    info: '🍒',
    warning: '⚠️',
    error: '❌'
  };
  return icons[type] || '🍒';
}

/**
 * Utility Functions
 */

/**
 * Create confirm dialog
 */
export function confirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    openModal({
      title,
      content: `<p>${message}</p>`,
      actions: [
        {
          text: 'Cancel',
          handler: () => resolve(false)
        },
        {
          text: 'Confirm',
          primary: true,
          handler: () => resolve(true)
        }
      ]
    });
  });
}

/**
 * Create alert dialog
 */
export function alert(message, title = 'Alert') {
  return new Promise((resolve) => {
    openModal({
      title,
      content: `<p>${message}</p>`,
      actions: [
        {
          text: 'OK',
          primary: true,
          handler: () => resolve()
        }
      ]
    });
  });
}

/**
 * Show loading overlay
 */
export function showLoading(message = 'Loading...') {
  const existing = document.getElementById('cherry-loading');
  if (existing) return existing;
  
  const overlay = document.createElement('div');
  overlay.id = 'cherry-loading';
  overlay.className = 'cherry-modal-backdrop show';
  overlay.innerHTML = `
    <div class="cherry-modal show" style="max-width: 300px; text-align: center;">
      <div class="cherry-modal-body">
        <div class="cherry-pulse" style="font-size: 2rem; margin-bottom: 1rem;">🍒</div>
        <p>${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  
  return overlay;
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
  const loading = document.getElementById('cherry-loading');
  if (loading) {
    loading.remove();
    document.body.style.overflow = '';
  }
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format date for display
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * Get date range
 */
export function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
