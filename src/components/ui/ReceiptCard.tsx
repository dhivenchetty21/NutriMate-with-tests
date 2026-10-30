// Card styled like a till receipt, used for totals.
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

export function ReceiptCard({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.wrapper, style]} {...props}>
      <View style={styles.card}>{children}</View>
      <View style={styles.tear} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.xl,
    shadowColor: '#23281F',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tear: {
    height: 10,
    backgroundColor: colors.paperDeep,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0.5,
  },
});
