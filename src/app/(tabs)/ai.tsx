// AI tab: generates a week of dinners with Gemini, or from the local catalog as a fallback.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { Callout } from '../../components/ui/Callout';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { MealCard } from '../../components/ui/MealCard';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAppState } from '../../context/AppContext';
import { getAllDynamicRecipes, recipeCatalog, registerDynamicRecipes } from '../../data/recipes';
import { generateAiMealPlan, getLastAiPlanError, isLiveBackendConfigured } from '../../services/liveApi';
import { saveCustomRecipes } from '../../services/storage';
import { colors } from '../../theme/colors';
import { screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MealType, Recipe } from '../../types';
import { getRecipeCostPerServing } from '../../utils/livePricing';
import { findMatchingRecipes } from '../../utils/mealMatching';

const cookingTimeOptions = ['Quick', 'Balanced', 'Weekend'];
const dietOptions = ['High protein', 'Balanced', 'Vegetarian'];

export default function AiScreen() {
  const router = useRouter();
  const { profile, pantryItems, applyGeneratedPlan } = useAppState();
  const [aiCookingTime, setAiCookingTime] = useState('Quick');
  const [aiDiet, setAiDiet] = useState('High protein');
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [resultRecipes, setResultRecipes] = useState<Recipe[]>([]);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [usedLiveAi, setUsedLiveAi] = useState(false);

  const matches = useMemo(
    () =>
      findMatchingRecipes(
        {
          mealType: 'Dinner' as MealType,
          householdSize: profile.householdSize,
          maxDurationMinutes: aiCookingTime === 'Quick' ? 35 : 60,
          budgetPerServing: Math.round(profile.weeklyBudget / (profile.householdSize * 7)),
          dietaryRequirements: [aiDiet],
          usePantryOnly: false,
        },
        pantryItems,
      ),
    [aiCookingTime, aiDiet, pantryItems, profile],
  );

  const estimatedTotal = useMemo(() => {
    const avgCost =
      matches.length > 0
        ? matches.reduce((sum, r) => sum + getRecipeCostPerServing(r), 0) / matches.length
        : 30;
    return Math.round(avgCost * profile.householdSize * 7);
  }, [matches, profile.householdSize]);

  const underTarget = profile.weeklyBudget - estimatedTotal;

  async function handleGenerate() {
    setGenerating(true);

    // Repeat the picks so all 7 days get a dinner.
    const fillWeek = (picks: Recipe[]): Recipe[] =>
      picks.length === 0 ? [] : Array.from({ length: 7 }, (_, i) => picks[i % picks.length]);

    let distinctPicks: Recipe[] = [];
    let tip: string | null = null;
    let live = false;

    if (isLiveBackendConfigured()) {
      // Ask Gemini (via the Worker) for new recipes that fit the preferences and budget.
      const aiResult = await generateAiMealPlan({
        preferences: { cookingTime: aiCookingTime, diet: aiDiet },
        householdSize: profile.householdSize,
        weeklyBudget: profile.weeklyBudget,
      });

      if (aiResult && aiResult.recipes.length > 0) {
        distinctPicks = aiResult.recipes;
        tip = aiResult.tip || null;
        live = true;

        // Register the new recipes for other screens, then save them to Firestore.
        registerDynamicRecipes(aiResult.recipes);
        await saveCustomRecipes(getAllDynamicRecipes());
      } else {
        // Tell the user the live AI failed and local recipes are used instead.
        const reason = getLastAiPlanError();
        Alert.alert(
          'Live AI unavailable right now',
          reason
            ? `Showing local recipes instead. Reason: ${reason}`
            : 'Showing local recipes instead.',
        );
      }
    }

    if (distinctPicks.length === 0) {
      // Fall back to the local catalog. If nothing matches the filters, use all dinners.
      const dinnerCatalog = recipeCatalog.filter((r) => r.mealType === 'Dinner');
      const fallbackPool = matches.length > 0 ? matches : dinnerCatalog;

      if (fallbackPool.length === 0) {
        setGenerating(false);
        Alert.alert(
          'No recipes available',
          'The recipe catalog appears to be empty, so there is nothing to generate a plan from.',
        );
        return;
      }

      distinctPicks = fallbackPool.slice(0, 7);
      tip =
        matches.length === 0
          ? 'Showing a broader pick — nothing matched your exact filters.'
          : null;
    }

    const weekPlan = fillWeek(distinctPicks);
    await applyGeneratedPlan(weekPlan.map((r) => r.id));
    setResultRecipes(distinctPicks);
    setAiTip(tip);
    setUsedLiveAi(live);
    setGenerating(false);
    setHasGenerated(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={18} color={colors.creamText} />
          </View>
          <View style={styles.flex}>
            <Eyebrow>AI meal planner</Eyebrow>
            <Text style={styles.headerTitle}>Tell me what you need this week.</Text>
          </View>
        </View>
        <Text style={styles.lede}>
          NutriMate balances your budget, food preferences, cooking time, and ingredients you
          already have.
        </Text>

        <Card style={styles.setupPanel}>
          <SetupLine icon="cash-outline" label="Budget" value={`R${profile.weeklyBudget} for 7 days`} />
          <SetupLine icon="people-outline" label="People" value={`${profile.householdSize} people`} border />
          <SetupLine
            icon="location-outline"
            label="Location"
            value={`${profile.location ?? 'Johannesburg'} prices`}
          />
        </Card>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <Text style={styles.fieldLabel}>Cooking time</Text>
        <View style={styles.chips}>
          {cookingTimeOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={aiCookingTime === option}
              onPress={() => setAiCookingTime(option)}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Eating style</Text>
        <View style={styles.chips}>
          {dietOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={aiDiet === option}
              onPress={() => setAiDiet(option)}
            />
          ))}
        </View>

        <Callout variant="maize">
          <View style={styles.calcIcon}>
            <Ionicons name="calculator-outline" size={18} color={colors.clay} />
          </View>
          <View style={styles.flex}>
            <Eyebrow variant="clay">Live estimate</Eyebrow>
            <Text style={styles.estimateTitle}>
              Estimated weekly total: R{estimatedTotal.toLocaleString()}
            </Text>
            <Text style={styles.estimateMeta}>
              R{Math.max(underTarget, 0)} under your R{profile.weeklyBudget} target · costs are
              estimates
            </Text>
          </View>
        </Callout>

        <PrimaryButton
          label={generating ? 'Working…' : 'Generate plan'}
          loading={generating}
          variant={generating ? 'outline' : 'primary'}
          icon={
            !generating ? (
              <Ionicons name="sparkles-outline" size={18} color={colors.creamText} />
            ) : undefined
          }
          onPress={handleGenerate}
        />

        {hasGenerated ? (
          <View style={styles.results}>
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
              <Text style={styles.successText}>Your affordable week is ready.</Text>
              {usedLiveAi ? (
                <View style={styles.liveBadge}>
                  <Ionicons name="sparkles" size={10} color={colors.forestDeep} />
                  <Text style={styles.liveBadgeText}>Live AI</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.lede}>
              {aiTip ?? 'Review each estimated cost before accepting the plan.'}
            </Text>
            <Card style={styles.recipePanel}>
              {resultRecipes.map((recipe) => (
                <MealCard
                  key={recipe.id}
                  title={recipe.title}
                  duration={`${recipe.durationMinutes} min`}
                  servings={profile.householdSize}
                  difficulty="Easy"
                  cost={getRecipeCostPerServing(recipe)}
                  tag={recipe.dietaryTags[0]}
                  onPress={() =>
                    router.push({ pathname: '/meal/[id]', params: { id: recipe.id } })
                  }
                />
              ))}
            </Card>
            <PrimaryButton
              label="Review weekly plan"
              variant="outline"
              icon={<Ionicons name="calendar-outline" size={18} color={colors.forest} />}
              onPress={() => router.push('/meal-plan')}
            />
          </View>
        ) : (
          <Card style={styles.tipPanel}>
            <Ionicons name="bulb-outline" size={18} color={colors.clay} />
            <View style={styles.flex}>
              <Text style={styles.tipTitle}>Start with a realistic budget.</Text>
              <Text style={styles.tipText}>
                {isLiveBackendConfigured()
                  ? 'Gemini will invent and explain a fresh set of recipes once you generate a plan.'
                  : 'You can swap any meal later and NutriMate will recalculate the weekly estimate.'}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SetupLine({
  icon,
  label,
  value,
  border,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  border?: boolean;
}) {
  return (
    <View style={[styles.setupLine, border && styles.setupBorder]}>
      <View style={styles.setupIcon}>
        <Ionicons name={icon} size={14} color={colors.forest} />
      </View>
      <View>
        <Text style={styles.setupLabel}>{label}</Text>
        <Text style={styles.setupValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: 120, gap: spacing.lg },
  headerRow: { flexDirection: 'row', gap: 11, paddingTop: spacing.lg, alignItems: 'center' },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  headerTitle: { fontSize: 19, fontWeight: '600', color: colors.ink, marginTop: 2 },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, lineHeight: 20 },
  setupPanel: { paddingVertical: 4, paddingHorizontal: 14 },
  setupLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingVertical: spacing.sm,
  },
  setupBorder: { borderBottomWidth: 1, borderBottomColor: colors.rule, borderStyle: 'dashed' },
  setupIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  setupValue: { fontWeight: '700', fontSize: 14.5, color: colors.ink, marginTop: 2 },
  sectionLabel: { ...typography.h2, color: colors.ink },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
  fieldSpacing: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  calcIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estimateTitle: { fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 2 },
  estimateMeta: { ...typography.caption, color: colors.ink, marginTop: 3 },
  results: { gap: spacing.lg },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  successText: { fontWeight: '700', fontSize: 15, color: colors.forest },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.forestTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: 4,
  },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: colors.forestDeep },
  recipePanel: { paddingVertical: 2, paddingHorizontal: 14 },
  tipPanel: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipTitle: { fontWeight: '800', fontSize: 14.5, color: colors.ink },
  tipText: { ...typography.caption, color: colors.muted, marginTop: 4, lineHeight: 18 },
});