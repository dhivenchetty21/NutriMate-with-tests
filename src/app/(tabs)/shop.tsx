// Shop tab: basket total and links to the grocery list and price comparison.
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
import { Eyebrow } from '../../components/ui/Eyebrow';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';
import { useAppState } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { radius, screenPadding, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function ShopScreen() {
  const router = useRouter();
  const { shoppingBasket, profile } = useAppState();

  const shoppingItems = shoppingBasket.filter((item) => !item.alreadyInPantry);
  const total = shoppingItems.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const underTarget = profile.weeklyBudget - total;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>Shop</Eyebrow>
          <Text style={styles.title}>Make your plan practical.</Text>
          <Text style={styles.lede}>
            Your meal plan has been turned into one organised shopping list.
          </Text>
        </View>

        <Callout variant="forest">
          <View style={styles.basketIcon}>
            <Ionicons name="basket-outline" size={22} color={colors.forest} />
          </View>
          <View style={styles.flex}>
            <Eyebrow>Estimated basket total</Eyebrow>
            <Text style={styles.total}>R{total.toFixed(2)}</Text>
            <Text style={styles.totalMeta}>
              {shoppingItems.length} ingredients · R{Math.max(underTarget, 0)} under weekly target
            </Text>
          </View>
        </Callout>

        <Pressable onPress={() => router.push('/grocery-list')}>
          <Card style={styles.linkCard}>
            <View style={styles.linkRow}>
              <View style={styles.linkIconForest}>
                <Ionicons name="list-outline" size={18} color={colors.forest} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.linkTitle}>Smart grocery list</Text>
                <Text style={styles.linkMeta}>
                  Grouped by category · edit quantities · tick items off
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.forest} />
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => router.push('/price-comparison')}>
          <Card style={styles.linkCard}>
            <View style={styles.linkRow}>
              <View style={styles.linkIconClay}>
                <Ionicons name="pricetags-outline" size={18} color={colors.clay} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.linkTitle}>Compare estimated prices</Text>
                <Text style={styles.linkMeta}>
                  Live prices from the stores you track · compare before you buy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.forest} />
            </View>
          </Card>
        </Pressable>

        <Text style={styles.sectionLabel}>Before you shop</Text>
        <Callout variant="forest">
          <Ionicons name="information-circle-outline" size={18} color={colors.forest} />
          <Text style={styles.infoText}>
            Prices are estimates and may vary by store and package size. NutriMate shows when
            each price was last updated.
          </Text>
        </Callout>

        <PrimaryButton
          label="Open grocery list"
          icon={<Ionicons name="list-outline" size={18} color={colors.creamText} />}
          onPress={() => router.push('/grocery-list')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: 120, gap: spacing.lg },
  header: { paddingTop: spacing.lg },
  title: { ...typography.display, fontSize: 26, color: colors.ink, marginTop: 4 },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, marginTop: 6 },
  basketIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  total: { ...typography.display, fontSize: 26, color: colors.ink, marginTop: 3 },
  totalMeta: { ...typography.caption, color: colors.ink, marginTop: 2 },
  linkCard: { padding: spacing.lg },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkIconForest: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconClay: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: colors.clayTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontWeight: '800', fontSize: 15, color: colors.ink },
  linkMeta: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
  sectionLabel: { ...typography.h2, color: colors.ink, marginTop: spacing.sm },
  infoText: { ...typography.caption, color: colors.ink, flex: 1, lineHeight: 18 },
});
