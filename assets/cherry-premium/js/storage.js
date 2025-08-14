/**
 * Cherry Planner Premium - Storage System
 * Modular localStorage management with namespacing and migration
 */

import { SETTINGS_DEFAULT } from './config.js';

const NAMESPACE = 'cherry';
const STORAGE_VERSION = '1.0.0';

/**
 * Check if localStorage is available
 */
function hasLocalStorage() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    console.warn('localStorage is not available, using in-memory fallback');
    return false;
  }
}

/**
 * In-memory fallback storage
 */
const memoryStorage = new Map();

/**
 * Get namespaced key
 */
function getKey(domain, subkey = '') {
  return subkey ? `${NAMESPACE}::${domain}::${subkey}` : `${NAMESPACE}::${domain}`;
}

/**
 * Get value from storage with default fallback
 */
export function get(domain, subkey = '', defaultValue = null) {
  const key = getKey(domain, subkey);
  
  try {
    let value;
    if (hasLocalStorage()) {
      value = localStorage.getItem(key);
    } else {
      value = memoryStorage.get(key);
    }
    
    if (value === null || value === undefined) {
      return defaultValue;
    }
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error('Error reading from storage:', error);
    return defaultValue;
  }
}

/**
 * Set value in storage
 */
export function set(domain, subkey = '', value = null) {
  // Handle case where subkey is actually the value
  if (value === null && typeof subkey !== 'string') {
    value = subkey;
    subkey = '';
  }
  
  const key = getKey(domain, subkey);
  
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (hasLocalStorage()) {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage.set(key, serialized);
    }
    
    return true;
  } catch (error) {
    console.error('Error writing to storage:', error);
    return false;
  }
}

/**
 * Merge partial data with existing data
 */
export function merge(domain, subkey = '', partialData = null) {
  // Handle case where subkey is actually the data
  if (partialData === null && typeof subkey !== 'string') {
    partialData = subkey;
    subkey = '';
  }
  
  const existing = get(domain, subkey, {});
  const merged = { ...existing, ...partialData };
  return set(domain, subkey, merged);
}

/**
 * Remove value from storage
 */
export function remove(domain, subkey = '') {
  const key = getKey(domain, subkey);
  
  try {
    if (hasLocalStorage()) {
      localStorage.removeItem(key);
    } else {
      memoryStorage.delete(key);
    }
    return true;
  } catch (error) {
    console.error('Error removing from storage:', error);
    return false;
  }
}

/**
 * Reset all data for a namespace prefix
 */
export function reset(nsPrefix = '') {
  const prefix = nsPrefix ? `${NAMESPACE}::${nsPrefix}::` : `${NAMESPACE}::`;
  
  try {
    if (hasLocalStorage()) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      const keys = Array.from(memoryStorage.keys());
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          memoryStorage.delete(key);
        }
      });
    }
    return true;
  } catch (error) {
    console.error('Error resetting storage:', error);
    return false;
  }
}

/**
 * Get all keys matching a prefix
 */
export function getKeys(nsPrefix = '') {
  const prefix = nsPrefix ? `${NAMESPACE}::${nsPrefix}::` : `${NAMESPACE}::`;
  
  try {
    if (hasLocalStorage()) {
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.startsWith(prefix));
    } else {
      const keys = Array.from(memoryStorage.keys());
      return keys.filter(key => key.startsWith(prefix));
    }
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
}

/**
 * Specific getters and setters for common data types
 */

// Mood data for specific date
export function getMoodData(date) {
  return get('mood', date, {
    happy: 5, calm: 5, loved: 5,
    sad: 5, tired: 5, frustrated: 5, grateful: 5,
    notes: ''
  });
}

export function setMoodData(date, moodData) {
  return set('mood', date, moodData);
}

// Water data for specific date  
export function getWaterData(date) {
  return get('water', date, { goal: 8, drank: 0 });
}

export function setWaterData(date, waterData) {
  return set('water', date, waterData);
}

// Tasks data for specific date
export function getTasksData(date) {
  return get('tasks', date, []);
}

export function setTasksData(date, tasksData) {
  return set('tasks', date, tasksData);
}

// Cycle events log
export function getCycleLog() {
  return get('cycle', 'log', []);
}

export function setCycleLog(logData) {
  return set('cycle', 'log', logData);
}

export function addCycleEvent(date, type) {
  const log = getCycleLog();
  log.push({ date, type, timestamp: Date.now() });
  return setCycleLog(log);
}

// Settings
export function getSettings() {
  return get('settings', '', SETTINGS_DEFAULT);
}

export function saveSettings(settings) {
  return set('settings', '', settings);
}

// Motivation state for specific date
export function getMotivationState(date) {
  return get('motivation', date, { 
    autoShown: false, 
    lastQuoteId: null,
    lastTipId: null,
    count: 0 
  });
}

export function setMotivationState(date, state) {
  return set('motivation', date, state);
}

// Statistics cache
export function getStatsCache(rangeHash) {
  const cached = get('stats', `cache::${rangeHash}`);
  if (cached && cached.timestamp && (Date.now() - cached.timestamp < 600000)) {
    return cached.data;
  }
  return null;
}

export function setStatsCache(rangeHash, data) {
  return set('stats', `cache::${rangeHash}`, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Schema migration system
 */
export function migrateSchema() {
  const currentVersion = get('system', 'version', '0.0.0');
  
  if (currentVersion === STORAGE_VERSION) {
    return true; // No migration needed
  }
  
  console.log(`Migrating storage schema from ${currentVersion} to ${STORAGE_VERSION}`);
  
  try {
    // Migration from legacy single mood format to multi-mood format
    if (compareVersions(currentVersion, '1.0.0') < 0) {
      migrateLegacyMoodData();
    }
    
    // Update version
    set('system', 'version', STORAGE_VERSION);
    console.log('Schema migration completed successfully');
    return true;
  } catch (error) {
    console.error('Schema migration failed:', error);
    return false;
  }
}

/**
 * Migrate legacy mood data to new multi-mood format
 */
function migrateLegacyMoodData() {
  const keys = getKeys('mood');
  
  keys.forEach(key => {
    const dateMatch = key.match(/cherry::mood::(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return;
    
    const date = dateMatch[1];
    const legacyData = get('mood', date);
    
    // Check if already in new format
    if (legacyData && typeof legacyData.happy === 'number') {
      return; // Already migrated
    }
    
    // Convert legacy format
    if (legacyData && (legacyData.mood || legacyData.score)) {
      const newData = {
        happy: 5, calm: 5, loved: 5,
        sad: 5, tired: 5, frustrated: 5, grateful: 5,
        notes: legacyData.notes || ''
      };
      
      // Map legacy mood to new format
      const moodMap = {
        'happy': 'happy',
        'calm': 'calm', 
        'sad': 'sad',
        'tired': 'tired',
        'loved': 'loved',
        'frustrated': 'frustrated',
        'grateful': 'grateful'
      };
      
      if (legacyData.mood && moodMap[legacyData.mood]) {
        newData[moodMap[legacyData.mood]] = legacyData.score || 5;
      }
      
      setMoodData(date, newData);
      console.log(`Migrated mood data for ${date}`);
    }
  });
}

/**
 * Compare version strings
 */
function compareVersions(a, b) {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart < bPart) return -1;
    if (aPart > bPart) return 1;
  }
  
  return 0;
}

/**
 * Export all data for backup
 */
export function exportAllData() {
  const allData = {};
  
  try {
    if (hasLocalStorage()) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${NAMESPACE}::`)) {
          allData[key] = localStorage.getItem(key);
        }
      });
    } else {
      memoryStorage.forEach((value, key) => {
        if (key.startsWith(`${NAMESPACE}::`)) {
          allData[key] = value;
        }
      });
    }
    
    return {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      data: allData
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

/**
 * Import data from backup
 */
export function importAllData(backupData) {
  if (!backupData || !backupData.data) {
    console.error('Invalid backup data');
    return false;
  }
  
  try {
    Object.entries(backupData.data).forEach(([key, value]) => {
      if (key.startsWith(`${NAMESPACE}::`)) {
        if (hasLocalStorage()) {
          localStorage.setItem(key, value);
        } else {
          memoryStorage.set(key, value);
        }
      }
    });
    
    // Run migration if needed
    migrateSchema();
    
    console.log('Data import completed successfully');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

/**
 * Initialize storage system
 */
export function initStorage() {
  try {
    // Run schema migration
    migrateSchema();
    
    // Initialize default settings if not exist
    const settings = getSettings();
    if (!settings.mood) {
      saveSettings(SETTINGS_DEFAULT);
    }
    
    console.log('Storage system initialized successfully');
    return true;
  } catch (error) {
    console.error('Storage initialization failed:', error);
    return false;
  }
}
