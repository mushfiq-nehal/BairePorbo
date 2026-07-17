import { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "@baireporbo/shared";
import { ApiError } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { useT } from "@/i18n";
import { AppText } from "@/components/AppText";

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

  // Resume a session opened from the history list.
  useEffect(() => {
    const incoming = params.sessionId ?? null;
    if (!incoming || incoming === sessionId) return;
    let active = true;
    setSessionId(incoming);
    (async () => {
      try {
        const res = await api.getChatMessages(incoming);
        if (active) {
          setMessages(res.messages.map((m) => ({ role: m.role, content: m.content })));
        }
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
      // Persist the conversation: create a session lazily on the first turn.
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
              if (last?.role === "assistant") {
                next[next.length - 1] = { role: "assistant", content: last.content + token };
              }
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
          ? typeof err.body?.error === "string"
            ? err.body.error
            : err.message
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
    <SafeAreaView className="flex-1 bg-ink" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row gap-4">
              <Pressable onPress={newChat}>
                <AppText className="text-brand font-semibold">{t("chat.newChat")}</AppText>
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/chat/sessions")}>
                <AppText className="text-brand font-semibold">{t("chat.history")}</AppText>
              </Pressable>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        >
          {messages.length === 0 ? (
            <AppText className="text-slate-400 text-center mt-10">{t("chat.emptyHint")}</AppText>
          ) : null}
          {messages.map((m, i) => (
            <View
              key={i}
              className={
                m.role === "user"
                  ? "self-end bg-brand rounded-2xl px-4 py-2 max-w-[85%]"
                  : "self-start bg-slate-800 rounded-2xl px-4 py-2 max-w-[85%]"
              }
            >
              <AppText className={m.role === "user" ? "text-brand-fg" : "text-white"}>
                {m.content || "…"}
              </AppText>
            </View>
          ))}
        </ScrollView>

        {error ? <AppText className="text-red-400 px-4 pb-1">{error}</AppText> : null}

        <View className="flex-row items-center gap-2 px-4 pb-2 pt-1 border-t border-slate-800">
          <TextInput
            className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-3"
            placeholder={t("chat.placeholder")}
            placeholderTextColor="#64748B"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            className="bg-brand rounded-full w-12 h-12 items-center justify-center active:opacity-80"
            onPress={send}
            disabled={streaming}
          >
            {streaming ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText className="text-brand-fg text-lg">➤</AppText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
