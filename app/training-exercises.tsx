// Training Exercises - Browse exercise library
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { trainingAPI } from '../src/services/api';
import { useTheme } from '../src/contexts/ThemeContext';

interface Exercise {
  id: number;
  name: string;
  description?: string;
  muscle_groups?: string[];
  equipment?: string;
  difficulty?: string;
  instructions?: string;
  youtube_url?: string;
  tips?: string;
}

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function TrainingExercisesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedMuscle, selectedDifficulty]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const response = await trainingAPI.searchExercises();

      if (response.success && response.data) {
        setExercises(response.data);
        setFilteredExercises(response.data);
      }
    } catch (error) {
      console.error('[EXERCISES] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.description?.toLowerCase().includes(query) ||
          ex.muscle_groups?.some((mg) => mg.toLowerCase().includes(query))
      );
    }

    // Muscle group filter
    if (selectedMuscle !== 'All') {
      filtered = filtered.filter((ex) =>
        ex.muscle_groups?.some(
          (mg) => mg.toLowerCase() === selectedMuscle.toLowerCase()
        )
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(
        (ex) => ex.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    setFilteredExercises(filtered);
  };

  const handleExercisePress = async (exercise: Exercise) => {
    try {
      // Fetch full exercise details
      const response = await trainingAPI.getExercise(exercise.id);
      if (response.success && response.data) {
        setSelectedExercise(response.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('[EXERCISES] Detail fetch error:', error);
      // Show basic info if full details fail
      setSelectedExercise(exercise);
      setShowDetailModal(true);
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Exercise Library</Text>
          <Text style={styles.headerSubtitle}>
            {filteredExercises.length} exercises
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Muscle Group Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Muscle Group</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {MUSCLE_GROUPS.map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.filterChip,
                selectedMuscle === muscle && styles.filterChipActive,
              ]}
              onPress={() => setSelectedMuscle(muscle)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedMuscle === muscle && styles.filterChipTextActive,
                ]}
              >
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Difficulty Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Difficulty</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {DIFFICULTIES.map((difficulty) => (
            <TouchableOpacity
              key={difficulty}
              style={[
                styles.filterChip,
                selectedDifficulty === difficulty && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDifficulty(difficulty)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDifficulty === difficulty && styles.filterChipTextActive,
                ]}
              >
                {difficulty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.content}>
        {filteredExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No exercises found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => handleExercisePress(exercise)}
            >
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {exercise.difficulty && (
                  <View
                    style={[
                      styles.difficultyBadge,
                      exercise.difficulty.toLowerCase() === 'beginner' &&
                        styles.difficultyBeginner,
                      exercise.difficulty.toLowerCase() === 'intermediate' &&
                        styles.difficultyIntermediate,
                      exercise.difficulty.toLowerCase() === 'advanced' &&
                        styles.difficultyAdvanced,
                    ]}
                  >
                    <Text style={styles.difficultyText}>
                      {exercise.difficulty}
                    </Text>
                  </View>
                )}
              </View>

              {exercise.description && (
                <Text style={styles.exerciseDescription} numberOfLines={2}>
                  {exercise.description}
                </Text>
              )}

              <View style={styles.exerciseTags}>
                {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>
                      💪 {exercise.muscle_groups.join(', ')}
                    </Text>
                  </View>
                )}
                {exercise.equipment && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>🏋️ {exercise.equipment}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.viewDetailsText}>Tap to view details →</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedExercise && (
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Difficulty Badge */}
              {selectedExercise.difficulty && (
                <View style={styles.modalSection}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      styles.difficultyBadgeLarge,
                      selectedExercise.difficulty.toLowerCase() === 'beginner' &&
                        styles.difficultyBeginner,
                      selectedExercise.difficulty.toLowerCase() ===
                        'intermediate' && styles.difficultyIntermediate,
                      selectedExercise.difficulty.toLowerCase() === 'advanced' &&
                        styles.difficultyAdvanced,
                    ]}
                  >
                    <Text style={styles.difficultyText}>
                      {selectedExercise.difficulty}
                    </Text>
                  </View>
                </View>
              )}

              {/* Tags */}
              <View style={styles.modalSection}>
                <View style={styles.exerciseTags}>
                  {selectedExercise.muscle_groups &&
                    selectedExercise.muscle_groups.length > 0 && (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>
                          💪 {selectedExercise.muscle_groups.join(', ')}
                        </Text>
                      </View>
                    )}
                  {selectedExercise.equipment && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        🏋️ {selectedExercise.equipment}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Video Tutorial */}
              {selectedExercise.youtube_url && (
                <View style={styles.modalSection}>
                  <TouchableOpacity
                    style={styles.videoButton}
                    onPress={() => Linking.openURL(selectedExercise.youtube_url!)}
                  >
                    <Text style={styles.videoButtonIcon}>▶️</Text>
                    <Text style={styles.videoButtonText}>Watch Form Tutorial</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Description */}
              {selectedExercise.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalText}>
                    {selectedExercise.description}
                  </Text>
                </View>
              )}

              {/* Instructions */}
              {selectedExercise.instructions && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Instructions</Text>
                  <Text style={styles.modalText}>
                    {selectedExercise.instructions}
                  </Text>
                </View>
              )}

              {/* Tips */}
              {selectedExercise.tips && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>💡 Tips</Text>
                  <Text style={styles.modalText}>{selectedExercise.tips}</Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: theme.colors.text,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  searchContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  filterLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  exerciseCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  exerciseName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  difficultyBadgeLarge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  difficultyBeginner: {
    backgroundColor: '#10B981',
  },
  difficultyIntermediate: {
    backgroundColor: '#F59E0B',
  },
  difficultyAdvanced: {
    backgroundColor: '#EF4444',
  },
  difficultyText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
  },
  exerciseDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
  },
  viewDetailsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: theme.colors.text,
  },
  modalTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    paddingRight: 40,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  modalSection: {
    marginBottom: theme.spacing.lg,
  },
  modalSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  videoButtonIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  videoButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
  },
});
