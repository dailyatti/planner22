export const $ = (sel, parent=document) => parent.querySelector(sel);
export const $$ = (sel, parent=document) => Array.from(parent.querySelectorAll(sel));
export const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
export const debounce = (fn, d=400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); } };
export function showToast(msg){ const el = document.getElementById('toast'); if(!el) return; el.textContent = msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 2200); }
export function escapeHtml(input){ const s = (input && typeof input === 'object' && 'type' in input) ? '' : String(input ?? ''); return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }


