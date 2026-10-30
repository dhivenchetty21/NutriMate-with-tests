// Price comparison screen: live tracked prices grouped by product and retailer.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { Eyebrow } from '../components/ui/Eyebrow';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Card } from '../components/ui/Card';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHead } from '../components/ui/SectionHead';
import { useAppState } from '../context/AppContext';
import {
  fetchLivePrices,
  fetchPriceForUrl,
  isLiveBackendConfigured,
  LivePrices,
} from '../services/liveApi';
import { colors } from '../theme/colors';
import { screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { CustomPriceItem } from '../types';

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

type PricedItem = {
  key: string;
  name: string;
  retailer: string;
  price: number;
  removableId: string | null;
};

type UnpricedItem = {
  key: string;
  name: string;
  retailer: string;
  removableId: string | null;
};

type ComparisonGroup = {
  name: string;
  entries: PricedItem[];
  cheapest: number;
};

function normaliseName(name: string): string {
  return name.trim().toLowerCase();
}

export default function PriceComparisonScreen() {
  const router = useRouter();
  const { shoppingBasket, customPriceItems, removeCustomPriceItem } = useAppState();
  const [livePrices, setLivePrices] = useState<LivePrices | null>(null);
  const [customResults, setCustomResults] = useState<
    Record<
      string,
      {
        price: number | null;
        source: CustomPriceItem['source'];
        retailer: string;
        offers?: { retailer: string; price: number }[];
      }
    >
  >({});
  const [refreshingCustom, setRefreshingCustom] = useState(false);

  const shoppingItems = shoppingBasket.filter((item) => !item.alreadyInPantry);
  const hasItems = shoppingItems.length > 0;
  const liveConfigured = isLiveBackendConfigured();

  useEffect(() => {
    if (!liveConfigured) return;
    fetchLivePrices().then(setLivePrices);
    // Fetch once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!liveConfigured || customPriceItems.length === 0) return;
    let cancelled = false;

    async function refreshCustomPrices() {
      setRefreshingCustom(true);
      const entries = await Promise.all(
        customPriceItems.map(async (item) => {
          const fetched = await fetchPriceForUrl(item.url, item.name);
          return [
            item.id,
            fetched ?? {
              price: item.price,
              source: item.source,
              retailer: item.retailer,
              offers: item.offers,
            },
          ] as const;
        }),
      );
      if (!cancelled) {
        setCustomResults(Object.fromEntries(entries));
        setRefreshingCustom(false);
      }
    }

    refreshCustomPrices();
    return () => {
      cancelled = true;
    };
    // Only re-run when the set of tracked items changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPriceItems.map((item) => item.id).join(',')]);

  function confirmRemoveCustomItem(name: string, id: string) {
    Alert.alert('Remove tracked item', `Stop tracking ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeCustomPriceItem(id) },
    ]);
  }

  // All tracked items from both sources (Worker list and user-added), in one shape.
  const allTrackedRaw = useMemo(() => {
    const builtIn = (livePrices?.items ?? []).map((item) => ({
      key: item.id,
      name: item.name,
      price: item.price,
      retailer: item.retailer ?? 'Retailer',
      offers: item.offers,
      removableId: null as string | null,
    }));

    const custom = customPriceItems.map((item) => {
      const resolved = customResults[item.id] ?? {
        price: item.price,
        source: item.source,
        retailer: item.retailer,
        offers: item.offers,
      };
      return {
        key: item.id,
        name: item.name,
        price: resolved.price,
        retailer: resolved.retailer || item.retailer,
        offers: resolved.offers ?? item.offers,
        removableId: item.id,
      };
    });

    return [...builtIn, ...custom];
  }, [livePrices, customPriceItems, customResults]);

  // A PriceCheck link holds several retailers' prices: split it into one row per retailer.
  const pricedItems: PricedItem[] = allTrackedRaw.flatMap((item) => {
    if (item.offers && item.offers.length > 1) {
      return item.offers.map((offer, index) => ({
        key: `${item.key}-${index}`,
        name: item.name,
        retailer: offer.retailer,
        price: offer.price,
        removableId: item.removableId,
      }));
    }
    if (item.price === null) return [];
    return [
      {
        key: item.key,
        name: item.name,
        retailer: item.retailer,
        price: item.price,
        removableId: item.removableId,
      },
    ];
  });

  const unpricedItems: UnpricedItem[] = allTrackedRaw
    .filter((item) => item.price === null && (!item.offers || item.offers.length === 0))
    .map((item) => ({
      key: item.key,
      name: item.name,
      retailer: item.retailer,
      removableId: item.removableId,
    }));

  // Group by product name. Items with two or more retailers get a comparison card.
  const groups: ComparisonGroup[] = useMemo(() => {
    const byName = new Map<string, PricedItem[]>();
    for (const item of pricedItems) {
      const key = normaliseName(item.name);
      const list = byName.get(key) ?? [];
      list.push(item);
      byName.set(key, list);
    }
    return Array.from(byName.values())
      .map((entries) => ({
        name: entries[0].name,
        entries: entries.sort((a, b) => a.price - b.price),
        cheapest: Math.min(...entries.map((e) => e.price)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pricedItems]);

  const multiRetailerGroups = groups.filter((group) => group.entries.length > 1);
  const singleRetailerGroups = groups.filter((group) => group.entries.length === 1);

  // Savings from items priced at two or more retailers only.
  const liveSavings = multiRetailerGroups.reduce((sum, group) => {
    const prices = group.entries.map((e) => e.price);
    return sum + (Math.max(...prices) - Math.min(...prices));
  }, 0);

  // Basket items with no live price yet, listed as not tracked.
  const trackedNameSet = new Set(groups.map((g) => normaliseName(g.name)));
  const untrackedBasketItems = shoppingItems.filter(
    (item) => !trackedNameSet.has(normaliseName(item.name)),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          showBack
          eyebrow="Price comparison"
          title="Shop the smarter basket."
          onBack={() => router.back()}
        />

        <Text style={styles.lede}>
          {liveConfigured
            ? 'Every price below comes from a real retailer page you or NutriMate tracked — nothing here is simulated.'
            : 'The live backend isn’t configured, so there are no real prices to show yet. See FIRESTORE-SETUP.md / cloudflare-worker/README.md to enable it.'}
        </Text>

        {!liveConfigured ? (
          <Card style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.forest} />
            <Text style={styles.infoText}>
              Deploy the Cloudflare Worker and set EXPO_PUBLIC_WORKER_URL to start tracking real
              prices here.
            </Text>
          </Card>
        ) : (
          <>
            {multiRetailerGroups.length > 0 ? (
              <Callout variant="forest">
                <View style={styles.savingsIcon}>
                  <Ionicons name="trending-down-outline" size={22} color={colors.forest} />
                </View>
                <View style={styles.flex}>
                  <Eyebrow>Real savings found</Eyebrow>
                  <Text style={styles.savingsTitle}>Save up to R{liveSavings.toFixed(2)}</Text>
                  <Text style={styles.savingsMeta}>
                    Across {multiRetailerGroups.length} item
                    {multiRetailerGroups.length === 1 ? '' : 's'} tracked at more than one store.
                  </Text>
                </View>
              </Callout>
            ) : (
              <Card style={styles.infoCard}>
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.forest} />
                <Text style={styles.infoText}>
                  No real comparison yet — track the same item from a second retailer (e.g. the
                  same bread from both Checkers and Pick n Pay) and a live price comparison will
                  appear here automatically.
                </Text>
              </Card>
            )}

            {multiRetailerGroups.length > 0 ? (
              <>
                <SectionHead title="Compared across retailers" />
                {multiRetailerGroups.map((group) => (
                  <Card key={group.name} style={styles.priceCard}>
                    <Text style={styles.itemName}>{group.name}</Text>
                    <View style={styles.storeList}>
                      {group.entries.map((entry) => {
                        const isBest = entry.price === group.cheapest;
                        return (
                          <Pressable
                            key={entry.key}
                            disabled={!entry.removableId}
                            onLongPress={() =>
                              entry.removableId &&
                              confirmRemoveCustomItem(group.name, entry.removableId)
                            }
                            style={[styles.storeRow, isBest && styles.storeRowBest]}
                          >
                            <Text style={[styles.storeName, isBest && styles.storeNameBest]}>
                              {entry.retailer}
                            </Text>
                            <View style={styles.storePriceCol}>
                              <Text style={[styles.storePrice, isBest && styles.storePriceBest]}>
                                R{entry.price.toFixed(2)}
                              </Text>
                              {isBest ? (
                                <View style={styles.bestBadge}>
                                  <Ionicons name="checkmark" size={10} color={colors.forestDeep} />
                                  <Text style={styles.bestBadgeText}>Best</Text>
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Card>
                ))}
              </>
            ) : null}

            {singleRetailerGroups.length > 0 ? (
              <>
                <SectionHead
                  title="Live prices"
                  right={
                    livePrices?.updatedAt ? (
                      <Text style={styles.staleNote}>
                        <Ionicons name="time-outline" size={11} /> {timeAgo(livePrices.updatedAt)}
                      </Text>
                    ) : null
                  }
                />
                <Card style={styles.priceCard}>
                  {singleRetailerGroups.map((group, index) => {
                    const entry = group.entries[0];
                    return (
                      <Pressable
                        key={entry.key}
                        disabled={!entry.removableId}
                        onLongPress={() =>
                          entry.removableId && confirmRemoveCustomItem(group.name, entry.removableId)
                        }
                        style={[
                          styles.storeRow,
                          index < singleRetailerGroups.length - 1 && styles.storeRowDivider,
                        ]}
                      >
                        <View style={styles.flex}>
                          <Text style={styles.storeName}>{group.name}</Text>
                          <Text style={styles.liveSourceTag}>
                            {entry.retailer}
                            {entry.removableId ? ' · hold to remove' : ''}
                          </Text>
                        </View>
                        <Text style={styles.storePrice}>R{entry.price.toFixed(2)}</Text>
                      </Pressable>
                    );
                  })}
                </Card>
              </>
            ) : null}

            {unpricedItems.length > 0 ? (
              <>
                <SectionHead
                  title="Still checking"
                  right={refreshingCustom ? <Text style={styles.staleNote}>Refreshing…</Text> : null}
                />
                <Card style={styles.priceCard}>
                  {unpricedItems.map((item, index) => (
                    <Pressable
                      key={item.key}
                      disabled={!item.removableId}
                      onLongPress={() =>
                        item.removableId && confirmRemoveCustomItem(item.name, item.removableId)
                      }
                      style={[
                        styles.storeRow,
                        index < unpricedItems.length - 1 && styles.storeRowDivider,
                      ]}
                    >
                      <View style={styles.flex}>
                        <Text style={styles.storeName}>{item.name}</Text>
                        <Text style={styles.liveSourceTag}>
                          {item.retailer} · no price found yet
                          {item.removableId ? ' · hold to remove' : ''}
                        </Text>
                      </View>
                      <Text style={styles.storePrice}>—</Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}

            <PrimaryButton
              label="Track a new item"
              variant="outline"
              icon={<Ionicons name="add-circle-outline" size={18} color={colors.forest} />}
              onPress={() => router.push('/add-price-item')}
            />
          </>
        )}

        {hasItems && untrackedBasketItems.length > 0 ? (
          <>
            <SectionHead title="Not tracked live yet" />
            <Card style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.forest} />
              <Text style={styles.infoText}>
                These come from your meal plan but aren't tracked at any retailer yet, so there's
                no live price to show. Tracking an item is a one-time step — once added, its price
                keeps itself up to date automatically (every 6 hours if the Worker's optional
                auto-refresh is set up, otherwise whenever you open this screen). You can also
                track several at once from the "Track a new item" screen.
              </Text>
            </Card>
            {untrackedBasketItems.map((item) => (
              <Card key={item.id} style={styles.untrackedRow}>
                <View style={styles.flex}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.quantity}</Text>
                </View>
                {liveConfigured ? (
                  <PrimaryButton
                    label="Track"
                    variant="outline"
                    style={styles.trackButton}
                    onPress={() =>
                      router.push({ pathname: '/add-price-item', params: { name: item.name } })
                    }
                  />
                ) : null}
              </Card>
            ))}
          </>
        ) : null}

        {!hasItems ? (
          <Card>
            <Text style={styles.emptyTitle}>Plan meals to compare prices</Text>
            <Text style={styles.emptyText}>
              Add meals to your weekly plan to build a basket for comparison.
            </Text>
            <PrimaryButton
              label="Open meal plan"
              onPress={() => router.push('/meal-plan')}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <PrimaryButton
            label="Back to grocery list"
            variant="outline"
            icon={<Ionicons name="list-outline" size={18} color={colors.forest} />}
            onPress={() => router.push('/grocery-list')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, marginTop: -spacing.sm },
  savingsIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  savingsTitle: { ...typography.display, fontSize: 22, color: colors.ink, marginTop: 2 },
  savingsMeta: { ...typography.caption, color: colors.ink, marginTop: 2 },
  staleNote: { color: colors.muted, fontSize: 10.5, fontWeight: '700' },
  priceCard: { padding: spacing.lg, gap: spacing.sm },
  itemName: { fontWeight: '800', fontSize: 15.5, color: colors.ink },
  itemMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  storeList: { borderTopWidth: 1, borderTopColor: colors.rule, marginTop: spacing.sm },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  storeRowBest: {
    backgroundColor: colors.forestTint,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  storeRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  liveSourceTag: { fontSize: 10, color: colors.muted, marginTop: 2, fontWeight: '600' },
  storeName: { fontSize: 12.5, fontWeight: '700', color: colors.muted },
  storeNameBest: { color: colors.forestDeep },
  storePriceCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storePrice: { ...typography.mono, fontSize: 13.5, color: colors.ink },
  storePriceBest: { color: colors.forestDeep },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '700', color: colors.forestDeep },
  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { ...typography.caption, color: colors.muted, flex: 1, lineHeight: 18 },
  untrackedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trackButton: { minHeight: 40, paddingHorizontal: spacing.md },
  emptyTitle: { ...typography.h2, color: colors.ink },
  emptyText: { ...typography.body, color: colors.muted, marginTop: 4 },
  emptyButton: { marginTop: spacing.lg },
});
