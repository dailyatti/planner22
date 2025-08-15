/**
 * Cherry Planner Premium - AI Coach (Perplexity Sonar Pro)
 * Optional integration: analyzes local stats and provides chat-based coaching.
 */

import { computeStats } from './stats.js';
import { get, set } from './storage.js';

const AI_NS = 'ai';

export function initAI() {
  addAIMenuButton();
  exposePublicAPI();
}

function addAIMenuButton() {
  const menu = document.getElementById('menu') || document.querySelector('.menu');
  if (!menu || menu.querySelector('#btnAI')) return;
  const btn = document.createElement('button');
  btn.id = 'btnAI';
  btn.className = 'btn-ghost';
  btn.textContent = '🤖 AI Coach';
  btn.addEventListener('click', openAIModal);
  menu.appendChild(btn);
}

export function openAIModal() {
  const { openModal } = window.cherryUI || {};
  if (!openModal) return;

  const hasKey = !!get(AI_NS, 'pplx_key', '');
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="display:flex; flex-direction: column; gap: 1rem;">
      <div>
        <label style="font-weight:600;">Perplexity API Key</label>
        <input id="aiKeyInput" type="password" placeholder="pplx-..." style="width:100%; padding:8px; border:1px solid #eee; border-radius:8px;" value="${hasKey ? '••••••••' : ''}" />
        <small>Model: Sonar Pro. A kulcsot lokálisan tároljuk (localStorage).</small>
        <div style="margin-top:6px;"><a href="ai-setup.html" target="_blank">Beállítás útmutató</a></div>
      </div>
      <div>
        <label style="font-weight:600;">Elemzési időtáv</label>
        <select id="aiRange" style="padding:8px; border:1px solid #eee; border-radius:8px;">
          <option value="7">Utolsó 7 nap</option>
          <option value="30">Utolsó 30 nap</option>
          <option value="custom">Egyedi</option>
        </select>
        <div id="aiCustomRange" style="display:none; gap:.5rem; margin-top:.5rem;">
          <input type="date" id="aiStart" />
          <span>→</span>
          <input type="date" id="aiEnd" />
        </div>
      </div>
      <div>
        <textarea id="aiPrompt" rows="3" placeholder="Kérdésed az AI Coachhoz…" style="width:100%; padding:10px; border:1px solid #eee; border-radius:8px;"></textarea>
      </div>
      <div id="aiChat" style="border:1px solid #f3d; border-radius:12px; padding:12px; max-height:300px; overflow:auto; background:white;"></div>
    </div>
  `;

  const actions = [
    { text: 'Bezárás', primary: false, handler: () => {} },
    { text: 'Elemzés + Válasz', primary: true, handler: async () => {
      await handleAIAnalyze(content);
    }}
  ];

  openModal({ title: '🤖 AI Coach – Sonar Pro', content, actions });

  // Range UI
  const range = content.querySelector('#aiRange');
  const customWrap = content.querySelector('#aiCustomRange');
  range.addEventListener('change', () => {
    customWrap.style.display = range.value === 'custom' ? 'flex' : 'none';
  });
}

async function handleAIAnalyze(root) {
  const pplxKeyInput = root.querySelector('#aiKeyInput');
  const promptEl = root.querySelector('#aiPrompt');
  const chat = root.querySelector('#aiChat');
  const rangeSel = root.querySelector('#aiRange');
  const start = root.querySelector('#aiStart')?.value || null;
  const end = root.querySelector('#aiEnd')?.value || null;

  // Save API key if provided
  const masked = '••••';
  if (pplxKeyInput && pplxKeyInput.value && !pplxKeyInput.value.startsWith(masked)) {
    set(AI_NS, 'pplx_key', pplxKeyInput.value.trim());
    pplxKeyInput.value = masked;
  }
  const apiKey = get(AI_NS, 'pplx_key', '');
  if (!apiKey) {
    appendMsg(chat, 'system', 'Adj meg egy Perplexity API kulcsot a használathoz.');
    return;
  }

  appendMsg(chat, 'user', promptEl.value || 'Elemezd a hangulat- és vízivási statisztikáimat, adj konkrét tanácsot.');

  // Build stats payload
  const stats = await computeStats(rangeSel.value, start, end);
  const summary = buildStatsSummary(stats);

  // Call Perplexity
  const result = await callPerplexity(apiKey, summary, promptEl.value || 'Kérlek, adj személyre szabott elemzést és tanácsot.');
  appendMsg(chat, 'assistant', result || 'Nem sikerült választ kapni.');
}

function buildStatsSummary(stats) {
  return {
    period: stats.dateRange,
    moodAverages: stats.mood.averages,
    moodTrends: stats.mood.trends,
    water: {
      averageGoal: stats.water.averageGoal,
      averageDrank: stats.water.averageDrank,
      completionRate: stats.water.completionRate
    },
    balanceAvg: Math.round((stats.balance.reduce((s, b) => s + b.index, 0) / stats.balance.length) * 100) / 100,
    insights: stats.insights
  };
}

async function callPerplexity(apiKey, statsSummary, userPrompt) {
  try {
    const messages = [
      { role: 'system', content: 'You are Cherry Planner AI Coach. Analyze mood, hydration, and cycle context to give precise, empathetic, and actionable advice. Keep answers concise and structured.' },
      { role: 'user', content: `STATS JSON:\n${JSON.stringify(statsSummary)}\n\nQUESTION:\n${userPrompt}` }
    ];

    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages,
        temperature: 0.4,
        max_tokens: 700
      })
    });

    if (!resp.ok) {
      return `API hiba: ${resp.status}`;
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return text;
  } catch (e) {
    return `Hálózati hiba: ${e.message}`;
  }
}

function appendMsg(chat, role, text) {
  const row = document.createElement('div');
  row.style.margin = '6px 0';
  row.innerHTML = `<div style="background:${role==='assistant' ? '#fdf2f8' : role==='system' ? '#fff7ed' : '#f1f5f9'}; border:1px solid #f3d; border-radius:10px; padding:8px;">${escapeHtml(text)}</div>`;
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function escapeHtml(str='') {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML.replace(/\n/g, '<br>');
}

function exposePublicAPI() {
  window.cherryPremium = window.cherryPremium || {};
  window.cherryPremium.ai = {
    open: openAIModal
  };
}

export default initAI;


