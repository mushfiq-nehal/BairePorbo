import { useState } from "react";
import { View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";
import { GoogleButton } from "@/components/GoogleButton";

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignUp() {
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? t("auth.signUpFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError(t("auth.signUpFailed"));
      }
    } catch (err) {
      setError(
        (err as { errors?: { message?: string }[] })?.errors?.[0]?.message ?? t("auth.signUpFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <View className="flex-1 justify-center px-6 gap-4">
        <AppText bold className="text-white text-3xl font-bold mb-2">
          {t("auth.createAccount")}
        </AppText>

        {!pendingVerification ? (
          <>
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
              onPress={onSignUp}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText bold className="text-brand-fg font-semibold">
                  {t("auth.continue")}
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
              <AppText className="text-slate-400">{t("auth.haveAccount")}</AppText>
              <Link href="/(auth)/sign-in" className="text-brand font-semibold">
                {t("auth.signIn")}
              </Link>
            </View>
          </>
        ) : (
          <>
            <AppText className="text-slate-400">
              {t("auth.verifyPrompt")} {email}
            </AppText>
            <TextInput
              className="bg-slate-800 text-white rounded-xl px-4 py-3"
              placeholder={t("auth.verifyCode")}
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
            />
            {error ? <AppText className="text-red-400">{error}</AppText> : null}
            <Pressable
              className="bg-brand rounded-xl py-3 items-center mt-2 active:opacity-80"
              onPress={onVerify}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText bold className="text-brand-fg font-semibold">
                  {t("auth.verify")}
                </AppText>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
