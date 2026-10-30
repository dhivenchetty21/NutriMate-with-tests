// Screen title bar with optional back button and action.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Eyebrow } from './Eyebrow';

type ScreenHeaderProps = {
  greeting?: string;
  userName?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showProfile?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  location?: string;
  lede?: string;
};

export function ScreenHeader({
  greeting,
  userName,
  eyebrow,
  title,
  subtitle,
  showProfile = false,
  showBack = false,
  onBack,
  location,
  lede,
}: ScreenHeaderProps) {
  const router = useRouter();

  if (showBack) {
    return (
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack ?? (() => router.back())}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.topBarText}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          {title ? <Text style={styles.topBarTitle}>{title}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.textColumn}>
        {eyebrow ? (
          <Eyebrow>
            {eyebrow}
            {location ? ` · ${location}` : ''}
          </Eyebrow>
        ) : null}
        {greeting ? (
          <Text style={styles.display}>
            {greeting}
            {userName ? `,\n${userName}.` : ''}
          </Text>
        ) : null}
        {title ? <Text style={styles.display}>{title}</Text> : null}
        {lede ? <Text style={styles.subtitle}>{lede}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {showProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and settings"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{userName?.[0] ?? '?'}</Text>
          <View style={styles.dotNote} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  display: {
    ...typography.display,
    color: colors.ink,
  },
  subtitle: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.muted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontFamily: typography.display.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.tabActive,
  },
  dotNote: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.clay,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: {
    flex: 1,
  },
  topBarTitle: {
    fontFamily: typography.display.fontFamily,
    fontSize: 19,
    fontWeight: '600',
    color: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});
