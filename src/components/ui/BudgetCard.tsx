// Card showing amount spent against the budget, with a progress bar.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Eyebrow } from './Eyebrow';
import { ProgressMeter } from './ProgressMeter';
import { ReceiptCard } from './ReceiptCard';
import { StatusTag } from './StatusTag';

type BudgetCardProps = {
  eyebrow: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  periodLabel?: string;
  showLink?: boolean;
  onLinkPress?: () => void;
  statusMode?: 'summary' | 'detail';
  footerMeta?: string;
};

function formatRand(amount: number): string {
  return `R${amount.toLocaleString('en-ZA')}`;
}

export function BudgetCard({
  eyebrow,
  totalBudget,
  spent,
  remaining,
  periodLabel,
  showLink = false,
  onLinkPress,
  statusMode = 'summary',
  footerMeta,
}: BudgetCardProps) {
  const percentUsed = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

  return (
    <ReceiptCard>
      <View style={styles.headerRow}>
        <View style={styles.textCol}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Text style={styles.remaining}>{formatRand(remaining)} left</Text>
          <Text style={styles.meta}>
            {formatRand(spent)} planned of {formatRand(totalBudget)}
            {periodLabel ? ` ${periodLabel}` : ''}
          </Text>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="wallet-outline" size={24} color={colors.forest} />
        </View>
      </View>

      <ProgressMeter percentUsed={percentUsed} statusMode={statusMode} />

      <View style={styles.footerRow}>
        <Text style={styles.percentText}>
          {footerMeta ?? `${percentUsed}% used`}
        </Text>
        <StatusTag percentUsed={percentUsed} mode={statusMode} />
      </View>

      {showLink && onLinkPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View full budget"
          onPress={onLinkPress}
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>View full budget</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.forest} />
        </Pressable>
      ) : null}
    </ReceiptCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textCol: {
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remaining: {
    ...typography.display,
    fontSize: 27,
    color: colors.ink,
    marginTop: 6,
  },
  meta: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.muted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  percentText: {
    fontSize: 11.5,
    color: colors.muted,
    fontFamily: typography.body.fontFamily,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginTop: spacing.md,
  },
  linkText: {
    color: colors.forest,
    fontWeight: '700',
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
