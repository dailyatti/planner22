/**
 * Cherry Planner Premium - Main Integration
 * Integrates premium features with existing Cherry Planner without breaking changes
 */

import { initStorage } from './storage.js';
import { getSettings } from './config.js';
import { initUI, toast } from './ui.js';
import { initMoodCoach } from './mood-coach.js';
import { initStats } from './stats.js';
import initAI from './ai.js';

let isInitialized = false;

/**
 * Initialize all premium features
 */
export async function initPremium() {
  if (isInitialized) {
    console.log('Premium features already initialized');
    return true;
  }
  
  console.log('🍒 Initializing Cherry Planner Premium...');
  
  try {
    // Initialize core systems first
    initStorage();
    initUI();
    
    // Initialize premium features (motivation system lives in main.js)
    await Promise.all([
      // initMotivation(), // Commented out - now handled in main.js
      initMoodCoach(),
      initStats(),
      initAI()
    ]);
    
    // Motivation handled centrally in main.js to avoid duplication
    
    // Setup daily mood check
    setupDailyMoodCheck();
    
    // Add premium styles
    loadPremiumStyles();
    
    // Expose global API
    setupGlobalAPI();
    
    isInitialized = true;
    
    console.log('✅ Cherry Planner Premium initialized successfully');
    toast('🍒 Premium features activated!', { type: 'success', duration: 2000 });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize premium features:', error);
    toast('Premium features failed to load', { type: 'error' });
    return false;
  }
}

/**
 * Load premium CSS styles
 */
function loadPremiumStyles() {
  // Check if already loaded
  if (document.getElementById('cherry-premium-styles')) return;
  
  const link = document.createElement('link');
  link.id = 'cherry-premium-styles';
  link.rel = 'stylesheet';
  link.href = new URL('../cherry-theme.css', import.meta.url).toString();
  link.onload = () => console.log('Premium styles loaded');
  link.onerror = () => console.warn('Failed to load premium styles');
  
  document.head.appendChild(link);
  
  // Add custom styles for premium components
  const style = document.createElement('style');
  style.id = 'cherry-premium-custom';
  style.textContent = `
    /* Premium component styles */
    .motivation-trigger {
      animation: cherry-pulse 3s infinite;
    }
    
    .stats-content {
      max-height: 70vh;
      overflow-y: auto;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .stat-card {
      background: var(--cherry-50);
      border: 1px solid var(--cherry-200);
      border-radius: var(--radius-lg);
      padding: 1rem;
      text-align: center;
    }
    
    .stat-card h4 {
      margin: 0 0 0.5rem 0;
      color: var(--cherry-600);
      font-size: 0.875rem;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .stat-value.positive { color: #10b981; }
    .stat-value.negative { color: #ef4444; }
    .stat-value.neutral { color: #f59e0b; }
    
    .mood-averages {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
      margin: 1rem 0;
    }
    
    .mood-stat {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: white;
      border: 1px solid var(--cherry-200);
      border-radius: var(--radius-md);
      font-size: 0.875rem;
    }
    
    .mood-name {
      font-weight: 600;
    }
    
    .mood-value {
      color: var(--cherry-600);
      font-weight: 700;
    }
    
    .balance-index {
      background: linear-gradient(135deg, var(--cherry-50), white);
      border: 1px solid var(--cherry-200);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    
    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .balance-header h3 {
      margin: 0;
      color: var(--cherry-600);
    }
    
    .balance-value {
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .balance-bar {
      position: relative;
      height: 8px;
      background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
      border-radius: 4px;
      margin: 1rem 0;
    }
    
    .balance-indicator {
      position: absolute;
      top: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      border: 2px solid var(--cherry-500);
      transform: translateX(-50%);
      transition: left 0.3s ease;
    }
    
    .balance-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .coaching-insights {
      background: linear-gradient(135deg, var(--cream-50), white);
      border: 1px solid var(--cherry-200);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      margin-top: 1.5rem;
    }
    
    .coaching-insights h3 {
      margin: 0 0 0.75rem 0;
      color: var(--cherry-600);
    }
    
    .coaching-insights p {
      margin: 0;
      line-height: 1.6;
    }
    
    .insights-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .insights-list li {
      background: var(--cherry-50);
      margin: 0.5rem 0;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      border-left: 3px solid var(--cherry-500);
    }
    
    .mood-coach-controls {
      display: flex;
      gap: 0.5rem;
    }
    
    .chart-container canvas {
      max-height: 300px;
    }
    
    .custom-date-range {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .export-controls {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    
    /* Mobile optimizations */
    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .mood-averages {
        grid-template-columns: 1fr;
      }
      
      .balance-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .export-controls {
        flex-direction: column;
      }
      
      .custom-date-range {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * Setup daily mood check for auto-motivation
 */
function setupDailyMoodCheck() {
  // Check for auto-motivation on page load
  setTimeout(() => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
    
    // maybeAutoShowQuote(todayStr); // Commented out - now handled in main.js
  }, 2000); // Delay to ensure everything is loaded
  
  // Setup daily check at midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    setInterval(() => {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(today.getDate()).padStart(2, '0');
      
      // maybeAutoShowQuote(todayStr); // Commented out - now handled in main.js
    }, 24 * 60 * 60 * 1000); // Check every 24 hours
  }, msUntilMidnight);
}

/**
 * Setup global API for premium features
 */
function setupGlobalAPI() {
  // Expose premium API on window object
  window.cherryPremium = {
    // Core systems
    initialized: () => isInitialized,
    
    // Motivation system
    motivation: {
      openModal: () => import('./motivation.js').then(m => m.openMotivationModal()),
      checkTriggers: (date) => import('./motivation.js').then(m => m.maybeAutoShowQuote(date)),
      reset: (date) => import('./motivation.js').then(m => m.resetDailyMotivation(date))
    },
    
    // Mood Coach
    moodCoach: {
      updateChart: () => import('./mood-coach.js').then(m => m.updateChart()),
      getStats: () => import('./mood-coach.js').then(m => m.getChartStats()),
      exportImage: () => import('./mood-coach.js').then(m => m.exportChartImage())
    },
    
    // Statistics
    stats: {
      openModal: () => import('./stats.js').then(m => m.openStatsModal()),
      compute: (range, start, end) => import('./stats.js').then(m => m.computeStats(range, start, end)),
      exportCSV: (stats) => import('./stats.js').then(m => m.exportCSV(stats))
    },
    
    // UI system
    ui: {
      toast: (msg, opts) => toast(msg, opts),
      confirm: (msg) => import('./ui.js').then(m => m.confirm(msg)),
      loading: {
        show: (msg) => import('./ui.js').then(m => m.showLoading(msg)),
        hide: () => import('./ui.js').then(m => m.hideLoading())
      }
    },
    
    // Storage system
    storage: {
      get: (domain, key, def) => import('./storage.js').then(m => m.get(domain, key, def)),
      set: (domain, key, val) => import('./storage.js').then(m => m.set(domain, key, val)),
      reset: (prefix) => import('./storage.js').then(m => m.reset(prefix))
    }
  };
  
  // Also expose UI utilities globally
  window.cherryUI = {
    toast,
    openModal: null, // Will be set by UI module
    closeModal: null, // Will be set by UI module
    confirm: null,   // Will be set by UI module
    alert: null      // Will be set by UI module
  };
}

/**
 * Handle integration with existing mood system
 */
export function integrateMoodSystem() {
  // Wait for existing mood system to be ready
  const checkInterval = setInterval(() => {
    const moodSliders = document.querySelectorAll('.mood-individual-range');
    if (moodSliders.length > 0) {
      clearInterval(checkInterval);
      
      // Enhanced integration
      moodSliders.forEach(slider => {
        slider.addEventListener('input', () => {
          // Update mood coach in real-time
          if (window.cherryPremium?.moodCoach?.updateChart) {
            window.cherryPremium.moodCoach.updateChart();
          }
        });
      });
      
      console.log('✅ Premium mood integration completed');
    }
  }, 100);
  
  // Timeout after 5 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 5000);
}

/**
 * Check if premium features should be enabled
 */
function shouldEnablePremium() {
  // Check for premium flag in localStorage or URL
  const urlParams = new URLSearchParams(window.location.search);
  const premiumParam = urlParams.get('premium');
  const premiumFlag = localStorage.getItem('cherry::premium::enabled');
  
  return premiumParam === 'true' || premiumFlag === 'true' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname.includes('cherry-planner') ||
         window.location.hostname.includes('github.io') ||
         window.location.hostname.includes('netlify.app') ||
         true; // ALWAYS ENABLE FOR TESTING - remove this line for production
}

/**
 * Auto-initialize premium features when DOM is ready
 */
function autoInit() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (shouldEnablePremium()) {
        setTimeout(() => {
          initPremium().then(() => {
            integrateMoodSystem();
          });
        }, 1000); // Delay to ensure base system is ready
      }
    });
  } else {
    if (shouldEnablePremium()) {
      setTimeout(() => {
        initPremium().then(() => {
          integrateMoodSystem();
        });
      }, 1000);
    }
  }
}

// Auto-initialize
autoInit();

// Export for manual initialization
export { integrateMoodSystem };
export default initPremium;
