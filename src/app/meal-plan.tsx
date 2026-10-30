// Weekly plan screen: view meals by day, and move, swap or remove them.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Callout } from '../components/ui/Callout';
import { Chip } from '../components/ui/Chip';
import { Eyebrow } from '../components/ui/Eyebrow';
import { MealCard } from '../components/ui/MealCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ProgressMeter } from '../components/ui/ProgressMeter';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { StatusTag } from '../components/ui/StatusTag';
import { planDayShort, planDays } from '../data/mockData';
import { useAppState } from '../context/AppContext';
import { getMealCostPerServing } from '../utils/livePricing';
import { colors } from '../theme/colors';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function MealPlanScreen() {
  const router = useRouter();
  const {
    plannedMeals,
    planCost,
    profile,
    budgetRemaining,
    moveMealToDay,
    removeMealFromPlan,
  } = useAppState();
  const [selectedDay, setSelectedDay] = useState<(typeof planDays)[number]>(planDays[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekLabel = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekOffset]);

  const percentUsed =
    profile.weeklyBudget > 0 ? Math.round((planCost / profile.weeklyBudget) * 100) : 0;
  const selectedDayMeals = plannedMeals.filter((meal) => meal.day === selectedDay);
  const dinnerPlanned = selectedDayMeals.some((meal) => (meal.mealType ?? 'Dinner') === 'Dinner');

  function confirmRemove(mealId: string, title: string) {
    Alert.alert('Remove meal', `Remove ${title} from your plan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMealFromPlan(mealId),
      },
    ]);
  }

  function moveMeal(mealId: string, title: string, currentDay: string) {
    Alert.alert(
      'Move meal',
      `Move ${title} to a different day.`,
      [
        ...planDays
          .filter((day) => day !== currentDay)
          .map((day) => ({
            text: day,
            onPress: () => moveMealToDay(mealId, day),
          })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ScreenHeader
            showBack
            eyebrow="Weekly plan"
            title={weekLabel}
            onBack={() => router.back()}
          />
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={() => setWeekOffset((v) => v - 1)}
              style={styles.weekBtn}
            >
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next week"
              onPress={() => setWeekOffset((v) => v + 1)}
              style={styles.weekBtn}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open AI planner"
              onPress={() => router.push('/ai')}
              style={styles.aiBtn}
            >
              <Ionicons name="sparkles" size={18} color={colors.forest} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.lede}>
          Use swap or move actions instead of a crowded calendar on small phones.
        </Text>

        <View style={styles.dayStrip}>
          {planDays.map((day, index) => (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedDay === day }}
              onPress={() => setSelectedDay(day)}
              style={[styles.dayPip, selectedDay === day && styles.dayPipActive]}
            >
              <Text style={[styles.dayPipText, selectedDay === day && styles.dayPipTextActive]}>
                {planDayShort[index]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Callout variant="forest">
          <View style={styles.dayIcon}>
            <Ionicons name="calendar-outline" size={18} color={colors.forest} />
          </View>
          <View style={styles.flex}>
            <Eyebrow>{selectedDay.toUpperCase()}</Eyebrow>
            <Text style={styles.dayStatus}>
              {dinnerPlanned
                ? 'Dinner is planned below.'
                : 'No meal scheduled yet — use AI to add an idea.'}
            </Text>
          </View>
        </Callout>

        <Text style={styles.sectionLabel}>Planned dinners</Text>
        {plannedMeals.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No dinners planned yet</Text>
            <Text style={styles.emptyText}>
              Generate a plan with AI or add recipes from the Meals tab.
            </Text>
          </Card>
        ) : (
          plannedMeals.map((meal) => (
            <View key={meal.id} style={styles.mealBlock}>
              <Text style={styles.dayLabel}>{meal.day.toUpperCase()}</Text>
              <Card style={styles.mealPanel}>
                <MealCard
                  title={meal.title}
                  duration={meal.duration}
                  cost={getMealCostPerServing(meal)}
                  tag={meal.dietaryTag}
                  pantryItemsUsed={meal.pantryItemsUsed}
                  onPress={() =>
                    router.push({ pathname: '/meal/[id]', params: { id: meal.recipeId } })
                  }
                />
              </Card>
              <View style={styles.actionRow}>
                <Chip label="Swap" onPress={() => router.push('/ai')} />
                <Chip label="Move" onPress={() => moveMeal(meal.id, meal.title, meal.day)} />
                <Pressable onPress={() => confirmRemove(meal.id, meal.title)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Card>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>Weekly cost</Text>
            <StatusTag percentUsed={percentUsed} />
          </View>
          <Text style={styles.weeklyMeta}>
            R{planCost.toLocaleString()} of R{profile.weeklyBudget.toLocaleString()} · R
            {budgetRemaining.toLocaleString()} left for remaining meals
          </Text>
          <ProgressMeter percentUsed={percentUsed} />
        </Card>

        <PrimaryButton
          label="Build grocery list"
          icon={<Ionicons name="list-outline" size={18} color={colors.creamText} />}
          onPress={() => router.push('/grocery-list')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  weekBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, marginTop: -spacing.sm },
  dayStrip: { flexDirection: 'row', gap: 6 },
  dayPip: {
    flex: 1,
    minHeight: 36,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  dayPipText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  dayPipTextActive: { color: colors.creamText },
  dayIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  dayStatus: { fontWeight: '700', fontSize: 14, color: colors.ink, marginTop: 2 },
  sectionLabel: { ...typography.h2, color: colors.ink },
  mealBlock: { gap: 6 },
  dayLabel: { fontSize: 11.5, fontWeight: '700', color: colors.muted },
  mealPanel: { paddingVertical: 2, paddingHorizontal: 14 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  removeText: { ...typography.caption, fontWeight: '700', color: colors.danger },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyTitle: { fontWeight: '700', fontSize: 14, color: colors.ink },
  weeklyMeta: { ...typography.caption, color: colors.muted, marginTop: 6, marginBottom: spacing.sm },
  emptyTitle: { ...typography.h2, color: colors.ink },
  emptyText: { ...typography.body, color: colors.muted, marginTop: 4 },
});
