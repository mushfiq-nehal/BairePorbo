import { Stack } from "expo-router";
import { useT } from "@/i18n";
import { colors, fonts } from "@/theme";

export default function DiscoverLayout() {
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBody },
        headerShadowVisible: false,
        headerTintColor: colors.ink900,
        headerTitleStyle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: colors.ink900 },
        contentStyle: { backgroundColor: colors.bgBody },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tab.discover") }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
