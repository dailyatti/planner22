import { $, $$, clamp } from './utils.js';

let onChange = () => {};
let state = { count:0, target:8 };

export function initWater(save){
  onChange = save || (()=>{});
  $('#incWater').addEventListener('click', ()=> setWaterCount(getWaterCount()+1));
  $('#decWater').addEventListener('click', ()=> setWaterCount(getWaterCount()-1));
  const incTarget = $('#incTarget'); const decTarget = $('#decTarget');
  if(incTarget) incTarget.addEventListener('click', ()=>{ state.target = clamp(state.target+1,1,24); $('#waterTarget').value = String(state.target); rebuildGlasses(); onChange(); });
  if(decTarget) decTarget.addEventListener('click', ()=>{ state.target = clamp(state.target-1,1,24); $('#waterTarget').value = String(state.target); rebuildGlasses(); onChange(); });
  // update on target change or typing
  const targetEl = $('#waterTarget');
  targetEl.addEventListener('input', ()=>{ state.target = clamp(parseInt(targetEl.value||'8',10),1,24); rebuildGlasses(); onChange(); });
  // allow manual typing of consumed glasses
  const countEl = $('#waterCount');
  countEl.addEventListener('input', ()=>{ const n = clamp(parseInt(countEl.value||'0',10),0,state.target); setWaterCount(n); });
  countEl.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowUp'){ e.preventDefault(); setWaterCount(getWaterCount()+1); }
    if(e.key==='ArrowDown'){ e.preventDefault(); setWaterCount(getWaterCount()-1); }
  });
  rebuildGlasses();
}

export function rebuildGlasses(){
  const rack = $('#water'); rack.innerHTML='';
  for(let i=0;i<state.target;i++){
    const d = document.createElement('button');
    d.type='button'; d.className='glass'; d.setAttribute('aria-pressed','false');
    d.innerHTML = '<span class="fill"></span><span class="shine"></span>';
    d.addEventListener('click', ()=>{ const current=getWaterCount(); const newCount = (i < current) ? i : i + 1; setWaterCount(newCount); });
    rack.appendChild(d);
  }
  setWaterCount(clamp(state.count,0,state.target));
}

export function setWaterCount(n){
  state.count = clamp(n,0,state.target);
  $('#waterCount').value = String(state.count);
  updateUI(); onChange();
}

export function getWaterCount(){ return clamp(parseInt($('#waterCount').value||String(state.count),10),0,state.target); }

function updateUI(){
  const bar = $('#waterBar'); const summary = $('#waterSummary'); const stats = $('#waterStats');
  const glasses = $$('#water .glass');
  glasses.forEach((g,i)=>{ const on = i < state.count; g.classList.toggle('filled', on); g.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  bar.style.width = `${(state.count/state.target)*100}%`;
  summary.textContent = `${state.count} / ${state.target} glasses`;
  if(stats) stats.textContent = `${state.count} of ${state.target} glasses consumed`;
}

export function getWaterState(){ return { ...state }; }
export function setWaterState(s){ state = { count: clamp(s?.count ?? 0,0,24), target: clamp(s?.target ?? 8,1,24) }; $('#waterTarget').value = String(state.target); rebuildGlasses(); }


