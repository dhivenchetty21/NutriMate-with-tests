// Basic bordered card used as a container on every screen.
import { StyleSheet, View, ViewProps } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type CardProps = ViewProps & {
  variant?: 'default' | 'accent' | 'highlight';
};

export function Card({ style, variant = 'default', children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'accent' && styles.accent,
        variant === 'highlight' && styles.highlight,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.rule,
    shadowColor: '#23281F',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  accent: {
    backgroundColor: colors.forestTint,
    borderColor: colors.forestTint,
  },
  highlight: {
    borderColor: colors.clay,
    backgroundColor: colors.clayTint,
  },
});
