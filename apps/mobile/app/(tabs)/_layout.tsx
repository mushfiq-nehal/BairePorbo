import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, type ColorValue } from "react-native";
import { useT } from "@/i18n";
import { colors, fonts } from "@/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Bottom tab bar — the app's spine (§5), light theme with teal active state. */
export default function TabsLayout() {
  const t = useT();

  const icon =
    (name: IoniconName) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={23} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBody },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: colors.ink900 },
        headerTintColor: colors.ink900,
        sceneStyle: { backgroundColor: colors.bgBody },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.sand200,
          height: Platform.OS === "ios" ? 88 : 62,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.teal600,
        tabBarInactiveTintColor: colors.ink400,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tab.home"), tabBarIcon: icon("home") }} />
      <Tabs.Screen
        name="discover"
        options={{ title: t("tab.discover"), headerShown: false, tabBarIcon: icon("compass") }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: t("tab.mentor"), headerShown: false, tabBarIcon: icon("sparkles") }}
      />
      <Tabs.Screen name="profile" options={{ title: t("tab.profile"), tabBarIcon: icon("person") }} />
    </Tabs>
  );
}
