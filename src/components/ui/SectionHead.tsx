// Section heading with an optional "see all" link.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type SectionHeadProps = {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  right?: React.ReactNode;
};

export function SectionHead({ title, linkLabel, onLinkPress, right }: SectionHeadProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right}
      {linkLabel && onLinkPress ? (
        <Pressable accessibilityRole="button" onPress={onLinkPress} hitSlop={8}>
          <Text style={styles.link}>{linkLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
  },
  link: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.forest,
  },
});
