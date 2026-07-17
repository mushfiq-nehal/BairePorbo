import { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@baireporbo/shared";
import { ApiError } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { Txt } from "@/components/ui";
import { colors } from "@/theme";

export default function Chat() {
  const api = useApi();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const incoming = params.sessionId ?? null;
    if (!incoming || incoming === sessionId) return;
    let active = true;
    setSessionId(incoming);
    (async () => {
      try {
        const res = await api.getChatMessages(incoming);
        if (active) setMessages(res.messages.map((m) => ({ role: m.role, content: m.content })));
      } catch {
        if (active) setError(t("chat.error"));
      }
    })();
    return () => {
      active = false;
    };
  }, [params.sessionId, sessionId, api, t]);

  function newChat() {
    setMessages([]);
    setSessionId(null);
    setError(null);
    router.setParams({ sessionId: undefined });
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      let activeSession = sessionId;
      if (!activeSession) {
        const created = await api.createChatSession();
        activeSession = created.session.id;
        setSessionId(activeSession);
      }
      await api.streamChat(
        { messages: history, userMessage: text, sessionId: activeSession },
        {
          onToken: (token) => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content: last.content + token };
              return next;
            });
            scrollRef.current?.scrollToEnd({ animated: true });
          },
        },
      );
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? typeof err.body?.error === "string" ? err.body.error : err.message
          : t("chat.error");
      setError(msg);
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.content === "") next.pop();
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-body" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row gap-4 items-center">
              <Pressable onPress={newChat} hitSlop={8}>
                <Ionicons name="create-outline" size={22} color={colors.teal600} />
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/chat/sessions")} hitSlop={8}>
                <Ionicons name="time-outline" size={22} color={colors.teal600} />
              </Pressable>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 10 }}>
          {messages.length === 0 ? (
            <View className="items-center mt-16 px-6">
              <View className="w-16 h-16 rounded-3xl bg-teal-100 items-center justify-center mb-4">
                <Ionicons name="sparkles" size={30} color={colors.teal600} />
              </View>
              <Txt className="text-ink-500 text-center leading-6">{t("chat.emptyHint")}</Txt>
            </View>
          ) : null}
          {messages.map((m, i) => (
            <View
              key={i}
              style={m.role === "assistant" ? { borderWidth: 1, borderColor: colors.sand200 } : undefined}
              className={
                m.role === "user"
                  ? "self-end bg-teal-500 rounded-3xl rounded-br-lg px-4 py-2.5 max-w-[85%]"
                  : "self-start bg-surface rounded-3xl rounded-bl-lg px-4 py-2.5 max-w-[88%]"
              }
            >
              <Txt className={`${m.role === "user" ? "text-white" : "text-ink-800"} leading-6`}>
                {m.content || "…"}
              </Txt>
            </View>
          ))}
        </ScrollView>

        {error ? <Txt className="text-coral-700 px-4 pb-1 text-sm">{error}</Txt> : null}

        <View className="flex-row items-end gap-2 px-4 pb-2 pt-2 border-t border-sand-200 bg-body">
          <TextInput
            className="flex-1 bg-surface border border-sand-200 text-ink-900 rounded-3xl px-4 py-3 max-h-32"
            style={{ fontFamily: "Manrope_400Regular" }}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.ink400}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            className={`rounded-full w-12 h-12 items-center justify-center ${streaming ? "bg-teal-200" : "bg-teal-500"}`}
            onPress={send}
            disabled={streaming}
          >
            {streaming ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-up" size={22} color={colors.white} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
