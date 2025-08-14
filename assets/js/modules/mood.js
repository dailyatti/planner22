import { $, $$, clamp } from './utils.js';

let onChange = () => {};
let state = { mood:'', score:5, notes:'' };

const MOODS = [
  {key:'happy',label:'😊',title:'Happy'},
  {key:'calm',label:'😌',title:'Calm'},
  {key:'sad',label:'😔',title:'Sad'},
  {key:'tired',label:'😴',title:'Tired'},
  {key:'loved',label:'🥰',title:'Loved'},
  {key:'cool',label:'😎',title:'Confident'},
  {key:'frustrated',label:'😤',title:'Frustrated'},
  {key:'anxious',label:'😰',title:'Anxious'},
  {key:'grateful',label:'🙏',title:'Grateful'}
];

export function initMood(save){
  onChange = save || (()=>{});
  const wrap = $('#moodChips'); wrap.innerHTML='';
  MOODS.forEach(m => { const b = document.createElement('button'); b.type='button'; b.className='chip'; b.dataset.mood=m.key; b.textContent=m.label; b.title=m.title; b.setAttribute('aria-pressed','false'); b.addEventListener('click', ()=>{ selectMood(m.key); onChange(); }); wrap.appendChild(b); });
  const r = $('#moodRange'); const bub = $('#moodBubble'); const updateBubble = ()=>{ bub.textContent = `${r.value}/10`; }; updateBubble(); r.addEventListener('input', ()=>{ state.score = clamp(parseInt(r.value||'5',10),1,10); updateBubble(); onChange(); });
  const notesEl = $('#moodNotes'); if(notesEl) notesEl.addEventListener('input', ()=>{ state.notes = notesEl.value; onChange(); });
}

export function selectMood(key){ $$('#moodChips .chip').forEach(b => { const on = b.dataset.mood === key; b.setAttribute('aria-pressed', on?'true':'false'); b.style.transform = on ? 'translateY(-2px) scale(1.06)' : ''; }); state.mood = key; }
export function getMoodState(){ return { ...state }; }
export function setMoodState(s){ state = { mood: s?.mood || '', score: clamp(s?.score ?? 5,1,10), notes: s?.notes || '' }; $('#moodRange').value = String(state.score); $('#moodBubble').textContent = `${state.score}/10`; $('#moodNotes').value = state.notes; selectMood(state.mood); }


