// Track a new item: add one or several product links and fetch their live prices.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Callout } from '../components/ui/Callout';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAppState } from '../context/AppContext';
import { fetchPriceForUrl, isLiveBackendConfigured } from '../services/liveApi';
import { colors } from '../theme/colors';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { CustomPriceItem } from '../types';

type Mode = 'single' | 'bulk';

type BulkOutcome = {
  name: string;
  ok: boolean;
  message: string;
};

const MAX_BULK_LINES = 15;

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AddPriceItemScreen() {
  const router = useRouter();
  const { addCustomPriceItem } = useAppState();
  const { name: prefillName } = useLocalSearchParams<{ name?: string }>();
  const [mode, setMode] = useState<Mode>('single');

  // Single-item mode
  const [name, setName] = useState(prefillName ?? '');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    price: number | null;
    source: CustomPriceItem['source'];
    retailer: string;
    offers?: { retailer: string; price: number }[];
  } | null>(null);

  // Bulk mode
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkOutcomes, setBulkOutcomes] = useState<BulkOutcome[] | null>(null);

  const liveConfigured = isLiveBackendConfigured();

  async function handleFetchPrice() {
    if (!isValidUrl(url)) {
      Alert.alert('Add a product link', 'Paste a full product page link, starting with https://');
      return;
    }

    setFetching(true);
    setResult(null);
    const fetched = await fetchPriceForUrl(url.trim(), name.trim() || 'Item');
    setFetching(false);

    if (!fetched) {
      Alert.alert(
        'Could not fetch a price',
        'The live backend did not respond. Check your connection and try again.',
      );
      return;
    }

    setResult(fetched);
    if (fetched.price === null) {
      Alert.alert(
        'No price found',
        'NutriMate could not read a price from that page. You can still save it and try refreshing again later.',
      );
    }
  }

  async function handleSave() {
    if (!name.trim() || !isValidUrl(url)) {
      Alert.alert('Missing details', 'Add a name and a valid product link before saving.');
      return;
    }

    setSaving(true);
    const item: CustomPriceItem = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      url: url.trim(),
      price: result?.price ?? null,
      source: result?.source ?? 'unavailable',
      retailer: result?.retailer ?? 'Retailer',
      offers: result?.offers,
      fetchedAt: new Date().toISOString(),
    };
    await addCustomPriceItem(item);
    setSaving(false);
    router.back();
  }

  type ParsedBulkLine = { name: string; url: string };

  function parseBulkLines(): { parsed: ParsedBulkLine[]; badLines: string[] } {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, MAX_BULK_LINES);

    const parsed: ParsedBulkLine[] = [];
    const badLines: string[] = [];

    for (const line of lines) {
      const pipeIndex = line.indexOf('|');
      if (pipeIndex === -1) {
        badLines.push(line);
        continue;
      }
      const itemName = line.slice(0, pipeIndex).trim();
      const itemUrl = line.slice(pipeIndex + 1).trim();
      if (!itemName || !isValidUrl(itemUrl)) {
        badLines.push(line);
        continue;
      }
      parsed.push({ name: itemName, url: itemUrl });
    }

    return { parsed, badLines };
  }

  async function handleBulkSave() {
    const { parsed, badLines } = parseBulkLines();

    if (parsed.length === 0) {
      Alert.alert(
        'No valid lines found',
        'Each line needs a name and a link separated by | , e.g.\nAlbany Bread 700g | https://www.checkers.co.za/product/...',
      );
      return;
    }

    if (badLines.length > 0) {
      Alert.alert(
        'Some lines were skipped',
        `${badLines.length} line${badLines.length === 1 ? '' : 's'} didn't match the "Name | URL" format and will be skipped:\n\n${badLines.slice(0, 3).join('\n')}${badLines.length > 3 ? '\n…' : ''}`,
      );
    }

    setBulkSaving(true);
    setBulkOutcomes(null);

    const outcomes = await Promise.all(
      parsed.map(async ({ name: itemName, url: itemUrl }): Promise<BulkOutcome> => {
        const fetched = await fetchPriceForUrl(itemUrl, itemName);
        const item: CustomPriceItem = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: itemName,
          url: itemUrl,
          price: fetched?.price ?? null,
          source: fetched?.source ?? 'unavailable',
          retailer: fetched?.retailer ?? 'Retailer',
          offers: fetched?.offers,
          fetchedAt: new Date().toISOString(),
        };
        await addCustomPriceItem(item);

        const hasPrice = fetched?.price !== null && fetched?.price !== undefined;
        return {
          name: itemName,
          ok: hasPrice,
          message: hasPrice
            ? fetched!.offers && fetched!.offers.length > 1
              ? `Saved — ${fetched!.offers.length} retailers found, cheapest R${fetched!.price!.toFixed(2)} at ${fetched!.retailer}`
              : `Saved — R${fetched!.price!.toFixed(2)} at ${fetched!.retailer}`
            : 'Saved, but no price found yet — it will keep retrying automatically.',
        };
      }),
    );

    setBulkOutcomes(outcomes);
    setBulkSaving(false);
    setBulkText('');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          showBack
          eyebrow="Live prices"
          title="Track a new item"
          onBack={() => router.back()}
        />

        <Text style={styles.lede}>
          This is a one-time step per item — you never need to re-add it. Its price then refreshes
          automatically every 6 hours on its own, as long as the Worker's optional auto-refresh is
          set up (see FIRESTORE-SETUP.md); otherwise it refreshes whenever you open Price
          Comparison. Paste a link from a single retailer (e.g. Checkers) to track one price, or a
          product page from pricecheck.co.za to pull in every retailer it lists for that item at
          once — a real multi-store comparison from a single link.
        </Text>

        <View style={styles.modeRow}>
          <Chip label="One item" selected={mode === 'single'} onPress={() => setMode('single')} />
          <Chip label="Several at once" selected={mode === 'bulk'} onPress={() => setMode('bulk')} />
        </View>

        {!liveConfigured ? (
          <Callout variant="clay">
            <Ionicons name="alert-circle-outline" size={18} color={colors.clay} />
            <Text style={styles.calloutText}>
              The live backend isn't configured yet, so prices can't be fetched right now. You can
              still save the name and link — add EXPO_PUBLIC_WORKER_URL to your .env to enable
              fetching.
            </Text>
          </Callout>
        ) : null}

        {mode === 'single' ? (
          <Card style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Item name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="e.g. Albany Superior White Bread 700g"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Product link</Text>
              <TextInput
                value={url}
                onChangeText={(value) => {
                  setUrl(value);
                  setResult(null);
                }}
                style={styles.input}
                placeholder="https://www.checkers.co.za/product/..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <PrimaryButton
              label={fetching ? 'Fetching…' : 'Fetch price'}
              variant="outline"
              loading={fetching}
              disabled={!liveConfigured || !isValidUrl(url)}
              icon={<Ionicons name="cloud-download-outline" size={18} color={colors.forest} />}
              onPress={handleFetchPrice}
            />

            {result ? (
              <View style={styles.resultRow}>
                <Ionicons
                  name={result.price !== null ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={18}
                  color={result.price !== null ? colors.forest : colors.danger}
                />
                <Text style={styles.resultText}>
                  {result.price !== null
                    ? result.offers && result.offers.length > 1
                      ? `Found ${result.offers.length} retailers — cheapest R${result.price.toFixed(2)} at ${result.retailer}`
                      : `Found R${result.price.toFixed(2)} at ${result.retailer}`
                    : 'No price found on that page yet.'}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              label={saving ? 'Saving…' : 'Save item'}
              loading={saving}
              disabled={!name.trim() || !isValidUrl(url)}
              icon={<Ionicons name="bookmark-outline" size={18} color={colors.creamText} />}
              onPress={handleSave}
            />
          </Card>
        ) : (
          <Card style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>One item per line — Name | Link</Text>
              <TextInput
                value={bulkText}
                onChangeText={setBulkText}
                style={styles.bulkInput}
                placeholder={
                  'Albany Superior White Bread 700g | https://www.checkers.co.za/product/...\n' +
                  'Clover Full Cream Milk 2L | https://www.pnp.co.za/product/...'
                }
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Up to {MAX_BULK_LINES} items at a time. Each line needs a name, then a |, then the
                product link.
              </Text>
            </View>

            <PrimaryButton
              label={bulkSaving ? 'Fetching and saving…' : 'Fetch prices and save all'}
              loading={bulkSaving}
              disabled={!liveConfigured || !bulkText.trim()}
              icon={<Ionicons name="layers-outline" size={18} color={colors.creamText} />}
              onPress={handleBulkSave}
            />

            {bulkOutcomes ? (
              <View style={styles.bulkResults}>
                {bulkOutcomes.map((outcome, index) => (
                  <View key={`${outcome.name}-${index}`} style={styles.resultRow}>
                    <Ionicons
                      name={outcome.ok ? 'checkmark-circle' : 'alert-circle-outline'}
                      size={16}
                      color={outcome.ok ? colors.forest : colors.danger}
                    />
                    <Text style={styles.resultText}>
                      <Text style={styles.resultName}>{outcome.name}</Text>
                      {' — '}
                      {outcome.message}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  lede: { ...typography.body, fontSize: 13.5, color: colors.muted, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  calloutText: { ...typography.body, color: colors.ink, fontSize: 13, flex: 1, lineHeight: 19 },
  formCard: { gap: spacing.md },
  field: { gap: 6 },
  label: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  bulkInput: {
    minHeight: 140,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 13.5,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  helperText: { ...typography.caption, color: colors.muted, fontSize: 11, lineHeight: 16 },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultText: { ...typography.body, color: colors.ink, fontSize: 13, flex: 1, lineHeight: 18 },
  resultName: { fontWeight: '700' },
  bulkResults: { gap: spacing.sm, marginTop: spacing.xs },
});
