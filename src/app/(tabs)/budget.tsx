// Budget tab: weekly or monthly spend against the budget, by category.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BudgetCard } from '../../components/ui/BudgetCard';
import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { SectionHead } from '../../components/ui/SectionHead';
import { buildBudgetCategories } from '../../utils/basket';
import { useAppState } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type BudgetPeriod = 'month' | 'week';

function formatRand(amount: number): string {
  return `R${amount.toLocaleString('en-ZA')}`;
}

export default function BudgetScreen() {
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const { profile, monthlySpent, monthlyRemaining, weekSpent, shoppingBasket, plannedMeals, planCost } =
    useAppState();

  const isMonth = period === 'month';
  const limit = isMonth ? profile.monthlyBudget : profile.weeklyBudget;
  const spent = isMonth ? monthlySpent : weekSpent;
  const remaining = isMonth ? monthlyRemaining : Math.max(limit - spent, 0);
  const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const budgetCategories = buildBudgetCategories(shoppingBasket);

  // Real numbers from the current plan instead of a fixed sentence.
  const weeklyTarget = profile.weeklyBudget;
  const overBy = Math.round(planCost - weeklyTarget);
  const suggestionTitle =
    plannedMeals.length === 0
      ? 'Plan a few meals to see how you are tracking.'
      : overBy > 0
        ? `Your plan is R${overBy} over your R${weeklyTarget} weekly target.`
        : `Your plan is R${Math.abs(overBy)} under your R${weeklyTarget} weekly target.`;
  const suggestionBody =
    plannedMeals.length === 0
      ? 'Generate a plan with AI or add meals from the Meals tab.'
      : overBy > 0
        ? 'Swap one high-cost dinner for a bean-based alternative to stay below budget.'
        : 'You have room to spare — keep it up, or treat yourself to a higher-protein meal.';
  const maxCategory = budgetCategories.length
    ? Math.max(...budgetCategories.map((c) => c.amount))
    : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Eyebrow>Budget</Eyebrow>
          <Text style={styles.title}>Spend with confidence.</Text>
          <Text style={styles.lede}>
            See how your plan and shopping list affect your food budget.
          </Text>
        </View>

        <View style={styles.chips}>
          <Chip
            label="Monthly"
            selected={isMonth}
            onPress={() => setPeriod('month')}
          />
          <Chip
            label="Weekly"
            selected={!isMonth}
            onPress={() => setPeriod('week')}
          />
        </View>

        <BudgetCard
          eyebrow={isMonth ? 'Food budget this month' : 'Food budget this week'}
          totalBudget={limit}
          spent={spent}
          remaining={remaining}
          periodLabel={isMonth ? '' : ''}
          statusMode="detail"
          footerMeta={`${percentUsed}% used · ${formatRand(remaining)} available`}
        />

        <Callout variant="clay">
          <Ionicons name="bulb-outline" size={18} color={colors.clay} style={styles.calloutIcon} />
          <View style={styles.flex}>
            <Eyebrow variant="clay">NutriMate suggestion</Eyebrow>
            <Text style={styles.suggestionTitle}>{suggestionTitle}</Text>
            <Text style={styles.suggestionBody}>{suggestionBody}</Text>
          </View>
        </Callout>

        <SectionHead title="This month by category" />

        <View style={styles.categoryStack}>
          {budgetCategories.length ? (
            budgetCategories.map((category) => (
              <View key={category.name}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryAmount}>R{category.amount}</Text>
                </View>
                <View style={styles.categoryTrack}>
                  <View
                    style={[
                      styles.categoryFill,
                      {
                        width: `${(category.amount / maxCategory) * 100}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyCategories}>
              Plan a few meals to see how your spend breaks down by category.
            </Text>
          )}
        </View>

        <View style={styles.legendRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
          <Text style={styles.legendText}>
            Green means on track; yellow means approaching your limit; red means over budget.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: 120, gap: spacing.lg },
  header: { paddingTop: spacing.lg },
  title: { ...typography.display, fontSize: 26, color: colors.ink, marginTop: 4 },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  calloutIcon: { marginTop: 2 },
  suggestionTitle: {
    fontFamily: typography.button.fontFamily,
    fontWeight: '800',
    fontSize: 14.5,
    color: colors.ink,
    marginTop: 2,
  },
  suggestionBody: {
    ...typography.caption,
    color: colors.ink,
    marginTop: 3,
    lineHeight: 19,
  },
  categoryStack: { gap: 10 },
  emptyCategories: { ...typography.caption, color: colors.muted },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  categoryName: {
    fontFamily: typography.button.fontFamily,
    fontWeight: '700',
    fontSize: 13.5,
    color: colors.ink,
  },
  categoryAmount: {
    ...typography.mono,
    fontSize: 13,
    color: colors.ink,
  },
  categoryTrack: {
    height: 7,
    borderRadius: 6,
    backgroundColor: colors.rule,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 6,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  legendText: {
    flex: 1,
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: typography.body.fontFamily,
  },
});
