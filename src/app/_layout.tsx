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
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppProvider } from '../context/AppContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

SplashScreen.preventAutoHideAsync();

/**
 * Route protection with Expo Router's Stack.Protected: signed-out users can only
 * reach Login and Sign up, and signed-in users cannot reach them. Expo Router
 * redirects automatically when the guard changes, so there is no redirect effect
 * to get lost and the app screens never flash while signed out.
 * Without Firebase config the app runs in local mode and Login is not used.
 */
function RootNavigator() {
  const { isAuthConfigured, isLoading, user } = useAuth();

  if (isAuthConfigured && isLoading) {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }

  const signedIn = !isAuthConfigured || user !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="profile" />
        <Stack.Screen name="meal/[id]" />
        <Stack.Screen name="meal-plan" />
        <Stack.Screen name="grocery-list" />
        <Stack.Screen name="price-comparison" />
        <Stack.Screen name="add-price-item" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plan-history" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="signup" options={{ presentation: 'fullScreenModal' }} />
      </Stack.Protected>
    </Stack>
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
        <RootNavigator />
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  authLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});