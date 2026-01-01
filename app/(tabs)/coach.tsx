// Coach Tab - AI Intelligence Hub
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { coachAPI, foodLogAPI, trainingAPI, checkinAPI } from '../../src/services/api';
import { DailyFoodLog } from '../../src/types';
import { getSuggestedQuestions, SuggestedQuestion } from '../../src/utils/coachSuggestedQuestions';
import { AIPredictionsDashboard } from '../../src/components/AIPredictionsDashboard';

// Import SVG icons
import PredictionIcon from '../../assets/icons/prediction-icon.svg';
import CoachIcon from '../../assets/icons/coach-icon.svg';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function CoachScreen() {
  const router = useRouter();
  const { profile } = useUser();
  const { theme } = useTheme();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';

  const [activeView, setActiveView] = useState<'predictions' | 'chat'>('predictions');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [checkinHistory, setCheckinHistory] = useState<any[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeView === 'chat' && messages.length === 0) {
      // Initialize welcome message
      setMessages([
        {
          id: '1',
          text: `Hey ${firstName}! 👋 I'm your AI coach. I analyze your nutrition, predict your progress, and help you stay on track. What's on your mind?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [activeView, firstName]);

  useEffect(() => {
    const questions = getSuggestedQuestions(todayLog);
    setSuggestedQuestions(questions);
  }, [todayLog]);

  const loadData = async () => {
    try {
      await Promise.all([loadTodayLog(), loadTrainingData(), loadCheckinHistory()]);
    } catch (error) {
      console.error('[COACH] Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadTodayLog = async () => {
    try {
      const response = await foodLogAPI.getToday();
      if (response.success && response.data) {
        setTodayLog(response.data);
      }
    } catch (error) {
      console.error('[COACH] Error loading today log:', error);
    }
  };

  const loadTrainingData = async () => {
    try {
      const planResponse = await trainingAPI.getCurrentPlan();
      if (planResponse.success && planResponse.data) {
        setTrainingPlan(planResponse.data);
      }
    } catch (error) {
      console.error('[COACH] Error loading training data:', error);
    }
  };

  const loadCheckinHistory = async () => {
    try {
      const response = await checkinAPI.getHistory();
      if (response.success && response.data?.checkins) {
        setCheckinHistory(response.data.checkins);
        console.log('[COACH] Loaded checkin history:', response.data.checkins.length, 'entries');
      }
    } catch (error) {
      console.error('[COACH] Error loading checkin history:', error);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputText(question);
    handleSendMessage(question);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Build comprehensive context for AI
      const context: any = {};

      // Add full user profile context
      if (profile) {
        // Basic profile info
        context.profile = {
          weight: profile.weight || 0,
          height_cm: profile.height_cm || 0,
          age: profile.age || 0,
          sex: profile.sex || 'male',
          bodyfat: profile.bodyfat || 0,
          activity: profile.activity || 1.2,
          goal: profile.goal || 'recomp',
        };

        // Goal progression tracking with detailed metrics
        if (profile.goal_weight || profile.goal_date) {
          const currentWeight = profile.weight || 0;
          const goalWeight = profile.goal_weight || currentWeight;
          const weightRemaining = Math.abs(goalWeight - currentWeight);
          const isLosing = goalWeight < currentWeight;

          // Calculate weeks remaining until goal date
          let weeksRemaining = 0;
          let daysRemaining = 0;
          if (profile.goal_date) {
            const goalDate = new Date(profile.goal_date);
            const today = new Date();
            const msRemaining = goalDate.getTime() - today.getTime();
            daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
            weeksRemaining = Math.round(daysRemaining / 7 * 10) / 10; // 1 decimal
          }

          // Calculate required weekly rate to hit goal
          const requiredWeeklyRate = weeksRemaining > 0
            ? Math.round((weightRemaining / weeksRemaining) * 10) / 10
            : 0;

          // Calculate actual rate from check-in history
          let actualWeeklyRate = 0;
          let startingWeight = currentWeight;
          let weeksTracked = 0;
          let recentTrend = 'stable';

          if (checkinHistory && checkinHistory.length >= 2) {
            // Sort by date ascending
            const sorted = [...checkinHistory].sort((a, b) =>
              new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
            );

            startingWeight = sorted[0].weight;
            const latestWeight = sorted[sorted.length - 1].weight;
            const firstDate = new Date(sorted[0].checked_at);
            const lastDate = new Date(sorted[sorted.length - 1].checked_at);
            const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            weeksTracked = Math.round(daysBetween / 7 * 10) / 10;

            if (weeksTracked > 0) {
              const totalChange = startingWeight - latestWeight;
              actualWeeklyRate = Math.round((totalChange / weeksTracked) * 10) / 10;
            }

            // Recent trend (last 3 check-ins)
            if (sorted.length >= 3) {
              const recent = sorted.slice(-3);
              const recentChange = recent[0].weight - recent[recent.length - 1].weight;
              if (recentChange > 0.5) recentTrend = 'losing';
              else if (recentChange < -0.5) recentTrend = 'gaining';
            }
          }

          // Calculate true progress percent
          const totalToLose = Math.abs(startingWeight - goalWeight);
          const amountLost = Math.abs(startingWeight - currentWeight);
          const progressPercent = totalToLose > 0
            ? Math.round((amountLost / totalToLose) * 100)
            : 0;

          // Determine if on track
          const onTrack = isLosing
            ? actualWeeklyRate >= requiredWeeklyRate * 0.8  // Within 80% of required rate
            : actualWeeklyRate <= requiredWeeklyRate * 1.2;

          context.goalProgress = {
            currentWeight,
            goalWeight,
            startingWeight,
            weightRemaining,
            goalDate: profile.goal_date,
            daysRemaining,
            weeksRemaining,
            progressPercent,
            requiredWeeklyRate: isLosing ? requiredWeeklyRate : -requiredWeeklyRate,
            actualWeeklyRate: isLosing ? actualWeeklyRate : -actualWeeklyRate,
            weeksTracked,
            onTrack,
            recentTrend,
            safeMaxRate: profile.current_safe_max_rate,
            isAggressive: profile.aggressive_timeline,
          };
        }

        // Parse diet_type into flags
        const dietType = profile.diet_type?.toLowerCase() || '';
        context.diet = {
          keto: dietType.includes('keto'),
          vegetarian: dietType.includes('vegetarian'),
          vegan: dietType.includes('vegan'),
          pescatarian: dietType.includes('pescatarian'),
          halal: dietType.includes('halal'),
          kosher: dietType.includes('kosher'),
          allergens: profile.allergens || [],
          dislikes: profile.dislikes || [],
        };

        // Add macro targets from today's log
        if (todayLog?.targets) {
          context.targets = {
            p: todayLog.targets.protein,
            c: todayLog.targets.carbs,
            f: todayLog.targets.fat,
          };
        }
      }

      // Today's nutrition progress
      if (todayLog) {
        context.nutrition = {
          calories: todayLog.totals.calories,
          caloriesTarget: todayLog.targets.calories,
          protein: todayLog.totals.protein,
          proteinTarget: todayLog.targets.protein,
          carbs: todayLog.totals.carbs,
          carbsTarget: todayLog.targets.carbs,
          fat: todayLog.totals.fat,
          fatTarget: todayLog.targets.fat,
          mealsLogged: todayLog.entries?.length || 0,
        };
      }

      // Training plan context
      if (trainingPlan) {
        context.training = {
          hasActivePlan: true,
          experienceLevel: trainingPlan.experience_level,
          primaryGoal: trainingPlan.primary_goal,
        };
      }

      // Debug: log what context we're sending
      console.log('[COACH] Sending context to coach:', {
        hasProfile: !!context.profile,
        hasGoalProgress: !!context.goalProgress,
        goalProgressDetails: context.goalProgress ? {
          currentWeight: context.goalProgress.currentWeight,
          goalWeight: context.goalProgress.goalWeight,
          weeksRemaining: context.goalProgress.weeksRemaining,
          actualWeeklyRate: context.goalProgress.actualWeeklyRate,
          onTrack: context.goalProgress.onTrack,
        } : null,
        hasNutrition: !!context.nutrition,
        hasTraining: !!context.training,
        checkinHistoryCount: checkinHistory?.length || 0,
      });

      const response = await coachAPI.sendMessage(textToSend, context);

      if (response.success && response.data?.message) {
        const coachMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, coachMessage]);

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error('No response from coach');
      }
    } catch (error) {
      console.error('[COACH] Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again in a moment!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser && styles.messageContainerUser]}>
      {!item.isUser && (
        <View style={styles.coachAvatar}>
          <CoachIcon width={20} height={20} fill={theme.colors.background} />
        </View>
      )}
      <View style={[styles.messageBubble, item.isUser && styles.messageBubbleUser]}>
        <Text style={[styles.messageText, item.isUser && styles.messageTextUser]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your AI Coach</Text>
        <Text style={styles.headerSubtitle}>Personalized guidance powered by AI</Text>
      </View>

      {/* View Switcher */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewButton, activeView === 'predictions' && styles.viewButtonActive]}
          onPress={() => setActiveView('predictions')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PredictionIcon
              width={18}
              height={18}
              fill={activeView === 'predictions' ? theme.colors.background : theme.colors.textSecondary}
            />
            <Text style={[styles.viewButtonText, activeView === 'predictions' && styles.viewButtonTextActive]}>
              Predictions
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, activeView === 'chat' && styles.viewButtonActive]}
          onPress={() => setActiveView('chat')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CoachIcon
              width={18}
              height={18}
              fill={activeView === 'chat' ? theme.colors.background : theme.colors.textSecondary}
            />
            <Text style={[styles.viewButtonText, activeView === 'chat' && styles.viewButtonTextActive]}>
              Chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeView === 'predictions' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Description Card */}
          <View style={styles.descriptionCard}>
            <PredictionIcon width={48} height={48} fill={theme.colors.primary} />
            <Text style={styles.descriptionTitle}>See Your Future Progress</Text>
            <Text style={styles.descriptionText}>
              Based on your current habits, I can predict where you'll be in 30, 60, and 90 days.
            </Text>
          </View>

          {/* Predictions Dashboard */}
          <AIPredictionsDashboard />

          {/* CTA to Chat */}
          <TouchableOpacity
            style={styles.chatCTA}
            onPress={() => setActiveView('chat')}
          >
            <CoachIcon width={40} height={40} fill={theme.colors.encouragement} />
            <View style={styles.chatCTAContent}>
              <Text style={styles.chatCTATitle}>Have Questions?</Text>
              <Text style={styles.chatCTAText}>Chat with me for personalized advice</Text>
            </View>
            <Text style={styles.chatCTAArrow}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && messages.length <= 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsContent}
            >
              {suggestedQuestions.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => handleSuggestedQuestion(q.text)}
                >
                  <Text style={styles.suggestionEmoji}>{q.emoji}</Text>
                  <Text style={styles.suggestionText}>{q.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
            >
              <Text style={styles.sendButtonText}>{loading ? '⏳' : '➤'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  viewSwitcher: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  viewButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  viewButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  viewButtonTextActive: {
    color: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  descriptionCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  descriptionEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  descriptionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatCTA: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.encouragement + '15',
    borderWidth: 2,
    borderColor: theme.colors.encouragement,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  chatCTAEmoji: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  chatCTAContent: {
    flex: 1,
  },
  chatCTATitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  chatCTAText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  chatCTAArrow: {
    fontSize: 32,
    color: theme.colors.encouragement,
    fontWeight: theme.fontWeight.bold,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  messageContainerUser: {
    justifyContent: 'flex-end',
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  coachAvatarEmoji: {
    fontSize: 20,
  },
  messageBubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    maxWidth: '75%',
    ...theme.shadows.sm,
  },
  messageBubbleUser: {
    backgroundColor: theme.colors.primary,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  messageTextUser: {
    color: theme.colors.background,
  },
  suggestionsScroll: {
    maxHeight: 100,
  },
  suggestionsContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  suggestionEmoji: {
    fontSize: 18,
    marginRight: theme.spacing.xs,
  },
  suggestionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
    color: theme.colors.background,
  },
});
