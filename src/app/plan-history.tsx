// Plan history screen: past weekly plans, each of which can be restored.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '../components/ui/Card';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAppState } from '../context/AppContext';
import { colors } from '../theme/colors';
import { screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { PlanHistoryEntry } from '../types';

function formatSavedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-ZA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function PlanHistoryScreen() {
  const router = useRouter();
  const { planHistory, restorePlanFromHistory } = useAppState();

  const sorted = [...planHistory].sort((a, b) => b.savedAt - a.savedAt);

  function confirmRestore(entry: PlanHistoryEntry) {
    Alert.alert(
      'Restore this plan?',
      `This will make the ${formatSavedAt(entry.savedAt)} plan your current week. Your current plan will be saved to history first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            restorePlanFromHistory(entry.id);
            router.push('/meal-plan');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          showBack
          eyebrow="Your account"
          title="Past weekly plans"
          onBack={() => router.back()}
        />

        {sorted.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No past plans yet</Text>
            <Text style={styles.emptyText}>
              Every time you generate a new week, your previous plan is saved here automatically.
            </Text>
          </Card>
        ) : (
          sorted.map((entry) => {
            const mealCount = entry.meals.length;
            const uniqueTitles = Array.from(new Set(entry.meals.map((meal) => meal.title)));
            return (
              <Card key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryIcon}>
                    <Ionicons name="calendar-outline" size={16} color={colors.forest} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.entryDate}>{formatSavedAt(entry.savedAt)}</Text>
                    <Text style={styles.entryMeta}>
                      {mealCount} meal{mealCount === 1 ? '' : 's'} · {uniqueTitles.length} recipe
                      {uniqueTitles.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.recipeList} numberOfLines={2}>
                  {uniqueTitles.join(' · ')}
                </Text>

                <PrimaryButton
                  label="Restore this week"
                  variant="outline"
                  icon={<Ionicons name="refresh-outline" size={16} color={colors.forest} />}
                  onPress={() => confirmRestore(entry)}
                />
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  flex: { flex: 1 },
  emptyTitle: { ...typography.h2, color: colors.ink },
  emptyText: { ...typography.body, color: colors.muted, marginTop: 4, lineHeight: 19 },
  entryCard: { gap: spacing.sm },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDate: { fontWeight: '800', fontSize: 15, color: colors.ink },
  entryMeta: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  recipeList: { ...typography.caption, color: colors.muted, lineHeight: 17 },
});
