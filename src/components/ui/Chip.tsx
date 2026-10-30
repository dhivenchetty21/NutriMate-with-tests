// Selectable pill button used for filters and options.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({ label, selected = false, onPress, accessibilityLabel }: ChipProps) {
  const content = (
    <>
      {selected ? (
        <Ionicons name="checkmark" size={10} color={colors.forestDeep} />
      ) : null}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.chipSelected,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} disabled>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.rule,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.forestTint,
    borderColor: colors.forest,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.muted,
  },
  textSelected: {
    color: colors.forestDeep,
  },
  pressed: {
    opacity: 0.85,
  },
});
