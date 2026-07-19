import { View, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import type { BookmarkScholarship, ScholarshipListItem } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { isExpired } from "@/lib/deadline";
import { useLang, useT } from "@/i18n";
import { Txt, Logo } from "@/components/ui";
import { colors, gradients, shadow, tintFor } from "@/theme";

function Thumb({ uri, tintKey, size = 56 }: { uri?: string | null; tintKey: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 13 }} resizeMode="cover" />;
  }
  const [a, b] = tintFor(tintKey);
  return (
    <LinearGradient
      colors={[a, b]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: 13, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="business" size={size * 0.42} color="rgba(255,255,255,0.92)" />
    </LinearGradient>
  );
}

export default function Home() {
  const t = useT();
  const router = useRouter();
  const api = useApi();
  const { user } = useUser();
  const { lang, setLang } = useLang();

  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.getDashboard() });
  const { data: schData } = useQuery({ queryKey: ["scholarships"], queryFn: () => api.getScholarships() });

  const firstName =
    dash?.user.name?.split(" ")[0] ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "";

  const readiness = dash?.stats.readiness ?? 0;
  const missing = (dash?.stats.missingFields ?? []).slice(0, 2).join(", ");
  const hasUnread = (dash?.stats.newScholarshipsCount ?? 0) > 0 || readiness < 100;

  const closing = dash?.bookmarksClosingSoon ?? [];
  const picks: (BookmarkScholarship | ScholarshipListItem)[] =
    closing.length > 0
      ? closing.slice(0, 3)
      : (schData?.scholarships ?? [])
          .filter((s) => s.is_live !== false && !isExpired(s.deadline))
          .slice(0, 3);

  const langLabel = lang === "en" ? "বাংলা" : "EN";

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-2.5">
            <View style={shadow.sm} className="w-10 h-10 rounded-[13px] bg-surface items-center justify-center p-1">
              <Logo size={28} />
            </View>
            <View>
              <Txt className="text-ink-400 text-xs">{t("home.hello")}</Txt>
              <Txt font="display" weight="bold" className="text-ink-900 text-[17px] leading-5 mt-0.5">
                {firstName}
              </Txt>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => setLang(lang === "en" ? "bn" : "en")}
              className="flex-row items-center gap-1.5 bg-surface border border-sand-200 rounded-full px-3 py-2"
            >
              <Ionicons name="globe-outline" size={14} color={colors.ink700} />
              <Txt weight="bold" className="text-ink-700 text-xs">{langLabel}</Txt>
            </Pressable>
            <Pressable
              onPress={() => router.push("/notifications")}
              className="w-10 h-10 rounded-full bg-surface border border-sand-200 items-center justify-center"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.ink700} />
              {hasUnread ? (
                <View className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-coral-500 border-2 border-surface" />
              ) : null}
            </Pressable>
          </View>
        </View>

        {/* Hero */}
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[shadow.teal, { borderRadius: 24, padding: 22, overflow: "hidden" }]}
        >
          <View className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/[0.07]" />
          <Txt weight="bold" className="text-teal-200 text-[11px] uppercase" style={{ letterSpacing: 1.2 }}>
            {t("home.heroKicker")}
          </Txt>
          <Txt font="display" weight="semibold" className="text-white text-[25px] leading-[30px] mt-3">
            {t("home.welcomeTitle")}
          </Txt>
          <Pressable
            onPress={() => router.push("/(tabs)/scholarships")}
            className="flex-row items-center gap-2 bg-white rounded-full px-4 py-3 mt-4 self-start"
          >
            <Txt weight="bold" className="text-teal-700 text-sm">{t("home.exploreBtn")}</Txt>
            <Ionicons name="arrow-forward" size={15} color={colors.teal700} />
          </Pressable>
        </LinearGradient>

        {/* Quick actions */}
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={() => router.push("/(tabs)/scholarships")}
            style={shadow.sm}
            className="flex-1 bg-surface border border-sand-200 rounded-[18px] p-4"
          >
            <View className="w-10 h-10 rounded-xl bg-teal-100 items-center justify-center mb-3">
              <Ionicons name="compass" size={22} color={colors.teal600} />
            </View>
            <Txt weight="bold" className="text-ink-900 text-sm">{t("home.qaScholar")}</Txt>
            <Txt className="text-ink-400 text-xs mt-0.5">{t("home.qaScholarSub")}</Txt>
          </Pressable>
          <Pressable
            onPress={() => router.push("/cv")}
            style={shadow.sm}
            className="flex-1 bg-surface border border-sand-200 rounded-[18px] p-4"
          >
            <View className="w-10 h-10 rounded-xl bg-coral-100 items-center justify-center mb-3">
              <Ionicons name="document-text" size={22} color={colors.coral500} />
            </View>
            <Txt weight="bold" className="text-ink-900 text-sm">{t("home.qaCV")}</Txt>
            <Txt className="text-ink-400 text-xs mt-0.5">{t("home.qaCVSub")}</Txt>
          </Pressable>
        </View>

        {/* Profile completeness */}
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          className="mt-4 bg-surface border border-sand-200 rounded-[18px] p-4"
        >
          <View className="flex-row items-center justify-between">
            <Txt weight="bold" className="text-ink-400 text-[11px] uppercase" style={{ letterSpacing: 0.8 }}>
              {t("home.yourProfile")}
            </Txt>
            <Txt font="display" weight="bold" className="text-teal-600 text-[15px]">{readiness}%</Txt>
          </View>
          <View className="h-2 rounded-full bg-sand-100 mt-2.5 overflow-hidden">
            <LinearGradient
              colors={[colors.teal500, colors.coral400]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: "100%", width: `${Math.max(readiness, 4)}%`, borderRadius: 999 }}
            />
          </View>
          {missing ? (
            <Txt className="text-ink-500 text-[12.5px] mt-2.5">
              {t("home.stillMissing")} <Txt weight="bold" className="text-ink-700 text-[12.5px]">{missing}</Txt>
            </Txt>
          ) : null}
        </Pressable>

        {/* For you */}
        <View className="flex-row items-baseline justify-between mt-6 mb-3">
          <Txt font="display" weight="semibold" className="text-ink-900 text-[19px]">{t("home.forYou")}</Txt>
          <Pressable onPress={() => router.push("/(tabs)/scholarships")}>
            <Txt weight="bold" className="text-teal-600 text-[13px]">{t("common.seeAll")}</Txt>
          </Pressable>
        </View>
        {picks.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/scholarship/${p.id}`)}
            style={shadow.sm}
            className="flex-row items-center gap-3 bg-surface border border-sand-200 rounded-2xl p-2.5 mb-2.5"
          >
            <Thumb uri={p.thumbnail_url} tintKey={p.id} />
            <View className="flex-1">
              <Txt weight="bold" className="text-ink-900 text-sm leading-[18px]" numberOfLines={2}>{p.title}</Txt>
              <View className="flex-row items-center gap-1 mt-1.5">
                <Ionicons name="location-outline" size={13} color={colors.ink400} />
                <Txt className="text-ink-400 text-xs">
                  {[p.country, p.deadline].filter(Boolean).join(" · ")}
                </Txt>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
          </Pressable>
        ))}

        {/* Mentor teaser */}
        <Pressable
          onPress={() => router.push("/chat")}
          className="mt-3.5 rounded-[20px] p-[18px] overflow-hidden"
          style={{ backgroundColor: colors.ink900 }}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={17} color={colors.teal500} />
            <Txt weight="bold" className="text-teal-500 text-[11px] uppercase" style={{ letterSpacing: 1 }}>
              {t("home.mentorTag")}
            </Txt>
          </View>
          <Txt font="display" weight="semibold" className="text-white text-lg leading-6 mt-2.5">
            {t("home.mentorTeaser")}
          </Txt>
          <View className="flex-row items-center gap-1.5 mt-3">
            <Txt weight="bold" className="text-teal-200 text-[13px]">{t("home.tryMentor")}</Txt>
            <Ionicons name="arrow-forward" size={15} color={colors.teal200} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
