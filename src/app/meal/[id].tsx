// Recipe detail screen: ingredients, pantry matches, cost and adding the recipe to a day.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { Callout } from '../../components/ui/Callout';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { ReceiptCard } from '../../components/ui/ReceiptCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { getRecipeById } from '../../data/recipes';
import { planDays } from '../../data/mockData';
import { useAppState } from '../../context/AppContext';
import { countPantryMatches } from '../../utils/basket';
import { getIngredientPrice, getRecipeCostPerServing } from '../../utils/livePricing';
import { colors } from '../../theme/colors';
import { radius, screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function MealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pantryItems, addMealToPlan, plannedMeals, profile } = useAppState();
  const [selectedDay, setSelectedDay] = useState<(typeof planDays)[number]>(planDays[0]);
  const [favourite, setFavourite] = useState(false);

  const recipe = useMemo(() => getRecipeById(id ?? ''), [id]);
  const pantryMatches = recipe ? countPantryMatches(recipe.id, pantryItems) : 0;
  const costPerServing = recipe ? getRecipeCostPerServing(recipe) : 0;
  const totalCost = recipe
    ? recipe.ingredients.reduce((sum, item) => sum + getIngredientPrice(item), 0)
    : 0;
  const caloriesEstimate = recipe ? recipe.durationMinutes * 4 + 280 : 0;

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Recipe not found</Text>
          <PrimaryButton label="Go back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  function handleAddToPlan() {
    const existingMeal = plannedMeals.find((meal) => meal.day === selectedDay);
    addMealToPlan(recipe!.id, selectedDay, recipe!.mealType);
    Alert.alert(
      existingMeal ? 'Meal updated' : 'Meal added',
      `${recipe!.title} is now planned for ${selectedDay}. Your shopping basket will update.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <ScreenHeader showBack onBack={() => router.back()} title="Recipe" />
          <Pressable
            accessibilityRole="button"
            onPress={() => setFavourite((v) => !v)}
            style={styles.favBtn}
          >
            <Ionicons
              name={favourite ? 'heart' : 'heart-outline'}
              size={20}
              color={favourite ? colors.danger : colors.ink}
            />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Ionicons name="restaurant" size={56} color={colors.forest} />
          <View style={styles.heroBadge}>
            <Ionicons name="leaf" size={11} color={colors.forestDeep} />
            <Text style={styles.heroBadgeText}>{recipe.dietaryTags[0]}</Text>
          </View>
        </View>

        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.summary}>{recipe.summary}</Text>

        <View style={styles.metaRow}>
          <MetaPill icon="time-outline" label={`${recipe.durationMinutes} min`} />
          <MetaPill icon="people-outline" label={`${recipe.servings} servings`} />
          <MetaPill icon="flame-outline" label={`${caloriesEstimate} kcal`} />
        </View>

        <ReceiptCard style={styles.costCard}>
          <View style={styles.costRow}>
            <View>
              <Eyebrow>Estimated cost</Eyebrow>
              <Text style={styles.costTotal}>R{totalCost}</Text>
              <Text style={styles.costPerServing}>
                R{costPerServing} per serving · not a final store price
              </Text>
            </View>
            <View style={styles.costIcon}>
              <Ionicons name="cash-outline" size={22} color={colors.forest} />
            </View>
          </View>
        </ReceiptCard>

        <Text style={styles.sectionLabel}>Nutrition</Text>
        <View style={styles.nutritionRow}>
          <NutritionPill label="Calories" value={`${caloriesEstimate}`} />
          <NutritionPill label="Protein" value="24g" />
          <NutritionPill label="Difficulty" value="Easy" />
        </View>

        <Text style={styles.sectionLabel}>Ingredients</Text>
        <Card style={styles.ingredientPanel}>
          {recipe.ingredients.map((ingredient) => {
            const inPantry = pantryItems.some(
              (item) =>
                item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
                ingredient.name.toLowerCase().includes(item.name.toLowerCase()),
            );

            return (
              <View key={ingredient.name} style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>
                  {ingredient.name}{' '}
                  <Text style={styles.ledgerQty}>· {ingredient.quantity}</Text>
                </Text>
                <View style={styles.ledgerFill} />
                <Text style={styles.ledgerVal}>R{getIngredientPrice(ingredient)}</Text>
                {inPantry ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.forest} />
                ) : null}
              </View>
            );
          })}
        </Card>

        <Callout variant="forest">
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={16} color={colors.creamText} />
          </View>
          <View style={styles.flex}>
            <Eyebrow>Why this fits</Eyebrow>
            <Text style={styles.aiText}>
              {recipe.explanation} Uses {pantryMatches} pantry ingredient
              {pantryMatches === 1 ? '' : 's'}.
            </Text>
          </View>
        </Callout>

        {recipe.substitutions.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Substitutions</Text>
            {recipe.substitutions.map((substitution) => (
              <Card key={substitution.original} style={styles.subCard}>
                <Text style={styles.subTitle}>
                  {substitution.original} → {substitution.alternative}
                </Text>
                <Text style={styles.subNote}>{substitution.note}</Text>
              </Card>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Add to weekly plan</Text>
        <View style={styles.chipRow}>
          {planDays.map((day) => (
            <Chip
              key={day}
              label={day}
              selected={selectedDay === day}
              onPress={() => setSelectedDay(day)}
            />
          ))}
        </View>

        <Text style={styles.pantryNote}>
          Budget target R{Math.round(profile.weeklyBudget / 7)}/day
        </Text>

        <PrimaryButton
          label="Add to plan"
          icon={<Ionicons name="calendar-outline" size={18} color={colors.creamText} />}
          onPress={handleAddToPlan}
        />
        <PrimaryButton
          label="Swap recipe"
          variant="outline"
          icon={<Ionicons name="swap-horizontal-outline" size={18} color={colors.forest} />}
          onPress={() => router.push('/ai')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={colors.forest} />
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function NutritionPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionPill}>
      <Text style={styles.nutritionValue}>{value}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'flex-start' },
  favBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  hero: {
    height: 180,
    backgroundColor: colors.clayTint,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  heroBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.forestTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: colors.forestDeep },
  title: { ...typography.display, fontSize: 25, color: colors.ink },
  summary: { ...typography.body, color: colors.muted, lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metaPillText: { ...typography.caption, fontWeight: '600', color: colors.ink },
  costCard: { marginBottom: 0 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costTotal: { ...typography.display, fontSize: 26, color: colors.ink, marginTop: 3 },
  costPerServing: { ...typography.caption, color: colors.muted, marginTop: 2 },
  costIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { ...typography.h2, color: colors.ink },
  nutritionRow: { flexDirection: 'row', gap: spacing.sm },
  nutritionPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  nutritionValue: { ...typography.body, fontWeight: '700', color: colors.ink },
  nutritionLabel: { ...typography.caption, color: colors.muted, fontSize: 10 },
  ingredientPanel: { paddingVertical: 4, paddingHorizontal: 14 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: 'dashed',
  },
  ledgerLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  ledgerQty: { color: colors.muted, fontWeight: '500' },
  ledgerFill: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ruleStrong,
    borderStyle: 'dotted',
    transform: [{ translateY: -4 }],
    minWidth: 10,
  },
  ledgerVal: { ...typography.mono, fontSize: 13.5 },
  aiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  aiText: { ...typography.caption, color: colors.ink, marginTop: 3, lineHeight: 18 },
  subCard: { gap: 4 },
  subTitle: { ...typography.body, fontWeight: '700', color: colors.ink, fontSize: 14 },
  subNote: { ...typography.caption, color: colors.muted, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pantryNote: { ...typography.caption, color: colors.muted },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  emptyTitle: { ...typography.h1, color: colors.ink },
});
