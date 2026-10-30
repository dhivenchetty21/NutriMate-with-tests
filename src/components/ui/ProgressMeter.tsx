// Horizontal progress bar.
import { StyleSheet, View } from 'react-native';

import {
  colors,
  getBudgetStatus,
  getBudgetStatusColor,
} from '../../theme/colors';
import { radius } from '../../theme/spacing';

type ProgressMeterProps = {
  percentUsed: number;
  accessibilityLabel?: string;
  statusMode?: 'summary' | 'detail';
};

export function ProgressMeter({
  percentUsed,
  accessibilityLabel,
  statusMode = 'summary',
}: ProgressMeterProps) {
  const status = getBudgetStatus(percentUsed, statusMode);
  const fillColor = getBudgetStatusColor(status);
  const clampedWidth = Math.min(Math.max(percentUsed, 0), 100);

  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `${clampedWidth}% of budget used`}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${clampedWidth}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 9,
    backgroundColor: colors.rule,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
});
