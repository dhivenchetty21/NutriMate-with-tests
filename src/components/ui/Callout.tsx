// Highlighted box for tips and estimates.
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type CalloutProps = ViewProps & {
  variant?: 'forest' | 'clay' | 'maize';
};

export function Callout({ style, variant = 'forest', children, ...props }: CalloutProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'clay' && styles.clay,
        variant === 'maize' && styles.maize,
        variant === 'forest' && styles.forest,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  forest: {
    backgroundColor: colors.forestTint,
  },
  clay: {
    backgroundColor: colors.clayTint,
  },
  maize: {
    backgroundColor: colors.maizeTint,
  },
});
