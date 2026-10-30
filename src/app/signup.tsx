// Sign-up screen: creates a Firebase Auth account with name, email and password.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '../components/ui/Card';
import { Eyebrow } from '../components/ui/Eyebrow';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';
import { radius, screenPadding, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayedError = localError ?? error;

  async function handleSignUp() {
    setLocalError(null);
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords don’t match.');
      return;
    }

    setSubmitting(true);
    const ok = await signUp(name, email, password);
    setSubmitting(false);
    if (ok) {
      router.replace('/onboarding');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="leaf" size={14} color={colors.tabActive} />
            </View>
            <Text style={styles.brand}>NUTRIMATE</Text>
          </View>

          <View style={styles.copyBlock}>
            <Eyebrow>Get started</Eyebrow>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Save your plans, pantry and budget to your own account so they're there next time.
            </Text>
          </View>

          <Card style={styles.formCard}>
            {displayedError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{displayedError}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                textContentType="name"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholder="Type it again"
                placeholderTextColor={colors.muted}
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            <PrimaryButton
              label="Create account"
              onPress={handleSignUp}
              loading={submitting}
              disabled={!name.trim() || !email.trim() || !password || !confirmPassword}
              icon={<Ionicons name="person-add-outline" size={18} color={colors.creamText} />}
            />
          </Card>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <Text style={styles.footerLink}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: {
    flexGrow: 1,
    padding: screenPadding,
    paddingTop: spacing.xxxl,
    gap: spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fontFamilies.monoBold,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.forest,
    fontSize: 14,
  },
  copyBlock: { gap: spacing.xs, marginTop: spacing.lg },
  title: { ...typography.display, fontSize: 27, color: colors.ink, marginTop: 5 },
  subtitle: { ...typography.body, fontSize: 13.5, color: colors.muted, lineHeight: 20, marginTop: 6 },
  formCard: { gap: spacing.md, marginTop: spacing.sm },
  field: { gap: 6 },
  label: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: { color: colors.danger, fontSize: 12.5, flex: 1, lineHeight: 17 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  footerText: { color: colors.muted, fontSize: 13 },
  footerLink: { color: colors.forest, fontWeight: '700', fontSize: 13 },
});
