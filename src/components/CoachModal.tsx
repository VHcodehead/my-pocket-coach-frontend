// CoachModal - Full-featured AI Coach chat modal with predictions
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, ScrollView, Modal } from 'react-native';
import { coachAPI, foodLogAPI, trainingAPI } from '../services/api';
import { theme } from '../theme';
import { useUser } from '../contexts/UserContext';
import { DailyFoodLog } from '../types';
import { getSuggestedQuestions, SuggestedQuestion } from '../utils/coachSuggestedQuestions';
import { AIPredictionsDashboard } from './AIPredictionsDashboard';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface CoachModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CoachModal({ visible, onClose }: CoachModalProps) {
  const { profile } = useUser();
  const firstName = profile?.fullName?.split(' ')[0] || 'there';

  const [activeTab, setActiveTab] = useState<'chat' | 'predictions'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [trainingProgress, setTrainingProgress] = useState<any>(null);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      loadTodayLog();
      loadTrainingData();
    }
  }, [visible]);

  // Update welcome message when profile loads
  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: '1',
          text: `Hey ${firstName}! I'm your personal nutrition coach, and I'm here 24/7 to support you. Whether it's meal planning, hitting your macros, or just staying motivated - I've got your back. What's on your mind?`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [firstName, visible]);

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
      console.error('[COACH_MODAL] Error loading today log:', error);
    }
  };

  const loadTrainingData = async () => {
    try {
      const planResponse = await trainingAPI.getCurrentPlan();
      if (planResponse.success && planResponse.data) {
        setTrainingPlan(planResponse.data);
      }

      const progressResponse = await trainingAPI.getProgress();
      if (progressResponse.success && progressResponse.data) {
        setTrainingProgress(progressResponse.data);
      }

      const prsResponse = await trainingAPI.getPersonalRecords();
      if (prsResponse.success && prsResponse.data) {
        setRecentPRs(prsResponse.data.slice(0, 3));
      }
    } catch (error) {
      console.error('[COACH_MODAL] Error loading training data:', error);
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
      console.log('[COACH_MODAL] Sending message:', textToSend);

      const context: any = {};

      if (trainingPlan) {
        context.training = {
          hasActivePlan: true,
          experienceLevel: trainingPlan.experience_level,
          primaryGoal: trainingPlan.primary_goal,
          currentWeek: trainingPlan.current_week,
          currentBlock: trainingPlan.current_block,
          workoutsThisWeek: trainingProgress?.workoutsThisWeek || 0,
        };

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
        console.log('[COACH_MODAL] Coach response received');
      }
    } catch (error: any) {
      console.error('[COACH_MODAL] Error:', error);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>24/7 Coach</Text>
            <Text style={styles.subtitle}>AI-Powered Coaching & Predictions</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              💬 AI Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'predictions' && styles.tabActive]}
            onPress={() => setActiveTab('predictions')}
          >
            <Text style={[styles.tabText, activeTab === 'predictions' && styles.tabTextActive]}>
              🤖 Predictions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'chat' ? (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
          >
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
        ) : (
          <AIPredictionsDashboard />
        )}
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  closeButtonText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.bold,
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.neon,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.background,
  },
  chatContainer: {
    flex: 1,
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
    fontSize: 24,
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
