// Coach Tab - AI Intelligence Hub
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { coachAPI, foodLogAPI, trainingAPI } from '../../src/services/api';
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
      await Promise.all([loadTodayLog(), loadTrainingData()]);
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
      // Build context for AI
      const context: any = {};

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

      if (trainingPlan) {
        context.training = {
          hasActivePlan: true,
          experienceLevel: trainingPlan.experience_level,
          primaryGoal: trainingPlan.primary_goal,
        };
      }

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
