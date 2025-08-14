/**
 * Cycle Data Analyzer
 * Handles cycle data analysis, pattern recognition, and health insights
 */

import { CyclePredictionEngine } from './prediction-engine.js';

export class CycleAnalyzer {
  constructor() {
    this.predictionEngine = new CyclePredictionEngine();
    this.healthThresholds = {
      veryShort: 21,
      short: 25,
      normal: [25, 32],
      long: 35,
      veryLong: 38
    };
  }

  /**
   * Comprehensive cycle analysis with health insights
   */
  analyzeFullProfile(cycleData, symptoms = {}, settings = {}) {
    const prediction = this.predictionEngine.analyzeCycles(cycleData, settings);
    const healthInsights = this.generateHealthInsights(cycleData, symptoms);
    const patterns = this.detectPatterns(cycleData);
    const riskAssessment = this.assessHealthRisks(cycleData, symptoms);
    
    return {
      ...prediction,
      healthInsights,
      patterns,
      riskAssessment,
      cycleProfile: this.createCycleProfile(cycleData)
    };
  }

  /**
   * Generates health insights based on cycle data
   */
  generateHealthInsights(cycles, symptoms) {
    const insights = [];
    
    if (cycles.length === 0) {
      return [{
        category: 'tracking',
        severity: 'info',
        title: 'Start Your Journey',
        message: 'Begin tracking to unlock personalized health insights.',
        actionable: true
      }];
    }

    // Cycle length analysis
    const lengths = cycles.map(c => c.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    if (avgLength < this.healthThresholds.veryShort) {
      insights.push({
        category: 'cycle_length',
        severity: 'warning',
        title: 'Very Short Cycles',
        message: 'Cycles under 21 days may indicate hormonal imbalances.',
        recommendation: 'Consider consulting a healthcare provider.'
      });
    } else if (avgLength > this.healthThresholds.veryLong) {
      insights.push({
        category: 'cycle_length',
        severity: 'warning',
        title: 'Very Long Cycles',
        message: 'Cycles over 38 days may need medical evaluation.',
        recommendation: 'Track symptoms and consult a healthcare provider.'
      });
    }

    // Irregularity analysis
    const variance = this.calculateVariance(lengths);
    if (variance > 49) { // Standard deviation > 7 days
      insights.push({
        category: 'regularity',
        severity: 'caution',
        title: 'Irregular Cycles',
        message: 'High variation in cycle length detected.',
        recommendation: 'Track lifestyle factors that might influence cycles.'
      });
    }

    // Symptom analysis
    if (symptoms.severePain) {
      insights.push({
        category: 'symptoms',
        severity: 'warning',
        title: 'Severe Pain',
        message: 'Severe menstrual pain may indicate underlying conditions.',
        recommendation: 'Discuss pain management with your doctor.'
      });
    }

    return insights;
  }

  /**
   * Detects patterns in cycle data
   */
  detectPatterns(cycles) {
    if (cycles.length < 6) {
      return { insufficient_data: true };
    }

    const patterns = {
      seasonal: this.detectSeasonalPatterns(cycles),
      trending: this.detectTrendingPatterns(cycles),
      cyclical: this.detectCyclicalPatterns(cycles),
      outliers: this.detectOutliers(cycles)
    };

    return patterns;
  }

  /**
   * Detects seasonal variations
   */
  detectSeasonalPatterns(cycles) {
    const seasonalData = { spring: [], summer: [], autumn: [], winter: [] };
    
    cycles.forEach(cycle => {
      const month = new Date(cycle.start).getMonth();
      if (month >= 2 && month <= 4) seasonalData.spring.push(cycle.length);
      else if (month >= 5 && month <= 7) seasonalData.summer.push(cycle.length);
      else if (month >= 8 && month <= 10) seasonalData.autumn.push(cycle.length);
      else seasonalData.winter.push(cycle.length);
    });

    const seasonalAvgs = {};
    Object.keys(seasonalData).forEach(season => {
      if (seasonalData[season].length > 0) {
        seasonalAvgs[season] = seasonalData[season].reduce((a, b) => a + b, 0) / seasonalData[season].length;
      }
    });

    return seasonalAvgs;
  }

  /**
   * Detects trending patterns
   */
  detectTrendingPatterns(cycles) {
    const recentCycles = cycles.slice(-6);
    const olderCycles = cycles.slice(0, -6);
    
    if (olderCycles.length === 0) return null;

    const recentAvg = recentCycles.reduce((a, b) => a + b.length, 0) / recentCycles.length;
    const olderAvg = olderCycles.reduce((a, b) => a + b.length, 0) / olderCycles.length;
    
    const trend = recentAvg - olderAvg;
    
    return {
      direction: trend > 1 ? 'lengthening' : trend < -1 ? 'shortening' : 'stable',
      magnitude: Math.abs(trend),
      significance: Math.abs(trend) > 2 ? 'significant' : 'minor'
    };
  }

  /**
   * Detects cyclical patterns (e.g., every other cycle longer)
   */
  detectCyclicalPatterns(cycles) {
    if (cycles.length < 8) return null;

    const lengths = cycles.map(c => c.length);
    const evenCycles = lengths.filter((_, i) => i % 2 === 0);
    const oddCycles = lengths.filter((_, i) => i % 2 === 1);
    
    const evenAvg = evenCycles.reduce((a, b) => a + b, 0) / evenCycles.length;
    const oddAvg = oddCycles.reduce((a, b) => a + b, 0) / oddCycles.length;
    
    const difference = Math.abs(evenAvg - oddAvg);
    
    return {
      detected: difference > 2,
      pattern: evenAvg > oddAvg ? 'even_longer' : 'odd_longer',
      difference: difference
    };
  }

  /**
   * Detects outlier cycles
   */
  detectOutliers(cycles) {
    const lengths = cycles.map(c => c.length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(this.calculateVariance(lengths));
    
    const outliers = cycles.filter(cycle => {
      const zScore = Math.abs(cycle.length - mean) / stdDev;
      return zScore > 2; // More than 2 standard deviations
    });

    return outliers.map(cycle => ({
      date: cycle.start,
      length: cycle.length,
      deviation: cycle.length - mean
    }));
  }

  /**
   * Assesses health risks based on patterns
   */
  assessHealthRisks(cycles, symptoms) {
    const risks = [];
    
    if (cycles.length === 0) return risks;

    const lengths = cycles.map(c => c.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = this.calculateVariance(lengths);

    // PCOS risk indicators
    if (avgLength > 35 || variance > 64) {
      risks.push({
        condition: 'PCOS',
        risk: 'moderate',
        indicators: ['long_cycles', 'irregular_cycles'],
        recommendation: 'Consider PCOS screening with healthcare provider'
      });
    }

    // Thyroid dysfunction indicators
    if (avgLength < 24 || avgLength > 38) {
      risks.push({
        condition: 'thyroid_dysfunction',
        risk: 'low_to_moderate',
        indicators: ['cycle_length_extremes'],
        recommendation: 'Thyroid function tests may be beneficial'
      });
    }

    // Hormonal imbalance indicators
    if (variance > 36) {
      risks.push({
        condition: 'hormonal_imbalance',
        risk: 'moderate',
        indicators: ['high_variability'],
        recommendation: 'Track lifestyle factors and consider hormone evaluation'
      });
    }

    return risks;
  }

  /**
   * Creates a comprehensive cycle profile
   */
  createCycleProfile(cycles) {
    if (cycles.length === 0) {
      return {
        status: 'no_data',
        message: 'Start tracking to build your cycle profile'
      };
    }

    const lengths = cycles.map(c => c.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = this.calculateVariance(lengths);
    
    let regularity;
    if (variance < 4) regularity = 'very_regular';
    else if (variance < 9) regularity = 'regular';
    else if (variance < 25) regularity = 'somewhat_irregular';
    else regularity = 'irregular';

    let lengthCategory;
    if (avgLength < this.healthThresholds.short) lengthCategory = 'short';
    else if (avgLength <= this.healthThresholds.normal[1]) lengthCategory = 'normal';
    else lengthCategory = 'long';

    return {
      averageLength: Math.round(avgLength * 10) / 10,
      regularity,
      lengthCategory,
      totalCycles: cycles.length,
      trackingPeriod: this.calculateTrackingPeriod(cycles),
      dataQuality: this.assessDataQuality(cycles),
      healthScore: this.calculateHealthScore(avgLength, variance, cycles.length)
    };
  }

  /**
   * Calculates tracking period in months
   */
  calculateTrackingPeriod(cycles) {
    if (cycles.length === 0) return 0;
    
    const firstCycle = new Date(cycles[0].start);
    const lastCycle = new Date(cycles[cycles.length - 1].start);
    
    return Math.round((lastCycle - firstCycle) / (1000 * 60 * 60 * 24 * 30.44));
  }

  /**
   * Assesses data quality
   */
  assessDataQuality(cycles) {
    if (cycles.length === 0) return 'none';
    if (cycles.length < 3) return 'insufficient';
    if (cycles.length < 6) return 'limited';
    if (cycles.length < 12) return 'good';
    return 'excellent';
  }

  /**
   * Calculates overall health score (0-100)
   */
  calculateHealthScore(avgLength, variance, cycleCount) {
    let score = 100;

    // Penalize for irregular cycles
    score -= Math.min(30, variance * 2);

    // Penalize for cycle length extremes
    if (avgLength < 25 || avgLength > 32) {
      score -= Math.min(20, Math.abs(avgLength - 28.5) * 2);
    }

    // Bonus for sufficient data
    if (cycleCount >= 6) score += 5;
    if (cycleCount >= 12) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Helper method to calculate variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  /**
   * Export analysis results for external use
   */
  exportAnalysis(analysisResults, format = 'json') {
    if (format === 'csv') {
      return this.convertToCSV(analysisResults);
    }
    
    return JSON.stringify(analysisResults, null, 2);
  }

  /**
   * Converts analysis to CSV format
   */
  convertToCSV(results) {
    const headers = ['Date', 'Cycle_Length', 'Predicted_Length', 'Health_Score', 'Notes'];
    const rows = [headers.join(',')];
    
    // Add cycle data rows
    if (results.statistics && results.statistics.totalCycles > 0) {
      // This would need actual cycle data passed in
      rows.push('# Cycle data would be exported here');
    }
    
    return rows.join('\n');
  }
}
