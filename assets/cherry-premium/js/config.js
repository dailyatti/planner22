/**
 * Cherry Planner Premium - Configuration
 * Central configuration for premium features
 */

export const SETTINGS_DEFAULT = {
  mood: {
    negativeThreshold: 7,            // >=7 counts as negative (on 0-10 scale)
    consecutiveDaysTrigger: 2,       // consecutive negative days to trigger auto motivation
    dailyAutoQuote: true,            // enable daily auto quotes for negative peaks
    maxAutoQuotesPerDay: 1,          // maximum auto quotes per day
    balanceIndexThreshold: -0.3      // balance index threshold for concern
  },
  tips: { 
    showOnNegative: true,            // show tips when negative mood detected
    maxTipsPerSession: 3             // max tips shown in one session
  },
  chart: {
    animate: true,                   // enable chart animations
    type: "radar",                   // radar or line chart type
    autoScrollToChart: false,        // NEVER auto-scroll to chart
    updateDebounce: 150,             // debounce chart updates (ms)
    colors: {
      positive: '#10b981',          // green for positive moods
      negative: '#ef4444',          // red for negative moods
      neutral: '#6b7280'            // gray for neutral
    }
  },
  export: { 
    pdf: true,                       // enable PDF export
    csv: true,                       // enable CSV export
    includeCharts: true              // include charts in exports
  },
  motivation: {
    cooldownMinutes: 60,             // cooldown between auto motivations
    preferQuotes: true,              // prefer quotes over psalms
    showTipsWithQuotes: true         // always show tips with motivation
  },
  storage: {
    namespace: 'cherry',             // localStorage namespace
    cacheTimeout: 600000,            // cache timeout (10 minutes)
    autoSaveDebounce: 300            // auto-save debounce (ms)
  }
};

/**
 * Mood configurations
 */
export const MOOD_CONFIG = {
  // Positive moods (higher is better)
  positive: ['happy', 'calm', 'loved'],
  
  // Negative moods (higher is worse)  
  negative: ['sad', 'tired', 'frustrated'],
  
  // Mood mappings to emojis
  emojiMap: {
    '😊': 'happy',
    '😌': 'calm', 
    '🥰': 'loved',
    '😔': 'sad',
    '😴': 'tired',
    '😤': 'frustrated',
    '🙏': 'grateful'
  },
  
  // Reverse mapping
  keyMap: {
    'happy': '😊',
    'calm': '😌',
    'loved': '🥰', 
    'sad': '😔',
    'tired': '😴',
    'frustrated': '😤',
    'grateful': '🙏'
  }
};

/**
 * Chart.js configuration templates
 */
export const CHART_CONFIG = {
  radar: {
    type: 'radar',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12,
              family: "'Inter', sans-serif"
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.r}/10`;
            }
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            font: {
              size: 10
            }
          },
          grid: {
            color: 'rgba(214, 51, 132, 0.1)'
          },
          angleLines: {
            color: 'rgba(214, 51, 132, 0.1)'
          }
        }
      },
      animation: {
        duration: 300,
        easing: 'easeInOutCubic'
      }
    }
  },
  
  line: {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1
          }
        }
      },
      animation: {
        duration: 300
      }
    }
  }
};

/**
 * Export templates
 */
export const EXPORT_CONFIG = {
  pdf: {
    format: 'a4',
    orientation: 'portrait',
    margin: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    header: {
      title: 'Cherry Planner - Mood Statistics',
      logo: '🍒'
    }
  },
  
  csv: {
    delimiter: ',',
    headers: [
      'Date',
      'Happy',
      'Calm', 
      'Loved',
      'Sad',
      'Tired',
      'Frustrated',
      'Grateful',
      'Balance Index',
      'Notes'
    ]
  }
};

/**
 * Feature flags
 */
export const FEATURES = {
  motivationSystem: true,
  moodCoach: true,
  statisticsExport: true,
  autoSave: true,
  chartAnimations: true,
  accessibilityFeatures: true
};

/**
 * Validation schemas
 */
export const VALIDATION = {
  moodValue: {
    min: 0,
    max: 10,
    type: 'integer'
  },
  
  dateRange: {
    maxDays: 365,  // maximum export range
    minDays: 1
  }
};

/**
 * Get current settings (merged with user preferences)
 */
export function getSettings() {
  try {
    const stored = localStorage.getItem('cherry::settings');
    const userSettings = stored ? JSON.parse(stored) : {};
    return mergeDeep(SETTINGS_DEFAULT, userSettings);
  } catch (error) {
    console.warn('Error loading settings, using defaults:', error);
    return { ...SETTINGS_DEFAULT };
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    const merged = mergeDeep(SETTINGS_DEFAULT, settings);
    localStorage.setItem('cherry::settings', JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Deep merge utility
 */
function mergeDeep(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}
