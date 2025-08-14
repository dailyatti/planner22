/**
 * Cherry Planner Premium - Mood Coach
 * Real-time chart with Chart.js, balance index, and coaching insights
 */

import { getMoodData } from './storage.js';
import { getSettings, MOOD_CONFIG } from './config.js';
import { debounce, formatDate } from './ui.js';

let chart = null;
let chartElement = null;
let isInitialized = false;

/**
 * Initialize Mood Coach system
 */
export async function initMoodCoach() {
  try {
    // Load Chart.js from CDN if not already loaded
    if (typeof Chart === 'undefined') {
      await loadChartJS();
    }
    
    // Create chart container
    createChartContainer();
    
    // Initialize chart
    await initializeChart();
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    isInitialized = true;
    console.log('Mood Coach initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Mood Coach:', error);
    return false;
  }
}

/**
 * Load Chart.js from CDN
 */
async function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (typeof Chart !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

/**
 * Create chart container and add to page
 */
function createChartContainer() {
  // Check if container already exists
  let container = document.getElementById('mood-coach-container');
  if (container) return;
  
  // Create container
  container = document.createElement('article');
  container.id = 'mood-coach-container';
  container.className = 'card full cherry-card';
  container.setAttribute('aria-labelledby', 'h-mood-coach');
  
  container.innerHTML = `
    <div class="cherry-card-header">
      <h2 id="h-mood-coach" class="cherry-card-title">📊 Mood Coach</h2>
      <div class="mood-coach-controls">
        <button id="toggleChartType" class="btn-ghost" aria-label="Toggle chart type">
          <span id="chartTypeIcon">🕸️</span>
        </button>
      </div>
    </div>
    
    <div class="mood-coach-content">
      <!-- Chart Container -->
      <div class="chart-container" style="position: relative; height: 300px; margin-bottom: 1.5rem;">
        <canvas id="moodCoachChart" role="img" aria-label="Mood tracking chart"></canvas>
      </div>
      
      <!-- Balance Index -->
      <div class="balance-index">
        <div class="balance-header">
          <h3>Balance Index</h3>
          <span id="balanceValue" class="balance-value">0.0</span>
        </div>
        <div class="balance-bar">
          <div id="balanceIndicator" class="balance-indicator"></div>
        </div>
        <div class="balance-labels">
          <span>Needs Focus</span>
          <span>Balanced</span>
          <span>Thriving</span>
        </div>
      </div>
      
      <!-- Coaching Insights -->
      <div id="coachingInsights" class="coaching-insights">
        <h3>💡 Coaching Insights</h3>
        <p id="insightText">Track your mood to receive personalized insights.</p>
      </div>
    </div>
  `;
  
  // Add to page (bottom of main content)
  const mainContent = document.getElementById('plannerContent') || document.querySelector('main');
  if (mainContent) {
    mainContent.appendChild(container);
  } else {
    document.body.appendChild(container);
  }
  
  // Store reference to chart element
  chartElement = document.getElementById('moodCoachChart');
  
  // Setup chart type toggle
  setupChartTypeToggle();
}

/**
 * Initialize Chart.js chart
 */
async function initializeChart() {
  if (!chartElement) return;
  
  const settings = getSettings();
  const ctx = chartElement.getContext('2d');
  
  // Get initial data
  const chartData = getCurrentChartData();
  
  // Create chart configuration
  const config = createChartConfig(settings.chart.type, chartData);
  
  // Create chart
  chart = new Chart(ctx, config);
  
  // Update balance index and insights
  updateBalanceIndex(chartData);
  updateCoachingInsights(chartData);
}

/**
 * Create chart configuration
 */
function createChartConfig(type, data) {
  const settings = getSettings();
  
  if (type === 'radar') {
    return {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Positive Moods',
            data: data.positive,
            borderColor: settings.chart.colors.positive,
            backgroundColor: settings.chart.colors.positive + '20',
            borderWidth: 2,
            pointBackgroundColor: settings.chart.colors.positive,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          },
          {
            label: 'Negative Moods', 
            data: data.negative,
            borderColor: settings.chart.colors.negative,
            backgroundColor: settings.chart.colors.negative + '20',
            borderWidth: 2,
            pointBackgroundColor: settings.chart.colors.negative,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }
        ]
      },
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
                family: "'Inter', -apple-system, sans-serif"
              },
              usePointStyle: true
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
              font: { size: 10 },
              backdropColor: 'transparent'
            },
            grid: {
              color: 'rgba(214, 51, 132, 0.1)'
            },
            angleLines: {
              color: 'rgba(214, 51, 132, 0.1)'
            },
            pointLabels: {
              font: { size: 11, weight: 'bold' },
              color: '#666'
            }
          }
        },
        animation: settings.chart.animate ? {
          duration: 300,
          easing: 'easeInOutCubic'
        } : false
      }
    };
  } else {
    // Line chart
    return {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Mood Trends',
            data: data.combined,
            borderColor: settings.chart.colors.positive,
            backgroundColor: settings.chart.colors.positive + '10',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: settings.chart.colors.positive,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }
        ]
      },
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
            ticks: { stepSize: 1 }
          }
        },
        animation: settings.chart.animate ? {
          duration: 300
        } : false
      }
    };
  }
}

/**
 * Get current chart data from mood state
 */
function getCurrentChartData() {
  const todayDate = formatDate(new Date());
  const moodData = getCurrentMoodFromDOM();
  
  // Prepare data for charts
  const positiveMoods = ['happy', 'calm', 'loved', 'grateful'];
  const negativeMoods = ['sad', 'tired', 'frustrated'];
  
  const labels = [
    '😊 Happy', '😌 Calm', '🥰 Loved', '🙏 Grateful',
    '😔 Sad', '😴 Tired', '😤 Frustrated'
  ];
  
  const positive = [
    moodData.happy, moodData.calm, moodData.loved, moodData.grateful,
    0, 0, 0 // Pad for radar chart symmetry
  ];
  
  const negative = [
    0, 0, 0, 0, // Pad for radar chart symmetry  
    moodData.sad, moodData.tired, moodData.frustrated
  ];
  
  const combined = [
    moodData.happy, moodData.calm, moodData.loved, moodData.grateful,
    10 - moodData.sad, 10 - moodData.tired, 10 - moodData.frustrated
  ];
  
  return { labels, positive, negative, combined, raw: moodData };
}

/**
 * Get current mood data from DOM sliders
 */
function getCurrentMoodFromDOM() {
  const mood = {
    happy: 5, calm: 5, loved: 5, grateful: 5,
    sad: 5, tired: 5, frustrated: 5,
    notes: ''
  };
  
  // Map emojis to mood keys
  const emojiToKey = {
    '😊': 'happy',
    '😌': 'calm',
    '🥰': 'loved',
    '🙏': 'grateful',
    '😔': 'sad',
    '😴': 'tired',
    '😤': 'frustrated'
  };
  
  // Read values from sliders
  Object.entries(emojiToKey).forEach(([emoji, key]) => {
    const slider = document.querySelector(`[data-mood="${emoji}"]`);
    if (slider) {
      mood[key] = parseInt(slider.value, 10) || 5;
    }
  });
  
  return mood;
}

/**
 * Update chart with new data (real-time)
 */
export function updateChart() {
  if (!chart || !isInitialized) return;
  
  const chartData = getCurrentChartData();
  
  // Update chart data
  if (chart.config.type === 'radar') {
    chart.data.datasets[0].data = chartData.positive;
    chart.data.datasets[1].data = chartData.negative;
  } else {
    chart.data.datasets[0].data = chartData.combined;
  }
  
  // Update chart
  chart.update('none'); // No animation for real-time updates
  
  // Update balance index and insights
  updateBalanceIndex(chartData);
  updateCoachingInsights(chartData);
}

/**
 * Setup real-time updates
 */
function setupRealTimeUpdates() {
  const settings = getSettings();
  const debouncedUpdate = debounce(updateChart, settings.chart.updateDebounce);
  
  // Listen for mood slider changes
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('mood-individual-range')) {
      debouncedUpdate();
    }
  });
  
  // Listen for notes changes
  const notesField = document.getElementById('moodNotes');
  if (notesField) {
    notesField.addEventListener('input', debouncedUpdate);
  }
}

/**
 * Calculate and update balance index
 */
function updateBalanceIndex(chartData) {
  const mood = chartData.raw;
  
  // Calculate balance index: (avg(positive) - avg(negative)) / 10
  const positiveAvg = (mood.happy + mood.calm + mood.loved + mood.grateful) / 4;
  const negativeAvg = (mood.sad + mood.tired + mood.frustrated) / 3;
  const balanceIndex = (positiveAvg - negativeAvg) / 10;
  
  // Clamp to [-1, 1] range
  const clampedIndex = Math.max(-1, Math.min(1, balanceIndex));
  
  // Update UI
  const balanceValue = document.getElementById('balanceValue');
  const balanceIndicator = document.getElementById('balanceIndicator');
  
  if (balanceValue) {
    balanceValue.textContent = clampedIndex.toFixed(1);
    
    // Color based on balance
    if (clampedIndex >= 0.3) {
      balanceValue.style.color = '#10b981'; // Green - thriving
    } else if (clampedIndex >= -0.3) {
      balanceValue.style.color = '#f59e0b'; // Yellow - balanced
    } else {
      balanceValue.style.color = '#ef4444'; // Red - needs focus
    }
  }
  
  if (balanceIndicator) {
    // Position indicator on bar (0 = left, 1 = right)
    const position = (clampedIndex + 1) / 2; // Convert [-1,1] to [0,1]
    balanceIndicator.style.left = `${position * 100}%`;
    
    // Color indicator
    if (clampedIndex >= 0.3) {
      balanceIndicator.style.backgroundColor = '#10b981';
    } else if (clampedIndex >= -0.3) {
      balanceIndicator.style.backgroundColor = '#f59e0b';
    } else {
      balanceIndicator.style.backgroundColor = '#ef4444';
    }
  }
  
  return clampedIndex;
}

/**
 * Generate and update coaching insights
 */
function updateCoachingInsights(chartData) {
  const mood = chartData.raw;
  const insights = generateInsights(mood);
  
  const insightText = document.getElementById('insightText');
  if (insightText) {
    insightText.innerHTML = insights;
  }
}

/**
 * Generate coaching insights based on mood data
 */
function generateInsights(mood) {
  const insights = [];
  
  // Identify strongest positive and negative moods
  const positives = { happy: mood.happy, calm: mood.calm, loved: mood.loved, grateful: mood.grateful };
  const negatives = { sad: mood.sad, tired: mood.tired, frustrated: mood.frustrated };
  
  const strongestPositive = Object.entries(positives).reduce((a, b) => positives[a[0]] > positives[b[0]] ? a : b);
  const strongestNegative = Object.entries(negatives).reduce((a, b) => negatives[a[0]] > negatives[b[0]] ? a : b);
  
  // Positive reinforcement
  if (strongestPositive[1] >= 7) {
    const moodNames = { happy: 'boldogság', calm: 'nyugalom', loved: 'szeretet', grateful: 'hála' };
    insights.push(`✨ A ${moodNames[strongestPositive[0]]} erős ma - ez fantasztikus!`);
  }
  
  // Negative mood guidance
  if (strongestNegative[1] >= 7) {
    const suggestions = {
      sad: 'Próbálj meg beszélni valakivel, vagy írj le 3 pozitív dolgot.',
      tired: 'Ideje egy kis pihenésnek vagy friss levegőnek.',
      frustrated: 'Egy mély légzés vagy rövid séta segíthet lecsillapodni.'
    };
    
    insights.push(`🔄 A ${strongestNegative[0] === 'sad' ? 'szomorúság' : strongestNegative[0] === 'tired' ? 'fáradtság' : 'frusztráció'} magas. ${suggestions[strongestNegative[0]]}`);
  }
  
  // Balance insights
  const balanceIndex = updateBalanceIndex({ raw: mood });
  if (balanceIndex >= 0.3) {
    insights.push('🌟 Kiváló egyensúly! Folytasd így!');
  } else if (balanceIndex <= -0.3) {
    insights.push('💙 Ma egy kicsit nehezebb nap. Ez normális, holnap jobb lesz.');
  }
  
  // Specific recommendations
  const recommendations = generateRecommendations(mood);
  if (recommendations.length > 0) {
    insights.push('💡 Javasolt: ' + recommendations.join(', '));
  }
  
  return insights.length > 0 ? insights.join('<br><br>') : 'Folytasd a mood tracking-et a személyre szabott tanácsokért! 📊';
}

/**
 * Generate specific recommendations
 */
function generateRecommendations(mood) {
  const recommendations = [];
  
  if (mood.tired >= 7) recommendations.push('5-10 perc pihenés');
  if (mood.sad >= 6) recommendations.push('kapcsolat egy baráttal');
  if (mood.frustrated >= 6) recommendations.push('légzési gyakorlat');
  if (mood.happy <= 3) recommendations.push('kedvenc zenehallgatás');
  if (mood.calm <= 3) recommendations.push('természetszemlélet');
  if (mood.loved <= 4) recommendations.push('önsajnálat gyakorlása');
  if (mood.grateful <= 4) recommendations.push('hála napló írása');
  
  return recommendations.slice(0, 3); // Maximum 3 recommendations
}

/**
 * Setup chart type toggle
 */
function setupChartTypeToggle() {
  const toggleButton = document.getElementById('toggleChartType');
  const chartTypeIcon = document.getElementById('chartTypeIcon');
  
  if (!toggleButton || !chartTypeIcon) return;
  
  toggleButton.addEventListener('click', () => {
    const settings = getSettings();
    const newType = settings.chart.type === 'radar' ? 'line' : 'radar';
    
    // Update settings
    settings.chart.type = newType;
    // Note: In a full implementation, you'd save this to storage
    
    // Update icon
    chartTypeIcon.textContent = newType === 'radar' ? '📈' : '🕸️';
    
    // Recreate chart
    if (chart) {
      chart.destroy();
      initializeChart();
    }
  });
}

/**
 * Export chart as image
 */
export function exportChartImage() {
  if (!chart) return null;
  
  return chart.toBase64Image('image/png', 1.0);
}

/**
 * Get chart statistics for export
 */
export function getChartStats() {
  const chartData = getCurrentChartData();
  const mood = chartData.raw;
  const balanceIndex = (((mood.happy + mood.calm + mood.loved + mood.grateful) / 4) - 
                       ((mood.sad + mood.tired + mood.frustrated) / 3)) / 10;
  
  return {
    balanceIndex: Math.round(balanceIndex * 100) / 100,
    mood,
    insights: generateInsights(mood),
    chartType: chart?.config?.type || 'radar',
    timestamp: new Date().toISOString()
  };
}
