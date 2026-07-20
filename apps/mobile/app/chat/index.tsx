import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, TextInput, Pressable, ScrollView, Keyboard, KeyboardAvoidingView, ActivityIndicator, Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import Markdown from "react-native-markdown-display";
import type { ChatMessage } from "@baireporbo/shared";
import { ApiError } from "@baireporbo/shared";
import { useApi } from "@/lib/api";
import { consumePendingChatSession } from "@/lib/chat-handoff";
import { useLang, useT } from "@/i18n";
import type { TranslationKey } from "@/i18n/translations";
import { Txt } from "@/components/ui";
import { colors, fonts, gradients, shadow } from "@/theme";

const SUGGESTIONS: TranslationKey[] = ["chat.suggest1", "chat.suggest2", "chat.suggest3", "chat.suggest4"];

/** Markdown styles for assistant bubbles, matching the Txt typography. */
function buildMarkdownStyles(lang: "en" | "bn") {
  const body = lang === "bn" ? fonts.bengali : fonts.body;
  const semibold = lang === "bn" ? fonts.bengaliSemibold : fonts.bodySemibold;
  const bold = lang === "bn" ? fonts.bengaliBold : fonts.bodyBold;
  return StyleSheet.create({
    body: { color: colors.ink800, fontSize: 14.5, lineHeight: 22, fontFamily: body },
    paragraph: { marginTop: 0, marginBottom: 6 },
    strong: { fontFamily: bold },
    heading1: { fontFamily: bold, fontSize: 17, lineHeight: 25, marginTop: 8, marginBottom: 4 },
    heading2: { fontFamily: bold, fontSize: 16, lineHeight: 24, marginTop: 8, marginBottom: 4 },
    heading3: { fontFamily: semibold, fontSize: 15, lineHeight: 23, marginTop: 6, marginBottom: 2 },
    heading4: { fontFamily: semibold, fontSize: 14.5, lineHeight: 22, marginTop: 6, marginBottom: 2 },
    heading5: { fontFamily: semibold, fontSize: 14.5, lineHeight: 22 },
    heading6: { fontFamily: semibold, fontSize: 14.5, lineHeight: 22 },
    bullet_list: { marginBottom: 6 },
    ordered_list: { marginBottom: 6 },
    list_item: { marginBottom: 3 },
    link: { color: colors.teal600, textDecorationLine: "underline" },
    blockquote: {
      backgroundColor: colors.sand100,
      borderLeftWidth: 3,
      borderLeftColor: colors.teal500,
      paddingLeft: 10,
      paddingVertical: 2,
      marginVertical: 4,
    },
    code_inline: { backgroundColor: colors.sand100, borderRadius: 4, fontSize: 13 },
    code_block: { backgroundColor: colors.sand100, borderColor: colors.sand200, borderRadius: 10, padding: 10, fontSize: 12.5, marginVertical: 4 },
    fence: { backgroundColor: colors.sand100, borderColor: colors.sand200, borderRadius: 10, padding: 10, fontSize: 12.5, marginVertical: 4 },
    table: { borderWidth: 1, borderColor: colors.sand200, borderRadius: 8, marginVertical: 6 },
    th: { padding: 7, fontFamily: semibold, fontSize: 12.5 },
    tr: { borderBottomWidth: 1, borderColor: colors.sand200, flexDirection: "row" },
    td: { padding: 7, fontSize: 12.5 },
    hr: { backgroundColor: colors.sand200, height: 1, marginVertical: 8 },
  });
}

/** How long each "working on it" label stays up before the next one, in ms. */
const THINK_STAGES: { key: TranslationKey; ms: number }[] = [
  { key: "chat.think1", ms: 1400 },
  { key: "chat.think2", ms: 2600 },
  { key: "chat.think3", ms: 3000 },
  { key: "chat.think4", ms: 3200 },
  { key: "chat.think5", ms: 4000 },
  { key: "chat.think6", ms: 0 },
];

/**
 * Replaces the empty assistant bubble while we wait for the first token.
 * Replies take 5-10s, so a bare "…" reads as a hang — narrate the work instead.
 */
function Thinking() {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const hold = THINK_STAGES[idx].ms;
    if (!hold) return;
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, delay: 60, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setIdx((i) => Math.min(i + 1, THINK_STAGES.length - 1)), 240);
    }, hold);
    return () => clearTimeout(timer);
  }, [idx, fade]);

  return (
    <View className="flex-row items-center gap-2">
      <ActivityIndicator size="small" color={colors.teal500} />
      <Animated.View style={{ opacity: fade }}>
        <Txt className="text-ink-500 text-[14px] leading-[22px]">{t(THINK_STAGES[idx].key)}</Txt>
      </Animated.View>
    </View>
  );
}

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

  // Hide the disclaimer while typing — screen space is scarce with the
  // keyboard up.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const status = t("chat.ready");

  const { lang } = useLang();
  const mdStyles = useMemo(() => buildMarkdownStyles(lang), [lang]);

  const loadSession = useCallback(
    async (id: string) => {
      setSessionId(id);
      setError(null);
      try {
        const res = await api.getChatMessages(id);
        setMessages(res.messages.map((m) => ({ role: m.role, content: m.content })));
      } catch {
        setError(t("chat.error"));
      }
    },
    [api, t],
  );

  // Deep links (e.g. notification taps) open the chat with ?sessionId=.
  useEffect(() => {
    const incoming = params.sessionId ?? null;
    if (incoming && incoming !== sessionId) loadSession(incoming);
  }, [params.sessionId, sessionId, loadSession]);

  // The history screen hands its pick over via the mailbox (see chat-handoff).
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingChatSession();
      if (pending && pending !== sessionId) loadSession(pending);
    }, [sessionId, loadSession]),
  );

  function newChat() {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setInput("");
    router.setParams({ sessionId: undefined });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput("");
    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
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
        { messages: history, userMessage: trimmed, sessionId: activeSession },
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

  const showGreeting = messages.length === 0;

  return (
    <View className="flex-1 bg-body">
      {/* Header */}
      <SafeAreaView edges={["top"]} className="bg-surface border-b border-sand-200">
        <View className="flex-row items-center gap-3 px-4 py-2.5">
          <Pressable onPress={() => router.back()} className="w-[38px] h-[38px] rounded-full bg-sand-100 items-center justify-center">
            <Ionicons name="arrow-back" size={20} color={colors.ink900} />
          </Pressable>
          <LinearGradient
            colors={gradients.heroSoft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </LinearGradient>
          <View className="flex-1">
            <Txt font="display" weight="semibold" className="text-ink-900 text-base">{t("chat.mentorName")}</Txt>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-[7px] h-[7px] rounded-full bg-teal-500" />
              <Txt weight="semibold" className="text-ink-500 text-[11.5px] flex-1" numberOfLines={1}>{status}</Txt>
            </View>
          </View>
          <Pressable onPress={() => router.push("/chat/sessions")} className="w-[38px] h-[38px] rounded-full bg-sand-100 items-center justify-center">
            <Ionicons name="time-outline" size={20} color={colors.teal600} />
          </Pressable>
          <Pressable onPress={newChat} className="w-[38px] h-[38px] rounded-full bg-sand-100 items-center justify-center">
            <Ionicons name="create-outline" size={20} color={colors.teal600} />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 11 }}>
          {showGreeting ? (
            <View className="self-start max-w-[88%] bg-surface border border-sand-200 rounded-[20px] rounded-bl-md px-4 py-3">
              <Txt className="text-ink-800 text-[14.5px] leading-[22px]">{t("chat.greeting")}</Txt>
            </View>
          ) : null}
          {messages.map((m, i) => (
            <View
              key={i}
              style={m.role === "assistant" ? { borderWidth: 1, borderColor: colors.sand200 } : undefined}
              className={
                m.role === "user"
                  ? "self-end bg-teal-500 rounded-[20px] rounded-br-md px-4 py-3 max-w-[86%]"
                  : "self-start bg-surface rounded-[20px] rounded-bl-md px-4 py-3 max-w-[88%]"
              }
            >
              {m.role === "user" ? (
                <Txt className="text-white text-[14.5px] leading-[22px]">{m.content || "…"}</Txt>
              ) : m.content ? (
                <Markdown style={mdStyles}>{m.content}</Markdown>
              ) : (
                <Thinking />
              )}
            </View>
          ))}
        </ScrollView>

        {error ? <Txt className="text-coral-700 px-4 pb-1 text-sm">{error}</Txt> : null}

        {/* Suggestion chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: "center" }}
        >
          {SUGGESTIONS.map((key) => (
            <Pressable
              key={key}
              onPress={() => send(t(key))}
              disabled={streaming}
              style={{ alignSelf: "center" }}
              className="bg-surface border border-sand-200 rounded-full px-3.5 py-2.5"
            >
              <Txt weight="semibold" className="text-ink-700 text-[12.5px]">{t(key)}</Txt>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        {/* With the keyboard up, the nav-bar inset would stack on the keyboard
            padding and leave a dead gap under the input — drop it. */}
        <SafeAreaView edges={keyboardOpen ? [] : ["bottom"]} className="bg-surface border-t border-sand-200">
          <View className="flex-row items-center gap-2.5 px-4 py-2">
            <TextInput
              className="flex-1 bg-body border border-sand-200 text-ink-900 rounded-full px-4 py-3 max-h-32"
              style={{ fontFamily: "Manrope_400Regular", fontSize: 14 }}
              placeholder={t("chat.placeholder")}
              placeholderTextColor={colors.ink400}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable
              style={streaming ? undefined : shadow.teal}
              className={`rounded-full w-[46px] h-[46px] items-center justify-center ${streaming ? "bg-teal-200" : "bg-teal-500"}`}
              onPress={() => send(input)}
              disabled={streaming}
            >
              {streaming ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-up" size={22} color={colors.white} />}
            </Pressable>
          </View>
          {!keyboardOpen ? (
            <Txt className="text-ink-400 text-[10.5px] text-center pb-1.5 px-6">{t("chat.disclaimer")}</Txt>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
