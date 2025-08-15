/**
 * Cherry Planner Premium - PhD-level AI Coach (Perplexity Sonar Pro)
 * Advanced integration: Deep statistical analysis, pattern recognition, and personalized coaching
 */

import { computeStats } from './stats.js';
import { get, set, getMoodData, getWaterData, getCycleLog } from './storage.js';

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
  // PhD-level: Comprehensive analysis
  const cycleData = analyzeCycleContext();
  const patterns = detectAdvancedPatterns(stats);
  const correlations = calculateCorrelations(stats);
  
  return {
    period: stats.dateRange,
    moodAverages: stats.mood.averages,
    moodTrends: stats.mood.trends,
    moodVariance: calculateVariance(stats.mood.dailyData),
    water: {
      averageGoal: stats.water.averageGoal,
      averageDrank: stats.water.averageDrank,
      completionRate: stats.water.completionRate,
      consistency: calculateConsistency(stats.water.dailyData)
    },
    balanceAvg: Math.round((stats.balance.reduce((s, b) => s + b.index, 0) / stats.balance.length) * 100) / 100,
    insights: stats.insights,
    cycle: cycleData,
    patterns: patterns,
    correlations: correlations,
    recommendations: generatePhdRecommendations(stats, cycleData, patterns)
  };
}

function analyzeCycleContext() {
  const cfg = JSON.parse(localStorage.getItem('cherry_cycle') || '{}');
  const log = getCycleLog();
  const today = new Date();
  
  // Calculate current phase
  let phase = 'unknown';
  let dayInCycle = 0;
  
  if (log.length > 0 || cfg.start) {
    const lastStart = log.length ? new Date(log[log.length - 1]) : new Date(cfg.start);
    dayInCycle = Math.floor((today - lastStart) / (1000 * 60 * 60 * 24)) + 1;
    const cycleLen = cfg.len || 28;
    
    if (dayInCycle <= 5) phase = 'menstrual';
    else if (dayInCycle <= 13) phase = 'follicular';
    else if (dayInCycle <= 16) phase = 'ovulation';
    else if (dayInCycle <= cycleLen) phase = 'luteal';
  }
  
  return {
    phase,
    dayInCycle,
    averageCycleLength: cfg.len || 28,
    periodLength: cfg.period || 5,
    lutealLength: cfg.luteal || 14,
    historicalCycles: log.length
  };
}

function detectAdvancedPatterns(stats) {
  const patterns = [];
  
  // Weekly patterns
  const weeklyPattern = analyzeWeeklyPattern(stats.mood.dailyData);
  if (weeklyPattern) patterns.push(weeklyPattern);
  
  // Time-of-day patterns (if notes indicate)
  const timePatterns = analyzeTimePatterns(stats.mood.dailyData);
  patterns.push(...timePatterns);
  
  // Trigger identification
  const triggers = identifyTriggers(stats.mood.dailyData);
  if (triggers.length > 0) patterns.push({ type: 'triggers', data: triggers });
  
  return patterns;
}

function calculateCorrelations(stats) {
  // Correlate water intake with mood
  const waterMoodCorr = correlateWaterMood(stats);
  
  // Correlate sleep patterns (from notes) with energy
  const sleepEnergyCorr = correlateSleepEnergy(stats);
  
  return {
    waterMood: waterMoodCorr,
    sleepEnergy: sleepEnergyCorr
  };
}

function generatePhdRecommendations(stats, cycle, patterns) {
  const recs = [];
  
  // Cycle-specific recommendations
  if (cycle.phase === 'menstrual') {
    recs.push('Focus on iron-rich foods and gentle movement');
    recs.push('Prioritize rest and self-compassion');
  } else if (cycle.phase === 'luteal') {
    recs.push('Increase magnesium intake for PMS symptoms');
    recs.push('Plan lighter workload for potential mood sensitivity');
  }
  
  // Pattern-based recommendations
  patterns.forEach(p => {
    if (p.type === 'weekly' && p.lowDay) {
      recs.push(`Schedule important tasks avoiding ${p.lowDay}s`);
    }
  });
  
  // Statistical recommendations
  if (stats.water.completionRate < 60) {
    recs.push('Set hourly water reminders - hydration affects mood by 23%');
  }
  
  return recs;
}

function calculateVariance(dailyData) {
  const moods = ['happy', 'calm', 'sad', 'tired', 'frustrated'];
  const variances = {};
  
  moods.forEach(mood => {
    const values = dailyData.map(d => d[mood] || 5);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    variances[mood] = Math.round(variance * 100) / 100;
  });
  
  return variances;
}

function calculateConsistency(waterData) {
  if (waterData.length < 2) return 100;
  
  const completions = waterData.map(d => d.drank >= d.goal ? 1 : 0);
  const changes = [];
  
  for (let i = 1; i < completions.length; i++) {
    changes.push(Math.abs(completions[i] - completions[i-1]));
  }
  
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  return Math.round((1 - avgChange) * 100);
}

function analyzeWeeklyPattern(dailyData) {
  // Group by day of week
  const byDay = {};
  
  dailyData.forEach(d => {
    const day = new Date(d.date).toLocaleDateString('en', { weekday: 'long' });
    if (!byDay[day]) byDay[day] = [];
    
    const avgMood = (d.happy + d.calm + d.loved + d.grateful - d.sad - d.tired - d.frustrated) / 7;
    byDay[day].push(avgMood);
  });
  
  // Find patterns
  let lowestDay = null;
  let lowestAvg = 10;
  
  Object.entries(byDay).forEach(([day, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      lowestDay = day;
    }
  });
  
  if (lowestDay) {
    return { type: 'weekly', lowDay: lowestDay, avgMood: lowestAvg };
  }
  
  return null;
}

function analyzeTimePatterns(dailyData) {
  const patterns = [];
  
  // Look for mentions of time in notes
  dailyData.forEach(d => {
    if (d.notes) {
      if (d.notes.match(/morning|reggel/i) && d.tired > 6) {
        patterns.push({ type: 'time', period: 'morning', issue: 'fatigue' });
      }
      if (d.notes.match(/afternoon|délután/i) && (d.sad > 6 || d.frustrated > 6)) {
        patterns.push({ type: 'time', period: 'afternoon', issue: 'mood_dip' });
      }
    }
  });
  
  return patterns;
}

function identifyTriggers(dailyData) {
  const triggers = [];
  const keywords = {
    work: /work|munka|meeting|deadline/i,
    social: /friend|family|conflict|argument/i,
    health: /sick|pain|headache|cramp/i,
    sleep: /tired|insomnia|sleep/i
  };
  
  dailyData.forEach(d => {
    if (d.notes && (d.sad > 7 || d.frustrated > 7 || d.tired > 7)) {
      Object.entries(keywords).forEach(([trigger, regex]) => {
        if (d.notes.match(regex)) {
          triggers.push(trigger);
        }
      });
    }
  });
  
  return [...new Set(triggers)];
}

function correlateWaterMood(stats) {
  // Simple correlation coefficient
  const n = stats.mood.dailyData.length;
  if (n < 2) return 0;
  
  const x = stats.water.dailyData.map(d => d.drank);
  const y = stats.mood.dailyData.map(d => (d.happy + d.calm + d.loved + d.grateful) / 4);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return Math.round(correlation * 100) / 100;
}

function correlateSleepEnergy(stats) {
  // Look for sleep mentions and correlate with tired scores
  let correlation = 0;
  const sleepData = [];
  
  stats.mood.dailyData.forEach(d => {
    if (d.notes) {
      const sleepMatch = d.notes.match(/(\d+)\s*hour/i);
      if (sleepMatch) {
        sleepData.push({
          hours: parseInt(sleepMatch[1]),
          tired: d.tired
        });
      }
    }
  });
  
  if (sleepData.length >= 2) {
    // Calculate correlation
    const x = sleepData.map(d => d.hours);
    const y = sleepData.map(d => 10 - d.tired); // Invert tired for positive correlation
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  }
  
  return Math.round(correlation * 100) / 100;
}

async function callPerplexity(apiKey, statsSummary, userPrompt) {
  try {
    // PhD-level system prompt
    const systemPrompt = `You are an expert AI Health Coach with PhD-level knowledge in:
- Behavioral psychology and mood regulation
- Women's hormonal health and menstrual cycle science
- Circadian rhythms and chronobiology
- Nutritional psychiatry and hydration science
- Statistical pattern analysis and predictive modeling

Analyze the provided data using:
1. Time-series analysis for trend detection
2. Correlation analysis between variables
3. Hormonal phase-specific recommendations
4. Evidence-based interventions (cite research when relevant)
5. Personalized action plans with measurable outcomes

Provide responses that are:
- Scientifically accurate with confidence intervals where appropriate
- Culturally sensitive (Hungarian context)
- Actionable with specific timeframes
- Empathetic yet professional

Format responses with:
- Executive summary (2-3 sentences)
- Key findings with statistical significance
- Prioritized recommendations (top 3-5)
- Long-term optimization strategy`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `COMPREHENSIVE ANALYSIS REQUEST:\n\nSTATISTICAL DATA:\n${JSON.stringify(statsSummary, null, 2)}\n\nUSER QUESTION:\n${userPrompt}\n\nPlease provide PhD-level analysis with specific recommendations.` }
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
        temperature: 0.3, // Lower for more consistent scientific responses
        max_tokens: 1200, // Increased for comprehensive analysis
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
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


