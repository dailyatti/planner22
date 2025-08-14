import { $, $$ } from './utils.js';

let onChange = () => {};
let state = { text:'' };

export function initNotes(save){
  onChange = save || (()=>{});
  const area = $('#notes'); const meta = $('#notesMeta');
  function autosize(){ area.style.height='auto'; area.style.height = Math.min(area.scrollHeight, window.innerHeight*0.6) + 'px'; }
  function updateMeta(){ const text = area.value.trim(); const words = text ? text.split(/\s+/).length : 0; const chars = text.length; meta.textContent = `${words} words • ${chars} chars`; }
  area.addEventListener('input', ()=>{ state.text = area.value; autosize(); updateMeta(); onChange(); });
  $$('.tool-btn[data-ins]').forEach(btn=> btn.addEventListener('click', ()=> insertAtCursor(area, btn.dataset.ins)));
  const boldBtn = $('.tool-btn[data-format="**"]'); if(boldBtn) boldBtn.addEventListener('click', ()=> wrapSelection(area, '**'));
  $('#exportTxt').addEventListener('click', ()=>{ const blob = new Blob([area.value], {type:'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `notes-${$('#plannerDate').value||'today'}.txt`; a.click(); URL.revokeObjectURL(a.href); });
  autosize(); updateMeta();
}

export function getNotesState(){ return { ...state }; }
export function setNotesState(s){ state.text = s?.text || ''; const area = $('#notes'); area.value = state.text; const evt = new Event('input', {bubbles:true}); area.dispatchEvent(evt); }

function insertAtCursor(el, text){ const s = el.selectionStart; const e = el.selectionEnd; const v = el.value; el.value = v.slice(0,s) + text + v.slice(e); el.selectionStart = el.selectionEnd = s + text.length; el.focus(); const evt = new Event('input', {bubbles:true}); el.dispatchEvent(evt); }
function wrapSelection(el, wrapper){ const s = el.selectionStart; const e = el.selectionEnd; const v = el.value; const sel = v.slice(s,e); const insert = `${wrapper}${sel||''}${wrapper}`; el.value = v.slice(0,s) + insert + v.slice(e); const newPos = s + wrapper.length + (sel? sel.length : 0); el.focus(); el.selectionStart = el.selectionEnd = newPos; const evt = new Event('input', {bubbles:true}); el.dispatchEvent(evt); }


