import { Stack } from "expo-router";
import { useT } from "@/i18n";

export default function DiscoverLayout() {
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1120" },
        headerTintColor: "#FFFFFF",
        contentStyle: { backgroundColor: "#0B1120" },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tab.discover") }} />
      <Stack.Screen name="[id]" options={{ title: "" }} />
    </Stack>
  );
}
