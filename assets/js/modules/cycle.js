import { $, clamp, showToast } from './utils.js';

let onChange = () => {};

export function initCycle(save){
  onChange = save || (()=>{});
  // restore settings
  const cfg = JSON.parse(localStorage.getItem('cherry_cycle')||'{}');
  if(cfg.start) $('#cycleStart').value = cfg.start;
  if(cfg.len) $('#cycleLen').value = cfg.len;
  if(cfg.period) $('#periodLen').value = cfg.period;
  if(cfg.luteal) $('#lutealLen').value = cfg.luteal;
  if(typeof cfg.adv === 'boolean') $('#advEst').checked = cfg.adv;
  buildCalendar();
  updateCycleSummary();
  $('#saveCycle').addEventListener('click', ()=>{ persistCycle(); buildCalendar(); updateCycleSummary(); showToast('Cycle saved'); });
  // autosave on change
  ['#cycleStart','#cycleLen','#periodLen','#lutealLen','#advEst'].forEach(sel=>{ const el=$(sel); if(!el)return; el.addEventListener('input', ()=>{ persistCycle(); onChange(); updateCycleSummary(); }); el.addEventListener('change', ()=>{ persistCycle(); onChange(); updateCycleSummary(); }); });
  $('#calPrev').addEventListener('click', ()=>{ calMonth.setMonth(calMonth.getMonth()-1); buildCalendar(); });
  $('#calNext').addEventListener('click', ()=>{ calMonth.setMonth(calMonth.getMonth()+1); buildCalendar(); });
  const exp = document.getElementById('exportCycle'); if(exp) exp.addEventListener('click', exportCycleCSV);
  const clr = document.getElementById('clearCycle'); if(clr) clr.addEventListener('click', ()=>{ if(confirm('Clear cycle history?')){ localStorage.removeItem('cherry_cycle_log'); buildCalendar(); updateCycleSummary(); } });
}

export function getCycleGlobals(){ const d = JSON.parse(localStorage.getItem('cherry_cycle')||'{}'); return { start: d.start || '', len: clamp(parseInt(d.len||'28',10),20,40), period: clamp(parseInt(d.period||'5',10),1,10), luteal: clamp(parseInt(d.luteal||'14',10),8,18), adv: d.adv!==false }; }
export function setCycleGlobals(cfg){ localStorage.setItem('cherry_cycle', JSON.stringify(cfg)); }
export function exportCycleCSV(){ const log = loadCycleLog(); const rows = [['start_date']].concat(log.map(d=>[d])); const csv = rows.map(r=> r.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cycle-log.csv'; a.click(); URL.revokeObjectURL(a.href); }

let calMonth = new Date();

function persistCycle(){ const data = { start: $('#cycleStart').value || '', len: clamp(parseInt($('#cycleLen').value||'28',10),20,40), period: clamp(parseInt($('#periodLen').value||'5',10),1,10), luteal: clamp(parseInt($('#lutealLen').value||'14',10),8,18), adv: $('#advEst').checked }; localStorage.setItem('cherry_cycle', JSON.stringify(data)); }
function getCycle(){ const d = JSON.parse(localStorage.getItem('cherry_cycle')||'{}'); return { start: d.start ? new Date(d.start) : null, len: clamp(parseInt(d.len||'28',10),20,40), period: clamp(parseInt(d.period||'5',10),1,10), luteal: clamp(parseInt(d.luteal||'14',10),8,18), adv: d.adv!==false }; }
function loadCycleLog(){ try{ const a = JSON.parse(localStorage.getItem('cherry_cycle_log')||'[]'); return Array.isArray(a)? a.filter(Boolean): []; }catch{ return []; } }
function saveCycleLog(arr){ localStorage.setItem('cherry_cycle_log', JSON.stringify(arr)); }
function toggleLoggedStart(key){ const log = new Set(loadCycleLog()); if(log.has(key)) log.delete(key); else log.add(key); saveCycleLog(Array.from(log).sort()); buildCalendar(); updateCycleSummary(); }

function computeAverages(){ const log = loadCycleLog().map(s=> new Date(s)).sort((a,b)=> a-b); let diffs=[]; for(let i=1;i<log.length;i++){ diffs.push( Math.round((log[i]-log[i-1])/(1000*60*60*24)) ); } const avgLen = diffs.length ? Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length) : null; const variance = diffs.length ? Math.round(diffs.reduce((a,b)=> a + Math.pow(b-(avgLen||0),2),0)/diffs.length) : null; const stdev = variance!=null ? Math.round(Math.sqrt(variance)) : null; const { period } = getCycle(); return { avgLen, avgPeriod: period, samples: diffs.length, stdev }; }

function buildCalendar(){
  const grid = $('#calGrid'); grid.innerHTML = '';
  const title = $('#calTitle'); const y = calMonth.getFullYear(); const m = calMonth.getMonth();
  title.textContent = calMonth.toLocaleString('en-US', { month:'long', year:'numeric' });
  const today = new Date();
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; dows.forEach(d=>{ const el = document.createElement('div'); el.className='dow'; el.textContent=d; grid.appendChild(el); });
  const first = new Date(y,m,1); const firstIdx = (first.getDay()+6)%7; const daysInMonth = new Date(y,m+1,0).getDate();
  const marks = computeCycleMarks(y,m);
  for(let i=0;i<firstIdx;i++){ const ph = document.createElement('div'); ph.className='day'; ph.style.visibility='hidden'; grid.appendChild(ph); }
  for(let d=1; d<=daysInMonth; d++){
    const el = document.createElement('div'); el.className='day'; el.textContent = d; const key = `${y}-${m+1}-${d}`; el.dataset.date = key;
    if(marks.period.has(key)) el.classList.add('period'); if(marks.fertile.has(key)) el.classList.add('fertile'); if(marks.ovul.has(key)) el.classList.add('ovul'); if(marks.actualStarts.has(key)) el.classList.add('actual'); if(y===today.getFullYear() && m===today.getMonth() && d===today.getDate()) el.classList.add('today');
    el.title = 'Click: toggle actual start • Shift+Click: toggle period day';
    el.addEventListener('click', (evt)=>{ if(evt.shiftKey){ if(el.classList.contains('period')) el.classList.remove('period'); else el.classList.add('period'); } else { toggleLoggedStart(key); } });
    grid.appendChild(el);
  }
}

function computeCycleMarks(year, month){
  const { start, len, period, luteal, adv } = getCycle(); const logStarts = new Set(loadCycleLog()); const periodSet = new Set(); const fertileSet = new Set(); const ovulSet = new Set(); const actualStarts = new Set();
  logStarts.forEach(k=>{ const d = parseKey(k); const perEnd = new Date(d); perEnd.setDate(perEnd.getDate()+period-1); rangeDays(d, perEnd).forEach(x=>{ if(inMonth(x, year, month)) periodSet.add(fmtKey(x)); }); if(inMonth(d, year, month)) actualStarts.add(fmtKey(d)); });
  let seed = null; if(logStarts.size){ seed = Array.from(logStarts).map(parseKey).sort((a,b)=>b-a)[0]; } if(!seed && start) seed = new Date(start.getFullYear(), start.getMonth(), start.getDate()); if(!seed){ return { period:periodSet, fertile:fertileSet, ovul:ovulSet, actualStarts } ; }
  const viewStart = new Date(year, month, 1); const viewEnd = new Date(year, month+1, 0); const { avgLen } = computeAverages(); const effLen = clamp(parseInt((avgLen || len),10),20,40);
  let t = new Date(seed); while(t > viewStart) t.setDate(t.getDate()-effLen);
  for(let i=0;i<24;i++){ const perStart = new Date(t); const perEnd = new Date(t); perEnd.setDate(perEnd.getDate()+period-1); const ovul = new Date(t); ovul.setDate(ovul.getDate() + (adv ? effLen - luteal : effLen - 14)); const fertileStart = new Date(ovul); fertileStart.setDate(fertileStart.getDate()-5); const fertileEnd = new Date(ovul); fertileEnd.setDate(fertileEnd.getDate()+1); rangeDays(perStart, perEnd).forEach(d => { if(inMonth(d, year, month)) periodSet.add(fmtKey(d)); }); rangeDays(fertileStart, fertileEnd).forEach(d => { if(inMonth(d, year, month)) fertileSet.add(fmtKey(d)); }); if(inMonth(ovul, year, month)) ovulSet.add(fmtKey(ovul)); t.setDate(t.getDate() + effLen); if(perStart > viewEnd) break; }
  return { period:periodSet, fertile:fertileSet, ovul:ovulSet, actualStarts };
}

function updateCycleSummary(){ const { start, len, period, luteal, adv } = getCycle(); const { avgLen, avgPeriod, samples, stdev } = computeAverages(); const baseLen = clamp(parseInt((avgLen || len),10),20,40); const log = loadCycleLog(); let last = null; if(log.length){ last = parseKey(log.sort().slice(-1)[0]); } else if(start){ last = new Date(start.getFullYear(), start.getMonth(), start.getDate()); } let nextPeriod='–', nextOv='–'; if(last){ const next = new Date(last); next.setDate(next.getDate()+baseLen); const ov = new Date(next); ov.setDate(ov.getDate() - (adv ? luteal : 14)); nextPeriod = next.toLocaleDateString('en-US'); nextOv = ov.toLocaleDateString('en-US'); } $('#nextPeriod').textContent = nextPeriod; $('#nextOvul').textContent = nextOv; $('#avgLen').textContent = `Avg cycle: ${avgLen? avgLen+' days': '–'}`; $('#avgPeriod').textContent = `Avg period: ${avgPeriod} days`; $('#samples').textContent = `Samples: ${samples}`; const conf = stdev!=null ? `±${Math.max(1,Math.round(stdev))}d` : '–'; document.getElementById('confRange').textContent = `Confidence: ${conf}`; const irreg = (stdev!=null && avgLen) ? Math.min(100, Math.round((stdev/avgLen)*100)) : '–'; document.getElementById('irreg').textContent = `Irregularity: ${irreg=== '–' ? '–' : irreg+'%'}`; }

function fmtKey(d){ return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function parseKey(k){ const [Y,M,D]=k.split('-').map(n=>parseInt(n,10)); return new Date(Y,(M-1),D); }
function inMonth(d,y,m){ return d.getFullYear()===y && d.getMonth()===m; }
function rangeDays(a,b){ const out=[]; const d=new Date(a); while(d<=b){ out.push(new Date(d)); d.setDate(d.getDate()+1);} return out; }


