import { useState } from "react";
import { View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";
import { GoogleButton } from "@/components/GoogleButton";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(tabs)");
      } else if (attempt.status === "needs_second_factor") {
        // The password was accepted but the account has 2FA. The app doesn't
        // implement the second-factor step yet — point the user to Google/web.
        setError(t("auth.twoFactorUnsupported"));
      } else {
        setError(t("auth.signInFailed"));
      }
    } catch (err) {
      const msg =
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? t("auth.signInFailed");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <View className="flex-1 justify-center px-6 gap-4">
        <AppText bold className="text-white text-3xl font-bold mb-2">
          {t("auth.signInTitle")}
        </AppText>
        <AppText className="text-slate-400 mb-4">{t("auth.signInSubtitle")}</AppText>

        <TextInput
          className="bg-slate-800 text-white rounded-xl px-4 py-3"
          placeholder={t("auth.email")}
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          className="bg-slate-800 text-white rounded-xl px-4 py-3"
          placeholder={t("auth.password")}
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <AppText className="text-red-400">{error}</AppText> : null}

        <Pressable
          className="bg-brand rounded-xl py-3 items-center mt-2 active:opacity-80"
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <AppText bold className="text-brand-fg font-semibold">
              {t("auth.signIn")}
            </AppText>
          )}
        </Pressable>

        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-slate-700" />
          <AppText className="text-slate-500 text-xs">{t("auth.orDivider")}</AppText>
          <View className="flex-1 h-px bg-slate-700" />
        </View>

        <GoogleButton onError={setError} />

        <View className="flex-row justify-center mt-4">
          <AppText className="text-slate-400">{t("auth.noAccount")}</AppText>
          <Link href="/(auth)/sign-up" className="text-brand font-semibold">
            {t("auth.signUp")}
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
