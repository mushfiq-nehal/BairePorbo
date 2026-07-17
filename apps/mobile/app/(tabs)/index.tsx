import { View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";

export default function Home() {
  const t = useT();
  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      <View className="flex-1 px-6 pt-6 gap-3">
        <AppText bold className="text-white text-2xl font-bold">
          {t("home.welcomeTitle")}
        </AppText>
        <AppText className="text-slate-400">{t("home.welcomeSubtitle")}</AppText>

        <View className="gap-3 mt-4">
          <Link href="/(tabs)/discover" asChild>
            <Pressable className="bg-slate-800 rounded-xl px-4 py-4 active:opacity-80">
              <AppText bold className="text-brand font-semibold">
                {t("home.explore")}
              </AppText>
            </Pressable>
          </Link>
          <Link href="/(tabs)/chat" asChild>
            <Pressable className="bg-slate-800 rounded-xl px-4 py-4 active:opacity-80">
              <AppText bold className="text-brand font-semibold">
                {t("home.askMentor")}
              </AppText>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
