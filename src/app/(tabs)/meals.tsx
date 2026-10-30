// Meals tab: recommended recipes with filter chips and pantry matches.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Callout } from '../../components/ui/Callout';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { MealCard } from '../../components/ui/MealCard';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SectionHead } from '../../components/ui/SectionHead';
import { Card } from '../../components/ui/Card';
import { useAppState } from '../../context/AppContext';
import { countPantryMatches } from '../../utils/basket';
import { getRecipeCostPerServing } from '../../utils/livePricing';
import { RecommendFilter, recommendRecipes } from '../../utils/recommendations';
import { colors } from '../../theme/colors';
import { screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const filterOptions: { key: RecommendFilter; label: string }[] = [
  { key: 'quick', label: 'Quick' },
  { key: 'budget', label: 'Under R20' },
  { key: 'protein', label: 'High protein' },
  { key: 'pantry', label: 'Uses pantry' },
];

export default function MealsScreen() {
  const router = useRouter();
  const { plannedMeals, planCost, profile, pantryItems } = useAppState();
  const [activeFilters, setActiveFilters] = useState<RecommendFilter[]>([]);

  function toggleFilter(key: RecommendFilter) {
    setActiveFilters((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  const recommended = useMemo(
    () =>
      recommendRecipes({
        profile,
        pantryItems,
        plannedMeals,
        filters: activeFilters,
        limit: 5,
      }),
    [profile, pantryItems, plannedMeals, activeFilters],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>Meals</Eyebrow>
          <Text style={styles.title}>What would you like to eat?</Text>
          <Text style={styles.lede}>
            Every idea shows an estimated cost before you add it.
          </Text>
        </View>

        <Pressable onPress={() => router.push('/meal-plan')}>
          <Callout variant="forest">
            <View style={styles.weekIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.forest} />
            </View>
            <View style={styles.flex}>
              <Eyebrow>This week</Eyebrow>
              <Text style={styles.weekText}>
                {plannedMeals.length} meals planned · R{planCost} estimated
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.forest} />
          </Callout>
        </Pressable>

        <View style={styles.chips}>
          {filterOptions.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              selected={activeFilters.includes(option.key)}
              onPress={() => toggleFilter(option.key)}
            />
          ))}
        </View>

        <SectionHead
          title="Recommended for you"
          linkLabel="Ask AI"
          onLinkPress={() => router.push('/ai')}
        />

        <Card style={styles.recipePanel}>
          {recommended.length === 0 ? (
            <Text style={styles.emptyText}>
              Nothing matches those filters. Try switching one off.
            </Text>
          ) : null}
          {recommended.map((recipe, index) => (
            <MealCard
              key={recipe.id}
              title={recipe.title}
              duration={`${recipe.durationMinutes} min`}
              servings={profile.householdSize}
              difficulty="Easy"
              cost={getRecipeCostPerServing(recipe)}
              tag={recipe.dietaryTags[0]}
              pantryItemsUsed={countPantryMatches(recipe.id, pantryItems)}
              onPress={() =>
                router.push({ pathname: '/meal/[id]', params: { id: recipe.id } })
              }
              compact={index > 0}
            />
          ))}
        </Card>

        <PrimaryButton
          label="Open weekly meal plan"
          icon={<Ionicons name="calendar-outline" size={18} color={colors.creamText} />}
          onPress={() => router.push('/meal-plan')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: 120, gap: spacing.lg },
  header: { paddingTop: spacing.lg },
  title: {
    ...typography.display,
    fontSize: 26,
    color: colors.ink,
    marginTop: 4,
  },
  lede: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.muted,
    marginTop: 6,
  },
  weekIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  weekText: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emptyText: { ...typography.body, color: colors.muted, paddingVertical: 18 },
  recipePanel: {
    paddingVertical: 2,
    paddingHorizontal: 14,
  },
});
