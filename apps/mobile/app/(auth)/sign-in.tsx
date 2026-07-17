import { useState } from "react";
import { View, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { useT } from "@/i18n";
import { Txt, Button, Logo } from "@/components/ui";
import { GoogleButton } from "@/components/GoogleButton";
import { colors } from "@/theme";

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
        setError(t("auth.twoFactorUnsupported"));
      } else {
        setError(t("auth.signInFailed"));
      }
    } catch (err) {
      setError(
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? t("auth.signInFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-body">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <Logo size={72} />
            <Txt font="display" weight="bold" className="text-ink-900 text-3xl mt-4">
              {t("auth.welcomeBack")}
            </Txt>
            <Txt className="text-ink-500 mt-1 text-center">{t("auth.signInSubtitle")}</Txt>
          </View>

          <View className="gap-3">
            <TextInput
              className="bg-surface border border-sand-200 text-ink-900 rounded-2xl px-4 py-4"
              style={{ fontFamily: "Manrope_400Regular" }}
              placeholder={t("auth.email")}
              placeholderTextColor={colors.ink400}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              className="bg-surface border border-sand-200 text-ink-900 rounded-2xl px-4 py-4"
              style={{ fontFamily: "Manrope_400Regular" }}
              placeholder={t("auth.password")}
              placeholderTextColor={colors.ink400}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Txt className="text-coral-700 text-sm">{error}</Txt> : null}

            <Button label={t("auth.signIn")} onPress={onSubmit} loading={busy} />

            <View className="flex-row items-center gap-3 my-1">
              <View className="flex-1 h-px bg-sand-200" />
              <Txt className="text-ink-400 text-xs">{t("auth.orDivider")}</Txt>
              <View className="flex-1 h-px bg-sand-200" />
            </View>

            <GoogleButton onError={setError} />
          </View>

          <View className="flex-row justify-center mt-8">
            <Txt className="text-ink-500">{t("auth.noAccount")}</Txt>
            <Link href="/(auth)/sign-up" asChild>
              <Txt weight="semibold" className="text-teal-600">{t("auth.signUp")}</Txt>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
