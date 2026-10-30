// Home tab: budget status, next action and today's planned meals.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Callout } from '../../components/ui/Callout';
import { BudgetCard } from '../../components/ui/BudgetCard';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionHead } from '../../components/ui/SectionHead';
import { getTimeGreeting, ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { useAppState } from '../../context/AppContext';
import { getMealCostPerServing } from '../../utils/livePricing';
import { colors } from '../../theme/colors';
import { radius, screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const mealTypeOrder = ['Breakfast', 'Lunch', 'Dinner'];
const mealTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Breakfast: 'sunny-outline',
  Lunch: 'partly-sunny-outline',
  Dinner: 'moon-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    profile,
    plannedMeals,
    monthlySpent,
    monthlyRemaining,
  } = useAppState();

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysMeals = plannedMeals
    .filter((meal) => meal.day === todayName)
    .sort(
      (a, b) =>
        mealTypeOrder.indexOf(a.mealType ?? 'Dinner') -
        mealTypeOrder.indexOf(b.mealType ?? 'Dinner'),
    )
    .map((meal) => ({
      id: meal.id,
      mealType: meal.mealType ?? 'Meal',
      title: meal.title,
      icon: mealTypeIcons[meal.mealType ?? 'Dinner'] ?? 'restaurant-outline',
      cost: Math.round(getMealCostPerServing(meal) * profile.householdSize),
    }));

  const dinnersNeeded = Math.max(0, 5 - plannedMeals.length);
  const nextAction =
    dinnersNeeded > 0
      ? `Plan ${dinnersNeeded} dinner${dinnersNeeded === 1 ? '' : 's'} to stay on track.`
      : "You're on track this week. Review your meal plan.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          greeting={getTimeGreeting()}
          userName={profile.userName}
          eyebrow="Home"
          location={profile.location}
          lede={'Plan smarter. Shop smarter.\nEat better.'}
          showProfile
        />

        <BudgetCard
          eyebrow="Food budget this month"
          totalBudget={profile.monthlyBudget}
          spent={monthlySpent}
          remaining={monthlyRemaining}
          showLink
          onLinkPress={() => router.push('/budget')}
        />

        <Pressable onPress={() => router.push('/ai')}>
          <Callout variant="forest" style={styles.callout}>
            <View style={styles.calloutIcon}>
              <Ionicons name="sparkles" size={18} color={colors.creamText} />
            </View>
            <View style={styles.calloutBody}>
              <Eyebrow>Next best action</Eyebrow>
              <Text style={styles.calloutTitle}>{nextAction}</Text>
              <Text style={styles.calloutText}>
                Your estimated plan stays below the R{profile.weeklyBudget} weekly target.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.forest} />
          </Callout>
        </Pressable>

        <SectionHead
          title="Today's meals"
          linkLabel="See plan"
          onLinkPress={() => router.push('/meal-plan')}
        />

        <Card style={styles.todayPanel}>
          {todaysMeals.length ? (
            todaysMeals.map((meal, index) => (
              <View
                key={meal.id}
                style={[
                  styles.todayRow,
                  index < todaysMeals.length - 1 && styles.todayRowBorder,
                ]}
              >
                <View style={styles.todayLeft}>
                  <View style={styles.todayIcon}>
                    <Ionicons name={meal.icon} size={14} color={colors.clay} />
                  </View>
                  <View>
                    <Text style={styles.todayLabel}>{meal.mealType.toUpperCase()}</Text>
                    <Text style={styles.todayTitle}>{meal.title}</Text>
                  </View>
                </View>
                <View style={styles.todayPriceCol}>
                  <Text style={styles.todayPrice}>R{meal.cost}</Text>
                  <Text style={styles.todayEstimate}>estimated</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.todayEmpty}>
              <Text style={styles.todayEmptyText}>Nothing planned for today yet.</Text>
              <Pressable onPress={() => router.push('/meal-plan')}>
                <Text style={styles.todayEmptyLink}>Add a meal</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <SectionHead title="Quick actions" />

        <View style={styles.quickGrid}>
          <QuickTile
            icon="calendar-outline"
            label="Plan meals"
            iconColor={colors.forest}
            onPress={() => router.push('/meal-plan')}
          />
          <QuickTile
            icon="list-outline"
            label="Grocery list"
            iconColor={colors.clay}
            onPress={() => router.push('/grocery-list')}
          />
          <QuickTile
            icon="sparkles-outline"
            label="Ask AI"
            iconColor={colors.forestDeep}
            onPress={() => router.push('/ai')}
          />
        </View>

        <PrimaryButton
          label="Build this week's meal plan"
          icon={<Ionicons name="sparkles-outline" size={18} color={colors.creamText} />}
          onPress={() => router.push('/ai')}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type QuickTileProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  iconColor: string;
  onPress: () => void;
};

function QuickTile({ icon, label, iconColor, onPress }: QuickTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={styles.quickTileText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  callout: {
    alignItems: 'center',
  },
  calloutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBody: {
    flex: 1,
    gap: 2,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  calloutText: {
    ...typography.caption,
    color: colors.ink,
    marginTop: 4,
  },
  todayPanel: {
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  todayEmpty: {
    paddingVertical: 18,
    alignItems: 'flex-start',
    gap: 6,
  },
  todayEmptyText: { ...typography.body, color: colors.muted },
  todayEmptyLink: { ...typography.body, color: colors.forest, fontWeight: '700' },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  todayRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: 'dashed',
  },
  todayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  todayIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.maizeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.muted,
  },
  todayTitle: {
    fontWeight: '700',
    fontSize: 14.5,
    color: colors.ink,
    marginTop: 1,
  },
  todayPriceCol: {
    alignItems: 'flex-end',
  },
  todayPrice: {
    ...typography.mono,
    fontSize: 14,
  },
  todayEstimate: {
    fontSize: 9.5,
    color: colors.muted,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  quickTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    padding: 13,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  quickTileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  cta: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
