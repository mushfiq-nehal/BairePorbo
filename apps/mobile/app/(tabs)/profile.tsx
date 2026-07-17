import { View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useLang, useT } from "@/i18n";
import { AppText } from "@/components/AppText";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-slate-800">
      <AppText className="text-slate-400">{label}</AppText>
      <AppText className="text-white flex-1 text-right">{value ?? "—"}</AppText>
    </View>
  );
}

export default function Profile() {
  const api = useApi();
  const t = useT();
  const { lang, setLang } = useLang();
  const { signOut } = useAuth();
  const { user } = useUser();

  // The canary (§3.4): a protected GET that only succeeds if the Bearer token
  // is accepted by clerkMiddleware(). A 401 means enabling `acceptsToken`.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
  });

  const profile = data?.profile;
  const authOk = !isError || (error instanceof ApiError && error.status === 404);

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppText bold className="text-white text-2xl font-bold">
          {user?.primaryEmailAddress?.emailAddress ?? t("profile.signedIn")}
        </AppText>

        <View
          className={authOk ? "bg-emerald-900/40 rounded-xl p-3" : "bg-red-900/40 rounded-xl p-3"}
        >
          <AppText className={authOk ? "text-emerald-300" : "text-red-300"}>
            {isLoading
              ? t("profile.authChecking")
              : authOk
                ? t("profile.authOk")
                : `✗ ${t("profile.authFail")}: ${(error as ApiError)?.status ?? ""} ${(error as Error)?.message ?? ""}`}
          </AppText>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#2563EB" />
        ) : profile ? (
          <View className="bg-slate-900 rounded-2xl p-4">
            <Row label={t("profile.name")} value={profile.full_name} />
            <Row label={t("profile.university")} value={profile.university} />
            <Row label={t("profile.targetDegree")} value={profile.target_degree} />
            <Row label={t("profile.cgpa")} value={profile.cgpa != null ? String(profile.cgpa) : null} />
            <Row label={t("profile.ielts")} value={profile.ielts_score} />
          </View>
        ) : (
          <AppText className="text-slate-400">{t("profile.noProfile")}</AppText>
        )}

        {/* Language toggle (EN/BN) */}
        <View className="bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between mt-2">
          <AppText className="text-slate-300">{t("profile.language")}</AppText>
          <View className="flex-row bg-slate-800 rounded-full p-1">
            {(["en", "bn"] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                className={lang === l ? "bg-brand rounded-full px-4 py-1.5" : "px-4 py-1.5"}
              >
                <AppText
                  bold={l === "bn"}
                  className={lang === l ? "text-brand-fg font-semibold" : "text-slate-400"}
                >
                  {l === "en" ? "English" : "বাংলা"}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          className="bg-slate-800 rounded-xl py-3 items-center mt-4 active:opacity-80"
          onPress={() => signOut()}
        >
          <AppText bold className="text-red-400 font-semibold">
            {t("profile.signOut")}
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
