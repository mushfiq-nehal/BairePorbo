import { useEffect, useState } from "react";
import { Pressable, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useSSO } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Txt } from "./ui";
import { useT } from "@/i18n";
import { colors, shadow } from "@/theme";

// Required so the browser-based OAuth redirect can complete and dismiss.
WebBrowser.maybeCompleteAuthSession();

/** Warms up the in-app browser for a snappier OAuth hand-off (Android). */
function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export function GoogleButton({ onError }: { onError?: (msg: string) => void }) {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function onPress() {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch {
      onError?.(t("auth.signInFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={shadow.sm}
      className="bg-surface border border-sand-200 rounded-full py-4 flex-row items-center justify-center gap-2.5 active:opacity-90"
      onPress={onPress}
      disabled={busy}
    >
      {busy ? (
        <ActivityIndicator color={colors.ink700} />
      ) : (
        <>
          <FontAwesome name="google" size={18} color={colors.coral500} />
          <Txt weight="semibold" className="text-ink-800 text-base">
            {t("auth.google")}
          </Txt>
        </>
      )}
    </Pressable>
  );
}
