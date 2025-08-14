import { $, $$, clamp } from './utils.js';

let onChange = () => {};
let state = { 
  moods: {
    '😊': 5, // Happy
    '😌': 5, // Calm
    '😔': 5, // Sad
    '😴': 5, // Tired
    '🥰': 5, // Loved
    '😎': 5, // Confident
    '😤': 5, // Frustrated
    '😰': 5, // Anxious
    '🙏': 5  // Grateful
  },
  notes: '' 
};

const moodLabels = {
  '😊': 'Happy',
  '😌': 'Calm',
  '😔': 'Sad',
  '😴': 'Tired',
  '🥰': 'Loved',
  '😎': 'Confident',
  '😤': 'Frustrated',
  '😰': 'Anxious',
  '🙏': 'Grateful'
};

export function initMood(save){
  onChange = save || (()=>{});
  const container = $('#moodMultiSliders');
  if (!container) return;
  
  container.innerHTML = '';
  
  Object.keys(state.moods).forEach(emoji => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mood-slider-item';
    
    wrapper.innerHTML = `
      <div class="mood-emoji">${emoji}</div>
      <div class="mood-slider-controls">
        <div class="mood-slider-label">${moodLabels[emoji]}</div>
        <input type="range" min="1" max="10" step="1" value="${state.moods[emoji]}" 
               class="mood-individual-range" data-mood="${emoji}" 
               aria-label="${moodLabels[emoji]} intensity (1-10)" />
        <div class="mood-value-display">${state.moods[emoji]}/10</div>
      </div>
    `;
    
    const slider = wrapper.querySelector('.mood-individual-range');
    const valueDisplay = wrapper.querySelector('.mood-value-display');
    
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value, 10);
      state.moods[emoji] = value;
      valueDisplay.textContent = `${value}/10`;
      onChange();
    });
    
    container.appendChild(wrapper);
  });
  
  const notesEl = $('#moodNotes'); 
  if(notesEl) notesEl.addEventListener('input', ()=>{ 
    state.notes = notesEl.value; 
    onChange(); 
  });
}

export function getMoodState(){ 
  return { ...state }; 
}

export function setMoodState(s){ 
  // Handle both old and new state formats
  if (s?.moods) {
    // New multi-mood format
    state.moods = { ...state.moods, ...s.moods };
  } else if (s?.mood && s?.score) {
    // Legacy single mood format - convert to multi-mood
    resetMoodsToDefault();
    if (moodLabels[s.mood]) {
      state.moods[s.mood] = s.score;
    }
  }
  
  state.notes = s?.notes || '';
  
  // Update UI
  updateMoodSliders();
  const notesEl = $('#moodNotes');
  if (notesEl) notesEl.value = state.notes;
}

function updateMoodSliders() {
  Object.keys(state.moods).forEach(emoji => {
    const slider = $(`[data-mood="${emoji}"]`);
    const valueDisplay = slider?.parentElement?.querySelector('.mood-value-display');
    if (slider) {
      slider.value = state.moods[emoji];
      if (valueDisplay) {
        valueDisplay.textContent = `${state.moods[emoji]}/10`;
      }
    }
  });
}

function resetMoodsToDefault() {
  Object.keys(state.moods).forEach(emoji => {
    state.moods[emoji] = 5;
  });
}

export function resetMoods() {
  resetMoodsToDefault();
  updateMoodSliders();
  onChange();
}

// Legacy compatibility functions
export function selectMood(key) {
  // Convert old key format to emoji if needed
  const emojiMap = {
    'happy': '😊',
    'calm': '😌', 
    'sad': '😔',
    'tired': '😴',
    'loved': '🥰',
    'cool': '😎',
    'frustrated': '😤',
    'anxious': '😰',
    'grateful': '🙏'
  };
  
  const emoji = emojiMap[key] || key;
  if (state.moods[emoji] !== undefined) {
    state.moods[emoji] = 10; // Set to max when "selected"
    updateMoodSliders();
    onChange();
  }
}