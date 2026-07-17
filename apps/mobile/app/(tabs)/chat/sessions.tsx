import { View, FlatList, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatSession } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";

export default function Sessions() {
  const api = useApi();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => api.getChatSessions(),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteChatSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-sessions"] }),
  });

  function open(session: ChatSession) {
    router.dismissTo({ pathname: "/(tabs)/chat", params: { sessionId: session.id } });
  }

  const sessions = data?.sessions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              className="bg-slate-800 rounded-2xl p-4 flex-row items-center justify-between active:opacity-80"
              onPress={() => open(item)}
            >
              <AppText className="text-white flex-1 pr-3" numberOfLines={1}>
                {item.title}
              </AppText>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert(t("chat.delete"), item.title, [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("chat.delete"),
                      style: "destructive",
                      onPress: () => del.mutate(item.id),
                    },
                  ])
                }
              >
                <AppText className="text-red-400 text-sm">{t("chat.delete")}</AppText>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <AppText className="text-slate-400 text-center mt-10">{t("chat.noSessions")}</AppText>
          }
        />
      )}
    </SafeAreaView>
  );
}
