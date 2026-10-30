// Root layout: loads fonts, provides auth and app state, and defines the stack of screens.
import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
  WorkSans_800ExtraBold,
} from '@expo-google-fonts/work-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

SplashScreen.preventAutoHideAsync();

/**
 * Route protection: signed-out users are sent to Login, and signed-in users
 * are sent away from Login/Sign up. Does nothing if Firebase is not configured.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthConfigured, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const onAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

  useEffect(() => {
    if (!isAuthConfigured || isLoading) return;

    if (!user && !onAuthScreen) {
      router.replace('/login');
    } else if (user && onAuthScreen) {
      router.replace('/');
    }
  }, [isAuthConfigured, isLoading, user, onAuthScreen, router]);

  if (isAuthConfigured && isLoading) {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }

  // Signed out and not on Login/Sign up: keep the navigator mounted so the redirect
  // above can run, but cover the screens so they never flash.
  const blocked = isAuthConfigured && !user && !onAuthScreen;

  return (
    <View style={styles.gate}>
      {children}
      {blocked && (
        <View style={[StyleSheet.absoluteFill, styles.authLoading]}>
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    WorkSans_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="signup" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="profile" />
            <Stack.Screen name="meal/[id]" />
            <Stack.Screen name="meal-plan" />
            <Stack.Screen name="grocery-list" />
            <Stack.Screen name="price-comparison" />
            <Stack.Screen name="add-price-item" options={{ presentation: 'modal' }} />
            <Stack.Screen name="plan-history" />
          </Stack>
        </AuthGate>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
  },
  authLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
