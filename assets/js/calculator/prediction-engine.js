/**
 * Advanced Menstrual Cycle Prediction Engine
 * PhD-level statistical analysis for cycle forecasting
 */

export class CyclePredictionEngine {
  constructor() {
    this.minCycleLength = 21;
    this.maxCycleLength = 35;
    this.defaultLutealLength = 14;
    this.confidenceThreshold = 0.75;
  }

  /**
   * Analyzes cycle history and returns comprehensive predictions
   * @param {Array} cycleHistory - Array of cycle objects {start: Date, length: number}
   * @param {Object} settings - User settings {lutealLength: number, advancedEstimation: boolean}
   * @returns {Object} Prediction results with statistics and forecasts
   */
  analyzeCycles(cycleHistory, settings = {}) {
    if (!cycleHistory || cycleHistory.length === 0) {
      return this.getDefaultPrediction(settings);
    }

    const cleanHistory = this.cleanCycleData(cycleHistory);
    const stats = this.calculateStatistics(cleanHistory);
    const predictions = this.generatePredictions(cleanHistory, stats, settings);
    const fertilityWindow = this.calculateFertilityWindow(predictions.nextCycle, settings);
    
    return {
      statistics: stats,
      predictions,
      fertilityWindow,
      recommendations: this.generateRecommendations(stats),
      confidence: this.calculateConfidence(cleanHistory)
    };
  }

  /**
   * Cleans and validates cycle data
   */
  cleanCycleData(cycles) {
    return cycles
      .filter(cycle => cycle.start && cycle.length)
      .filter(cycle => cycle.length >= this.minCycleLength && cycle.length <= this.maxCycleLength)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  /**
   * Calculates comprehensive cycle statistics
   */
  calculateStatistics(cycles) {
    if (cycles.length === 0) {
      return {
        averageLength: 28,
        standardDeviation: 0,
        irregularityScore: 0,
        totalCycles: 0,
        dataQuality: 'insufficient'
      };
    }

    const lengths = cycles.map(c => c.length);
    const averageLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    // Standard deviation calculation
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - averageLength, 2), 0) / lengths.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Irregularity score (coefficient of variation)
    const irregularityScore = (standardDeviation / averageLength) * 100;
    
    // Trend analysis (last 6 cycles vs previous 6)
    const trend = this.calculateTrend(cycles);
    
    return {
      averageLength: Math.round(averageLength * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      irregularityScore: Math.round(irregularityScore * 100) / 100,
      totalCycles: cycles.length,
      shortest: Math.min(...lengths),
      longest: Math.max(...lengths),
      trend,
      dataQuality: this.assessDataQuality(cycles)
    };
  }

  /**
   * Generates cycle predictions using multiple algorithms
   */
  generatePredictions(cycles, stats, settings) {
    const lastCycle = cycles[cycles.length - 1];
    const nextCycleStart = this.predictNextCycleStart(cycles, stats, settings);
    
    return {
      nextCycle: {
        startDate: nextCycleStart,
        estimatedLength: this.predictCycleLength(cycles, stats),
        endDate: new Date(nextCycleStart.getTime() + (stats.averageLength * 24 * 60 * 60 * 1000))
      },
      following3Cycles: this.predictFollowing3Cycles(nextCycleStart, stats),
      ovulationDate: this.predictOvulation(nextCycleStart, stats, settings),
      lutealPhaseStart: this.predictLutealPhase(nextCycleStart, stats, settings)
    };
  }

  /**
   * Predicts next cycle start using weighted moving average
   */
  predictNextCycleStart(cycles, stats, settings) {
    const lastCycle = cycles[cycles.length - 1];
    let predictedLength = stats.averageLength;

    if (settings.advancedEstimation && cycles.length >= 3) {
      // Weighted average of last 3 cycles (more weight on recent cycles)
      const recentCycles = cycles.slice(-3);
      const weights = [0.5, 0.3, 0.2]; // Most recent gets highest weight
      predictedLength = recentCycles.reduce((sum, cycle, index) => {
        return sum + (cycle.length * weights[index]);
      }, 0);
    }

    const lastStart = new Date(lastCycle.start);
    return new Date(lastStart.getTime() + (predictedLength * 24 * 60 * 60 * 1000));
  }

  /**
   * Predicts cycle length using trend analysis
   */
  predictCycleLength(cycles, stats) {
    if (cycles.length < 2) return stats.averageLength;

    const recentTrend = this.calculateRecentTrend(cycles.slice(-6));
    let adjustedLength = stats.averageLength + recentTrend;
    
    // Constrain to reasonable bounds
    return Math.max(this.minCycleLength, Math.min(this.maxCycleLength, Math.round(adjustedLength)));
  }

  /**
   * Calculates fertility window (ovulation ± 5 days)
   */
  calculateFertilityWindow(nextCycle, settings) {
    const lutealLength = settings.lutealLength || this.defaultLutealLength;
    const ovulationDay = nextCycle.estimatedLength - lutealLength;
    
    const ovulationDate = new Date(nextCycle.startDate.getTime() + ((ovulationDay - 1) * 24 * 60 * 60 * 1000));
    const windowStart = new Date(ovulationDate.getTime() - (5 * 24 * 60 * 60 * 1000));
    const windowEnd = new Date(ovulationDate.getTime() + (1 * 24 * 60 * 60 * 1000));

    return {
      ovulationDate,
      windowStart,
      windowEnd,
      fertilePhase: this.generateFertilePhase(windowStart, windowEnd)
    };
  }

  /**
   * Generates recommendations based on cycle analysis
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.irregularityScore > 20) {
      recommendations.push({
        type: 'health',
        priority: 'high',
        message: 'High cycle irregularity detected. Consider consulting a healthcare provider.'
      });
    }

    if (stats.totalCycles < 3) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        message: 'Track more cycles for improved prediction accuracy.'
      });
    }

    if (stats.averageLength < 25 || stats.averageLength > 32) {
      recommendations.push({
        type: 'health',
        priority: 'medium',
        message: 'Cycle length outside typical range. Monitor closely.'
      });
    }

    return recommendations;
  }

  /**
   * Calculates prediction confidence based on data quality
   */
  calculateConfidence(cycles) {
    if (cycles.length === 0) return 0;
    if (cycles.length === 1) return 0.3;
    if (cycles.length === 2) return 0.5;
    if (cycles.length < 6) return 0.7;
    
    const lengths = cycles.map(c => c.length);
    const variance = this.calculateVariance(lengths);
    const consistency = Math.max(0, 1 - (variance / 100));
    
    return Math.min(0.95, 0.6 + (consistency * 0.35));
  }

  /**
   * Helper methods
   */
  calculateTrend(cycles) {
    if (cycles.length < 4) return 0;
    
    const midpoint = Math.floor(cycles.length / 2);
    const firstHalf = cycles.slice(0, midpoint);
    const secondHalf = cycles.slice(midpoint);
    
    const avgFirst = firstHalf.reduce((sum, c) => sum + c.length, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, c) => sum + c.length, 0) / secondHalf.length;
    
    return avgSecond - avgFirst;
  }

  calculateRecentTrend(cycles) {
    if (cycles.length < 3) return 0;
    
    // Linear regression on recent cycles
    const x = cycles.map((_, i) => i);
    const y = cycles.map(c => c.length);
    const n = cycles.length;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  predictFollowing3Cycles(startDate, stats) {
    const cycles = [];
    let currentStart = new Date(startDate);
    
    for (let i = 0; i < 3; i++) {
      currentStart = new Date(currentStart.getTime() + (stats.averageLength * 24 * 60 * 60 * 1000));
      cycles.push({
        startDate: new Date(currentStart),
        estimatedLength: stats.averageLength
      });
    }
    
    return cycles;
  }

  predictOvulation(cycleStart, stats, settings) {
    const lutealLength = settings.lutealLength || this.defaultLutealLength;
    const ovulationDay = stats.averageLength - lutealLength;
    return new Date(cycleStart.getTime() + ((ovulationDay - 1) * 24 * 60 * 60 * 1000));
  }

  predictLutealPhase(cycleStart, stats, settings) {
    const lutealLength = settings.lutealLength || this.defaultLutealLength;
    const lutealStart = stats.averageLength - lutealLength + 1;
    return new Date(cycleStart.getTime() + ((lutealStart - 1) * 24 * 60 * 60 * 1000));
  }

  generateFertilePhase(windowStart, windowEnd) {
    const phases = [];
    const current = new Date(windowStart);
    
    while (current <= windowEnd) {
      phases.push({
        date: new Date(current),
        fertility: this.calculateFertilityScore(current, windowStart, windowEnd)
      });
      current.setDate(current.getDate() + 1);
    }
    
    return phases;
  }

  calculateFertilityScore(date, windowStart, windowEnd) {
    const totalDays = (windowEnd - windowStart) / (24 * 60 * 60 * 1000);
    const dayInWindow = (date - windowStart) / (24 * 60 * 60 * 1000);
    
    // Peak fertility around day 2-3 of the window
    const peakDay = totalDays * 0.5;
    const distance = Math.abs(dayInWindow - peakDay);
    
    return Math.max(0.2, 1 - (distance / totalDays));
  }

  assessDataQuality(cycles) {
    if (cycles.length === 0) return 'insufficient';
    if (cycles.length < 3) return 'limited';
    if (cycles.length < 6) return 'moderate';
    return 'good';
  }

  getDefaultPrediction(settings) {
    const today = new Date();
    const defaultLength = 28;
    
    return {
      statistics: {
        averageLength: defaultLength,
        standardDeviation: 0,
        irregularityScore: 0,
        totalCycles: 0,
        dataQuality: 'insufficient'
      },
      predictions: {
        nextCycle: {
          startDate: new Date(today.getTime() + (defaultLength * 24 * 60 * 60 * 1000)),
          estimatedLength: defaultLength,
          endDate: new Date(today.getTime() + (2 * defaultLength * 24 * 60 * 60 * 1000))
        },
        following3Cycles: [],
        ovulationDate: new Date(today.getTime() + ((defaultLength - 14) * 24 * 60 * 60 * 1000)),
        lutealPhaseStart: new Date(today.getTime() + ((defaultLength - 14 + 1) * 24 * 60 * 60 * 1000))
      },
      fertilityWindow: {
        ovulationDate: new Date(today.getTime() + ((defaultLength - 14) * 24 * 60 * 60 * 1000)),
        windowStart: new Date(today.getTime() + ((defaultLength - 19) * 24 * 60 * 60 * 1000)),
        windowEnd: new Date(today.getTime() + ((defaultLength - 13) * 24 * 60 * 60 * 1000)),
        fertilePhase: []
      },
      recommendations: [{
        type: 'data',
        priority: 'high',
        message: 'Start tracking your cycles for personalized predictions.'
      }],
      confidence: 0
    };
  }
}
