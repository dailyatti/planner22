/**
 * Cherry Planner Premium - Motivation System
 * Auto-triggers, manual quotes, psalms, and tips with cooldown management
 */

import { getMoodData, getMotivationState, setMotivationState } from './storage.js';
import { getSettings } from './config.js';
import { openModal, toast } from './ui.js';

let quotesData = [];
let psalmsData = [];
let tipsData = [];
let isInitialized = false;

/**
 * Initialize motivation system
 */
export async function initMotivation() {
  try {
    // Load data files
    // Resolve data paths relative to this module for compatibility with GitHub Pages/Netlify
    const dataBase = new URL('../data/', import.meta.url).toString();
    const [quotes, psalms, tips] = await Promise.all([
      loadJSON(new URL('quotes.json', dataBase).toString()),
      loadJSON(new URL('psalms.json', dataBase).toString()), 
      loadJSON(new URL('tips.json', dataBase).toString())
    ]);
    
    quotesData = quotes || [];
    psalmsData = psalms || [];
    tipsData = tips || [];
    
    isInitialized = true;
    console.log('Motivation system initialized with', quotesData.length, 'quotes,', psalmsData.length, 'psalms,', tipsData.length, 'tips');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize motivation system:', error);
    return false;
  }
}

/**
 * Load JSON data
 */
async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to load ${url}:`, error);
    return [];
  }
}

/**
 * Check if auto motivation should be triggered for current mood state
 */
export function maybeAutoShowQuote(todayDate, moodData = null) {
  if (!isInitialized) return false;
  
  const settings = getSettings();
  if (!settings.mood.dailyAutoQuote) return false;

  // Only trigger around menstrual period days if cycle indicates so
  if (!isTodayWithinPeriod(todayDate)) {
    return false;
  }
  
  const mood = moodData || getMoodData(todayDate);
  const motivationState = getMotivationState(todayDate);
  
  // Check if already shown auto quote today
  if (motivationState.autoShown) return false;
  
  // Check daily limit
  if (motivationState.count >= settings.mood.maxAutoQuotesPerDay) return false;
  
  // Check for negative mood trigger (Trigger 1)
  const hasNegativeMood = checkNegativeMoodTrigger(mood, settings);
  
  // Check for consecutive negative days (Trigger 2)
  const hasConsecutiveNegative = checkConsecutiveNegativeTrigger(todayDate, settings);
  
  if (hasNegativeMood || hasConsecutiveNegative) {
    showAutoMotivation(todayDate, hasConsecutiveNegative ? 'consecutive' : 'daily');
    return true;
  }
  
  return false;
}

/**
 * Check for negative mood trigger (today's mood ≥ threshold)
 */
function checkNegativeMoodTrigger(mood, settings) {
  const threshold = settings.mood.negativeThreshold;
  const negativeMoods = ['sad', 'tired', 'frustrated'];
  
  return negativeMoods.some(moodType => mood[moodType] >= threshold);
}

/**
 * Check for consecutive negative days trigger
 */
function checkConsecutiveNegativeTrigger(todayDate, settings) {
  const threshold = settings.mood.negativeThreshold;
  const consecutiveDays = settings.mood.consecutiveDaysTrigger;
  const negativeMoods = ['sad', 'tired', 'frustrated'];
  
  let consecutiveCount = 0;
  const today = new Date(todayDate);
  
  // Check previous days
  for (let i = 1; i <= consecutiveDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = formatDate(checkDate);
    
    const dayMood = getMoodData(dateStr);
    const hasNegative = negativeMoods.some(moodType => dayMood[moodType] >= threshold);
    
    if (hasNegative) {
      consecutiveCount++;
    } else {
      break; // Consecutive chain broken
    }
  }
  
  return consecutiveCount >= consecutiveDays;
}

/**
 * Show automatic motivation with toast notification
 */
function showAutoMotivation(todayDate, triggerType) {
  // Show toast first
  toast('🍒 Nehéz nap? Itt egy gondolat…', {
    type: 'info',
    duration: 3000,
    action: {
      text: 'Megtekintés',
      handler: () => openMotivationModal({ force: true, auto: true, triggerType })
    }
  });
  
  // Mark as auto-shown
  const state = getMotivationState(todayDate);
  state.autoShown = true;
  state.count = (state.count || 0) + 1;
  setMotivationState(todayDate, state);
}

/**
 * Open motivation modal manually or automatically
 */
export function openMotivationModal(options = {}) {
  if (!isInitialized) {
    toast('Motivation system is loading...', { type: 'warning' });
    return;
  }
  
  const settings = getSettings();
  const todayDate = formatDate(new Date());
  const motivationState = getMotivationState(todayDate);
  
  // Get content
  const quote = getRandomQuote(motivationState.lastQuoteId);
  const tip = getRandomTip(motivationState.lastTipId);
  
  // Create modal content
  const content = createMotivationContent(quote, tip, options);
  
  // Open modal
  openModal({
    title: options.auto ? '🍒 Little boost for you!' : '💡 Cherry Motivation',
    content,
    actions: [
      {
        text: 'Új tartalom',
        handler: () => {
          // Refresh with new content
          openMotivationModal({ ...options, refresh: true });
        },
        closeOnClick: false
      },
      {
        text: 'Bezárás',
        primary: true,
        handler: () => {}
      }
    ]
  });
  
  // Update state
  if (!options.refresh) {
    motivationState.lastQuoteId = quote.id;
    motivationState.lastTipId = tip.id;
    if (!options.auto) {
      motivationState.count = (motivationState.count || 0) + 1;
    }
    setMotivationState(todayDate, motivationState);
  }
}

/**
 * Create motivation modal content
 */
function createMotivationContent(quote, tip, options = {}) {
  const container = document.createElement('div');
  container.className = 'motivation-content';
  
  // Quote/Psalm section
  const quoteSection = document.createElement('div');
  quoteSection.className = 'motivation-quote';
  quoteSection.innerHTML = `
    <div style="background: linear-gradient(135deg, var(--cherry-50), white); padding: 1.5rem; border-radius: var(--radius-xl); border-left: 4px solid var(--cherry-500); margin-bottom: 1.5rem;">
      <blockquote style="margin: 0; font-style: italic; font-size: 1.1rem; line-height: 1.6; color: var(--text-strong);">
        "${quote.text}"
      </blockquote>
      ${quote.author ? `<footer style="margin-top: 0.75rem; text-align: right; color: var(--cherry-600); font-weight: 600;">— ${quote.author}</footer>` : ''}
      ${quote.source ? `<footer style="margin-top: 0.75rem; text-align: right; color: var(--cherry-600); font-weight: 600;">— ${quote.source}</footer>` : ''}
    </div>
  `;
  
  // Tip section
  const tipSection = document.createElement('div');
  tipSection.className = 'motivation-tip';
  tipSection.innerHTML = `
    <div style="background: linear-gradient(135deg, var(--cream-50), white); padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--cherry-200);">
      <h4 style="margin: 0 0 0.75rem 0; color: var(--cherry-600); font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        💡 Tipp a jobb hangulatért
      </h4>
      <p style="margin: 0; font-weight: 500; color: var(--text-strong);">${tip.text}</p>
      ${tip.description ? `<p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--text-muted);">${tip.description}</p>` : ''}
    </div>
  `;
  
  container.appendChild(quoteSection);
  container.appendChild(tipSection);
  
  return container;
}

/**
 * Get random quote with repetition avoidance
 */
function getRandomQuote(excludeId = null) {
  const settings = getSettings();
  const pool = settings.motivation.preferQuotes ? quotesData : [...quotesData, ...psalmsData];
  
  if (pool.length === 0) {
    return { id: 0, text: 'Minden nap új lehetőség a boldogságra.', author: 'Cherry Planner' };
  }
  
  // Filter out recently used
  let available = pool.filter(item => item.id !== excludeId);
  
  // If all used, reset pool
  if (available.length === 0) {
    available = pool;
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get random tip with repetition avoidance
 */
function getRandomTip(excludeId = null) {
  if (tipsData.length === 0) {
    return { id: 0, text: 'Lélegezz mélyet és mosolyogj!', category: 'general' };
  }
  
  // Filter out recently used
  let available = tipsData.filter(item => item.id !== excludeId);
  
  // If all used, reset pool
  if (available.length === 0) {
    available = tipsData;
  }
  
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get new random tip (for refresh button)
 */
export function getNewRandomTip(currentTipId = null) {
  return getRandomTip(currentTipId);
}

/**
 * Reset daily motivation state (for testing)
 */
export function resetDailyMotivation(date = null) {
  const targetDate = date || formatDate(new Date());
  setMotivationState(targetDate, {
    autoShown: false,
    lastQuoteId: null,
    lastTipId: null,
    count: 0
  });
  return true;
}

/**
 * Get motivation statistics
 */
export function getMotivationStats(dateRange = 7) {
  const today = new Date();
  const stats = {
    totalShown: 0,
    autoTriggered: 0,
    manualOpened: 0,
    daysWithMotivation: 0
  };
  
  for (let i = 0; i < dateRange; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    
    const state = getMotivationState(dateStr);
    if (state.count > 0) {
      stats.totalShown += state.count;
      stats.daysWithMotivation++;
      
      if (state.autoShown) {
        stats.autoTriggered++;
      }
      
      if (state.count > (state.autoShown ? 1 : 0)) {
        stats.manualOpened += state.count - (state.autoShown ? 1 : 0);
      }
    }
  }
  
  return stats;
}

/**
 * Check if cooldown is active
 */
function isCooldownActive(lastShown, cooldownMinutes = 60) {
  if (!lastShown) return false;
  
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return (now - lastShown) < cooldownMs;
}

/**
 * Utility: Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add motivation button to existing mood card
 */
export function addMotivationButton() {
  // Avoid duplicates globally
  if (document.querySelector('.motivation-trigger')) return false;

  // Try to find the mood section in different layouts
  const candidates = [];
  const moodCard = document.querySelector('[aria-labelledby="h-mood"]');
  if (moodCard) {
    const moodWrap = moodCard.querySelector('.mood-wrap') || moodCard;
    candidates.push(moodWrap);
  }
  const multi = document.getElementById('moodMultiSliders');
  if (multi) candidates.push(multi.parentElement || multi);
  const tracker = document.querySelector('.mood-tracker');
  if (tracker) candidates.push(tracker);
  const notes = document.getElementById('moodNotes');
  if (notes && notes.parentElement) candidates.push(notes.parentElement);

  const container = candidates.find(Boolean);
  if (!container) return false;

  // Create motivation button
  const motivationBtn = document.createElement('button');
  motivationBtn.className = 'cherry-badge motivation-trigger';
  motivationBtn.innerHTML = '💡 Motivation';
  motivationBtn.setAttribute('aria-label', 'Open motivation and tips');
  motivationBtn.addEventListener('click', () => openMotivationModal());

  // Wrap for spacing
  const buttonContainer = document.createElement('div');
  buttonContainer.style.textAlign = 'center';
  buttonContainer.style.marginTop = '1rem';
  buttonContainer.appendChild(motivationBtn);

  container.appendChild(buttonContainer);
  return true;
}

/**
 * Monitor mood changes for auto-triggers
 */
export function monitorMoodChanges() {
  // Listen for mood slider changes
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('mood-individual-range')) {
      // Debounce mood checking
      clearTimeout(monitorMoodChanges.timeout);
      monitorMoodChanges.timeout = setTimeout(() => {
        const todayDate = formatDate(new Date());
        // Get current mood data from DOM
        const currentMood = getCurrentMoodFromDOM();
        maybeAutoShowQuote(todayDate, currentMood);
      }, 1000); // 1 second debounce
    }
  });
}

/**
 * Ensure motivation button exists (retries + observes DOM)
 */
export function ensureMotivationButton() {
  // If already present, nothing to do
  if (document.querySelector('.motivation-trigger')) return true;

  let attempts = 0;
  const maxAttempts = 20; // ~20s with 1s interval

  const tryAdd = () => {
    if (document.querySelector('.motivation-trigger')) return cleanup();
    const added = addMotivationButton();
    attempts++;
    if (added || attempts >= maxAttempts) cleanup();
  };

  const intervalId = setInterval(tryAdd, 1000);

  // Also observe DOM mutations for faster placement when mood section renders
  const observer = new MutationObserver(() => {
    if (document.querySelector('.motivation-trigger')) return cleanup();
    addMotivationButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function cleanup() {
    clearInterval(intervalId);
    observer.disconnect();
  }

  // Initial attempt now
  tryAdd();
  return false;
}

/**
 * Get current mood data from DOM sliders
 */
function getCurrentMoodFromDOM() {
  const mood = {
    happy: 5, calm: 5, loved: 5,
    sad: 5, tired: 5, frustrated: 5, grateful: 5,
    notes: ''
  };
  
  // Map emojis to mood keys
  const emojiToKey = {
    '😊': 'happy',
    '😌': 'calm',
    '🥰': 'loved',
    '😔': 'sad',
    '😴': 'tired',
    '😤': 'frustrated',
    '🙏': 'grateful'
  };
  
  // Read values from sliders
  Object.entries(emojiToKey).forEach(([emoji, key]) => {
    const slider = document.querySelector(`[data-mood="${emoji}"]`);
    if (slider) {
      mood[key] = parseInt(slider.value, 10) || 5;
    }
  });
  
  // Read notes
  const notesField = document.getElementById('moodNotes');
  if (notesField) {
    mood.notes = notesField.value || '';
  }
  
  return mood;
}

/**
 * Check if provided date falls within predicted or logged period days
 * Uses stored `cherry_cycle` configuration and `cherry_cycle_log` from base app
 */
function isTodayWithinPeriod(dateStr) {
  try {
    const today = new Date(dateStr);
    const cfg = JSON.parse(localStorage.getItem('cherry_cycle') || '{}');
    const log = JSON.parse(localStorage.getItem('cherry_cycle_log') || '[]');
    const periodLen = Number(cfg.period || 5);
    const baseLen = Number(cfg.len || 28);
    const luteal = Number(cfg.luteal || 14);
    const adv = cfg.adv !== false; // default true

    // Helper: parse key like YYYY-M-D
    const parseKey = (k) => {
      const [Y, M, D] = String(k).split('-').map(n => parseInt(n, 10));
      return new Date(Y, (M - 1), D);
    };
    const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    // 1) Check logged actual starts
    const starts = (Array.isArray(log) ? log : []).map(parseKey).sort((a, b) => a - b);
    for (const s of starts) {
      const end = new Date(s); end.setDate(end.getDate() + (periodLen - 1));
      if (today >= s && today <= end) return true;
    }

    // 2) If no logs, use configured last start to project cycles
    if (cfg.start) {
      const startDate = new Date(cfg.start);
      // Walk cycles around today to see if falls in a projected period window
      const avgLen = baseLen; // could be enhanced by history; keep simple here
      // Find the closest cycle start not after today
      const ref = new Date(startDate);
      while (ref < today) {
        ref.setDate(ref.getDate() + avgLen);
      }
      // Last cycle start before or equal today
      ref.setDate(ref.getDate() - avgLen);
      const perStart = new Date(ref);
      const perEnd = new Date(ref); perEnd.setDate(perEnd.getDate() + (periodLen - 1));
      if (today >= perStart && today <= perEnd) return true;

      // Also check previous and next cycle window just in case
      const prevStart = new Date(ref); prevStart.setDate(prevStart.getDate() - avgLen);
      const prevEnd = new Date(prevStart); prevEnd.setDate(prevEnd.getDate() + (periodLen - 1));
      if (today >= prevStart && today <= prevEnd) return true;

      const nextStart = new Date(ref); nextStart.setDate(nextStart.getDate() + avgLen);
      const nextEnd = new Date(nextStart); nextEnd.setDate(nextEnd.getDate() + (periodLen - 1));
      if (today >= nextStart && today <= nextEnd) return true;
    }

    return false;
  } catch (e) {
    console.warn('Cycle check failed, skipping period-only condition', e);
    return false;
  }
}
