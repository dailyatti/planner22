import { $, $$, clamp, debounce, showToast, escapeHtml } from './modules/utils.js';
import { saveImage, savePDF } from './modules/exporter.js';
import { initTodos, getTodos, setTodos } from './modules/todos.js';
import { initWater, getWaterState, setWaterState, rebuildGlasses } from './modules/water.js';
import { initMood, getMoodState, setMoodState, resetMoods } from './modules/mood.js';
import { initNotes, getNotesState, setNotesState } from './modules/notes.js';
import { initCycle, getCycleGlobals, setCycleGlobals, exportCycleCSV } from './modules/cycle.js';

function storageKey(){ return `cherryPlanner_${$('#plannerDate').value}`; }

function storageAvailable(){
  try{ const t='__cherry_test__'; localStorage.setItem(t,'1'); localStorage.removeItem(t); return true; }
  catch(e){ console.warn('LocalStorage unavailable:', e?.message||e); return false; }
}

function collectData(){
  const mood = getMoodState();
  const water = getWaterState();
  const notes = getNotesState();
  return {
    date: $('#plannerDate').value,
    todos: getTodos(),
    prio1: $('#prio1').value || '',
    prio2: $('#prio2').value || '',
    prio3: $('#prio3').value || '',
    time_morning: $('#morn').value || '',
    time_noon: $('#noon').value || '',
    time_evening: $('#eve').value || '',
    meal_breakfast: $('#meal_b').value || '',
    meal_lunch: $('#meal_l').value || '',
    meal_dinner: $('#meal_d').value || '',
    meal_snacks: $('#meal_s').value || '',
    water,
    mood,
    grat1: $('#grat1').value || '',
    grat2: $('#grat2').value || '',
    grat3: $('#grat3').value || '',
    notes,
    // Extra data to ensure completeness
    waterTarget: water.target,
    moodValues: mood.moods, // New multi-mood values
    moodScore: mood.score || 5, // Legacy compatibility
    moodNotes: mood.notes,
    notesText: notes.text
  };
}

function restoreData(data){
  setTodos(data.todos || []);
  $('#prio1').value = data.prio1 || '';
  $('#prio2').value = data.prio2 || '';
  $('#prio3').value = data.prio3 || '';
  $('#morn').value = data.time_morning || '';
  $('#noon').value = data.time_noon || '';
  $('#eve').value = data.time_evening || '';
  $('#meal_b').value = data.meal_breakfast || '';
  $('#meal_l').value = data.meal_lunch || '';
  $('#meal_d').value = data.meal_dinner || '';
  $('#meal_s').value = data.meal_snacks || '';
  
  // Restore water with enhanced fallback
  const waterData = data.water || { count: data.waterCount || 0, target: data.waterTarget || 8 };
  setWaterState(waterData); rebuildGlasses();
  
  // Restore mood with enhanced fallback (support both old and new formats)
  const moodData = data.mood || { 
    moods: data.moodValues || null, // New multi-mood format
    mood: data.moodType || '', // Legacy single mood
    score: data.moodScore || 5, // Legacy score
    notes: data.moodNotes || '' 
  };
  setMoodState(moodData);
  
  // Restore notes with enhanced fallback
  const notesData = data.notes || { text: data.notesText || '' };
  setNotesState(notesData);
  
  $('#grat1').value = data.grat1 || '';
  $('#grat2').value = data.grat2 || '';
  $('#grat3').value = data.grat3 || '';
}

let saveTimer;
function saveToStorage(){
  // Debounced autosave to reduce write bursts
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    if(!storageAvailable()) return;
    localStorage.setItem(storageKey(), JSON.stringify(collectData()));
    // also persist global preferences
    const cycle = getCycleGlobals();
    localStorage.setItem('cherry_globals', JSON.stringify({
      cycle,
      water: getWaterState(),
      mood: getMoodState()
    }));
    showToast('Saved automatically!');
  }, 250);
}

function restoreFromStorage(showMsg=false){
  if(!storageAvailable()) { console.warn('Storage disabled - skipping restore'); return; }
  // restore global preferences first
  try{
    const g = JSON.parse(localStorage.getItem('cherry_globals')||'{}');
    if(g.water) setWaterState(g.water);
    if(g.mood) setMoodState(g.mood);
    if(g.cycle) setCycleGlobals(g.cycle);
  }catch{}
  const raw = localStorage.getItem(storageKey());
  if(raw){
    try{ restoreData(JSON.parse(raw)); if(showMsg) showToast('Loaded.'); }
    catch(e){ console.error(e); }
  } else {
    setTodos([]); setWaterState({count:0,target:8}); setMoodState({mood:'',score:5,notes:''}); setNotesState({text:''});
    ['prio1','prio2','prio3','morn','noon','eve','meal_b','meal_l','meal_d','meal_s','grat1','grat2','grat3'].forEach(id=>{ const el=$("#"+id); if(el) el.value=''; });
  }
}

function updateDayOfWeek(){ 
  const d = new Date($('#plannerDate').value || Date.now()); 
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; 
  $('#dayOfWeek').textContent = days[d.getDay()]; 
}

// Külső könyvtárak betöltésének ellenőrzése
function waitForLibraries() {
  return new Promise((resolve) => {
    const checkLibraries = () => {
      if (typeof html2canvas !== 'undefined' && typeof window.jspdf !== 'undefined') {
        resolve();
      } else {
        setTimeout(checkLibraries, 100);
      }
    };
    checkLibraries();
  });
}

// Biztonságos gomb inicializálás
function initButtons() {
  console.log('Initializing buttons...');
  
  // Navigation menu toggle
  const navToggle = $('#navToggle'); 
  const menu = $('#menu'); 
  const backdrop = $('#navBackdrop');
  
  if (!navToggle || !menu || !backdrop) {
    console.error('Navigation elements not found');
    return;
  }
  
  function closeMenu(){ 
    menu.classList.remove('open'); 
    navToggle.setAttribute('aria-expanded','false'); 
    menu.setAttribute('aria-hidden','true'); 
    backdrop.classList.remove('show'); 
    backdrop.hidden = true; 
  }
  
  function openMenu(){ 
    menu.classList.add('open'); 
    navToggle.setAttribute('aria-expanded','true'); 
    menu.setAttribute('aria-hidden','false'); 
    backdrop.hidden = false; 
    backdrop.classList.add('show'); 
  }
  
  navToggle.addEventListener('click', () => { 
    menu.classList.contains('open') ? closeMenu() : openMenu(); 
  });
  
  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });

  // Action buttons
  const buttons = [
    { id: 'btnPrint', handler: () => window.print() },
    { id: 'btnSave', handler: saveToStorage },
    { id: 'btnReset', handler: () => { 
      localStorage.removeItem(storageKey()); 
      restoreFromStorage(true); 
    }},
    { id: 'btnResetAll', handler: () => {
      if(!confirm('Reset all saved data? This clears day data and global settings.')) return;
      const keys = Object.keys(localStorage);
      keys.forEach(k=>{ 
        if(k.startsWith('cherryPlanner_')||k==='cherry_globals'||k==='cherry_cycle'||k==='cherry_cycle_log') 
          localStorage.removeItem(k); 
      });
      resetMoods();
      restoreFromStorage(true);
      showToast('All data reset');
    }}
  ];

  // Aszinkron gombok (külső könyvtárakat igényelnek)
  const asyncButtons = [
    { id: 'btnPng', handler: async () => {
      try {
        await waitForLibraries();
        await saveImage('plannerContent');
      } catch (error) {
        console.error('PNG export failed:', error);
        showToast('PNG export failed. Please try again.');
      }
    }},
    { id: 'btnPdf', handler: async () => {
      try {
        await waitForLibraries();
        await savePDF('plannerContent');
      } catch (error) {
        console.error('PDF export failed:', error);
        showToast('PDF export failed. Please try again.');
      }
    }}
  ];

  // Szinkron gombok bekötése
  buttons.forEach(({ id, handler }) => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener('click', handler);
      console.log(`Button ${id} initialized`);
    } else {
      console.warn(`Button ${id} not found`);
    }
  });

  // Aszinkron gombok bekötése
  asyncButtons.forEach(({ id, handler }) => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener('click', handler);
      console.log(`Async button ${id} initialized`);
    } else {
      console.warn(`Button ${id} not found`);
    }
  });
}

// Enhanced DOM ready check
function domReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    // DOM is already ready
    callback();
  }
}

// Main initialization
domReady(() => {
  console.log('DOM ready, initializing app...');
  
  // Set default date
  const plannerDate = $('#plannerDate');
  if (plannerDate) {
    plannerDate.valueAsDate = new Date();
    updateDayOfWeek();
  }

  // Initialize modules
  try {
    initTodos(saveToStorage);
    initWater(saveToStorage);
    initMood(saveToStorage);
    initNotes(saveToStorage);
    initCycle(saveToStorage);
    console.log('Modules initialized');
  } catch (error) {
    console.error('Module initialization failed:', error);
  }

  // Initialize buttons
  initButtons();

  // Restore data
  restoreFromStorage();
  
  // Check storage availability
  if(!storageAvailable()) {
    showToast('Warning: LocalStorage is disabled in this context. Data will not persist.');
  }

  // Initialize motivation system
  try {
    initMotivationSystem();
  } catch (error) {
    console.warn('Motivation system failed to initialize:', error);
  }

  // Date change listener
  const plannerDate = $('#plannerDate');
  if (plannerDate) {
    plannerDate.addEventListener('change', () => { 
      updateDayOfWeek(); 
      restoreFromStorage(true); 
    });
  }

  // Auto-save for all input fields
  $$('input[data-key], textarea[data-key]').forEach(el => {
    el.addEventListener('input', debounce(saveToStorage, 250));
  });
  
  // Auto-save for specific non-data-key fields
  ['#prio1', '#prio2', '#prio3', '#morn', '#noon', '#eve', '#meal_b', '#meal_l', '#meal_d', '#meal_s', '#grat1', '#grat2', '#grat3'].forEach(sel => {
    const el = $(sel);
    if(el) el.addEventListener('input', debounce(saveToStorage, 250));
  });

  console.log('App initialization complete');
});

// ========= Motivation System =========
const motivationData = {
  quotes: [
    "Every day is a new beginning. Take a deep breath and start again.",
    "You are capable of amazing things. Believe in yourself.",
    "Progress is progress, no matter how small.",
    "Your strength is greater than any struggle.",
    "Today is your day to shine.",
    "You are stronger than you think.",
    "Keep going, you're doing great!",
    "Success is not final, failure is not fatal.",
    "Believe you can and you're halfway there.",
    "The future depends on what you do today.",
    "Dream big and dare to fail.",
    "Every expert was once a beginner.",
    "The journey of a thousand miles begins with one step.",
    "Success is walking from failure to failure.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Don't limit your challenges. Challenge your limits.",
    "Your time is limited, don't waste it living someone else's life.",
    "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    "In the middle of difficulty lies opportunity.",
    "The way to get started is to quit talking and begin doing.",
    "It does not matter how slowly you go as long as you do not stop.",
    "The only impossible journey is the one you never begin.",
    "You are the only one who can limit your greatness.",
    "The best revenge is massive success.",
    "Don't be afraid to give up the good to go for the great.",
    "The difference between ordinary and extraordinary is that little extra.",
    "Your life does not get better by chance, it gets better by change.",
    "The only way to achieve the impossible is to believe it is possible.",
    "Success is not the key to happiness. Happiness is the key to success.",
    "The greatest wealth is health.",
    "The mind is everything. What you think you become.",
    "The journey is the reward.",
    "The best preparation for tomorrow is doing your best today.",
    "The only person you should try to be better than is the person you were yesterday.",
    "Your dreams don't have an expiration date. Take a deep breath and try again.",
    "The only limit to our realization of tomorrow will be our doubts of today."
  ],
  psalms: [
    "The Lord is my shepherd, I shall not want. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
    "I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.",
    "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?",
    "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    "I can do all this through him who gives me strength.",
    "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
    "Come to me, all you who are weary and burdened, and I will give you rest.",
    "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken."
  ],
  tips: [
    "Take deep breaths when feeling overwhelmed. Inhale for 4 counts, hold for 4, exhale for 4.",
    "Break large tasks into smaller, manageable steps. Celebrate each small victory.",
    "Practice gratitude by writing down 3 things you're thankful for each day.",
    "Stay hydrated - even mild dehydration can affect your mood and energy.",
    "Move your body daily, even if it's just a short walk around the block.",
    "Connect with loved ones regularly. Social support is crucial for mental health.",
    "Limit screen time before bed to improve sleep quality.",
    "Practice self-compassion. Treat yourself as you would treat a good friend.",
    "Learn to say no to things that don't align with your priorities.",
    "Create a morning routine that sets a positive tone for your day.",
    "Keep a journal to process your thoughts and feelings.",
    "Learn something new every day, no matter how small.",
    "Practice mindfulness by being fully present in the moment.",
    "Set boundaries to protect your time and energy.",
    "Remember that it's okay to ask for help when you need it.",
    "Focus on progress, not perfection.",
    "Take regular breaks throughout the day to recharge.",
    "Practice positive self-talk and challenge negative thoughts.",
    "Surround yourself with people who lift you up.",
    "Remember that every day is a fresh start."
  ]
};

// Enhanced Cycle Tracker with Fertility Predictions
function updateCyclePredictions() {
  const cycleData = JSON.parse(localStorage.getItem('cherry::cycle') || '{}');
  const today = new Date();
  
  if (cycleData.lastPeriod && cycleData.cycleLength) {
    const lastPeriod = new Date(cycleData.lastPeriod);
    const cycleLength = parseInt(cycleData.cycleLength);
    
    // Calculate next period
    const nextPeriod = new Date(lastPeriod);
    nextPeriod.setDate(lastPeriod.getDate() + cycleLength);
    
    // Calculate fertile window (5 days before ovulation + ovulation day)
    const ovulationDay = new Date(lastPeriod);
    ovulationDay.setDate(lastPeriod.getDate() + (cycleLength - 14));
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(ovulationDay.getDate() - 5);
    const fertileEnd = new Date(ovulationDay);
    fertileEnd.setDate(ovulationDay.getDate() + 1);
    
    // Update display
    const predictionsDiv = document.getElementById('cyclePredictions');
    if (predictionsDiv) {
      predictionsDiv.innerHTML = `
        <div class="prediction-card">
          <h4>📅 Next Period</h4>
          <p class="prediction-date">${nextPeriod.toLocaleDateString()}</p>
          <p class="prediction-info">${Math.ceil((nextPeriod - today) / (1000 * 60 * 60 * 24))} days away</p>
        </div>
        <div class="prediction-card">
          <h4>🥚 Fertile Window</h4>
          <p class="prediction-date">${fertileStart.toLocaleDateString()} - ${fertileEnd.toLocaleDateString()}</p>
          <p class="prediction-info">Peak: ${ovulationDay.toLocaleDateString()}</p>
        </div>
        <div class="prediction-card">
          <h4>📊 Current Phase</h4>
          <p class="prediction-date">${getCurrentPhase(today, lastPeriod, cycleLength)}</p>
          <p class="prediction-info">${getPhaseDescription(today, lastPeriod, cycleLength)}</p>
        </div>
      `;
    }
  }
}

function getCurrentPhase(today, lastPeriod, cycleLength) {
  const daysSincePeriod = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const cycleDay = daysSincePeriod % cycleLength;
  
  if (cycleDay <= 5) return "Menstrual Phase";
  if (cycleDay <= 14) return "Follicular Phase";
  if (cycleDay <= 16) return "Ovulation Phase";
  return "Luteal Phase";
}

function getPhaseDescription(today, lastPeriod, cycleLength) {
  const daysSincePeriod = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const cycleDay = daysSincePeriod % cycleLength;
  
  if (cycleDay <= 5) return "Rest and recovery time";
  if (cycleDay <= 14) return "Building energy and creativity";
  if (cycleDay <= 16) return "Peak fertility and vitality";
  return "Preparing for next cycle";
}

// Show motivation based on cycle phase
function showCycleBasedMotivation() {
  const cycleData = JSON.parse(localStorage.getItem('cherry::cycle') || '{}');
  if (!cycleData.lastPeriod || !cycleData.cycleLength) {
    // If no cycle data, show random motivation
    const randomType = Math.random() < 0.5 ? 'quote' : 'tip';
    const message = randomType === 'quote' 
      ? motivationData.quotes[Math.floor(Math.random() * motivationData.quotes.length)]
      : motivationData.tips[Math.floor(Math.random() * motivationData.tips.length)];
    showMotivationToast(message, randomType);
    return;
  }
  
  const today = new Date();
  const lastPeriod = new Date(cycleData.lastPeriod);
  const cycleLength = parseInt(cycleData.cycleLength);
  const daysSincePeriod = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const cycleDay = daysSincePeriod % cycleLength;
  
  let motivationType = 'quote';
  let message = '';
  
  if (cycleDay <= 5) {
    // Menstrual phase - gentle, supportive
    motivationType = 'tip';
    message = motivationData.tips[Math.floor(Math.random() * motivationData.tips.length)];
  } else if (cycleDay <= 14) {
    // Follicular phase - energetic, creative
    motivationType = 'quote';
    message = motivationData.quotes[Math.floor(Math.random() * motivationData.quotes.length)];
  } else if (cycleDay <= 16) {
    // Ovulation phase - powerful, confident
    motivationType = 'psalm';
    message = motivationData.psalms[Math.floor(Math.random() * motivationData.psalms.length)];
  } else {
    // Luteal phase - calming, reflective
    motivationType = 'tip';
    message = motivationData.tips[Math.floor(Math.random() * motivationData.tips.length)];
  }
  
  showMotivationToast(message, motivationType);
}

function showMotivationToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }
  
  const icon = type === 'quote' ? '💭' : type === 'psalm' ? '🙏' : '💡';
  toast.textContent = `${icon} ${message}`;
  toast.className = 'toast show';
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 5000);
}

function initMotivationSystem() {
  try {
    // Update cycle predictions
    updateCyclePredictions();
    
    // Show motivation on period days
    setTimeout(showCycleBasedMotivation, 2000);
    
    console.log('Motivation system initialized');
  } catch (error) {
    console.error('Motivation system initialization failed:', error);
  }
}

// Make functions globally available for HTML onclick handlers
window.showCycleBasedMotivation = showCycleBasedMotivation;
window.showMotivationToast = showMotivationToast;
window.updateCyclePredictions = updateCyclePredictions;


