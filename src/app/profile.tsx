// Profile screen: edit household, diet, budget, location and language, and sign out.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Callout } from '../components/ui/Callout';
import { Chip } from '../components/ui/Chip';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { dietaryOptions } from '../data/mockData';
import { useAppState } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type SettingKey = 'household' | 'budget' | 'dietary' | 'language' | 'location';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAppState();
  const { isAuthConfigured, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.replace('/login');
  }
  const [activeSetting, setActiveSetting] = useState<SettingKey | null>(null);
  const [draftHousehold, setDraftHousehold] = useState(String(profile.householdSize));
  const [draftBudget, setDraftBudget] = useState(String(profile.weeklyBudget));
  const [draftLanguage, setDraftLanguage] = useState(profile.language);
  const [draftLocation, setDraftLocation] = useState(profile.location ?? '');
  const [draftDietary, setDraftDietary] = useState<string[]>(profile.dietaryRequirements);

  const settings = [
    {
      key: 'household' as const,
      icon: 'people-outline' as const,
      label: 'Household',
      value: `${profile.householdSize} people`,
    },
    {
      key: 'dietary' as const,
      icon: 'heart-outline' as const,
      label: 'Food needs',
      value: profile.dietaryRequirements.join(', ') || 'None selected',
    },
    {
      key: 'budget' as const,
      icon: 'wallet-outline' as const,
      label: 'Weekly budget',
      value: `R${profile.weeklyBudget.toLocaleString()}`,
    },
    {
      key: 'location' as const,
      icon: 'location-outline' as const,
      label: 'Location',
      value: profile.location ?? 'Not set',
    },
    {
      key: 'language' as const,
      icon: 'language-outline' as const,
      label: 'Language',
      value: profile.language,
    },
  ];

  function openSetting(key: SettingKey) {
    setDraftHousehold(String(profile.householdSize));
    setDraftBudget(String(profile.weeklyBudget));
    setDraftLanguage(profile.language);
    setDraftLocation(profile.location ?? '');
    setDraftDietary(profile.dietaryRequirements);
    setActiveSetting(key);
  }

  function saveSetting() {
    if (activeSetting === 'household') {
      const parsed = Number.parseInt(draftHousehold, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        updateProfile({ householdSize: parsed });
      }
    }

    if (activeSetting === 'budget') {
      const parsed = Number.parseInt(draftBudget, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        updateProfile({ weeklyBudget: parsed, monthlyBudget: parsed * 4 });
      }
    }

    if (activeSetting === 'language') {
      updateProfile({ language: draftLanguage.trim() || profile.language });
    }

    if (activeSetting === 'location') {
      updateProfile({ location: draftLocation.trim() });
    }

    if (activeSetting === 'dietary') {
      updateProfile({ dietaryRequirements: draftDietary });
    }

    setActiveSetting(null);
  }

  function toggleDraftDietary(option: string) {
    setDraftDietary((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Profile"
          title="Profile & preferences"
          showBack
          onBack={() => router.back()}
        />

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.userName?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.name}>{profile.userName}</Text>
            <Text style={styles.description}>
              Meal planning for {profile.householdSize} people
            </Text>
            <Text style={styles.description}>{profile.location}</Text>
            {user?.email ? <Text style={styles.description}>{user.email}</Text> : null}
          </View>
        </View>

        <Callout variant="forest">
          <Ionicons name="sparkles-outline" size={18} color={colors.forest} />
          <Text style={styles.infoText}>
            Updating these preferences helps NutriMate make more useful plan and price estimates.
          </Text>
        </Callout>

        <Text style={styles.sectionLabel}>Your preferences</Text>
        <View style={styles.panel}>
          {settings.map((setting, index) => (
            <Pressable
              key={setting.label}
              accessibilityRole="button"
              onPress={() => openSetting(setting.key)}
              style={({ pressed }) => [
                styles.settingRow,
                styles.settingRowBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.settingIcon}>
                <Ionicons name={setting.icon} size={14} color={colors.forest} />
              </View>
              <View style={styles.settingTextColumn}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingValue}>{setting.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={colors.muted} />
            </Pressable>
          ))}

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.forest} />
            </View>
            <View style={styles.settingTextColumn}>
              <Text style={styles.settingLabel}>Data and privacy</Text>
              <Text style={styles.settingValue}>
                Pantry and plan data stay on this device in the prototype.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/plan-history')}
          style={styles.restartLink}
        >
          <Ionicons name="time-outline" size={16} color={colors.forest} />
          <Text style={styles.restartText}>View past weekly plans</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/onboarding')}
          style={styles.restartLink}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.forest} />
          <Text style={styles.restartText}>Restart NutriMate setup</Text>
        </Pressable>

        {isAuthConfigured && user ? (
          <PrimaryButton
            label="Sign out"
            variant="outline"
            loading={signingOut}
            onPress={handleSignOut}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.forest} />}
          />
        ) : null}
      </ScrollView>

      <Modal
        visible={activeSetting !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSetting(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {activeSetting === 'household' && 'Household size'}
              {activeSetting === 'budget' && 'Weekly budget'}
              {activeSetting === 'language' && 'Language'}
              {activeSetting === 'location' && 'Location'}
              {activeSetting === 'dietary' && 'Food needs'}
            </Text>

            {activeSetting === 'household' ? (
              <TextInput
                value={draftHousehold}
                onChangeText={setDraftHousehold}
                keyboardType="number-pad"
                style={styles.input}
              />
            ) : null}

            {activeSetting === 'budget' ? (
              <TextInput
                value={draftBudget}
                onChangeText={setDraftBudget}
                keyboardType="number-pad"
                style={styles.input}
              />
            ) : null}

            {activeSetting === 'language' ? (
              <TextInput value={draftLanguage} onChangeText={setDraftLanguage} style={styles.input} />
            ) : null}

            {activeSetting === 'location' ? (
              <TextInput
                value={draftLocation}
                onChangeText={setDraftLocation}
                style={styles.input}
                placeholder="City, country"
                placeholderTextColor={colors.muted}
              />
            ) : null}

            {activeSetting === 'dietary' ? (
              <View style={styles.chipRow}>
                {dietaryOptions.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={draftDietary.includes(option)}
                    onPress={() => toggleDraftDietary(option)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <PrimaryButton
                label="Cancel"
                variant="outline"
                onPress={() => setActiveSetting(null)}
                style={styles.modalButton}
              />
              <PrimaryButton label="Save" onPress={saveSetting} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { padding: screenPadding, paddingBottom: spacing.xxxl, gap: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 21, fontWeight: '700', color: colors.tabActive },
  name: { ...typography.h1, color: colors.ink, fontSize: 20 },
  description: { ...typography.body, color: colors.muted, fontSize: 12.5 },
  infoText: { ...typography.body, color: colors.ink, fontSize: 14, flex: 1, lineHeight: 20 },
  sectionLabel: { ...typography.h2, color: colors.ink },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    shadowColor: '#23281F',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 62,
    paddingVertical: spacing.sm,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: 'dashed',
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.forestTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextColumn: { flex: 1 },
  settingLabel: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  settingValue: { color: colors.muted, fontSize: 11.5, marginTop: 2 },
  restartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.sm,
  },
  restartText: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 49, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalTitle: { ...typography.h1, color: colors.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalButton: { flex: 1 },
  pressed: { opacity: 0.85 },
});
