import { $, $$, clamp, debounce, showToast, escapeHtml } from './modules/utils.js';
import { saveImage, savePDF } from './modules/exporter.js';
import { initTodos, getTodos, setTodos } from './modules/todos.js';
import { initWater, getWaterState, setWaterState, rebuildGlasses } from './modules/water.js';
import { initMood, getMoodState, setMoodState } from './modules/mood.js';
import { initNotes, getNotesState, setNotesState } from './modules/notes.js';
import { initCycle, getCycleGlobals, setCycleGlobals, exportCycleCSV } from './modules/cycle.js';

function storageKey(){ return `cherryPlanner_${$('#plannerDate').value}`; }

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
    notes
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
  setWaterState(data.water || { count:0, target:8 }); rebuildGlasses();
  setMoodState(data.mood || { mood:'', score:5, notes:'' });
  setNotesState(data.notes || { text:'' });
  $('#grat1').value = data.grat1 || '';
  $('#grat2').value = data.grat2 || '';
  $('#grat3').value = data.grat3 || '';
}

let saveTimer;
function saveToStorage(){
  // Debounced autosave to reduce write bursts
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
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

function updateDayOfWeek(){ const d = new Date($('#plannerDate').value || Date.now()); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; $('#dayOfWeek').textContent = days[d.getDay()]; }

window.addEventListener('DOMContentLoaded', () => {
  const navToggle = $('#navToggle'); const menu = $('#menu'); const backdrop = $('#navBackdrop');
  function closeMenu(){ menu.classList.remove('open'); navToggle.setAttribute('aria-expanded','false'); menu.setAttribute('aria-hidden','true'); backdrop.classList.remove('show'); backdrop.hidden = true; }
  function openMenu(){ menu.classList.add('open'); navToggle.setAttribute('aria-expanded','true'); menu.setAttribute('aria-hidden','false'); backdrop.hidden = false; backdrop.classList.add('show'); }
  navToggle.addEventListener('click', () => { menu.classList.contains('open') ? closeMenu() : openMenu(); });
  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });

  $('#plannerDate').valueAsDate = new Date();
  updateDayOfWeek();

  initTodos(saveToStorage);
  initWater(saveToStorage);
  initMood(saveToStorage);
  initNotes(saveToStorage);
  initCycle(saveToStorage);

  restoreFromStorage();

  $('#btnPrint').addEventListener('click', () => window.print());
  $('#btnPng').addEventListener('click', () => saveImage('plannerContent'));
  $('#btnPdf').addEventListener('click', () => savePDF('plannerContent'));
  $('#btnSave').addEventListener('click', saveToStorage);
  $('#btnReset').addEventListener('click', () => { localStorage.removeItem(storageKey()); restoreFromStorage(true); });

  $('#plannerDate').addEventListener('change', () => { updateDayOfWeek(); restoreFromStorage(true); });
});


