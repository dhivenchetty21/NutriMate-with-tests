// Coloured status label, e.g. "On track" or "Approaching limit".
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { BudgetStatus, colors, getBudgetStatus } from '../../theme/colors';
import { typography } from '../../theme/typography';

type StatusTagProps = {
  percentUsed: number;
  mode?: 'summary' | 'detail';
};

function getStatusConfig(status: BudgetStatus) {
  switch (status) {
    case 'over':
      return {
        label: 'Over budget',
        color: colors.danger,
        bg: colors.dangerTint,
        icon: 'warning' as const,
      };
    case 'caution':
      return {
        label: 'Approaching limit',
        color: '#8A6314',
        bg: colors.maizeTint,
        icon: 'warning' as const,
      };
    default:
      return {
        label: 'On track',
        color: colors.forest,
        bg: colors.forestTint,
        icon: 'checkmark-circle' as const,
      };
  }
}

export function StatusTag({ percentUsed, mode = 'summary' }: StatusTagProps) {
  const status = getBudgetStatus(percentUsed, mode);
  const config = getStatusConfig(status);

  return (
    <View style={[styles.tag, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  text: {
    ...typography.eyebrow,
    fontSize: 10.5,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
});
