// Weekly summary report with insights
import { DailyFoodLog } from '../types';

export interface WeeklySummaryReport {
  weekRange: string;
  totalDaysLogged: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  targetAdherence: number; // Percentage
  bestDay: {
    date: string;
    reason: string;
  } | null;
  areasToImprove: string[];
  achievements: string[];
  insights: string[];
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  motivationalMessage: string;
}

export function generateWeeklySummary(weekLogs: DailyFoodLog[]): WeeklySummaryReport {
  const logsWithEntries = weekLogs.filter(log => log.entries && log.entries.length > 0);
  const totalDaysLogged = logsWithEntries.length;

  if (totalDaysLogged === 0) {
    return getEmptySummary();
  }

  // Calculate averages
  const totalCalories = logsWithEntries.reduce((sum, log) => sum + log.totals.calories, 0);
  const totalProtein = logsWithEntries.reduce((sum, log) => sum + log.totals.protein, 0);
  const totalCarbs = logsWithEntries.reduce((sum, log) => sum + log.totals.carbs, 0);
  const totalFat = logsWithEntries.reduce((sum, log) => sum + log.totals.fat, 0);

  const averageCalories = totalCalories / totalDaysLogged;
  const averageProtein = totalProtein / totalDaysLogged;
  const averageCarbs = totalCarbs / totalDaysLogged;
  const averageFat = totalFat / totalDaysLogged;

  // Calculate target adherence
  const adherenceScores = logsWithEntries.map(log => {
    const calorieScore = calculateAdherence(log.totals.calories, log.targets.calories);
    const proteinScore = calculateAdherence(log.totals.protein, log.targets.protein);
    const carbsScore = calculateAdherence(log.totals.carbs, log.targets.carbs);
    const fatScore = calculateAdherence(log.totals.fat, log.targets.fat);
    return (calorieScore + proteinScore + carbsScore + fatScore) / 4;
  });

  const targetAdherence = adherenceScores.reduce((sum, score) => sum + score, 0) / adherenceScores.length;

  // Find best day
  const bestDayIndex = adherenceScores.indexOf(Math.max(...adherenceScores));
  const bestDay = logsWithEntries[bestDayIndex];
  const bestDayFormatted = bestDay ? {
    date: formatDate(bestDay.date),
    reason: `${Math.round(adherenceScores[bestDayIndex])}% on target!`,
  } : null;

  // Analyze areas to improve
  const areasToImprove: string[] = [];
  const firstLog = logsWithEntries[0];

  if (averageProtein < firstLog.targets.protein * 0.9) {
    areasToImprove.push('Increase protein intake - aim for more lean meats, eggs, or protein powder');
  }

  if (totalDaysLogged < 5) {
    areasToImprove.push('Log more consistently - tracking 6-7 days/week gives best results');
  }

  const calorieVariance = calculateVariance(logsWithEntries.map(log => log.totals.calories));
  if (calorieVariance > 500) {
    areasToImprove.push('Aim for more consistent calorie intake each day');
  }

  // Detect achievements
  const achievements: string[] = [];

  if (totalDaysLogged === 7) {
    achievements.push('🔥 Perfect week - logged every single day!');
  } else if (totalDaysLogged >= 5) {
    achievements.push(`💪 Strong consistency - ${totalDaysLogged} days logged!`);
  }

  if (targetAdherence >= 90) {
    achievements.push('🎯 Excellent adherence to targets!');
  } else if (targetAdherence >= 75) {
    achievements.push('✅ Good adherence to targets!');
  }

  const proteinDaysOnTarget = logsWithEntries.filter(
    log => log.totals.protein >= log.targets.protein * 0.95
  ).length;

  if (proteinDaysOnTarget >= 5) {
    achievements.push('💪 Hit protein targets most days!');
  }

  // Generate insights
  const insights: string[] = [];

  const weekendLogs = logsWithEntries.filter(log => {
    const date = new Date(log.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });

  if (weekendLogs.length < 2) {
    insights.push('Consider logging on weekends too - helps maintain consistency!');
  }

  const mealCounts = logsWithEntries.map(log => log.entries?.length || 0);
  const avgMealsPerDay = mealCounts.reduce((sum, count) => sum + count, 0) / mealCounts.length;

  if (avgMealsPerDay < 3) {
    insights.push(`You're averaging ${avgMealsPerDay.toFixed(1)} meals/day - consider eating more frequently`);
  }

  if (targetAdherence >= 85 && totalDaysLogged >= 6) {
    insights.push("You're crushing it! Keep up this momentum and results will follow! 🚀");
  }

  // Determine overall grade
  let overallGrade: WeeklySummaryReport['overallGrade'];

  if (targetAdherence >= 90 && totalDaysLogged >= 6) {
    overallGrade = 'A';
  } else if (targetAdherence >= 80 && totalDaysLogged >= 5) {
    overallGrade = 'B';
  } else if (targetAdherence >= 70 && totalDaysLogged >= 4) {
    overallGrade = 'C';
  } else if (totalDaysLogged >= 3) {
    overallGrade = 'D';
  } else {
    overallGrade = 'F';
  }

  // Generate motivational message
  const motivationalMessage = getMotivationalMessage(overallGrade, totalDaysLogged, targetAdherence);

  // Get week range
  const dates = logsWithEntries.map(log => new Date(log.date));
  const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const weekRange = `${formatDate(earliestDate.toISOString())} - ${formatDate(latestDate.toISOString())}`;

  return {
    weekRange,
    totalDaysLogged,
    averageCalories: Math.round(averageCalories),
    averageProtein: Math.round(averageProtein),
    averageCarbs: Math.round(averageCarbs),
    averageFat: Math.round(averageFat),
    targetAdherence: Math.round(targetAdherence),
    bestDay: bestDayFormatted,
    areasToImprove: areasToImprove.slice(0, 3),
    achievements,
    insights: insights.slice(0, 3),
    overallGrade,
    motivationalMessage,
  };
}

function calculateAdherence(actual: number, target: number): number {
  if (target === 0) return 100;
  const diff = Math.abs(actual - target);
  const percentOff = (diff / target) * 100;
  return Math.max(0, 100 - percentOff);
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMotivationalMessage(
  grade: WeeklySummaryReport['overallGrade'],
  daysLogged: number,
  adherence: number
): string {
  if (grade === 'A') {
    return "Outstanding work! You're absolutely crushing your nutrition goals. Keep this up and the results will be incredible! 🏆";
  } else if (grade === 'B') {
    return "Great job this week! You're showing real consistency and dedication. Let's push for that A next week! 💪";
  } else if (grade === 'C') {
    return "Solid effort! You're building good habits. Focus on consistency and you'll see even better results! 📈";
  } else if (grade === 'D') {
    return "Nice start, but there's room for improvement! Try logging more consistently and hitting those targets. You've got this! 💙";
  } else {
    return "Let's make next week count! Small steps add up. Start by logging every day and the rest will follow. I believe in you! 🌟";
  }
}

function getEmptySummary(): WeeklySummaryReport {
  return {
    weekRange: 'No data',
    totalDaysLogged: 0,
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    targetAdherence: 0,
    bestDay: null,
    areasToImprove: ['Start logging your meals to get personalized insights!'],
    achievements: [],
    insights: ['Track your nutrition consistently to unlock weekly summaries!'],
    overallGrade: 'F',
    motivationalMessage: "Let's get started! Begin logging your meals today and watch your progress grow! 🚀",
  };
}
