// Recipe row showing title, time, servings, cost and a tag.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type MealCardProps = {
  title: string;
  subtitle?: string;
  cost?: number;
  duration?: string;
  servings?: number;
  difficulty?: string;
  tag?: string;
  pantryItemsUsed?: number;
  onPress?: () => void;
  compact?: boolean;
};

export function MealCard({
  title,
  subtitle,
  cost,
  duration,
  servings,
  difficulty,
  tag,
  pantryItemsUsed,
  onPress,
  compact = false,
}: MealCardProps) {
  const meta = [duration, servings ? `${servings} servings` : null, difficulty]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${cost ? `, estimated cost R${cost}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compact,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.thumb}>
        <Ionicons name="restaurant" size={compact ? 17 : 19} color={colors.forest} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        <View style={styles.tagsRow}>
          {tag ? (
            <View style={styles.tagLeaf}>
              <Ionicons name="leaf" size={9} color={colors.forestDeep} />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ) : null}
          {pantryItemsUsed !== undefined ? (
            <Text style={styles.pantryNote}>{pantryItemsUsed} pantry items</Text>
          ) : null}
        </View>
      </View>

      {cost !== undefined ? (
        <View style={styles.priceCol}>
          <Text style={styles.price}>R{cost}</Text>
          <Text style={styles.perServing}>per serving</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  compact: {
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: colors.clayTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  meta: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tagLeaf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.forestTint,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.forestDeep,
  },
  pantryNote: {
    fontSize: 10.5,
    color: colors.muted,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  price: {
    ...typography.mono,
    fontSize: 15,
    color: colors.ink,
  },
  perServing: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
});
