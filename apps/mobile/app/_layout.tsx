import "../global.css";

import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from "@expo-google-fonts/hind-siliguri";

import { CLERK_PUBLISHABLE_KEY } from "@/lib/config";
import { tokenCache } from "@/lib/token-cache";
import { queryClient } from "@/lib/query";
import { ApiProvider } from "@/lib/api";
import { LangProvider, useLang } from "@/i18n";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Redirects between the (auth) and (tabs) route groups based on Clerk's
 * sign-in state. Renders a spinner until Clerk has loaded so we never flash the
 * wrong screen.
 */
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return <Slot />;
}

/** Holds the splash screen until fonts + persisted language have loaded. */
function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready: langReady } = useLang();
  const appReady = fontsLoaded && langReady;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  if (!appReady) return null;
  return <AuthGate />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular,
    HindSiliguri_500Medium,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider>
          <LangProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <AppShell fontsLoaded={fontsLoaded} />
                <StatusBar style="light" />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </LangProvider>
        </ApiProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
