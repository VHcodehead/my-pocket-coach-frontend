// Context-aware suggested questions for coach chat
import { DailyFoodLog } from '../types';

export interface SuggestedQuestion {
  text: string;
  emoji: string;
  category: 'progress' | 'planning' | 'nutrition' | 'motivation';
}

/**
 * Generate context-aware suggested questions based on user's current state
 */
export function getSuggestedQuestions(todayLog: DailyFoodLog | null): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  const hour = new Date().getHours();

  // Time-based questions
  if (hour >= 6 && hour < 11) {
    questions.push({
      text: "What should I eat for breakfast today?",
      emoji: "🍳",
      category: 'planning',
    });
  } else if (hour >= 11 && hour < 15) {
    questions.push({
      text: "What's a good lunch option?",
      emoji: "🥗",
      category: 'planning',
    });
  } else if (hour >= 17 && hour < 21) {
    questions.push({
      text: "What should I make for dinner?",
      emoji: "🍽️",
      category: 'planning',
    });
  }

  // Progress-based questions
  if (todayLog && todayLog.entries && todayLog.entries.length > 0) {
    const proteinPercent = (todayLog.totals.protein / todayLog.targets.protein) * 100;
    const caloriesPercent = (todayLog.totals.calories / todayLog.targets.calories) * 100;

    if (proteinPercent < 50) {
      questions.push({
        text: "How can I get more protein today?",
        emoji: "💪",
        category: 'nutrition',
      });
    }

    if (caloriesPercent < 40) {
      questions.push({
        text: "Am I eating enough calories?",
        emoji: "📊",
        category: 'progress',
      });
    }

    if (caloriesPercent > 90 && caloriesPercent < 110) {
      questions.push({
        text: "How am I doing today?",
        emoji: "🎯",
        category: 'progress',
      });
    }
  }

  // Always available questions
  questions.push(
    {
      text: "What are good protein sources?",
      emoji: "🥩",
      category: 'nutrition',
    },
    {
      text: "How do I stay consistent?",
      emoji: "💡",
      category: 'motivation',
    },
    {
      text: "What's my progress this week?",
      emoji: "📈",
      category: 'progress',
    }
  );

  // Return max 6 questions, prioritized by relevance
  return questions.slice(0, 6);
}
