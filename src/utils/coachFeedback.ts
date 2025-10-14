// Intelligent coach feedback system - generates human-like, contextual messages
import { DailyFoodLog, UserProfile } from '../types';

export interface CoachMessage {
  text: string;
  emoji: string;
  tone: 'encouraging' | 'celebrating' | 'motivating' | 'supportive' | 'neutral';
  color?: string;
}

// Get time-aware greeting
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Analyze macro performance and generate feedback
export function getMacroFeedback(
  current: number,
  target: number,
  macroType: 'protein' | 'carbs' | 'fat' | 'calories',
  isEndOfDay: boolean = false
): CoachMessage {
  const percentage = (current / target) * 100;
  const diff = current - target;

  // Perfect range (95-105%)
  if (percentage >= 95 && percentage <= 105) {
    const messages = [
      { text: `Perfect ${macroType}! You're right on target 🎯`, emoji: '🎯', tone: 'celebrating' as const },
      { text: `Nailed it! Your ${macroType} is spot on`, emoji: '✨', tone: 'celebrating' as const },
      { text: `Excellent work! ${macroType} is perfectly balanced`, emoji: '💯', tone: 'celebrating' as const },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Slightly over (105-115%)
  if (percentage > 105 && percentage <= 115) {
    const messages = [
      { text: `Slightly over on ${macroType}, but you're doing great!`, emoji: '👍', tone: 'encouraging' as const },
      { text: `A bit high on ${macroType}, no worries - still crushing it`, emoji: '💪', tone: 'supportive' as const },
      { text: `${macroType} is a touch high, but well within range`, emoji: '✅', tone: 'neutral' as const },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Way over (>115%)
  if (percentage > 115) {
    if (isEndOfDay) {
      return {
        text: `${macroType} ran high today. No stress! I'll adjust tomorrow's targets`,
        emoji: '🔄',
        tone: 'supportive',
      };
    }
    return {
      text: `${macroType} is running high. Let's balance the rest of the day`,
      emoji: '⚖️',
      tone: 'motivating',
    };
  }

  // Slightly under (85-95%)
  if (percentage >= 85 && percentage < 95) {
    const remaining = target - current;
    if (!isEndOfDay) {
      const messages = [
        { text: `${Math.round(remaining)}g ${macroType} left - you've got this!`, emoji: '🎯', tone: 'encouraging' as const },
        { text: `On track! ${Math.round(remaining)}g more ${macroType} to go`, emoji: '📊', tone: 'neutral' as const },
        { text: `Looking good! ${Math.round(remaining)}g ${macroType} remaining`, emoji: '✨', tone: 'encouraging' as const },
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    return {
      text: `Slightly under on ${macroType} yesterday. I'll adjust today to compensate!`,
      emoji: '🔧',
      tone: 'supportive',
    };
  }

  // Way under (<85%)
  if (percentage < 85) {
    const remaining = target - current;
    if (!isEndOfDay) {
      return {
        text: `Let's get some more ${macroType} in! ${Math.round(remaining)}g to go`,
        emoji: '💪',
        tone: 'motivating',
      };
    }
    return {
      text: `${macroType} was low yesterday. Don't worry, I've adjusted today's plan!`,
      emoji: '🎯',
      tone: 'supportive',
    };
  }

  return {
    text: `Keep going with your ${macroType}!`,
    emoji: '💪',
    tone: 'encouraging',
  };
}

// Overall progress feedback
export function getOverallFeedback(
  todayLog: DailyFoodLog | null,
  profile: UserProfile | null
): CoachMessage {
  if (!todayLog || !profile) {
    return {
      text: "Let's start tracking your meals today!",
      emoji: '🍽️',
      tone: 'encouraging',
    };
  }

  const { totals, targets } = todayLog;

  // Calculate overall adherence
  const calorieAdherence = (totals.calories / targets.calories) * 100;
  const proteinAdherence = (totals.protein / targets.protein) * 100;
  const avgAdherence = (calorieAdherence + proteinAdherence) / 2;

  // Check if it's early in the day
  const hour = new Date().getHours();
  const isEarlyDay = hour < 14;

  // No food logged yet
  if (totals.calories === 0) {
    if (isEarlyDay) {
      return {
        text: "Ready to fuel your day? Let's log your first meal!",
        emoji: '☀️',
        tone: 'encouraging',
      };
    }
    return {
      text: "Haven't logged anything yet - let's get started!",
      emoji: '📝',
      tone: 'motivating',
    };
  }

  // Excellent adherence (90-110%)
  if (avgAdherence >= 90 && avgAdherence <= 110) {
    const messages = [
      { text: "Outstanding work! You're crushing your goals today 💪", emoji: '🌟', tone: 'celebrating' as const },
      { text: "On fire! Your nutrition is dialed in perfectly", emoji: '🔥', tone: 'celebrating' as const },
      { text: "Incredible progress! Keep this momentum going", emoji: '🚀', tone: 'celebrating' as const },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Good progress (80-90% or 110-120%)
  if ((avgAdherence >= 80 && avgAdherence < 90) || (avgAdherence > 110 && avgAdherence <= 120)) {
    return {
      text: "Great work! You're right on track with your goals",
      emoji: '✅',
      tone: 'encouraging',
    };
  }

  // Behind (<80%)
  if (avgAdherence < 80) {
    if (!isEarlyDay) {
      return {
        text: "Let's finish strong! You've got time to hit your targets",
        emoji: '💪',
        tone: 'motivating',
      };
    }
    return {
      text: "Plenty of time to catch up - you've got this!",
      emoji: '⏰',
      tone: 'encouraging',
    };
  }

  // Overdoing it (>120%)
  return {
    text: "Running a bit high today. Let's ease up for the rest of the day",
    emoji: '⚖️',
    tone: 'supportive',
  };
}

// Streak and consistency feedback
export function getStreakFeedback(daysLogged: number): CoachMessage | null {
  if (daysLogged < 3) return null;

  if (daysLogged === 3) {
    return {
      text: "3 days in a row! You're building a solid habit 🔥",
      emoji: '🔥',
      tone: 'celebrating',
    };
  }

  if (daysLogged === 7) {
    return {
      text: "One full week! This is where transformation begins 🌟",
      emoji: '🌟',
      tone: 'celebrating',
    };
  }

  if (daysLogged === 14) {
    return {
      text: "2 weeks strong! Your discipline is impressive 💎",
      emoji: '💎',
      tone: 'celebrating',
    };
  }

  if (daysLogged === 30) {
    return {
      text: "30 days! You're officially a nutrition tracking pro 🏆",
      emoji: '🏆',
      tone: 'celebrating',
    };
  }

  if (daysLogged % 7 === 0) {
    return {
      text: `${daysLogged} days logged! Your consistency is paying off`,
      emoji: '📈',
      tone: 'celebrating',
    };
  }

  return null;
}

// Meal timing feedback
export function getMealTimingFeedback(
  lastMealTime: Date | null,
  mealsPerDay: number
): CoachMessage | null {
  if (!lastMealTime) return null;

  const hoursSinceLastMeal = (Date.now() - lastMealTime.getTime()) / (1000 * 60 * 60);
  const hour = new Date().getHours();

  // Been too long since last meal
  if (hoursSinceLastMeal > 5 && hour >= 12 && hour <= 20) {
    return {
      text: "Time to refuel! It's been a while since your last meal",
      emoji: '⏰',
      tone: 'motivating',
    };
  }

  // Close to bedtime with no dinner
  if (hour >= 19 && hour <= 21 && hoursSinceLastMeal > 4) {
    return {
      text: "Don't forget dinner! Let's fuel recovery before bed",
      emoji: '🌙',
      tone: 'encouraging',
    };
  }

  return null;
}

// Random encouragement throughout the day
export function getRandomEncouragement(): CoachMessage {
  const messages: CoachMessage[] = [
    { text: "Remember: consistency beats perfection every time", emoji: '💯', tone: 'encouraging' },
    { text: "You're building something amazing, one day at a time", emoji: '🌱', tone: 'supportive' },
    { text: "Every meal logged is progress toward your goals", emoji: '📊', tone: 'encouraging' },
    { text: "Trust the process - you're doing great!", emoji: '🎯', tone: 'motivating' },
    { text: "Small wins add up to big results", emoji: '✨', tone: 'encouraging' },
    { text: "I'm here to support you every step of the way", emoji: '🤝', tone: 'supportive' },
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Time-of-day contextual intelligence
export function getTimeOfDayContext(
  todayLog: DailyFoodLog | null,
  profile: UserProfile | null
): CoachMessage | null {
  if (!todayLog) return null;

  const hour = new Date().getHours();
  const { totals, targets, entries } = todayLog;

  // Morning (5am-11am) - Focus on breakfast
  if (hour >= 5 && hour < 11) {
    if (entries.length === 0) {
      return {
        text: "Good morning! Starting with a protein-rich breakfast sets you up for success today ☀️",
        emoji: '🍳',
        tone: 'encouraging',
      };
    }

    // Check if they've had breakfast
    const hasBreakfast = entries.some(e => e.meal_type === 'breakfast');
    if (!hasBreakfast && entries.length < 2) {
      return {
        text: "Don't skip breakfast! Your body needs fuel to power through the morning 💪",
        emoji: '🥐',
        tone: 'motivating',
      };
    }
  }

  // Midday (11am-2pm) - Lunch check
  if (hour >= 11 && hour < 14) {
    const hasLunch = entries.some(e => e.meal_type === 'lunch');
    if (!hasLunch) {
      return {
        text: "Time for lunch! Keep that metabolism firing and energy high 🌟",
        emoji: '🍽️',
        tone: 'encouraging',
      };
    }
  }

  // Afternoon (2pm-5pm) - Progress check
  if (hour >= 14 && hour < 17) {
    const proteinRemaining = targets.protein - totals.protein;
    const caloriesRemaining = targets.calories - totals.calories;

    if (proteinRemaining > targets.protein * 0.5) {
      return {
        text: `Afternoon check: You've got ${Math.round(proteinRemaining)}g protein left. Plan a protein-rich dinner! 🍗`,
        emoji: '📊',
        tone: 'supportive',
      };
    }

    if (caloriesRemaining > targets.calories * 0.5) {
      return {
        text: "You're running light on calories. Make sure dinner is substantial to fuel recovery! 💪",
        emoji: '🔋',
        tone: 'motivating',
      };
    }
  }

  // Evening (5pm-8pm) - Dinner focus
  if (hour >= 17 && hour < 20) {
    const hasDinner = entries.some(e => e.meal_type === 'dinner');
    const proteinRemaining = targets.protein - totals.protein;
    const caloriesRemaining = targets.calories - totals.calories;

    if (!hasDinner) {
      if (proteinRemaining > 30) {
        return {
          text: `Dinner time! Focus on getting ${Math.round(proteinRemaining)}g protein to hit your goal 🎯`,
          emoji: '🍽️',
          tone: 'motivating',
        };
      }
      return {
        text: "Don't forget dinner! It's your last chance to hit today's targets 🌙",
        emoji: '🍴',
        tone: 'encouraging',
      };
    }

    // Dinner logged, check remaining macros
    if (proteinRemaining > 15) {
      return {
        text: `Quick! You still need ${Math.round(proteinRemaining)}g protein. A protein shake or snack would seal the deal! 🥤`,
        emoji: '💡',
        tone: 'motivating',
      };
    }
  }

  // Night (8pm-11pm) - Final push or congratulations
  if (hour >= 20 && hour < 23) {
    const proteinPercentage = (totals.protein / targets.protein) * 100;
    const caloriesPercentage = (totals.calories / targets.calories) * 100;

    if (proteinPercentage >= 90 && caloriesPercentage >= 90) {
      return {
        text: "Great day of tracking! Rest well - recovery is when the magic happens ✨",
        emoji: '🌙',
        tone: 'celebrating',
      };
    }

    if (proteinPercentage < 80) {
      return {
        text: "Protein was low today. No stress! I'll adjust tomorrow's plan to get you back on track 🔄",
        emoji: '💙',
        tone: 'supportive',
      };
    }
  }

  return null;
}

// Micro-win celebrations
export function getMicroWinCelebration(
  todayLog: DailyFoodLog | null
): CoachMessage | null {
  if (!todayLog) return null;

  const { totals, targets, entries } = todayLog;

  // First meal logged today
  if (entries.length === 1) {
    const messages = [
      { text: "First meal logged! Great start to the day 🌅", emoji: '✅', tone: 'celebrating' as const },
      { text: "Boom! Day started right with your first log ⚡", emoji: '🎯', tone: 'celebrating' as const },
      { text: "First meal tracked! That's how champions start their day 💪", emoji: '🔥', tone: 'celebrating' as const },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Protein goal hit (95-105%)
  const proteinPercentage = (totals.protein / targets.protein) * 100;
  if (proteinPercentage >= 95 && proteinPercentage <= 105 && totals.protein >= targets.protein * 0.95) {
    const messages = [
      { text: "Protein goal crushed! 💪 Your muscles are thanking you", emoji: '💪', tone: 'celebrating' as const },
      { text: "Hit your protein target! That's what I'm talking about 🎯", emoji: '🎯', tone: 'celebrating' as const },
      { text: "Protein goal achieved! You're on fire today 🔥", emoji: '🔥', tone: 'celebrating' as const },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // All macros hit (all within 95-105%)
  const caloriesPercentage = (totals.calories / targets.calories) * 100;
  const carbsPercentage = (totals.carbs / targets.carbs) * 100;
  const fatPercentage = (totals.fat / targets.fat) * 100;

  const allMacrosHit =
    proteinPercentage >= 95 && proteinPercentage <= 105 &&
    carbsPercentage >= 95 && carbsPercentage <= 105 &&
    fatPercentage >= 95 && fatPercentage <= 105 &&
    caloriesPercentage >= 95 && caloriesPercentage <= 105;

  if (allMacrosHit) {
    return {
      text: "Perfect day! All macros hit 🎯 This is elite-level tracking!",
      emoji: '🏆',
      tone: 'celebrating',
    };
  }

  // Full day tracked (3+ meals logged)
  if (entries.length >= 3) {
    const hour = new Date().getHours();
    // Only show this in evening (after 6pm)
    if (hour >= 18) {
      const messages = [
        { text: "Full day tracked! This is how progress happens 📊", emoji: '📈', tone: 'celebrating' as const },
        { text: "All meals logged! Your consistency is paying off 💎", emoji: '💎', tone: 'celebrating' as const },
        { text: "Complete tracking today! You're building incredible habits ⭐", emoji: '⭐', tone: 'celebrating' as const },
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }

  return null;
}

// Smart macro suggestions when user is off-target
export function getSmartMacroSuggestion(
  current: number,
  target: number,
  macroType: 'protein' | 'carbs' | 'fat' | 'calories'
): CoachMessage | null {
  const percentage = (current / target) * 100;
  const remaining = target - current;
  const hour = new Date().getHours();

  // Only suggest if significantly under (< 70%) and there's still time in the day
  if (percentage >= 70 || hour >= 21) return null;

  const suggestions: { [key: string]: string[] } = {
    protein: [
      `Quick idea: A protein shake would add ${Math.round(remaining / 2)}g protein 🥤`,
      `Try adding chicken breast or Greek yogurt - easy ${Math.round(remaining / 2)}g protein boost 🍗`,
      `Cottage cheese makes a great high-protein snack right now 🧀`,
      `A few eggs would get you closer - about ${Math.round(remaining / 3)}g protein each 🥚`,
    ],
    carbs: [
      `Need energy? A banana or rice cake would help you hit your carb target 🍌`,
      `Consider adding oats or sweet potato to your next meal 🍠`,
      `Quick carbs: fruit, crackers, or a granola bar would help 🍎`,
    ],
    fat: [
      `Add healthy fats: avocado, nuts, or olive oil on your veggies 🥑`,
      `A handful of almonds would give you about ${Math.round(remaining / 2)}g fat 🌰`,
      `Try peanut butter - easy way to boost healthy fats 🥜`,
    ],
    calories: [
      `Running low on calories today. Add a balanced snack to fuel your goals 🍽️`,
      `Your body needs fuel! Consider a nutrient-dense snack 💪`,
    ],
  };

  const macroSuggestions = suggestions[macroType];
  const randomSuggestion = macroSuggestions[Math.floor(Math.random() * macroSuggestions.length)];

  return {
    text: randomSuggestion,
    emoji: '💡',
    tone: 'supportive',
  };
}

// Goal progress feedback
export function getGoalProgressFeedback(
  currentWeight: number,
  startingWeight: number,
  goalWeight: number,
  goal: 'cut' | 'bulk' | 'recomp'
): CoachMessage {
  const totalChange = Math.abs(goalWeight - startingWeight);
  const currentChange = Math.abs(currentWeight - startingWeight);
  const progressPercentage = (currentChange / totalChange) * 100;

  if (progressPercentage >= 100) {
    return {
      text: `Goal achieved! You ${goal === 'cut' ? 'lost' : 'gained'} ${currentChange.toFixed(1)}lbs 🎉`,
      emoji: '🎉',
      tone: 'celebrating',
    };
  }

  if (progressPercentage >= 75) {
    return {
      text: `Amazing! You're ${progressPercentage.toFixed(0)}% to your goal`,
      emoji: '🚀',
      tone: 'celebrating',
    };
  }

  if (progressPercentage >= 50) {
    return {
      text: `Halfway there! ${progressPercentage.toFixed(0)}% complete`,
      emoji: '⭐',
      tone: 'encouraging',
    };
  }

  if (progressPercentage >= 25) {
    return {
      text: `Great start! ${progressPercentage.toFixed(0)}% toward your goal`,
      emoji: '💪',
      tone: 'encouraging',
    };
  }

  return {
    text: "Every journey starts with a single step. You're on your way!",
    emoji: '🌟',
    tone: 'encouraging',
  };
}

/**
 * Detects if targets were adaptively adjusted and generates explanation
 * Compares yesterday's performance to detect auto-adjustments
 */
export function getAdaptiveTargetMessage(
  todayLog: DailyFoodLog | null,
  yesterdayLog: DailyFoodLog | null
): CoachMessage | null {
  if (!todayLog || !yesterdayLog) return null;

  // Check if targets changed from yesterday
  const caloriesDiff = todayLog.targets.calories - yesterdayLog.targets.calories;
  const proteinDiff = todayLog.targets.protein - yesterdayLog.targets.protein;

  // Detect significant target changes (more than 5% adjustment)
  const caloriesChangePercent = Math.abs(caloriesDiff / yesterdayLog.targets.calories) * 100;
  const proteinChangePercent = Math.abs(proteinDiff / yesterdayLog.targets.protein) * 100;

  if (caloriesChangePercent > 5 || proteinChangePercent > 5) {
    // Analyze yesterday's performance to explain why
    const yesterdayCaloriesAdherence = (yesterdayLog.totals.calories / yesterdayLog.targets.calories) * 100;
    const yesterdayProteinAdherence = (yesterdayLog.totals.protein / yesterdayLog.targets.protein) * 100;

    let message = '';
    let emoji = '🔧';
    let tone: 'supportive' | 'encouraging' | 'motivating' = 'supportive';

    // User was under target yesterday
    if (yesterdayCaloriesAdherence < 90) {
      if (caloriesDiff > 0) {
        message = `I bumped your calories up ${Math.round(caloriesDiff)} today to help you hit your goals after yesterday. You got this! 💪`;
        tone = 'encouraging';
      } else {
        message = `I adjusted your targets slightly based on yesterday's intake. Let's find that sweet spot together! 🎯`;
        tone = 'supportive';
      }
    }
    // User was over target yesterday
    else if (yesterdayCaloriesAdherence > 110) {
      if (caloriesDiff < 0) {
        message = `I reduced your calories by ${Math.round(Math.abs(caloriesDiff))} today to balance yesterday's higher intake. We'll even it out! 🔧`;
        tone = 'supportive';
      } else {
        message = `I'm adjusting your plan based on your progress. These tweaks help you stay on track! 📊`;
        tone = 'motivating';
      }
    }
    // Protein-specific adjustment
    else if (proteinChangePercent > 5 && yesterdayProteinAdherence < 85) {
      message = `I increased your protein target by ${Math.round(proteinDiff)}g today - you were a bit low yesterday. Let's get that protein in! 💪`;
      emoji = '🥩';
      tone = 'encouraging';
    }
    // General adaptive adjustment
    else {
      message = `I fine-tuned your targets today based on your recent progress. These small adjustments keep you moving toward your goal! 🎯`;
      tone = 'motivating';
    }

    if (message) {
      return {
        text: message,
        emoji,
        tone,
      };
    }
  }

  return null;
}
