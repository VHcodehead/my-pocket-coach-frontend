// AI Coach chat screen
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, ScrollView } from 'react-native';
import { coachAPI, foodLogAPI, trainingAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { useUser } from '../../src/contexts/UserContext';
import { DailyFoodLog } from '../../src/types';
import { getSuggestedQuestions, SuggestedQuestion } from '../../src/utils/coachSuggestedQuestions';
import { HamburgerMenu } from '../../src/components/HamburgerMenu';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function CoachScreen() {
  const { profile } = useUser();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [trainingProgress, setTrainingProgress] = useState<any>(null);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Load today's log and training data for context
  useEffect(() => {
    loadTodayLog();
    loadTrainingData();
  }, []);

  // Update welcome message when profile loads
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: `Hey ${firstName}! I'm your personal nutrition coach, and I'm here 24/7 to support you. Whether it's meal planning, hitting your macros, or just staying motivated - I've got your back. What's on your mind?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [firstName]);

  // Update suggested questions when log changes
  useEffect(() => {
    const questions = getSuggestedQuestions(todayLog);
    setSuggestedQuestions(questions);
  }, [todayLog]);

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
      // Load current training plan
      const planResponse = await trainingAPI.getCurrentPlan();
      if (planResponse.success && planResponse.data) {
        setTrainingPlan(planResponse.data);
      }

      // Load training progress
      const progressResponse = await trainingAPI.getProgress();
      if (progressResponse.success && progressResponse.data) {
        setTrainingProgress(progressResponse.data);
      }

      // Load recent PRs
      const prsResponse = await trainingAPI.getPersonalRecords();
      if (prsResponse.success && prsResponse.data) {
        setRecentPRs(prsResponse.data.slice(0, 3)); // Only most recent 3 PRs for context
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
    const textToSend = messageText || inputText;
    if (!textToSend || typeof textToSend !== 'string' || !textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      console.log('[COACH] Sending message:', textToSend);

      // Build context object with training data
      const context: any = {};

      // Add training context if available
      if (trainingPlan) {
        context.training = {
          hasActivePlan: true,
          experienceLevel: trainingPlan.experience_level,
          primaryGoal: trainingPlan.primary_goal,
          currentWeek: trainingPlan.current_week,
          currentBlock: trainingPlan.current_block,
          workoutsThisWeek: trainingProgress?.workoutsThisWeek || 0,
        };

        // Add recent PRs if available
        if (recentPRs.length > 0) {
          context.training.recentPRs = recentPRs.map(pr => ({
            exercise: pr.exercise_name,
            weight: pr.weight,
            reps: pr.reps,
            date: pr.achieved_at,
          }));
        }
      }

      const response = await coachAPI.sendMessage(textToSend, context);

      if (response.success && response.data) {
        const coachMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.data.message || 'I apologize, I had trouble processing that. Could you try rephrasing?',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, coachMessage]);
        console.log('[COACH] Coach response received');
      }
    } catch (error: any) {
      console.error('[COACH] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessageContainer : styles.coachMessageContainer]}>
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.coachBubble]}>
        <Text style={[styles.messageText, item.isUser ? styles.userText : styles.coachText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <HamburgerMenu style={styles.menuButton} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>24/7 Coach Chat</Text>
          <Text style={styles.subtitle}>I'm here whenever you need me</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 1 && (
        <View style={styles.suggestedQuestionsContainer}>
          <Text style={styles.suggestedQuestionsTitle}>💡 Try asking me:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedQuestionsScroll}>
            {suggestedQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestedQuestionButton}
                onPress={() => handleSuggestedQuestion(question.text)}
                disabled={loading}
              >
                <Text style={styles.suggestedQuestionEmoji}>{question.emoji}</Text>
                <Text style={styles.suggestedQuestionText}>{question.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything about your nutrition..."
          placeholderTextColor={theme.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText || !inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSendMessage()}
          disabled={!inputText || !inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>{loading ? '💭' : '📤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.xl,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  menuButton: {
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  messagesList: {
    padding: theme.spacing.md,
  },
  messageContainer: {
    marginBottom: theme.spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  coachMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: theme.fontSize.md,
  },
  userText: {
    color: theme.colors.background,
  },
  coachText: {
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  suggestedQuestionsContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  suggestedQuestionsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  suggestedQuestionsScroll: {
    flexDirection: 'row',
  },
  suggestedQuestionButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  suggestedQuestionEmoji: {
    fontSize: 16,
  },
  suggestedQuestionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
});
