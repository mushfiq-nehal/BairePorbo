import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useT } from "@/i18n";
import { Txt, Logo } from "@/components/ui";
import { colors, shadow } from "@/theme";

function FeatureCard({
  href,
  icon,
  tint,
  title,
  subtitle,
}: {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: "teal" | "coral";
  title: string;
  subtitle: string;
}) {
  const bg = tint === "teal" ? "bg-teal-100" : "bg-coral-100";
  const fg = tint === "teal" ? colors.teal600 : colors.coral500;
  return (
    <Link href={href as never} asChild>
      <Pressable style={shadow.sm} className="bg-surface rounded-2xl border border-sand-200 p-4 flex-row items-center gap-4 active:opacity-90">
        <View className={`w-12 h-12 rounded-2xl items-center justify-center ${bg}`}>
          <Ionicons name={icon} size={24} color={fg} />
        </View>
        <View className="flex-1">
          <Txt weight="semibold" className="text-ink-900 text-base">{title}</Txt>
          <Txt className="text-ink-500 text-sm mt-0.5">{subtitle}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.ink400} />
      </Pressable>
    </Link>
  );
}

export default function Home() {
  const t = useT();
  const { user } = useUser();
  const firstName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-8">
          <Logo size={44} />
          {firstName ? (
            <View className="bg-surface rounded-full px-4 py-2 border border-sand-200">
              <Txt weight="medium" className="text-ink-700 text-sm">👋 {firstName}</Txt>
            </View>
          ) : null}
        </View>

        <View className="flex-row mb-3">
          <View className="bg-teal-100 rounded-full px-3 py-1.5">
            <Txt weight="semibold" className="text-teal-700 text-xs">{t("home.kicker")}</Txt>
          </View>
        </View>
        <Txt font="display" weight="bold" className="text-ink-900 text-[30px] leading-[38px]">
          {t("home.welcomeTitle")}
        </Txt>
        <Txt className="text-ink-500 text-base leading-6 mt-3 mb-8">
          {t("home.welcomeSubtitle")}
        </Txt>

        <View className="gap-3">
          <FeatureCard
            href="/(tabs)/discover"
            icon="compass"
            tint="teal"
            title={t("home.exploreTitle")}
            subtitle={t("home.exploreSubtitle")}
          />
          <FeatureCard
            href="/(tabs)/chat"
            icon="sparkles"
            tint="coral"
            title={t("home.mentorTitle")}
            subtitle={t("home.mentorSubtitle")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
