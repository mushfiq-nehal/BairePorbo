import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useT } from "@/i18n";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Bottom tab bar — the app's spine (§5), with native vector icons. */
export default function TabsLayout() {
  const t = useT();

  const icon =
    (name: IoniconName) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={22} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1120" },
        headerTintColor: "#FFFFFF",
        tabBarStyle: { backgroundColor: "#0B1120", borderTopColor: "#1E293B" },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t("tab.home"), tabBarIcon: icon("home") }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: t("tab.discover"), headerShown: false, tabBarIcon: icon("school") }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: t("tab.mentor"), headerShown: false, tabBarIcon: icon("chatbubbles") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("tab.profile"), tabBarIcon: icon("person") }}
      />
    </Tabs>
  );
}
