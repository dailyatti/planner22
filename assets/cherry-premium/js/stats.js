/**
 * Cherry Planner Premium - Statistics & Export
 * Comprehensive data analysis and export functionality (CSV/PDF)
 */

import { getMoodData, getWaterData, getStatsCache, setStatsCache } from './storage.js';
import { getSettings, EXPORT_CONFIG } from './config.js';
import { formatDate, getDateRange, showLoading, hideLoading, toast } from './ui.js';
import { getChartStats, exportChartImage } from './mood-coach.js';

/**
 * Initialize statistics system
 */
export function initStats() {
  createStatsInterface();
  console.log('Statistics system initialized');
}

/**
 * Create statistics interface
 */
function createStatsInterface() {
  // Check if interface already exists
  if (document.getElementById('stats-container')) return;
  
  // Create stats button in navigation
  addStatsButton();
}

/**
 * Add statistics button to navigation
 */
function addStatsButton() {
  const menu = document.getElementById('menu') || document.querySelector('.menu');
  if (!menu) return;
  
  const statsButton = document.createElement('button');
  statsButton.className = 'btn-ghost';
  statsButton.innerHTML = '📊 Statistics';
  statsButton.addEventListener('click', openStatsModal);
  
  menu.appendChild(statsButton);
}

/**
 * Open statistics modal
 */
export function openStatsModal() {
  const { openModal } = window.cherryUI || {};
  if (!openModal) {
    console.error('UI system not available');
    return;
  }
  
  const content = createStatsContent();
  
  openModal({
    title: '📊 Statistics & Export',
    content,
    actions: [
      {
        text: 'Close',
        primary: true,
        handler: () => {}
      }
    ]
  });
}

/**
 * Create statistics content
 */
function createStatsContent() {
  const container = document.createElement('div');
  container.className = 'stats-content';
  container.innerHTML = `
    <div class="stats-controls">
      <div class="date-range-selector">
        <label for="statsRange">Time Range:</label>
        <select id="statsRange">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="current-cycle">Current Cycle</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      <div id="customDateRange" class="custom-date-range" style="display: none;">
        <input type="date" id="startDate" />
        <span>to</span>
        <input type="date" id="endDate" />
      </div>
      
      <div class="export-controls">
        <button id="exportCSV" class="btn-ghost">📄 Export CSV</button>
        <button id="exportPDF" class="btn-primary">📋 Export PDF</button>
      </div>
    </div>
    
    <div id="statsResults" class="stats-results">
      <p>Select a time range to view statistics.</p>
    </div>
  `;
  
  // Setup event listeners
  setupStatsListeners(container);
  
  // Load initial stats
  setTimeout(() => calculateAndDisplayStats(container, 7), 100);
  
  return container;
}

/**
 * Setup statistics event listeners
 */
function setupStatsListeners(container) {
  const rangeSelector = container.querySelector('#statsRange');
  const customRange = container.querySelector('#customDateRange');
  const startDate = container.querySelector('#startDate');
  const endDate = container.querySelector('#endDate');
  const exportCSV = container.querySelector('#exportCSV');
  const exportPDF = container.querySelector('#exportPDF');
  
  // Range selector change
  rangeSelector.addEventListener('change', (e) => {
    const value = e.target.value;
    
    if (value === 'custom') {
      customRange.style.display = 'flex';
      // Set default dates
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      startDate.value = formatDate(weekAgo);
      endDate.value = formatDate(today);
    } else {
      customRange.style.display = 'none';
      calculateAndDisplayStats(container, value);
    }
  });
  
  // Custom date change
  [startDate, endDate].forEach(input => {
    input.addEventListener('change', () => {
      if (startDate.value && endDate.value) {
        calculateAndDisplayStats(container, 'custom', startDate.value, endDate.value);
      }
    });
  });
  
  // Export buttons
  exportCSV.addEventListener('click', () => handleExport(container, 'csv'));
  exportPDF.addEventListener('click', () => handleExport(container, 'pdf'));
}

/**
 * Calculate and display statistics
 */
async function calculateAndDisplayStats(container, range, startDate = null, endDate = null) {
  const resultsDiv = container.querySelector('#statsResults');
  resultsDiv.innerHTML = '<p>Calculating statistics...</p>';
  
  try {
    const stats = await computeStats(range, startDate, endDate);
    displayStats(resultsDiv, stats);
  } catch (error) {
    console.error('Error calculating stats:', error);
    resultsDiv.innerHTML = '<p style="color: red;">Error calculating statistics.</p>';
  }
}

/**
 * Compute comprehensive statistics
 */
export async function computeStats(range, startDate = null, endDate = null) {
  const dateRange = getDateRangeForStats(range, startDate, endDate);
  const rangeHash = hashRange(dateRange);
  
  // Check cache
  const cached = getStatsCache(rangeHash);
  if (cached) {
    return cached;
  }
  
  const stats = {
    dateRange: {
      start: dateRange[0],
      end: dateRange[dateRange.length - 1],
      days: dateRange.length
    },
    mood: await analyzeMoodData(dateRange),
    water: await analyzeWaterData(dateRange),
    balance: [],
    insights: []
  };
  
  // Calculate balance index for each day
  stats.balance = dateRange.map(date => {
    const mood = getMoodData(date);
    const positiveAvg = (mood.happy + mood.calm + mood.loved + mood.grateful) / 4;
    const negativeAvg = (mood.sad + mood.tired + mood.frustrated) / 3;
    return {
      date,
      index: (positiveAvg - negativeAvg) / 10
    };
  });
  
  // Generate insights
  stats.insights = generateStatsInsights(stats);
  
  // Cache results
  setStatsCache(rangeHash, stats);
  
  return stats;
}

/**
 * Analyze mood data over date range
 */
async function analyzeMoodData(dateRange) {
  const analysis = {
    averages: { happy: 0, calm: 0, loved: 0, grateful: 0, sad: 0, tired: 0, frustrated: 0 },
    trends: {},
    peaks: { highest: null, lowest: null },
    dailyData: []
  };
  
  let totalData = { happy: 0, calm: 0, loved: 0, grateful: 0, sad: 0, tired: 0, frustrated: 0 };
  let validDays = 0;
  
  // Collect daily data
  dateRange.forEach(date => {
    const mood = getMoodData(date);
    analysis.dailyData.push({ date, ...mood });
    
    // Accumulate for averages
    Object.keys(totalData).forEach(key => {
      totalData[key] += mood[key] || 0;
    });
    validDays++;
  });
  
  // Calculate averages
  if (validDays > 0) {
    Object.keys(analysis.averages).forEach(key => {
      analysis.averages[key] = Math.round((totalData[key] / validDays) * 100) / 100;
    });
  }
  
  // Calculate trends (simple linear regression)
  Object.keys(analysis.averages).forEach(key => {
    analysis.trends[key] = calculateTrend(analysis.dailyData.map(d => d[key]));
  });
  
  // Find peaks
  analysis.peaks = findMoodPeaks(analysis.dailyData);
  
  return analysis;
}

/**
 * Analyze water data over date range
 */
async function analyzeWaterData(dateRange) {
  const analysis = {
    averageGoal: 0,
    averageDrank: 0,
    completionRate: 0,
    bestDay: null,
    dailyData: []
  };
  
  let totalGoal = 0;
  let totalDrank = 0;
  let completedDays = 0;
  let validDays = 0;
  
  dateRange.forEach(date => {
    const water = getWaterData(date);
    analysis.dailyData.push({ date, ...water });
    
    totalGoal += water.goal || 8;
    totalDrank += water.drank || 0;
    
    if (water.drank >= water.goal) {
      completedDays++;
    }
    
    validDays++;
  });
  
  if (validDays > 0) {
    analysis.averageGoal = Math.round((totalGoal / validDays) * 100) / 100;
    analysis.averageDrank = Math.round((totalDrank / validDays) * 100) / 100;
    analysis.completionRate = Math.round((completedDays / validDays) * 100);
  }
  
  // Find best day
  analysis.bestDay = analysis.dailyData.reduce((best, day) => {
    const completion = day.goal > 0 ? day.drank / day.goal : 0;
    const bestCompletion = best.goal > 0 ? best.drank / best.goal : 0;
    return completion > bestCompletion ? day : best;
  }, analysis.dailyData[0] || { date: null, goal: 0, drank: 0 });
  
  return analysis;
}

/**
 * Calculate trend using simple linear regression
 */
function calculateTrend(values) {
  const n = values.length;
  if (n < 2) return 0;
  
  const x = values.map((_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return Math.round(slope * 1000) / 1000; // Round to 3 decimals
}

/**
 * Find mood peaks and lows
 */
function findMoodPeaks(dailyData) {
  if (dailyData.length === 0) return { highest: null, lowest: null };
  
  let highest = { date: null, mood: '', value: -1 };
  let lowest = { date: null, mood: '', value: 11 };
  
  dailyData.forEach(day => {
    Object.keys(day).forEach(key => {
      if (key === 'date' || key === 'notes') return;
      
      if (day[key] > highest.value) {
        highest = { date: day.date, mood: key, value: day[key] };
      }
      
      if (day[key] < lowest.value) {
        lowest = { date: day.date, mood: key, value: day[key] };
      }
    });
  });
  
  return { highest, lowest };
}

/**
 * Generate insights from statistics
 */
function generateStatsInsights(stats) {
  const insights = [];
  
  // Mood insights
  const avgBalance = stats.balance.reduce((sum, b) => sum + b.index, 0) / stats.balance.length;
  if (avgBalance > 0.2) {
    insights.push('🌟 Overall positive mood trend - keep it up!');
  } else if (avgBalance < -0.2) {
    insights.push('💙 Recent period shows some challenges - consider self-care activities.');
  } else {
    insights.push('⚖️ Balanced mood period with natural ups and downs.');
  }
  
  // Water insights
  if (stats.water.completionRate >= 80) {
    insights.push('💧 Excellent hydration habits! ' + stats.water.completionRate + '% goal completion.');
  } else if (stats.water.completionRate >= 60) {
    insights.push('💧 Good hydration progress. Consider setting reminders to reach ' + stats.water.averageGoal + ' glasses daily.');
  } else {
    insights.push('💧 Hydration could use improvement. Start with smaller goals and build the habit.');
  }
  
  // Trend insights
  const trendingUp = Object.entries(stats.mood.trends).filter(([key, trend]) => 
    ['happy', 'calm', 'loved', 'grateful'].includes(key) && trend > 0.1
  );
  
  const trendingDown = Object.entries(stats.mood.trends).filter(([key, trend]) => 
    ['sad', 'tired', 'frustrated'].includes(key) && trend > 0.1
  );
  
  if (trendingUp.length > 0) {
    insights.push('📈 Positive trends in: ' + trendingUp.map(([key]) => key).join(', '));
  }
  
  if (trendingDown.length > 0) {
    insights.push('📉 Watch for increasing: ' + trendingDown.map(([key]) => key).join(', '));
  }
  
  return insights;
}

/**
 * Display statistics in UI
 */
function displayStats(container, stats) {
  container.innerHTML = `
    <div class="stats-overview">
      <h3>📊 Overview (${stats.dateRange.days} days)</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Average Balance</h4>
          <div class="stat-value ${getBalanceClass(stats.balance.reduce((sum, b) => sum + b.index, 0) / stats.balance.length)}">
            ${Math.round((stats.balance.reduce((sum, b) => sum + b.index, 0) / stats.balance.length) * 100) / 100}
          </div>
        </div>
        <div class="stat-card">
          <h4>Water Goal Achievement</h4>
          <div class="stat-value">${stats.water.completionRate}%</div>
        </div>
        <div class="stat-card">
          <h4>Average Daily Water</h4>
          <div class="stat-value">${stats.water.averageDrank} glasses</div>
        </div>
      </div>
    </div>
    
    <div class="mood-breakdown">
      <h3>💭 Mood Breakdown</h3>
      <div class="mood-averages">
        ${Object.entries(stats.mood.averages).map(([mood, avg]) => `
          <div class="mood-stat">
            <span class="mood-name">${capitalizeFirst(mood)}</span>
            <span class="mood-value">${avg}/10</span>
            <div class="trend ${stats.mood.trends[mood] > 0 ? 'up' : stats.mood.trends[mood] < 0 ? 'down' : 'stable'}">
              ${stats.mood.trends[mood] > 0.1 ? '📈' : stats.mood.trends[mood] < -0.1 ? '📉' : '➡️'}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="insights-section">
      <h3>💡 Insights</h3>
      <ul class="insights-list">
        ${stats.insights.map(insight => `<li>${insight}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Handle export functionality
 */
async function handleExport(container, format) {
  const rangeSelector = container.querySelector('#statsRange');
  const range = rangeSelector.value;
  
  const startDate = container.querySelector('#startDate')?.value;
  const endDate = container.querySelector('#endDate')?.value;
  
  showLoading(`Preparing ${format.toUpperCase()} export...`);
  
  try {
    const stats = await computeStats(range, startDate, endDate);
    
    if (format === 'csv') {
      await exportCSV(stats);
    } else if (format === 'pdf') {
      await exportPDF(stats);
    }
    
    toast(`${format.toUpperCase()} export completed!`, { type: 'success' });
  } catch (error) {
    console.error('Export error:', error);
    toast(`Export failed: ${error.message}`, { type: 'error' });
  } finally {
    hideLoading();
  }
}

/**
 * Export statistics to CSV
 */
export async function exportCSV(stats) {
  const config = EXPORT_CONFIG.csv;
  const rows = [config.headers];
  
  // Add daily data rows
  stats.mood.dailyData.forEach((day, index) => {
    const balance = stats.balance[index]?.index || 0;
    rows.push([
      day.date,
      day.happy || 0,
      day.calm || 0,
      day.loved || 0,
      day.sad || 0,
      day.tired || 0,
      day.frustrated || 0,
      day.grateful || 0,
      Math.round(balance * 100) / 100,
      (day.notes || '').replace(/"/g, '""') // Escape quotes
    ]);
  });
  
  const csvContent = rows.map(row => 
    row.map(cell => `"${cell}"`).join(config.delimiter)
  ).join('\n');
  
  downloadFile(csvContent, `cherry-planner-stats-${formatDate(new Date())}.csv`, 'text/csv');
}

/**
 * Export statistics to PDF
 */
export async function exportPDF(stats) {
  // Simple HTML to PDF approach using print styles
  const printWindow = window.open('', '_blank');
  const chartImage = exportChartImage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cherry Planner Statistics</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d63384; padding-bottom: 20px; }
        .logo { font-size: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .chart-container { text-align: center; margin: 30px 0; }
        .chart-container img { max-width: 100%; height: auto; }
        .insights-list { list-style-type: none; padding: 0; }
        .insights-list li { background: #f8f9fa; margin: 10px 0; padding: 10px; border-radius: 5px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🍒 Cherry Planner</div>
        <h1>Mood & Wellness Statistics</h1>
        <p>Period: ${stats.dateRange.start} to ${stats.dateRange.end} (${stats.dateRange.days} days)</p>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Average Balance</h3>
          <div style="font-size: 1.5rem; font-weight: bold;">
            ${Math.round((stats.balance.reduce((sum, b) => sum + b.index, 0) / stats.balance.length) * 100) / 100}
          </div>
        </div>
        <div class="stat-card">
          <h3>Water Achievement</h3>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.water.completionRate}%</div>
        </div>
        <div class="stat-card">
          <h3>Daily Water Average</h3>
          <div style="font-size: 1.5rem; font-weight: bold;">${stats.water.averageDrank} glasses</div>
        </div>
      </div>
      
      ${chartImage ? `
      <div class="chart-container">
        <h3>Mood Chart</h3>
        <img src="${chartImage}" alt="Mood tracking chart" />
      </div>
      ` : ''}
      
      <div>
        <h3>💡 Insights</h3>
        <ul class="insights-list">
          ${stats.insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9rem;">
        Generated on ${new Date().toLocaleDateString()} by Cherry Planner
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Auto-print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 1000);
}

/**
 * Utility functions
 */

function getDateRangeForStats(range, startDate = null, endDate = null) {
  const today = new Date();
  
  if (range === 'custom' && startDate && endDate) {
    return getDateRange(startDate, endDate);
  }
  
  if (range === 'current-cycle') {
    // Simplified: return last 28 days for cycle
    const start = new Date(today);
    start.setDate(start.getDate() - 28);
    return getDateRange(formatDate(start), formatDate(today));
  }
  
  const days = parseInt(range, 10) || 7;
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);
  
  return getDateRange(formatDate(start), formatDate(today));
}

function hashRange(dateRange) {
  return btoa(dateRange.join(',')).slice(0, 16);
}

function getBalanceClass(balance) {
  if (balance >= 0.3) return 'positive';
  if (balance <= -0.3) return 'negative';
  return 'neutral';
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
