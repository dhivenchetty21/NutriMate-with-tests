// Onboarding: six questions that build the user's profile and first meal plan.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Eyebrow } from '../components/ui/Eyebrow';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { onboardingSteps } from '../data/mockData';
import { useAppState } from '../context/AppContext';
import { findMatchingRecipes } from '../utils/mealMatching';
import { colors } from '../theme/colors';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { fontFamilies } from '../theme/fonts';

type OnboardAnswers = {
  goal: string;
  weeklyBudget: string;
  householdSize: string;
  cookingPreference: string;
  dietary: string;
  location: string;
};

function parseBudget(option: string): number {
  const match = option.match(/R(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 600;
}

function parseHousehold(option: string): number {
  const match = option.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 2;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, completeOnboarding, applyGeneratedPlan, pantryItems } = useAppState();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardAnswers>({
    goal: onboardingSteps[0].options[0],
    weeklyBudget: onboardingSteps[1].options[1],
    householdSize: onboardingSteps[2].options[1],
    cookingPreference: onboardingSteps[3].options[0],
    dietary: onboardingSteps[4].options[0],
    location: onboardingSteps[5].options[0],
  });

  const current = onboardingSteps[step];
  const isFinal = step === onboardingSteps.length - 1;
  const field = current.field;
  const selected = answers[field];

  function setSelected(value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  async function finish() {
    const weeklyBudget = parseBudget(answers.weeklyBudget);
    const householdSize = parseHousehold(answers.householdSize);
    const dietaryRequirements =
      answers.dietary === 'No preference' ? ['Balanced eating'] : [answers.dietary];

    await completeOnboarding({
      goal: answers.goal,
      weeklyBudget,
      monthlyBudget: weeklyBudget * 4 + 100,
      householdSize,
      cookingPreference: answers.cookingPreference,
      dietaryRequirements,
      location:
        answers.location === 'Other location'
          ? profile.location
          : answers.location,
    });

    const matches = findMatchingRecipes(
      {
        mealType: 'Dinner',
        householdSize,
        maxDurationMinutes: 35,
        budgetPerServing: Math.round(weeklyBudget / (householdSize * 7)),
        dietaryRequirements,
        usePantryOnly: false,
      },
      pantryItems,
    );

    await applyGeneratedPlan(matches.slice(0, 3).map((recipe) => recipe.id));
    router.replace('/');
  }

  function next() {
    if (isFinal) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="leaf" size={14} color={colors.tabActive} />
          </View>
          <Text style={styles.brand}>NUTRIMATE</Text>
        </View>

        <View style={styles.progressRow}>
          {onboardingSteps.map((_, index) => (
            <View
              key={onboardingSteps[index].title}
              style={[styles.progressDot, index <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        <View style={styles.copyBlock}>
          <Eyebrow>{`Step ${step + 1} of ${onboardingSteps.length}`}</Eyebrow>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        <Card style={styles.questionCard}>
          <Text style={styles.question}>{current.question}</Text>
          <View style={styles.chipRow}>
            {current.options.map((option) => (
              <Chip
                key={option}
                label={option}
                selected={selected === option}
                onPress={() => setSelected(option)}
              />
            ))}
          </View>
        </Card>

        <PrimaryButton
          label={
            isFinal
              ? 'Generate my first plan'
              : step === 0
                ? 'Get started'
                : 'Continue'
          }
          icon={
            isFinal ? (
              <Ionicons name="sparkles-outline" size={18} color={colors.creamText} />
            ) : step === 0 ? undefined : (
              <Ionicons name="arrow-forward" size={18} color={colors.creamText} />
            )
          }
          onPress={next}
        />

        {step > 0 ? <PrimaryButton label="Back" variant="ghost" onPress={back} /> : null}

        <Text style={styles.footerNote}>
          You can update these preferences at any time. NutriMate uses them only to tailor
          recommendations and estimated costs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: {
    flexGrow: 1,
    padding: screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingTop: spacing.lg,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fontFamilies.monoBold,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.forest,
    fontSize: 14,
  },
  progressRow: { flexDirection: 'row', gap: 5, marginTop: spacing.sm },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.rule,
  },
  progressDotActive: { backgroundColor: colors.forest },
  copyBlock: { gap: spacing.xs, marginTop: spacing.sm },
  title: { ...typography.display, fontSize: 27, color: colors.ink, marginTop: 5 },
  subtitle: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6,
  },
  questionCard: { gap: spacing.md },
  question: {
    fontFamily: fontFamilies.sansExtraBold,
    fontWeight: '800',
    fontSize: 15,
    color: colors.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footerNote: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
});
