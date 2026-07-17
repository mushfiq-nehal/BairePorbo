import { View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useLang, useT } from "@/i18n";
import { Txt, Card } from "@/components/ui";
import { colors } from "@/theme";

function Row({ label, value, last }: { label: string; value: string | null | undefined; last?: boolean }) {
  return (
    <View className={`flex-row justify-between py-3 ${last ? "" : "border-b border-sand-100"}`}>
      <Txt className="text-ink-500">{label}</Txt>
      <Txt weight="medium" className="text-ink-900 flex-1 text-right">{value ?? "—"}</Txt>
    </View>
  );
}

export default function Profile() {
  const api = useApi();
  const t = useT();
  const { lang, setLang } = useLang();
  const { signOut } = useAuth();
  const { user } = useUser();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
  });

  const profile = data?.profile;
  const authOk = !isError || (error instanceof ApiError && error.status === 404);
  const email = user?.primaryEmailAddress?.emailAddress;
  const initial = (profile?.full_name || email || "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View className="items-center pt-2">
          <View className="w-20 h-20 rounded-full bg-teal-500 items-center justify-center mb-3">
            <Txt font="display" weight="bold" className="text-white text-3xl">{initial}</Txt>
          </View>
          <Txt weight="semibold" className="text-ink-900 text-lg">{profile?.full_name ?? t("profile.signedIn")}</Txt>
          {email ? <Txt className="text-ink-500 text-sm mt-0.5">{email}</Txt> : null}
        </View>

        <View className={`flex-row items-center gap-2 rounded-2xl p-3.5 ${authOk ? "bg-teal-100" : "bg-coral-100"}`}>
          {isLoading ? (
            <ActivityIndicator color={colors.teal600} />
          ) : (
            <Ionicons
              name={authOk ? "shield-checkmark" : "alert-circle"}
              size={18}
              color={authOk ? colors.teal700 : colors.coral700}
            />
          )}
          <Txt className={`flex-1 text-sm ${authOk ? "text-teal-800" : "text-coral-700"}`}>
            {isLoading
              ? t("profile.authChecking")
              : authOk
                ? t("profile.authOk")
                : `${t("profile.authFail")}: ${(error as ApiError)?.status ?? ""}`}
          </Txt>
        </View>

        {!isLoading && profile ? (
          <Card className="px-4 py-1">
            <Row label={t("profile.name")} value={profile.full_name} />
            <Row label={t("profile.university")} value={profile.university} />
            <Row label={t("profile.targetDegree")} value={profile.target_degree} />
            <Row label={t("profile.cgpa")} value={profile.cgpa != null ? String(profile.cgpa) : null} />
            <Row label={t("profile.ielts")} value={profile.ielts_score} last />
          </Card>
        ) : !isLoading ? (
          <Txt className="text-ink-500">{t("profile.noProfile")}</Txt>
        ) : null}

        <Card className="p-4 flex-row items-center justify-between">
          <Txt weight="medium" className="text-ink-700">{t("profile.language")}</Txt>
          <View className="flex-row bg-sand-100 rounded-full p-1">
            {(["en", "bn"] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                className={lang === l ? "bg-teal-500 rounded-full px-4 py-1.5" : "px-4 py-1.5"}
              >
                <Txt weight="semibold" className={lang === l ? "text-white text-sm" : "text-ink-500 text-sm"}>
                  {l === "en" ? "English" : "বাংলা"}
                </Txt>
              </Pressable>
            ))}
          </View>
        </Card>

        <Pressable
          className="flex-row items-center justify-center gap-2 bg-surface border border-sand-200 rounded-2xl py-4 active:opacity-90"
          onPress={() => signOut()}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.coral500} />
          <Txt weight="semibold" className="text-coral-700">{t("profile.signOut")}</Txt>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
