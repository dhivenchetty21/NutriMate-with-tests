// Grocery list screen: the plan's ingredients by category, with tick-off and running total.
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

import { Callout } from '../components/ui/Callout';
import { Eyebrow } from '../components/ui/Eyebrow';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHead } from '../components/ui/SectionHead';
import { categorizeItem } from '../utils/basket';
import { useAppState } from '../context/AppContext';
import { colors } from '../theme/colors';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const categoryOrder = ['Produce', 'Protein', 'Dairy', 'Pantry staples'];

export default function GroceryListScreen() {
  const router = useRouter();
  const { shoppingBasket, profile, plannedMeals } = useAppState();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const shoppingItems = useMemo(
    () => shoppingBasket.filter((item) => !item.alreadyInPantry),
    [shoppingBasket],
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof shoppingItems>();
    for (const item of shoppingItems) {
      const category = categorizeItem(item.name);
      const list = groups.get(category) ?? [];
      list.push(item);
      groups.set(category, list);
    }
    return groups;
  }, [shoppingItems]);

  const total = shoppingItems.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const checkedTotal = shoppingItems
    .filter((item) => checkedItems.has(item.id))
    .reduce((sum, item) => sum + item.estimatedPrice, 0);
  const budgetPercent =
    profile.weeklyBudget > 0 ? Math.round((total / profile.weeklyBudget) * 100) : 0;

  function toggleChecked(id: string) {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          showBack
          eyebrow="Grocery list"
          title="Shopping list"
          onBack={() => router.back()}
        />

        {shoppingItems.length === 0 ? (
          <Card>
            <Ionicons name="cart-outline" size={32} color={colors.forest} />
            <Text style={styles.emptyTitle}>No shopping items yet</Text>
            <Text style={styles.emptyText}>
              Plan meals first and items you still need to buy will appear here.
            </Text>
            <PrimaryButton
              label="Open meal plan"
              onPress={() => router.push('/meal-plan')}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <>
            <Callout variant="forest">
              <View style={styles.basketIcon}>
                <Ionicons name="basket-outline" size={22} color={colors.forest} />
              </View>
              <View style={styles.flex}>
                <Eyebrow>Estimated total</Eyebrow>
                <Text style={styles.total}>R{total.toFixed(2)}</Text>
                <Text style={styles.totalMeta}>
                  {checkedItems.size} of {shoppingItems.length} checked · R
                  {checkedTotal.toFixed(2)} marked complete
                </Text>
              </View>
            </Callout>

            <Card style={styles.budgetNote}>
              <Ionicons name="wallet-outline" size={18} color={colors.forest} />
              <Text style={styles.budgetNoteText}>
                This basket uses about {budgetPercent}% of your R{profile.weeklyBudget} weekly food
                budget.
              </Text>
            </Card>

            {categoryOrder.map((category) => {
              const items = groupedItems.get(category);
              if (!items?.length) return null;

              return (
                <View key={category}>
                  <SectionHead title={category} right={<Text style={styles.count}>{items.length} items</Text>} />
                  <Card style={styles.listPanel}>
                    {items.map((item, index) => {
                      const checked = checkedItems.has(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          onPress={() => toggleChecked(item.id)}
                          style={[
                            styles.checkRow,
                            index < items.length - 1 && styles.checkRowBorder,
                          ]}
                        >
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked ? (
                              <Ionicons name="checkmark" size={12} color={colors.creamText} />
                            ) : null}
                          </View>
                          <View style={styles.checkBody}>
                            <Text style={[styles.itemName, checked && styles.itemNameDone]}>
                              {item.name}
                            </Text>
                            <Text style={[styles.itemQty, checked && styles.itemQtyDone]}>
                              {item.quantity}
                            </Text>
                          </View>
                          <Text style={styles.itemPrice}>R{item.estimatedPrice.toFixed(2)}</Text>
                        </Pressable>
                      );
                    })}
                  </Card>
                </View>
              );
            })}

            <PrimaryButton
              label="Compare prices"
              icon={<Ionicons name="pricetags-outline" size={18} color={colors.creamText} />}
              onPress={() => router.push('/price-comparison')}
            />
            <PrimaryButton
              label="Shopping mode"
              variant="outline"
              icon={<Ionicons name="checkmark-done-outline" size={18} color={colors.forest} />}
              onPress={() =>
                setCheckedItems(new Set(shoppingItems.map((item) => item.id)))
              }
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  basketIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  total: { ...typography.display, fontSize: 25, color: colors.ink, marginTop: 2 },
  totalMeta: { ...typography.caption, color: colors.ink, marginTop: 2 },
  budgetNote: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  budgetNoteText: { ...typography.caption, color: colors.ink, flex: 1, lineHeight: 18 },
  count: { color: colors.muted, fontSize: 11.5, fontWeight: '700' },
  listPanel: { paddingVertical: 2, paddingHorizontal: 14 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: 'dashed',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.forest, borderColor: colors.forest },
  checkBody: { flex: 1 },
  itemName: { fontWeight: '700', fontSize: 14, color: colors.ink },
  itemNameDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  itemQty: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  itemQtyDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  itemPrice: { ...typography.mono, fontSize: 13.5 },
  emptyTitle: { ...typography.h2, color: colors.ink, marginTop: spacing.sm },
  emptyText: { ...typography.body, color: colors.muted, marginTop: 4 },
  emptyButton: { marginTop: spacing.lg },
});
