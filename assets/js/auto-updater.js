/**
 * Cherry Planner - Automatic Update System
 * Checks for new versions and prompts users to update
 */

const AUTO_UPDATE_CONFIG = {
  VERSION: '3.0.0', // Current version
  VERSION_CHECK_URL: 'https://api.github.com/repos/dailyatti/planner22/releases/latest',
  CHECK_INTERVAL: 3600000, // Check every hour (in milliseconds)
  STORAGE_KEY: 'cherry_update_check',
  VERSION_KEY: 'cherry_current_version'
};

class AutoUpdater {
  constructor() {
    this.currentVersion = AUTO_UPDATE_CONFIG.VERSION;
    this.lastCheck = null;
    this.updateAvailable = false;
    this.init();
  }

  init() {
    // Check on page load
    this.checkForUpdates();
    
    // Set up periodic checks
    setInterval(() => this.checkForUpdates(), AUTO_UPDATE_CONFIG.CHECK_INTERVAL);
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
    
    // Check when coming online
    window.addEventListener('online', () => {
      this.checkForUpdates();
    });
    
    // Register service worker for caching
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
  }

  async checkForUpdates() {
    try {
      // Check if enough time has passed since last check
      const lastCheckTime = localStorage.getItem(AUTO_UPDATE_CONFIG.STORAGE_KEY);
      if (lastCheckTime) {
        const timeSinceLastCheck = Date.now() - parseInt(lastCheckTime);
        if (timeSinceLastCheck < 300000) { // Don't check more than once per 5 minutes
          return;
        }
      }
      
      // Store check time
      localStorage.setItem(AUTO_UPDATE_CONFIG.STORAGE_KEY, Date.now().toString());
      
      // Fetch latest version from GitHub
      const response = await fetch(AUTO_UPDATE_CONFIG.VERSION_CHECK_URL, {
        cache: 'no-cache',
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        console.log('Could not check for updates');
        return;
      }
      
      const data = await response.json();
      const latestVersion = data.tag_name ? data.tag_name.replace('v', '') : null;
      
      if (latestVersion && this.isNewerVersion(latestVersion, this.currentVersion)) {
        this.showUpdateNotification(latestVersion, data.body || '');
      }
      
    } catch (error) {
      console.log('Update check failed:', error);
    }
  }

  isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  showUpdateNotification(newVersion, releaseNotes) {
    // Check if already shown
    const shownVersion = sessionStorage.getItem('cherry_update_shown');
    if (shownVersion === newVersion) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">🎉</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 18px;">Új verzió elérhető!</h3>
          <p style="margin: 0 0 12px 0; opacity: 0.95; font-size: 14px;">
            Cherry Planner ${newVersion} verzió elérhető. 
            Az oldal automatikusan frissül.
          </p>
          <div style="display: flex; gap: 10px;">
            <button id="update-now" style="
              background: white;
              color: #667eea;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
            ">Frissítés most</button>
            <button id="update-later" style="
              background: rgba(255,255,255,0.2);
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
            ">Később</button>
          </div>
        </div>
        <button id="update-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          opacity: 0.8;
        ">×</button>
      </div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Mark as shown
    sessionStorage.setItem('cherry_update_shown', newVersion);
    
    // Add event listeners
    document.getElementById('update-now').addEventListener('click', () => {
      this.performUpdate();
    });
    
    document.getElementById('update-later').addEventListener('click', () => {
      notification.remove();
      // Auto-update in 30 seconds
      setTimeout(() => this.performUpdate(), 30000);
    });
    
    document.getElementById('update-close').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-update after 10 seconds if no action
    setTimeout(() => {
      if (document.getElementById('update-notification')) {
        this.performUpdate();
      }
    }, 10000);
  }

  async performUpdate() {
    // Show loading state
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 32px; margin-bottom: 10px;">🔄</div>
          <p style="margin: 0; font-size: 16px;">Frissítés folyamatban...</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Az adataid megmaradnak.</p>
        </div>
      `;
    }
    
    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Save current data
    this.saveCurrentState();
    
    // Force reload with cache bypass
    setTimeout(() => {
      window.location.reload(true);
    }, 1500);
  }

  saveCurrentState() {
    // Save a backup of current day's data
    const today = new Date().toISOString().split('T')[0];
    const backup = {
      version: this.currentVersion,
      timestamp: Date.now(),
      date: today
    };
    
    // Collect all cherry:: prefixed localStorage items
    const cherryData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cherry')) {
        cherryData[key] = localStorage.getItem(key);
      }
    }
    
    backup.data = cherryData;
    localStorage.setItem('cherry_backup_before_update', JSON.stringify(backup));
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            this.showUpdateNotification('New', 'Service worker updated');
          }
        });
      });
    } catch (error) {
      console.log('Service worker registration failed:', error);
    }
  }
}

// Initialize auto-updater
if (typeof window !== 'undefined') {
  window.cherryAutoUpdater = new AutoUpdater();
  
  // Expose manual check function
  window.checkForCherryUpdates = () => {
    localStorage.removeItem(AUTO_UPDATE_CONFIG.STORAGE_KEY);
    window.cherryAutoUpdater.checkForUpdates();
  };
}

export default AutoUpdater;
