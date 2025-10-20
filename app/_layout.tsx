// app/_layout.tsx
import 'react-native-get-random-values';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const onAuthScreen = ['signin', 'signup', 'signup-doctor', 'auth'].includes(segments[0] as string);
      if (!session && !onAuthScreen) router.replace('/signin');
      if (session && onAuthScreen) router.replace('/');
    });
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const onAuthScreen = ['signin', 'signup', 'signup-doctor', 'auth'].includes(segments[0] as string);
      if (!session && !onAuthScreen) router.replace('/signin');
      if (session && onAuthScreen) router.replace('/');
      setReady(true);
    })();
    return () => sub.subscription.unsubscribe();
  }, [router, segments]);

  if (!fontsLoaded || !ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StackWithSafePadding />
        <StatusBar style="light" translucent backgroundColor="transparent" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function StackWithSafePadding() {
  const insets = useSafeAreaInsets();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // global top space that respects notches/status bar
        contentStyle: { paddingTop: insets.top + 8 },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signup-doctor" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
    </Stack>
  );
}
