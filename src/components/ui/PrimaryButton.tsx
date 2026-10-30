// Main button with primary/outline styles, disabled state and loading spinner.
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'clay' | 'ghost';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'clay' && styles.clay,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.creamText : colors.forest} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.primaryLabel,
              variant === 'outline' && styles.outlineLabel,
              variant === 'clay' && styles.clayLabel,
              variant === 'ghost' && styles.ghostLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.forest,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.forest,
  },
  clay: {
    backgroundColor: colors.clay,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    ...typography.button,
  },
  primaryLabel: {
    color: colors.creamText,
  },
  outlineLabel: {
    color: colors.forest,
  },
  clayLabel: {
    color: '#FBF0E4',
  },
  ghostLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
